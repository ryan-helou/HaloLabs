"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type { FaceLandmarker } from "@mediapipe/tasks-vision";
import {
  loadFaceLandmarker,
  extractMetrics,
  evaluateShot,
  drawFaceMesh,
  type CoachTone,
} from "@/lib/faceCoach";

/**
 * Guided webcam capture modal. Steps through the shot list with a live
 * (mirrored) preview and an on-device face coach: a contour "scan" mesh is
 * drawn over the face, and per-shot cues ("turn further left", "move closer")
 * guide the pose. When the pose is held steady the shot is captured
 * automatically; a manual shutter is always available as a fallback (and is the
 * whole UI if the tracker can't load).
 *
 * The saved image is the raw camera frame — NOT mirrored — so profiles read
 * true left/right for the analysis, and the mesh is drawn on a separate overlay
 * canvas so it never bakes into the uploaded photo.
 *
 * Requires a secure context (https or localhost) for getUserMedia; the parent
 * only offers this path when `navigator.mediaDevices` exists.
 */

export interface CameraShot {
  key: string;
  label: string;
  desc: string;
}

type TrackerState = "loading" | "ready" | "unavailable";

// Consecutive qualifying detections before auto-capture fires (~0.6s at the
// throttled detect rate). Long enough to avoid a twitchy false trigger.
const HOLD_FRAMES = 9;
const DETECT_INTERVAL_MS = 66; // ~15 detections/sec
const STILL_MOTION = 0.01; // max normalized nose movement between frames

export default function CameraCapture({
  shots,
  startIndex = 0,
  onSave,
  onClose,
  onCameraError,
}: {
  shots: CameraShot[];
  startIndex?: number;
  /** Called with the captured file; resolve when stored so we can advance. */
  onSave: (file: File, shotKey: string) => Promise<void>;
  onClose: () => void;
  /** Fired when the camera can't be opened, so the parent can fall back. */
  onCameraError?: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const overlayRef = useRef<HTMLCanvasElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const landmarkerRef = useRef<FaceLandmarker | null>(null);
  const rafRef = useRef<number | null>(null);
  const sampleCanvasRef = useRef<HTMLCanvasElement | null>(null);

  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [tracker, setTracker] = useState<TrackerState>("loading");
  const [shotIndex, setShotIndex] = useState(
    Math.min(startIndex, shots.length - 1)
  );
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [saving, setSaving] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);
  const [coach, setCoach] = useState<{ cue: string; tone: CoachTone | "none" }>(
    { cue: "Finding your face…", tone: "none" }
  );
  // 0..1 fill of the auto-capture "hold" ring while the pose is locked.
  const [holdProgress, setHoldProgress] = useState(0);

  const shot = shots[shotIndex];

  // Refs the render loop reads without re-subscribing each frame.
  const shotKeyRef = useRef(shot.key);
  shotKeyRef.current = shot.key;
  const previewRef = useRef(false);
  previewRef.current = preview !== null || countdown !== null;
  const holdRef = useRef(0);
  const prevNoseRef = useRef<{ x: number; y: number } | null>(null);
  const lastDetectRef = useRef(0);
  const lastVideoTimeRef = useRef(-1);
  const capturingRef = useRef(false);
  // Consecutive non-locked detections tolerated before the hold resets — a
  // small grace so a one-frame threshold wobble doesn't stall the auto-capture.
  const missRef = useRef(0);

  // Open the camera once; stop every track on unmount.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const stream = await navigator.mediaDevices.getUserMedia({
          video: {
            facingMode: "user",
            width: { ideal: 1920 },
            height: { ideal: 1440 },
          },
          audio: false,
        });
        if (cancelled) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setReady(true);
      } catch {
        setError(
          "Couldn't open the camera. Check the browser's camera permission, or use file upload instead."
        );
        onCameraError?.();
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load the face tracker (progressive enhancement — capture works without it).
  useEffect(() => {
    let cancelled = false;
    loadFaceLandmarker()
      .then((lm) => {
        if (cancelled) return;
        landmarkerRef.current = lm;
        setTracker("ready");
      })
      .catch(() => {
        if (!cancelled) setTracker("unavailable");
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    capturingRef.current = true;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // Raw frame — intentionally not mirrored, and WITHOUT the mesh overlay.
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) setPreview({ url: URL.createObjectURL(blob), blob });
        capturingRef.current = false;
      },
      "image/jpeg",
      0.92
    );
  }, []);

  // Sample mean luma over the face box (0..255) using a tiny reused canvas.
  const sampleBrightness = useCallback(
    (video: HTMLVideoElement, cx: number, cy: number, w: number, h: number) => {
      const S = 24;
      let c = sampleCanvasRef.current;
      if (!c) {
        c = document.createElement("canvas");
        c.width = S;
        c.height = S;
        sampleCanvasRef.current = c;
      }
      const ctx = c.getContext("2d", { willReadFrequently: true });
      if (!ctx) return 128;
      const vw = video.videoWidth;
      const vh = video.videoHeight;
      const sx = Math.max(0, (cx - w / 2) * vw);
      const sy = Math.max(0, (cy - h / 2) * vh);
      const sw = Math.min(vw - sx, w * vw);
      const sh = Math.min(vh - sy, h * vh);
      if (sw <= 0 || sh <= 0) return 128;
      ctx.drawImage(video, sx, sy, sw, sh, 0, 0, S, S);
      const { data } = ctx.getImageData(0, 0, S, S);
      let sum = 0;
      for (let i = 0; i < data.length; i += 4)
        sum += 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
      return sum / (data.length / 4);
    },
    []
  );

  // The coaching render loop. Runs continuously while the live view is up.
  useEffect(() => {
    if (tracker !== "ready") return;
    let stopped = false;

    const tick = () => {
      if (stopped) return;
      rafRef.current = requestAnimationFrame(tick);

      const video = videoRef.current;
      const overlay = overlayRef.current;
      const lm = landmarkerRef.current;
      if (!video || !overlay || !lm || !video.videoWidth) return;

      // Freeze the loop while reviewing a captured frame.
      if (previewRef.current) return;

      const now = performance.now();
      if (now - lastDetectRef.current < DETECT_INTERVAL_MS) return;
      lastDetectRef.current = now;
      if (video.currentTime === lastVideoTimeRef.current) return;
      lastVideoTimeRef.current = video.currentTime;

      // Keep the overlay canvas matched to the source resolution.
      if (overlay.width !== video.videoWidth) {
        overlay.width = video.videoWidth;
        overlay.height = video.videoHeight;
      }
      const octx = overlay.getContext("2d")!;
      octx.clearRect(0, 0, overlay.width, overlay.height);

      let result;
      try {
        result = lm.detectForVideo(video, now);
      } catch {
        return;
      }
      const m = extractMetrics(result);

      if (!m) {
        holdRef.current = 0;
        missRef.current = 0;
        prevNoseRef.current = null;
        setHoldProgress((p) => (p === 0 ? p : 0));
        setCoach((c) =>
          c.cue === "Fit your face in the frame" ? c : { cue: "Fit your face in the frame", tone: "none" }
        );
        return;
      }

      const brightness = sampleBrightness(video, m.cx, m.cy, m.faceW, m.faceH);
      const verdict = evaluateShot(shotKeyRef.current, m, brightness);

      // Stillness — small nose movement between detections.
      const nose = m.landmarks[1];
      const prev = prevNoseRef.current;
      const motion = prev
        ? Math.hypot(nose.x - prev.x, nose.y - prev.y)
        : 1;
      prevNoseRef.current = { x: nose.x, y: nose.y };
      const still = motion < STILL_MOTION;

      // Mesh color reflects state: neutral while adjusting, green when locked.
      const locked = verdict.ok && still;
      drawFaceMesh(octx, m.landmarks, overlay.width, overlay.height, {
        color: locked
          ? "rgba(122,167,143,0.95)"
          : "rgba(255,255,255,0.55)",
        lineWidth: locked ? 2.4 : 1.6,
        glow: locked ? "rgba(122,167,143,0.9)" : undefined,
      });

      setCoach((c) =>
        c.cue === verdict.cue && c.tone === verdict.tone ? c : { cue: verdict.cue, tone: verdict.tone }
      );

      // Auto-capture once the pose holds steady, with a short grace window so a
      // single flickering frame doesn't reset the countdown.
      if (locked) {
        missRef.current = 0;
        holdRef.current += 1;
        if (
          holdRef.current >= HOLD_FRAMES &&
          !capturingRef.current &&
          !previewRef.current
        ) {
          holdRef.current = 0;
          setHoldProgress(0);
          capture();
        } else {
          setHoldProgress(Math.min(1, holdRef.current / HOLD_FRAMES));
        }
      } else {
        missRef.current += 1;
        if (missRef.current > 2) {
          holdRef.current = 0;
          setHoldProgress((p) => (p === 0 ? p : 0));
        }
      }
    };

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      stopped = true;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [tracker, capture, sampleBrightness]);

  // Reset the hold counter whenever we change shots or return to live view.
  useEffect(() => {
    holdRef.current = 0;
    missRef.current = 0;
    prevNoseRef.current = null;
    setHoldProgress(0);
  }, [shotIndex, preview]);

  // Belt-and-braces: whenever we return to the live view, make sure the
  // stream is still attached and playing (covers any remount edge case).
  useEffect(() => {
    const video = videoRef.current;
    const stream = streamRef.current;
    if (!preview && video && stream) {
      if (video.srcObject !== stream) video.srcObject = stream;
      video.play().catch(() => {});
    }
  }, [preview, shotIndex]);

  // 3-2-1 countdown for the manual timer path.
  useEffect(() => {
    if (countdown === null) return;
    if (countdown === 0) {
      setCountdown(null);
      capture();
      return;
    }
    const t = setTimeout(() => setCountdown((c) => (c ?? 1) - 1), 1000);
    return () => clearTimeout(t);
  }, [countdown, capture]);

  function discardPreview() {
    if (preview) URL.revokeObjectURL(preview.url);
    setPreview(null);
  }

  async function keep() {
    if (!preview) return;
    setSaving(true);
    const file = new File([preview.blob], `camera-${shot.key}.jpg`, {
      type: "image/jpeg",
    });
    try {
      await onSave(file, shot.key);
      discardPreview();
      if (shotIndex < shots.length - 1) setShotIndex(shotIndex + 1);
      else onClose();
    } finally {
      setSaving(false);
    }
  }

  const coaching = tracker === "ready" && !error;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Camera capture"
      className="fixed inset-0 z-50 flex items-center justify-center bg-ink/70 p-4 backdrop-blur-sm"
    >
      <div className="w-full max-w-lg overflow-hidden rounded-2xl bg-paper shadow-float">
        {/* Header — which shot we're on */}
        <div className="flex items-start justify-between gap-4 border-b border-line px-5 py-4">
          <div>
            <p className="font-mono text-[10px] uppercase tracking-label text-ink-soft">
              Shot {shotIndex + 1} of {shots.length}
            </p>
            <h2 className="mt-1 font-display text-xl text-ink">{shot.label}</h2>
            <p className="mt-0.5 text-xs text-ink-soft">{shot.desc}</p>
          </div>
          <button
            type="button"
            onClick={onClose}
            aria-label="Close camera"
            className="rounded-full border border-line px-3 py-1.5 text-xs font-medium text-ink-soft hover:text-ink"
          >
            Close
          </button>
        </div>

        {/* Viewfinder. The <video> stays mounted even while a captured frame
            is being reviewed — unmounting it detaches the stream, and a
            remounted element renders black. The preview overlays it. */}
        <div className="relative aspect-[4/3] w-full bg-ink">
          {error ? (
            <p className="flex h-full items-center justify-center px-8 text-center text-sm text-paper/80">
              {error}
            </p>
          ) : (
            <>
              {/* Mirrored preview feels natural; the saved frame is not mirrored. */}
              <video
                ref={videoRef}
                playsInline
                muted
                className="h-full w-full object-cover [transform:scaleX(-1)]"
              />
              {/* Mesh overlay — mirrored to line up with the mirrored video. */}
              <canvas
                ref={overlayRef}
                aria-hidden
                className={`pointer-events-none absolute inset-0 h-full w-full object-cover [transform:scaleX(-1)] transition-opacity ${
                  coaching && !preview ? "opacity-100" : "opacity-0"
                }`}
              />
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url}
                  alt="Captured frame"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <>
                  {/* Static face guide only when the live coach isn't running. */}
                  {!coaching && (
                    <svg
                      aria-hidden
                      viewBox="0 0 400 300"
                      className="pointer-events-none absolute inset-0 h-full w-full"
                    >
                      <ellipse
                        cx="200"
                        cy="145"
                        rx="80"
                        ry="105"
                        fill="none"
                        stroke="rgba(255,255,255,0.55)"
                        strokeWidth="1.5"
                        strokeDasharray="6 5"
                      />
                    </svg>
                  )}

                  {/* Auto-capture hold ring — fills as the locked pose is held. */}
                  {coaching && countdown === null && holdProgress > 0 && (
                    <span className="pointer-events-none absolute inset-0 flex items-center justify-center">
                      <svg viewBox="0 0 100 100" className="h-24 w-24 -rotate-90">
                        <circle
                          cx="50"
                          cy="50"
                          r="44"
                          fill="none"
                          stroke="rgba(255,255,255,0.25)"
                          strokeWidth="4"
                        />
                        <circle
                          cx="50"
                          cy="50"
                          r="44"
                          fill="none"
                          stroke="rgb(122,167,143)"
                          strokeWidth="4"
                          strokeLinecap="round"
                          strokeDasharray={2 * Math.PI * 44}
                          strokeDashoffset={2 * Math.PI * 44 * (1 - holdProgress)}
                          className="transition-[stroke-dashoffset] duration-100 ease-linear"
                        />
                      </svg>
                    </span>
                  )}

                  {/* Live coaching cue */}
                  {coaching && countdown === null && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
                      <span
                        className={`rounded-full px-4 py-2 text-sm font-medium shadow-float backdrop-blur-sm transition-colors ${
                          coach.tone === "ready"
                            ? "bg-pine text-paper"
                            : "bg-ink/70 text-paper"
                        }`}
                      >
                        {coach.tone === "ready" && (
                          <span aria-hidden className="mr-1.5">✓</span>
                        )}
                        {coach.cue}
                      </span>
                    </div>
                  )}

                  {/* Tracker still loading */}
                  {tracker === "loading" && ready && (
                    <div className="pointer-events-none absolute inset-x-0 bottom-4 flex justify-center">
                      <span className="rounded-full bg-ink/70 px-4 py-2 text-sm font-medium text-paper/90 backdrop-blur-sm">
                        Starting the guide…
                      </span>
                    </div>
                  )}

                  {countdown !== null && (
                    <span className="absolute inset-0 flex items-center justify-center font-display text-8xl font-medium text-paper [text-shadow:0_2px_12px_rgba(0,0,0,0.5)]">
                      {countdown}
                    </span>
                  )}
                  {!ready && (
                    <span className="absolute inset-0 flex items-center justify-center">
                      <span className="h-10 w-10 animate-spin rounded-full border-2 border-paper/30 border-t-paper" />
                    </span>
                  )}
                </>
              )}
            </>
          )}
        </div>

        {/* Controls */}
        <div className="flex items-center justify-between gap-3 px-5 py-4">
          {preview ? (
            <>
              <button
                type="button"
                onClick={discardPreview}
                disabled={saving}
                className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink-soft hover:text-ink disabled:opacity-50"
              >
                Retake
              </button>
              <button
                type="button"
                onClick={keep}
                disabled={saving}
                className="rounded-full bg-pine px-6 py-2.5 text-sm font-medium text-paper shadow-float hover:bg-pine-deep disabled:opacity-60"
              >
                {saving
                  ? "Saving…"
                  : shotIndex < shots.length - 1
                    ? "Use photo → next shot"
                    : "Use photo & finish"}
              </button>
            </>
          ) : (
            <>
              <button
                type="button"
                onClick={() =>
                  shotIndex < shots.length - 1
                    ? setShotIndex(shotIndex + 1)
                    : onClose()
                }
                className="rounded-full border border-line px-5 py-2.5 text-sm font-medium text-ink-soft hover:text-ink"
              >
                Skip shot
              </button>
              <div className="flex items-center gap-2">
                {!coaching && (
                  <button
                    type="button"
                    onClick={() => setCountdown(3)}
                    disabled={!ready || countdown !== null}
                    className="rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink-soft hover:text-ink disabled:opacity-40"
                  >
                    3s timer
                  </button>
                )}
                <button
                  type="button"
                  onClick={capture}
                  disabled={!ready || countdown !== null}
                  aria-label="Capture photo"
                  title={coaching ? "Capture now (auto-captures when the pose is held)" : "Capture photo"}
                  className="flex h-12 w-12 items-center justify-center rounded-full bg-pine text-paper shadow-float transition-transform hover:scale-105 disabled:opacity-40"
                >
                  <span className="h-8 w-8 rounded-full border-2 border-paper" />
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}

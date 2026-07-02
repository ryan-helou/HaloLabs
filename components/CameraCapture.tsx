"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Guided webcam capture modal. Steps through the shot list with a live
 * (mirrored) preview and a face guide; each kept frame is handed to the
 * parent as a JPEG File. The saved image is the raw camera frame — NOT
 * mirrored — so profiles read true left/right for the analysis.
 *
 * Requires a secure context (https or localhost) for getUserMedia; the
 * parent only offers this path when `navigator.mediaDevices` exists.
 */

export interface CameraShot {
  key: string;
  label: string;
  desc: string;
}

export default function CameraCapture({
  shots,
  startIndex = 0,
  onSave,
  onClose,
}: {
  shots: CameraShot[];
  startIndex?: number;
  /** Called with the captured file; resolve when stored so we can advance. */
  onSave: (file: File, shotKey: string) => Promise<void>;
  onClose: () => void;
}) {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [ready, setReady] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [shotIndex, setShotIndex] = useState(
    Math.min(startIndex, shots.length - 1)
  );
  const [preview, setPreview] = useState<{ url: string; blob: Blob } | null>(null);
  const [saving, setSaving] = useState(false);
  const [countdown, setCountdown] = useState<number | null>(null);

  const shot = shots[shotIndex];

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
      }
    })();
    return () => {
      cancelled = true;
      streamRef.current?.getTracks().forEach((t) => t.stop());
    };
  }, []);

  const capture = useCallback(() => {
    const video = videoRef.current;
    if (!video || !video.videoWidth) return;
    const canvas = document.createElement("canvas");
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    // Raw frame — intentionally not mirrored (see component docstring).
    canvas.getContext("2d")!.drawImage(video, 0, 0);
    canvas.toBlob(
      (blob) => {
        if (blob) setPreview({ url: URL.createObjectURL(blob), blob });
      },
      "image/jpeg",
      0.92
    );
  }, []);

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

  // 3-2-1 countdown so both hands can be off the keyboard for the pose.
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
              {preview ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={preview.url}
                  alt="Captured frame"
                  className="absolute inset-0 h-full w-full object-cover"
                />
              ) : (
                <>
                  {/* Face guide */}
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
                <button
                  type="button"
                  onClick={() => setCountdown(3)}
                  disabled={!ready || countdown !== null}
                  className="rounded-full border border-line px-4 py-2.5 text-sm font-medium text-ink-soft hover:text-ink disabled:opacity-40"
                >
                  3s timer
                </button>
                <button
                  type="button"
                  onClick={capture}
                  disabled={!ready || countdown !== null}
                  aria-label="Capture photo"
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

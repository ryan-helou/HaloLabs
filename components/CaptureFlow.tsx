"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { photoUrl } from "@/lib/photo";
import CameraCapture from "./CameraCapture";

/**
 * Guided capture + upload + local analysis trigger.
 *
 * The shot list mirrors what a real facial-analysis intake needs (front
 * neutral/smile, both profiles, 3/4, detail). We can't detect which shot a
 * photo is, so the checklist is self-tracked; the hard gate is a minimum
 * photo count. Analysis runs locally via /api/analyze and is polled here.
 */

interface IntakeStatus {
  exists: boolean;
  hasProfile?: boolean;
  images?: string[];
  videos?: string[];
  analyzed?: boolean;
}

type AnalysisState =
  | { phase: "idle" }
  | { phase: "starting" }
  | { phase: "running"; elapsedSec: number }
  | { phase: "done" }
  | { phase: "error"; hint: string };

const SHOTS = [
  {
    key: "front-neutral",
    label: "Front — neutral",
    desc: "Face the camera straight on, relaxed face, eyes at lens height.",
  },
  {
    key: "front-smile",
    label: "Front — natural smile",
    desc: "Same framing, easy genuine smile.",
  },
  {
    key: "left-profile",
    label: "Left profile",
    desc: "Turn 90° left, chin level. Ear fully visible.",
  },
  {
    key: "right-profile",
    label: "Right profile",
    desc: "Turn 90° right, chin level.",
  },
  {
    key: "three-quarter",
    label: "3/4 angle",
    desc: "Halfway between front and profile — how people actually see you.",
  },
  {
    key: "detail",
    label: "Detail shot",
    desc: "Close-up of whatever you want examined: hairline, skin, beard.",
  },
] as const;

const TIPS = [
  "Face a window — soft daylight, never only overhead light.",
  "No filters, no beauty mode, no editing.",
  "Hair off the face; glasses off for at least the front shots.",
  "Phone at eye level, arm's length or ask someone to shoot.",
  "Recent photos only — this analyzes you as you are now.",
];

function MiniHead({ variant }: { variant: string }) {
  // Minimal line glyphs per shot type — decorative, consistent with the
  // landmark-mesh motif used elsewhere.
  const common = {
    fill: "none",
    stroke: "currentColor",
    strokeWidth: 1.5,
    strokeLinecap: "round" as const,
    strokeLinejoin: "round" as const,
  };
  return (
    <svg viewBox="0 0 40 40" className="h-9 w-9 text-pine" aria-hidden>
      {variant.startsWith("front") && (
        <>
          <ellipse cx="20" cy="19" rx="10" ry="12" {...common} />
          <circle cx="16" cy="17" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="24" cy="17" r="0.9" fill="currentColor" stroke="none" />
          {variant === "front-smile" ? (
            <path d="M16 24c1.4 1.6 6.6 1.6 8 0" {...common} />
          ) : (
            <path d="M17 24.5h6" {...common} />
          )}
        </>
      )}
      {variant.endsWith("profile") && (
        <g transform={variant === "right-profile" ? "scale(-1,1) translate(-40,0)" : undefined}>
          <path
            d="M25 8c-6 0-11 5-11 12 0 3 1 5 1 7l-2 4h4l1 3h7"
            {...common}
          />
          <path d="M14 19c-1.5.2-2 1.5-1 2.5" {...common} />
          <circle cx="17.5" cy="17.5" r="0.9" fill="currentColor" stroke="none" />
        </g>
      )}
      {variant === "three-quarter" && (
        <>
          <path d="M23 7c-7 0-12 5.5-12 12.5S16 31 21 31c4 0 8-2.5 8-8.5" {...common} />
          <circle cx="17" cy="17" r="0.9" fill="currentColor" stroke="none" />
          <circle cx="24.5" cy="16.5" r="0.9" fill="currentColor" stroke="none" />
          <path d="M19 24.5c1.5 1 4 .8 5-.3" {...common} />
        </>
      )}
      {variant === "detail" && (
        <>
          <circle cx="18" cy="18" r="9" {...common} />
          <path d="M25 25l7 7" {...common} />
        </>
      )}
    </svg>
  );
}

export default function CaptureFlow() {
  const searchParams = useSearchParams();
  const id = searchParams.get("id") ?? "";

  const [status, setStatus] = useState<IntakeStatus | null>(null);
  const [covered, setCovered] = useState<Set<string>>(new Set());
  const [uploading, setUploading] = useState(false);
  const [uploadErrors, setUploadErrors] = useState<string[]>([]);
  const [dragOver, setDragOver] = useState(false);
  const [analysis, setAnalysis] = useState<AnalysisState>({ phase: "idle" });
  const [copied, setCopied] = useState(false);
  const [cameraOpen, setCameraOpen] = useState(false);
  const [webcamCapable, setWebcamCapable] = useState(false);
  const fileInput = useRef<HTMLInputElement>(null);
  const nativeCameraInput = useRef<HTMLInputElement>(null);
  const pollRef = useRef<ReturnType<typeof setInterval> | null>(null);

  // Desktop/laptop with a webcam → in-page guided capture. Touch devices →
  // the native camera app via <input capture>, which shoots at full quality.
  const coarsePointer =
    typeof window !== "undefined" &&
    window.matchMedia?.("(pointer: coarse)").matches;
  useEffect(() => {
    setWebcamCapable(
      typeof navigator !== "undefined" && Boolean(navigator.mediaDevices?.getUserMedia)
    );
  }, []);

  const refresh = useCallback(async () => {
    if (!id) return;
    try {
      const res = await fetch(`/api/person/${encodeURIComponent(id)}`);
      setStatus(res.ok ? await res.json() : { exists: false });
    } catch {
      setStatus({ exists: false });
    }
  }, [id]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Poll analysis status while running.
  useEffect(() => {
    if (analysis.phase !== "starting" && analysis.phase !== "running") {
      if (pollRef.current) clearInterval(pollRef.current);
      pollRef.current = null;
      return;
    }
    pollRef.current = setInterval(async () => {
      try {
        const res = await fetch(`/api/analyze?id=${encodeURIComponent(id)}`);
        const data = await res.json();
        if (data.state === "running") {
          setAnalysis({ phase: "running", elapsedSec: data.elapsedSec ?? 0 });
        } else if (data.state === "done") {
          setAnalysis({ phase: "done" });
        } else if (data.state === "error") {
          setAnalysis({ phase: "error", hint: data.hint ?? "" });
        }
      } catch {
        /* transient — keep polling */
      }
    }, 3000);
    return () => {
      if (pollRef.current) clearInterval(pollRef.current);
    };
  }, [analysis.phase, id]);

  async function handleFiles(files: FileList | File[]) {
    const list = Array.from(files);
    if (!list.length) return;
    setUploading(true);
    setUploadErrors([]);
    const form = new FormData();
    form.set("id", id);
    for (const f of list) form.append("files", f);
    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) {
        setUploadErrors([data.error ?? "Upload failed"]);
      } else if (data.errors?.length) {
        setUploadErrors(data.errors);
      }
    } catch {
      setUploadErrors(["Upload failed — is the dev server running?"]);
    }
    setUploading(false);
    refresh();
  }

  async function beginAnalysis() {
    setAnalysis({ phase: "starting" });
    try {
      const res = await fetch("/api/analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id }),
      });
      const data = await res.json();
      if (data.manual) {
        setAnalysis({
          phase: "error",
          hint: "Couldn't launch the local analyzer automatically.",
        });
      } else if (data.started || data.alreadyRunning) {
        setAnalysis({ phase: "running", elapsedSec: 0 });
      } else {
        setAnalysis({ phase: "error", hint: data.error ?? "" });
      }
    } catch {
      setAnalysis({ phase: "error", hint: "Request failed." });
    }
  }

  /** Upload one camera frame and tick its shot off the checklist. */
  async function saveCameraShot(file: File, shotKey: string) {
    const form = new FormData();
    form.set("id", id);
    form.append("files", file);
    const res = await fetch("/api/upload", { method: "POST", body: form });
    if (!res.ok) throw new Error("Upload failed");
    setCovered((prev) => new Set(prev).add(shotKey));
    refresh();
  }

  function openCamera() {
    if (webcamCapable && !coarsePointer) setCameraOpen(true);
    else nativeCameraInput.current?.click();
  }

  function copyManualCommand() {
    navigator.clipboard
      ?.writeText(`run analyze-faces --force ${id}`)
      .then(() => {
        setCopied(true);
        setTimeout(() => setCopied(false), 1500);
      })
      .catch(() => {});
  }

  if (!id) {
    return (
      <EmptyRedirect
        title="No profile selected"
        body="Start from the beginning so the analysis knows who this is."
      />
    );
  }
  if (status && !status.exists) {
    return (
      <EmptyRedirect
        title="Profile not found"
        body="This profile hasn't been created yet — the onboarding takes two minutes."
      />
    );
  }

  const images = status?.images ?? [];
  const videos = status?.videos ?? [];
  const enough = images.length >= 4;
  const running = analysis.phase === "starting" || analysis.phase === "running";

  /* ------------------------------ analysis takeover screens */
  if (running || analysis.phase === "done") {
    return (
      <div className="mx-auto max-w-xl py-10 text-center">
        {analysis.phase === "done" ? (
          <>
            <p className="eyebrow">Analysis complete</p>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-ink">
              Your plan is ready.
            </h1>
            <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
              Observations, prioritized suggestions, your routine, and a
              shopping list — built from your photos and your answers.
            </p>
            <Link
              href={`/person/${encodeURIComponent(id)}`}
              className="mt-8 inline-flex items-center gap-1.5 rounded-full bg-pine px-7 py-3.5 text-[15px] font-medium text-paper shadow-float transition-colors hover:bg-pine-deep"
            >
              Open my plan <span aria-hidden>→</span>
            </Link>
          </>
        ) : (
          <>
            <div className="mx-auto flex h-16 w-16 items-center justify-center">
              <span className="h-12 w-12 animate-spin rounded-full border-2 border-line border-t-pine" />
            </div>
            <p className="mt-6 eyebrow">Analyzing</p>
            <h1 className="mt-3 font-display text-4xl font-medium tracking-tight text-ink">
              Studying your photos…
            </h1>
            <p className="mx-auto mt-4 max-w-md text-[15px] leading-relaxed text-ink-soft">
              Every photo is being examined — hair, skin, brows, facial hair,
              style — and your answers are shaping the plan. This runs entirely
              on your machine and usually takes a few minutes.
            </p>
            {analysis.phase === "running" && analysis.elapsedSec > 0 && (
              <p className="mt-3 font-mono text-xs text-ink-soft">
                {Math.floor(analysis.elapsedSec / 60)}m {analysis.elapsedSec % 60}s elapsed
              </p>
            )}
            <ol className="mx-auto mt-8 max-w-sm space-y-2 text-left text-sm text-ink-soft">
              {[
                "Reading your onboarding answers",
                "Viewing each photo in detail",
                "Writing observations & suggestions",
                "Assembling your routine and plan",
              ].map((s, i) => (
                <li key={s} className="flex items-baseline gap-3">
                  <span className="font-mono text-xs text-pine">[{i + 1}]</span>
                  {s}
                </li>
              ))}
            </ol>
          </>
        )}
      </div>
    );
  }

  /* ------------------------------------------ capture screen */
  return (
    <div className="mx-auto max-w-3xl">
      <p className="eyebrow">Step 2 of 3 · Photos</p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
        Add your photos
      </h1>
      <p className="mt-3 max-w-xl text-[15px] leading-relaxed text-ink-soft">
        The analysis is only as good as the photos. Cover the six shots below —
        tap each as you go. Minimum four photos; six is the sweet spot.
      </p>

      {/* Shot checklist */}
      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {SHOTS.map((shot) => {
          const done = covered.has(shot.key);
          return (
            <button
              key={shot.key}
              type="button"
              onClick={() =>
                setCovered((prev) => {
                  const next = new Set(prev);
                  if (next.has(shot.key)) next.delete(shot.key);
                  else next.add(shot.key);
                  return next;
                })
              }
              aria-pressed={done}
              className={`flex items-start gap-4 rounded-2xl border p-4 text-left transition-colors ${
                done ? "border-pine bg-sage/40" : "border-line bg-surface hover:border-pine/40"
              }`}
            >
              <MiniHead variant={shot.key} />
              <span className="min-w-0 flex-1">
                <span className="flex items-center justify-between gap-2">
                  <span className="text-[15px] font-medium text-ink">{shot.label}</span>
                  <span
                    className={`flex h-5 w-5 shrink-0 items-center justify-center rounded-full border text-[10px] ${
                      done ? "border-pine bg-pine text-paper" : "border-line text-transparent"
                    }`}
                  >
                    ✓
                  </span>
                </span>
                <span className="mt-1 block text-xs leading-relaxed text-ink-soft">
                  {shot.desc}
                </span>
              </span>
            </button>
          );
        })}
      </div>

      {/* Lighting tips */}
      <div className="mt-6 rounded-2xl border border-line bg-surface p-5 shadow-card">
        <p className="eyebrow">Make them count</p>
        <ul className="mt-3 grid gap-2 sm:grid-cols-2">
          {TIPS.map((t) => (
            <li key={t} className="flex items-baseline gap-2.5 text-sm text-ink-soft">
              <span className="text-pine">·</span>
              {t}
            </li>
          ))}
        </ul>
        <p className="mt-3 border-t border-line pt-3 text-xs text-ink-soft">
          Optional: a 10-second slow head-turn video (mp4/mov) captures the
          angles photos miss. Photos: jpg, png, webp — iPhone HEIC converts
          automatically. Everything stays on this machine.
        </p>
      </div>

      {/* Capture: camera first, files as the alternative */}
      <div
        onDragOver={(e) => {
          e.preventDefault();
          setDragOver(true);
        }}
        onDragLeave={() => setDragOver(false)}
        onDrop={(e) => {
          e.preventDefault();
          setDragOver(false);
          handleFiles(e.dataTransfer.files);
        }}
        className={`mt-6 rounded-2xl border-2 border-dashed p-8 text-center transition-colors ${
          dragOver ? "border-pine bg-sage/30" : "border-line bg-paper"
        }`}
      >
        <button
          type="button"
          onClick={openCamera}
          className="inline-flex items-center gap-2.5 rounded-full bg-pine px-6 py-3 text-[15px] font-medium text-paper shadow-float transition-colors hover:bg-pine-deep"
        >
          <svg
            aria-hidden
            viewBox="0 0 24 24"
            className="h-4 w-4"
            fill="none"
            stroke="currentColor"
            strokeWidth={1.8}
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M14.5 4h-5L7.8 6H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-3.8L14.5 4z" />
            <circle cx="12" cy="13" r="3.5" />
          </svg>
          Take the photos now
        </button>
        <p className="mt-3 text-sm text-ink">
          {webcamCapable && !coarsePointer
            ? "Guided webcam session — it walks you through each shot."
            : "Opens your camera for each shot."}
        </p>
        <p className="mt-4 border-t border-line pt-4 text-sm text-ink-soft">
          Or drag existing photos here /{" "}
          <button
            type="button"
            onClick={() => fileInput.current?.click()}
            className="font-medium text-pine underline decoration-pine/40 underline-offset-4 hover:text-pine-deep"
          >
            browse files
          </button>
          {uploading ? " — uploading…" : ""}
        </p>
        <input
          ref={fileInput}
          type="file"
          multiple
          accept=".jpg,.jpeg,.png,.webp,.heic,.heif,.mp4,.mov,.webm,image/*,video/*"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
        {/* Native camera (phones/tablets): full-quality shots from the camera app. */}
        <input
          ref={nativeCameraInput}
          type="file"
          accept="image/*"
          capture="user"
          className="hidden"
          onChange={(e) => {
            if (e.target.files) handleFiles(e.target.files);
            e.target.value = "";
          }}
        />
      </div>

      {cameraOpen && (
        <CameraCapture
          shots={SHOTS.map(({ key, label, desc }) => ({ key, label, desc }))}
          startIndex={Math.max(
            0,
            SHOTS.findIndex((s) => !covered.has(s.key))
          )}
          onSave={saveCameraShot}
          onClose={() => setCameraOpen(false)}
        />
      )}

      {uploadErrors.length > 0 && (
        <div className="mt-3 space-y-1 rounded-xl border border-clay/40 bg-clay-soft px-4 py-3">
          {uploadErrors.map((err) => (
            <p key={err} className="text-sm text-clay">
              {err}
            </p>
          ))}
        </div>
      )}

      {/* Uploaded grid */}
      {(images.length > 0 || videos.length > 0) && (
        <div className="mt-6">
          <div className="flex items-baseline justify-between">
            <p className="eyebrow">
              {images.length} photo{images.length === 1 ? "" : "s"}
              {videos.length > 0 &&
                ` · ${videos.length} video${videos.length === 1 ? "" : "s"}`}
            </p>
            <p className={`text-xs ${enough ? "text-pine" : "text-ink-soft"}`}>
              {enough ? "Enough to analyze" : `Add ${4 - images.length} more to analyze`}
            </p>
          </div>
          <div className="mt-3 grid grid-cols-3 gap-2 sm:grid-cols-6">
            {images.map((name) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={name}
                src={photoUrl(`${id}/${name}`)}
                alt={name}
                className="aspect-square w-full rounded-lg border border-line object-cover"
              />
            ))}
            {videos.map((name) => (
              <div
                key={name}
                className="flex aspect-square w-full items-center justify-center rounded-lg border border-line bg-panel/60 px-2 text-center"
              >
                <span className="break-all font-mono text-[9px] leading-tight text-ink-soft">
                  ▶ {name}
                </span>
              </div>
            ))}
          </div>
        </div>
      )}

      {analysis.phase === "error" && (
        <div className="mt-6 rounded-2xl border border-clay/40 bg-clay-soft p-5">
          <p className="text-sm font-medium text-clay">
            The automatic run didn&apos;t go through. {analysis.hint}
          </p>
          <p className="mt-2 text-sm text-ink-soft">
            Fallback: open Claude Code in this project and paste —
          </p>
          <div className="mt-2 flex items-center gap-2">
            <code className="rounded-lg bg-paper px-3 py-2 font-mono text-xs text-ink">
              run analyze-faces --force {id}
            </code>
            <button
              type="button"
              onClick={copyManualCommand}
              className="rounded-full border border-line bg-surface px-3 py-1.5 text-xs font-medium text-ink-soft hover:text-ink"
            >
              {copied ? "Copied" : "Copy"}
            </button>
          </div>
          <p className="mt-2 text-xs text-ink-soft">
            When it finishes, your plan appears at{" "}
            <Link className="text-pine underline" href={`/person/${encodeURIComponent(id)}`}>
              your profile page
            </Link>
            .
          </p>
        </div>
      )}

      {/* Begin */}
      <div className="mt-8 flex items-center justify-between border-t border-line pt-6">
        <Link
          href="/start"
          className="rounded-full px-5 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          ← Edit answers
        </Link>
        <button
          type="button"
          disabled={!enough || uploading}
          onClick={beginAnalysis}
          className="rounded-full bg-pine px-7 py-3.5 text-[15px] font-medium text-paper shadow-float transition-colors hover:bg-pine-deep disabled:cursor-not-allowed disabled:opacity-40"
        >
          Begin my analysis →
        </button>
      </div>
      {status?.analyzed && (
        <p className="mt-3 text-right text-xs text-ink-soft">
          This profile was analyzed before — running again replaces the old
          plan with a fresh one (your check-offs are kept).
        </p>
      )}
    </div>
  );
}

function EmptyRedirect({ title, body }: { title: string; body: string }) {
  return (
    <div className="mx-auto max-w-md rounded-2xl border border-dashed border-line bg-surface px-8 py-14 text-center shadow-card">
      <h1 className="font-display text-2xl font-semibold text-ink">{title}</h1>
      <p className="mt-2 text-sm leading-relaxed text-ink-soft">{body}</p>
      <Link
        href="/start"
        className="mt-6 inline-block rounded-full bg-pine px-6 py-3 text-sm font-medium text-paper shadow-float hover:bg-pine-deep"
      >
        Start onboarding →
      </Link>
    </div>
  );
}

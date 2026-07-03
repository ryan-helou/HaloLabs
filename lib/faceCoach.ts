/**
 * On-device face coaching for guided photo capture.
 *
 * Wraps MediaPipe FaceLandmarker (WASM, runs entirely in the browser — no
 * image data leaves the device) into three pure helpers the camera modal uses:
 *
 *   loadFaceLandmarker() → lazy-init the model (a few MB, fetched once).
 *   extractMetrics(result) → turn a detection into head pose / framing numbers.
 *   evaluateShot(key, metrics, brightness) → is the *current* shot's pose met,
 *       and if not, the single most useful thing to tell the person.
 *   drawFaceMesh(ctx, …) → the clean contour overlay ("scan" look).
 *
 * Pose is derived from landmark geometry rather than the transformation matrix
 * so the math is interpretable and degrades gracefully as the head turns. See
 * YAW_DIRECTION below — the one thing worth eyeballing on a real device.
 */
import type {
  NormalizedLandmark,
  FaceLandmarker as FaceLandmarkerT,
  FaceLandmarkerResult,
} from "@mediapipe/tasks-vision";

// Pin to the installed package version so the CDN assets match the JS API.
const MP_VERSION = "0.10.35";
const WASM_BASE = `https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@${MP_VERSION}/wasm`;
const MODEL_URL =
  "https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task";

// Landmark indices in the 468-point mesh.
const NOSE_TIP = 1;
const EYE_R_OUTER = 33; // subject's right eye, outer corner
const EYE_L_OUTER = 263; // subject's left eye, outer corner
const FACE_R = 234; // right face contour
const FACE_L = 454; // left face contour
const BROW_MID = 10; // top of forehead
const CHIN = 152;

/**
 * +1 means "positive yaw = the person turned toward THEIR OWN left" (the pose
 * we call `left-profile`). Front cameras are un-mirrored in the raw frame, so
 * this can read backwards on some setups. If the coach tells people to turn the
 * wrong way, flip this to -1 — it's the only sign that needs a live check.
 */
const YAW_DIRECTION = 1;

let modPromise: Promise<typeof import("@mediapipe/tasks-vision")> | null = null;
let landmarkerPromise: Promise<FaceLandmarkerT> | null = null;
let vision: typeof import("@mediapipe/tasks-vision") | null = null;

/** Lazily create the FaceLandmarker. Safe to call repeatedly. */
export function loadFaceLandmarker(): Promise<FaceLandmarkerT> {
  if (!landmarkerPromise) {
    landmarkerPromise = (async () => {
      // Dynamic import keeps MediaPipe out of the SSR/module-eval path.
      const mod = await (modPromise ??= import("@mediapipe/tasks-vision"));
      vision = mod;
      const fileset = await mod.FilesetResolver.forVisionTasks(WASM_BASE);
      return mod.FaceLandmarker.createFromOptions(fileset, {
        baseOptions: { modelAssetPath: MODEL_URL, delegate: "GPU" },
        runningMode: "VIDEO",
        numFaces: 1,
        outputFaceBlendshapes: true, // for smile detection
      });
    })();
  }
  return landmarkerPromise;
}

export interface FaceMetrics {
  /** Face-box center, as a fraction of the frame (0..1). */
  cx: number;
  cy: number;
  /** Face-box size, as a fraction of frame width/height. */
  faceW: number;
  faceH: number;
  /** Signed head yaw in ~degrees. +/- per YAW_DIRECTION. */
  yaw: number;
  /** Head roll (tilt) in degrees; ~0 is level. */
  roll: number;
  /** Head pitch in ~degrees; ~0 is chin-level. */
  pitch: number;
  /** Smile strength 0..1 from blendshapes. */
  smile: number;
  landmarks: NormalizedLandmark[];
}

const clamp = (v: number, lo: number, hi: number) => Math.max(lo, Math.min(hi, v));

/** Turn a raw detection into framing/pose metrics, or null if no clear face. */
export function extractMetrics(result: FaceLandmarkerResult): FaceMetrics | null {
  const lms = result.faceLandmarks?.[0];
  if (!lms || lms.length < 468) return null;

  // Face box from landmark extents.
  let minX = 1,
    minY = 1,
    maxX = 0,
    maxY = 0;
  for (const p of lms) {
    if (p.x < minX) minX = p.x;
    if (p.x > maxX) maxX = p.x;
    if (p.y < minY) minY = p.y;
    if (p.y > maxY) maxY = p.y;
  }
  const faceW = maxX - minX;
  const faceH = maxY - minY;
  const cx = (minX + maxX) / 2;
  const cy = (minY + maxY) / 2;

  const nose = lms[NOSE_TIP];
  const eyeR = lms[EYE_R_OUTER];
  const eyeL = lms[EYE_L_OUTER];
  const faceRight = lms[FACE_R];
  const faceLeft = lms[FACE_L];
  const brow = lms[BROW_MID];
  const chin = lms[CHIN];

  // Yaw: how far the nose sits from the midline of the two face contours,
  // normalized by half the face width. Saturates near a profile but is stable.
  const midX = (faceRight.x + faceLeft.x) / 2;
  const halfW = Math.max(1e-4, Math.abs(faceLeft.x - faceRight.x) / 2);
  const yaw = YAW_DIRECTION * clamp((nose.x - midX) / halfW, -1.4, 1.4) * 70;

  // Roll: tilt of the eye line.
  const roll = (Math.atan2(eyeL.y - eyeR.y, eyeL.x - eyeR.x) * 180) / Math.PI;

  // Pitch: nose height between brow and chin (0.5 ≈ neutral). Rough — used only
  // for a loose "chin level" nudge on front shots.
  const span = Math.max(1e-4, chin.y - brow.y);
  const pitch = ((nose.y - brow.y) / span - 0.62) * 140;

  // Smile from blendshapes (avg of the two smile categories).
  let smile = 0;
  const cats = result.faceBlendshapes?.[0]?.categories;
  if (cats) {
    let l = 0,
      r = 0;
    for (const c of cats) {
      if (c.categoryName === "mouthSmileLeft") l = c.score;
      else if (c.categoryName === "mouthSmileRight") r = c.score;
    }
    smile = (l + r) / 2;
  }

  return { cx, cy, faceW, faceH, yaw, roll, pitch, smile, landmarks: lms };
}

export type CoachTone = "searching" | "adjust" | "ready";
export interface ShotEval {
  ok: boolean;
  cue: string;
  tone: CoachTone;
}

// Framing bands (fractions of frame width). Kept generous so the coach guides
// rather than nags.
const FACE_MIN = 0.3;
const FACE_MAX = 0.72;
const DETAIL_MIN = 0.55;
const CENTER_TOL_X = 0.16;
const CENTER_TOL_Y = 0.18;
const ROLL_TOL = 12;
const DARK = 62;
const BRIGHT = 236;
const FRONT_YAW = 13; // |yaw| under this = facing forward
const TQ_MIN = 22;
const TQ_MAX = 52; // three-quarter window
const PROFILE_YAW = 42; // strong turn = profile (landmarks fade past ~60°)
const SMILE_MIN = 0.32;

/**
 * Evaluate the live pose against the shot we're currently coaching. Returns the
 * single highest-priority cue so the UI stays calm (one instruction at a time).
 * `brightness` is mean luma (0..255) over the face region, sampled by the caller.
 */
export function evaluateShot(
  shotKey: string,
  m: FaceMetrics,
  brightness: number
): ShotEval {
  const wantsDetail = shotKey === "detail";

  // 1. Distance / framing.
  if (!wantsDetail && m.faceW < FACE_MIN)
    return { ok: false, cue: "Move a little closer", tone: "adjust" };
  if (m.faceW > FACE_MAX && !wantsDetail)
    return { ok: false, cue: "Move back a little", tone: "adjust" };
  if (wantsDetail && m.faceW < DETAIL_MIN)
    return { ok: false, cue: "Move closer for the detail shot", tone: "adjust" };

  // 2. Centering.
  if (Math.abs(m.cx - 0.5) > CENTER_TOL_X || Math.abs(m.cy - 0.5) > CENTER_TOL_Y)
    return { ok: false, cue: "Center your face in the frame", tone: "adjust" };

  // 3. Angle — the defining trait of each shot.
  const angle = shotAngleCue(shotKey, m.yaw);
  if (angle) return { ok: false, cue: angle, tone: "adjust" };

  // 4. Head level (skip for profiles, where the eye line is unreliable).
  const isProfile = shotKey.endsWith("profile");
  if (!isProfile && Math.abs(m.roll) > ROLL_TOL)
    return { ok: false, cue: "Level your head", tone: "adjust" };

  // 5. Lighting.
  if (brightness < DARK)
    return { ok: false, cue: "More light — face a window", tone: "adjust" };
  if (brightness > BRIGHT)
    return { ok: false, cue: "Too bright — ease off the backlight", tone: "adjust" };

  // 6. Expression (smile shot only).
  if (shotKey === "front-smile" && m.smile < SMILE_MIN)
    return { ok: false, cue: "Give a natural smile", tone: "adjust" };

  return { ok: true, cue: "Hold still…", tone: "ready" };
}

function shotAngleCue(shotKey: string, yaw: number): string | null {
  switch (shotKey) {
    case "front-neutral":
    case "front-smile":
    case "detail":
      if (Math.abs(yaw) <= FRONT_YAW) return null;
      return yaw > 0 ? "Turn to face the camera" : "Turn to face the camera";
    case "left-profile":
      if (yaw >= PROFILE_YAW) return null;
      return "Turn further to your left";
    case "right-profile":
      if (yaw <= -PROFILE_YAW) return null;
      return "Turn further to your right";
    case "three-quarter": {
      const a = Math.abs(yaw);
      if (a >= TQ_MIN && a <= TQ_MAX) return null;
      return a < TQ_MIN ? "Turn slightly to one side" : "Turn back toward center a bit";
    }
    default:
      return null;
  }
}

/**
 * Draw the clean contour "scan" mesh (face oval, brows, eyes, lips, irises) —
 * deliberately not the full tessellation, so it reads elegant, not busy.
 * Coordinates are normalized; caller passes the target canvas size.
 */
export function drawFaceMesh(
  ctx: CanvasRenderingContext2D,
  landmarks: NormalizedLandmark[],
  w: number,
  h: number,
  opts: { color: string; lineWidth: number; glow?: string }
) {
  if (!vision) return;
  const FL = vision.FaceLandmarker;
  const sets = [
    FL.FACE_LANDMARKS_FACE_OVAL,
    FL.FACE_LANDMARKS_LEFT_EYE,
    FL.FACE_LANDMARKS_RIGHT_EYE,
    FL.FACE_LANDMARKS_LEFT_EYEBROW,
    FL.FACE_LANDMARKS_RIGHT_EYEBROW,
    FL.FACE_LANDMARKS_LIPS,
    FL.FACE_LANDMARKS_LEFT_IRIS,
    FL.FACE_LANDMARKS_RIGHT_IRIS,
  ];
  ctx.save();
  ctx.lineWidth = opts.lineWidth;
  ctx.strokeStyle = opts.color;
  ctx.lineJoin = "round";
  if (opts.glow) {
    ctx.shadowColor = opts.glow;
    ctx.shadowBlur = 8;
  }
  ctx.beginPath();
  for (const set of sets) {
    for (const c of set) {
      const a = landmarks[c.start];
      const b = landmarks[c.end];
      if (!a || !b) continue;
      ctx.moveTo(a.x * w, a.y * h);
      ctx.lineTo(b.x * w, b.y * h);
    }
  }
  ctx.stroke();
  ctx.restore();
}

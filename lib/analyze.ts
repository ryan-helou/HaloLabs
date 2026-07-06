import { promises as fs } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { prisma } from "./db";
import { getPhoto } from "./storage";
import { orderCapturePhotos } from "./photo";
import { anthropicConfigured } from "./env";
import { resolvePersonDir, IMAGE_EXTS, contentTypeFor } from "./paths";
import { JOB_LEASE_MS, recoverOrphans } from "./queue";
import type { Person } from "./types";

/**
 * Server-side hosted analysis — the cloud replacement for the local `claude`
 * CLI. It reads a person's photos (from R2, or local disk in dev), sends them
 * to the Claude API with vision, and forces a single structured tool call whose
 * input is the v2 record. The result is written to AnalysisResult and the job's
 * status + token usage are recorded for unit economics.
 *
 * The heavy product rules live in .claude/skills/analyze-faces/SKILL.md; the
 * essential constraints are mirrored in the system prompt below so the hosted
 * path produces the same shape and stays inside the STRATEGY guardrails.
 */

const MODEL = process.env.ANALYSIS_MODEL || "claude-sonnet-5";
const MAX_IMAGES = 8;
// The FREE teaser only needs to hook — one or two frontal shots is plenty to
// name strengths + the move list. The paid pass sends all MAX_IMAGES. Since
// photos in the vision input are the biggest cost driver, this roughly halves
// the free-scan cost. Override with ANALYSIS_TEASER_IMAGES.
const TEASER_MAX_IMAGES = Number(process.env.ANALYSIS_TEASER_IMAGES) || 2;

// Longest-edge cap for photos sent to the vision API. Phone photos are often
// 3000–4000px, which Claude bills as high-resolution (up to ~4784 image tokens
// each — 8 of them dominate the per-scan input cost). 1568px is the classic
// no-tiling sweet spot: at or below it an image costs ~1600 tokens while still
// preserving the fine detail (skin, brows, birthmarks) that makes the analysis
// credible. Override with ANALYSIS_IMAGE_MAX_EDGE.
const IMAGE_MAX_EDGE = Number(process.env.ANALYSIS_IMAGE_MAX_EDGE) || 1568;

export function analysisConfigured(): boolean {
  return anthropicConfigured();
}

const SYSTEM_PROMPT = `You are the HaloLabs facial-analysis engine. You look at a person's photos and produce neutral observations plus a constructive, option-framed grooming plan. You call the emit_analysis tool exactly once with the full result. Never write prose outside the tool call.

HARD CONSTRAINTS (these are policy, not style):
- No attractiveness score, no 1–10, no percentile, no ranking or comparison of people. impact/effort/cost describe the SUGGESTION (the intervention), never the person.
- Never recommend surgery, fillers, injections, or structural modification. If bone structure limits something, say it's structural, say it's normal, move on. Prescription-adjacent options (finasteride, tretinoin) are framed "discuss with a doctor" with an OTC alternative named. Procedures (in-office whitening, aligners) may be described with cost bands + "consult a licensed provider", never prescribed.
- Observations are neutral and descriptive; never itemize "flaws". Lead with strengths (plan.strengths is mandatory and shows first).
- Every suggestion must be personal: the "why" must reference something visible in THEIR photos or stated in their onboarding. If it could be pasted onto a random face, cut it.
- Respect onboarding hard no-gos (avoid) absolutely. Respect routineMinutesPerDay (a "5" person gets ~3 steps, not 9) and budgetPerMonth (a "low" person gets drugstore examples only).
- Quote onboarding back in plan.summary and relevant "why" fields when a profile is given.
- Be honest about expectations: individual changes are small, the value is the stack. Say what reverses when stopped, what takes 8–12 weeks, what's instant.
- Evidence tiers are real: strong = RCT/meta (SPF, retinoids, sleep, weight, whitening); moderate = solid-but-conditional (minoxidil for beards, caffeine under-eyes, color theory); emerging = weak (avoid unless asked).
- If images are unusable (blurry/no face), say so in observations.generalNotes, keep advice sparse, and omit the plan.

OUTPUT RULES:
- 8–18 suggestions across hair/skin/style/fitness, each with id (kebab-case, unique), title, detail, impact/effort/cost, why, how (2–5 steps), products (when buying is involved, matched to budget), timeline, frequency, evidence, phase (1/2/3), and routineSlot when it's a repeating routine step.
- Set freeReveal:true on exactly ONE suggestion — the single high-impact, low-effort quick win shown free on the locked plan.
- plan: summary (3–5 sentences quoting their goals), strengths (3–6 specific positives), expectations (2–4 honest sentences), exactly 3 phases with every suggestion id distributed into one phase, an am/pm/weekly routine with correct layering (AM: cleanse→treat→moisturize→SPF last; PM: cleanse→active→moisturize), a deduplicated shoppingList, and 3–4 checkpoints.
- builtFor: short chips echoing the profile (e.g. "15 min/day", "budget: ~$25–75/mo", "no makeup", "focus: hair, skin"); empty array if no profile.`;

// The cheap FREE-scan pass. It produces everything the free teaser shows —
// observations, the full move LIST (tags only) with one move written out, and a
// short cover note — but NOT the expensive routine/roadmap/shopping, which are
// only generated when someone pays (see runFullPlanJob). This is what keeps a
// viral wave of free scans from burning the plan budget for plans nobody buys.
const TEASER_SYSTEM_PROMPT = `You are the HaloLabs facial-analysis engine producing the FREE teaser scan. You look at a person's photos and produce neutral observations, the list of moves you'd recommend (tags only, plus exactly ONE written out in full), and a short cover note. You call emit_teaser exactly once. Never write prose outside the tool call.

HARD CONSTRAINTS (policy, not style):
- No attractiveness score, no 1–10, no percentile, no ranking or comparison of people. impact/effort/cost describe the SUGGESTION (the intervention), never the person.
- Never recommend surgery, fillers, injections, or structural modification.
- Observations are neutral and descriptive; never itemize "flaws". Lead with strengths (plan.strengths is mandatory and shows first).
- Every move must be personal: it must be justifiable from something visible in THEIR photos or stated in their onboarding. If it could be pasted onto a random face, cut it.
- Respect onboarding hard no-gos (avoid) absolutely. Respect routineMinutesPerDay (a "5" person gets ~3–5 moves, not 15) and budgetPerMonth (a "low" person gets drugstore-tier moves).
- If images are unusable (blurry/no face), say so in observations.generalNotes and keep advice sparse.

OUTPUT (teaser only — the routine, roadmap, and shopping list are generated LATER, on purchase, so DO NOT produce them here):
- observations: neutral notes (faceShape, hair, skin, facialHair, generalNotes, optional extras).
- advice: 8–18 moves across hair/skin/style/fitness. For EVERY move give id (kebab-case, unique), title, impact, effort, cost, and evidence. Do NOT write detail/why/how for the moves — with ONE exception: pick the single best high-impact, low-effort quick win, set freeReveal:true on it, and write it out fully (detail, a "why" tied to their photos, how as 2–4 steps, timeline, frequency). That one move is the free sample; every other move is title + tags only.
- plan: summary (3–5 sentences quoting their goals), strengths (3–6 specific positives), expectations (2–4 honest sentences). Do NOT include phases, routine, shoppingList, or checkpoints.
- builtFor: short chips echoing the profile; empty array if no profile.`;

// Tool schema — a pragmatic subset; the model fills the full v2 shape.
const LEVEL = { type: "string", enum: ["high", "medium", "low"] } as const;
const SUGGESTION = {
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    detail: { type: "string" },
    impact: LEVEL,
    effort: LEVEL,
    cost: LEVEL,
    why: { type: "string" },
    how: { type: "array", items: { type: "string" } },
    products: { type: "array", items: { type: "string" } },
    timeline: { type: "string" },
    frequency: { type: "string" },
    evidence: { type: "string", enum: ["strong", "moderate", "emerging"] },
    phase: { type: "integer", enum: [1, 2, 3] },
    routineSlot: { type: "string", enum: ["am", "pm", "weekly"] },
    freeReveal: { type: "boolean" },
  },
  required: ["id", "title", "detail", "impact", "effort", "cost"],
} as const;

const ANALYSIS_TOOL = {
  name: "emit_analysis",
  description: "Emit the complete HaloLabs v2 record for this person.",
  input_schema: {
    type: "object",
    properties: {
      observations: {
        type: "object",
        properties: {
          faceShape: { type: "string" },
          hair: { type: "string" },
          skin: { type: "string" },
          facialHair: { type: "string" },
          generalNotes: { type: "string" },
          extras: {
            type: "array",
            items: {
              type: "object",
              properties: { label: { type: "string" }, note: { type: "string" } },
              required: ["label", "note"],
            },
          },
        },
        required: ["faceShape", "hair", "skin", "facialHair", "generalNotes"],
      },
      advice: {
        type: "object",
        properties: {
          hair: { type: "array", items: SUGGESTION },
          skin: { type: "array", items: SUGGESTION },
          style: { type: "array", items: SUGGESTION },
          fitness: { type: "array", items: SUGGESTION },
        },
        required: ["hair", "skin", "style", "fitness"],
      },
      plan: {
        type: "object",
        properties: {
          summary: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          expectations: { type: "string" },
          phases: {
            type: "array",
            items: {
              type: "object",
              properties: {
                number: { type: "integer", enum: [1, 2, 3] },
                title: { type: "string" },
                window: { type: "string" },
                focus: { type: "string" },
                suggestionIds: { type: "array", items: { type: "string" } },
              },
              required: ["number", "title", "window", "focus", "suggestionIds"],
            },
          },
          routine: {
            type: "array",
            items: {
              type: "object",
              properties: {
                slot: { type: "string", enum: ["am", "pm", "weekly"] },
                step: { type: "string" },
                suggestionId: { type: "string" },
              },
              required: ["slot", "step"],
            },
          },
          shoppingList: {
            type: "array",
            items: {
              type: "object",
              properties: {
                item: { type: "string" },
                examples: { type: "string" },
                approxCost: { type: "string" },
                suggestionId: { type: "string" },
              },
              required: ["item", "examples", "approxCost"],
            },
          },
          checkpoints: {
            type: "array",
            items: {
              type: "object",
              properties: {
                week: { type: "integer" },
                lookFor: { type: "string" },
              },
              required: ["week", "lookFor"],
            },
          },
        },
        required: ["summary", "strengths", "expectations", "phases", "routine", "shoppingList", "checkpoints"],
      },
      builtFor: { type: "array", items: { type: "string" } },
    },
    required: ["observations", "advice", "plan", "builtFor"],
  },
} as const;

// Teaser suggestion — the free scan only requires the cheap tags for each move
// (so the "17 moves · 7 quick wins · 11 strong-evidence" counts render); the
// expensive detail/why/how is optional and only written for the one freeReveal.
const TEASER_SUGGESTION = {
  type: "object",
  properties: {
    id: { type: "string" },
    title: { type: "string" },
    impact: LEVEL,
    effort: LEVEL,
    cost: LEVEL,
    evidence: { type: "string", enum: ["strong", "moderate", "emerging"] },
    freeReveal: { type: "boolean" },
    detail: { type: "string" },
    why: { type: "string" },
    how: { type: "array", items: { type: "string" } },
    timeline: { type: "string" },
    frequency: { type: "string" },
  },
  required: ["id", "title", "impact", "effort", "cost"],
} as const;

const TEASER_TOOL = {
  name: "emit_teaser",
  description:
    "Emit the free HaloLabs teaser: observations, the move list (tags only, exactly one written out in full), and a short cover note. No routine, roadmap, or shopping list.",
  input_schema: {
    type: "object",
    properties: {
      observations: (
        ANALYSIS_TOOL.input_schema.properties as Record<string, unknown>
      ).observations,
      advice: {
        type: "object",
        properties: {
          hair: { type: "array", items: TEASER_SUGGESTION },
          skin: { type: "array", items: TEASER_SUGGESTION },
          style: { type: "array", items: TEASER_SUGGESTION },
          fitness: { type: "array", items: TEASER_SUGGESTION },
        },
        required: ["hair", "skin", "style", "fitness"],
      },
      plan: {
        type: "object",
        properties: {
          summary: { type: "string" },
          strengths: { type: "array", items: { type: "string" } },
          expectations: { type: "string" },
        },
        required: ["summary", "strengths", "expectations"],
      },
      builtFor: { type: "array", items: { type: "string" } },
    },
    required: ["observations", "advice", "plan"],
  },
} as const;

type MediaType = "image/png" | "image/webp" | "image/jpeg" | "image/gif";
type ImageBlock = {
  type: "image";
  source: { type: "base64"; media_type: MediaType; data: string };
};

/** Coerce an arbitrary content type to one Claude's vision API accepts. */
function mediaType(ct: string | null | undefined): MediaType {
  switch ((ct ?? "").toLowerCase()) {
    case "image/png":
      return "image/png";
    case "image/webp":
      return "image/webp";
    case "image/gif":
      return "image/gif";
    default:
      return "image/jpeg";
  }
}

/**
 * Shrink an oversized photo to IMAGE_MAX_EDGE on its longest edge and re-encode
 * as JPEG, so full-resolution phone photos don't blow the per-scan vision-token
 * budget. Best-effort: any decode/resize failure (or an animated GIF) falls back
 * to the original bytes so the analysis still runs. Returns a JPEG block on the
 * downsample path, else the original media type.
 */
async function toImageBlock(
  buffer: Buffer,
  ct: string | null | undefined
): Promise<ImageBlock> {
  try {
    // GIFs may be animated; leave them untouched rather than flatten a frame.
    if (mediaType(ct) === "image/gif") throw new Error("skip gif");
    const img = sharp(buffer, { failOn: "none" });
    const meta = await img.metadata();
    const longest = Math.max(meta.width ?? 0, meta.height ?? 0);
    // Only re-encode when it actually saves tokens (oversized, or a heavy PNG).
    if (longest > IMAGE_MAX_EDGE || mediaType(ct) === "image/png") {
      const out = await img
        .rotate() // honor EXIF orientation before resizing
        .resize({
          width: IMAGE_MAX_EDGE,
          height: IMAGE_MAX_EDGE,
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 82 })
        .toBuffer();
      return {
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data: out.toString("base64") },
      };
    }
  } catch {
    /* fall through to the original bytes */
  }
  return {
    type: "image",
    source: { type: "base64", media_type: mediaType(ct), data: buffer.toString("base64") },
  };
}

/**
 * Collect a person's images. `photos` always lists ALL their photos (for the
 * gallery), but only the first `maxBlocks` are decoded and sent to the model —
 * so the free teaser can analyze just the frontal shot(s) while the paid pass
 * sends everything. Photos come in capture order (front first), so the first
 * couple are the frontal ones. Prefers R2 (Photo rows); falls back to disk.
 */
async function collectImages(
  personId: string,
  maxBlocks: number = MAX_IMAGES
): Promise<{ photos: string[]; blocks: ImageBlock[] }> {
  const photos: string[] = [];
  const blocks: ImageBlock[] = [];

  const rows = await prisma.photo.findMany({
    // Baseline analysis photos only — progress check-in photos (keyed under
    // .../progress/...) are for the timeline, not the analysis.
    where: { personId, NOT: { r2Key: { contains: "/progress/" } } },
    orderBy: { uploadedAt: "asc" },
    take: MAX_IMAGES,
  });

  if (rows.length > 0) {
    for (const row of rows) photos.push(row.r2Key); // full gallery
    for (const row of rows.slice(0, maxBlocks)) {
      const obj = await getPhoto(row.r2Key);
      if (!obj) continue;
      blocks.push(
        await toImageBlock(Buffer.from(obj.body), row.contentType || obj.contentType)
      );
    }
    return { photos, blocks };
  }

  // Local disk fallback (dev / on-machine person folders).
  const dir = resolvePersonDir(personId);
  if (dir) {
    let entries: string[] = [];
    try {
      entries = (await fs.readdir(dir)).filter(
        (n) => !n.startsWith(".") && IMAGE_EXTS.has(path.extname(n).toLowerCase())
      );
    } catch {
      entries = [];
    }
    const shown = orderCapturePhotos(entries).slice(0, MAX_IMAGES);
    for (const name of shown) photos.push(`${personId}/${name}`); // full gallery
    for (const name of shown.slice(0, maxBlocks)) {
      try {
        const data = await fs.readFile(path.join(dir, name));
        blocks.push(await toImageBlock(data, contentTypeFor(path.extname(name))));
      } catch {
        /* skip unreadable file */
      }
    }
  }

  return { photos, blocks };
}

/**
 * Rough Claude Sonnet pricing (USD cents) for unit-economics tracking. Accounts
 * for the four token classes separately: fresh input at base rate, cache writes
 * at 1.25×, cache reads at 0.1× (the whole point of caching the rubric), and
 * output. `inputTokens` from the API is already the uncached remainder, so the
 * three input buckets don't double-count.
 */
function estimateCostCents(u: {
  input_tokens: number;
  output_tokens: number;
  cache_creation_input_tokens?: number | null;
  cache_read_input_tokens?: number | null;
}): number {
  const inPer1M = 300; // $3.00 / 1M input  → cents
  const outPer1M = 1500; // $15.00 / 1M output → cents
  const cacheWrite = (u.cache_creation_input_tokens ?? 0) * (inPer1M * 1.25);
  const cacheRead = (u.cache_read_input_tokens ?? 0) * (inPer1M * 0.1);
  return Math.round(
    (u.input_tokens * inPer1M +
      u.output_tokens * outPer1M +
      cacheWrite +
      cacheRead) /
      1_000_000
  );
}

type AnyTool = typeof ANALYSIS_TOOL | typeof TEASER_TOOL;

/**
 * One structured, tool-forced model call with the shared client (bounded
 * timeout + retries, since jobs run fire-and-forget) and prompt-caching on the
 * static tools+system prefix. Returns the tool payload + usage.
 */
async function callModel(opts: {
  system: string;
  tool: AnyTool;
  toolName: string;
  userText: string;
  blocks: ImageBlock[];
}): Promise<{ payload: Partial<Person>; usage: Anthropic.Usage }> {
  const anthropic = new Anthropic({
    apiKey: process.env.ANTHROPIC_API_KEY,
    timeout: 4 * 60 * 1000,
    maxRetries: 2,
  });
  const res = await anthropic.messages.create({
    model: MODEL,
    max_tokens: 12000,
    system: [
      { type: "text", text: opts.system, cache_control: { type: "ephemeral" } },
    ],
    tools: [opts.tool as unknown as Anthropic.Tool],
    tool_choice: { type: "tool", name: opts.toolName },
    messages: [
      { role: "user", content: [{ type: "text", text: opts.userText }, ...opts.blocks] },
    ],
  });
  const toolUse = res.content.find(
    (c): c is Anthropic.ToolUseBlock => c.type === "tool_use"
  );
  if (!toolUse) throw new Error("Model did not return a structured analysis.");
  return { payload: toolUse.input as Partial<Person>, usage: res.usage };
}

/** Assemble a Person record from a tool payload. */
function buildRecord(
  personId: string,
  displayName: string,
  photos: string[],
  payload: Partial<Person>
): Person {
  return {
    id: personId,
    displayName,
    analyzedAt: new Date().toISOString(),
    photoCount: photos.length,
    photos,
    observations: payload.observations ?? {
      faceShape: "",
      hair: "",
      skin: "",
      facialHair: "",
      generalNotes: "",
    },
    advice: payload.advice ?? { hair: [], skin: [], style: [], fitness: [] },
    ...(payload.plan ? { plan: payload.plan } : {}),
    ...(payload.builtFor ? { builtFor: payload.builtFor } : {}),
  };
}

async function markFailed(jobId: string, err: unknown): Promise<void> {
  await prisma.analysisJob.update({
    where: { id: jobId },
    data: {
      status: "FAILED",
      error: err instanceof Error ? err.message.slice(0, 500) : "Unknown error",
      completedAt: new Date(),
    },
  });
}

/**
 * Load a claimed job with its person. The QUEUED→RUNNING transition is the
 * claimer's job now (the worker's atomic `FOR UPDATE SKIP LOCKED` claim, or the
 * inline dev claim below) — this only loads and fails fast if analysis isn't
 * configured.
 */
async function prepareJob(jobId: string) {
  const job = await prisma.analysisJob.findUnique({
    where: { id: jobId },
    include: { person: true },
  });
  if (!job) return null;
  if (!analysisConfigured()) {
    await markFailed(jobId, new Error("Analysis is not configured (missing ANTHROPIC_API_KEY)."));
    return null;
  }
  return job;
}

function profileTextFor(profile: unknown): string {
  return profile
    ? `Onboarding answers (respect these):\n${JSON.stringify(profile, null, 2)}`
    : "No onboarding profile was provided — build from the photos alone and do not invent preferences.";
}

async function writeResult(
  job: { id: string; personId: string },
  record: Person,
  usage: Anthropic.Usage,
  label: string
): Promise<void> {
  console.log(
    `[analyze:${label}] job=${job.id} in=${usage.input_tokens} out=${usage.output_tokens} ` +
      `cacheWrite=${usage.cache_creation_input_tokens ?? 0} cacheRead=${usage.cache_read_input_tokens ?? 0}`
  );
  await prisma.$transaction([
    prisma.analysisResult.create({
      data: {
        jobId: job.id,
        personId: job.personId,
        version: 2,
        data: record as unknown as object,
      },
    }),
    prisma.analysisJob.update({
      where: { id: job.id },
      data: {
        status: "COMPLETED",
        completedAt: new Date(),
        inputTokens: usage.input_tokens,
        outputTokens: usage.output_tokens,
        costCents: estimateCostCents(usage),
      },
    }),
  ]);
}

// ── Job processors ──────────────────────────────────────────────────────────
// Jobs are drained from the AnalysisJob table by a separate worker process
// (worker/index.ts) that claims rows atomically (FOR UPDATE SKIP LOCKED) and
// calls processJob() on each. Concurrency, retries, and crash recovery live in
// the worker + lib/queue.ts — this module just knows how to RUN one already-
// claimed job. In dev (or WORKER_INLINE=1) startAnalysis/startFullPlan also
// process the job inline so `npm run dev` works without a second process.

// Dev/transition convenience: process enqueued jobs in-process. On by default
// off production; set WORKER_INLINE=1 to force it (the interim stopgap before a
// dedicated worker service exists), =0 to force it off.
const INLINE_WORKER =
  process.env.WORKER_INLINE === "1" ||
  (process.env.WORKER_INLINE !== "0" && process.env.NODE_ENV !== "production");

type PreparedJob = {
  id: string;
  personId: string;
  jobType: "TEASER" | "FULL";
  person: { displayName: string; profile: unknown };
};

/** The FREE teaser: observations + tagged move list (one revealed) + cover note. */
async function runTeaser(job: PreparedJob): Promise<void> {
  // Teaser: only the frontal shot(s) go to the model (cheap); the record still
  // lists every uploaded photo for the gallery.
  const { photos, blocks } = await collectImages(job.personId, TEASER_MAX_IMAGES);
  if (blocks.length === 0) throw new Error("No readable photos found for this person.");
  const { payload, usage } = await callModel({
    system: TEASER_SYSTEM_PROMPT,
    tool: TEASER_TOOL,
    toolName: "emit_teaser",
    userText:
      `Analyze ${job.person.displayName} — this is the FREE teaser. ${profileTextFor(job.person.profile)}\n\n` +
      `Call emit_teaser: observations, the full move list with tags (exactly one move fully written out with freeReveal:true), and a short cover note (summary, strengths, expectations). Do NOT produce the routine, roadmap, or shopping list.`,
    blocks,
  });
  await writeResult(job, buildRecord(job.personId, job.person.displayName, photos, payload), usage, "teaser");
}

/** The PAID pass: every move fully written + the full plan, seeded by the teaser. */
async function runFull(job: PreparedJob): Promise<void> {
  const prev = await prisma.analysisResult.findFirst({
    where: { personId: job.personId },
    orderBy: { createdAt: "desc" },
  });
  const teaser = prev?.data as unknown as Person | undefined;

  const { photos, blocks } = await collectImages(job.personId);
  if (blocks.length === 0) throw new Error("No readable photos found for this person.");

  const teaserContext = teaser
    ? `You already showed them a quick FREE teaser generated from just their main photo — here it is. Now do the COMPLETE deep analysis using ALL of their photos: you can now see the profile, 3/4, and detail shots the teaser couldn't. KEEP every move from the teaser (same ids and titles — don't drop any the user was promised) and ADD any new moves the additional angles reveal. Refine the observations and strengths with what the extra photos show. The teaser:\n${JSON.stringify(
        {
          observations: teaser.observations,
          advice: teaser.advice,
          strengths: teaser.plan?.strengths,
          summary: teaser.plan?.summary,
        },
        null,
        2
      )}`
    : "No teaser was found — produce the complete record from the photos.";

  const { payload, usage } = await callModel({
    system: SYSTEM_PROMPT,
    tool: ANALYSIS_TOOL,
    toolName: "emit_analysis",
    userText:
      `Complete the deep analysis + full plan for ${job.person.displayName}. ${profileTextFor(job.person.profile)}\n\n${teaserContext}\n\n` +
      `Call emit_analysis with the COMPLETE v2 record: every move fully written (detail, why tied to their photos, how as 2–5 steps, products matched to budget, timeline, frequency, phase, routineSlot), plus the full plan — exactly 3 phases distributing every move id, an AM/PM/weekly routine with correct layering, a deduplicated shoppingList, and 3–4 checkpoints.`,
    blocks,
  });

  // The paid pass is authoritative — it analyzed every photo. Take it whole;
  // only fall back to the teaser's onboarding chips if the model omitted them.
  const record = buildRecord(job.personId, job.person.displayName, photos, payload);
  if ((!record.builtFor || record.builtFor.length === 0) && teaser?.builtFor?.length) {
    record.builtFor = teaser.builtFor;
  }
  await writeResult(job, record, usage, "full");
}

/**
 * Run one already-claimed job to completion. Dispatches on jobType; any failure
 * is captured onto the job row (never thrown) so the worker's Promise.all can't
 * be poisoned by a single bad job.
 */
export async function processJob(jobId: string): Promise<void> {
  const job = await prepareJob(jobId);
  if (!job) return;
  try {
    if (job.jobType === "FULL") await runFull(job as PreparedJob);
    else await runTeaser(job as PreparedJob);
  } catch (err) {
    await markFailed(jobId, err);
  }
}

// ── Bounded inline processing (dev + the WORKER_INLINE stopgap) ──────────────
// When the web process handles jobs itself, it MUST bound concurrency or a viral
// spike fires unbounded simultaneous Claude calls (each loading base64 images)
// and OOMs the box. This semaphore caps in-process jobs; the excess wait as
// resolved-later promises while their rows stay QUEUED (durable). The dedicated
// worker service has its own batch-based cap and does not use this path.
const INLINE_CONCURRENCY = Number(process.env.WORKER_CONCURRENCY) || 4;
let inlineActive = 0;
const inlineWaiters: (() => void)[] = [];

function inlineAcquire(): Promise<void> {
  if (inlineActive < INLINE_CONCURRENCY) {
    inlineActive++;
    return Promise.resolve();
  }
  return new Promise((resolve) => inlineWaiters.push(resolve));
}
function inlineRelease(): void {
  const next = inlineWaiters.shift();
  if (next) next(); // hand the slot to the next waiter (count unchanged)
  else inlineActive--;
}

// Opportunistic orphan recovery for the inline path (the dedicated worker does
// its own). Throttled to at most once/minute per process so it costs ~nothing.
let lastRecoverAt = 0;
async function maybeRecoverInline(): Promise<void> {
  const now = Date.now();
  if (now - lastRecoverAt < 60_000) return;
  lastRecoverAt = now;
  try {
    await recoverOrphans();
  } catch {
    /* best-effort */
  }
}

/**
 * Inline processing for dev / the WORKER_INLINE stopgap: bounded by the
 * semaphore, then atomically claim the job (WHERE status=QUEUED, so if a real
 * worker grabbed it first this is a no-op) and process it. Fire-and-forget safe.
 */
async function processInline(jobId: string): Promise<void> {
  await inlineAcquire();
  try {
    const claimed = await prisma.analysisJob.updateMany({
      where: { id: jobId, status: "QUEUED" },
      data: {
        status: "RUNNING",
        startedAt: new Date(),
        leaseUntil: new Date(Date.now() + JOB_LEASE_MS),
        attempts: { increment: 1 },
      },
    });
    if (claimed.count === 0) return; // a worker (or another inline call) claimed it
    await processJob(jobId);
  } finally {
    inlineRelease();
  }
}

/** Enqueue the free teaser scan. The worker (or inline stopgap) processes it. */
export async function startAnalysis(userId: string, personId: string): Promise<string> {
  const job = await prisma.analysisJob.create({
    data: { userId, personId, status: "QUEUED", jobType: "TEASER" },
  });
  if (INLINE_WORKER) {
    void maybeRecoverInline();
    void processInline(job.id);
  }
  return job.id;
}

/** Enqueue the paid full-plan generation. The worker (or inline stopgap) processes it. */
export async function startFullPlan(userId: string, personId: string): Promise<string> {
  const job = await prisma.analysisJob.create({
    data: { userId, personId, status: "QUEUED", jobType: "FULL" },
  });
  if (INLINE_WORKER) {
    void maybeRecoverInline();
    void processInline(job.id);
  }
  return job.id;
}

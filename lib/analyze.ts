import { promises as fs } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
import sharp from "sharp";
import { prisma } from "./db";
import { getPhoto } from "./storage";
import { anthropicConfigured } from "./env";
import { resolvePersonDir, IMAGE_EXTS, contentTypeFor } from "./paths";
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
    required: ["observations", "advice"],
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
 * Collect a person's images as base64 blocks, plus the photo references to
 * store on the result. Prefers R2 (Photo rows); falls back to local disk.
 */
async function collectImages(
  personId: string
): Promise<{ photos: string[]; blocks: ImageBlock[] }> {
  const photos: string[] = [];
  const blocks: ImageBlock[] = [];

  const rows = await prisma.photo.findMany({
    where: { personId },
    orderBy: { uploadedAt: "asc" },
    take: MAX_IMAGES,
  });

  if (rows.length > 0) {
    for (const row of rows) {
      const obj = await getPhoto(row.r2Key);
      if (!obj) continue;
      photos.push(row.r2Key);
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
    entries.sort();
    for (const name of entries.slice(0, MAX_IMAGES)) {
      try {
        const data = await fs.readFile(path.join(dir, name));
        photos.push(`${personId}/${name}`);
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

/**
 * Run one analysis job to completion: mark RUNNING, call the model, write the
 * result, mark COMPLETED (or FAILED with the error). Safe to call fire-and-
 * forget from a route handler on a persistent Node server.
 */
export async function runAnalysisJob(jobId: string): Promise<void> {
  const job = await prisma.analysisJob.findUnique({
    where: { id: jobId },
    include: { person: true },
  });
  if (!job) return;

  if (!analysisConfigured()) {
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        error: "Analysis is not configured (missing ANTHROPIC_API_KEY).",
        completedAt: new Date(),
      },
    });
    return;
  }

  try {
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: { status: "RUNNING", startedAt: new Date() },
    });

    const { photos, blocks } = await collectImages(job.personId);
    if (blocks.length === 0) {
      throw new Error("No readable photos found for this person.");
    }

    const profile = job.person.profile as Record<string, unknown> | null;
    const profileText = profile
      ? `Onboarding answers (respect these):\n${JSON.stringify(profile, null, 2)}`
      : "No onboarding profile was provided — build from the photos alone and do not invent preferences.";

    // Bounded timeout + retries: this runs fire-and-forget, so a network hang
    // must eventually reject (→ job FAILED) rather than pin the job at RUNNING
    // and block the next start. 4 min is comfortably above a normal scan.
    const anthropic = new Anthropic({
      apiKey: process.env.ANTHROPIC_API_KEY,
      timeout: 4 * 60 * 1000,
      maxRetries: 2,
    });
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      // Cache the static prefix (tools render first, then system). One breakpoint
      // on the last system block caches tools + system together, so every scan
      // after the first reads that ~3k-token rubric at ~0.1× instead of full
      // price. The photos live in `messages` after the breakpoint, so they never
      // pollute the cache key. Verify via usage.cache_read_input_tokens below.
      system: [
        { type: "text", text: SYSTEM_PROMPT, cache_control: { type: "ephemeral" } },
      ],
      tools: [ANALYSIS_TOOL as unknown as Anthropic.Tool],
      tool_choice: { type: "tool", name: "emit_analysis" },
      messages: [
        {
          role: "user",
          content: [
            {
              type: "text",
              text: `Analyze ${job.person.displayName}. ${profileText}\n\nCall emit_analysis with the complete v2 record.`,
            },
            ...blocks,
          ],
        },
      ],
    });

    const toolUse = res.content.find(
      (c): c is Anthropic.ToolUseBlock => c.type === "tool_use"
    );
    if (!toolUse) throw new Error("Model did not return a structured analysis.");

    const payload = toolUse.input as Partial<Person>;
    const record: Person = {
      id: job.personId,
      displayName: job.person.displayName,
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

    const usage = res.usage;
    const inputTokens = usage.input_tokens;
    const outputTokens = usage.output_tokens;

    // Cache visibility: a warm rubric shows up as cache_read_input_tokens > 0.
    // If it's persistently 0 across scans, a silent invalidator crept into the
    // static prefix (see lib/analyze system[] / ANALYSIS_TOOL).
    console.log(
      `[analyze] job=${job.id} images=${photos.length} in=${inputTokens} out=${outputTokens} ` +
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
          inputTokens,
          outputTokens,
          costCents: estimateCostCents(usage),
        },
      }),
    ]);
  } catch (err) {
    await prisma.analysisJob.update({
      where: { id: jobId },
      data: {
        status: "FAILED",
        error: err instanceof Error ? err.message.slice(0, 500) : "Unknown error",
        completedAt: new Date(),
      },
    });
  }
}

/** Create a queued job for a person and start it (fire-and-forget). */
export async function startAnalysis(
  userId: string,
  personId: string
): Promise<string> {
  const job = await prisma.analysisJob.create({
    data: { userId, personId, status: "QUEUED" },
  });
  // Persistent Node server (Railway): the promise keeps running after the
  // response returns. A dedicated queue/worker would be the next hardening step.
  void runAnalysisJob(job.id);
  return job.id;
}

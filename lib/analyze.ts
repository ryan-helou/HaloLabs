import { promises as fs } from "node:fs";
import path from "node:path";
import Anthropic from "@anthropic-ai/sdk";
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
      blocks.push({
        type: "image",
        source: {
          type: "base64",
          media_type: mediaType(row.contentType || obj.contentType),
          data: Buffer.from(obj.body).toString("base64"),
        },
      });
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
        blocks.push({
          type: "image",
          source: {
            type: "base64",
            media_type: mediaType(contentTypeFor(path.extname(name))),
            data: data.toString("base64"),
          },
        });
      } catch {
        /* skip unreadable file */
      }
    }
  }

  return { photos, blocks };
}

/** Rough Claude Sonnet pricing (USD) for cost tracking. */
function estimateCostCents(inputTokens: number, outputTokens: number): number {
  const inPer1M = 300; // $3.00 / 1M input  → cents
  const outPer1M = 1500; // $15.00 / 1M output → cents
  return Math.round(
    (inputTokens / 1_000_000) * inPer1M + (outputTokens / 1_000_000) * outPer1M
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

    const anthropic = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY });
    const res = await anthropic.messages.create({
      model: MODEL,
      max_tokens: 8000,
      system: SYSTEM_PROMPT,
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

    const inputTokens = res.usage.input_tokens;
    const outputTokens = res.usage.output_tokens;

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
          costCents: estimateCostCents(inputTokens, outputTokens),
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

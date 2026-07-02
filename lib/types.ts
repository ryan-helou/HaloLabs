// Shared data contract for LookLab.
//
// This file is the single source of truth for the shape of results.json,
// profile.json (onboarding), and progress.json. Both the analyze-faces Claude
// Code skill (writer) and this viewer (reader) must conform to these types
// exactly.
//
// Schema v2 is a superset of v1: every new field is optional so v1 records
// keep rendering. The skill writes v2.

/** Qualitative level used to tag a suggestion. Never a rating of a person. */
export type Level = "high" | "medium" | "low";

/** How strong the published evidence is for an intervention. */
export type EvidenceTier = "strong" | "moderate" | "emerging";

/** Which daily-routine slot a suggestion belongs to, if any. */
export type RoutineSlot = "am" | "pm" | "weekly";

/** The advice categories, in display order. */
export const ADVICE_CATEGORIES = [
  "hair",
  "skin",
  "style",
  "fitness",
] as const;
export type AdviceCategory = (typeof ADVICE_CATEGORIES)[number];

/**
 * A single piece of advice. impact/effort/cost describe the SUGGESTION
 * (the intervention) — how much it tends to help, how much work it takes,
 * and how much it costs — never an assessment of the person.
 */
export interface Suggestion {
  /**
   * Stable slug id unique within the person (e.g. "curl-routine"). Used for
   * plan phase references and progress tracking. Optional for v1 records —
   * the viewer falls back to category+index anchors.
   */
  id?: string;
  /** Short actionable label. */
  title: string;
  /** 1-3 sentences: what to do and why it tends to work. */
  detail: string;
  /** How much this intervention tends to help. */
  impact: Level;
  /** How much work this intervention takes. */
  effort: Level;
  /** How much this intervention tends to cost. */
  cost: Level;
  /**
   * Why THIS person, tied to something visible in their photos or stated in
   * their onboarding. If it could be pasted onto a random face, it doesn't
   * ship. (v2)
   */
  why?: string;
  /** Step-by-step how-to, one step per entry. (v2) */
  how?: string[];
  /**
   * Named product categories with 1-2 example brands and a price band, e.g.
   * "Adapalene 0.1% gel — e.g. Differin, ~$15/mo". Examples, not
   * endorsements; never affiliate-driven. (v2)
   */
  products?: string[];
  /** Honest timeline to visible results, e.g. "8–12 weeks". (v2) */
  timeline?: string;
  /** How often, e.g. "nightly", "2–3×/week". (v2) */
  frequency?: string;
  /** Published-evidence tier for this intervention class. (v2) */
  evidence?: EvidenceTier;
  /** Which plan phase this belongs to (1 = this week, 2 = 90 days, 3 = maintain). (v2) */
  phase?: 1 | 2 | 3;
  /** Routine slot if this is a repeating routine step. (v2) */
  routineSlot?: RoutineSlot;
  /**
   * Optional "after" preview: a relative path under /data/people/<id>/ to an
   * image illustrating this change (e.g. an AI-generated render). Rendered as a
   * thumbnail on the suggestion when present; omitted otherwise.
   */
  image?: string;
}

/** Neutral, descriptive observations. No scoring, no ranking. */
export interface Observations {
  faceShape: string;
  hair: string;
  skin: string;
  facialHair: string;
  generalNotes: string;
  /**
   * v2: additional per-feature observations beyond the five core fields —
   * e.g. { label: "Under-eyes", note: "…" }, { label: "Smile", note: "…" }.
   * Neutral and descriptive, like everything else here.
   */
  extras?: { label: string; note: string }[];
}

/** Advice grouped by category; any array may be empty. */
export type Advice = Record<AdviceCategory, Suggestion[]>;

/** One step in the daily/weekly routine. (v2) */
export interface RoutineStep {
  slot: RoutineSlot;
  /** What to do, short imperative ("Cleanse, then SPF 30–50"). */
  step: string;
  /** Optional id of the suggestion this step comes from. */
  suggestionId?: string;
}

/** One phase of the plan. (v2) */
export interface PlanPhase {
  /** 1 = this week, 2 = next 90 days, 3 = maintain & reassess. */
  number: 1 | 2 | 3;
  title: string;
  /** Human window, e.g. "This week", "Weeks 2–12", "Month 3+". */
  window: string;
  /** One-sentence focus of the phase. */
  focus: string;
  /** Suggestion ids that belong to this phase, in recommended order. */
  suggestionIds: string[];
}

/** One shopping-list entry. (v2) */
export interface ShoppingItem {
  /** The product category ("Adapalene 0.1% gel"). */
  item: string;
  /** Example brands, comma-separated ("Differin, La Roche-Posay"). */
  examples: string;
  /** Price band ("~$15/mo"). */
  approxCost: string;
  /** Optional id of the suggestion this supports. */
  suggestionId?: string;
}

/** A progress checkpoint. (v2) */
export interface Checkpoint {
  /** Weeks from plan start. */
  week: number;
  /** What to look for / do at this point ("Re-photo in the same light…"). */
  lookFor: string;
}

/**
 * The personalized plan — the product's core deliverable. Everything here is
 * option-framed, expectation-honest, and tied to this person's photos and
 * onboarding. (v2)
 */
export interface Plan {
  /**
   * Narrative intro: what the plan focuses on and why, quoting the person's
   * own goals/constraints back where onboarding answers exist.
   */
  summary: string;
  /** What already works — always present, always first. */
  strengths: string[];
  /** Honest expectation-setting ("small reliable wins that stack…"). */
  expectations: string;
  phases: PlanPhase[];
  routine: RoutineStep[];
  shoppingList: ShoppingItem[];
  checkpoints: Checkpoint[];
}

/** One analyzed person. */
export interface Person {
  /** Folder name (slug). */
  id: string;
  /** Humanized from the folder name. */
  displayName: string;
  /** ISO 8601 timestamp of when analysis was written. */
  analyzedAt: string;
  photoCount: number;
  /** Relative paths under /data/people/<id>/. */
  photos: string[];
  observations: Observations;
  advice: Advice;
  /** The personalized plan. Present on v2 records. */
  plan?: Plan;
  /**
   * v2: short echo of the onboarding answers the plan was built against, so
   * the viewer can show "built for: 15 min/day, low budget, no makeup".
   * Empty/absent when no profile.json existed at analysis time.
   */
  builtFor?: string[];
}

/** The whole results store. */
export interface Results {
  version: 1 | 2;
  people: Person[];
}

/* ------------------------------------------------------------------ */
/* Onboarding (profile.json — written by the app, read by the skill)   */
/* ------------------------------------------------------------------ */

export const FOCUS_AREAS = [
  "hair",
  "skin",
  "beard-facial-hair",
  "under-eyes",
  "smile-teeth",
  "style-wardrobe",
  "fitness-definition",
  "overall",
] as const;
export type FocusArea = (typeof FOCUS_AREAS)[number];

export const FOCUS_AREA_LABELS: Record<FocusArea, string> = {
  hair: "Hair",
  skin: "Skin",
  "beard-facial-hair": "Beard / facial hair",
  "under-eyes": "Under-eyes",
  "smile-teeth": "Smile & teeth",
  "style-wardrobe": "Style & wardrobe",
  "fitness-definition": "Fitness & definition",
  overall: "Everything — just be honest",
};

export const AVOID_OPTIONS = [
  "no-medication",
  "no-makeup",
  "no-hair-change",
  "no-facial-hair-change",
  "low-maintenance-only",
] as const;
export type AvoidOption = (typeof AVOID_OPTIONS)[number];

export const AVOID_LABELS: Record<AvoidOption, string> = {
  "no-medication": "No medications (e.g. minoxidil)",
  "no-makeup": "No makeup",
  "no-hair-change": "Keep my current hair length/style",
  "no-facial-hair-change": "Keep my facial hair as-is",
  "low-maintenance-only": "Low-maintenance suggestions only",
};

/**
 * Onboarding answers, saved as data/people/<id>/profile.json by the /start
 * wizard and consumed by the analyze-faces skill. The skill must quote these
 * back in the plan ("because you said…").
 */
export interface OnboardingProfile {
  version: 1;
  createdAt: string;
  /** Hard 18+ gate. The app refuses to create a profile without it. */
  ageConfirmed18Plus: true;
  displayName: string;
  /**
   * Optional contact email collected by the /start funnel. Unused until
   * accounts land; the analysis never reads it.
   */
  email?: string;
  /** Free-text goals in the person's own words. */
  goals: string;
  /** Areas they want the analysis to focus on. */
  focusAreas: FocusArea[];
  /** Minutes/day they'll realistically spend. */
  routineMinutesPerDay: "5" | "15" | "30";
  /** Monthly budget band for products/upkeep. */
  budgetPerMonth: "low" | "medium" | "high";
  /** Hard no-gos the plan must respect. */
  avoid: AvoidOption[];
  /** What they've already tried (so we never re-recommend it blindly). */
  tried: string;
  /** Lifestyle constraints: work grooming rules, allergies, climate, etc. */
  constraints: string;
  /** Anything else they want the analysis to know. */
  notes: string;
}

/* ------------------------------------------------------------------ */
/* Progress (progress.json — written by the viewer via /api/progress)  */
/* ------------------------------------------------------------------ */

export interface ProgressEntry {
  done: boolean;
  doneAt?: string;
}

/** personId → suggestionId → progress. */
export type ProgressStore = Record<string, Record<string, ProgressEntry>>;

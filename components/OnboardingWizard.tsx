"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import {
  AVOID_LABELS,
  AVOID_OPTIONS,
  FOCUS_AREAS,
  FOCUS_AREA_LABELS,
  type AvoidOption,
  type FocusArea,
} from "@/lib/types";

/**
 * Multi-step onboarding. Everything here exists to make the analysis
 * personal: the answers are written to profile.json and the analyze-faces
 * skill quotes them back in the plan. Only step 1 (18+ + name) is required —
 * the rest is skippable, but the more it knows the better the plan.
 *
 * When the /start funnel already collected name + 18+ (stored under
 * `halolabs_entry`), step 1 is skipped entirely — the wizard starts at goals.
 */

const ENTRY_STORAGE_KEY = "halolabs_entry";

const STEP_TITLES = [
  "Before we start",
  "What do you want out of this?",
  "Your reality",
  "Anything else the analysis should know?",
  "Review & create",
];

const inputCls =
  "w-full rounded-xl border border-line bg-surface px-4 py-3 text-[15px] text-ink shadow-card outline-none transition-colors placeholder:text-ink-soft/60 focus:border-pine focus:ring-2 focus:ring-pine/30";

function Chip({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={`rounded-full border px-4 py-2 text-sm transition-colors ${
        active
          ? "border-pine bg-pine text-paper"
          : "border-line bg-surface text-ink-soft hover:border-pine/50 hover:text-ink"
      }`}
    >
      {children}
    </button>
  );
}

function RadioRow<T extends string>({
  name,
  value,
  current,
  onChange,
  label,
  hint,
}: {
  name: string;
  value: T;
  current: T;
  onChange: (v: T) => void;
  label: string;
  hint?: string;
}) {
  const active = current === value;
  return (
    <label
      className={`flex cursor-pointer items-start gap-3 rounded-xl border p-4 transition-colors ${
        active ? "border-pine bg-sage/40" : "border-line bg-surface hover:border-pine/40"
      }`}
    >
      <input
        type="radio"
        name={name}
        checked={active}
        onChange={() => onChange(value)}
        className="mt-1 accent-[#3F5B6B]"
      />
      <span>
        <span className="block text-[15px] font-medium text-ink">{label}</span>
        {hint && <span className="mt-0.5 block text-xs text-ink-soft">{hint}</span>}
      </span>
    </label>
  );
}

export default function OnboardingWizard() {
  const router = useRouter();
  const searchParams = useSearchParams();

  const [step, setStep] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  // Step 1 — identity + gate. Pre-answered (and the step hidden) when the
  // /start funnel already collected these.
  const [displayName, setDisplayName] = useState("");
  const [age18, setAge18] = useState(false);
  const [email, setEmail] = useState("");
  const [fromFunnel, setFromFunnel] = useState(false);

  // Step 2 — goals
  const [goals, setGoals] = useState("");
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);

  // Step 3 — reality
  const [minutes, setMinutes] = useState<"5" | "15" | "30">("15");
  const [budget, setBudget] = useState<"low" | "medium" | "high">("medium");
  const [avoid, setAvoid] = useState<AvoidOption[]>([]);

  // Step 4 — context
  const [tried, setTried] = useState("");
  const [constraints, setConstraints] = useState("");
  const [notes, setNotes] = useState("");

  useEffect(() => {
    // Funnel entry wins: it already gated 18+ and collected the name.
    try {
      const raw = window.localStorage.getItem(ENTRY_STORAGE_KEY);
      if (raw) {
        const entry = JSON.parse(raw) as {
          name?: string;
          email?: string;
          age18?: boolean;
        };
        if (entry.age18 === true && (entry.name ?? "").trim().length >= 2) {
          setDisplayName(entry.name!.trim());
          setEmail((entry.email ?? "").trim());
          setAge18(true);
          setFromFunnel(true);
          return;
        }
      }
    } catch {
      /* fall through to the manual step */
    }
    const fromQuery = searchParams.get("name");
    if (fromQuery) {
      setDisplayName(fromQuery);
      return;
    }
    try {
      const stored = window.localStorage.getItem("halolabs_user");
      if (stored) setDisplayName(stored);
    } catch {
      /* ignore */
    }
  }, [searchParams]);

  // With funnel entry, step 0 is hidden: visible steps start at "goals".
  const titles = fromFunnel ? STEP_TITLES.slice(1) : STEP_TITLES;
  const content = fromFunnel ? step + 1 : step;

  const canLeaveStep0 = age18 && displayName.trim().length >= 2;

  const toggle = <T,>(list: T[], v: T, set: (next: T[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  const reviewRows = useMemo<Array<readonly [string, string]>>(
    () =>
      [
        ["Name", displayName.trim() || "—"],
        ...(email.trim() ? [["Email", email.trim()] as const] : []),
        ["Goals", goals.trim() || "Not specified"],
        [
          "Focus areas",
          focusAreas.length
            ? focusAreas.map((f) => FOCUS_AREA_LABELS[f]).join(", ")
            : "Everything",
        ],
        ["Time per day", `${minutes} minutes`],
        [
          "Monthly budget",
          budget === "low" ? "Under ~$25" : budget === "medium" ? "~$25–75" : "$75+",
        ],
        [
          "Off-limits",
          avoid.length ? avoid.map((a) => AVOID_LABELS[a]).join(", ") : "Nothing",
        ],
        ["Already tried", tried.trim() || "Not specified"],
        ["Constraints", constraints.trim() || "Not specified"],
        ["Notes", notes.trim() || "—"],
      ],
    [displayName, email, goals, focusAreas, minutes, budget, avoid, tried, constraints, notes]
  );

  async function submit() {
    setSubmitting(true);
    setError(null);
    try {
      const res = await fetch("/api/person", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          displayName: displayName.trim(),
          email: email.trim(),
          ageConfirmed18Plus: age18,
          goals,
          focusAreas,
          routineMinutesPerDay: minutes,
          budgetPerMonth: budget,
          avoid,
          tried,
          constraints,
          notes,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Something went wrong");
      try {
        window.localStorage.setItem("halolabs_user", displayName.trim());
        window.localStorage.removeItem(ENTRY_STORAGE_KEY);
      } catch {
        /* ignore */
      }
      router.push(`/start/photos?id=${encodeURIComponent(data.id)}`);
    } catch (e) {
      setError(e instanceof Error ? e.message : "Something went wrong");
      setSubmitting(false);
    }
  }

  return (
    <div className="mx-auto max-w-2xl">
      {/* Step indicator */}
      <div className="flex items-center gap-2">
        {titles.map((_, i) => (
          <div
            key={i}
            className={`h-1.5 flex-1 rounded-full transition-colors ${
              i <= step ? "bg-pine" : "bg-line"
            }`}
          />
        ))}
      </div>
      <p className="mt-3 font-mono text-[10px] uppercase tracking-label text-ink-soft">
        Step {step + 1} of {titles.length}
      </p>
      <h1 className="mt-2 font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
        {titles[step]}
      </h1>

      <div className="mt-8 space-y-6">
        {content === 0 && (
          <>
            <div className="rounded-2xl border border-line bg-surface p-6 shadow-card">
              <p className="text-[15px] leading-relaxed text-ink">
                Here&apos;s how this works: you answer a few questions, add a
                handful of specific photos, and the analysis studies them and
                writes you a personalized plan — observations, prioritized
                suggestions, a daily routine, and a shopping list.
              </p>
              <ul className="mt-4 space-y-2 text-sm text-ink-soft">
                <li className="flex gap-3">
                  <span className="font-mono text-xs text-pine">[1]</span>
                  Your photos are used only to build your plan — never to train
                  models — and are deleted when you delete your account.
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs text-pine">[2]</span>
                  No scores, no ratings, no comparisons — observations and options only.
                </li>
                <li className="flex gap-3">
                  <span className="font-mono text-xs text-pine">[3]</span>
                  Grooming, skin, hair, style, habits — never surgery.
                </li>
              </ul>
            </div>

            <div>
              <label htmlFor="ob-name" className="eyebrow">
                Your name
              </label>
              <input
                id="ob-name"
                type="text"
                value={displayName}
                onChange={(e) => setDisplayName(e.target.value)}
                placeholder="e.g. Alex Rivera"
                className={`mt-2 ${inputCls}`}
                autoComplete="name"
              />
            </div>

            <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-line bg-surface p-4">
              <input
                type="checkbox"
                checked={age18}
                onChange={(e) => setAge18(e.target.checked)}
                className="mt-1 accent-[#3F5B6B]"
              />
              <span className="text-sm leading-relaxed text-ink">
                I&apos;m 18 or older.
                <span className="mt-0.5 block text-xs text-ink-soft">
                  HaloLabs doesn&apos;t analyze anyone under 18 — no exceptions.
                </span>
              </span>
            </label>
          </>
        )}

        {content === 1 && (
          <>
            <div>
              <label htmlFor="ob-goals" className="eyebrow">
                In your own words
              </label>
              <textarea
                id="ob-goals"
                value={goals}
                onChange={(e) => setGoals(e.target.value)}
                rows={3}
                placeholder="e.g. Look less tired on work calls, clean up my beard, better photos for dating apps…"
                className={`mt-2 ${inputCls}`}
              />
              <p className="mt-2 text-xs text-ink-soft">
                The plan quotes this back — the more specific, the better.
              </p>
            </div>

            <div>
              <p className="eyebrow">Focus the analysis on</p>
              <div className="mt-3 flex flex-wrap gap-2">
                {FOCUS_AREAS.map((f) => (
                  <Chip
                    key={f}
                    active={focusAreas.includes(f)}
                    onClick={() => toggle(focusAreas, f, setFocusAreas)}
                  >
                    {FOCUS_AREA_LABELS[f]}
                  </Chip>
                ))}
              </div>
            </div>

            <p className="rounded-xl bg-sage/40 px-4 py-3 text-xs leading-relaxed text-pine-deep">
              A quiet note: if thinking about your appearance is causing you
              real distress — checking mirrors compulsively, avoiding going
              out — an analysis isn&apos;t the right tool, and a conversation
              with someone you trust or a professional is. This will still be
              here after.
            </p>
          </>
        )}

        {content === 2 && (
          <>
            <div>
              <p className="eyebrow">Time you&apos;ll actually spend, per day</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <RadioRow name="minutes" value="5" current={minutes} onChange={setMinutes} label="~5 min" hint="Essentials only" />
                <RadioRow name="minutes" value="15" current={minutes} onChange={setMinutes} label="~15 min" hint="A real routine" />
                <RadioRow name="minutes" value="30" current={minutes} onChange={setMinutes} label="30+ min" hint="All in" />
              </div>
            </div>

            <div>
              <p className="eyebrow">Monthly budget for products & upkeep</p>
              <div className="mt-3 grid gap-3 sm:grid-cols-3">
                <RadioRow name="budget" value="low" current={budget} onChange={setBudget} label="Under ~$25" hint="Drugstore picks" />
                <RadioRow name="budget" value="medium" current={budget} onChange={setBudget} label="~$25–75" hint="Room for a barber" />
                <RadioRow name="budget" value="high" current={budget} onChange={setBudget} label="$75+" hint="Whatever works best" />
              </div>
            </div>

            <div>
              <p className="eyebrow">Hard no-gos — the plan will respect these</p>
              <div className="mt-3 space-y-2">
                {AVOID_OPTIONS.map((a) => (
                  <label
                    key={a}
                    className={`flex cursor-pointer items-center gap-3 rounded-xl border p-3.5 transition-colors ${
                      avoid.includes(a)
                        ? "border-pine bg-sage/40"
                        : "border-line bg-surface hover:border-pine/40"
                    }`}
                  >
                    <input
                      type="checkbox"
                      checked={avoid.includes(a)}
                      onChange={() => toggle(avoid, a, setAvoid)}
                      className="accent-[#3F5B6B]"
                    />
                    <span className="text-sm text-ink">{AVOID_LABELS[a]}</span>
                  </label>
                ))}
              </div>
            </div>
          </>
        )}

        {content === 3 && (
          <>
            <div>
              <label htmlFor="ob-tried" className="eyebrow">
                What have you already tried?
              </label>
              <textarea
                id="ob-tried"
                value={tried}
                onChange={(e) => setTried(e.target.value)}
                rows={3}
                placeholder="e.g. Tried a skincare routine for a month, gave up. Beard oil. A shorter haircut in 2023 that I hated…"
                className={`mt-2 ${inputCls}`}
              />
              <p className="mt-2 text-xs text-ink-soft">
                So it never blindly re-recommends what didn&apos;t work for you.
              </p>
            </div>
            <div>
              <label htmlFor="ob-constraints" className="eyebrow">
                Lifestyle constraints
              </label>
              <textarea
                id="ob-constraints"
                value={constraints}
                onChange={(e) => setConstraints(e.target.value)}
                rows={3}
                placeholder="e.g. Work requires clean-shaven or tidy beard. Sensitive skin / allergies. Humid climate. Helmet 2h a day…"
                className={`mt-2 ${inputCls}`}
              />
            </div>
            <div>
              <label htmlFor="ob-notes" className="eyebrow">
                Anything else
              </label>
              <textarea
                id="ob-notes"
                value={notes}
                onChange={(e) => setNotes(e.target.value)}
                rows={2}
                placeholder="Anything you want the analysis to know or be careful about."
                className={`mt-2 ${inputCls}`}
              />
            </div>
          </>
        )}

        {content === 4 && (
          <div className="overflow-hidden rounded-2xl border border-line bg-surface shadow-card">
            {reviewRows.map(([label, value], i) => (
              <div
                key={label}
                className={`grid gap-1 px-5 py-3.5 sm:grid-cols-[150px_1fr] sm:gap-6 ${
                  i > 0 ? "border-t border-line" : ""
                }`}
              >
                <dt className="eyebrow pt-0.5">{label}</dt>
                <dd className="text-sm leading-relaxed text-ink">{value}</dd>
              </div>
            ))}
          </div>
        )}

        {error && (
          <p className="rounded-xl border border-clay/40 bg-clay-soft px-4 py-3 text-sm text-clay">
            {error}
          </p>
        )}

        {/* Nav */}
        <div className="flex items-center justify-between border-t border-line pt-6">
          <button
            type="button"
            onClick={() => setStep((s) => Math.max(0, s - 1))}
            className={`rounded-full px-5 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink ${
              step === 0 ? "invisible" : ""
            }`}
          >
            ← Back
          </button>
          {step < titles.length - 1 ? (
            <button
              type="button"
              disabled={content === 0 && !canLeaveStep0}
              onClick={() => setStep((s) => s + 1)}
              className="rounded-full bg-pine px-6 py-3 text-[15px] font-medium text-paper shadow-float transition-colors hover:bg-pine-deep disabled:cursor-not-allowed disabled:opacity-40"
            >
              Continue →
            </button>
          ) : (
            <button
              type="button"
              disabled={submitting}
              onClick={submit}
              className="rounded-full bg-pine px-6 py-3 text-[15px] font-medium text-paper shadow-float transition-colors hover:bg-pine-deep disabled:opacity-60"
            >
              {submitting ? "Creating…" : "Create my profile →"}
            </button>
          )}
        </div>
      </div>
    </div>
  );
}

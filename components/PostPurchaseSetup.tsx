"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import {
  AVOID_LABELS,
  AVOID_OPTIONS,
  FOCUS_AREAS,
  FOCUS_AREA_LABELS,
  type AvoidOption,
  type FocusArea,
} from "@/lib/types";
import { track } from "@/lib/track";

/**
 * The post-purchase setup — shown once, to a paying guest, before their full
 * plan builds. This is the "create your account, then fill in your info" step
 * that now comes AFTER payment:
 *   1. Account — attach an email + password to the guest account they already
 *      paid on (/api/auth/claim), so they can log back in and keep the plan.
 *   2. Your info — the questionnaire, saved to the person's profile BEFORE the
 *      paid plan generates, so the full plan is personalized to it.
 * On finish it refreshes; the person page then hands off to FullPlanBuilder.
 */

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

export default function PostPurchaseSetup({ personId }: { personId: string }) {
  const router = useRouter();
  const [step, setStep] = useState<"account" | "info">("account");
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  // Account
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");

  // Info
  const [goals, setGoals] = useState("");
  const [focusAreas, setFocusAreas] = useState<FocusArea[]>([]);
  const [minutes, setMinutes] = useState<"5" | "15" | "30">("15");
  const [budget, setBudget] = useState<"low" | "medium" | "high">("medium");
  const [avoid, setAvoid] = useState<AvoidOption[]>([]);

  const toggle = <T,>(list: T[], v: T, set: (n: T[]) => void) =>
    set(list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

  async function claimAccount(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
      const res = await fetch("/api/auth/claim", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password, name: name || undefined }),
      });
      const data = await res.json().catch(() => ({}));
      if (!res.ok) {
        setError(data.error || "Couldn't create your account.");
        setSubmitting(false);
        return;
      }
      track("account_claimed");
      setStep("info");
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setSubmitting(false);
    }
  }

  async function saveInfoAndBuild(skip: boolean) {
    setError(null);
    setSubmitting(true);
    try {
      if (!skip) {
        const profile = {
          version: 1,
          ageConfirmed18Plus: true,
          displayName: name.trim() || undefined,
          goals: goals.trim(),
          focusAreas,
          routineMinutesPerDay: minutes,
          budgetPerMonth: budget,
          avoid,
        };
        await fetch(`/api/person/${encodeURIComponent(personId)}`, {
          method: "PATCH",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            profile,
            displayName: name.trim() || undefined,
          }),
        });
      }
      // isGuest is now false and the profile is saved; the person page will
      // re-render into the full-plan build on refresh.
      router.refresh();
    } catch {
      // Even if the PATCH failed, don't trap them — proceed to the build.
      router.refresh();
    }
  }

  return (
    <section className="border-t border-line">
      <div className="mx-auto max-w-xl px-6 py-14">
        <p className="eyebrow text-center">Payment complete · You&apos;re in</p>

        {step === "account" ? (
          <>
            <h2 className="mt-3 text-center font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
              Create your account
            </h2>
            <p className="mx-auto mt-3 max-w-md text-center text-[15px] leading-relaxed text-ink-soft">
              Save your plan so you can come back to it. This attaches an email
              and password to the scan you just unlocked — nothing is lost.
            </p>

            <form onSubmit={claimAccount} className="mx-auto mt-8 max-w-md space-y-3">
              <input
                type="text"
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Your name (optional)"
                autoComplete="name"
                className={inputCls}
              />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="you@example.com"
                autoComplete="email"
                className={inputCls}
              />
              <input
                type="password"
                required
                minLength={8}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="Choose a password (8+ characters)"
                autoComplete="new-password"
                className={inputCls}
              />
              {error && <p className="text-sm text-clay">{error}</p>}
              <button
                type="submit"
                disabled={submitting || !email || password.length < 8}
                className="w-full rounded-full bg-pine px-6 py-3.5 text-[15px] font-medium text-paper shadow-float transition-colors hover:bg-pine-deep disabled:opacity-50"
              >
                {submitting ? "Creating…" : "Create account →"}
              </button>
            </form>
          </>
        ) : (
          <>
            <h2 className="mt-3 text-center font-display text-3xl font-medium tracking-tight text-ink sm:text-4xl">
              Tell us about you
            </h2>
            <p className="mx-auto mt-3 max-w-md text-center text-[15px] leading-relaxed text-ink-soft">
              A few quick answers so your full plan is built around your goals,
              time, and budget — not a template. Optional, but it makes the plan
              sharper.
            </p>

            <div className="mt-8 space-y-6">
              <div>
                <label htmlFor="pp-goals" className="eyebrow">
                  What do you want out of this?
                </label>
                <textarea
                  id="pp-goals"
                  value={goals}
                  onChange={(e) => setGoals(e.target.value)}
                  rows={3}
                  placeholder="e.g. Look less tired on work calls, clean up my beard, better photos for dating…"
                  className={`mt-2 ${inputCls}`}
                />
              </div>

              <div>
                <p className="eyebrow">Focus the plan on</p>
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

              <div className="grid gap-6 sm:grid-cols-2">
                <div>
                  <p className="eyebrow">Time per day</p>
                  <div className="mt-3 flex gap-2">
                    {(["5", "15", "30"] as const).map((m) => (
                      <Chip key={m} active={minutes === m} onClick={() => setMinutes(m)}>
                        {m === "30" ? "30+ min" : `~${m} min`}
                      </Chip>
                    ))}
                  </div>
                </div>
                <div>
                  <p className="eyebrow">Monthly budget</p>
                  <div className="mt-3 flex gap-2">
                    {(
                      [
                        ["low", "Under $25"],
                        ["medium", "$25–75"],
                        ["high", "$75+"],
                      ] as const
                    ).map(([v, label]) => (
                      <Chip key={v} active={budget === v} onClick={() => setBudget(v)}>
                        {label}
                      </Chip>
                    ))}
                  </div>
                </div>
              </div>

              <div>
                <p className="eyebrow">Hard no-gos</p>
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

              {error && <p className="text-sm text-clay">{error}</p>}

              <div className="flex items-center justify-between border-t border-line pt-6">
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => saveInfoAndBuild(true)}
                  className="rounded-full px-5 py-2.5 text-sm font-medium text-ink-soft transition-colors hover:text-ink disabled:opacity-50"
                >
                  Skip
                </button>
                <button
                  type="button"
                  disabled={submitting}
                  onClick={() => saveInfoAndBuild(false)}
                  className="rounded-full bg-pine px-7 py-3.5 text-[15px] font-medium text-paper shadow-float transition-colors hover:bg-pine-deep disabled:opacity-60"
                >
                  {submitting ? "Building your plan…" : "Build my full plan →"}
                </button>
              </div>
            </div>
          </>
        )}
      </div>
    </section>
  );
}

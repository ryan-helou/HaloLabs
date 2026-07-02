"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";

/**
 * Commit-first funnel (the reference product's order): a minimal entry card
 * (name/email/18+), an email typo-confirm micro-step, then a "membership"
 * page laid out like a checkout — except everything costs $0 and the add-ons
 * are included. Only after joining does the questionnaire (/start/quiz) run.
 *
 * Entry answers are stashed in localStorage under `looklab_entry`; the wizard
 * reads them to skip its own name/age step, and the profile is only created
 * on the wizard's final submit.
 */

export const ENTRY_STORAGE_KEY = "looklab_entry";

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/;

const inputCls =
  "w-full rounded-xl border border-paper/20 bg-paper/10 px-4 py-3 text-[15px] text-paper outline-none transition-colors placeholder:text-paper/40 focus:border-paper/50 focus:ring-2 focus:ring-paper/20";

const WHAT_YOU_GET: Array<[string, string]> = [
  [
    "Complete facial analysis",
    "In-depth observations of your features, from your own photos.",
  ],
  [
    "Personalized improvement plan",
    "Prioritized suggestions with the why, the how-to, and honest timelines.",
  ],
  [
    "Daily routine & shopping list",
    "An AM/PM routine and product examples with real prices.",
  ],
  [
    "Progress tracking",
    "A three-phase roadmap you can check off, with re-photo checkpoints.",
  ],
  [
    "The reasoning behind everything",
    "Every suggestion explains itself — nothing is a black box.",
  ],
];

const ADDONS: Array<{ title: string; body: string; was: string; now: string }> = [
  {
    title: "Express delivery",
    body: "Your analysis runs in minutes on your machine, not days.",
    was: "$80",
    now: "Included",
  },
  {
    title: "Hairstyle suggestions",
    body: "Part of every plan when hair is a focus area.",
    was: "$25",
    now: "Included",
  },
  {
    title: "Surgical recommendations",
    body: "Never offered. Not for sale at any price.",
    was: "$180",
    now: "Never",
  },
];

export default function StartFunnel() {
  const router = useRouter();
  const [step, setStep] = useState<"entry" | "confirm" | "membership">("entry");

  const [firstName, setFirstName] = useState("");
  const [lastName, setLastName] = useState("");
  const [email, setEmail] = useState("");
  const [age18, setAge18] = useState(false);
  const [touched, setTouched] = useState(false);

  const nameOk = firstName.trim().length >= 2;
  const emailOk = email.trim() === "" || EMAIL_RE.test(email.trim());
  const canContinue = nameOk && emailOk && age18;

  function continueFromEntry() {
    setTouched(true);
    if (!canContinue) return;
    setStep(email.trim() ? "confirm" : "membership");
  }

  function join() {
    try {
      window.localStorage.setItem(
        ENTRY_STORAGE_KEY,
        JSON.stringify({
          name: `${firstName.trim()} ${lastName.trim()}`.trim(),
          email: email.trim(),
          age18: true,
        })
      );
    } catch {
      /* ignore — the wizard falls back to asking again */
    }
    router.push("/start/quiz");
  }

  return (
    <div className="relative left-1/2 -mt-6 w-screen -translate-x-1/2 bg-gradient-to-br from-[#3A3F44] via-pine-deep to-[#5B7280] pb-20 pt-24 text-paper sm:pt-28">
      <div className="mx-auto max-w-[1500px] px-4 sm:px-10">
        <Link
          href="/"
          className="inline-flex items-center gap-1.5 text-sm text-paper/60 transition-colors hover:text-paper"
        >
          <span aria-hidden>‹</span> Back
        </Link>

        {step === "entry" && (
          <div className="mx-auto mt-10 grid max-w-3xl overflow-hidden rounded-3xl border border-paper/10 bg-ink/30 shadow-float backdrop-blur-md lg:grid-cols-2">
            <div className="flex flex-col p-8 sm:p-10">
              <span
                aria-hidden
                className="flex h-8 w-8 items-center justify-center rounded-full border border-paper/30"
              >
                <span className="h-3.5 w-3.5 rounded-full border-[1.5px] border-paper/80" />
              </span>
              <h1 className="mt-auto pt-10 font-display text-4xl font-medium leading-[1.05] tracking-tight">
                Start your
                <br />
                <span className="text-paper/50">Transformation</span>
              </h1>
              <p className="mt-4 text-sm leading-relaxed text-paper/60">
                Personalized facial analysis and transformation plan based on
                your unique features.
              </p>
            </div>

            <div className="flex flex-col justify-between gap-8 p-8 sm:p-10">
              <p className="text-right font-mono text-[10px] uppercase tracking-label text-paper/50">
                Free · Private · On your machine
              </p>
              <div className="space-y-3">
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    value={firstName}
                    onChange={(e) => setFirstName(e.target.value)}
                    placeholder="First Name"
                    autoComplete="given-name"
                    className={inputCls}
                  />
                  <input
                    type="text"
                    value={lastName}
                    onChange={(e) => setLastName(e.target.value)}
                    placeholder="Last Name"
                    autoComplete="family-name"
                    className={inputCls}
                  />
                </div>
                <input
                  type="email"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="Email (optional — accounts are coming)"
                  autoComplete="email"
                  className={inputCls}
                />
                <label className="flex cursor-pointer items-start gap-3 rounded-xl border border-paper/20 bg-paper/5 p-3.5">
                  <input
                    type="checkbox"
                    checked={age18}
                    onChange={(e) => setAge18(e.target.checked)}
                    className="mt-0.5 accent-[#DCE6EA]"
                  />
                  <span className="text-xs leading-relaxed text-paper/80">
                    I&apos;m 18 or older. LookLab doesn&apos;t analyze anyone
                    under 18 — no exceptions.
                  </span>
                </label>
                {touched && !canContinue && (
                  <p className="text-xs text-clay-soft">
                    {!nameOk
                      ? "Please enter your first name (2+ letters)."
                      : !emailOk
                        ? "That email doesn't look valid."
                        : "Please confirm you're 18 or older."}
                  </p>
                )}
                <button
                  type="button"
                  onClick={continueFromEntry}
                  className="flex w-full items-center justify-between rounded-xl bg-surface px-5 py-3.5 text-[15px] font-medium text-ink transition-colors hover:bg-paper"
                >
                  Continue <span aria-hidden>→</span>
                </button>
              </div>
            </div>
          </div>
        )}

        {step === "confirm" && (
          <div className="mx-auto mt-10 max-w-md rounded-3xl border border-paper/10 bg-ink/30 p-8 text-center shadow-float backdrop-blur-md sm:p-10">
            <h1 className="font-display text-3xl font-medium tracking-tight">
              Check your <span className="text-paper/50">email address</span>
            </h1>
            <p className="mt-6 break-all rounded-xl border border-paper/15 bg-paper/10 px-4 py-3 font-mono text-sm text-paper/90">
              {email.trim()}
            </p>
            <p className="mt-3 text-xs text-paper/50">
              A typo here means a future account you can&apos;t reach.
            </p>
            <div className="mt-8 grid gap-3">
              <button
                type="button"
                onClick={() => setStep("membership")}
                className="rounded-xl bg-surface px-5 py-3.5 text-[15px] font-medium text-ink transition-colors hover:bg-paper"
              >
                Continue with this email
              </button>
              <button
                type="button"
                onClick={() => setStep("entry")}
                className="rounded-xl border border-paper/20 px-5 py-3 text-sm text-paper/70 transition-colors hover:text-paper"
              >
                Edit email
              </button>
            </div>
          </div>
        )}

        {step === "membership" && (
          <div className="mx-auto mt-10 grid max-w-5xl gap-6 lg:grid-cols-[minmax(0,1fr)_380px]">
            {/* Left — what you get + add-ons + join */}
            <div className="rounded-3xl border border-paper/10 bg-ink/30 p-8 shadow-float backdrop-blur-md sm:p-10">
              <p className="font-mono text-[10px] uppercase tracking-label text-paper/50">
                What you get /
              </p>
              <ul className="mt-6 space-y-5">
                {WHAT_YOU_GET.map(([title, sub]) => (
                  <li key={title} className="flex items-start gap-4">
                    <span aria-hidden className="mt-1 text-paper/50">
                      ✓
                    </span>
                    <span>
                      <span className="block text-[15px] font-medium">{title}</span>
                      <span className="mt-0.5 block text-sm text-paper/60">{sub}</span>
                    </span>
                  </li>
                ))}
              </ul>

              <p className="mt-10 font-mono text-[10px] uppercase tracking-label text-paper/50">
                One-time add-ons /
              </p>
              <div className="mt-4 space-y-3">
                {ADDONS.map((a) => (
                  <div
                    key={a.title}
                    className="flex items-center justify-between gap-4 rounded-xl border border-paper/15 bg-paper/5 px-4 py-3.5"
                  >
                    <div>
                      <p className="text-sm font-medium">{a.title}</p>
                      <p className="mt-0.5 text-xs text-paper/55">{a.body}</p>
                    </div>
                    <p className="shrink-0 text-right text-sm">
                      <span className="mr-2 text-paper/40 line-through">{a.was}</span>
                      <span className={a.now === "Never" ? "text-clay-soft" : "text-sage"}>
                        {a.now}
                      </span>
                    </p>
                  </div>
                ))}
              </div>

              <button
                type="button"
                onClick={join}
                className="mt-8 flex w-full items-center justify-center gap-2 rounded-xl bg-surface px-5 py-4 text-[15px] font-semibold text-ink transition-colors hover:bg-paper"
              >
                Join now <span aria-hidden>→</span>
              </button>
              <p className="mt-3 text-center text-xs text-paper/45">
                There is nothing to pay and no card to enter. Next: a 2-minute
                questionnaire, then your photos.
              </p>
            </div>

            {/* Right — order summary */}
            <div className="space-y-4">
              <div className="overflow-hidden rounded-3xl border border-paper/10 bg-gradient-to-br from-panel/40 to-pine/40 p-8 shadow-float backdrop-blur-md">
                <p className="font-mono text-[10px] uppercase tracking-label text-paper/60">
                  Order summary /
                </p>
                <p className="mt-6 font-display text-xl font-medium">
                  LookLab <span className="text-paper/60">Membership</span>
                </p>
                <p className="mt-6 font-display text-5xl font-medium">
                  $0<span className="text-lg text-paper/60"> / forever</span>
                </p>
                <p className="mt-4 text-sm leading-relaxed text-paper/70">
                  What could cost you{" "}
                  <span className="line-through">$150/year</span> is free — the
                  analysis runs locally, so there&apos;s nothing to bill.
                </p>
                <p className="mt-6 border-t border-paper/15 pt-4 text-xs text-paper/55">
                  No hidden fees. No account required. Cancel by closing the tab.
                </p>
              </div>

              <ul className="space-y-2.5 px-2 text-xs text-paper/60">
                <li>Your photos never leave this machine.</li>
                <li>No scores, no ratings, no comparisons.</li>
                <li>18+ only. Never surgery.</li>
              </ul>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

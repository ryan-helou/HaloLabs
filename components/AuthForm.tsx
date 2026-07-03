"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { signIn } from "next-auth/react";

/**
 * Real email + password auth (Auth.js Credentials). One component, two modes:
 *   - signup: create the account (18+ gate) then sign in
 *   - signin: verify against an existing account
 * On success we route to the callbackUrl (default /profiles). Google/OAuth can
 * be added here later as extra buttons without changing callers.
 */
export default function AuthForm({
  mode,
  compact = false,
}: {
  mode: "signin" | "signup";
  /** Tighter layout for the inline landing-page slot. */
  compact?: boolean;
}) {
  const router = useRouter();
  const params = useSearchParams();
  const callbackUrl = params.get("callbackUrl") || "/profiles";

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [age, setAge] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const isSignup = mode === "signup";

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      if (isSignup) {
        if (!age) {
          setError("Please confirm you are 18 or older.");
          return;
        }
        const res = await fetch("/api/auth/register", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            name: name || undefined,
            ageConfirmed18Plus: age,
          }),
        });
        if (!res.ok) {
          const data = await res.json().catch(() => ({}));
          setError(data.error || "Could not create your account.");
          return;
        }
      }

      const result = await signIn("credentials", {
        email,
        password,
        redirect: false,
      });
      if (result?.error) {
        setError(
          isSignup
            ? "Account created, but sign-in failed. Try logging in."
            : "Wrong email or password."
        );
        return;
      }
      router.push(callbackUrl);
      router.refresh();
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setLoading(false);
    }
  }

  const input =
    "min-w-0 flex-1 rounded-full border border-line bg-surface px-5 py-3 text-[15px] text-ink shadow-card outline-none transition-colors placeholder:text-ink-soft/70 focus:border-pine focus:ring-2 focus:ring-pine/30";

  return (
    <form onSubmit={handleSubmit} id="login" className="scroll-mt-28">
      <label htmlFor="email" className="eyebrow">
        {isSignup ? "Create your account" : "Welcome back"}
      </label>

      <div className={`mt-2 flex flex-col gap-2 ${compact ? "" : "max-w-md"}`}>
        {isSignup && (
          <input
            id="name"
            name="name"
            type="text"
            autoComplete="name"
            placeholder="Your name (optional)"
            value={name}
            onChange={(e) => setName(e.target.value)}
            className={input}
          />
        )}
        <input
          id="email"
          name="email"
          type="email"
          autoComplete="email"
          required
          placeholder="you@example.com"
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          className={input}
        />
        <input
          id="password"
          name="password"
          type="password"
          autoComplete={isSignup ? "new-password" : "current-password"}
          required
          minLength={8}
          placeholder={isSignup ? "Choose a password (8+ chars)" : "Password"}
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          className={input}
        />

        {isSignup && (
          <label className="mt-1 flex items-start gap-2.5 text-xs leading-relaxed text-ink-soft">
            <input
              type="checkbox"
              checked={age}
              onChange={(e) => setAge(e.target.checked)}
              className="mt-0.5 h-4 w-4 shrink-0 rounded border-line text-pine focus:ring-pine/40"
            />
            <span>
              I confirm I am 18 or older and agree this is a grooming plan, not
              medical advice.
            </span>
          </label>
        )}

        <button
          type="submit"
          disabled={loading || !email || !password || (isSignup && !age)}
          className="mt-1 inline-flex items-center justify-center gap-1.5 rounded-full bg-pine px-6 py-3 text-[15px] font-medium text-paper shadow-float transition-colors hover:bg-pine-deep focus:outline-none focus:ring-2 focus:ring-pine/40 disabled:opacity-50"
        >
          {loading
            ? "One moment…"
            : isSignup
              ? "Create account"
              : "Log in"}
          {!loading && <span aria-hidden>→</span>}
        </button>
      </div>

      {error && (
        <p className="mt-2 text-xs text-clay" role="alert">
          {error}
        </p>
      )}

      <p className="mt-2 text-xs text-ink-soft">
        {isSignup ? (
          <>
            Already have an account?{" "}
            <Link href="/login" className="text-pine hover:text-pine-deep">
              Log in
            </Link>
            . Your photos and plan are tied to your account.
          </>
        ) : (
          <>
            New here?{" "}
            <Link href="/signup" className="text-pine hover:text-pine-deep">
              Create an account
            </Link>
            .
          </>
        )}
      </p>
    </form>
  );
}

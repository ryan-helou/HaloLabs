"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";

/**
 * Username-only entry point. There is no real auth yet — on submit we stash
 * the name locally and hand it to the onboarding wizard, which prefills it.
 * Swap the body of handleSubmit for a real auth call when accounts land.
 */
export default function LoginForm() {
  const router = useRouter();
  const [username, setUsername] = useState("");

  function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    const name = username.trim();
    if (!name) return;
    try {
      window.localStorage.setItem("halolabs_user", name);
    } catch {
      /* ignore storage failures — still continue */
    }
    router.push(`/start?name=${encodeURIComponent(name)}`);
  }

  return (
    <form onSubmit={handleSubmit} id="login" className="scroll-mt-28">
      <label htmlFor="username" className="eyebrow">
        Get started
      </label>
      <div className="mt-2 flex flex-col gap-2 sm:flex-row">
        <input
          id="username"
          name="username"
          type="text"
          autoComplete="username"
          placeholder="Choose a username"
          value={username}
          onChange={(e) => setUsername(e.target.value)}
          className="min-w-0 flex-1 rounded-full border border-line bg-surface px-5 py-3 text-[15px] text-ink shadow-card outline-none transition-colors placeholder:text-ink-soft/70 focus:border-pine focus:ring-2 focus:ring-pine/30"
        />
        <button
          type="submit"
          className="inline-flex items-center justify-center gap-1.5 rounded-full bg-pine px-6 py-3 text-[15px] font-medium text-paper shadow-float transition-colors hover:bg-pine-deep focus:outline-none focus:ring-2 focus:ring-pine/40 disabled:opacity-50"
          disabled={!username.trim()}
        >
          Start my plan
          <span aria-hidden>→</span>
        </button>
      </div>
      <p className="mt-2 text-xs text-ink-soft">
        Free, and it runs on your machine — your photos never upload, and your
        plan is ready in minutes, not weeks. No password yet; accounts are
        coming.
      </p>
    </form>
  );
}

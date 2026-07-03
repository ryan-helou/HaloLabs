"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { getSession, signIn } from "next-auth/react";

/**
 * The frictionless free-scan entry. Clicking "Get my free scan" lands here and
 * there is NO signup, no username/password, and no questionnaire — this screen
 * silently establishes a guest session, creates a provisional scan, and forwards
 * straight into guided photo capture. The 18+ confirmation is collected on the
 * photos step, right before analysis (STRATEGY §3.5 gate), not here.
 *
 * A returning visitor who already has a scan in progress is sent back to it
 * (stored id) instead of spawning a duplicate.
 */

const PERSON_KEY = "halolabs_person";

export default function FreeScanStart() {
  const router = useRouter();
  const started = useRef(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (started.current) return;
    started.current = true;

    (async () => {
      try {
        // 1 · Make sure we have a session. A silent guest account is created on
        //     first entry; a returning guest (or a signed-in user) reuses theirs.
        let session = await getSession();
        if (!session?.user) {
          const res = await signIn("guest", { redirect: false });
          if (res?.error) throw new Error("guest sign-in failed");
          session = await getSession();
          if (!session?.user) throw new Error("no session");
        }

        // 2 · Reuse an in-progress scan if one exists on this device.
        let personId = "";
        try {
          personId = window.localStorage.getItem(PERSON_KEY) ?? "";
        } catch {
          /* ignore */
        }

        // 3 · Otherwise create a fresh provisional scan (no name/quiz required).
        if (!personId) {
          const res = await fetch("/api/person", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ provisional: true }),
          });
          const data = await res.json().catch(() => ({}));
          if (!res.ok || !data.id) throw new Error(data.error ?? "could not start scan");
          personId = data.id as string;
          try {
            window.localStorage.setItem(PERSON_KEY, personId);
          } catch {
            /* ignore */
          }
        }

        router.replace(`/start/photos?id=${encodeURIComponent(personId)}`);
      } catch {
        setError(
          "We couldn't start your scan. Please refresh and try again — no account needed."
        );
      }
    })();
  }, [router]);

  return (
    <div className="mx-auto flex min-h-[60vh] max-w-md flex-col items-center justify-center px-6 text-center">
      {error ? (
        <>
          <h1 className="font-display text-2xl font-medium tracking-tight text-ink">
            Something went wrong
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">{error}</p>
          <Link
            href="/start"
            className="mt-6 inline-block rounded-full bg-pine px-6 py-3 text-sm font-medium text-paper shadow-float hover:bg-pine-deep"
          >
            Try again
          </Link>
        </>
      ) : (
        <>
          <span className="h-11 w-11 animate-spin rounded-full border-2 border-line border-t-pine" />
          <h1 className="mt-6 font-display text-2xl font-medium tracking-tight text-ink">
            Setting up your free scan…
          </h1>
          <p className="mt-3 text-sm leading-relaxed text-ink-soft">
            No account, no card. Next you&apos;ll add a few photos — that&apos;s it.
          </p>
        </>
      )}
    </div>
  );
}

"use client";

import { useEffect, useState } from "react";

/** Reads the placeholder username stashed at sign-in (no real auth yet). */
export default function SignedInAs() {
  const [name, setName] = useState<string | null>(null);

  useEffect(() => {
    try {
      setName(window.localStorage.getItem("looklab_user"));
    } catch {
      /* ignore */
    }
  }, []);

  if (!name) return <span className="eyebrow">Your lab</span>;
  return (
    <span className="eyebrow">
      Signed in as <span className="text-ink">{name}</span>
    </span>
  );
}

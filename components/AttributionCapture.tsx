"use client";

import { useEffect } from "react";

/**
 * First-touch marketing attribution. On the first landing view it reads utm_*
 * params (or classifies a bare referrer like tiktok/instagram/youtube) and
 * writes them to a first-party, server-readable cookie `hl_attr`. First-touch
 * wins — we never overwrite an existing cookie — so a sale is credited to the
 * content that ACQUIRED the user, not wherever they happened to re-enter.
 *
 * The cookie is functional (not cross-site tracking); it's read server-side at
 * scan time (/api/person) to stamp the guest User, and rides that same row
 * through to the Stripe webhook. Renders nothing.
 */
const KEY = "hl_attr";
const UTM = ["utm_source", "utm_medium", "utm_campaign", "utm_content", "utm_term"] as const;

export default function AttributionCapture() {
  useEffect(() => {
    try {
      if (document.cookie.includes(`${KEY}=`)) return; // first-touch wins

      const q = new URLSearchParams(window.location.search);
      const attr: Record<string, string> = {};
      for (const f of UTM) {
        const v = q.get(f);
        if (v) attr[f] = v.slice(0, 120);
      }

      // No explicit utm_source? Classify the referrer host (tiktok.com, etc.).
      if (!attr.utm_source && document.referrer) {
        try {
          const host = new URL(document.referrer).hostname.replace(/^www\./, "");
          if (host && !host.endsWith(window.location.hostname)) attr.referrer = host;
        } catch {
          /* opaque referrer — ignore */
        }
      }

      // Nothing meaningful to attribute (direct/internal nav) → don't set a cookie.
      if (!attr.utm_source && !attr.referrer) return;

      attr.landing_path = window.location.pathname.slice(0, 120);
      attr.ts = String(Math.floor(Date.now() / 1000));

      const days = Number(process.env.NEXT_PUBLIC_ATTR_COOKIE_DAYS) || 90;
      const secure = window.location.protocol === "https:" ? "; Secure" : "";
      document.cookie =
        `${KEY}=${encodeURIComponent(JSON.stringify(attr))}` +
        `; path=/; max-age=${days * 86400}; SameSite=Lax${secure}`;
    } catch {
      /* attribution must never break the page */
    }
  }, []);

  return null;
}

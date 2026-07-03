import Script from "next/script";

/**
 * Privacy-first analytics, off by default. When NEXT_PUBLIC_PLAUSIBLE_DOMAIN is
 * set it loads Plausible — cookieless, no personal data, no cross-site tracking,
 * no consent banner required — which is the only kind of analytics consistent
 * with the privacy page. The inline stub queues window.plausible() calls so
 * lib/track's custom events fire before the script finishes loading. Swap the
 * src via NEXT_PUBLIC_PLAUSIBLE_SRC for a self-hosted instance.
 */
export default function Analytics() {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return null;
  const src =
    process.env.NEXT_PUBLIC_PLAUSIBLE_SRC || "https://plausible.io/js/script.js";
  return (
    <>
      <Script defer data-domain={domain} src={src} strategy="afterInteractive" />
      <Script id="plausible-init" strategy="afterInteractive">
        {`window.plausible=window.plausible||function(){(window.plausible.q=window.plausible.q||[]).push(arguments)}`}
      </Script>
    </>
  );
}

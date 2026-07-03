import Link from "next/link";

export default function NotFound() {
  return (
    <div className="mx-auto mt-10 max-w-md rounded-2xl border border-dashed border-line bg-surface px-8 py-16 text-center shadow-card">
      <p className="eyebrow">404</p>
      <h1 className="mt-3 font-display text-3xl font-medium tracking-tight text-ink">
        We couldn&apos;t find that.
      </h1>
      <p className="mt-3 text-sm leading-relaxed text-ink-soft">
        The page or profile you were looking for doesn&apos;t exist — it may have
        been renamed, or the analysis hasn&apos;t run yet.
      </p>
      <div className="mt-7 flex items-center justify-center gap-3">
        <Link
          href="/profiles"
          className="rounded-full bg-pine px-6 py-3 text-sm font-medium text-paper shadow-float transition-colors hover:bg-pine-deep"
        >
          Your profiles
        </Link>
        <Link
          href="/"
          className="rounded-full border border-line bg-surface px-6 py-3 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
        >
          Home
        </Link>
      </div>
    </div>
  );
}

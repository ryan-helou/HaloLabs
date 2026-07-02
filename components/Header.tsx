import Link from "next/link";

const NAV = [
  { label: "Why LookLab", href: "/#why-looklab" },
  { label: "How it works", href: "/#how-it-works" },
  { label: "FAQ", href: "/#faq" },
];

export default function Header() {
  return (
    <div className="sticky top-4 z-40 px-4">
      <header className="mx-auto flex max-w-[1500px] items-center justify-between rounded-full border border-line bg-surface/80 py-2.5 pl-3 pr-3 shadow-float backdrop-blur-md sm:pl-4 sm:pr-2.5">
        <Link href="/" className="flex items-center gap-2.5">
          <span
            aria-hidden
            className="flex h-7 w-7 items-center justify-center rounded-full border border-line"
          >
            <span className="h-3 w-3 rounded-full border-[1.5px] border-pine" />
          </span>
          <span className="font-display text-[17px] font-semibold tracking-tight text-ink">
            LookLab
          </span>
        </Link>

        <nav className="absolute left-1/2 hidden -translate-x-1/2 items-center gap-1 md:flex">
          {NAV.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink"
            >
              {item.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-1.5">
          <Link
            href="/profiles"
            className="hidden rounded-full px-4 py-2 text-sm font-medium text-ink-soft transition-colors hover:text-ink sm:inline"
          >
            Profiles
          </Link>
          <Link
            href="/start"
            className="rounded-full bg-ink px-4 py-2 text-sm font-medium text-paper transition-colors hover:bg-pine-deep"
          >
            Start my plan
          </Link>
        </div>
      </header>
    </div>
  );
}

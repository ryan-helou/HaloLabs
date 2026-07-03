export default function Loading() {
  return (
    <div className="flex min-h-[50vh] items-center justify-center py-20" aria-busy>
      <span className="sr-only">Loading…</span>
      <span className="h-10 w-10 animate-spin rounded-full border-2 border-line border-t-pine" />
    </div>
  );
}

import { auth } from "@/lib/auth";

/** Shows the signed-in account (email or name) from the real session. */
export default async function SignedInAs() {
  const session = await auth();
  const who = session?.user?.name || session?.user?.email;

  if (!who) return <span className="eyebrow">Your lab</span>;
  return (
    <span className="eyebrow">
      Signed in as <span className="text-ink">{who}</span>
    </span>
  );
}

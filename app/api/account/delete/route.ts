import { NextResponse } from "next/server";
import { auth } from "@/lib/auth";
import { deleteAccount } from "@/lib/delete";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Permanently delete the signed-in user's account and all their data — cancels
 * any live subscription, purges photos from storage, and removes every DB row
 * tied to the account. The client signs out afterward to clear the JWT cookie.
 */
export async function POST() {
  const session = await auth();
  if (!session?.user?.id) {
    return NextResponse.json({ error: "Please sign in." }, { status: 401 });
  }
  try {
    await deleteAccount(session.user.id);
  } catch {
    return NextResponse.json(
      { error: "Couldn't complete deletion. Please try again or contact support." },
      { status: 500 }
    );
  }
  return NextResponse.json({ deleted: true });
}

import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";
export const runtime = "nodejs";

/**
 * Create an email + password account. The Credentials provider only verifies
 * existing users, so signup lives here: validate, enforce the 18+ gate, hash
 * the password, and create the User. The client then calls signIn() to start
 * the session.
 */

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  let body: {
    email?: string;
    password?: string;
    name?: string;
    ageConfirmed18Plus?: boolean;
  };
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid request." }, { status: 400 });
  }

  const email = String(body.email ?? "")
    .toLowerCase()
    .trim();
  const password = String(body.password ?? "");
  const name = body.name ? String(body.name).trim().slice(0, 80) : null;

  if (!EMAIL_RE.test(email)) {
    return NextResponse.json(
      { error: "Enter a valid email address." },
      { status: 400 }
    );
  }
  if (password.length < 8) {
    return NextResponse.json(
      { error: "Password must be at least 8 characters." },
      { status: 400 }
    );
  }
  // Hard 18+ gate — enforced here, at account creation, not just in the wizard.
  if (body.ageConfirmed18Plus !== true) {
    return NextResponse.json(
      { error: "You must confirm you are 18 or older." },
      { status: 400 }
    );
  }

  const existing = await prisma.user.findUnique({ where: { email } });
  if (existing) {
    return NextResponse.json(
      { error: "An account with that email already exists." },
      { status: 409 }
    );
  }

  const passwordHash = await bcrypt.hash(password, 12);
  await prisma.user.create({
    data: {
      email,
      name,
      passwordHash,
      ageConfirmed18Plus: true,
      emailVerified: null,
    },
  });

  // Don't return anything sensitive; the client signs in next.
  return NextResponse.json({ ok: true });
}

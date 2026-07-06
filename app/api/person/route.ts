import { promises as fs } from "node:fs";
import path from "node:path";
import { cookies } from "next/headers";
import { NextResponse } from "next/server";
import { Prisma } from "@/lib/generated/prisma/client";
import { resolvePersonDir, slugifyPersonId } from "@/lib/paths";
import type {
  AvoidOption,
  FocusArea,
  OnboardingProfile,
} from "@/lib/types";
import { AVOID_OPTIONS, FOCUS_AREAS } from "@/lib/types";
import { auth } from "@/lib/auth";
import { prisma } from "@/lib/db";

export const dynamic = "force-dynamic";

const MINUTES = new Set(["5", "15", "30"]);
const BUDGETS = new Set(["low", "medium", "high"]);

function clip(v: unknown, max = 2000): string {
  return typeof v === "string" ? v.trim().slice(0, max) : "";
}

/**
 * Create a person: makes data/people/<id>/ and writes profile.json from the
 * onboarding wizard. Refuses without the 18+ confirmation — that gate is
 * policy, not decoration (docs/STRATEGY.md §3.5).
 */
export async function POST(req: Request) {
  let body: Record<string, unknown>;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // ── Provisional (free-scan entry) ─────────────────────────────────────────
  // The frictionless funnel creates the scan up front with no name and no
  // questionnaire, so we can go straight to photos. The 18+ gate moves to the
  // analysis step (/api/analyze), which is where a real run is committed.
  if (body.provisional === true) {
    const session = await auth();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Please start from the beginning." }, { status: 401 });
    }
    const person = await prisma.person.create({
      data: {
        userId: session.user.id,
        displayName: clip(body.displayName, 80) || "Your scan",
      },
    });

    // First-touch attribution: stamp the campaign that drove this scan onto the
    // guest User (only if not already set), so it rides the same row through to
    // the purchase webhook. Best-effort — never block the scan over it.
    try {
      const raw = (await cookies()).get("hl_attr")?.value;
      if (raw) {
        const attr = JSON.parse(decodeURIComponent(raw));
        if (attr && typeof attr === "object") {
          await prisma.user.updateMany({
            where: { id: session.user.id, attribution: { equals: Prisma.DbNull } },
            data: { attribution: attr },
          });
        }
      }
    } catch {
      /* malformed/absent cookie — fine */
    }

    return NextResponse.json({ id: person.id, provisional: true });
  }

  if (body.ageConfirmed18Plus !== true) {
    return NextResponse.json(
      { error: "HaloLabs is 18+ only. The analysis cannot run without this confirmation." },
      { status: 403 }
    );
  }

  const displayName = clip(body.displayName, 80);
  const id = slugifyPersonId(displayName);
  if (!id) {
    return NextResponse.json(
      { error: "Please enter a name (2+ letters/numbers)." },
      { status: 400 }
    );
  }
  const dir = resolvePersonDir(id);
  if (!dir) {
    return NextResponse.json({ error: "Invalid name." }, { status: 400 });
  }

  const focusAreas = (Array.isArray(body.focusAreas) ? body.focusAreas : [])
    .filter((f): f is FocusArea => FOCUS_AREAS.includes(f as FocusArea))
    .slice(0, FOCUS_AREAS.length);
  const avoid = (Array.isArray(body.avoid) ? body.avoid : [])
    .filter((a): a is AvoidOption => AVOID_OPTIONS.includes(a as AvoidOption))
    .slice(0, AVOID_OPTIONS.length);

  const email = clip(body.email, 120);

  const profile: OnboardingProfile = {
    version: 1,
    createdAt: new Date().toISOString(),
    ageConfirmed18Plus: true,
    displayName,
    ...(email ? { email } : {}),
    goals: clip(body.goals),
    focusAreas,
    routineMinutesPerDay: MINUTES.has(String(body.routineMinutesPerDay))
      ? (String(body.routineMinutesPerDay) as OnboardingProfile["routineMinutesPerDay"])
      : "15",
    budgetPerMonth: BUDGETS.has(String(body.budgetPerMonth))
      ? (String(body.budgetPerMonth) as OnboardingProfile["budgetPerMonth"])
      : "medium",
    avoid,
    tried: clip(body.tried),
    constraints: clip(body.constraints),
    notes: clip(body.notes),
  };

  // ── Cloud path: a signed-in account gets a DB-backed Person. Person.id is a
  // cuid (globally unique across users), and the onboarding answers are stored
  // as Person.profile for the hosted analysis to read. ──────────────────────
  const session = await auth();
  if (session?.user?.id) {
    const person = await prisma.person.create({
      data: {
        userId: session.user.id,
        displayName,
        profile: profile as unknown as object,
      },
    });
    return NextResponse.json({ id: person.id, updated: false });
  }

  // ── Local path (on-machine dev): profile.json on disk. ─────────────────────
  const profilePath = path.join(dir, "profile.json");
  const existed = await fs
    .access(profilePath)
    .then(() => true)
    .catch(() => false);

  await fs.mkdir(dir, { recursive: true });
  await fs.writeFile(profilePath, JSON.stringify(profile, null, 2) + "\n", "utf8");

  return NextResponse.json({ id, updated: existed });
}

import "dotenv/config";
import { promises as fs } from "node:fs";
import path from "node:path";
import { PrismaPg } from "@prisma/adapter-pg";
import { PrismaClient } from "../lib/generated/prisma/client";

/**
 * Seed a user's account with the existing local results.json, so the
 * DB-backed viewer has real data to render before the hosted-analysis worker
 * exists. Person ids reuse the original slugs, so /person/<id> routes and the
 * relative photo paths (served by /api/photo) keep working unchanged.
 *
 *   npx tsx scripts/seed-from-local.ts you@example.com
 *
 * Idempotent: re-running replaces that person's prior job/result snapshot.
 */

const prisma = new PrismaClient({
  adapter: new PrismaPg({ connectionString: process.env.DATABASE_URL }),
});

async function main() {
  const email = (process.argv[2] ?? "").toLowerCase().trim();
  if (!email) {
    console.error("usage: npx tsx scripts/seed-from-local.ts <email>");
    process.exit(1);
  }

  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) {
    console.error(`No user with email ${email}. Sign up in the app first.`);
    process.exit(1);
  }

  const raw = await fs.readFile(
    path.join(process.cwd(), "data", "results.json"),
    "utf8"
  );
  const parsed = JSON.parse(raw) as {
    version?: number;
    people?: Array<Record<string, unknown> & { id: string; displayName: string; builtFor?: unknown }>;
  };
  const people = parsed.people ?? [];
  if (people.length === 0) {
    console.log("results.json has no people — nothing to seed.");
    return;
  }

  for (const person of people) {
    const id = person.id;

    await prisma.person.upsert({
      where: { id },
      update: {
        userId: user.id,
        displayName: person.displayName,
        builtFor: (person.builtFor ?? null) as never,
      },
      create: {
        id,
        userId: user.id,
        displayName: person.displayName,
        builtFor: (person.builtFor ?? null) as never,
      },
    });

    // Replace any prior snapshot so re-seeding is idempotent (job cascade drops result).
    await prisma.analysisJob.deleteMany({ where: { personId: id } });

    const job = await prisma.analysisJob.create({
      data: {
        userId: user.id,
        personId: id,
        status: "COMPLETED",
        startedAt: new Date(),
        completedAt: new Date(),
      },
    });

    await prisma.analysisResult.create({
      data: {
        jobId: job.id,
        personId: id,
        version: parsed.version ?? 2,
        data: person as never,
      },
    });

    console.log(`seeded ${id} for ${email}`);
  }
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => prisma.$disconnect());

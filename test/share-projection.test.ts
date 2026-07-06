import { test } from "node:test";
import assert from "node:assert/strict";
import { buildShareProjection } from "@/lib/share-projection";
import type { Person } from "@/lib/types";

// A record stuffed with PII sentinels in every private field. If any sentinel
// appears in the projection, the share surface is leaking — that's the whole
// point of this guard (STRATEGY §3: no face/name/plan text on a public URL).
const record = {
  id: "cuid123",
  displayName: "SECRET_NAME",
  analyzedAt: "2026-06-01T00:00:00.000Z",
  photoCount: 5,
  photos: ["people/cuid123/SECRET_PHOTO.jpg", "people/cuid123/SECRET_PHOTO2.jpg"],
  observations: {
    faceShape: "SECRET_OBS_SHAPE",
    hair: "SECRET_OBS_HAIR",
    skin: "SECRET_OBS_SKIN",
    facialHair: "SECRET_OBS_BEARD",
    generalNotes: "SECRET_OBS_NOTES",
  },
  advice: {
    hair: [
      { id: "hair-1", title: "Trim", detail: "SECRET_DETAIL", impact: "high", effort: "low", cost: "low", why: "SECRET_WHY_HAIR", how: ["SECRET_HOW_HAIR"] },
    ],
    skin: [
      { id: "skin-1", title: "SPF", detail: "SECRET_DETAIL2", impact: "high", effort: "low", cost: "low", why: "SECRET_WHY_SKIN" },
      { id: "skin-2", title: "Retinoid", detail: "SECRET_DETAIL3", impact: "high", effort: "high", cost: "medium" },
    ],
    style: [],
    fitness: [],
  },
  plan: {
    summary: "SECRET_SUMMARY quoting the person's goals",
    strengths: ["SECRET_STRENGTH strong jaw"],
    expectations: "SECRET_EXPECT",
    phases: [
      { number: 1, title: "This week", window: "Week 1", focus: "SECRET_FOCUS", suggestionIds: ["hair-1"] },
      { number: 2, title: "Next 90 days", window: "Weeks 2–12", focus: "SECRET_FOCUS2", suggestionIds: ["skin-1"] },
    ],
    routine: [],
    shoppingList: [],
    checkpoints: [],
  },
  builtFor: ["SECRET_BUILTFOR 15 min/day"],
} as unknown as Person;

const SENTINELS = [
  "SECRET_NAME", "SECRET_PHOTO", "SECRET_OBS", "SECRET_DETAIL", "SECRET_WHY",
  "SECRET_HOW", "SECRET_SUMMARY", "SECRET_STRENGTH", "SECRET_EXPECT",
  "SECRET_FOCUS", "SECRET_BUILTFOR",
];

test("plan projection leaks no PII", () => {
  const json = JSON.stringify(buildShareProjection(record, "plan"));
  for (const s of SENTINELS) assert.ok(!json.includes(s), `leaked sentinel ${s}`);
});

test("progress projection leaks no PII", () => {
  const base = Date.parse(record.analyzedAt);
  const json = JSON.stringify(
    buildShareProjection(record, "progress", {
      movesDone: 2, checkinCount: 3, latestCheckinTs: base + 21 * 86400000, now: base,
    })
  );
  for (const s of SENTINELS) assert.ok(!json.includes(s), `leaked sentinel ${s}`);
});

test("projection exposes only the allowlisted keys", () => {
  const p = buildShareProjection(record, "plan");
  assert.deepEqual(Object.keys(p).sort(), ["focus", "kind", "phaseTitles", "quickWins", "totalMoves"]);
  for (const f of p.focus) {
    assert.deepEqual(Object.keys(f).sort(), ["color", "count", "label", "share"]);
  }
});

test("counts and phase titles are correct", () => {
  const p = buildShareProjection(record, "plan");
  assert.equal(p.totalMoves, 3); // 1 hair + 2 skin
  assert.equal(p.quickWins, 2); // hair-1 + skin-1 are high/low/low; skin-2 isn't
  assert.deepEqual(p.phaseTitles, ["This week", "Next 90 days"]);
});

test("progress delta computes weekN from the latest check-in", () => {
  const base = Date.parse(record.analyzedAt);
  const p = buildShareProjection(record, "progress", {
    movesDone: 2, checkinCount: 3, latestCheckinTs: base + 21 * 86400000, now: base,
  });
  assert.ok(p.progress);
  assert.equal(p.progress!.weekN, 3);
  assert.equal(p.progress!.total, 3);
  assert.equal(p.progress!.movesDone, 2);
  assert.equal(p.progress!.checkins, 3);
});

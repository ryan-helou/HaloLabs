# UGC Launch Plan — Attribution, Viral Loop, and Spike Survival

*The engineering plan to make HaloLabs ready to pour cold, mobile-first UGC
traffic into the funnel: (1) **know which content converts**, (2) **give users
something to share that compounds**, and (3) **survive the spike when a video
pops**. Written against the code as it exists on `main` today. Every file
reference below was verified against the current tree.*

> Read alongside [STRATEGY.md](STRATEGY.md) — the product constitution. Every
> new surface here is checked against §3 (NEVER). Short version: no scores on the
> share card, no "invite-to-unlock" dark patterns, no face data on a public URL,
> and fix the false "photos never leave your machine" copy before driving a
> single view. That copy fix is a prerequisite (see §0.3), not part of this plan.

---

## 0. Orientation

### 0.1 The three problems, precisely

| # | Problem | Root cause in code | Blast radius when a video pops |
|---|---------|--------------------|-------------------------------|
| **A. Attribution** | You cannot tell which video drove a scan or a sale. | `lib/track.ts` fires 5 Plausible events but **passes no props**; nothing reads `utm_*` / `document.referrer`; the reliable conversion signal (`membership_active`) fires **client-side** on `/profiles?upgraded=1` mount, not from the webhook. | You spend money/effort on content and are blind to ROI. Can't kill losers, can't scale winners. |
| **B. Viral loop** | Every user is a dead end — nothing to post. | **Zero** share mechanism exists (`navigator.share`/clipboard/OG-per-result all absent). Result pages are ownership-gated (`getPersonForUser`), so `/person/<id>` can't even be linked publicly. | Creator UGC gets you one wave; nothing compounds it organically. |
| **C. Spike survival** | The funnel chokes and drops paid work under load. | Jobs run **fire-and-forget in the web process** (`void runAnalysisJob`), gated by an **in-memory** cap of 4 (`MAX_CONCURRENT_JOBS`); no worker, no durable queue, **no crash recovery**, **no signal handling**. The **paid** full-plan is triggered **client-side only** — close the tab after paying and the plan never generates. | Your best moment becomes "stuck analyzing" / "failed," and some **paying** customers get nothing. |

### 0.2 The one non-obvious fact that shapes everything

There is **no anonymous "person" without an owner.** The live funnel silently
creates a real, passwordless **guest `User`** row via an Auth.js `"guest"`
credentials provider (`lib/auth.ts:56-66`) *before* any Person exists. Identity =
a **triple**:

```
guest User row (Postgres)  ⇄  Auth.js JWT session cookie (browser)  ⇄  Person.id (localStorage "halolabs_person")
```

"Creating an account" after purchase is just an `UPDATE` on that same guest row
(`app/api/auth/claim/route.ts:61-64`) — the `User.id` never changes. **This is
why attribution is clean to implement:** attach the campaign data to the guest
`User` at scan time and it rides the *same row* all the way through payment,
webhook, and claim. No cross-session joining required.

### 0.3 Hard prerequisites (do these first, they're tiny)

1. **Fix the false privacy copy** — `components/StartFunnel.tsx:309`,
   `OnboardingWizard.tsx:268`, `app/page.tsx:112`, `StartFunnel.tsx:137` still
   say "photos never leave this machine / nothing is uploaded." That is false in
   prod (R2 + Claude API) and is a legal landmine that *virality detonates*.
   Rewrite to the true, still-strong story ("your photos are used only to build
   your plan, never to train models, and deleted when you delete your account").
   *(Note: `StartFunnel.tsx` is **dead code** — the live entry is
   `FreeScanStart.tsx` — but fix the copy anyway or delete the file so it can't
   be revived.)*
2. **Confirm `NEXT_PUBLIC_PLAUSIBLE_DOMAIN` is actually set in prod.** Until it
   is, `track()` is a silent no-op (`components/Analytics.tsx:12-13`) and you are
   recording nothing. Everything in Workstream A depends on this.
3. **Verify the 18+ gate** is airtight and the creative doesn't read as
   marketing to minors (STRATEGY §3.5).

### 0.4 Recommended build order (and why)

```
Phase 1  ▸  C-core   Durable queue + move paid full-plan to the webhook   ← the "we took money and delivered nothing" bug. Ship first.
Phase 2  ▸  A        Attribution end-to-end                                ← can't market without measuring. Small & fast.
Phase 3  ▸  B        Share loop (plan-started + progress-delta cards)      ← makes the traffic compound.
Phase 4  ▸  C-polish Queue-position UI, load test, autoscale worker        ← turn "survives" into "feels instant."
```

Rationale: **C-core first** because closing the tab after paying currently loses
the plan — that's a refund/trust disaster the moment real money flows. **A
second** because it's cheap and you should never buy/post a view you can't
measure. **B third** because it multiplies whatever A proves works. **C-polish
last** because the correctness fix (Phase 1) already stops the outage; the rest
is UX.

### 0.5 One consolidated migration

All schema changes below ship in **a single Prisma migration** to avoid three
separate deploys touching the DB. Full SQL in §5.1. Summary:

```prisma
// User
attribution        Json?      // first-touch campaign data (Workstream A)

// Person
shareToken         String?  @unique   // opaque public share id (Workstream B)
shareKind          String?            // "plan" | "progress" | null (what's shared)

// AnalysisJob
jobType            JobType  @default(TEASER)   // TEASER | FULL (Workstream C)
attempts           Int      @default(0)
leaseUntil         DateTime?

enum JobType { TEASER FULL }

// Optional analytics table (Workstream A, §2.6)
model Conversion { … }
```

---

## 1. Workstream A — Attribution

**Goal:** for every purchase, know the `utm_source` / `utm_campaign` / referrer /
landing path that produced it — reliably, server-side, without cookies that
break the privacy story — and see it broken down in Plausible (plus an internal
funnel query).

### 1.1 Design in one picture

```
 ┌ first landing view ─────────────────────────────────────────────────────────┐
 │  <AttributionCapture/> reads ?utm_* + document.referrer                        │
 │  → writes FIRST-TOUCH first-party cookie  hl_attr  (JSON, 90d, SameSite=Lax)   │
 └───────────────┬───────────────────────────────────────────────────────────────┘
                 │  (first-touch wins: never overwrite an existing cookie)
                 ▼
 free scan  →  signIn("guest")  →  POST /api/person {provisional:true}
                                     │  reads hl_attr via next/headers cookies()
                                     ▼
                            User.attribution = attr   (only if null)   ← rides the same row forever
                 │
                 ▼
 POST /api/checkout   → Stripe session.metadata + subscription_data.metadata + client_reference_id  = flattened attr
                 │
                 ▼
 Stripe webhook  checkout.session.completed
     • flips subscriptionStatus = active           (already happens)
     • reads attribution from metadata
     • writes Conversion row  +  fires SERVER-SIDE Plausible "membership_active" with props   ← the reliable signal
```

Client `track()` calls (`scan_started`, `checkout_started`, `account_claimed`)
also start passing the cookie's props, so the **whole** Plausible funnel is
segmentable by source — but the **money event is emitted server-side from the
webhook**, which is the only place that can't be lost to a closed tab.

### 1.2 Capture (first touch)

**New file `components/AttributionCapture.tsx`** (client, renders null), mounted
once in `app/layout.tsx` next to `<Analytics/>` (`app/layout.tsx:73`):

```tsx
"use client";
import { useEffect } from "react";
const KEY = "hl_attr";
const FIELDS = ["utm_source","utm_medium","utm_campaign","utm_content","utm_term"] as const;

export default function AttributionCapture() {
  useEffect(() => {
    if (document.cookie.includes(`${KEY}=`)) return;          // first-touch wins
    const q = new URLSearchParams(window.location.search);
    const attr: Record<string,string> = {};
    for (const f of FIELDS) { const v = q.get(f); if (v) attr[f] = v.slice(0,120); }
    // classify bare referrers (tiktok/ig/yt) when no utm is present
    const ref = document.referrer;
    if (!attr.utm_source && ref) {
      const host = (() => { try { return new URL(ref).hostname.replace(/^www\./,""); } catch { return ""; } })();
      if (host && !host.endsWith(location.hostname)) attr.referrer = host;
    }
    attr.landing_path = location.pathname.slice(0,120);
    attr.ts = String(Math.floor(Date.now()/1000));
    if (Object.keys(attr).length <= 2) return;                // nothing meaningful → don't set
    const days = Number(process.env.NEXT_PUBLIC_ATTR_COOKIE_DAYS) || 90;
    document.cookie = `${KEY}=${encodeURIComponent(JSON.stringify(attr))};path=/;max-age=${days*86400};SameSite=Lax`;
  }, []);
  return null;
}
```

Notes:
- **First-party, functional cookie**, not cross-site tracking — but still disclose
  it on the privacy page (§4.1). Plausible stays cookieless; this cookie is ours
  and server-readable, which is the whole point (Route Handlers can read it).
- **First-touch** ("which video *acquired* this user") is the right model for UGC.
  We deliberately don't overwrite, so a user who returns via a branded search
  later still credits the original video.
- `SameSite=Lax` so it survives the Stripe redirect round-trip.

### 1.3 Persist onto the guest identity

**`app/api/person/route.ts`**, the `provisional === true` branch (`:40-52`).
After the Person is created and we have `session.user.id` (the guest), stamp the
cookie onto the **User** (first-touch, only if empty):

```ts
import { cookies } from "next/headers";
// … inside the provisional branch, after person create:
const raw = (await cookies()).get("hl_attr")?.value;
if (raw) {
  try {
    const attr = JSON.parse(decodeURIComponent(raw));
    await prisma.user.updateMany({
      where: { id: session.user.id, attribution: { equals: Prisma.DbNull } },
      data: { attribution: attr },
    });
  } catch { /* ignore malformed cookie */ }
}
```

We attach to `User` (not `Person`) because the **User** is the entity that
converts and is the join key in the webhook. `updateMany` + the `attribution: null`
guard makes it idempotent and first-touch even across multiple scans.

### 1.4 Re-attach at checkout (the money seam)

**`app/api/checkout/route.ts:62-76`.** Load `user.attribution`, flatten to string
values (Stripe metadata: ≤50 keys, ≤500 chars each), and attach in **three**
places so it survives on the Session *and* the Subscription:

```ts
const attr = (user.attribution ?? {}) as Record<string, string>;
const flat = Object.fromEntries(
  Object.entries(attr).map(([k, v]) => [`attr_${k}`, String(v).slice(0, 480)])
);
// also carry the personId so the webhook can enqueue the paid plan (Workstream C, §3.6)
const personId = /* parsed from returnTo or passed explicitly — see §3.6 */;

const session = await stripe.checkout.sessions.create({
  // …existing…
  client_reference_id: attr.utm_campaign ?? attr.utm_source ?? undefined,
  metadata: { userId: user.id, personId, ...flat },
  subscription_data: { metadata: { userId: user.id, personId, ...flat } },
});
```

### 1.5 Record the conversion server-side (the reliable signal)

**`app/api/stripe/webhook/route.ts`**, in `checkout.session.completed`
(`:55-81`), *after* flipping `subscriptionStatus = "active"`:

```ts
const md = s.metadata ?? {};
const attr = Object.fromEntries(
  Object.entries(md).filter(([k]) => k.startsWith("attr_")).map(([k, v]) => [k.slice(5), v])
);
// 1) durable internal record
await prisma.conversion.create({
  data: { userId: md.userId ?? null, amountCents: s.amount_total ?? 0,
          currency: s.currency ?? "usd", attribution: attr, stripeSessionId: s.id },
}).catch(() => {});                     // best-effort; never fail the webhook
// 2) reliable server-side analytics event (fires even if the tab closed)
await sendServerEvent("membership_active", attr);
```

**New `lib/analytics-server.ts`** — server-side Plausible event via its Events
API (no browser needed):

```ts
export async function sendServerEvent(name: string, props: Record<string,string>) {
  const domain = process.env.NEXT_PUBLIC_PLAUSIBLE_DOMAIN;
  if (!domain) return;
  const host = process.env.PLAUSIBLE_API_HOST || "https://plausible.io";
  try {
    await fetch(`${host}/api/event`, {
      method: "POST",
      headers: { "Content-Type": "application/json", "User-Agent": "halolabs-server" },
      body: JSON.stringify({ name, domain, url: `https://${domain}/__server`, props }),
    });
  } catch { /* analytics must never break the webhook */ }
}
```

- **Idempotency:** wrap in the webhook-idempotency guard we're adding anyway
  (dedupe by Stripe event id — see the separate reliability note; the `Conversion`
  row's `stripeSessionId` should be `@unique` so a redelivered event can't
  double-count).
- Keep the existing client `membership_active` on `/profiles` **or remove it** to
  avoid double counting — recommendation: rename the client one to
  `membership_confirmed_view` (a page-view signal) and treat the **webhook**
  event as the canonical conversion.

### 1.6 Thread props through the client funnel events

In `lib/track.ts`, add a helper that reads `hl_attr` and merges it into props, so
the top-of-funnel events are segmentable too:

```ts
function attrProps(): Record<string,string> {
  if (typeof document === "undefined") return {};
  const m = document.cookie.match(/(?:^|; )hl_attr=([^;]+)/);
  if (!m) return {};
  try { const a = JSON.parse(decodeURIComponent(m[1]));
        return { source: a.utm_source ?? a.referrer ?? "direct", campaign: a.utm_campaign ?? "" };
  } catch { return {}; }
}
export function track(event: TrackEvent, props?: Record<string,…>) {
  // …merge attrProps() into props before window.plausible(...)
}
```

Call sites unchanged (`CaptureFlow.tsx:281`, `useCheckout.ts:19`,
`PostPurchaseSetup.tsx:101`, `AuthForm.tsx:80`) — they automatically gain source
props.

### 1.7 Optional but recommended: an internal funnel view

Plausible gives you source→event breakdowns out of the box once props flow. For
**revenue by campaign** with no external tooling, add a tiny admin page:

`app/admin/funnel/page.tsx` (gated to your own `User.email`) running one query
joining `User.attribution` → `AnalysisJob` (scans) → `subscriptionStatus`/`Conversion`
(purchases), grouped by `utm_campaign`. Columns: campaign, scans, unlocks,
scan→pay %, revenue. This is the dashboard you actually stare at during a launch.

### 1.8 What you can answer after Workstream A

- "TikTok video #3 drove 4,000 landing views, 900 scans, 40 unlocks — 4.4% and
  $X." (Plausible breakdown + admin funnel.)
- "IG creator A converts at 6%, creator B at 1% — cut B." 
- All of it **reliable** because the purchase event is emitted from the webhook,
  not a browser that may have closed.

---

## 2. Workstream B — The viral share loop

**Goal:** a privacy-safe artifact a user *wants* to post, that renders a
beautiful link preview, and whose CTA drops the viewer into `/start` **carrying
attribution** — so shares show up in Workstream A as their own "campaign" and
compound your paid content.

### 2.1 The bright lines (from STRATEGY §3)

- **Never a score / rating / tier / percentile / ranking** on the card.
- **Never a face or the written plan** on a public URL (`why`/`how`/`observations`/
  `profile`/`displayName` are PII — full map in the investigation).
- **Never** "invite 3 friends to unlock" or "pay to reveal" mechanics.
- Sharing is **opt-in, user-minted, and revocable** (delete = delete parity).

### 2.2 What's safe to put on a card (all already computed, all score-free)

From `lib/glance.ts` / `lib/badges.ts` / `ProgressTimeline.tsx`:

| Datum | Source | Safe? |
|-------|--------|-------|
| total moves, quick-win count | `flattenAdvice().length`, `isQuickWin` | ✅ neutral counts |
| focus-area composition `{label,count,share,color}` | `focusAreas()` (`glance.ts:49-65`, explicitly "never a score") | ✅ |
| phase titles/windows ("This week", "Weeks 2–12") | `plan.phases[].{title,window}` | ✅ generic |
| **progress delta**: week N, days-in, moves-done/total, check-in count | `checkins` ts vs `analyzedAt`, `ProgressTimeline.tsx:198` | ✅ derived numbers — STRATEGY's *named* ideal shareable |
| photos, why/how, observations, name, onboarding | Person/profile | ❌ **never** |

### 2.3 Two cards, one pipeline

- **"Plan started" card** — available to *anyone with a result* (even free-teaser
  users → pure top-of-funnel fuel): "My HaloLabs plan · 17 moves · 7 quick wins ·
  focus: skin, hair." No PII whatsoever.
- **"Progress delta" card** — unlocked once there are check-ins: "6 weeks in · 11
  of 17 moves done." The STRATEGY-preferred artifact; still zero photos.

Both are the *same* PII-stripped projection, different emphasis.

### 2.4 Data model + safe projection

Migration adds `Person.shareToken String? @unique` and `Person.shareKind String?`
(§0.5). **New `lib/share.ts`:**

```ts
export interface ShareProjection {          // NOTHING here identifies the person
  totalMoves: number; quickWins: number;
  focus: { label: string; count: number; share: number; color: string }[];
  phaseTitles: string[];
  progress?: { weekN: number; movesDone: number; total: number; checkins: number };
  kind: "plan" | "progress";
}
export async function loadShareProjection(token: string): Promise<ShareProjection | null> {
  const person = await prisma.person.findUnique({ where: { shareToken: token }, /* + latest result */ });
  if (!person || !person.shareToken) return null;
  // build ONLY counts/composition/deltas from the latest AnalysisResult + checkins.
  // Never read photos/observations/why/how/profile/displayName.
}
export async function mintShareToken(userId: string, personId: string, kind: "plan"|"progress") { /* idempotent upsert of a random opaque token */ }
export async function revokeShareToken(userId: string, personId: string) { /* set null */ }
```

Token = 16+ bytes base64url (opaque, unguessable), **separate from the cuid** so
the private `/person/<id>` page is never implicated.

### 2.5 Public share route + dynamic OG (the missing infra)

- **`app/s/[token]/page.tsx`** (public, no auth): loads `loadShareProjection`,
  renders a tasteful page — composition bar, the safe counts, "no scores, no
  rankings" line, and a big **"Start your own free scan"** CTA →
  `/start?utm_source=share&utm_campaign=<kind>`. If token missing/revoked →
  `notFound()`.
- **`app/s/[token]/opengraph-image.tsx`** — segment-level dynamic OG (Next passes
  `params.token`). Reuses the `next/og` + brand-gradient recipe from
  `app/opengraph-image.tsx`. Renders the composition + counts as the link
  preview. **This is the parameterized-OG infra that doesn't exist today.**
- `generateMetadata` on the route sets `openGraph.images` / `twitter.card =
  summary_large_image` to the segment OG, so a pasted link in iMessage/IG/X shows
  the card, not a bare URL.

The CTA query params mean **every share is a tracked campaign** — the loop closes
into Workstream A automatically.

### 2.6 Share UI + API

- **`app/api/person/[id]/share/route.ts`**: `POST {kind}` → owner check →
  `mintShareToken` → returns `{ url: <appUrl>/s/<token> }`. `DELETE` → revoke.
  Guard: `POST` for the `progress` kind requires ≥1 check-in.
- **New `components/ShareButton.tsx`** (client) on the **Progress** tab
  (`ProgressTimeline.tsx`) and **Overview** (`HaloGlance.tsx`): mints/fetches the
  token, then `navigator.share({url})` on mobile (the UGC audience) with
  clipboard fallback on desktop. Copy: "Share my plan" / "Share my progress."
  Fires `track("share_created", {kind})` (add to the `TrackEvent` union) so you
  can measure share rate and — via the `utm_source=share` landings — **viral
  coefficient** (shares → new scans).
- **Delete parity:** `app/api/person/[id]/route.ts` DELETE and
  `app/api/account/delete/route.ts` already cascade Person; ensure the token dies
  with it (it does, since it's a Person column). Revocation is immediate because
  `/s/[token]` reads live.

### 2.7 Optional wow (later, guardrailed): the "reveal" clip

The single most filmable moment is the scan→plan reveal (see §3 UX). Not part of
this workstream, but note: a screen-recorded reveal is your best *creator* asset,
and the share card is your best *user* asset. Both should exist before spend.

### 2.8 What you can measure after Workstream B

`share_created` rate per unlocked user, and `utm_source=share` scans in
Workstream A → **k-factor** (new scans per share). If k trends toward/above the
paid CAC, organic starts carrying the campaign.

---

## 3. Workstream C — Durable queue & spike survival

**Goal:** analysis survives 50-in-a-minute spikes and container redeploys, paid
plans generate even if the buyer closes the tab, and users see an **honest**
"you're #N in line" instead of a false failure.

### 3.1 The failure modes today (traced)

1. **In-process fire-and-forget.** `startAnalysis`/`startFullPlan` do
   `void runAnalysisJob(id)` (`lib/analyze.ts:669,678`). Concurrency is an
   **in-memory** gate (`activeJobs` + `jobWaiters[]`, cap 4, `:552-568`).
2. **50 scans →** 4 run; **46 promises park in `jobWaiters`, holding base64
   images in the web process heap**; their rows sit `QUEUED`. Drain ≈ 19 min.
   Any job that waits >10 min crosses `STALE_JOB_MS` and the GET poller returns
   **`{state:"error"}` to a user whose job is still legitimately queued** — a
   false failure (`app/api/analyze/route.ts:214-220`).
3. **Redeploy (SIGTERM) →** all 4 running + 46 waiting are lost; **no signal
   handling, no recovery sweep**; rows orphaned in `RUNNING`/`QUEUED` forever
   unless a user happens to re-POST for that exact person.
4. **Paid plan is client-triggered only.** `runFullPlanJob`'s *only* caller is
   `FullPlanBuilder.tsx:31` on mount. **The webhook never triggers it.** Pay →
   close tab → **no plan is ever generated.** (This is the ship-first bug.)

### 3.2 The design: DB-backed queue + a real worker (no new infra)

The schema is already 90% a queue: `AnalysisJob.status` + `@@index([status,
createdAt])`. We add a **separate long-running worker process** on Railway that
drains the table with `SELECT … FOR UPDATE SKIP LOCKED`. No Redis, no BullMQ —
one source of truth (the row the UI already polls). *(BullMQ+Redis is the
fallback if you later want retries/backoff dashboards; documented in §3.9.)*

```
web service (Next.js)                worker service (tsx worker/index.ts)
  POST /api/analyze  ─ enqueue ─▶  AnalysisJob(QUEUED, jobType)   ◀─ claim (FOR UPDATE SKIP LOCKED)
  POST .../full      ─ enqueue ─▶                                    set RUNNING, leaseUntil=now+8m
  webhook (paid)     ─ enqueue ─▶                                    process → writeResult / markFailed
  GET  (poll)        ─ reads  ─▶  status + queuePosition             SIGTERM → drain, release leases, exit
                                    recovery sweep: RUNNING w/ expired lease → QUEUED
```

### 3.3 Schema changes (in the consolidated migration)

```prisma
enum JobType { TEASER FULL }
model AnalysisJob {
  // …existing…
  jobType    JobType   @default(TEASER)   // worker needs to know which body to run
  attempts   Int       @default(0)        // retry budget (cap 3 → FAILED)
  leaseUntil DateTime?                     // crash recovery: expired lease ⇒ reclaimable
  @@index([status, createdAt])            // already present — the claim index
}
```

### 3.4 Refactor `lib/analyze.ts`

- **Delete** the in-process gate: `MAX_CONCURRENT_JOBS`, `activeJobs`,
  `jobWaiters`, `acquireSlot`, `releaseSlot` (`:544-568`).
- **Extract** the two job bodies into exported, side-effect-pure processors that
  take an already-claimed job and do the model call + `writeResult`/`markFailed`:
  `export async function processJob(job: AnalysisJob)` that switches on
  `job.jobType`. (Reuse existing `collectImages`, `callModel`, `writeResult`,
  `markFailed`, `buildRecord` unchanged.)
- **`startAnalysis`/`startFullPlan` become pure enqueue** — just the
  `prisma.analysisJob.create({ data: { …, jobType } })`, **no `void run…()`**.

### 3.5 The worker (`worker/index.ts`, run with `tsx`)

```ts
import { prisma } from "../lib/db";
import { processJob } from "../lib/analyze";

const POLL_MS = Number(process.env.WORKER_POLL_MS) || 1500;
const BATCH   = Number(process.env.WORKER_CONCURRENCY) || 4;   // == effective global concurrency now
const LEASE_MS = 8 * 60_000;
let draining = false;

async function claimBatch() {
  // atomic claim across instances; skips locked rows so two workers never grab the same job
  return prisma.$queryRaw`
    UPDATE "AnalysisJob" SET status='RUNNING', "startedAt"=now(),
      "leaseUntil"=now() + interval '8 minutes', attempts=attempts+1
    WHERE id IN (
      SELECT id FROM "AnalysisJob"
      WHERE status='QUEUED'
      ORDER BY "createdAt" ASC
      LIMIT ${BATCH}
      FOR UPDATE SKIP LOCKED
    ) RETURNING *`;
}

async function recover() {   // reclaim orphans from a crashed worker / redeploy
  await prisma.$executeRaw`
    UPDATE "AnalysisJob" SET status = CASE WHEN attempts >= 3 THEN 'FAILED' ELSE 'QUEUED' END,
      error = CASE WHEN attempts >= 3 THEN 'Gave up after repeated worker restarts.' ELSE error END
    WHERE status='RUNNING' AND "leaseUntil" < now()`;
}

async function loop() {
  await recover();                                  // sweep on startup
  while (!draining) {
    const jobs = await claimBatch();
    if (!jobs.length) { await sleep(POLL_MS); if (Math.random() < 0.05) await recover(); continue; }
    await Promise.all(jobs.map(j => processJob(j).catch(() => {})));   // markFailed handled inside
  }
}
process.on("SIGTERM", () => { draining = true; });  // stop claiming; in-flight finish; leases cover the rest
loop();
```

Key properties:
- **`FOR UPDATE SKIP LOCKED`** makes the claim atomic and multi-worker-safe — you
  can run 2+ worker instances and they never double-process.
- **Lease + recovery sweep** = crash/redeploy resilience the app has *zero* of
  today. A worker that dies mid-job leaves a `RUNNING` row whose `leaseUntil`
  expires; the next `recover()` requeues it (or `FAILED` after 3 attempts).
- **SIGTERM drains cleanly** instead of orphaning.
- Concurrency is now `BATCH × worker_instances`, tunable via env, and the web
  process heap is no longer holding parked jobs.

### 3.6 Move the paid full-plan trigger to the webhook (the ship-first fix)

In `app/api/stripe/webhook/route.ts` `checkout.session.completed`, after
`subscriptionStatus = "active"`, **enqueue the FULL job durably**:

```ts
const personId = s.metadata?.personId;   // added in §1.4 checkout metadata
if (personId) {
  const has = await prisma.analysisResult.findFirst({ where: { personId, /* full plan present */ } });
  if (!has) await startFullPlan(userId, personId);   // now just an INSERT(QUEUED, FULL)
}
```

- `useCheckout.ts` must send the `personId` (it currently sends only
  `returnTo: pathname`). Either parse it from `returnTo` (`/person/<id>`) in
  `/api/checkout` or pass it explicitly — explicit is cleaner.
- Keep `FullPlanBuilder.tsx`'s client POST as an **idempotent fallback** — the
  existing `hasFullPlan` short-circuit (`full/route.ts:50-51`) + double-start
  guard already make a second trigger a no-op. Now paying is durable **and** the
  UI still self-heals if the webhook is delayed.

### 3.7 Honest "you're #N in line"

Both GET endpoints (`app/api/analyze/route.ts:194-222`,
`app/api/person/[id]/full/route.ts:74-102`) add a cheap position query (uses the
existing index):

```ts
const ahead = await prisma.analysisJob.count({
  where: { status: "QUEUED", createdAt: { lt: job.createdAt } },
});
return NextResponse.json({ state: "running", elapsedSec, queuePosition: ahead + 1 });
```

- **Fix the false-failure bug:** never return `error` for a job that is still
  `QUEUED` (it hasn't had its chance). Only treat a `RUNNING` job whose
  `leaseUntil` has passed as failed; a long queue shows position, not error.
- `CaptureFlow.tsx` (`:399-406`) and `FullPlanBuilder.tsx` (`:115-117`) render
  "You're #N in line — plans take about a minute each" when `queuePosition > 1`,
  otherwise the existing elapsed stepper. Honest, and it *reduces* abandonment vs
  a silent spinner.

### 3.8 Deployment (Railway)

- Add `"worker": "tsx worker/index.ts"` to `package.json` scripts.
- Add a **second Railway service** from the same repo, start command
  `npm run worker`, sharing `DATABASE_URL`, `ANTHROPIC_API_KEY`, R2 env, etc.
  (Add `railway.json`/`railway.toml` or set the start command in service
  settings.)
- **Prisma pool budget:** worker gets its own pool. Set a small
  `DATABASE_POOL_MAX` for it (e.g. 3–5) and keep `(web_instances × 10) +
  (worker_instances × 5) < DB max_connections` (`lib/db.ts:12`, `.env.example:5-8`).
- **Native deps:** the worker imports `sharp` (image downsizing,
  `lib/analyze.ts:299-313`); the `serverExternalPackages` note in
  `next.config.js:16` applies — `tsx` runs plain Node so the native binary loads,
  just confirm `sharp` is installed in the worker service's build.

### 3.9 Fallback option (only if you outgrow the DB poller)

BullMQ + Railway Redis gives retries/backoff/delayed jobs/observability for free,
at the cost of a Redis dependency and a second connection budget. **Not
recommended for launch** — the DB poller reuses the row the UI already reads and
adds no infra. Revisit only if you need >~a few hundred jobs/min or fancy
scheduling.

### 3.10 Load test (definition of done for Phase 1)

A scratchpad script firing 50 concurrent `POST /api/analyze` across 50 guest
sessions, asserting: all 50 reach `COMPLETED`, none false-errors while queued,
queue position counts down monotonically, and a mid-run `kill -SIGTERM` on the
worker leaves **zero** permanently-orphaned rows after one `recover()` cycle.

---

## 4. Cross-cutting concerns

### 4.1 Privacy page / legal (blocking for launch)

- Fix the false "local-only" copy (§0.3) — **prerequisite**.
- Disclose the `hl_attr` first-party functional cookie on `app/privacy/page.tsx`.
- The share card exposes only neutral counts/deltas and is opt-in + revocable —
  document that on the privacy page too ("what a shared link shows").

### 4.2 Env vars (add to `.env.example`)

```
NEXT_PUBLIC_PLAUSIBLE_DOMAIN=   # MUST be set in prod or all analytics is a no-op
PLAUSIBLE_API_HOST=https://plausible.io
NEXT_PUBLIC_ATTR_COOKIE_DAYS=90
WORKER_CONCURRENCY=4
WORKER_POLL_MS=1500
DATABASE_POOL_MAX=              # web: ~10; worker service: ~3–5
```

### 4.3 Testing (there is none today — add the minimum that de-risks money)

- **Unit:** attribution flatten/round-trip; `loadShareProjection` asserts it
  **never** returns photos/why/how/name/profile (a PII-leak regression guard);
  `claimBatch` concurrency (two callers, no double-claim); webhook idempotency.
- **Integration:** `checkout.session.completed` → `subscriptionStatus=active` +
  `Conversion` row + FULL job enqueued (and not double-enqueued on redelivery).
- **E2E (Playwright):** share button mints a token and `/s/<token>` renders the
  card; free-scan funnel end-to-end still green.
- Wire a `test` script + a GitHub Action (none exists) so these run on push.

### 4.4 Rollout & flags

- Ship the **consolidated migration** first (additive, backward-compatible —
  every new column is nullable/defaulted; old rows render fine).
- Gate each workstream behind an env flag so you can deploy dark and flip on:
  `ATTR_ENABLED`, `SHARE_ENABLED`, and run the worker alongside the old in-process
  path for one deploy (`WORKER_ENABLED`) before removing `void run…()`.
- **Worker cutover:** deploy the worker service *first* (it just drains QUEUED
  rows), confirm it's claiming, *then* remove the in-process `void run…()` from
  the web build. Zero-downtime.

### 4.5 Risk register

| Risk | Mitigation |
|------|-----------|
| Stripe metadata >500 chars / >50 keys | We prefix+slice to 480 and only carry ≤7 attr keys. |
| Two workers double-process a job | `FOR UPDATE SKIP LOCKED` + lease makes claims atomic. |
| DB connection exhaustion from worker | Small worker pool + the `(instances×max) < max_connections` budget. |
| Share card accidentally leaks PII | Projection is an allowlist of scalar fields + a unit test asserting the denylist. |
| Attribution cookie blocked / stripped | Falls back to `direct`; server still records the conversion, just unattributed. |
| Webhook redelivery double-counts revenue | `Conversion.stripeSessionId @unique` + event-id idempotency. |
| Paid plan still lost if webhook AND client both fail | `recover()` sweep + idempotent client fallback + the double-start guard = belt and suspenders. |

---

## 5. Appendix

### 5.1 Consolidated migration (SQL sketch)

```sql
ALTER TABLE "User"        ADD COLUMN "attribution" JSONB;
ALTER TABLE "Person"      ADD COLUMN "shareToken"  TEXT UNIQUE;
ALTER TABLE "Person"      ADD COLUMN "shareKind"   TEXT;
CREATE TYPE  "JobType" AS ENUM ('TEASER','FULL');
ALTER TABLE "AnalysisJob" ADD COLUMN "jobType"     "JobType" NOT NULL DEFAULT 'TEASER';
ALTER TABLE "AnalysisJob" ADD COLUMN "attempts"    INT NOT NULL DEFAULT 0;
ALTER TABLE "AnalysisJob" ADD COLUMN "leaseUntil"  TIMESTAMP;
CREATE TABLE "Conversion" (
  "id" TEXT PRIMARY KEY, "userId" TEXT, "amountCents" INT NOT NULL DEFAULT 0,
  "currency" TEXT, "attribution" JSONB, "stripeSessionId" TEXT UNIQUE,
  "createdAt" TIMESTAMP NOT NULL DEFAULT now()
);
```

### 5.2 File-change index

**New files:** `components/AttributionCapture.tsx`, `lib/analytics-server.ts`,
`lib/share.ts`, `app/s/[token]/page.tsx`, `app/s/[token]/opengraph-image.tsx`,
`app/api/person/[id]/share/route.ts`, `components/ShareButton.tsx`,
`worker/index.ts`, `app/admin/funnel/page.tsx` (optional), tests, `railway.toml`.

**Edited files:** `prisma/schema.prisma`, `app/layout.tsx`,
`app/api/person/route.ts`, `app/api/checkout/route.ts`,
`app/api/stripe/webhook/route.ts`, `lib/track.ts`, `lib/analyze.ts`,
`app/api/analyze/route.ts`, `app/api/person/[id]/full/route.ts`,
`components/useCheckout.ts`, `components/CaptureFlow.tsx`,
`components/FullPlanBuilder.tsx`, `components/ProgressTimeline.tsx`,
`components/HaloGlance.tsx`, `package.json`, `.env.example`,
`app/privacy/page.tsx`, plus the §0.3 copy fixes.

### 5.3 Definition of done

- [ ] Prereqs: privacy copy true; Plausible domain live; 18+ gate verified.
- [ ] **C-core:** worker draining; redeploy loses zero jobs (load test §3.10);
      paid plan generates from the webhook with the tab closed.
- [ ] **A:** a test purchase with `?utm_source=test&utm_campaign=demo` shows up
      attributed in the webhook `Conversion` row and in Plausible.
- [ ] **B:** share button → `/s/<token>` renders a PII-free card + link preview;
      its CTA lands on `/start?utm_source=share` and shows up in A.
- [ ] **C-polish:** honest queue position renders; no false-failures while queued.
```

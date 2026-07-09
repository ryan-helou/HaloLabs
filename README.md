# HaloLabs

*Upload a few photos of your face and get back neutral observations plus a personalized grooming plan — never an attractiveness score.*

HaloLabs is a face-analysis web app that positions itself against the "rate my face" genre. You take a free scan, and Claude looks at your photos and writes what it actually sees — face shape, hair, skin, brows, facial hair, posture — then hands you a plan you can act on: a list of suggestions across hair, skin, style, and fitness, each tied to something visible in *your* photos, with an AM/PM/weekly routine, a three-phase roadmap, a shopping list, and check-offs you tick as you go. The product constitution (`docs/STRATEGY.md`) draws a hard line: no 1–10, no percentile, no ranking of people, no surgery or filler advice, 18+ only. `impact`/`effort`/`cost` always tag the suggestion, never the person.

The entry point is deliberately frictionless. "Get my free scan" creates a silent guest session — no signup, no password, no questionnaire — and drops you into a guided six-shot capture flow with a webcam mode (a MediaPipe face-guide ellipse and a 3-second timer), a native camera path on phones, and plain drag-drop; HEIC converts to JPEG on upload and short clips are accepted. The 18+ confirmation is collected right before the run.

## How the analysis works

Analysis is one forced tool call to the Claude API (Anthropic SDK, default model `claude-sonnet-5`) that emits a structured v2 record — the same shape the viewer renders. It runs in two passes to keep costs sane under a viral wave of free scans. The **teaser** is cheap: it sends only the frontal shot or two, and returns observations plus the full move *list* as tags with exactly one suggestion (`freeReveal`) written out in full — the free sample. The **full** pass runs only after payment: it sends all photos (up to eight), keeps every move the teaser promised, and fills in the routine, roadmap, and shopping list. Photos are downscaled to 1568px on the longest edge before they hit the vision API, the no-tiling sweet spot that keeps each image near ~1600 tokens instead of ~4800. Every job records its input/output tokens and an estimated cost in cents.

Jobs are rows in Postgres drained by a separate worker service that claims them atomically (`FOR UPDATE SKIP LOCKED`), with lease-based crash recovery so a redeploy can't strand an in-flight scan. In local dev the web process runs jobs inline instead. There's also an on-machine path that shells out to the `claude` CLI and runs the same logic as a Claude Code skill (`.claude/skills/analyze-faces/SKILL.md`).

## Billing

The plan comes back blurred behind a paywall. Unlocking it is a $9.99/month Stripe subscription: Checkout completes, the webhook flips `subscriptionStatus` to `active` — the single flag the paywall reads — and it also *durably* enqueues the paid full-plan job, so you still get what you paid for even if you close the tab. Cancel and it re-locks automatically. A 100%-off friends code checks out at $0 with no card. Purchases are recorded server-side with first-touch marketing attribution so a sale can be credited to the content that drove it.

Built with Next.js (App Router) and TypeScript, Tailwind, Prisma over Postgres, Auth.js for guest and credentials sign-in, Cloudflare R2 for photo storage (with a Postgres-blob fallback the worker can reach), and Stripe. Photos are private, served only to their owner; a plan can be shared through an opaque token that maps to a PII-stripped projection, never the full record.

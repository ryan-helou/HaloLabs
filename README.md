# HaloLabs

A **local-only, single-user** facial-analysis and glow-up-plan tool. Three
parts share one data folder:

1. **The web app** (Next.js App Router + TypeScript + Tailwind) — landing,
   onboarding wizard, guided photo intake, and the plan viewer. It also hosts
   small local API routes for uploads, progress check-offs, and kicking off
   analysis runs. It makes **no external API calls**; photos never leave the
   machine.
2. **`analyze-faces`** — a Claude Code skill
   ([.claude/skills/analyze-faces/SKILL.md](.claude/skills/analyze-faces/SKILL.md)).
   It views a person's photos with Claude's own vision, reads their onboarding
   answers, and writes a full **v2 record** — observations, advice, and a
   personalized plan — to `data/results.json`.
3. **The data folder** (`data/`) — photos, onboarding profiles, results, and
   progress. It is the entire "database".

The product philosophy (what we build, what we never build) lives in
[docs/STRATEGY.md](docs/STRATEGY.md). The short version: **plans, not scores.**
No attractiveness ratings, no rankings, no surgery advice, 18+ only, and
`impact`/`effort`/`cost` always describe the *suggestion*, never the person.

## The flow

```
/            landing (marketing)
/start       onboarding wizard → 18+ gate, goals, focus areas, time,
             budget, no-gos, history → writes data/people/<id>/profile.json
/start/photos?id=<id>
             guided capture: 6 recommended shots + lighting tips, drag-drop
             upload (HEIC auto-converts via sips; short videos accepted),
             then "Begin my analysis" → spawns a local headless Claude Code
             run of analyze-faces and polls until the plan is ready
/person/<id> the deliverable: plan overview (summary, strengths,
             expectations) → observations → analysis matrix → protocol →
             AM/PM/weekly routine → 3-phase roadmap with check-offs →
             shopping list → checkpoints
/profiles    all analyzed people
```

The **Begin my analysis** button shells out to the `claude` CLI
(`/api/analyze`); if that's unavailable it shows the manual fallback — open
Claude Code and say `run analyze-faces --force <id>`.

## Directory layout

```
data/
  people/
    <person-id>/            # one folder per person
      profile.json          # onboarding answers (written by /start)
      photo1.jpg …          # uploaded photos (jpg/png/webp; HEIC converted)
      clip.mp4              # optional videos
      refs/                 # optional reference images for suggestions
      .analysis.{json,log,exit}  # local analysis-run status (transient)
  results.json              # all analysis output (source of truth)
  progress.json             # suggestion check-offs from the roadmap
```

## Run

```bash
npm install
npm run dev      # http://localhost:3000
```

The viewer re-reads `data/*.json` on every request — re-running the skill
shows up on reload.

## Data contract

Types live in [lib/types.ts](lib/types.ts) — the single source of truth for
`results.json` (v2: suggestions carry `id`, `why`, `how`, `products`,
`timeline`, `frequency`, `evidence`, `phase`, `routineSlot`; people carry
`plan` and `builtFor`), `profile.json` (`OnboardingProfile`), and
`progress.json` (`ProgressStore`). v1 records still render — every v2 field
is optional in the viewer.

## Notes / non-goals

- No auth, no database, no cloud. Photos are served via a path-safe route
  handler ([app/api/photo/[...path]/route.ts](app/api/photo/%5B...path%5D/route.ts)).
- No face scoring or ranking UI — by design, permanently. See
  [docs/STRATEGY.md](docs/STRATEGY.md) §3 before adding features.

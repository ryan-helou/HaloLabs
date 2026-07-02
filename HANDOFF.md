# HaloLabs — session handoff

Local-only, single-user glow-up-plan tool. Full product flow shipped
2026-07-02: onboarding → guided photos → local analysis → plan with routine,
roadmap, shopping list, and progress tracking. **Read
[docs/STRATEGY.md](docs/STRATEGY.md) before adding features** — it is the
product constitution (NEED / COULD / NEVER), synthesized from deep research
on QOVES, Umax/LooksMax AI, biometric law, and dermatology evidence.

## Architecture

1. **Web app** (Next.js 14 App Router + TS + Tailwind) — marketing landing,
   onboarding wizard, capture/upload flow, plan viewer, plus local API routes.
   No external calls; photos never leave disk.
2. **`analyze-faces` skill** ([.claude/skills/analyze-faces/SKILL.md](.claude/skills/analyze-faces/SKILL.md))
   — Claude-vision analysis, writes schema **v2** to `data/results.json`.
   Consumes `data/people/<id>/profile.json` (onboarding) and quotes it back.
3. **Data folder** = the database: `people/<id>/` (photos + profile.json),
   `results.json`, `progress.json`.

## Run
```bash
npm run dev      # http://localhost:3000
npm run build && npm run start
```
Don't `npm run build` while dev is running (clobbers `.next`).

## The flow (all shipped & Playwright-verified, 25/25)
- `/` — Qoves-style marketing landing; all CTAs → `/start`.
- `/start` — 5-step wizard (client, `OnboardingWizard.tsx`): 18+ hard gate +
  name → goals + focus chips → time/budget/no-gos → tried/constraints/notes →
  review. POST `/api/person` writes `profile.json` (403 without the 18+ flag).
- `/start/photos?id=` — `CaptureFlow.tsx`: 6-shot self-tracked checklist with
  SVG glyphs, lighting tips, and three intake paths: (1) **guided webcam
  session** (`CameraCapture.tsx` modal — getUserMedia, mirrored preview +
  face-guide ellipse, 3s timer, capture→retake/keep, saves the UN-mirrored
  frame as `camera-<shot>.jpg`, auto-advances shots and ticks the checklist;
  desktop/fine-pointer only, needs https/localhost); (2) **native camera**
  on touch devices via hidden `<input capture="user">`; (3) drag-drop /
  browse upload. All paths → POST `/api/upload` (multipart; HEIC→jpg via
  `/usr/bin/sips`; mp4/mov/webm accepted; 4-photo minimum gates the button).
  Camera flow Playwright-tested 7/7 with Chromium fake-webcam flags. "Begin my analysis" → POST `/api/analyze`
  spawns detached `zsh -lc 'claude -p … --permission-mode acceptEdits
  --allowedTools Bash(ls/mv/sips)'`; status dotfiles
  (`.analysis.{json,exit,log}`) in the person folder; page polls GET
  `/api/analyze?id=` every 3s → done screen links to the plan. Error state
  shows copy-paste manual fallback (`run analyze-faces --force <id>`).
- `/person/<id>` — the deliverable, reformatted 2026-07-02 in the landing's
  Qoves report language (full-bleed breakout, hairline-framed acts, no
  rounded shadow cards): `PersonHero` cover band (panel gradient, two-tone
  name, photo viewer + lightbox, divided stat row) → `PlanOverview` (dark
  full-bleed split band: summary + builtFor chips + expectations left,
  `[1]`-numbered strengths right) → acts `[01]`–`[06]`, each a
  `ReportSection` (shared shell: sticky left rail with bracket numeral +
  two-tone heading + blurb + optional rail content; edge-to-edge divided
  content right). [01] observations dl (+ v2 `extras`) · [02] stat strip +
  impact/effort matrix · [03] protocol (clay "Start here /" shortlist,
  Legend in the rail, per-category `SuggestionRow`s with v2 detail) · [04]
  routine as divided AM/PM/weekly columns · [05] roadmap as the Qoves
  protocol-timeline: phase columns with mono "Phase N / window" labels and
  optimistic check-offs → POST `/api/progress` → `data/progress.json`
  (overall progress bar lives in the rail) · [06] shopping list &
  checkpoints split → wellbeing footnote.
- `/profiles` — roster + "+ New analysis".

## Schema v2 (lib/types.ts is the single source of truth)
- `Suggestion` += optional `id` (slug, used by plan refs + progress), `why`
  (must be personal), `how[]`, `products[]` (examples-not-endorsements),
  `timeline`, `frequency`, `evidence` (strong/moderate/emerging), `phase`
  (1|2|3), `routineSlot` (am/pm/weekly).
- `Person` += `plan` (summary, strengths[], expectations, phases[3],
  routine[], shoppingList[], checkpoints[]) and `builtFor[]` (onboarding echo
  chips). `Observations` += `extras[]`.
- Everything new is optional → v1 records still render.
- `OnboardingProfile` (profile.json) and `ProgressStore` (progress.json) also
  live in types.ts. `lib/plan.ts` (id/anchor resolution), `lib/progress.ts`
  (atomic store, unique temp names — pid alone collided), `lib/profile.ts`.

## Guardrails baked in (STRATEGY §3 — do not undo)
- No attractiveness scores/rankings anywhere; tags describe suggestions.
- No surgery/filler advice (skill constraint + strategy doc).
- 18+ gate enforced server-side; wellbeing note in wizard + person page +
  footer; BDD-aware "strengths first" ordering.
- Photos local-only; no affiliate framing on products ("examples, not
  endorsements").

## Hero redesign (2026-07-02, user feedback)
`PersonHero.tsx` no longer uses `CompareSlider` or `LandmarkOverlay` — the
front-vs-profile drag slider plus the decorative mesh read as a broken face
mashup on real photos ("what is this?"). Now: main photo with counter +
thumbnail selector + lightbox, one metadata line ("Analyzed <date> · from N
photos"), a plain-sentence summary card, and labeled "Jump to" chips (incl.
Routine/Roadmap when a plan exists). `CompareSlider`/`LandmarkOverlay`
components still exist but are unused — CompareSlider is earmarked for real
before/after progress pairs later.

## Report reformat (2026-07-02, "format the plan just like Qoves")
The whole `/person/<id>` page now uses the landing page's Qoves design
language (see docs/qoves-teardown.md §2). Key pieces:
- `components/ReportSection.tsx` — shared act shell: `border-t` framed
  sections stacking flush inside a `border-b` wrapper (page.tsx), inner
  `max-w-[1300px]` canvas with `lg:border-x`, 4fr/8fr rail/content split,
  rail is `lg:sticky lg:top-24`. Content renders edge-to-edge so acts run
  divided grids (`divide-x` columns / `divide-y` rows) out to the frame.
- PersonHero became the cover band (landing-hero gradient + trust-row
  pattern with real stats); PlanOverview became the dark split band
  (landing §7 pattern). Playwright-verified on desktop (incl. sticky rail
  mid-scroll) + 390px mobile, in dev and in the prod build.
- The old Playwright smoke suite's text selectors for section headings
  ("Analysis", "Roadmap"…) are stale — headings are now two-tone ("Your
  facial / analysis" etc.) and the suite scratchpad was session-local.

## Id casing gotcha
Onboarding slugs are lowercase (`ryan-helou`) while the original folder was
`Ryan-Helou` — same folder on macOS (case-insensitive FS). The user's own
re-analysis normalized the record id to `ryan-helou`. `loadPerson` is now
case-insensitive so both URL casings resolve.

## Current data
- `Ryan-Helou`: 5 photos, hand-upgraded v2 record (17 suggestions with full
  v2 fields, complete plan). `builtFor: []` — he has NOT done onboarding; his
  plan.summary says to re-run after onboarding. His curated advice content
  was preserved from the 2026-07-01 session.
- `test-person`: throwaway QA profile (wizard-created, 2 photos copied from
  Ryan) used to verify the end-to-end headless-claude analysis run. **Delete
  folder + results.json entry + progress entries when convenient.**

## Verification state (2026-07-02)
- `tsc --noEmit` clean; `npm run build` clean (all routes compile).
- Playwright smoke suite 25/25 (scratchpad `test_halolabs.py`): wizard
  end-to-end incl. 18+ gating, capture checklist, uploads grid, plan
  sections, progress toggle + persistence + counter, v2 fields render,
  profiles page.
- Upload API verified via curl incl. HEIC→jpg conversion.
- Headless analyze run: spawn + status polling verified live (a real
  `claude -p` run on test-person).

## Aesthetic
Cool near-white bg, slate accent (#3F5B6B), blue-grey panels, Manrope +
JetBrains Mono, `[1]` bracket numerals, three-act numbered sections, pill
header. Landing keeps Qoves-style attractiveness copy (user decision
2026-07-01); inside the app stays constructive — no scores.

## Landing images
`public/landing/model-{1,2}-{before,after}.jpg` — Gemini Nano Banana pairs
(same person, ~15 subtle self-care tweaks). Prompts + regeneration workflow
in `public/landing/PROMPTS.md`. LandingCompare crops 12:15 with a 1.1×
top-anchored zoom to hide the Gemini watermark; clip lives on an unscaled
wrapper so the divider tracks exactly.

## Open / next steps
- Delete `test-person` QA data.
- Ryan should run `/start` onboarding, then re-analyze so his plan gets
  `builtFor` + onboarding callbacks.
- COULD-list (STRATEGY §2): re-analysis diffs ("what changed"), wardrobe/
  color module, calendar export for the routine, barber/derm handoff sheets,
  before/projection renders (guardrails in §3.4), video frame extraction
  (needs ffmpeg).
- 21st.dev Magic MCP still key-blocked (needs x-api-key via `claude mcp`).

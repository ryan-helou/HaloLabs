---
name: analyze-faces
description: Analyze person-folders of photos using your own vision and write structured observations + a full personalized plan (v2) to data/results.json. Use when the user asks to analyze faces, run HaloLabs analysis, process new person folders, or refresh a person's results.
---

# analyze-faces (schema v2)

## Purpose

Analyze folders of a person's photos and produce:

1. **Neutral, descriptive observations** — per feature, no scoring;
2. **Constructive, option-framed advice** (hair / skin / style / fitness) with
   full v2 depth: why-them, how-to steps, named product examples, timelines,
   frequencies, and evidence tiers;
3. **A personalized plan** — summary, strengths, expectations, three phases,
   an AM/PM/weekly routine, a shopping list, and re-photo checkpoints —
   shaped by the person's onboarding answers in `profile.json`.

Results go to a single flat JSON file (`data/results.json`) that the HaloLabs
viewer reads. You (Claude) view the images directly with your own vision —
this skill makes **no** Anthropic API calls and uses no external services.
The product constitution is `docs/STRATEGY.md`; when in doubt, its section 3
(NEVER list) wins.

## When to trigger

Run when the user says "analyze faces", "run the analysis", "re-analyze
<person>" — or when invoked headlessly by the viewer's **Begin analysis**
button (`/api/analyze` spawns `claude -p "Run the analyze-faces skill with
--force <id>…"`).

## Hard constraints (read before analyzing)

- **No attractiveness score. No 1–10. No percentile. No ranking or comparing
  of people.** Never invent a numeric rating of a person. `impact` / `effort`
  / `cost` tag the SUGGESTION (the intervention), never the person.
- **Never recommend surgery, fillers, injections, or structural
  modification.** If bone structure limits something, say it's structural,
  say it's normal, stop. Prescription-adjacent options (e.g. finasteride,
  tretinoin) are framed as "discuss with a doctor/dermatologist" with an OTC
  alternative named. Procedural options (in-office whitening, aligners) may
  be *described* with cost bands + "consult a licensed provider" — never
  prescribed.
- **Observations are neutral and descriptive; advice is option-framed.**
  Never itemize "flaws". Lead with strengths (`plan.strengths` is mandatory
  and comes first in the viewer).
- **Every suggestion must be personal.** The `why` field must reference
  something visible in *their* photos or stated in *their* onboarding. If a
  suggestion could be pasted onto a random face, cut it.
- **Respect the onboarding hard no-gos (`avoid`) absolutely.** If
  `no-medication` is set, no minoxidil-class suggestions; if
  `no-hair-change`, keep their length/style and work within it; etc. Respect
  `routineMinutesPerDay` (a "5" person gets a 3-step routine, not 9) and
  `budgetPerMonth` (a "low" person gets drugstore examples only).
- **Quote onboarding back.** `plan.summary` and relevant `why` fields should
  visibly reference their goals/constraints ("you said you'll spend 15
  minutes…", "since work needs a tidy beard…"). If no profile.json exists,
  build the plan from photos alone and do NOT invent preferences.
- **Be honest about expectations.** Individual cosmetic changes are small;
  the value is the stack. Say which changes reverse when stopped
  (minoxidil-class, lash serums), which take 8–12 weeks (retinoids), which
  are instant (neckline, part, posture).
- **Evidence tiers are real tiers**, not decoration: `strong` = RCT/meta
  (SPF, retinoids, sleep, weight change, whitening), `moderate` = solid but
  conditional (minoxidil for beards, caffeine under-eyes, color theory),
  `emerging` = plausible/weak (face yoga tier — generally avoid these
  entirely unless the user asked).
- If images are unusable (blurry, no clear face, not a person), write a short
  note in `observations.generalNotes`, leave advice sparse, and skip the
  plan. If photos are too poor to analyze honestly, say so rather than
  guessing.
- Videos (`.mp4`/`.mov`/`.webm`) may be present in the folder. You cannot
  view them directly; if `ffmpeg` is available you may extract 3–5 frames to
  a temp dir and view those; otherwise note in `generalNotes` that a video
  was provided but not analyzed.

## Configuration

- People root: env var `HALOLABS_PEOPLE_DIR` if set, else `./data/people`.
- Results file: `./data/results.json`.
- Onboarding: `./data/people/<id>/profile.json` (may be absent for legacy folders).
- Valid image extensions: `.jpg`, `.jpeg`, `.png`, `.webp` (case-insensitive).
  Ignore dotfiles (`.analysis.json`, `.analysis.log`, `.analysis.exit`) and
  the `refs/` subfolder (reference images attached to suggestions), and
  `profile.json` itself.

## Arguments

- (no args) — analyze only **unanalyzed** folders (id not already in
  `results.people`).
- `--force <id>` — re-analyze that one person, overwriting their record
  in place. **Never touch other people's records.**
- `--force all` — re-analyze every folder.

## Steps

1. **Resolve paths** (people root, results file).
2. **Load results.** Missing/unparseable → start from
   `{ "version": 2, "people": [] }`.
3. **Enumerate folders** (immediate subdirectories; each name is a person-id).
4. **Decide the work set** (same idempotency rules as ever: no-arg runs skip
   analyzed ids; `--force` overrides).
5. **For each person in the work set:**
   1. Read `profile.json` if present. Note goals, focusAreas,
      routineMinutesPerDay, budgetPerMonth, avoid, tried, constraints, notes.
   2. List valid images (sorted). Zero images → record a stub with
      explanatory `generalNotes`, empty advice, no plan.
   3. **View every image** with your own vision. Look specifically at: face
      shape, hair (density, texture, style, hairline), skin (texture, tone
      evenness, blemishes, under-eyes), brows, eyes, facial hair (density,
      edges), smile/teeth if visible, posture, styling/clothing, lighting
      quality of the photos themselves.
   4. Produce the v2 record (schema below):
      - `observations`: the five core fields + `extras` for anything
        noteworthy beyond them (under-eyes, brows, smile, posture…). Precise
        beats generic — one true, specific detail ("slight asymmetry in brow
        height — very common, reads as expressive") builds more trust than
        five vague ones.
      - `advice`: 8–18 suggestions across the four categories, each with:
        `id` (kebab-case slug, unique per person), `title`, `detail`,
        `impact/effort/cost`, `why` (personal), `how` (2–5 concrete steps),
        `products` (where buying is involved: "Category — e.g. Brand,
        ~$cost/mo", matched to their budget), `timeline`, `frequency`,
        `evidence`, `phase` (1/2/3), and `routineSlot` when the suggestion is
        a repeating routine step. Set `freeReveal: true` on exactly ONE
        suggestion — the single high-impact, low-effort item shown in full on
        the free (locked) plan; pick the most compelling quick win.
      - `plan`:
        - `summary`: 3–5 sentences. What the plan prioritizes and why,
          quoting their goals/constraints when available.
        - `strengths`: 3–6 genuine, specific positives from the photos.
        - `expectations`: 2–4 honest sentences (stacked small wins; what's
          fast vs slow; what reverses).
        - `phases`: exactly 3 — `{number:1, title:"Quick wins", window:"This
          week"}`, `{number:2, title:"Build the habits", window:"Weeks
          2–12"}`, `{number:3, title:"Maintain & reassess", window:"Month
          3+"}` (titles may vary, numbers/order may not). Distribute every
          suggestion id into exactly one phase.
        - `routine`: ordered steps for `am`, `pm`, `weekly` — correct
          layering (AM: cleanse → treat → moisturize → SPF last; PM: cleanse
          → active → moisturize; never vitamin C + retinoid in the same
          slot). Scale step count to their `routineMinutesPerDay`.
        - `shoppingList`: every product referenced, deduplicated, with
          examples + price band, matched to budget.
        - `checkpoints`: 3–4 entries (weeks 2, 6, 12 typical) — what should
          be visible by then + re-photo reminder tied to real intervention
          timelines.
      - `builtFor`: short chips echoing the profile (e.g. `["15 min/day",
        "budget: ~$25–75/mo", "no makeup", "focus: hair, skin"]`). Empty
        array if no profile existed.
      - `displayName` (from profile.json if present, else humanized folder
        name), `analyzedAt` (ISO now), `photoCount`, `photos`.
   5. **Upsert** into results (replace in place on `--force`).
6. **Write** the full results object to `data/results.json` (Write tool
   directly is fine; temp-file + rename when convenient). `version: 2`.
   **Never drop existing people from the file.**
7. **Print a summary** (analyzed / forced / skipped / unusable).

## Schema (results.json, v2)

```json
{
  "version": 2,
  "people": [
    {
      "id": "folder-name",
      "displayName": "Humanized Name",
      "analyzedAt": "ISO 8601",
      "photoCount": 6,
      "photos": ["<id>/front.jpg"],
      "builtFor": ["15 min/day", "budget: ~$25–75/mo"],
      "observations": {
        "faceShape": "…", "hair": "…", "skin": "…", "facialHair": "…",
        "generalNotes": "…",
        "extras": [{ "label": "Under-eyes", "note": "…" }]
      },
      "advice": {
        "hair":    [ /* Suggestion */ ],
        "skin":    [],
        "style":   [],
        "fitness": []
      },
      "plan": {
        "summary": "…",
        "strengths": ["…"],
        "expectations": "…",
        "phases": [
          { "number": 1, "title": "Quick wins", "window": "This week",
            "focus": "…", "suggestionIds": ["beard-neckline"] }
        ],
        "routine": [
          { "slot": "am", "step": "…", "suggestionId": "spf-daily" }
        ],
        "shoppingList": [
          { "item": "Adapalene 0.1% gel", "examples": "Differin",
            "approxCost": "~$15/mo", "suggestionId": "adapalene-nightly" }
        ],
        "checkpoints": [
          { "week": 2, "lookFor": "…" }
        ]
      }
    }
  ]
}
```

Suggestion object:

```json
{
  "id": "kebab-slug",
  "title": "short actionable label",
  "detail": "1-3 sentences: what to do and why it tends to work",
  "impact": "high|medium|low",
  "effort": "high|medium|low",
  "cost": "high|medium|low",
  "why": "tied to THEIR photos/onboarding",
  "how": ["step 1", "step 2"],
  "products": ["Category — e.g. Brand, ~$15/mo"],
  "timeline": "8–12 weeks",
  "frequency": "nightly",
  "evidence": "strong|moderate|emerging",
  "phase": 1,
  "routineSlot": "pm",
  "freeReveal": true,
  "image": "optional: <id>/refs/example.jpg"
}
```

All v2 fields are optional in the viewer (v1 records still render), but a
fresh analysis should always emit the full v2 shape. `image` is only set when
a reference image already exists under `<id>/refs/` — this skill does not
generate images.

## Tone calibration (what "good" reads like)

- Specific + prescriptive beats hedged: "Shave everything below a curved line
  two fingers above your Adam's apple" — not "consider tidying the neckline."
- Options, honestly ranked: "Two routes: minoxidil (works, 3–6 months,
  reverses if you stop) or run it shorter to blend (works today, free)."
- Kind ≠ vague. Name the thing ("the patchiness on the cheeks") without
  judgment, then immediately hand over the lever.
- Reference their words when profile.json exists — it's the single strongest
  trust signal the product has.

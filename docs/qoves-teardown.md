# Qoves teardown — what we learned and what we copied

Walked the entire qoves.com landing page (~31,000px, 33 viewport captures) and
their `/welcome/checkout` funnel with a scripted browser on 2026-07-01/02.
This file is the reference for every layout/structure decision on the HaloLabs
landing page and onboarding.

Their positioning: "Improve your looks without surgery" — $150/year,
photo-based facial analysis + personalized non-surgical improvement protocol.
Same shape as HaloLabs, so their page structure maps almost 1:1.

---

## 1. Landing page structure (top → bottom)

| # | Section | What it does | HaloLabs status |
|---|---------|--------------|----------------|
| 1 | **Hero** — full-bleed portrait on blue-grey, "Improve your looks / without surgery" (second line lighter), sub, 2 pill CTAs (Start my plan / How it works), trust row at bottom (Based on science · Personalized · Without surgery) with hairline dividers | Instant value prop + zero-risk framing | ✅ Copied (`app/page.tsx` hero) |
| 2 | **"As seen in"** press logo strip (Sun, Cosmopolitan, MIT TR, GQ, Wired, NY Post, USA Today, Guardian, Daily Mail) | Borrowed authority | ❌ Skipped — we have no press; faking it would be dishonest |
| 3 | **Framed "Life-changing Transformations" split** — hairline-framed canvas, left: pill + two-tone heading + research line + `[1]–[5]` numbered benefits pinned to bottom; right: two BEFORE/PROJECTION drag sliders | The signature visual proof | ✅ Copied, with our sign-in form added into the left column |
| 4 | **"Studies show your looks influence almost everything…"** — giant two-tone heading, tab pills (Finances/Dating/Socializing/Health/Education/Law/Influence/Happiness), 4 stat cards per tab, each with a real journal citation in mono type | Science-backed persuasion; citations do the selling | ✅ Copied (`components/ResearchTabs.tsx`), 4 tabs × 4 cards, all real published studies |
| 5 | **"A new way to glow-up"** — "The old way" (5 steps, light card) vs "The new way" (5 steps, dark gradient card) | Reframes the market; positions clinics as the old way | ✅ Copied |
| 6 | **Doctor quote interludes** — small avatar + one-liner between sections (Dr Gary Linkov etc.) | Authority micro-dosing between sections | ❌ Skipped — no real endorsements to show |
| 7 | **"Your complete facial analysis"** — dark section, centered portrait with floating analysis widget cards (bell curve, density grid, sliders, facial thirds) | Makes the product feel technical/precise | ✅ Copied — portrait + 4 floating metric cards (most noticeable, hair volume %, skin scale, quick win) |
| 8 | **"Taking into account your…"** — stacked thumb+title+line cards (Ethnic background, Personal preferences, Lifestyle factors, Natural aging, Cultural beauty standards) | Personalization proof | ⚠️ Merged into "You will learn.." (one stacked-card list instead of two) |
| 9 | **"You will learn.."** — same stacked-card pattern, 5 items (biometrics, per-feature impact, harmony, potential, science) | Concretizes the deliverable | ✅ Copied, mapped to our actual deliverables |
| 10 | **"Get your personalized Qoves plan"** — dark full-bleed split: eyebrow pill, two-tone heading, `[1]–[4]` list; right: real report mockup ("Jenni's Protocol", before/after, radar chart, "reads 3 years younger") | Shows the actual product | ✅ Copied — advice-board mockup with our real tag system (Quick win / Habit / Grooming) |
| 11 | **"No need for surgery"** — two large before/projection sliders + "See detailed transformation" links | More proof, repeated pattern | ⚠️ Skipped as separate section (sliders already in §3; avoid repeating with only 2 image pairs) |
| 12 | **"Simply follow your plan / See your face transform"** — framed split, protocol timeline mockup (Key markers of health 0-1 month → Basic facial proportions 1-2 months → action steps) | Time-based expectation setting | ❌ Not yet — candidate for when plan phases ship in the viewer |
| 13 | **"See your future you"** — center slider flanked by 4 feature cards (Realistic Visualization, Achievable Without Surgery, Ethnicity-Aware, Visualize Before Deciding) | Feature grid around visual | ❌ Skipped — we don't generate projections of the user |
| 14 | **"Track your progress / Predict the future"** — biometric score cards (Facial Femininity 52, Homogeneity 38 "Too Low", Symmetry "Ideal", Visual Age) with YOU→IDEAL sliders + trend chart | Quantified-self hook | ❌ Deliberately skipped — HaloLabs is explicitly no-scores, no-ratings |
| 15 | **"The world's largest beauty science community"** — bento: 2M+ followers, Recommended by Leading Doctors, Surgery-Free, 100% Personalized, Science-Backed | Social proof bento | ❌ Skipped (no community/followers) |
| 16 | **"160+ Aesthetic Tests"** — accordion of face regions with test counts (Eyes 26, Lips 16, Skin 20…), chips "tested 1x a year / from home" | Depth/comprehensiveness proof | ❌ Skipped for now — could become "what the analysis covers" accordion |
| 17 | **Advisors** — 10 doctor cards with photos + bios (Dr. Lara Devgan, Dr. John Shamoun, …) | Heavyweight authority | ❌ Skipped — fabricating endorsements is a hard no |
| 18 | **Technology** — 4 cards: 521-point landmarking, Personalization, Science of Facial Attractiveness (160+ tests), Reviewed by Humans | "How it's smart" | ⚠️ Partially covered by our facial-analysis section |
| 19 | **"Your face tells your story"** — dotted world map + 5 numbered ancestry/ethnicity facts | Ethnicity-aware positioning | ❌ Skipped |
| 20 | **Real user transformations** — masonry of genuine before/after selfies ("Team Member" tags, "achieved without any surgical interventions") | Rawest, most convincing proof on the page | ❌ Skipped until we have real consented examples |
| 21 | **"Join 50,000+ people / Start your transformation."** — full-bleed lifestyle photo, CTA, horizontally scrolling testimonial cards with names | Big emotional CTA + testimonials | ⚠️ Copied the CTA ("See yourself clearly. / Start your transformation.") without fake counts/testimonials |
| 22 | **"How it works / No clinic visits needed"** — 3 numbered cards: Upload Your Photos (6 clear photos, posed thumbnails) → Facial Assessments (160+ markers) → Personalized Report | The funnel explainer | ✅ Copied, mapped to our real flow (questionnaire → guided photos → plan) |
| 23 | **Pricing** — "What could cost you ~~$10,000~~ is $150", left: 5-item checklist with subs; right: membership card mockup $150/yr, payment icons, Get Access; 3 trust chips (Trusted by 50,000+ · Secure Payment · Data Private) | Price anchoring vs surgery | ❌ Skipped — HaloLabs has no pricing. The $10k-anchor pattern is worth remembering if it ever does |
| 24 | **"Your support system"** — Ask Any Question, Qoves Letter, Lifetime Tracking | Post-purchase reassurance | ❌ Skipped |
| 25 | **FAQ** — two-tone heading, left category rail (9 categories), right accordion. Notable Q: "Can't I just do this with Chat GPT or Claude?" | Objection handling | ✅ Copied (single accordion, native `<details>`); kept the ChatGPT/Claude question and answered it honestly — HaloLabs *is* Claude, with structure |
| 26 | **"Will analyzing my face make me insecure?"** — dark video-bg, 3 reassurance cards (unique / clarity / control) | Psychological objection handling — smartest section on the page | ✅ Copied nearly verbatim in structure |
| 27 | **"Is it vain to care about your appearance?"** — checklist card: Not chasing unrealistic standards / Not trying to look like someone else / Not seeking perfection / Aiming only for a better version of yourself | Ethics framing | ✅ Copied |
| 28 | **Footer** — support email, disclaimer ("Some images digitally generated…"), link columns, giant gradient QOVES wordmark | Brand close | ✅ Copied (giant HALOLABS gradient wordmark, disclaimer, link columns) |

## 2. Design system observations

- **Palette:** blue-grey studio tones everywhere (their backdrop ≈ our `panel`
  #C3CFD5). Dark sections are slate (≈ our `pine-deep`), never black.
- **Two-tone headings** are the signature: first line near-black, second line
  ~50% muted blue-grey. We implement as `text-ink` + `text-pine/50`.
- **Hairline framed grids:** major sections sit in 1px-bordered canvases with
  visible column dividers (`border-y` + inner `border-x` + `border-r`).
- **Mono microcopy:** eyebrows/labels are small uppercase mono with wide
  tracking, often in `[brackets]` or with `/` suffix ("COMPANY /").
- **Numbered lists** as `[1] … [5]` with wide gap between number and label,
  list pinned to the bottom of its column.
- **Floating nav pill:** translucent, rounded-full, centered links, Login +
  filled "Start my plan" right.
- **BEFORE / PROJECTION** corner labels on all comparison panels; thin white
  divider + round drag handle.
- **CTA cadence:** "Start my plan" appears roughly every 2 sections. Only two
  CTA labels exist on the whole page: "Start my plan" and "Get Access".
- **Repetition with variation:** the same stacked-card and split-section
  patterns recur; the page feels long but coherent.

## 3. The funnel (`/welcome/checkout`) — key finding

**There is no questionnaire before payment.** The funnel is:

1. **Entry card** (dark, centered): "Start your Transformation", mono
   social-proof line "50,000+ PEOPLE ALREADY JOINED", three fields — First
   Name, Last Name, Email — and Continue.
2. **Email confirm** micro-step ("Check your email address" / "Continue with
   this email") — typo-catcher to protect deliverability.
3. **Payment page** (Stripe): card details + **one-time add-on upsells** —
   Express Delivery 24-48h **$80**, Surgical Recommendations **$180**,
   Hairstyle Suggestions **$25** — order summary $150/yr, trust badges
   ("encrypted and secure", "Rated 4.9/5", "No Hidden Fees. Cancel Anytime.").
4. **After payment**, inside app.qoves.com: the actual intake — the report
   sidebar reveals what they collect: AGE, GENDER, PREFERENCES, SMOKING,
   DRINKING, SKIN, LOCATION, LIMITATIONS, ALLERGIES, PROFESSION — plus the
   6-photo guided upload ("Upload 6 clear photos… through our online portal",
   with pose thumbnails).

So their order is: **commit (pay) → then personalize.** Classic paid-funnel
logic: minimize fields before the credit card, harvest context after the sale
is locked in.

## 4. Questionnaire: HaloLabs vs Qoves

| Dimension | Qoves | HaloLabs (`components/OnboardingWizard.tsx`) |
|---|---|---|
| **Placement** | After payment, inside the app | Before anything else, free — `/start` |
| **Pre-commit fields** | First name, last name, email only | Name + 18+ confirmation (step 1 of 5) |
| **Intake content** | Age, gender, ethnicity/preferences, smoking, drinking, skin, location, limitations, allergies, profession | Goals (free text), focus areas, time/day, budget/month, hard no-gos, what you've tried, lifestyle constraints, notes |
| **Intake style** | Structured demographic/medical-ish profile fields | Motivation-first: two free-text prompts the plan quotes back, plus practical constraints |
| **Photos** | 6 posed photos, guided upload after payment | 6 guided shots (`/start/photos`), local only |
| **Multi-step UX** | Step cards, Back button, progress implied | Step cards, Back button, progress bar, review step |
| **Safety** | None visible | 18+ hard gate, dysmorphia-aware note, no-scores promise |
| **Monetization** | $150/yr + add-on upsells at checkout | None |

**Update (2026-07-02): we now copy their order.** `/start` is a commit-first
funnel (`components/StartFunnel.tsx`):

1. **Entry card** — First/Last/Email(optional) + 18+ checkbox, mono line
   "FREE · PRIVATE · ON YOUR MACHINE" where they show "50,000+ joined".
2. **Email typo-confirm** micro-step (only when an email was entered).
3. **Membership page** — their checkout layout with honest numbers: "What you
   get" checklist, add-ons block (~~$80~~ Express delivery → Included,
   ~~$25~~ Hairstyles → Included, ~~$180~~ Surgical recommendations → Never),
   order summary card "$0 / forever — what could cost you ~~$150/year~~ is
   free", trust rows. "Join now" instead of a card form.
4. **Then** the questionnaire (`/start/quiz`, wizard skips its name/18+ step
   via the `halolabs_entry` localStorage handoff) → guided photos → plan.

Remaining difference in intake content: theirs is demographic (smoking,
drinking, allergies, profession), ours is motivation/constraint-driven
(goals, budget, no-gos, what you've tried). Still worth adding a light
"lifestyle facts" row (sleep, smoking, sun exposure) — the skill can
genuinely use those.

## 5. Ideas parked for later

- ~~**Protocol timeline** (their §12): phase cards with month ranges~~ —
  **adopted 2026-07-02**: the `/person/<id>` roadmap act renders phases as
  hairline-divided columns with mono "Phase N / window" labels. The whole
  report page now uses the §2 design system (framed acts, two-tone
  headings, `[01]` numerals, sticky rails) via `components/ReportSection.tsx`.
- **"What the analysis covers" accordion** (their 160+ tests pattern) mapped
  to our observation categories.
- **Real consented before/after gallery** — their strongest proof; only with
  real users.
- **$10k price-anchor pricing section** — only if HaloLabs is ever paid.
- Lifestyle facts in intake: sleep, smoking, sun, climate (they collect these
  post-payment; our skill could use them too).

## 6. What we will not copy

Fabricated authority: press logos, doctor advisor grids, "50,000+ people",
named testimonials, follower counts, star ratings. The structure carries the
persuasion; the claims stay honest. Also excluded by principle: scores/ratings
("Homogeneity 38 — Too Low"), visual-age numbers, and surgical add-ons — the
entire HaloLabs stance is observations and options, never grades.

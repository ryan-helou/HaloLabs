# QOVES Short-Form Video Teardown

Reference notes from reverse-engineering two QOVES shorts (in
`public/qoves_videos/`). These videos are a big part of why QOVES grew. Goal:
clone the format to funnel viewers into HaloLabs' freemium scan.

---

## The two videos analyzed

### Video 1 — "Do you have Cute eyes or Hot eyes?" (48s, 9:16)
- **Hook (first 1.5s):** a personal binary — *"Do you have cute eyes or hot
  eyes? Here's how to tell."*
- **Decode:** cute eyes = rounder, more upper lid, outer corner level/down,
  more sclera under the iris → brain reads *youthful / gentle / approachable*.
  Hot eyes = narrower, horizontal, outer corner tilts up, "aimed at you" →
  *intense / focused*.
- **Release valve:** *"neither is better, they're just different — so which
  one are you?"*

### Video 2 — "Which face gets signed?" (58s, 9:16)
- **Hook:** a "you decide" scenario — *"If you're a model scout, which face
  would you sign?"*
- **Payoff:** counterintuitive truth — the *more perfect* face is more
  forgettable.
- **Mechanism + citation:** brain prefers "statistically average / familiar"
  faces (cites Said & Todorov), but the **Von Restorff effect** means unusual
  features (Lily Collins' brows, Anya Taylor-Joy's proportions) are what you
  *remember*.
- **Kicker:** *"typical attractive faces get likes, atypical get comments."*
- **CTA:** get your facial analysis → Qoves.com.

---

## The formula (this is the whole thing)

1. **Hook = a personal binary or "you choose" question in the first 1.5s.**
   About the viewer, answerable, slightly provocative. ~80% of performance.
2. **Promise to decode something people feel but can't articulate** — sell
   *language for an intuition* ("everyone calls her cute but can't explain why").
3. **Teach with a named mechanism + one citation.** A real term (Von Restorff)
   or a flashed study = authority signal. Nobody reads it; it just *looks* like
   science.
4. **Contrast structure — always A vs B** (cute/hot, perfect/interesting).
   Inherently watchable and rewatchable.
5. **Signature "AI scanner" visual system** (see below).
6. **Non-judgmental release valve** ("neither is better, just different") —
   defuses insecurity, makes it shareable ("this is SO me") not toxic.
7. **Soft CTA only at the very end.**

---

## The visual system (the signature / the moat)

- Muted desaturated sage/blue-grey background; one high-res face centered.
- Front-lit, neutral expression, model or AI face.
- Translucent **glass HUD panel** over the eyes, labeled e.g. `YOUTHFUL /
  Round`, with dotted feature-tracing lines.
- **Callout tags** ("Upper lid showing") on thin connector lines pointing to
  exact anatomy.
- **Serif italic captions**, bottom third, one line at a time — editorial /
  luxury feel, NOT TikTok-default sans.
- Feature crops fly in; Instagram-comment mockups ("she's really cute 🥰") as
  social proof.
- Calm, low, slightly-ASMR voiceover.

---

## Production stack — how to make these

**Key insight: these are NOT AI-generated videos.** A QOVES video is a
**4-layer assembly**, not one "make video" button. Feeding a face into
Sora/Kling/Runway produces a morphing deepfake — the opposite of the clean
clinical look.

| Layer | What | Tools |
|---|---|---|
| 1. Face | High-res, front-lit, neutral, flat bg | AI image (Midjourney/Flux, `generate_image`), AI faces, or licensed stock. Apply slow Ken Burns zoom. |
| 2. Scanner HUD | Glass panel, dotted trace, callout tags | Motion graphics. **After Effects/CapCut template** (fast) or **Remotion** React render (scalable). Build once, reuse forever. |
| 3. Voiceover | Calm ASMR register | ElevenLabs, or `create_voice`/`generate_audio`. Clone one house voice. |
| 4. Captions + assembly | Serif italic, synced | CapCut (fast, ~20 min/video) or fold into the Remotion render (automatic). |

**Above the video:** use an LLM (Claude) as script/hook engine (20 hook
variants → 120-word script → callout copy → shot list). Test hooks with
`virality_predictor` before producing.

### Why AI video-generation is the wrong tool
1. **Temporal/identity drift** — face morphs across the clip; reads as fake;
   kills the clinical credibility the format sells.
2. **No precision overlays** — diffusion video can't pin a labeled tag to an
   exact landmark and hold it; motion graphics give frame-exact coordinates.
3. **Garbled text** — AI video mangles legible, stable on-screen text; this
   format is text-heavy.
4. **The aesthetic IS stillness** — a still + slow zoom has zero drift; a video
   model adds unwanted motion that fights the look.
5. **Editability** — motion graphics = change one label, re-render, rest
   identical; AI gen = slot machine, can't surgically edit.

**Mental model:** AI makes the *ingredients* (face image, voice); a
deterministic renderer *assembles* them (overlay, captions, timing). This is
why Remotion is ideal — AI face + AI voice flow in as inputs, HUD composited on
top with exact control.

**Recommendation:** start manual (CapCut + ElevenLabs + AI faces + hand-built
HUD) to learn the format → ship first video this week. Then build the
**Remotion factory** so `script + face → rendered MP4` automatically, enabling
daily posting at $9.99 margins.

---

## Business model this funnels into

- **Undercut, not differentiate.** Clone the content 1:1; compete on price.
- **Pricing:** $9.99/mo subscription vs. QOVES's high-ticket one-off report.
- **Freemium blur-paywall** (proven LooksMax AI / Umax mechanic): free scan
  reveals ONE genuinely useful, specific insight (e.g. "caffeine cream for your
  under-eyes"); the rest of the plan is **blurred** behind $9.99/mo.
  - Blur the *specifics*, not the *structure* — show "7 more across 4 areas,"
    blur product names + the "how."
  - Quantify locked value: "1 of 8 unlocked."
- **Retention justification:** HaloLabs sells a *plan + roadmap + progress
  tracking*, not a one-off diagnosis — that's what makes a subscription make
  sense (QOVES can't do this).
- **Funnel:** viral short → free instant mini-scan (1 insight) → blurred plan +
  $9.99/mo paywall → monthly re-scan + roadmap check-offs = retention.

### First 5 video concepts (mapped to HaloLabs)
| Hook | Decode | CTA |
|---|---|---|
| "Do you have a *hunter* or *prey* face?" | orbital bone / canthal tilt / midface | free scan |
| "Why do some faces photograph better than IRL?" | bone vs. soft tissue, lens compression | free scan |
| "Which jaw would you rather have?" (A/B) | gonial angle, submental, mewing myth-bust | free scan |
| "The feature that makes a face look 'expensive'" | lower-third ratio, lip-to-chin | free scan |
| "Cute face vs. model face — the difference?" | neoteny vs. maturity markers | free scan |

### Rules that make or break it
- Ship the hook first, every time. Test 3 hook variants per concept.
- One idea per video.
- Always end non-judgmental — keeps you out of the toxic looksmaxxing lane and
  aligns with `docs/STRATEGY.md` (plans not scores, no attractiveness ratings).
- Post same video to TikTok + Reels + Shorts. Series-brand it ("Face Decoder
  Ep. 1").

# Landing before/after image prompts (Gemini Nano Banana)

Files the landing page expects in this folder:

| File | How to generate | Status |
|---|---|---|
| `model-1-before.jpg` | Prompt 1 below, no input image (from scratch) | ✓ done |
| `model-1-after.jpg` | Prompt 2 below, **attach the generated before** | ✓ done |
| `model-2-before.jpg` | Prompt 3 below, no input image (from scratch) | ✓ done |
| `model-2-after.jpg` | Prompt 4 below, **attach the generated before** | ✓ done |

**Workflow:** run Prompt 1 with no image attached and save the result as
`model-1-before.jpg`. Then attach that exact image and run Prompt 2, saving
as `model-1-after.jpg`. The after must be generated FROM the before so the
two stay perfectly aligned under the comparison slider. Both prompts are
fully self-contained — no separate context message needed.

---

## Prompt 1 — model-1-before.jpg (no input image)

> Generate a photorealistic studio portrait photograph, portrait orientation,
> 3:4 aspect ratio. This is the "before" image of a before/after pair for a
> self-improvement app, so it must look like a real, honest, unedited photo
> of a real woman — not a model, not a glamour shot, and also not a mockery.
> She is a completely normal, average-to-quietly-pretty woman on an ordinary
> day, photographed without any preparation.
>
> **Scene and camera:** she stands facing the camera dead-on, head level and
> centered horizontally, eyes looking directly into the lens, framed from
> just below the chest up, with her head in the upper half of the frame and
> a small margin of space above her hair. Plain seamless muted grey-blue
> studio backdrop with no texture, no gradient hotspots, no props, no
> shadows on the wall. Soft, even, diffused frontal studio lighting — a
> large softbox look with minimal shadowing, gentle and unflattering in its
> honesty, like a passport or casting photo. Shot on a full-frame camera
> with a moderate portrait focal length around 85mm, face in sharp focus,
> background softly rendered. Neutral, slightly flat color grading.
>
> **Who she is:** a woman around 26–28 years old, medium-brown hair a few
> inches past her shoulders, hazel-green eyes, medium-fair skin, balanced
> pleasant features — the kind of face you'd describe as "girl next door,
> cute when she makes an effort". She wears a simple mustard-yellow
> crew-neck knit sweater with no logos or jewelry. She must read as at
> least average attractiveness — never ugly, never sickly — just visibly
> not taking care of herself lately.
>
> **The "before" condition — apply every one of these, each clearly present
> but none exaggerated into caricature:**
>
> 1. **Hair:** flat, limp and slightly thin-looking, air-dried with no
>    product and last cut many months ago — dull low-shine strands, a
>    little static frizz at the crown, uneven tired-looking ends, hair
>    hanging close to the head with no volume at the roots, tucked halfway
>    behind one ear without intention.
> 2. **Under-eyes:** clearly visible under-eye bags — mild puffiness with
>    bluish-brown darkness beneath both eyes, the unmistakable look of
>    months of six-hour nights and too much screen time. Present and
>    obvious at a glance, but natural — not bruised, not ill.
> 3. **Facial fullness:** a soft layer of extra facial fat, as if she's
>    perhaps four or five kilograms above her comfortable weight — a
>    rounder lower face, soft cheeks, a subtle double-chin shadow when her
>    chin is level, a jawline that blurs into the neck rather than being
>    defined. Clearly a bit soft, absolutely not obese.
> 4. **Skin coloring:** overall dull, slightly grey-pale complexion of
>    someone who rarely sees sunlight or exercise — noticeable redness
>    around the nostrils and inner cheeks, mild uneven blotchiness on the
>    cheeks and chin, a couple of small barely-there blemishes, slightly
>    oily sheen limited to the forehead and nose in a subtle way, fully
>    realistic pore-level skin texture everywhere.
> 5. **Makeup:** absolutely none. Completely bare face.
> 6. **Eyelashes:** short, straight, sparse-looking natural lashes that do
>    nothing for the eyes.
> 7. **Eyebrows:** natural, unshaped and slightly untidy with a few stray
>    hairs below the brow line and between the brows — not unibrow, just
>    unmaintained.
> 8. **Eyes:** slightly tired-looking — whites a touch dull with the
>    faintest redness, upper eyelids a little heavy, gaze present but
>    low-energy.
> 9. **Lips:** bare, pale, and noticeably dry with slight chapping texture.
> 10. **Posture:** everyday desk-worker slump — shoulders rolled gently
>     forward and up, chest slightly closed, neck carrying a bit of
>     compression so her head sits marginally forward.
> 11. **Expression:** a small, polite, low-energy closed-lip smile — the
>     reserved smile you give a stranger, friendly but tired, clearly more
>     subdued than a genuinely happy smile. Not sad, not sullen.
> 12. **Overall impression:** a nice-looking, healthy, ordinary woman who
>     has been running on empty — tired, a little soft, a little dull,
>     completely relatable. Anyone scrolling past should think "honestly,
>     that's me on a Tuesday".
>
> Do NOT make her ugly, ill, dirty, or unkempt. No acne breakouts, no deep
> wrinkles, no greasy hair, no gauntness, no harsh dramatic shadows. Real
> skin texture with visible pores is mandatory — no smoothing, no beauty
> filter, no AI sheen.

## Prompt 2 — model-1-after.jpg (attach the generated `model-1-before.jpg`)

> Edit this exact photograph. This is the "after" image of a before/after
> pair for a self-improvement app. The two images will be overlaid under a
> draggable comparison slider, so the output must be pixel-comparable to
> the input: identical framing, identical camera angle, identical head
> position and head size, identical lighting direction and background,
> identical mustard-yellow sweater. Most importantly she must remain
> unmistakably, instantly the SAME woman — same bone structure, same eye
> color and eye shape, same nose shape, same lip shape, same hairline, same
> face — never a prettier stranger.
>
> The story of the edit: this is her eight months later, after genuinely
> taking care of herself — consistent sleep, hydration, gym three times a
> week, a proper haircut and hair care, a skincare routine, a lash lift,
> brow shaping, and light natural everyday makeup. Every change below
> should be clearly noticeable when the two photos are compared side by
> side, yet each one must stay inside the bounds of what real self-care and
> real light makeup can achieve. Nothing may look surgical, filtered, or
> retouched. Apply ALL of the following:
>
> 1. **Hair — more of it, and healthier:** visibly fuller, thicker-looking
>    hair with real volume — lifted at the roots, falling in soft, loose,
>    intentional waves with healthy movement and gloss, the frizz and
>    static gone, ends looking freshly trimmed and even, color subtly
>    richer and warmer as if well-conditioned, with fine natural shine
>    catching the studio light. Same length and same medium-brown family —
>    this is eight months of hair care and a good cut, not extensions and
>    not a dye job.
> 2. **Under-eyes — mostly resolved:** reduce the bags and dark circles by
>    about 70–80% — the puffiness gone, the bluish-brown shadow faded to
>    just a faint, natural, healthy hint. Rested, bright, awake. Do not
>    erase to porcelain flatness; a trace of natural shadow must remain.
> 3. **Facial fat loss — the gym shows:** slim the soft extra fullness of
>    her lower face by a clearly visible but natural degree, as if she
>    lost those four or five extra kilograms — the double-chin shadow
>    gone, a clean defined jawline emerging from ear to chin, cheeks
>    tighter with a hint of cheekbone structure, the face overall a touch
>    more sculpted. Her bone structure, face shape family, and identity
>    stay exactly the same — this is fat loss, never surgery.
> 4. **Neck and collarbones:** the neck slightly leaner and longer-looking,
>    a touch of collarbone definition appearing at the sweater's neckline,
>    consistent with the weight loss.
> 5. **Skin coloring — alive again:** replace the grey-pale dullness with a
>    warm, healthy, lightly sun-kissed complexion — the color of someone
>    who walks outside daily: a soft natural warmth across the face, a
>    gentle rosy flush on the cheeks, the redness around the nose and the
>    blotchiness calmed by about 70%, the forehead shine gone to a clean
>    healthy finish. Keep full pore-level realistic skin texture.
> 6. **Skin quality:** the small blemishes healed and gone, skin looking
>    hydrated and quietly luminous — a light-from-within freshness on the
>    high points of the face. Freckles, moles and beauty marks stay
>    exactly where they were.
> 7. **Makeup — light, real, everyday:** she now wears believable natural
>    makeup, applied with skill but restraint: an even, skin-like tinted
>    base that doesn't mask her texture, a soft warm blush on the apples
>    of the cheeks, the faintest bronzer warmth at the temples and under
>    the cheekbones, and a whisper of subtle eye definition — a thin soft
>    smudge along the upper lash line, no visible winged eyeliner, no
>    eyeshadow color, no contour stripes, no glitter.
> 8. **Eyelashes — clearly better:** noticeably longer, darker, lifted and
>    curled lashes with a clean mascara look — defined and eye-opening,
>    fanned naturally with no clumps and no false-lash spikes. This one is
>    allowed to be visible at a glance; it should read as "lash lift plus
>    one coat of good mascara".
> 9. **Eyebrows:** cleanly shaped and groomed — the strays gone, the arch
>    slightly more defined and very slightly fuller, brushed upward and
>    set, keeping her natural brow shape. Polished, not drawn-on,
>    absolutely not Instagram-blocky.
> 10. **Eyes:** whites clear and bright, irises catching a little more
>     light so the hazel-green reads more vivid, upper lids rested and a
>     touch more open, gaze switched on and present. Same eye size, same
>     eye shape — brightness, not enlargement.
> 11. **Lips:** the dryness gone — smooth, hydrated lips with a healthy
>     tinted-balm finish, their natural rose color deepened noticeably but
>     kept inside the "is she wearing anything?" zone. Same lip size and
>     shape, zero plumping.
> 12. **Posture:** the desk slump corrected — shoulders drawn back and
>     down, chest open, neck tall and decompressed, chin level, head
>     stacked over the spine. She holds herself like someone comfortable
>     being looked at.
> 13. **Expression:** the tired polite smile upgraded to a warm, genuine,
>     confident one — lips clearly curved, closed or barely parted, the
>     smile reaching her eyes with a soft crinkle at the outer corners,
>     like she's greeting someone she's happy to see. Radiant but natural —
>     no posed grin, no visible-teeth laugh.
> 14. **Overall grade:** the photo itself may look like the better version
>     of the same setup — the same lighting reading slightly cleaner and
>     more flattering on her now-healthier skin — but the background hue,
>     brightness, and framing must remain identical to the input.
> 15. **Overall impression:** the compound result should make someone who
>     knows her say "you look incredible — what have you been doing?" —
>     rested, lean, glowing, groomed, and lightly made-up. Every single
>     change believable, achievable, and earned; the total transformation
>     striking.
>
> Do NOT: change her bone structure, slim or reshape the nose, enlarge the
> eyes or lips, change eye color or hair color family or hair length,
> square or sharpen the jaw beyond what the fat loss gives, whiten eyes or
> skin unnaturally, apply heavy glamour makeup, smooth skin into plastic,
> remove her freckles or beauty marks, brighten or shift the background,
> or move, scale, or rotate her within the frame. The output must overlay
> cleanly on the input with only her improvements differing.

---

## Prompt 3 — model-2-before.jpg (no input image)

> Generate a photorealistic studio portrait photograph, portrait orientation,
> 3:4 aspect ratio. This is the "before" image of a before/after pair for a
> self-improvement app, so it must look like a real, honest, unedited photo
> of a real man — not a model, not a glamour shot, and also not a mockery.
> He is a completely normal, average guy on an ordinary day, photographed
> without any preparation.
>
> **Scene and camera:** he stands facing the camera dead-on, head level and
> centered horizontally, eyes looking directly into the lens, framed from
> mid-chest up, with his head in the upper half of the frame and a small
> margin of space above his hair. Plain seamless muted grey-blue studio
> backdrop with no texture, no gradient hotspots, no props, no shadows on
> the wall — the exact same backdrop tone as a matching woman's portrait in
> the series. Soft, even, diffused frontal studio lighting — a large
> softbox look with minimal shadowing, gentle and unflattering in its
> honesty, like a passport or casting photo. Shot on a full-frame camera
> with a moderate portrait focal length around 85mm, face in sharp focus,
> background softly rendered. Neutral, slightly flat color grading.
>
> **Who he is:** a man around 28–32 years old with genuinely good underlying
> looks — clear symmetrical features, a strong natural bone structure, kind
> brown eyes, short-to-medium dark brown hair, medium-fair skin. He's the
> guy friends describe as "actually really handsome when he cleans up",
> currently hidden under a layer of neglect. He wears a simple plain
> heather-navy crew-neck t-shirt with no logos or jewelry. Even at his most
> unkempt in this photo he must still read as comfortably average-to-good
> looking — if in doubt, err toward more handsome, not less. The neglect
> lives in the grooming and lifestyle details below, NEVER in his facial
> attractiveness.
>
> **The "before" condition — apply every one of these, each clearly present
> but none exaggerated into caricature:**
>
> 1. **Hair:** clearly overdue for a haircut — flat and shapeless on top
>    with no product, grown out and slightly curling over the ears and at
>    the neck, the sides puffy and undefined, dull low-shine strands with
>    a little bedhead unevenness at the crown, hairline exactly natural.
> 2. **Facial hair:** four or five days of even, ordinary stubble that he
>    simply hasn't dealt with — uniform in coverage (no patchiness), just
>    soft undefined edges and a neckline that hasn't been cleaned up.
>    "Forgot to shave this week", not "growing a beard" — and never wild
>    or scraggly.
> 3. **Under-eyes:** visible but moderate under-eye tiredness — slight
>    puffiness with soft bluish-brown shading beneath both eyes, the look
>    of a stretch of six-hour nights. Noticeable when you look, natural
>    always — not bruised, not dark hollows, not ill.
> 4. **Facial fullness:** a soft layer of extra facial fat, as if he's
>    three or four kilograms above his comfortable weight — slightly
>    fuller cheeks and a soft, less-defined jawline with just a hint of
>    fullness under the chin. Noticeably softer than his fit self, but
>    his good bone structure must still be visible underneath.
> 5. **Skin coloring:** a slightly dull, pale indoor complexion — mild
>    redness around the nostrils, a touch of unevenness on the cheeks,
>    fully realistic pore-level skin texture everywhere. Skin that looks
>    tired, not troubled: no blemishes, no blotchy patches, no oily shine.
> 6. **Eyebrows:** natural and untidy — a few stray hairs between the
>    brows and at the outer edges, unmaintained but not a unibrow.
> 7. **Eyes:** slightly tired-looking — whites a touch dull with the
>    faintest redness, upper eyelids a little heavy, gaze present but
>    low-energy.
> 8. **Lips:** natural, slightly pale and dry.
> 9. **Posture:** everyday desk-worker slump — shoulders rolled gently
>    forward and up, chest slightly closed and caved, neck carrying a bit
>    of compression so his head sits marginally forward of his body.
> 10. **Expression:** a small, polite, low-energy closed-lip smile — the
>     reserved smile you give a coworker in a hallway, friendly but tired,
>     clearly more subdued than a genuinely confident smile. Not sad, not
>     sullen, not tough-guy.
> 11. **Overall impression:** a genuinely good-looking guy buried under an
>     unremarkable Tuesday — tired, a little soft, a little scruffy, and
>     completely relatable, with the handsome bone structure still readable
>     underneath. Viewers should think "that's me on a rough week", and
>     women viewers should still find him mildly attractive even here.
>
> Do NOT make him ugly, ill, dirty, or unkempt. No acne breakouts, no deep
> wrinkles, no greasy matted hair, no gauntness, no receding hairline
> added, no harsh dramatic shadows. Real skin texture with visible pores
> is mandatory — no smoothing, no beauty filter, no AI sheen.

## Prompt 4 — model-2-after.jpg (attach the generated `model-2-before.jpg`)

> Edit this exact photograph. This is the "after" image of a before/after
> pair for a self-improvement app. The two images will be overlaid under a
> draggable comparison slider, so the output must be pixel-comparable to
> the input: identical framing, identical camera angle, identical head
> position and head size, identical lighting direction and background,
> identical heather-navy t-shirt. Most importantly he must remain
> unmistakably, instantly the SAME man — same bone structure, same eye
> color and eye shape, same nose shape, same lip shape, same natural
> hairline, same face — never a better-looking stranger.
>
> The story of the edit: this is him eight months later, after genuinely
> taking care of himself — consistent sleep, hydration, gym three times a
> week, a proper haircut he maintains, a groomed beard routine, a simple
> skincare routine, and time outside. Every change below should be clearly
> noticeable when the two photos are compared side by side, yet each one
> must stay inside the bounds of what real self-care and real grooming can
> achieve. Nothing may look surgical, filtered, or retouched. No makeup.
> Apply ALL of the following:
>
> 1. **Hair — a proper cut, styled:** a fresh, well-executed haircut —
>    cleanly tapered at the sides and over the ears, tidy at the neck,
>    meaningful shape and length kept on top and styled with a light matte
>    product: lifted, textured, and intentional. The hair looks thicker
>    and healthier, with the flat bedhead dullness replaced by clean
>    definition. Same natural hairline, same dark brown color — this is a
>    great barber, not a transplant and not dye.
> 2. **Beard — from neglected to groomed:** the unattended stubble resolved
>    into a deliberately maintained short beard: trimmed to one consistent
>    short length, a cleanly defined neckline just above the Adam's apple,
>    crisp but natural cheek lines, the mustache tidied at the lip. Sharp
>    enough to look intentional, soft enough to look real — barbered, not
>    stenciled-on.
> 3. **Under-eyes — mostly resolved:** reduce the bags and dark circles by
>    about 70–80% — the puffiness gone, the bluish-brown shadow faded to
>    a faint, natural, healthy hint. Rested, bright, awake. Do not erase
>    to porcelain flatness; a trace of natural shadow must remain.
> 4. **Facial fat loss — the gym shows:** slim the soft extra fullness of
>    his lower face by a clearly visible but natural degree, as if he
>    lost those five extra kilograms — the double-chin shadow gone, a
>    clean masculine jawline emerging from ear to chin, the cheeks
>    tighter with a hint of structure, the face overall firmer and more
>    sculpted. His bone structure, face shape family, and identity stay
>    exactly the same — this is fat loss, never surgery, and the jaw must
>    not be squared beyond what the fat loss reveals.
> 5. **Neck:** the neck slightly leaner and firmer with a visible
>    jaw-to-neck angle and a hint of definition at the collar, consistent
>    with the weight loss.
> 6. **Skin coloring — alive again:** replace the grey-pale indoor
>    dullness with a warm, healthy, lightly sun-exposed complexion — the
>    color of someone who runs outside twice a week: natural warmth
>    across the face, the redness around the nose and cheeks calmed by
>    about 70%, the forehead and nose shine gone to a clean matte-healthy
>    finish. Keep full pore-level realistic skin texture.
> 7. **Skin quality:** the small blemishes healed and gone, skin looking
>    hydrated, fresh and rested — quietly healthy rather than glowing.
>    Moles and natural marks stay exactly where they were.
> 8. **Eyebrows:** the stray hairs between and around the brows tidied,
>    same shape and thickness — maintained, with zero visible grooming
>    effort.
> 9. **Eyes:** whites clear and bright, irises catching a little more
>    light so the brown reads warmer and more alive, upper lids rested
>    and a touch more open, gaze switched on, direct and self-assured.
>    Same eye size, same eye shape — brightness, not enlargement.
> 10. **Lips:** the dryness gone — natural, healthy, hydrated lips with
>     normal color. Same lip size and shape.
> 11. **Posture:** the desk slump corrected — shoulders drawn back and
>     down, chest open and slightly broader-reading for it, neck tall and
>     decompressed, chin level, head stacked over the spine. He takes up
>     his space calmly, like someone comfortable being looked at.
> 12. **Expression:** the tired polite smile upgraded to a warm, easy,
>     confident one — lips clearly curved, closed or barely parted, the
>     smile reaching his eyes with a soft crinkle at the outer corners,
>     like he's greeting a friend he's glad to see. Assured but likable —
>     no posed grin, no smirk, no visible-teeth laugh.
> 13. **Overall grade:** the photo itself may read like the better version
>     of the same setup — the same lighting sitting slightly cleaner on
>     his now-healthier skin — but the background hue, brightness, and
>     framing must remain identical to the input.
> 14. **Overall impression:** the compound result should make someone who
>     knows him say "man, you look great — what changed?" — rested, lean,
>     fresh-cut, well-groomed, and carrying himself well. Every single
>     change believable, achievable, and earned; the total transformation
>     striking.
>
> Do NOT: change his bone structure, hairline, or eye color; slim or
> reshape the nose; enlarge the eyes; square or chisel the jaw beyond what
> the fat loss gives; whiten eyes, teeth, or skin unnaturally; add makeup
> or any cosmetic look; smooth skin into plastic; remove moles or natural
> marks; noticeably lengthen or recolor the hair or beard; brighten or
> shift the background; or move, scale, or rotate him within the frame.
> The output must overlay cleanly on the input with only his improvements
> differing.

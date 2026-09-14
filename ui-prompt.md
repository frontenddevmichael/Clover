# UI Prompt — Clover Design System & Craft Standard

This is the complete design brief. Apply it to every screen and component from the moment it's built — not as a later polish pass. Read this alongside `prd.md` before writing any UI code.

---

## 1. Visual Philosophy

Two forces, held in deliberate tension:
- **Notion-style restraint** — black, white, grey. Structure and whitespace do almost all the work.
- **Human warmth** — hand-drawn accents and soft, Apple-like materials keep it from feeling clinical or generic.

If a screen feels cold, add a hand-drawn accent, not a color. If a screen feels busy, remove a color, not the accent.

## 2. Color

**Neutral scale (the base of everything):**
- `neutral-950` #0B0B0C — primary text / dark surfaces
- `neutral-800` #1C1C1E — secondary dark surface
- `neutral-500` #8E8E93 — secondary text, disabled states
- `neutral-200` #E5E5EA — borders, dividers
- `neutral-50` #F7F7F8 — light surface background
- `white` / `black` — pure extremes, used sparingly for contrast moments only

**Accent — reserved for meaning, never decoration:**
- Workload states (muted, never neon): Light `#8FBF9F`, Balanced `#8FB3D9`, Heavy `#E0B673`, Overloaded `#D98080`
- Course tags: a curated set of 6–8 desaturated pastels, same muted family

If you're reaching for color and it isn't a workload state or a course tag, it should be black, white, or grey instead.

## 3. Typography

- Primary typeface: **Inter** — clean, geometric, closest free equivalent to SF Pro
- 600/700 for headers and emphasis, 400/500 for body — nothing lighter, it reads as fragile against hand-drawn accents
- Tabular figures for dates/times/countdowns in list and grid views
- Scale: 28/22/17/15/13 (display/title/body/secondary/caption) — no in-between sizes

## 4. Shape & Spacing

- Corner radius scale: **12px** (chips, small buttons) / **20px** (cards) / **28px** (sheets, modals) — always from this scale, never ad hoc
- Base spacing unit: 4px, composed in multiples of 4 — generous whitespace over dense packing, always
- No hard edges anywhere

## 5. Elevation — Liquid Glass (deliberate, not everywhere)

Translucency + blur + a subtle top-edge highlight + soft shadow, applied **only** to: tab bar, modal sheets, the AI plan-proposal card, notification/reminder banners. Flat white/black everywhere else — the base timetable grid, list screens, settings. Every glass surface in the app should imply one consistent light source. Overusing glass is the fastest way to break the calm base.

## 6. Iconography & Illustration

- Hand-drawn, single-weight line illustration — like a fast felt-tip sketch, not vector clip-art. No gradients, no 3D, no flat-color fills.
- Used at: empty states, onboarding, small accent marks (an underline under a header, a checkmark on a completed deadline)
- Not used inside dense functional UI (buttons, form fields, list rows) — those use simple geometric line icons, so hand-drawn moments stay special
- Monochrome only — black stroke on light surfaces, white stroke on dark

## 7. Core Components

- **Cards:** 20px radius, 1px neutral-200 border on light surfaces, generous padding, workload/course color as a small tag or left-edge accent — never a full-card fill
- **Buttons:** primary = solid neutral-950 fill / white text, 12px radius; secondary = outline only
- **Tab bar:** glass surface, icons + label, active state marked by weight change not color
- **Sheets/modals:** glass surface, 28px top radius, drag handle
- **Workload indicator:** a pill using the muted accent colors — always paired with a text label, never color alone

## 8. Motion

- ~200–250ms soft ease — nothing snappy or bouncy
- Sheets arrive with glass material already visible, not fading in after
- No spring overshoot on core navigation — save personality for illustration, not motion

## 9. Accessibility (binding)

- Minimum contrast 4.5:1 — test neutral-500 against neutral-50 carefully, it's the likeliest failure point in a monochrome palette
- Workload/course color always paired with a text label or icon
- Minimum tap target 44x44pt

## 10. Visual-First Communication

Icons and visual cues are preferred over text throughout this app. Wherever a label, instruction, or block of text could instead be a clear icon, visual status indicator, or hand-drawn accent without losing clarity — make it one. Flag anything leaning on paragraphs or long labels where a visual could carry the same meaning faster.

---

## 11. The Craft & Distinctiveness Bar

Spec-compliance alone produces generic, forgettable output. Meeting every rule above gets a screen to "correct" — it does not get it to "genuinely impressive." Close that gap deliberately, on every screen, using this checklist:

1. **Spacing** — everything on the 4px scale, no eyeballed gaps
2. **Alignment** — optical centering used where mathematical centering looks wrong (icons against text, baselines against buttons)
3. **Light/depth consistency** — do all shadows and glass highlights imply one consistent light source across the whole app?
4. **Motion intent** — does every transition have a specific reason to move the way it does?
5. **Edge states** — are loading, empty, and error states as considered as the happy path?
6. **Micro-copy** — does every piece of text sound like a person wrote it for this exact moment, not placeholder copy?
7. **Token discipline** — does every radius/spacing/type value reuse an existing token above, or has a one-off value snuck in?
8. **AI-slop check** — could this screen be swapped into any other generic productivity app unnoticed? Watch for: identical centered icon-over-title-over-caption cards repeated everywhere, boilerplate copy ("Welcome!", "Get Started"), safe symmetric layouts with no point of view, a generic UI-kit icon set. If yes, it hasn't cleared this bar.
9. **Distinctiveness** — does at least one deliberate, specific-to-Clover detail exist on this screen that a generic template wouldn't produce? An asymmetric layout that aids hierarchy, a transition that reinforces what's happening, a hand-drawn accent placed with intent, copy with real personality. Reference bar: would this stand next to Linear, Things 3, Apple's first-party apps (Weather, Fitness), or Arc browser without looking unfinished by comparison?

**Reference point for "reasonably built" vs "genuinely impressive":** every functional screen should first satisfy §1–10 completely, then pass all nine checklist items in §11 before being considered done. A screen that's spec-compliant but generic, or distinctive but sloppy, has not cleared this bar — both halves are required together, not traded off against each other.

## 12. Shared Components

A component used on multiple screens (a card, a button, a chip) should be fixed or elevated once, at the component level — never iterated differently screen-by-screen. Drift between screens on the same component is itself a bug, even if each instance individually looks fine.

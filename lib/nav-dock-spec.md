# Clover — Navigation Dock Specification

## Structure

- **4 tab destinations:** Home, Deadlines, Course Rooms, Assistant
- **1 elevated center action button** — not a tab. Sits visually one tier above the row of tab icons (Dynamic-Island-style prominence). Its icon and function morph based on the current screen.
- **Settings/profile** moves out of the dock entirely, into a small avatar/icon in the top-right of the screen header, present consistently across all screens. This keeps the dock itself uncluttered enough for the morph and sketch-indicator to actually read clearly.

Tab order: **Home — Deadlines — [center morph action] — Course Rooms — Assistant**

---

## Behavior 1 — Ambient Workload Tint

A thin highlight along the dock's top edge, always present, pulled from the existing muted workload palette (light/balanced/heavy/overloaded).

- **Light/balanced days:** recedes to near-neutral — barely perceptible
- **Heavy/overloaded days:** a slow breathing pulse, 4–6 second cycle, gentle opacity oscillation — never a hard blink or attention-grabbing flash
- This is the **only idle/looping animation** anywhere in the dock — everything else is event-triggered, not ambient
- **Reduce motion:** static tint at fixed medium opacity, no pulse
- Never the sole indicator of workload state — the existing text-labeled workload pill elsewhere on screen remains the primary source; this is a peripheral reinforcement only

## Behavior 2 — Hand-Sketched Active Indicator

Replaces a standard active-tab dot or fill-color change.

- On tab switch: a short hand-drawn stroke sketches in beneath the newly active icon (organic, slightly uneven pace, ~250–400ms), while the previous tab's underline un-sketches/fades out
- Fully static at rest — no idle motion once drawn
- **Reduce motion:** instant appear/disappear at the same end state, no draw-in animation
- This is a deliberate, scoped exception to the rule that hand-drawn treatment stays out of dense functional UI — justified because it's the single highest-frequency interaction surface in the app

## Behavior 3 — Morphing Center Action

Elevated glass circular button, center of the dock.

- **Home** → "+" icon → opens Add Session sheet
- **Deadlines** → deadline-flag icon → opens Add Deadline sheet
- **Course Rooms** → share/overlap icon → opens sharing-toggle sheet
- **Assistant** → refresh/ask icon → triggers a new plan proposal
- Transition: icon reshapes via a shape morph (not a hard cut) on screen change, using the same 200–250ms soft ease as the rest of the app's motion
- **Reduce motion:** instant icon swap, no morph tween

---

## Token Consistency (nothing here introduces new tokens)

- Dock surface: existing Liquid Glass rules — translucency, blur, single consistent light source, soft top-edge highlight
- Radius: dock uses the largest existing radius token (28px), as a floating pill
- Tap targets: all icons minimum 44×44pt (Fitts's Law, accessibility)
- Color: only the existing muted workload palette and neutral scale — no new colors introduced anywhere in this spec

## Accessibility

- All three animated behaviors have a defined reduce-motion fallback (above) — none are purely decorative-only-when-animated
- Workload tint is always paired with an existing text-labeled indicator elsewhere — color is never the sole carrier of meaning
- The center action's current function must have a proper accessibility label per screen for screen readers (e.g. "Add session" on Home, "Add deadline" on Deadlines) — not just an icon with no announced purpose

## Design Principle Underlying All Three

At rest, the dock is almost entirely calm — a faint ambient tint and nothing else moving. Motion only occurs at the exact moment you're already interacting with it (switching tabs, changing screens) — never as idle animation competing for attention. This keeps three simultaneous concepts from reading as busy: only one thing is ever actually moving at a time, and only in response to something you just did.

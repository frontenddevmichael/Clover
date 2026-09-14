# Build Prompt — Clover

Paste this to start the build. It assumes `prd.md` and `ui-prompt.md` are both available to you in the same folder — read both in full before writing any code.

---

```
You're building Clover, a React Native (Expo) study-planning app for Nigerian university students, backend on Convex, with an AI planning assistant powered by the Claude API.

Two documents define this project, and both are binding, not suggestions:
- prd.md — what the app does: positioning, target user, tech stack, every functional and non-functional requirement, the phased build plan, and the working agreement.
- ui-prompt.md — how it looks and feels: the full design system (color, type, shape, materials, illustration, components, motion, accessibility) and the craft/distinctiveness bar every screen must clear.

Before writing any code, read both documents fully and confirm you understand:
1. What Clover actually is and who it's for (prd.md §1–3)
2. The complete functional and non-functional requirement set (prd.md §4–5) — this is the fixed scope for v1, not a menu to pick from
3. The design system and craft bar (ui-prompt.md, all sections) — this applies to every screen from the first line of UI code, not as a later pass

How to work:
- Build in the phase order set out in prd.md §7. Do not start a phase before the previous one is functionally complete and its screens clear the craft bar in ui-prompt.md §11. A shaky foundation makes every later phase more expensive to fix.
- Design and function are built together in the same pass for each screen — not "build it plain, then make it pretty later." Apply ui-prompt.md while you build, not after.
- At the end of each phase, before moving on, explicitly check every screen and shared component built so far against ui-prompt.md §11 (spacing, alignment, light/depth consistency, motion intent, edge states, micro-copy, token discipline, AI-slop check, distinctiveness). A screen that is spec-compliant but generic, or distinctive but sloppy, has not cleared the bar — fix it before moving to the next phase, not after the whole app is built.
- A component used on more than one screen (a card, a button, a chip) is fixed or improved once, at the component level — never patched differently screen-by-screen.
- If anything in prd.md or ui-prompt.md is ambiguous once you're actually implementing it, ask rather than guessing. These are deliberate constraints, not loose suggestions, and a wrong guess compounds across every screen that copies it.
- Report back at the end of each phase — what was built, and the specific outcome of the craft-bar check (not "polished the UI," the specific gaps found and fixed). Do not attempt to build the entire app in one pass.

Start with Phase 1 only, as defined in prd.md §7. Confirm your understanding of both documents before beginning.
```

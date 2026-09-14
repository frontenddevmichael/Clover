# Clover — Product Requirements & Build Plan

*(Formerly the working name "Cove" — renamed to Clover before release: app display name, bundle IDs (`com.clover.studyplanner`), and package name all say Clover; the design-system docs below keep historical "Cove" references where they describe tokens, not the brand.)*

## 1. Positioning

The planner built for how Nigerian university students actually study — light on data, built around real semester disruption, and social by design because studying alone was never how it worked here. Not a generic AI-scheduling app; the edge is local relevance, not feature parity with global tools.

## 2. Target User

University undergraduates managing multiple courses, lecture/lab timetables, CA and exam deadlines, on limited or metered mobile data, whose semester calendar isn't guaranteed stable (strikes, postponed exams, shifted resumption dates), and who already coordinate study time informally over chat apps.

## 3. Tech Stack

- React Native (Expo) — iOS and Android from one codebase
- Convex — backend, schema, auth pairing, reactive queries, offline sync
- Claude API — the AI planning assistant (Phase 3 only, isolated from core logic)

---

## 4. Functional Requirements

### 4.1 Accounts & Identity
- FR1: Sign up / log in (email or phone-based)
- FR2: Profile includes institution, department/faculty, and level
- FR3: User can edit or delete their account and all associated data

### 4.2 Core Planner
- FR4: Create courses with course code, title, and color
- FR5: Create recurring weekly sessions (lecture, lab, tutorial, personal study, revision) tied to a course, with day/time and recurrence pattern
- FR6: Create one-off sessions outside the recurring pattern
- FR7: Edit or delete any session or course
- FR8: Overlapping sessions are flagged as a warning, never blocked
- FR9: Week timetable view and single-day detail view

### 4.3 Deadlines & Academic Load
- FR10: Create deadlines (assignment, CA, exam) tied to a course, with due date/time and type
- FR11: Deadlines appear on the relevant day in the timetable and in a dedicated upcoming-deadlines list
- FR12: Workload indicator (light/balanced/heavy/overloaded) per day and per week, based on scheduled time and deadline density
- FR13: Mark a deadline complete

### 4.4 Semester & Disruption Handling
- FR14: Define a semester with start/end dates and marked exam periods
- FR15: Pause, shift, or bulk-reschedule recurring sessions when the calendar changes, without recreating each one manually
- FR16: Sessions/deadlines inside a marked exam period are visually distinguished

### 4.5 AI Planning Assistant
- FR17: Request an AI-generated weekly plan from courses, deadlines, and stated constraints
- FR18: Request a re-proposal for the affected part of the plan when something changes — assistant proposes, never auto-commits
- FR19: Assistant briefly explains why it proposed a change
- FR20: Scoped to plan proposals only — no open-ended chat interface in v1

### 4.6 Social / Community Layer
- FR21: Join a "course room" per enrolled course (course code + institution)
- FR22: Opt in to share free-time overlap with course-mates — anonymized, no full timetable exposure by default
- FR23: Course room shows aggregate free-time overlap and shared upcoming deadlines
- FR24: Opt out any time; sharing is off by default

### 4.7 Notifications & Reminders
- FR25: Reminder ahead of a session start (configurable lead time)
- FR26: Reminder ahead of a deadline, with an automatic reminder inside the final 24–48 hours
- FR27: User-configurable quiet-hours window

### 4.8 Offline Behavior
- FR28: View and edit timetable, deadlines, and courses while offline
- FR29: Offline changes sync automatically on reconnect; conflicts resolved last-write-wins at the field level

---

## 5. Non-Functional Requirements

- NFR1: Fully usable on low-bandwidth or intermittent connections
- NFR2: Minimize download size and session data usage — no unnecessary polling or auto-loaded media
- NFR3: Cold start under 2 seconds on a mid-range Android device
- NFR4: Core planner functions work with no active connection
- NFR5: Local write queue reconciles with Convex on reconnect, no data loss
- NFR6: Social/overlap data opt-in and anonymized by default — no full timetable ever visible without explicit, granular consent
- NFR7: Auth tokens and personal data stored per platform security best practice
- NFR8: Full account and data deletion on request
- NFR9: AI plan-generation calls rate-limited per user per day
- NFR10: AI proposals cached/reused where inputs haven't materially changed
- NFR11: A failed sync is visible and retryable — never silently drops data
- NFR12: Contrast and tap-target sizes meet platform accessibility guidelines — deliberate attention needed given the monochrome palette
- NFR13: Full screen-reader support (VoiceOver/TalkBack)
- NFR14: Codebase structured in clear module boundaries (planner, deadlines, social, AI-assistant, notifications) for iterative, agent-driven development
- NFR15: End-to-end typed — Convex functions and RN components, no implicit `any`
- NFR16: Single Expo codebase for iOS and Android — no platform-specific fork of core logic

---

## 6. Design Direction (summary — full system in `ui-prompt.md`)

Monochrome, Notion-style base with Apple-caliber structural polish: soft consistent corners, real typographic rhythm, Liquid Glass reserved for genuinely layered surfaces, hand-drawn line illustration for warmth at empty states and key moments, color used only to carry meaning (workload states, course tags). Icons and visual cues are preferred over text wherever clarity allows. Full detail, rules, and the quality bar are in the companion `ui-prompt.md` — read both before building anything.

---

## 7. Build Plan

**Phase 1 — Foundation:** Convex schema (users, courses, sessions, deadlines), auth, core planner CRUD (FR4–9), offline write queue + sync (FR28–29).

**Phase 2 — Academic intelligence:** semester/exam-period model (FR14–16), workload calculation (FR12), deadlines (FR10–11, FR13), notifications (FR25–27).

**Phase 3 — AI planning assistant:** plan generation and re-proposal (FR17–20) as an isolated Convex action calling the Claude API.

**Phase 4 — Social layer:** course rooms, opt-in overlap sharing (FR21–24).

**Phase 5 — Launch polish:** full design-system and craft pass per `ui-prompt.md`, seed on one campus, iterate on real feedback.

**Do not start a phase before the previous one is functionally complete and has passed the quality bar in `ui-prompt.md`.** Building ahead of a shaky foundation is what makes later phases expensive to unwind.

---

## 8. Working Agreement

- Requirements above are fixed for the full product. Phases sequence *implementation*, not scope — nothing here is a "maybe later," everything listed is in-scope for v1.
- Apply `ui-prompt.md` to every screen as it's built, from the first line of code — not as a retrofit after functionality is done. Design and function are built together, in the same pass, not sequential passes that risk contradicting each other.
- If a requirement here is ambiguous once you're actually implementing it, ask rather than guessing — these are deliberate constraints.
- Report back at the end of each phase, not at the end of the whole build. Scoped, checkable chunks — never a single one-shot generation of the entire app.

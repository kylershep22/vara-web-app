# Vara — Today / IA Restructure Roadmap
**Version 2.0 | August 11, 2026 | Working document, source of truth for the IA rebuild**

Supersedes v1.0. Sits alongside `Vara_Refactor_Plan.md`. Where the two conflict on IA, tabs, the
Today surface, or the capacity model, **this document wins**. Everything the refactor plan says
about tokens, voice, and guardrails still holds.

Status: **[Done]** merged to main · **[Next]** the active build · **[Queued]** specced, not started ·
**[Content-gated]** blocked on Jen · **[Parked]** out of this build.

---

## 1. Where the build stands (as of Aug 11, 2026)

The **daily loop is real and on main.** The entire spine + core interaction is built, walked, and merged:
capacity moves daily, the protocol responds to it, and the daily pick is a calm front door. Main is at the
3b-ii-b merge, tsc 158, all suites green.

**Done and merged, in order:**
- **Step 1** — WeeklyToday→Home collapse (Home is the only Today).
- **Step 2** — four-tab IA skeleton (Today / Practices / Learn / Community); Practices & Learn shells.
- **Step 3a-i** — weekly boundary parameterized: user-chosen start day, real stub weeks, stored `weekEnd`,
  expiry-only routing.
- **Step 3a-ii** — weekly-setup UI: start-day picker, end-date display, Model-2 closed card.
- **Notification reorder** — permission dialog fires before Firestore writes (first-run hang fixed).
- **Step 3b-i** — capacity moved from weekly lock to daily read; weekly re-set control retired.
- **Step 3b-ii-a** — time-aware variant-set matrix (`Record<Outcome,Record<Capacity,Protocol[]>>`).
- **Step 3b-ii-b** — the daily protocol picker: pre-pick hero, capacity+time modal, fast path,
  skip = calm no-write, day-rollover fix.

**The daily loop as it works today:** each day the Today hero is a calm "set today's capacity" invitation
(Option A). Tapping it opens a modal (capacity = readiness: Normal/Limited/Slammed · time: ≤5/10-15/15+),
pre-filled with yesterday's pick, one-tap confirm. Capacity drives the served protocol. Skip returns to the
unpicked invitation with no guess written. Next day resets to pre-pick.

**Known honest limitations (by design, not bugs):**
- **Time is inert.** The protocol grid is a diagonal (12 of 36 triples authored), so the time question is
  collected and stored but doesn't yet change the served protocol. Lights up when Jen authors the off-diagonal.
- **Protocols are "mark done," not launched.** The daily card shows the protocol + a "Mark today done" button;
  it does not yet launch a dedicated action screen. That's the **Daily Action Launcher** (§4), sequenced after
  Step 4.

---

## 2. Locked design decisions (the daily loop)

| Decision | Call |
|---|---|
| Capacity model | **Replacement** — daily read supersedes the weekly lock. Weekly capacity **demoted** to a day-1 seed (`capacityInitial`); outcome stays weekly. |
| Capacity meaning | **Mental/emotional readiness** (how much demand you can bring), orthogonal to time (duration). Slammed = gentler/restorative, not merely shorter. |
| Fast path | **Option A** — ask daily, pre-fill yesterday's pick, one-tap confirm. Not silent carry-forward. |
| Time question | Content model **Option 2** — ordered variant set per cell; time filters within it; same set 3b-iii rotates. Inert until off-diagonal authored. |
| Content grid | `protocolId` stays cell-level `${outcome}-${capacity}` (no migration); variants keyed separately. 12 diagonal cells authored, 24 off-diagonal = Jen. |
| Pre-pick hero | **Option A** — whole hero is the "set today's capacity" invitation; rest of card stays live. Calm, no guilt/scold. |
| Skip | Valid "not now" — returns to unpicked invitation, **no guess written**, re-engageable all day. |

---

## 3. Remaining build sequence

**Step 4 — Practices hub + pillar pages. [Next]**
Re-house the mostly-built Focus/Energy, the routine builder, and the down-regulation set (Stress Recovery card).
Add a video-explainer container per page. **Restores Focus reachability** (Focus hub + FocusRhythms have been dark
since Step 2). Larger sub-slices: the time-tracking timer + data view (net-new, framed as capacity-creation).
Order within Practices: Focus & Time, Energy, Routines & Systems, Stress Recovery.
*This is the dependency gate for the Daily Action Launcher (§4) — the runnable catalog lives here.*

**Step 5 — Learn page. [Queued]**
Re-house podcasts; masterclass + reading as containers populated as content arrives.

**Step 6 — Nav polish + coach-in-nav. [Queued]**
Gated on fixing the coach 500 first.

---

## 4. Daily Action Launcher [Queued — sequenced AFTER Step 4]

**Why after Step 4:** the runnable practice catalog lives in Practices. The launcher wires the daily card into
that catalog, so Practices must land and stabilize first. Also has a Jen/content dependency (behavioral-screen
copy + the protocol grid).

**The model:** every daily protocol — practice-shaped and behavioral — launches a dedicated action screen with
**"Do it now"** and **"Remind me later."** Completing the action auto-marks the day done. Remind-me-later opens a
time picker for *later today* and moves the card into a **scheduled** state.

**Three pieces (likely three slices, own Step-0):**

1. **Behavioral-protocol screen [net-new UI].** Practice-shaped protocols already have runnable catalog screens;
   behavioral ones ("single-task block," "morning light") don't. Build a screen that shows: the protocol itself,
   the education (why it works), a **Mark done** button, and **Remind me later**. (Kept deliberately simple for
   now — no timer, just protocol + why + done + remind.)

2. **Scheduling / "remind me later" [net-new data + notification].** Time picker for *later today*; the daily log
   gains a scheduled-time; the card shows a **third state** (scheduled — visibly not-done but "scheduled for 3pm").
   Reminder is a **one-off local notification for today only** (not recurring, not tied to the habit-reminder
   system). Reuses the notification infra from the reorder slice; the logged offline-resilience concerns apply.

3. **Auto-mark-done on completion [wiring].** Completing the launched action marks the day done, unifying the two
   completion paths (the "Mark done" button and a completed launched action). **Locked fork:** the catalog player
   stays **ignorant** of daily protocols — the daily card **observes** "was my supporting practice run today?"
   (a read/derivation the card owns) rather than the player writing daily-done. Preserves the engine separation.
   Bridge is the existing `WeeklyProtocol.supportingPracticeIds: string[]` (currently `[]` on all protocols).

**Affordances per protocol:** Do it now · Remind me later. Practice-shaped → "Do it now" launches the catalog
player; behavioral → "Do it now" opens the new behavioral screen.

---

## 5. Content-gated & logged items (not blocking the build)

- **Jen's 24-cell off-diagonal grid [Content-gated].** The readiness axis (same length, more/less demanding) +
  `routines × 15+` (genuine gap) + the `slammed × long` judgment call (gentle but 20 min available). Unblocks the
  time question and 3b-iii.
- **3b-iii — "see other options" rotation [Content-gated].** Needs ≥2 variants per cell; blocked on the off-diagonal.
- **Option-3 duration display [Content-gated].** Time adjusts *displayed duration* for spannable protocols
  (walk-outside at 10 vs 20). Rides with Jen's content; needs a spannable-vs-fixed signal on protocols.
- **`weeklyEngine` / `WeeklyProtocol` rename pass [Queued].** The names are stale (this is daily content, not
  weekly). Mechanical rename, post-3b, before it confuses the next reader.
- **Offline-resilience slice [Queued].** From the notification work: un-timed-out Firestore awaits, a swallowed
  `getDoc` error, throwing-getDoc silent failure in the reminder-persistence path. Distinct from features.
- **Start-day edit surface [Queued].** First-capture is built; editing an already-set start day is structurally
  free (re-write the preference, takes effect next week) but not yet surfaced.
- **Coach 500 fix [Queued].** Gates coach-in-nav (Step 6).

---

## 6. Brand tripwires (unchanged, still holding)

- **Insights** (later in the arc) is the highest-risk surface: descriptive not scored, mirror not verdict, offer
  not judge. No visible zeros (three-state rule).
- **Time-tracking timer** rides the capacity-creation through-line only: "see where the time went so you can get
  it back," never "trim a minute off a task."
- **Stress Recovery** is a feature-set label, not a return to stress-recovery-as-category.
- Standing guardrails: no streaks/guilt/optimizer language; coral errors-only; no em dashes in UI copy; Reduce
  Motion respected; outcomes as felt reflection. The pre-pick hero's calm-invitation tone is this posture applied.
- **Documentation reconciliation** (positioning docs still describe five tabs / weekly capacity / retired
  "stress recovery" as category): true up once the Today rebuild is fully walked, not before.

---

## 7. Working notes

- **Habit removal** (roadmap Step 3 originally) — habits/tracker to be removed, value moves to Insights. Test-data
  only, git-tag archive before delete, Step-0 first to extract any routine-builder-shared components. Not yet done;
  sequence within/after the Practices + Insights work.
- **Insights-as-card** — promote from muted button to full card, data + reflections first, suggestions later
  (data-gated). Part of the Today rebuild not yet built.
- Two-track discipline holding: read-only Step-0 → build with scope fence + STOP gates → device walk → `--no-ff`
  merge. Commit-on-branch-before-walk now baked into build prompts (the twice-repeated uncommitted-tree trap).

*Living document. Owner: Kyle. Update as slices close.*

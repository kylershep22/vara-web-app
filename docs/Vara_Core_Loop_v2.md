# Vara — Revised Core Loop Specification
**Version 2.0 | April 2026 | State → Time → Protocol → Re-check → Adaptive response**

---

## Purpose

This document specifies the revised core loop for Vara, updating the v1 design to incorporate time-availability as an algorithm input and a gracefully handled "didn't shift" outcome.

**What changed from v1:**
1. Added a time availability question after the check-in
2. Longer protocols are now unlockable by time selection
3. The post-protocol re-check now handles "shift" vs "no shift" outcomes differently
4. The "no shift" path validates the user, offers a longer protocol or rest, and never retries immediately

**What's unchanged from v1:**
1. The five-state vocabulary (Wired, Foggy, Steady, Clear, Alive)
2. The state re-check as the primary measurement — still uses the five-state chips
3. Data model for state transitions (Patterns depends on this)
4. Brand principles: no pressure, no shame, supportive framing

---

## The revised loop at a glance

```
┌──────────────────┐
│  1. Check-in     │  "How are you right now?"
│  State selection │  Wired / Foggy / Steady / Clear / Alive
└─────────┬────────┘
          ▼
┌──────────────────┐
│  2. Time window  │  "How much time do you have?"
│  Time selection  │  2 / 5 / 10 / 20 / 45+ minutes
└─────────┬────────┘
          ▼
┌──────────────────┐
│  3. Algorithm    │  Match state + time + time-of-day + intent path
│  Recommendation  │  + past response data → single protocol
└─────────┬────────┘
          ▼
┌──────────────────┐
│  4. Protocol     │  User runs protocol (existing detail/running screens)
└─────────┬────────┘
          ▼
┌──────────────────┐
│  5. Re-check     │  "How are you now?"
│  State selection │  Same five-state chips
└─────────┬────────┘
          ▼
     ┌────┴────┐
     │         │
  SHIFTED   NOT SHIFTED
     │         │
     ▼         ▼
 Affirm    Validate + offer
 → Today   longer OR rest
           → Today
```

---

## Step 1 — Check-in (unchanged)

**Trigger:** User opens the app, taps the floating V check-in button, responds to a notification, or enters via the Overwhelm Safety Card.

**Screen:** Centered modal (per Modal Design System v1.1).

**Copy:**
- Title: "How are you right now?"
- No subtitle. The five states carry their own weight.

**Selection:** Five state chips in a vertical list, each with one-line description.

- **Wired** — "On, activated, hard to settle"
- **Foggy** — "Dulled, low clarity, slowed down"
- **Steady** — "Baseline, functional, fine"
- **Clear** — "Focused, available, present"
- **Alive** — "Energized, open, engaged"

**Interaction:** Single tap selects a state. No confirmation button — the selection advances to step 2 automatically with a 200ms fade transition.

**Back/cancel:** Top-left close button dismisses the check-in entirely. No data saved.

**What this step does NOT do:** No time-of-day bias, no pre-selection based on past behavior. The user tells Vara where they are; the algorithm reacts. Keep this step clean.

---

## Step 2 — Time window (NEW)

**Trigger:** Automatic advance from step 1 after state selection.

**Screen:** Same centered modal, content swaps with 200ms fade.

**Copy:**
- Title: "How much time do you have?"
- Subtitle: "We'll match you to something that fits."

**Selection:** Five time chips in a single row or stacked vertically (depending on device width). Each chip has the duration label and a one-line framing.

- **2 minutes** — "A quick reset"
- **5 minutes** — "A meaningful shift"
- **10 minutes** — "Deeper recovery"
- **20 minutes** — "Full reset"
- **45+ minutes** — "Focused work or deep rest"

**Interaction:** Single tap advances to the recommendation screen. No confirmation button.

**Back:** Top-left arrow returns to step 1. State selection is preserved — user can change it without starting over.

**Skip logic:** There's no skip on this screen. Time is always a required input. If the user dismisses the flow entirely via the close button, no protocol runs.

**Default selection hint (subtle):** The currently selected option can have a subtle teal outline to signal that something should be tapped — no option is pre-selected.

**What this step does NOT do:** It does not pretend time is unlimited. It does not offer "I have as long as I need" as an option. Time is bounded because users benefit from bounded choices, and the recommendation quality depends on the algorithm knowing a concrete window.

**Edge case — the "45+ minutes" option:** This option surfaces the longest protocols in the library (Focused Work Window, full-length Bright Light sessions, extended movement). It should not imply "infinite time." The protocols themselves are capped. "45+" communicates "this is the deep-work / deep-recovery bucket."

### Copy variant for Overwhelm Safety Card entry

When the user enters the loop via the Overwhelm Safety Card (the crisis-access entry point), the time window step is **skipped entirely** and the recommendation defaults to a 2-minute protocol. A user in acute distress should not be asked to make a time decision.

---

## Step 3 — Algorithm selects a protocol

**Not a user-facing screen.** This happens instantly between step 2 and step 4. Implementation note for the dev team: this is a synchronous call, results cached for the session, no loading spinner needed.

**Inputs the algorithm uses:**

1. **Selected state** (from step 1)
2. **Selected time window** (from step 2)
3. **Current time of day** (device-detected — morning, midday, afternoon, evening, late night)
4. **User's intent path** (set during onboarding — down-regulation, sleep, activation, default)
5. **Path decay factor** (how many days into the first 7 the user is — path bias fades linearly)
6. **Recent session history** (which protocols this user has tried in the last 7 days and what the outcomes were)
7. **Day of week** (weekday vs weekend — can affect optimal recommendation timing)

**Output:** A single protocol recommendation.

**The time window acts as the hard filter first:**

| Time window | Available protocols |
|---|---|
| 2 minutes | Cyclic Sighing (2 min), Sensory Reset (2 min), Extended Exhale (2 min), Box Breathing (2 min) |
| 5 minutes | Above + Coherence Breathing (5 min), Brief Movement (5 min), Extended versions of breath protocols |
| 10 minutes | Above + NSDR (10 min), longer Brief Movement, Mindful Walking (10 min), Cold Water Reset (includes prep) |
| 20 minutes | Above + NSDR (20 min), longer Mindful Walking, Bright Light Exposure |
| 45+ minutes | Above + Focused Work Window (45/60/90), extended Bright Light Exposure |

**After the time filter, the algorithm ranks remaining options by:**

1. State-match strength (some protocols are strong matches for some states; Cyclic Sighing is strong for Wired, NSDR is strong for Foggy-Post-Overwork)
2. Time-of-day fit (NSDR surfaces more heavily in afternoon and evening, Bright Light surfaces more heavily in morning)
3. Intent path bias (during first 7 days, the path boosts certain protocols — see intent paths doc)
4. Recency penalty (protocols the user has done in the last 48 hours are deranked but not removed)
5. Response history bonus (protocols that have shifted this user in the past get a small boost)

**Tie-breaking:** When two protocols score close, prefer the one with stronger evidence base (Tier 1 protocols beat Tier 2 in ties) and the one the user hasn't tried yet.

**Fallback:** If for any reason the algorithm produces no match (shouldn't happen but defensive coding), default to Cyclic Sighing at the 2-minute length.

---

## Step 4 — Protocol runs (unchanged)

The protocol detail and running screens work exactly as specified in the existing Protocol Detail Content doc. No changes to this step.

On completion, the user is automatically advanced to step 5 — re-check.

---

## Step 5 — Re-check (retain state chips, UI stays substantial)

Per your direction, we are **not** lightening the UI on this step. The re-check remains the same substantial, intentional moment it was in v1. This protects the data granularity and the "measurement is the product" positioning.

**Screen:** Centered modal, same visual weight as step 1.

**Copy:**
- Title: "How are you now?"
- No subtitle. The just-completed protocol is identified visually elsewhere on the screen (header, breadcrumb, or top card — implementer's choice) so a user re-mounting to the re-check after an interruption isn't confused about which protocol they're re-checking against. The protocol name does not appear in the question copy.

**Selection:** The same five state chips, each with the same one-line description as in step 1. User taps once to select.

**Interaction:** Single tap advances to step 6. The user's selection is compared server-side to their step 1 selection to determine the transition outcome.

**What this step does NOT do:** No Yes/No question. No "rate the protocol." No "how did you feel during it?" The state chip is the measurement. One tap. Consistent with the input in step 1.

**Optional secondary question (consideration, not required for v1):** Below the state chips, a single optional row: "Did this help?" with Yes / No / Skip. This captures user sentiment as a secondary signal without replacing the state-transition data. If you want this, it's a small additive change. If you don't, the state transition alone is sufficient.

---

## Step 6 — Adaptive response based on outcome

This is where the logic branches. The system evaluates the state transition and routes the user to one of two responses.

### Defining "shifted" vs "not shifted"

A state transition is considered a **shift** (positive outcome) if any of the following is true:

1. The user moved toward the "green zone" of the state model — from Wired toward Steady/Clear/Alive, from Foggy toward Steady/Clear/Alive, or stayed in Steady/Clear/Alive.
2. The user went from Wired to Foggy — this is often a legitimate intermediate shift (the edge is off, fatigue is surfacing), especially after down-regulation protocols. Treat as partial shift, not a failure.

A state transition is considered **not shifted** if:

1. The user stayed in the same negative state (Wired → Wired, Foggy → Foggy).
2. The user moved further away from regulation (Steady → Wired, Clear → Foggy). This is rare but possible.

**Edge case — green-zone maintenance:** If the user started in Steady, Clear, or Alive and did a protocol anyway (e.g., a Focused Work Window) and came out in the same state, this counts as a shift (the state was maintained under conditions where many users would have dropped). Don't treat this as "no change therefore failed."

### Path A — Shifted (positive outcome)

**Screen:** Centered modal with an affirming message, transitions to Today after 3-4 seconds or on user tap.

**Copy structure:**
- Title: A short, specific affirmation of what happened
- Body: A one-line framing of the shift in the user's language
- CTA: "Continue"

**Copy varies by transition and intent path.** A few examples:

**Transition: Wired → Steady, down-regulation path:**
- Title: "You settled."
- Body: "Wired to Steady in [N] minutes. That's your system returning to baseline."

**Transition: Wired → Clear, default path:**
- Title: "Nicely done."
- Body: "You moved from Wired to Clear. That's a notable shift — worth noticing how you got there."

**Transition: Foggy → Steady, activation path:**
- Title: "There's the lift."
- Body: "Foggy to Steady. Your system had more in it than it looked."

**Transition: Steady → Steady (maintenance), any path:**
- Title: "Held steady."
- Body: "Sometimes the practice is about not losing ground. You did that."

**Interaction:** User taps "Continue" or waits 4 seconds; screen dismisses and routes to Today. If this was the user's first shift ever, a small one-time "Your first shift is logged in Patterns" footer appears on Today. This is a brand-appropriate celebration — no confetti, no badge, just quiet acknowledgment.

**Data captured:** State transition, protocol used, time taken, session outcome tagged "shifted."

### Path B — Not shifted (validation + options)

This is the path that gets most of the design attention in this spec because it's where most wellness apps fail — they either guilt the user or push them to try again immediately.

**Screen:** Centered modal, slightly softer tonal treatment than the shifted path.

**Copy structure:**
- Title: A validating framing
- Body: A one-line honest explanation
- Two options: "Try something longer" and "Rest and come back later"

**Copy (consistent across transitions):**

- Title: "Some states take more time."
- Body: "That's normal. Nothing's wrong. A 2-minute protocol can't reach everything, and some moments need more than a reset."

**Two options, presented as secondary-styled buttons:**

**Option 1:** "Try something longer"
- Subtitle below button: "When you have 10+ minutes"
- Tapping this takes the user into the Practices tab with a filtered view of longer protocols matched to their state. It does NOT auto-run a protocol. The user chooses to engage or not.

**Option 2:** "Rest and come back later"
- Subtitle below button: "The next check-in will still be here"
- Tapping this routes to Today with no further prompts. Today surfaces a quiet "welcome back whenever" card in the top slot.

**Neither option is pre-selected or visually dominant.** Both are equally legitimate. This matters — a pre-selected "try something longer" would read as "we think you should try harder."

**Copy variant for specific scenarios (post-launch consideration):** If the user selected 2 minutes, didn't shift, and the time of day is late (10 PM+), the "try something longer" option could be replaced with "Try NSDR when you're ready" — because late-night retry-attempts are rarely the right move. This is a small tuning, not required for v1.

**Data captured:** State transition (no shift), protocol used, time taken, session outcome tagged "no shift," user's chosen next step (longer protocol, rest, or dismissed). This data is critical for the algorithm to learn — repeated no-shifts for a specific user + protocol combination should deprioritize that protocol for that user going forward.

---

## Special cases

### Case 1 — User selects Clear or Alive at step 1

A user who checks in as Clear or Alive doesn't need a down-regulation or activation protocol. The check-in flow should still work, but the algorithm's output shifts:

- If time is 2-5 minutes: recommend a short journaling prompt or Sensory Reset to anchor the state.
- If time is 10+ minutes: recommend Focused Work Window (if Clear) or a Mindful Walking session (if Alive).
- Copy in the recommendation screen should acknowledge the state: "You're in a good place. Here's a way to use it."

### Case 2 — User selects Steady at step 1

Steady is the neutral state. Most users don't need intervention when Steady, but some want to proactively build toward Clear or Alive. The algorithm should:

- For short time windows: recommend a brief activation protocol (Brief Movement, Bright Light) to lift toward Clear.
- For longer time windows: recommend Focused Work Window if the time of day suggests work, or Mindful Walking if leisure.
- The recommendation copy should acknowledge that this is optional: "You're Steady. Here's a way to build from here, if you'd like."

### Case 3 — Overwhelm Safety Card entry

The Overwhelm Safety Card is the direct-access path for acute distress, and per the end-to-end flow, it bypasses normal check-in. The revised loop modifies this slightly:

- Skip state selection (assume Wired)
- Skip time selection (default to 2 minutes)
- Go directly to a Cyclic Sighing or Sensory Reset protocol
- Re-check still runs at the end, but the "not shifted" response uses softer copy ("That was a hard moment. Nothing more is required of you right now. Rest.")

### Case 4 — User runs a protocol from the Practices browse view (not via check-in)

When a user manually opens a protocol from the Practices tab rather than via the check-in flow, the loop is different:

- Skip state selection (user self-selected a protocol, implying they know what they need)
- Skip time selection (they picked a specific protocol with a fixed length)
- Still run the re-check at the end (data is still valuable)
- Use a simpler version of the "shifted/not shifted" logic — just ask "How are you now?" with the five chips, capture the data, route to Today

This flow is the "advanced user" path. It exists because not every session starts from Wired/Foggy — sometimes a user wants to do NSDR because they know they need deep rest.

---

## Data model implications

New fields on the Session object:

- `time_window_selected` (enum: 2, 5, 10, 20, 45+)
- `state_transition_outcome` (enum: shifted, not_shifted, maintenance)
- `user_chosen_next_step` (enum: try_longer, rest_later, dismissed — only populated for no_shift path)

The existing fields (state_before, state_after, protocol_id, duration_actual) all persist unchanged.

Session records are the atomic unit of Patterns analysis. Every insight about this user is built from session records. Protecting this data model is critical.

---

## Integration with other specs

This revision has touchpoints with several other documents:

**Modal Design System v1.1:** The check-in flow now has a 2-step modal (state, then time). The bottom sheet pattern still applies; just note that users move through two selection screens before protocol selection.

**Intent Path spec:** The path shaping still applies to algorithm weighting. The time window is an additional filter that runs before the path bias.

**Brain State Model v2.2:** No changes needed to the protocol library itself. The library's evidence tiers and time ranges are what let the time-window filter work cleanly.

**Empty States spec:** The Patterns empty state should reference the revised loop in its copy: "As you check in and complete protocols, your patterns surface here." No structural change needed.

**Protocol Detail Content:** No changes. Protocols run the same way regardless of how the user got to them.

**Coach (V) integration:** V should be aware of the revised loop mechanics. If a user asks "why did Vara recommend NSDR?" V should be able to explain: "You checked in as Foggy with 10 minutes. NSDR is the strongest match in that time window for your state in the afternoon." V's system prompt should include a short summary of the loop and the algorithm inputs.

---

## Algorithm behavior — specific examples

A few concrete scenarios to make the algorithm behavior legible:

### Scenario 1 — Attorney at 2:45 PM, 5 minutes between meetings

- State: Wired
- Time: 5 minutes
- Time of day: Mid-afternoon
- Intent path: Down-regulation (week 1)
- Recent history: Did Cyclic Sighing yesterday (shifted), Box Breathing two days ago (shifted)

**Algorithm reasoning:**
- Filter: Protocols ≤5 minutes → Cyclic Sighing, Sensory Reset, Extended Exhale, Box Breathing, Coherence Breathing, short Brief Movement
- State match: All breath protocols match Wired well
- Time of day: All are fine at mid-afternoon
- Intent path bias: Cyclic Sighing, Sensory Reset, Extended Exhale all boosted 2x by down-regulation path
- Recency penalty: Cyclic Sighing slightly deranked (done yesterday)
- Response history: Box Breathing shifted this user, Cyclic Sighing shifted this user

**Recommendation: Sensory Reset** (path-boosted, state-matched, not recently done)

### Scenario 2 — Sales professional at 7 AM before the pipeline review, 2 minutes

- State: Wired
- Time: 2 minutes
- Time of day: Early morning
- Intent path: Default (selected "just exploring" during onboarding)
- Recent history: None

**Algorithm reasoning:**
- Filter: Protocols ≤2 minutes only → Cyclic Sighing, Sensory Reset, Extended Exhale, Box Breathing
- State match: All four match Wired
- Time of day: No strong bias; breath protocols all work early morning
- Intent path bias: None (default path)
- Recency: No recent history
- Evidence tier: Cyclic Sighing is Tier 1 (strongest), Box Breathing is Tier 2, Extended Exhale is Tier 2, Sensory Reset is Tier 2

**Recommendation: Cyclic Sighing** (strongest evidence, no competing signals)

### Scenario 3 — Any user, Sunday 8 PM, 20 minutes available, can't wind down

- State: Wired
- Time: 20 minutes
- Time of day: Evening
- Intent path: Sleep (week 2)
- Recent history: Did NSDR 10-min three times this week, shifted twice, no-shift once

**Algorithm reasoning:**
- Filter: Protocols ≤20 minutes → full library except Focused Work Window 45+
- State match: NSDR strong for Wired-to-sleep transition, Extended Exhale also strong
- Time of day: NSDR boosted 3x in evening per Sleep path
- Intent path bias: NSDR heavily boosted by Sleep path
- Recency penalty: NSDR 10-min slightly deranked (done three times)
- Response history: NSDR has shifted this user 2 of 3 times

**Recommendation: NSDR 20-minute version** (path-boosted, state-matched, fits time window, user hasn't done the 20-min version yet)

---

## What this spec does NOT do

- It does not change the onboarding flow (except by adding the time-of-day questions specified separately in Refinement 2)
- It does not add new protocols to the library
- It does not change the V coach's behavior beyond awareness of the new algorithm inputs
- It does not add gamification, streaks, or achievement badges to the "shifted" path
- It does not punish the "not shifted" path or pressure the user
- It does not assume every user wants longer protocols — the time window is user-driven, always

---

## Implementation effort estimate

Relative to the current v1 design, this revision adds:

- **1 new modal screen** (time window selection) — 4-6 hours of dev work using existing modal components
- **Algorithm changes** (time filter + time-of-day integration) — 6-10 hours, depending on how the current ranking logic is structured
- **New copy for shifted and not-shifted responses** — 4-6 hours of content work, multiplied slightly for per-path variants if you do that pre-launch
- **Revised response flow** (two branches instead of one) — 4-6 hours of dev work
- **Data model updates** — 2-3 hours, mostly adding enum fields and event tracking
- **Testing across edge cases** (Overwhelm Safety Card integration, Clear/Alive check-ins, Practices browse entry) — 4-6 hours

**Total estimated effort: 24-37 hours of dev and content work.**

This is meaningful but not scope-killing. For a solo founder at 15-20 hours per week, this is roughly 1.5-2 weeks of focused work. Given what this adds to the product (real time-awareness, graceful no-shift handling, longer protocols accessible), I believe this is a strong pre-launch investment.

---

*Version 2.0 | April 2026 | Replaces v1 check-in loop; all other specs remain in effect*

# Vara — Recommendation Engine Contract
**Version 1.2 | Engine spec for the Check-in → Recommendation loop | Status: Engine + check-in core loop built and on main; follow-ups in Section 12**

*v1.2: reflection chip sets finalized (Section 9); retirement is staged, not full (Section 9); bright light resolved to browse-only/unreachable (Sections 8, 11); build status and follow-up queue added (Section 12). v1.1: length matched by size class; bright-light evening suppression rule (Section 8).*

This is the implementation contract for Vara's core activation loop: the daily check-in, the situation × state recommendation engine, and the practice-slot filling that feeds it. It supersedes the prose dependency map in `Vara_Refactor_Plan.md` Section 6, which it formalizes. It is meant to be self-contained: an implementer should be able to build the engine from this document alone.

---

## 1. Scope

In scope: the state model, the situation set, the two-layer recommendation architecture, the practice tagging schema, the full 24-cell map, the clock modifier, and the audio manifest the map produces.

Out of scope (handled elsewhere): check-in screen visual design, per-pillar accent theming, the onboarding quest screens, and paywall placement. These reference the engine but do not change it.

---

## 2. State Model — Circumplex (two-tap)

The state read is a two-tap circumplex (arousal × valence), replacing the prior five brain-state model (wired/foggy/steady/clear/alive). The old `suitableForStates` field is retired; state routing now lives in the map (Section 7), not on practices.

Two taps, presented as plain questions (user-facing copy, no em dashes):
- Tap 1, arousal: "Where's your energy?" → **Revved up** / **Running low**
- Tap 2, valence: "And how's it feeling?" → **Good** / **Hard**

Four resulting quadrants:

| Quadrant | = | Direction |
|---|---|---|
| **Tense** | revved + hard | down-regulate |
| **Activated** | revved + good | proceed / go |
| **Depleted** | low + hard | lift or rest |
| **Calm** | low + good | maintain |

"Tense" is deliberately chosen over "Agitated" (which skews toward anger). The two-tap design exists specifically to separate arousal from valence, because the engine must treat revved+hard and revved+good as opposite cases.

Implementation note: the existing check-in is a reducer-driven flow (`CheckInFlow.tsx`, step `state_pick`). The rework replaces the five-chip pick with the two sequential taps and reworks `outcomeClassifier` (Section 9).

---

## 3. Situations (the second axis)

Six plain-language situations. Each earns its place because a different answer changes the plan.

1. Get through something hard
2. Quiet a busy mind
3. Find energy I'm missing
4. Wind down and switch off
5. Get a grip on my day
6. Just need a reset

Presentation note: situations 1–5 are the primary options. "Just need a reset" is the low-intent fallback (the no-specific-goal escape hatch) and should be presented at lower prominence on the check-in screen, not as a sixth equal tile, so the user weighs five outcome-specific options. Structurally the engine treats all six as routable.

---

## 4. Architecture — Two Layers

Situation does **not** tag practices. Tagging situations onto practices would duplicate the map's routing logic onto the data and create drift. The map owns routing; practices carry only what is needed to fill a slot.

- **Layer 1 — the map.** A static `situation × state → plan template` table (Section 7). A plan template is an ordered list of 0–2 slots.
- **Layer 2 — slot filling.** For each slot, filter the practice catalog by the slot's tags, then pick the specific practice by history, recency, and preference ("your usual downshift breath"). History biases the pick; it never pre-fills the check-in answer.

Plans may cross pillars. For example, an Energy settle practice can lead into a Focus session within one plan.

---

## 5. Practice Tagging Schema

Each practice in the catalog (`brainStateProtocols.ts`) carries:

| Field | Values | Status |
|---|---|---|
| `pillar` | focus / energy / time / community | **new** |
| `regulationDirection` | settle / energize / both / neutral | **new** |
| `modality` → slot `type` | breath / movement / sensory(grounding) / audio(nsdr) / cold / cognitive / environmental | exists |
| `duration` / `timeWindow` → `length` | 2 / 5 / 10 / 20 / 45 | exists |
| `suitableForStates` | — | **retired** |

`regulationDirection` matching: a `settle` slot accepts practices tagged `settle` or `both`; an `energize` slot accepts `energize` or `both`. The `both` value is required because several practices are genuinely bidirectional (Cold Water Reset, Brief Movement, the pre-session reset).

Length is matched by **size class**, not by exact minute, because the catalog's acute downshift breaths are all 2 min and an exact "(5)" target would miss them. Three classes, aligned to the onboarding time buckets: **short** = 2–5 (covers the 2 and 5 catalog buckets), **medium** = 10, **long** = 20–45. A slot's `length-target` is a class; Layer 2 matches any practice in that class, and the user's time budget caps it (a couple of minutes → short, 5–10 → short/medium, 20+ → long).

### 5.1 Existing practices, re-tagged (starting point)

| Practice id | pillar | direction | type | length |
|---|---|---|---|---|
| cyclic-sighing | energy | settle | breath | 5 |
| sensory-reset | energy | settle | sensory (grounding) | 2–5 |
| nsdr-10 | energy | settle (rest) | audio (nsdr) | 10 |
| nsdr-20 | energy | settle (rest) | audio (nsdr) | 20 |
| brief-movement | energy | energize | movement | 5 |
| cold-water-reset | energy | both | cold | 2 |
| Focus session (Pomodoro) | focus | neutral | focus-timer | user-chosen |
| Plan / routine | time | neutral | plan | n/a |

---

## 6. Slot Schema

A slot is `{ pillar, direction, type, length-target }`. Three rules the map forces:

1. A plan has **0, 1, or 2 slots**. Zero-slot plans are valid (see S3/Activated).
2. Each slot has a **`mandatory` vs `offered` flag**. An offered slot is presented as an option, never auto-chained. This is what keeps the engine from overriding the user's stated intent.
3. `length-target` is a size class (short / medium / long), not an exact minute. See Section 5.

---

## 7. The 24-Cell Map

The first slot listed is the lead. `→` means chained (mandatory). `[offer]` means the user is offered the next step, not auto-routed. The four cells tightened against the original prose (to honor "regulation is never busywork" and not override intent) are marked `*`. The minute values in the cells are readable hints; the actual slot filter is the size class from Section 5 (short = 2–5, medium = 10, long = 20+), so a "short" settle-breath slot matches the length-2 catalog breaths (cyclic-sighing, box-breathing, extended-exhale).

### 1. Get through something hard (outcome: focus session)
| State | Plan |
|---|---|
| Tense | settle-breath(5) → focus-session |
| Activated | focus-session |
| Depleted | movement/energize(5) → focus-session |
| Calm * | focus-session (optional grounding pre-roll, skippable) |

### 2. Quiet a busy mind (regulation is the goal here)
| State | Plan |
|---|---|
| Tense | settle-breath / grounding(5) |
| Activated * | grounding(2–5), then focus-session `[offer]` |
| Depleted | grounding(2–5), low effort |
| Calm * | "You're already there" + optional short reset |

### 3. Find energy I'm missing (the revved ≠ energy correction)
| State | Plan |
|---|---|
| Tense | settle-breath(5) — steady, do not stimulate |
| Activated * | "You're there, go use it" — **zero-slot plan** |
| Depleted | movement/energize(5) |
| Calm | gentle lift(5), or permission to rest |

### 4. Wind down and switch off (evening)
| State | Plan |
|---|---|
| Tense | settle-breath(5) or nsdr(10) |
| Activated | longer downshift(10) — come off the high |
| Depleted | nsdr(10–20) / rest |
| Calm | wind-down(5) |

### 5. Get a grip on my day (outcome: plan/routine, Time)
| State | Plan |
|---|---|
| Tense | brief-regulate(2) → plan |
| Activated | plan |
| Depleted | review one thing (low-effort, no pressure) |
| Calm | plan |

### 6. Just need a reset (no outcome; regulate to baseline)
| State | Plan |
|---|---|
| Tense | settle-breath(5) |
| Activated | grounding(2–5) to land |
| Depleted | restorative rest / nsdr(10) |
| Calm | short steadying(2–5) |

---

## 8. Clock Modifier

One targeted override, not a global axis. Situation 3 (Find energy) in the evening must protect sleep:

- **S3 / Depleted + evening** → flip movement/energize to nsdr/rest with a reframe ("rest is the energy move right now").
- **S3 / Calm + evening** → lean the same way (rest over lift).

A second, practice-specific evening rule: **bright light is suppressed from every energize slot in the evening** (the same evening window as above), not just in S3. Bright light is circadian-activating, so it must never be served late even through a non-S3 energize cell (for example "Get through something hard / Depleted" while working late, which routes movement/energize → focus). For now this is a hardcoded exclusion of `bright-light` from evening energize slots; if more circadian-activating practices are added later, promote it to a `daytimeOnly` practice flag. **Note (known state):** every energize cell in the current map is short, and bright light is medium/long, so bright light is currently unreachable through the map (effectively browse-only) and this evening rule is dormant-but-correct. It activates only if a future cell allows a longer energize slot (see Section 12).

Everywhere else, the situation already encodes time intent (Wind down is inherently evening), so no clock read is needed.

---

## 9. Engine Resolution (runtime)

1. Read situation (1 of 6) and state (arousal tap → valence tap → quadrant).
2. Apply the clock modifier to the situation/state if it fires (Section 8).
3. Look up the cell → plan template (0–2 slots).
4. For each slot, filter the catalog by `{pillar, direction (settle accepts settle|both; energize accepts energize|both), type, length-target}`, where `length-target` matches by size class (Section 5) and is further capped by the user's time budget, then rank by history/recency/preference and pick one.
5. Present the plan. Render `offered` slots as an option; do not auto-chain them.
6. After a completed catalog practice: a single-tap reflection, the chip set chosen by the practice's `(pillar, direction)`. `outcomeClassifier` records the entry state plus the reflection (a rework: the old classifier mapped a full before→after five-state pair). Zero-slot and acknowledgment cells show no reflection. Pointer-terminal cells (focus-session, plan) currently end the flow with no reflection (see the focus-loop follow-up in Section 12).

   | pillar / direction | chips |
   |---|---|
   | focus | Settled / Some / Still busy |
   | energy · settle | Calmer / A little / Still wound up |
   | energy · energize | More with it / A little / Still flat |
   | time | Clearer / A little / Still scattered |

### Codebase impact — status
- **Done:** `pillar`/`regulationDirection` tags added; the engine (`mobile/src/engine/`) replaces `selectProtocol` on the check-in path; `state_pick` reworked to the two-tap circumplex; `outcomeClassifier` reworked to the reflection recorder; `PracticesIndexScreen` "See other options" uses the engine's `eligiblePractices`; the daily check-in marker is decoupled from practice completion (writes on every state-captured terminal via the quadrant→BrainState bridge; `protocolId` unset when no practice ran).
- **Staged, not done:** `selectProtocol` and `suitableForStates` are retired from the check-in path only. Both are kept alive for the onboarding stack and BrowseRunFlow, with deprecation notes. Full deletion is deferred to the onboarding migration and BrowseRunFlow reconciliation (Section 12). Do not delete `suitableForStates` from the type/catalog until both consumers are migrated.
- `focused-work-45/90` retired from the served catalog (no production consumer).

### Engine brand rules (must hold in code)
- Regulation is never busywork. If the state supports the outcome, skip regulation (single slot, zero slot, or offered-only).
- Never override stated intent. Cross-pillar continuation is offered, not forced.
- No streaks, no scores, no metrics dashboards. Outcomes are felt, single-tap reflection only.

---

## 10. Audio Manifest (byproduct)

### Reuse, re-tag only (no production)
cyclic-sighing, sensory-reset, nsdr-10, nsdr-20, brief-movement, cold-water-reset, Focus timer, Habits/Routines.

### New content
| Item | Count | Tags | Modality |
|---|---|---|---|
| Energize breath | ~2–3 (some may exist from old Foggy set) | energy / energize / breath / 5 | **Pacer + copy** (BreathPacer pattern, no voice) |
| Movement reset | ~3 | energy / energize / movement / 5 | **Voice** (ElevenLabs → Storage) |
| Wind-down / sleep | ~2 | energy / settle / audio / 5–10 | **Voice** (ElevenLabs → Storage) |

Net voice-production track: ~5 recordings (3 movement + 2 wind-down), not 8. Energize breath rides the existing visual BreathPacer pattern, so it needs new pacer configs and instruction copy but no recording and no new audio type. ElevenLabs is a studio tool only; output MP3s land in Firebase Storage and play through the existing expo-av pipeline. There is no runtime TTS.

---

## 11. Open Items

1. **Skip / defer / remind-later** (open product decision). When a recommendation is served, the user can decline ("not right now"). Skip is a clean, guilt-free dismiss. Remind-later is opt-in per instance, with gentle invitational copy (no obligation), a single pending reminder that replaces rather than stacks, quiet-hours respected, and no "deferred and didn't do it" tracking. Quick relative offsets ("in an hour," "this evening," "tomorrow"), not a precise time picker. **One sub-decision still open:** whether the reminder re-enters the check-in fresh (recommended, since state has likely changed) or resurfaces the specific deferred practice. Built in a later wiring sub-step (Section 12).
2. **Intensity tag — deliberately deferred.** Direction plus length-target should keep an intense energize practice out of a Depleted slot. Add an `intensity` field only if the Depleted cells feel wrong on device.

*Closed since v1.1:* reflection chip sets (Section 9); `focus-session` source (launches the Pomodoro flow; `focused-work-*` retired); bright light ship decision (kept in the catalog as browse-only, currently unreachable through the map, Section 8).

---

## 12. Build Status & Follow-up Queue

**Built and on main:** token consolidation; practice tagging; the pure recommendation engine (`mobile/src/engine/`, full unit suite); the check-in core loop (two-tap circumplex, situation read, plan presentation, per-pillar reflection, pointer hand-off, daily-marker decoupling).

**Follow-up queue (rough priority):**
1. **Close the focus-session loop** (priority — the launch wedge). Add a return path from the Pomodoro flow back to the Focus reflection (already wired) so a focus session closes the loop instead of ending on hand-off. Optionally extend to the plan/Time path.
2. **Skip / defer / remind-later** (needs the Section 11.1 sub-decision).
3. **Onboarding migration.** Rework onboarding to the new quest and move it onto the engine; this is where `selectProtocol` and `suitableForStates` are finally deleted.
4. **BrowseRunFlow reconciliation.** The browse-and-run path still uses `classifyOutcome` (5×5) and `suitableForStates`; move it to the new reflection and engine filtering, the second dependency for the final `suitableForStates` deletion.
5. **Dashboard rework.** The calm "today" surface; finalizes the gating model and retires the legacy `brainStateCheckIns` bridge.
6. **Audio production** (parallel track): ~5 voice recordings (3 movement, 2 wind-down) plus the energize-breath pacer configs (Section 10).
7. **Longer energize option** (post-launch). If high-time-budget "find energy" should offer more than a short lift, widen those cells to allow medium, which makes `mindful-walking` reachable (the on-brand one; bright light stays held back).

---

*Living document. Owner: Kyle. Update as items close.*

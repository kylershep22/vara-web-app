# Check-In Protocol Audit — Implemented Reality

**Type:** Read-only diagnostic. No code was modified other than this report.
**Date:** 2026-07-19
**Scope:** `mobile/src` — the recommendation engine, the catalog, the check-in flow, and the post-completion dashboard readback.
**Method:** Reported what the code does. Where a comment, doc, or type name contradicts the code, the code is trusted and the contradiction is flagged.

---

## Step-0 Gates — none fired

| Gate | Result | Evidence |
|---|---|---|
| **G1** mapping not centralized | **Did not fire.** The situation × state → plan mapping is a single centralized structure: `PLAN_MAP` in `mobile/src/engine/planMap.ts` (a `Record<Situation, Record<Quadrant, PlanTemplate>>`), resolved by `resolve()` in `mobile/src/engine/resolve.ts`. | `planMap.ts:70-121`, `resolve.ts:252-343` |
| **G2** >1 source of truth for practice list | **Did not fire.** The practice list is a single static source: `BRAIN_STATE_PROTOCOLS` in `mobile/src/constants/brainStateProtocols.ts`, exposed via `getAllProtocols()`. There is no Firestore practice collection. | `brainStateProtocols.ts:25-780` |
| **G3** practices live in Firestore, unreadable | **Did not fire.** All practice definitions are static source. The **only** Firestore/Storage dependency is NSDR audio bytes (two `.mp3` files resolved at runtime from Firebase Storage). | `protocolAudioLoader.ts:32-57` |
| **G4** check-in doesn't use Situation + State | **Did not fire.** The flow is `situation_pick → state_pick (two-tap circumplex) → time_pick → resolve()`. Situation + circumplex-state (arousal × valence → quadrant) + time budget are the three engine inputs. | `reducer.ts:153-245`, `SituationPickStepView.tsx`, `StatePickStepView.tsx` |

> **Note on a secondary mapping (not the check-in path):** a legacy `selectProtocol` (`services/protocolSelector.service.ts`) still exists, but it does **not** drive the check-in. Its only live callers are `saveBrainStateCheckIn`'s fallback and the onboarding re-check bridge (`brainStateCheckIn.service.ts:147,248`). The check-in recommendation is 100% the engine.

### Code-vs-comment contradictions found (code trusted)

1. **`reducer.ts:13-15`** says *"resolve() THROWS if a catalog slot can't be filled."* **Code:** `resolve()` **never throws** — it degrades mandatory slots and drops offered slots (`resolve.ts:1-13, 197-250`). Trust the code: no throw.
2. **`engine/index.ts:4-5`** says *"No production caller is wired here."* **Code:** the reducer calls `resolve()` in production on `time_selected` (`reducer.ts:217-225`). Trust the code: the engine **is** the production path.
3. **`brainStateProtocols.ts:1`** header says *"11 families, 16 variants."* **Code:** 10 families, **14 variants** (the two `focused-work-*` entries were retired — see `brainStateProtocols.ts:661-666`). Trust the code: 14.
4. **`brainStateProtocols.ts:790-796`** describes `selectProtocol` as *"new code."* It is the legacy path; the engine superseded it for the check-in.

---

## Part 1 — Practice / protocol inventory

All 14 variants live in `BRAIN_STATE_PROTOCOLS`. **Every practice is pillar `energy`.** Focus work and plan/routine handoffs are **pointer slots** (`focus-session`, `plan`), not catalog practices — they route out to the Pomodoro timer and the routines screen respectively, and resolve to no `Protocol` object.

Legend — **Direction** = `regulationDirection`; **Cat** = `browseCategory`; **Class** = size class from `timeWindowToLengthClass` (short ≤5, medium ≤10, long >10).

| Id | Display name | Pillar | Cat | Direction | Dur (min) | Class | Modality | Audio asset | Reachable from |
|---|---|---|---|---|---|---|---|---|---|
| `cyclic-sighing-2` | Cyclic Sighing | energy | regulate | settle | 2 | short | breath | — | browse (Regulate); check-in settle cells **only via history/recency shuffle or "See other options"** |
| `box-breathing-2` | Box Breathing | energy | regulate | settle | 2 | short | breath | — | browse (Regulate); check-in **default lead of every settle cell**; "See other options"; short-budget pointer degrade (Activated/Calm) |
| `extended-exhale-2` | Extended Exhale | energy | regulate | settle | 2 | short | breath | — | browse (Regulate); "See other options"; short-budget pointer degrade (Tense); dashboard suggested-action (evening) |
| `coherence-breathing-5` | Coherence Breathing | energy | regulate | settle | 5 | short | breath | — | browse (Regulate); "See other options"; dashboard suggested-action (midday) |
| `sensory-reset-2` | Sensory Reset | energy | regulate | settle | 2 | short | sensory | — | browse (Regulate); check-in grounding cells; overwhelm safety-card entry |
| `nsdr-10` | NSDR | energy | rest | settle | 10 | medium | audio | `protocolAudio/nsdr/nsdr_10min_v1.mp3` — **runtime Storage, unverifiable from source** | browse (Rest); check-in nsdr cells; "See other options" |
| `nsdr-20` | NSDR | energy | rest | settle | 20 | long | audio | `protocolAudio/nsdr/nsdr_20min_v1.mp3` — **runtime Storage, unverifiable from source** | browse (Rest); check-in nsdr cells at long budget; "See other options" |
| `brief-movement-5` | Light Movement | energy | fuel | energize | 5 | short | movement | — | browse (Fuel); check-in **default lead of every energize cell**; dashboard suggested-action (morning); short-budget pointer degrade (Depleted) |
| `brief-movement-10` | Light Movement | energy | fuel | energize | 10 | medium | movement | — | **browse (Fuel) ONLY** — see Unreachable-via-check-in |
| `cold-water-reset-5` | Cold Water Reset | energy | fuel | both | 5 | short | cold | — | **browse (Fuel) ONLY** — no cell uses the `cold` slot type |
| `mindful-walking-10` | Mindful Walk | energy | fuel | energize | 10 | medium | movement | — | **browse (Fuel) ONLY** |
| `mindful-walking-20` | Walking Meditation | energy | fuel | energize | 20 | long | movement | — | **browse (Fuel) ONLY** |
| `bright-light-10` | Bright Light Exposure | energy | fuel | energize | 10 | medium | environmental | — | **browse (Fuel) ONLY** (also §8 evening-suppressed) |
| `bright-light-20` | Bright Light Exposure | energy | fuel | energize | 20 | long | environmental | — | **browse (Fuel) ONLY** (also §8 evening-suppressed) |

### Flagged in Part 1

**Same practice differing only by duration (the "listed twice" complaint):**

| Family | Variants | Same display name? | Where both appear together |
|---|---|---|---|
| brief-movement | `-5`, `-10` | **Yes — both "Light Movement"** | Energy → **Fuel** browse list (this is the exact "light movement listed twice" complaint) |
| nsdr | `-10`, `-20` | **Yes — both "NSDR"** | Energy → **Rest** browse list |
| bright-light | `-10`, `-20` | **Yes — both "Bright Light Exposure"** | Energy → **Fuel** browse list |
| mindful-walking | `-10`, `-20` | No — "Mindful Walk" vs "Walking Meditation" | Energy → **Fuel** browse list |

The Fuel browse list (`EnergyBrowseListScreen`, filtered by `browseCategory === 'fuel'`) renders **"Light Movement" twice and "Bright Light Exposure" twice** back to back, ordered shortest-first — so the two "Light Movement" rows are adjacent, distinguished only by the small duration label. Quantified: **4 duration-pair groups**, of which **3 present with identical display names** (brief-movement, nsdr, bright-light).

**Entries with no direction tag:** **0.** Every practice carries `regulationDirection`. `cold-water-reset-5` is `'both'` (bidirectional), not untagged.

**Entries whose audio reference does not resolve:** **0 statically broken.** Only `nsdr-10` and `nsdr-20` reference audio at all. Both are Firebase Storage paths resolved at runtime via `getDownloadURL` (`protocolAudioLoader.ts:42-47`); whether the objects exist in the `protocolAudio/nsdr/` Storage folder **cannot be determined from source.** Reported as runtime/Storage-backed, not statically verifiable. Every other practice uses `breath` / `timer` / `instruction` steps with no asset.

**Unreachable practices:** **0 are fully unreachable** (all 14 appear in an Energy browse list). **6 are unreachable via the check-in engine** (browse-only): `brief-movement-10`, `mindful-walking-10`, `mindful-walking-20`, `bright-light-10`, `bright-light-20` (every energize slot in `PLAN_MAP` is hard-capped to `lengthClasses: ['short']`, so no medium/long movement or environmental practice is ever eligible), and `cold-water-reset-5` (no cell uses the `cold` slot type; the settle-degradation path that could surface it never fires because settle slots always fill first).

---

## Part 2 — The check-in as implemented

Flow: `situation_pick → state_pick → time_pick → recommendation → running → reflection → [pointer_offer] → flow_complete` (`reducer.ts:1-24`).

### Q1 — Situation (`SituationPickStepView.tsx`)
Title: **"What do you need right now?"**
Five equal tiles + one quieter fallback link:

| Answer (label) | `Situation` value |
|---|---|
| Get through something hard | `get_through_hard` |
| Quiet a busy mind | `quiet_mind` |
| Find energy I'm missing | `find_energy` |
| Wind down and switch off | `wind_down` |
| Get a grip on my day | `grip_on_day` |
| Just need a reset *(quiet fallback link)* | `just_reset` |

### Q2a — Body state / arousal (`StatePickStepView.tsx`)
Prompt: **"How's your body right now?"** → **"Revved up"** (`revved`) / **"Running low"** (`low`).

### Q2b — Feeling / valence (`feelingCopy.ts`) — situation-specific labels, same `good`/`hard` poles
| Situation | Question | Good label | Hard label |
|---|---|---|---|
| get_through_hard | "And how are you doing?" | Holding up | Struggling |
| quiet_mind | "And how busy is it?" | Manageable | Too much |
| find_energy | "And how are you feeling?" | Okay | Rough |
| wind_down | "And are you starting to settle?" | Getting there | Not yet |
| grip_on_day | "And how's the day going?" | Mostly steady | Scattered |
| just_reset | "And how are you feeling?" | Okay | Rough |

Arousal × valence → quadrant (`quadrant.ts`): revved+hard=**Tense**, revved+good=**Activated**, low+hard=**Depleted**, low+good=**Calm**.

### Q3 — Time budget (`TimeWindowSelector`, minutes) — caps eligibility by size class.

### Persistence — what is written, where, for how long

On every terminal, `CheckInFlow` → `writeStandardFlowSession` (`brainStateCheckIn.service.ts:650-735`) writes up to two docs:

1. **`protocolSessions/{userId}_{sessionStartedAt}`** — authoritative, **only when a catalog practice actually ran** (pointer-only / zero-slot / acknowledged terminals write nothing here; `mapStandardFlowTerminalToPayload` returns `null`). Stores `situation`, `arousal`, `valence`, `quadrant`, `reflectionId`, `outcome`, durations. One per session; permanent.
2. **`brainStateCheckIns/{userId}_{date}`** (the "daily marker") — the legacy dashboard-gating doc, written on **every** non-overwhelm terminal. It is stamped with the raw **`quadrant`** and **`situation`** (`brainStateCheckIn.service.ts:703-728`), plus a bridged five-state `brainState`. One per day; overwritten on re-check.

### Where the reported state is read back after completion — **the complaint-#2 surface**

- **File / component:** `mobile/src/components/dashboard/RightNowAcknowledgment.tsx`, backed by `mobile/src/components/dashboard/stateAcknowledgment.ts`.
- **Exact string / template:** a card reading **"Right now"** (label) over the phrase from `QUADRANT_PHRASE` (`stateAcknowledgment.ts:14-19`):
  - `Tense → "A bit wound up"`
  - `Activated → "Plenty of energy"`
  - **`Depleted → "Running low"`** ← the beta-reported "I'm running low"
  - `Calm → "Settled"`
  - sub-line **"From your check-in."**
- **Data path:** `useDashboard` reads today's daily marker via `getTodayBrainStateCheckIn`, then builds `engineSession` from **`existing.quadrant` + `existing.situation`** (`useDashboard.ts:307-334`) and passes the quadrant to `stateAcknowledgment()`.

**Is this (a) a persisted value or (b) in-memory session state?**
**(a) — it reads a PERSISTED value.** The displayed phrase is derived from `brainStateCheckIns/{uid}_{date}.quadrant`, which was stamped from `terminal.quadrant` — the **circumplex state the user reported at the START of the check-in** (`state_pick`). There is **no post-practice re-read of state** on the standard dashboard flow; the reflection step captures a *reflection chip* (`Calmer` / `Still wound up`), not a new state, and does not update the acknowledgment. So after completing a practice, the dashboard re-renders the **pre-practice reported quadrant** straight from persistence.

**Fix-locus implication:** because the value is persisted (and is by definition the *before* state), a display-only tweak to `stateAcknowledgment.ts` cannot make it reflect a post-practice reality — there is no post-practice state captured to show. Closing complaint #2 correctly requires either (i) suppressing/ reframing the "Right now: [reported state]" readback after a completed practice, or (ii) capturing a post-practice state (the onboarding flow already does this via `OnboardingRecheckScreen`, but the dashboard flow does not). This **touches data flow / persistence, not just copy.**

---

## Part 3 — The mapping as implemented

Source: `PLAN_MAP` (`planMap.ts:70-121`) + the §8 evening modifier in `getPlanTemplate` (`planMap.ts:128-140`) + slot filling in `resolve()`.

**Resolution inputs beyond situation × quadrant (documented separately below the matrix):** time budget (size class), evening flag, and session history all bias which concrete practice fills a slot. The matrix below is stated at the **canonical case: 10-minute budget, daytime (hour < 20), no history.** Deviations are noted per row.

**Slot-fill facts that drive every cell (no history, daytime):**
- **`settle-breath` slot** → all four breath practices tie on budget-closeness at any budget; the ranker's final tiebreak is **alphabetical id** (`ranker.ts:31`), so the lead is **always `box-breathing-2`** unless `box-breathing` is in `recentFamilies`.
- **`grounding` slot** → only `sensory-reset-2` (sole sensory practice).
- **`energize` slot** → `lengthClasses: ['short']` restricts to the sole short energize practice → **always `brief-movement-5`** (daytime).
- **`nsdr` slot** → `nsdr-10` at medium budget; `nsdr-20` only when budget is long.
- **Composite `settle` slots** (`quiet_mind`/`wind_down`) → union of the stated modalities, then the same closeness→alphabetical ranking.

### The 24-cell matrix (canonical: 10-min budget, daytime, no history)

| # | Situation | Quadrant | Step 1 | Step 2 | Notes / other-budget behavior |
|---|---|---|---|---|---|
| 1 | get_through_hard | Tense | `box-breathing-2` (settle, mand.) | `focus-session` pointer (mand., len 10) | ≤5 budget: pointer **dropped** (sibling practice leads) → box-breathing-2 only, **no focus session** |
| 2 | get_through_hard | Activated | `focus-session` pointer only (len 10) | — | ≤5 budget: degrades to `box-breathing-2` (settle), **no focus session** |
| 3 | get_through_hard | Depleted | `brief-movement-5` (energize, mand.) | `focus-session` pointer | ≤5: pointer dropped → movement only |
| 4 | get_through_hard | Calm | `sensory-reset-2` (grounding, **offered**) | `focus-session` pointer (mand.) | primary launches focus directly; pre-roll optional |
| 5 | quiet_mind | Tense | `box-breathing-2` (settle breath\|sensory) | — | |
| 6 | quiet_mind | Activated | `sensory-reset-2` (grounding, mand.) | `focus-session` pointer (**offered**) | |
| 7 | quiet_mind | Depleted | `sensory-reset-2` (grounding, mand.) | — | |
| 8 | quiet_mind | Calm | `box-breathing-2` (settle, **offered**) | — | message: "You're already there." |
| 9 | find_energy | Tense | `box-breathing-2` (settle-breath, mand.) | — | **Settle practice for a "find energy" goal, no reframe message** — see Part 4 |
| 10 | find_energy | Activated | *(none)* | — | **Zero-slot**, message: "You're there. Go use it." |
| 11 | find_energy | Depleted | `brief-movement-5` (energize, mand.) | — | **Evening:** flips to `nsdr-10` + message "Rest is the energy move right now." |
| 12 | find_energy | Calm | `brief-movement-5` (energize, **offered**) | — | message: "A gentle lift, or permission to rest." **Evening:** `nsdr-10` offered |
| 13 | wind_down | Tense | `nsdr-10` (settle breath\|audio) | — | **≤5 budget:** `box-breathing-2` (audio can't fit) |
| 14 | wind_down | Activated | `nsdr-10` (nsdr, mand., medium) | — | ≤5: degrades to short settle breath `box-breathing-2` |
| 15 | wind_down | Depleted | `nsdr-10` (nsdr, mand., medium\|long) | — | **long budget:** `nsdr-20`; **≤5:** `box-breathing-2` |
| 16 | wind_down | Calm | `box-breathing-2` (settle, short) | — | |
| 17 | grip_on_day | Tense | `box-breathing-2` (settle-breath, mand.) | `plan` pointer (mand.) | ≤5: pointer dropped → breath only, **no plan** |
| 18 | grip_on_day | Activated | `plan` pointer only | — | ≤5: degrades to `box-breathing-2`, **no plan** |
| 19 | grip_on_day | Depleted | `plan` pointer only | — | message: "Just review one thing. No pressure." ≤5: degrades to `brief-movement-5` |
| 20 | grip_on_day | Calm | `plan` pointer only | — | ≤5: degrades to `box-breathing-2` |
| 21 | just_reset | Tense | `box-breathing-2` (settle-breath) | — | |
| 22 | just_reset | Activated | `sensory-reset-2` (grounding) | — | |
| 23 | just_reset | Depleted | `nsdr-10` (nsdr, medium) | — | ≤5: `box-breathing-2` (BACKLOG-noted short-rest gap, `resolve.ts:100-104`) |
| 24 | just_reset | Calm | `box-breathing-2` (settle, short) | — | |

### Inputs that bias the result (documented separately)

- **Time budget (size class):** `short` (≤5), `medium` (≤10), `long` (>10). Caps eligibility (`lengthClassWithinBudget`) and drives the ranker's closeness sort. At `short`, **pointer cells never hand off** — a `focus-session`/`plan` pointer either drops (if a sibling practice leads) or degrades to a fixed short practice by quadrant (`SHORT_POINTER_PRACTICE`, `resolve.ts:105-113`): Activated→`box-breathing-2`, Tense→`extended-exhale-2`, Depleted→`brief-movement-5`, Calm→`box-breathing-2`. **Default assumed above: 10-min (medium).**
- **Evening (hour ≥ 20):** only `find_energy` Depleted/Calm change (lift → NSDR rest + reframe message, `planMap.ts:126-138`). Elsewhere evening only suppresses `bright-light` (already unreachable via check-in).
- **History (`recentFamilies`):** applies a recency penalty *after* budget-closeness (`ranker.ts:27-30`). **Default with no history:** the alphabetical tiebreak governs, which is why settle cells collapse to `box-breathing-2`. With `box-breathing` recently used, the next-alphabetical breath practice (`coherence-breathing-5`, then `cyclic-sighing-2`) leads instead.

---

## Part 4 — Gap analysis

Because concrete practices are budget/history-dependent, cells are flagged for the condition under which the gap appears (default = 10-min, daytime, no history).

**Empty (no practice / zero-slot / drops the stated outcome):**
- **Cell 10** `find_energy × Activated` — zero-slot by design; the user asked to *find energy* and receives a message and **no practice**.
- **Cells 1, 17** at ≤5 budget — the mandatory pointer is **dropped** because a sibling practice leads, so "get through something hard" / "get a grip on my day" silently lose their focus-session / plan outcome.
- **Cells 2, 18, 20** at ≤5 budget — the pointer degrades to a short breath practice, again **dropping the focus/plan outcome**.

**Direction conflict:**
- **Quadrant-strict (practice direction vs quadrant): 0.** The engine never serves an energize practice to a settle-quadrant or vice-versa; the quadrant → direction discipline holds in every cell, including all degradation paths.
- **Situation-vs-practice (the practice contradicts the *stated situation goal*): the real problem.** Clearest: **Cell 9** `find_energy × Tense` → `box-breathing-2`, a **down-regulating** breath practice, served to a user who explicitly asked to **find energy**, with **no reframing message** (unlike the evening Depleted/Calm cells, which at least explain "Rest is the energy move right now"). **Cell 2/18/20** at ≤5 also flip purpose: an Activated user who wanted to focus/plan gets settling box-breathing.

**Duplicate (resolves to a functionally identical practice as other cells, no differentiation):** **dominant pattern.** ~20 of 24 cells resolve their lead to just **four** practices:
- `box-breathing-2` leads/offers in **≥9 cells** (1, 5, 8, 9, 13@≤5, 16, 17, 21, 24 …).
- `sensory-reset-2` in **4 cells** (4, 6, 7, 22).
- `brief-movement-5` in **3 cells** (3, 11, 12).
- `nsdr-10` in **~5 cells** (13, 14, 15, 23, evening-11).
Different situations + different states frequently produce the **same** practice, so the check-in feels undifferentiated. Root cause: the ranker's alphabetical tiebreak (`box-breathing-2` always wins settle ties) plus the `['short']` cap on energize slots.

**Length mismatch (resolved duration can't use the stated budget):**
- **Cells 3, 11, 12** — energize cells are hard-capped to `['short']`, so a user with a 10- or 20-minute budget who wants energy still gets **`brief-movement-5` (5 min)**; `brief-movement-10`, `mindful-walking-10/20`, `bright-light-10/20` can never be served. (Under-serves the budget and strands 5 catalog practices.)
- **Cells 13, 14, 15, 23** at ≤5 budget — NSDR (10-min floor) can't fit, so the user gets a 2-min breath in place of rest (BACKLOG-acknowledged, `resolve.ts:100-104`).

**Unreachable (no cell can ever return):** `brief-movement-10`, `mindful-walking-10`, `mindful-walking-20`, `bright-light-10`, `bright-light-20`, `cold-water-reset-5` — **6 practices**, all browse-only.

### Cells most likely to have produced the beta complaint (ranked by severity)

1. **Cell 10 — `find_energy × Activated`:** user asks to *find energy*, gets a "you're fine, go" message and **nothing to do**. Reads as the app ignoring the request.
2. **Cell 9 — `find_energy × Tense`:** user asks to *find energy*, gets **box breathing (down-regulation)** with **no explanation** — the practice is the opposite of the stated intent.
3. **Cells 1 / 17 / 2 / 18 / 20 at short budgets — dropped outcomes:** "Get through something hard" and "Get a grip on my day" silently lose the focus-session / plan handoff at ≤5 minutes, becoming a bare breath practice.
4. **The `box-breathing-2` monotony (≥9 cells):** wildly different check-ins keep returning the same box-breathing practice, so the recommendation feels like it isn't listening to the inputs.
5. **The "Light Movement listed twice" browse duplication (`brief-movement-5`/`-10`, plus NSDR and Bright Light):** identical names stacked in the Fuel/Rest lists — the literal complaint from Part 1.
6. **Energy budget under-service (Cells 3/11/12):** a 20-minute energy request is answered with a 5-minute movement, and the longer movement/light practices are unreachable.

---

## Appendix — files inspected (read-only)

Engine: `engine/planMap.ts`, `engine/resolve.ts`, `engine/types.ts`, `engine/quadrant.ts`, `engine/slotFilter.ts`, `engine/ranker.ts`, `engine/lengthClass.ts`, `engine/clock.ts`, `engine/stateBridge.ts`, `engine/index.ts`.
Catalog: `constants/brainStateProtocols.ts`.
Check-in flow: `components/checkin/flow/{reducer,CheckInFlow,SituationPickStepView,StatePickStepView,feelingCopy,reflection}.ts(x)`.
Persistence & readback: `services/firebase/brainStateCheckIn.service.ts`, `hooks/useDashboard.ts`, `components/dashboard/{stateAcknowledgment,RightNowAcknowledgment,suggestedAction}.ts(x)`.
Reachability: `screens/Energy/{EnergyHubScreen,EnergyBrowseListScreen}.tsx`, `screens/practices/PracticesIndexScreen.tsx`, `services/audio/protocolAudioLoader.ts`.

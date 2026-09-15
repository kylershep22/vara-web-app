# Slice 7l — device walk

**Branch:** `journey/slice-7l-destination-weighting`
**Commits:** `5d6d6ec` (weights) · `a0519dc` (serve table test) · `87eee1e` (ordering tests + doc correction) · docs
**Written at the build, before the walk; results filled in after it.** **WALKED AND ATTESTED 2026-09-14 (Kyle)** - step 0 plus steps 1-9 plus the regression guard, all passed, on two accounts. The attestation is at the foot of this file and in the roadmap §13 entry.

**Device:** iPhone 14 Plus, default Dynamic Type.
**SE steps: NOT WALKABLE IN THIS SETUP.** No SE device is available. Recorded as outstanding rather than passed by inspection, matching R1b-i and R2.

---

## Why this walk exists

Slice 7i landed twelve approved protocol strings and could only walk seven of them. Its §13 entry recorded the gap plainly:

> R2, R5, R6, R8 and R9 are unreachable on today's selection logic (row 7l), so no device state exists that would show them. **Five authored strings shipped unwalked and unwalkable** [...] **Nobody has seen them rendered.** Row 7l is what changes that, and its walk is specified as exactly this gap.

**This walk is that eleventh step, five times over.** Its whole purpose is to put Jen's five previously-unreachable strings in front of a human. A step that cannot be reached is recorded as unreached with its gate — never passed by inspection.

---

## What renders, and both reachability gates

**Surface.** All five strings are protocol **titles**, rendered at `TodayHeroCard.tsx` — `<Text style={styles.protocolName}>{protocol.name}</Text>`. They render nowhere else in the app. (`whyItWorks` renders on no surface a user reaches; it is held for the slice 9 behavioral screen.)

**Navigator gate — identical for all five, and open on launch.** `TodayHeroCard` mounts in `DashboardScreen`, which is `ROUTES.Home` — the first tab in **both** the four-tab and the legacy navigator, behind no feature flag.

**Data gate — three conditions.** The serve is `selectProtocol(phaseKey, todaysCapacity, todaysTime, destination)`:

| Condition | Source | Walkable? |
|---|---|---|
| phase `recover` | `resolveJourney`; a journey starts at `remove` | **Yes** — one advance on the phase screen. (`skipToPhase` exists in the service layer but has **zero production callers**; phase is advanced the way a user would.) |
| capacity + time | `dailyLogs`, set by the daily picker | **Yes** — all three capacity tiers and all three time classes are user-selectable. |
| destination | written **once** at `createJourneyState` | **Fixed per account.** No service function updates it; there is no in-app way to change a destination. |

### The consequence: two accounts, and it is a product fact

R2 / R5 / R8 need destination **Routines**. R6 / R9 need **Energy**. The two sets are mutually exclusive on one account, so **at most two of the five are reachable on any single account and never all five.**

Both are reached **through the product** — a fresh account through onboarding V3, choosing the destination at the destination screen. **No seeding, no Firestore writes, nothing unconfirmable.**

- **Account A — destination Routines**
- **Account B — destination Energy**

---

## Step 0 — the destination tell (both accounts, before any numbered step)

Open the Journey/phase surface and confirm the phase is **Recover**, then read the phase title:

| Destination | Recover phase title |
|---|---|
| focus | "Get some headroom back" |
| calm | "Learn how to come down" |
| **routines** | **"Find your way back"** |
| **energy** | **"Get some energy back"** |

**Account A must read "Find your way back". Account B must read "Get some energy back".**

**If the title does not match, STOP.** The destination is wrong and every step below would pass or fail for the wrong reason. This step exists because destination is written once at journey creation and cannot be changed in-app — there is no recovering from starting on the wrong account halfway through.

**RESULT: PASSED** (Kyle, 2026-09-14). Account A reads **"Find your way back"** (Routines). Account B reads **"Get some energy back"** (Energy). Both accounts created through onboarding V3 and advanced from Remove to Recover.

---

## Account A — Routines

Set the account state named in each row **before** taking the action.

### Step 1 — R2, on a medium answer
**State:** Recover · Routines · capacity **Normal** · time **10–15 min**
**Action:** Open the daily picker, select Normal and 10–15 min, confirm.
**Pass:** Today card title reads exactly **"Build a recovery anchor"**.
**RESULT: PASSED** — title exact. **R2 seen rendered for the first time.**

### Step 2 — R2, on a short answer
**State:** as above, time changed to **5 min or less**
**Action:** Reopen the picker, select Normal and 5 min or less, confirm.
**Pass:** Title still reads **"Build a recovery anchor"**. (Reached by the ladder's step-3 fallback on the reordered cell, not by a class match.)
**RESULT: PASSED** — title exact.

### Step 3 — the first Finding-2 divergence, observed rather than assumed
**State:** as above, time changed to **15+ min**
**Action:** Reopen the picker, select Normal and 15+ min, confirm.
**Pass:** Title reads **"Set the morning signal"** (R3) — **NOT** "Build a recovery anchor".

**RESULT: PASSED** — divergence observed as specified. R3 served, R2 not.

> **RECORDING THE DIVERGENCE IS THE PASS.** Jen's table routes Routines/Normal to R2, but R3 is the cell's only `long` variant, so the time ladder matches the asked class and returns it whatever the weights say. Time outranks destination by construction. Seeing R2 here would mean the time ladder had been broken, which would be the real failure.

### Step 4 — R5
**State:** Recover · Routines · capacity **Limited** · time **10–15 min**
**Action:** Reopen the picker, select Limited and 10–15 min, confirm.
**Pass:** Title reads exactly **"Use a two-part reset"**.
**RESULT: PASSED** — title exact. **R5 seen rendered for the first time.**

### Step 5 — R8
**State:** Recover · Routines · capacity **Slammed** · time **5 min or less**
**Action:** Reopen the picker, select Slammed and 5 min or less, confirm.
**Pass:** Title reads exactly **"Use one recovery cue"**.
**RESULT: PASSED** — title exact. **R8 seen rendered for the first time.**

---

## Account B — Energy

### Step 6 — R6
**State:** Recover · Energy · capacity **Limited** · time **10–15 min**
**Action:** Open the daily picker, select Limited and 10–15 min, confirm.
**Pass:** Title reads exactly **"Start with light"**.
**RESULT: PASSED** — title exact. **R6 seen rendered for the first time.**

### Step 7 — R9
**State:** Recover · Energy · capacity **Slammed** · time **5 min or less**
**Action:** Reopen the picker, select Slammed and 5 min or less, confirm.
**Pass:** Title reads exactly **"Get some morning light"**.
**RESULT: PASSED** — title exact. **R9 seen rendered for the first time.**

### Step 8 — the second Finding-2 divergence
**State:** Recover · Energy · capacity **Normal** · time **10–15 min**
**Action:** Reopen the picker, select Normal and 10–15 min, confirm.
**Pass:** Title reads **"Downshift, then unplug"** (R1) — **NOT** "Set the morning signal".

**RESULT: PASSED** — divergence observed as specified. R1 served, R3 not.

> Jen's table routes Energy/Normal to R3, but R3 is `long` and a medium ask never walks up — the ladder descends only, because serving something longer spends time the user said they did not have. R3 is ineligible, so Energy falls to the highest-weighted medium, which is R1. **Recording it is the pass.**

### Step 9 — the overrun that goes to Jen
**State:** Recover · Energy · capacity **Normal** · time **5 min or less**
**Action:** Reopen the picker, select Normal and 5 min or less, confirm.
**Pass:** Title reads **"Set the morning signal"** (R3).

> **OBSERVE AND RECORD, DO NOT TREAT AS A FAILURE.** This serves a **20-minute** protocol to someone who answered "5 minutes or less". The overrun itself is pre-existing and deliberate (ladder step 3: a protocol the user has to trim beats a blank card), but before 7l this slot served R1 at 15 minutes, so **weighting makes it five minutes worse, for Energy only.**
>
> **This is the one item that goes to Jen after the walk**, per Kyle's ruling. Note whether the card reads as reasonable or as obviously wrong on the device — that judgement is what the question to Jen needs and is exactly what a table cannot supply.

**RESULT: PASSED, AND THE OBSERVATION IS RECORDED.** Title reads **"Set the morning signal"** — a **20-minute** protocol served to a **5-minutes-or-less** answer. Observed on device, not inferred. **This is the one item that goes to Jen**, and it now goes with a device observation behind it rather than a table.

---

## Step 10 — the regression guard

**State:** either account, or a Calm/Focus account if one exists.
**Action:** Confirm Focus and Calm still serve R1 / R4 / R7 at every capacity.
**Pass:** Unchanged from what slice 7i walked. **7l must move nothing on the pathway 7i already covered.**

> If no Calm or Focus account is to hand, this is held by `recoverServeTable.test.ts`, which pins all twelve Focus and Calm rows. Record which way it was checked.

**RESULT: PASSED.** The Focus/Calm pathway is unchanged — 7l moved nothing on the ground slice 7i already walked.

---

## Coverage

| String | Step | Account | Gate | Result |
|---|---|---|---|---|
| R2 "Build a recovery anchor" | 1 (and 2) | A — Routines | Home tab · Recover · Normal · short-or-medium | **SEEN** |
| R5 "Use a two-part reset" | 4 | A — Routines | Home tab · Recover · Limited | **SEEN** |
| R8 "Use one recovery cue" | 5 | A — Routines | Home tab · Recover · Slammed | **SEEN** |
| R6 "Start with light" | 6 | B — Energy | Home tab · Recover · Limited | **SEEN** |
| R9 "Get some morning light" | 7 | B — Energy | Home tab · Recover · Slammed | **SEEN** |

**All five previously-dark strings were seen in place. None was passed by inspection. None required written test data. Nothing was listed as unconfirmable.**

> **THE SENTENCE SLICE 7i HAD TO WRITE IS NO LONGER TRUE.** That entry recorded
> of these five strings: **"Nobody has seen them rendered."** As of
> **2026-09-14** somebody has, on a device, in the surface they ship on. That was
> the whole purpose of this row and it is the only result here that could not
> have been obtained from the suite.

This closes the gap 7i's entry recorded. Steps 3, 8 and 9 additionally put Finding 2 in front of a human rather than leaving it in a report.

**Outstanding after this walk:** the SE half.

---

## Attestation

**ATTESTED by Kyle, 2026-09-14.** iPhone 14 Plus, dev client, default Dynamic Type. Two accounts created through onboarding V3 and advanced from Remove to Recover.

- **Step 0, both accounts: PASSED.** Account A's Recover row reads "Find your way back" (Routines); Account B's reads "Get some energy back" (Energy).
- **Steps 1–9: ALL PASSED**, titles exact, including the two expected divergences at steps 3 and 8 and the step 9 overrun observation.
- **Five previously-dark strings seen rendered:** R2, R5, R8 on Account A; R6, R9 on Account B.
- **Step 10 regression guard: PASSED.** Focus/Calm pathway unchanged.
- **Suites green at tsc 141 / jest 3699 of 232 / sentinel 149 / lint 994 errors, 1358 warnings. ATTESTED.**
- **SE steps: not walkable in this setup.** Outstanding, not passed by inspection.

---

## What the walk found that the plan did not ask for

**ROWED AS `TODAY-CARD-AFFORDANCES` (Kyle, 2026-09-14), before beta. NOT 7l's to fix.**

On the Today card, **"Make it harder to reach"** renders as a bare bold line beneath the capacity eyebrow with no affordance around it. If it is interactive, nothing signals it; if it is not, it reads like a control that does nothing. The row's scope is to decide what it is and give it the right treatment.

> **HALF OF THAT QUESTION IS ALREADY ANSWERED, and the answer is in the code rather than in a judgement.** "Make it harder to reach" is a **protocol title** — `remove.normal[0]`, the behavioral Remove variant — rendered at `TodayHeroCard.tsx` as `<Text style={styles.protocolName}>{protocol.name}</Text>`. **A plain `Text`: no `Pressable`, no `TouchableOpacity`, no `onPress`, no `accessibilityRole`.** It is definitively **not interactive**, so the row resolves to the second branch: a non-interactive line is reading as a control.
>
> **AND IT IS NOT ABOUT THIS ONE STRING.** That is the slot **every** protocol title renders in, all twenty-one of them — including the five this walk just made reachable. The finding was made on a Remove title and applies to the whole Today card. Scoping the row to one string would fix the example and leave the pattern.

**Two smaller facts for whoever takes the row:** `protocolName` is `fontWeight.medium` at `fontSize.sm` in `softCharcoal`, directly under `weekSummary` — which is why it reads as emphasis without reading as a heading. And unlike the daily action beneath it (`testID="home-today-action"`), the title carries **no `testID`**, so there is nothing to hang a test on today.

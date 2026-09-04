# Vara — Journey Content Pack v1

**Authored by:** Jen
**Approved by:** owner on delivery
**Date:** 2026-09-05
**Covers:** Recover internal structure · slice 5 display strings (16 title + 16 gloss) · A1 + A2 · C1 · B2 + C2 · Remove replacement menus

---

## How to use this file

**Strings in this pack are APPROVED CONTENT.** They enter the codebase **without**
`COPY: draft` markers, and **the copy-draft sentinel does not increment for them**
(`mobile/src/__tests__/copyDraftSentinel.test.ts` counts drafted strings; approved
content is not drafted). A slice that lands pack strings states in its commit message
that the strings came from this pack, and the sentinel figure stays flat.

**Citation form for slice prompts:** `Content Pack v1 §<anchor>`, e.g. `Content Pack v1 §A2`.

| Anchor | Section | Consumed by |
|---|---|---|
| [`recover-lanes`](#recover-lanes) | Recover phase internal structure | slice 5 (phase detail page) |
| [`display-strings`](#display-strings) | 16 `title` + 16 `gloss` | slice 5 (journey map), slice 4 |
| [`A1`](#a1) | Destination pick | slice 4 |
| [`A2`](#a2) | Route explanation | slice 4 |
| [`C1`](#c1) | Weekly check-in strings | slice 6 |
| [`B2`](#b2) | Advancement offers, two variants | slice 7 |
| [`C2`](#c2) | Adjustment offer + per-phase alternatives | slice 7 |
| [`replacement-menus`](#replacement-menus) | Remove replacement menus | slice 3c-ii |
| [`safety-precheck`](#safety-precheck) | Safety pre-check position | pre-launch |
| [`decisions`](#decisions) | Sept 5 decisions addendum, four flags | multiple, see each |

**Two sections carry supersessions. Read them before building:**

- [`C2`](#c2) — the original body is **SUPERSEDED**. Build the final body in
  [`decisions` section 4](#decisions-4), never the one in the original delivery.
- [`replacement-menus`](#replacement-menus) — the reminder step is **DEFERRED to slice 9**.
  3c-ii ships the menus with the neutral confirmations in
  [`decisions` section 3](#decisions-3), never the reminder prompt in the original delivery.

Everything below the next rule is Jen's delivery verbatim. Editorial insertions are
blockquoted and labelled; nothing else has been altered.

---
---

# Part one, Sept 5 pack

<a id="recover-lanes"></a>

# 1. Recover-phase internal structure

## Definition

The first stretch is about reducing what is taking too much from the user.

Recover is about **learning how to come back after the day takes something out of them**.

That may mean coming down when their mind is still running, getting something back when they feel depleted, or getting re-oriented when the day has become scattered.

The internal job of this phase is:

**Get back to a state you can work with.**

It is not a rest phase and it is not a collection of calming exercises.

The user is learning which small resets actually help them regain usable headroom in real life.

---

## What the user does week to week

There is no new intake when the user enters this stretch.

The daily loop stays exactly the same:

1. How much are you up for today?
2. How much time is real?
3. Vara serves one practice.
4. Done or skip.
5. Weekly, Vara asks whether this stretch feels useful.

The content underneath changes.

Recover draws from three internal lanes. Users never see these labels.

### Downshift

For moments when the user is still switched on.

Examples:

* slow or extended breathing
* sensory reset
* short periods with less input
* transition out of work
* guided rest
* putting the phone away for a few minutes
* deliberately ending one part of the day before entering the next

The intended felt result is simple:

**I came down a notch.**

### Refill

For moments when the user feels depleted.

Examples:

* daylight
* light movement
* a short walk
* real rest
* food or water prompts where appropriate
* guided rest or NSDR
* stepping away from a screen
* taking a break that is actually a break

The intended felt result:

**I have a little more to work with.**

### Re-anchor

For moments when the user feels scattered or the day has gotten away from them.

Examples:

* one simple reset cue
* step outside, move, then choose what comes next
* reset the immediate space
* write down the next thing that matters
* transition rituals
* morning light plus one first action
* one-step, two-step, and three-step anchors

The intended felt result:

**I know where I am again.**

---

## How destination influences what gets served

Do not create four completely separate Recover phases.

Use the same content system, but weight it differently based on why the user came to Vara.

### Focus

Favor Re-anchor, with Downshift when mental carryover is getting in the way.

### Calm

Favor Downshift.

### Steadier days

Favor Re-anchor, with some Refill.

### Energy

Favor Refill, with some Downshift.

The user is not asked to choose a lane. Vara simply uses destination, current capacity, available time, recent serves, and repetition rules to select the practice.

---

## Content to reuse

Strong existing fits:

* Cyclic Sighing
* Extended Exhale
* Sensory Reset
* NSDR
* Light Movement
* Mindful Walk
* Bright Light Exposure
* One Anchor Cue
* Two-Step Anchor
* Three-Step Anchor
* Morning Light

User-facing names can be simplified when needed.

Examples:

**Bright Light Exposure** → **Get some morning light**

**Light Movement** → **Move for a few minutes**

**NSDR** → **Take a guided reset**

The technique name can still appear inside the player or educational detail if useful.

> **EDITORIAL NOTE (not Jen's text).** The eleven names in "Content to reuse" span BOTH
> content systems. One Anchor Cue, Two-Step Anchor, Three-Step Anchor and Morning Light
> are **grid** content, not runnable catalog practices. See
> [`decisions` section 2](#decisions-2) for the verified split and the build rule that
> follows from it.

### Consolidate

Mindful Walk and Walking Meditation do not need to feel like two different products in the journey. One walking reset with different durations is enough.

### De-emphasize

Box Breathing can remain available, but the journey should usually serve the outcome rather than the named technique.

Instead of:

**Box Breathing**

prefer:

**Take two minutes to bring things down**

### Remove from the core journey for now

Cold Water Reset.

It feels more like performance or biohacking content than the central Vara experience.

---

## Content still worth adding

The existing catalog is strongest at breathing, movement, and rest.

I would add more practices around:

* transitions out of work
* reducing input without requiring meditation
* real short breaks
* resetting after interruption
* re-orienting when the day gets scattered
* protecting a small amount of recovered space
* ending one part of the day before beginning another

---

## Capacity and time

These remain separate.

**Capacity determines how demanding the practice is.**

Normal:

* more self-direction is okay
* more steps are okay
* a slightly more intentional practice is reasonable

Limited:

* fewer decisions
* fewer steps
* clear instruction

Slammed:

* almost no setup
* almost no decision-making
* easy to start
* easy to stop

**Time only determines how long the user stays with it.**

A Slammed user with 20 minutes still gets a low-demand practice.

A Normal user with five minutes gets a short practice that can still ask a little more of them.

Do not collapse Normal into long, Limited into medium, and Slammed into short.

---

## How this differs from the first stretch

The first stretch asks:

**What is taking too much from you, and how do we make it smaller?**

Recover asks:

**When the day takes something from you, what helps you come back?**

That distinction should remain clear in every protocol.

---

<a id="display-strings"></a>

# 2. Slice 5 display strings

Internal framework labels below are for implementation only. None appear in UI.

---

## Destination: Focus

### Phase 1

**Title:** Clear what's pulling at your attention

**Gloss:** Start with the things that keep using up the attention you need elsewhere.

### Phase 2

**Title:** Get some headroom back

**Gloss:** Find a few ways to reset when your attention has been stretched too far.

### Phase 3

**Title:** Make focus easier to return to

**Gloss:** Build simple patterns that help you start, stay with something, and come back when you get pulled away.

### Phase 4

**Title:** Put your attention where it matters

**Gloss:** Use the room you've made on the things you actually want more attention for.

---

## Destination: Calm

### Phase 1

**Title:** Clear what keeps your mind running

**Gloss:** Start with the things that keep following you long after they need to.

### Phase 2

**Title:** Learn how to come down

**Gloss:** Find a few reliable ways to leave the noise and pressure of the day behind.

### Phase 3

**Title:** Make switching off easier

**Gloss:** Build a few cues that help your mind recognize when it is time to stop carrying the day.

### Phase 4

**Title:** Protect more of your off time

**Gloss:** Use the room you've made to be more present when the work is done.

---

## Destination: Steadier days

### Phase 1

**Title:** Clear what keeps knocking the day off course

**Gloss:** Start with the patterns that make the day harder to hold together.

### Phase 2

**Title:** Find your way back

**Gloss:** Practice a few simple resets for when the day gets away from you.

### Phase 3

**Title:** Build a few anchors that hold

**Gloss:** Put simple cues around the parts of the day you want to happen more reliably.

### Phase 4

**Title:** Shape the day around what matters

**Gloss:** Give your time more structure without packing more into it.

---

## Destination: Energy

### Phase 1

**Title:** Clear what's draining you

**Gloss:** Start with what seems to take more from the day than it gives back.

### Phase 2

**Title:** Get some energy back

**Gloss:** Find the things that help you recover when you're running low.

### Phase 3

**Title:** Build a steadier baseline

**Gloss:** Make the things that support your energy easier to come back to.

### Phase 4

**Title:** Use your energy where you want it

**Gloss:** Put more of what you have toward the parts of life that matter most.

---

# 3. Slice 4 onboarding

## Decision 1

**Route explanation goes at step 3, immediately after the destination choice.**

The user has just told Vara why they downloaded the app. That is the moment to explain why Vara is about to start somewhere unexpected.

Waiting until step 5 weakens the connection between the promise and the explanation.

> **EDITORIAL NOTE (not Jen's text).** This resolves roadmap section 9 open item 1
> (route screen position) in favour of the roadmap's own lean, step 3.

## Decision 2

Use:

**Steadier days**

Do not use:

**Routines**

Routines are a mechanism. Steadier days are the outcome the user wants.

> **EDITORIAL NOTE (not Jen's text).** This resolves roadmap section 9 open item 9, which
> was logged as "Jen's call". It governs the DESTINATION label only. The Practices hub
> card is a separate string and is unaffected.

---

<a id="a1"></a>

## A1: destination pick

**Title:** What would make the biggest difference right now?

### Focus better

I want to focus without getting pulled away so easily.

### Switch off more easily

I want my mind to stop carrying the day after it's over.

### Have steadier days

I want to feel like I have a better grip on my day.

### Have more energy left

I want to stop feeling like I'm running on empty.

**Primary:** Continue

---

<a id="a2"></a>

## A2: route explanation

### Shared title

**We won't start by giving you more to do.**

### Focus

Before we ask more of your attention, we'll start with what's pulling at it. You'll make one small change there today, then we'll build from what that gives back.

### Calm

Before we add another way to relax, we'll start with what's keeping your mind switched on. You'll make one small change there today, then we'll build from what that gives back.

### Steadier days

Before we build another routine, we'll start with what's knocking the day off course. You'll make one small change there today, then we'll build from what that gives back.

### Energy

Before we ask you to do more, we'll start with what's draining you. You'll make one small change there today, then we'll build from what that gives back.

**Primary:** Start there

---

<a id="c1"></a>

# 4. C1 weekly check-in strings

Keep the structure identical and change only the destination language.

## Focus

**Does this feel like it's moving you toward better focus?**

## Calm

**Does this feel like it's helping you switch off more easily?**

## Steadier days

**Does this feel like it's moving you toward steadier days?**

## Energy

**Does this feel like it's helping you have a little more energy left?**

### Answer options

**Yes, I can feel a difference**

**Not really yet**

**Hard to tell**

### Confirmation

**Got it. We'll keep that in mind this week.**

Do not change the confirmation depending on the answer.

The purpose of this screen is to listen, not reward or reassure.

> **EDITORIAL NOTE (not Jen's text).** The three answers map to the engine contract in
> [`decisions` section 1](#decisions-1): `moving` / `not_moving` / `unclear`. The shipped
> `PhaseRead` type names its middle state `same`. Moving to `unclear` is a **semantic
> change, not a rename** ("no change" and "cannot tell" are different answers), it is
> slice-6 code work rather than a copy change, and slice 6's Step 0 must first establish
> whether any `phaseRead` values are stored. See roadmap section 3.4.

---

<a id="b2"></a>

# 5. B2 and C2

These can be considered early approved direction rather than waiting until October.

## B2: advancement offer 1

Use when the consistency condition fires.

**Title:** There's something to build on here.

**Body:** You've been coming back to this regularly. Want to see what Vara can build from it next?

**Primary:** See what's next

**Secondary:** Keep working here

---

## B2: advancement offer 2

Use when the time condition fires without enough evidence to describe the behavior as regular.

**Title:** Ready to try the next part?

**Body:** You've spent some time working here. You can keep going, or see what comes next and decide if it feels right.

**Primary:** See what's next

**Secondary:** Stay here

---

<a id="c2"></a>

## C2: shared adjustment offer

> **SUPERSEDED. DO NOT BUILD THE BODY BELOW.**
> The body in this original delivery was revised by Jen in the same-day decisions
> addendum. Build the final version in [`decisions` section 4](#decisions-4):
> **"If this isn't feeling like it's moving yet, we can change the approach without
> starting over."**
> The title is unchanged between the two versions. The prohibition on naming the
> two-response trigger holds in both and is not superseded.

**Title:** Let's try a different angle.

**Body:** ~~This hasn't felt very useful lately. You don't need to start over. We can change how you work on the same part.~~ **SUPERSEDED, see above.**

Do not tell the user that two negative weekly responses triggered this.

---

## Adjustment set: first phase

### Make it smaller

Keep working on the same thing, but make today's move easier.

### Try another way

Keep the same target and approach it differently.

### Work on something else

Choose a different thing that's taking up too much room.

---

## Adjustment set: second phase

### Help me come down

Try practices that reduce input and help you leave some of the day behind.

### Help me get something back

Lean toward rest, light, movement, and other small ways to restore some capacity.

### Help me get re-oriented

Use simple resets that help you find your footing when the day feels scattered.

---

## Adjustment set: third phase

### Make it easier

Shrink the practice until it fits more kinds of days.

### Put it somewhere better

Move it to a point in the day where it has a better chance of happening.

### Give it a stronger cue

Connect it to something that already happens without much thought.

---

## Adjustment set: fourth phase

### Narrow what matters

Choose one thing that deserves more of your attention or energy right now.

### Give it some room

Protect a clear place in the day for it.

### Come back to why

Reconnect this work to what you wanted to change when you started.

---

## C2 confirmation

**Okay. We'll work it this way for now.**

---

<a id="replacement-menus"></a>

# 6. Remove replacement menus

These are offered only when replacing something in a specific time slot makes sense.

One selection only.

---

## Morning

**Title:** What would you rather do with that time?

* Get ready without checking my phone
* Make coffee or breakfast without scrolling
* Step outside for a few minutes
* Move for a few minutes
* Write down what matters today
* Read a few pages

---

## During the day

**Title:** What would you rather do with that time?

* Take a real break without my phone
* Walk for a few minutes
* Step outside
* Get something to eat or drink
* Read a few pages
* Reset my space for a few minutes

---

## Evening

**Title:** What would you rather do with that time?

* Put my phone away
* Read for a bit
* Write down what's still on my mind
* Stretch for a few minutes
* Get tomorrow set up
* Do something off-screen

---

## Reminder

> **DEFERRED TO SLICE 9. DO NOT BUILD IN 3c-ii.**
> The reminder step below is out of scope for 3c-ii, which ships the menus with no
> notification infrastructure. 3c-ii ends after the replacement selection with the
> neutral confirmations in [`decisions` section 3](#decisions-3). Build the prompt below
> only when slice 9 owns notification behaviour.

**Want a nudge when that time comes?**

**Remind me**

**No reminder**

---

## Confirmation

> **SUPERSEDED FOR 3c-ii.** The three confirmations below presume a reminder was set.
> 3c-ii uses the neutral confirmations in [`decisions` section 3](#decisions-3) instead.
> These return when slice 9 adds the reminder step.

Morning:

**Done. We'll bring this up in the morning.**

Evening:

**Done. We'll bring this up tonight.**

For a daytime choice without a specific time:

**Done. You can come back to this anytime today.**

---

<a id="safety-precheck"></a>

# 7. Safety pre-check

No new user-facing copy from me here.

I would put the missed phrase on the pre-launch engineering list, but I would not solve this by continually adding more exact phrase patterns.

"I don't feel safe at home right now" is a good example of why literal keyword matching will always have gaps.

Before launch, I would use:

1. a small set of obvious local patterns as the immediate fast path
2. a semantic safety classification before free text can enter normal routing
3. the existing safety screen when that classification fires

The phrase list can remain a useful guardrail, but it should not be the primary safety model.

If a phrase library is still useful as a secondary layer, I can provide one by category separately.

---
---

<a id="decisions"></a>

# Part two, Sept 5 decisions addendum

# Decisions on the four flags

<a id="decisions-1"></a>

## 1. C1 mapping: use three states

Agreed with the recommendation.

Map the three user-facing answers as:

* **Yes, I can feel a difference** → `moving`
* **Not really yet** → `not_moving`
* **Hard to tell** → `unclear`

`unclear` is neutral.

It should **not**:

* count toward the two-consecutive-`not_moving` adjustment trigger
* reset a previous `not_moving` read as though the user reported improvement
* be interpreted as `moving`
* be treated as a negative signal anywhere else

The principle is the same as the existing unanswered-week rule: uncertainty is not a complaint.

One important distinction: C1 should not independently control phase advancement. Advancement remains governed by its existing consistency/time eligibility rules and remains an offer. If there is ever an additional requirement that the user must report `moving` before an advancement offer can appear, that should be a separate product decision rather than inferred from this field.

So the engine contract is:

**`moving | not_moving | unclear`**

Only consecutive explicit `not_moving` responses accumulate toward C2.

<a id="decisions-2"></a>

## 2. Recover practice inventory: verify against the two actual systems

Agreed that build prompts should reference IDs that actually exist, but the inventory is now available and reveals an important distinction.

There are currently two separate systems:

1. **Runnable practice catalog:** 14 variants across 10 families
2. **Daily protocol grid:** behavioral actions served by the journey

They are not interchangeable today, and the bridge between them is currently empty.

### Existing runnable catalog content relevant to Recover

Confirmed existing:

* Cyclic Sighing
* Box Breathing
* Extended Exhale
* Coherence Breathing
* Sensory Reset
* NSDR, 10 minutes
* NSDR, 20 minutes
* Light Movement, 5 minutes
* Light Movement, 10 minutes
* Mindful Walk
* Walking Meditation
* Bright Light Exposure, 10 minutes
* Bright Light Exposure, 20 minutes
* Cold Water Reset

### Existing grid content relevant to Recover

Confirmed existing separately in the daily protocol grid:

* Exhale and unplug
* Three-step anchor
* Light, movement, steady wake
* Exhale and a break
* Two-step anchor
* Light and steady wake
* Five-minute exhale
* One anchor cue
* Morning light

So the anchor content I referenced does exist, but **it is not part of the runnable practice catalog**. It is grid content.

### Content direction remains

For the core Recover journey:

**Use prominently**

* Cyclic Sighing
* Extended Exhale
* Sensory Reset
* NSDR
* Light Movement
* walking reset
* morning/bright light
* existing anchor protocols

**Available but de-emphasized**

* Box Breathing
* Coherence Breathing

**Consolidate in user experience**

* Mindful Walk / Walking Meditation

**Do not use as core journey content**

* Cold Water Reset

Cold Water Reset can remain in the underlying catalog for now. I am only removing it from the central guided journey.

### Build implication

Do not make Recover reference runnable-practice IDs until the mapping is explicitly authored.

The intended structure should become:

**daily protocol → optional supporting runnable practice**

For example, a daily Recover protocol can ask the user to take two minutes to bring things down and then launch `extended-exhale-2` as its supporting practice.

Populate `supportingPracticeIds` deliberately as part of that integration rather than assuming matching titles mean the systems are already connected.

<a id="decisions-3"></a>

## 3. Remove replacement reminders: defer to slice 9

Agree with your lean.

**3c-ii v1 ships the curated replacement menus without reminder setup.**

Do not expand this slice with notification infrastructure just to preserve the copy we drafted.

For now the flow ends after the replacement selection with a neutral confirmation.

### Morning

**That's your morning option.**

### During the day

**That's there when you want it today.**

### Evening

**That's your evening option.**

Once slice 9 owns notification behavior properly, add:

**Want a nudge when that time comes?**

* Remind me
* No reminder

This keeps the first implementation small and avoids creating a second notification path that will have to be reconciled later.

The replacement itself is the important behavioral mechanic. The reminder is an enhancement.

<a id="decisions-4"></a>

## 4. C2 past-reference copy: change it

I would not keep:

**This hasn't felt very useful lately.**

It is not unsafe, but it does slightly overstate what Vara knows.

Two `not_moving` responses tell us that the user does not currently feel movement. They do not necessarily mean the practices were useless.

We also do not need to expose the two-response trigger.

Use:

**Title:** Let's try a different angle.

**Body:** You don't have to start over. We can keep working on the same part and change how we approach it.

That is enough context because the offer appears immediately after Vara has been checking in with the user week to week.

If we want one small acknowledgment of their feedback without narrating their history, I prefer:

**Title:** Let's try a different angle.

**Body:** If this isn't feeling like it's moving yet, we can change the approach without starting over.

I prefer this second version.

It stays conditional rather than declaring an internal state, explains why the card exists, and does not say:

* you failed
* the practices did not work
* we detected a pattern
* you answered negatively twice

### Final C2 copy

**Title:** Let's try a different angle.

**Body:** If this isn't feeling like it's moving yet, we can change the approach without starting over.

Then show the constrained in-phase alternatives.

---

# Final decisions

1. **C1 becomes three-state:** `moving / not_moving / unclear`. Only explicit `not_moving` accumulates toward adjustment.
2. **Inventory is verified.** Anchors exist in the grid, not the runnable catalog. Recover build prompts must distinguish the two systems and use explicit IDs when linking them.
3. **Replacement-flow reminders move to slice 9.** 3c-ii ships menus without notification scope.
4. **Change the C2 body** to conditional language:
   **"If this isn't feeling like it's moving yet, we can change the approach without starting over."**

# Vara — Journey Content Pack v1

**Authored by:** Jen
**Approved by:** owner on delivery
**Date:** 2026-09-05
**Covers:** Recover internal structure · slice 5 display strings (16 title + 16 gloss) · A1 + A2 · C1 · B2 + C2 · Remove replacement menus · Recover and Refocus protocol copy (12 x title, action, why) · phase descriptors · Recover destination weighting

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
| [`short-labels`](#short-labels) | 16 `short` labels | slice 4 (A2 route strip), slice 5 (journey map), slice 7 (Today journey line, per §9 item 6) |
| [`safety-precheck`](#safety-precheck) | Safety pre-check position | pre-launch |
| [`decisions`](#decisions) | Sept 5 decisions addendum, four flags | multiple, see each |
| [`protocol-copy`](#protocol-copy) | 9 Recover + 3 Refocus protocol copy (title, daily action, why-it-works) | roadmap row 7i |
| [`phase-descriptors`](#phase-descriptors) | 4 phase descriptors + the usage rule that dissolves the `PHASE_DISPLAY` collision | roadmap row 7j (RESOLVED, no build); explanatory surfaces later |
| [`destination-weighting`](#destination-weighting) | Recover destination weighting, 4 destinations x 3 capacities | roadmap row 7l |

**Five sections need a note before you build:**

- [`C2`](#c2) — the original body is **SUPERSEDED**. Build the C2 body from
  [`decisions` section 4](#decisions-4), never from the original delivery.
- [`decisions` section 4](#decisions-4) — **SUPERSEDED IN TURN, 2026-09-12, and this
  is a second layer on the same anchor.** Its "Final C2 copy" heading is no longer
  final: Jen revised the body on 2026-09-12 and there are now **two** bodies, a first
  offer and a second, where that heading writes one. Build only from the **dated
  amendment block at the end of that section**. A reader who stops at the first
  heading that says "Final" builds a retired string.
- [`replacement-menus`](#replacement-menus) — the reminder step is **DEFERRED to slice 9**.
  3c-ii ships the menus with the neutral confirmations in
  [`decisions` section 3](#decisions-3), never the reminder prompt in the original delivery.
- [`protocol-copy`](#protocol-copy) — **no supersession. First and only delivery,
  2026-09-12.** Listed here so this block stays a complete map of the sections that
  need a note, rather than a hazard list that silently omits one. Build straight from
  it. The count in the heading above moved from three to four for this entry, and the
  heading was reworded because "carry supersessions" would have been false of it.
- [`protocol-copy`](#protocol-copy) — **AMENDED 2026-09-12, same day as delivery,
  and the entry above is now out of date on two values.** A dated block at the END of
  that section changes R1's daily action (one phrase) and R7's `estMinutes` (5 -> 2).
  Build both from the amendment, not from the R1 and R7 entries. Everything else in
  the section stands as delivered.

**This guide names anchors and does not quote strings**, deliberately, as of 2026-09-12.
It quoted the C2 body once and that quotation went stale the moment Jen revised it,
leaving a reading guide instructing a builder to ship a retired line. An anchor
survives a revision; a quotation does not.

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
> addendum, and revised again by her on 2026-09-12. Build from
> [`decisions` section 4](#decisions-4) — specifically from the **dated amendment
> block at the end of that section**, which carries **two** bodies, a first offer
> and a second. The "Final C2 copy" heading partway through that section is the
> 2026-09-05 version and is itself superseded.
> The title is unchanged across all three versions. The prohibition on naming the
> two-response trigger holds in every one of them and is not superseded.
>
> **CORRECTED 2026-09-12 (slice 7h). This note used to QUOTE the body it was
> pointing at.** The quotation was accurate when written and became wrong the
> moment Jen revised the string, at which point an editorial note headed
> "DO NOT BUILD THE BODY BELOW" was itself naming a retired line as the one to
> build. It now names the anchor and nothing else. **A reading guide that quotes
> the thing it indexes acquires a second copy to keep in step, and the copy it
> keeps is the one nobody remembers to update.**

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

> **AMENDED 2026-09-12 (Jen). THE BODY ABOVE IS SUPERSEDED, AND THERE ARE NOW
> TWO BODIES RATHER THAN ONE.** The delivery above is left unedited; this block
> is the canonical wording.
>
> **Jen revised both bodies as a pair**, at Kyle's request that the amendment
> land in this pack rather than as a local override in the codebase:
>
> **Title:** Let's try a different angle. *(unchanged)*
>
> **Body, FIRST offer:** If this isn't helping yet, we can change the approach
> without starting over.
>
> **Body, SECOND offer:** If this still isn't helping, we can change the
> approach without starting over.
>
> **Decline:** Keep going for now. *(approved unchanged)*
>
> **WHY THERE ARE TWO.** Roadmap §9 R5 permits exactly one word of continuity
> between a first and a second offer, and slice 7b shipped that as "still". This
> pack wrote no second body, so the second string was authored in-house and
> signed off by Kyle as owner, explicitly PENDING JEN REVIEW and explicitly
> marked to move if she revised the first. **This is that review. Her sign-off
> SUPERSEDES Kyle's on BOTH bodies** and is the warrant the copy ledger records
> from here.
>
> **WHAT CHANGED AND WHY IT IS NOT COSMETIC.** "feeling like it's moving" became
> "helping" in both. The replaced phrasing borrowed the weekly check-in's own
> vocabulary - `moving` / `not_moving` is the C1 answer set - so the card was
> quietly echoing the user's logged answer back at them, which is the narration
> §decisions-4 rejected in the first place. "helping" makes the same conditional
> offer without referencing what they told us.
>
> **SENTINEL: NO MOVEMENT.** Two approved strings replaced by two approved
> strings; nothing is drafted in either direction.
>
> **Consumed by §5 row 7h.** Until that row lands, the codebase carries the
> superseded wording; the pack is ahead of the code on purpose, and the roadmap
> says so.

---

# Final decisions

1. **C1 becomes three-state:** `moving / not_moving / unclear`. Only explicit `not_moving` accumulates toward adjustment.
2. **Inventory is verified.** Anchors exist in the grid, not the runnable catalog. Recover build prompts must distinguish the two systems and use explicit IDs when linking them.
3. **Replacement-flow reminders move to slice 9.** 3c-ii ships menus without notification scope.
4. **Change the C2 body** to conditional language:
   **"If this isn't feeling like it's moving yet, we can change the approach without starting over."**

---

# Part three, Sept 6 addition

<a id="short-labels"></a>

# 8. Slice 4 route-strip short labels

**Authored by:** Jen
**Approved by:** owner on delivery
**Date:** 2026-09-06

The third length of `PHASE_DISPLAY`, completing the 48. Part one section 2 delivered
`Title` and `Gloss` only; this section supplies the 16 `short` labels those two were
always paired with.

**Same rule as the rest of this pack.** These are APPROVED CONTENT. They enter the
codebase **without** `COPY: draft` markers, they carry no owner comment, and **the
copy-draft sentinel does not increment for them**. A slice that lands them says in its
commit message that the strings came from this pack, and the sentinel figure stays flat.

**Where each one renders:** the A2 route strip (slice 4), the journey map (slice 5), and
the Today journey line (slice 7, subject to §9 item 6, which is still open on `short`
versus a stage word). One string, three surfaces, so it has to read correctly in all
three and cannot be tuned for any one of them.

> **EDITORIAL NOTE (not Jen's text).** The section structure and the `Title` line echoed
> on each cell are editorial, added so the pair can be read together; the `Short` values
> are Jen's, verbatim. **`§display-strings` stays canonical for titles** — if the echo
> here and that section ever disagree, that section wins.

---

## Destination: Focus

### Phase 1

**Title (delivered Sept 5, for reference):** Clear what's pulling at your attention

**Short:** Clear the distractions

### Phase 2

**Title (delivered Sept 5, for reference):** Get some headroom back

**Short:** Get some headroom back

### Phase 3

**Title (delivered Sept 5, for reference):** Make focus easier to return to

**Short:** Make focus easier

### Phase 4

**Title (delivered Sept 5, for reference):** Put your attention where it matters

**Short:** Focus on what matters

---

## Destination: Calm

### Phase 1

**Title (delivered Sept 5, for reference):** Clear what keeps your mind running

**Short:** Clear what's keeping you on

### Phase 2

**Title (delivered Sept 5, for reference):** Learn how to come down

**Short:** Come down a notch

### Phase 3

**Title (delivered Sept 5, for reference):** Make switching off easier

**Short:** Make switching off easier

### Phase 4

**Title (delivered Sept 5, for reference):** Protect more of your off time

**Short:** Protect your off time

---

## Destination: Steadier days

### Phase 1

**Title (delivered Sept 5, for reference):** Clear what keeps knocking the day off course

**Short:** Clear what's throwing you off

### Phase 2

**Title (delivered Sept 5, for reference):** Find your way back

**Short:** Find your way back

### Phase 3

**Title (delivered Sept 5, for reference):** Build a few anchors that hold

**Short:** Build anchors that hold

### Phase 4

**Title (delivered Sept 5, for reference):** Shape the day around what matters

**Short:** Shape the day around you

---

## Destination: Energy

### Phase 1

**Title (delivered Sept 5, for reference):** Clear what's draining you

**Short:** Clear what's draining you

### Phase 2

**Title (delivered Sept 5, for reference):** Get some energy back

**Short:** Get some energy back

### Phase 3

**Title (delivered Sept 5, for reference):** Build a steadier baseline

**Short:** Build steadier energy

### Phase 4

**Title (delivered Sept 5, for reference):** Use your energy where you want it

**Short:** Use energy where it matters

---

> **EDITORIAL NOTE (not Jen's text). FIVE SHORTS ARE IDENTICAL TO THEIR TITLES. THAT IS
> BY DESIGN, NOT A COPY-PASTE ERROR.** Where a title is already short enough to carry the
> route strip and the map card, Jen repeats it rather than inventing a second phrasing of
> the same idea; two near-identical strings for one cell would read as a mistake to the
> user and would drift apart the first time either was edited. **Do not "fix" a duplicate,
> and do not collapse the two fields into one** — the other eleven cells differ, so the
> shape stays three-valued.
>
> The five, verified identical against `§display-strings` as delivered:
>
> | Cell | Title and short |
> |---|---|
> | Focus, phase 2 | Get some headroom back |
> | Calm, phase 3 | Make switching off easier |
> | Steadier days, phase 2 | Find your way back |
> | Energy, phase 1 | Clear what's draining you |
> | Energy, phase 2 | Get some energy back |
>
> **A test that asserts all 16 pairs differ will fail, and correctly so.** If slice 5 pins
> anything about this data, pin the five as expected duplicates rather than pinning
> distinctness.

---

# Part four, Sept 12 addition

<a id="protocol-copy"></a>

# 9. Recover and Refocus protocol copy

**Authored by:** Jen
**Approved by:** owner on delivery
**Date:** 2026-09-12

The twelve daily protocols that have carried build-and-test stand-ins since the
slice 3a re-tag: nine Recover and three Refocus, each a title, a daily action and a
why-it-works line. They replace the strings annotated `PLACEHOLDER [Jen]` in
`mobile/src/protocolEngine/protocolMatrix.ts`. Roadmap row 7i is the slice that
lands them.

**What they replace reads as spec, not as copy.** The stand-ins were draft actions
lifted from spec 6.2 and they name their own mechanics ("10-min extended exhale,
plus an afternoon device-free break"). The Remove phase's nine, approved in slices
3a and 3c-i, are the register benchmark these were written against.

**Same rule as the rest of this pack, reached by a different mechanism.** These are
APPROVED CONTENT. They enter the codebase without `COPY: draft` markers and the
copy-draft sentinel figure stays flat. For these twelve the sentinel does not
merely decline to increment: `protocolMatrix.ts` and `protocolEngine/types.ts` are
on that test's `OUT_OF_SCOPE` list
(`mobile/src/__tests__/copyDraftSentinel.test.ts:614`), because protocol content,
efficacy claims and why-it-works education are a separate review pipeline, Jen's
rather than the brand guidelines'. A slice landing these says in its commit message
that the strings came from this pack, and `EXPECTED_SENTINELS` does not move in
either direction.

> **EDITORIAL NOTE (not Jen's text). HOW THESE ROWS ARE KEYED, AND WHY NOT BY
> `variantKey`.** Jen delivered against the ordinals R1-R9 and F1-F3. Those follow
> source order in `PROTOCOL_MATRIX`: `recover` normal x3, then limited x3, then
> slammed x3, and `refocus` normal, limited, slammed. Confirmed by owner
> 2026-09-12, and corroborated by the two titles already quoted in the roadmap's
> supportingPracticeIds table (R7 "Lengthen the exhale", R9 "Get some morning
> light"), both of which land in `recover.slammed` under this ordering.
>
> **`variantKey` cannot key these rows, and is recorded as derived rather than as
> the key.** It is `${phase}-${capacity}-${timeClass}`, and a cell may hold several
> variants in one time class: R4, R5 and R6 all carry `recover-limited-medium`, and
> R7, R8 and R9 all carry `recover-slammed-short`. `types.ts:101` calls it "unique
> per variant"; that comment has been wrong since the 3b-ii-a reshape and is
> backlogged separately. **The key is ordinal + cell slot + current title.** Keying
> on `variantKey` alone would let R5's copy land on R4 silently.

> **EDITORIAL NOTE (not Jen's text). NO DURATION CHANGES.** Jen was asked whether
> any protocol needed a different `estMinutes` and supplied none. **Every existing
> duration stands**, and this section changes no number. The durations appear in
> the resolution table below for reference only; `estMinutes` is authored in
> `protocolMatrix.ts` and `timeClass` is derived from it
> (`protocolMatrix.ts:116`), never typed.
>
> **Her copy names no durations, and that is a change in kind.** Every stand-in
> carried its number in the text ("10-min", "One 25-min single-task block", "5 min
> on one thing"); none of hers does. The register is better for it, and the
> consequence is that `estMinutes` is no longer corroborated by the string the user
> reads. A future mismatch between the number the engine serves on and the action
> the copy describes will not be visible in the copy. Noted, not actioned.

> **EDITORIAL NOTE (not Jen's text). THREE TITLES SIT ONE LETTER FROM A BUILD
> FAILURE.** `brandCopyGuard.test.ts` scopes its journey-framework-word rule to the
> copy modules **plus `protocolMatrix.ts` explicitly** (`:301`), barring
> remove/recover/rewire/refocus from any user-facing string of 60 characters or
> fewer. R2 "Build a recovery anchor" and R8 "Use one recovery cue" pass only
> because the pattern is `\brecover\b`, which does not match "recovery"; F1
> "Protect one focus block" passes only because the barred word is "refocus", not
> "focus". **Do not edit these three titles toward the bare framework word.**

---

## Recover

### R1 - `recover.normal[0]`, replacing "Exhale and unplug"

**Title:** Downshift, then unplug

**Action:** Use a slower, longer exhale to bring the pace down, then take one part of the afternoon fully off-screen. Put the phone out of reach and let the break be a break.

**Why it works:** Slowing the breath can help you settle, and a real break gives your attention fewer demands to keep processing.

### R2 - `recover.normal[1]`, replacing "Three-step anchor"

**Title:** Build a recovery anchor

**Action:** Choose three small actions and do them in the same order when you need to reset. Water, a few slow breaths, a short walk. Keep the sequence simple enough to repeat.

**Why it works:** Repeating the same sequence reduces the decisions required to start recovering and makes the routine easier to return to.

### R3 - `recover.normal[2]`, replacing "Light, movement, steady wake"

**Title:** Set the morning signal

**Action:** Get outside soon after waking, move your body a little, and keep your wake time steady. The goal is a repeatable start, not a perfect morning.

**Why it works:** Daylight, movement, and a consistent wake time reinforce the cues that help your body know when to be alert and when to wind down.

### R4 - `recover.limited[0]`, replacing "Exhale and a break"

**Title:** Exhale, then step away

**Action:** Spend a few minutes slowing the exhale, then step away from screens or demands for a real break. Nothing to catch up on while you're there.

**Why it works:** Pairing a physical downshift with fewer incoming demands gives both body and attention a chance to reset.

### R5 - `recover.limited[1]`, replacing "Two-step anchor"

**Title:** Use a two-part reset

**Action:** Choose two small actions and repeat them in the same order when you need a reset. Water then a stretch. A few slow breaths then a walk. Keep it easy to start.

**Why it works:** A short, repeatable sequence gives you a reliable way to shift state without deciding what to do each time.

### R6 - `recover.limited[2]`, replacing "Light and steady wake"

**Title:** Start with light

**Action:** Get outside after you wake and spend a little time in daylight. Before bed, set tomorrow's wake time close to today's. That's enough for today.

**Why it works:** Morning light and a steadier wake time strengthen the daily timing cues that support energy and sleep.

### R7 - `recover.slammed[0]`, replacing "Five-minute exhale"

**Title:** Lengthen the exhale

**Action:** For a few minutes, let each exhale run a little longer than the inhale. Don't force a deep breath; just slow the pace.

**Why it works:** A longer exhale can help shift the body out of a keyed-up state without asking much from you.

### R8 - `recover.slammed[1]`, replacing "One anchor cue"

**Title:** Use one recovery cue

**Action:** Pick one small action and tie it to something that already happens every day. Step outside after coffee. Take a slow breath when you close the laptop. One cue is enough.

**Why it works:** Attaching a reset to an existing cue makes it easier to remember and easier to repeat when your capacity is low.

### R9 - `recover.slammed[2]`, replacing "Morning light"

**Title:** Get some morning light

**Action:** Step outside after you wake and spend a few minutes in daylight. That's the whole practice today.

**Why it works:** Morning daylight gives your body a clear daytime signal with almost no decision-making required.

---

## Refocus

### F1 - `refocus.normal[0]`, replacing "Deep work block"

**Title:** Protect one focus block

**Action:** Choose one thing that matters, close everything that doesn't serve it, and work on only that until the block ends. Then get away from the screen before you decide what's next.

**Why it works:** Removing task-switching gives your attention a better chance to stay with one problem long enough to make meaningful progress.

### F2 - `refocus.limited[0]`, replacing "Short focus block"

**Title:** Clear the lane

**Action:** Pick one task and give it your full attention for one short block. Close the extra tabs, silence the pings, and leave the rest alone until you're done.

**Why it works:** Reducing competing cues makes it easier to hold the task in mind and lowers the cost of switching.

### F3 - `refocus.slammed[0]`, replacing "One thing, five minutes"

**Title:** Give one thing a start

**Action:** Choose one task and work only on the first piece of it. Close the extra tabs and stop when the block ends, even if there's more to do.

**Why it works:** A small, defined start lowers the effort required to begin and gives scattered attention one place to land.

---

> **EDITORIAL NOTE (not Jen's text). THE RESOLUTION TABLE.** Ordinal to cell, with
> the stand-in each one replaces and the duration that stands unchanged.
> `variantKey` is derived and is **not unique**; see the keying note above.
>
> | # | Cell slot | Replaces | est | class | `variantKey` (derived, non-unique) |
> |---|---|---|---|---|---|
> | R1 | `recover.normal[0]` | Exhale and unplug | 15 | medium | `recover-normal-medium` |
> | R2 | `recover.normal[1]` | Three-step anchor | 10 | medium | `recover-normal-medium` |
> | R3 | `recover.normal[2]` | Light, movement, steady wake | 20 | long | `recover-normal-long` |
> | R4 | `recover.limited[0]` | Exhale and a break | 10 | medium | `recover-limited-medium` |
> | R5 | `recover.limited[1]` | Two-step anchor | 6 | medium | `recover-limited-medium` |
> | R6 | `recover.limited[2]` | Light and steady wake | 10 | medium | `recover-limited-medium` |
> | R7 | `recover.slammed[0]` | Five-minute exhale | 5 | short | `recover-slammed-short` |
> | R8 | `recover.slammed[1]` | One anchor cue | 2 | short | `recover-slammed-short` |
> | R9 | `recover.slammed[2]` | Morning light | 5 | short | `recover-slammed-short` |
> | F1 | `refocus.normal[0]` | Deep work block | 30 | long | `refocus-normal-long` |
> | F2 | `refocus.limited[0]` | Short focus block | 15 | medium | `refocus-limited-medium` |
> | F3 | `refocus.slammed[0]` | One thing, five minutes | 5 | short | `refocus-slammed-short` |

> **AMENDED 2026-09-12 (Jen), SAME DAY AS DELIVERY. TWO CHANGES, AND THE
> ORIGINAL ENTRIES ABOVE ARE LEFT UNEDITED.** Build R1's daily action and R7's
> `estMinutes` from this block, not from the entries above it.
>
> **1. R1's daily action, one phrase.** *"take one part of the afternoon fully
> off-screen"* becomes **"take one short break later today fully off-screen"**.
> Jen's reason: her original wording implied far longer than the 15-minute
> routing value the cell carries. The full amended action reads:
>
> > Use a slower, longer exhale to bring the pace down, then take one short break later today fully off-screen. Put the phone out of reach and let the break be a break.
>
> The title, the why-it-works line and `estMinutes: 15` are unchanged.
>
> **2. R7's `estMinutes` moves 5 -> 2.** The only duration change in the whole
> delivery; every other number in the table above stands. **It does NOT change
> R7's time class**, which stays `short` (bound is <= 5), so nothing re-slots and
> the destination matrix is unaffected.
>
> It follows from Jen's completion rule, locked the same day: **a completion
> practice may be LONGER than the protocol's estimated minimum, never SHORTER.**
> R7's supporting practice is `extended-exhale-2`, which is 2 minutes; against a
> 5-minute protocol that practice was shorter than the thing it was meant to
> satisfy. At 2 they are equal, which the rule permits.
>
> **R5 STAYS AT 6, AND THAT IS A DECISION RATHER THAN AN OMISSION.** Jen was
> reading the numbers as descriptive and proposed moving it; it was held back
> because **5 is a routing boundary**, and 6 -> 5 would re-slot R5 from `medium`
> to `short`, out of `recover.limited`'s medium set, breaking the destination
> matrix in section 11 below. **R9 stays at 5** likewise: a 10- or 20-minute
> light practice exceeding the protocol's stated minimum is intentional and is
> exactly what the completion rule allows.

---

# Part five, Sept 12 final answers

Jen's closing batch on the journey content questions. **Nothing from Jen is
outstanding after this part.**

<a id="phase-descriptors"></a>

# 10. Phase descriptors, and the collision that was not one

**Authored by:** Jen
**Approved by:** owner on delivery
**Date:** 2026-09-12

**THE COLLISION WAS A FALSE PREMISE, AND THIS SECTION EXISTS SO IT IS NOT
REDISCOVERED.** The roadmap recorded a head-on conflict between Jen's four phase
labels and `PHASE_DISPLAY`'s sixteen per-(phase, destination) titles and shorts,
and set out three possible readings: the labels REPLACE the cell copy on the map
rows, phase page titles and Today eyebrow; they SIT ABOVE it; or they FILL GAPS
only.

**None of the three applies.** The two sets were never competing for the same
surfaces.

| | The sixteen | The four |
|---|---|---|
| What they are | per-(phase, destination) `title`, `short`, `gloss` | phase DESCRIPTORS |
| Where they render | **map rows, phase page titles, the Today eyebrow** | onboarding education, transition content, explanatory surfaces |
| The question they answer | "what is this person working on right now" | "what is this stretch of the journey FOR" |

**THE SIXTEEN REMAIN AUTHORITATIVE** on the map rows, the phase page titles and
the Today journey eyebrow. Nothing is retired, nothing is demoted.

**THE FOUR ARE USED ONLY WHEN VARA EXPLAINS THE JOURNEY MODEL ITSELF:**

| Phase | Descriptor |
|---|---|
| Remove | Create space |
| Recover | Restore capacity |
| Rewire | Build new patterns |
| Refocus | Focus on what matters |

**THREE THINGS THEY ARE NOT**, stated because each was proposed and rejected:

1. **Not fallback labels.** They do not stand in when a cell string is missing.
2. **Not a line above the cell copy.** No map row, phase page or eyebrow gains a
   second line, and the Today journey line stays two lines, which is what §9 R6
   and §8's three-card ceiling assume.
3. **Not a layout change of any kind.** No surface changes shape for this.

**SO THERE IS NO BUILD IN THE LABELS THEMSELVES.** The four descriptors are
content held for explanatory surfaces, and the surfaces that would use them are
onboarding education and transition content, which are their own work.

> **EDITORIAL NOTE (not Jen's text).** The four SHORT variants delivered
> alongside these on 2026-09-12 (Create space / Restore / New patterns / Focus)
> belong to the same descriptor set and inherit this usage rule. **Remove's short
> form is intentionally identical to its full form** and that is recorded
> separately; it is not an oversight. The rename of the tab and map screen is a
> SEPARATE matter from these four labels and is still a real build - see the
> roadmap board.

<a id="destination-weighting"></a>

# 11. Destination weighting for Recover

**Authored by:** Jen
**Approved by:** owner on delivery
**Date:** 2026-09-12

**THE INSTRUCTION FIRST, BECAUSE IT RULES OUT THE OBVIOUS SHORTCUT: do not
re-spread durations to manufacture reachability.** The two axes answer different
questions and must not be used to do each other's work:

- **Time** answers *"what can this person do with the time they have."*
- **Destination** answers *"which version of this fits why they are here."*

Moving an `estMinutes` value to make a variant reachable corrupts the first
answer to fix the second.

**THREE RECOVER FAMILIES, ACROSS ALL THREE CAPACITIES:** downshift/break,
anchor/routine, light/day-rhythm.

| Destination | Normal | Limited | Slammed |
|---|---|---|---|
| **Calm** | R1 | R4 | R7 |
| **Focus** | R1 | R4 | R7 |
| **Routines** | R2 | R5 | R8 |
| **Energy** | R3 | R6 | R9 |

**CALM AND FOCUS SHARE A PATHWAY DELIBERATELY. This is intentional and is not an
oversight.** There are three mechanisms and four destinations. Inventing a fourth
mechanism so every destination could have its own would be worse product design
than letting two destinations that both want the nervous system to come down
share the one that does it.

**WEIGHTING, NOT A PERMANENT HARD LOCK.** Deterministic selection is fine for the
slice that builds this, but the architecture must not foreclose later rotation or
adaptation. A variant that is not the weighted lead for a destination must remain
servable, not filtered out.

> **EDITORIAL NOTE (not Jen's text). THE ENGINE ALREADY WORKS THIS WAY, so her
> constraint costs nothing.** `orderForDestination` (`selectProtocol.ts:55`)
> sorts by `destinationWeight` and **orders, never filters**; the type comment at
> `types.ts:162-169` already states the reason: "Filtering a cell by destination
> could empty it, and an empty cell has no protocol to serve. Ordering cannot
> fail." So the table above is delivered as WEIGHTS on variants that all stay in
> the cell, and rotation remains open by construction. **No architecture change
> is needed to honour this**, only values.

# Vara — Intent-Shaped Onboarding Paths
**Version 1.0 | April 2026 | Four paths covering seven Intent Capture selections**

---

## Purpose

After completing onboarding's Promise screen, users land on a personalized "first-week shaping" screen that explains how Vara will be tuned to their stated intent. This screen is the bridge between onboarding (generic) and daily use (personalized).

This document defines:
- The four personalization paths
- How the seven Intent Capture selections map to the four paths
- Full content for each path (headline, body, starter Learning, CTA, and first-week shaping behavior)
- The behavioral logic for how each path shapes the user's first-week experience

---

## The four paths and their mapping

| Intent Capture selection | Path |
|---|---|
| I get overwhelmed easily and stay there too long | **Down-regulation** |
| I react instead of respond | **Down-regulation** |
| I can't wind down, even at night | **Sleep** |
| My focus is scattered, my mind won't settle | **Activation** |
| I'm running on empty most days | **Activation** |
| I want to understand how my brain works | **Default / Curious** |
| Just exploring | **Default / Curious** |

### Why the mapping works this way

The mapping groups intents by what first-week experience best serves them:

**Down-regulation** serves users whose core need is to get out of Wired and into Steady. Whether they describe it as "overwhelm" or "reactivity," the underlying mechanism is sympathetic dominance and the intervention is the same: parasympathetic activation. Shaping the first week around Cyclic Sighing, Sensory Reset, and Extended Exhale gives both types of user the same high-value early experience.

**Sleep** stands alone because the shaping is temporally different (evening focus) and the protocol priority is different (NSDR, wind-down coherence breathing). Someone who says "I can't wind down" is telling Vara that evening is their highest-stakes window.

**Activation** serves users whose core need is to lift out of Foggy into Steady or Clear. "Running on empty" and "scattered focus" both describe cognitive fatigue — different surface symptoms of the same underlying state. Shaping around Brief Movement and Bright Light Exposure fits both.

**Default / Curious** serves users who either want to understand Vara first (educational posture) or haven't decided what they're working on yet. For both, the right first week is unshaped — learn the loop, explore the protocols, let patterns surface organically over the first 7 days. No biasing of recommendations.

### Why not collapse further to three paths

A three-path model would merge Default into one of the other paths, but that's worse than four. Users who say "just exploring" haven't opted into any particular shaping — defaulting them into Down-regulation (the most common path) assumes too much. The Default path is the honest answer for users who haven't told Vara what to optimize for.

---

## Path 1 — Down-regulation

**Maps from:** "I get overwhelmed easily and stay there too long" OR "I react instead of respond"

### On-screen content

**Label:** BASED ON WHAT YOU TOLD US

**Headline:** Your first week is shaped for settling.

**Body:** We'll prioritize down-regulation protocols — Cyclic Sighing, Sensory Reset, and Extended Exhale — and surface Wired-focused insights in your Patterns. These are the interventions with the strongest research backing for your intent.

**Starter Learning card label:** STARTER LEARNING

**Starter Learning title:** Why overwhelm sticks

**Starter Learning body:** When your sympathetic nervous system activates — the "on" switch — it takes active regulation to return to baseline, not just the passage of time. Vara shortens that window with the protocols your brain responds to fastest.

**CTA:** See your Today

### First-week shaping behavior

- **Protocol recommendations** weight Cyclic Sighing, Sensory Reset, and Extended Exhale 2x more heavily than other protocols for the first 7 days
- **Variety logic** still applies — the user won't see the same protocol every day — but the rotation is biased toward the down-regulation set
- **Patterns surfacing** emphasizes Wired triggers: "Most Wired time: [pattern]," "Fastest Wired → Steady protocol: [protocol]"
- **Check-in prompt default time** stays at the user's selected morning time, no evening bias
- **Overwhelm Safety Card** (from Today flow 4) surfaces on day 2 if the user has checked in Wired twice in a row — earlier than the default threshold, because this user profile is more likely to benefit

### Notes for implementation

- After 7 days, the path bias fades — the algorithm starts using the user's actual response data rather than intent-based priors. This is important: the Intent Capture is a prior, not a permanent profile.
- The starter Learning is inserted as the user's second unlocked Learning (the first is from onboarding — "Long exhales activate recovery"). It appears in the Patterns tab tagged with the unlock date.

---

## Path 2 — Sleep

**Maps from:** "I can't wind down, even at night"

### On-screen content

**Label:** BASED ON WHAT YOU TOLD US

**Headline:** Your first week is shaped for wind-down.

**Body:** Evening check-ins will prioritize NSDR, Extended Exhale, and Coherence Breathing. Pattern surfacing will focus on how your evening state predicts sleep quality. The Evening wind-down routine template is ready if you want to try it.

**Starter Learning card label:** STARTER LEARNING

**Starter Learning title:** Why winding down is hard

**Starter Learning body:** Sleep requires a parasympathetic shift — your nervous system moving from "on" to "off." A wired evening keeps that shift from happening. Recovery practice in the evening is sleep practice.

**CTA:** See your Today

### First-week shaping behavior

- **Protocol recommendations** weight NSDR 3x more heavily on evening check-ins (after 6pm), Extended Exhale and Coherence Breathing 2x
- **Daytime check-in behavior** is unshaped — daytime protocol recommendations follow the default algorithm
- **Patterns surfacing** emphasizes the evening-to-sleep connection: "Your evening state on nights you slept well: [most common]"
- **Evening wind-down routine template** is surfaced on the user's Today screen on day 1 as a pre-adopted recommendation — if the user taps, the routine is added to their active routines
- **Notification default** adds an evening check-in reminder at a user-selected time (30 min before their typical bedtime)

### Notes for implementation

- The Evening wind-down routine template already exists in the routines library. The sleep path doesn't create a new routine — it just surfaces the existing one more prominently.
- "Sleep tracking" is NOT part of this path at launch. Vara doesn't track sleep directly (no HealthKit integration at launch). If users ask, the coach explains that the pattern is "evening state → next-day state" not "evening state → sleep metrics."

---

## Path 3 — Activation

**Maps from:** "My focus is scattered, my mind won't settle" OR "I'm running on empty most days"

### On-screen content

**Label:** BASED ON WHAT YOU TOLD US

**Headline:** Your first week is shaped for lift.

**Body:** We'll prioritize activation protocols — Brief Movement, Bright Light Exposure, and Cold Water Reset — and surface Foggy-focused insights in your Patterns. Activation isn't about pushing harder. It's about shifting your physiology so focus becomes available.

**Starter Learning card label:** STARTER LEARNING

**Starter Learning title:** Foggy isn't a focus problem

**Starter Learning body:** When you're Foggy, your brain's executive function has temporarily dropped. Forcing focus in this state burns capacity without output. The protocols that work here change your physiology first — movement, light, cold — then attention returns on its own.

**CTA:** See your Today

### First-week shaping behavior

- **Protocol recommendations** weight Brief Movement, Bright Light Exposure, and Cold Water Reset 2x more heavily; NSDR gets 1.5x weight for afternoon Foggy specifically (when fog is from cognitive overwork)
- **Patterns surfacing** emphasizes Foggy triggers and recoveries: "Most Foggy time: [pattern]," "Fastest Foggy → Steady protocol: [protocol]"
- **Focused Work Window surfacing** is delayed until day 5+ — this path's user doesn't benefit from being offered deep-work protocols before they've learned to recognize Clear states
- **Mid-afternoon check-in prompt** is added as an optional notification at a time the user selects (default 2pm) — this path tends to correlate with afternoon slumps

### Notes for implementation

- The "Foggy isn't a focus problem" Learning is the single highest-value piece of education in the first week for this user profile. Users in Foggy states who try to force focus are the ones most likely to churn because the app "doesn't work" — this Learning reframes that experience.
- The path specifically includes "I'm running on empty most days" because research on cognitive fatigue shows activation protocols (movement, light) outperform rest protocols (NSDR alone) for this profile — unless the fog is specifically post-overwork, in which case rest wins. The algorithm differentiates based on time of day and recent session history.

---

## Path 4 — Default / Curious

**Maps from:** "I want to understand how my brain works" OR "Just exploring"

### On-screen content

**Label:** BASED ON WHAT YOU TOLD US

**Headline:** Your first week is shaped for exploration.

**Body:** We'll give you a balanced first week — a mix of protocols across different states, so you can feel what works for your brain. Your patterns surface organically as data accumulates, without Vara biasing what we show you.

**Starter Learning card label:** STARTER LEARNING

**Starter Learning title:** How Vara learns your patterns

**Starter Learning body:** Each time you check in and complete a protocol, Vara compares your state before and after. Over time, the protocols that consistently shift you become the ones we recommend first. The system learns what works for your brain specifically, not what works for people in general.

**CTA:** See your Today

### First-week shaping behavior

- **Protocol recommendations** use the default variety algorithm with no state bias — every state gets balanced recommendations
- **Patterns surfacing** surfaces whatever emerges first — no emphasis on Wired or Foggy or Clear specifically
- **Protocol Detail screens** are lightly surfaced via a "Learn about this protocol" prompt after the first 3 completions, because this path's users have stated interest in understanding
- **The default algorithm** applies from day 1 — no special path bias

### Notes for implementation

- This is the closest thing to an "unshaped" experience. It's what Vara would be without Intent Capture. The one subtle difference is that users on this path get slightly more exposure to the Brain Health Learnings content because their stated intent is curiosity.
- "Understand how my brain works" and "Just exploring" are genuinely different user mindsets (one wants education, one is tire-kicking), but at launch they get the same first-week shaping. Post-launch analytics may justify splitting them — the education-seeker may benefit from more proactive Learning surfacing.

---

## Shared structural elements

All four paths render on the same screen template (see end-to-end flow map PATH_01, PATH_02, PATH_03). The template has these fixed elements:

1. Back affordance to the previous onboarding screen (Promise)
2. Label (always uppercase tracked): "BASED ON WHAT YOU TOLD US"
3. Headline (one sentence, bold, teal-dark)
4. Body copy (3–4 sentences, charcoal, descriptive)
5. Label: "STARTER LEARNING"
6. Starter Learning card (sage background, left teal accent, title + body)
7. Primary CTA: "See your Today"

The only variable content per path is the headline, body, starter Learning title, and starter Learning body. The structural chrome is identical across paths. This is intentional — it keeps the personalization feeling intentional rather than chaotic.

---

## What happens after the path screen

Once the user taps "See your Today," they land on the Today screen populated with:
- Their first check-in from onboarding (already there)
- The first Learning from onboarding ("Long exhales activate recovery")
- The starter Learning from their path (inserted as the second Learning)
- Any path-specific defaults (e.g., Evening wind-down routine suggestion for Sleep path)

From this point on, the path shapes recommendations and pattern surfacing for 7 days, then fades as real user data takes over.

---

## A note on intent data persistence

The Intent Capture selections are stored on the user's profile and are accessible to:
- The recommendation algorithm (for first-week biasing)
- The Coach (V) — so responses can reference what the user said they wanted
- Patterns pattern-matching (to frame insights in the user's own language — "you said you get overwhelmed; here's how often that's happening")

The intent data is NOT:
- Surfaced on any user-facing screen as "your goal is X" — that feels like Vara is monitoring them
- Used to trigger re-prompting ("You said you wanted X — have you tried Y?")
- Shared with community or any other user

After the first 7 days of shaping, the intent data is still retained but its weight in recommendations drops significantly. Users can update their intent in Settings if they want — the mechanism for this can be a simple "What brought you here?" preference that reopens the Intent Capture flow with current selections highlighted.

---

## Edge cases

### User selects zero intents
Intent Capture requires at least one selection to continue. If a user somehow skips (e.g., via accessibility flows or edge navigation), default to Path 4 — Default / Curious.

### User selects intents across multiple paths
A user might select both "I get overwhelmed" (Down-regulation) and "I can't wind down" (Sleep). In this case, the primary path is Sleep (the more temporally specific intent), with Down-regulation protocols boosted during daytime check-ins. The path screen shown is the Sleep path.

Logic priority when multiple paths are selected:
1. Sleep (if "can't wind down" is selected)
2. Down-regulation (if no sleep intent but overwhelm/reactivity selected)
3. Activation (if no sleep/regulation intents but focus/empty selected)
4. Default (otherwise)

### User selects all seven intents
Treat as Default — the user hasn't signaled a specific priority. The path screen shown is the Default path.

---

## Implementation notes for the dev team

### Path calculation
Compute the path at the end of Intent Capture, store it on the user profile, and pass it to the recommendation algorithm. Path is a single enum field: `DOWN_REGULATION | SLEEP | ACTIVATION | DEFAULT`.

### Path decay
Implement a simple linear decay — day 1 has full weighting, day 7 has minimal (0.2x) weighting, day 8+ has no weighting. After day 7, the path still exists on the profile but doesn't affect recommendations.

### Surfacing starter Learnings
The starter Learning is inserted via the same system that inserts any unlocked Learning. The difference is that it's inserted immediately on path completion, not after accumulated data. Tag it internally as "path-seeded" so the analytics team can distinguish data-driven Learnings from seeded ones.

### Copy versioning
If any path copy changes post-launch, update the content via the CMS used for Learnings and in-app copy. Path copy should be editable without requiring an app release.

---

## What this document explicitly does NOT do

This document is content and behavioral logic. It does not:
- Specify the UI layout of the path screens (that's in the end-to-end flow map)
- Specify the recommendation algorithm details (that's in the Brain State Model)
- Define the mapping between Intent Capture UI copy and path internals (the mapping table at the top is that specification, but the UI team may want to adjust Intent Capture copy separately)
- Cover post-launch intent adjustments via Settings (a small follow-up spec)

---

*Version 1.0 | April 2026 | Ready for implementation*

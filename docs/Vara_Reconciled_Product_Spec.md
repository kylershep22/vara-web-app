# Vara — Reconciled Product Spec
**Version 1.7 | August 2026 | Single source of truth**
*(v1.7: SA-key rotation resolved + pre-launch security tracking added (laptop cleanup, role-narrowing open). v1.6: slice 4 shipped, open item #10 tracked. v1.5: slices 1/2/3a shipped, 3b deferred post-launch. v1.4: org-ID invariant. v1.3: diagnostic reconciliation.)*

This document collapses two prior specs into one: **Vara's Refactor Plan** (the outcomes-led four-pillar build) and **Jen's Product Spec v1.0** (the weekly-capacity engine produced by Jen's Claude on Jul 30). Where they conflicted, this doc resolves it. Where the resolution created a new decision, it's recorded here with the reasoning.

**Supersedes** the daily-check-in spine sections of the Refactor Plan and the greenfield framing of Jen's spec. Both remain useful as history; neither is the build target anymore. This is.

**Owner:** Kyle (build) + Jen (framework, voice, final copy).

**Status tags used below:**
- **[Survives]** already built in Vara; kept, may be re-housed
- **[Demoted]** built, but no longer the driver; reduced role or retired
- **[New]** net-new build
- **[Confirm]** recommended resolution that still needs an explicit Kyle/Jen sign-off
- **[Jen]** copy or content Jen owns; do not invent

---

## 0. How to use this document

This spec defines **structure, logic, and data model.** It does **not** define final user-facing copy. Every user-facing string here is a placeholder for build and test only, marked **[Jen]**. Do not ship placeholder copy. If a screen needs a string that isn't specified, flag it as a gap; do not invent it.

**First build step, before any code:** a read-only Step-0 diagnostic confirming the *actual* current state of the app against the "[Survives]/[Demoted]" claims in Section 3. This doc is written against Vara's known state, but that snapshot may have drifted, and the reconciliation depends on what's really there. Verify before asserting.

---

## 1. The four locked decisions

These were decided directly and are not open. Everything downstream resolves against them.

**D1 — Weekly spine, dynamic in-week.** The unit of planning is the **week**, not the day. A weekly open sets outcome + capacity and generates one protocol that lives on the Today screen all week. The **weekly forecast is the anchor**; the in-week control is an **exception handler**, not a daily ritual. The user can adjust capacity **either direction, any time**, and it's safe in both because of the continuity rule below.

**D2 — Blended voice.** **Jen's voice governs the relationship and the altitude:** a sharp coach who treats the user as capable and high-agency. **Vara's voice governs the register and the floor:** calm, unhurried, never pressuring, never shaming. Jen sets *who's talking and how they regard the user*; Vara sets *the emotional temperature and the guardrails.* (Concrete rules in Section 4.)

**D3 — Softened focus guards.** Default to one active outcome, but **educate, never block.** A user who wants to add a second outcome or switch their primary is lightly informed of best practice, then allowed to proceed. Continuity is tracked **per outcome.** Both guards are instrumented so the beta tells us empirically whether either was worth keeping. (Detail in Section 10.)

**D4 — Org/roster model, pre-launch.** The B2B2C wedge (coach licensing, corporate cohorts) is a primary revenue path, not a fast-follow, and its schema plus access-control rules must ship pre-launch even with zero org users. **Member privacy is the precondition:** an org member's individual data is as private from their coach or employer as a stranger's. (Full model in Section 17.)

**The continuity rule that makes D1 safe:** **continuity is measured against the user's floor commitment, never against the current capacity tier.** Raising or lowering capacity changes what the app *offers* that week, but it can never move the line that defines "unbroken." That's what lets upshift and downshift both be free: you cannot upshift yourself into a fresh failure, because the line that counts never moves.

---

## 2. Product principles (blended, in priority order)

When a tradeoff comes up, resolve against this list top-down.

1. **The system reduces its own demand as capacity drops.** Under sustained stress, prefrontal control weakens and behavior goes habitual. Asking a depleted user to plan, prioritize, or exert willpower is asking the wrong system. Scale down, never guilt.
2. **One screen, one action.** The user never faces a list of pending obligations.
3. **Continuity beats intensity.** Three weeks at floor, then a return, is success. The product must say so.
4. **Education follows action; it never gates it.** Video is consumption, habits are doing. Never block a tool behind a video. *(This was already Vara's independent call; both specs agree.)*
5. **One variable at a time.** The app never asks the user to change more than one thing per week.
6. **Never shame.** No streak-loss penalties, no "you missed 3 days," no red states, no guilt notifications. Not softened shame; none.
7. **Anti-surveillance.** Outcomes are felt / self-reported. No daily scores, no metrics dashboards, no performance framing. Reflection is required; measurement-as-judgment is banned.
8. **Every string sounds like a person said it out loud.** No wellness clichés, no abstract imagery, no em dashes in user-facing copy.

---

## 3. Reconciliation map — what survives, what's demoted, what's new

This is the heart of the reconciliation. It maps Jen's structure onto Vara's real current state.

### Survives (keep; may be re-housed)
| Asset | Reconciled role |
|---|---|
| **Community** (built; report ✓, but "block" is actually **mute + hide-post**, not true block — see Section 15) | Becomes the 4th nav tab. Structured weekly ritual added (Section 15). **True block is a build item, not a survivor** (Apple UGC 1.2 gate). |
| **Video infrastructure** (expo-video 3.0.16, VideoPlayerModal + media/VideoPlayer, dev harness; note expo-av 16.0.8 still installed — leftover) | Powers the education-follows-action video triggers (Section 12). |
| **Notification correctness fixes + per-habit reminder infra** | Retained, but re-scoped to the weekly model's tight limit (Section 16). |
| **Focus Rhythms** (self-report "when do you focus best") | Upgraded from self-report to **derived** energy window (Section 11). The Layer 1/2 plumbing partially survives; the input method changes. |
| **Habit categories** (nine lay-language options → pillar + focusDemand) | Re-mapped onto the four **outcomes** (Section 5). |
| **Focus Timer card** | Survives; gains the mandatory post-block recovery beat (Section 12). |
| **Design system + tokens** (Evergreen Teal, Mist White, etc.) | Survives whole. |
| **Voice v2.2 rules** | Survive as the **Vara half** of the blended voice (Section 4). |
| **Firebase / Firestore / RevenueCat / auth / subscription** | Survives; entitlement logic extended for org membership (Section 17). |

### Demoted or retired
| Asset | What happens |
|---|---|
| **Daily Situation + State check-in as the loop driver** | **Retired as the driver.** The daily loop is now the weekly protocol's Today action, not a daily mood read. |
| **The 24-cell Situation×State dependency map** | **Retired.** It was built against the daily engine. The affective *vocabulary* survives narrowly (below). |
| **State model (Tense/Activated/Depleted/Calm)** | **Correction from diagnostic:** the quadrant vocabulary is used *nowhere* as a practice/content tag today — it lives only inside the engine and check-in flow. So the state-based Practices filter is **net-new**, not a survivor. Existing content taxonomies are ProtocolBrowseCategory (regulate/rest/fuel), ProtocolPillar/Modality/Family, HabitCategoryKey — the outcome filter maps onto those; the state filter is built fresh. Final state labels are **[Jen]**. |
| **Five-tab pillar IA** (Home/Focus/Energy/Time/Community) | Collapses to four tabs: Today / Practices / Learn / Community (Section 5). **Good news from diagnostic:** the IA is flag-gated (`FOUR_PILLAR_IA`), with a legacy navigator already behind the flag — the collapse is closer to a navigator swap than open-heart surgery. Locked. |
| **"Time" and pillar-per-tab framing** | "Routines" becomes an outcome filter, not a tab. |

> **Demotion cost — quantified by the diagnostic.** Removing the Situation×State engine as the daily driver touches ~45 source files, 4 nav routes, and 2 Firestore collections. Home breaks immediately (it derives its entire primary surface from `dashboardPhase`, which is just "does today's check-in doc exist"). Two awkward edges: (a) `suggestedAction.ts` pulls `isEvening`/`practicesForDirection` from the engine barrel for a Home card that has nothing to do with the check-in, so it needs its own time-of-day helper; and (b) **the live `ONBOARDING_V2` arc (9 screens) depends on the engine** — it cannot be ripped out until the new progressive onboarding (Section 18) replaces it. **This sequences the work: build the new onboarding + weekly engine first, demote the daily engine last.** The engine is pure (no React/Firebase/clock), which makes the surviving helpers cheap to extract.

### Net-new build
Weekly engine (open + protocol matrix + Today home), capacity modes, floor commitment, dynamic in-week re-set, weekly close, continuity-against-floor, derived energy window, week-1 quick-win rule, anti-goals, progressive onboarding, AI Coach re-architecture, org/roster schema + rules + rollups + entitlement, stage-to-app bridge, instrumentation suite.

---

## 4. Blended voice — made concrete

The division from D2, operationalized so it's a rule and not a feeling.

**Jen governs (relationship + altitude):**
- The user is capable, high-agency, the operator of their own life. Address them that way.
- A coach asks before advising. One question before any recommendation. Real coaches ask; most bots over-advise.
- Conviction is allowed. The capacity-not-discipline argument can be stated out loud, in a calm register.

**Vara governs (register + floor):**
- Calm, unhurried, specific. Body-located and concrete over abstract ("a slower exhale," not "a calming practice").
- Never pressuring, never shaming, no urgency, no hype, no accumulation mechanics.
- Conditional claims on anything that asserts an effect ("designed to support," "can help"). Plain declarative everywhere else.
- No em dashes in user-facing copy. Coral (#D97A6E) for genuine errors only; no red anywhere else.

**The identity-reinforcement mechanic (from the working session), reconciled.** Identity reinforcement is real and welcome, but it runs through Vara's proportionate-acknowledgment rule: **tied to the specific action, never generic, never accumulating, never anticipated.**
- On-voice: *[Jen]* "You closed the laptop before dinner three days this week. That's the routine taking hold."
- Off-voice, do not ship: "You're crushing it, CEO." / generic praise that sounds the same every time.

**Banned language (union of both specs):** "optimization" / "brain optimization windows"; "attention is your currency/asset"; "high performer," "ambitious," "sustainable high-performance," "cognitive function/performance," "show up at full capacity"; leading with "burnout"; positioning as "wellness"; the retired five brain-state words as product vocabulary. Note this means the Brand One-Pager's "calm wellness app" and "high performers who run hot" descriptors are retired; the calm-capacity idea underneath survives, the labels don't.

**Copy rule:** all final user-facing copy is **[Jen]**. This doc's strings are placeholders.

---

## 5. Information architecture (LOCKED)

The weekly spine pulls hard toward Jen's IA, because a weekly protocol that lives on a dashboard requires that dashboard to be the default tab, and matching nav to the weekly question's vocabulary means users learn one mental model instead of two.

**Bottom nav (4 tabs):**
- **Today** — the active protocol, today's action, the dynamic control. Every cold start and notification tap resolves here.
- **Practices** — one library, filtered by the four outcomes. Default filter = the user's active outcome. Also filterable by current state (the demoted affective vocabulary).
- **Learn** — long-form: podcast, masterclasses, deep-dive video. Jen's IP gets a real home instead of being scattered.
- **Community** — the existing build.

**Hamburger (top-left):** Insights, Settings, Profile. Nothing load-bearing.

**Beta override:** with ~10 testers a visibly empty Community tab reads as a dead product. Behind `community_enabled` (default false during beta), the 4th tab renders **Insights** until a group has ≥8 active members.

**Taxonomy — LOCKED.** The four outcomes are **Focus / Stress / Routines / Energy**, used as the single vocabulary across the weekly question, the Practices filters, and content tags. Community lives as a tab only, never as an outcome. "Time" becomes "Routines." The Stress/Energy overlap Jen flagged on the recording is resolved by keeping them distinct: the *tools* differ (breathwork, humming, and nervous-system regulation are Stress; light, movement, and sleep are Energy) even where the felt state overlaps, and giving stress-recovery tools their own outcome is the entire reason the four-outcome taxonomy beats the old two-tab split. This vocabulary now appears everywhere and is fixed; do not introduce a second set of category names.

---

## 6. The weekly engine [New]

### 6.1 Weekly open
Triggered on the user's chosen week-start day (any day, not just Sun/Mon — shift and healthcare workers genuinely start midweek), or first app open of a new week.

1. **Outcome** [Jen: "What's your focus this week?"] — the four outcomes, one selectable.
2. **Capacity** [Jen: "What's your capacity this week?"] — `normal` (full time and resources) / `limited` / `slammed` (minimal).
3. **Calendar forecast** (one tap, optional) — glance at the week ahead before confirming. This is the mechanic that moves the capacity decision to a resourced brain.

### 6.2 Protocol matrix — 4 outcomes × 3 capacities = 12
Each protocol object:
```
protocol { id, outcome, capacity, name[Jen], daily_action[Jen], est_minutes,
           why_it_works[Jen] (defensible to a clinical audience),
           quick_win_practice, supporting_practices[] }
```
Draft daily actions (starting point; final content **[Jen]**):
- **Focus** — normal: one 25-min single-task block + device-free break / limited: one 15-min block / slammed: 5 min on one thing, every other tab closed.
- **Stress** — normal: 10-min extended exhale + afternoon device-free break / limited: 5-min exhale + break / slammed: 5-min exhale.
- **Routines** — normal: one 3-step anchor routine, same order daily / limited: 2-step anchor / slammed: one anchor cue at the same time daily.
- **Energy** — normal: morning light within 30 min of waking + movement + consistent wake time / limited: light + consistent wake / slammed: morning light only.

### 6.3 Week-1 quick-win rule
Time-to-felt-effect varies enormously (exhale/light = minutes; routines = weeks). A user who picks Routines has no felt payoff for two weeks — the worst retention curve there is. So **every week-1 protocol appends one same-session physical practice** (default: 90-second extended exhale) regardless of outcome. Get the nervous system to prove the app works before the calendar has to. Drop it from week 2 unless the user pins it.

---

## 7. Dynamic in-week control [New]

Persistent control on the Today screen [Jen: "This week changed"]. This is the exception handler, not the daily ritual.

- **Both directions, one tap, no confirmation dialog.** Down-tier re-serves the same outcome at the next capacity down; up-tier the next capacity up.
- **Continuity untouched, either way** — because continuity is measured against the floor commitment, not the current tier (Section 1). Upshift can add to the day; it cannot create a new failure line.
- Slammed users tapping down are shown their **floor commitment.**
- Copy frames it as the system working correctly, because it is. **[Jen]**
- Log every event (`downshift_event` / `upshift_event`) with from/to tier and timestamp.
- **Atomicity (build constraint, from slice 5).** A re-set performs two writes — `createDownshiftEvent` and `updateWeeklyCycle({capacityCurrent})` — and they must be **atomic**, or the event log and the cycle's current tier can disagree about what capacity the user is on. A `writeBatch` (both writes, one commit) is sufficient when the from-tier is taken from the already-loaded cycle; a `runTransaction` is only needed if the new tier must be re-derived from the stored `capacityCurrent` to guard against concurrent re-sets, which is unlikely for a single-user app. If the two ever diverge, `capacityCurrent` on the weekly cycle is **authoritative** for the current tier and `downshiftEvents` is the append-only trail, not the other way around. The slice-5 primitives are correct as separate calls; it is the *composition* in the re-set slice that must batch them.

**Guardrail against re-inventing the daily check-in:** the weekly forecast stays the anchor. Instrument re-set frequency. If people are re-setting daily, the forecast isn't doing its job and we'll know it rather than guess — but the fix is a better weekly open, not a daily mood questionnaire.

---

## 8. The weekly close [New]

Triggered end of week. Target under 90 seconds. This is the Executive Coach mechanic: a coach reviews, doesn't just assign.

1. **What held** — days completed, shown as a **count**, never a percentage or grade.
2. **Three ratings** — focus / recovery / energy, 1–5, one tap each. Weekly, never daily.
3. **One question** [Jen: what the load was like on the days it didn't happen] — free text, skippable. The highest-value qualitative data in the product.
4. **One adjustment** — the app offers exactly one change for next week. Hard-enforced in the UI.
5. Optional: post commitment to group (Section 15).

**Consolidation rule:** open and close are the same ritual family. Do not build two competing weekly touchpoints plus a passive summary email. The in-app close is canonical; email is a short teaser that deep-links back, never the full summary (or engagement leaves the product). Suppress the debrief entirely when there's no data — an empty report is the loudest "this isn't working" signal there is; show a re-entry prompt instead.

---

## 9. Today screen [New — highest-traffic screen, design first]

Above the fold, in order:
1. Today's single action from the active protocol, one line, large primary button.
2. Completion state — binary, done / not yet. Not a percentage.
3. The daily energy ping, if one is due (Section 11).
4. The "This week changed" control — always visible.

Below the fold: this week's protocol summary (outcome + capacity, collapsed); continuity indicator (count of unbroken weeks, slammed weeks counting fully); floor commitment, shown when capacity = slammed or a downshift has fired; AI Coach entry, badged only when it has something to say.

**Never on this screen:** streak fire, badges, points, leaderboards, other users' activity, percentages, grades, anything red, a second CTA, or a permanent chat icon (it competes with the day's action and invites open-ended browsing).

---

## 10. Floor commitment + the softened focus guards [New]

### 10.1 Floor commitment
One free-text line, written during onboarding while the user is calm: [Jen: name the one thing you'll do even on your worst week]. Max ~100 chars. Stored as `user.floor_commitment`. Surfaces on Today whenever capacity = slammed or after a downshift. This is the ownership fix: an app-assigned protocol has no ownership; a line in the user's own words does.

### 10.2 The softened guards (D3)
Two mechanics were fused in the original spec's "6-cycle lock." They do different jobs and get different, lighter treatment:

- **Many-outcomes-at-once (overwhelm).** Default to one active outcome. If a user wants a second, let them through a single informing tap: [Jen: "most people get further holding one focus at a time — add a second anyway?"]. **Proceed either way.** Continuity tracked per outcome.
- **Ping-ponging the primary (no momentum).** A light guard, not a lock: [Jen: "you've been on Focus two weeks — switching resets the momentum you're building, sure?"]. **Proceed either way.**

Instrument both. If neither guard changes behavior in beta, drop them.

### 10.3 Anti-goals
Two things the user is explicitly *not* attempting this quarter. Removes the guilt backlog that drives abandonment. Fed to the AI Coach as a **hard never-suggest constraint** (Section 13). Better asked at week 2 than onboarding — "what won't I do" is too abstract before they've used the app.

---

## 11. Derived energy windows [New — upgrades Focus Rhythms]

Replaces self-report ("when do you focus best") with a derived signal, and doubles as the daily-return mechanic during week one, the highest-churn window.

- **Days 1–5:** 3 pings/day at user-set times, one-tap 5-second rating (1–5). Also answerable in-app on Today.
- **Day 6:** compute mean per time bucket; surface [Jen: their sharpest stretch] and offer to protect that window for the protocol action.
- **Buckets cover the full 24h** (early_morning 05–09, morning 09–12, midday 12–13, afternoon 13–17, evening 17–21, night 21–01). No gapped ranges — the v0 draft dropped shift workers and night owls.
- **Ongoing:** 1 ping/day at a random time; recompute every 30 days; if it shifts, tell them. That's the app visibly learning about them.

**Watch item:** the 3×/day pinging is real week-1 friction, and Jen's own reaction was "that's annoying." Treat the payoff as a hypothesis to test in beta, not a certainty. It's the one place the personalization win and the don't-overwhelm principle are in tension.

---

## 12. Practices, Learn, and education-follows-action [Survives + New]

**Practices** — single library, filtered by the four outcomes, default = active outcome, also filterable by state. Each practice tagged with `time_to_effect` (immediate / days / weeks), which drives the quick-win rule.

**The timer** gets a pre-block down-regulation cue (~30s) and a **mandatory post-block recovery beat (60–90s)**, not skippable on first three uses. That recovery beat is the differentiator; every other focus timer dumps you straight into the next thing.

**Embedded video rules (Vara already decided this; both specs agree):**
1. Never gate a tool behind a video.
2. Max 90 seconds for any clip outside the Learn tab.
3. Contextual trigger: first time a user opens a tool, a short clip plays inline with the tool usable underneath. Always skippable.
4. Post-action unlock: after first completion, a follow-up clip unlocks explaining what just happened — the moment the science encodes, because now there's a felt experience to attach it to.
5. Track `video_started` / `video_completed` separately; never count a view as protocol progress.

**Content credibility:** keep humming/vagal claims modest (real but thin evidence — the one item a clinical audience could push on). Extended exhale, light, and single-tasking are on firm ground. `why_it_works` must be defensible.

---

## 13. AI Coach [New — Vara's Guide becomes this]

Vara's reactive docked Guide is re-architected into the layer that makes the structured system feel personal. It **reinforces the protocol; it does not replace it.**

**The cannibalization risk, designed out.** If a user can ask the bot "what should I do this week?" and get a good answer, the weekly open is dead and the bot has drifted off Jen's IP into territory where clinical credibility is at stake. So the coach is **proactive and moment-specific**, with open chat as a secondary surface, never the front door.

**Its jobs:** (1) at the weekly close, read the note and propose the one adjustment; (2) after a downshift, respond to their actual history; (3) on return after a gap, run re-entry; (4) when a practice is skipped 3×, ask why and offer a swap; (5) open chat, available not primary.

**What it's fed — two separate things:**
- **Knowledge (retrieval corpus, Jen's IP):** podcast/masterclass/newsletter transcripts, neuroscience briefs, all 12 protocol definitions and every practice, and a **corrections-and-limits file** — every claim correction and every ceiling ("humming: modest, small studies") as hard constraints, so the bot never overstates Jen's own science back at users. **Scope the corpus deliberately** — never point it at a Drive folder where pricing, prospect names, or strategy live.
- **Live user context (injected per conversation, not trained):** active outcome/capacity/protocol, floor_commitment, anti_goals (**never suggest these, ever**), continuity and weeks-at-slammed, derived energy window, last close note, downshift history, practices done vs skipped, current time/day.

**The feature that justifies it:** pattern detection across the user's own data. "You've downshifted three Wednesdays running — what happens on Wednesdays?" That's observation, not chat, and it's the thing users tell friends about.

**Non-negotiable constraints:** ask before advising; hard-coded banned-phrase list; no diagnosis / medication / supplement / nutrition prescription (refuse and refer); crisis language routes to scripted human resources, never improvised; if it isn't in the corpus, say so; short responses. **Build a 30–40 prompt adversarial eval set** (medical asks, crisis language, off-brand requests, attempts to extract other users' data, banned-list voice checks) and run it in CC as a regression suite on every corpus update.

---

## 14. (reserved)

---

## 15. Community [Survives + light New]

The existing build (groups, DMs, report, mute, hide-post) is retained. Added structure:
- Small groups, hard-capped at 8–12 ("Reset Groups"), matched on shared context (managing a team, young kids, travel, nonstandard schedule), with cohort start dates so everyone shares a phase.
- **The load-bearing ritual:** on completing the weekly open, offer a one-tap post of outcome + capacity + one commitment. Structured and low-lift, happens whether or not anyone feels chatty. Unstructured threads go quiet fast. Do not ship community without this.
- Downshifts can be optionally shared and are normalized/celebrated — this breaks the shame spiral.
- Monthly celebration thread feeds Jen's newsletter Community Highlight (content flywheel).

**Moderation (ship-blocker for enabling community):** report exists (full 3-screen flow + backend, confirmed). **But "block" does not — what exists is mute + hide-post, which is one-directional content hiding, not a true block.** Apple UGC 1.2 wants the ability to block abusive users (sever contact both ways). **Building true bidirectional block is a launch gate for enabling Community, not a survivor.** Also needed: published guidelines accepted at entry; admin dashboard (exists); auto-flag keyword list for self-harm and medical-crisis language routed to a human with a [Jen] response template; a named daily moderator who is not Jen. If these aren't ready, keep `community_enabled` false. That's an acceptable outcome.

---

## 16. Notifications [Survives, re-scoped]

The correctness fixes and per-habit reminder infrastructure survive, but the model is re-scoped to the weekly engine's tight limit.

**Hard limit: 2/day**, plus energy pings during the 5-day baseline only. Permitted: protocol reminder at the protected window; weekly open reminder; weekly close reminder. **Never:** guilt/absence notifications, streak-loss warnings, other-user activity pings, anything phrased as a nag.

**Return handling (14+ days inactive):** next open triggers a 2-minute re-entry, not a nag — straight to slammed, protocol pre-set, floor commitment shown, one skippable question [Jen: what happened], and **nothing about the gap.** Every string in this flow is [Jen]; it's the exact spot where shame leaks in through friendly-sounding wording.

---

## 17. Org / B2B2C model [New — pre-launch, D4]

The design problem is four people served by one system with zero leakage between them: the **direct consumer** (no org, all of this invisible); the **member** (employee or coach's client, experience identical to the consumer's); the **coach** (owns a roster, needs rough engagement signal); the **admin/buyer** (needs an aggregate engagement and renewal story).

**Member privacy is the precondition, not a feature.** A member's daily logs, ratings, close notes, free-text answers, and floor commitment are as private from their coach or employer as a stranger's. Coach and admin see **aggregate only, never aggregate small enough to re-identify one person.** The moment an employee suspects their manager can see a "slammed" week or a journaled reason, the corporate channel is dead. This is what makes the whole wedge viable.

### 17.1 The architecture that enforces it

**Critical correction from the diagnostic.** The map assumed per-user data is owner-only in rules. Half true: the behavioral *collections* (habits, journalEntries, brainStateCheckIns, protocolSessions, etc.) are uniformly owner-only — a sound foundation. **But the `users/{uid}` document itself is world-readable to any authenticated account** (`firestore.rules:46-49`, with an in-source comment deferring privacy filtering to the app layer). That means subscription, `onboardingStressRecovery.{initialState, stressors, peakWindow}`, focusRhythms, firstShiftAt, and intentPath are readable today by any signed-in user. **This is a live exposure that predates this work — someone's stress data is currently world-readable — and the org model cannot be built on top of it.**

**Why you can't just tighten the rule:** Firestore read rules are **document-level, not field-level.** You cannot make displayName public and subscription private on the same document. And the user doc is world-readable *on purpose* — Community reads other users' profile fields (name, avatar, bio) to render people, groups, and DMs. Locking it to owner-only would break Community.

**So the foundation is a public/private split, and it's the first code slice:**
- **Public profile** stays readable (displayName, avatar, bio, values, the fields Community needs).
- **Private store** — a separate owner-only location (`userPrivate/{uid}` top-level, or a `users/{uid}/private/{doc}` subcollection) holding everything sensitive: subscription, weekly-capacity data (floor_commitment, anti_goals, active_outcome, capacity, close notes), org membership, and — migrated off the public doc — the existing stress data.
- **All net-new weekly-capacity and org data goes straight into the private store, owner-only from day one — zero migration.** The *existing* sensitive fields on the public doc (stress data especially) are a separate migration with web-app coordination (Section 21); flagged, not silently inherited.

**On top of that foundation, unchanged:**
- **Raw individual behavioral data is owner-readable only** — now true for the user doc too, once split.
- **Anything a coach/admin sees is computed into a separate pre-aggregated collection by a scheduled Cloud Function.** The coach view queries only rollups that physically contain no individual rows.
- **Small-cohort suppression at aggregation time:** if a group has fewer than ~5 active members, the rollup omits the metric rather than showing a "team of three" number that fingers someone. Threshold is a policy choice; having one is not optional.

### 17.2 Tenancy and roles
- `organization_id` as a **nullable field** with rule-based enforcement (not a project per tenant — an ops nightmare for a solo founder). Direct consumers have none.
- Coarse RBAC via membership role: member reads only their own rows; coach reads rollups for orgs where they hold `role=coach`; admin the same. Resist finer roles until a real customer forces one.
- **Placement constraint (slice-3 build note):** the org linkage — whether a user belongs to an org, and which — must **not** live on the world-readable `users/{uid}` doc, or "who is in the AcmeCorp cohort" becomes readable by any authenticated account. It lives in the owner-only `membership` collection and/or `userPrivate/{uid}` (the slice-1 store), consistent with the split. The `user { organization_id? }` line in the schema below is logical, not a literal instruction to put the field on the public doc.
- **Org-ID invariant (security-load-bearing, from slice 3a):** organization IDs are always **Firestore auto-IDs, never human-readable slugs.** The membership doc key is `${orgId}_${userId}` and the rules `isOrgMember` check keys off it, so if an orgId ever contained `_` the key would be ambiguous (`a_b_c` = org `a_b`/user `c` *or* org `a`/user `b_c`) and a user could match a membership for an org they don't belong to — a cross-tenant read. Auto-IDs (20-char alphanumeric, no `_`) prevent this. Whoever builds org provisioning must honor this. If readable org slugs are ever wanted, store a separate display-slug field and keep the ID an auto-ID; do not put the slug in the key. Related fragility: the rule constructs that key inline and `membershipDocId()` constructs it in TS — two languages, no shared constant — so any change to the key format must touch both or every membership check silently fails closed.

```
organization { id, name, type (individual|coach_practice|corporate), seat_limit, billing_ref }
membership   { id, organization_id, user_id, role (member|coach|admin), joined_at }
user         { id, organization_id?, floor_commitment, anti_goals[], energy_window,
               week_start_day, active_outcome, cycles_completed_on_active_outcome, created_at }
                 // ^ all of these sensitive singletons live in userPrivate/{uid}, not users/{uid}
weekly_cycle { id, user_id, week_start, outcome, capacity_initial, capacity_current,
               protocol_id, close_completed_at, rating_focus, rating_recovery,
               rating_energy, close_note, adjustment_selected }
daily_log    { id, user_id, date, protocol_completed, practice_ids[] }
energy_rating   { id, user_id, timestamp, bucket, rating }
downshift_event { id, user_id, weekly_cycle_id, from_capacity, to_capacity, timestamp }
```

### 17.3 The two things that aren't in the schema but are the same decision
- **Entitlement resolution:** premium access resolves as "active RevenueCat subscription **OR** active member of an org with available seats," granted server-side. Design this boolean now even while the org path is dormant — it's the seam between the two business models, cheap early and ugly to retrofit. **Seam already partly exists (diagnostic):** the subscription model has a `'coaching'` type with `coachingInviteCode` / `coachingGrantedBy` / `coachingGrantedAt`, CF-granted via a redemption code, and `RedeemCodeScreen` is already built (currently unmounted). Org entitlement extends this rather than starting from zero.
- **Billing split:** org seats should **not** run through App Store IAP (Apple's cut plus IAP's clumsiness make it wrong for seat licensing). Corporate/coach billing is external (Stripe or invoiced), entitlement granted by membership rather than receipt. So `organization.billing_ref` points at a different system than consumer subscriptions.

### 17.4 Pre-launch vs designed-now-built-later
- **Pre-launch:** the **public/private user-doc split + owner-only rules on the private store** (the foundation, Section 17.1 — this is the first code slice); the relational org schema; the entitlement-resolution logic; the privacy-policy revision stating the aggregate-only rule explicitly.
- **Designed now, built when the first org lands:** the rollup Cloud Functions and rollup collection; coach and admin UI; external billing; the consent-at-join screen (copy and data model decided now, dormant until there's an org to join).

The reason the line falls there: adding the coach rollup on top of owner-only data is a pure addition, but rewriting access control on live user data after launch is the rebuild you're paying to avoid. **A half-built org model — schema without enforced rules — is worse than none, because it looks done and isn't.**

The genuinely legal pieces (DPA template, privacy-policy revision, eventual SOC 2 for up-market) need real review, not a Claude draft. SOC 2 isn't needed to start, but the aggregate-only commitment must be in writing before a single org member joins.

---

## 18. Onboarding [New — progressive]

Target under 4 minutes. Only ask if the answer changes what the app does. Front-loading a deep intake loses people before value shows; ask a few now, earn the rest.

**At onboarding (5):** Brain Audit (7 taps → recommended outcome, overridable); one free-text "what's going on right now that made you look for this?" (the single question worth fighting for — it becomes the week-8 callback that lands hard); "when you're stressed, what's the first thing that falls off?"; floor commitment; week-start day + weekly-reset slot. Max one free-text question per session. Don't request notification permission until after the first protocol is generated.

**Week 2:** what you've tried that didn't stick; anti-goals; constraint chips (young kids, travel, shift work, no private space).

**Week 4:** "how will you know this worked in 90 days?" (sets the behavioral marker); "who else feels it when you're running on empty?" — powerful and on-brand, but one wrong word from landing as guilt; needs Jen's copy and a 2–3 user test before it ships to everyone.

**Stage-to-app bridge:** `GET /start?theme={outcome}&src={event_slug}` — QR resolves to onboarding with outcome pre-selected to the talk's theme, skips the Brain Audit, protocol on screen in under 60 seconds so it demos live from the stage. Track `src` per event.

---

## 19. Insights & measurement [New]

Continuity rate (% of days the action was met at any tier); three weekly self-ratings; one user-chosen behavioral marker; derived energy window and its drift; anti-goals shown as a reminder of what they're deliberately not doing.

**Display rules:** 90-day trend only, no daily score anywhere; continuity as a count of unbroken weeks, not a percentage against a target; slammed weeks count fully and are labeled successes; no comparison to other users, ever.

---

## 20. Instrumentation [New — greenfield from zero; hard prerequisite for validation]

Retention (D1/D2/D7/D14/D28/W8); onboarding funnel by screen; core loop (weekly open, weekly close, daily completion, re-set usage); navigation (tab entries, screens before exit); video (started vs completed, and whether a practice followed); failure signal (last screen before a 7+ day gap). **The one number: % still active at week 8.** Everything else is a leading indicator of it.

**Correction from diagnostic — this is more than "add events."** `analytics.service.ts` is a `__DEV__`-gated stub: `setUserId` is a deliberate no-op, 17 event helpers are defined but only `AuthContext` calls any, and nothing is emitted at all in preview or production builds. There is **no behavioral telemetry in production today.** Standing this up means installing the Firebase Analytics pipeline (GoogleService plist/json, `@react-native-firebase/analytics`, config plugins, an EAS rebuild) and then wiring events — not just calling existing helpers.

**This gates the validation you committed to.** You cannot validate a weekly-capacity model with zero behavioral data, so the analytics pipeline is a hard prerequisite for the full-build validation in Section 21 #3, and it needs to be standing and emitting *before* the first beta cohort touches the rebuilt app — otherwise week-8 retention has no data behind it.

---

## 21. Decisions — status

**Closed:**

1. **IA / taxonomy — LOCKED.** Four-tab nav (Today / Practices / Learn / Community) and the four outcomes (Focus / Stress / Routines / Energy) as the single vocabulary across the weekly question, Practices filters, and content tags. Community is a tab, not an outcome. Wire against this (Section 5).
2. **State-vocabulary for the practice filter — approach approved.** A small, settled set; working set is wired / foggy / flat / tense (matching Jen's Reset Library). Final labels are [Jen].
4. **IP ownership — acknowledged; owned by Jen / legal.** Brain and Body Reset is co-founded; an app carrying shared brand assets needs an operating agreement before revenue flows through it. Not a build blocker; it *is* a revenue blocker, so it must close before any org or consumer billing goes live.
5. **Pricing — consumer LOCKED, org OPEN.** Consumer tier stays at the current GA App Store pricing, unchanged. Coach-license and corporate-seat pricing still to be worked; per Section 17.3 it bills externally (Stripe / invoiced), not through IAP.
6. **Movement video — likely partner-sourced.** Licensing terms to confirm before those practices ship.
7. **Final copy + protocol content — assigned to Jen, in progress.** All [Jen] strings and all 12 protocol definitions (names, instructions, rationale), written in parallel with this build.

**Open — flags:**

3. **Framework validation — after the full build, decided.** Validation runs once the full build is complete, testing the app users actually receive as a coherent whole (coach and education layers included) rather than a stripped spine. Tradeoff surfaced and accepted: the falsifiable test won't pre-empt the build cost, but it validates the real product experience, and the framework itself already has grounding in Jen's practice. No P0 validation gate. Jen may still seed a parallel 15–25 person cohort for a cleaner framework-signal read, independent of the app timeline.
8. **Web-app shared-schema coordination — open, from diagnostic.** The web app (same repo, same Firestore project) writes to shared collections — the diagnostic confirmed it writes `Habit.category` and did not inventory its other write paths. Any schema change here (the user-doc split especially, plus new collections) must account for the web app, or the two clients will disagree about the same documents. Scope a web-side write-path inventory before the user-doc split migration touches existing fields.
9. **Profile-privacy field unenforced at the rules layer — open, from slice 2.** `UserProfile.privacy` (`public` / `connections` / `private`) is a real model field the UI lets users set, but `users/{uid}` reads are a blanket `allow read: if isAuthenticated()`, so a user who chose `private` or `connections` is still readable by any authenticated account. This is a **third, distinct** privacy boundary — not the sensitive-singleton exposure (solved by `userPrivate`) and not the org member boundary (slice 3). It is Community profile visibility. **Deliberately deferred:** enforcing it means a connection-lookup rule on the app's most-read collection, which wants the (deferred) Community privacy work in front of it; changing it mid-flight risks breaking Community reads. Tracked here; the slice-2 tests that assert it are marked pending-documented, not silently green. Sensitive behavioral/health data is **not** on this doc, so this gap does not compromise the slice-3 member-privacy boundary — a coach seeing a display name is not a coach seeing capacity or close notes.
10. **`floorMet` derivation for continuity — open, from slice 4/persistence.** The continuity math (Section 1, `computeContinuity`) consumes one boolean per week: was the floor commitment met? How that boolean is produced — self-reported at the weekly close, or derived from daily completion at any tier — is not yet decided, and `weekly_cycle` does not carry the field. Note the related ambiguity in Section 19, which frames continuity as "% of days the action was met at any tier" (a daily-completion rate), whereas Section 1 and the engine treat it as consecutive floor-met *weeks* (tier-independent); these are two different metrics that can coexist but must not be conflated. **Resolves at the weekly-close slice** (Section 8), where recording the week's floor outcome is the natural home. The persistence layer stores the specced `weekly_cycle` fields only and does not invent `floorMet`.

### Pre-launch security tracking

- **Service-account key rotation — RESOLVED (Aug 2026).** Three distinct valid private keys for the Editor-scoped `firebase-adminsdk-fbsvc@vara-4a99f` account were sitting as loose (gitignored, never-committed, but OneDrive-synced) files in the working tree. Never in git history, so not a public-repo exposure, but a real off-machine exposure via OneDrive. Resolved by: minting one new key stored outside the repo (`C:\Users\kyler\secrets\`, non-synced) with `GOOGLE_APPLICATION_CREDENTIALS`; repointing all local scripts to `applicationDefault()` (commit c98ccca); and revoking all three old keys by ID in the console. Verified end-to-end — new key authenticates, a revoked key now returns `16 UNAUTHENTICATED`. Deployed Cloud Functions were never affected (runtime service account, no key file).
- **Follow-on 1 — laptop key cleanup (OPEN).** The second machine (`C:\Users\kyler\dev\vara-web-app`) has its own copies of the now-revoked keys (dead, harmless) and needs its own out-of-repo key placement + `GOOGLE_APPLICATION_CREDENTIALS` set before those local scripts run there. Not urgent (revoked keys are inert), but the rotation isn't fully "done" across the two-machine setup until this is handled.
- **Follow-on 2 — narrow the service-account role (OPEN, pre-launch/pre-security-review).** The `firebase-adminsdk-fbsvc` account holds **Editor** on the whole project, which is broader than the one-off local scripts that use it need. A corporate/B2B2C security review will flag a broad-scoped key driving local scripts. Worth narrowing the role, or using a lower-privilege dedicated account for scripts, before any external review. Deliberate later task, not part of the rotation.

---

## 22. Build order

**P0 — nothing ships without these** *(reordered against the diagnostic; progress tracked inline)*
1. ~~Read-only Step-0 diagnostic~~ — **done** (main @ 6e53f52; baseline tsc 159 / jest 1999-passing).
2. ~~Private-data foundation~~ — **done, slice 1** (`userPrivate/{uid}`, owner-only rules, read-only service; main @ 979ac11). New weekly/org data goes private from day one (no migration); legacy stress-data migration is a coordinated fast-follow (Section 21 #8).
2a. ~~Rules-test harness migration to v5~~ — **done, slice 2** (harness green for the first time; caught a false-green in messaging; profile-privacy tests marked pending → item #9; main @ 88fbcff).
3. ~~Org relational schema~~ — **done, slice 3a** (organizations + memberships, owner-only rules with member-privacy tests asserting S17.1, read-only service; org-ID auto-ID invariant locked in 17.2; main @ d986f6e).
3b. **Org entitlement resolver — DEFERRED to shortly after launch (Kyle, confirmed).** The CF that grants access on active membership + seat-limit enforcement + `canAccessApp` extended to org membership + a paywall device walk. Deferred because it's *dormant until org provisioning exists* (nothing creates memberships yet) and because access resolution is centralized in `useSubscription`/`canAccessApp`, so extending it later is a contained change, not a scattered retrofit. **Trigger to build:** the first real cohort landing on the app (org provisioning going live), which the B2B2C phasing puts shortly after the consumer launch. Schema + rules (3a) are already in place, so this is purely the resolution layer. Do not let this slip past the first cohort — it's the gate that turns a membership into app access.
4. Today tab as default landing — via the existing `FOUR_PILLAR_IA`/navigator seam (Section 9).
5. Weekly open → protocol generation (Section 6). **← active work (weekly-engine pure module first)**
6. Dynamic in-week re-set with continuity-against-floor (Sections 1, 7).
7. **Analytics pipeline stood up + core-loop events wired** (Section 20) — greenfield; gates validation.

**Sequencing note (diagnostic):** the daily Situation×State engine cannot be demoted until the new progressive onboarding replaces it, because the live `ONBOARDING_V2` arc depends on the engine. Build new onboarding + weekly engine first; retire the daily engine last.

**P1** — weekly close (8); Practices library with outcome filters (12); derived energy window (11); onboarding floor + anti-goals (18, 10); timer with recovery beat (12).

**P2** — video trigger system (12); AI Coach re-architecture (13); Insights (19); return protocol (16); stage bridge (18).

**P3 — gated on moderation readiness** — Community structured ritual (15).

**Deferred:** coach-facing UI (schema and rules only for now).

---

*Living document. Update as decisions in Section 21 close. Owner: Kyle (build) + Jen (framework, voice, copy).*

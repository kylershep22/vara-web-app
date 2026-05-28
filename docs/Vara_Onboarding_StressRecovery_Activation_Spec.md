# Onboarding → Stress-Recovery Trial Activation

**Updated:** May 26, 2026
**Status:** Draft
**Priority:** P0 — top-of-funnel; gates the entire trial→paid model; pre-launch
**Pillar(s):** Primary — Regulation, Stress & Recovery (entry). Foundation — Brain Health as the Foundation (the "why"). Emotional posture — Progress Without Pressure.
**Complexity Estimate:** Large (2–4 weeks effort) — onboarding restructure, reuse of the protocol player + check-in, a new daily-anchor + notification mechanic, paywall reframe, **removal of the app-side trial**, and re-testing of the recently-validated subscription gate.

---

## Problem Statement

The current onboarding is short and ends without a felt value moment or any forward commitment, and the monetization model has shifted to a **StoreKit 14-day free trial that must be *started* to use the app** (Model A — the app-side trial is being removed). Hard paywalls only convert when onboarding has earned the ask, and a 14-day trial converts through *daily re-engagement*, not the paywall screen. This feature restructures onboarding so a new, stressed user feels understood, experiences a real stress-recovery reset, sees their own state shift, understands why repetition matters, and sets up a daily return cue — *before* reaching the trial-start paywall.

---

## Model Change (read first — this inverts a previously-validated behavior)

- **Before:** new user → onboarding → app-side 7-day trial (`trialStartedAt` granting `canAccessApp`) → into app, **no paywall**.
- **After (this spec):** new user → enhanced onboarding (includes one free protocol as the "free taste") → **trial-start paywall** → start StoreKit 14-day trial → into app. A user who has not started the trial is gated (the hard paywall, which already carries the logout / delete-account / support escape hatch).

Consequence: the app-side trial grant is removed. `canAccessApp` no longer derives access from a free in-app trial window; access requires an active RevenueCat entitlement — which includes the StoreKit **trial** period (RevenueCat reports the trial as an active `premium` entitlement; the webhook already writes `type: premium`, `periodType: TRIAL`). **This touches the subscription logic validated last cycle and must be re-tested.**

---

## User Stories

MVP unless flagged.

1. As a new, stressed user, I want the app to name what I'm experiencing so that I trust it's built for me.
2. As a new user, I want to tell the app where I'm starting in a few calm taps so that the first reset is chosen for me, not generic.
3. As a new user, I want to actually do a reset during onboarding so that I feel the value before being asked to commit.
4. As a new user, I want to see how my state shifted after the reset so that the benefit is concrete, not a claim.
5. As a new user, I want to understand why doing this repeatedly matters so that I have a reason to engage across the trial.
6. As a new user, I want to set a daily moment to return so that the habit has a cue and I'm gently reminded.
7. As a new user, I want a clear, honest trial timeline so that I'm never surprised by a charge.
8. As a returning trial user, I want a gentle nudge at my chosen time so that I come back into the loop.
9. As a privacy-conscious user, I want to skip the personalization questions so that nothing is forced.
10. *(Future)* As an engaged user, I want my daily anchor to grow into a routine I can adjust.

---

## Acceptance Criteria

**Personalization (Stories 1–2, 9)**
- Given a new user past account creation, when onboarding begins, then they see a calm framing screen naming the stress-recovery problem before any input is requested.
- Given the personalization step, when the user taps through, then a current-state check-in (five-state) and at least one "what's driving this" selection are captured to the user record and used to select the onboarding protocol.
- Given any personalization screen that is not the check-in or the protocol, when the user chooses "skip for now," then onboarding proceeds with a sensible default and no penalty or guilt copy.

**Felt experience (Stories 3–4)**
- Given personalization is complete, when the user reaches the protocol step, then a guided protocol matched to their state + stressor plays using the existing protocol player.
- Given the protocol completes, when the re-check runs, then the user re-selects their state and the app surfaces the before→after shift in plain language (e.g., "Wired → Steady").
- Given the re-check shows no improvement or a "worse" state, then the app responds compassionately (recovery isn't linear; never implies the user did it wrong) and still proceeds.

**Reason to continue + anchor (Stories 5–6, 8)**
- Given the shift is shown, when the user advances, then a single educational screen frames the compounding "why" (one idea, not a curriculum) and connects the felt reset to the 14-day arc.
- Given the anchor step, when the user selects a recurring time (pre-suggested from their stated stress peak), then the anchor is saved and a daily local notification is scheduled with gentle copy.
- Given the anchor step, when the user is asked for notification permission *in context* and grants it, then the reminder is scheduled; when they deny it, then the anchor is still saved, no reminder is scheduled, and there is no penalty messaging.

**Trial paywall (Stories 7, and the gate)**
- Given onboarding is complete, when the paywall appears, then it displays plan title(s), 14-day trial length, price, and a visual trial timeline (today: full access → reminder before billing → billing date), with no urgency or "unlock" language.
- Given the user starts the trial, when the StoreKit purchase succeeds, then post-purchase reconciliation (already built) routes them into the app immediately, and the daily anchor is active.
- Given the user does not start the trial, then they remain gated on the paywall (escape hatch — logout / delete account / support — available), and cannot reach gated app content.

---

## Edge Cases & Error Handling

1. **App-trial holdover users** — existing users who relied on the removed app-side trial. On next launch, access requires an active entitlement; beta users go through the new paywall and redeem a code via the **existing in-app redemption system**. **Verify** that a redeemed code satisfies `canAccessApp` under the new gate — the redemption path was built while the gate was disabled and the app-trial existed, so this interaction is untested.
2. **StoreKit trial already consumed** (reinstall / prior trial on this Apple ID) — Apple won't re-grant the intro offer; the paywall must detect ineligibility and present a direct subscription (no trial) + Restore, with honest copy.
3. **Re-check shows no shift or a worse state** — compassionate reframe, never shame; offer to try a different reset or simply continue. (Brand-critical.)
4. **User backgrounds/quits mid-onboarding** — resume at the correct step on relaunch; never bounce a partway user to the paywall before the value moment.
5. **Notification permission denied** — anchor saved, no reminder, no guilt; surface a quiet note that they can enable reminders later in settings.
6. **Anchor time already passed today** — schedule for the next occurrence, not retroactively.
7. **Protocol audio fails to load (slow/no network)** — calm loading state ("Taking a moment…"); on failure, allow retry or a non-audio fallback; never dump the user to the paywall on an error.
8. **User skips all personalization** — default to a general downshift protocol so the felt-experience moment still happens.
9. **Purchase succeeds but reconciliation lags** — already handled by the built `customerInfo` post-purchase reconciliation; confirm it covers the onboarding-terminal paywall path.
10. **Duplicate notification scheduling** — changing the anchor must cancel the prior scheduled notification before scheduling the new one (store the notification id).

Error copy: Soft Coral (#D97A6E), never raw red; format = [what happened] + [what to do next], supportive tone.

---

## UX & Design Notes

**Screen flow (one primary action per screen, vertical, generous whitespace, calm 200–300ms ease transitions):**

1. **Welcome / name the problem.** Stress-recovery framing; the brain-health "why" enters quietly as the reason, not the headline. *Copy direction:* "When your system is running hot, focus and follow-through get harder — that's your nervous system, not a lack of discipline." (Self-blame reframe; lands hard for high-performing professionals.)
2. **State check-in.** Five-state selection (Wired / Foggy / Steady / Clear / Alive). "How are you arriving right now?"
3. **What's driving it.** Tappable, stress-framed options (racing mind / can't switch off after work / foggy and scattered / can't wind down for sleep / feeling reactive). Skippable.
4. **When it peaks** *(optional / skippable).* Mornings / mid-day / evenings — feeds the anchor suggestion and notification timing.
5. **Reflect it back.** Mirror their inputs; frame the chosen protocol. *Copy direction:* "You're arriving Wired, with a mind that won't switch off in the evenings. Here's a five-minute reset to help your system downshift."
6. **The protocol.** Guided session via the existing protocol player, matched to state + stressor; short window (2 or 5 min).
7. **Re-check + shift (emotional peak).** Re-run the five-state check-in; surface before→after explicitly ("You moved from Wired to Steady in five minutes"). One brain-health line: "Small recovery moments like this, repeated, are how your brain learns to handle stress better over time."
8. **Bridge / the one idea.** Highlight Card. *Copy direction:* "What you felt was a single reset. The change comes from repetition — give it two weeks and you'll feel the difference between a one-off and a pattern."
9. **Daily anchor + contextual notification permission.** Pre-suggest a time from their stated peak. *Copy direction:* "You mentioned evenings are hardest — want a recovery moment around then?" Invitation, not obligation; skippable. Ask OS notification permission here, in context.
10. **Trial paywall (the gate).** Framed as continuation: "Your 14-day plan, starting with an evening reset each day." Trial timeline visual; Monthly + Annual; calm CTA from the CTA library; **no "unlock," no countdown, no urgency**.

**Components:** reuse the five-state check-in and the protocol/guided-session player; new — reflect-back screen, bridge Highlight Card, anchor picker, trial-timeline component on the paywall.
**Copy:** all copy above is *direction*, not final — finalize against the Voice & Tone rules and the CTA & Headline Library (consider a follow-on `vara-ui-copy` pass).
**Color:** hold the calm palette (teal + sage); accents sparingly per the styling guide. Highlight Cards use Dew Sage bg + teal left accent.
**Accessibility:** WCAG 2.1 AA contrast, 48px touch targets, Reduce Motion respected, screen-reader labels describing actions.

---

## Technical Considerations

- **Stack:** React Native (Expo SDK 53), Firebase (Auth/Firestore/Storage), RevenueCat, ElevenLabs audio, expo-notifications (confirm actual lib), Sentry.
- **Data model (user doc):** persist onboarding inputs (initial state, stressor tag(s), peak window, optional intention), `onboardingCompletedAt`, the daily anchor (`anchorTime`, `anchorEnabled`, `notificationId`), and whether the trial was started. Reuse the existing `ProtocolSession` for the onboarding protocol; reuse existing check-in writes.
- **Subscription logic (the careful part):** remove the app-side trial grant from the access derivation. `canAccessApp` = active RevenueCat entitlement (trial or paid) OR the Firestore mirror the webhook writes (which is `premium` during the StoreKit trial). Confirm the merge built last cycle (`useSubscription` / `rcEntitlement`) behaves correctly with the app-trial path gone, and that the loading state still prevents a paywall flash on cold start.
- **RevenueCat / StoreKit:** trial-start runs through the validated purchase path (`PaywallScreen` → `initiatePurchase` → `purchasePackage`). The **14-day free trial is an intro-offer config on both Monthly and Annual in App Store Connect** (Kyle's manual step). Paywall copy/timeline must match the actual configured offer (3.1.2).
- **Notifications:** schedule one daily local notification at the anchor time; gentle copy ("A moment to reset, if it feels right"); cancel-and-reschedule on anchor change; store the id. Permission requested contextually at the anchor step (do not cold-prompt on launch).
- **Offline:** cache onboarding inputs; protocol audio needs network or pre-cache — handle gracefully (Edge Case 7).
- **Privacy:** stress/state/stressor inputs are wellness data — store under the user doc, covered by the existing privacy policy (health data → User Content path). No new third-party sharing.

---

## Dependencies

- **Depends on:** the validated subscription gate + post-purchase/foreground reconciliation + escape-hatch paywall (built last cycle); the five-state check-in component; the guided protocol player (`GuidedSessionPlayer` — confirm it is complete and usable in an onboarding context); notification infrastructure; the ASC 14-day intro-offer config.
- **Depended on by:** the entire trial→paid funnel and the daily-loop engagement that drives conversion.

---

## Open Questions

1. **Resolved:** the 14-day free trial attaches to **both Monthly and Annual**. Both products carry the intro offer in App Store Connect; the paywall presents the trial on whichever the user selects.
2. **Resolved:** existing beta users go through the new paywall, then redeem a code via Vara's **existing in-app code redemption system** (dashboard prompt + Settings) — which doubles as a live test of that flow. Open item is *not* the mechanism (already built, custom Firestore codes, chosen over Apple Offer Codes / RC promotional entitlements previously): it's verifying that a redeemed code grants access under the now-hard, fail-closed gate, since the redemption path predates it. Pending a CC inventory of the current redemption implementation.
3. **Personalization length** — final count of question screens (lean toward 2–3, skippable) to balance investment against restraint. — *Kyle + design.*
4. **Intention/goal step** — include the light "what would you like help with these two weeks?" in v1, or defer? — *Kyle.*
5. **Final copy** — all on-screen copy to be finalized against Voice & Tone + CTA library. — *follow-on copy pass.*

---

## Success Metrics

- **Paywall visibility rate** — % of new users who reach the paywall (onboarding completion).
- **Install → trial-start rate** — the hard-paywall conversion (category median ~10–12%; expect cold-start/organic variance).
- **Onboarding protocol completion rate.**
- **Anchor opt-in rate** and **notification permission opt-in rate.**
- **Day-1 / Day-3 / Day-7 return rate during trial** — the leading indicator for conversion.
- **Trial → paid conversion over 14 days** (median ~34.8%; longer trials trend higher).
- **First-renewal rate.**

---

## Brand Alignment Check

- **Cognitive load:** the personalization step is the only real risk — keep it to a few calm, skippable taps; the whole flow should feel like a few quiet minutes, not a questionnaire. The protocol + re-check carry the value; everything else is light.
- **Pressure / pace:** trial timeline is transparency, not urgency; the anchor is an invitation with no streak/guilt; the re-check handles "no shift" with compassion. No countdowns, no "unlock," no "get back on track."
- **Gamification:** none. The daily anchor is a cue, explicitly not a streak.
- **Voice / terminology:** check-in, protocol, the five states; conditional phrasing; CTAs from the library.
- **Final rule:** if any screen adds pressure, visual noise, or urgency, it's off-brand — simplify it.

---

## MVP vs. Full Vision

**MVP (v1, critical path):** the 10-screen arc with state check-in + one stressor question (+ optional peak), reflect-back, protocol, re-check + shift, one education screen, daily anchor + contextual notification, trial paywall + timeline; app-trial removal; RC 14-day trial-start.

**Defer / cut if needed:** the intention/goal step (Open Q4); the "peak time" question (can default); any personalization beyond 2–3 screens; routine creation (explicitly future — the anchor is the seed).

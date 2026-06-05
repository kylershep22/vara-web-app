# Onboarding → Stress-Recovery Trial Activation — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Restructure new-user onboarding into a felt stress-recovery experience that terminates at a hard StoreKit 14-day-trial paywall, and remove the app-side trial grant so access derives only from an active entitlement (Firestore `premium`/`event`/`coaching` OR an active RevenueCat `premium` entitlement).

**Architecture:** React Native (Expo SDK 53). A new 9-screen onboarding arc (screen 10 = the existing PaywallScreen) replaces the current 3-screen `ONBOARDING_V2` flow inside `OnboardingNavigator`. Screens reuse the existing five-state check-in chips and `GuidedSessionPlayer`. Onboarding inputs persist to `users/{uid}`; the daily anchor reuses the existing `NotificationPreferences.dailyRhythm` + `scheduleDailyRhythm()` system. The access classifier `getSubscriptionStatus` (in `src/utils/subscription.ts`) is inverted to fail closed for non-entitled users; the `combineStatus` merge in `useSubscription`, `rcEntitlement`, the webhook, RC config, the purchase invocation, and the escape-hatch footer are all left untouched.

**Tech Stack:** React Native, TypeScript, Firebase (Auth/Firestore), `react-native-purchases` (RevenueCat), `expo-notifications` (`~0.32.16`), Jest (`jest --forceExit`) + `@testing-library/react-native`.

---

## Decisions locked (from review) & spec divergences

1. **Onboarding-complete gate (Task 8):** Keep the existing boolean gate `hasCompletedOnboarding !== false` (legacy-safe — existing users with `undefined` stay "complete"). `completeOnboarding()` already writes BOTH `hasCompletedOnboarding: true` and `onboardingCompletedAt: serverTimestamp()`. **No migration; no switch to a pure timestamp check.** This satisfies Task 8's intent without re-onboarding existing/beta users.
2. **Daily anchor (Task 3):** **Reuse** the existing `NotificationPreferences.dailyRhythm` (`{ enabled, reminderTime: {hour,minute}|null }`) + `scheduleDailyRhythm(userId)` (stable identifier `${userId}-daily-rhythm`, cancel-and-reschedule built in). **Divergence from spec Task 1:** we do NOT add an `anchorBlock { anchorTime, anchorEnabled, scheduledNotificationId }`. The stable identifier replaces a stored `scheduledNotificationId`; `reminderTime`/`enabled` replace `anchorTime`/`anchorEnabled`. Documented and intentional.
3. **Protocol ↔ stressor matching (Task 2):** `selectProtocol({ state, timeWindow })` consumes **state only** (Phase-2 stub; does not take a stressor). We match on the captured `BrainState`; the stressor selection is **persisted** for analytics/personalization but does not currently alter protocol choice. Honest behavior, no invented stressor→protocol map. Surfaced for the follow-on personalization pass.
4. **Intention/goal step (spec Open Q4):** Deferred per spec MVP — not part of the 9-screen arc.

---

## File Structure

**New files**
- `mobile/src/constants/onboardingStressRecovery.ts` — stressor options, peak-window options, default protocol state/window, copy constants, the new step-route enum.
- `mobile/src/services/firebase/onboardingStressRecovery.service.ts` — read/write helpers for the new onboarding inputs + resume step.
- `mobile/src/components/onboarding/OnboardingScaffold.tsx` — shared screen layout (vertical, one primary action, optional "Skip for now", progress, Reduce-Motion-aware fade).
- `mobile/src/screens/onboarding/OnboardingProblemScreen.tsx` — screen 1.
- `mobile/src/screens/onboarding/OnboardingStateCheckInScreen.tsx` — screen 2 (reuses five-state chips).
- `mobile/src/screens/onboarding/OnboardingStressorScreen.tsx` — screen 3 (skippable).
- `mobile/src/screens/onboarding/OnboardingPeakWindowScreen.tsx` — screen 4 (skippable).
- `mobile/src/screens/onboarding/OnboardingReflectScreen.tsx` — screen 5 (mirrors inputs).
- `mobile/src/screens/onboarding/OnboardingProtocolScreen.tsx` — screen 6 (`GuidedSessionPlayer`).
- `mobile/src/screens/onboarding/OnboardingRecheckScreen.tsx` — screen 7 (re-check + shift + compassionate reframe).
- `mobile/src/screens/onboarding/OnboardingBridgeScreen.tsx` — screen 8 (Highlight Card "one idea").
- `mobile/src/screens/onboarding/OnboardingAnchorScreen.tsx` — screen 9 (anchor time + contextual permission).
- `mobile/src/components/paywall/TrialTimeline.tsx` — Task 4 timeline visual.
- Tests (Task 9): `mobile/src/utils/__tests__/subscription.test.ts`, `mobile/src/services/firebase/__tests__/onboardingStressRecovery.service.test.ts`, `mobile/src/screens/onboarding/__tests__/OnboardingReflectScreen.test.tsx`, `mobile/src/screens/onboarding/__tests__/OnboardingResume.test.ts`, `mobile/src/screens/onboarding/__tests__/OnboardingAnchorScreen.test.tsx`, `mobile/src/screens/__tests__/PaywallScreen.codeAndTimeline.test.tsx`.

**Modified files**
- `mobile/src/screens/onboarding/index.ts` — export new screens.
- `mobile/src/navigation/AppNavigator.tsx` — replace the `ONBOARDING_V2` branch's 3 screens with the new 9; pass `initialStep` for resume.
- `mobile/src/services/firebase/onboarding.service.ts` — (only if needed) re-export/keep `completeOnboarding`; no behavior change.
- `mobile/src/utils/subscription.ts` — Task 7: invert `getSubscriptionStatus` to fail closed for non-entitled types.
- `mobile/src/screens/PaywallScreen.tsx` — Task 4 (14-day copy + timeline + ineligibility state) & Task 5 ("Have a code?" → EventCodeSheet).
- `mobile/src/screens/SettingsScreen.tsx` — Task 6: hide the dead "Redeem Invite Code" row.
- `mobile/src/screens/PaywallScreen.test.tsx` — update existing assertions for 14-day copy (it's already modified in the working tree; reconcile).

**DO NOT TOUCH** (verify untouched in final diff): `functions/` `revenueCatWebhook` + `validateEventCode`; the Firestore subscription schema/field names; RC offering/product config; `initiatePurchase`→`purchasePackage` invocation in `subscription.service.ts`; `combineStatus`/`rcEntitlement`/`useSubscription` merge + Firestore-first short-circuit + fail-closed + loading guard; the escape-hatch footer actions (Restore/Terms/Privacy/Log out/Delete account/Contact support); `RedeemCodeScreen` + its `PaywallStack` registration; `AuthContext.test.tsx` (pre-existing failure — leave alone). No `eas build` / deploy.

---

## Pre-flight (run once before Task 1)

- [ ] **Confirm baseline tests + typecheck pass** (so later failures are attributable).

Run (from `mobile/`):
```bash
npm test -- src/services/__tests__/protocolSelector.service.test.ts
npx tsc --noEmit
```
Expected: protocolSelector test PASS; `tsc` clean (or only the known pre-existing `AuthContext.test.tsx`-adjacent issues — do not fix those). Note any unexpected failures before proceeding.

---

## Task 1 — Persist onboarding inputs + resume step

**Files:**
- Create: `mobile/src/constants/onboardingStressRecovery.ts`
- Create: `mobile/src/services/firebase/onboardingStressRecovery.service.ts`
- Test: `mobile/src/services/firebase/__tests__/onboardingStressRecovery.service.test.ts`

Data persisted on `users/{uid}` (reusing the established `updateDoc(userRef, { ..., updatedAt: serverTimestamp() })` pattern from `onboarding.service.ts`, `USERS_COLLECTION = 'users'`):
- `onboardingStressRecovery.initialState`: `BrainState` (screen 2)
- `onboardingStressRecovery.stressors`: `string[]` (screen 3)
- `onboardingStressRecovery.peakWindow`: `'morning' | 'midday' | 'evening' | null` (screen 4)
- `onboardingStressRecovery.reflectShownAt`, `recheckStateAfter`, `recheckShift` (analytics; written by screens 5/7)
- `onboardingStep`: route name of the next/last step (resume)
- `onboardingCompletedAt` + `hasCompletedOnboarding` are written by the EXISTING `completeOnboarding()` — do not duplicate.
- `trialStartedAt`/`trialExpiresAt` are NOT written by onboarding anymore (the app-side trial is gone). Leave the fields in the schema (analytics) — nothing in this plan writes them.

- [ ] **Step 1: Write the constants file.**

```typescript
// mobile/src/constants/onboardingStressRecovery.ts
import type { BrainState } from '../types/models';

/** Ordered step routes for the stress-recovery onboarding arc (screens 1–9). */
export const ONBOARDING_SR_STEPS = [
  'OnboardingProblem',
  'OnboardingStateCheckIn',
  'OnboardingStressor',
  'OnboardingPeakWindow',
  'OnboardingReflect',
  'OnboardingProtocol',
  'OnboardingRecheck',
  'OnboardingBridge',
  'OnboardingAnchor',
] as const;

export type OnboardingSrStep = (typeof ONBOARDING_SR_STEPS)[number];

export type PeakWindow = 'morning' | 'midday' | 'evening';

/** Screen 3 — "what's driving it" (skippable). Stress-framed, plain language. */
export const STRESSOR_OPTIONS: { id: string; label: string }[] = [
  { id: 'racing_mind', label: 'A racing mind' },
  { id: 'cant_switch_off', label: "Can't switch off after work" },
  { id: 'foggy_scattered', label: 'Foggy and scattered' },
  { id: 'cant_wind_down', label: "Can't wind down for sleep" },
  { id: 'feeling_reactive', label: 'Feeling reactive' },
];

/** Screen 4 — "when it peaks" (skippable). Feeds the anchor suggestion. */
export const PEAK_WINDOW_OPTIONS: { id: PeakWindow; label: string; suggestedHour: number }[] = [
  { id: 'morning', label: 'Mornings', suggestedHour: 8 },
  { id: 'midday', label: 'Mid-day', suggestedHour: 13 },
  { id: 'evening', label: 'Evenings', suggestedHour: 20 },
];

/** Default anchor hour when no peak window was provided. */
export const DEFAULT_ANCHOR_HOUR = 20; // evening

/** Edge Case 8 — fully-skipped personalization: general downshift. */
export const DEFAULT_ONBOARDING_STATE: BrainState = 'steady';
export const ONBOARDING_PROTOCOL_TIME_WINDOW = 5; // minutes (ProtocolTimeWindow)
```

- [ ] **Step 2: Write the failing service test.**

```typescript
// mobile/src/services/firebase/__tests__/onboardingStressRecovery.service.test.ts
const updateDocMock = jest.fn().mockResolvedValue(undefined);
const docMock = jest.fn(() => ({ __ref: true }));
const serverTimestampMock = jest.fn(() => '__ts__');

jest.mock('firebase/firestore', () => ({
  doc: (...a: unknown[]) => docMock(...a),
  updateDoc: (...a: unknown[]) => updateDocMock(...a),
  serverTimestamp: () => serverTimestampMock(),
}));
jest.mock('../../../config/firebase', () => ({ db: { __db: true } }));

import {
  saveInitialState,
  saveStressors,
  savePeakWindow,
  saveOnboardingStep,
} from '../onboardingStressRecovery.service';

describe('onboardingStressRecovery.service', () => {
  beforeEach(() => updateDocMock.mockClear());

  // Data-save functions persist ONLY their data field + updatedAt. They do NOT
  // write onboardingStep (that's written on screen MOUNT via saveOnboardingStep,
  // so resume lands on where you ARE, not the step you just finished).
  test('saveInitialState writes only the nested field + updatedAt (no step)', async () => {
    await saveInitialState('u1', 'wired');
    expect(updateDocMock).toHaveBeenCalledWith(
      { __ref: true },
      { 'onboardingStressRecovery.initialState': 'wired', updatedAt: '__ts__' }
    );
    expect(updateDocMock.mock.calls[0][1]).not.toHaveProperty('onboardingStep');
  });

  test('saveStressors persists the array, no step', async () => {
    await saveStressors('u1', ['racing_mind', 'cant_switch_off']);
    expect(updateDocMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ 'onboardingStressRecovery.stressors': ['racing_mind', 'cant_switch_off'] })
    );
    expect(updateDocMock.mock.calls[0][1]).not.toHaveProperty('onboardingStep');
  });

  test('savePeakWindow accepts null (skipped), no step', async () => {
    await savePeakWindow('u1', null);
    expect(updateDocMock.mock.calls[0][1]).toEqual(
      expect.objectContaining({ 'onboardingStressRecovery.peakWindow': null })
    );
    expect(updateDocMock.mock.calls[0][1]).not.toHaveProperty('onboardingStep');
  });

  test('saveOnboardingStep is the ONLY writer of onboardingStep — writes the route name as-is', async () => {
    await saveOnboardingStep('u1', 'OnboardingProtocol');
    expect(updateDocMock).toHaveBeenCalledWith(
      { __ref: true },
      { onboardingStep: 'OnboardingProtocol', updatedAt: '__ts__' }
    );
  });
});
```

- [ ] **Step 3: Run it to confirm it fails.**

Run: `npm test -- src/services/firebase/__tests__/onboardingStressRecovery.service.test.ts`
Expected: FAIL — module not found / functions undefined.

- [ ] **Step 4: Implement the service.**

```typescript
// mobile/src/services/firebase/onboardingStressRecovery.service.ts
/**
 * Persists the stress-recovery onboarding inputs and the resume step on
 * users/{uid}. Follows the existing onboarding.service.ts pattern
 * (updateDoc + serverTimestamp). The daily anchor is NOT stored here — it
 * reuses NotificationPreferences.dailyRhythm (see Task 3).
 */
import { doc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import type { BrainState } from '../../types/models';
import { ONBOARDING_SR_STEPS, type OnboardingSrStep, type PeakWindow } from '../../constants/onboardingStressRecovery';

const USERS_COLLECTION = 'users';

function userRef(userId: string) {
  if (!db) throw new Error('Firestore not initialized');
  return doc(db, USERS_COLLECTION, userId);
}

// Data-save functions persist ONLY their data field (+ updatedAt). They never
// touch onboardingStep — see saveOnboardingStep, which screens call on MOUNT.

export async function saveInitialState(userId: string, state: BrainState): Promise<void> {
  await updateDoc(userRef(userId), {
    'onboardingStressRecovery.initialState': state,
    updatedAt: serverTimestamp(),
  });
}

export async function saveStressors(userId: string, stressors: string[]): Promise<void> {
  await updateDoc(userRef(userId), {
    'onboardingStressRecovery.stressors': stressors,
    updatedAt: serverTimestamp(),
  });
}

export async function savePeakWindow(userId: string, peak: PeakWindow | null): Promise<void> {
  await updateDoc(userRef(userId), {
    'onboardingStressRecovery.peakWindow': peak,
    updatedAt: serverTimestamp(),
  });
}

export async function saveRecheckShift(
  userId: string,
  stateAfter: BrainState,
  shift: 'improved' | 'flat' | 'worse'
): Promise<void> {
  await updateDoc(userRef(userId), {
    'onboardingStressRecovery.recheckStateAfter': stateAfter,
    'onboardingStressRecovery.recheckShift': shift,
    updatedAt: serverTimestamp(),
  });
}

/**
 * The SOLE writer of onboardingStep. Called on screen MOUNT with the current
 * route name, so a crash mid-flow resumes onto the step the user is ON — not
 * the one they just completed. Writes the route name verbatim.
 */
export async function saveOnboardingStep(userId: string, step: OnboardingSrStep): Promise<void> {
  await updateDoc(userRef(userId), { onboardingStep: step, updatedAt: serverTimestamp() });
}

/**
 * Resume helper (pure, unit-tested): given the user doc data, return the route
 * to start onboarding on. Missing/invalid → the first screen.
 */
export function resolveInitialStep(userData: { onboardingStep?: unknown } | null | undefined): OnboardingSrStep {
  const step = userData?.onboardingStep;
  return (typeof step === 'string' && (ONBOARDING_SR_STEPS as readonly string[]).includes(step)
    ? step
    : 'OnboardingProblem') as OnboardingSrStep;
}
```

- [ ] **Step 5: Run the test → PASS.** `npm test -- src/services/firebase/__tests__/onboardingStressRecovery.service.test.ts`

- [ ] **Step 6: Commit.**
```bash
git add mobile/src/constants/onboardingStressRecovery.ts mobile/src/services/firebase/onboardingStressRecovery.service.ts mobile/src/services/firebase/__tests__/onboardingStressRecovery.service.test.ts
git commit -m "feat(onboarding): persist stress-recovery inputs + resume step"
```

**Acceptance:** initial state, stressor(s), peak window, and resume step persist to `users/{uid}`; `onboardingCompletedAt` continues to come from `completeOnboarding()`; `trialStartedAt`/`trialExpiresAt` remain in schema, written by nothing here.

---

## Task 2 — Build the 9-screen onboarding flow

**Files:** the screen files listed in File Structure + `OnboardingScaffold.tsx`; modify `onboarding/index.ts`.

Reused building blocks (verified):
- Five-state chips: `BRAIN_STATES` + `BrainStateOptionRow` from `mobile/src/components/dashboard/brainStateCheckin/` (`brainStateOptions.ts`). `BrainState = 'wired'|'foggy'|'steady'|'clear'|'alive'`.
- Protocol selection: `selectProtocol({ state, timeWindow })` from `mobile/src/services/protocolSelector.service.ts` (always returns a `Protocol`; production fallback `cyclic-sighing-2`).
- Player: `GuidedSessionPlayer` from `mobile/src/components/protocol/GuidedSessionPlayer.tsx`, props `{ protocol: Protocol; stateBefore: BrainState; onExit: (s: ProtocolSessionSummary) => void; onRecoveredSession? }`. `ProtocolSessionSummary` includes `{ protocolId, stateBefore, completed, durationActualSeconds, stepsCompleted, totalSteps, abandonReason?, startedAt, endedAt }`.
- Session write: `writeProtocolSession(userId, payload)` from `mobile/src/services/firebase/protocolSession.service.ts` (collection `protocolSessions`).
- Tokens: `Colors`, `Spacing`, `Typography`, `Layout` from `../constants`; motion via `mobile/src/constants/motion.ts` + `useReducedMotion`.

Skippability (spec + Task 2): screens 3, 4, 9 skippable ("Skip for now"); screens 2, 6, 7 are NOT.

**Resume convention (every screen in the arc):** persist the CURRENT location on MOUNT, not on exit, so a crash resumes onto the step the user is on (not a redo of the one they finished):
```tsx
useEffect(() => { if (user?.uid) void saveOnboardingStep(user.uid, '<ThisRouteName>'); }, [user?.uid]);
```
`saveOnboardingStep` is the only function that writes `onboardingStep`; data-save calls (`saveInitialState`/`saveStressors`/`savePeakWindow`/`saveRecheckShift`) persist data fields only. Fire-and-forget; a failed step write is non-blocking (worst case resume re-asks the prior step).

- [ ] **Step 1: Build `OnboardingScaffold.tsx` — shared layout (one primary action, vertical, generous whitespace, ease fade respecting Reduce Motion).**

```tsx
// mobile/src/components/onboarding/OnboardingScaffold.tsx
import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, ScrollView, Animated } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface OnboardingScaffoldProps {
  title: string;
  subtitle?: string;
  primaryLabel: string;
  onPrimary: () => void;
  primaryDisabled?: boolean;
  onSkip?: () => void;            // present => render "Skip for now"
  children?: React.ReactNode;
}

export const OnboardingScaffold: React.FC<OnboardingScaffoldProps> = ({
  title, subtitle, primaryLabel, onPrimary, primaryDisabled, onSkip, children,
}) => {
  const reduceMotion = useReducedMotion();
  const opacity = useRef(new Animated.Value(reduceMotion ? 1 : 0)).current;

  useEffect(() => {
    if (reduceMotion) return;
    Animated.timing(opacity, { toValue: 1, duration: 250, useNativeDriver: true }).start();
  }, [opacity, reduceMotion]);

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <Animated.View style={[styles.flex, { opacity }]}>
        <ScrollView contentContainerStyle={styles.content} showsVerticalScrollIndicator={false}>
          <Text style={styles.title} accessibilityRole="header">{title}</Text>
          {!!subtitle && <Text style={styles.subtitle}>{subtitle}</Text>}
          <View style={styles.body}>{children}</View>
        </ScrollView>
        <View style={styles.footer}>
          <TouchableOpacity
            style={[styles.cta, primaryDisabled && styles.ctaDisabled]}
            onPress={onPrimary}
            disabled={primaryDisabled}
            accessibilityRole="button"
            accessibilityLabel={primaryLabel}
          >
            <Text style={styles.ctaText}>{primaryLabel}</Text>
          </TouchableOpacity>
          {!!onSkip && (
            <TouchableOpacity onPress={onSkip} accessibilityRole="button" accessibilityLabel="Skip for now">
              <Text style={styles.skip}>Skip for now</Text>
            </TouchableOpacity>
          )}
        </View>
      </Animated.View>
    </SafeAreaView>
  );
};

// Tokens only — no raw px/hex/font-size literals. `Layout` provides radius +
// button height; RN lineHeight needs absolute px so derive it from tokens
// (fontSize * lineHeight multiplier), since Typography.lineHeight.normal is 1.5.
const styles = StyleSheet.create({
  container: { flex: 1, backgroundColor: Colors.mistWhite },
  flex: { flex: 1 },
  content: { paddingHorizontal: Spacing.lg, paddingTop: Spacing['2xl'], paddingBottom: Spacing.lg },
  title: { fontSize: Typography.fontSize['2xl'], fontWeight: Typography.fontWeight.bold, color: Colors.evergreenTeal, marginBottom: Spacing.base },
  subtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
    marginBottom: Spacing.lg,
  },
  body: { marginTop: Spacing.base },
  footer: { paddingHorizontal: Spacing.lg, paddingBottom: Spacing.lg },
  cta: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.lg,
    height: Layout.buttonHeight.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  ctaDisabled: { opacity: 0.5 },
  ctaText: { fontSize: Typography.fontSize.lg, fontWeight: Typography.fontWeight.semibold, color: Colors.white },
  skip: { marginTop: Spacing.base, textAlign: 'center', color: Colors.mutedSageGray, fontSize: Typography.fontSize.sm, paddingVertical: Spacing.sm },
});
```

- [ ] **Step 2: Screen 1 — `OnboardingProblemScreen.tsx` (name the problem).** Uses scaffold; no input. Copy direction (verbatim starting content):
  - title: `When your system is running hot, focus and follow-through get harder.`
  - subtitle: `That's your nervous system — not a lack of discipline. Vara helps you downshift in a few quiet minutes.`
  - primary: `Begin` → `navigation.navigate('OnboardingStateCheckIn')`. No skip.

```tsx
// mobile/src/screens/onboarding/OnboardingProblemScreen.tsx
import React from 'react';
import { useNavigation } from '@react-navigation/native';
import { OnboardingScaffold } from '../../components/onboarding/OnboardingScaffold';

const OnboardingProblemScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  return (
    <OnboardingScaffold
      title="When your system is running hot, focus and follow-through get harder."
      subtitle="That's your nervous system — not a lack of discipline. Vara helps you downshift in a few quiet minutes."
      primaryLabel="Begin"
      onPrimary={() => navigation.navigate('OnboardingStateCheckIn')}
    />
  );
};
export default OnboardingProblemScreen;
```

- [ ] **Step 3: Screen 2 — `OnboardingStateCheckInScreen.tsx` (five-state check-in; NOT skippable).** Renders `BRAIN_STATES` via `BrainStateOptionRow`; primary disabled until a state is tapped. On primary: `saveInitialState(uid, state)` then `navigation.navigate('OnboardingStressor')`.

```tsx
// mobile/src/screens/onboarding/OnboardingStateCheckInScreen.tsx
import React, { useEffect, useState } from 'react';
import { View } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { OnboardingScaffold } from '../../components/onboarding/OnboardingScaffold';
import { BRAIN_STATES } from '../../components/dashboard/brainStateCheckin/brainStateOptions';
import { BrainStateOptionRow } from '../../components/dashboard/brainStateCheckin/BrainStateOptionRow';
import { useAuth } from '../../context/AuthContext';
import { saveInitialState, saveOnboardingStep } from '../../services/firebase/onboardingStressRecovery.service';
import type { BrainState } from '../../types/models';

const OnboardingStateCheckInScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();
  const [selected, setSelected] = useState<BrainState | null>(null);

  // Resume convention: record current location on mount.
  useEffect(() => { if (user?.uid) void saveOnboardingStep(user.uid, 'OnboardingStateCheckIn'); }, [user?.uid]);

  const onPrimary = async () => {
    if (!selected || !user?.uid) return;
    try { await saveInitialState(user.uid, selected); } catch { /* non-blocking; resume re-asks */ }
    navigation.navigate('OnboardingStressor');
  };

  return (
    <OnboardingScaffold
      title="How are you arriving right now?"
      primaryLabel="Continue"
      primaryDisabled={!selected}
      onPrimary={onPrimary}
    >
      <View>
        {BRAIN_STATES.map((opt) => (
          <BrainStateOptionRow
            key={opt.state}
            option={opt}
            selected={selected === opt.state}
            onPress={() => setSelected(opt.state)}
          />
        ))}
      </View>
    </OnboardingScaffold>
  );
};
export default OnboardingStateCheckInScreen;
```
> NOTE during impl: confirm `BrainStateOptionRow`'s exact prop names (`option`/`selected`/`onPress`) against its file; adapt if the real signature differs. If it does not expose a controlled `selected` prop, render the chips with a local `TouchableOpacity` map over `BRAIN_STATES` instead — do not fork the component.

- [ ] **Step 4: Screen 3 — `OnboardingStressorScreen.tsx` (multi-select, skippable).** Tappable `STRESSOR_OPTIONS`; primary `Continue` → `saveStressors(uid, selectedIds)` → navigate `OnboardingPeakWindow`. `onSkip` → `saveStressors(uid, [])` → navigate `OnboardingPeakWindow`. title: `What's driving it?` subtitle: `Pick what fits — or skip.`

- [ ] **Step 5: Screen 4 — `OnboardingPeakWindowScreen.tsx` (single-select, skippable).** `PEAK_WINDOW_OPTIONS`; primary → `savePeakWindow(uid, peak)` → `OnboardingReflect`. skip → `savePeakWindow(uid, null)` → `OnboardingReflect`. title: `When does it peak?`

- [ ] **Step 6: Screen 5 — `OnboardingReflectScreen.tsx` (reflect-back; mirrors actual inputs).** Prefers route params (`initialState`/`stressors`/`peakWindow`) passed from prior screens. **Resume fallback:** when route params are absent (user resumed directly onto Reflect after a relaunch), read the persisted inputs from Firestore (`getDoc(doc(db,'users',uid))` → `data.onboardingStressRecovery`) and rebuild the line — otherwise a resumed user would lose personalization. While reading, render a calm neutral line; swap in the personalized line once loaded. Renders a sentence built from the inputs, e.g. ``You're arriving ${stateLabel}${stressorClause}${peakClause}. Here's a five-minute reset to help your system downshift.`` Carry the resolved `state` forward to `OnboardingProtocol`. NOT a static string. When everything was skipped (or read returns nothing): `Here's a five-minute reset to help your system downshift.` Also write the mount step (`saveOnboardingStep(uid,'OnboardingReflect')`).
```tsx
// resume fallback (when route.params?.state is undefined)
useEffect(() => {
  if (routeState !== undefined || !user?.uid || !db) return;
  let cancelled = false;
  (async () => {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (cancelled || !snap.exists()) return;
    const sr = (snap.data().onboardingStressRecovery ?? {}) as {
      initialState?: BrainState; stressors?: string[]; peakWindow?: PeakWindow | null;
    };
    setResolved({ state: sr.initialState ?? null, stressors: sr.stressors ?? [], peak: sr.peakWindow ?? null });
  })();
  return () => { cancelled = true; };
}, [routeState, user?.uid]);
```

```tsx
// reflect sentence builder (inline in the screen)
function buildReflectLine(state: BrainState | null, stressorLabels: string[], peak: PeakWindow | null): string {
  const stateLabel = state ? STATE_LABELS[state] : null; // map from BRAIN_STATES
  const stressorClause = stressorLabels.length ? `, with ${stressorLabels[0].toLowerCase()}` : '';
  const peakClause = peak ? ` in the ${PEAK_LABELS[peak].toLowerCase()}` : '';
  if (!stateLabel) return 'Here’s a five-minute reset to help your system downshift.';
  return `You’re arriving ${stateLabel}${stressorClause}${peakClause}. Here’s a five-minute reset to help your system downshift.`;
}
```

- [ ] **Step 7: Screen 6 — `OnboardingProtocolScreen.tsx` (NOT skippable).** Resolve protocol with `selectProtocol({ state: routeState ?? DEFAULT_ONBOARDING_STATE, timeWindow: ONBOARDING_PROTOCOL_TIME_WINDOW })`. Mount `GuidedSessionPlayer protocol={protocol} stateBefore={state} onExit={handleExit}`. On exit: navigate to `OnboardingRecheck` passing `{ state, protocolId, sessionStartedAt: summary.startedAt }` (defer the `writeProtocolSession` until after re-check so `stateAfter` is known — Step 8). Player already handles audio loading/failure (retry / end-early) — Edge Case 7 satisfied by reuse; do NOT route to paywall on audio error (we simply advance to re-check on exit).

```tsx
// mobile/src/screens/onboarding/OnboardingProtocolScreen.tsx (core)
const protocol = useMemo(
  () => selectProtocol({ state: routeState ?? DEFAULT_ONBOARDING_STATE, timeWindow: ONBOARDING_PROTOCOL_TIME_WINDOW }),
  [routeState]
);
const handleExit = (summary: ProtocolSessionSummary) => {
  navigation.navigate('OnboardingRecheck', {
    state: routeState ?? DEFAULT_ONBOARDING_STATE,
    protocolId: protocol.id,
    sessionStartedAt: summary.startedAt,
    durationActualSeconds: summary.durationActualSeconds,
  });
};
return <GuidedSessionPlayer protocol={protocol} stateBefore={routeState ?? DEFAULT_ONBOARDING_STATE} onExit={handleExit} />;
```

- [ ] **Step 8: Screen 7 — `OnboardingRecheckScreen.tsx` (re-check + shift; NOT skippable).** Re-render five-state chips; on select compute shift via state ordinal rank, then write `writeProtocolSession(uid, { protocolId, stateBefore: routeState, stateAfter, timeWindowSelected: ONBOARDING_PROTOCOL_TIME_WINDOW, durationActualSeconds, outcome, userChosenNextStep: null, intentPath: 'default', sessionStartedAt })` and `saveRecheckShift(uid, stateAfter, shift)`. Surface before→after in plain language. Compassionate reframe for flat/worse (Edge Case 3) — never "you did it wrong", never gate.

```tsx
// shift helper
const RANK: Record<BrainState, number> = { wired: 0, foggy: 1, steady: 2, clear: 3, alive: 4 };
function computeShift(before: BrainState, after: BrainState): 'improved' | 'flat' | 'worse' {
  if (RANK[after] > RANK[before]) return 'improved';
  if (RANK[after] < RANK[before]) return 'worse';
  return 'flat';
}
// copy
function shiftLine(before: BrainState, after: BrainState, shift: string): string {
  if (shift === 'improved') return `You moved from ${L[before]} to ${L[after]} in five minutes.`;
  // flat OR worse — compassionate, never shaming:
  return `Recovery isn’t linear — some days the shift is quiet. Showing up is the part that compounds.`;
}
// always-shown brain-health line:
const BRAIN_LINE = 'Small recovery moments like this, repeated, are how your brain learns to handle stress better over time.';
```
Primary `Continue` → `OnboardingBridge`. (`outcome` from the existing `outcomeClassifier` if a helper exists; otherwise map improved→`'shifted'`, flat→`'maintenance'`, worse→`'partial_shift'` — confirm against `ProtocolSessionOutcome` union during impl.)

- [ ] **Step 9: Screen 8 — `OnboardingBridgeScreen.tsx` (the one idea; Highlight Card).** Static educational card — Dew Sage bg + teal left accent (per brand). Copy: `What you felt was a single reset. The change comes from repetition — give it two weeks and you’ll feel the difference between a one-off and a pattern.` Primary `Continue` → `OnboardingAnchor`.

- [ ] **Step 10: Register screens in `onboarding/index.ts`** (named exports) and proceed to Task 3 for screen 9; Task 8 wires the navigator.

- [ ] **Step 11: Commit.**
```bash
git add mobile/src/components/onboarding mobile/src/screens/onboarding
git commit -m "feat(onboarding): 9-screen stress-recovery arc (screens 1–8 + scaffold)"
```

**Acceptance:** screens 2/6/7 not skippable; 3/4 skippable with calm affordance; screen 5 mirrors actual inputs; screen 6 plays a state-matched protocol via the existing player (general downshift default when skipped); screen 7 shows before→after plainly with compassionate reframe on flat/worse; reused components, design tokens only.

---

## Task 3 — Screen 9: daily anchor + contextual notification permission (reuses dailyRhythm)

**Files:** Create `mobile/src/screens/onboarding/OnboardingAnchorScreen.tsx`; reuse `useNotificationPreferences`/`updateNotificationPreferences`, `registerForPushNotifications()` + `getPermissionsStatus()` (notifications.service.ts), `scheduleDailyRhythm(userId)` (notificationScheduler.service.ts). Reuse the time-picker pattern from `NotificationOptInScreen.tsx`.

Behavior:
- Pre-suggest anchor time from `peakWindow` (`PEAK_WINDOW_OPTIONS[].suggestedHour`); default `DEFAULT_ANCHOR_HOUR` (20:00) when absent. Time picker; "Skip for now" allowed.
- On Save: write `dailyRhythm: { enabled: true, reminderTime: { hour, minute } }` via `updateNotificationPreferences(uid, ...)`. Then request iOS permission **inline** (`registerForPushNotifications()`), contextual to this choice — NOT cold at launch.
  - Permission granted → `await scheduleDailyRhythm(uid)` (it reads the just-saved prefs and schedules the daily local notification; cancel-and-reschedule + stable id are built in). Gentle copy lives in `scheduleDailyRhythm`'s content — if its current copy isn't the spec line, update that ONE content string to `A moment to reset, if it feels right` (title) — no other behavior change.
  - Permission denied → keep `dailyRhythm.enabled: true`, DO NOT schedule, no penalty copy; show a quiet note "You can turn reminders on later in Settings."
- On Skip: `dailyRhythm.enabled: false` (or leave unset); no schedule. Advance regardless.
- Past-time-today (Edge Case 6): `scheduleDailyRhythm` uses a `DAILY` calendar trigger (`hour`/`minute`, repeats) — expo schedules the next occurrence automatically; no retroactive fire. (Verify `scheduleDailyRhythm` uses `SchedulableTriggerInputTypes.DAILY`; it does.)
- Primary action label `Start free trial` (per Task 8). On primary: complete anchor save (above), then `await completeOnboarding(user.uid)` → navigator re-renders → PaywallNavigator (Task 8). (i.e. screen 9's primary IS the onboarding terminal.)

- [ ] **Step 1: Build the screen** (time state default from route `peakWindow`; `@react-native-community/datetimepicker` if that's what `NotificationOptInScreen` uses — confirm and reuse the same picker import).
- [ ] **Step 2: Wire permission + schedule** exactly as above, mirroring `NotificationOptInScreen`'s `registerForPushNotifications()` → save → (granted) schedule flow.
- [ ] **Step 3: Confirm/adjust the `scheduleDailyRhythm` content title** to the spec's gentle line if needed (single string).
- [ ] **Step 4: Commit.**
```bash
git add mobile/src/screens/onboarding/OnboardingAnchorScreen.tsx mobile/src/services/notificationScheduler.service.ts
git commit -m "feat(onboarding): daily anchor screen — contextual permission + dailyRhythm schedule"
```

**Acceptance:** anchor pre-suggested from peak window; permission asked in context (not at launch); granted→one daily notification scheduled (gentle copy, cancel-and-reschedule via stable id, next-occurrence on past time); denied→saved, no schedule, no shame; skip allowed.

---

## Task 4 — Trial-timeline visual + 14-day reframe on PaywallScreen

**Files:** Create `mobile/src/components/paywall/TrialTimeline.tsx`; modify `mobile/src/screens/PaywallScreen.tsx`. Reconcile `mobile/src/screens/PaywallScreen.test.tsx` (already modified in tree).

Current copy to change (`PaywallScreen.tsx`):
- Line ~192–197 CTA + a11y: `Start your 7-day free trial` → `Start your 14-day free trial`.
- Line ~201–204 legal: `Free for 7 days, then {priceText}. …` → `Free for 14 days, then {priceText}. …`.
- Heading dual-audience (line ~152): keep `isExpired` branch; for the new-user branch use spec direction, e.g. non-expired heading `Your 14-day plan` with body `Starting with a daily reset, built around how your brain actually works.` (Returning gated user still sees the `isExpired` copy.)

- [ ] **Step 1: Build `TrialTimeline.tsx`** — three token-styled milestones, calm, no countdown/urgency: `Today — full access`, `~Day 12 — Apple reminds you`, `Day 14 — your subscription begins`. Vertical list with teal dots + connecting line; respects Reduce Motion (static). Tokens only.
- [ ] **Step 2: Intro-offer ineligibility (Edge Case 2) — per-Apple-ID eligibility, NOT product attribute.** `product.introPrice` is a PRODUCT attribute (true for every user once an intro offer is configured in ASC); it does NOT reflect whether the current Apple ID already consumed the trial. Using it would show "Start your 14-day free trial" to every existing beta user / reinstall-on-same-Apple-ID user, who would then be **charged immediately by Apple** (3.1.2 rejection + refund/chargeback risk). Use the per-Apple-ID check as PRIMARY:

```typescript
// react-native-purchases ^10.1.2 (verified):
//   Purchases.checkTrialOrIntroductoryPriceEligibility(productIds: string[])
//     → Promise<{ [productId: string]: IntroEligibility }>
//   IntroEligibility.status: INTRO_ELIGIBILITY_STATUS
//     ELIGIBLE = 2 | INELIGIBLE = 1 | UNKNOWN = 0 | NO_INTRO_OFFER_EXISTS = 3
import Purchases, { INTRO_ELIGIBILITY_STATUS } from 'react-native-purchases';

type TrialEligibility = 'eligible' | 'ineligible' | 'unknown';
const [trialEligibility, setTrialEligibility] = useState<TrialEligibility>('unknown');

useEffect(() => {
  let cancelled = false;
  (async () => {
    const pkg = selectedPlan === 'monthly' ? monthlyPkg : annualPkg;
    const productId = pkg?.product?.identifier;
    if (!productId) { if (!cancelled) setTrialEligibility('unknown'); return; }
    try {
      const map = await Purchases.checkTrialOrIntroductoryPriceEligibility([productId]);
      const status = map[productId]?.status;
      if (cancelled) return;
      setTrialEligibility(status === INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE ? 'eligible' : 'ineligible');
    } catch {
      if (!cancelled) setTrialEligibility('unknown'); // fail safe → no-trial copy
    }
  })();
  return () => { cancelled = true; };
}, [selectedPlan, monthlyPkg, annualPkg]);

const showTrial = trialEligibility === 'eligible';
```
  - `eligible` → trial-eligible state: CTA `Start your 14-day free trial`, billing disclosure with free-period language, timeline VISIBLE.
  - `ineligible` → no-trial state: CTA `Subscribe`, legal `{priceText}. Cancel anytime.`, timeline HIDDEN, keep Restore.
  - `unknown` / API rejection → **fall back to the no-trial state** (fail safe — never show trial copy we can't back up).

  Confirm the enum member access (`INTRO_ELIGIBILITY_STATUS.INTRO_ELIGIBILITY_STATUS_ELIGIBLE`) compiles against the installed types at impl. Do NOT change the purchase invocation. The `isExpired` returning-user branch is independent of this; a returning gated user who is also intro-ineligible gets the no-trial state too.
- [ ] **Step 3: Insert `<TrialTimeline/>`** between the pricing selector and CTA, shown only in the trial-eligible state.
- [ ] **Step 4: Update `PaywallScreen.test.tsx`** assertions from 7-day → 14-day (reconcile the in-tree modification). Add timeline render assertion in Task 9.
- [ ] **Step 5: Verify all displayed terms match the configured offer** — copy says 14 days because ASC carries a 14-day intro offer (Kyle's manual step); no invented terms.
- [ ] **Step 6: Commit.**
```bash
git add mobile/src/components/paywall/TrialTimeline.tsx mobile/src/screens/PaywallScreen.tsx mobile/src/screens/PaywallScreen.test.tsx
git commit -m "feat(paywall): 14-day trial reframe + trial timeline + intro-offer ineligibility state"
```

**Acceptance:** timeline renders (today→~day12→day14) token-styled with no urgency; all copy says 14-day; dual-audience headline; ineligible users get a no-trial subscribe state + honest copy + Restore.

---

## Task 5 — "Have a code?" affordance on PaywallScreen

**Files:** modify `mobile/src/screens/PaywallScreen.tsx`. Reuse `EventCodeSheet` (`mobile/src/components/events/EventCodeSheet.tsx`, props `{ visible, onDismiss, onSuccess(eventName) }`).

- [ ] **Step 1: Add local state** `const [codeSheetVisible, setCodeSheetVisible] = useState(false);`.
- [ ] **Step 2: Add a quiet footer link** in the legal/footer cluster (alongside Terms · Privacy), label `Have a code?`, styled like the other footer links (`Colors.mutedSageGray`, caption scale, NOT a CTA). `onPress` → `setCodeSheetVisible(true)`.
- [ ] **Step 3: Mount the sheet** near the end of the `ScrollView`/`SafeAreaView`, mirroring SettingsScreen's mount:
```tsx
<EventCodeSheet
  visible={codeSheetVisible}
  onDismiss={() => setCodeSheetVisible(false)}
  onSuccess={() => setCodeSheetVisible(false)}
/>
```
On success the existing `validateEventCode` writes the grant; the Firestore-first OR-merge flips `canAccessApp` and the navigator drops the paywall automatically — no extra wiring.
- [ ] **Step 4: Commit.**
```bash
git add mobile/src/screens/PaywallScreen.tsx
git commit -m "feat(paywall): quiet 'Have a code?' link opens EventCodeSheet"
```

**Acceptance:** quiet "Have a code?" link in the footer (Muted Sage Gray, caption, not a CTA) opens the existing `EventCodeSheet`; success path unchanged and ungates automatically.

---

## Task 6 — Hide the orphaned "Redeem Invite Code" Settings row

**Files:** modify `mobile/src/screens/SettingsScreen.tsx` (block at lines ~644–662).

The row navigates to `'RedeemCode'` which is only registered in `PaywallStack` — unreachable from Settings (which lives in `ProfileStack`/MainNavigator), so the tap silently fails.

- [ ] **Step 1: Suppress the entry point** without deleting `RedeemCodeScreen` or its PaywallStack registration. Introduce a named flag and gate the JSX:
```tsx
// Coach "invite code" channel is not yet mounted in the main app tree — the
// 'RedeemCode' route lives only in PaywallStack. Hide this dead entry point
// until that channel lands. (Do not delete RedeemCodeScreen / its registration.)
const SHOW_REDEEM_INVITE_ROW = false;
```
Wrap the existing block: `{SHOW_REDEEM_INVITE_ROW && subscriptionStatus?.type !== 'coaching' && ( … )}`.
- [ ] **Step 2: Commit.**
```bash
git add mobile/src/screens/SettingsScreen.tsx
git commit -m "fix(settings): hide dead 'Redeem Invite Code' row (unmounted route)"
```

**Acceptance:** the row no longer renders; `RedeemCodeScreen` and its PaywallStack registration remain in place.

---

## Task 7 — Remove the app-side trial grant (MOST CAREFUL)

**Files:** modify ONLY `mobile/src/utils/subscription.ts` (`getSubscriptionStatus`). Test: `mobile/src/utils/__tests__/subscription.test.ts` (Task 9 adds, but write the access tests here first — TDD).

The change inverts two access-granting spots in `getSubscriptionStatus`:
1. **No-sub / no-type default (lines ~106–112):** currently returns `{ type: 'trial', isActive: true, canAccessApp: true }` (the "beta grant"). → return **denied**.
2. **`case 'trial'` (lines ~117–139):** the removed app-side trial. → return **denied** (its `trialStartedAt`/`trialExpiresAt` no longer drive access).

`premium`, `event`, `coaching`, and `expired`/default cases are UNCHANGED. **Do not touch** `combineStatus`, `useSubscription`, `rcEntitlement`, or the loading guard — the Firestore-first OR-merge, RC additive signal, fail-closed, and paywall-flash guard all live there and stay exactly as-is.

- [ ] **Step 1: Write failing access tests.**
```typescript
// mobile/src/utils/__tests__/subscription.test.ts
import { getSubscriptionStatus } from '../subscription';
const future = { toMillis: () => Date.now() + 86_400_000 } as any;
const past = { toMillis: () => Date.now() - 86_400_000 } as any;

describe('getSubscriptionStatus — access derivation (post app-trial removal)', () => {
  test('no subscription field → DENIED (fail closed)', () => {
    expect(getSubscriptionStatus({}).canAccessApp).toBe(false);
  });
  test('type:trial (legacy app-side trial) → DENIED even if not expired', () => {
    expect(getSubscriptionStatus({ subscription: { type: 'trial', trialExpiresAt: future } }).canAccessApp).toBe(false);
  });
  test('type:premium not expired → GRANTED', () => {
    const s = getSubscriptionStatus({ subscription: { type: 'premium', premiumExpiresAt: future } });
    expect(s.canAccessApp).toBe(true);
    expect(s.type).toBe('premium');
  });
  test('type:event within eventAccessExpiresAt → GRANTED', () => {
    expect(getSubscriptionStatus({ subscription: { type: 'event', eventAccessExpiresAt: future } }).canAccessApp).toBe(true);
  });
  test('type:event expired → DENIED', () => {
    expect(getSubscriptionStatus({ subscription: { type: 'event', eventAccessExpiresAt: past } }).canAccessApp).toBe(false);
  });
  test('type:coaching → GRANTED', () => {
    expect(getSubscriptionStatus({ subscription: { type: 'coaching' } }).canAccessApp).toBe(true);
  });
});
```

- [ ] **Step 2: Run → FAIL** (today the no-sub and trial cases grant). `npm test -- src/utils/__tests__/subscription.test.ts`

- [ ] **Step 3: Apply the minimal inversion.** Replace the no-sub default:
```typescript
  // No subscription data → no affirmative grant. Fail closed (app-side trial removed).
  if (!sub || !sub.type) {
    return { type: 'expired', isActive: false, canAccessApp: false };
  }
```
Replace the `case 'trial'` body:
```typescript
    case 'trial': {
      // App-side trial removed (Model A). Legacy trial docs no longer grant
      // access; the StoreKit trial arrives as type:'premium' (webhook). Trial
      // timestamps remain in the schema for analytics only.
      return { type: 'expired', isActive: false, canAccessApp: false };
    }
```

- [ ] **Step 4: Run → PASS.** `npm test -- src/utils/__tests__/subscription.test.ts`
- [ ] **Step 5: Run the existing subscription test** to confirm no collateral change: `npm test -- src/services/subscription.service.test.ts` (expected PASS — that file tests purchase wrappers, not this classifier).
- [ ] **Step 6: Typecheck.** `npx tsc --noEmit`.
- [ ] **Step 7: Commit.**
```bash
git add mobile/src/utils/subscription.ts mobile/src/utils/__tests__/subscription.test.ts
git commit -m "feat(subscriptions): remove app-side trial from access derivation (fail closed)"
```

**STOP condition:** if this cannot be done without editing `combineStatus`/`useSubscription`/`rcEntitlement` or the short-circuit, leave the code unchanged and report. (It can — the change is isolated to `getSubscriptionStatus`.)

**Acceptance:** no-entitlement/no-event/no-trial user → denied; `type:'event'` within expiry → granted; `premium`/`coaching` → granted; merge, Firestore-first short-circuit, fail-closed, and loading guard untouched.

---

## Task 8 — Wire the new onboarding into the navigator

**Files:** modify `mobile/src/navigation/AppNavigator.tsx`; ensure screen 9 calls `completeOnboarding(user.uid)` (Task 3 Step). Keep `ONBOARDING_V2 = true`.

The 4-way branch already exists (auth → verify → onboarding-incomplete → !canAccessApp paywall → main) and the completion gate stays `hasCompletedOnboarding !== false` (Decision 1). The change: the `ONBOARDING_V2` branch mounts the new 9 screens, with resume support.

- [ ] **Step 1: Replace the `ONBOARDING_V2 ?` branch** screen list with the new arc, in order, `OnboardingProblem` first:
```tsx
{ONBOARDING_V2 ? (
  <>
    <OnboardingStack.Screen name="OnboardingProblem" component={OnboardingProblemScreen} />
    <OnboardingStack.Screen name="OnboardingStateCheckIn" component={OnboardingStateCheckInScreen} />
    <OnboardingStack.Screen name="OnboardingStressor" component={OnboardingStressorScreen} />
    <OnboardingStack.Screen name="OnboardingPeakWindow" component={OnboardingPeakWindowScreen} />
    <OnboardingStack.Screen name="OnboardingReflect" component={OnboardingReflectScreen} />
    <OnboardingStack.Screen name="OnboardingProtocol" component={OnboardingProtocolScreen} />
    <OnboardingStack.Screen name="OnboardingRecheck" component={OnboardingRecheckScreen} />
    <OnboardingStack.Screen name="OnboardingBridge" component={OnboardingBridgeScreen} />
    <OnboardingStack.Screen name="OnboardingAnchor" component={OnboardingAnchorScreen} />
  </>
) : ( /* unchanged legacy V1 branch */ )}
```
Update the imports from `../screens/onboarding` accordingly (remove the now-unused `OnboardingV2*` from the V2 branch import; leave V1 imports).

- [ ] **Step 2: Resume support (Edge Case 4).** `OnboardingNavigator` accepts `initialStep?: OnboardingSrStep`; set `initialRouteName={initialStep ?? 'OnboardingProblem'}`. Source `initialStep` from the user doc the AppNavigator onboarding listener ALREADY reads, via the pure `resolveInitialStep(userData)` helper (Task 1) so the route-validity logic is unit-tested in one place. Store it in state alongside `hasCompletedOnboarding` and pass it to `<OnboardingNavigator initialStep={onboardingStep} />`. A partway user relaunching is NOT routed to the paywall because `hasCompletedOnboarding` is still `false` → the branch lands on `OnboardingNavigator` (existing behavior preserved).
```tsx
import { resolveInitialStep } from '../services/firebase/onboardingStressRecovery.service';
// in the listener's exists() branch, alongside setHasCompletedOnboarding:
setOnboardingStep(resolveInitialStep(userData));
```

- [ ] **Step 2b: Confirm the anchor screen is the ONLY onboarding permission prompt.** Dropping the `OnboardingV2*` imports orphans `OnboardingV2ProtocolScreen`, whose `Notifications.requestPermissionsAsync()` (`OnboardingV2ProtocolScreen.tsx:64`) then never mounts — leaving `OnboardingAnchorScreen` (Task 3) as the only permission request in onboarding. Do NOT delete the orphaned screen file (Metro tree-shakes it; mirrors the RedeemCode approach). The separate `NotificationOptInScreen` (`:55`) stays — it's the post-onboarding, after-first-action in-app opt-in (gated by `useNotificationOptIn.shouldShowPrompt`), NOT a cold launch prompt, and out of scope. Verify by grep that no other `requestPermissionsAsync`/`registerForPushNotifications` call fires at app launch (`App.tsx`, `NotificationContext`).

- [ ] **Step 3: Confirm screen 9 terminal.** `OnboardingAnchorScreen` primary `Start free trial` → (anchor save) → `await completeOnboarding(user.uid)`. After the write, the listener flips `hasCompletedOnboarding` → not-false; with Task 7 a new user has `!canAccessApp` → `PaywallNavigator` renders (screen 10). The paywall's purchase CTA (Task 4) is the real trial-start.
- [ ] **Step 4: Sanity render** the navigator branch logic in a unit test stub if practical (covered by Task 9 resume test). Typecheck `npx tsc --noEmit`.
- [ ] **Step 5: Commit.**
```bash
git add mobile/src/navigation/AppNavigator.tsx mobile/src/screens/onboarding/index.ts
git commit -m "feat(onboarding): wire 9-screen arc into navigator with mid-flow resume"
```

**Acceptance:** new user → 9-screen arc → completeOnboarding → paywall (no entitlement, per Task 7); partway user resumes at `onboardingStep`, never bounced to paywall; legacy/complete users unaffected (boolean gate).

---

## Task 9 — Tests

**Files:** the test files in File Structure. Run pattern (from `mobile/`): `npm test -- <path>` (runs `jest --forceExit`). Use `@testing-library/react-native`; mock Firebase/expo modules as the existing tests do. Do NOT touch `AuthContext.test.tsx`.

- [ ] **Step 1: Access derivation** — done in Task 7 (`subscription.test.ts`): no-entitlement denied; `type:'event'` within expiry granted (codifies the inventory finding); `premium`/`coaching` granted; `type:'trial'`/no-sub denied. Add one assertion documenting "mid-onboarding not gated" at the navigator level via the resume test (Step 4) rather than the access fn.
- [ ] **Step 2: Onboarding skip behavior** — `OnboardingStressorScreen`/`OnboardingPeakWindowScreen`: render, press "Skip for now", assert it calls `saveStressors(uid, [])` / `savePeakWindow(uid, null)` and navigates forward (mock `navigation` + the service).
- [ ] **Step 3: Reflect-back renders actual inputs** — `OnboardingReflectScreen.test.tsx`: given route params `{ state:'wired', stressorLabels:['A racing mind'], peak:'evening' }`, assert the rendered text contains `Wired`, `racing mind`, and `evening` (proves it's not static). Given all-skipped, assert the generic downshift line.
- [ ] **Step 4: Resume mid-flow** — `OnboardingResume.test.ts`: a small pure helper `resolveInitialStep(userData)` (extract the `userData.onboardingStep` → route logic into a tiny exported function in the service or a util so it's unit-testable) returns the persisted step; missing step → `'OnboardingProblem'`; and a user with `hasCompletedOnboarding === false` is NOT routed to paywall (assert the branch helper returns the onboarding branch). Keep this as a pure-function test to avoid full-navigator mounting.
- [ ] **Step 5: Anchor + notifications** — `OnboardingAnchorScreen.test.tsx` with mocked `registerForPushNotifications`, `getPermissionsStatus`, `scheduleDailyRhythm`, `updateNotificationPreferences`:
  - permission granted on save → `scheduleDailyRhythm(uid)` called once;
  - permission denied → `scheduleDailyRhythm` NOT called, no thrown error, prefs still saved with `enabled:true`;
  - anchor change re-save → `scheduleDailyRhythm` called again (cancel-and-reschedule is internal to it; assert it's re-invoked);
  - past-time: assert the trigger built/forwarded is the `DAILY` calendar type (next-occurrence is expo's behavior) — assert via `scheduleDailyRhythm` being called with the saved `reminderTime` (the DAILY-trigger guarantee is covered by the scheduler's own contract; document it).
- [ ] **Step 6: Paywall** — `PaywallScreen.codeAndTimeline.test.tsx`: "Have a code?" press toggles `EventCodeSheet` `visible` true (mock the sheet to a probe); trial-timeline renders with 14-day config (assert `Day 14` / `14-day` text present). Reconcile with the existing `PaywallScreen.test.tsx` (update 7→14 there).
- [ ] **Step 7: Run the full new-test set** and confirm green:
```bash
npm test -- src/utils/__tests__/subscription.test.ts src/services/firebase/__tests__/onboardingStressRecovery.service.test.ts src/screens/onboarding/__tests__ src/screens/__tests__/PaywallScreen.codeAndTimeline.test.tsx
```
Expected: all PASS. (`AuthContext.test.tsx` remains failing — untouched, expected.)
- [ ] **Step 8: Commit.**
```bash
git add mobile/src/**/__tests__
git commit -m "test: onboarding flow, anchor/notifications, access derivation, paywall code+timeline"
```

**Acceptance:** all four coverage areas green; `AuthContext.test.tsx` left as-is.

---

## Final verification (before report)

- [ ] `npx tsc --noEmit` clean (modulo pre-existing issues).
- [ ] Full targeted test run green (Task 9 Step 7) + Task 7 tests.
- [ ] `git diff --stat` review: confirm **untouched** — `functions/` (`revenueCatWebhook`, `validateEventCode`), Firestore subscription schema/fields, RC offering/product config, `initiatePurchase`→`purchasePackage` invocation, `combineStatus`/`rcEntitlement`/`useSubscription` merge+short-circuit+fail-closed+loading guard, escape-hatch footer actions, `RedeemCodeScreen` + its PaywallStack registration, `AuthContext.test.tsx`.
- [ ] No `eas build` / deploy command run.
- [ ] No raw hex/px/font-size literals in new/changed UI (tokens only); brand voice (no urgency/streaks/guilt) honored on re-check + notification copy.

---

## Self-review notes (spec coverage)

- Stories 1–2,9 → screens 1–4 (Tasks 2). Stories 3–4 → screens 5–7 (Task 2). Story 5–6,8 → screens 8–9 + anchor (Tasks 2–3). Story 7 + gate → Tasks 4,7,8.
- Edge Cases: 1 (`type:'event'` grants — Task 7/9) · 2 (intro-offer ineligibility — Task 4) · 3 (compassionate re-check — Task 2 screen 7) · 4 (resume — Task 8) · 5 (denied permission no-shame — Task 3) · 6 (past-time next occurrence — Task 3, DAILY trigger) · 7 (audio failure handled by reused player — Task 2 screen 6) · 8 (skip-all default downshift — Task 2 `DEFAULT_ONBOARDING_STATE`) · 9 (post-purchase reconciliation unchanged — N/A code) · 10 (cancel-and-reschedule via stable id — Task 3).
- **Open ambiguities surfaced for the report:** (a) anchor reuses `dailyRhythm` rather than spec's `anchorBlock` (Decision 2); (b) `selectProtocol` ignores stressor — matched on state only (Decision 3); (c) completion gate stays boolean, not `onboardingCompletedAt` (Decision 1); (d) `BrainStateOptionRow` exact props to confirm at impl (fallback: local `TouchableOpacity` map over `BRAIN_STATES`, do not fork); (e) **RESOLVED** — trial eligibility uses `Purchases.checkTrialOrIntroductoryPriceEligibility` (per-Apple-ID), fail-safe to no-trial; `introPrice` rejected as wrong (Correction 1); (f) `ProtocolSessionOutcome` union values to confirm when mapping shift→outcome; (g) **RESOLVED** — only the anchor screen requests permission; old V2 prompt orphaned by the branch swap (Task 8 Step 2b).
- **Corrections applied 2026-05-27 (post-review):** (1) Task 4 eligibility = `checkTrialOrIntroductoryPriceEligibility`, not `introPrice`; (2) `OnboardingScaffold` uses `Layout`/`Typography` tokens, no raw px; (3) resume writes `onboardingStep` on MOUNT (sole writer `saveOnboardingStep`), data-save fns drop the step write, Reflect gets a Firestore read fallback, `resolveInitialStep` pure helper added.

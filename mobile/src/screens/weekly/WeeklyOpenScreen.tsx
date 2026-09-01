// Weekly open (spec 6.1). Outcome, then capacity, then confirm.
//
// DEFERRED: spec 6.1 step 3, the one-tap calendar forecast that moves the
// capacity decision to a resourced brain. It needs calendar-integration
// decisions that are out of scope for this slice, so capacity is chosen without
// it. There is deliberately no placeholder control for it: a disabled button
// that does nothing is worse than an absent one.
//
// On confirm this writes exactly one weeklyCycle. capacityCurrent and userId
// are set by the service, not passed in, so a caller cannot open a week whose
// current tier already disagrees with its forecast.
//
// One primary action per screen: each step has a single group of choices or a
// single confirm. The in-flow Back link is secondary and fully wired.
//
// No animation between steps, so Reduce Motion has nothing to suppress.

import React, { useCallback, useEffect, useMemo, useState } from 'react';
import {
  ActivityIndicator,
  ScrollView,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Colors, Spacing, TextStyles, Typography } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import {
  CAPACITY_TIERS,
  OUTCOME_KEYS,
  representativeProtocol,
  type CapacityTier,
  type OutcomeKey,
} from '../../protocolEngine';
import {
  createWeeklyCycle,
  getLatestWeeklyCycle,
} from '../../services/firebase/weeklyCycle.service';
import {
  getUserPrivate,
  setUserPrivate,
} from '../../services/firebase/userPrivate.service';
import { logEvent } from '../../services/firebase/analyticsEvents.service';
import { protocolIdFor } from '../../types/analyticsEvents';
import { logger } from '../../utils/logger';
import { planWeek, resolveWeekEnd, toIsoDate } from '../../utils/weekStart';
import { ROUTES } from '../../navigation/routes';
import { WeekStartPicker } from '../../components/shared/WeekStartPicker';
import { CAPACITY_GLOSSES, CAPACITY_LABELS } from '../../constants/capacityCopy';
import { OPEN_COPY, OUTCOME_LABELS } from './copy';

const MIN_TOUCH_TARGET = 48;

/**
 * A STRING UNION, not an index, which is what makes the conditional week-start
 * step cheap: every transition is an explicit handoff between two named steps,
 * so inserting one is a matter of repointing two of them rather than shifting
 * arithmetic that other steps depend on.
 */
type Step = 'outcome' | 'capacity' | 'weekStart' | 'confirm';

export function WeeklyOpenScreen() {
  // `navigate`, not `replace`: the confirmation lands on Home, which is a TAB
  // inside Main and cannot be replaced into. See the confirm handler.
  const navigation = useNavigation<{
    navigate: (route: string, params?: object) => void;
  }>();
  const { user } = useAuth();
  const [step, setStep] = useState<Step>('outcome');
  const [outcome, setOutcome] = useState<OutcomeKey | null>(null);
  const [capacity, setCapacity] = useState<CapacityTier | null>(null);
  const [saving, setSaving] = useState(false);
  const [failed, setFailed] = useState(false);

  // THE WEEK-START CAPTURE, for users who onboarded before the question
  // existed. Read on mount rather than at confirm (where 3a-i reads it) because
  // whether the step EXISTS has to be known before the wizard can route into
  // it.
  //
  // Three states, and they are not interchangeable: `undefined` is still
  // loading, `null` is loaded and unset (ask), a number is loaded and set (do
  // not ask). A failed read stays undefined and therefore never asks, which is
  // the right way to fail — a user who already has an anchor must not be
  // re-asked because a read blipped, and one who has none simply keeps the
  // open-date anchoring they already had.
  const [storedStartDay, setStoredStartDay] = useState<number | null | undefined>(
    undefined
  );
  // What the user picked on the step, held locally and written at confirm. Not
  // written on tap: a user who backs out of the open should not have silently
  // changed their week shape.
  const [chosenStartDay, setChosenStartDay] = useState<number | null>(null);

  useEffect(() => {
    if (!user) return;
    let active = true;
    (async () => {
      try {
        const priv = await getUserPrivate(user.uid);
        if (active) setStoredStartDay(priv?.weekStartDay ?? null);
      } catch (error) {
        // Best effort. The confirm does its own authoritative read, so this
        // failing costs the user the question, never the week.
        logger.error('[WeeklyOpen] week-start read failed:', error);
      }
    })();
    return () => {
      active = false;
    };
  }, [user]);

  /** Ask only when the read landed AND said there is no anchor. */
  const asksWeekStart = storedStartDay === null;

  // The protocol the pair resolves to, shown before the user commits. Pure
  // lookup, no clock and no week number: the quick win is week-dependent and
  // belongs to Today, not to this preview.
  //
  // representativeProtocol, NOT the time-aware selectProtocol (roadmap 3b-ii-a).
  // The open happens before any daily time answer exists, so there is no window
  // to filter by and inventing one would let a fabricated daily answer decide
  // what the WEEK previews and records.
  const protocol = useMemo(
    () => (outcome && capacity ? representativeProtocol(outcome, capacity) : null),
    [outcome, capacity]
  );

  const pickOutcome = useCallback((key: OutcomeKey) => {
    setOutcome(key);
    setStep('capacity');
  }, []);

  // Into the week-start step only when it exists; otherwise straight to confirm,
  // which is the unchanged three-step wizard every user with an anchor sees.
  const pickCapacity = useCallback(
    (tier: CapacityTier) => {
      setCapacity(tier);
      setStep(asksWeekStart ? 'weekStart' : 'confirm');
    },
    [asksWeekStart]
  );

  const pickStartDay = useCallback((day: number) => setChosenStartDay(day), []);

  const goBack = useCallback(() => {
    setStep((current) => {
      if (current === 'confirm') return asksWeekStart ? 'weekStart' : 'capacity';
      if (current === 'weekStart') return 'capacity';
      return 'outcome';
    });
  }, [asksWeekStart]);

  const confirm = useCallback(async () => {
    if (!user || !outcome || !capacity || saving) return;
    setSaving(true);
    setFailed(false);
    try {
      const selected = representativeProtocol(outcome, capacity);

      // WHERE THE WEEK BEGINS AND ENDS, decided by planWeek rather than by the
      // clock. The old write stamped toIsoDate(new Date()) as weekStart on
      // every open, so a user who opened a day late moved their week a day
      // later — permanently, since nothing ever re-anchored it. A chosen start
      // day could never take effect.
      //
      // Two reads, in parallel because neither needs the other:
      //   weekStartDay  <- the durable anchor. Absent until the setup picker
      //                    ships, and planWeek falls back to open-date
      //                    anchoring when it is, which is the old behavior
      //                    exactly.
      //   priorWeekEnd  <- null ONLY when the user has no cycle at all, which
      //                    is what marks this open as their setup week and so
      //                    lets it be a partial stub. It also keeps the new
      //                    week from overlapping a week closed early.
      //
      // Awaited before the write and NOT best-effort: a plan built on a failed
      // read would anchor the week wrongly and there is no later pass that
      // would notice. A throw here lands in the catch below, which keeps the
      // user's selections and offers the retry.
      const [priv, latest] = await Promise.all([
        getUserPrivate(user.uid),
        getLatestWeeklyCycle(user.uid),
      ]);

      // A start day answered on the step this run takes precedence over the
      // stored one, so the anchor the user just chose shapes THIS week rather
      // than only the next. Persisted before planning and awaited: if the
      // preference does not land, the week must not be anchored to it either,
      // or the following open would silently re-anchor to something else.
      if (chosenStartDay !== null) {
        await setUserPrivate(user.uid, { weekStartDay: chosenStartDay });
      }

      const { weekStart, weekEnd } = planWeek({
        todayIso: toIsoDate(new Date()),
        weekStartDay: chosenStartDay ?? priv?.weekStartDay,
        priorWeekEnd: latest
          ? resolveWeekEnd(latest.weekStart, latest.weekEnd)
          : null,
      });

      // capacityCurrent and userId are set by the service. Passing them would
      // be the one way to open a week whose current tier already disagrees with
      // its forecast, so the input type does not accept them.
      await createWeeklyCycle(user.uid, {
        weekStart,
        weekEnd,
        outcome,
        capacityInitial: capacity,
        protocolId: selected.id,
      });

      // Telemetry (spec 20), after the write lands and never before it: an
      // event for a week that failed to open would be a lie in the funnel.
      //
      // Behavior only. The pair the user chose and the protocol it resolved to,
      // and nothing else ever. Nothing on this screen is user-authored, and
      // nothing content-shaped may be added to this payload.
      //
      // Its own try/catch, deliberately. logEvent is built never to throw, but
      // the user's week is already saved by this point and no telemetry defect
      // may be able to strand them on a screen whose work is done. The call
      // site does not depend on a promise made elsewhere.
      //
      // protocolId comes from protocolIdFor rather than selected.id because the
      // protocol object types its id as an open `string`, which is exactly the
      // shape the event schema refuses. Same value, closed union; the two are
      // pinned together in types/__tests__/analyticsEvents.test.ts.
      try {
        logEvent(user.uid, 'weekly_open', {
          outcome,
          capacityInitial: capacity,
          protocolId: protocolIdFor(outcome, capacity),
        });
      } catch {
        // Never the user's problem.
      }

      // No week number is computed or handed forward. Home derives it, always,
      // from the stored cycles. Deriving it here as well would mean two
      // derivations against two different database states (this one pre-write,
      // Home's post-write) with nothing forcing them to agree, and a re-entry
      // in the same week could then disagree with the fresh open about whether
      // the quick win is active. One derivation, one source.
      //
      // The await above is what makes that safe: the cycle is persisted before
      // this navigation, so Home's count always includes the current week.
      //
      // HOME IS THE TODAY SURFACE. There is one Today, and this used to land on
      // a standalone copy of it that the user could then back out of into the
      // real one. navigate, not replace: Home is a tab inside Main, which is
      // already the root beneath this stack, so navigate pops back to it rather
      // than stacking a second Main, and drops this finished flow off the back
      // gesture in the process.
      navigation.navigate(ROUTES.Main, { screen: ROUTES.Home });
    } catch (error) {
      logger.error('[WeeklyOpen] cycle write failed:', error);
      // Selections are kept, so the user retries the confirm rather than
      // re-answering both questions.
      setFailed(true);
      setSaving(false);
    }
  }, [user, outcome, capacity, saving, navigation, chosenStartDay]);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} testID="weekly-open">
        {step === 'outcome' && (
          <>
            <Text style={styles.question}>{OPEN_COPY.outcomeQuestion}</Text>
            <View style={styles.options}>
              {OUTCOME_KEYS.map((key) => (
                <TouchableOpacity
                  key={key}
                  style={[styles.option, outcome === key && styles.optionSelected]}
                  onPress={() => pickOutcome(key)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: outcome === key }}
                  accessibilityLabel={OUTCOME_LABELS[key]}
                  testID={`weekly-open-outcome-${key}`}
                >
                  <Text style={styles.optionLabel}>{OUTCOME_LABELS[key]}</Text>
                </TouchableOpacity>
              ))}
            </View>
          </>
        )}

        {step === 'capacity' && (
          <>
            <Text style={styles.question}>{OPEN_COPY.capacityQuestion}</Text>
            <View style={styles.options}>
              {CAPACITY_TIERS.map((tier) => (
                <TouchableOpacity
                  key={tier}
                  style={[styles.option, capacity === tier && styles.optionSelected]}
                  onPress={() => pickCapacity(tier)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: capacity === tier }}
                  accessibilityLabel={`${CAPACITY_LABELS[tier]}. ${CAPACITY_GLOSSES[tier]}`}
                  testID={`weekly-open-capacity-${tier}`}
                >
                  <Text style={styles.optionLabel}>{CAPACITY_LABELS[tier]}</Text>
                  <Text style={styles.optionGloss}>{CAPACITY_GLOSSES[tier]}</Text>
                </TouchableOpacity>
              ))}
            </View>
            <BackLink onPress={goBack} />
          </>
        )}

        {/* Only ever rendered for a user with no stored anchor; a user who has
            one never reaches this step at all (pickCapacity routes past it). */}
        {step === 'weekStart' && (
          <>
            <Text style={styles.question}>{OPEN_COPY.weekStartQuestion}</Text>
            <Text style={styles.help}>{OPEN_COPY.weekStartHelp}</Text>
            <View style={styles.options}>
              <WeekStartPicker
                value={chosenStartDay}
                onChange={pickStartDay}
                testIDPrefix="weekly-open-weekstart"
              />
            </View>

            {/* Continue is available with or without an answer. Skipping keeps
                open-date anchoring, which is what this user already had, so the
                question must not become a wall in front of their week. */}
            <TouchableOpacity
              style={styles.confirmButton}
              onPress={() => setStep('confirm')}
              accessibilityRole="button"
              accessibilityLabel={
                chosenStartDay === null ? OPEN_COPY.weekStartSkip : OPEN_COPY.confirm
              }
              testID="weekly-open-weekstart-continue"
            >
              <Text style={styles.confirmLabel}>
                {chosenStartDay === null ? OPEN_COPY.weekStartSkip : OPEN_COPY.confirm}
              </Text>
            </TouchableOpacity>

            <BackLink onPress={goBack} />
          </>
        )}

        {step === 'confirm' && protocol && outcome && capacity && (
          <>
            <Text style={styles.question}>{OPEN_COPY.confirmHeading}</Text>
            <View style={styles.summaryCard}>
              <Text style={styles.summaryPair}>
                {OUTCOME_LABELS[outcome]} / {CAPACITY_LABELS[capacity]}
              </Text>
              <Text style={styles.protocolName}>{protocol.name}</Text>
              <Text style={styles.dailyAction}>{protocol.dailyAction}</Text>
              <Text style={styles.estMinutes}>
                {OPEN_COPY.perDay.replace('{minutes}', `${protocol.estMinutes}`)}
              </Text>
            </View>

            <Text style={styles.whyHeading}>{OPEN_COPY.whyHeading}</Text>
            <Text style={styles.why}>{protocol.whyItWorks}</Text>

            {failed && (
              <Text style={styles.error} testID="weekly-open-error">
                {OPEN_COPY.saveFailed}
              </Text>
            )}

            <TouchableOpacity
              style={[styles.confirmButton, saving && styles.confirmButtonDisabled]}
              onPress={confirm}
              disabled={saving}
              accessibilityRole="button"
              accessibilityState={{ disabled: saving }}
              accessibilityLabel={OPEN_COPY.confirm}
              testID="weekly-open-confirm"
            >
              {saving ? (
                <ActivityIndicator color={Colors.surface} />
              ) : (
                <Text style={styles.confirmLabel}>{OPEN_COPY.confirm}</Text>
              )}
            </TouchableOpacity>

            {!saving && <BackLink onPress={goBack} />}
          </>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

function BackLink({ onPress }: { onPress: () => void }) {
  return (
    <TouchableOpacity
      style={styles.backLink}
      onPress={onPress}
      accessibilityRole="button"
      accessibilityLabel={OPEN_COPY.back}
      testID="weekly-open-back"
    >
      <Text style={styles.backLabel}>{OPEN_COPY.back}</Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  question: {
    ...TextStyles.h3,
    color: Colors.softCharcoal,
    marginBottom: Spacing.lg,
  },
  options: {
    gap: Spacing.sm,
  },
  help: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
    marginTop: -Spacing.md,
    marginBottom: Spacing.lg,
  },
  option: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  optionSelected: {
    borderColor: Colors.evergreenTeal,
  },
  optionLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
  optionGloss: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },
  summaryCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
  },
  summaryPair: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.sm,
  },
  protocolName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.sm,
  },
  dailyAction: {
    ...TextStyles.body,
    color: Colors.softCharcoal,
  },
  estMinutes: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
    marginTop: Spacing.sm,
  },
  whyHeading: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  why: {
    ...TextStyles.bodySmall,
    color: Colors.softCharcoal,
    marginBottom: Spacing.lg,
  },
  error: {
    ...TextStyles.bodySmall,
    // Soft coral, the brand's only error colour. Never red.
    color: Colors.softCoral,
    marginBottom: Spacing.md,
  },
  confirmButton: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 14,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  confirmButtonDisabled: {
    opacity: 0.4,
  },
  confirmLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.surface,
  },
  backLink: {
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    marginTop: Spacing.md,
  },
  backLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
  },
});

export default WeeklyOpenScreen;

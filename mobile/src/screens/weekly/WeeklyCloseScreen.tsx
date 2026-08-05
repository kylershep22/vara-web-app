// The weekly close (spec 8). Target under 90 seconds, so it is ONE scrolling
// screen and not a wizard: three one-tap ratings, one one-tap floor question,
// one optional line of text, one adjustment. Every answer is a single press,
// and nothing is behind a "next".
//
// WHAT IT WRITES: one updateDoc on the current cycle, through closeWeeklyCycle.
// `floorMet` is the answer to the floor question and is the only thing
// continuity reads, which is why the question is asked plainly and why saying
// no is offered as a normal answer rather than a confession.
//
// DELIBERATELY ABSENT, each for a stated reason:
//   - "What held", the count of days completed (spec 8.1). Nothing writes daily
//     completion yet, so the count would be zero for every user. Spec 8's own
//     consolidation rule says to suppress a debrief with no data rather than
//     show an empty one. It returns with the completion CTA.
//   - The optional post to a group (spec 8.5, Section 15). Community is not
//     enabled, so there is no affordance for it: a disabled control that does
//     nothing is worse than an absent one.
//   - An AI-proposed adjustment. Spec 8.4 wants the app to offer the one
//     change; proposing it from the user's own note is the AI Coach mechanic
//     (spec 14). This slice offers a fixed set and enforces the single choice.
//
// HOW IT IS REACHED: a dev entry on Today. The real trigger is an elapsed week,
// and wiring that into the entry guard is a tracked follow-up, not this slice.
// This screen deliberately does not check whether the week has actually ended:
// faking a boundary would be worse than not having one.
//
// Nothing here is a grade. The ratings have no total, the floor question has no
// right answer, and the only coral on the screen is a save failure.
//
// No animation, so Reduce Motion has nothing to suppress.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Colors, Spacing, TextStyles, Typography } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import {
  closeWeeklyCycle,
  getLatestWeeklyCycle,
} from '../../services/firebase/weeklyCycle.service';
import { logEvent } from '../../services/firebase/analyticsEvents.service';
import { toFailureReason, type WeeklyRating } from '../../types/analyticsEvents';
import type { WeeklyCycle } from '../../types/models';
import { logger } from '../../utils/logger';
import { ROUTES } from '../../navigation/routes';
import { loadWeeklyContinuity } from './weeklyContinuity';
import {
  ADJUSTMENT_KEYS,
  ADJUSTMENT_LABELS,
  CLOSE_COPY,
  ENTRY_COPY,
  type AdjustmentKey,
} from './copy';

const MIN_TOUCH_TARGET = 48;

/**
 * Spec 8.2: 1-5, one tap. The scale is fixed, so it is built once here.
 *
 * Typed as the schema's `WeeklyRating` rather than inferred, which pins the
 * rendered scale to the one the event payload accepts: adding a 6 here would
 * fail to compile rather than fail silently at the call site.
 */
const RATING_VALUES: readonly WeeklyRating[] = [1, 2, 3, 4, 5];

/** The three weekly ratings, in the order spec 8.2 lists them. */
const RATINGS = [
  { key: 'focus', label: CLOSE_COPY.ratingFocus },
  { key: 'recovery', label: CLOSE_COPY.ratingRecovery },
  { key: 'energy', label: CLOSE_COPY.ratingEnergy },
] as const;

type RatingKey = (typeof RATINGS)[number]['key'];

export function WeeklyCloseScreen() {
  const navigation = useNavigation<{ replace: (route: string) => void }>();
  const { user } = useAuth();

  const [cycle, setCycle] = useState<WeeklyCycle | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  /**
   * The run of unbroken weeks coming INTO the week being closed, for telemetry
   * only. Nothing on this screen renders it — the close is not a scoreboard.
   *
   * null when the read failed, which is not 0. Read once on mount rather than
   * after the write, so the close does not have to wait on a second query
   * before it can navigate.
   */
  const [continuity, setContinuity] = useState<number | null>(null);

  const [ratings, setRatings] = useState<Partial<Record<RatingKey, WeeklyRating>>>({});
  const [floorMet, setFloorMet] = useState<boolean | null>(null);
  const [note, setNote] = useState('');
  const [adjustment, setAdjustment] = useState<AdjustmentKey | null>(null);

  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);

  // Held in a ref and kept OUT of the effect deps, for the same reason as on
  // Today: useNavigation hands back a fresh object on some renders, and a
  // navigation object in the deps turns a failed load into a retry loop.
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;

  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;
    let active = true;

    const load = async () => {
      setLoadFailed(false);
      try {
        const latest = await getLatestWeeklyCycle(uid);
        if (!active) return;
        if (!latest) {
          // Nothing to close. The guard owns the routing rule, so hand the
          // decision back rather than guessing here.
          navigationRef.current.replace(ROUTES.WeeklyEntry);
          return;
        }
        setCycle(latest);

        // Best effort, and deliberately after the cycle is set. This value is
        // telemetry and nothing else, so it may never be the reason a user
        // cannot close their week: caught here rather than folded into the
        // outer catch for exactly that reason.
        try {
          const run = await loadWeeklyContinuity(uid);
          if (active) setContinuity(run);
        } catch (error) {
          logger.error('[WeeklyClose] continuity read failed:', error);
        }
      } catch (error) {
        logger.error('[WeeklyClose] load failed:', error);
        if (active) setLoadFailed(true);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [uid, attempt]);

  const retryLoad = useCallback(() => setAttempt((n) => n + 1), []);

  const pickRating = useCallback((key: RatingKey, value: WeeklyRating) => {
    setRatings((current) => ({ ...current, [key]: value }));
  }, []);

  // Every answer except the note is required: the ratings and the adjustment
  // because the close has nothing to record without them, and the floor answer
  // because it is what continuity consumes. The note is the one skippable
  // field (spec 8.3).
  const answered =
    ratings.focus !== undefined &&
    ratings.recovery !== undefined &&
    ratings.energy !== undefined &&
    floorMet !== null &&
    adjustment !== null;
  const canSave = answered && !!cycle && !saving;

  /**
   * Write the close. One document, one updateDoc, so there is no partial state
   * to recover from: it lands whole or the week is untouched.
   *
   * closeCompletedAt is not passed. The service stamps it with the server
   * clock, which is what keeps a wrong device clock out of the record.
   */
  const save = useCallback(async () => {
    // `uid` is in the guard alongside the others so the event below has a
    // non-null owner without a cast. It cannot actually be missing here — a
    // cycle only exists because the effect above ran, and the effect only runs
    // with a uid — but the type has no way to know that.
    if (!cycle || !canSave || !uid) return;
    // Narrowing for TypeScript AND the last line of defence for the invariant:
    // the button is disabled until every answer exists, and this returns rather
    // than writing a half-answered close if that ever stops being true.
    if (
      ratings.focus === undefined ||
      ratings.recovery === undefined ||
      ratings.energy === undefined ||
      floorMet === null ||
      adjustment === null
    ) {
      return;
    }

    setSaving(true);
    setSaveFailed(false);
    try {
      await closeWeeklyCycle(cycle.id, {
        ratingFocus: ratings.focus,
        ratingRecovery: ratings.recovery,
        ratingEnergy: ratings.energy,
        closeNote: note,
        adjustmentSelected: adjustment,
        floorMet,
      });

      // Telemetry (spec 20), after the write lands and never before it.
      //
      // NOTE WHAT IS NOT HERE. `note` is in scope four lines above, it is the
      // one free-text answer in the close, and a short one would clear the
      // writer's length backstop untouched. The payload type is what makes
      // adding it a build error rather than a review comment; the key-set test
      // in this screen's suite is the second lock.
      //
      // Skipped entirely when the continuity read failed. A required count has
      // no honest value to stand in for it, and 0 would state something about
      // the user that was never read.
      //
      // Its own try/catch, deliberately, and nothing awaited: the user's week is
      // already closed by this point and no telemetry defect may be able to
      // strand them on a screen whose work is done.
      try {
        if (continuity !== null) {
          logEvent(uid, 'weekly_close', {
            ratingFocus: ratings.focus,
            ratingRecovery: ratings.recovery,
            ratingEnergy: ratings.energy,
            adjustmentSelected: adjustment,
            floorMet,
            continuityAtClose: continuity,
          });
        }
      } catch {
        // Never the user's problem.
      }

      // Back to Today, which re-reads the cycles and so picks up the new
      // continuity count. replace, not push: the close is done and leaving it
      // on the stack would put a completed ritual behind the back gesture.
      navigation.replace(ROUTES.WeeklyToday);
    } catch (error) {
      logger.error('[WeeklyClose] close write failed:', error);

      // The close is one updateDoc, so a rejection means nothing landed and the
      // user has lost five answers. Nothing else records that: logger.error is
      // __DEV__-gated, so on device this failure currently leaves no trace at
      // all.
      //
      // toFailureReason, never error.code or error.message. A raw code is an
      // open string, and 'offline' is short enough to clear the writer's length
      // backstop and land in the log verbatim.
      try {
        logEvent(uid, 'weekly_close_failed', { reason: toFailureReason(error) });
      } catch {
        // Never the user's problem.
      }

      // Every answer is kept, so the user retries the save rather than
      // answering five questions again.
      setSaveFailed(true);
      setSaving(false);
    }
  }, [cycle, canSave, ratings, floorMet, note, adjustment, navigation, continuity, uid]);

  if (loadFailed) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.error} testID="weekly-close-load-error">
            {ENTRY_COPY.failed}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={retryLoad}
            accessibilityRole="button"
            accessibilityLabel={ENTRY_COPY.retry}
            testID="weekly-close-retry"
          >
            <Text style={styles.retryLabel}>{ENTRY_COPY.retry}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!cycle) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.evergreenTeal} />
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <KeyboardAvoidingView
        style={styles.fill}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <ScrollView
          contentContainerStyle={styles.content}
          keyboardShouldPersistTaps="handled"
          testID="weekly-close"
        >
          <Text style={styles.heading}>{CLOSE_COPY.heading}</Text>

          {/* Three ratings (spec 8.2). Weekly, one tap each, no total. */}
          <Text style={styles.sectionLabel}>{CLOSE_COPY.ratingsHeading}</Text>
          <Text style={styles.hint}>{CLOSE_COPY.ratingHint}</Text>
          {RATINGS.map(({ key, label }) => (
            <View key={key} style={styles.ratingRow} testID={`weekly-close-rating-${key}`}>
              <Text style={styles.ratingLabel}>{label}</Text>
              <View style={styles.scale}>
                {RATING_VALUES.map((value) => (
                  <TouchableOpacity
                    key={value}
                    style={[
                      styles.scaleOption,
                      ratings[key] === value && styles.scaleOptionSelected,
                    ]}
                    onPress={() => pickRating(key, value)}
                    accessibilityRole="radio"
                    accessibilityState={{ selected: ratings[key] === value }}
                    accessibilityLabel={`${label}: ${value}`}
                    testID={`weekly-close-rating-${key}-${value}`}
                  >
                    <Text
                      style={[
                        styles.scaleLabel,
                        ratings[key] === value && styles.scaleLabelSelected,
                      ]}
                    >
                      {value}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>
              <View style={styles.scaleEnds}>
                <Text style={styles.scaleEnd}>{CLOSE_COPY.ratingLow}</Text>
                <Text style={styles.scaleEnd}>{CLOSE_COPY.ratingHigh}</Text>
              </View>
            </View>
          ))}

          {/* The floor question (open item #10, Option A). Self-reported, and
              the ONLY input to continuity. Both answers are offered as ordinary
              answers: a phrasing that makes "no" the wrong one produces a false
              yes, and a false yes makes the count meaningless. */}
          <View style={styles.card} testID="weekly-close-floor">
            <Text style={styles.sectionLabel}>{CLOSE_COPY.floorHeading}</Text>
            <Text style={styles.question}>{CLOSE_COPY.floorQuestion}</Text>
            <TouchableOpacity
              style={[styles.option, floorMet === true && styles.optionSelected]}
              onPress={() => setFloorMet(true)}
              accessibilityRole="radio"
              accessibilityState={{ selected: floorMet === true }}
              accessibilityLabel={CLOSE_COPY.floorYes}
              testID="weekly-close-floor-yes"
            >
              <Text style={styles.optionLabel}>{CLOSE_COPY.floorYes}</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={[styles.option, floorMet === false && styles.optionSelected]}
              onPress={() => setFloorMet(false)}
              accessibilityRole="radio"
              accessibilityState={{ selected: floorMet === false }}
              accessibilityLabel={CLOSE_COPY.floorNo}
              testID="weekly-close-floor-no"
            >
              <Text style={styles.optionLabel}>{CLOSE_COPY.floorNo}</Text>
            </TouchableOpacity>
            <Text style={styles.hint}>{CLOSE_COPY.floorNoReassurance}</Text>
          </View>

          {/* One free-text question (spec 8.3), skippable. */}
          <Text style={styles.sectionLabel}>{CLOSE_COPY.noteQuestion}</Text>
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder={CLOSE_COPY.notePlaceholder}
            placeholderTextColor={Colors.mutedSageGray}
            multiline
            accessibilityLabel={CLOSE_COPY.noteQuestion}
            testID="weekly-close-note"
          />
          <Text style={styles.hint}>{CLOSE_COPY.noteSkip}</Text>

          {/* Exactly one adjustment (spec 8.4), hard enforced: picking another
              replaces the choice rather than adding to it, and the stored value
              is a single key, not a list. */}
          <Text style={styles.sectionLabel}>{CLOSE_COPY.adjustmentHeading}</Text>
          <Text style={styles.hint}>{CLOSE_COPY.adjustmentHint}</Text>
          <View style={styles.options} testID="weekly-close-adjustments">
            {ADJUSTMENT_KEYS.map((key) => (
              <TouchableOpacity
                key={key}
                style={[styles.option, adjustment === key && styles.optionSelected]}
                onPress={() => setAdjustment(key)}
                accessibilityRole="radio"
                accessibilityState={{ selected: adjustment === key }}
                accessibilityLabel={ADJUSTMENT_LABELS[key]}
                testID={`weekly-close-adjustment-${key}`}
              >
                <Text style={styles.optionLabel}>{ADJUSTMENT_LABELS[key]}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* One document, so a failure means nothing landed and the week is
              exactly as it was. Say so, in coral, and keep every answer. */}
          {saveFailed && (
            <Text style={styles.error} testID="weekly-close-error">
              {CLOSE_COPY.saveFailed}
            </Text>
          )}

          <TouchableOpacity
            style={[styles.saveButton, !canSave && styles.saveButtonDisabled]}
            onPress={save}
            disabled={!canSave}
            accessibilityRole="button"
            accessibilityState={{ disabled: !canSave }}
            accessibilityLabel={CLOSE_COPY.save}
            accessibilityHint={canSave ? undefined : CLOSE_COPY.required}
            testID="weekly-close-save"
          >
            {saving ? (
              <ActivityIndicator color={Colors.surface} />
            ) : (
              <Text style={styles.saveLabel}>{CLOSE_COPY.save}</Text>
            )}
          </TouchableOpacity>

          {!answered && !saving && (
            <Text style={styles.required} testID="weekly-close-required">
              {CLOSE_COPY.required}
            </Text>
          )}
        </ScrollView>
      </KeyboardAvoidingView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  fill: {
    flex: 1,
  },
  center: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
  },
  content: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  heading: {
    ...TextStyles.h3,
    color: Colors.softCharcoal,
    marginBottom: Spacing.lg,
  },
  sectionLabel: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.sm,
  },
  hint: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.md,
  },
  question: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
    marginBottom: Spacing.md,
  },
  ratingRow: {
    marginBottom: Spacing.lg,
  },
  ratingLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
    marginBottom: Spacing.sm,
  },
  scale: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  scaleOption: {
    flex: 1,
    minHeight: MIN_TOUCH_TARGET,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
  },
  // Selection is carried by the border and the label weight, the same way the
  // weekly open marks a chosen option. No fill, so no rating reads as "good".
  scaleOptionSelected: {
    borderColor: Colors.evergreenTeal,
  },
  scaleLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
  },
  scaleLabelSelected: {
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  scaleEnds: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginTop: Spacing.xs,
  },
  scaleEnd: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
  },
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  options: {
    gap: Spacing.sm,
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
    marginBottom: Spacing.sm,
  },
  optionSelected: {
    borderColor: Colors.evergreenTeal,
  },
  optionLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
  input: {
    minHeight: MIN_TOUCH_TARGET * 2,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    textAlignVertical: 'top',
    marginBottom: Spacing.sm,
  },
  error: {
    ...TextStyles.bodySmall,
    // Soft coral, the brand's only error colour. Never red.
    color: Colors.softCoral,
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  saveButton: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 14,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  saveButtonDisabled: {
    opacity: 0.4,
  },
  saveLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.surface,
  },
  required: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  retryButton: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 14,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
  },
  retryLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.surface,
  },
});

export default WeeklyCloseScreen;

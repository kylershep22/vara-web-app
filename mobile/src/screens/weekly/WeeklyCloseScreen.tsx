// The weekly reset (spec 8, repurposed by journey slice 6). Target well under
// 90 seconds, so it is ONE short scrolling screen and not a wizard: one felt
// read, one optional line of text, one save. Every answer is a single press,
// and nothing is behind a "next".
//
// WHAT IT ASKS is Jen's C1 question, and WHICH question depends on where the
// user is going: the four destination variants live in constants/journeyCopy.ts
// (RESET_QUESTIONS) beside the rest of the destination vocabulary. Three
// answers, no scale, no right one.
//
// WHAT IT WRITES: one updateDoc on the current cycle, through closeWeeklyCycle.
// `phaseRead` and `phaseKeyAtRead` travel together or not at all.
//
// THE READ IS PRESENT TENSE AND ABOUT THE LIVE WEEK, WHICH IS A DECISION.
// `getLatestWeeklyCycle` always returns the week the user is IN, because
// `ensureCurrentWeeklyCycle` rolls the next week over before Home renders
// (journey slice 3b). So the reset never attaches to the week that just ended,
// and Jen's copy is written in the tense that matches. Recorded here and on the
// service so slice 7 does not re-derive it.
//
// WHAT LEFT WITH SLICE 6, each with its reason:
//   - THE THREE 1-TO-5 RATINGS (spec 8.2). Nothing ever read them; slice 3b
//     stopped storing them and left them on screen for one slice, documented as
//     a real gap. This is the slice that stops asking. A weekly instrument with
//     a 1-to-5 scale on it is a score whatever the copy says.
//   - THE FLOOR QUESTION. It was the only input to continuity, and continuity
//     is retired (roadmap section 9 R4). Not the floor COMMITMENT, which is a
//     different field and is untouched.
//   - THE ADJUSTMENT MENU. "What should change next week" is the C2 adjust
//     screen's job, offered when two consecutive not_moving reads say the
//     approach is not working, rather than asked of everybody every week.
//
// STILL DELIBERATELY ABSENT:
//   - "What held", the count of days completed (spec 8.1). It is a counter, and
//     roadmap section 8 bars counters outright.
//   - The optional post to a group (spec 8.5). Community is not enabled, so
//     there is no affordance for it.
//
// HOW IT IS REACHED: an entry on Home. The real trigger is an elapsed week, and
// wiring that into the entry guard is a tracked follow-up, not this slice. This
// screen deliberately does not check whether the week has actually ended:
// faking a boundary would be worse than not having one.
//
// Nothing here is a grade. The question has no right answer, the confirmation
// is identical whichever answer was given, and the only coral on the screen is
// a save failure.
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
import { useNavigation, useRoute } from '@react-navigation/native';
import type { RouteProp } from '@react-navigation/native';

import { Colors, Spacing, TextStyles, Typography } from '../../constants';
import {
  RESET_ANSWERS,
  RESET_CONFIRMATION,
  RESET_QUESTIONS,
} from '../../constants/journeyCopy';
import { useAuth } from '../../context/AuthContext';
import {
  closeWeeklyCycle,
  getLatestWeeklyCycle,
} from '../../services/firebase/weeklyCycle.service';
import { logEvent } from '../../services/firebase/analyticsEvents.service';
import { toFailureReason } from '../../types/analyticsEvents';
import type { DestinationKey, PhaseKey, PhaseRead, WeeklyCycle } from '../../types/models';
import { logger } from '../../utils/logger';
import { ROUTES } from '../../navigation/routes';
import { CLOSE_COPY, ENTRY_COPY } from './copy';

const MIN_TOUCH_TARGET = 48;

/**
 * How long the confirmation holds before Home.
 *
 * THE HOUSE NUMBER, not a new one: OnboardingConfirmationScreen and
 * AnimatedCheckbox both hold a quiet acknowledgment for exactly this long.
 * Long enough to read one short line, short enough that it never becomes a
 * screen the user has to dismiss.
 */
const CONFIRMATION_MS = 1500;

/**
 * Where the user is going, and which phase they are in, supplied by Home.
 *
 * PARAMS RATHER THAN A READ ON THIS SCREEN, and the flag-off path is what
 * decided it. Home already resolves the journey once per session and already
 * passes `destination` to the close entry card; a second `getJourneyState` call
 * here would answer even with JOURNEY_IA OFF, because the documents persist
 * from when the flag was on, which is exactly the read the flag exists to gate.
 * It would also let this screen and Home disagree about the same user in the
 * same session when a resolve fell back to legacy.
 *
 * BOTH OPTIONAL, because both are absent on every path where Home has no phase:
 * the flag off, a resolver failure, and rung (d) with no derivable destination.
 * They travel as a pair; see the render.
 */
export interface WeeklyCloseParams {
  phase?: PhaseKey;
  destination?: DestinationKey;
}

type WeeklyCloseRoute = RouteProp<{ WeeklyClose: WeeklyCloseParams }, 'WeeklyClose'>;

export function WeeklyCloseScreen() {
  // Two verbs, and which one is used carries meaning. `replace` is the no-cycle
  // bail-out back to the entry guard, a stack-to-stack move. `navigate` is the
  // post-reset terminal: Home is a TAB, so it is reached through its navigator
  // and cannot be replaced into.
  const navigation = useNavigation<{
    replace: (route: string) => void;
    navigate: (route: string, params?: object) => void;
  }>();
  const route = useRoute<WeeklyCloseRoute>();
  const { user } = useAuth();

  // BOTH OR NEITHER, resolved once here so the render and the write cannot
  // disagree about whether there is a phase. `route.params` is undefined when
  // Home navigated without any, which is the ordinary flag-off case rather
  // than an error.
  const phase = route.params?.phase;
  const destination = route.params?.destination;
  const hasPhase = !!phase && !!destination;

  const [cycle, setCycle] = useState<WeeklyCycle | null>(null);
  const [loadFailed, setLoadFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  const [read, setRead] = useState<PhaseRead | null>(null);
  const [note, setNote] = useState('');

  const [saving, setSaving] = useState(false);
  const [saveFailed, setSaveFailed] = useState(false);
  /**
   * The write has landed and the confirmation is on screen.
   *
   * It REPLACES the form rather than sitting under it, which is also what makes
   * a second write impossible: the save control is gone by the time this is
   * true.
   */
  const [saved, setSaved] = useState(false);

  // Held in a ref and kept OUT of the effect deps, for the same reason as on
  // Today: useNavigation hands back a fresh object on some renders, and a
  // navigation object in the deps turns a failed load into a retry loop.
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;

  /**
   * The confirmation's timer, held so unmount can clear it.
   *
   * WITHOUT THIS, backing out during the hold navigates from an unmounted
   * screen. Both exits land on Home either way, so clearing it costs the user
   * nothing and removes the warning.
   */
  const exitTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  useEffect(
    () => () => {
      if (exitTimer.current) clearTimeout(exitTimer.current);
    },
    []
  );

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
      } catch (error) {
        logger.error('[WeeklyReset] load failed:', error);
        if (active) setLoadFailed(true);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [uid, attempt]);

  const retryLoad = useCallback(() => setAttempt((n) => n + 1), []);

  // The read is the one required answer, and only when there is a question to
  // answer. The note is skippable (spec 8.3), so a reset taken with no phase
  // has nothing required and saves on arrival.
  const answered = !hasPhase || read !== null;
  const canSave = answered && !!cycle && !saving;

  /**
   * Write the reset. One document, one updateDoc, so there is no partial state
   * to recover from: it lands whole or the week is untouched.
   *
   * closeCompletedAt is not passed. The service stamps it with the server
   * clock, which is what keeps a wrong device clock out of the record.
   */
  const save = useCallback(async () => {
    // `uid` is in the guard alongside the others so the event below has a
    // non-null owner without a cast. It cannot actually be missing here - a
    // cycle only exists because the effect above ran, and the effect only runs
    // with a uid - but the type has no way to know that.
    if (!cycle || !canSave || !uid) return;

    // THE PAIR IS BUILT ONCE and used by both the write and the event, so the
    // stored value and the recorded value cannot drift. Undefined on the
    // no-phase path, which the service turns into an omitted field and the
    // event records as null.
    const storedRead = hasPhase && read ? read : undefined;
    const storedPhase = storedRead ? phase : undefined;

    setSaving(true);
    setSaveFailed(false);
    try {
      await closeWeeklyCycle(cycle.id, {
        closeNote: note,
        phaseRead: storedRead,
        phaseKeyAtRead: storedPhase,
      });

      // Telemetry (spec 20), after the write lands and never before it.
      //
      // NOTE WHAT IS NOT HERE. `note` is in scope four lines above, it is the
      // one free-text answer in the reset, and a short one would clear the
      // writer's length backstop untouched. The payload type is what makes
      // adding it a build error rather than a review comment; the key-set test
      // in this screen's suite is the second lock.
      //
      // IT FIRES UNCONDITIONALLY NOW. It used to be skipped whenever the
      // continuity read had failed, because `continuityBeforeClose` was
      // required and had no honest stand-in; that field retired with the count
      // and nothing is left that can be missing. A reset that saved is a reset
      // that is recorded.
      //
      // Its own try/catch, deliberately, and nothing awaited: the user's week
      // is already closed by this point and no telemetry defect may be able to
      // strand them on a screen whose work is done.
      try {
        logEvent(uid, 'weekly_close', {
          phaseRead: storedRead ?? null,
          phaseKeyAtRead: storedPhase ?? null,
        });
      } catch {
        // Never the user's problem.
      }

      // THE CONFIRMATION, AND THEN HOME. Jen's line is the register of the
      // whole instrument: the app heard, and nothing dramatic follows. It is
      // rendered rather than skipped for want of a surface, and it holds for a
      // fixed beat rather than waiting for a tap, because a control here would
      // be asking the user to acknowledge the acknowledgment.
      //
      // The write is already committed, so backgrounding during the hold costs
      // nothing: JS suspends, the timer fires on resume, and the user lands on
      // Home with a week that is closed. There is no AppState wiring because
      // there is no outcome for it to change.
      setSaving(false);
      setSaved(true);

      // Back to HOME, which is the Today surface. There is one Today, and
      // landing on the standalone screen instead put the user on a second copy
      // of it that they could then back out of into the first.
      //
      // navigate, not replace, and not push: Home is a tab inside Main, which
      // is already the root beneath this stack. navigate pops back to that
      // existing Main rather than stacking a second one, which also drops this
      // completed ritual off the back gesture.
      exitTimer.current = setTimeout(() => {
        navigationRef.current.navigate(ROUTES.Main, { screen: ROUTES.Home });
      }, CONFIRMATION_MS);
    } catch (error) {
      logger.error('[WeeklyReset] close write failed:', error);

      // The reset is one updateDoc, so a rejection means nothing landed and the
      // user has lost their answers. Nothing else records that: logger.error is
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
      // answering again.
      setSaveFailed(true);
      setSaving(false);
    }
  }, [cycle, canSave, uid, hasPhase, read, phase, note]);

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

  // THE CONFIRMATION REPLACES THE FORM. Announced to screen readers through
  // accessibilityLiveRegion, because a user who cannot see the swap gets no
  // other signal that the reset landed.
  if (saved) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text
            style={styles.confirmation}
            accessibilityLiveRegion="polite"
            accessibilityRole="text"
            maxFontSizeMultiplier={1.3}
            testID="weekly-close-confirmation"
          >
            {RESET_CONFIRMATION}
          </Text>
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
          <Text style={styles.heading} maxFontSizeMultiplier={1.3}>
            {CLOSE_COPY.heading}
          </Text>

          {/* THE FELT READ (C1). Rendered only when Home resolved a phase,
              because the question names the destination and there is no
              destination-neutral version of it. With no phase the reset is the
              note alone, and the cycle is written with no read at all:
              journey/derive.ts already defines absence as "not answered", and
              silence is a better record than a question nobody was asked. */}
          {hasPhase && destination && (
            <View style={styles.card} testID="weekly-close-read">
              <Text style={styles.question} maxFontSizeMultiplier={1.3}>
                {RESET_QUESTIONS[destination]}
              </Text>
              {RESET_ANSWERS.map(({ value, label }) => (
                <TouchableOpacity
                  key={value}
                  style={[styles.option, read === value && styles.optionSelected]}
                  onPress={() => setRead(value)}
                  accessibilityRole="radio"
                  accessibilityState={{ selected: read === value }}
                  accessibilityLabel={label}
                  testID={`weekly-close-read-${value}`}
                >
                  <Text style={styles.optionLabel} maxFontSizeMultiplier={1.3}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* One free-text question (spec 8.3), skippable. */}
          <Text style={styles.sectionLabel} maxFontSizeMultiplier={1.3}>
            {CLOSE_COPY.noteQuestion}
          </Text>
          <TextInput
            style={styles.input}
            value={note}
            onChangeText={setNote}
            placeholder={CLOSE_COPY.notePlaceholder}
            placeholderTextColor={Colors.mutedSageGray}
            multiline
            maxFontSizeMultiplier={1.3}
            accessibilityLabel={CLOSE_COPY.noteQuestion}
            testID="weekly-close-note"
          />
          <Text style={styles.hint} maxFontSizeMultiplier={1.3}>
            {CLOSE_COPY.noteSkip}
          </Text>

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
              <Text style={styles.saveLabel} maxFontSizeMultiplier={1.3}>
                {CLOSE_COPY.save}
              </Text>
            )}
          </TouchableOpacity>

          {!answered && !saving && (
            <Text
              style={styles.required}
              maxFontSizeMultiplier={1.3}
              testID="weekly-close-required"
            >
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
  // The one raised surface on the screen, so the question reads as the thing
  // being asked rather than as another paragraph. The note sits flat beneath
  // it: two tiers, and the primary one is the read.
  card: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
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
  // Selection is carried by the border and nothing else. No fill, so no answer
  // reads as the good one.
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
  // Charcoal on the plain background, centred, and alone on the screen. Not
  // teal, not a card, not a tick: it is the app saying it heard, not a reward.
  confirmation: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    textAlign: 'center',
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

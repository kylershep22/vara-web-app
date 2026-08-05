// Today (spec 9), MINIMAL first cut.
//
// On screen: the single action from the active protocol, this week's summary
// (outcome + capacity), the week-1 quick win when it is active, and the floor
// commitment when capacity is slammed.
//
// Also on screen: the "This week changed" re-set control (spec 7), always
// visible per spec 9. It is SECONDARY to the day's action, which stays the one
// primary thing on the screen.
//
// Also on screen: the continuity count (spec 1, below the fold per spec 9) and
// the entry to the weekly close (spec 8). Continuity is a COUNT of unbroken
// weeks and renders nothing at all at zero, because "0 weeks" is a deficit and
// this screen has no deficits on it.
//
// DELIBERATELY ABSENT, each landing in its own slice: the completion CTA and
// its dailyLog write, the daily energy ping (spec 11), and the AI Coach entry.
// Nothing here is rendered as a disabled or inert stand-in for them. A tappable
// that does nothing teaches the user the screen is broken, which is also why an
// unavailable re-set direction renders as a note and not as a dead button.
//
// The re-set RELOADS rather than patching state locally. The protocol has to
// re-derive at the new tier AND the conditional floor read has to re-run, since
// the floor card appears on crossing into slammed and disappears on leaving it.
// A local patch would skip that fetch and leave the card wrong.
//
// Spec 9 also lists what may never appear here: no streak, badge, point,
// leaderboard, percentage, grade, second CTA, or anything red.
//
// The protocol is RECOMPUTED from the stored cycle rather than stored with it.
// The cycle keeps only the specced fields, and the engine is pure, so outcome
// plus capacity plus week number is enough to get back to the same protocol.
//
// No animation, so Reduce Motion has nothing to suppress.

import React, { useCallback, useEffect, useRef, useState } from 'react';
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
  applyQuickWin,
  nextTierDown,
  nextTierUp,
  selectProtocol,
  type CapacityTier,
  type ResolvedWeeklyProtocol,
} from '../../weeklyEngine';
import { getFloorCommitment } from '../../services/firebase/userPrivate.service';
import {
  countWeeklyCyclesForOutcome,
  getLatestWeeklyCycle,
  resetWeeklyCapacity,
} from '../../services/firebase/weeklyCycle.service';
import type { WeeklyCycle } from '../../types/models';
import { logger } from '../../utils/logger';
import { ROUTES } from '../../navigation/routes';
import { CAPACITY_LABELS, OUTCOME_LABELS, TODAY_COPY } from './copy';
import { loadWeeklyContinuity } from './weeklyContinuity';

const MIN_TOUCH_TARGET = 48;

interface TodayView {
  cycle: WeeklyCycle;
  protocol: ResolvedWeeklyProtocol;
  /** Only fetched, and only shown, when capacity is slammed. */
  floorCommitment: string | null;
  /**
   * Unbroken weeks (spec 1). null when the read failed, which is NOT the same
   * as 0: zero is a claim about the user, an unreadable history is not.
   */
  continuity: number | null;
}

export function WeeklyTodayScreen() {
  const navigation = useNavigation<{ replace: (route: string) => void }>();
  const { user } = useAuth();
  const [view, setView] = useState<TodayView | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);
  // A failed re-set is NOT a failed week: the cycle on screen is still valid, so
  // this is its own inline error rather than `failed`, which replaces the whole
  // screen. `resetting` guards the window between the tap and the reload, where
  // a second tap would write a transition from a tier the user is no longer on.
  const [resetFailed, setResetFailed] = useState(false);
  const [resetting, setResetting] = useState(false);

  // Held in a ref and kept OUT of the effect's dependencies on purpose.
  // useNavigation hands back a fresh object on some renders, and a navigation
  // object in the deps means every failed load re-triggers the load that just
  // failed: spinner, error, spinner, error, forever. The ref is always current
  // because it is assigned during render.
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;

  // Depend on the uid, not the user object: the identity of the object can
  // change on an auth-context re-render without the signed-in user changing,
  // and re-running this load on every such render would refetch the week for no
  // reason (and restart it mid-failure).
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;
    let active = true;

    const load = async () => {
      setFailed(false);
      try {
        const cycle = await getLatestWeeklyCycle(uid);
        if (!active) return;
        if (!cycle) {
          // Nothing to show. The guard owns the routing rule, so hand the
          // decision back to it rather than guessing here.
          navigationRef.current.replace(ROUTES.WeeklyEntry);
          return;
        }

        // THE SINGLE DERIVATION OF THE WEEK NUMBER. Nothing hands one in, and
        // nothing else computes one: a second derivation elsewhere would run
        // against a different database state, and the two could then disagree
        // about whether the quick win is active for the same week.
        //
        // The count INCLUDES the current week's cycle, which is always
        // persisted by the time this screen mounts. On a fresh open the write
        // is awaited before navigation; on re-entry the cycle has been stored
        // for hours or days. So a first week on an outcome counts 1, and week 1
        // is what activates the quick win (spec 6.3).
        //
        // Read through getDocs rather than an aggregation query on purpose:
        // getCountFromServer bypasses the local cache and would miss a
        // just-written cycle that has not yet round-tripped to the server.
        const weekNumber = await countWeeklyCyclesForOutcome(uid, cycle.outcome);

        // capacityCurrent, not capacityInitial: the current tier is what the
        // user is living in. They are equal until the re-set control ships.
        const protocol = applyQuickWin(
          selectProtocol(cycle.outcome, cycle.capacityCurrent),
          weekNumber
        );

        // Read the floor only when it will be shown (spec 9: capacity slammed).
        const floorCommitment =
          cycle.capacityCurrent === 'slammed' ? await getFloorCommitment(uid) : null;

        // Continuity is BEST EFFORT and cannot take the screen down with it.
        // The day's action is what this screen is for; a below-the-fold count
        // that failed to load is a reason to show one thing less, not to
        // replace a valid week with an error. Caught here rather than folded
        // into the outer catch for exactly that reason.
        //
        // This is a second read of the same cycles the latest-cycle lookup
        // walked. Accepted: deriving both from one fetch would mean a second
        // derivation of "latest" living in this screen, and that is the one
        // thing the service comment on getLatestWeeklyCycle warns against.
        let continuity: number | null = null;
        try {
          continuity = await loadWeeklyContinuity(uid);
        } catch (error) {
          logger.error('[WeeklyToday] continuity read failed:', error);
        }

        if (active) setView({ cycle, protocol, floorCommitment, continuity });
      } catch (error) {
        logger.error('[WeeklyToday] load failed:', error);
        if (active) setFailed(true);
      }
    };

    load();
    return () => {
      active = false;
    };
  }, [uid, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  /**
   * Move to an adjacent tier. One tap, no confirmation (spec 7).
   *
   * `from` is the tier currently on screen, passed through so the event records
   * the transition the user actually saw and tapped rather than whatever a
   * re-read might return.
   *
   * On success this bumps `attempt` instead of patching `view`. That reload is
   * load-bearing twice over: the protocol re-derives from the stored
   * capacityCurrent, and the floor read re-runs so the floor card appears on the
   * way into slammed and goes away on the way out.
   *
   * On failure nothing on screen moves. The batch is atomic, so a rejection
   * means neither write landed and the displayed tier is still the true one.
   */
  const changeTier = useCallback(
    async (from: CapacityTier, to: CapacityTier) => {
      if (!uid || !view || resetting) return;
      setResetting(true);
      setResetFailed(false);
      try {
        await resetWeeklyCapacity(uid, view.cycle.id, from, to);
        setAttempt((n) => n + 1);
      } catch (error) {
        logger.error('[WeeklyToday] capacity re-set failed:', error);
        setResetFailed(true);
      } finally {
        setResetting(false);
      }
    },
    [uid, view, resetting]
  );

  if (failed) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <Text style={styles.error} testID="weekly-today-error">
            {TODAY_COPY.loadFailed}
          </Text>
          <TouchableOpacity
            style={styles.retryButton}
            onPress={retry}
            accessibilityRole="button"
            accessibilityLabel={TODAY_COPY.retry}
            testID="weekly-today-retry"
          >
            <Text style={styles.retryLabel}>{TODAY_COPY.retry}</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  if (!view) {
    return (
      <SafeAreaView style={styles.safe} edges={['top']}>
        <View style={styles.center}>
          <ActivityIndicator color={Colors.evergreenTeal} />
        </View>
      </SafeAreaView>
    );
  }

  const { cycle, protocol, floorCommitment, continuity } = view;

  // Derived from CAPACITY_TIERS through the engine helpers, which are the only
  // place the tier order lives. Null means the ladder ends here, and that is
  // what the edge note renders instead of a button.
  const downTier = nextTierDown(cycle.capacityCurrent);
  const upTier = nextTierUp(cycle.capacityCurrent);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <ScrollView contentContainerStyle={styles.content} testID="weekly-today">
        {/* Above the fold: the day's single action. */}
        <Text style={styles.sectionLabel}>{TODAY_COPY.actionHeading}</Text>
        <View style={styles.actionCard}>
          <Text style={styles.dailyAction} testID="weekly-today-action">
            {protocol.dailyAction}
          </Text>
        </View>

        {/* Week-1 quick win (spec 6.3): a mandatory same-session practice, not
            one of the optional supporting practices, so it is read from
            quickWinPracticeId and never from supportingPracticeIds. */}
        {protocol.quickWinActive && (
          <View style={styles.quickWinCard} testID="weekly-today-quickwin">
            <Text style={styles.sectionLabel}>{TODAY_COPY.quickWinHeading}</Text>
            <Text style={styles.quickWin}>{TODAY_COPY.quickWinPractice}</Text>
          </View>
        )}

        {/* Below the fold: this week's protocol summary. */}
        <Text style={styles.sectionLabel}>{TODAY_COPY.weekHeading}</Text>
        <Text style={styles.weekSummary} testID="weekly-today-summary">
          {OUTCOME_LABELS[cycle.outcome]} / {CAPACITY_LABELS[cycle.capacityCurrent]}
        </Text>
        <Text style={styles.protocolName}>{protocol.name}</Text>

        {/* Floor commitment, shown on slammed weeks (spec 9, 10.1). In the
            user's own words, never rendered back as a target or a score. */}
        {floorCommitment && (
          <View style={styles.floorCard} testID="weekly-today-floor">
            <Text style={styles.sectionLabel}>{TODAY_COPY.floorHeading}</Text>
            <Text style={styles.floor}>{floorCommitment}</Text>
          </View>
        )}

        {/* The dynamic in-week re-set (spec 7), always visible (spec 9). Last
            on the screen and outlined rather than filled: the day's action is
            the one primary thing here, and this is the quiet way out of a week
            that turned out differently.

            Both directions are one tap with no confirmation. Neither is framed
            as a failure or a reward, because continuity is measured against the
            floor commitment and never against the tier: re-setting in either
            direction cannot break or extend a run. */}
        <View style={styles.resetCard} testID="weekly-today-reset">
          <Text style={styles.sectionLabel}>{TODAY_COPY.resetHeading}</Text>

          {downTier && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => changeTier(cycle.capacityCurrent, downTier)}
              disabled={resetting}
              accessibilityRole="button"
              accessibilityLabel={TODAY_COPY.resetDown}
              accessibilityState={{ disabled: resetting }}
              testID="weekly-today-reset-down"
            >
              <Text style={styles.resetLabel}>{TODAY_COPY.resetDown}</Text>
            </TouchableOpacity>
          )}

          {upTier && (
            <TouchableOpacity
              style={styles.resetButton}
              onPress={() => changeTier(cycle.capacityCurrent, upTier)}
              disabled={resetting}
              accessibilityRole="button"
              accessibilityLabel={TODAY_COPY.resetUp}
              accessibilityState={{ disabled: resetting }}
              testID="weekly-today-reset-up"
            >
              <Text style={styles.resetLabel}>{TODAY_COPY.resetUp}</Text>
            </TouchableOpacity>
          )}

          {/* At either end of the ladder the missing direction is stated, not
              rendered as a button that would do nothing. */}
          {(!downTier || !upTier) && (
            <Text style={styles.resetEdge} testID="weekly-today-reset-edge">
              {downTier ? TODAY_COPY.resetAtHighest : TODAY_COPY.resetAtLowest}
            </Text>
          )}

          {/* The batch is atomic, so a failure means neither write landed and
              the tier above is still the true one. Say so, in coral. */}
          {resetFailed && (
            <Text style={styles.resetError} testID="weekly-today-reset-error">
              {TODAY_COPY.resetFailed}
            </Text>
          )}
        </View>

        {/* Continuity (spec 1), below the fold per spec 9. A COUNT of unbroken
            weeks and nothing else: no percentage, no bar, no target, no colour.

            Rendered only when there is a run to show. At zero there is no
            "0 weeks" line, because a zero framed as a number is a deficit, and
            a user who has just started or just missed a week is not behind.
            null means the read failed and is likewise silent: showing 0 there
            would state something about the user that was never read. */}
        {continuity !== null && continuity > 0 && (
          <View style={styles.continuityCard} testID="weekly-today-continuity">
            <Text style={styles.sectionLabel}>{TODAY_COPY.continuityHeading}</Text>
            <Text style={styles.continuity}>
              {continuity === 1
                ? TODAY_COPY.continuityCountOne
                : TODAY_COPY.continuityCount.replace('{count}', `${continuity}`)}
            </Text>
          </View>
        )}

        {/* The weekly close (spec 8). Last on the screen and outlined, like the
            re-set: the day's action stays the one primary thing here.

            This is a deliberate entry, not the real trigger. The close belongs
            to an elapsed week, and routing on that boundary is a follow-up on
            the entry guard. Nothing checks the boundary here, so nothing here
            pretends a week has ended. */}
        <TouchableOpacity
          style={styles.closeButton}
          onPress={() => navigation.replace(ROUTES.WeeklyClose)}
          accessibilityRole="button"
          accessibilityLabel={TODAY_COPY.closeEntry}
          testID="weekly-today-close-entry"
        >
          <Text style={styles.closeLabel}>{TODAY_COPY.closeEntry}</Text>
        </TouchableOpacity>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: Colors.background.default,
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
  sectionLabel: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.sm,
  },
  actionCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  dailyAction: {
    ...TextStyles.h3,
    color: Colors.softCharcoal,
  },
  quickWinCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
  },
  quickWin: {
    ...TextStyles.body,
    color: Colors.softCharcoal,
  },
  weekSummary: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
  protocolName: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
    marginTop: 2,
    marginBottom: Spacing.lg,
  },
  floorCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
  },
  floor: {
    ...TextStyles.body,
    color: Colors.softCharcoal,
  },
  resetCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  // Outlined, not filled: secondary to the day's action, which is the one
  // primary thing on this screen.
  resetButton: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginBottom: Spacing.sm,
  },
  resetLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
    textAlign: 'center',
  },
  resetEdge: {
    ...TextStyles.bodySmall,
    color: Colors.mutedSageGray,
  },
  resetError: {
    ...TextStyles.bodySmall,
    // Soft coral, the brand's only error colour. Never red.
    color: Colors.softCoral,
    marginTop: Spacing.sm,
  },
  continuityCard: {
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: Colors.surface,
    padding: Spacing.lg,
    marginTop: Spacing.lg,
  },
  continuity: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
  // Outlined like the re-set control, for the same reason: secondary to the
  // day's action.
  closeButton: {
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: 14,
    borderWidth: 1,
    borderColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    marginTop: Spacing.lg,
  },
  closeLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
    textAlign: 'center',
  },
  error: {
    ...TextStyles.body,
    // Soft coral, the brand's only error colour. Never red.
    color: Colors.softCoral,
    marginBottom: Spacing.lg,
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

export default WeeklyTodayScreen;

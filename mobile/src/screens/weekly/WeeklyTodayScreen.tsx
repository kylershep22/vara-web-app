// Today (spec 9), MINIMAL first cut.
//
// On screen: the single action from the active protocol, this week's summary
// (outcome + capacity), the week-1 quick win when it is active, and the floor
// commitment when capacity is slammed.
//
// DELIBERATELY ABSENT, each landing in its own slice: the completion CTA and
// its dailyLog write, the "This week changed" re-set control (spec 7), the
// daily energy ping (spec 11), the continuity indicator (open item 10, which
// resolves at the weekly close), and the AI Coach entry. Nothing here is
// rendered as a disabled or inert stand-in for them. A tappable that does
// nothing teaches the user the screen is broken.
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
  selectProtocol,
  type ResolvedWeeklyProtocol,
} from '../../weeklyEngine';
import { getFloorCommitment } from '../../services/firebase/userPrivate.service';
import {
  countWeeklyCyclesForOutcome,
  getLatestWeeklyCycle,
} from '../../services/firebase/weeklyCycle.service';
import type { WeeklyCycle } from '../../types/models';
import { logger } from '../../utils/logger';
import { ROUTES } from '../../navigation/routes';
import { CAPACITY_LABELS, OUTCOME_LABELS, TODAY_COPY } from './copy';

const MIN_TOUCH_TARGET = 48;

interface TodayView {
  cycle: WeeklyCycle;
  protocol: ResolvedWeeklyProtocol;
  /** Only fetched, and only shown, when capacity is slammed. */
  floorCommitment: string | null;
}

export function WeeklyTodayScreen() {
  const navigation = useNavigation<{ replace: (route: string) => void }>();
  const { user } = useAuth();
  const [view, setView] = useState<TodayView | null>(null);
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

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

        if (active) setView({ cycle, protocol, floorCommitment });
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

  const { cycle, protocol, floorCommitment } = view;

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

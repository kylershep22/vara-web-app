// Entry guard for the weekly loop (spec 6.1, 10.1).
//
// Fetches the two facts the routing rule needs and obeys resolveWeeklyEntry:
// no floor commitment sends the user to capture it, no current cycle sends them
// to the weekly open, otherwise Today. The rule itself lives in weeklyEntry.ts
// so it can be tested without a navigator.
//
// TODAY IS HOME. There is no standalone Today screen: Home renders the day's
// action, the capacity re-set, the continuity count and the close entry, and it
// resolves this same rule inline through useWeeklyLanding because a tab cannot
// be replaced into. This guard still exists for the flows that reach it from
// inside the weekly stack, and it now sends 'today' to the tab.
//
// THIS IS THE REUSABLE SEAM. The progressive onboarding in spec 18 will satisfy
// the same two preconditions in its own arc; when it does, it replaces the
// screens this guard routes to, not the rule.
//
// Never a push: this screen is a decision, and leaving it on the stack would
// put a blank router behind the back gesture. See TARGET_NAV for why that means
// `replace` for two targets and `navigate` for the third.
//
// No animation here, so Reduce Motion has nothing to suppress.

import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';

import { Colors, Spacing, TextStyles, Typography } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { getFloorCommitment } from '../../services/firebase/userPrivate.service';
import { getLatestWeeklyCycle } from '../../services/firebase/weeklyCycle.service';
import { logEvent } from '../../services/firebase/analyticsEvents.service';
import { logger } from '../../utils/logger';
import { toIsoDate } from '../../utils/weekStart';
import { ROUTES } from '../../navigation/routes';
import { ENTRY_COPY } from './copy';
import { resolveWeeklyEntry, type WeeklyEntryTarget } from './weeklyEntry';

const MIN_TOUCH_TARGET = 48;

interface Navigator {
  replace: (route: string) => void;
  navigate: (route: string, params?: object) => void;
}

/**
 * How each target is reached. A Record over the target union, so adding a
 * fourth target is a compile error here rather than a silently unrouted state.
 *
 * NOT a map of route names any more, because the three targets no longer share
 * a verb. 'floor' is a stack screen and is replaced into, which is what keeps
 * this decision screen off the back gesture. 'today' is HOME, a tab
 * inside Main, and a tab cannot be replaced into: `replace(Main)` would stack a
 * second Main on top of the one already at the root. navigate pops back to it.
 */
const TARGET_NAV: Record<WeeklyEntryTarget, (nav: Navigator) => void> = {
  floor: (nav) => nav.replace(ROUTES.WeeklyFloor),
  // 'rollover' GOES TO HOME, exactly like 'today'. It is not a destination: it
  // says the user needs a cycle, and Home's landing is what creates one before
  // it renders. Routing it anywhere else would need a second copy of the
  // rollover, which is how two writers of one cycle start racing each other.
  rollover: (nav) => nav.navigate(ROUTES.Main, { screen: ROUTES.Home }),
  today: (nav) => nav.navigate(ROUTES.Main, { screen: ROUTES.Home }),
};

export function WeeklyEntryScreen() {
  const navigation = useNavigation<Navigator>();
  const { user } = useAuth();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  // Held in a ref and kept OUT of the effect's dependencies on purpose.
  // useNavigation hands back a fresh object on some renders, and a navigation
  // object in the deps means every failed routing attempt re-triggers the
  // attempt that just failed: spinner, error, spinner, error, forever. The ref
  // is always current because it is assigned during render.
  const navigationRef = useRef(navigation);
  navigationRef.current = navigation;

  // Depend on the uid, not the user object: its identity can change on an
  // auth-context re-render without the signed-in user changing.
  const uid = user?.uid;

  useEffect(() => {
    if (!uid) return;
    let active = true;

    const route = async () => {
      setFailed(false);
      try {
        const floorCommitment = await getFloorCommitment(uid);
        // Skip the cycle read entirely when there is no floor: the answer is
        // already 'floor' and the read would be thrown away.
        const latest = floorCommitment ? await getLatestWeeklyCycle(uid) : null;
        if (!active) return;

        // The cycle's stored boundary and closed-ness, matching what Home hands
        // the same rule through useWeeklyLanding. The two producers must agree
        // about which facts the rule sees, or the tab and the route start
        // disagreeing about which week the user is in.
        const target = resolveWeeklyEntry({
          floorCommitment,
          latestCycle: latest
            ? {
                weekStart: latest.weekStart,
                weekEnd: latest.weekEnd,
                closed: !!latest.closeCompletedAt,
              }
            : null,
          todayIso: toIsoDate(new Date()),
        });

        // Telemetry (spec 20): the entry funnel. The route only, which is a
        // closed three-member union — `floorCommitment` is the user's own words
        // and is in scope ten lines above, and even `!!floorCommitment` is
        // already implied by `target === 'floor'`.
        //
        // ALL THREE TARGETS ARE LOGGED, including 'floor'. Note that a first-run
        // user legitimately emits 'floor' and then 'open' in one continuous
        // flow, because the floor screen replaces back through this guard. That
        // is the funnel working, not duplication — but an aggregation that reads
        // the route distribution naively will over-count 'floor'.
        //
        // Own try/catch: the routing decision is made and must not be blocked by
        // telemetry.
        try {
          logEvent(uid, 'weekly_entry', { route: target });
        } catch {
          // Never the user's problem.
        }

        TARGET_NAV[target](navigationRef.current);
      } catch (error) {
        logger.error('[WeeklyEntry] routing failed:', error);
        // A read failure must not guess. Routing to the open on an unknown
        // state would let a user open a second cycle for a week they have
        // already opened, so the guard stops and offers a retry instead.
        if (active) setFailed(true);
      }
    };

    route();
    return () => {
      active = false;
    };
  }, [uid, attempt]);

  const retry = useCallback(() => setAttempt((n) => n + 1), []);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.center} testID="weekly-entry">
        {!user ? (
          <Text style={styles.message}>{ENTRY_COPY.signedOut}</Text>
        ) : failed ? (
          <>
            <Text style={styles.error} testID="weekly-entry-error">
              {ENTRY_COPY.failed}
            </Text>
            <TouchableOpacity
              style={styles.retryButton}
              onPress={retry}
              accessibilityRole="button"
              accessibilityLabel={ENTRY_COPY.retry}
              testID="weekly-entry-retry"
            >
              <Text style={styles.retryLabel}>{ENTRY_COPY.retry}</Text>
            </TouchableOpacity>
          </>
        ) : (
          <>
            <ActivityIndicator color={Colors.evergreenTeal} />
            <Text style={styles.message}>{ENTRY_COPY.loading}</Text>
          </>
        )}
      </View>
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
  message: {
    ...TextStyles.body,
    color: Colors.mutedSageGray,
    marginTop: Spacing.md,
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

export default WeeklyEntryScreen;

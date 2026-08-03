// Entry guard for the weekly loop (spec 6.1, 10.1).
//
// Fetches the two facts the routing rule needs and obeys resolveWeeklyEntry:
// no floor commitment sends the user to capture it, no current cycle sends them
// to the weekly open, otherwise Today. The rule itself lives in weeklyEntry.ts
// so it can be tested without a navigator.
//
// THIS IS THE REUSABLE SEAM. The progressive onboarding in spec 18 will satisfy
// the same two preconditions in its own arc; when it does, it replaces the
// screens this guard routes to, not the rule.
//
// Every navigation is a replace, never a push: this screen is a decision, and
// leaving it on the stack would put a blank router behind the back gesture.
//
// No animation here, so Reduce Motion has nothing to suppress.

import React, { useCallback, useEffect, useState } from 'react';
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
import { logger } from '../../utils/logger';
import { toIsoDate } from '../../utils/weekStart';
import { ROUTES } from '../../navigation/routes';
import { ENTRY_COPY } from './copy';
import { resolveWeeklyEntry, type WeeklyEntryTarget } from './weeklyEntry';

const MIN_TOUCH_TARGET = 48;

const TARGET_ROUTE: Record<WeeklyEntryTarget, string> = {
  floor: ROUTES.WeeklyFloor,
  open: ROUTES.WeeklyOpen,
  today: ROUTES.WeeklyToday,
};

export function WeeklyEntryScreen() {
  const navigation = useNavigation<{ replace: (route: string) => void }>();
  const { user } = useAuth();
  const [failed, setFailed] = useState(false);
  const [attempt, setAttempt] = useState(0);

  useEffect(() => {
    if (!user) return;
    let active = true;

    const route = async () => {
      setFailed(false);
      try {
        const floorCommitment = await getFloorCommitment(user.uid);
        // Skip the cycle read entirely when there is no floor: the answer is
        // already 'floor' and the read would be thrown away.
        const latest = floorCommitment ? await getLatestWeeklyCycle(user.uid) : null;
        if (!active) return;

        const target = resolveWeeklyEntry({
          floorCommitment,
          latestCycleWeekStart: latest?.weekStart ?? null,
          todayIso: toIsoDate(new Date()),
        });
        navigation.replace(TARGET_ROUTE[target]);
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
  }, [user, navigation, attempt]);

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

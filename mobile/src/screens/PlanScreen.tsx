/**
 * Plan Screen (the "Time" hub, registered as ROUTES.PillarTime)
 * Routines only (V1-HABITS-RETIREMENT, ruling B of the V1 SCOPE REVISION block).
 *
 * The Habits sub-tab, its segmented switch, its All | Active | Complete filters
 * and its date banner left V1 with habits. What remains is the routines list
 * (RoutinesTab, which owns its own Morning / Evening / Sunday / Custom chips)
 * and the routine player.
 *
 * Callers still pass `{ tab: 'routines' }` (the Journey Routines card, the
 * routine-reminder tap, the check-in hand-off). The param is accepted and
 * ignored: there is only one thing this screen can show.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import Text from '../components/shared/Text';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, TextStyles } from '../constants';
import { GuidePill } from '../components/ai/GuidePill';
import { RoutinesTab } from './Time/RoutinesTab';
import { ActiveRoutinePlayer } from './Time/ActiveRoutinePlayer';
import { Routine } from '../services/firebase/routines.service';

// No notification opt-in push here. The mount-time one never fired, and a
// routine reminder now asks for permission at the moment it is set
// (ROUTINE-REMINDERS, ruling R-K, 2026-10-01).
const PlanScreen: React.FC = () => {
  // Routine player state
  const [playerVisible, setPlayerVisible] = useState(false);
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);

  const handleStartRoutine = useCallback((routine: Routine) => {
    setActiveRoutine(routine);
    setPlayerVisible(true);
  }, []);

  const handleClosePlayer = useCallback(() => {
    setPlayerVisible(false);
    setActiveRoutine(null);
  }, []);

  const handleEditRoutine = useCallback(() => {
    setPlayerVisible(false);
    // Routine editing is handled within RoutinesTab
  }, []);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerText}>
          <Text style={styles.pageTitle}>Time</Text>
          <Text style={styles.pageSubtitle}>{"Routines you've built"}</Text>
        </View>
        {/* Docked Guide pill, top-right (this pillar has no hero band). */}
        <GuidePill context={{ screen: 'time' }} testID="time-guide" />
      </View>

      {/* Content */}
      <View style={styles.content}>
        <RoutinesTab onStartRoutine={handleStartRoutine} />
      </View>

      {/* Active Routine Player Modal */}
      {activeRoutine && (
        <ActiveRoutinePlayer
          visible={playerVisible}
          routine={activeRoutine}
          onClose={handleClosePlayer}
          onEditRoutine={handleEditRoutine}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.base,
  },
  headerText: {
    flex: 1,
  },
  // Match the Focus/Energy hub title + subtitle type scale (TextStyles.h1 /
  // TextStyles.body). The old pageTitle referenced Typography.fontSize.xxl,
  // which does not exist (the token is '2xl'), so the title silently fell back
  // to RN's default size and read smaller than the other hubs.
  pageTitle: {
    ...TextStyles.h1,
    color: Colors.evergreenTeal,
  },
  pageSubtitle: {
    ...TextStyles.body,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },

  // Content
  content: {
    flex: 1,
  },
});

export default PlanScreen;

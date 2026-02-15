/**
 * FocusScreen
 * Main Focus screen with Pomodoro and Routines tabs
 *
 * Per Focus Page Spec:
 * - Custom SegmentedControl with brand-compliant styling
 * - Two tabs: Pomodoro timer and Routines
 * - ActiveRoutinePlayer modal overlay
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  ColorTokens,
  SpacingTokens,
  TypographyTokens,
  FocusCopy,
} from '../../tokens/design-tokens';
import { SegmentedControl } from './components';
import { PomodoroTab } from './PomodoroTab';
import { RoutinesTab } from './RoutinesTab';
import { ActiveRoutinePlayer } from './ActiveRoutinePlayer';

type TabValue = 'pomodoro' | 'routines';

interface Routine {
  id: string;
  name: string;
  activities: Array<{
    id: number | string;
    name: string;
    duration: number;
    icon: string;
    color: string;
  }>;
}

const TABS = [
  { value: 'pomodoro', label: FocusCopy.tabPomodoro, icon: 'timer-outline' },
  { value: 'routines', label: FocusCopy.tabRoutines, icon: 'format-list-checks' },
];

export const FocusScreen: React.FC = () => {
  const [selectedTab, setSelectedTab] = useState<TabValue>('pomodoro');

  // Active routine player state
  const [playerVisible, setPlayerVisible] = useState(false);
  const [activeRoutine, setActiveRoutine] = useState<Routine | null>(null);

  const handleTabChange = useCallback((value: string) => {
    setSelectedTab(value as TabValue);
  }, []);

  const handleStartRoutine = useCallback((routine: Routine) => {
    setActiveRoutine(routine);
    setPlayerVisible(true);
  }, []);

  const handleClosePlayer = useCallback(() => {
    setPlayerVisible(false);
    setActiveRoutine(null);
  }, []);

  const handleEditRoutine = useCallback(() => {
    // Close player and trigger edit mode in RoutinesTab
    setPlayerVisible(false);
    // The edit would be handled by RoutinesTab's existing edit functionality
  }, []);

  const subtitle = selectedTab === 'pomodoro'
    ? FocusCopy.pomodoroSubtitle
    : FocusCopy.routinesSubtitle;

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>{FocusCopy.pageTitle}</Text>
        <Text style={styles.subtitle}>{subtitle}</Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <SegmentedControl
          options={TABS}
          selectedValue={selectedTab}
          onValueChange={handleTabChange}
        />
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {selectedTab === 'pomodoro' ? (
          <PomodoroTab showAdvancedDuration />
        ) : (
          <RoutinesTab onStartRoutine={handleStartRoutine} />
        )}
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
    backgroundColor: ColorTokens.backgroundPrimary,
  },
  header: {
    paddingHorizontal: SpacingTokens.lg,
    paddingVertical: SpacingTokens.base,
  },
  title: {
    fontSize: TypographyTokens.fontH1,
    fontWeight: '600',
    color: ColorTokens.primary,
  },
  subtitle: {
    fontSize: 14,
    color: ColorTokens.textSecondary,
    marginTop: SpacingTokens.xs,
  },
  tabContainer: {
    paddingHorizontal: SpacingTokens.lg,
    paddingBottom: SpacingTokens.base,
  },
  content: {
    flex: 1,
  },
});

export default FocusScreen;

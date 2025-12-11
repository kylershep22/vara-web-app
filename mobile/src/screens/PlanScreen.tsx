/**
 * Plan Screen
 * Consolidated screen for Goals, Habits, and Tasks
 */

import React, { useState } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing } from '../constants';
import GoalsScreen from './GoalsScreen';
import HabitsScreen from './HabitsScreen';
import TasksScreen from './TasksScreen';

const PlanScreen: React.FC = () => {
  const [activeTab, setActiveTab] = useState('goals');

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.screenTitle}>
          Plan
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Set goals, build habits, manage tasks
        </Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={activeTab}
          onValueChange={setActiveTab}
          buttons={[
            { value: 'goals', label: 'Goals' },
            { value: 'habits', label: 'Habits' },
            { value: 'tasks', label: 'Tasks' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'goals' && <GoalsScreen hideHeader />}
        {activeTab === 'habits' && <HabitsScreen hideHeader />}
        {activeTab === 'tasks' && <TasksScreen hideHeader />}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  tabContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  segmentedButtons: {
    backgroundColor: Colors.surface,
  },
  content: {
    flex: 1,
  },
});

export default PlanScreen;

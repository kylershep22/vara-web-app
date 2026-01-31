/**
 * Plan Screen
 * Consolidated screen for Goals, Habits, and Tasks
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet } from 'react-native';
import { Text, SegmentedButtons } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../constants';
import GoalsScreen from './GoalsScreen';
import HabitsScreen from './HabitsScreen';
import TasksScreen from './TasksScreen';
import InsightsScreen from './InsightsScreen';

const PlanScreen: React.FC = () => {
  const route = useRoute();
  const params = route.params as { tab?: string } | undefined;
  const [activeTab, setActiveTab] = useState(params?.tab || 'goals');

  // Update tab when route params change
  useEffect(() => {
    if (params?.tab) {
      setActiveTab(params.tab);
    }
  }, [params?.tab]);

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.screenTitle}>
          Plan
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Manage your wellness journey
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
            { value: 'insights', label: 'Insights' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Tab Content */}
      <View style={styles.content}>
        {activeTab === 'goals' && <GoalsScreen hideHeader />}
        {activeTab === 'habits' && <HabitsScreen hideHeader />}
        {activeTab === 'tasks' && <TasksScreen hideHeader />}
        {activeTab === 'insights' && <InsightsScreen hideHeader />}
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
    fontWeight: Typography.fontWeight.bold,
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

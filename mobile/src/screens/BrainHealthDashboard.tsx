/**
 * Brain Health Dashboard
 * Dedicated screen for brain health metrics, tools, and tracking
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../constants';
import {
  BrainReadinessWidget,
  NeuroplasticityTracker,
  NervousSystemToolsWidget,
  AMCCChallengeCard,
  FocusWindowIndicator,
  WeeklyBrainMetricsChart,
  AIBrainInsightCard,
} from '../components/brain';

export default function BrainHealthDashboard() {
  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Icon name="brain" size={32} color={Colors.evergreenTeal} />
          <View style={styles.headerText}>
            <Text variant="headlineMedium" style={styles.title}>
              Brain Health
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Track your cognitive wellness and performance
            </Text>
          </View>
        </View>
      </View>

      {/* Brain Health Widgets */}
      <View style={styles.content}>
        <AIBrainInsightCard />
        <BrainReadinessWidget />
        <FocusWindowIndicator />
        <NeuroplasticityTracker />
        <AMCCChallengeCard />
        <NervousSystemToolsWidget />
        <WeeklyBrainMetricsChart />
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs / 2,
  },
  content: {
    padding: Spacing.lg,
  },
});

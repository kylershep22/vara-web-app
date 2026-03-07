/**
 * Breathwork Detail Screen
 * Individual breathwork session with timer
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Layout, Typography } from '../../constants';
import { getBreathworkSession } from '../../services/firebase/library.service';
import { BreathworkTimer } from '../../components/library/BreathworkTimer';

type RouteParams = {
  BreathworkDetail: {
    sessionId: string;
  };
};

export default function BreathworkDetailScreen() {
  const route = useRoute<RouteProp<RouteParams, 'BreathworkDetail'>>();
  const { sessionId } = route.params;
  const session = getBreathworkSession(sessionId);

  const [isActive, setIsActive] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  if (!session) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={48} color={Colors.error} />
          <Text style={styles.errorText}>
            Session not found
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  const handleStart = () => {
    setIsActive(true);
    setIsCompleted(false);
  };

  const handleComplete = () => {
    setIsActive(false);
    setIsCompleted(true);
  };

  const handleReset = () => {
    setIsActive(false);
    setIsCompleted(false);
  };

  // Parse pattern from title (e.g., "Box Breathing (4-4-4-4)" -> "4-4-4-4")
  const getPattern = () => {
    const match = session.title.match(/\(([0-9-]+)\)/);
    return match ? match[1] : '4-4-4-4';
  };

  const getDuration = () => {
    return parseInt(session.duration) || 5;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.iconContainer}>
            <Icon name="meditation" size={48} color={Colors.evergreenTeal} />
          </View>

          <Text style={styles.title}>
            {session.title}
          </Text>

          <Text style={styles.description}>
            {session.description}
          </Text>

          {/* Metadata */}
          <View style={styles.metadata}>
            <View style={[styles.chip, {flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9999}]}>
              <Icon name="clock-outline" size={16} color={Colors.textSecondary} />
              <Text style={{fontSize: 14, color: Colors.textPrimary}}>{session.duration}</Text>
            </View>
            <View style={[styles.chip, styles.purposeChip, {flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9999}]}>
              <Icon name="target" size={16} color={Colors.evergreenTeal} />
              <Text style={styles.purposeText}>{session.purpose}</Text>
            </View>
          </View>
        </View>

        {/* Timer or Instructions */}
        {!isActive && !isCompleted && (
          <View style={styles.instructionsSection}>
            <Text style={styles.sectionTitle}>
              How it works
            </Text>
            <Text style={styles.instructionsText}>
              {session.instructions || 'Follow the visual guide and breathe in rhythm with the expanding circle.'}
            </Text>

            <View style={styles.tipsCard}>
              <Icon name="lightbulb-on-outline" size={24} color={Colors.sunriseAmber} />
              <View style={styles.tipsContent}>
                <Text style={styles.tipsTitle}>
                  Tip
                </Text>
                <Text style={styles.tipsText}>
                  Find a comfortable position, close your eyes if you like, and let the timer guide your breathing rhythm.
                </Text>
              </View>
            </View>

            <TouchableOpacity
              onPress={handleStart}
              style={[styles.startButton, {paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: 12}]}
            >
              <Text style={[styles.buttonLabel, {color: '#FFFFFF', fontWeight: '600'}]}>Start Session</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Breathwork Timer (when active) */}
        {isActive && (
          <View style={styles.timerSection}>
            <BreathworkTimer
              pattern={getPattern()}
              duration={getDuration()}
              onComplete={handleComplete}
              isActive={isActive}
            />

            <TouchableOpacity
              onPress={() => setIsActive(false)}
              style={[styles.stopButton, {paddingVertical: Spacing.sm, paddingHorizontal: 24, alignItems: 'center', borderRadius: 12, borderWidth: 1}]}
            >
              <Text style={styles.stopButtonLabel}>Stop</Text>
            </TouchableOpacity>
          </View>
        )}

        {/* Completion State */}
        {isCompleted && (
          <View style={styles.completionSection}>
            <Icon name="check-circle" size={64} color={Colors.success} />
            <Text style={styles.completionTitle}>
              Session Complete!
            </Text>
            <Text style={styles.completionText}>
              Great work! You've completed this breathwork session.
            </Text>

            <View style={styles.completionButtons}>
              <TouchableOpacity
                onPress={handleReset}
                style={[styles.repeatButton, {paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: 12}]}
              >
                <Text style={{color: '#FFFFFF', fontSize: Typography.fontSize.lg, fontWeight: '600'}}>Practice Again</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  scrollContent: {
    padding: Spacing.lg,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  errorText: {
    color: Colors.textPrimary,
    marginTop: Spacing.base,
  },
  header: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconContainer: {
    width: 96,
    height: 96,
    borderRadius: Layout.borderRadius['2xl'],
    backgroundColor: Colors.evergreenTeal + '20',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  title: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  description: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.base,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.lg,
  },
  metadata: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    borderColor: Colors.borderLight,
  },
  purposeChip: {
    backgroundColor: Colors.evergreenTeal + '20',
  },
  purposeText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  instructionsSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
  },
  instructionsText: {
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
    marginBottom: Spacing.lg,
  },
  tipsCard: {
    flexDirection: 'row',
    backgroundColor: Colors.sunriseAmber + '10',
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.base,
    marginBottom: Spacing.lg,
    gap: Spacing.base,
  },
  tipsContent: {
    flex: 1,
  },
  tipsTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 4,
  },
  tipsText: {
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },
  startButton: {
    backgroundColor: Colors.evergreenTeal,
  },
  buttonContent: {
    paddingVertical: Spacing.sm,
  },
  buttonLabel: {
    fontSize: Typography.fontSize.lg,
  },
  timerSection: {
    alignItems: 'center',
  },
  stopButton: {
    borderColor: Colors.error,
    marginTop: Spacing.xl,
  },
  stopButtonLabel: {
    color: Colors.error,
  },
  completionSection: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  completionTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  completionText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  completionButtons: {
    width: '100%',
    gap: Spacing.base,
  },
  repeatButton: {
    backgroundColor: Colors.evergreenTeal,
  },
});

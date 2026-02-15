/**
 * Brain Readiness Score Widget
 * Shows a simplified brain readiness score based on daily check-ins
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, ProgressBar as PaperProgressBar } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Card } from '../index';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useBrainHealthVocabulary } from '../../hooks';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, addDoc, updateDoc, doc, serverTimestamp, Timestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

interface BrainReadinessWidgetProps {
  onScoreUpdate?: (score: number) => void;
}

interface DailyCheckIn {
  sleepQuality: number; // 1-5
  hydrationLevel: number; // 1-5
  stressLevel: number; // 1-5
}

export const BrainReadinessWidget: React.FC<BrainReadinessWidgetProps> = ({ onScoreUpdate }) => {
  const { user } = useAuth();
  const { getComponentText, getInputLabel } = useBrainHealthVocabulary();
  const [checkIn, setCheckIn] = useState<DailyCheckIn>({
    sleepQuality: 0,
    hydrationLevel: 0,
    stressLevel: 0,
  });
  const [readinessScore, setReadinessScore] = useState<number>(0);
  const [hasCheckedInToday, setHasCheckedInToday] = useState(false);

  // Get translated text
  const { title: componentTitle } = getComponentText('brainReadiness');
  const sleepLabel = getInputLabel('sleepQuality');
  const hydrationLabel = getInputLabel('hydrationLevel');
  const stressLabel = getInputLabel('stressLevel');

  const today = new Date().toISOString().split('T')[0];

  // Load today's check-in if it exists
  useEffect(() => {
    const loadTodayCheckIn = async () => {
      if (!user) return;

      try {
        const metricsQuery = query(
          collection(db, 'brainMetrics'),
          where('userId', '==', user.uid),
          where('date', '==', today)
        );
        const snapshot = await getDocs(metricsQuery);

        if (!snapshot.empty) {
          const data = snapshot.docs[0].data();
          setCheckIn({
            sleepQuality: data.sleepQuality || 0,
            hydrationLevel: data.hydrationLevel || 0,
            stressLevel: data.stressLevel || 0,
          });
          setReadinessScore(data.readinessScore || 0);
          setHasCheckedInToday(true);
        }
      } catch (error) {
        console.error('Error loading brain metrics:', error);
      }
    };

    loadTodayCheckIn();
  }, [user, today]);

  // Calculate readiness score
  const calculateReadinessScore = (checkInData: DailyCheckIn): number => {
    const { sleepQuality, hydrationLevel, stressLevel } = checkInData;

    // All inputs should be filled for a score
    if (sleepQuality === 0 || hydrationLevel === 0 || stressLevel === 0) {
      return 0;
    }

    // Weighted average (sleep is most important)
    // Sleep: 40%, Hydration: 30%, Stress (inverted): 30%
    const sleepScore = (sleepQuality / 5) * 40;
    const hydrationScore = (hydrationLevel / 5) * 30;
    const stressScore = ((6 - stressLevel) / 5) * 30; // Inverted: lower stress = better

    return Math.round(sleepScore + hydrationScore + stressScore);
  };

  // Save check-in to Firestore
  const saveCheckIn = async (updatedCheckIn: DailyCheckIn) => {
    if (!user) return;

    try {
      const score = calculateReadinessScore(updatedCheckIn);

      // Check if today's metrics exist
      const metricsQuery = query(
        collection(db, 'brainMetrics'),
        where('userId', '==', user.uid),
        where('date', '==', today)
      );
      const snapshot = await getDocs(metricsQuery);

      if (snapshot.empty) {
        // Create new document
        await addDoc(collection(db, 'brainMetrics'), {
          userId: user.uid,
          date: today,
          sleepQuality: updatedCheckIn.sleepQuality,
          hydrationLevel: updatedCheckIn.hydrationLevel,
          stressLevel: updatedCheckIn.stressLevel,
          readinessScore: score,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      } else {
        // Update existing document
        const docRef = doc(db, 'brainMetrics', snapshot.docs[0].id);
        await updateDoc(docRef, {
          sleepQuality: updatedCheckIn.sleepQuality,
          hydrationLevel: updatedCheckIn.hydrationLevel,
          stressLevel: updatedCheckIn.stressLevel,
          readinessScore: score,
          updatedAt: serverTimestamp(),
        });
      }

      setReadinessScore(score);
      setHasCheckedInToday(true);
      onScoreUpdate?.(score);
    } catch (error) {
      console.error('Error saving brain metrics:', error);
    }
  };

  // Update check-in values
  const updateCheckIn = (field: keyof DailyCheckIn, value: number) => {
    const updatedCheckIn = { ...checkIn, [field]: value };
    setCheckIn(updatedCheckIn);
    saveCheckIn(updatedCheckIn);
  };

  // Get color based on score
  const getScoreColor = (score: number): string => {
    if (score < 50) return Colors.error;
    if (score < 75) return Colors.sunriseAmber;
    return Colors.evergreenTeal;
  };

  // Get message based on score
  const getScoreMessage = (score: number): string => {
    if (score === 0) return 'Complete your check-in to see your brain readiness';
    if (score < 50) return 'Your brain needs extra care today';
    if (score < 75) return 'Good readiness - pace yourself';
    return 'Excellent! Your brain is ready for peak performance';
  };

  const scoreColor = getScoreColor(readinessScore);

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="brain" size={24} color={Colors.evergreenTeal} />
          <Text variant="titleMedium" style={styles.title}>
            {componentTitle}
          </Text>
        </View>
        <View style={[styles.scoreBadge, { backgroundColor: scoreColor + '20' }]}>
          <Text variant="headlineSmall" style={[styles.scoreText, { color: scoreColor }]}>
            {readinessScore}
          </Text>
        </View>
      </View>

      <Text variant="bodySmall" style={styles.message}>
        {getScoreMessage(readinessScore)}
      </Text>

      {/* Progress bar */}
      {readinessScore > 0 && (
        <PaperProgressBar
          progress={readinessScore / 100}
          color={scoreColor}
          style={styles.progressBar}
        />
      )}

      {/* Check-in items */}
      <View style={styles.checkInSection}>
        <Text variant="labelLarge" style={styles.checkInLabel}>
          Today's Check-In:
        </Text>

        {/* Sleep Quality */}
        <View style={styles.checkInItem}>
          <View style={styles.checkInHeader}>
            <Icon name="sleep" size={20} color={Colors.textSecondary} />
            <Text variant="bodyMedium" style={styles.checkInTitle}>
              Sleep Quality
            </Text>
          </View>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <TouchableOpacity
                key={rating}
                onPress={() => updateCheckIn('sleepQuality', rating)}
                style={[
                  styles.ratingButton,
                  checkIn.sleepQuality >= rating && styles.ratingButtonActive,
                ]}
              >
                <Icon
                  name="star"
                  size={20}
                  color={checkIn.sleepQuality >= rating ? Colors.sunriseAmber : Colors.border}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Hydration Level */}
        <View style={styles.checkInItem}>
          <View style={styles.checkInHeader}>
            <Icon name="water" size={20} color={Colors.textSecondary} />
            <Text variant="bodyMedium" style={styles.checkInTitle}>
              Hydration Level
            </Text>
          </View>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <TouchableOpacity
                key={rating}
                onPress={() => updateCheckIn('hydrationLevel', rating)}
                style={[
                  styles.ratingButton,
                  checkIn.hydrationLevel >= rating && styles.ratingButtonActive,
                ]}
              >
                <Icon
                  name="water"
                  size={20}
                  color={checkIn.hydrationLevel >= rating ? Colors.evergreenTeal : Colors.border}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>

        {/* Stress Level */}
        <View style={styles.checkInItem}>
          <View style={styles.checkInHeader}>
            <Icon name="brain" size={20} color={Colors.textSecondary} />
            <Text variant="bodyMedium" style={styles.checkInTitle}>
              Stress Level
            </Text>
          </View>
          <View style={styles.ratingRow}>
            {[1, 2, 3, 4, 5].map((rating) => (
              <TouchableOpacity
                key={rating}
                onPress={() => updateCheckIn('stressLevel', rating)}
                style={[
                  styles.ratingButton,
                  checkIn.stressLevel >= rating && styles.ratingButtonActive,
                ]}
              >
                <Icon
                  name="alert-circle"
                  size={20}
                  color={checkIn.stressLevel >= rating ? Colors.error : Colors.border}
                />
              </TouchableOpacity>
            ))}
          </View>
        </View>
      </View>
    </Card>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  scoreBadge: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.lg,
  },
  scoreText: {
    fontWeight: Typography.fontWeight.bold,
  },
  message: {
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
    lineHeight: Typography.fontSize.sm * 1.5,
  },
  progressBar: {
    height: 8,
    borderRadius: Layout.borderRadius.sm,
    marginBottom: Spacing.lg,
  },
  checkInSection: {
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.base,
  },
  checkInLabel: {
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  checkInItem: {
    marginBottom: Spacing.base,
  },
  checkInHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  checkInTitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
  },
  ratingRow: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  ratingButton: {
    flex: 1,
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.borderLight,
  },
  ratingButtonActive: {
    backgroundColor: 'transparent',
  },
});

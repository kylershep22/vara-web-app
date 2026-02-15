/**
 * Neuroplasticity Tracker
 * Track daily neuroplastic signals (doing something uncomfortable/new)
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity } from 'react-native';
import { Text, Checkbox } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Card } from '../index';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useBrainHealthVocabulary } from '../../hooks';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, orderBy, limit, addDoc, updateDoc, doc, serverTimestamp } from 'firebase/firestore';
import { useAuth } from '../../context/AuthContext';

export const NeuroplasticityTracker: React.FC = () => {
  const { user } = useAuth();
  const { getComponentText } = useBrainHealthVocabulary();
  const [completedToday, setCompletedToday] = useState(false);
  const [currentStreak, setCurrentStreak] = useState(0);
  const [longestStreak, setLongestStreak] = useState(0);

  // Get translated text for this component
  const { title: componentTitle, description: componentDescription } = getComponentText('neuroplasticity');

  const today = new Date().toISOString().split('T')[0];

  // Load today's status and streaks
  useEffect(() => {
    const loadNeuroplasticityData = async () => {
      if (!user) return;

      try {
        // Check if completed today
        const todayQuery = query(
          collection(db, 'neuroplasticitySignals'),
          where('userId', '==', user.uid),
          where('date', '==', today)
        );
        const todaySnapshot = await getDocs(todayQuery);
        setCompletedToday(!todaySnapshot.empty);

        // Calculate streaks
        const allSignalsQuery = query(
          collection(db, 'neuroplasticitySignals'),
          where('userId', '==', user.uid),
          orderBy('date', 'desc')
        );
        const allSignalsSnapshot = await getDocs(allSignalsQuery);

        const dates = allSignalsSnapshot.docs.map(doc => doc.data().date).sort().reverse();
        const streaks = calculateStreaks(dates);
        setCurrentStreak(streaks.current);
        setLongestStreak(streaks.longest);

      } catch (error) {
        console.error('Error loading neuroplasticity data:', error);
      }
    };

    loadNeuroplasticityData();
  }, [user, today]);

  // Calculate current and longest streaks
  const calculateStreaks = (dates: string[]): { current: number; longest: number } => {
    if (dates.length === 0) return { current: 0, longest: 0 };

    let currentStreak = 0;
    let longestStreak = 0;
    let tempStreak = 0;

    const todayDate = new Date().toISOString().split('T')[0];
    const yesterdayDate = new Date(Date.now() - 86400000).toISOString().split('T')[0];

    // Calculate current streak
    for (let i = 0; i < dates.length; i++) {
      const expectedDate = new Date(Date.now() - i * 86400000).toISOString().split('T')[0];

      if (dates.includes(expectedDate)) {
        currentStreak++;
      } else {
        break;
      }
    }

    // Calculate longest streak
    for (let i = 0; i < dates.length; i++) {
      if (i === 0) {
        tempStreak = 1;
      } else {
        const prevDate = new Date(dates[i - 1]);
        const currDate = new Date(dates[i]);
        const diffDays = Math.floor((prevDate.getTime() - currDate.getTime()) / 86400000);

        if (diffDays === 1) {
          tempStreak++;
        } else {
          longestStreak = Math.max(longestStreak, tempStreak);
          tempStreak = 1;
        }
      }
    }
    longestStreak = Math.max(longestStreak, tempStreak);

    return { current: currentStreak, longest: longestStreak };
  };

  // Toggle completion
  const handleToggle = async () => {
    if (!user) return;

    try {
      if (completedToday) {
        // Remove today's signal
        const todayQuery = query(
          collection(db, 'neuroplasticitySignals'),
          where('userId', '==', user.uid),
          where('date', '==', today)
        );
        const snapshot = await getDocs(todayQuery);

        if (!snapshot.empty) {
          await updateDoc(doc(db, 'neuroplasticitySignals', snapshot.docs[0].id), {
            deleted: true,
            updatedAt: serverTimestamp(),
          });
        }

        setCompletedToday(false);
        setCurrentStreak(Math.max(0, currentStreak - 1));
      } else {
        // Add today's signal
        await addDoc(collection(db, 'neuroplasticitySignals'), {
          userId: user.uid,
          date: today,
          createdAt: serverTimestamp(),
        });

        setCompletedToday(true);
        setCurrentStreak(currentStreak + 1);
        setLongestStreak(Math.max(longestStreak, currentStreak + 1));
      }
    } catch (error) {
      console.error('Error toggling neuroplasticity signal:', error);
    }
  };

  return (
    <Card style={styles.container}>
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name="sprout" size={24} color={Colors.evergreenTeal} />
          <View>
            <Text variant="titleMedium" style={styles.title}>
              {componentTitle}
            </Text>
            <Text variant="bodySmall" style={styles.subtitle}>
              Did something different today?
            </Text>
          </View>
        </View>
        <Checkbox
          status={completedToday ? 'checked' : 'unchecked'}
          onPress={handleToggle}
          color={Colors.evergreenTeal}
        />
      </View>

      <Text variant="bodySmall" style={styles.description}>
        {componentDescription}
      </Text>

      {/* Streaks */}
      <View style={styles.streaksContainer}>
        <View style={styles.streakItem}>
          <View style={styles.streakIcon}>
            <Icon name="fire" size={32} color={Colors.sunriseAmber} />
          </View>
          <View>
            <Text variant="labelSmall" style={styles.streakLabel}>
              Current Streak
            </Text>
            <Text variant="headlineSmall" style={styles.streakValue}>
              {currentStreak} {currentStreak === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </View>

        <View style={styles.streakDivider} />

        <View style={styles.streakItem}>
          <View style={styles.streakIcon}>
            <Icon name="trophy" size={32} color={Colors.goldenApricot} />
          </View>
          <View>
            <Text variant="labelSmall" style={styles.streakLabel}>
              Longest Streak
            </Text>
            <Text variant="headlineSmall" style={styles.streakValue}>
              {longestStreak} {longestStreak === 1 ? 'day' : 'days'}
            </Text>
          </View>
        </View>
      </View>

      {/* Examples */}
      <View style={styles.examplesContainer}>
        <Text variant="labelSmall" style={styles.examplesTitle}>
          Examples of neuroplastic signals:
        </Text>
        <View style={styles.examplesList}>
          <Text variant="bodySmall" style={styles.exampleText}>
            • Tried a new skill or activity
          </Text>
          <Text variant="bodySmall" style={styles.exampleText}>
            • Had an uncomfortable conversation
          </Text>
          <Text variant="bodySmall" style={styles.exampleText}>
            • Challenged yourself physically
          </Text>
          <Text variant="bodySmall" style={styles.exampleText}>
            • Broke from your routine
          </Text>
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
    flex: 1,
  },
  title: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  subtitle: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  description: {
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
    lineHeight: Typography.fontSize.sm * 1.5,
  },
  streaksContainer: {
    flexDirection: 'row',
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.base,
  },
  streakItem: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  streakIcon: {
    width: 48,
    height: 48,
    alignItems: 'center',
    justifyContent: 'center',
  },
  streakLabel: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  streakValue: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
  },
  streakDivider: {
    width: 1,
    backgroundColor: Colors.border,
    marginHorizontal: Spacing.sm,
  },
  examplesContainer: {
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.base,
  },
  examplesTitle: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    fontWeight: Typography.fontWeight.semibold,
  },
  examplesList: {
    gap: Spacing.xs / 2,
  },
  exampleText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    lineHeight: Typography.fontSize.xs * 1.6,
  },
});

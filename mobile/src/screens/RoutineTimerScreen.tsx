/**
 * Routine Timer Screen
 * Runs through routine activities with countdown timer
 */

import React, { useState, useEffect, useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Vibration,
  Alert,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation, useRoute } from '@react-navigation/native';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { Button, Card } from '../components';
import { Routine, Activity } from '../services/firebase/routines.service';

interface RouteParams {
  routine: Routine;
}

export const RoutineTimerScreen: React.FC = () => {
  const navigation = useNavigation();
  const route = useRoute();
  const { routine } = route.params as RouteParams;

  const [currentActivityIndex, setCurrentActivityIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(routine.activities[0]?.duration * 60 || 0);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentActivity = routine.activities[currentActivityIndex];
  const totalActivities = routine.activities.length;
  const progress = ((currentActivityIndex + 1) / totalActivities) * 100;

  // Timer logic
  useEffect(() => {
    if (!isPaused && !isCompleted && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        setTimeRemaining((prev) => {
          if (prev <= 1) {
            handleActivityComplete();
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, isCompleted, timeRemaining, currentActivityIndex]);

  const handleActivityComplete = () => {
    Vibration.vibrate([0, 200, 100, 200]);

    if (currentActivityIndex < totalActivities - 1) {
      // Move to next activity
      const nextIndex = currentActivityIndex + 1;
      setCurrentActivityIndex(nextIndex);
      setTimeRemaining(routine.activities[nextIndex].duration * 60);
    } else {
      // Routine complete
      setIsCompleted(true);
      Vibration.vibrate([0, 500, 200, 500]);
    }
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleSkip = () => {
    // Allow skipping any activity, including the last one
    if (currentActivityIndex < totalActivities - 1) {
      Alert.alert(
        'Skip Activity',
        `Skip ${currentActivity.name}?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Skip',
            onPress: () => {
              const nextIndex = currentActivityIndex + 1;
              setCurrentActivityIndex(nextIndex);
              setTimeRemaining(routine.activities[nextIndex].duration * 60);
            },
          },
        ]
      );
    } else {
      // Last activity - mark as complete
      Alert.alert(
        'Complete Routine',
        `Mark routine as complete?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Complete',
            onPress: () => {
              setIsCompleted(true);
              Vibration.vibrate([0, 500, 200, 500]);
            },
          },
        ]
      );
    }
  };

  const handlePrevious = () => {
    if (currentActivityIndex > 0) {
      Alert.alert(
        'Go Back',
        `Return to previous activity?`,
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Go Back',
            onPress: () => {
              const prevIndex = currentActivityIndex - 1;
              setCurrentActivityIndex(prevIndex);
              setTimeRemaining(routine.activities[prevIndex].duration * 60);
              setIsPaused(false);
            },
          },
        ]
      );
    }
  };

  const handleRestart = () => {
    setTimeRemaining(currentActivity.duration * 60);
    setIsPaused(false);
  };

  const handleExit = () => {
    Alert.alert(
      'Exit Routine',
      'Are you sure you want to exit? Your progress will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Exit',
          style: 'destructive',
          onPress: () => navigation.goBack(),
        },
      ]
    );
  };

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const getColorForActivity = (color: string): string => {
    const colorMap: { [key: string]: string } = {
      purple: '#9333EA',
      green: '#16A34A',
      blue: '#2563EB',
      orange: '#EA580C',
      indigo: '#4F46E5',
      red: '#DC2626',
      cyan: '#06B6D4',
      teal: '#14B8A6',
      yellow: '#EAB308',
      gray: '#6B7280',
      brown: '#92400E',
      pink: '#EC4899',
    };
    return colorMap[color] || Colors.evergreenTeal;
  };

  if (isCompleted) {
    const encouragingMessages = [
      "You showed up for yourself today!",
      "Every step forward is progress.",
      "Building consistency, one routine at a time.",
      "You're creating positive change!",
      "Your commitment to growth is inspiring.",
    ];
    const randomMessage = encouragingMessages[Math.floor(Math.random() * encouragingMessages.length)];

    return (
      <SafeAreaView style={styles.container} edges={['top']}>
        <View style={styles.completionContainer}>
          <Icon name="check-circle" size={80} color={Colors.evergreenTeal} />
          <Text style={styles.completionTitle}>Routine Complete!</Text>
          <Text style={styles.completionText}>
            Great job completing your {routine.name}.
          </Text>
          <Text style={styles.encouragingText}>
            {randomMessage}
          </Text>
          <View style={styles.completionStats}>
            <View style={styles.completionStatItem}>
              <Icon name="clock-check" size={24} color={Colors.evergreenTeal} />
              <Text style={styles.completionStatLabel}>
                {routine.activities.reduce((sum, a) => sum + a.duration, 0)} minutes
              </Text>
            </View>
            <View style={styles.completionStatItem}>
              <Icon name="format-list-checks" size={24} color={Colors.evergreenTeal} />
              <Text style={styles.completionStatLabel}>
                {routine.activities.length} activities
              </Text>
            </View>
          </View>
          <Button
            variant="primary"
            onPress={() => navigation.goBack()}
            style={styles.completionButton}
          >
            Done
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity onPress={handleExit} style={styles.exitButton}>
          <Icon name="close" size={24} color={Colors.textPrimary} />
        </TouchableOpacity>
        <Text style={styles.routineName}>{routine.name}</Text>
        <View style={styles.headerSpacer} />
      </View>

      {/* Progress Bar */}
      <View style={styles.progressContainer}>
        <View style={styles.progressBar}>
          <View style={[styles.progressFill, { width: `${progress}%` }]} />
        </View>
        <Text style={styles.progressText}>
          Activity {currentActivityIndex + 1} of {totalActivities}
        </Text>
      </View>

      {/* Current Activity */}
      <View style={styles.activityContainer}>
        <View
          style={[
            styles.activityIconLarge,
            { backgroundColor: getColorForActivity(currentActivity.color) },
          ]}
        >
          <Icon name={currentActivity.icon} size={48} color="#fff" />
        </View>
        <Text style={styles.activityName}>{currentActivity.name}</Text>
        <Text style={styles.activityDuration}>
          {currentActivity.duration} minute{currentActivity.duration !== 1 ? 's' : ''}
        </Text>
      </View>

      {/* Timer */}
      <View style={styles.timerContainer}>
        <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
        <View style={styles.timerCircle}>
          <View
            style={[
              styles.timerProgress,
              {
                transform: [
                  {
                    rotate: `${
                      ((currentActivity.duration * 60 - timeRemaining) /
                        (currentActivity.duration * 60)) *
                      360
                    }deg`,
                  },
                ],
              },
            ]}
          />
        </View>
      </View>

      {/* Controls */}
      <View style={styles.controls}>
        <TouchableOpacity
          style={[
            styles.controlButton,
            currentActivityIndex === 0 && styles.controlButtonDisabled,
          ]}
          onPress={handlePrevious}
          disabled={currentActivityIndex === 0}
        >
          <Icon
            name="skip-previous"
            size={28}
            color={currentActivityIndex === 0 ? Colors.border : Colors.textSecondary}
          />
          <Text
            style={[
              styles.controlLabel,
              currentActivityIndex === 0 && styles.controlLabelDisabled,
            ]}
          >
            Previous
          </Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleRestart}
        >
          <Icon name="restart" size={28} color={Colors.textSecondary} />
          <Text style={styles.controlLabel}>Restart</Text>
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.mainControlButton}
          onPress={handlePause}
        >
          <Icon
            name={isPaused ? 'play' : 'pause'}
            size={40}
            color="#fff"
          />
        </TouchableOpacity>

        <TouchableOpacity
          style={styles.controlButton}
          onPress={handleSkip}
        >
          <Icon
            name={currentActivityIndex < totalActivities - 1 ? 'skip-next' : 'check-circle'}
            size={28}
            color={Colors.textSecondary}
          />
          <Text style={styles.controlLabel}>
            {currentActivityIndex < totalActivities - 1 ? 'Skip' : 'Complete'}
          </Text>
        </TouchableOpacity>
      </View>

      {/* Up Next */}
      {currentActivityIndex < totalActivities - 1 && (
        <Card style={styles.upNextCard}>
          <Text style={styles.upNextTitle}>Up Next</Text>
          <View style={styles.upNextActivity}>
            <View
              style={[
                styles.upNextIcon,
                {
                  backgroundColor: getColorForActivity(
                    routine.activities[currentActivityIndex + 1].color
                  ),
                },
              ]}
            >
              <Icon
                name={routine.activities[currentActivityIndex + 1].icon}
                size={20}
                color="#fff"
              />
            </View>
            <View style={styles.upNextInfo}>
              <Text style={styles.upNextName}>
                {routine.activities[currentActivityIndex + 1].name}
              </Text>
              <Text style={styles.upNextDuration}>
                {routine.activities[currentActivityIndex + 1].duration} min
              </Text>
            </View>
          </View>
        </Card>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  exitButton: {
    width: 40,
    height: 40,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineName: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
  },
  headerSpacer: {
    width: 40,
  },
  progressContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  progressBar: {
    height: 6,
    backgroundColor: Colors.border,
    borderRadius: Layout.borderRadius.sm,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.evergreenTeal,
  },
  progressText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  activityContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  activityIconLarge: {
    width: 96,
    height: 96,
    borderRadius: 48,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
  },
  activityName: {
    fontSize: Typography.fontSize['3xl'],
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
    textAlign: 'center',
  },
  activityDuration: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
  },
  timerContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
    position: 'relative',
  },
  timerText: {
    fontSize: Typography.fontSize['5xl'] + 16,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.evergreenTeal,
  },
  timerCircle: {
    position: 'absolute',
    width: 200,
    height: 200,
    borderRadius: 100,
    borderWidth: 8,
    borderColor: Colors.border,
    top: '50%',
    left: '50%',
    marginLeft: -100,
    marginTop: -100,
    zIndex: -1,
  },
  timerProgress: {
    position: 'absolute',
    width: '100%',
    height: '100%',
    borderRadius: 100,
    borderWidth: 8,
    borderColor: Colors.evergreenTeal,
    borderRightColor: 'transparent',
    borderBottomColor: 'transparent',
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.lg,
    gap: Spacing.xs,
  },
  controlButton: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  controlButtonDisabled: {
    opacity: 0.3,
  },
  controlLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.semibold,
  },
  controlLabelDisabled: {
    color: Colors.border,
  },
  mainControlButton: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.3,
    shadowRadius: 8,
    elevation: 8,
  },
  upNextCard: {
    marginHorizontal: Spacing.lg,
    padding: Spacing.md,
  },
  upNextTitle: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textSecondary,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
    marginBottom: Spacing.sm,
  },
  upNextActivity: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  upNextIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    alignItems: 'center',
    justifyContent: 'center',
  },
  upNextInfo: {
    flex: 1,
  },
  upNextName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: 2,
  },
  upNextDuration: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  completionContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  completionTitle: {
    fontSize: Typography.fontSize['3xl'] + 4,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  completionText: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  encouragingText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  completionStats: {
    flexDirection: 'row',
    gap: Spacing.xl,
    marginBottom: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  completionStatItem: {
    alignItems: 'center',
    gap: Spacing.xs,
  },
  completionStatLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  completionButton: {
    paddingHorizontal: Spacing.xl * 2,
  },
});

export default RoutineTimerScreen;

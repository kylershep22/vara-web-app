/**
 * Focus Screen
 * Pomodoro timer and focus tools
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Vibration } from 'react-native';
import { Text, SegmentedButtons, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components';
import { Colors, Spacing } from '../constants';
import { useAuth } from '../context/AuthContext';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../config/firebase';

const PRESET_DURATIONS = [
  { label: '10', value: 10 },
  { label: '15', value: 15 },
  { label: '25', value: 25 },
  { label: '60', value: 60 },
  { label: '90', value: 90 },
];

const FocusScreen: React.FC = () => {
  const { user } = useAuth();
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate progress
  const totalSeconds = selectedDuration * 60;
  const currentSeconds = minutes * 60 + seconds;
  const progress = ((totalSeconds - currentSeconds) / totalSeconds) * 100;

  // Timer logic
  useEffect(() => {
    if (isActive && !isPaused) {
      intervalRef.current = setInterval(() => {
        if (seconds === 0) {
          if (minutes === 0) {
            // Timer completed
            handleTimerComplete();
          } else {
            setMinutes((m) => m - 1);
            setSeconds(59);
          }
        } else {
          setSeconds((s) => s - 1);
        }
      }, 1000);
    } else {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isActive, isPaused, minutes, seconds]);

  const handleTimerComplete = async () => {
    setIsActive(false);
    Vibration.vibrate([0, 500, 200, 500]); // Vibration pattern

    // Log session to Firestore
    if (user && sessionStartTime) {
      try {
        await addDoc(collection(db, 'focusSessions'), {
          userId: user.uid,
          duration: selectedDuration,
          type: 'pomodoro',
          completed: true,
          startedAt: sessionStartTime,
          endedAt: serverTimestamp(),
          interrupted: false,
        });
        console.log('Focus session logged successfully');
      } catch (error) {
        console.error('Error logging focus session:', error);
      }
    }
  };

  const handleStart = () => {
    setIsActive(true);
    setIsPaused(false);
    if (!sessionStartTime) {
      setSessionStartTime(new Date());
    }
  };

  const handlePause = () => {
    setIsPaused(!isPaused);
  };

  const handleReset = () => {
    setIsActive(false);
    setIsPaused(false);
    setMinutes(selectedDuration);
    setSeconds(0);
    setSessionStartTime(null);
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
  };

  const handleDurationChange = (value: string) => {
    const duration = parseInt(value);
    setSelectedDuration(duration);
    setMinutes(duration);
    setSeconds(0);
    setIsActive(false);
    setIsPaused(false);
    setSessionStartTime(null);
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.screenTitle}>
          Focus
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Deep work with Pomodoro technique
        </Text>
      </View>

      <View style={styles.content}>
        {/* Pomodoro Timer Card */}
        <Card style={styles.timerCard}>
          {/* Duration Presets */}
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Session Duration
          </Text>
          <View style={styles.presetsContainer}>
            {PRESET_DURATIONS.map((preset) => (
              <TouchableOpacity
                key={preset.value}
                style={[
                  styles.presetButton,
                  selectedDuration === preset.value && styles.presetButtonActive,
                ]}
                onPress={() => handleDurationChange(preset.value.toString())}
                disabled={isActive}
              >
                <Text
                  style={[
                    styles.presetText,
                    selectedDuration === preset.value && styles.presetTextActive,
                  ]}
                >
                  {preset.label}m
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Timer Display */}
          <View style={styles.timerDisplay}>
            <View style={styles.progressCircle}>
              <Text variant="displayLarge" style={styles.timerText}>
                {String(minutes).padStart(2, '0')}:{String(seconds).padStart(2, '0')}
              </Text>
              <Text variant="bodyMedium" style={styles.progressText}>
                {Math.round(progress)}% complete
              </Text>
            </View>
          </View>

          {/* Controls */}
          <View style={styles.controls}>
            {!isActive ? (
              <IconButton
                icon="play-circle"
                iconColor={Colors.evergreenTeal}
                size={60}
                onPress={handleStart}
              />
            ) : (
              <IconButton
                icon={isPaused ? 'play-circle' : 'pause-circle'}
                iconColor={Colors.evergreenTeal}
                size={60}
                onPress={handlePause}
              />
            )}
            <IconButton
              icon="refresh"
              iconColor={Colors.textSecondary}
              size={40}
              onPress={handleReset}
            />
          </View>
        </Card>

        {/* Focus Tips */}
        <Card style={styles.tipsCard}>
          <Text variant="titleMedium" style={styles.tipsTitle}>
            Tips for Deep Focus
          </Text>
          <View style={styles.tipsList}>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={20} color={Colors.evergreenTeal} />
              <Text style={styles.tipText}>Close unnecessary apps and tabs</Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={20} color={Colors.evergreenTeal} />
              <Text style={styles.tipText}>Turn off notifications</Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={20} color={Colors.evergreenTeal} />
              <Text style={styles.tipText}>Work on ONE task at a time</Text>
            </View>
            <View style={styles.tipItem}>
              <Icon name="check-circle" size={20} color={Colors.evergreenTeal} />
              <Text style={styles.tipText}>Take breaks to prevent burnout</Text>
            </View>
          </View>
        </Card>
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
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  timerCard: {
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.md,
    textAlign: 'center',
  },
  presetsContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xl,
  },
  presetButton: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    borderWidth: 2,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  presetButtonActive: {
    borderColor: Colors.evergreenTeal,
    backgroundColor: Colors.evergreenTeal,
  },
  presetText: {
    color: Colors.textPrimary,
    fontWeight: '600',
    fontSize: 14,
  },
  presetTextActive: {
    color: Colors.textOnPrimary,
  },
  timerDisplay: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  progressCircle: {
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  timerText: {
    color: Colors.evergreenTeal,
    fontWeight: '700',
    fontSize: 56,
  },
  progressText: {
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  controls: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.md,
  },
  tipsCard: {
    padding: Spacing.lg,
  },
  tipsTitle: {
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.md,
  },
  tipsList: {
    gap: Spacing.sm,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  tipText: {
    color: Colors.textSecondary,
    fontSize: 14,
    flex: 1,
  },
});

export default FocusScreen;

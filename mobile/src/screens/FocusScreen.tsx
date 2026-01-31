/**
 * Focus Screen
 * Pomodoro timer and routines management
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Vibration, Modal, Alert } from 'react-native';
import { Text, SegmentedButtons, IconButton, Button as PaperButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Card } from '../components';
import { RoutinesTab } from '../components/routines';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { useAuth } from '../context/AuthContext';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
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
  const [selectedTab, setSelectedTab] = useState('pomodoro');
  const [selectedDuration, setSelectedDuration] = useState(25);
  const [minutes, setMinutes] = useState(25);
  const [seconds, setSeconds] = useState(0);
  const [isActive, setIsActive] = useState(false);
  const [isPaused, setIsPaused] = useState(false);
  const [sessionStartTime, setSessionStartTime] = useState<Date | null>(null);
  const [showQualityModal, setShowQualityModal] = useState(false);
  const [selectedQuality, setSelectedQuality] = useState<number | null>(null);

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  // Calculate progress
  const totalSeconds = selectedDuration * 60;
  const currentSeconds = minutes * 60 + seconds;
  const progress = ((totalSeconds - currentSeconds) / totalSeconds) * 100;

  // Calculate phase for 90-minute ultradian protocol
  const getSessionPhase = () => {
    if (selectedDuration !== 90 || !isActive) return null;

    const elapsedMinutes = selectedDuration - minutes - (seconds > 0 ? 0 : 0);
    const actualElapsed = Math.floor((totalSeconds - currentSeconds) / 60);

    if (actualElapsed < 10) {
      return { name: 'Warm-up', color: Colors.sunriseAmber, message: 'Focus may flicker - this is normal' };
    } else if (actualElapsed < 80) {
      return { name: 'Deep Work', color: Colors.evergreenTeal, message: 'Peak cognitive performance' };
    } else {
      return { name: 'Wind Down', color: Colors.goldenApricot, message: 'Preparing to wrap up' };
    }
  };

  const currentPhase = getSessionPhase();

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

  const handleTimerComplete = () => {
    setIsActive(false);
    Vibration.vibrate([0, 500, 200, 500]); // Vibration pattern

    // Show quality rating modal
    setShowQualityModal(true);
  };

  const handleQualitySubmit = async (quality: number) => {
    setSelectedQuality(quality);
    setShowQualityModal(false);

    // Log session to Firestore with quality rating
    if (user && sessionStartTime) {
      try {
        await addDoc(collection(db, 'focusSessions'), {
          userId: user.uid,
          duration: selectedDuration,
          type: selectedDuration === 90 ? 'ultradian' : 'pomodoro',
          completed: true,
          startedAt: sessionStartTime,
          endedAt: serverTimestamp(),
          interrupted: false,
          qualityRating: quality,
        });
        console.log('Focus session logged successfully with quality:', quality);

        // Reset for next session
        setTimeout(() => {
          setSelectedQuality(null);
          handleReset();
        }, 2000);
      } catch (error) {
        console.error('Error logging focus session:', error);
        Alert.alert('Error', 'Failed to save session. Please try again.');
      }
    }
  };

  const handleSkipQuality = async () => {
    setShowQualityModal(false);

    // Log session without quality rating
    if (user && sessionStartTime) {
      try {
        await addDoc(collection(db, 'focusSessions'), {
          userId: user.uid,
          duration: selectedDuration,
          type: selectedDuration === 90 ? 'ultradian' : 'pomodoro',
          completed: true,
          startedAt: sessionStartTime,
          endedAt: serverTimestamp(),
          interrupted: false,
        });
        console.log('Focus session logged successfully');
        handleReset();
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
          {selectedTab === 'pomodoro'
            ? 'Deep work with Pomodoro technique'
            : 'Build productive daily routines'}
        </Text>
      </View>

      {/* Tab Selector */}
      <View style={styles.tabContainer}>
        <SegmentedButtons
          value={selectedTab}
          onValueChange={setSelectedTab}
          buttons={[
            {
              value: 'pomodoro',
              label: 'Pomodoro',
              icon: 'timer-outline',
            },
            {
              value: 'routines',
              label: 'Routines',
              icon: 'format-list-checks',
            },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {selectedTab === 'pomodoro' ? (
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

          {/* Phase Indicator for 90-min sessions */}
          {currentPhase && (
            <View style={[styles.phaseIndicator, { backgroundColor: currentPhase.color + '20', borderColor: currentPhase.color }]}>
              <Icon name="clock-outline" size={20} color={currentPhase.color} />
              <View style={styles.phaseTextContainer}>
                <Text variant="titleSmall" style={[styles.phaseName, { color: currentPhase.color }]}>
                  {currentPhase.name} Phase
                </Text>
                <Text variant="bodySmall" style={styles.phaseMessage}>
                  {currentPhase.message}
                </Text>
              </View>
            </View>
          )}

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
            {selectedDuration === 90 ? 'Brain-Optimized Focus Tips' : 'Tips for Deep Focus'}
          </Text>
          <View style={styles.tipsList}>
            {selectedDuration === 90 ? (
              <>
                <View style={styles.tipItem}>
                  <Icon name="check-circle" size={20} color={Colors.evergreenTeal} />
                  <Text style={styles.tipText}>Expect focus to flicker in the first 10 minutes - this is your brain warming up</Text>
                </View>
                <View style={styles.tipItem}>
                  <Icon name="check-circle" size={20} color={Colors.evergreenTeal} />
                  <Text style={styles.tipText}>Peak focus occurs 10-80 minutes in - tackle your hardest work then</Text>
                </View>
                <View style={styles.tipItem}>
                  <Icon name="check-circle" size={20} color={Colors.evergreenTeal} />
                  <Text style={styles.tipText}>Take a real break after - your brain needs recovery to consolidate learning</Text>
                </View>
                <View style={styles.tipItem}>
                  <Icon name="check-circle" size={20} color={Colors.evergreenTeal} />
                  <Text style={styles.tipText}>One deep session per day is enough - quality over quantity</Text>
                </View>
              </>
            ) : (
              <>
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
              </>
            )}
          </View>
        </Card>
      </View>
      ) : (
        <RoutinesTab />
      )}

      {/* Quality Rating Modal */}
      <Modal
        visible={showQualityModal}
        transparent
        animationType="slide"
        onRequestClose={() => setShowQualityModal(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={styles.qualityModal}>
            <Icon name="check-circle" size={48} color={Colors.evergreenTeal} style={styles.modalIcon} />

            <Text variant="headlineSmall" style={styles.modalTitle}>
              Session Complete!
            </Text>

            <Text variant="bodyMedium" style={styles.modalSubtitle}>
              How focused did you feel during this session?
            </Text>

            <View style={styles.qualityButtons}>
              {[1, 2, 3, 4, 5].map((rating) => (
                <TouchableOpacity
                  key={rating}
                  style={styles.qualityButton}
                  onPress={() => handleQualitySubmit(rating)}
                >
                  <Text style={styles.qualityButtonText}>{rating}</Text>
                  <Text style={styles.qualityButtonLabel}>
                    {rating === 1 ? 'Poor' : rating === 2 ? 'Fair' : rating === 3 ? 'Good' : rating === 4 ? 'Great' : 'Excellent'}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>

            <PaperButton
              mode="text"
              onPress={handleSkipQuality}
              style={styles.skipButton}
            >
              Skip
            </PaperButton>
          </View>
        </View>
      </Modal>
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
    paddingBottom: Spacing.md,
  },
  segmentedButtons: {
    backgroundColor: Colors.surface,
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
    fontWeight: Typography.fontWeight.semibold,
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
    borderRadius: Layout.borderRadius.md,
    borderWidth: Layout.borderWidth.medium,
    borderColor: Colors.border,
    backgroundColor: Colors.surface,
  },
  presetButtonActive: {
    borderColor: Colors.evergreenTeal,
    backgroundColor: Colors.evergreenTeal,
  },
  presetText: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    fontSize: Typography.fontSize.sm,
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
    fontWeight: Typography.fontWeight.bold,
    fontSize: Typography.fontSize['5xl'] + 8,
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
    fontWeight: Typography.fontWeight.semibold,
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
    fontSize: Typography.fontSize.sm,
    flex: 1,
  },
  // Phase Indicator Styles
  phaseIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: Layout.borderWidth.medium,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  phaseTextContainer: {
    flex: 1,
  },
  phaseName: {
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 2,
  },
  phaseMessage: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  // Quality Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  qualityModal: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.xl,
    padding: Spacing.xl,
    marginHorizontal: Spacing.lg,
    width: '85%',
    alignItems: 'center',
    ...Layout.shadow.lg,
  },
  modalIcon: {
    marginBottom: Spacing.md,
  },
  modalTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  modalSubtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  qualityButtons: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  qualityButton: {
    flex: 1,
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.lg,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xs,
    alignItems: 'center',
    borderWidth: Layout.borderWidth.medium,
    borderColor: Colors.evergreenTeal,
  },
  qualityButtonText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.evergreenTeal,
    marginBottom: 4,
  },
  qualityButtonLabel: {
    fontSize: Typography.fontSize.xs - 1,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  skipButton: {
    marginTop: Spacing.sm,
  },
});

export default FocusScreen;

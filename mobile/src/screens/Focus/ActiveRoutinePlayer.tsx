/**
 * ActiveRoutinePlayer Component
 * Full-screen modal overlay for routine playback
 *
 * Per Focus Page Spec Phase 4:
 * - Presentation: Full-screen overlay with slide-up animation
 * - Entry: 300ms ease-out slide up
 * - Exit: 300ms ease-out slide down
 * - Close confirmation: Bottom sheet "End routine?"
 */

import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Modal,
  Alert,
  Dimensions,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ColorTokens,
  SpacingTokens,
  RadiusTokens,
  ShadowTokens,
  SizeTokens,
  TypographyTokens,
  AnimationTokens,
  FocusCopy,
} from '../../tokens/design-tokens';
import { useReducedMotion } from '../../hooks';
import { TimerRing, UpNextCard, RoutineCompleteState } from './components';
import { getActivityColor } from './components/activityColors';

const { height: SCREEN_HEIGHT } = Dimensions.get('window');

interface Activity {
  id: number | string;
  name: string;
  duration: number;
  icon: string;
  color: string;
}

interface Routine {
  id: string;
  name: string;
  activities: Activity[];
}

interface ActiveRoutinePlayerProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Routine to play */
  routine: Routine;
  /** Callback when routine is closed/completed */
  onClose: () => void;
  /** Callback to edit routine */
  onEditRoutine: () => void;
}

export const ActiveRoutinePlayer: React.FC<ActiveRoutinePlayerProps> = ({
  visible,
  routine,
  onClose,
  onEditRoutine,
}) => {
  const reduceMotion = useReducedMotion();

  // Slide animation
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Activity state
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(routine.activities[0]?.duration * 60 || 0);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Fade animation for activity transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentActivity = routine.activities[currentIndex];
  const totalActivities = routine.activities.length;
  const nextActivity = currentIndex < totalActivities - 1
    ? routine.activities[currentIndex + 1]
    : null;

  // Overall progress calculation
  const completedTime = routine.activities
    .slice(0, currentIndex)
    .reduce((sum, a) => sum + a.duration * 60, 0);
  const currentElapsed = (currentActivity?.duration * 60 || 0) - timeRemaining;
  const totalTime = routine.activities.reduce((sum, a) => sum + a.duration * 60, 0);
  const overallProgress = totalTime > 0 ? (completedTime + currentElapsed) / totalTime : 0;

  // Activity progress
  const activityProgress = currentActivity
    ? (currentActivity.duration * 60 - timeRemaining) / (currentActivity.duration * 60)
    : 0;

  // Slide animation on mount/unmount
  useEffect(() => {
    if (visible) {
      if (reduceMotion) {
        slideAnim.setValue(0);
      } else {
        Animated.timing(slideAnim, {
          toValue: 0,
          duration: AnimationTokens.durationSlow,
          useNativeDriver: true,
        }).start();
      }
    } else {
      if (reduceMotion) {
        slideAnim.setValue(SCREEN_HEIGHT);
      } else {
        Animated.timing(slideAnim, {
          toValue: SCREEN_HEIGHT,
          duration: AnimationTokens.durationSlow,
          useNativeDriver: true,
        }).start();
      }
    }
  }, [visible, reduceMotion]);

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
  }, [isPaused, isCompleted, timeRemaining, currentIndex]);

  const handleActivityComplete = useCallback(() => {
    Haptics.selectionAsync();

    if (currentIndex < totalActivities - 1) {
      // Transition to next activity with fade
      const nextIndex = currentIndex + 1;

      if (!reduceMotion) {
        Animated.sequence([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: AnimationTokens.durationNormal,
            useNativeDriver: true,
          }),
          Animated.delay(100),
          Animated.timing(fadeAnim, {
            toValue: 1,
            duration: AnimationTokens.durationNormal,
            useNativeDriver: true,
          }),
        ]).start();
      }

      // Update state after brief delay for animation
      setTimeout(() => {
        setCurrentIndex(nextIndex);
        setTimeRemaining(routine.activities[nextIndex].duration * 60);
      }, reduceMotion ? 0 : 200);
    } else {
      // Routine complete
      setIsCompleted(true);
    }
  }, [currentIndex, totalActivities, routine.activities, reduceMotion]);

  const handlePause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPaused((prev) => !prev);
  }, []);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setTimeRemaining(routine.activities[prevIndex].duration * 60);
      setIsPaused(false);
    }
  }, [currentIndex, routine.activities]);

  const handleRestart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeRemaining(currentActivity.duration * 60);
    setIsPaused(false);
  }, [currentActivity]);

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentIndex < totalActivities - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setTimeRemaining(routine.activities[nextIndex].duration * 60);
    } else {
      setIsCompleted(true);
    }
  }, [currentIndex, totalActivities, routine.activities]);

  const handleClose = useCallback(() => {
    Alert.alert(
      FocusCopy.endConfirmationTitle,
      undefined,
      [
        { text: FocusCopy.endConfirmationSecondary, style: 'cancel' },
        {
          text: FocusCopy.endConfirmationPrimary,
          style: 'destructive',
          onPress: () => {
            if (intervalRef.current) {
              clearInterval(intervalRef.current);
            }
            onClose();
          },
        },
      ]
    );
  }, [onClose]);

  const handleBackToFocus = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    onClose();
  }, [onClose]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const activityColor = currentActivity ? getActivityColor(currentActivity.color) : ColorTokens.primary;

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      animationType="none"
      transparent
      onRequestClose={handleClose}
    >
      <Animated.View
        style={[
          styles.container,
          { transform: [{ translateY: slideAnim }] },
        ]}
      >
        <SafeAreaView style={styles.safeArea} edges={['top', 'bottom']}>
          {isCompleted ? (
            <RoutineCompleteState
              onBackToFocus={handleBackToFocus}
              onAdjustRoutine={onEditRoutine}
              routineName={routine.name}
            />
          ) : (
            <>
              {/* Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleClose}
                  accessibilityRole="button"
                  accessibilityLabel="Close routine"
                >
                  <Icon name="close" size={22} color={ColorTokens.textPrimary} />
                </TouchableOpacity>

                <Text style={styles.routineName}>{routine.name}</Text>

                <View style={styles.headerSpacer} />
              </View>

              {/* Overall Progress Bar */}
              <View style={styles.progressContainer}>
                <View style={styles.progressTrack}>
                  <Animated.View
                    style={[
                      styles.progressFill,
                      { width: `${overallProgress * 100}%` },
                    ]}
                  />
                </View>
                <Text style={styles.progressLabel}>
                  {FocusCopy.progressLabel(currentIndex + 1, totalActivities)}
                </Text>
              </View>

              {/* Activity Display */}
              <Animated.View style={[styles.activityContainer, { opacity: fadeAnim }]}>
                {/* Activity Icon */}
                <View
                  style={[
                    styles.activityIcon,
                    { backgroundColor: `${activityColor}15` },
                  ]}
                >
                  <Icon
                    name={currentActivity?.icon as any}
                    size={28}
                    color={activityColor}
                  />
                </View>

                {/* Activity Name */}
                <Text style={styles.activityName}>{currentActivity?.name}</Text>

                {/* Duration Label */}
                <Text style={styles.durationLabel}>
                  {`${currentActivity?.duration} minute${currentActivity?.duration !== 1 ? 's' : ''}`}
                </Text>

                {/* Timer Ring */}
                <View style={styles.timerRingContainer}>
                  <TimerRing
                    diameter={SizeTokens.timerRingPlayer}
                    strokeWidth={SizeTokens.timerRingStrokePlayer}
                    progress={activityProgress}
                    fillColor={activityColor}
                  >
                    <Text style={styles.timerText}>{formatTime(timeRemaining)}</Text>
                  </TimerRing>
                </View>
              </Animated.View>

              {/* Playback Controls */}
              <View style={styles.controls}>
                <TouchableOpacity
                  style={[
                    styles.controlButton,
                    currentIndex === 0 && styles.controlButtonDisabled,
                  ]}
                  onPress={handlePrevious}
                  disabled={currentIndex === 0}
                  accessibilityRole="button"
                  accessibilityLabel={FocusCopy.previousLabel}
                >
                  <Icon
                    name="skip-previous"
                    size={20}
                    color={currentIndex === 0 ? ColorTokens.disabled : ColorTokens.textSecondary}
                  />
                  <Text
                    style={[
                      styles.controlLabel,
                      currentIndex === 0 && styles.controlLabelDisabled,
                    ]}
                  >
                    {FocusCopy.previousLabel}
                  </Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={handleRestart}
                  accessibilityRole="button"
                  accessibilityLabel={FocusCopy.restartLabel}
                >
                  <Icon name="restart" size={20} color={ColorTokens.textSecondary} />
                  <Text style={styles.controlLabel}>{FocusCopy.restartLabel}</Text>
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.playButton}
                  onPress={handlePause}
                  accessibilityRole="button"
                  accessibilityLabel={isPaused ? 'Resume' : 'Pause'}
                >
                  <Icon
                    name={isPaused ? 'play' : 'pause'}
                    size={26}
                    color={ColorTokens.textOnPrimary}
                  />
                </TouchableOpacity>

                <TouchableOpacity
                  style={styles.controlButton}
                  onPress={handleSkip}
                  accessibilityRole="button"
                  accessibilityLabel={FocusCopy.skipLabel}
                >
                  <Icon name="skip-next" size={20} color={ColorTokens.textSecondary} />
                  <Text style={styles.controlLabel}>{FocusCopy.skipLabel}</Text>
                </TouchableOpacity>
              </View>

              {/* Up Next Card */}
              {nextActivity && (
                <View style={styles.upNextContainer}>
                  <UpNextCard activity={nextActivity} />
                </View>
              )}
            </>
          )}
        </SafeAreaView>
      </Animated.View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: ColorTokens.backgroundPrimary,
  },
  safeArea: {
    flex: 1,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: SpacingTokens.base,
    paddingTop: SpacingTokens.sm,
    paddingBottom: SpacingTokens.md,
  },
  closeButton: {
    width: SizeTokens.controlButtonSize,
    height: SizeTokens.controlButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
  },
  routineName: {
    fontSize: 16,
    fontWeight: '600',
    color: ColorTokens.textPrimary,
    textAlign: 'center',
  },
  headerSpacer: {
    width: SizeTokens.controlButtonSize,
  },
  progressContainer: {
    paddingHorizontal: SpacingTokens.lg,
    marginBottom: SpacingTokens.base,
  },
  progressTrack: {
    height: 4,
    backgroundColor: ColorTokens.secondaryLight,
    borderRadius: RadiusTokens.full,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: ColorTokens.primary,
    borderRadius: RadiusTokens.full,
  },
  progressLabel: {
    fontSize: 12,
    color: ColorTokens.textSecondary,
    textAlign: 'center',
    marginTop: 6,
  },
  activityContainer: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: SpacingTokens.lg,
  },
  activityIcon: {
    width: SizeTokens.activityIconLarge,
    height: SizeTokens.activityIconLarge,
    borderRadius: SizeTokens.activityIconLarge / 2,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: SpacingTokens.md,
  },
  activityName: {
    fontSize: 22,
    fontWeight: '600',
    color: ColorTokens.textPrimary,
    textAlign: 'center',
    marginBottom: 2,
  },
  durationLabel: {
    fontSize: 14,
    color: ColorTokens.textSecondary,
    marginBottom: SpacingTokens.lg,
  },
  timerRingContainer: {
    marginTop: SpacingTokens.base,
  },
  timerText: {
    fontSize: TypographyTokens.fontTimerPlayer,
    fontWeight: '600',
    color: ColorTokens.primary,
    fontVariant: ['tabular-nums'],
    letterSpacing: TypographyTokens.letterSpacingTimer * TypographyTokens.fontTimerPlayer,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-evenly',
    paddingVertical: SpacingTokens.base,
    paddingHorizontal: SpacingTokens.xl,
  },
  controlButton: {
    alignItems: 'center',
    minWidth: SizeTokens.controlButtonSize,
  },
  controlButtonDisabled: {
    opacity: 0.3,
  },
  controlLabel: {
    fontSize: 12,
    color: ColorTokens.textSecondary,
    marginTop: SpacingTokens.xs,
  },
  controlLabelDisabled: {
    color: ColorTokens.disabled,
  },
  playButton: {
    width: SizeTokens.playButtonSizePlayer,
    height: SizeTokens.playButtonSizePlayer,
    borderRadius: SizeTokens.playButtonSizePlayer / 2,
    backgroundColor: ColorTokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...ShadowTokens.md,
  },
  upNextContainer: {
    paddingHorizontal: SpacingTokens.base,
    paddingBottom: SpacingTokens.xl,
  },
});

export default ActiveRoutinePlayer;

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
  AppState,
  AppStateStatus,
} from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import {
  ColorTokens,
  SpacingTokens,
  RadiusTokens,
  ShadowTokens,
  SizeTokens,
  TypographyTokens,
  AnimationTokens,
} from '../../constants/designTokens';
import { FocusCopy } from '../../constants/focusContent';
import { useReducedMotion } from '../../hooks';
import { TimerRing, UpNextCard, RoutineCompleteState, ChecklistPlayer } from './components';
import { getActivityColor } from './components/activityColors';
import { markRoutineComplete, calculateTotalDuration } from '../../services/firebase/routines.service';

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
  mode?: 'checklist' | 'timed';
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
  /** Called when routine is completed (for persistence) */
  onComplete?: (routineId: string) => void;
}

export const ActiveRoutinePlayer: React.FC<ActiveRoutinePlayerProps> = ({
  visible,
  routine,
  onClose,
  onEditRoutine,
  onComplete,
}) => {
  const reduceMotion = useReducedMotion();
  const insets = useSafeAreaInsets();

  // Slide animation
  const slideAnim = useRef(new Animated.Value(SCREEN_HEIGHT)).current;

  // Activity state
  const safeActivities = routine.activities || [];
  const [currentIndex, setCurrentIndex] = useState(0);
  const [timeRemaining, setTimeRemaining] = useState(safeActivities[0]?.duration ? safeActivities[0].duration * 60 : 0);
  const [isPaused, setIsPaused] = useState(false);
  const [isCompleted, setIsCompleted] = useState(false);

  // Persist completion when routine finishes
  useEffect(() => {
    if (isCompleted && routine.id) {
      const totalDuration = calculateTotalDuration(safeActivities);
      markRoutineComplete(routine.id, {
        mode: routine.mode || 'timed',
        durationMinutes: totalDuration,
      }).catch(() => {}); // Non-blocking
      onComplete?.(routine.id);
    }
  }, [isCompleted]);

  // Timestamp-based tracking for background support
  const activityStartTimeRef = useRef<number>(Date.now());
  const pausedElapsedRef = useRef<number>(0);
  const appStateRef = useRef<AppStateStatus>(AppState.currentState);

  // Fade animation for activity transitions
  const fadeAnim = useRef(new Animated.Value(1)).current;

  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const currentActivity = safeActivities[currentIndex];
  const totalActivities = safeActivities.length;
  const nextActivity = currentIndex < totalActivities - 1
    ? safeActivities[currentIndex + 1]
    : null;

  // Overall progress calculation
  const completedTime = safeActivities
    .slice(0, currentIndex)
    .reduce((sum, a) => sum + a.duration * 60, 0);
  const currentElapsed = (currentActivity?.duration * 60 || 0) - timeRemaining;
  const totalTime = safeActivities.reduce((sum, a) => sum + a.duration * 60, 0);
  const overallProgress = totalTime > 0 ? (completedTime + currentElapsed) / totalTime : 0;

  // Activity progress
  const activityProgress = currentActivity
    ? (currentActivity.duration * 60 - timeRemaining) / (currentActivity.duration * 60)
    : 0;

  const scheduleActivityNotifications = useCallback(async () => {
    await cancelActivityNotifications();
    if (isPaused || isCompleted) return;

    let cumulativeSeconds = timeRemaining;

    for (let i = currentIndex; i < totalActivities; i++) {
      const isLast = i === totalActivities - 1;
      const nextName = !isLast ? safeActivities[i + 1]?.name : '';

      if (cumulativeSeconds > 0) {
        try {
          await Notifications.scheduleNotificationAsync({
            content: {
              title: isLast ? 'Routine Complete!' : `Up next: ${nextName}`,
              body: isLast
                ? `You finished ${routine.name}!`
                : `${safeActivities[i].name} is done.`,
              sound: 'default',
              data: { type: 'routine-activity-complete', routineId: routine.id },
            },
            trigger: {
              type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
              seconds: cumulativeSeconds,
            },
            identifier: `routine-activity-${i}`,
          });
        } catch (err) {
          // Notification scheduling may fail if permissions not granted — continue silently
        }
      }

      if (i + 1 < totalActivities) {
        cumulativeSeconds += safeActivities[i + 1].duration * 60;
      }
    }
  }, [currentIndex, timeRemaining, isPaused, isCompleted, totalActivities, routine]);

  const cancelActivityNotifications = useCallback(async () => {
    for (let i = 0; i < totalActivities; i++) {
      try {
        await Notifications.cancelScheduledNotificationAsync(`routine-activity-${i}`);
      } catch {}
    }
  }, [totalActivities]);

  const reconcileTimerState = useCallback(() => {
    if (isPaused || isCompleted) return;

    const now = Date.now();
    const elapsedSeconds = Math.floor((now - activityStartTimeRef.current) / 1000);

    let totalElapsed = elapsedSeconds;
    let idx = currentIndex;
    let remainingInCurrent = (safeActivities[idx]?.duration * 60 || 0) - pausedElapsedRef.current;

    // Walk through activities that may have completed while backgrounded
    while (totalElapsed >= remainingInCurrent && idx < totalActivities - 1) {
      totalElapsed -= remainingInCurrent;
      idx++;
      remainingInCurrent = safeActivities[idx]?.duration * 60 || 0;
    }

    if (totalElapsed >= remainingInCurrent && idx === totalActivities - 1) {
      setIsCompleted(true);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      return;
    }

    if (idx !== currentIndex) {
      setCurrentIndex(idx);
      Haptics.selectionAsync();
    }

    const newRemaining = Math.max(0, remainingInCurrent - totalElapsed);
    setTimeRemaining(newRemaining);

    activityStartTimeRef.current = now;
    pausedElapsedRef.current = (safeActivities[idx]?.duration * 60 || 0) - newRemaining;
  }, [currentIndex, isPaused, isCompleted, totalActivities, safeActivities]);

  // AppState listener for background/foreground transitions
  useEffect(() => {
    const handleAppStateChange = async (nextAppState: AppStateStatus) => {
      const prevState = appStateRef.current;
      appStateRef.current = nextAppState;

      if (isPaused || isCompleted) return;

      if (prevState === 'active' && (nextAppState === 'background' || nextAppState === 'inactive')) {
        await scheduleActivityNotifications();
      }

      if ((prevState === 'background' || prevState === 'inactive') && nextAppState === 'active') {
        await cancelActivityNotifications();
        reconcileTimerState();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);
    return () => subscription.remove();
  }, [isPaused, isCompleted, scheduleActivityNotifications, cancelActivityNotifications, reconcileTimerState]);

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

  // Timer logic — timestamp-based for background resilience
  useEffect(() => {
    if (!isPaused && !isCompleted && timeRemaining > 0) {
      intervalRef.current = setInterval(() => {
        const now = Date.now();
        const elapsedSeconds = Math.floor((now - activityStartTimeRef.current) / 1000);
        const activityDuration = currentActivity?.duration * 60 || 0;
        const remaining = Math.max(0, activityDuration - pausedElapsedRef.current - elapsedSeconds);

        if (remaining <= 0) {
          handleActivityComplete();
          return;
        }

        setTimeRemaining(remaining);
      }, 1000);
    }

    return () => {
      if (intervalRef.current) {
        clearInterval(intervalRef.current);
      }
    };
  }, [isPaused, isCompleted, currentIndex, currentActivity]);

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
        setTimeRemaining(safeActivities[nextIndex].duration * 60);
        activityStartTimeRef.current = Date.now();
        pausedElapsedRef.current = 0;
      }, reduceMotion ? 0 : 200);
    } else {
      // Routine complete
      setIsCompleted(true);
    }
  }, [currentIndex, totalActivities, safeActivities, reduceMotion]);

  const handlePause = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsPaused((prev) => {
      if (!prev) {
        // Pausing — accumulate elapsed time
        const elapsed = Math.floor((Date.now() - activityStartTimeRef.current) / 1000);
        pausedElapsedRef.current = pausedElapsedRef.current + elapsed;
      } else {
        // Resuming — reset start time
        activityStartTimeRef.current = Date.now();
      }
      return !prev;
    });
  }, []);

  const handlePrevious = useCallback(() => {
    if (currentIndex > 0) {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
      const prevIndex = currentIndex - 1;
      setCurrentIndex(prevIndex);
      setTimeRemaining(safeActivities[prevIndex].duration * 60);
      activityStartTimeRef.current = Date.now();
      pausedElapsedRef.current = 0;
      setIsPaused(false);
    }
  }, [currentIndex, safeActivities]);

  const handleRestart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeRemaining(currentActivity.duration * 60);
    activityStartTimeRef.current = Date.now();
    pausedElapsedRef.current = 0;
    setIsPaused(false);
  }, [currentActivity]);

  const handleSkip = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    if (currentIndex < totalActivities - 1) {
      const nextIndex = currentIndex + 1;
      setCurrentIndex(nextIndex);
      setTimeRemaining(safeActivities[nextIndex].duration * 60);
      activityStartTimeRef.current = Date.now();
      pausedElapsedRef.current = 0;
    } else {
      setIsCompleted(true);
    }
  }, [currentIndex, totalActivities, safeActivities]);

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
            cancelActivityNotifications();
            onClose();
          },
        },
      ]
    );
  }, [onClose, cancelActivityNotifications]);

  const handleBackToFocus = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }
    cancelActivityNotifications();
    onClose();
  }, [onClose, cancelActivityNotifications]);

  const formatTime = (seconds: number): string => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  };

  const activityColor = currentActivity ? getActivityColor(currentActivity.color) : ColorTokens.primary;

  if (!visible) return null;

  if (totalActivities === 0) {
    return (
      <Modal visible={visible} transparent animationType="slide">
        <SafeAreaView style={styles.container}>
          <View style={{ flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 }}>
            <Icon name="playlist-remove" size={48} color={ColorTokens.textSecondary} />
            <Text style={{ fontSize: 18, fontWeight: '600', color: ColorTokens.textPrimary, marginTop: 16, textAlign: 'center' }}>
              No activities added yet
            </Text>
            <Text style={{ fontSize: 14, color: ColorTokens.textSecondary, marginTop: 8, textAlign: 'center' }}>
              Edit this routine to add activities.
            </Text>
            <TouchableOpacity
              onPress={onEditRoutine}
              style={{ marginTop: 24, paddingHorizontal: 24, paddingVertical: 12, backgroundColor: ColorTokens.evergreenTeal, borderRadius: 12 }}
            >
              <Text style={{ color: '#fff', fontWeight: '600', fontSize: 14 }}>Edit Routine</Text>
            </TouchableOpacity>
            <TouchableOpacity onPress={onClose} style={{ marginTop: 12 }}>
              <Text style={{ color: ColorTokens.textSecondary, fontSize: 14 }}>Close</Text>
            </TouchableOpacity>
          </View>
        </SafeAreaView>
      </Modal>
    );
  }

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
        <View style={[styles.safeArea, { paddingTop: insets.top, paddingBottom: insets.bottom }]}>
          {isCompleted ? (
            <RoutineCompleteState
              onBackToFocus={handleBackToFocus}
              onAdjustRoutine={onEditRoutine}
              routineName={routine.name}
            />
          ) : routine.mode === 'checklist' ? (
            <>
              {/* Checklist Header */}
              <View style={styles.header}>
                <TouchableOpacity
                  style={styles.closeButton}
                  onPress={handleBackToFocus}
                  accessibilityRole="button"
                  accessibilityLabel="Close routine"
                >
                  <Icon name="close" size={22} color={ColorTokens.textPrimary} />
                </TouchableOpacity>
                <Text style={styles.routineName}>{routine.name}</Text>
                <View style={styles.headerSpacer} />
              </View>
              <ChecklistPlayer
                activities={safeActivities}
                routineName={routine.name}
                onComplete={() => setIsCompleted(true)}
                onRoutineComplete={() => {
                  markRoutineComplete(routine.id, {
                    mode: 'checklist',
                    durationMinutes: calculateTotalDuration(safeActivities),
                  }).catch(() => {});
                  onComplete?.(routine.id);
                }}
              />
            </>
          ) : (
            <>
              {/* Timed Header */}
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
        </View>
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

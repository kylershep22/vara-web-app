/**
 * PomodoroTab Component
 * Pomodoro timer tab content
 *
 * Per Focus Page Spec Phase 2:
 * - Task label input for naming focus task
 * - Duration chips (10, 15, 25, 45, 60 + hidden 90)
 * - Timer ring with SVG circular progress
 * - Break prompt flow after session complete
 * - Notification toggle and ambient sound selector
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { useAuth } from '../../context/AuthContext';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';
import { db } from '../../config/firebase';
import {
  ColorTokens,
  SpacingTokens,
  SizeTokens,
  ShadowTokens,
  RadiusTokens,
  TypographyTokens,
} from '../../constants/designTokens';
import { FocusCopy } from '../../constants/focusContent';
import { useTimer, useNotificationSilence, useAmbientSound } from '../../hooks';
import { useCompletionSound } from '../../hooks/useCompletionSound';
import {
  TimerRing,
  DurationChips,
  TaskLabelInput,
  BreakPrompt,
  NotificationToggle,
  AmbientSoundSelector,
} from './components';

const TASK_LABEL_KEY = '@focus_task_label';

interface PomodoroTabProps {
  /** Whether 90-minute advanced option should be shown */
  showAdvancedDuration?: boolean;
}

export const PomodoroTab: React.FC<PomodoroTabProps> = ({
  showAdvancedDuration = true,
}) => {
  const { user } = useAuth();
  const { playCompletionSound } = useCompletionSound();

  // Task label state
  const [taskLabel, setTaskLabel] = useState('');

  // Duration state
  const [selectedDuration, setSelectedDuration] = useState(25);

  // Sound panel state
  const [isSoundPanelOpen, setIsSoundPanelOpen] = useState(false);

  // Timer hook
  const timer = useTimer({
    durationMinutes: selectedDuration,
    breakDurationMinutes: 5,
    onSessionComplete: handleSessionComplete,
    onBreakComplete: handleBreakComplete,
  });

  // Notification silence hook
  const notificationSilence = useNotificationSilence();

  // Ambient sound hook
  const ambientSound = useAmbientSound();

  // Load saved task label on mount
  useEffect(() => {
    const loadTaskLabel = async () => {
      try {
        const saved = await AsyncStorage.getItem(TASK_LABEL_KEY);
        if (saved) {
          setTaskLabel(saved);
        }
      } catch (error) {
        console.warn('Error loading task label:', error);
      }
    };
    loadTaskLabel();
  }, []);

  // Save task label when it changes
  useEffect(() => {
    const saveTaskLabel = async () => {
      try {
        if (taskLabel) {
          await AsyncStorage.setItem(TASK_LABEL_KEY, taskLabel);
        }
      } catch (error) {
        console.warn('Error saving task label:', error);
      }
    };
    saveTaskLabel();
  }, [taskLabel]);

  // Handle timer start - activate DND and ambient sound
  useEffect(() => {
    if (timer.isActive) {
      notificationSilence.activate();
      ambientSound.fadeIn();
    } else if (timer.state === 'paused' || timer.state === 'idle') {
      notificationSilence.deactivate();
      ambientSound.fadeOut();
    }
  }, [timer.isActive, timer.state]);

  // Session complete handler - log to Firestore
  async function handleSessionComplete() {
    playCompletionSound();
    if (user && db) {
      try {
        await addDoc(collection(db, 'focusSessions'), {
          userId: user.uid,
          duration: selectedDuration,
          type: selectedDuration === 90 ? 'ultradian' : 'pomodoro',
          completed: true,
          startedAt: serverTimestamp(),
          endedAt: serverTimestamp(),
          taskLabel: taskLabel || null,
          interrupted: false,
        });
        console.log('Focus session logged successfully');
      } catch (error) {
        console.error('Error logging focus session:', error);
      }
    } else if (!db) {
      console.warn('Firebase not initialized, cannot log focus session');
    }
  }

  function handleBreakComplete() {
    console.log('Break complete');
  }

  const handleDurationChange = useCallback((duration: number) => {
    setSelectedDuration(duration);
    timer.reset();
  }, [timer]);

  const handlePlayPause = useCallback(() => {
    if (timer.state === 'idle') {
      timer.start();
    } else if (timer.state === 'running' || timer.state === 'break_running') {
      timer.pause();
    } else if (timer.state === 'paused') {
      timer.resume();
    }
  }, [timer]);

  const handleStartAnother = useCallback(() => {
    timer.reset();
    setTimeout(() => timer.start(), 50);
  }, [timer]);

  const toggleSoundPanel = useCallback(() => {
    setIsSoundPanelOpen((prev) => !prev);
  }, []);

  // Determine what to show in timer center
  const renderTimerContent = () => {
    if (timer.state === 'session_complete' || timer.state === 'break_complete') {
      return (
        <BreakPrompt
          state={timer.state === 'session_complete' ? 'session_complete' : 'break_complete'}
          onStartBreak={timer.startBreak}
          onBeginAnother={timer.state === 'break_complete' ? timer.beginAnother : handleStartAnother}
          onDoneForNow={timer.reset}
          breakDurationMinutes={timer.breakDurationMinutes}
          onAdjustBreak={timer.setBreakDuration}
        />
      );
    }

    if (timer.state === 'break_running') {
      return (
        <BreakPrompt
          state="break_running"
          onStartBreak={() => {}}
          onBeginAnother={() => {}}
          onDoneForNow={() => {}}
          breakTimeRemaining={timer.formattedTime}
        />
      );
    }

    return (
      <View style={styles.timerContent}>
        <Text style={styles.timerText}>{timer.formattedTime}</Text>
        {taskLabel && timer.isActive && (
          <Text style={styles.taskLabel} numberOfLines={1}>
            {taskLabel}
          </Text>
        )}
      </View>
    );
  };

  // Get ring color based on state
  const ringColor = timer.isBreak ? ColorTokens.accentApricot : ColorTokens.primary;

  // Show controls based on state
  const showControls = timer.state !== 'session_complete' && timer.state !== 'break_complete';

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Task Label Input */}
      <TaskLabelInput
        value={taskLabel}
        onChangeText={setTaskLabel}
        disabled={timer.isActive}
      />

      {/* Duration Chips */}
      <DurationChips
        selectedDuration={selectedDuration}
        onDurationChange={handleDurationChange}
        disabled={timer.isActive}
        showAdvanced={showAdvancedDuration}
      />

      {/* Timer Ring */}
      <View style={styles.timerContainer}>
        <TimerRing
          diameter={SizeTokens.timerRingPomodoro}
          strokeWidth={SizeTokens.timerRingStrokePomodoro}
          progress={timer.progress}
          fillColor={ringColor}
        >
          {renderTimerContent()}
        </TimerRing>
      </View>

      {/* Timer Controls */}
      {showControls && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={timer.reset}
            accessibilityRole="button"
            accessibilityLabel="Reset timer"
          >
            <Icon
              name="refresh"
              size={22}
              color={ColorTokens.textSecondary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={styles.playButton}
            onPress={handlePlayPause}
            accessibilityRole="button"
            accessibilityLabel={timer.isActive ? 'Pause timer' : 'Start timer'}
          >
            <Icon
              name={timer.isActive ? 'pause' : 'play'}
              size={28}
              color={ColorTokens.textOnPrimary}
            />
          </TouchableOpacity>

          <TouchableOpacity
            style={[
              styles.controlButton,
              isSoundPanelOpen && styles.controlButtonActive,
            ]}
            onPress={toggleSoundPanel}
            accessibilityRole="button"
            accessibilityLabel="Toggle ambient sound panel"
          >
            <Icon
              name="headphones"
              size={20}
              color={isSoundPanelOpen ? ColorTokens.primary : ColorTokens.textSecondary}
            />
          </TouchableOpacity>
        </View>
      )}

      {/* Ambient Sound Selector */}
      <AmbientSoundSelector
        isExpanded={isSoundPanelOpen}
        selectedSound={ambientSound.selectedSound}
        onSoundSelect={ambientSound.setSelectedSound}
      />

      {/* Notification Toggle */}
      <NotificationToggle
        isEnabled={notificationSilence.isEnabled}
        onToggle={notificationSilence.toggle}
        isCurrentlyActive={notificationSilence.isCurrentlyActive}
      />

    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  contentContainer: {
    paddingHorizontal: SpacingTokens.lg,
    paddingBottom: SpacingTokens.xl,
  },
  timerContainer: {
    alignItems: 'center',
    marginVertical: SpacingTokens.lg,
  },
  timerContent: {
    alignItems: 'center',
  },
  timerText: {
    fontSize: TypographyTokens.fontTimerLarge,
    fontWeight: '600',
    color: ColorTokens.primary,
    fontVariant: ['tabular-nums'],
    letterSpacing: TypographyTokens.letterSpacingTimer * TypographyTokens.fontTimerLarge,
  },
  taskLabel: {
    fontSize: 14,
    color: ColorTokens.textSecondary,
    marginTop: SpacingTokens.xs,
    maxWidth: 160,
  },
  controls: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: SpacingTokens.lg,
    marginBottom: SpacingTokens.base,
  },
  controlButton: {
    width: SizeTokens.controlButtonSize,
    height: SizeTokens.controlButtonSize,
    alignItems: 'center',
    justifyContent: 'center',
    borderRadius: RadiusTokens.full,
    backgroundColor: 'transparent',
  },
  controlButtonActive: {
    backgroundColor: ColorTokens.primaryLight,
  },
  playButton: {
    width: SizeTokens.playButtonSize,
    height: SizeTokens.playButtonSize,
    borderRadius: SizeTokens.playButtonSize / 2,
    backgroundColor: ColorTokens.primary,
    alignItems: 'center',
    justifyContent: 'center',
    ...ShadowTokens.md,
  },
});

export default PomodoroTab;

/**
 * PomodoroTab Component
 * Pomodoro timer tab content
 *
 * Per Focus Page Spec Phase 2:
 * - Duration presets (25 / 90 / custom), defaulting to 25
 * - Timer ring with SVG circular progress
 * - Break prompt flow after session complete
 * - Notification toggle and ambient sound selector
 */

import React, { useState, useCallback, useEffect } from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../../context/AuthContext';
import {
  ColorTokens,
  SpacingTokens,
  SizeTokens,
  ShadowTokens,
  RadiusTokens,
  TypographyTokens,
} from '../../constants/designTokens';
import { FocusCopy } from '../../constants/focusContent';
import { useTimer, useAmbientSound } from '../../hooks';
import { useCompletionSound } from '../../hooks/useCompletionSound';
import { useActiveFocusSession } from '../../hooks/useActiveFocusSession';
import {
  DurationChips,
  BreakPrompt,
  AmbientSoundSelector,
} from './components';
import { CenterFirstToggle } from './components/CenterFirstToggle';
import { TimerRing } from '../../components/shared/TimerRing';
import { resolvePlayAction } from './centerFirst';
import { reflectionDisplayChips } from '../../components/checkin/flow/reflection';

// The focus reflection chips (ids + "Stayed with it / Drifted some / Kept
// slipping" labels). Stable, so computed once at module scope.
const FOCUS_REFLECTION_CHIPS = reflectionDisplayChips('focus', 'neutral');

interface PomodoroTabProps {
  /** Whether 90-minute advanced option should be shown */
  showAdvancedDuration?: boolean;
  /**
   * Initial timer length (minutes) for the Center-first handoff: the length the
   * user picked before the pre-focus practice, so the timer reopens at it.
   * Absent on a normal arrival (opens on the 25-min default). The incoming
   * check-in budget is intentionally NOT plumbed here — budget-aware
   * pre-selection is deferred Track 2; everyone lands on 25.
   */
  initialDuration?: number;
  /**
   * Present only when this Pomodoro should EXIT the screen on "Done for now"
   * (launched from the hub / check-in). When set, "Done for now" hands back to
   * the parent to navigate away. Absent for a directly-started Pomodoro, which
   * just resets to setup. (Per-block reflection is now inline on the completion
   * surface, independent of this exit signal — see onBlockReflect.)
   */
  onExit?: () => void;
  /**
   * Fires when the user taps a focus reflection chip on a completed block's
   * completion surface. Carries the chip id and the just-completed focus-session
   * doc id (null if none captured). The parent persists it onto that
   * focusSessions doc. Skippable: the user may continue without reflecting.
   */
  onBlockReflect?: (reflectionId: string, focusSessionId: string | null) => void;
  /**
   * B-3c "Center first" wiring. `centerFirst` controls the opt-in setup row
   * (shown only when `onToggleCenterFirst` is provided). When `onCenterFirstBegin`
   * is supplied AND the row is on, the idle Begin tap launches the pre-focus
   * practice instead of starting the timer (the parent owns that handoff). When
   * `autoStart` is true the timer starts on mount — used when the parent hands
   * back from the centering practice so no second tap is needed.
   */
  centerFirst?: boolean;
  onToggleCenterFirst?: (next: boolean) => void;
  onCenterFirstBegin?: (durationMinutes: number) => void;
  autoStart?: boolean;
  /**
   * Cold-launch deep link (B-3c.2). When a completion notification is tapped
   * from a killed/backgrounded app, the focusSessions row is already finalized
   * by the launch handler; this is its id. On mount the timer opens directly on
   * the B-3c.1 completion surface bound to it, so the inline reflection chip
   * writes via the existing onBlockReflect(reflectionId, blockId) path.
   */
  completedSessionId?: string;
}

export const PomodoroTab: React.FC<PomodoroTabProps> = ({
  showAdvancedDuration = true,
  initialDuration,
  onExit,
  onBlockReflect,
  centerFirst = false,
  onToggleCenterFirst,
  onCenterFirstBegin,
  autoStart = false,
  completedSessionId,
}) => {
  const { user } = useAuth();
  const { playCompletionSound } = useCompletionSound();

  // Duration state. `initialDuration` carries only the Center-first resume
  // length (the user's picked length across the box-breathing handoff); a normal
  // arrival opens on the 25-min default. The incoming check-in budget is
  // intentionally NOT read here (budget-aware pre-selection is deferred Track 2).
  const [selectedDuration, setSelectedDuration] = useState(initialDuration ?? 25);

  // Sound panel state
  const [isSoundPanelOpen, setIsSoundPanelOpen] = useState(false);

  // The reflection chip chosen for the just-completed block (null = none yet).
  // Cleared when a new block starts so each block reflects independently.
  const [selectedReflectionId, setSelectedReflectionId] = useState<string | null>(null);

  // Timer hook
  const timer = useTimer({
    durationMinutes: selectedDuration,
    breakDurationMinutes: 5,
    onSessionComplete: handleSessionComplete,
    onBreakComplete: handleBreakComplete,
  });

  // Persisted active-session record. Survives screen-sleep / backgrounding /
  // kill: the focusSessions completion row is finalized from this record on any
  // app return (B-3c.2). Breaks are not persisted.
  const focusSession = useActiveFocusSession({
    userId: user?.uid ?? null,
    timerState: timer.state,
    endsAt: timer.endsAt,
    durationMinutes: selectedDuration,
    initialCompletedSessionId: completedSessionId ?? null,
  });

  // Ambient sound hook
  const ambientSound = useAmbientSound();

  // Handle timer start - fade ambient sound in/out
  useEffect(() => {
    if (timer.isActive) {
      ambientSound.fadeIn();
    } else if (timer.state === 'paused' || timer.state === 'idle') {
      ambientSound.fadeOut();
    }
  }, [timer.isActive, timer.state]);

  // Session complete handler. Finalizes the focusSessions completion row from
  // the persisted active-session record under its stable id (idempotent), so
  // the warm path and a foreground reconcile converge on the same doc.
  async function handleSessionComplete() {
    playCompletionSound();
    await focusSession.finalizeCompletedBlock();
  }

  function handleBreakComplete() {
    console.log('Break complete');
  }

  // A user-initiated reset abandons the current block: clear the persisted
  // active record (and minted id) so it is never finalized on a later return.
  const handleReset = useCallback(() => {
    focusSession.clearActiveBlock();
    timer.reset();
  }, [focusSession, timer]);

  const handleDurationChange = useCallback((duration: number) => {
    setSelectedDuration(duration);
    handleReset();
  }, [handleReset]);

  const handlePlayPause = useCallback(() => {
    const action = resolvePlayAction(timer.state, {
      centerFirst,
      canCenter: !!onCenterFirstBegin,
    });
    switch (action) {
      case 'center':
        // Hand off to the parent's pre-focus practice instead of starting.
        onCenterFirstBegin?.(selectedDuration);
        return;
      case 'start':
        timer.start();
        return;
      case 'pause':
        timer.pause();
        return;
      case 'resume':
        timer.resume();
        return;
    }
  }, [timer, centerFirst, onCenterFirstBegin, selectedDuration]);

  // Cold-launch deep link: open directly on the completion surface bound to the
  // already-finalized block. Mount-only; takes precedence over autoStart (the
  // two never co-occur — one is a completion tap, the other a centering handoff).
  useEffect(() => {
    if (!completedSessionId) return;
    timer.completeNow();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Auto-start when handed back from the centering practice (no second tap).
  // Mount-only; the small delay mirrors handleStartAnother's reset→start gap.
  useEffect(() => {
    if (!autoStart || completedSessionId) return;
    const id = setTimeout(() => timer.start(), 50);
    return () => clearTimeout(id);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleStartAnother = useCallback(() => {
    timer.reset();
    setTimeout(() => timer.start(), 50);
  }, [timer]);

  // A new active/idle block clears the previous block's reflection selection.
  // (During session_complete the state holds, so the selection persists while
  // the completion surface is shown.)
  useEffect(() => {
    if (timer.state === 'running' || timer.state === 'idle') {
      setSelectedReflectionId(null);
    }
  }, [timer.state]);

  const handleSelectReflection = useCallback(
    (reflectionId: string) => {
      setSelectedReflectionId(reflectionId);
      onBlockReflect?.(reflectionId, focusSession.getLastFocusSessionId());
    },
    [onBlockReflect, focusSession]
  );

  // "Done for now" terminal. Hub/check-in launched: hand back to the parent to
  // exit the screen (the parent owns navigation). Directly-started: just reset
  // to setup. Reflection already happened inline on this surface (optional), so
  // "Done for now" never re-prompts it.
  const handleDoneForNow = useCallback(() => {
    if (onExit) {
      onExit();
      return;
    }
    handleReset();
  }, [onExit, handleReset]);

  const toggleSoundPanel = useCallback(() => {
    setIsSoundPanelOpen((prev) => !prev);
  }, []);

  // Center content for the in-ring states. The completion PROMPTS
  // (session_complete / break_complete) render OUTSIDE the ring (see below) so
  // they no longer clip the circle; the break countdown stays in the ring.
  const renderTimerContent = () => {
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
      </View>
    );
  };

  // Get ring color based on state
  const ringColor = timer.isBreak ? ColorTokens.accentApricot : ColorTokens.primary;

  // The completion prompts (focus block done / break done) render as their own
  // vertical stack, not inside the fixed-diameter ring.
  const isCompletionState =
    timer.state === 'session_complete' || timer.state === 'break_complete';

  // Show controls based on state
  const showControls = !isCompletionState;

  return (
    <ScrollView
      style={styles.container}
      contentContainerStyle={styles.contentContainer}
      showsVerticalScrollIndicator={false}
    >
      {/* Duration Chips */}
      <DurationChips
        selectedDuration={selectedDuration}
        onDurationChange={handleDurationChange}
        disabled={timer.isActive}
        showAdvanced={showAdvancedDuration}
      />

      {/* Center first — opt-in pre-focus practice (B-3c). Setup only. */}
      {onToggleCenterFirst && timer.state === 'idle' && (
        <CenterFirstToggle value={centerFirst} onToggle={onToggleCenterFirst} />
      )}

      {/* Completion surface — focus block done / break done. Rendered as its
          own vertical stack OUTSIDE the ring so it never clips the circle. */}
      {isCompletionState ? (
        <View style={styles.completionContainer}>
          <BreakPrompt
            state={timer.state === 'session_complete' ? 'session_complete' : 'break_complete'}
            onStartBreak={timer.startBreak}
            onBeginAnother={
              timer.state === 'break_complete' ? timer.beginAnother : handleStartAnother
            }
            onDoneForNow={handleDoneForNow}
            breakDurationMinutes={timer.breakDurationMinutes}
            onAdjustBreak={timer.setBreakDuration}
            reflectionChips={FOCUS_REFLECTION_CHIPS}
            selectedReflectionId={selectedReflectionId}
            onSelectReflection={handleSelectReflection}
          />
        </View>
      ) : (
        /* Timer Ring — idle / running / paused / break_running (countdown). */
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
      )}

      {/* Timer Controls */}
      {showControls && (
        <View style={styles.controls}>
          <TouchableOpacity
            style={styles.controlButton}
            onPress={handleReset}
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
  completionContainer: {
    alignItems: 'center',
    marginVertical: SpacingTokens.lg,
    paddingHorizontal: SpacingTokens.lg,
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

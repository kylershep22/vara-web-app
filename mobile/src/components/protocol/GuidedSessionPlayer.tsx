// GuidedSessionPlayer — composition of the protocol-running surface.
//
// State machine: useReducer with playerReducer (idle → running →
// paused → completed | abandoned). Pure reducer; side effects
// (marker tracking, audio, transport, modals, callbacks) live in
// effects and refs that watch the state this reducer produces.
//
// Recovery contract (sub-step 4.3.3 design, signed off):
//   - On mount, read AsyncStorage marker. If present and not expired,
//     fire `onRecoveredSession(summary)` with a 30s timeout. On
//     resolve, clear marker. On reject/timeout, leave marker for next
//     mount and keep recoveryPending=true so the new session doesn't
//     overwrite the preserved marker.
//   - `onRecoveredSession` is captured in a ref to immunize the
//     mount-only effect against non-memoized parent callbacks.
//   - `clearMarker` failures are silently swallowed (the function
//     itself logs); recoveryPending advances regardless.
//
// Marker cadence: writes on START, on every ADVANCE_STEP, and on a
// 10s interval while running. Skips pause/resume (a force-quit
// during a pause shows a slightly stale duration on recovery —
// accepted Phase 1 trade-off).
//
// Audio handling:
//   - Pre-fetch every audio step on mount.
//   - AudioStepView load failure → audioErrorPhase='error' →
//     transport shows Try again + End early.
//   - Try again increments audioRetryKey, remounts AudioStepView.
//   - End early from the audio-error transport state dispatches
//     END_EARLY with reason='audio_error'.
//   - Header X dispatches END_EARLY with reason='user_exit' regardless
//     of audio state (the user actively chose to leave via the header).

import React, {
  useCallback,
  useEffect,
  useMemo,
  useReducer,
  useRef,
  useState,
} from 'react';
import {
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import Animated, { FadeIn } from 'react-native-reanimated';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { Colors, Spacing, Typography } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { prefetchProtocolAudio } from '../../services/audio/protocolAudioLoader';
import type {
  BrainState,
  Protocol,
  ProtocolSessionSummary,
  ProtocolStep,
} from '../../types/models';
import {
  initialPlayerState,
  isActive,
  isTerminal,
  playerReducer,
  type PlayerState,
} from '../../utils/playerReducer';
import {
  buildRecoveredSummary,
  clearMarker,
  isExpired,
  readMarker,
  writeMarker,
  type SessionMarker,
} from '../../utils/sessionMarker';
import { logger } from '../../utils/logger';
import { AudioStepView } from './AudioStepView';
import { BreathPacer } from './BreathPacer';
import { EndEarlyConfirmModal } from './EndEarlyConfirmModal';
import { InstructionStepView } from './InstructionStepView';
import { PlayerTransport } from './PlayerTransport';
import { TimerStepView } from './TimerStepView';

const RECOVERY_TIMEOUT_MS = 30_000;
const MARKER_REFRESH_INTERVAL_MS = 10_000;

export interface GuidedSessionPlayerProps {
  protocol: Protocol;
  stateBefore: BrainState;
  // Fires once when the current session ends (natural completion or
  // user-initiated end-early). Player will not call onExit twice.
  onExit: (summary: ProtocolSessionSummary) => void;
  // Fires once on mount if a force-quit recovery marker is detected
  // and not expired. Resolve to acknowledge (player clears marker);
  // reject to preserve the marker for the next mount. Hangs > 30s
  // are treated as rejection. Optional — consumers that handle
  // recovery upstream (e.g. Phase 2 Detail screen) can omit.
  onRecoveredSession?: (
    summary: ProtocolSessionSummary
  ) => Promise<void>;
}

export function GuidedSessionPlayer({
  protocol,
  stateBefore,
  onExit,
  onRecoveredSession,
}: GuidedSessionPlayerProps) {
  const reduceMotion = useReducedMotion();

  const [state, dispatch] = useReducer(playerReducer, initialPlayerState);
  const [recoveryPending, setRecoveryPending] = useState(true);
  const [audioErrorPhase, setAudioErrorPhase] = useState<'none' | 'error'>(
    'none'
  );
  const [audioRetryKey, setAudioRetryKey] = useState(0);
  const [skipBackSignal, setSkipBackSignal] = useState(0);
  const [headerExitVisible, setHeaderExitVisible] = useState(false);

  // Latest-callback refs. onRecoveredSession lives here so the
  // mount-only recovery effect doesn't re-run on non-memoized parent
  // callbacks (which would fire onRecoveredSession multiple times on
  // the same marker).
  const onRecoveredSessionRef = useRef(onRecoveredSession);
  const onExitRef = useRef(onExit);
  useEffect(() => {
    onRecoveredSessionRef.current = onRecoveredSession;
    onExitRef.current = onExit;
  });

  // Guards so onExit fires exactly once per mount.
  const exitFiredRef = useRef(false);

  // Tracks the previous PlayerState to decide whether marker-effect
  // ticks should write (START / ADVANCE_STEP) vs. skip (RESUME).
  const prevStateRef = useRef<PlayerState | null>(null);

  // Markers must reference protocol-shape data the player has at
  // mount; cache the totalSteps so the marker write doesn't re-read
  // the protocol object on every interval tick.
  const totalSteps = protocol.steps.length;

  // ----- recovery effect (mount-only, ref-driven) -----

  useEffect(() => {
    let cancelled = false;

    async function checkRecovery() {
      const handler = onRecoveredSessionRef.current;
      if (!handler) {
        // Consumer doesn't want recovery handling. Don't touch the
        // marker — leave it for a future mount that does provide a
        // handler (e.g. the Phase 2 Detail screen).
        if (!cancelled) setRecoveryPending(false);
        return;
      }

      const marker = await readMarker();
      if (cancelled) return;

      if (!marker) {
        if (!cancelled) setRecoveryPending(false);
        return;
      }

      if (isExpired(marker, Date.now())) {
        // Expired marker — discard. clearMarker swallows storage
        // errors internally, so we advance recoveryPending regardless
        // of the outcome (we accept that an unclearable expired
        // marker will be re-read and re-discarded on next mount).
        await clearMarker();
        if (!cancelled) setRecoveryPending(false);
        return;
      }

      const summary = buildRecoveredSummary(marker);

      try {
        await Promise.race([
          handler(summary),
          new Promise<never>((_, reject) =>
            setTimeout(
              () =>
                reject(
                  new Error(
                    `onRecoveredSession exceeded ${RECOVERY_TIMEOUT_MS}ms timeout`
                  )
                ),
              RECOVERY_TIMEOUT_MS
            )
          ),
        ]);
        if (cancelled) return;
        // Parent acknowledged. Clear the original marker. clearMarker
        // swallows storage errors; recoveryPending advances regardless
        // so the new session can begin marker tracking.
        await clearMarker();
        if (!cancelled) setRecoveryPending(false);
      } catch (err) {
        logger.warn(
          'GuidedSessionPlayer: onRecoveredSession rejected or timed out, marker preserved for next mount',
          err
        );
        // Leave recoveryPending=true. The current session can still
        // run (onExit fires normally at end), but force-quit recovery
        // for this session is not tracked. The original marker stays
        // in storage for the next-mount retry.
      }
    }

    checkRecovery();
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // ----- pre-fetch audio on mount -----

  useEffect(() => {
    // Fire-and-forget. prefetchProtocolAudio swallows errors
    // internally — a pre-fetch failure for one of N audio steps must
    // NOT block player startup. Runtime errors surface when the user
    // reaches the failed step (AudioStepView's load → onError →
    // audioErrorPhase='error' → transport offers Try again). Don't
    // "optimize" this by awaiting or by surfacing pre-fetch errors at
    // mount; that would gate the whole session on an opportunistic
    // optimization.
    for (const step of protocol.steps) {
      if (step.kind === 'audio') {
        prefetchProtocolAudio(step.audioPath);
      }
    }
  }, [protocol]);

  // ----- marker write/refresh effect -----

  useEffect(() => {
    if (recoveryPending) {
      prevStateRef.current = state;
      return;
    }

    if (state.status.kind !== 'running') {
      // Pause / completed / abandoned / idle — no interval, no write.
      prevStateRef.current = state;
      return;
    }

    const sessionStartedAt = state.sessionStartedAtMs;
    if (sessionStartedAt === null) {
      // Defensive: running implies non-null sessionStartedAtMs in the
      // reducer, but bail if invariants drift.
      return;
    }

    // Decide whether to write on this tick. Writes on START or
    // ADVANCE_STEP; skips RESUME (the 10s interval will refresh
    // lastUpdatedAt within seconds anyway).
    const prev = prevStateRef.current;
    const isInitialStart =
      prev === null || prev.status.kind === 'idle';
    const isStepAdvance =
      prev?.status.kind === 'running' &&
      state.status.kind === 'running' &&
      prev.status.stepIndex !== state.status.stepIndex;
    const shouldWriteNow = isInitialStart || isStepAdvance;

    const buildMarker = (): SessionMarker => ({
      protocolId: protocol.id,
      stateBefore,
      startedAt: sessionStartedAt,
      lastUpdatedAt: Date.now(),
      // Narrow again for TS — we already validated kind === 'running'
      // above, but the closure captures the union type.
      currentStepIndex:
        state.status.kind === 'running' ? state.status.stepIndex : 0,
      stepsCompleted: state.stepsCompleted,
      totalSteps,
    });

    if (shouldWriteNow) {
      writeMarker(buildMarker());
    }

    const interval = setInterval(() => {
      writeMarker(buildMarker());
    }, MARKER_REFRESH_INTERVAL_MS);

    prevStateRef.current = state;

    return () => {
      clearInterval(interval);
    };
  }, [
    recoveryPending,
    state,
    protocol.id,
    stateBefore,
    totalSteps,
  ]);

  // ----- onExit effect (terminal status) -----

  useEffect(() => {
    if (!isTerminal(state.status)) return;
    if (exitFiredRef.current) return;
    exitFiredRef.current = true;

    const summary = buildSummary(state, protocol, stateBefore);
    onExitRef.current(summary);

    // Clear marker on terminal — both natural completion and
    // user_exit/audio_error abandonment. Force-quit can't reach this
    // path (the player wasn't around to hit terminal).
    clearMarker();
  }, [state, protocol, stateBefore]);

  // ----- action handlers -----

  const currentStepIndex =
    state.status.kind === 'running' || state.status.kind === 'paused'
      ? state.status.stepIndex
      : 0;
  const currentStep: ProtocolStep | undefined =
    protocol.steps[currentStepIndex];

  const handleStart = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    dispatch({ type: 'START', nowMs: Date.now() });
  }, []);

  const handlePauseToggle = useCallback(() => {
    if (state.status.kind === 'running') {
      dispatch({ type: 'PAUSE', nowMs: Date.now() });
    } else if (state.status.kind === 'paused') {
      dispatch({ type: 'RESUME', nowMs: Date.now() });
    }
  }, [state.status.kind]);

  const handleStepComplete = useCallback(() => {
    const isLastStep = currentStepIndex === protocol.steps.length - 1;
    if (isLastStep) {
      dispatch({ type: 'COMPLETE', nowMs: Date.now() });
    } else {
      dispatch({ type: 'ADVANCE_STEP', nowMs: Date.now() });
    }
  }, [currentStepIndex, protocol.steps.length]);

  const handleAudioError = useCallback((err: Error) => {
    logger.warn('GuidedSessionPlayer: audio error', err);
    setAudioErrorPhase('error');
  }, []);

  const handleTryAgain = useCallback(() => {
    setAudioErrorPhase('none');
    setAudioRetryKey((k) => k + 1);
  }, []);

  const handleBackFifteen = useCallback(() => {
    setSkipBackSignal((s) => s + 1);
  }, []);

  const handleTransportEndEarly = useCallback(() => {
    // Reason depends on which transport variant the user ended from.
    // audio_error is reserved for the audio-error transport state
    // specifically — the user actively chose End early while the
    // audio was failing.
    const reason: 'user_exit' | 'audio_error' =
      audioErrorPhase === 'error' ? 'audio_error' : 'user_exit';
    dispatch({ type: 'END_EARLY', nowMs: Date.now(), reason });
  }, [audioErrorPhase]);

  const handleHeaderXTap = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    setHeaderExitVisible(true);
  }, []);

  const handleHeaderExitCancel = useCallback(() => {
    setHeaderExitVisible(false);
  }, []);

  const handleHeaderExitConfirm = useCallback(() => {
    setHeaderExitVisible(false);
    // Header X always uses user_exit, even during audio error. The
    // user actively chose to leave via the header — audio failure was
    // just the context.
    dispatch({ type: 'END_EARLY', nowMs: Date.now(), reason: 'user_exit' });
  }, []);

  // ----- step dispatch -----

  const renderStep = useMemo(() => {
    if (!currentStep) return null;
    const stepActive = state.status.kind === 'running';

    switch (currentStep.kind) {
      case 'breath': {
        const startIndex =
          (state.status.kind === 'running' ||
            state.status.kind === 'paused') &&
          state.status.breathScheduleIndex !== undefined
            ? state.status.breathScheduleIndex
            : 0;
        return (
          <BreathPacer
            key={`breath-${currentStepIndex}`}
            step={currentStep}
            startAtScheduleIndex={startIndex}
            isActive={stepActive}
            onPhaseChange={(entry) => {
              const idx =
                entry.cycleIndex * currentStep.phases.length +
                entry.phaseIndex;
              dispatch({ type: 'UPDATE_BREATH_INDEX', index: idx });
            }}
            onComplete={handleStepComplete}
          />
        );
      }
      case 'audio':
        return (
          <AudioStepView
            key={`audio-${currentStepIndex}-${audioRetryKey}`}
            step={currentStep}
            isActive={stepActive && audioErrorPhase === 'none'}
            skipBackSignal={skipBackSignal}
            onComplete={handleStepComplete}
            onError={handleAudioError}
          />
        );
      case 'instruction':
        return (
          <InstructionStepView
            key={`instr-${currentStepIndex}`}
            step={currentStep}
            isActive={stepActive}
            onComplete={handleStepComplete}
          />
        );
      case 'timer':
        return (
          <TimerStepView
            key={`timer-${currentStepIndex}`}
            step={currentStep}
            isActive={stepActive}
            onComplete={handleStepComplete}
          />
        );
      default:
        return assertNever(currentStep);
    }
  }, [
    currentStep,
    currentStepIndex,
    state.status,
    audioErrorPhase,
    audioRetryKey,
    skipBackSignal,
    handleStepComplete,
    handleAudioError,
  ]);

  // ----- render -----

  const stepActive = isActive(state.status);

  return (
    <View style={styles.container} testID="guided-session-player">
      <Header
        protocolName={protocol.name}
        currentStepIndex={currentStepIndex}
        totalSteps={totalSteps}
        showCloseButton={!isTerminal(state.status)}
        onClosePress={handleHeaderXTap}
      />

      <View style={styles.body}>
        {state.status.kind === 'idle' ? (
          <IdleView protocol={protocol} onStart={handleStart} />
        ) : isTerminal(state.status) ? (
          <TerminalView />
        ) : (
          <Animated.View
            key={`step-${currentStepIndex}`}
            style={styles.stepWrap}
            entering={reduceMotion ? undefined : FadeIn.duration(250)}
          >
            {renderStep}
          </Animated.View>
        )}
      </View>

      {stepActive ? (
        <PlayerTransport
          isPaused={state.status.kind === 'paused'}
          isAudioStep={currentStep?.kind === 'audio'}
          audioErrorPhase={audioErrorPhase}
          onPauseToggle={handlePauseToggle}
          onBackFifteen={handleBackFifteen}
          onTryAgain={handleTryAgain}
          onEndEarly={handleTransportEndEarly}
        />
      ) : null}

      <EndEarlyConfirmModal
        visible={headerExitVisible}
        onCancel={handleHeaderExitCancel}
        onConfirm={handleHeaderExitConfirm}
      />
    </View>
  );
}

// ---------- internal subcomponents ----------

interface HeaderProps {
  protocolName: string;
  currentStepIndex: number;
  totalSteps: number;
  showCloseButton: boolean;
  onClosePress: () => void;
}

function Header({
  protocolName,
  currentStepIndex,
  totalSteps,
  showCloseButton,
  onClosePress,
}: HeaderProps) {
  return (
    <View style={styles.header} testID="player-header">
      <View style={styles.headerCenter}>
        <Text style={styles.headerName} testID="player-header-protocol-name">
          {protocolName}
        </Text>
        <Text style={styles.headerSteps} testID="player-header-steps">
          {`Step ${currentStepIndex + 1} of ${totalSteps}`}
        </Text>
      </View>
      {showCloseButton ? (
        <TouchableOpacity
          style={styles.headerClose}
          onPress={onClosePress}
          accessibilityRole="button"
          accessibilityLabel="Close session"
          testID="player-header-close"
        >
          <Icon name="close" size={24} color={Colors.softCharcoal} />
        </TouchableOpacity>
      ) : null}
    </View>
  );
}

interface IdleViewProps {
  protocol: Protocol;
  onStart: () => void;
}

function IdleView({ protocol, onStart }: IdleViewProps) {
  return (
    <View style={styles.idle} testID="player-idle">
      <Text style={styles.idleHeading}>Ready when you are.</Text>
      <Text style={styles.idleBody}>
        {protocol.firstTimeOrientation.whatYoullDo}
      </Text>
      <TouchableOpacity
        style={styles.idleStart}
        onPress={onStart}
        accessibilityRole="button"
        accessibilityLabel="Begin"
        testID="player-idle-start"
      >
        <Text style={styles.idleStartText}>Begin</Text>
      </TouchableOpacity>
    </View>
  );
}

function TerminalView() {
  return (
    <View style={styles.terminal} testID="player-terminal">
      <Text style={styles.terminalText}>Saved.</Text>
    </View>
  );
}

// ---------- helpers ----------

function buildSummary(
  state: PlayerState,
  protocol: Protocol,
  stateBefore: BrainState
): ProtocolSessionSummary {
  const startedAt = state.sessionStartedAtMs ?? Date.now();
  const endedAt =
    state.status.kind === 'completed'
      ? state.status.completedAtMs
      : state.status.kind === 'abandoned'
        ? state.status.abandonedAtMs
        : Date.now();
  const completed = state.status.kind === 'completed';
  const abandonReason =
    state.status.kind === 'abandoned' ? state.status.reason : null;
  return {
    protocolId: protocol.id,
    stateBefore,
    completed,
    durationActualSeconds: Math.max(
      0,
      Math.floor((endedAt - startedAt) / 1000)
    ),
    stepsCompleted: state.stepsCompleted,
    totalSteps: protocol.steps.length,
    abandonReason,
    startedAt,
    endedAt,
  };
}

function assertNever(x: never): never {
  throw new Error(
    `GuidedSessionPlayer: unhandled step kind ${JSON.stringify(x)}`
  );
}

// ---------- styles ----------

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    minHeight: 56,
  },
  headerCenter: {
    flex: 1,
    alignItems: 'center',
  },
  headerName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  headerSteps: {
    marginTop: 2,
    fontSize: Typography.fontSize.xs,
    color: Colors.mutedSageGray,
  },
  headerClose: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 56,
    height: 56,
    alignItems: 'center',
    justifyContent: 'center',
  },
  body: {
    flex: 1,
  },
  stepWrap: {
    flex: 1,
  },
  idle: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xl,
  },
  idleHeading: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.md,
  },
  idleBody: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    lineHeight: 22,
    marginBottom: Spacing.xl,
  },
  idleStart: {
    minHeight: 48,
    paddingHorizontal: Spacing.xl,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  idleStartText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  terminal: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  terminalText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
});

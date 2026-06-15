// CheckInFlow — composition of the engine-wired multi-step check-in.
// Owns the reducer; renders the active step's view; wires the
// GuidedSessionPlayer when running; observes the two terminal steps
// (abandoned / flow_complete) and (a) writes the ProtocolSession record
// + legacy brainStateCheckIns bridged write, (b) surfaces the terminal
// to the parent via `onComplete` so the parent handles navigation
// (including pointer hand-off to Pomodoro / routines).
//
// Player is OPAQUE (locked decision A). Back is disabled during
// running / reflection / pointer_offer / terminals (locked decision B);
// this component renders no back affordance there.
//
// The player still speaks BrainState; the circumplex is bridged to a
// BrainState via quadrantToBrainState only for the player prop and the
// legacy/marker writes. The circumplex stays authoritative on
// protocolSessions (see brainStateCheckIn.service).

import React, { useEffect, useReducer, useRef } from 'react';
import { StyleSheet } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { Colors } from '../../../constants';
import { logger } from '../../../utils/logger';
import { quadrantToBrainState } from '../../../engine';
import type { Slot } from '../../../engine';
import type {
  BrainState,
  IntentPath,
  MovementModality,
  ProtocolSessionSummary,
  ProtocolTimeWindow,
} from '../../../types/models';

import { GuidedSessionPlayer } from '../../protocol/GuidedSessionPlayer';
import { LightMovementProtocolFlow } from '../../protocol/LightMovementProtocolFlow';
import { TimeWindowSelector } from '../TimeWindowSelector';
import { writeStandardFlowSession } from '../../../services/firebase/brainStateCheckIn.service';
import {
  clearMarker as clearFlowMarker,
  writeMarker as writeFlowMarker,
} from '../../../utils/flowSessionMarker';

import { flowReducer, initFlow } from './reducer';
import type { FlowInit, FlowState, TerminalFlowState } from './types';
import { SituationPickStepView } from './SituationPickStepView';
import { StatePickStepView } from './StatePickStepView';
import { PlanRecommendation } from './PlanRecommendation';
import { ReflectionStepView } from './ReflectionStepView';
import { PointerOfferStepView } from './PointerOfferStepView';
import { RecoveryConfirmStepView } from './RecoveryConfirmStepView';
import { leadPracticeSlot } from './planShape';

export type { TerminalFlowState } from './types';

export type CheckInFlowWriteMode = 'production' | 'dev_dry_run';

export interface CheckInFlowProps {
  init: FlowInit;
  userId: string;
  onComplete: (terminal: TerminalFlowState) => void;
  intentPath?: IntentPath;
  writeMode?: CheckInFlowWriteMode;
  onClose?: () => void;
  // "See other options" hands the engine slot + the user's time budget + a
  // bridged BrainState (for the downstream PracticeRun / BrowseRunFlow) to the
  // parent so the Practices index can re-run eligiblePractices for that slot.
  onSeeOtherOptions?: (
    slot: Slot,
    timeWindow: ProtocolTimeWindow,
    stateBefore: BrainState
  ) => void;
  // When true, the recommendation screen's "See other options" affordance is
  // hidden (onboarding mounts, where the Practices index is unreachable).
  hideSeeOtherOptions?: boolean;
}

export function CheckInFlow({
  init,
  userId,
  onComplete,
  intentPath = 'default',
  writeMode = 'production',
  onClose,
  onSeeOtherOptions,
  hideSeeOtherOptions = false,
}: CheckInFlowProps) {
  const [state, dispatch] = useReducer(flowReducer, init, initFlow);

  // Light Movement's pre-timer modality pick — stored in a ref rather than the
  // reducer so it doesn't inflate every FlowState variant (read at the terminal
  // write).
  const selectedModalityRef = useRef<MovementModality | null>(null);

  // Terminal-state observer. Awaits the Firestore write AND a 1500ms minimum
  // display window for the transition message before surfacing the terminal to
  // the parent. Write failures are caught + logged but do NOT block navigation.
  useEffect(() => {
    if (state.step !== 'abandoned' && state.step !== 'flow_complete') return;

    const dryRun = writeMode === 'dev_dry_run';
    let cancelled = false;

    const selectedModality = selectedModalityRef.current;
    const writeOptions: Parameters<typeof writeStandardFlowSession>[3] = { dryRun };
    if (selectedModality != null) {
      writeOptions.selectedModality = selectedModality;
    }

    (async () => {
      try {
        await Promise.all([
          writeStandardFlowSession(userId, state, intentPath, writeOptions),
          new Promise<void>((resolve) => setTimeout(resolve, 1500)),
        ]);
      } catch (error) {
        logger.error(
          '[CheckInFlow] writeStandardFlowSession failed (session NOT persisted to protocolSessions):',
          error
        );
      }
      if (cancelled) return;
      onComplete(state);
    })();

    return () => {
      cancelled = true;
    };
  }, [state, onComplete, userId, intentPath, writeMode]);

  // Flow-level force-quit recovery marker.
  //   - On entry to reflection (NOT from recovery_confirm): write the marker
  //     with the bridged BrainState so a force-quit recovers to the reflection.
  //   - On entry to flow_complete / abandoned: clear the marker.
  //   - On the recovery_confirm → situation_pick decline path: clear the marker.
  // Skipped under dev_dry_run.
  const prevStepRef = useRef<FlowState['step']>(state.step);
  useEffect(() => {
    if (writeMode === 'dev_dry_run') {
      prevStepRef.current = state.step;
      return;
    }

    if (state.step === 'reflection' && prevStepRef.current !== 'recovery_confirm') {
      (async () => {
        await writeFlowMarker({
          protocolId: state.protocol.id,
          stateBefore: quadrantToBrainState(state.quadrant),
          timeWindowSelected: state.timeWindow,
          sessionStartedAt: state.sessionStartedAt,
          sessionEndedAt: state.sessionEndedAt,
          durationActualSeconds: state.durationActualSeconds,
          intentPath,
          entrySource: state.entrySource,
          recoveryOfferedAt: null,
        });
      })();
    } else if (state.step === 'abandoned' || state.step === 'flow_complete') {
      clearFlowMarker();
    } else if (
      state.step === 'situation_pick' &&
      prevStepRef.current === 'recovery_confirm'
    ) {
      clearFlowMarker();
    }

    prevStepRef.current = state.step;
  }, [state, intentPath, writeMode]);

  return (
    <SafeAreaView style={styles.container} edges={['top']} testID="checkin-flow">
      {renderStep(
        state,
        dispatch,
        onClose,
        onSeeOtherOptions,
        (modality) => {
          selectedModalityRef.current = modality;
        },
        hideSeeOtherOptions
      )}
    </SafeAreaView>
  );
}

function renderStep(
  state: FlowState,
  dispatch: React.Dispatch<Parameters<typeof flowReducer>[1]>,
  onClose?: () => void,
  onSeeOtherOptions?: (
    slot: Slot,
    timeWindow: ProtocolTimeWindow,
    stateBefore: BrainState
  ) => void,
  onModalitySelected?: (modality: MovementModality) => void,
  hideSeeOtherOptions: boolean = false
): React.ReactNode {
  switch (state.step) {
    case 'recovery_confirm':
      return (
        <RecoveryConfirmStepView
          protocol={state.recoveredPayload.protocol}
          onConfirm={() => dispatch({ type: 'recovery_confirmed' })}
          onDecline={() => dispatch({ type: 'recovery_declined' })}
        />
      );

    case 'situation_pick':
      return (
        <SituationPickStepView
          onSelect={(situation) =>
            dispatch({ type: 'situation_selected', situation })
          }
          onClose={onClose}
        />
      );

    case 'state_pick':
      return (
        <StatePickStepView
          onSelect={({ arousal, valence }) =>
            dispatch({ type: 'state_selected', arousal, valence })
          }
          onBack={() => dispatch({ type: 'back' })}
          onClose={onClose}
        />
      );

    case 'time_pick':
      return (
        <TimeWindowSelector
          onSelect={(timeWindow) =>
            dispatch({ type: 'time_selected', timeWindow, nowMs: Date.now() })
          }
          onBack={() => dispatch({ type: 'back' })}
          onClose={onClose}
        />
      );

    case 'recommendation':
      return (
        <PlanRecommendation
          plan={state.plan}
          onPrimary={() => dispatch({ type: 'plan_primary', nowMs: Date.now() })}
          onSecondary={() =>
            dispatch({ type: 'plan_secondary', nowMs: Date.now() })
          }
          onSeeOtherOptions={() => {
            const slot = leadPracticeSlot(state.plan);
            if (slot && onSeeOtherOptions) {
              onSeeOtherOptions(
                slot,
                state.timeWindow,
                quadrantToBrainState(state.quadrant)
              );
            } else if (!onSeeOtherOptions) {
              logger.warn(
                '[CheckInFlow] onSeeOtherOptions invoked but parent did not provide a handler'
              );
            }
          }}
          showSeeOtherOptions={!hideSeeOtherOptions}
          onBack={() => dispatch({ type: 'back' })}
          onClose={onClose}
        />
      );

    case 'running': {
      const handlePlayerExit = (summary: ProtocolSessionSummary) => {
        dispatch({
          type: 'player_exit',
          reason: summary.completed ? 'completed' : 'ended_early',
          nowMs: Date.now(),
        });
      };
      const stateBefore = quadrantToBrainState(state.quadrant);
      if (state.protocol.family === 'brief-movement') {
        return (
          <LightMovementProtocolFlow
            protocol={state.protocol}
            stateBefore={stateBefore}
            onExit={handlePlayerExit}
            onModalitySelected={onModalitySelected}
            onCancel={onClose ?? (() => {})}
            timeWindowSelected={state.timeWindow}
          />
        );
      }
      return (
        <GuidedSessionPlayer
          protocol={state.protocol}
          stateBefore={stateBefore}
          onExit={handlePlayerExit}
        />
      );
    }

    case 'reflection':
      return (
        <ReflectionStepView
          protocol={state.protocol}
          pillar={state.pillar}
          direction={state.direction}
          onSelect={(reflectionId) =>
            dispatch({ type: 'reflection_selected', reflectionId })
          }
        />
      );

    case 'pointer_offer':
      return (
        <PointerOfferStepView
          pointer={state.pointer}
          onAccept={() => dispatch({ type: 'pointer_accepted' })}
          onDecline={() => dispatch({ type: 'pointer_declined' })}
        />
      );

    case 'abandoned':
    case 'flow_complete':
      // Terminal — parent unmounts on the same tick. Render nothing.
      return null;
  }
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
});

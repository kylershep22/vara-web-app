// Shared base contract for the GuidedSessionPlayer's leaf step views.
//
// Each leaf renders a single ProtocolStep and reports up via the
// callbacks. Leaf-specific props (e.g. AudioStepView's skipBackSignal)
// extend this base. Errors flow through `onError` so the player owns
// recovery decisions (retry, abandon, etc.) rather than each leaf
// inventing its own UX.
//
// `isActive` is the player-level pause signal: leaves play when true,
// pause when false. Leaves do NOT render their own pause/play
// controls — those live in PlayerTransport (sub-step 4.3).

import type {
  AudioStep,
  InstructionStep,
  TimerStep,
} from '../../types/models';

export interface BaseStepViewProps {
  isActive: boolean;
  onComplete: () => void;
  onError?: (error: Error) => void;
}

export interface AudioStepViewProps extends BaseStepViewProps {
  step: AudioStep;
  // Increment this number to request a 15-second back-skip. The
  // initial value is irrelevant; only changes are observed. Wired
  // from the player's transport bar.
  skipBackSignal?: number;
}

export interface InstructionStepViewProps extends BaseStepViewProps {
  step: InstructionStep;
}

export interface TimerStepViewProps extends BaseStepViewProps {
  step: TimerStep;
}

/**
 * Which of the four map states each phase is in (roadmap section 1).
 *
 * PURE, like derive.ts beside it: every input arrives as an argument, there is
 * no clock and no Firestore, and the whole table is computable from a state
 * document the caller already has.
 *
 * SEPARATE FROM derive.ts ON PURPOSE. That file's header says its functions ARE
 * the counters, and it is careful to keep them out of the UI. This is not a
 * count of anything; it is a position, and the map is its only consumer. Adding
 * it there would have made that header untrue.
 *
 * POSITION DECIDES FIRST, HISTORY ONLY BREAKS THE TIE. The rule is:
 *
 *   phase === current            'current'
 *   phase after current          'ahead'
 *   phase before current         'skipped' if its last history entry says so,
 *                                otherwise 'done'
 *
 * WHY POSITION FIRST, AND IT IS NOT A STYLE CHOICE. `stepBackToPhase` closes
 * the phase it leaves with exitReason 'adjusted_back' and moves the user
 * backwards, so a phase can carry a history entry while sitting AHEAD of where
 * the user now is. Reading history alone would label it DONE and tell the user
 * they had finished something they are about to meet again. Position is the
 * fact the user can see; history is the reason.
 *
 * WHY `skipped[]` IS NOT READ, though the model carries it. That array is
 * append-only and nothing ever removes an entry, so a phase that was jumped
 * over, stepped back into and then genuinely completed would read as SKIPPED
 * forever. The last history entry for a phase is the current truth about it;
 * the array is the historical record that it was once jumped. Both are correct
 * about different questions, and the map asks the first one. A test pins that
 * the two agree in every state the service can produce today.
 */
import { PHASE_ORDER } from '../constants/journey';
import type { PhaseState } from '../constants/journey';
import type { JourneyState, PhaseKey } from '../types/models';

/** One state per phase. Total: every phase always has an answer. */
export type PhaseStates = Record<PhaseKey, PhaseState>;

/** The fields of a journey state this derivation actually reads. */
export type PhaseStateInput = Pick<JourneyState, 'phaseKey' | 'history'>;

function emptyStates(fill: PhaseState): PhaseStates {
  return PHASE_ORDER.reduce((acc, phase) => {
    acc[phase] = fill;
    return acc;
  }, {} as PhaseStates);
}

/**
 * The state of every phase for a user who has a journey.
 *
 * An unrecognised `phaseKey` yields all-'ahead' rather than throwing. PhaseKey
 * is a closed union so the compiler makes that unreachable, but a document
 * written by a future version of the app would otherwise take the map down;
 * all-'ahead' renders a calm, honest route instead of a crash.
 */
export function derivePhaseStates(state: PhaseStateInput): PhaseStates {
  const currentIdx = PHASE_ORDER.indexOf(state.phaseKey);
  if (currentIdx === -1) return emptyStates('ahead');

  const states = emptyStates('ahead');

  PHASE_ORDER.forEach((phase, idx) => {
    if (idx === currentIdx) {
      states[phase] = 'current';
      return;
    }
    if (idx > currentIdx) {
      states[phase] = 'ahead';
      return;
    }

    // Behind the user. LAST entry, not first: a phase can be closed more than
    // once (skipped, stepped back into, closed again) and the most recent
    // closure is the one that describes it now.
    const closures = state.history.filter((entry) => entry.phaseKey === phase);
    const last = closures[closures.length - 1];
    // No entry at all cannot happen through the service, which writes one on
    // every exit. If it ever does, the user is demonstrably past this phase,
    // and 'done' is the honest reading of that.
    states[phase] = last?.exitReason === 'skipped' ? 'skipped' : 'done';
  });

  return states;
}

/**
 * The state of every phase for A ROUTE NOBODY HAS WALKED YET: one current, the
 * rest ahead.
 *
 * A2's shape, and deliberately NOT `derivePhaseStates` with an empty history.
 * The route explainer runs before the journey exists on the onboarding path and
 * once, at the moment of migration, on the beta path. In both cases the user is
 * being shown where they are ABOUT TO BEGIN, and nothing behind that point has
 * been done, skipped, or lived through at all.
 *
 * Feeding an empty history to the derivation would have produced 'done' for any
 * phase ahead of the start point, since the derivation reads "behind the user
 * with no closure" as "past it". That is the right reading of a real document
 * and the wrong reading of a route explanation: it would draw a completed
 * checkmark against a phase the user has never seen. Today every journey starts
 * at 'remove' so no such row exists, which is exactly why this would have gone
 * unnoticed until the day a journey started somewhere else.
 */
export function phaseStatesForRoute(currentPhase: PhaseKey): PhaseStates {
  const states = emptyStates('ahead');
  if (PHASE_ORDER.includes(currentPhase)) states[currentPhase] = 'current';
  return states;
}

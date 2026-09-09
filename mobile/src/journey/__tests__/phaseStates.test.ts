// Which of the four map states each phase is in.
//
// THE STATES NO USER CAN REACH TODAY ARE THE ONES WORTH PINNING. Nothing in the
// app calls advancePhase, skipToPhase or stepBackToPhase yet (slice 7 owns the
// offers), so every real account is at 'remove' with an empty history and the
// map shows one current row and three ahead. These fixtures are how the other
// three states get exercised before there is a way to produce them by hand, and
// how the walk script knows what to expect when slice 7 makes them reachable.

import { PHASE_ORDER } from '../../constants/journey';
import { derivePhaseStates, phaseStatesForRoute } from '../phaseStates';
import type { PhaseExitReason, PhaseHistoryEntry, PhaseKey } from '../../types/models';

// enteredAt / exitedAt are Timestamps the derivation never reads: it asks which
// phase an entry is for and why it closed, and nothing about when. Typed loosely
// here rather than built as real Timestamps so the fixture cannot suggest the
// dates matter.
function closed(phaseKey: PhaseKey, exitReason: PhaseExitReason): PhaseHistoryEntry {
  return {
    phaseKey,
    enteredAt: null as unknown as PhaseHistoryEntry['enteredAt'],
    exitedAt: null as unknown as PhaseHistoryEntry['exitedAt'],
    exitReason,
  };
}

describe('derivePhaseStates', () => {
  test('a new journey is one current row and three ahead', () => {
    expect(derivePhaseStates({ phaseKey: 'remove', history: [] })).toEqual({
      remove: 'current',
      recover: 'ahead',
      rewire: 'ahead',
      refocus: 'ahead',
    });
  });

  test('an advanced phase reads done, and the rest of the route stays ahead', () => {
    expect(
      derivePhaseStates({
        phaseKey: 'recover',
        history: [closed('remove', 'advanced')],
      })
    ).toEqual({
      remove: 'done',
      recover: 'current',
      rewire: 'ahead',
      refocus: 'ahead',
    });
  });

  test('a jumped phase reads skipped, not done', () => {
    // skipToPhase closes the phase in progress AND every phase jumped over with
    // exitReason 'skipped'. Calling either of those 'done' would tell the user
    // they finished something they walked past.
    expect(
      derivePhaseStates({
        phaseKey: 'refocus',
        history: [closed('remove', 'skipped'), closed('recover', 'skipped'), closed('rewire', 'skipped')],
      })
    ).toEqual({
      remove: 'skipped',
      recover: 'skipped',
      rewire: 'skipped',
      refocus: 'current',
    });
  });

  test('done and skipped coexist on one route', () => {
    expect(
      derivePhaseStates({
        phaseKey: 'refocus',
        history: [closed('remove', 'advanced'), closed('recover', 'skipped'), closed('rewire', 'advanced')],
      })
    ).toEqual({
      remove: 'done',
      recover: 'skipped',
      rewire: 'done',
      refocus: 'current',
    });
  });

  test('a phase the user stepped BACK from reads ahead, never done', () => {
    // THE CASE POSITION-FIRST EXISTS FOR. stepBackToPhase closes the phase it
    // leaves with 'adjusted_back' and moves the user backwards, so refocus here
    // carries a history entry while sitting in front of the user. Reading
    // history alone would draw a completed check against a phase they are about
    // to meet again.
    expect(
      derivePhaseStates({
        phaseKey: 'recover',
        history: [closed('remove', 'advanced'), closed('recover', 'advanced'), closed('refocus', 'adjusted_back')],
      })
    ).toEqual({
      remove: 'done',
      recover: 'current',
      rewire: 'ahead',
      refocus: 'ahead',
    });
  });

  test('a phase skipped, returned to and then completed reads done', () => {
    // WHY skipped[] IS NOT THE SOURCE. That array is append-only, so this phase
    // is in it forever; its LAST closure says the user actually did it. The
    // array answers "was this ever jumped", the map asks "what is it now".
    expect(
      derivePhaseStates({
        phaseKey: 'refocus',
        history: [
          closed('remove', 'advanced'),
          closed('recover', 'skipped'),
          closed('rewire', 'skipped'),
          closed('recover', 'advanced'),
          closed('rewire', 'advanced'),
        ],
      })
    ).toEqual({
      remove: 'done',
      recover: 'done',
      rewire: 'done',
      refocus: 'current',
    });
  });

  test('every phase always has a state, whatever the history', () => {
    // Totality. A missing key renders `undefined` through the style lookup in
    // PhasePath, which is a blank marker rather than a crash: exactly the shape
    // of bug that ships.
    const states = derivePhaseStates({ phaseKey: 'rewire', history: [] });
    for (const phase of PHASE_ORDER) {
      expect(states[phase]).toBeDefined();
    }
  });

  test('an unrecognised phase key renders a calm route rather than throwing', () => {
    const states = derivePhaseStates({
      phaseKey: 'not-a-phase' as PhaseKey,
      history: [],
    });
    for (const phase of PHASE_ORDER) {
      expect(states[phase]).toBe('ahead');
    }
  });
});

describe('phaseStatesForRoute', () => {
  test('one current, the rest ahead', () => {
    expect(phaseStatesForRoute('remove')).toEqual({
      remove: 'current',
      recover: 'ahead',
      rewire: 'ahead',
      refocus: 'ahead',
    });
  });

  test('NEVER marks anything done, even from a later start point', () => {
    // A2 explains a route nobody has walked. Passing this through the
    // derivation with an empty history would have produced 'done' for remove
    // and recover here, drawing completed checks against phases the user has
    // never seen. Today every journey starts at 'remove', which is exactly why
    // this would have gone unnoticed.
    const states = phaseStatesForRoute('rewire');

    expect(states).toEqual({
      remove: 'ahead',
      recover: 'ahead',
      rewire: 'current',
      refocus: 'ahead',
    });
    expect(Object.values(states)).not.toContain('done');
  });
});

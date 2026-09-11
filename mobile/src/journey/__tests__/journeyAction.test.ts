/**
 * The one journey-action slot's priority, at every boundary (slice 7a
 * decision 3).
 *
 * THE PRIORITY IS A PRODUCT RULE, SO IT IS TESTED AS ONE. Capture beats adjust
 * beats advance, and each "beats" is asserted with BOTH offers live rather than
 * by checking each in isolation. A test that only ever supplies one offer at a
 * time passes for an implementation with no priority at all.
 *
 * THE ADJUST CASES ARE REACHABLE FROM SLICE 7b. They were written in 7a against
 * a call site passing the literal 'hidden', precisely so that the ordering was
 * settled before the card was designed rather than during it. 7b changed that
 * one expression to a real placement and changed NOTHING here: not a case, not
 * an expectation, not the signature. The plan working is the reason this
 * paragraph is an edit rather than a rewrite.
 */
import { journeyActionFor, type JourneyActionInput } from '../journeyAction';

/** Nothing due, capture done, in a phase. Every test turns one thing on. */
const base = (over: Partial<JourneyActionInput> = {}): JourneyActionInput => ({
  phaseKey: 'remove',
  hasRemoveCapture: true,
  captureDismissed: false,
  adjustPlacement: 'hidden',
  advancePlacement: 'hidden',
  ...over,
});

describe('journeyActionFor - no journey', () => {
  test('a null phase yields no action', () => {
    expect(journeyActionFor(base({ phaseKey: null }))).toBeNull();
  });

  test('a null phase yields no action even with every offer due', () => {
    // The flag-off and floor-gated encodings both arrive as null, and neither
    // may render a journey card over a surface that has no journey.
    expect(
      journeyActionFor(
        base({
          phaseKey: null,
          hasRemoveCapture: false,
          adjustPlacement: 'today',
          advancePlacement: 'today',
        })
      )
    ).toBeNull();
  });
});

describe('journeyActionFor - capture', () => {
  test('shows in the remove phase with no capture', () => {
    expect(
      journeyActionFor(base({ phaseKey: 'remove', hasRemoveCapture: false }))
    ).toBe('capture');
  });

  test('does NOT show once captured', () => {
    expect(
      journeyActionFor(base({ phaseKey: 'remove', hasRemoveCapture: true }))
    ).toBeNull();
  });

  test('does NOT show once dismissed for the session', () => {
    expect(
      journeyActionFor(
        base({ phaseKey: 'remove', hasRemoveCapture: false, captureDismissed: true })
      )
    ).toBeNull();
  });

  test('is phase-scoped: no capture card outside the remove phase', () => {
    // A user in recover has no capture to make, and chasing them for one would
    // be asking about a phase they have left.
    for (const phaseKey of ['recover', 'rewire', 'refocus'] as const) {
      expect(journeyActionFor(base({ phaseKey, hasRemoveCapture: false }))).toBeNull();
    }
  });
});

describe('journeyActionFor - priority', () => {
  test('CAPTURE BEATS ADVANCE', () => {
    // A user who has not named what they are working on should not be offered
    // advancement away from it. Both are live here; only one may render.
    expect(
      journeyActionFor(
        base({
          phaseKey: 'remove',
          hasRemoveCapture: false,
          advancePlacement: 'today',
        })
      )
    ).toBe('capture');
  });

  test('ADJUST BEATS ADVANCE', () => {
    // The decision that costs something. A user can satisfy the behavioural
    // advancement threshold while having twice said "not really yet", and
    // offering to move forward then contradicts what they told us outright.
    // What the user TELLS us beats what we INFER from taps.
    expect(
      journeyActionFor(
        base({ adjustPlacement: 'today', advancePlacement: 'today' })
      )
    ).toBe('adjust');
  });

  test('CAPTURE BEATS ADJUST', () => {
    expect(
      journeyActionFor(
        base({
          phaseKey: 'remove',
          hasRemoveCapture: false,
          adjustPlacement: 'today',
        })
      )
    ).toBe('capture');
  });

  test('capture beats both at once', () => {
    expect(
      journeyActionFor(
        base({
          phaseKey: 'remove',
          hasRemoveCapture: false,
          adjustPlacement: 'today',
          advancePlacement: 'today',
        })
      )
    ).toBe('capture');
  });
});

describe('journeyActionFor - advance', () => {
  test('shows when it is the only thing due', () => {
    expect(journeyActionFor(base({ advancePlacement: 'today' }))).toBe('advance');
  });

  test('a DEMOTED advance offer does not occupy the slot', () => {
    // 'journey' means the offer lives on the map now. Rendering it on Today
    // would be the re-promotion R3 forbids.
    expect(journeyActionFor(base({ advancePlacement: 'journey' }))).toBeNull();
  });

  test('a demoted adjust offer does not occupy the slot either', () => {
    expect(journeyActionFor(base({ adjustPlacement: 'journey' }))).toBeNull();
  });

  test('a demoted adjust does NOT let a due advance through in its place', () => {
    // Deliberate and worth pinning: demotion is about WHERE an offer lives, not
    // about which offer is right to make. An adjust that has moved to the map
    // stops competing for the slot, so a due advance takes it.
    expect(
      journeyActionFor(
        base({ adjustPlacement: 'journey', advancePlacement: 'today' })
      )
    ).toBe('advance');
  });
});

describe('journeyActionFor - nothing due', () => {
  test('returns null so the slot renders nothing at all', () => {
    // Not a placeholder, not an empty card. The slot is absent when there is no
    // offer, which is what keeps Today at one primary action.
    expect(journeyActionFor(base())).toBeNull();
  });
});

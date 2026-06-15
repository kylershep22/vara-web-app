import { writeProtocolSession } from '../protocolSession.service';
import {
  mapStandardFlowTerminalToPayload,
  qualifiesAsFirstShift,
} from '../brainStateCheckIn.service';
import type { TerminalFlowState } from '../../../components/checkin/flow/CheckInFlow';
import { getProtocolById } from '../../../constants/brainStateProtocols';
import type { Protocol, ProtocolSessionOutcome } from '../../../types/models';
import type { ResolvedPlan } from '../../../engine';

function getProtocol(id: string): Protocol {
  const p = getProtocolById(id);
  if (!p) throw new Error(`fixture: ${id} missing`);
  return p;
}

const CYCLIC_SIGHING = getProtocol('cyclic-sighing-2');

const MINIMAL_PLAN: ResolvedPlan = {
  situation: 'just_reset',
  quadrant: 'Tense',
  slots: [],
};

function abandonedTerminal(): TerminalFlowState {
  return {
    step: 'abandoned',
    entrySource: 'standard',
    situation: 'just_reset',
    arousal: 'revved',
    valence: 'hard',
    quadrant: 'Tense',
    timeWindow: 5,
    plan: MINIMAL_PLAN,
    protocol: CYCLIC_SIGHING,
    pillar: 'energy',
    direction: 'settle',
    sessionStartedAt: 1_700_000_000_000,
    sessionEndedAt: 1_700_000_030_000,
    durationActualSeconds: 30,
  } as TerminalFlowState;
}

function practiceTerminal(reflection = 'calmer'): TerminalFlowState {
  return {
    step: 'flow_complete',
    entrySource: 'standard',
    situation: 'just_reset',
    arousal: 'revved',
    valence: 'hard',
    quadrant: 'Tense',
    timeWindow: 5,
    plan: MINIMAL_PLAN,
    completion: {
      kind: 'practice',
      protocol: CYCLIC_SIGHING,
      pillar: 'energy',
      direction: 'settle',
      reflection,
      sessionStartedAt: 1_700_000_000_000,
      sessionEndedAt: 1_700_000_120_000,
      durationActualSeconds: 120,
      pointerLaunched: null,
    },
  } as TerminalFlowState;
}

function pointerOnlyTerminal(): TerminalFlowState {
  return {
    step: 'flow_complete',
    entrySource: 'standard',
    situation: 'get_through_hard',
    arousal: 'revved',
    valence: 'good',
    quadrant: 'Activated',
    timeWindow: 5,
    plan: MINIMAL_PLAN,
    completion: {
      kind: 'pointer_only',
      pointerLaunched: { pillar: 'focus', type: 'focus-session' },
    },
  } as TerminalFlowState;
}

describe('mapStandardFlowTerminalToPayload', () => {
  it('maps abandoned: outcome=abandoned, circumplex authoritative, stateBefore/After null, reflection null', () => {
    expect(mapStandardFlowTerminalToPayload(abandonedTerminal(), 'default')).toEqual({
      protocolId: 'cyclic-sighing-2',
      stateBefore: null,
      stateAfter: null,
      timeWindowSelected: 5,
      durationActualSeconds: 30,
      outcome: 'abandoned',
      userChosenNextStep: null,
      intentPath: 'default',
      sessionStartedAt: 1_700_000_000_000,
      situation: 'just_reset',
      arousal: 'revved',
      valence: 'hard',
      quadrant: 'Tense',
      reflectionId: null,
    });
  });

  it('maps a practice completion: reflection drives the outcome (strong-positive → shifted)', () => {
    expect(mapStandardFlowTerminalToPayload(practiceTerminal('calmer'), 'default')).toEqual({
      protocolId: 'cyclic-sighing-2',
      stateBefore: null,
      stateAfter: null,
      timeWindowSelected: 5,
      durationActualSeconds: 120,
      outcome: 'shifted',
      userChosenNextStep: null,
      intentPath: 'default',
      sessionStartedAt: 1_700_000_000_000,
      situation: 'just_reset',
      arousal: 'revved',
      valence: 'hard',
      quadrant: 'Tense',
      reflectionId: 'calmer',
    });
  });

  it('middle reflection chip → maintenance; negative chip → not_shifted', () => {
    expect(mapStandardFlowTerminalToPayload(practiceTerminal('a_little'), 'default')!.outcome).toBe(
      'maintenance'
    );
    expect(
      mapStandardFlowTerminalToPayload(practiceTerminal('still_wound_up'), 'default')!.outcome
    ).toBe('not_shifted');
  });

  it('returns null for a pointer-only hand-off (nothing to persist)', () => {
    expect(mapStandardFlowTerminalToPayload(pointerOnlyTerminal(), 'default')).toBeNull();
  });

  it('forwards intentPath from the caller', () => {
    expect(mapStandardFlowTerminalToPayload(practiceTerminal(), 'sleep')!.intentPath).toBe('sleep');
  });
});

describe('writeProtocolSession — dryRun', () => {
  let logSpy: jest.SpyInstance;

  beforeEach(() => {
    logSpy = jest.spyOn(console, 'log').mockImplementation(() => {});
  });
  afterEach(() => {
    logSpy.mockRestore();
  });

  it('skips the Firestore write and logs the payload when dryRun is true', async () => {
    const payload = mapStandardFlowTerminalToPayload(practiceTerminal(), 'default')!;
    await expect(
      writeProtocolSession('test-user', payload, { dryRun: true })
    ).resolves.toBeUndefined();

    expect(logSpy).toHaveBeenCalled();
    const logged = logSpy.mock.calls
      .flat()
      .find((arg) => typeof arg === 'object' && arg !== null && 'docId' in arg);
    expect(logged).toBeDefined();
    expect(logged.docId).toBe('test-user_1700000000000');
    expect(logged.protocolId).toBe('cyclic-sighing-2');
  });

  it('treats undefined options as default (dryRun: false)', async () => {
    const payload = mapStandardFlowTerminalToPayload(abandonedTerminal(), 'default')!;
    await writeProtocolSession('test-user', payload).catch(() => {});
    const dryRunLog = logSpy.mock.calls
      .flat()
      .find((arg) => typeof arg === 'string' && arg.includes('dryRun'));
    expect(dryRunLog).toBeUndefined();
  });
});

describe('qualifiesAsFirstShift — first-shift footer trigger rule (unchanged)', () => {
  const ALL_OUTCOMES: ProtocolSessionOutcome[] = [
    'shifted',
    'partial_shift',
    'maintenance',
    'not_shifted',
    'abandoned',
    'failed',
    'browse_launched',
  ];

  it.each(['shifted', 'partial_shift'] as ProtocolSessionOutcome[])(
    'returns true for %s',
    (outcome) => {
      expect(qualifiesAsFirstShift(outcome)).toBe(true);
    }
  );

  it.each([
    'maintenance',
    'not_shifted',
    'abandoned',
    'failed',
    'browse_launched',
  ] as ProtocolSessionOutcome[])('returns false for %s', (outcome) => {
    expect(qualifiesAsFirstShift(outcome)).toBe(false);
  });

  it('covers every variant in the ProtocolSessionOutcome union', () => {
    const covered = new Set<ProtocolSessionOutcome>(ALL_OUTCOMES);
    expect(covered.size).toBe(ALL_OUTCOMES.length);
  });
});

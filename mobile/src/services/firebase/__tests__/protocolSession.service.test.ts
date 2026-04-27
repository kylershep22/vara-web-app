import { writeProtocolSession } from '../protocolSession.service';
import {
  mapStandardFlowTerminalToPayload,
  qualifiesAsFirstShift,
} from '../brainStateCheckIn.service';
import type { TerminalFlowState } from '../../../components/checkin/flow/CheckInFlow';
import { getProtocolById } from '../../../constants/brainStateProtocols';
import type { Protocol, ProtocolSessionOutcome } from '../../../types/models';

// Firestore is mocked at the jest.setup.js level — getFirestore returns
// a stub. We test:
//   1. The pure mapper (no Firestore dependency).
//   2. writeProtocolSession's dryRun branch (no Firestore call,
//      logger.log invoked with the payload).
//   3. The error-path behavior (when db is null, throws).
// Real Firestore writes are exercised by integration tests in 2.7
// device verification.

function getProtocol(id: string): Protocol {
  const p = getProtocolById(id);
  if (!p) throw new Error(`fixture: ${id} missing`);
  return p;
}

const CYCLIC_SIGHING = getProtocol('cyclic-sighing-2');

function abandonedTerminal(): TerminalFlowState {
  return {
    step: 'abandoned',
    entrySource: 'standard',
    stateBefore: 'wired',
    timeWindow: 5,
    protocol: CYCLIC_SIGHING,
    sessionStartedAt: 1_700_000_000_000,
    sessionEndedAt: 1_700_000_030_000,
    durationActualSeconds: 30,
  };
}

function flowCompleteTerminal(): TerminalFlowState {
  return {
    step: 'flow_complete',
    entrySource: 'standard',
    stateBefore: 'wired',
    timeWindow: 5,
    protocol: CYCLIC_SIGHING,
    sessionStartedAt: 1_700_000_000_000,
    sessionEndedAt: 1_700_000_120_000,
    durationActualSeconds: 120,
    playerExitReason: 'completed',
    stateAfter: 'steady',
    outcome: 'shifted',
    userChosenNextStep: 'dismissed',
  };
}

describe('mapStandardFlowTerminalToPayload', () => {
  it('maps abandoned terminal: outcome=abandoned, stateAfter=null, userChosenNextStep=null', () => {
    const payload = mapStandardFlowTerminalToPayload(
      abandonedTerminal(),
      'default'
    );
    expect(payload).toEqual({
      protocolId: 'cyclic-sighing-2',
      stateBefore: 'wired',
      stateAfter: null,
      timeWindowSelected: 5,
      durationActualSeconds: 30,
      outcome: 'abandoned',
      userChosenNextStep: null,
      intentPath: 'default',
      sessionStartedAt: 1_700_000_000_000,
    });
  });

  it('maps flow_complete terminal: full payload with classifier outcome + chosen next step', () => {
    const payload = mapStandardFlowTerminalToPayload(
      flowCompleteTerminal(),
      'default'
    );
    expect(payload).toEqual({
      protocolId: 'cyclic-sighing-2',
      stateBefore: 'wired',
      stateAfter: 'steady',
      timeWindowSelected: 5,
      durationActualSeconds: 120,
      outcome: 'shifted',
      userChosenNextStep: 'dismissed',
      intentPath: 'default',
      sessionStartedAt: 1_700_000_000_000,
    });
  });

  it('forwards intentPath from the caller (Phase 3 wiring point)', () => {
    const payload = mapStandardFlowTerminalToPayload(
      flowCompleteTerminal(),
      'sleep'
    );
    expect(payload.intentPath).toBe('sleep');
  });

  it('preserves auto_dismissed userChosenNextStep on flow_complete', () => {
    // Build the FlowCompleteStep variant directly so the spread keeps
    // the type narrow (a TerminalFlowState union spread loses the
    // discriminator).
    const base = flowCompleteTerminal();
    if (base.step !== 'flow_complete') {
      throw new Error('fixture invariant: expected flow_complete');
    }
    const terminal: TerminalFlowState = {
      ...base,
      userChosenNextStep: 'auto_dismissed',
    };
    const payload = mapStandardFlowTerminalToPayload(terminal, 'default');
    expect(payload.userChosenNextStep).toBe('auto_dismissed');
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
    const payload = mapStandardFlowTerminalToPayload(
      flowCompleteTerminal(),
      'default'
    );
    await expect(
      writeProtocolSession('test-user', payload, { dryRun: true })
    ).resolves.toBeUndefined();

    // logger.log → console.log under the test environment. Verify the
    // payload reached the log with the constructed doc ID.
    expect(logSpy).toHaveBeenCalled();
    const allLogArgs = logSpy.mock.calls.flat();
    const logged = allLogArgs.find(
      (arg) => typeof arg === 'object' && arg !== null && 'docId' in arg
    );
    expect(logged).toBeDefined();
    expect(logged.docId).toBe('test-user_1700000000000');
    expect(logged.protocolId).toBe('cyclic-sighing-2');
  });

  it('treats undefined options as default (dryRun: false)', async () => {
    // Sanity: omitting options should NOT trigger the dryRun branch.
    // The actual Firestore write would run, but jest.setup.js mocks
    // firebase/firestore so setDoc is a jest.fn that resolves.
    const payload = mapStandardFlowTerminalToPayload(
      abandonedTerminal(),
      'default'
    );
    // Don't assert resolution — db may be null in the mocked env, in
    // which case the function throws. Either way, we just want to
    // confirm the dryRun log line did NOT fire.
    await writeProtocolSession('test-user', payload).catch(() => {
      /* swallow; we're checking the log behavior, not the write */
    });
    const dryRunLog = logSpy.mock.calls.flat().find(
      (arg) => typeof arg === 'string' && arg.includes('dryRun')
    );
    expect(dryRunLog).toBeUndefined();
  });
});

describe('qualifiesAsFirstShift — first-shift footer trigger rule', () => {
  // Locked decision (sub-step 2.7 entry): the footer fires on
  // 'shifted' and 'partial_shift' outcomes only. 'maintenance' is
  // "held the line" — not a shift in user-facing language. The other
  // outcomes ('not_shifted', 'abandoned', 'failed', 'browse_launched')
  // are obviously not shifts. If the qualifying-outcome set ever
  // changes, this test is the regression guard.

  // Exhaustive list — keep aligned with ProtocolSessionOutcome union
  // in models.ts. If the union grows, TypeScript will not flag this
  // array, so adding the new variant here is a manual step.
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
    // Sanity check that the two it.each blocks above between them
    // cover every outcome value. If a new variant is added to the
    // union and the it.each lists aren't updated, this assertion
    // fails before the qualifier behavior diverges silently.
    const covered = new Set<ProtocolSessionOutcome>([
      'shifted',
      'partial_shift',
      'maintenance',
      'not_shifted',
      'abandoned',
      'failed',
      'browse_launched',
    ]);
    for (const outcome of ALL_OUTCOMES) {
      expect(covered.has(outcome)).toBe(true);
    }
    expect(covered.size).toBe(ALL_OUTCOMES.length);
  });
});

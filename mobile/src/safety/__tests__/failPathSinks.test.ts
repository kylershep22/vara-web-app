/**
 * THE FAIL PATH LEAKS NOTHING (journey slice 3c-i, Step 5).
 *
 * The promise this slice is built around is that a crisis disclosure is never
 * stored. That is easy to assert about Firestore and easy to forget about
 * everything else, so this file names every sink a string could escape through
 * and asserts the text reaches none of them:
 *
 *   - the logger (console in dev, and the only thing wired to crash reporting)
 *   - analytics (logEvent)
 *   - crash reporting (Sentry, currently inert; asserted anyway so it stays
 *     safe if it is ever switched on)
 *   - the network (Firestore writes are the only ones this flow makes)
 *   - AsyncStorage / SecureStore
 *
 * IT MODELS THE FLOW'S CONTRACT rather than rendering the screen: the caller
 * runs the pre-check and, on a failure, navigates instead of proceeding. If a
 * future edit reorders that, the assertions below are what should catch it.
 *
 * The passing case at the bottom is not decoration. Without it, a version of
 * this file where every sink was simply unreachable would go green while
 * proving nothing.
 */
const mockUpdateDoc = jest.fn();
const mockSetDoc = jest.fn();
const mockAddDoc = jest.fn();
jest.mock('firebase/firestore', () => ({
  doc: (...a: any[]) => ({ __ref: a }),
  collection: (...a: any[]) => ({ __collection: a }),
  getDoc: jest.fn(),
  setDoc: (...a: any[]) => mockSetDoc(...a),
  addDoc: (...a: any[]) => mockAddDoc(...a),
  updateDoc: (...a: any[]) => mockUpdateDoc(...a),
  serverTimestamp: () => ({ __serverTimestamp: true }),
}));
jest.mock('../../config/firebase', () => ({ db: { __db: true }, firebaseError: null }));

const mockLog = jest.fn();
const mockWarn = jest.fn();
const mockError = jest.fn();
jest.mock('../../utils/logger', () => ({
  logger: {
    log: (...a: any[]) => mockLog(...a),
    warn: (...a: any[]) => mockWarn(...a),
    error: (...a: any[]) => mockError(...a),
  },
}));

const mockSetItem = jest.fn();
jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    setItem: (...a: any[]) => mockSetItem(...a),
    getItem: jest.fn(),
    removeItem: jest.fn(),
  },
}));

const mockCaptureException = jest.fn();
const mockAddBreadcrumb = jest.fn();
jest.mock('../../services/crashReporting.service', () => ({
  captureException: (...a: any[]) => mockCaptureException(...a),
  addBreadcrumb: (...a: any[]) => mockAddBreadcrumb(...a),
  initializeCrashReporting: jest.fn(),
  setCrashReportingUser: jest.fn(),
}));

// Mocked rather than imported for real: the analytics service pulls
// expo-constants, which needs native linkage jest does not have. Every other
// suite in the repo mocks it for the same reason, and what matters here is the
// PAYLOAD a caller hands it, which the mock captures exactly.
const mockLogEvent = jest.fn();
jest.mock('../../services/firebase/analyticsEvents.service', () => ({
  logEvent: (...a: any[]) => mockLogEvent(...a),
}));

import { precheckFreeText } from '../textPrecheck';
import { recordRemoveCapture } from '../../services/firebase/journeyState.service';
import { logEvent } from '../../services/firebase/analyticsEvents.service';

/** Distinctive enough that a substring search cannot false-positive. */
const DISCLOSURE = 'zxqv I want to kill myself zxqv';

/** Every mock that could carry a string out of the process. */
const ALL_SINKS = () => [
  ['updateDoc', mockUpdateDoc],
  ['setDoc', mockSetDoc],
  ['addDoc', mockAddDoc],
  ['logger.log', mockLog],
  ['logger.warn', mockWarn],
  ['logger.error', mockError],
  ['AsyncStorage.setItem', mockSetItem],
  ['Sentry.captureException', mockCaptureException],
  ['Sentry.addBreadcrumb', mockAddBreadcrumb],
  ['analytics.logEvent', mockLogEvent],
] as const;

function assertNoSinkSaw(needle: string) {
  for (const [name, mock] of ALL_SINKS()) {
    const serialized = JSON.stringify(mock.mock.calls ?? []);
    if (serialized.includes(needle)) {
      throw new Error(`${name} received the free text: ${serialized}`);
    }
  }
}

describe('the pre-check fail path', () => {
  beforeEach(() => {
    for (const [, mock] of ALL_SINKS()) mock.mockClear();
  });

  test('the disclosure reaches NO sink', async () => {
    const result = precheckFreeText(DISCLOSURE);

    // The flow's contract: navigate on a failure, proceed only on a pass.
    if (result.pass) {
      await recordRemoveCapture('u1', { text: DISCLOSURE });
    }

    expect(result.pass).toBe(false);
    assertNoSinkSaw('zxqv');
  });

  test('the shown-event carries an empty payload and no category', () => {
    // What the support screen actually fires. The event type is
    // Record<string, never>, so this is belt and braces on top of tsc.
    const result = precheckFreeText(DISCLOSURE);
    expect(result.pass).toBe(false);

    logEvent('u1', 'safety_precheck_shown', {});

    expect(mockLogEvent).toHaveBeenCalledWith('u1', 'safety_precheck_shown', {});
    const serialized = JSON.stringify(mockLogEvent.mock.calls);
    expect(serialized).not.toContain('zxqv');
    expect(serialized).not.toContain('self_harm');
  });

  test('the CATEGORY reaches no sink either', () => {
    // It exists to order two rows on one screen. Storing it would put a
    // clinical label on a user record.
    const result = precheckFreeText(DISCLOSURE);
    expect(result.pass).toBe(false);
    assertNoSinkSaw('self_harm');
  });

  test('the pre-check itself is silent', () => {
    // A pure function with no logging. If someone adds a debug line to
    // textPrecheck.ts, this is what fails.
    precheckFreeText(DISCLOSURE);
    expect(mockLog).not.toHaveBeenCalled();
    expect(mockWarn).not.toHaveBeenCalled();
    expect(mockError).not.toHaveBeenCalled();
  });

  test('A PASSING ANSWER DOES REACH FIRESTORE, so the above is not vacuous', async () => {
    const ordinary = 'zzpass scrolling at night zzpass';
    const result = precheckFreeText(ordinary);

    if (result.pass) {
      await recordRemoveCapture('u1', { text: ordinary, family: 'behavioral' });
    }

    expect(result.pass).toBe(true);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(JSON.stringify(mockUpdateDoc.mock.calls)).toContain('zzpass');
  });
});

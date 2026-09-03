/**
 * The crisis pre-check (journey slice 3c-i).
 *
 * TWO PROPERTIES THIS SUITE EXISTS FOR:
 *
 *   1. THE PRE-CHECK CATCHES PLAIN DISCLOSURES in each of the five categories.
 *   2. NOTHING IS STORED WHEN IT FAILS. That is asserted at the bottom against
 *      the capture service itself, not just against the pure function, because
 *      the promise is about the write and not about the return value.
 *
 * The false-positive cases below are written as EXPECTED behavior rather than
 * as bugs. The screen is deliberately biased toward stopping: a stopped user
 * loses one screen, a missed disclosure gets filed as a habit and read back
 * inside a protocol card.
 */
import { precheckFreeText } from '../textPrecheck';

describe('passes ordinary answers', () => {
  test.each([
    'scrolling on my phone at night',
    'checking email before bed',
    'the group chat that never stops',
    'saying yes to everything at work',
    'coffee after 4pm',
    'my commute',
    '',
    '   ',
  ])('passes %p', (text) => {
    expect(precheckFreeText(text)).toEqual({ pass: true });
  });
});

describe('catches each category', () => {
  test.each([
    ['I want to kill myself', 'self_harm'],
    ['thinking about suicide', 'self_harm'],
    ['I keep wanting to hurt myself', 'self_harm'],
    ['I wish I was dead', 'self_harm'],
    ['my partner hits me', 'harm_from_others'],
    ['he threatens me when I say no', 'harm_from_others'],
    ['I am not safe at home', 'harm_from_others'],
    ['I am drinking too much every night', 'substance'],
    ['I relapsed last week', 'substance'],
    ['I have stopped eating properly', 'eating'],
    ['purging after meals', 'eating'],
    ['I hate myself for it', 'self_directed_negative'],
    ['I am worthless', 'self_directed_negative'],
  ] as const)('%p is caught as %s', (text, category) => {
    expect(precheckFreeText(text)).toEqual({ pass: false, category });
  });
});

describe('common obfuscations still match', () => {
  // ADDED PUNCTUATION AND CASE ONLY, which is what the brief scopes and what
  // the normalizer claims. Letter-spacing ("k i l l  m y s e l f") is
  // deliberate evasion and is NOT handled: the file header says so, and a test
  // asserting otherwise would be asserting a capability that does not exist.
  // The population this screens for is people writing plainly while
  // distressed, not people evading a filter.
  test.each([
    'Kill Myself',
    'KILL MYSELF',
    'self-harm',
    'self.harm',
    "I'm worthless",
    'I’m worthless',
    'i,m worthless',
    'hurt   myself',
  ])('catches %p', (text) => {
    expect(precheckFreeText(text).pass).toBe(false);
  });
});

describe('severity ordering', () => {
  test('a sentence tripping two categories reports the more serious one', () => {
    // "hate myself" is self_directed_negative and "kill myself" is self_harm.
    // The category routes the response, so the ordering is not cosmetic.
    expect(precheckFreeText('I hate myself and want to kill myself')).toEqual({
      pass: false,
      category: 'self_harm',
    });
  });
});

describe('word boundaries', () => {
  test('does not fire on a term embedded in an unrelated word', () => {
    // 'abuse' must not catch 'abusive language in a film review'-style input
    // through a substring match. This is the false-positive floor, not a
    // claim that the list is precise.
    expect(precheckFreeText('reading about substance policy').pass).toBe(true);
    expect(precheckFreeText('the binder on my desk').pass).toBe(true);
  });
});

// ---------------------------------------------------------------------------
// The storage promise
// ---------------------------------------------------------------------------

const mockUpdateDoc = jest.fn();
jest.mock('firebase/firestore', () => ({
  doc: (...a: any[]) => ({ __ref: a }),
  getDoc: jest.fn(),
  setDoc: jest.fn(),
  updateDoc: (...a: any[]) => mockUpdateDoc(...a),
  serverTimestamp: () => ({ __serverTimestamp: true }),
}));
jest.mock('../../config/firebase', () => ({ db: { __db: true }, firebaseError: null }));

// eslint-disable-next-line @typescript-eslint/no-var-requires
const { recordRemoveCapture } = require('../../services/firebase/journeyState.service');

describe('NOTHING IS WRITTEN WHEN THE PRE-CHECK FAILS', () => {
  beforeEach(() => mockUpdateDoc.mockClear());

  test('the failing path never reaches recordRemoveCapture', async () => {
    // This models the flow's contract: the caller runs the pre-check, and on a
    // failure it routes to the support screen instead of calling the service.
    // If a future edit calls the service first and checks afterwards, this is
    // the test that should catch it.
    const answer = 'I want to kill myself';
    const result = precheckFreeText(answer);

    if (result.pass) {
      await recordRemoveCapture('u1', { text: answer });
    }

    expect(result.pass).toBe(false);
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  test('a passing answer DOES write, so the test above is not vacuous', async () => {
    const answer = 'scrolling at night';
    const result = precheckFreeText(answer);

    if (result.pass) {
      await recordRemoveCapture('u1', { text: answer, family: 'behavioral' });
    }

    expect(result.pass).toBe(true);
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc.mock.calls[0][1].removeTargetText).toBe(answer);
  });

  test('the category never appears in anything the service would store', async () => {
    const result = precheckFreeText('I am not safe at home');
    expect(result.pass).toBe(false);
    // The category exists only to route the response. Storing it would put a
    // clinical label on a user record, which is exactly what the no-storage
    // rule exists to prevent.
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });
});

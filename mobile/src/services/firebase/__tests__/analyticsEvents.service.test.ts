// analyticsEvents.service — the writer and the content firewall.
//
// Two things are under test here and they are of different kinds.
//
// The RUNTIME tests below assert the doc shape and the fire-and-forget contract:
// an analytics write must never surface to, block, or break the user action that
// triggered it.
//
// The TYPE tests are the firewall, and they have teeth only under tsc, not under
// jest. Every `@ts-expect-error` below fails the build if the annotated line
// stops being an error, so widening the param types to admit free-form strings
// turns those directives into "Unused '@ts-expect-error' directive" and breaks
// `npx tsc --noEmit`. That is the mechanism that makes logging CONTENT
// impossible rather than merely discouraged. Do not delete them.

// jest.fn records call arguments regardless of the declared signature, so these
// take none: the assertions below read mock.calls, not these parameters.
const mockCollection = jest.fn(() => ({ __collection: true }));
const mockAddDoc = jest.fn((): any => Promise.resolve({ id: 'evt-1' }));
const mockServerTimestamp = jest.fn(() => ({ __serverTimestamp: true }));

jest.mock('firebase/firestore', () => ({
  collection: (...a: any[]) => mockCollection(...a),
  addDoc: (...a: any[]) => mockAddDoc(...a),
  serverTimestamp: () => mockServerTimestamp(),
}));
// requireDb() reads `db` from this module, so mocking it here narrows the handle
// without needing to mock ensureDb itself.
jest.mock('../../../config/firebase', () => ({
  db: { __db: true },
  firebaseError: null,
}));
// Mutable so a test can take the version away at runtime, which is what an
// unreadable app config looks like to the writer.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
const mockConstants: any = { expoConfig: { version: '1.0.0' } };
jest.mock('expo-constants', () => ({
  __esModule: true,
  get default() {
    return mockConstants;
  },
}));

import { logEvent, __sessionId } from '../analyticsEvents.service';

const ALICE = 'alice123';

/** The one safe weekly_open payload, spelled once. */
const OPEN_PARAMS = {
  outcome: 'focus',
  capacityInitial: 'normal',
  protocolId: 'focus-normal',
} as const;

/** Let the swallowed floating promise inside logEvent settle. */
const flush = () => new Promise((resolve) => setImmediate(resolve));

describe('analyticsEvents.service', () => {
  beforeEach(() => {
    mockCollection.mockClear();
    mockAddDoc.mockReset().mockResolvedValue({ id: 'evt-1' });
    mockServerTimestamp.mockClear();
  });

  describe('the doc it writes', () => {
    test('writes exactly one doc to analyticsEvents', async () => {
      logEvent(ALICE, 'weekly_open', OPEN_PARAMS);
      await flush();

      expect(mockAddDoc).toHaveBeenCalledTimes(1);
      expect(mockCollection).toHaveBeenCalledWith({ __db: true }, 'analyticsEvents');
    });

    test('carries the owner userId, the event name and the params', async () => {
      logEvent(ALICE, 'weekly_open', OPEN_PARAMS);
      await flush();

      const [, payload] = mockAddDoc.mock.calls[0];
      expect(payload.userId).toBe(ALICE);
      expect(payload.event).toBe('weekly_open');
      expect(payload.params).toEqual({
        outcome: 'focus',
        capacityInitial: 'normal',
        protocolId: 'focus-normal',
      });
    });

    test('stamps the time server-side, never from the device clock', async () => {
      logEvent(ALICE, 'weekly_open', OPEN_PARAMS);
      await flush();

      const [, payload] = mockAddDoc.mock.calls[0];
      expect(payload.timestamp).toEqual({ __serverTimestamp: true });
      expect(mockServerTimestamp).toHaveBeenCalled();
    });

    test('carries a sessionId and the app version', async () => {
      logEvent(ALICE, 'weekly_open', OPEN_PARAMS);
      await flush();

      const [, payload] = mockAddDoc.mock.calls[0];
      expect(payload.sessionId).toBe(__sessionId);
      expect(typeof payload.sessionId).toBe('string');
      expect(payload.appVersion).toBe('1.0.0');
    });

    test('the sessionId is stable across events in one app run', async () => {
      // Session grouping is the whole point: two events from one run must be
      // joinable. It is regenerated per app launch and carries no user identity.
      logEvent(ALICE, 'weekly_open', OPEN_PARAMS);
      logEvent(ALICE, 'login', { method: 'email' });
      await flush();

      const first = mockAddDoc.mock.calls[0][1].sessionId;
      const second = mockAddDoc.mock.calls[1][1].sessionId;
      expect(first).toBe(second);
    });

    test('writes no field beyond the declared envelope', async () => {
      // The doc shape is the audit surface. A field appearing here that no test
      // named is a field nobody decided to collect.
      logEvent(ALICE, 'weekly_open', OPEN_PARAMS);
      await flush();

      const [, payload] = mockAddDoc.mock.calls[0];
      expect(Object.keys(payload).sort()).toEqual([
        'appVersion',
        'event',
        'params',
        'sessionId',
        'timestamp',
        'userId',
      ]);
    });
  });

  describe('fire and forget', () => {
    test('returns undefined synchronously rather than a promise', () => {
      // A caller cannot accidentally await analytics into a user-facing path if
      // there is nothing to await.
      const returned = logEvent(ALICE, 'weekly_open', OPEN_PARAMS);

      expect(returned).toBeUndefined();
    });

    test('does not throw when the write rejects', async () => {
      mockAddDoc.mockRejectedValue(new Error('permission-denied'));

      expect(() => logEvent(ALICE, 'weekly_open', OPEN_PARAMS)).not.toThrow();
      await flush();
    });

    test('does not throw when Firestore is unavailable', () => {
      // requireDb() throws synchronously when init failed. That must not reach
      // the caller either, so the guard cannot live only in a .catch().
      jest.isolateModules(() => {
        jest.doMock('../../../config/firebase', () => ({
          db: null,
          firebaseError: new Error('config missing'),
        }));
        // eslint-disable-next-line @typescript-eslint/no-require-imports
        const svc = require('../analyticsEvents.service');

        expect(() => svc.logEvent(ALICE, 'weekly_open', OPEN_PARAMS)).not.toThrow();
      });
    });

    test('omits appVersion entirely when the version is unreadable', async () => {
      // Firestore rejects `undefined` field values outright, so writing the key
      // with nothing in it would throw during serialization and, because this
      // service swallows everything, lose the event silently. A missing version
      // must cost the field, not the event.
      delete mockConstants.expoConfig;
      try {
        logEvent(ALICE, 'weekly_open', OPEN_PARAMS);
        await flush();

        const [, payload] = mockAddDoc.mock.calls[0];
        expect(payload).not.toHaveProperty('appVersion');
        expect(payload.event).toBe('weekly_open');
        expect(Object.values(payload).every((v) => v !== undefined)).toBe(true);
      } finally {
        mockConstants.expoConfig = { version: '1.0.0' };
      }
    });

    test('a rejected write leaves no unhandled rejection behind', async () => {
      const unhandled = jest.fn();
      process.on('unhandledRejection', unhandled);
      mockAddDoc.mockRejectedValue(new Error('offline'));

      logEvent(ALICE, 'weekly_open', OPEN_PARAMS);
      await flush();
      process.off('unhandledRejection', unhandled);

      expect(unhandled).not.toHaveBeenCalled();
    });
  });

  describe('the content firewall (runtime backstop)', () => {
    // The type is the real firewall. This is the second line, for values that
    // reach the writer through an `any` cast or from untyped JS.

    test('drops a param value that is not a safe primitive', async () => {
      logEvent(ALICE, 'weekly_open', {
        ...OPEN_PARAMS,
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        nested: { body: 'a journal entry' },
      } as any);
      await flush();

      const [, payload] = mockAddDoc.mock.calls[0];
      expect(payload.params).not.toHaveProperty('nested');
      expect(payload.params).toEqual(OPEN_PARAMS);
    });

    test('drops a string too long to be an enum or an id', async () => {
      // Free-form content is long-form. A close note or journal body forced
      // through an `any` cast is dropped rather than written.
      const note = 'I felt completely overwhelmed at work this week and barely slept.';
      logEvent(ALICE, 'weekly_open', { ...OPEN_PARAMS, closeNote: note } as any);
      await flush();

      const [, payload] = mockAddDoc.mock.calls[0];
      expect(payload.params).not.toHaveProperty('closeNote');
      expect(JSON.stringify(payload)).not.toContain('overwhelmed');
    });

    test('keeps booleans and numbers', async () => {
      logEvent(ALICE, 'weekly_open', {
        ...OPEN_PARAMS,
        weekNumber: 3,
        quickWinActive: true,
      } as any);
      await flush();

      const [, payload] = mockAddDoc.mock.calls[0];
      expect(payload.params.weekNumber).toBe(3);
      expect(payload.params.quickWinActive).toBe(true);
    });
  });

  describe('the content firewall (type level)', () => {
    // These assertions run trivially under jest. Their real assertion is tsc.

    test('accepts the safe weekly_open payload', () => {
      expect(() =>
        logEvent(ALICE, 'weekly_open', {
          outcome: 'focus',
          capacityInitial: 'normal',
          protocolId: 'focus-normal',
        })
      ).not.toThrow();
    });

    test('rejects a free-form content field alongside a safe payload', () => {
      const closeNote = 'how the week actually went';

      logEvent(ALICE, 'weekly_open', {
        ...OPEN_PARAMS,
        // @ts-expect-error - content has no expressible slot in an event payload
        closeNote,
      });
    });

    test('rejects content smuggled into a payload built as a variable', () => {
      // Excess-property checking alone would miss this: a non-fresh object is
      // structurally assignable even with extra keys. The firewall must reject
      // it anyway, which is why the params type forbids unknown keys outright.
      const payload = { ...OPEN_PARAMS, floorCommitment: 'ten minutes of quiet' };

      // @ts-expect-error - unknown keys are forbidden, not merely unchecked
      logEvent(ALICE, 'weekly_open', payload);
    });

    test('rejects an arbitrary string in a typed enum slot', () => {
      const journalBody = 'today I noticed my shoulders were up by my ears';

      logEvent(ALICE, 'weekly_open', {
        ...OPEN_PARAMS,
        // @ts-expect-error - outcome is a fixed union, not a string
        outcome: journalBody,
      });
    });

    test('rejects an arbitrary string as a protocol id', () => {
      logEvent(ALICE, 'weekly_open', {
        ...OPEN_PARAMS,
        // @ts-expect-error - protocolId is the 12-member matrix union, not a string
        protocolId: 'whatever the user typed',
      });
    });

    test('rejects an event name outside the declared map', () => {
      // @ts-expect-error - the event name union is closed; new events are declared, not invented
      logEvent(ALICE, 'journal_entry_body', {});
    });

    test('rejects a payload missing a required field', () => {
      // @ts-expect-error - weekly_open requires all three fields
      logEvent(ALICE, 'weekly_open', { outcome: 'focus' });
    });
  });
});

/**
 * Ownership of pending-intent work (NPM-2 commit 4, Kyle's ruling 4 on Build A).
 *
 * Each step that would mutate notification state or the journal confirms the
 * signed-in owner at that moment: a new change's send, a replayed send, the
 * acknowledgement and rejection handlers, and the correcting reconcile. Here the
 * account changes WITHOUT a session clear, so the generation alone cannot stop
 * the work; only the ownership checks can.
 */

const mockDisk = new Map<string, string>();
const mockSetItemGate: { next: (() => Promise<void>) | null } = { next: null };
const mockUpdate = jest.fn();
const mockApply = jest.fn();
const mockReconcile = jest.fn();
const mockAuth: { currentUser: { uid: string } | null } = { currentUser: { uid: 'u1' } };

jest.mock('@react-native-async-storage/async-storage', () => ({
  __esModule: true,
  default: {
    getItem: jest.fn(async (k: string) => (mockDisk.has(k) ? mockDisk.get(k)! : null)),
    setItem: jest.fn(async (k: string, v: string) => {
      const gate = mockSetItemGate.next;
      mockSetItemGate.next = null;
      if (gate) await gate();
      mockDisk.set(k, v);
    }),
    removeItem: jest.fn(async (k: string) => {
      mockDisk.delete(k);
    }),
  },
}));
jest.mock('../../config/firebase', () => ({
  db: null,
  get auth() {
    return mockAuth;
  },
}));
jest.mock('../firebase/notificationPreferences.service', () => ({
  updateNotificationPreferences: (...a: unknown[]) => mockUpdate(...a),
}));
jest.mock('../notificationScheduler.service', () => ({
  applyDailyRhythmChoice: (...a: unknown[]) => mockApply(...a),
  reconcileDailyRhythm: (...a: unknown[]) => mockReconcile(...a),
}));

import {
  submitNotificationIntent,
  replayNotificationIntent,
  NOTIFICATION_INTENT_KEY,
  _resetNotificationIntentJournalForTests,
} from '../notificationIntentJournal';
import { _resetNotificationIntentStoreForTests } from '../notificationIntentStore';

const KEY = NOTIFICATION_INTENT_KEY;

function deferred<T = void>() {
  let resolve!: (v: T) => void;
  let reject!: (e: unknown) => void;
  const promise = new Promise<T>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}

function onDisk(): { uid: string; entries: Record<string, { value: unknown; seq: number }> } | null {
  const raw = mockDisk.get(KEY);
  return raw ? JSON.parse(raw) : null;
}

async function flush() {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
}

beforeEach(() => {
  jest.clearAllMocks();
  mockDisk.clear();
  mockSetItemGate.next = null;
  mockAuth.currentUser = { uid: 'u1' };
  mockUpdate.mockReturnValue(new Promise(() => {}));
  mockApply.mockResolvedValue('scheduled');
  mockReconcile.mockResolvedValue('scheduled');
  _resetNotificationIntentStoreForTests();
  _resetNotificationIntentJournalForTests();
});

describe('submit: the account changes while the change is being saved', () => {
  test('nothing is sent and nothing is applied for the departed account', async () => {
    const gate = deferred();
    mockSetItemGate.next = () => gate.promise;
    const submitting = submitNotificationIntent('u1', 'general', false, { general: false, reminderTime: null });
    await flush();
    mockAuth.currentUser = { uid: 'u2' };
    gate.resolve();

    // Mutation caught: dropping the ownership check after persistence.
    await expect(submitting).resolves.toEqual({ status: 'session-ended' });
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockApply).not.toHaveBeenCalled();
  });
});

describe('replayed send', () => {
  test("u1's persisted change is not sent while u2 is signed in", async () => {
    mockDisk.set(KEY, JSON.stringify({ v: 1, uid: 'u1', entries: { general: { value: false, seq: 3 } } }));
    mockAuth.currentUser = { uid: 'u2' };

    await replayNotificationIntent('u1');
    await flush();

    // Mutation caught: dropping the ownership check in send.
    expect(mockUpdate).not.toHaveBeenCalled();
  });
});

describe('acknowledgement and rejection handlers', () => {
  test('an acknowledgement arriving after the account changed touches nothing', async () => {
    const write = deferred();
    mockUpdate.mockReturnValueOnce(write.promise);
    const r = await submitNotificationIntent('u1', 'general', false, { general: false, reminderTime: null });
    mockAuth.currentUser = { uid: 'u2' };
    write.resolve();

    // Mutation caught: dropping the ownership check from the acknowledgement handler.
    await expect(r.status === 'sent' && r.settled).resolves.toEqual({ outcome: 'session-ended' });
    expect(onDisk()?.entries.general.value).toBe(false);
  });

  test('a rejection arriving after the account changed touches nothing', async () => {
    const write = deferred();
    mockUpdate.mockReturnValueOnce(write.promise);
    const r = await submitNotificationIntent('u1', 'general', false, { general: false, reminderTime: null });
    mockAuth.currentUser = { uid: 'u2' };
    write.reject(new Error('permission-denied'));

    // Mutation caught: dropping the ownership check from the rejection handler.
    await expect(r.status === 'sent' && r.settled).resolves.toEqual({ outcome: 'session-ended' });
    expect(onDisk()?.entries.general.value).toBe(false);
  });
});

describe('the correcting reconcile after a rejected replay', () => {
  test('if the account changed while the rejection was being settled, no correction runs', async () => {
    // Two entries, so settling one REWRITES the record (setItem, which the gate
    // can hold) rather than removing it.
    mockDisk.set(
      KEY,
      JSON.stringify({
        v: 1,
        uid: 'u1',
        entries: { general: { value: false, seq: 3 }, directMessages: { value: false, seq: 4 } },
      })
    );
    const write = deferred();
    mockUpdate.mockReturnValueOnce(write.promise); // general; directMessages never settles
    await replayNotificationIntent('u1');
    await flush();

    // Hold the settle's disk write, change the account, then let it finish.
    const gate = deferred();
    mockSetItemGate.next = () => gate.promise;
    write.reject(Object.assign(new Error('No document to update'), { code: 'not-found' }));
    await flush();
    mockAuth.currentUser = { uid: 'u2' };
    gate.resolve();
    await flush();

    // Mutation caught: dropping the ownership check before the correction.
    expect(mockReconcile).not.toHaveBeenCalled();
  });

  test('with the same account still signed in, the correction runs, owner-checked', async () => {
    mockDisk.set(KEY, JSON.stringify({ v: 1, uid: 'u1', entries: { general: { value: false, seq: 3 } } }));
    mockUpdate.mockRejectedValueOnce(Object.assign(new Error('No document to update'), { code: 'not-found' }));

    await replayNotificationIntent('u1');
    await flush();

    expect(mockReconcile).toHaveBeenCalledWith('u1', { requireOwner: true });
  });
});

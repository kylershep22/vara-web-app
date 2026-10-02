/**
 * The pending notification intent journal (NPM-2, Kyle's Decisions 2 and 12).
 *
 * Disk is a Map shared across module registries, so jest.isolateModules can
 * stand in for a process restart: fresh module state, same disk. The Firestore
 * write, the direct apply and the reconcile are recorded, not run.
 *
 * Kyle's six required properties, and where each is proven here:
 *   survives process restart ............ J2 (and through the screen in Build B)
 *   beats older remote state ............ R1 to R4 in notificationScheduler.overlay
 *   clears on acknowledgement / failure . J4 / J5
 *   user-scoped ......................... J6
 *   clears on session loss .............. J7
 *   newest local intent wins ............ J3
 * Replay (P1 to P3) is in notificationIntentJournal.replay.test.
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
  buildIntentWrite,
  clearNotificationIntent,
  NOTIFICATION_INTENT_KEY,
  _resetNotificationIntentJournalForTests,
} from '../notificationIntentJournal';
import {
  ensureJournalLoaded,
  persistedEntries,
  pendingDailyRhythmOverlay,
  _resetNotificationIntentStoreForTests,
} from '../notificationIntentStore';

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

function onDisk(): { v: number; uid: string; entries: Record<string, { value: unknown; seq: number }> } | null {
  const raw = mockDisk.get(KEY);
  return raw ? JSON.parse(raw) : null;
}

function writeDisk(record: unknown) {
  mockDisk.set(KEY, JSON.stringify(record));
}

/** Let every queued promise run. */
async function flush() {
  for (let i = 0; i < 10; i += 1) await Promise.resolve();
}

const NINE_PM = { hour: 21, minute: 30 };

beforeEach(() => {
  jest.clearAllMocks();
  mockDisk.clear();
  mockSetItemGate.next = null;
  mockAuth.currentUser = { uid: 'u1' };
  mockUpdate.mockReturnValue(new Promise(() => {})); // offline: never settles
  mockApply.mockResolvedValue('scheduled');
  mockReconcile.mockResolvedValue('scheduled');
  _resetNotificationIntentStoreForTests();
  _resetNotificationIntentJournalForTests();
});

describe('J1: persist, send, and the shared write-builder', () => {
  test.each([
    ['general', false, { allNotificationsEnabled: false }],
    ['dailyTime', NINE_PM, { 'dailyRhythm.enabled': true, 'dailyRhythm.reminderTime': NINE_PM }],
    ['directMessages', false, { 'socialConnection.directMessages': false }],
    ['connectionRequests', true, { 'socialConnection.connectionRequests': true }],
  ])('%s: persisted as one entry, then sent as dotted field paths', async (control, value, fields) => {
    // Mutation caught: a dropped or renamed path in buildIntentWrite (for example
    // dailyRhythm.enabled: true, or a whole-map dailyRhythm write).
    const result = await submitNotificationIntent('u1', control as never, value as never, {
      general: true,
      reminderTime: NINE_PM,
    });

    expect(result.status).toBe('sent');
    expect(onDisk()).toEqual({ v: 1, uid: 'u1', entries: { [control]: { value, seq: expect.any(Number) } } });
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockUpdate).toHaveBeenCalledWith('u1', fields);
    expect(buildIntentWrite(control as never, value as never)).toEqual(fields);
  });

  test('General and the daily time queue the direct apply with the values the caller supplied', async () => {
    await submitNotificationIntent('u1', 'general', false, { general: false, reminderTime: NINE_PM });
    expect(mockApply).toHaveBeenCalledWith('u1', { general: false, reminderTime: NINE_PM });
  });

  test('Direct messages and Connection requests queue no apply', async () => {
    await submitNotificationIntent('u1', 'directMessages', false);
    await submitNotificationIntent('u1', 'connectionRequests', false);
    expect(mockApply).not.toHaveBeenCalled();
  });
});

describe('J2 [K1]: an unacknowledged change survives a process restart', () => {
  test('a fresh module instance over the same disk loads the pending entry', async () => {
    await submitNotificationIntent('u1', 'general', false, { general: false, reminderTime: null });

    let entries: Record<string, unknown> = {};
    let freshLoad: unknown = null;
    await jest.isolateModulesAsync(async () => {
      const fresh = jest.requireActual<typeof import('../notificationIntentStore')>('../notificationIntentStore');
      freshLoad = fresh.ensureJournalLoaded;
      entries = await fresh.ensureJournalLoaded('u1');
    });

    // A new module instance: nothing carried over in memory, only disk.
    expect(freshLoad).not.toBe(ensureJournalLoaded);

    // Mutation caught: skipping the disk write in persistIntent.
    expect(entries).toEqual({ general: { value: false, seq: expect.any(Number) } });
  });
});

describe('J3 [K6]: newer local intent supersedes older pending intent', () => {
  test('a second change to the same control replaces the first, on disk and in memory', async () => {
    await submitNotificationIntent('u1', 'general', false, { general: false, reminderTime: null });
    await submitNotificationIntent('u1', 'general', true, { general: true, reminderTime: null });

    // Mutation caught: the older entry winning the merge.
    expect(onDisk()?.entries).toEqual({ general: { value: true, seq: expect.any(Number) } });
    expect(persistedEntries('u1').general?.value).toBe(true);
  });
});

describe('J4 [K3]: an acknowledgement clears the entry, only if it is still the latest', () => {
  test('a matching acknowledgement clears it from disk and memory', async () => {
    const ack = deferred();
    mockUpdate.mockReturnValueOnce(ack.promise);
    const r = await submitNotificationIntent('u1', 'general', false, { general: false, reminderTime: null });
    ack.resolve();

    await expect(r.status === 'sent' && r.settled).resolves.toEqual({ outcome: 'acknowledged', latest: true });
    expect(onDisk()).toBeNull();
    expect(persistedEntries('u1')).toEqual({});
  });

  test('an acknowledgement for an older change leaves the newer entry', async () => {
    const first = deferred();
    mockUpdate.mockReturnValueOnce(first.promise);
    const r1 = await submitNotificationIntent('u1', 'general', false, { general: false, reminderTime: null });
    await submitNotificationIntent('u1', 'general', true, { general: true, reminderTime: null });
    first.resolve();

    // Mutation caught: settleIntent ignoring the seq.
    await expect(r1.status === 'sent' && r1.settled).resolves.toEqual({ outcome: 'acknowledged', latest: false });
    expect(onDisk()?.entries.general.value).toBe(true);
  });
});

describe('J5 [K3]: a confirmed failure clears the entry, only if it is still the latest', () => {
  test('a matching rejection clears it and reports it', async () => {
    const write = deferred();
    mockUpdate.mockReturnValueOnce(write.promise);
    const r = await submitNotificationIntent('u1', 'dailyTime', NINE_PM, { general: true, reminderTime: NINE_PM });
    const error = Object.assign(new Error('No document to update'), { code: 'not-found' });
    write.reject(error);

    await expect(r.status === 'sent' && r.settled).resolves.toEqual({ outcome: 'rejected', latest: true, error });
    expect(onDisk()).toBeNull();
  });

  test('a rejection of an older change leaves the newer entry', async () => {
    const first = deferred();
    mockUpdate.mockReturnValueOnce(first.promise);
    const r1 = await submitNotificationIntent('u1', 'general', false, { general: false, reminderTime: null });
    await submitNotificationIntent('u1', 'general', true, { general: true, reminderTime: null });
    first.reject(new Error('permission-denied'));

    // Mutation caught: settleIntent ignoring the seq.
    await expect(r1.status === 'sent' && r1.settled).resolves.toMatchObject({ outcome: 'rejected', latest: false });
    expect(onDisk()?.entries.general.value).toBe(true);
  });
});

describe('J6 [K4]: pending changes are scoped to one user', () => {
  test("another user's record is never returned, and is deleted when its reader is signed in", async () => {
    writeDisk({ v: 1, uid: 'A', entries: { general: { value: false, seq: 1 } } });
    mockAuth.currentUser = { uid: 'B' };

    // Mutation caught: dropping the record.uid check.
    await expect(ensureJournalLoaded('B')).resolves.toEqual({});
    await expect(pendingDailyRhythmOverlay('B')).resolves.toEqual({});
    await flush();
    expect(onDisk()).toBeNull();
  });

  test('a reader that is not the signed-in user never deletes anyone\'s record', async () => {
    writeDisk({ v: 1, uid: 'B', entries: { general: { value: false, seq: 1 } } });
    mockAuth.currentUser = { uid: 'B' };

    await expect(ensureJournalLoaded('A')).resolves.toEqual({});
    await flush();
    expect(onDisk()?.uid).toBe('B');
  });
});

describe('J7 [K5]: session loss clears the pending changes', () => {
  test('memory goes at once, disk follows, and a late acknowledgement does nothing', async () => {
    const ack = deferred();
    mockUpdate.mockReturnValueOnce(ack.promise);
    const r = await submitNotificationIntent('u1', 'general', false, { general: false, reminderTime: null });

    const cleared = clearNotificationIntent('u1');
    // Synchronous: nothing pending is visible the moment the session ends.
    expect(persistedEntries('u1')).toEqual({});
    await cleared;
    expect(onDisk()).toBeNull();

    ack.resolve();
    // Mutation caught: no generation bump, so the late settle is not inert.
    await expect(r.status === 'sent' && r.settled).resolves.toEqual({ outcome: 'session-ended' });
    expect(onDisk()).toBeNull();
  });

  test('a change still being saved when the session ends never reaches disk', async () => {
    const gate = deferred();
    mockSetItemGate.next = () => gate.promise;
    const submitting = submitNotificationIntent('u1', 'general', false, { general: false, reminderTime: null });
    await flush();

    void clearNotificationIntent('u1');
    gate.resolve();

    // The write already started lands, then the queued removal takes it away;
    // and the change is reported, not sent.
    await expect(submitting).resolves.toEqual({ status: 'session-ended' });
    await flush();
    expect(onDisk()).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockApply).not.toHaveBeenCalled();
  });

  test("clearing for one user leaves another user's record alone", async () => {
    writeDisk({ v: 1, uid: 'B', entries: { general: { value: false, seq: 1 } } });
    await clearNotificationIntent('A');
    expect(onDisk()?.uid).toBe('B');
  });

  test('clearing with no user (signed-out cold start, deletion) removes whatever is stored', async () => {
    writeDisk({ v: 1, uid: 'B', entries: { general: { value: false, seq: 1 } } });
    await clearNotificationIntent();
    expect(onDisk()).toBeNull();
  });
});

describe('J8: disk writes land in order', () => {
  test('two controls changed back to back are both on disk', async () => {
    // Mutation caught: building the record before taking a place in the disk chain.
    await Promise.all([
      submitNotificationIntent('u1', 'general', false, { general: false, reminderTime: NINE_PM }),
      submitNotificationIntent('u1', 'dailyTime', NINE_PM, { general: false, reminderTime: NINE_PM }),
    ]);
    expect(Object.keys(onDisk()?.entries ?? {}).sort()).toEqual(['dailyTime', 'general']);
  });
});

describe('J9: a record is validated whole', () => {
  test.each([
    ['not JSON', '{nope'],
    ['an unknown version', JSON.stringify({ v: 2, uid: 'u1', entries: { general: { value: false, seq: 1 } } })],
    ['no uid', JSON.stringify({ v: 1, entries: { general: { value: false, seq: 1 } } })],
    ['an unknown control', JSON.stringify({ v: 1, uid: 'u1', entries: { quietHours: { value: false, seq: 1 } } })],
    ['a non-boolean switch', JSON.stringify({ v: 1, uid: 'u1', entries: { general: { value: 'no', seq: 1 } } })],
    ['a missing seq', JSON.stringify({ v: 1, uid: 'u1', entries: { general: { value: false } } })],
    [
      'an invalid daily time beside a valid General',
      JSON.stringify({
        v: 1,
        uid: 'u1',
        entries: { general: { value: false, seq: 1 }, dailyTime: { value: { hour: 21, minute: null }, seq: 2 } },
      }),
    ],
  ])('%s: discarded, nothing applied', async (_label, raw) => {
    // Mutation caught: skipping a bad entry and keeping the rest.
    mockDisk.set(KEY, raw);
    await expect(ensureJournalLoaded('u1')).resolves.toEqual({});
    await flush();
    expect(mockDisk.has(KEY)).toBe(false);
  });
});

describe('J10: a failed disk write is a failed save (Decision 12)', () => {
  test('persist-failed is reported, and nothing is held, sent or applied', async () => {
    mockSetItemGate.next = () => Promise.reject(new Error('disk full'));

    await expect(
      submitNotificationIntent('u1', 'general', false, { general: false, reminderTime: null })
    ).resolves.toEqual({ status: 'persist-failed' });

    expect(persistedEntries('u1')).toEqual({});
    expect(onDisk()).toBeNull();
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockApply).not.toHaveBeenCalled();
  });

  test('neither the Firestore write nor the apply goes before the disk write resolves', async () => {
    const gate = deferred();
    mockSetItemGate.next = () => gate.promise;
    const submitting = submitNotificationIntent('u1', 'general', false, { general: false, reminderTime: null });
    await flush();

    // Mutation caught: sending or applying ahead of persistence.
    expect(mockUpdate).not.toHaveBeenCalled();
    expect(mockApply).not.toHaveBeenCalled();

    gate.resolve();
    await submitting;
    expect(mockUpdate).toHaveBeenCalledTimes(1);
    expect(mockApply).toHaveBeenCalledTimes(1);
  });
});

describe('J11: nothing counts until it is on disk', () => {
  test('the overlay and replay do not see an entry whose disk write has not succeeded', async () => {
    await ensureJournalLoaded('u1');
    const gate = deferred();
    mockSetItemGate.next = () => gate.promise;
    const submitting = submitNotificationIntent('u1', 'general', false, { general: false, reminderTime: null });
    await flush();

    // Mutation caught: the in-memory entry becoming visible before persistence.
    await expect(pendingDailyRhythmOverlay('u1')).resolves.toEqual({});
    expect(persistedEntries('u1')).toEqual({});

    gate.resolve();
    await submitting;
    await expect(pendingDailyRhythmOverlay('u1')).resolves.toEqual({ general: false });
  });
});

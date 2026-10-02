/**
 * The pending notification intent journal: REPLAY after a restart (NPM-2,
 * Kyle's Decisions 2, 4 and 5). Harness shared with notificationIntentJournal.test.
 *
 * Disk is a Map; the Firestore write, the direct apply and the reconcile are
 * recorded, not run. A previous launch's pending entries are written to disk in
 * the journal's own format.
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

describe('replay (P1 to P3)', () => {
  const persisted = {
    v: 1,
    uid: 'u1',
    entries: { general: { value: false, seq: 11 }, dailyTime: { value: NINE_PM, seq: 12 } },
  };

  test('P1: each persisted entry is sent once per user per launch, with the shared write-builder', async () => {
    writeDisk(persisted);

    await replayNotificationIntent('u1');
    await replayNotificationIntent('u1');

    // Mutation caught: dropping the once-per-launch guard sends everything twice.
    expect(mockUpdate).toHaveBeenCalledTimes(2);
    expect(mockUpdate).toHaveBeenCalledWith('u1', { allNotificationsEnabled: false });
    expect(mockUpdate).toHaveBeenCalledWith('u1', {
      'dailyRhythm.enabled': true,
      'dailyRhythm.reminderTime': NINE_PM,
    });
  });

  test('P1: an acknowledged replay clears its entry', async () => {
    writeDisk({ v: 1, uid: 'u1', entries: { general: { value: false, seq: 11 } } });
    mockUpdate.mockResolvedValueOnce(undefined);

    await replayNotificationIntent('u1');
    await flush();

    expect(onDisk()).toBeNull();
  });

  test('P2: an entry already in flight in this launch is not sent again', async () => {
    await submitNotificationIntent('u1', 'general', false, { general: false, reminderTime: null });
    expect(mockUpdate).toHaveBeenCalledTimes(1);

    await replayNotificationIntent('u1');

    // Mutation caught: dropping the in-flight check.
    expect(mockUpdate).toHaveBeenCalledTimes(1);
  });

  test('P3: a rejected replay (the document is missing) clears its entry and corrects the schedule, silently', async () => {
    const { Alert } = jest.requireActual('react-native');
    const alertSpy = jest.spyOn(Alert, 'alert').mockImplementation(() => {});
    writeDisk({ v: 1, uid: 'u1', entries: { general: { value: false, seq: 11 } } });
    mockUpdate.mockRejectedValueOnce(Object.assign(new Error('No document to update'), { code: 'not-found' }));

    await replayNotificationIntent('u1');
    await flush();

    expect(onDisk()).toBeNull();
    // Mutation caught: dropping the correcting reconcile.
    expect(mockReconcile).toHaveBeenCalledWith('u1');
    expect(alertSpy).not.toHaveBeenCalled();
    alertSpy.mockRestore();
  });

  test('replay waits only for the disk read: it returns while the writes are still unsettled', async () => {
    writeDisk(persisted);
    mockUpdate.mockReturnValue(new Promise(() => {}));
    await expect(replayNotificationIntent('u1')).resolves.toBeUndefined();
  });
});

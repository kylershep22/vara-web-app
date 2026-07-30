/**
 * Notification preferences — schema routing on read.
 *
 * Two things are locked down here:
 *
 *  1. The V1 -> V2 migration must fire for V1 documents and MUST NOT fire for a
 *     V2 document that merely carries legacy `dailyReminders` debris. Routing
 *     those through the migration looks like an easy fix and is destructive:
 *     it derives dailyRhythm.enabled from dailyReminders.enabled (absent on the
 *     writes that created this debris, so it resolves to false) and resets the
 *     other V2 categories from V1 fields the document does not have.
 *
 *  2. The narrow salvage that recovers a stranded reminder time instead.
 */

const mockGetDoc = jest.fn((..._a: any[]): any => undefined);
const mockUpdateDoc = jest.fn((..._a: any[]) => Promise.resolve(undefined));
const mockSetDoc = jest.fn((..._a: any[]) => Promise.resolve(undefined));
const mockDoc = jest.fn((..._a: any[]) => ({ __ref: true }));

jest.mock('firebase/firestore', () => ({
  collection: (...a: any[]) => a,
  doc: (...a: any[]) => mockDoc(...a),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  getDocs: jest.fn(),
  addDoc: jest.fn(),
  updateDoc: (...a: any[]) => mockUpdateDoc(...a),
  setDoc: (...a: any[]) => mockSetDoc(...a),
  deleteDoc: jest.fn(),
  deleteField: () => '__deleteField__',
  query: jest.fn(),
  where: jest.fn(),
  orderBy: jest.fn(),
  limit: jest.fn(),
  serverTimestamp: () => '__ts__',
  Timestamp: {},
}));
jest.mock('../../../config/firebase', () => ({ db: { __db: true }, firebaseError: null }));

import { getNotificationPreferences } from '../notificationPreferences.service';

/** A healthy, fully-migrated V2 document. */
function v2Doc(overrides: Record<string, any> = {}) {
  return {
    schemaVersion: 2,
    allNotificationsEnabled: true,
    quietHours: {
      enabled: true,
      startTime: { hour: 21, minute: 0 },
      endTime: { hour: 8, minute: 0 },
    },
    dailyRhythm: { enabled: true, reminderTime: null },
    insightsLearning: { enabled: true, frequency: 'twice_weekly' },
    socialConnection: {
      directMessages: true,
      connectionRequests: true,
      communityDigest: true,
    },
    milestonesReflection: { enabled: true },
    completionSound: { enabled: true, sound: 'singing-bowl' },
    ...overrides,
  };
}

function resolveDoc(data: Record<string, any>) {
  mockGetDoc.mockResolvedValue({ exists: () => true, id: 'u1', data: () => data });
}

beforeEach(() => {
  mockGetDoc.mockReset();
  mockUpdateDoc.mockClear();
  mockSetDoc.mockClear();
  mockDoc.mockClear();
});

describe('a V2 document carrying legacy dailyReminders debris', () => {
  const stranded = {
    dailyReminders: { reminderTime: { hour: 7, minute: 30 }, fourThreeTwoOne: true, habits: true },
  };

  test('does NOT take the V1 migration path', async () => {
    resolveDoc(v2Doc(stranded));
    const prefs = await getNotificationPreferences('u1');

    // The migration would have reset every one of these. This is the
    // regression lock: widening isV1Schema to catch `dailyReminders` would
    // silently wipe the user's V2 settings.
    expect(prefs.insightsLearning).toEqual({ enabled: true, frequency: 'twice_weekly' });
    expect(prefs.socialConnection).toEqual({
      directMessages: true,
      connectionRequests: true,
      communityDigest: true,
    });
    expect(prefs.milestonesReflection).toEqual({ enabled: true });
    // The migration derives this from the absent dailyReminders.enabled and
    // would turn the daily reminder OFF.
    expect(prefs.dailyRhythm.enabled).toBe(true);
  });

  test('copies the stranded time onto the canonical field and drops the debris', async () => {
    resolveDoc(v2Doc(stranded));
    const prefs = await getNotificationPreferences('u1');

    // The field the scheduler actually reads.
    expect(prefs.dailyRhythm.reminderTime).toEqual({ hour: 7, minute: 30 });
    expect((prefs as any).dailyReminders).toBeUndefined();

    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    expect(mockUpdateDoc.mock.calls[0][1]).toEqual({
      dailyRhythm: { enabled: true, reminderTime: { hour: 7, minute: 30 } },
      dailyReminders: '__deleteField__',
      updatedAt: '__ts__',
    });
  });

  test('preserves an explicitly disabled daily rhythm rather than re-enabling it', async () => {
    resolveDoc(v2Doc({ ...stranded, dailyRhythm: { enabled: false, reminderTime: null } }));
    const prefs = await getNotificationPreferences('u1');

    expect(prefs.dailyRhythm).toEqual({ enabled: false, reminderTime: { hour: 7, minute: 30 } });
  });

  test('leaves the document alone when the canonical time is already set', async () => {
    resolveDoc(
      v2Doc({ ...stranded, dailyRhythm: { enabled: true, reminderTime: { hour: 6, minute: 0 } } })
    );
    const prefs = await getNotificationPreferences('u1');

    expect(prefs.dailyRhythm.reminderTime).toEqual({ hour: 6, minute: 0 });
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  test('ignores an unusable stranded time rather than writing garbage', async () => {
    resolveDoc(v2Doc({ dailyReminders: { reminderTime: { hour: 99, minute: 'x' } } }));
    const prefs = await getNotificationPreferences('u1');

    expect(prefs.dailyRhythm.reminderTime).toBeNull();
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  test('still returns the salvaged time in-session when the repair write fails', async () => {
    resolveDoc(v2Doc(stranded));
    mockUpdateDoc.mockRejectedValueOnce(new Error('offline'));
    const errorSpy = jest.spyOn(console, 'error').mockImplementation(() => {});

    const prefs = await getNotificationPreferences('u1');

    // Idempotent: retried on the next read, and this session already works.
    expect(prefs.dailyRhythm.reminderTime).toEqual({ hour: 7, minute: 30 });
    errorSpy.mockRestore();
  });
});

describe('documents with no debris', () => {
  test('a healthy V2 document is returned untouched', async () => {
    resolveDoc(v2Doc({ dailyRhythm: { enabled: true, reminderTime: { hour: 9, minute: 15 } } }));
    const prefs = await getNotificationPreferences('u1');

    expect(prefs.dailyRhythm).toEqual({ enabled: true, reminderTime: { hour: 9, minute: 15 } });
    expect(mockUpdateDoc).not.toHaveBeenCalled();
  });

  test('a genuine V1 document still migrates', async () => {
    resolveDoc({
      allNotificationsEnabled: true,
      streakProtection: { enabled: true },
      dailyReminders: { enabled: true, reminderTime: { hour: 8, minute: 0 } },
    });

    const prefs = await getNotificationPreferences('u1');

    expect(prefs.schemaVersion).toBe(2);
    expect(prefs.dailyRhythm).toEqual({ enabled: true, reminderTime: { hour: 8, minute: 0 } });
    expect(mockUpdateDoc).toHaveBeenCalledTimes(1);
    // The migration deletes the V1 field it just read.
    expect(mockUpdateDoc.mock.calls[0][1].dailyReminders).toBe('__deleteField__');
  });
});

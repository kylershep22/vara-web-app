/**
 * userPrivate migration slice 2 — writer repoint.
 *
 * ONE THING IS BEING PINNED HERE, from several angles: a non-allowlist field
 * lands on userPrivate/{uid} and NOT on users/{uid}. users/{uid} is readable by
 * any authenticated account (firestore.rules `match /users/{userId}` allows
 * read to anyone signed in), so every field that stays there is a field any
 * account can harvest. A regression that quietly re-points one of these back at
 * the public document would be invisible in the app and complete as a leak.
 *
 * The second thing pinned is the ABSENT-DOCUMENT case. During slices 2 and 3
 * most users have no userPrivate document at all, so every write path has to
 * create one rather than reject. The old dotted-path `updateDoc` form would
 * have failed on exactly those users — silently, in a try/catch — so each
 * repointed writer is exercised against a document that does not exist.
 */
const mockSetDoc = jest.fn((..._a: any[]) => Promise.resolve(undefined));
const mockGetDoc = jest.fn();
const mockDoc = jest.fn((_db: any, collection: string, id: string) => ({ collection, id }));
const mockServerTimestamp = jest.fn(() => '__ts__');

jest.mock('firebase/firestore', () => ({
  doc: (...a: any[]) => (mockDoc as any)(...a),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  setDoc: (...a: any[]) => mockSetDoc(...a),
  serverTimestamp: () => mockServerTimestamp(),
  writeBatch: jest.fn(),
  Timestamp: { fromDate: (d: Date) => d },
}));
jest.mock('../../../config/firebase', () => ({
  db: { __db: true },
  firebaseError: null,
}));

const absent = { exists: () => false };
const present = (data: Record<string, unknown> = {}) => ({
  exists: () => true,
  data: () => data,
});

import { saveOnboardingCheckIn, saveSelectedValues } from '../onboarding.service';
import {
  saveInitialState,
  savePeakWindow,
  saveStressors,
} from '../onboardingStressRecovery.service';
import { setSelectedPillar, unlockAllFeatures } from '../featureUnlock.service';
import { trackEngagementMetric, trackNewSession } from '../featureDiscovery.service';

/** The (ref, data, options) triple of the single setDoc that was performed. */
function lastWrite() {
  const call = mockSetDoc.mock.calls[mockSetDoc.mock.calls.length - 1];
  return { ref: call[0] as any, data: call[1] as any, options: call[2] as any };
}

/** Every collection any write in this test touched. */
function collectionsWritten() {
  return mockSetDoc.mock.calls.map((c) => (c[0] as any).collection);
}

describe('writer repoint — the field lands privately, never publicly', () => {
  beforeEach(() => {
    mockSetDoc.mockClear();
    mockDoc.mockClear();
    mockGetDoc.mockReset();
    mockGetDoc.mockResolvedValue(absent);
  });

  test('the onboarding check-in goes to userPrivate/{uid}', async () => {
    // energy/focus/mood is health-adjacent self-report. It has no business on a
    // document every signed-in account can read.
    await saveOnboardingCheckIn('u1', {
      energy: 3,
      focus: 2,
      mood: 4,
      timestamp: new Date() as any,
    } as any);

    expect(collectionsWritten()).toEqual(['userPrivate']);
    expect(lastWrite().data).toMatchObject({
      onboardingCheckIn: { energy: 3, focus: 2, mood: 4 },
      uid: 'u1',
    });
  });

  test('selected values go to userPrivate/{uid}', async () => {
    await saveSelectedValues('u1', ['clarity', 'resilience']);

    expect(collectionsWritten()).toEqual(['userPrivate']);
    expect(lastWrite().data).toMatchObject({ selectedValues: ['clarity', 'resilience'] });
  });

  test('no repointed writer touches the users collection', async () => {
    await saveOnboardingCheckIn('u1', {
      energy: 1,
      focus: 1,
      mood: 1,
      timestamp: new Date() as any,
    } as any);
    await saveSelectedValues('u1', ['a', 'b']);
    await saveStressors('u1', ['work']);
    await unlockAllFeatures('u1');
    await trackNewSession('u1');

    expect(collectionsWritten()).not.toContain('users');
  });
});

describe('absent userPrivate document — no write is silently dropped', () => {
  beforeEach(() => {
    mockSetDoc.mockClear();
    mockGetDoc.mockReset();
    // The normal mid-migration state: the user has never had a private document.
    mockGetDoc.mockResolvedValue(absent);
  });

  test('a stress-recovery write creates the document instead of rejecting', async () => {
    // The pre-migration form was updateDoc with a dotted path, which rejects
    // outright on a document that does not exist. setDoc(merge) is what makes
    // the first write on a migrating user land.
    await saveInitialState('u1', 'wired' as any);

    expect(mockSetDoc).toHaveBeenCalledTimes(1);
    expect(lastWrite().options).toEqual({ merge: true });
    expect(lastWrite().data).toMatchObject({
      onboardingStressRecovery: { initialState: 'wired' },
    });
  });

  test('the nested map is written as an OBJECT, never as a dotted key', async () => {
    // setDoc(merge) reads 'onboardingStressRecovery.peakWindow' as a literal
    // field name containing a dot. Keeping the dotted form would have written a
    // junk top-level field and dropped the real value — the single sharpest
    // failure mode in this repoint.
    await savePeakWindow('u1', 'morning' as any);

    const data = lastWrite().data;
    expect(Object.keys(data)).not.toContain('onboardingStressRecovery.peakWindow');
    expect(data.onboardingStressRecovery).toEqual({ peakWindow: 'morning' });
  });

  test('a nested write carries only its own key, so merge leaves siblings intact', async () => {
    // saveStressors must not clobber a peakWindow captured a screen earlier.
    await saveStressors('u1', ['sleep', 'work']);

    expect(lastWrite().data.onboardingStressRecovery).toEqual({
      stressors: ['sleep', 'work'],
    });
    expect(lastWrite().options).toEqual({ merge: true });
  });

  test('the feature-unlock timer writes a nested onboarding map', async () => {
    await setSelectedPillar('u1', 'focus' as any);

    const data = lastWrite().data;
    expect(Object.keys(data)).not.toContain('onboarding.selectedPillar');
    expect(data.onboarding).toMatchObject({
      selectedPillar: 'focus',
      featureUnlockMode: 'progressive',
    });
  });

  test('a counter starts at 1 when the user has no engagement anywhere', async () => {
    await trackNewSession('u1');

    expect(lastWrite().data.featureDiscovery.engagement).toMatchObject({ sessionCount: 1 });
  });
});

describe('counters carry the pre-migration value forward', () => {
  beforeEach(() => {
    mockSetDoc.mockClear();
    mockGetDoc.mockReset();
  });

  /** users/{uid} holds the old count; userPrivate does not exist yet. */
  function seedPublicOnly(engagement: Record<string, unknown>) {
    mockGetDoc.mockImplementation((ref: any) =>
      Promise.resolve(
        ref.collection === 'userPrivate'
          ? absent
          : present({ featureDiscovery: { engagement } })
      )
    );
  }

  test('a session count continues from the public value rather than resetting', async () => {
    // increment(1) against the empty private document would have written 1 and
    // thrown away nine sessions of unlock progress. This is why the sentinel
    // became a read-modify-write.
    seedPublicOnly({ sessionCount: 9 });
    await trackNewSession('u1');

    expect(lastWrite().data.featureDiscovery.engagement.sessionCount).toBe(10);
  });

  test('a metric increment continues from the public value', async () => {
    seedPublicOnly({ habitsCompleted: 4 });
    await trackEngagementMetric('u1', 'habitsCompleted' as any, 2);

    expect(lastWrite().data.featureDiscovery.engagement.habitsCompleted).toBe(6);
  });

  test('a private value wins over a stale public one', async () => {
    mockGetDoc.mockImplementation((ref: any) =>
      Promise.resolve(
        ref.collection === 'userPrivate'
          ? present({ featureDiscovery: { engagement: { sessionCount: 12 } } })
          : present({ featureDiscovery: { engagement: { sessionCount: 9 } } })
      )
    );
    await trackNewSession('u1');

    expect(lastWrite().data.featureDiscovery.engagement.sessionCount).toBe(13);
  });
});

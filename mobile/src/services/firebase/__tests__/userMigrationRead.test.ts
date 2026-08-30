/**
 * userMigrationRead — the read-through that keeps the app correct while data
 * lives in two places (userPrivate migration slice 2 of 4).
 *
 * The rule under test: userPrivate wins, users/{uid} is the fallback. That
 * ordering is what makes the transition safe in BOTH directions — a new build
 * writes only privately, an old build writes only publicly, and neither may
 * read a stale value over a fresh one.
 */
const mockDoc = jest.fn((_db: any, collection: string, id: string) => ({ collection, id }));
const mockGetDoc = jest.fn();
const mockOnSnapshot = jest.fn();

jest.mock('firebase/firestore', () => ({
  doc: (...a: any[]) => (mockDoc as any)(...a),
  getDoc: (...a: any[]) => mockGetDoc(...a),
  onSnapshot: (...a: any[]) => mockOnSnapshot(...a),
}));
jest.mock('../../../config/firebase', () => ({
  db: { __db: true },
  firebaseError: null,
}));

import {
  getMergedUserData,
  mergeUserDocuments,
  subscribeMergedUserData,
} from '../userMigrationRead';

const absent = { exists: () => false };
const present = (data: Record<string, unknown>) => ({ exists: () => true, data: () => data });

/** Resolve getDoc per collection, so the two reads can be posed independently. */
function seed(
  publicData: Record<string, unknown> | null,
  privateData: Record<string, unknown> | null
) {
  mockGetDoc.mockImplementation((ref: any) =>
    Promise.resolve(
      ref.collection === 'userPrivate'
        ? privateData
          ? present(privateData)
          : absent
        : publicData
          ? present(publicData)
          : absent
    )
  );
}

describe('mergeUserDocuments', () => {
  test('userPrivate wins over users/{uid} for the same field', () => {
    // The new build has written consent privately; the public copy is the
    // pre-migration value. Reading the public one would show stale consent.
    const merged = mergeUserDocuments({ aiConsent: false }, { aiConsent: true });
    expect(merged).toMatchObject({ aiConsent: true });
  });

  test('falls back to users/{uid} when userPrivate is absent', () => {
    // The normal state for anyone not yet backfilled by slice 3.
    const merged = mergeUserDocuments({ aiConsent: true }, null);
    expect(merged).toMatchObject({ aiConsent: true });
  });

  test('returns null only when NEITHER document exists', () => {
    expect(mergeUserDocuments(null, null)).toBeNull();
    expect(mergeUserDocuments({}, null)).not.toBeNull();
    expect(mergeUserDocuments(null, {})).not.toBeNull();
  });

  test('merges nested maps DEEPLY rather than letting the private half win whole', () => {
    // The case this rule exists for: a counter write touches only
    // featureDiscovery.engagement, so a mid-migration user has .features
    // publicly and .engagement privately. A shallow overlay would drop every
    // feature state and make the whole system look un-unlocked.
    const merged = mergeUserDocuments(
      {
        featureDiscovery: {
          features: { journal: { status: 'active' } },
          engagement: { sessionCount: 9 },
        },
      },
      { featureDiscovery: { engagement: { sessionCount: 10 } } }
    );
    expect(merged).toEqual({
      featureDiscovery: {
        features: { journal: { status: 'active' } },
        engagement: { sessionCount: 10 },
      },
    });
  });

  test('arrays replace rather than merge', () => {
    const merged = mergeUserDocuments(
      { selectedValues: ['a', 'b', 'c'] },
      { selectedValues: ['x'] }
    );
    expect(merged).toEqual({ selectedValues: ['x'] });
  });

  test('the private store own createdAt never shadows the account one', () => {
    // On users/{uid} createdAt is the account creation time, which drives the
    // event-code prompt window and the account-age cards. On userPrivate it is
    // merely when the private document was first written — for a migrated user
    // some arbitrary later moment. Letting it through would make every migrated
    // account look newly created.
    const merged = mergeUserDocuments(
      { createdAt: 'account-created', updatedAt: 'public-updated', uid: 'u1' },
      { createdAt: 'private-doc-created', updatedAt: 'private-updated', uid: 'u1' }
    );
    expect(merged).toMatchObject({
      createdAt: 'account-created',
      updatedAt: 'public-updated',
    });
  });

  test('a Timestamp-like value replaces instead of being merged into', () => {
    // Timestamps and Dates are objects but are VALUES. Merging into one would
    // corrupt it.
    const ts = new Date(0);
    const merged = mergeUserDocuments({ firstShiftAt: new Date(1000) }, { firstShiftAt: ts });
    expect(merged!.firstShiftAt).toBe(ts);
  });
});

describe('getMergedUserData', () => {
  beforeEach(() => {
    mockGetDoc.mockReset();
    mockDoc.mockClear();
  });

  test('reads both documents and prefers the private value', async () => {
    seed({ expoPushToken: 'old-token' }, { expoPushToken: 'new-token' });
    expect(await getMergedUserData('u1')).toMatchObject({ expoPushToken: 'new-token' });
  });

  test('serves the public value when the private document is absent', async () => {
    seed({ expoPushToken: 'old-token' }, null);
    expect(await getMergedUserData('u1')).toMatchObject({ expoPushToken: 'old-token' });
  });

  test('returns null when the user has neither document', async () => {
    seed(null, null);
    expect(await getMergedUserData('u1')).toBeNull();
  });

  test('addresses userPrivate/{uid} and users/{uid} by document ID', async () => {
    seed({}, {});
    await getMergedUserData('u1');
    expect(mockDoc).toHaveBeenCalledWith({ __db: true }, 'users', 'u1');
    expect(mockDoc).toHaveBeenCalledWith({ __db: true }, 'userPrivate', 'u1');
  });
});

describe('subscribeMergedUserData', () => {
  /** Capture both listeners so each can be driven independently. */
  function listeners() {
    const captured: Record<string, { next: Function; error: Function }> = {};
    mockOnSnapshot.mockImplementation((ref: any, next: Function, error: Function) => {
      captured[ref.collection] = { next, error };
      return jest.fn();
    });
    return captured;
  }

  beforeEach(() => {
    mockOnSnapshot.mockReset();
    mockDoc.mockClear();
  });

  test('does NOT emit until both documents have delivered once', () => {
    // Emitting on the public snapshot alone would publish the pre-migration
    // value for a beat — on the AppNavigator gate that is a migrated user
    // watching the app bounce into onboarding and back out.
    const captured = listeners();
    const onData = jest.fn();
    subscribeMergedUserData('u1', onData);

    captured.users.next(present({ hasCompletedOnboarding: false }));
    expect(onData).not.toHaveBeenCalled();

    captured.userPrivate.next(present({ hasCompletedOnboarding: true }));
    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenCalledWith(
      expect.objectContaining({ hasCompletedOnboarding: true })
    );
  });

  test('emits on every later snapshot from either side', () => {
    const captured = listeners();
    const onData = jest.fn();
    subscribeMergedUserData('u1', onData);

    captured.users.next(present({ aiConsent: false }));
    captured.userPrivate.next(absent);
    expect(onData).toHaveBeenCalledTimes(1);
    expect(onData).toHaveBeenLastCalledWith(expect.objectContaining({ aiConsent: false }));

    captured.userPrivate.next(present({ aiConsent: true }));
    expect(onData).toHaveBeenCalledTimes(2);
    expect(onData).toHaveBeenLastCalledWith(expect.objectContaining({ aiConsent: true }));
  });

  test('emits null when neither document exists', () => {
    const captured = listeners();
    const onData = jest.fn();
    subscribeMergedUserData('u1', onData);

    captured.users.next(absent);
    captured.userPrivate.next(absent);
    expect(onData).toHaveBeenCalledWith(null);
  });

  test('an error on either listener surfaces once and stops further emits', () => {
    const captured = listeners();
    const onData = jest.fn();
    const onError = jest.fn();
    subscribeMergedUserData('u1', onData, onError);

    captured.userPrivate.error(new Error('permission-denied'));
    captured.users.next(present({ aiConsent: true }));

    expect(onError).toHaveBeenCalledTimes(1);
    expect(onData).not.toHaveBeenCalled();
  });

  test('unsubscribing detaches both listeners', () => {
    const unsubs: jest.Mock[] = [];
    mockOnSnapshot.mockImplementation(() => {
      const u = jest.fn();
      unsubs.push(u);
      return u;
    });

    subscribeMergedUserData('u1', jest.fn())();
    expect(unsubs).toHaveLength(2);
    unsubs.forEach((u) => expect(u).toHaveBeenCalled());
  });
});

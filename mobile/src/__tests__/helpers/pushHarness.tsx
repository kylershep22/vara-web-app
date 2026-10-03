/**
 * pushHarness (NPM-3a-ii): fakes at the three boundaries the push token
 * lifecycle crosses, so a suite can run the real NotificationProvider, the
 * real notification services and the real AuthContext against them.
 *
 *   - expo-notifications and expo-device: permission state, this device's two
 *     tokens, the token-rotation listener and delivered-notification dismissal.
 *   - firebase/firestore: an in-memory document store. Every read, write and
 *     transaction step is appended to `world.log`, so a suite can assert the
 *     ORDER of a dismissal, a token clear and signOut.
 *   - firebase/auth and config/firebase: one signed-in uid, `world.authUid`.
 *
 * Suites wire it with jest.mock factories that require this file, for example
 *   jest.mock('expo-notifications', () => require('...').fakeNotifications);
 * and call resetWorld() in beforeEach. Nothing here is a test, so jest does not
 * collect it (the file name has no .test).
 */
import React from 'react';

type Data = Record<string, unknown>;
type Listener = (token: { type: string; data: string }) => void;

/** The deleteField() sentinel. A write carrying it removes that field. */
export const DELETE_SENTINEL = { __deleteField: true } as const;

export const EXPO_A = 'ExponentPushToken[device-A]';
export const DEVICE_A = 'apns-device-A-0123456789abcdef';
export const EXPO_OTHER = 'ExponentPushToken[device-OTHER]';
export const DEVICE_OTHER = 'apns-device-OTHER-fedcba9876543210';

interface World {
  log: string[];
  store: Map<string, Data>;
  writes: { path: string; data: Data }[];
  permission: 'granted' | 'undetermined' | 'denied';
  requestResult: 'granted' | 'denied';
  expoToken: string;
  deviceToken: string;
  authUid: string | null;
  tokenListeners: Listener[];
  removedTokenListeners: number;
  transactionMode: 'normal' | 'hang' | 'reject';
  /** Runs inside a transaction before its body, to change state mid-transaction. */
  onTransactionStart: (() => void) | null;
}

export const world: World = {
  log: [],
  store: new Map(),
  writes: [],
  permission: 'granted',
  requestResult: 'granted',
  expoToken: EXPO_A,
  deviceToken: DEVICE_A,
  authUid: 'u1',
  tokenListeners: [],
  removedTokenListeners: 0,
  transactionMode: 'normal',
  onTransactionStart: null,
};

export function resetWorld(): void {
  world.log = [];
  world.store = new Map();
  world.writes = [];
  world.permission = 'granted';
  world.requestResult = 'granted';
  world.expoToken = EXPO_A;
  world.deviceToken = DEVICE_A;
  world.authUid = 'u1';
  world.tokenListeners = [];
  world.removedTokenListeners = 0;
  world.transactionMode = 'normal';
  world.onTransactionStart = null;
}

/** The stored userPrivate document for a uid, or undefined. */
export function userPrivate(uid: string): Data | undefined {
  return world.store.get(`userPrivate/${uid}`);
}

/** Every write that reached userPrivate/{uid}. */
export function userPrivateWrites(uid: string): Data[] {
  return world.writes.filter((w) => w.path === `userPrivate/${uid}`).map((w) => w.data);
}

// ---------------------------------------------------------------------------
// expo-notifications and expo-device
// ---------------------------------------------------------------------------

function permissionResponse() {
  return {
    status: world.permission,
    granted: world.permission === 'granted',
    canAskAgain: true,
    expires: 'never',
  };
}

const noopSubscription = () => ({ remove: () => undefined });

export const fakeNotifications = {
  getPermissionsAsync: async () => permissionResponse(),
  requestPermissionsAsync: async () => {
    world.log.push('requestPermission');
    world.permission = world.requestResult;
    return permissionResponse();
  },
  getExpoPushTokenAsync: async () => {
    world.log.push('getExpoToken');
    return { type: 'expo', data: world.expoToken };
  },
  getDevicePushTokenAsync: async () => {
    world.log.push('getDeviceToken');
    return { type: 'ios', data: world.deviceToken };
  },
  addPushTokenListener: (listener: Listener) => {
    world.tokenListeners.push(listener);
    return {
      remove: () => {
        world.removedTokenListeners += 1;
        world.tokenListeners = world.tokenListeners.filter((l) => l !== listener);
      },
    };
  },
  dismissAllNotificationsAsync: async () => {
    world.log.push('dismissAll');
  },
  setNotificationHandler: () => undefined,
  setNotificationChannelAsync: async () => null,
  addNotificationReceivedListener: noopSubscription,
  addNotificationResponseReceivedListener: noopSubscription,
  getLastNotificationResponseAsync: async () => null,
  scheduleNotificationAsync: async () => 'scheduled-id',
  cancelScheduledNotificationAsync: async () => undefined,
  cancelAllScheduledNotificationsAsync: async () => undefined,
  getAllScheduledNotificationsAsync: async () => [],
  IosAuthorizationStatus: {
    NOT_DETERMINED: 0,
    DENIED: 1,
    AUTHORIZED: 2,
    PROVISIONAL: 3,
    EPHEMERAL: 4,
  },
  AndroidImportance: { HIGH: 4, DEFAULT: 3 },
  AndroidNotificationPriority: { DEFAULT: 'default', HIGH: 'high' },
  SchedulableTriggerInputTypes: { DAILY: 'daily', CALENDAR: 'calendar', DATE: 'date' },
};

export const fakeDevice = { isDevice: true };

/** Fire the token-rotation listeners, as the OS does when the device token changes. */
export function rotateDeviceToken(expoToken: string, deviceToken: string): void {
  world.expoToken = expoToken;
  world.deviceToken = deviceToken;
  world.tokenListeners.forEach((l) => l({ type: 'ios', data: deviceToken }));
}

// ---------------------------------------------------------------------------
// firebase/firestore
// ---------------------------------------------------------------------------

interface Ref {
  path: string;
  id: string;
}

function makeRef(segments: unknown[]): Ref {
  const parts = segments.filter((s): s is string => typeof s === 'string');
  return { path: parts.join('/'), id: parts[parts.length - 1] ?? '' };
}

function snapshot(ref: Ref) {
  const stored = world.store.get(ref.path);
  return {
    id: ref.id,
    exists: () => stored !== undefined,
    data: () => (stored ? { ...stored } : undefined),
    get: (field: string) => (stored ? stored[field] : undefined),
  };
}

function applyWrite(ref: Ref, data: Data, merge: boolean): void {
  const base: Data = merge ? { ...(world.store.get(ref.path) ?? {}) } : {};
  Object.entries(data).forEach(([key, value]) => {
    if (value === DELETE_SENTINEL) delete base[key];
    else base[key] = value;
  });
  world.store.set(ref.path, base);
  world.writes.push({ path: ref.path, data: { ...data } });
  world.log.push(`write:${ref.path}`);
}

export const fakeFirestore = {
  getFirestore: () => ({}),
  doc: (_db: unknown, ...segments: unknown[]) => makeRef(segments),
  collection: (_db: unknown, ...segments: unknown[]) => makeRef(segments),
  query: (...args: unknown[]) => args[0],
  where: () => ({}),
  orderBy: () => ({}),
  limit: () => ({}),
  getDocs: async () => ({ docs: [], empty: true, size: 0, forEach: () => undefined }),
  getDocsFromServer: async () => ({ docs: [], empty: true, size: 0, forEach: () => undefined }),
  onSnapshot: () => () => undefined,
  getDoc: async (ref: Ref) => {
    world.log.push(`read:${ref.path}`);
    return snapshot(ref);
  },
  getDocFromServer: async (ref: Ref) => {
    world.log.push(`serverRead:${ref.path}`);
    return snapshot(ref);
  },
  setDoc: async (ref: Ref, data: Data, options?: { merge?: boolean }) => {
    applyWrite(ref, data, !!options?.merge);
  },
  updateDoc: async (ref: Ref, data: Data) => {
    applyWrite(ref, data, true);
  },
  runTransaction: async <T,>(
    _db: unknown,
    body: (tx: {
      get: (ref: Ref) => Promise<ReturnType<typeof snapshot>>;
      update: (ref: Ref, data: Data) => void;
      set: (ref: Ref, data: Data, options?: { merge?: boolean }) => void;
    }) => Promise<T>
  ): Promise<T> => {
    world.log.push('tx:start');
    if (world.transactionMode === 'hang') {
      return new Promise<T>(() => undefined);
    }
    if (world.transactionMode === 'reject') {
      throw Object.assign(new Error('Failed to get document because the client is offline.'), {
        code: 'unavailable',
      });
    }
    world.onTransactionStart?.();
    const queued: { ref: Ref; data: Data; merge: boolean }[] = [];
    const result = await body({
      get: async (ref: Ref) => {
        world.log.push(`tx:get:${ref.path}`);
        return snapshot(ref);
      },
      update: (ref: Ref, data: Data) => {
        queued.push({ ref, data, merge: true });
      },
      set: (ref: Ref, data: Data, options?: { merge?: boolean }) => {
        queued.push({ ref, data, merge: !!options?.merge });
      },
    });
    queued.forEach((q) => applyWrite(q.ref, q.data, q.merge));
    world.log.push('tx:commit');
    return result;
  },
  serverTimestamp: () => 'SERVER_TIMESTAMP',
  deleteField: () => DELETE_SENTINEL,
  writeBatch: () => ({ set: () => undefined, update: () => undefined, commit: async () => undefined }),
  Timestamp: {
    fromDate: (d: Date) => ({ toDate: () => d, toMillis: () => d.getTime() }),
    now: () => ({ toDate: () => new Date(), toMillis: () => Date.now() }),
  },
};

// ---------------------------------------------------------------------------
// firebase/auth and config/firebase
// ---------------------------------------------------------------------------

function currentUser() {
  return world.authUid
    ? {
        uid: world.authUid,
        emailVerified: true,
        getIdToken: async () => 'id-token',
        reload: async () => undefined,
      }
    : null;
}

/** config/firebase: `auth.currentUser` always reflects world.authUid. */
export const fakeConfigFirebase = {
  db: {},
  firebaseError: null,
  auth: {
    get currentUser() {
      return currentUser();
    },
  },
};

export const fakeAuth = {
  getAuth: () => fakeConfigFirebase.auth,
  onAuthStateChanged: (_auth: unknown, callback: (user: unknown) => void) => {
    callback(currentUser());
    return () => undefined;
  },
  signOut: async () => {
    world.log.push('signOut');
    world.authUid = null;
  },
  createUserWithEmailAndPassword: async () => ({ user: currentUser() }),
  signInWithEmailAndPassword: async () => ({ user: currentUser() }),
  sendPasswordResetEmail: async () => undefined,
  sendEmailVerification: async () => undefined,
  updateProfile: async () => undefined,
};

// ---------------------------------------------------------------------------
// Collaborators of NotificationProvider that these suites do not exercise
// ---------------------------------------------------------------------------

export const fakeToastContext = {
  useToast: () => ({ showNotificationToast: () => undefined }),
};

export const fakeNotificationScheduler = {
  reconcileDailyRhythm: async () => 'scheduled',
  dailyRhythmNotificationId: (uid: string) => `${uid}-daily-rhythm`,
  cancelAllUserNotifications: async () => undefined,
  sendMilestoneNotification: async () => undefined,
  sendConnectionRequestNotification: async () => undefined,
  sendMessageNotification: async () => undefined,
  sendGroupPostNotification: async () => undefined,
  sendMentionNotification: async () => undefined,
};

export const fakeFocusSession = {
  getActiveFocusSession: async () => null,
  clearActiveFocusSession: async () => undefined,
  finalizeFocusSession: async () => undefined,
  planFocusCompleteLaunch: () => ({ finalize: null, completedSessionId: null }),
};

export const fakeIntentJournal = {
  replayNotificationIntent: async () => undefined,
  clearNotificationIntent: async () => undefined,
};

export const fakeAppNavigator = {
  navigationRef: { isReady: () => false, navigate: () => undefined },
};

/** A child that renders nothing, for mounting the provider on its own. */
export const Empty: React.FC = () => null;

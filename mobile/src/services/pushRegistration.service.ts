/**
 * pushRegistration (NPM-3a-ii): the one owner of this device's push tokens in
 * userPrivate/{uid}, and the protected clear that runs when a session ends.
 *
 * REGISTRATION (Kyle's II-D1, II-D2, II-D12). NotificationProvider alone calls
 * ensurePushRegistration, on its exclusive queue: at sign-in and on a cold
 * start with a restored session, on every return to the app, after any in-app
 * permission grant, on a token change, and when the user's email becomes
 * verified. The provider only calls it for a verified user. It does nothing
 * unless notification permission is already granted, and it never prompts.
 *
 * It reads the stored values FROM THE SERVER and writes only the field or
 * fields that differ from this device's tokens, in one merge write that reuses
 * that read. The Expo token (expoPushToken) and the device token (fcmToken,
 * kept until NPM-3b under R1-K5) are compared separately. Steady state is one
 * read and no write. With two devices, the one that registered last holds the
 * tokens (ledger row MULTI-DEVICE-PUSH).
 *
 * ENDING A SESSION (R1-K11 with its Round 6 confirmation; II-D3; II-D15 and
 * Kyle's ordering). AuthContext.logout calls beginPushSessionEnd (capture the
 * departing uid and this device's tokens; registration stops), dismisses
 * delivered notifications, calls clearDevicePushTokens, then signs out
 * whatever the clear did, and finally calls finishPushSessionEnd.
 *
 * NO TOKEN VALUE IS EVER LOGGED. Failures log a fixed message and, at most,
 * an error code.
 */
import * as Device from 'expo-device';
import * as Notifications from 'expo-notifications';
import {
  deleteField,
  getDocFromServer,
  runTransaction,
  serverTimestamp,
  type Timestamp,
} from 'firebase/firestore';
import { auth } from '../config/firebase';
import { requireDb } from './firebase/ensureDb';
import {
  setUserPrivateKnowingExistence,
  userPrivateRef,
  type UserPrivatePatch,
} from './firebase/userPrivate.service';
import { registerPushToken } from './notifications.service';
import { logger } from '../utils/logger';

/** How long sign-out waits for the server to confirm the token clear (II-D3). */
export const TOKEN_CLEAR_TIMEOUT_MS = 5000;

export interface DeviceTokens {
  /** The Expo push token, stored as expoPushToken. */
  expoToken: string | null;
  /** The native APNs or FCM token, stored as fcmToken. */
  deviceToken: string | null;
}

export interface DepartingSession {
  uid: string | null;
  /** This device's tokens as held from this app session, or null if not yet fetched. */
  tokens: DeviceTokens | null;
}

/** This device's tokens, held for the app session once both are known. */
let heldTokens: DeviceTokens | null = null;
/** True from the start of a sign-out until it finishes: registration writes nothing. */
let sessionEnding = false;
/** The registration pass in flight, so a token clear can wait for it. */
let inFlight: Promise<void> | null = null;

function currentUid(): string | null {
  return auth?.currentUser?.uid ?? null;
}

function errorCode(error: unknown): string {
  const code = (error as { code?: unknown } | null)?.code;
  return typeof code === 'string' ? code : 'unknown';
}

async function permissionGranted(): Promise<boolean> {
  try {
    const { status } = await Notifications.getPermissionsAsync();
    return status === 'granted';
  } catch {
    return false;
  }
}

async function fetchDeviceTokens(): Promise<DeviceTokens> {
  if (!Device.isDevice) return { expoToken: null, deviceToken: null };
  const expoToken = await registerPushToken();
  let deviceToken: string | null = null;
  try {
    const native = await Notifications.getDevicePushTokenAsync();
    deviceToken = typeof native.data === 'string' && native.data ? native.data : null;
  } catch {
    logger.warn('[pushRegistration] device token unavailable');
  }
  return { expoToken, deviceToken };
}

/** This device's tokens: the held pair, or a fresh fetch (held once both are known). */
async function deviceTokens(): Promise<DeviceTokens> {
  if (heldTokens) return heldTokens;
  const tokens = await fetchDeviceTokens();
  if (tokens.expoToken && tokens.deviceToken) heldTokens = tokens;
  return tokens;
}

async function register(uid: string): Promise<void> {
  if (!(await permissionGranted())) return;
  if (sessionEnding) return;

  const tokens = await deviceTokens();
  if (!tokens.expoToken && !tokens.deviceToken) return;

  let snap;
  try {
    snap = await getDocFromServer(userPrivateRef(uid));
  } catch (error) {
    logger.warn('[pushRegistration] stored tokens could not be read; nothing written', errorCode(error));
    return;
  }
  const stored = (snap.exists() ? snap.data() : {}) as {
    expoPushToken?: unknown;
    fcmToken?: unknown;
  };

  const patch: UserPrivatePatch = {};
  if (tokens.expoToken && stored.expoPushToken !== tokens.expoToken) {
    patch.expoPushToken = tokens.expoToken;
    patch.pushTokenUpdatedAt = serverTimestamp() as unknown as Timestamp;
  }
  if (tokens.deviceToken && stored.fcmToken !== tokens.deviceToken) {
    patch.fcmToken = tokens.deviceToken;
    patch.fcmTokenUpdatedAt = serverTimestamp() as unknown as Timestamp;
  }
  if (Object.keys(patch).length === 0) return;

  // A sign-out that began while this pass was reading must not see the token
  // written back, and a write never goes to anyone else's document.
  if (sessionEnding || currentUid() !== uid) return;
  await setUserPrivateKnowingExistence(uid, patch, snap.exists());
}

/**
 * Bring userPrivate/{uid} into line with this device's tokens. Never rejects
 * and never prompts. The caller (NotificationProvider) has already checked
 * that uid is signed in with a verified email.
 */
export async function ensurePushRegistration(uid: string): Promise<void> {
  if (sessionEnding) return;
  const pass = register(uid).catch((error: unknown) => {
    logger.warn('[pushRegistration] registration failed', errorCode(error));
  });
  inFlight = pass;
  try {
    await pass;
  } finally {
    if (inFlight === pass) inFlight = null;
  }
}

/**
 * Subscribe to token changes from the OS. The held tokens are dropped first so
 * the listener's registration pass fetches the new ones. Returns the
 * subscription; the provider removes it on unmount.
 */
export function onDeviceTokenChange(listener: () => void): { remove: () => void } {
  return Notifications.addPushTokenListener(() => {
    heldTokens = null;
    listener();
  });
}

/**
 * Step 1 of ending a session: capture the departing uid and this device's
 * tokens (as held; fetched later inside the bound if not), and stop
 * registration from writing until finishPushSessionEnd.
 */
export function beginPushSessionEnd(): DepartingSession {
  sessionEnding = true;
  return { uid: currentUid(), tokens: heldTokens };
}

/** The last step of ending a session, after signOut has been called. */
export function finishPushSessionEnd(): void {
  sessionEnding = false;
}

async function protectedClear(departing: DepartingSession & { uid: string }): Promise<void> {
  // A registration pass already past its checks is allowed to land first, so
  // the clear below reads what it wrote rather than racing it.
  if (inFlight) await inFlight;

  const own = departing.tokens ?? (await deviceTokens());
  if (!own.expoToken && !own.deviceToken) return;

  if (currentUid() !== departing.uid) {
    logger.warn('[pushRegistration] session changed before the token clear; nothing cleared');
    return;
  }
  const ref = userPrivateRef(departing.uid);
  await runTransaction(requireDb(), async (tx) => {
    if (currentUid() !== departing.uid) return;
    const snap = await tx.get(ref);
    if (!snap.exists()) return;
    const stored = snap.data() as { expoPushToken?: unknown; fcmToken?: unknown };
    const clear: Record<string, unknown> = {};
    if (own.expoToken && stored.expoPushToken === own.expoToken) {
      clear.expoPushToken = deleteField();
    }
    if (own.deviceToken && stored.fcmToken === own.deviceToken) {
      clear.fcmToken = deleteField();
    }
    // Another device's token, or none: left untouched (Round 6).
    if (Object.keys(clear).length === 0) return;
    tx.update(ref, { ...clear, updatedAt: serverTimestamp() });
  });
}

/**
 * Step 3 of ending a session: clear this device's tokens from the departing
 * user's userPrivate document, each only if it still equals this device's,
 * and only while the departing user is still the signed-in one. A Firestore
 * transaction reads and commits on the server, so resolving means the server
 * confirmed it. Bounded at TOKEN_CLEAR_TIMEOUT_MS. Never rejects: a reject or
 * timeout is logged and the caller signs out anyway.
 */
export async function clearDevicePushTokens(departing: DepartingSession): Promise<void> {
  const uid = departing.uid;
  if (!uid) return;
  let timer: ReturnType<typeof setTimeout> | undefined;
  const timedOut = new Promise<'timeout'>((resolve) => {
    timer = setTimeout(() => resolve('timeout'), TOKEN_CLEAR_TIMEOUT_MS);
  });
  try {
    const outcome = await Promise.race([
      protectedClear({ ...departing, uid }).then(() => 'done' as const),
      timedOut,
    ]);
    if (outcome === 'timeout') {
      logger.warn('[pushRegistration] token clear not confirmed in time; signing out anyway');
    }
  } catch (error) {
    logger.warn('[pushRegistration] token clear failed; signing out anyway', errorCode(error));
  } finally {
    if (timer) clearTimeout(timer);
  }
}

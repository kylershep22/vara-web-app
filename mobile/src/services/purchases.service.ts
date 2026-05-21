/**
 * RevenueCat Purchases service
 *
 * Thin platform-aware wrapper around `react-native-purchases` for:
 *   - configurePurchases(): one-shot SDK init at app boot.
 *   - identifyPurchaser(uid): bind the RC user to the Firebase UID so webhook
 *     events carry `app_user_id === uid` (the webhook routes on this).
 *   - clearPurchaser(): clear RC identity on sign-out.
 *
 * All three are defensive:
 *   - No throw on missing API key, unsupported platform, or SDK error.
 *   - identify/clear await a module-level gate that resolves once configure
 *     has run, so callers can fire them in any order (e.g., AuthContext's
 *     onAuthStateChanged can fire before App.tsx's mount effect runs).
 *
 * The app's source of truth for entitlement is still Firestore
 * (`users/{uid}.subscription`), read via `useSubscription`. This file
 * never reads `customerInfo` to make access decisions.
 */

import { Platform } from 'react-native';
import Purchases from 'react-native-purchases';
import { config } from '../config/env';
import { logger } from '../utils/logger';

let configuredPromise: Promise<boolean> | null = null;
let resolveConfigured: ((ready: boolean) => void) | null = null;

function ensureGate(): Promise<boolean> {
  if (!configuredPromise) {
    configuredPromise = new Promise<boolean>((resolve) => {
      resolveConfigured = resolve;
    });
  }
  return configuredPromise;
}

/**
 * One-shot SDK init. Safe to call multiple times (no-op after first call).
 * Fire-and-forget — does not return a promise; callers of identify/clear
 * await the internal gate.
 */
export function configurePurchases(): void {
  ensureGate();

  // If already resolved, this is a re-call — short-circuit.
  // (Idempotency lives in the gate: resolveConfigured is null after first resolve.)
  if (!resolveConfigured) return;

  try {
    const apiKey =
      Platform.OS === 'ios'
        ? config.revenueCatApiKeyIos
        : Platform.OS === 'android'
        ? config.revenueCatApiKeyAndroid
        : '';

    if (!apiKey) {
      logger.warn(
        `RevenueCat: no API key for platform "${Platform.OS}"; SDK not configured. ` +
          'Set EXPO_PUBLIC_REVENUECAT_API_KEY_IOS (or _ANDROID) in env or EAS secrets.'
      );
      resolveConfigured(false);
      resolveConfigured = null;
      return;
    }

    Purchases.configure({ apiKey });
    logger.log('RevenueCat: SDK configured');
    resolveConfigured(true);
    resolveConfigured = null;
  } catch (err) {
    logger.error('RevenueCat: configure failed', err);
    resolveConfigured?.(false);
    resolveConfigured = null;
  }
}

/**
 * Bind the RevenueCat user to a Firebase UID. Subsequent webhook events
 * for this user will have `app_user_id === uid`.
 */
export async function identifyPurchaser(uid: string): Promise<void> {
  if (!uid) return;
  const ready = await ensureGate();
  if (!ready) return;
  try {
    await Purchases.logIn(uid);
    logger.log('RevenueCat: logIn', { uid });
  } catch (err) {
    logger.warn('RevenueCat: logIn failed (non-fatal)', err);
  }
}

/**
 * Clear RevenueCat identity. Safe on already-anonymous sessions.
 */
export async function clearPurchaser(): Promise<void> {
  const ready = await ensureGate();
  if (!ready) return;
  try {
    await Purchases.logOut();
    logger.log('RevenueCat: logOut');
  } catch (err) {
    // RC throws if there is no active user — benign on cold-start sign-outs.
    logger.warn('RevenueCat: logOut returned error (often benign)', err);
  }
}

/**
 * Internal helper: returns true once configure has resolved successfully.
 * Used by `subscription.service.ts` to skip native calls when SDK isn't ready.
 */
export function purchasesReady(): Promise<boolean> {
  return ensureGate();
}

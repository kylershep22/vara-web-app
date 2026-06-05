/**
 * RevenueCat entitlement signal (shared store)
 *
 * Firestore (`users/{uid}.subscription`, read via `useSubscription`) remains the
 * durable source of truth for entitlement. This module adds a SECOND, additional
 * affirmative signal derived from RevenueCat's CustomerInfo, so the app can:
 *
 *   - grant access immediately after a successful purchase, before the
 *     webhook → Cloud Function has written Firestore, and
 *   - reconcile on app foreground (e.g. a user who subscribed on another device,
 *     or whose app-side trial fields lapsed while they hold an active store
 *     subscription).
 *
 * Fail-closed contract: `access` is `null` until a RevenueCat fetch affirmatively
 * resolves. `null` and `false` BOTH mean "this signal does not grant access" —
 * callers must treat only `true` as an affirmative grant. We never flip access to
 * `true` on error; getCustomerInfo failures leave the prior value untouched.
 *
 * This is a tiny external store (subscribe/notify) rather than a React context so
 * every `useSubscription` instance — including the navigator's route guard and the
 * paywall — observes the same value without wrapping the provider tree.
 */

import { AppState, type AppStateStatus } from 'react-native';
import Purchases from 'react-native-purchases';
import type { CustomerInfo } from 'react-native-purchases';
import { config } from '../config/env';
import { purchasesReady } from './purchases.service';
import { logger } from '../utils/logger';

// null = no affirmative RevenueCat signal yet (does NOT grant access).
let access: boolean | null = null;

const listeners = new Set<() => void>();
let appStateSub: { remove: () => void } | null = null;

function notify(): void {
  listeners.forEach((listener) => listener());
}

/**
 * Derive whether CustomerInfo affirmatively shows an active "premium" entitlement.
 * RevenueCat keeps the entitlement in `entitlements.active` for the whole access
 * window, including the introductory/free-trial period — so presence here covers
 * both the in-trial and paid states.
 */
function deriveAccess(info: CustomerInfo): boolean {
  return Boolean(info.entitlements?.active?.[config.revenueCatEntitlementId]);
}

function setAccess(next: boolean): void {
  if (access !== next) {
    access = next;
    notify();
  }
}

/** Current RevenueCat access signal. `null` = unknown (does not grant). */
export function getRcAccess(): boolean | null {
  return access;
}

/**
 * Apply a CustomerInfo we already hold (e.g. the one returned by
 * `purchasePackage`) so access is granted synchronously, without a round trip.
 */
export function applyCustomerInfo(info: CustomerInfo): void {
  setAccess(deriveAccess(info));
}

/**
 * Fetch the latest CustomerInfo and reconcile the access signal. Safe to call
 * any time; no-ops when the SDK isn't configured. Fail-closed: on error the
 * previous signal is left unchanged — we never grant access because of a fetch
 * failure.
 */
export async function refreshRcEntitlement(): Promise<void> {
  const ready = await purchasesReady();
  if (!ready) return;
  try {
    const info = await Purchases.getCustomerInfo();
    setAccess(deriveAccess(info));
  } catch (err) {
    logger.warn('RevenueCat: getCustomerInfo failed (non-fatal); access signal unchanged', err);
  }
}

/**
 * Reset the signal on sign-out so a subsequent session never inherits a stale
 * grant from the previous user (fail-closed).
 */
export function clearRcEntitlement(): void {
  if (access !== null) {
    access = null;
    notify();
  }
}

/**
 * Subscribe to access-signal changes. The first subscriber lazily installs the
 * AppState 'active' foreground listener and kicks off an initial fetch; the last
 * unsubscribe tears the listener down.
 */
export function subscribeRcEntitlement(listener: () => void): () => void {
  listeners.add(listener);

  if (!appStateSub) {
    appStateSub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') {
        void refreshRcEntitlement();
      }
    });
    // Initial reconcile when the first consumer mounts (app launch).
    void refreshRcEntitlement();
  }

  return () => {
    listeners.delete(listener);
    if (listeners.size === 0 && appStateSub) {
      appStateSub.remove();
      appStateSub = null;
    }
  };
}

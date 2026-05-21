/**
 * Subscription Service
 *
 * Thin client-side wrappers that initiate StoreKit/Google Play purchases via
 * RevenueCat. NEVER writes to Firestore subscription state — that is owned
 * by the RevenueCat webhook → Cloud Function → admin SDK path. After a
 * successful purchase here, the existing onSnapshot in `useSubscription`
 * reflects the webhook's write.
 *
 * Source of truth for entitlement is Firestore `users/{uid}.subscription`,
 * not RevenueCat's `customerInfo`. Do not change that here.
 */

import Purchases, { PURCHASES_ERROR_CODE } from 'react-native-purchases';
import type { PurchasesPackage, PurchasesOffering } from 'react-native-purchases';
import { purchasesReady } from './purchases.service';
import { logger } from '../utils/logger';

export interface SubscriptionStatusResult {
  status: 'trial' | 'premium' | 'expired';
  trialStartDate: string;
  trialEndDate: string;
  daysRemaining: number;
}

export interface PurchaseResult {
  success: boolean;
  /** True when the user dismissed Apple's purchase sheet. Not an error. */
  userCancelled?: boolean;
  /** Set on real failures (network, store rejection, etc.). */
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  /** True when at least one prior purchase was associated with this account. */
  restored: boolean;
  error?: string;
}

/**
 * Resolve the RevenueCat package for the requested plan from the current offering.
 * Looks up the package by `packageType` (MONTHLY / ANNUAL), the standard
 * RevenueCat convention. The current offering and its `monthly` / `annual`
 * packages must be configured in the RevenueCat dashboard.
 */
async function packageForPlan(plan: 'monthly' | 'annual'): Promise<PurchasesPackage | null> {
  const offerings = await Purchases.getOfferings();
  const current: PurchasesOffering | null = offerings.current;
  if (!current) {
    logger.warn('RevenueCat: no current offering configured in dashboard');
    return null;
  }
  const pkg = plan === 'monthly' ? current.monthly : current.annual;
  if (!pkg) {
    logger.warn(`RevenueCat: current offering has no ${plan} package`);
    return null;
  }
  return pkg;
}

/**
 * Fetch the current offering's monthly + annual packages so the paywall can
 * render localized price strings. Returns null packages if the offering is
 * missing or the SDK isn't configured — callers should handle gracefully
 * (e.g., fall back to env price strings only as a last resort).
 */
export async function getCurrentOfferingPackages(): Promise<{
  monthly: PurchasesPackage | null;
  annual: PurchasesPackage | null;
}> {
  const ready = await purchasesReady();
  if (!ready) return { monthly: null, annual: null };
  try {
    const offerings = await Purchases.getOfferings();
    const current = offerings.current;
    return {
      monthly: current?.monthly ?? null,
      annual: current?.annual ?? null,
    };
  } catch (err) {
    logger.warn('RevenueCat: getOfferings failed', err);
    return { monthly: null, annual: null };
  }
}

/**
 * Initiate a purchase for the requested plan. Returns a result object —
 * never throws. The caller renders the success/cancel/error states.
 *
 * On success, the RevenueCat webhook will fire server-side and the existing
 * Firestore onSnapshot will update the app's entitlement state. This function
 * does NOT write to Firestore.
 */
export async function initiatePurchase(plan: 'monthly' | 'annual'): Promise<PurchaseResult> {
  const ready = await purchasesReady();
  if (!ready) {
    return { success: false, error: 'Subscriptions are not available right now. Please try again later.' };
  }

  try {
    const pkg = await packageForPlan(plan);
    if (!pkg) {
      return {
        success: false,
        error: 'Subscription options are not available right now. Please try again later.',
      };
    }

    await Purchases.purchasePackage(pkg);
    logger.log('RevenueCat: purchasePackage success', { plan });
    return { success: true };
  } catch (err: any) {
    // userCancelled: user dismissed Apple's purchase sheet. Not an error.
    const code = err?.code;
    const isUserCancelled =
      err?.userCancelled === true ||
      code === PURCHASES_ERROR_CODE.PURCHASE_CANCELLED_ERROR;

    if (isUserCancelled) {
      logger.log('RevenueCat: purchase cancelled by user');
      return { success: false, userCancelled: true };
    }

    const message =
      typeof err?.message === 'string'
        ? err.message
        : 'Purchase could not be completed. Please try again.';
    logger.warn('RevenueCat: purchasePackage failed', { plan, code, message });
    return { success: false, error: message };
  }
}

/**
 * Restore prior purchases for this Apple/Google account. Returns whether
 * any active entitlement was found. The webhook will fire if a restore
 * surfaces a previously-purchased subscription that needs reconciliation;
 * the app then reads updated state from Firestore.
 */
export async function restorePurchase(): Promise<RestoreResult> {
  const ready = await purchasesReady();
  if (!ready) {
    return {
      success: false,
      restored: false,
      error: 'Restore is not available right now. Please try again later.',
    };
  }

  try {
    const customerInfo = await Purchases.restorePurchases();
    const hasActive = Object.keys(customerInfo.entitlements?.active ?? {}).length > 0;
    logger.log('RevenueCat: restorePurchases', { restored: hasActive });
    return { success: true, restored: hasActive };
  } catch (err: any) {
    const message =
      typeof err?.message === 'string'
        ? err.message
        : 'Could not restore purchase. Please try again.';
    logger.warn('RevenueCat: restorePurchases failed', err);
    return { success: false, restored: false, error: message };
  }
}

// -----------------------------------------------------------------------------
// Legacy stubs — preserved to avoid breaking the existing test file. Neither
// is called from production code; the app's entitlement comes from
// `useSubscription` → `getSubscriptionStatus` in `mobile/src/utils/subscription.ts`,
// which reads Firestore. Removing these is a separate cleanup task.
// -----------------------------------------------------------------------------

export async function getSubscriptionStatus(): Promise<SubscriptionStatusResult> {
  const now = new Date();
  const trialStart = new Date(now);
  trialStart.setDate(trialStart.getDate() - 3);
  const trialEnd = new Date(trialStart);
  trialEnd.setDate(trialEnd.getDate() + 7);
  const daysRemaining = Math.max(
    0,
    Math.ceil((trialEnd.getTime() - now.getTime()) / (1000 * 60 * 60 * 24))
  );

  return {
    status: 'trial',
    trialStartDate: trialStart.toISOString(),
    trialEndDate: trialEnd.toISOString(),
    daysRemaining,
  };
}

export async function verifySubscriptionStatus(): Promise<void> {
  // No-op. Kept for legacy callers.
}

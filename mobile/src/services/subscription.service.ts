/**
 * Subscription Service (Stub)
 * Placeholder service for subscription management.
 * Will be replaced with RevenueCat or StoreKit integration.
 */

export interface SubscriptionStatusResult {
  status: 'trial' | 'premium' | 'expired';
  trialStartDate: string;
  trialEndDate: string;
  daysRemaining: number;
}

export interface PurchaseResult {
  success: boolean;
  error?: string;
}

export interface RestoreResult {
  success: boolean;
  restored: boolean;
  error?: string;
}

/**
 * Get the current subscription status.
 * Returns mock data for beta.
 */
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

/**
 * Initiate a purchase for a given plan.
 * Stub: always returns failure during beta.
 */
export async function initiatePurchase(
  plan: 'monthly' | 'annual'
): Promise<PurchaseResult> {
  return {
    success: false,
    error: 'Purchase not available during beta',
  };
}

/**
 * Restore a previous purchase.
 * Stub: always returns failure during beta.
 */
export async function restorePurchase(): Promise<RestoreResult> {
  return {
    success: false,
    restored: false,
    error: 'Restore not available during beta',
  };
}

/**
 * Verify subscription status with the backend.
 * No-op stub for beta.
 */
export async function verifySubscriptionStatus(): Promise<void> {
  // No-op stub - will integrate with backend verification when ready
}

/**
 * Subscription Service Tests
 *
 * These tests exercise the wrappers in subscription.service when the RevenueCat
 * SDK is reported as not-ready (the gate resolves false). That mirrors the
 * test environment where react-native-purchases native module is unavailable.
 */

// react-native-purchases is imported at the top of subscription.service.ts.
// Provide a minimal mock so jest doesn't try to load the native module.
jest.mock('react-native-purchases', () => ({
  __esModule: true,
  default: {
    configure: jest.fn(),
    logIn: jest.fn(),
    logOut: jest.fn(),
    getOfferings: jest.fn(),
    purchasePackage: jest.fn(),
    restorePurchases: jest.fn(),
  },
  PURCHASES_ERROR_CODE: { PURCHASE_CANCELLED_ERROR: 1 },
}));

// Force the SDK-gate to resolve false in tests so we exercise the
// "not configured" branches deterministically. Direct purchase/restore paths
// against the native module are covered by integration testing on device.
jest.mock('./purchases.service', () => ({
  purchasesReady: () => Promise.resolve(false),
  configurePurchases: jest.fn(),
  identifyPurchaser: jest.fn(),
  clearPurchaser: jest.fn(),
}));

import {
  getSubscriptionStatus,
  initiatePurchase,
  restorePurchase,
  verifySubscriptionStatus,
} from './subscription.service';

describe('Subscription Service', () => {
  describe('getSubscriptionStatus (legacy stub)', () => {
    it('returns trial status', async () => {
      const result = await getSubscriptionStatus();
      expect(result.status).toBe('trial');
    });

    it('returns a valid trial start date', async () => {
      const result = await getSubscriptionStatus();
      const startDate = new Date(result.trialStartDate);
      expect(startDate).toBeInstanceOf(Date);
      expect(isNaN(startDate.getTime())).toBe(false);
    });

    it('returns a trial end date 7 days after start', async () => {
      const result = await getSubscriptionStatus();
      const start = new Date(result.trialStartDate);
      const end = new Date(result.trialEndDate);
      const diffDays = Math.round(
        (end.getTime() - start.getTime()) / (1000 * 60 * 60 * 24)
      );
      expect(diffDays).toBe(7);
    });

    it('returns all required fields', async () => {
      const result = await getSubscriptionStatus();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('trialStartDate');
      expect(result).toHaveProperty('trialEndDate');
      expect(result).toHaveProperty('daysRemaining');
    });
  });

  describe('initiatePurchase (SDK not ready)', () => {
    it('returns failure with an error message for monthly', async () => {
      const result = await initiatePurchase('monthly');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns failure with an error message for annual', async () => {
      const result = await initiatePurchase('annual');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('does not flag userCancelled when SDK is just not ready', async () => {
      const result = await initiatePurchase('monthly');
      expect(result.userCancelled).toBeFalsy();
    });
  });

  describe('restorePurchase (SDK not ready)', () => {
    it('returns failure with an error message', async () => {
      const result = await restorePurchase();
      expect(result.success).toBe(false);
      expect(result.restored).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('verifySubscriptionStatus (legacy stub)', () => {
    it('resolves without error', async () => {
      await expect(verifySubscriptionStatus()).resolves.toBeUndefined();
    });
  });
});

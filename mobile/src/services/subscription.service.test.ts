/**
 * Subscription Service Tests
 */

import {
  getSubscriptionStatus,
  initiatePurchase,
  restorePurchase,
  verifySubscriptionStatus,
  SubscriptionStatusResult,
} from './subscription.service';

describe('Subscription Service', () => {
  describe('getSubscriptionStatus', () => {
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

    it('calculates daysRemaining correctly', async () => {
      const result = await getSubscriptionStatus();
      // Mock starts trial 3 days ago, so ~4 days remaining
      expect(result.daysRemaining).toBeGreaterThanOrEqual(0);
      expect(result.daysRemaining).toBeLessThanOrEqual(7);
    });

    it('daysRemaining is never negative', async () => {
      const result = await getSubscriptionStatus();
      expect(result.daysRemaining).toBeGreaterThanOrEqual(0);
    });

    it('returns all required fields', async () => {
      const result = await getSubscriptionStatus();
      expect(result).toHaveProperty('status');
      expect(result).toHaveProperty('trialStartDate');
      expect(result).toHaveProperty('trialEndDate');
      expect(result).toHaveProperty('daysRemaining');
    });
  });

  describe('initiatePurchase', () => {
    it('returns failure for monthly plan during beta', async () => {
      const result = await initiatePurchase('monthly');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });

    it('returns failure for annual plan during beta', async () => {
      const result = await initiatePurchase('annual');
      expect(result.success).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('restorePurchase', () => {
    it('returns failure during beta', async () => {
      const result = await restorePurchase();
      expect(result.success).toBe(false);
      expect(result.restored).toBe(false);
      expect(result.error).toBeDefined();
    });
  });

  describe('verifySubscriptionStatus', () => {
    it('resolves without error (no-op stub)', async () => {
      await expect(verifySubscriptionStatus()).resolves.toBeUndefined();
    });
  });
});

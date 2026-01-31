/**
 * Subscription Utilities
 * Shared logic for calculating subscription status from user documents
 */

/**
 * @typedef {'trial' | 'premium' | 'coaching' | 'expired'} SubscriptionType
 */

/**
 * @typedef {Object} SubscriptionStatus
 * @property {SubscriptionType} type
 * @property {boolean} isActive
 * @property {boolean} canAccessApp
 * @property {number} [trialDaysRemaining]
 * @property {boolean} [isTrialExpiringSoon]
 * @property {'monthly' | 'annual'} [billingPeriod]
 * @property {Date} [premiumExpiresAt]
 * @property {boolean} [isInGracePeriod]
 * @property {number} [graceDaysRemaining]
 * @property {Date} [expiredAt]
 * @property {number} [dataRetentionDaysRemaining]
 */

/**
 * Convert Firestore Timestamp to milliseconds
 * @param {Object} timestamp
 * @returns {number}
 */
function toMillis(timestamp) {
  if (!timestamp) return 0;
  if (typeof timestamp.toMillis === 'function') {
    return timestamp.toMillis();
  }
  // Handle case where timestamp might be a plain object from Firestore
  if (timestamp.seconds !== undefined) {
    return timestamp.seconds * 1000 + (timestamp.nanoseconds || 0) / 1000000;
  }
  return 0;
}

/**
 * Calculate days remaining until a timestamp
 * @param {Object} timestamp
 * @returns {number}
 */
function daysUntil(timestamp) {
  const targetMs = toMillis(timestamp);
  if (!targetMs) return 0;
  const now = Date.now();
  const diffMs = targetMs - now;
  return Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
}

/**
 * Check if a timestamp is in the past
 * @param {Object} timestamp
 * @returns {boolean}
 */
function isPast(timestamp) {
  const targetMs = toMillis(timestamp);
  if (!targetMs) return true;
  return Date.now() >= targetMs;
}

/**
 * Get subscription status from user document data
 * Works for both web and mobile since both read from the same Firestore schema
 * @param {Object} userDoc - User document data from Firestore
 * @returns {SubscriptionStatus}
 */
export function getSubscriptionStatus(userDoc) {
  const sub = userDoc?.subscription;

  // No subscription data = treat as expired (legacy user or data issue)
  if (!sub || !sub.type) {
    return {
      type: 'expired',
      isActive: false,
      canAccessApp: false,
    };
  }

  switch (sub.type) {
    case 'trial': {
      const isExpired = isPast(sub.trialExpiresAt);

      if (isExpired) {
        // Trial has expired but type hasn't been updated yet
        return {
          type: 'expired',
          isActive: false,
          canAccessApp: false,
        };
      }

      const daysRemaining = daysUntil(sub.trialExpiresAt);

      return {
        type: 'trial',
        isActive: true,
        canAccessApp: true,
        trialDaysRemaining: daysRemaining,
        isTrialExpiringSoon: daysRemaining <= 2,
      };
    }

    case 'premium': {
      // Check grace period first
      if (sub.isInGracePeriod && sub.gracePeriodExpiresAt) {
        const graceExpired = isPast(sub.gracePeriodExpiresAt);

        if (graceExpired) {
          return {
            type: 'expired',
            isActive: false,
            canAccessApp: false,
          };
        }

        const graceDays = daysUntil(sub.gracePeriodExpiresAt);

        return {
          type: 'premium',
          isActive: true,
          canAccessApp: true,
          billingPeriod: sub.billingPeriod,
          isInGracePeriod: true,
          graceDaysRemaining: graceDays,
        };
      }

      // Regular premium check
      const premiumExpired = isPast(sub.premiumExpiresAt);

      if (premiumExpired) {
        return {
          type: 'expired',
          isActive: false,
          canAccessApp: false,
        };
      }

      return {
        type: 'premium',
        isActive: true,
        canAccessApp: true,
        billingPeriod: sub.billingPeriod,
        premiumExpiresAt: sub.premiumExpiresAt ? new Date(toMillis(sub.premiumExpiresAt)) : undefined,
      };
    }

    case 'coaching': {
      // Coaching is lifetime access - always active
      return {
        type: 'coaching',
        isActive: true,
        canAccessApp: true,
      };
    }

    case 'expired':
    default: {
      const retentionDays = sub.dataRetentionDeadline
        ? daysUntil(sub.dataRetentionDeadline)
        : undefined;

      return {
        type: 'expired',
        isActive: false,
        canAccessApp: false,
        expiredAt: sub.expiredAt ? new Date(toMillis(sub.expiredAt)) : undefined,
        dataRetentionDaysRemaining: retentionDays && retentionDays > 0 ? retentionDays : undefined,
      };
    }
  }
}

/**
 * Format subscription type for display
 * @param {SubscriptionType} type
 * @returns {string}
 */
export function formatSubscriptionType(type) {
  switch (type) {
    case 'trial':
      return 'Free Trial';
    case 'premium':
      return 'Premium';
    case 'coaching':
      return 'Coaching (Lifetime)';
    case 'expired':
      return 'Expired';
    default:
      return 'Unknown';
  }
}

/**
 * Get a user-friendly description of the subscription status
 * @param {SubscriptionStatus} status
 * @returns {string}
 */
export function getSubscriptionDescription(status) {
  switch (status.type) {
    case 'trial':
      if (status.trialDaysRemaining === 1) {
        return '1 day remaining in trial';
      }
      return `${status.trialDaysRemaining} days remaining in trial`;

    case 'premium':
      if (status.isInGracePeriod) {
        return `Payment issue - ${status.graceDaysRemaining} days to resolve`;
      }
      return status.billingPeriod === 'annual' ? 'Annual subscription' : 'Monthly subscription';

    case 'coaching':
      return 'Lifetime access included with coaching';

    case 'expired':
      if (status.dataRetentionDaysRemaining) {
        return `Data kept for ${status.dataRetentionDaysRemaining} more days`;
      }
      return 'Subscribe to continue your wellness journey';

    default:
      return '';
  }
}

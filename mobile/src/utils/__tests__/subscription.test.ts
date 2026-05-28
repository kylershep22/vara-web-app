import { getSubscriptionStatus, type SubscriptionStatus } from '../subscription';
import { combineStatus } from '../../hooks/useSubscription';

// combineStatus lives in hooks/useSubscription.ts (NOT utils/subscription.ts).
// Importing that module pulls in its native-dep chain (config/firebase,
// AuthContext → react-native-purchases, rcEntitlement) at load time. combineStatus
// itself is pure, so these mocks only prevent import-time crashes — they are never
// exercised by the tests below.
jest.mock('../../config/firebase', () => ({ db: null, firebaseError: null }));
jest.mock('../../context/AuthContext', () => ({ useAuth: () => ({ user: null }) }));
jest.mock('../../services/rcEntitlement', () => ({
  getRcAccess: () => null,
  subscribeRcEntitlement: () => () => {},
  refreshRcEntitlement: async () => {},
}));
jest.mock('firebase/firestore', () => ({ doc: jest.fn(), onSnapshot: jest.fn() }));

// Firestore Timestamp-like stubs (getSubscriptionStatus uses .toMillis()).
const future = { toMillis: () => Date.now() + 86_400_000 } as any;
const past = { toMillis: () => Date.now() - 86_400_000 } as any;

describe('getSubscriptionStatus — access derivation (app-side trial removed, Model A)', () => {
  test("no subscription field → DENIED, classified type:'none' (never-subscribed, not 'expired')", () => {
    const s = getSubscriptionStatus({});
    expect(s.canAccessApp).toBe(false);
    expect(s.type).toBe('none');
  });

  test("subscription without a type → DENIED, classified type:'none'", () => {
    const s = getSubscriptionStatus({ subscription: {} });
    expect(s.canAccessApp).toBe(false);
    expect(s.type).toBe('none');
  });

  test("type:'trial' (legacy app-side trial) → DENIED even if not expired", () => {
    const s = getSubscriptionStatus({ subscription: { type: 'trial', trialExpiresAt: future } });
    expect(s.canAccessApp).toBe(false);
  });

  test("type:'premium' not expired → GRANTED (StoreKit trial or paid, via webhook)", () => {
    const s = getSubscriptionStatus({ subscription: { type: 'premium', premiumExpiresAt: future } });
    expect(s.canAccessApp).toBe(true);
    expect(s.type).toBe('premium');
  });

  test("type:'premium' expired → DENIED", () => {
    const s = getSubscriptionStatus({ subscription: { type: 'premium', premiumExpiresAt: past } });
    expect(s.canAccessApp).toBe(false);
  });

  test("type:'event' within eventAccessExpiresAt → GRANTED (codifies the inventory finding)", () => {
    const s = getSubscriptionStatus({ subscription: { type: 'event', eventAccessExpiresAt: future } });
    expect(s.canAccessApp).toBe(true);
    expect(s.type).toBe('event');
  });

  test("type:'event' expired → DENIED", () => {
    const s = getSubscriptionStatus({ subscription: { type: 'event', eventAccessExpiresAt: past } });
    expect(s.canAccessApp).toBe(false);
  });

  test("type:'coaching' → GRANTED", () => {
    expect(getSubscriptionStatus({ subscription: { type: 'coaching' } }).canAccessApp).toBe(true);
  });

  test("type:'expired' (webhook-produced expiration) → DENIED and stays 'expired' — distinct from 'none'", () => {
    const s = getSubscriptionStatus({ subscription: { type: 'expired' } });
    expect(s.canAccessApp).toBe(false);
    expect(s.type).toBe('expired');
  });

  test("never-subscribed ('none') and expired ('expired') are distinguishable states", () => {
    expect(getSubscriptionStatus({}).type).toBe('none');
    expect(getSubscriptionStatus({ subscription: { type: 'expired' } }).type).toBe('expired');
  });
});

describe('combineStatus — OR-merge safety', () => {
  const fsGrant: SubscriptionStatus = { type: 'premium', isActive: true, canAccessApp: true };
  const fsDeny: SubscriptionStatus = { type: 'none', isActive: false, canAccessApp: false };

  test('Firestore grant is respected when RC is silent', () => {
    const result = combineStatus(fsGrant, undefined as any);
    expect(result).toBe(fsGrant);
    expect(result?.canAccessApp).toBe(true);
  });

  test('RC entitlement overrides Firestore deny — prevents charge-then-lockout', () => {
    const result = combineStatus(fsDeny, true);
    expect(result?.canAccessApp).toBe(true);
    expect(result?.type).toBe('premium');
    expect(result?.isActive).toBe(true);
  });

  test('RC entitlement with no Firestore record grants access', () => {
    const result = combineStatus(null, true);
    expect(result).toEqual({ type: 'premium', isActive: true, canAccessApp: true });
  });

  test('Both sources denying produces no access', () => {
    const result = combineStatus(fsDeny, false);
    expect(result?.canAccessApp).toBe(false);
    expect(result?.type).toBe('none'); // no type mutation on deny
  });

  test('RC pending or unknown is treated as deny — Firestore still controls', () => {
    const result = combineStatus(fsDeny, undefined as any);
    expect(result?.canAccessApp).toBe(false);
    expect(result).toBe(fsDeny);
  });
});

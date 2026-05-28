import { getSubscriptionStatus } from '../subscription';

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

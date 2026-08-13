// The analytics event schema — the shape half of the content firewall.
//
// The service test covers what the writer does with a payload. This covers the
// schema itself: that the declared event names are the ones we meant, and that
// `protocolIdFor` cannot drift away from the ids actually stored on a weekly
// cycle. That second one is load-bearing in a quiet way: the analytics
// protocolId is DERIVED from the outcome/capacity pair rather than read off the
// protocol object, because `ProtocolVariant.id` is typed `string` and a `string`
// slot in an event payload is exactly the hole the firewall exists to close.
// Deriving it buys the closed union, and this test is what keeps the derivation
// honest against the matrix.

import {
  ADJUSTMENT_IDS,
  ANALYTICS_EVENT_NAMES,
  WEEKLY_ENTRY_ROUTES,
  protocolIdFor,
  toFailureReason,
  type AdjustmentKey,
  type WeeklyEntryRoute,
} from '../analyticsEvents';
import { CAPACITY_TIERS, OUTCOME_KEYS, PROTOCOL_MATRIX } from '../../protocolEngine';
import { ADJUSTMENT_KEYS, type AdjustmentKey as CopyAdjustmentKey } from '../../screens/weekly/copy';
import type { WeeklyEntryTarget } from '../../screens/weekly/weeklyEntry';

/**
 * True only when two types are mutually assignable.
 *
 * The redeclared unions in the schema have no runtime value to compare against
 * on the other side, so the pin has to be a compile-time one. Assigning `true`
 * to this fails tsc the moment the two sides diverge in either direction.
 */
type MutuallyAssignable<A, B> = [A] extends [B] ? ([B] extends [A] ? true : false) : false;

describe('analytics event schema', () => {
  describe('the event name union', () => {
    test('declares exactly the events that have wired callers', () => {
      // The invariant: no declared name without a caller. Every name below is
      // fired by a screen (or by AuthContext), and each has a wiring test that
      // proves it. Adding a name here without wiring it would claim coverage
      // that does not exist.
      expect([...ANALYTICS_EVENT_NAMES].sort()).toEqual([
        'floor_set',
        'login',
        'sign_up',
        'weekly_close',
        'weekly_close_entry',
        'weekly_close_failed',
        'weekly_entry',
        'weekly_open',
      ]);
    });
  });

  describe('the redeclared unions', () => {
    // Both are spelled twice on purpose: the originals live under screens/, and
    // types/ must not import screens/. These are the tripwires for that trade.

    test('the adjustment ids match the ones the close actually offers', () => {
      expect([...ADJUSTMENT_IDS]).toEqual([...ADJUSTMENT_KEYS]);
    });

    test('the adjustment key type matches the one the close screen uses', () => {
      const pinned: MutuallyAssignable<AdjustmentKey, CopyAdjustmentKey> = true;
      expect(pinned).toBe(true);
    });

    test('the entry routes match the guard targets', () => {
      const pinned: MutuallyAssignable<WeeklyEntryRoute, WeeklyEntryTarget> = true;
      expect(pinned).toBe(true);
      expect([...WEEKLY_ENTRY_ROUTES].sort()).toEqual(['floor', 'open', 'today']);
    });
  });

  describe('toFailureReason', () => {
    // The mapper LOOKS UP rather than passes through, which is the whole point:
    // scrubParams keeps any string under 64 characters, so a raw error code or a
    // short error message would reach the log if this ever returned its input.

    test('maps the codes worth distinguishing', () => {
      expect(toFailureReason({ code: 'permission-denied' })).toBe('permission-denied');
      expect(toFailureReason({ code: 'unavailable' })).toBe('unavailable');
    });

    test('collapses every other Firestore code to unknown', () => {
      expect(toFailureReason({ code: 'resource-exhausted' })).toBe('unknown');
      expect(toFailureReason({ code: 'failed-precondition' })).toBe('unknown');
    });

    test('collapses non-errors and shapes it does not recognise', () => {
      expect(toFailureReason(undefined)).toBe('unknown');
      expect(toFailureReason(null)).toBe('unknown');
      expect(toFailureReason('permission-denied')).toBe('unknown');
      expect(toFailureReason(new Error('offline'))).toBe('unknown');
      expect(toFailureReason({})).toBe('unknown');
      expect(toFailureReason({ code: 42 })).toBe('unknown');
    });

    test('never returns a string that came from the error', () => {
      // The failure mode this guards: a message is content, and a short one
      // clears the writer's length backstop untouched.
      const leaky = { code: 'db down', message: 'user alice could not save' };

      expect(toFailureReason(leaky)).toBe('unknown');
      expect(['permission-denied', 'unavailable', 'unknown']).toContain(
        toFailureReason(leaky)
      );
    });

    test('a code that names an Object prototype member is still unknown', () => {
      // The bug an object lookup would have: `KNOWN[code]` with code
      // 'constructor' indexes through to Object.prototype and returns a
      // function, which then reaches the writer. The switch cannot do that.
      expect(toFailureReason({ code: 'constructor' })).toBe('unknown');
      expect(toFailureReason({ code: 'toString' })).toBe('unknown');
      expect(toFailureReason({ code: '__proto__' })).toBe('unknown');
    });
  });

  describe('protocolIdFor', () => {
    test('matches the id stored on every cell of the protocol matrix', () => {
      // If the matrix ever stops building ids as `${outcome}-${capacity}`, the
      // analytics id would silently disagree with the persisted one and every
      // join between them would break. This is the tripwire for that.
      for (const outcome of OUTCOME_KEYS) {
        for (const capacity of CAPACITY_TIERS) {
          expect(protocolIdFor(outcome, capacity)).toBe(
            PROTOCOL_MATRIX[outcome][capacity][0].id
          );
        }
      }
    });

    test('covers all twelve cells with distinct ids', () => {
      const ids = OUTCOME_KEYS.flatMap((outcome) =>
        CAPACITY_TIERS.map((capacity) => protocolIdFor(outcome, capacity))
      );

      expect(ids).toHaveLength(12);
      expect(new Set(ids).size).toBe(12);
    });
  });
});

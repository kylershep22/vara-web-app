// The analytics event schema — the shape half of the content firewall.
//
// The service test covers what the writer does with a payload. This covers the
// schema itself: that the declared event names are the ones we meant, and that
// `protocolIdFor` cannot drift away from the ids actually stored on a weekly
// cycle. That second one is load-bearing in a quiet way: the analytics
// protocolId is DERIVED from the outcome/capacity pair rather than read off the
// protocol object, because `WeeklyProtocol.id` is typed `string` and a `string`
// slot in an event payload is exactly the hole the firewall exists to close.
// Deriving it buys the closed union, and this test is what keeps the derivation
// honest against the matrix.

import { ANALYTICS_EVENT_NAMES, protocolIdFor } from '../analyticsEvents';
import { CAPACITY_TIERS, OUTCOME_KEYS, PROTOCOL_MATRIX } from '../../weeklyEngine';

describe('analytics event schema', () => {
  describe('the event name union', () => {
    test('declares exactly the events this slice supports', () => {
      // Deliberately small. The full core-loop map (re-set, close, continuity,
      // funnel, navigation) is the next slice; adding a name here without a
      // wired caller would claim coverage that does not exist.
      expect([...ANALYTICS_EVENT_NAMES].sort()).toEqual([
        'login',
        'sign_up',
        'weekly_open',
      ]);
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
            PROTOCOL_MATRIX[outcome][capacity].id
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

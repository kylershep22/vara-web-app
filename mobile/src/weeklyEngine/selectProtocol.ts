/**
 * Protocol selection (spec 6.2).
 *
 * A pure lookup into the 4 x 3 matrix. The weekly open supplies outcome and
 * capacity; this returns the one protocol that lives on Today all week.
 * Total by construction: the matrix has an entry for every outcome x capacity.
 */
import { PROTOCOL_MATRIX } from './protocolMatrix';
import type { CapacityTier, OutcomeKey, WeeklyProtocol } from './types';

export function selectProtocol(outcome: OutcomeKey, capacity: CapacityTier): WeeklyProtocol {
  return PROTOCOL_MATRIX[outcome][capacity];
}

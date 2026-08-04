/**
 * Stepping one rung along the capacity ladder (spec Section 7, the dynamic
 * in-week re-set).
 *
 * THE ORDER LIVES IN ONE PLACE. Both functions read CAPACITY_TIERS and nothing
 * here restates it, so reordering that array re-derives both directions at once.
 * A second hard-coded order is the failure mode these tests exist to catch.
 *
 * CAPACITY_TIERS is capacity-DESCENDING (`normal`, `limited`, `slammed`), so
 * stepping DOWN in capacity walks the array FORWARDS. That inversion is the easy
 * thing to get backwards; it is why neither function takes a numeric direction.
 *
 * Both ends return null rather than clamping to themselves. A caller that
 * clamped could not tell "there is a rung below" from "you are already at the
 * bottom", and the Today control needs exactly that distinction to render the
 * edge state instead of a button that does nothing.
 *
 * Stepping a tier has no bearing on continuity, which is measured against the
 * floor commitment and never against a capacity tier. See computeContinuity().
 */
import { CAPACITY_TIERS } from './protocolMatrix';
import type { CapacityTier } from './types';

/**
 * Walk one rung along the ladder. Returns null when the step falls off an end,
 * INCLUDING when `tier` is not on the ladder at all: indexOf gives -1 for an
 * unrecognized tier, and -1 + a backwards step would otherwise resolve to a
 * real index and hand back a confidently wrong neighbour.
 */
function step(tier: CapacityTier, offset: 1 | -1): CapacityTier | null {
  const index = CAPACITY_TIERS.indexOf(tier);
  if (index === -1) return null;
  return CAPACITY_TIERS[index + offset] ?? null;
}

/** The next tier DOWN in capacity, or null when already at the lowest. */
export function nextTierDown(tier: CapacityTier): CapacityTier | null {
  return step(tier, 1);
}

/** The next tier UP in capacity, or null when already at the highest. */
export function nextTierUp(tier: CapacityTier): CapacityTier | null {
  return step(tier, -1);
}

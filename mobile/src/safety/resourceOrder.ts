/**
 * Which resources the support screen surfaces, and in what order
 * (journey slice 3c-i).
 *
 * PURE, so the ordering rule can be read and tested without a screen.
 *
 * THE RULE:
 *   row one   988, always. It is the broadest crisis line and it is never
 *             pushed under an expander by any category.
 *   row two   the matched category's resource, when exactly one matched.
 *             Otherwise Crisis Text Line, which is the general second door.
 *   the rest  under a collapsed "More support" expander.
 *
 * NO RESOURCE IS EVER UNREACHABLE. The expander holds everything not surfaced,
 * and `surfaced` plus `collapsed` is always the full list. A test asserts that
 * for every category and for the no-category case, because "we ranked them" is
 * one careless filter away from "we hid four of them".
 *
 * ONE CATEGORY AT A TIME IS ALL THAT CAN ARRIVE. `precheckFreeText` returns on
 * its first match walking a severity-ordered list, so it reports the most
 * serious category and never a set. The "multiple matched" branch of the
 * written rule is therefore not reachable through the pre-check today; it is
 * implemented anyway as the undefined case, so that a later pass which emits
 * several categories gets the specified behavior rather than a surprise.
 */
import type { PrecheckCategory } from './textPrecheck';
import { SAFETY_RESOURCES, type SafetyResource, type SafetyResourceId } from './safetyCopy';

/** Category to the resource that answers it most directly. */
const RESOURCE_FOR_CATEGORY: Record<PrecheckCategory, SafetyResourceId> = {
  self_harm: 'crisis_text_line',
  harm_from_others: 'domestic_violence',
  substance: 'samhsa',
  eating: 'eating_disorders',
  // Self-directed negative statements have no dedicated line of their own, so
  // they fall to the general second door rather than being routed at a service
  // that does not match what was said.
  self_directed_negative: 'crisis_text_line',
};

export interface OrderedResources {
  /** Always rendered, in this order. Length 2. */
  surfaced: SafetyResource[];
  /** Behind the "More support" expander. Never empty while the list is five. */
  collapsed: SafetyResource[];
}

function byId(id: SafetyResourceId): SafetyResource {
  const found = SAFETY_RESOURCES.find((r) => r.id === id);
  // The ids are a closed union over a constant list, so this cannot happen
  // without a compile error first. Falling back to 988 rather than throwing is
  // the safe direction on this screen of all screens.
  return found ?? SAFETY_RESOURCES[0];
}

export function orderResources(category?: PrecheckCategory): OrderedResources {
  const first = byId('lifeline_988');
  const secondId = category ? RESOURCE_FOR_CATEGORY[category] : 'crisis_text_line';
  const second = byId(secondId);

  // Guard against 988 being selected twice if a future category ever maps to
  // it: the second row falls back to Crisis Text Line rather than duplicating.
  const resolvedSecond = second.id === first.id ? byId('crisis_text_line') : second;

  const surfaced = [first, resolvedSecond];
  const surfacedIds = new Set(surfaced.map((r) => r.id));
  const collapsed = SAFETY_RESOURCES.filter((r) => !surfacedIds.has(r.id));

  return { surfaced, collapsed };
}

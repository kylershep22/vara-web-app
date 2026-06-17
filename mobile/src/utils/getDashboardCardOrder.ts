/**
 * getDashboardCardOrder
 * Maps brain state to an ordered list of dashboard card IDs
 * using the nudge priority map from getNudgeSuggestion.
 */

import { PRIORITY_MAP, type Feature } from './getNudgeSuggestion';
import type { BrainState } from '../types/models';

/**
 * Dashboard card identifiers.
 * These match the keys used in DashboardScreen to render cards.
 *
 * `notifOptIn` and `eventCode` are system-level prompts (not state-driven).
 * They are placed immediately after `protocol` so that, after the
 * DashboardAnchor and the primary action card, any light optional surfaces
 * appear before the rest of the state-driven stack.
 */
export type DashboardCardId =
  | 'protocol'
  | 'notifOptIn'
  | 'eventCode'
  | 'nudge'
  | 'reflection'
  | 'routines'
  | 'weekInsight';

/**
 * Maps nudge features to the dashboard card they correspond to.
 * Features without a dedicated card (community, discover, masterclass)
 * map to 'nudge' since they surface as nudge suggestions.
 */
const FEATURE_TO_CARD: Record<Feature, DashboardCardId> = {
  breathwork: 'protocol',
  focus: 'routines',
  journal: 'reflection',
  brainHealth: 'weekInsight',
  community: 'nudge',
  discover: 'nudge',
  masterclass: 'nudge',
};

/**
 * Default card order when no brain state is available.
 */
const DEFAULT_ORDER: DashboardCardId[] = [
  'protocol',
  'notifOptIn',
  'eventCode',
  'nudge',
  'reflection',
  'routines',
  'weekInsight',
];

/**
 * Returns an ordered array of dashboard card IDs based on brain state.
 * Uses the nudge priority map to determine state-driven card ordering,
 * then inserts `notifOptIn` and `eventCode` immediately after `protocol`
 * so system prompts sit between the primary action and the rest of the
 * dashboard. Cards not covered by the priority map are appended at the
 * end.
 */
export function getDashboardCardOrder(brainState: BrainState | null): DashboardCardId[] {
  if (!brainState) return DEFAULT_ORDER;

  const priorities = PRIORITY_MAP[brainState];
  if (!priorities) return DEFAULT_ORDER;

  const ordered: DashboardCardId[] = [];
  const seen = new Set<DashboardCardId>();

  for (const feature of priorities) {
    const cardId = FEATURE_TO_CARD[feature];
    if (cardId && !seen.has(cardId)) {
      ordered.push(cardId);
      seen.add(cardId);
    }
  }

  // Insert notifOptIn and eventCode immediately after protocol. Falls back
  // to the start of the array if protocol isn't among the priority-driven
  // cards for this state.
  const protocolIndex = ordered.indexOf('protocol');
  const insertAt = protocolIndex === -1 ? 0 : protocolIndex + 1;
  ordered.splice(insertAt, 0, 'notifOptIn', 'eventCode');
  seen.add('notifOptIn');
  seen.add('eventCode');

  // Append any cards not covered by the priority map
  for (const cardId of DEFAULT_ORDER) {
    if (!seen.has(cardId)) {
      ordered.push(cardId);
      seen.add(cardId);
    }
  }

  return ordered;
}

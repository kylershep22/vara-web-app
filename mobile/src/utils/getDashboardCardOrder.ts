/**
 * getDashboardCardOrder
 * Maps brain state to an ordered list of dashboard card IDs
 * using the nudge priority map from getNudgeSuggestion.
 */

import { PRIORITY_MAP, type BrainState, type Feature } from './getNudgeSuggestion';

/**
 * Dashboard card identifiers.
 * These match the keys used in DashboardScreen to render cards.
 */
export type DashboardCardId =
  | 'protocol'
  | 'nudge'
  | 'reflection'
  | 'habits'
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
  'nudge',
  'reflection',
  'habits',
  'routines',
  'weekInsight',
];

/**
 * Returns an ordered array of dashboard card IDs based on brain state.
 * Uses the nudge priority map to determine card ordering.
 * Cards not covered by the priority map are appended at the end.
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

  // Append any cards not covered by the priority map
  for (const cardId of DEFAULT_ORDER) {
    if (!seen.has(cardId)) {
      ordered.push(cardId);
      seen.add(cardId);
    }
  }

  return ordered;
}

// Suggested action — a STANDING short capacity practice for the post-check-in
// dashboard, chosen by time of day and INDEPENDENT of the just-completed plan
// (so it never re-surfaces what the user just did). Curated defaults resolved
// against the real catalog; the engine's practicesForDirection is a fallback
// only.
//
// Completion-agnostic by design: the same suggestion serves the
// finished-practice case AND the checked-in-but-abandoned case
// (protocolCompleted:false), so the card copy must never imply the practice ran.
//
// "Create capacity" framing only — no meter, no score.

import type { Protocol } from '../../types/models';
import {
  getProtocolById,
  getAllProtocols,
} from '../../constants/brainStateProtocols';
import { isEvening, practicesForDirection } from '../../engine';

export type TimeOfDay = 'morning' | 'midday' | 'evening';

export function timeOfDay(hour: number = new Date().getHours()): TimeOfDay {
  if (hour >= 5 && hour < 12) return 'morning';
  // "midday" runs until the engine's evening boundary so the two surfaces agree.
  if (!isEvening({ hour })) return 'midday';
  return 'evening';
}

// Curated short (2-5 min) capacity practice per time of day: morning lifts,
// midday steadies, evening winds down. Ids are verified against the catalog.
const CURATED_BY_TIME: Record<TimeOfDay, string> = {
  morning: 'brief-movement-5',
  midday: 'coherence-breathing-5',
  evening: 'extended-exhale-2',
};

// Direction used only by the catalog fallback (if a curated id ever fails to
// resolve): morning energizes, midday/evening settle.
const FALLBACK_DIRECTION: Record<TimeOfDay, 'settle' | 'energize'> = {
  morning: 'energize',
  midday: 'settle',
  evening: 'settle',
};

export interface SuggestedAction {
  protocol: Protocol;
}

/**
 * The standing capacity practice to suggest now, or null if the catalog yields
 * nothing (not expected — curated ids are verified). Time-of-day driven and
 * independent of any check-in plan.
 */
export function suggestedAction(
  hour: number = new Date().getHours()
): SuggestedAction | null {
  const tod = timeOfDay(hour);

  const curated = getProtocolById(CURATED_BY_TIME[tod]);
  if (curated) return { protocol: curated };

  // Fallback only — shortest in-budget practice in the right direction.
  const candidates = practicesForDirection(
    'energy',
    FALLBACK_DIRECTION[tod],
    getAllProtocols(),
    'short',
    isEvening({ hour }),
    true
  );
  return candidates.length > 0 ? { protocol: candidates[0] } : null;
}

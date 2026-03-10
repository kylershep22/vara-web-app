/**
 * Vara Values
 * Core values users select during onboarding (Step 5).
 * Each value aligns to a brain pillar for personalization.
 */

import { BrainPillar } from '../types';

export interface VaraValue {
  id: ValueId;
  label: string;
  description: string;
  pillarAlignment: BrainPillar;
  icon: string; // MaterialCommunityIcons name
}

export const VARA_VALUES: readonly VaraValue[] = [
  {
    id: 'clarity',
    label: 'Clarity',
    description: 'A clear, uncluttered mind',
    pillarAlignment: 'focus',
    icon: 'white-balance-sunny',
  },
  {
    id: 'presence',
    label: 'Presence',
    description: 'Fully here, right now',
    pillarAlignment: 'focus',
    icon: 'account-circle-outline',
  },
  {
    id: 'resilience',
    label: 'Resilience',
    description: 'Bouncing back, not breaking',
    pillarAlignment: 'resilience',
    icon: 'shield-outline',
  },
  {
    id: 'energy',
    label: 'Energy',
    description: 'Sustained vitality and drive',
    pillarAlignment: 'energy',
    icon: 'lightning-bolt-outline',
  },
  {
    id: 'connection',
    label: 'Connection',
    description: 'Meaningful bonds with others',
    pillarAlignment: 'connection',
    icon: 'heart-outline',
  },
  {
    id: 'growth',
    label: 'Growth',
    description: 'Expanding what feels possible',
    pillarAlignment: 'growth',
    icon: 'sprout',
  },
  {
    id: 'rest',
    label: 'Rest',
    description: 'Deep recovery and stillness',
    pillarAlignment: 'resilience',
    icon: 'moon-waning-crescent',
  },
  {
    id: 'focus',
    label: 'Focus',
    description: 'Sustained, undistracted attention',
    pillarAlignment: 'focus',
    icon: 'circle-double',
  },
] as const;

export type ValueId =
  | 'clarity'
  | 'presence'
  | 'resilience'
  | 'energy'
  | 'connection'
  | 'growth'
  | 'rest'
  | 'focus';

export const MIN_VALUES = 2;
export const MAX_VALUES = 3;

/**
 * Toggle a value in the selection array, enforcing min/max constraints.
 */
export function toggleValue(id: ValueId, current: ValueId[]): ValueId[] {
  if (current.includes(id)) {
    if (current.length > MIN_VALUES) {
      return current.filter((v) => v !== id);
    }
    return current; // Can't drop below minimum
  } else {
    if (current.length < MAX_VALUES) {
      return [...current, id];
    }
    return current; // Can't exceed maximum
  }
}

/**
 * Get a VaraValue by its id.
 */
export function getValueById(id: ValueId): VaraValue | undefined {
  return VARA_VALUES.find((v) => v.id === id);
}

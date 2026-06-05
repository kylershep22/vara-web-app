import { BrainState } from '../../../types';
import { Colors } from '../../../constants';

export interface BrainStateOption {
  state: BrainState;
  label: string;
  description: string;
  color: string;
}

export const BRAIN_STATES: BrainStateOption[] = [
  { state: 'wired', label: 'Wired', description: "Racing thoughts, can't settle", color: Colors.wiredTerracotta },
  { state: 'foggy', label: 'Foggy', description: 'Low energy, hard to focus', color: Colors.sunriseAmber },
  { state: 'steady', label: 'Steady', description: 'Baseline, functional, fine', color: Colors.mutedSageGray },
  { state: 'clear', label: 'Clear', description: 'Calm, present, ready', color: Colors.evergreenTeal },
  { state: 'alive', label: 'Alive', description: 'Energized, open, engaged', color: Colors.freshMoss },
];

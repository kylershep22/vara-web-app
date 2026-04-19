import { BrainState } from '../../../types';
import { Colors } from '../../../constants';

export interface BrainStateOption {
  state: BrainState;
  label: string;
  description: string;
  color: string;
}

export const BRAIN_STATES: BrainStateOption[] = [
  { state: 'wired', label: 'Wired', description: "Racing thoughts, can't settle", color: Colors.softCoral },
  { state: 'foggy', label: 'Foggy', description: 'Low energy, hard to focus', color: Colors.sunriseAmber },
  { state: 'okay', label: 'Okay', description: 'Nothing great, nothing bad', color: Colors.mutedSageGray },
  { state: 'clear', label: 'Clear', description: 'Calm, present, ready', color: Colors.evergreenTeal },
  { state: 'energized', label: 'Energized', description: 'Focused and sharp', color: Colors.freshMoss },
];

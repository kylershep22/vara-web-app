import { Colors } from '../../../constants';
import { BrainState } from '../../../types';

export interface BrainStateBrief {
  label: string;
  icon: string;
  message: string;
  accentColor: string;
}

export const BRAIN_STATE_BRIEFS: Record<BrainState, BrainStateBrief> = {
  wired: {
    label: 'Wired',
    icon: 'lightning-bolt',
    message: "Your mind is running hot today. Let's channel that energy. Start with a calming protocol, then ease into your habits.",
    accentColor: Colors.softCoral,
  },
  foggy: {
    label: 'Foggy',
    icon: 'weather-fog',
    message: "Low energy day. That's okay, your brain needs activation. A short breathwork session can shift things before you dive in.",
    accentColor: Colors.sunriseAmber,
  },
  okay: {
    label: 'Okay',
    icon: 'minus-circle-outline',
    message: "Steady baseline today. A good day to reflect and connect. Your journal and community are where you'll find momentum.",
    accentColor: Colors.mutedSageGray,
  },
  clear: {
    label: 'Clear',
    icon: 'check-circle-outline',
    message: "You're in a great headspace. This is the day to lock in focus work and build on your habits.",
    accentColor: Colors.evergreenTeal,
  },
  energized: {
    label: 'Energized',
    icon: 'flash-outline',
    message: 'Sharp and ready. Use this energy. Explore a masterclass, connect with your community, then ride the momentum through your habits.',
    accentColor: Colors.freshMoss,
  },
};

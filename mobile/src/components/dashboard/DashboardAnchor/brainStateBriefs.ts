import { Colors } from '../../../constants';
import { BrainState } from '../../../types';

export interface BrainStateBrief {
  label: string;
  icon: string;
  accentColor: string;
  message: string;
}

export const BRAIN_STATE_BRIEFS: Record<BrainState, BrainStateBrief[]> = {
  wired: [
    {
      label: 'Wired',
      icon: 'lightning-bolt',
      accentColor: Colors.wiredTerracotta,
      message: "Activation is elevated today. A short breathwork session first can help your system settle before you take on anything else.",
    },
    {
      label: 'Wired',
      icon: 'lightning-bolt',
      accentColor: Colors.wiredTerracotta,
      message: "Your nervous system is working hard right now. Today's a good day to start with regulation before habits or focus work.",
    },
    {
      label: 'Wired',
      icon: 'lightning-bolt',
      accentColor: Colors.wiredTerracotta,
      message: "When activation is high, the brain's harder to direct. A calming protocol first creates the conditions for everything else.",
    },
  ],
  foggy: [
    {
      label: 'Foggy',
      icon: 'weather-fog',
      accentColor: Colors.sunriseAmber,
      message: "Foggy mornings are often a signal your brain needs gentle activation, not pressure. A short breathwork session can help.",
    },
    {
      label: 'Foggy',
      icon: 'weather-fog',
      accentColor: Colors.sunriseAmber,
      message: "Low clarity days are information, not failure. Start with one small activating step and let the rest of the day follow.",
    },
    {
      label: 'Foggy',
      icon: 'weather-fog',
      accentColor: Colors.sunriseAmber,
      message: "Today's a lower-bandwidth day. A brief breathwork session can shift things. No need to force the rest.",
    },
  ],
  steady: [
    {
      label: 'Steady',
      icon: 'minus-circle-outline',
      accentColor: Colors.mutedSageGray,
      message: "A steady baseline is its own kind of good day. Reflection and small, consistent steps tend to land well from here.",
    },
    {
      label: 'Steady',
      icon: 'minus-circle-outline',
      accentColor: Colors.mutedSageGray,
      message: "Nothing dramatic in either direction today. A good opportunity to check in with your journal or add to a habit you're building.",
    },
    {
      label: 'Steady',
      icon: 'minus-circle-outline',
      accentColor: Colors.mutedSageGray,
      message: "Neutral days build the base that harder days rest on. No need to push, steady is the work.",
    },
  ],
  clear: [
    {
      label: 'Clear',
      icon: 'check-circle-outline',
      accentColor: Colors.evergreenTeal,
      message: "Your brain has bandwidth today. A good day to lean into focus work.",
    },
    {
      label: 'Clear',
      icon: 'check-circle-outline',
      accentColor: Colors.evergreenTeal,
      message: "Clarity like this is a chance to make steady progress on the habits that matter most to you.",
    },
    {
      label: 'Clear',
      icon: 'check-circle-outline',
      accentColor: Colors.evergreenTeal,
      message: "A clear headspace is one of the conditions habits stick in. Use it where it counts.",
    },
  ],
  alive: [
    {
      label: 'Alive',
      icon: 'flash-outline',
      accentColor: Colors.freshMoss,
      message: "High-capacity day. Today's a good one for focus work.",
    },
    {
      label: 'Alive',
      icon: 'flash-outline',
      accentColor: Colors.freshMoss,
      message: "Days like this one are rarer than we think. A good day to protect the time for what matters most.",
    },
    {
      label: 'Alive',
      icon: 'flash-outline',
      accentColor: Colors.freshMoss,
      message: "When energy is this available, the brain can hold more. Pick the one thing worth that capacity.",
    },
  ],
};

export function getBrainStateBrief(
  state: BrainState,
  date: Date = new Date()
): BrainStateBrief {
  const variants = BRAIN_STATE_BRIEFS[state];
  const dayIndex = Math.floor(date.getTime() / (1000 * 60 * 60 * 24));
  const variantIndex = dayIndex % variants.length;
  return variants[variantIndex];
}

/**
 * Pure function that picks the best next action based on brain state
 * and which features the user has already engaged with today.
 */

export interface NudgeSuggestion {
  feature: string;
  icon: string;
  headline: string;
  description: string;
  ctaLabel: string;
  screenName: string;
}

type BrainState = 'wired' | 'foggy' | 'okay' | 'clear' | 'energized';
type Feature = 'journal' | 'focus' | 'breathwork' | 'community' | 'brainHealth' | 'discover';

const PRIORITY_MAP: Record<BrainState, Feature[]> = {
  wired: ['breathwork', 'journal', 'discover', 'community', 'brainHealth', 'focus'],
  foggy: ['focus', 'breathwork', 'brainHealth', 'journal', 'discover', 'community'],
  okay: ['journal', 'community', 'discover', 'focus', 'breathwork', 'brainHealth'],
  clear: ['focus', 'journal', 'brainHealth', 'discover', 'community', 'breathwork'],
  energized: ['focus', 'community', 'brainHealth', 'journal', 'discover', 'breathwork'],
};

interface FeatureConfig {
  icon: string;
  ctaLabel: string;
  screenName: string;
  headlines: Record<BrainState, { headline: string; description: string }>;
}

const FEATURE_CONFIG: Record<Feature, FeatureConfig> = {
  journal: {
    icon: 'book-open-variant',
    ctaLabel: 'Open Journal',
    screenName: 'Journal',
    headlines: {
      wired: { headline: 'Write it out', description: 'Journaling can help a busy mind find its thread.' },
      foggy: { headline: 'Clear the fog with words', description: 'Even a few sentences can bring surprising clarity.' },
      okay: { headline: 'Check in with yourself', description: 'A quick journal entry can turn an okay day into a good one.' },
      clear: { headline: 'Capture this clarity', description: 'A clear mind is the best time to reflect.' },
      energized: { headline: 'Channel your thoughts', description: 'High energy is great for reflective writing.' },
    },
  },
  focus: {
    icon: 'timer-outline',
    ctaLabel: 'Start Session',
    screenName: 'FocusTimer',
    headlines: {
      wired: { headline: 'Try focused calm', description: 'A structured session can channel racing thoughts.' },
      foggy: { headline: 'Sharpen your focus', description: 'A short focus session can cut through the fog.' },
      okay: { headline: 'Build some momentum', description: 'A focus session can turn okay into productive.' },
      clear: { headline: 'Ride this focus', description: 'Your brain is ready \u2014 a focus session will feel effortless.' },
      energized: { headline: 'Put this energy to work', description: 'Channel your momentum into something meaningful.' },
    },
  },
  breathwork: {
    icon: 'weather-windy',
    ctaLabel: 'Start Breathwork',
    screenName: 'Breathwork',
    headlines: {
      wired: { headline: 'Settle your mind', description: 'Extended exhales help a racing brain find its rhythm.' },
      foggy: { headline: 'Wake up your brain', description: 'Activating breathwork boosts oxygen flow and alertness.' },
      okay: { headline: 'Reset with a breath', description: 'A quick breathwork session can shift your state.' },
      clear: { headline: 'Deepen this calm', description: 'Breathwork can extend a clear, present state.' },
      energized: { headline: 'Breathe and center', description: 'Ground your energy before diving into the day.' },
    },
  },
  community: {
    icon: 'account-group-outline',
    ctaLabel: 'Open Community',
    screenName: 'Community',
    headlines: {
      wired: { headline: 'Connect with others', description: 'Sometimes sharing what you\u2019re feeling helps more than solving it.' },
      foggy: { headline: 'See what others are up to', description: 'A little social energy can lift the fog.' },
      okay: { headline: 'Check in with the community', description: 'See what\u2019s happening and maybe share something of your own.' },
      clear: { headline: 'Share your clarity', description: 'Your calm perspective might be what someone needs today.' },
      energized: { headline: 'Share your energy', description: 'Your momentum might be what someone else needs today.' },
    },
  },
  brainHealth: {
    icon: 'brain',
    ctaLabel: 'Check Brain Health',
    screenName: 'Insights',
    headlines: {
      wired: { headline: 'Track your patterns', description: 'Logging sleep and stress helps you spot what triggers wired days.' },
      foggy: { headline: 'Check your readiness', description: 'Sleep and hydration data might explain the fog.' },
      okay: { headline: 'Build your baseline', description: 'Tracking brain health turns okay days into data you can learn from.' },
      clear: { headline: 'See what\u2019s working', description: 'Track the factors behind your clear state.' },
      energized: { headline: 'Log your peak state', description: 'Capturing what fuels your best days builds a personal playbook.' },
    },
  },
  discover: {
    icon: 'headphones',
    ctaLabel: 'Browse Content',
    screenName: 'DiscoverNavigator',
    headlines: {
      wired: { headline: 'Listen and unwind', description: 'A podcast or masterclass can redirect a restless mind.' },
      foggy: { headline: 'Let someone else do the thinking', description: 'Listen to something that sparks a new thought.' },
      okay: { headline: 'Explore something new', description: 'Masterclasses and podcasts for your wellness journey.' },
      clear: { headline: 'Learn something new', description: 'A clear mind absorbs information best.' },
      energized: { headline: 'Feed your curiosity', description: 'Channel your energy into learning something new.' },
    },
  },
};

export function getNudgeSuggestion(
  brainState: BrainState,
  completedFeatures: Set<Feature>
): NudgeSuggestion | null {
  const priorities = PRIORITY_MAP[brainState];
  if (!priorities) return null;

  for (const feature of priorities) {
    if (!completedFeatures.has(feature)) {
      const config = FEATURE_CONFIG[feature];
      const copy = config.headlines[brainState];
      return {
        feature,
        icon: config.icon,
        headline: copy.headline,
        description: copy.description,
        ctaLabel: config.ctaLabel,
        screenName: config.screenName,
      };
    }
  }

  return null;
}

/**
 * Feature Discovery Constants
 * Defines feature content, unlock triggers, and copy for the progressive discovery system
 *
 * Design Philosophy: Features unlock through natural engagement milestones,
 * never through time gates or explicit task completion. The user should feel
 * like features open up naturally as they explore.
 */

import { BrainPillar } from './featureUnlock';
import {
  DiscoverableFeatureId,
  FeaturePreviewContent,
  FeatureCardContent,
  UnlockToastContent,
  UnlockTrigger,
  UserEngagementMetrics,
  FeatureDiscoveryState,
} from '../types/featureDiscovery';

/**
 * All discoverable feature IDs
 */
export const ALL_DISCOVERABLE_FEATURES: DiscoverableFeatureId[] = [
  'journal',
  'discover',
  'community',
  'brain_dashboard',
  'ai_chat',
  'breathwork_full',
  'movement',
  'sleep',
  'challenges',
  'messaging',
  'masterclass',
  'goals_advanced',
  'habits_advanced',
  'journal_ai',
];

/**
 * Features that start as "available" based on selected pillar
 * All other features start as "upcoming"
 */
export const PILLAR_INITIAL_FEATURES: Record<BrainPillar, DiscoverableFeatureId[]> = {
  focus: ['journal'], // Focus pillar starts with journal available
  energy: ['movement', 'sleep'], // Energy pillar starts with movement and sleep
  growth: ['journal'], // Growth pillar starts with journal
  resilience: ['journal'], // Resilience pillar starts with journal
  connection: ['community'], // Connection pillar starts with community
};

/**
 * Feature ordering by pillar relevance
 * Determines the display order of upcoming features on home screen
 */
export const PILLAR_FEATURE_ORDER: Record<BrainPillar, DiscoverableFeatureId[]> = {
  focus: [
    'journal', 'discover', 'brain_dashboard', 'ai_chat', 'breathwork_full',
    'habits_advanced', 'goals_advanced', 'journal_ai', 'masterclass',
    'community', 'messaging', 'challenges', 'movement', 'sleep',
  ],
  energy: [
    'movement', 'sleep', 'breathwork_full', 'discover', 'brain_dashboard',
    'habits_advanced', 'ai_chat', 'journal', 'journal_ai', 'masterclass',
    'community', 'messaging', 'challenges', 'goals_advanced',
  ],
  growth: [
    'journal', 'discover', 'goals_advanced', 'habits_advanced', 'brain_dashboard',
    'masterclass', 'ai_chat', 'journal_ai', 'breathwork_full',
    'community', 'messaging', 'challenges', 'movement', 'sleep',
  ],
  resilience: [
    'journal', 'breathwork_full', 'brain_dashboard', 'discover', 'ai_chat',
    'habits_advanced', 'journal_ai', 'masterclass', 'movement', 'sleep',
    'community', 'messaging', 'challenges', 'goals_advanced',
  ],
  connection: [
    'community', 'messaging', 'journal', 'discover', 'challenges',
    'ai_chat', 'habits_advanced', 'goals_advanced', 'brain_dashboard',
    'journal_ai', 'masterclass', 'breathwork_full', 'movement', 'sleep',
  ],
};

/**
 * Default initial state for a feature
 */
export const DEFAULT_FEATURE_STATE: FeatureDiscoveryState = {
  status: 'upcoming',
  unlockedAt: null,
  toastShown: false,
  firstOpenedAt: null,
};

/**
 * Default engagement metrics for new users
 */
export const DEFAULT_ENGAGEMENT_METRICS: UserEngagementMetrics = {
  sessionCount: 0,
  habitsCompleted: 0,
  morningCheckInsCompleted: 0,
  journalEntriesCount: 0,
  goalsCreated: 0,
  breathworkSessionsCount: 0,
  discoverArticlesRead: 0,
  groupsJoined: 0,
  featuresEngaged: [],
  lastActivityAt: null,
};

/**
 * Unlock triggers for each feature
 * Features unlock based on natural engagement milestones
 */
export const UNLOCK_TRIGGERS: UnlockTrigger[] = [
  // Journal - unlocks after first habit completion or morning check-in
  {
    featureId: 'journal',
    description: 'Complete your first habit or app session',
    priority: 1,
    evaluate: (metrics) =>
      metrics.habitsCompleted >= 1 || metrics.sessionCount >= 1,
  },

  // Discover - unlocks after 2+ sessions or 3+ habits
  {
    featureId: 'discover',
    description: 'Explore the app across a couple of sessions',
    priority: 2,
    evaluate: (metrics) =>
      metrics.sessionCount >= 2 || metrics.habitsCompleted >= 3,
  },

  // Community - unlocks after engaging with 2+ features
  {
    featureId: 'community',
    description: 'Engage with a couple of different features',
    priority: 3,
    evaluate: (metrics) =>
      metrics.featuresEngaged.length >= 2,
  },

  // Brain Dashboard - unlocks after 3+ morning check-ins
  {
    featureId: 'brain_dashboard',
    description: 'Use the app a few times',
    priority: 4,
    evaluate: (metrics) =>
      metrics.sessionCount >= 3 || metrics.habitsCompleted >= 3,
  },

  // AI Chat - unlocks after 5+ habits OR 2+ journal entries
  {
    featureId: 'ai_chat',
    description: 'Build some history for the AI to work with',
    priority: 5,
    evaluate: (metrics) =>
      metrics.habitsCompleted >= 5 || metrics.journalEntriesCount >= 2,
  },

  // Breathwork Full - unlocks after using breathwork 2+ times
  {
    featureId: 'breathwork_full',
    description: 'Try a couple of quick breathing exercises',
    priority: 6,
    evaluate: (metrics) =>
      metrics.breathworkSessionsCount >= 2,
  },

  // Movement - unlocks after using any wellness content 3+ times
  {
    featureId: 'movement',
    description: 'Engage with wellness content a few times',
    priority: 7,
    evaluate: (metrics) =>
      metrics.breathworkSessionsCount >= 3 ||
      metrics.habitsCompleted >= 5 ||
      metrics.sessionCount >= 3,
  },

  // Sleep - unlocks after using any wellness content 3+ times
  {
    featureId: 'sleep',
    description: 'Engage with wellness content a few times',
    priority: 8,
    evaluate: (metrics) =>
      metrics.breathworkSessionsCount >= 3 ||
      metrics.habitsCompleted >= 5 ||
      metrics.sessionCount >= 3,
  },

  // Goals Advanced - unlocks after creating 2+ goals
  {
    featureId: 'goals_advanced',
    description: 'Set a couple of goals first',
    priority: 9,
    evaluate: (metrics) =>
      metrics.goalsCreated >= 2,
  },

  // Habits Advanced - unlocks after completing 10+ habit check-ins
  {
    featureId: 'habits_advanced',
    description: 'Build a habit tracking streak',
    priority: 10,
    evaluate: (metrics) =>
      metrics.habitsCompleted >= 10,
  },

  // Journal AI - unlocks after 3+ journal entries
  {
    featureId: 'journal_ai',
    description: 'Write a few journal entries first',
    priority: 11,
    evaluate: (metrics) =>
      metrics.journalEntriesCount >= 3,
  },

  // Masterclass - unlocks after reading 3+ discover articles OR 7+ habits
  {
    featureId: 'masterclass',
    description: 'Engage with educational content',
    priority: 12,
    evaluate: (metrics) =>
      metrics.discoverArticlesRead >= 3 || metrics.habitsCompleted >= 7,
  },

  // Messaging - unlocks when community is available and user joined a group
  {
    featureId: 'messaging',
    description: 'Join a community group first',
    priority: 13,
    evaluate: (metrics) =>
      metrics.groupsJoined >= 1 && metrics.featuresEngaged.includes('community'),
  },

  // Challenges - unlocks when community is available and 10+ habits completed
  {
    featureId: 'challenges',
    description: 'Build a habit foundation first',
    priority: 14,
    evaluate: (metrics) =>
      metrics.habitsCompleted >= 10 && metrics.featuresEngaged.includes('community'),
  },
];

/**
 * Feature preview content for bottom sheets
 */
export const FEATURE_PREVIEW_CONTENT: Record<DiscoverableFeatureId, FeaturePreviewContent> = {
  journal: {
    id: 'journal',
    title: 'Journal',
    tagline: 'A quiet space for reflection',
    description: 'Journaling helps your brain externalize thoughts, reducing the load on working memory and supporting emotional processing.',
    icon: 'book-outline',
    whatsInside: [
      'Free-form writing with gentle prompts',
      'Connected to your routines and focus areas',
      'Private. Only you can see your reflections',
    ],
    availabilityNote: 'This becomes available after your first routine check-in, a natural moment to reflect.',
    ctaAvailable: 'Start journaling',
    navigationTarget: 'Journal',
  },
  discover: {
    id: 'discover',
    title: 'Discover',
    tagline: 'Brain-health insights, at your pace',
    description: 'Short, evidence-informed articles about focus, habits, stress, and how your brain works, curated around your current focus area.',
    icon: 'lightbulb-outline',
    whatsInside: [
      'Articles tailored to your selected focus',
      '2–4 minute reads, no overwhelm',
      'New content added gently over time',
    ],
    availabilityNote: 'Opens up as you settle into Vara so there\'s context for what you\'re reading.',
    ctaAvailable: 'Start exploring',
    navigationTarget: 'Insights',
  },
  community: {
    id: 'community',
    title: 'Community',
    tagline: 'A calm space to connect',
    description: 'Share experiences and learn alongside others who are building brain-healthy habits. Community in Vara is supportive and low-pressure, with no performance metrics and no comparison.',
    icon: 'account-group-outline',
    whatsInside: [
      'Small group discussions around shared focus areas',
      'Supportive, moderated conversations',
      'Share at your own pace. Listening is welcome too',
    ],
    availabilityNote: 'This opens once you\'ve explored a couple of features so you have something to connect around.',
    ctaAvailable: 'Join the conversation',
    navigationTarget: 'Community',
  },
  brain_dashboard: {
    id: 'brain_dashboard',
    title: 'Brain Dashboard',
    tagline: 'Your brain health at a glance',
    description: 'A personalized view of how your daily habits and routines support your brain health across all five pillars.',
    icon: 'chart-line',
    whatsInside: [
      'Visual tracking of your brain health pillars',
      'Insights based on your check-ins and habits',
      'Personalized recommendations for improvement',
    ],
    availabilityNote: 'This opens after a few morning check-ins so there\'s meaningful data to show.',
    ctaAvailable: 'View your dashboard',
    navigationTarget: 'BrainHealthDashboard',
  },
  ai_chat: {
    id: 'ai_chat',
    title: 'AI Companion',
    tagline: 'Your personal wellness guide',
    description: 'A thoughtful AI companion that understands your habits, goals, and patterns, offering personalized guidance when you need it.',
    icon: 'robot-outline',
    whatsInside: [
      'Personalized advice based on your history',
      'Gentle check-ins and encouragement',
      'Always available, no judgment',
    ],
    availabilityNote: 'This opens once you\'ve built some history so the AI has context to help you.',
    ctaAvailable: 'Start a conversation',
    navigationTarget: 'AIChat',
  },
  breathwork_full: {
    id: 'breathwork_full',
    title: 'Full Breathwork Library',
    tagline: 'Complete breathing techniques',
    description: 'Access the full library of breathing exercises for focus, relaxation, energy, and sleep, from quick resets to longer sessions.',
    icon: 'lungs',
    whatsInside: [
      'Extended breathing sessions (5-20 minutes)',
      'Specialized techniques for different needs',
      'Guided audio with calming backgrounds',
    ],
    availabilityNote: 'Opens after you\'ve tried a couple of quick breathing exercises.',
    ctaAvailable: 'Explore breathwork',
    navigationTarget: 'Breathwork',
  },
  movement: {
    id: 'movement',
    title: 'Movement',
    tagline: 'Gentle movement for energy',
    description: 'Guided movement sessions designed to boost energy, improve focus, and support your body. No gym required.',
    icon: 'run',
    whatsInside: [
      'Short movement breaks (5-15 minutes)',
      'Desk-friendly stretches and exercises',
      'Energy-boosting routines for any time of day',
    ],
    availabilityNote: 'Opens as you engage more with wellness content.',
    ctaAvailable: 'Start moving',
    navigationTarget: 'Movement',
  },
  sleep: {
    id: 'sleep',
    title: 'Sleep',
    tagline: 'Rest and recovery tools',
    description: 'Content and tools designed to help you wind down, fall asleep, and wake up refreshed.',
    icon: 'weather-night',
    whatsInside: [
      'Sleep meditations and stories',
      'Wind-down routines',
      'Sleep tracking insights',
    ],
    availabilityNote: 'Opens as you engage more with wellness content.',
    ctaAvailable: 'Improve your sleep',
    navigationTarget: 'Sleep',
  },
  goals_advanced: {
    id: 'goals_advanced',
    title: 'Advanced Goals',
    tagline: 'Deeper goal tracking',
    description: 'Take your goals further with milestones, progress visualization, and insights that help you stay on track.',
    icon: 'flag-checkered',
    whatsInside: [
      'Break goals into milestones',
      'Progress visualization and trends',
      'Smart reminders and check-ins',
    ],
    availabilityNote: 'Opens after you\'ve set a couple of goals.',
    ctaAvailable: 'Enhance your goals',
    navigationTarget: 'Goals',
  },
  habits_advanced: {
    id: 'habits_advanced',
    title: 'Advanced Habits',
    tagline: 'Identity-based habit building',
    description: 'Unlock the full habit system with unlimited habits, identity statements, and implementation intentions.',
    icon: 'checkbox-marked-circle',
    whatsInside: [
      'Unlimited habit tracking',
      'Identity-based habit framing',
      'Advanced streak and consistency insights',
    ],
    availabilityNote: 'Opens once you\'ve built a solid habit tracking streak.',
    ctaAvailable: 'Level up your habits',
    navigationTarget: 'Habits',
  },
  journal_ai: {
    id: 'journal_ai',
    title: 'AI Journal Prompts',
    tagline: 'Thoughtful prompts just for you',
    description: 'AI-generated prompts based on your journal history and current focus, helping you reflect more deeply.',
    icon: 'auto-fix',
    whatsInside: [
      'Personalized prompts based on your entries',
      'Weekly reflection summaries',
      'Gentle nudges for deeper thinking',
    ],
    availabilityNote: 'Opens after you\'ve written a few journal entries.',
    ctaAvailable: 'Try AI prompts',
    navigationTarget: 'Journal',
  },
  masterclass: {
    id: 'masterclass',
    title: 'Masterclasses',
    tagline: 'Deep dives into wellness',
    description: 'In-depth educational content on brain health, habits, focus, and well-being, taught by experts.',
    icon: 'school-outline',
    whatsInside: [
      'Multi-part courses on key topics',
      'Expert-led video content',
      'Practical exercises and takeaways',
    ],
    availabilityNote: 'Opens after you\'ve engaged with educational content.',
    ctaAvailable: 'Start learning',
    // B-3d.1: was 'Masterclasses' (plural) — a dead target; the registered route
    // is 'Masterclass' (singular). Fixed so the feature-preview CTA navigates.
    navigationTarget: 'Masterclass',
  },
  messaging: {
    id: 'messaging',
    title: 'Direct Messages',
    tagline: 'Connect one-on-one',
    description: 'Send private messages to community members you connect with and build meaningful relationships at your own pace.',
    icon: 'message-outline',
    whatsInside: [
      'Private conversations with community members',
      'Simple, distraction-free messaging',
      'Full control over who can message you',
    ],
    availabilityNote: 'Opens after you\'ve joined a community group.',
    ctaAvailable: 'Start messaging',
    navigationTarget: 'Messages',
  },
  challenges: {
    id: 'challenges',
    title: 'Challenges',
    tagline: 'Grow together',
    description: 'Join group challenges to build habits together. Supportive accountability without pressure.',
    icon: 'trophy-outline',
    whatsInside: [
      'Community-driven wellness challenges',
      'Supportive group accountability',
      'Flexible participation at your pace',
    ],
    availabilityNote: 'Opens once you\'ve built a habit foundation and explored community.',
    ctaAvailable: 'Join a challenge',
    navigationTarget: 'Challenges',
  },
};

/**
 * Feature card content for home screen display
 */
export const FEATURE_CARD_CONTENT: Record<DiscoverableFeatureId, FeatureCardContent> = {
  journal: {
    id: 'journal',
    name: 'Journal',
    subtitleUpcoming: 'Opens after your first reflection',
    subtitleAvailable: 'Reflect on how your routines are going',
    icon: 'book-outline',
  },
  discover: {
    id: 'discover',
    name: 'Discover',
    subtitleUpcoming: 'Explore brain-health insights at your pace',
    subtitleAvailable: 'Brain-health insights curated for you',
    icon: 'lightbulb-outline',
  },
  community: {
    id: 'community',
    name: 'Community',
    subtitleUpcoming: 'Connect with others on a similar path',
    subtitleAvailable: 'A calm space to connect with others',
    icon: 'account-group-outline',
  },
  brain_dashboard: {
    id: 'brain_dashboard',
    name: 'Brain Dashboard',
    subtitleUpcoming: 'Opens after a few check-ins',
    subtitleAvailable: 'See how your habits support your brain',
    icon: 'chart-line',
  },
  ai_chat: {
    id: 'ai_chat',
    name: 'AI Companion',
    subtitleUpcoming: 'Opens as you build history',
    subtitleAvailable: 'Get personalized guidance anytime',
    icon: 'robot-outline',
  },
  breathwork_full: {
    id: 'breathwork_full',
    name: 'Full Breathwork',
    subtitleUpcoming: 'Try quick breathing first',
    subtitleAvailable: 'Access the complete breathing library',
    icon: 'lungs',
  },
  movement: {
    id: 'movement',
    name: 'Movement',
    subtitleUpcoming: 'Opens as you explore wellness',
    subtitleAvailable: 'Gentle movement to boost your energy',
    icon: 'run',
  },
  sleep: {
    id: 'sleep',
    name: 'Sleep',
    subtitleUpcoming: 'Opens as you explore wellness',
    subtitleAvailable: 'Tools for better rest and recovery',
    icon: 'weather-night',
  },
  goals_advanced: {
    id: 'goals_advanced',
    name: 'Advanced Goals',
    subtitleUpcoming: 'Set a few goals first',
    subtitleAvailable: 'Take your goals to the next level',
    icon: 'flag-checkered',
  },
  habits_advanced: {
    id: 'habits_advanced',
    name: 'Advanced Habits',
    subtitleUpcoming: 'Build your habit streak first',
    subtitleAvailable: 'Unlock identity-based habit tracking',
    icon: 'checkbox-marked-circle',
  },
  journal_ai: {
    id: 'journal_ai',
    name: 'AI Journal Prompts',
    subtitleUpcoming: 'Write a few entries first',
    subtitleAvailable: 'Personalized prompts for deeper reflection',
    icon: 'auto-fix',
  },
  masterclass: {
    id: 'masterclass',
    name: 'Masterclasses',
    subtitleUpcoming: 'Opens as you learn',
    subtitleAvailable: 'Deep dives into brain health topics',
    icon: 'school-outline',
  },
  messaging: {
    id: 'messaging',
    name: 'Messages',
    subtitleUpcoming: 'Join a group first',
    subtitleAvailable: 'Connect one-on-one with others',
    icon: 'message-outline',
  },
  challenges: {
    id: 'challenges',
    name: 'Challenges',
    subtitleUpcoming: 'Build habits and join community first',
    subtitleAvailable: 'Join group challenges and grow together',
    icon: 'trophy-outline',
  },
};

/**
 * Toast content for unlock notifications
 */
export const UNLOCK_TOAST_CONTENT: Record<DiscoverableFeatureId, UnlockToastContent> = {
  journal: {
    id: 'journal',
    title: 'Journal is now available',
    subtitle: 'Reflect on how your routines are going',
    icon: 'book-outline',
  },
  discover: {
    id: 'discover',
    title: 'Discover is ready to explore',
    subtitle: 'Explore brain-health insights at your pace',
    icon: 'lightbulb-outline',
  },
  community: {
    id: 'community',
    title: 'Community is now open',
    subtitle: 'Connect with others on a similar path',
    icon: 'account-group-outline',
  },
  brain_dashboard: {
    id: 'brain_dashboard',
    title: 'Brain Dashboard is now available',
    subtitle: 'See how your habits support your brain',
    icon: 'chart-line',
  },
  ai_chat: {
    id: 'ai_chat',
    title: 'AI Companion is ready',
    subtitle: 'Get personalized guidance anytime',
    icon: 'robot-outline',
  },
  breathwork_full: {
    id: 'breathwork_full',
    title: 'Full Breathwork is now available',
    subtitle: 'Access the complete breathing library',
    icon: 'lungs',
  },
  movement: {
    id: 'movement',
    title: 'Movement is now available',
    subtitle: 'Gentle movement to boost your energy',
    icon: 'run',
  },
  sleep: {
    id: 'sleep',
    title: 'Sleep is now available',
    subtitle: 'Tools for better rest and recovery',
    icon: 'weather-night',
  },
  goals_advanced: {
    id: 'goals_advanced',
    title: 'Advanced Goals is now available',
    subtitle: 'Take your goals to the next level',
    icon: 'flag-checkered',
  },
  habits_advanced: {
    id: 'habits_advanced',
    title: 'Advanced Habits is now available',
    subtitle: 'Unlock identity-based habit tracking',
    icon: 'checkbox-marked-circle',
  },
  journal_ai: {
    id: 'journal_ai',
    title: 'AI Journal Prompts is now available',
    subtitle: 'Personalized prompts for deeper reflection',
    icon: 'auto-fix',
  },
  masterclass: {
    id: 'masterclass',
    title: 'Masterclasses are now available',
    subtitle: 'Deep dives into brain health topics',
    icon: 'school-outline',
  },
  messaging: {
    id: 'messaging',
    title: 'Messages is now available',
    subtitle: 'Connect one-on-one with others',
    icon: 'message-outline',
  },
  challenges: {
    id: 'challenges',
    title: 'Challenges is now available',
    subtitle: 'Join group challenges and grow together',
    icon: 'trophy-outline',
  },
};

/**
 * Get the unlock trigger for a specific feature
 */
export function getUnlockTrigger(featureId: DiscoverableFeatureId): UnlockTrigger | undefined {
  return UNLOCK_TRIGGERS.find(t => t.featureId === featureId);
}

/**
 * Get features ordered by pillar relevance (excluding already available/active)
 */
export function getOrderedUpcomingFeatures(
  pillar: BrainPillar,
  currentStates: Record<DiscoverableFeatureId, FeatureDiscoveryState>
): DiscoverableFeatureId[] {
  const order = PILLAR_FEATURE_ORDER[pillar] || PILLAR_FEATURE_ORDER.focus;
  return order.filter(id => currentStates[id]?.status === 'upcoming');
}

/**
 * Initialize feature states based on selected pillar
 */
export function initializeFeatureStates(
  pillar: BrainPillar
): Record<DiscoverableFeatureId, FeatureDiscoveryState> {
  const initialAvailable = PILLAR_INITIAL_FEATURES[pillar] || [];
  const states: Record<string, FeatureDiscoveryState> = {};

  for (const featureId of ALL_DISCOVERABLE_FEATURES) {
    if (initialAvailable.includes(featureId)) {
      states[featureId] = {
        status: 'available',
        unlockedAt: new Date(),
        toastShown: true, // Don't show toast for initial features
        firstOpenedAt: null,
      };
    } else {
      states[featureId] = { ...DEFAULT_FEATURE_STATE };
    }
  }

  return states as Record<DiscoverableFeatureId, FeatureDiscoveryState>;
}

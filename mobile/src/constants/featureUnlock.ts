/**
 * Feature Unlock Constants
 * Defines the progressive unlock system for the "Calm Start" onboarding
 *
 * Design Philosophy: Guide new users through features gradually to prevent
 * overwhelm, while always providing an escape hatch to unlock everything.
 *
 * Pillars map to brain health pillars: Focus, Energy, Growth, Resilience, Connection
 */

export type { BrainPillar } from '../types/models';

export type FeatureId =
  | 'habits_basic'
  | 'habits_advanced'
  | 'goals_basic'
  | 'goals_advanced'
  | 'tasks_basic'
  | 'journal'
  | 'journal_ai'
  | 'focus_timer'
  | 'breathwork_quick'
  | 'breathwork_full'
  | 'movement'
  | 'sleep'
  | 'brain_readiness'
  | 'brain_dashboard'
  | 'insights'
  | 'community_view'
  | 'community_create'
  | 'messaging'
  | 'challenges'
  | 'masterclass'
  | 'ai_chat';

export interface BrainPillarConfig {
  id: BrainPillar;
  title: string;
  subtitle: string;
  description: string;
  icon: string;
  color: string;
  /** Features unlocked on Day 1 for this pillar */
  day1Features: FeatureId[];
}

/**
 * Brain Pillar configurations
 * Each pillar unlocks a curated set of features on Day 1
 */
export const BRAIN_PILLARS: BrainPillarConfig[] = [
  {
    id: 'focus',
    title: 'Focus',
    subtitle: 'Sharpen your mind',
    description: 'Start with deep work tools, journaling, and breathing exercises to improve concentration.',
    icon: 'target',
    color: '#1B5E57', // Evergreen Teal
    day1Features: ['focus_timer', 'journal', 'breathwork_quick', 'habits_basic', 'tasks_basic'],
  },
  {
    id: 'energy',
    title: 'Energy',
    subtitle: 'Restore your vitality',
    description: 'Begin with sleep optimization, movement, and breathing to boost your daily energy.',
    icon: 'lightning-bolt',
    color: '#E8A838', // Sunrise Amber
    day1Features: ['sleep', 'breathwork_quick', 'movement', 'habits_basic'],
  },
  {
    id: 'growth',
    title: 'Growth',
    subtitle: 'Expand your potential',
    description: 'Focus on habits, goals, and learning to build your ideal self.',
    icon: 'sprout',
    color: '#1B5E57', // Evergreen Teal
    day1Features: ['habits_basic', 'goals_basic', 'tasks_basic', 'journal', 'brain_readiness'],
  },
  {
    id: 'resilience',
    title: 'Resilience',
    subtitle: 'Build inner strength',
    description: 'Start with stress management tools, journaling, and breathing exercises.',
    icon: 'shield-check',
    color: '#D5E3D1', // Dew Sage
    day1Features: ['breathwork_quick', 'journal', 'brain_readiness', 'habits_basic'],
  },
  {
    id: 'connection',
    title: 'Connection',
    subtitle: 'Strengthen relationships',
    description: 'Begin with community features, reflection, and gratitude practices.',
    icon: 'account-group',
    color: '#B8CDBA', // Silver Sage
    day1Features: ['community_view', 'journal', 'habits_basic', 'goals_basic'],
  },
];

/**
 * Feature unlock tiers
 * Features progressively unlock as the user engages with the app
 */
export const FEATURE_UNLOCK_TIERS = {
  // Day 1: Pillar-specific features (defined per pillar above)
  day1: [] as FeatureId[], // Populated from pillar selection

  // Day 7: Additional complementary features
  day7: [
    'breathwork_full',
    'goals_advanced',
    'insights',
    'brain_readiness',
  ] as FeatureId[],

  // Day 14: Full access to all features
  day14: [
    'habits_advanced',
    'brain_dashboard',
    'journal_ai',
    'community_create',
    'messaging',
    'challenges',
    'masterclass',
    'ai_chat',
    'movement',
    'sleep',
  ] as FeatureId[],
};

/**
 * All features - used when user unlocks everything
 */
export const ALL_FEATURES: FeatureId[] = [
  'habits_basic',
  'habits_advanced',
  'goals_basic',
  'goals_advanced',
  'tasks_basic',
  'journal',
  'journal_ai',
  'focus_timer',
  'breathwork_quick',
  'breathwork_full',
  'movement',
  'sleep',
  'brain_readiness',
  'brain_dashboard',
  'insights',
  'community_view',
  'community_create',
  'messaging',
  'challenges',
  'masterclass',
  'ai_chat',
];

/**
 * Feature metadata for display
 */
export const FEATURE_METADATA: Record<FeatureId, {
  name: string;
  description: string;
  icon: string;
}> = {
  habits_basic: {
    name: 'Habit Tracking',
    description: 'Track up to 3 daily habits',
    icon: 'checkbox-marked-circle-outline',
  },
  habits_advanced: {
    name: 'Advanced Habits',
    description: 'Unlimited habits with identity-based tracking',
    icon: 'checkbox-marked-circle',
  },
  goals_basic: {
    name: 'Goals',
    description: 'Set and track your goals',
    icon: 'flag-outline',
  },
  goals_advanced: {
    name: 'Advanced Goals',
    description: 'Detailed goal tracking with milestones',
    icon: 'flag-checkered',
  },
  tasks_basic: {
    name: 'Tasks',
    description: 'Manage your to-do list',
    icon: 'clipboard-check-outline',
  },
  journal: {
    name: 'Journal',
    description: 'Daily reflection and journaling',
    icon: 'book-outline',
  },
  journal_ai: {
    name: 'AI Journal Prompts',
    description: 'AI-powered journaling prompts and insights',
    icon: 'auto-fix',
  },
  focus_timer: {
    name: 'Focus Timer',
    description: 'Focused sessions for deep work',
    icon: 'timer-outline',
  },
  breathwork_quick: {
    name: 'Quick Breathing',
    description: '1-5 minute breathing exercises',
    icon: 'weather-windy',
  },
  breathwork_full: {
    name: 'Full Breathwork Library',
    description: 'Complete library of breathing techniques',
    icon: 'lungs',
  },
  movement: {
    name: 'Movement',
    description: 'Guided movement and exercise content',
    icon: 'run',
  },
  sleep: {
    name: 'Sleep',
    description: 'Sleep optimization tools and content',
    icon: 'weather-night',
  },
  brain_readiness: {
    name: 'Brain Readiness',
    description: 'Daily brain readiness check-in',
    icon: 'brain',
  },
  brain_dashboard: {
    name: 'Brain Health Dashboard',
    description: 'Full brain health tracking and insights',
    icon: 'chart-line',
  },
  insights: {
    name: 'Insights',
    description: 'Analytics and progress insights',
    icon: 'lightbulb-outline',
  },
  community_view: {
    name: 'Community',
    description: 'View community posts and groups',
    icon: 'account-group-outline',
  },
  community_create: {
    name: 'Create in Community',
    description: 'Post and create groups',
    icon: 'account-group',
  },
  messaging: {
    name: 'Direct Messages',
    description: 'Message other community members',
    icon: 'message-outline',
  },
  challenges: {
    name: 'Challenges',
    description: 'Join and create wellness challenges',
    icon: 'trophy-outline',
  },
  masterclass: {
    name: 'Masterclasses',
    description: 'Educational wellness content',
    icon: 'school-outline',
  },
  ai_chat: {
    name: 'AI Companion',
    description: 'Chat with your AI wellness coach',
    icon: 'robot-outline',
  },
};

/**
 * Get pillar by ID
 */
export const getPillarById = (id: BrainPillar): BrainPillarConfig | undefined => {
  return BRAIN_PILLARS.find(p => p.id === id);
};

/**
 * Get features for a pillar at a specific tier
 */
export const getFeaturesForPillar = (
  pillarId: BrainPillar,
  daysSinceStart: number
): FeatureId[] => {
  const pillar = getPillarById(pillarId);
  if (!pillar) return [];

  const features = new Set<FeatureId>(pillar.day1Features);

  if (daysSinceStart >= 7) {
    FEATURE_UNLOCK_TIERS.day7.forEach(f => features.add(f));
  }

  if (daysSinceStart >= 14) {
    FEATURE_UNLOCK_TIERS.day14.forEach(f => features.add(f));
  }

  return Array.from(features);
};

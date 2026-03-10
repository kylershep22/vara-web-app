// src/constants/featureUnlock.js
// Port of mobile/src/constants/featureUnlock.ts

/**
 * Brain Pillar configurations
 * Each pillar unlocks a curated set of features on Day 1
 */
export const BRAIN_PILLARS = [
  {
    id: 'focus',
    title: 'Focus',
    subtitle: 'Sharpen your mind',
    description: 'Start with deep work tools, journaling, and breathing exercises to improve concentration.',
    icon: 'target',
    color: '#1B5E57',
    day1Features: ['focus_timer', 'journal', 'breathwork_quick', 'habits_basic', 'tasks_basic'],
  },
  {
    id: 'energy',
    title: 'Energy',
    subtitle: 'Restore your vitality',
    description: 'Begin with sleep optimization, movement, and breathing to boost your daily energy.',
    icon: 'lightning-bolt',
    color: '#E8A838',
    day1Features: ['sleep', 'breathwork_quick', 'movement', 'habits_basic'],
  },
  {
    id: 'growth',
    title: 'Growth',
    subtitle: 'Expand your potential',
    description: 'Focus on habits, goals, and learning to build your ideal self.',
    icon: 'sprout',
    color: '#1B5E57',
    day1Features: ['habits_basic', 'goals_basic', 'tasks_basic', 'journal', 'brain_readiness'],
  },
  {
    id: 'resilience',
    title: 'Resilience',
    subtitle: 'Build inner strength',
    description: 'Start with stress management tools, journaling, and breathing exercises.',
    icon: 'shield-check',
    color: '#D5E3D1',
    day1Features: ['breathwork_quick', 'journal', 'brain_readiness', 'habits_basic'],
  },
  {
    id: 'connection',
    title: 'Connection',
    subtitle: 'Strengthen relationships',
    description: 'Begin with community features, reflection, and gratitude practices.',
    icon: 'account-group',
    color: '#B8CDBA',
    day1Features: ['community_view', 'journal', 'habits_basic', 'goals_basic'],
  },
];

/**
 * Feature unlock tiers
 */
export const FEATURE_UNLOCK_TIERS = {
  day1: [], // Populated from pillar selection
  day7: ['breathwork_full', 'goals_advanced', 'insights', 'brain_readiness'],
  day14: [
    'habits_advanced', 'brain_dashboard', 'journal_ai', 'community_create',
    'messaging', 'challenges', 'masterclass', 'ai_chat', 'movement', 'sleep',
  ],
};

/**
 * All features - used when user unlocks everything
 */
export const ALL_FEATURES = [
  'habits_basic', 'habits_advanced', 'goals_basic', 'goals_advanced',
  'tasks_basic', 'journal', 'journal_ai', 'focus_timer',
  'breathwork_quick', 'breathwork_full', 'movement', 'sleep',
  'brain_readiness', 'brain_dashboard', 'insights',
  'community_view', 'community_create', 'messaging',
  'challenges', 'masterclass', 'ai_chat',
];

/**
 * Feature metadata for display
 */
export const FEATURE_METADATA = {
  habits_basic: { name: 'Habit Tracking', description: 'Track up to 3 daily habits', icon: 'CheckCircle' },
  habits_advanced: { name: 'Advanced Habits', description: 'Unlimited habits with identity-based tracking', icon: 'CheckCircle' },
  goals_basic: { name: 'Goals', description: 'Set and track your goals', icon: 'Flag' },
  goals_advanced: { name: 'Advanced Goals', description: 'Detailed goal tracking with milestones', icon: 'Flag' },
  tasks_basic: { name: 'Tasks', description: 'Manage your to-do list', icon: 'ClipboardList' },
  journal: { name: 'Journal', description: 'Daily reflection and journaling', icon: 'BookOpen' },
  journal_ai: { name: 'AI Journal Prompts', description: 'AI-powered journaling prompts and insights', icon: 'Sparkles' },
  focus_timer: { name: 'Focus Timer', description: 'Pomodoro and deep work sessions', icon: 'Timer' },
  breathwork_quick: { name: 'Quick Breathing', description: '1-5 minute breathing exercises', icon: 'Wind' },
  breathwork_full: { name: 'Full Breathwork Library', description: 'Complete library of breathing techniques', icon: 'Wind' },
  movement: { name: 'Movement', description: 'Guided movement and exercise content', icon: 'Activity' },
  sleep: { name: 'Sleep', description: 'Sleep optimization tools and content', icon: 'Moon' },
  brain_readiness: { name: 'Brain Readiness', description: 'Daily brain readiness check-in', icon: 'Brain' },
  brain_dashboard: { name: 'Brain Health Dashboard', description: 'Full brain health tracking and insights', icon: 'BarChart3' },
  insights: { name: 'Insights', description: 'Analytics and progress insights', icon: 'TrendingUp' },
  community_view: { name: 'Community', description: 'View community posts and groups', icon: 'Users' },
  community_create: { name: 'Create in Community', description: 'Post and create groups', icon: 'Users' },
  messaging: { name: 'Direct Messages', description: 'Message other community members', icon: 'MessageCircle' },
  challenges: { name: 'Challenges', description: 'Join and create wellness challenges', icon: 'Trophy' },
  masterclass: { name: 'Masterclasses', description: 'Educational wellness content', icon: 'GraduationCap' },
  ai_chat: { name: 'AI Companion', description: 'Chat with your AI wellness coach', icon: 'Bot' },
};

/**
 * Get pillar by ID
 */
export function getPillarById(id) {
  return BRAIN_PILLARS.find(p => p.id === id);
}

/**
 * Get features for a pillar at a specific tier
 */
export function getFeaturesForPillar(pillarId, daysSinceStart) {
  const pillar = getPillarById(pillarId);
  if (!pillar) return [];

  const features = new Set(pillar.day1Features);

  if (daysSinceStart >= 7) {
    FEATURE_UNLOCK_TIERS.day7.forEach(f => features.add(f));
  }

  if (daysSinceStart >= 14) {
    FEATURE_UNLOCK_TIERS.day14.forEach(f => features.add(f));
  }

  return Array.from(features);
}

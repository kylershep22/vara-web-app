/**
 * Standardized Interests & Wellness Goals
 * Predefined options for user profiles to enable better matching
 */

// Wellness interest categories for consistent matching
export const WELLNESS_INTERESTS = [
  // Mind & Mental Health
  { id: 'meditation', label: 'Meditation', category: 'mind' },
  { id: 'mindfulness', label: 'Mindfulness', category: 'mind' },
  { id: 'journaling', label: 'Journaling', category: 'mind' },
  { id: 'stress-management', label: 'Stress Management', category: 'mind' },
  { id: 'mental-health', label: 'Mental Health', category: 'mind' },
  { id: 'therapy', label: 'Therapy & Counseling', category: 'mind' },
  { id: 'breathwork', label: 'Breathwork', category: 'mind' },

  // Physical Fitness
  { id: 'running', label: 'Running', category: 'fitness' },
  { id: 'yoga', label: 'Yoga', category: 'fitness' },
  { id: 'strength-training', label: 'Strength Training', category: 'fitness' },
  { id: 'hiit', label: 'HIIT Workouts', category: 'fitness' },
  { id: 'walking', label: 'Walking', category: 'fitness' },
  { id: 'swimming', label: 'Swimming', category: 'fitness' },
  { id: 'cycling', label: 'Cycling', category: 'fitness' },
  { id: 'pilates', label: 'Pilates', category: 'fitness' },
  { id: 'stretching', label: 'Stretching & Mobility', category: 'fitness' },

  // Nutrition
  { id: 'healthy-eating', label: 'Healthy Eating', category: 'nutrition' },
  { id: 'meal-prep', label: 'Meal Prep', category: 'nutrition' },
  { id: 'plant-based', label: 'Plant-Based Diet', category: 'nutrition' },
  { id: 'hydration', label: 'Hydration', category: 'nutrition' },
  { id: 'intermittent-fasting', label: 'Intermittent Fasting', category: 'nutrition' },
  { id: 'nutrition-science', label: 'Nutrition Science', category: 'nutrition' },

  // Sleep & Recovery
  { id: 'sleep-improvement', label: 'Sleep Improvement', category: 'sleep' },
  { id: 'sleep-tracking', label: 'Sleep Tracking', category: 'sleep' },
  { id: 'recovery', label: 'Active Recovery', category: 'sleep' },
  { id: 'rest-days', label: 'Rest Days', category: 'sleep' },

  // Social & Connection
  { id: 'community', label: 'Community', category: 'social' },
  { id: 'accountability', label: 'Accountability Partners', category: 'social' },
  { id: 'group-fitness', label: 'Group Fitness', category: 'social' },
  { id: 'outdoor-activities', label: 'Outdoor Activities', category: 'social' },

  // Personal Growth
  { id: 'habit-building', label: 'Habit Building', category: 'growth' },
  { id: 'goal-setting', label: 'Goal Setting', category: 'growth' },
  { id: 'productivity', label: 'Productivity', category: 'growth' },
  { id: 'self-improvement', label: 'Self Improvement', category: 'growth' },
  { id: 'reading', label: 'Reading', category: 'growth' },
  { id: 'learning', label: 'Continuous Learning', category: 'growth' },
] as const;

// Wellness goal categories
export const WELLNESS_GOALS = [
  // Physical Goals
  { id: 'lose-weight', label: 'Lose Weight', category: 'physical' },
  { id: 'build-muscle', label: 'Build Muscle', category: 'physical' },
  { id: 'improve-fitness', label: 'Improve Fitness', category: 'physical' },
  { id: 'run-5k', label: 'Run a 5K', category: 'physical' },
  { id: 'run-marathon', label: 'Run a Marathon', category: 'physical' },
  { id: 'flexibility', label: 'Improve Flexibility', category: 'physical' },
  { id: 'energy-levels', label: 'Increase Energy', category: 'physical' },

  // Mental Goals
  { id: 'reduce-stress', label: 'Reduce Stress', category: 'mental' },
  { id: 'improve-focus', label: 'Improve Focus', category: 'mental' },
  { id: 'better-sleep', label: 'Sleep Better', category: 'mental' },
  { id: 'anxiety-management', label: 'Manage Anxiety', category: 'mental' },
  { id: 'mindfulness-practice', label: 'Daily Mindfulness', category: 'mental' },
  { id: 'work-life-balance', label: 'Work-Life Balance', category: 'mental' },

  // Habit Goals
  { id: 'morning-routine', label: 'Morning Routine', category: 'habits' },
  { id: 'exercise-habit', label: 'Exercise Regularly', category: 'habits' },
  { id: 'meditation-habit', label: 'Meditate Daily', category: 'habits' },
  { id: 'journaling-habit', label: 'Daily Journaling', category: 'habits' },
  { id: 'hydration-habit', label: 'Drink More Water', category: 'habits' },
  { id: 'screen-time', label: 'Reduce Screen Time', category: 'habits' },

  // Lifestyle Goals
  { id: 'healthier-lifestyle', label: 'Healthier Lifestyle', category: 'lifestyle' },
  { id: 'quit-smoking', label: 'Quit Smoking', category: 'lifestyle' },
  { id: 'reduce-alcohol', label: 'Reduce Alcohol', category: 'lifestyle' },
  { id: 'clean-eating', label: 'Eat Cleaner', category: 'lifestyle' },
] as const;

// Interest categories for grouping in UI
export const INTEREST_CATEGORIES = [
  { id: 'mind', label: 'Mind & Mental Health', icon: 'brain' },
  { id: 'fitness', label: 'Physical Fitness', icon: 'run' },
  { id: 'nutrition', label: 'Nutrition', icon: 'food-apple' },
  { id: 'sleep', label: 'Sleep & Recovery', icon: 'sleep' },
  { id: 'social', label: 'Social & Connection', icon: 'account-group' },
  { id: 'growth', label: 'Personal Growth', icon: 'trending-up' },
] as const;

// Goal categories for grouping in UI
export const GOAL_CATEGORIES = [
  { id: 'physical', label: 'Physical Goals', icon: 'weight-lifter' },
  { id: 'mental', label: 'Mental Goals', icon: 'head-heart' },
  { id: 'habits', label: 'Habit Goals', icon: 'calendar-check' },
  { id: 'lifestyle', label: 'Lifestyle Goals', icon: 'heart-pulse' },
] as const;

// Type exports
export type WellnessInterest = typeof WELLNESS_INTERESTS[number];
export type WellnessGoal = typeof WELLNESS_GOALS[number];
export type InterestCategory = typeof INTEREST_CATEGORIES[number];
export type GoalCategory = typeof GOAL_CATEGORIES[number];

// Helper functions
export const getInterestById = (id: string): WellnessInterest | undefined =>
  WELLNESS_INTERESTS.find((interest) => interest.id === id);

export const getGoalById = (id: string): WellnessGoal | undefined =>
  WELLNESS_GOALS.find((goal) => goal.id === id);

export const getInterestsByCategory = (category: string): WellnessInterest[] =>
  WELLNESS_INTERESTS.filter((interest) => interest.category === category);

export const getGoalsByCategory = (category: string): WellnessGoal[] =>
  WELLNESS_GOALS.filter((goal) => goal.category === category);

// Get labels from an array of interest IDs
export const getInterestLabels = (ids: string[]): string[] =>
  ids.map((id) => getInterestById(id)?.label || id);

// Get labels from an array of goal IDs
export const getGoalLabels = (ids: string[]): string[] =>
  ids.map((id) => getGoalById(id)?.label || id);

/**
 * Habit Categories
 * Standardized list of habit categories used across the app
 */

export const HABIT_CATEGORIES = [
  'Health',
  'Fitness',
  'Mindfulness',
  'Sleep',
  'Nutrition',
  'Productivity',
  'Learning',
  'Social',
  'Creativity',
  'Self-Care',
] as const;

export type HabitCategory = typeof HABIT_CATEGORIES[number];

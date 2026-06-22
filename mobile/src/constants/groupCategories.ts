/**
 * Group Categories
 * Defines categories for community groups with icons and colors
 */

import { GroupCategory } from '../types/models';

export interface GroupCategoryConfig {
  key: GroupCategory;
  label: string;
  icon: string; // MaterialCommunityIcons name
  color: string;
  description: string;
}

export const GROUP_CATEGORIES: Record<GroupCategory, GroupCategoryConfig> = {
  fitness: {
    key: 'fitness',
    label: 'Fitness',
    icon: 'dumbbell',
    color: '#1B5E57',
    description: 'Exercise, workouts, and physical activity',
  },
  mindfulness: {
    key: 'mindfulness',
    label: 'Mindfulness',
    icon: 'meditation',
    color: '#1B5E57',
    description: 'Meditation, breathwork, and mental clarity',
  },
  nutrition: {
    key: 'nutrition',
    label: 'Nutrition',
    icon: 'food-apple',
    color: '#1B5E57',
    description: 'Healthy eating, recipes, and diet',
  },
  sleep: {
    key: 'sleep',
    label: 'Sleep',
    icon: 'moon-waning-crescent',
    color: '#1B5E57',
    description: 'Sleep habits and better rest',
  },
  'mental-health': {
    key: 'mental-health',
    label: 'Mental Health',
    icon: 'head-heart',
    color: '#1B5E57',
    description: 'Emotional wellness and mental health support',
  },
  productivity: {
    key: 'productivity',
    label: 'Productivity',
    icon: 'rocket-launch',
    color: '#1B5E57',
    description: 'Goals, habits, and getting things done',
  },
  social: {
    key: 'social',
    label: 'Social',
    icon: 'account-group',
    color: '#1B5E57',
    description: 'Connection, community, and relationships',
  },
  learning: {
    key: 'learning',
    label: 'Learning',
    icon: 'book-open-variant',
    color: '#1B5E57',
    description: 'Personal growth and skill development',
  },
  other: {
    key: 'other',
    label: 'Other',
    icon: 'dots-horizontal-circle',
    color: '#1B5E57',
    description: 'General wellness topics',
  },
};

export const GROUP_CATEGORY_LIST = Object.values(GROUP_CATEGORIES);

export const getGroupCategory = (category?: GroupCategory | string): GroupCategoryConfig => {
  if (!category) return GROUP_CATEGORIES.other;
  const key = category as GroupCategory;
  return GROUP_CATEGORIES[key] || GROUP_CATEGORIES.other;
};

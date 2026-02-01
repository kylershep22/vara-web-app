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
    color: '#E74C3C',
    description: 'Exercise, workouts, and physical activity',
  },
  mindfulness: {
    key: 'mindfulness',
    label: 'Mindfulness',
    icon: 'meditation',
    color: '#9B59B6',
    description: 'Meditation, breathwork, and mental clarity',
  },
  nutrition: {
    key: 'nutrition',
    label: 'Nutrition',
    icon: 'food-apple',
    color: '#27AE60',
    description: 'Healthy eating, recipes, and diet',
  },
  sleep: {
    key: 'sleep',
    label: 'Sleep',
    icon: 'moon-waning-crescent',
    color: '#3498DB',
    description: 'Sleep habits and rest optimization',
  },
  'mental-health': {
    key: 'mental-health',
    label: 'Mental Health',
    icon: 'head-heart',
    color: '#1ABC9C',
    description: 'Emotional wellness and mental health support',
  },
  productivity: {
    key: 'productivity',
    label: 'Productivity',
    icon: 'rocket-launch',
    color: '#F39C12',
    description: 'Goals, habits, and getting things done',
  },
  social: {
    key: 'social',
    label: 'Social',
    icon: 'account-group',
    color: '#E91E63',
    description: 'Connection, community, and relationships',
  },
  learning: {
    key: 'learning',
    label: 'Learning',
    icon: 'book-open-variant',
    color: '#00BCD4',
    description: 'Personal growth and skill development',
  },
  other: {
    key: 'other',
    label: 'Other',
    icon: 'dots-horizontal-circle',
    color: '#95A5A6',
    description: 'General wellness topics',
  },
};

export const GROUP_CATEGORY_LIST = Object.values(GROUP_CATEGORIES);

export const getGroupCategory = (category?: GroupCategory | string): GroupCategoryConfig => {
  if (!category) return GROUP_CATEGORIES.other;
  const key = category as GroupCategory;
  return GROUP_CATEGORIES[key] || GROUP_CATEGORIES.other;
};

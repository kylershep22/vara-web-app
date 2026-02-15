/**
 * Activity Library
 * Pre-populated activity templates for routines
 */

import { Activity, RoutineType } from '../services/firebase/routines.service';

export interface ActivityTemplate {
  name: string;
  duration: number;
  icon: string;
  color: string;
}

/**
 * Morning routine activities
 */
export const MORNING_ACTIVITIES: ActivityTemplate[] = [
  { name: 'Meditation', duration: 10, icon: 'meditation', color: 'purple' },
  { name: 'Exercise', duration: 30, icon: 'dumbbell', color: 'green' },
  { name: 'Journaling', duration: 15, icon: 'book-open-outline', color: 'blue' },
  { name: 'Breakfast', duration: 20, icon: 'coffee', color: 'orange' },
  { name: 'Reading', duration: 20, icon: 'book', color: 'indigo' },
  { name: 'Gratitude Practice', duration: 5, icon: 'heart', color: 'red' },
  { name: 'Hydration', duration: 2, icon: 'water', color: 'cyan' },
  { name: 'Cold Shower', duration: 5, icon: 'shower', color: 'blue' },
  { name: 'Stretching', duration: 10, icon: 'yoga', color: 'green' },
  { name: 'Goal Review', duration: 10, icon: 'checkbox-marked-circle', color: 'teal' },
  { name: 'Affirmations', duration: 5, icon: 'comment-text', color: 'purple' },
  { name: 'Fresh Air', duration: 5, icon: 'weather-sunny', color: 'yellow' },
];

/**
 * Bedtime routine activities
 */
export const BEDTIME_ACTIVITIES: ActivityTemplate[] = [
  { name: 'Dim Lights', duration: 5, icon: 'brightness-6', color: 'orange' },
  { name: 'Phone to DND', duration: 1, icon: 'cellphone-off', color: 'gray' },
  { name: 'Meditation/Breathwork', duration: 10, icon: 'meditation', color: 'purple' },
  { name: 'Gratitude Journal', duration: 10, icon: 'notebook', color: 'blue' },
  { name: 'Read Book', duration: 20, icon: 'book-open', color: 'indigo' },
  { name: 'Stretching', duration: 10, icon: 'yoga', color: 'green' },
  { name: 'Herbal Tea', duration: 10, icon: 'tea', color: 'brown' },
  { name: 'Sleep Sounds', duration: 2, icon: 'music-note', color: 'purple' },
  { name: 'Cool Room (65-68°F)', duration: 2, icon: 'thermometer', color: 'blue' },
  { name: 'Eye Mask/Earplugs', duration: 2, icon: 'sleep', color: 'indigo' },
  { name: 'No Screens 1hr Before', duration: 60, icon: 'monitor-off', color: 'red' },
  { name: 'Skincare Routine', duration: 10, icon: 'face-woman', color: 'pink' },
];

/**
 * Evening routine activities
 */
export const EVENING_ACTIVITIES: ActivityTemplate[] = [
  { name: 'Evening Walk', duration: 20, icon: 'walk', color: 'green' },
  { name: 'Dinner', duration: 30, icon: 'food', color: 'orange' },
  { name: 'Reading', duration: 30, icon: 'book', color: 'blue' },
  { name: 'Meditation', duration: 15, icon: 'meditation', color: 'purple' },
  { name: 'Journaling', duration: 15, icon: 'notebook', color: 'indigo' },
  { name: 'Relaxing Music', duration: 20, icon: 'music', color: 'purple' },
  { name: 'Skincare', duration: 10, icon: 'face-woman', color: 'pink' },
  { name: 'Plan Tomorrow', duration: 10, icon: 'calendar-check', color: 'teal' },
  { name: 'No Screens', duration: 30, icon: 'monitor-off', color: 'red' },
  { name: 'Gratitude Practice', duration: 5, icon: 'heart', color: 'red' },
];

/**
 * Sunday routine activities
 */
export const SUNDAY_ACTIVITIES: ActivityTemplate[] = [
  { name: 'Week Review', duration: 30, icon: 'calendar-month', color: 'blue' },
  { name: 'Goal Setting', duration: 30, icon: 'flag', color: 'teal' },
  { name: 'Meal Planning', duration: 20, icon: 'food-variant', color: 'orange' },
  { name: 'Meal Prep', duration: 60, icon: 'chef-hat', color: 'green' },
  { name: 'Laundry/Cleaning', duration: 60, icon: 'washing-machine', color: 'gray' },
  { name: 'Social Connection', duration: 60, icon: 'account-group', color: 'purple' },
  { name: 'Deep Work Block', duration: 120, icon: 'laptop', color: 'indigo' },
  { name: 'Learning Time', duration: 60, icon: 'school', color: 'blue' },
  { name: 'Relaxation', duration: 30, icon: 'spa', color: 'green' },
];

/**
 * Custom routine activities (formerly Sunday)
 * More flexible activities for any custom routine
 */
export const CUSTOM_ACTIVITIES: ActivityTemplate[] = [
  ...SUNDAY_ACTIVITIES,
  // Additional custom-friendly activities
  { name: 'Creative Time', duration: 45, icon: 'palette', color: 'purple' },
  { name: 'Learning Session', duration: 30, icon: 'lightbulb', color: 'yellow' },
  { name: 'Hobby Time', duration: 60, icon: 'puzzle', color: 'green' },
];

/**
 * Get activities for a specific routine type
 */
export function getActivitiesForType(type: RoutineType | 'custom'): ActivityTemplate[] {
  switch (type) {
    case 'morning':
      return MORNING_ACTIVITIES;
    case 'bedtime':
      return BEDTIME_ACTIVITIES;
    case 'evening':
      return EVENING_ACTIVITIES;
    case 'sunday':
    case 'custom':
      return CUSTOM_ACTIVITIES;
    default:
      return [];
  }
}

/**
 * Get display name for routine type
 */
export function getRoutineTypeDisplayName(type: RoutineType | 'custom'): string {
  switch (type) {
    case 'morning':
      return 'Morning';
    case 'bedtime':
      return 'Bedtime';
    case 'evening':
      return 'Evening';
    case 'sunday':
      return 'Sunday'; // Legacy support
    case 'custom':
      return 'Custom';
    default:
      return '';
  }
}

/**
 * Get description for routine type
 */
export function getRoutineTypeDescription(type: RoutineType | 'custom'): string {
  switch (type) {
    case 'morning':
      return 'Start your day with intention and energy';
    case 'bedtime':
      return 'Wind down and prepare for restful sleep';
    case 'evening':
      return 'Transition from work to relaxation';
    case 'sunday':
      return 'Plan and prepare for the week ahead'; // Legacy support
    case 'custom':
      return 'Create a routine for this time of day—whenever you\'re ready.';
    default:
      return '';
  }
}

/**
 * Get icon for routine type
 */
export function getRoutineTypeIcon(type: RoutineType | 'custom'): string {
  switch (type) {
    case 'morning':
      return 'white-balance-sunny';
    case 'bedtime':
      return 'moon-waning-crescent';
    case 'evening':
      return 'weather-sunset';
    case 'sunday':
      return 'calendar-week'; // Legacy support
    case 'custom':
      return 'calendar';
    default:
      return 'calendar';
  }
}

/**
 * Create an activity from a template
 */
export function createActivityFromTemplate(
  template: ActivityTemplate,
  order: number
): Activity {
  return {
    id: Date.now() + order, // Simple unique ID
    name: template.name,
    duration: template.duration,
    order,
    icon: template.icon,
    color: template.color,
  };
}

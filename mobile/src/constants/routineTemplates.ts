/**
 * Routine Templates
 * Curated best-practice routines users can apply with one tap
 */

import { Activity } from '../services/firebase/routines.service';

export interface RoutineTemplate {
  id: string;
  name: string;
  description: string;
  type: 'morning' | 'evening' | 'custom';
  activities: Omit<Activity, 'id' | 'order'>[];
  totalMinutes: number;
}

function buildActivities(
  items: { name: string; duration: number; icon: string; color: string }[]
): Omit<Activity, 'id' | 'order'>[] {
  return items.map((item) => ({
    name: item.name,
    duration: item.duration,
    icon: item.icon,
    color: item.color,
  }));
}

export const MORNING_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'morning-essentials',
    name: 'The Essentials',
    description: 'For people who hit snooze twice and need a fast start',
    type: 'morning',
    totalMinutes: 10,
    activities: buildActivities([
      { name: 'Hydration', duration: 1, icon: 'water', color: 'cyan' },
      { name: 'Stretching', duration: 3, icon: 'yoga', color: 'green' },
      { name: 'Intention Setting', duration: 3, icon: 'lightbulb', color: 'yellow' },
      { name: 'Breakfast', duration: 3, icon: 'coffee', color: 'orange' },
    ]),
  },
  {
    id: 'morning-energize',
    name: 'Energize & Focus',
    description: 'For people who want to own their morning before the day owns them',
    type: 'morning',
    totalMinutes: 25,
    activities: buildActivities([
      { name: 'Hydration', duration: 1, icon: 'water', color: 'cyan' },
      { name: 'Movement / Exercise', duration: 10, icon: 'dumbbell', color: 'green' },
      { name: 'Breathwork', duration: 3, icon: 'meditation', color: 'purple' },
      { name: 'Journaling', duration: 5, icon: 'book-open-outline', color: 'blue' },
      { name: 'Goal Review', duration: 3, icon: 'checkbox-marked-circle', color: 'teal' },
      { name: 'Breakfast', duration: 3, icon: 'coffee', color: 'orange' },
    ]),
  },
  {
    id: 'morning-mindful',
    name: 'Mindful Morning',
    description: 'For people who want calm clarity before the noise starts',
    type: 'morning',
    totalMinutes: 20,
    activities: buildActivities([
      { name: 'Hydration', duration: 1, icon: 'water', color: 'cyan' },
      { name: 'Meditation', duration: 5, icon: 'meditation', color: 'purple' },
      { name: 'Gratitude Practice', duration: 3, icon: 'heart', color: 'red' },
      { name: 'Journaling', duration: 5, icon: 'book-open-outline', color: 'blue' },
      { name: 'Fresh Air', duration: 6, icon: 'weather-sunny', color: 'yellow' },
    ]),
  },
];

export const EVENING_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'evening-quick',
    name: 'Quick Wind-Down',
    description: "For people who just need to signal their brain it's time to stop",
    type: 'evening',
    totalMinutes: 10,
    activities: buildActivities([
      { name: 'Phone to DND', duration: 1, icon: 'cellphone-off', color: 'gray' },
      { name: 'Breathwork', duration: 4, icon: 'meditation', color: 'purple' },
      { name: 'Gratitude Journal', duration: 5, icon: 'notebook', color: 'blue' },
    ]),
  },
  {
    id: 'evening-full-reset',
    name: 'Full Reset',
    description: "For people who carry the day's stress into the night",
    type: 'evening',
    totalMinutes: 25,
    activities: buildActivities([
      { name: 'Dim Lights', duration: 1, icon: 'brightness-6', color: 'orange' },
      { name: 'Phone to DND', duration: 1, icon: 'cellphone-off', color: 'gray' },
      { name: 'Stretching', duration: 5, icon: 'yoga', color: 'green' },
      { name: 'Gratitude Journal', duration: 5, icon: 'notebook', color: 'blue' },
      { name: 'Reading', duration: 13, icon: 'book-open', color: 'indigo' },
    ]),
  },
  {
    id: 'evening-sleep-optimizer',
    name: 'Sleep Wind-Down',
    description: 'For people who struggle to fall or stay asleep',
    type: 'evening',
    totalMinutes: 20,
    activities: buildActivities([
      { name: 'No Screens', duration: 1, icon: 'monitor-off', color: 'red' },
      { name: 'Cool Room', duration: 1, icon: 'thermometer', color: 'blue' },
      { name: 'Herbal Tea', duration: 3, icon: 'tea', color: 'brown' },
      { name: 'Meditation / Breathwork', duration: 5, icon: 'meditation', color: 'purple' },
      { name: 'Sleep Sounds', duration: 10, icon: 'music-note', color: 'purple' },
    ]),
  },
];

export const SUNDAY_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'sunday-weekly-reset',
    name: 'Weekly Reset',
    description: 'For people who want to start Monday feeling prepared, not behind',
    type: 'custom',
    totalMinutes: 30,
    activities: buildActivities([
      { name: 'Week Review', duration: 5, icon: 'calendar-month', color: 'blue' },
      { name: 'Goal Setting', duration: 5, icon: 'flag', color: 'teal' },
      { name: 'Meal Planning', duration: 10, icon: 'food-variant', color: 'orange' },
      { name: 'Learning Time', duration: 5, icon: 'school', color: 'blue' },
      { name: 'Relaxation', duration: 5, icon: 'spa', color: 'green' },
    ]),
  },
  {
    id: 'sunday-recharge',
    name: 'Recharge Day',
    description: 'For people who need permission to slow down',
    type: 'custom',
    totalMinutes: 25,
    activities: buildActivities([
      { name: 'Gratitude Practice', duration: 5, icon: 'heart', color: 'red' },
      { name: 'Creative Time', duration: 10, icon: 'palette', color: 'purple' },
      { name: 'Social Connection', duration: 5, icon: 'account-group', color: 'purple' },
      { name: 'Relaxation', duration: 5, icon: 'spa', color: 'green' },
    ]),
  },
];

/**
 * Get templates for a given TimeOfDay selection
 */
export function getTemplatesForType(timeOfDay: string): RoutineTemplate[] {
  switch (timeOfDay) {
    case 'morning':
      return MORNING_TEMPLATES;
    case 'evening':
      return EVENING_TEMPLATES;
    case 'sunday':
      return SUNDAY_TEMPLATES;
    case 'custom':
      return [];
    default:
      return [];
  }
}

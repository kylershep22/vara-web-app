/**
 * Journal Tags Constants
 * Predefined tags for journal entries to maintain consistency
 */

export const JOURNAL_TAGS = [
  // Time of day
  { value: 'morning', label: 'Morning' },
  { value: 'afternoon', label: 'Afternoon' },
  { value: 'evening', label: 'Evening' },

  // Activities
  { value: 'movement', label: 'Movement' },
  { value: 'meditation', label: 'Meditation' },
  { value: 'breathwork', label: 'Breathwork' },
  { value: 'sleep', label: 'Sleep' },
  { value: 'exercise', label: 'Exercise' },
  { value: 'nature', label: 'Nature' },

  // Life areas
  { value: 'work', label: 'Work' },
  { value: 'relationships', label: 'Relationships' },
  { value: 'family', label: 'Family' },
  { value: 'health', label: 'Health' },
  { value: 'creativity', label: 'Creativity' },
  { value: 'learning', label: 'Learning' },

  // Reflection types
  { value: 'reflection', label: 'Reflection' },
  { value: 'gratitude', label: 'Gratitude' },
  { value: 'growth', label: 'Growth' },
  { value: 'challenge', label: 'Challenge' },
  { value: 'win', label: 'Win' },
  { value: 'insight', label: 'Insight' },

  // Emotional
  { value: 'stress', label: 'Stress' },
  { value: 'calm', label: 'Calm' },
  { value: 'energy', label: 'Energy' },
  { value: 'focus', label: 'Focus' },
];

// Filter chips to show (subset of all tags)
export const JOURNAL_FILTER_CHIPS = [
  'morning',
  'evening',
  'reflection',
  'gratitude',
  'work',
  'movement',
  'growth',
  'stress',
];

/**
 * Mood Configuration
 * Gradient-based mood visualization system
 */
export const MOOD_CONFIG = {
  great: {
    gradient: ['#F4C542', '#F5B971'],
    label: 'Great',
    borderColor: '#F4C542',
  },
  good: {
    gradient: ['#B8CDBA', '#D5E3D1'],
    label: 'Good',
    borderColor: '#B8CDBA',
  },
  okay: {
    gradient: ['#D5E3D1', '#E8EFE6'],
    label: 'Okay',
    borderColor: '#D5E3D1',
  },
  neutral: {
    gradient: ['#D5E3D1', '#E8EFE6'],
    label: 'Okay',
    borderColor: '#D5E3D1',
  },
  low: {
    gradient: ['#A8C4C0', '#B8CDBA'],
    label: 'Low',
    borderColor: '#A8C4C0',
  },
  bad: {
    gradient: ['#A8C4C0', '#B8CDBA'],
    label: 'Low',
    borderColor: '#A8C4C0',
  },
  difficult: {
    gradient: ['#8BA9A5', '#A8C4C0'],
    label: 'Difficult',
    borderColor: '#8BA9A5',
  },
  terrible: {
    gradient: ['#8BA9A5', '#A8C4C0'],
    label: 'Difficult',
    borderColor: '#8BA9A5',
  },
};

export type MoodValue = keyof typeof MOOD_CONFIG;

export const getMoodConfig = (mood: string) => {
  return MOOD_CONFIG[mood as MoodValue] || MOOD_CONFIG.okay;
};

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
  'Connection',
  'Creativity',
  'Self-Care',
  'Brain Health',
] as const;

export type HabitCategory = typeof HABIT_CATEGORIES[number];

/**
 * Cognitive Reserve flag per category.
 * Habits in CR-flagged categories contribute to long-term brain resilience.
 */
export const COGNITIVE_RESERVE_CATEGORIES: Record<string, boolean> = {
  Health: false,
  Fitness: true,
  Mindfulness: false,
  Sleep: true,
  Nutrition: false,
  Productivity: false,
  Learning: true,
  Social: false,
  Connection: true,
  Creativity: true,
  'Self-Care': false,
  'Brain Health': true,
};

/**
 * Returns true if the given category is flagged for cognitive reserve.
 */
export function isCognitiveReserveCategory(category: string | undefined): boolean {
  if (!category) return false;
  return COGNITIVE_RESERVE_CATEGORIES[category] === true;
}

/**
 * CR callout content shown when a CR category is selected in the habit wizard.
 */
export const CR_CALLOUT_CONTENT: Record<string, { headline: string; body: string }> = {
  Connection: {
    headline: 'This habit supports brain health through connection',
    body: 'Meaningful connection triggers oxytocin — a natural stress buffer that protects long-term brain health.',
  },
  'Brain Health': {
    headline: 'This habit directly builds cognitive reserve',
    body: 'Brain health habits build cognitive reserve — your brain\'s buffer against stress and aging.',
  },
  Fitness: {
    headline: 'This habit builds cognitive reserve through movement',
    body: 'Physical activity releases BDNF — a protein that supports new neural connections and long-term brain resilience.',
  },
  Learning: {
    headline: 'This habit builds cognitive reserve through novelty',
    body: 'Learning new things creates neuroplastic pathways that strengthen your brain\'s long-term resilience.',
  },
  Sleep: {
    headline: 'This habit builds cognitive reserve through recovery',
    body: 'Deep sleep activates the brain\'s glymphatic system, clearing metabolic waste that accumulates during the day.',
  },
  Creativity: {
    headline: 'This habit builds cognitive reserve through creative practice',
    body: 'Creative activity activates cross-hemispheric connections. Even short sessions contribute to long-term brain resilience.',
  },
};

/** Fallback CR callout for categories without specific content. */
export const CR_CALLOUT_FALLBACK = {
  headline: 'This category builds cognitive reserve',
  body: 'Habits in this category support neuroplasticity and long-term brain resilience.',
};

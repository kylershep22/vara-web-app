/**
 * Habit Categories — ported from mobile/src/constants/habitCategories.ts
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
];

const COGNITIVE_RESERVE_CATEGORIES = {
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

export function isCognitiveReserveCategory(category) {
  if (!category) return false;
  return COGNITIVE_RESERVE_CATEGORIES[category] === true;
}

export const CR_CALLOUT_CONTENT = {
  Connection: {
    headline: 'This habit supports brain health through connection',
    body: 'Meaningful connection triggers oxytocin — a natural stress buffer that protects long-term brain health.',
  },
  'Brain Health': {
    headline: 'This habit directly builds cognitive reserve',
    body: "Brain health habits build cognitive reserve — your brain's buffer against stress and aging.",
  },
  Fitness: {
    headline: 'This habit builds cognitive reserve through movement',
    body: 'Physical activity releases BDNF — a protein that supports new neural connections and long-term brain resilience.',
  },
  Learning: {
    headline: 'This habit builds cognitive reserve through novelty',
    body: "Learning new things create neuroplastic pathways that strengthen your brain's long-term resilience.",
  },
  Sleep: {
    headline: 'This habit builds cognitive reserve through recovery',
    body: "Deep sleep activates the brain's glymphatic system, clearing metabolic waste that accumulates during the day.",
  },
  Creativity: {
    headline: 'This habit builds cognitive reserve through creative practice',
    body: 'Creative activity activates cross-hemispheric connections. Even short sessions contribute to long-term brain resilience.',
  },
};

export const CR_CALLOUT_FALLBACK = {
  headline: 'This category builds cognitive reserve',
  body: 'Habits in this category support neuroplasticity and long-term brain resilience.',
};

export function getCRCallout(category) {
  if (!isCognitiveReserveCategory(category)) return null;
  return CR_CALLOUT_CONTENT[category] || CR_CALLOUT_FALLBACK;
}

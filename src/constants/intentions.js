/**
 * Intention System Constants — ported from mobile/src/constants/intentions.ts
 */

export const INTENTION_OPTIONS = {
  focus_clarity: [
    'Sharpen my focus',
    'Clear mental fog',
    'Stay present and grounded',
  ],
  regulation_recovery: [
    'Manage stress better',
    'Process difficult emotions',
    'Build emotional resilience',
  ],
  sustainable_consistency: [
    'Show up for myself daily',
    'Build a lasting routine',
    'Create healthy momentum',
  ],
  energy_resilience: [
    'Boost my energy levels',
    'Recover from burnout',
    'Sustain energy throughout the day',
  ],
  brain_health: [
    'Build cognitive reserve',
    'Support long-term clarity',
    "Strengthen my brain's resilience",
  ],
};

export const INTENTION_CATEGORY_LABELS = {
  focus_clarity: 'Focus & Clarity',
  regulation_recovery: 'Regulation & Recovery',
  sustainable_consistency: 'Sustainable Consistency',
  energy_resilience: 'Energy & Resilience',
  brain_health: 'Brain Health',
};

export const INTENTION_CATEGORIES = Object.keys(INTENTION_OPTIONS);

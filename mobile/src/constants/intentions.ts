/**
 * Intention System Constants
 * Predefined intentions, category labels, and micro-insights
 */

import { IntentionCategory } from '../types/models';

/**
 * Predefined intention labels organized by category
 * 12 total across 4 categories (3 per category)
 */
export const INTENTION_OPTIONS: Record<IntentionCategory, string[]> = {
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
    'Strengthen my brain\'s resilience',
  ],
};

/**
 * Human-readable category display names
 */
export const INTENTION_CATEGORY_LABELS: Record<IntentionCategory, string> = {
  focus_clarity: 'Focus & Clarity',
  regulation_recovery: 'Regulation & Recovery',
  sustainable_consistency: 'Sustainable Consistency',
  energy_resilience: 'Energy & Resilience',
  brain_health: 'Brain Health',
};

/**
 * Rotating micro-insights per category (4 per category)
 * Used in IntentionHighlightCard on HabitDetailScreen
 * Rotation: dayOfYear % insights.length
 */
export const INTENTION_INSIGHTS: Record<IntentionCategory, string[]> = {
  focus_clarity: [
    'Consistent focus habits strengthen prefrontal cortex pathways over time.',
    'Even 5 minutes of focused practice builds your brain\'s attention networks.',
    'Focus improves not just with effort, but with recovery between sessions.',
    'Your brain\'s clarity peaks when you pair focused work with intentional rest.',
  ],
  regulation_recovery: [
    'Emotional regulation is a skill that strengthens with each mindful repetition.',
    'Recovery isn\'t passive. It\'s an active process your brain gets better at.',
    'Small regulation habits compound into greater emotional flexibility over time.',
    'Your nervous system adapts to the patterns you practice most consistently.',
  ],
  sustainable_consistency: [
    'Consistency rewires your brain\'s default patterns, making habits feel automatic.',
    'The most sustainable habits are the ones you can do even on your hardest days.',
    'Your brain rewards consistency itself. Each completion strengthens the neural loop.',
    'Building momentum matters more than intensity. Show up, and the rest follows.',
  ],
  energy_resilience: [
    'Resilience is built through small, repeated energy management practices.',
    'Your body\'s energy systems adapt to consistent habits within weeks.',
    'Strategic recovery habits are as important as active energy-building ones.',
    'Energy resilience means bouncing back faster, and your habits train that response.',
  ],
  brain_health: [
    'Cognitive reserve is built through consistent, varied mental stimulation.',
    'Your brain\'s resilience grows with every habit that challenges it in new ways.',
    'Long-term brain health depends on the daily habits you build now.',
    'Small daily investments in brain health compound into lasting cognitive strength.',
  ],
};

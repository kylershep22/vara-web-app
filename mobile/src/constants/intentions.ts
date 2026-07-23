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

// INTENTION_INSIGHTS lived here: twenty rotating "micro-insights" rendered on
// the habit detail screen, keyed by intention category. Removed with the detail
// screen rebuild, along with its two consumers (IntentionHighlightCard and
// BrainHealthInsightNote).
//
// They stated mechanisms of brain anatomy as fact — "strengthen prefrontal
// cortex pathways over time", "builds your brain's attention networks",
// "rewires your brain's default patterns" — which Voice & Tone §5 bans outright
// (§4 permits only conditional framing), and they led with brain health, which
// the v2 pivot moved from headline to backbone.
//
// They are NOT replaced by softer claims. The detail screen now shows the
// user's own reason for the habit instead.

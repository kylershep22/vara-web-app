/**
 * Brain Health Translations
 * Plain language by default, scientific terms as optional depth
 *
 * Design Philosophy: Make brain science accessible without dumbing it down.
 * Users can toggle to see scientific terminology if they prefer.
 */

export interface BrainHealthTranslation {
  /** Scientific/technical term */
  scientific: string;
  /** Plain language alternative */
  plain: string;
  /** Brief description for context */
  description: string;
  /** Longer explanation for "learn more" */
  learnMore?: string;
}

/**
 * Component name translations
 */
export const BRAIN_HEALTH_TRANSLATIONS: Record<string, BrainHealthTranslation> = {
  // AMCC Challenge Card
  amccChallenge: {
    scientific: 'AMCC Challenge',
    plain: 'Do One Hard Thing',
    description: 'Building mental resilience through daily challenges',
    learnMore: 'The Anterior Mid-Cingulate Cortex (AMCC) is a brain region that grows when you do difficult things. Research shows that regularly pushing through discomfort builds willpower and resilience.',
  },

  // Neuroplasticity Tracker
  neuroplasticity: {
    scientific: 'Neuroplasticity Tracker',
    plain: 'Try Something New',
    description: 'Your brain grows when you step outside your comfort zone',
    learnMore: 'Neuroplasticity is your brain\'s ability to form new neural connections throughout life. Learning new skills, trying unfamiliar activities, and stepping outside your routine all strengthen your brain.',
  },

  // Nervous System Tools
  nervousSystem: {
    scientific: 'Nervous System Tools',
    plain: 'Calm Your Mind',
    description: 'Techniques to help you feel centered and relaxed',
    learnMore: 'Your autonomic nervous system controls your stress response. These tools help shift from "fight or flight" to "rest and digest" mode, reducing anxiety and improving focus.',
  },

  // Physiological Sigh (sub-tool)
  physiologicalSigh: {
    scientific: 'Physiological Sigh',
    plain: 'Double Breath Reset',
    description: 'A quick breathing technique to calm down fast',
    learnMore: 'Research from Stanford shows that a double inhale followed by a long exhale is the fastest way to reduce stress. It resets your nervous system in about 30 seconds.',
  },

  // Panoramic Vision (sub-tool)
  panoramicVision: {
    scientific: 'Panoramic Vision',
    plain: 'Wide Gaze Calm',
    description: 'Widen your visual field to reduce stress',
    learnMore: 'When stressed, we tend to have tunnel vision. Deliberately expanding your visual field to peripheral vision activates the parasympathetic nervous system, naturally calming you down.',
  },

  // Brain Readiness Widget
  brainReadiness: {
    scientific: 'Brain Readiness Score',
    plain: 'How Fresh Is Your Mind?',
    description: 'A quick check-in on your mental state',
    learnMore: 'Your brain readiness combines sleep quality, hydration, and stress levels - the three biggest factors affecting cognitive performance. Higher scores mean better focus, memory, and decision-making.',
  },

  // Focus Window Indicator
  focusWindow: {
    scientific: 'Circadian Focus Windows',
    plain: 'Your Best Hours',
    description: 'When your brain is naturally most alert',
    learnMore: 'Your circadian rhythm creates natural peaks and dips in alertness. Most people have peak focus 90-180 minutes after waking. Scheduling important work during this window improves productivity.',
  },

  // Weekly Brain Metrics
  weeklyMetrics: {
    scientific: 'Weekly Brain Metrics',
    plain: 'Your Week in Review',
    description: 'How your brain health trended this week',
    learnMore: 'Tracking your brain health over time reveals patterns. You might notice that certain habits improve your scores, helping you understand what works best for your unique brain.',
  },

  // AI Brain Insight
  aiBrainInsight: {
    scientific: 'AI Brain Insight',
    plain: 'Today\'s Brain Tip',
    description: 'Personalized suggestions for your brain health',
    learnMore: 'These insights are generated based on your recent activity and brain health scores, offering actionable suggestions tailored to your current state.',
  },
};

/**
 * Input field label translations
 */
export const INPUT_LABEL_TRANSLATIONS: Record<string, BrainHealthTranslation> = {
  sleepQuality: {
    scientific: 'Sleep Quality (1-5)',
    plain: 'How well did you sleep?',
    description: 'Rate your sleep from 1 (poor) to 5 (great)',
  },
  hydrationLevel: {
    scientific: 'Hydration Level (1-5)',
    plain: 'How hydrated do you feel?',
    description: 'Rate your hydration from 1 (dehydrated) to 5 (well-hydrated)',
  },
  stressLevel: {
    scientific: 'Stress Level (1-5)',
    plain: 'How stressed are you?',
    description: 'Rate your stress from 1 (calm) to 5 (very stressed)',
  },
  readinessScore: {
    scientific: 'Readiness Score',
    plain: 'Mind Freshness',
    description: 'Overall score based on sleep, hydration, and stress',
  },
};

/**
 * Action/button translations
 */
export const ACTION_TRANSLATIONS: Record<string, { scientific: string; plain: string }> = {
  completeChallenge: {
    scientific: 'Log AMCC Challenge',
    plain: 'I Did Something Hard',
  },
  logNeuroplasticity: {
    scientific: 'Log Neuroplasticity Signal',
    plain: 'I Tried Something New',
  },
  startBreathing: {
    scientific: 'Start Physiological Sigh',
    plain: 'Start Breathing Exercise',
  },
  startVision: {
    scientific: 'Start Panoramic Vision',
    plain: 'Start Calming Exercise',
  },
  checkIn: {
    scientific: 'Submit Brain Metrics',
    plain: 'Log How I Feel',
  },
  setWakeTime: {
    scientific: 'Set Circadian Anchor',
    plain: 'Set Wake Time',
  },
};

/**
 * Helper function to get translation based on user preference
 */
export const getTranslation = (
  key: string,
  showScience: boolean,
  translations: Record<string, BrainHealthTranslation> = BRAIN_HEALTH_TRANSLATIONS
): { title: string; description: string; learnMore?: string } => {
  const translation = translations[key];
  if (!translation) {
    return { title: key, description: '' };
  }

  return {
    title: showScience ? translation.scientific : translation.plain,
    description: translation.description,
    learnMore: translation.learnMore,
  };
};

/**
 * Helper function to get action label based on user preference
 */
export const getActionLabel = (key: string, showScience: boolean): string => {
  const translation = ACTION_TRANSLATIONS[key];
  if (!translation) return key;
  return showScience ? translation.scientific : translation.plain;
};

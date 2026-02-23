/**
 * Onboarding Insights Generator
 * Generates personalized brain-health insights based on check-in data
 *
 * Follows Vara Voice & Tone Rules:
 * - Use conditional language ("can help," "often," "may be")
 * - Never frame anything as a problem or deficit
 * - Always normalize the user's current state
 * - Keep insights to 2-3 sentences maximum
 */

import { BrainPillar } from '../types';
import { OnboardingInsightResult } from '../types/onboarding';

/**
 * Generate a personalized insight based on energy, focus, and mood levels
 *
 * @param energy - User's energy level (1-10)
 * @param focus - User's focus level (1-10)
 * @param mood - User's mood level (1-10)
 * @returns Insight with recommended focus area and explanation
 */
export function generateInsight(
  energy: number,
  focus: number,
  mood: number
): OnboardingInsightResult {
  // High energy, low focus
  if (energy >= 7 && focus <= 4) {
    return {
      text: "Your brain has energy available, but attention feels scattered. This is common when there's a lot competing for your focus. Reducing cognitive load can help that energy find direction.",
      recommendedFocus: 'focus',
      focusExplanation: "Starting with Focus can help you channel your available energy into clearer attention.",
    };
  }

  // Low energy, low mood
  if (energy <= 4 && mood <= 4) {
    return {
      text: "When energy and mood dip together, your brain may be signaling a need for recovery. This isn't a failure — it's useful information. Vara's approach starts with supporting your nervous system.",
      recommendedFocus: 'resilience',
      focusExplanation: "Starting with Resilience gives your brain the recovery support it's asking for right now.",
    };
  }

  // Low energy, high focus
  if (energy <= 4 && focus >= 7) {
    return {
      text: "You're mentally sharp but running on limited fuel. Your brain can sustain this for a while, but supporting your energy helps protect that focus over time.",
      recommendedFocus: 'energy',
      focusExplanation: "Starting with Energy helps sustain the mental clarity you already have.",
    };
  }

  // All high (7+ across the board)
  if (energy >= 7 && focus >= 7 && mood >= 7) {
    return {
      text: "You're in a strong mental state right now — energy, focus, and mood are all elevated. This is a great foundation to build on. Small, consistent practices can help you maintain this more often.",
      recommendedFocus: 'growth',
      focusExplanation: "Starting with Growth helps you build on this strong foundation with new challenges and learning.",
    };
  }

  // All low (4 or below across the board)
  if (energy <= 4 && focus <= 4 && mood <= 4) {
    return {
      text: "Everything feels low right now, and that's okay. Your brain may be dealing with a lot. Vara is designed to meet you exactly where you are — no pressure to perform.",
      recommendedFocus: 'resilience',
      focusExplanation: "Starting with Resilience focuses on what your brain needs most: gentle support and recovery.",
    };
  }

  // Low focus, everything else moderate/high
  if (focus <= 4 && energy >= 5 && mood >= 5) {
    return {
      text: "Your energy and mood are solid, but focus feels harder to access. This often happens when there's too much on your mental plate. Simplifying what your brain has to manage can help.",
      recommendedFocus: 'focus',
      focusExplanation: "Starting with Focus helps reduce the noise so your attention can settle.",
    };
  }

  // Low mood, everything else moderate/high
  if (mood <= 4 && energy >= 5 && focus >= 5) {
    return {
      text: "Your brain is functional but your emotional state is lower. Connection and reflection often help here — not by forcing positivity, but by creating small moments of meaning.",
      recommendedFocus: 'connection',
      focusExplanation: "Starting with Connection supports your emotional wellbeing through reflection and community.",
    };
  }

  // Low energy only (mood and focus are okay)
  if (energy <= 4 && focus >= 5 && mood >= 5) {
    return {
      text: "Your mind and emotions are in a good place, but your body feels depleted. Restoring your physical energy can help everything else stay balanced.",
      recommendedFocus: 'energy',
      focusExplanation: "Starting with Energy helps restore your body so it can match your mental state.",
    };
  }

  // High energy, high focus, lower mood
  if (energy >= 7 && focus >= 7 && mood <= 5) {
    return {
      text: "You have plenty of mental resources available, but emotionally things feel heavier. Sometimes productivity can mask what we're feeling. Taking a moment to connect with yourself or others can help.",
      recommendedFocus: 'connection',
      focusExplanation: "Starting with Connection creates space for emotional awareness alongside your strong mental state.",
    };
  }

  // High mood, lower energy and focus
  if (mood >= 7 && energy <= 5 && focus <= 5) {
    return {
      text: "You're in a positive emotional state even though your mental resources feel limited. This resilience is worth noticing. Building on that positivity while gently restoring energy can be powerful.",
      recommendedFocus: 'energy',
      focusExplanation: "Starting with Energy helps you sustain your positive mood with more physical vitality.",
    };
  }

  // Moderate energy (5-6), low focus
  if (energy >= 5 && energy <= 6 && focus <= 4) {
    return {
      text: "Your energy is stable but your attention feels diffuse. This is a common pattern in our busy world. Small focus practices can make a meaningful difference.",
      recommendedFocus: 'focus',
      focusExplanation: "Starting with Focus helps sharpen your attention without draining your steady energy.",
    };
  }

  // Default: moderate across the board (5-6 range)
  return {
    text: "You're in a balanced state — not maxed out, not depleted. This is a solid foundation. Small, consistent actions tend to work best from here.",
    recommendedFocus: 'focus',
    focusExplanation: "Starting with Focus gives you a practical entry point to build clarity and consistency.",
  };
}

/**
 * Get focus area data for display
 * Maps BrainPillar to user-friendly display information
 */
export function getFocusAreaData(pillar: BrainPillar): {
  title: string;
  subtitle: string;
  icon: string;
} {
  const focusAreas: Record<BrainPillar, { title: string; subtitle: string; icon: string }> = {
    focus: {
      title: 'Focus',
      subtitle: 'Sharpen your mind',
      icon: 'circle-double', // Concentric circles
    },
    energy: {
      title: 'Energy',
      subtitle: 'Restore your vitality',
      icon: 'waves', // Wave/flow
    },
    growth: {
      title: 'Growth',
      subtitle: 'Expand your potential',
      icon: 'sprout', // Sprouting leaf
    },
    resilience: {
      title: 'Resilience',
      subtitle: 'Build inner strength',
      icon: 'shield-outline', // Shield
    },
    connection: {
      title: 'Connection',
      subtitle: 'Strengthen relationships',
      icon: 'account-group-outline', // People
    },
  };

  return focusAreas[pillar];
}

/**
 * Get all focus areas for the bottom sheet
 */
export function getAllFocusAreas(): Array<{
  pillar: BrainPillar;
  title: string;
  subtitle: string;
  icon: string;
}> {
  const pillars: BrainPillar[] = ['focus', 'energy', 'growth', 'resilience', 'connection'];
  return pillars.map(pillar => ({
    pillar,
    ...getFocusAreaData(pillar),
  }));
}

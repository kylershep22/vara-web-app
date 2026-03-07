/**
 * Next Action Recommendation Service
 *
 * Intelligently recommends the single most impactful next action based on:
 * - Wellness score pillars (prioritize improving low-scoring areas)
 * - Time of day (morning routines, focus time, evening wind-down)
 * - User's current progress (habits, tasks, journal, etc.)
 * - Context and recent activity
 *
 * The goal is ONE clear, specific, actionable recommendation - not a list.
 */

import { DailyWellnessScore, Habit, Task, FourThreeTwoOneEntry } from '../types';
import { Colors } from '../constants';

// Time periods for contextual recommendations
type TimePeriod = 'early_morning' | 'morning' | 'midday' | 'afternoon' | 'evening' | 'night';

const getTimePeriod = (): TimePeriod => {
  const hour = new Date().getHours();
  if (hour < 6) return 'early_morning';
  if (hour < 9) return 'morning';
  if (hour < 12) return 'midday';
  if (hour < 17) return 'afternoon';
  if (hour < 21) return 'evening';
  return 'night';
};

// Action types that can be recommended
export type ActionType =
  | 'complete_habit'
  | 'improve_sleep'
  | 'hydrate'
  | 'reduce_stress'
  | 'complete_task'
  | 'journal'
  | 'four_three_two_one'
  | 'nervous_system'
  | 'do_hard_thing'
  | 'connect'
  | 'morning_checkin'
  | 'brain_health'
  | 'celebrate'
  | 'rest';

// The recommended action structure
export interface NextActionRecommendation {
  type: ActionType;
  priority: number; // 1-10, higher = more important
  pillarTarget?: 'foundation' | 'consistency' | 'mind' | 'growth';
  icon: string;
  iconColor: string;
  accentColor: string;
  title: string;
  subtitle: string;
  reason: string; // Why this action is recommended
  actionLabel: string;
  navigationTarget?: string;
  navigationParams?: Record<string, any>;
  metadata?: Record<string, any>;
}

// Context needed for recommendations
export interface RecommendationContext {
  wellnessScore: DailyWellnessScore | null;
  habits: Habit[];
  completedTodayHabits: Set<string>;
  tasks: Task[];
  fourThreeTwoOne: FourThreeTwoOneEntry | null;
  lastJournalDate: Date | null;
  hasMorningCheckIn: boolean;
  hasDailyPlan: boolean;
}


/**
 * Get the lowest scoring pillar that needs attention
 */
const getLowestPillar = (
  score: DailyWellnessScore
): { pillar: 'foundation' | 'consistency' | 'mind' | 'growth'; score: number } | null => {
  if (!score?.pillars) return null;

  const pillars = [
    { pillar: 'foundation' as const, score: score.pillars.foundation.score },
    { pillar: 'consistency' as const, score: score.pillars.consistency.score },
    { pillar: 'mind' as const, score: score.pillars.mind.score },
    { pillar: 'growth' as const, score: score.pillars.growth.score },
  ];

  // Sort by score ascending (lowest first)
  pillars.sort((a, b) => a.score - b.score);

  // Return lowest if it's below 70 (needs attention)
  if (pillars[0].score < 70) {
    return pillars[0];
  }

  return null;
};

/**
 * Get specific component that's dragging a pillar down
 * Prioritizes: missing > negative > neutral
 */
const getWeakestComponent = (
  score: DailyWellnessScore,
  pillar: 'foundation' | 'consistency' | 'mind' | 'growth'
): { name: string; status: string; hasData: boolean; actionRoute?: string; actionLabel?: string } | null => {
  const pillarData = score.pillars[pillar];
  if (!pillarData?.components) return null;

  // First priority: components with no data (missing)
  const missingComponents = pillarData.components.filter(c => c.status === 'missing' || !c.hasData);
  if (missingComponents.length > 0) {
    const comp = missingComponents[0];
    return {
      name: comp.name,
      status: 'missing',
      hasData: false,
      actionRoute: comp.actionRoute,
      actionLabel: comp.actionLabel,
    };
  }

  // Second priority: negative status components
  const negativeComponents = pillarData.components.filter(c => c.status === 'negative');
  if (negativeComponents.length > 0) {
    const comp = negativeComponents[0];
    return {
      name: comp.name,
      status: 'negative',
      hasData: true,
      actionRoute: comp.actionRoute,
      actionLabel: comp.actionLabel,
    };
  }

  // Third priority: neutral status components
  const neutralComponents = pillarData.components.filter(c => c.status === 'neutral');
  if (neutralComponents.length > 0) {
    const comp = neutralComponents[0];
    return {
      name: comp.name,
      status: 'neutral',
      hasData: true,
      actionRoute: comp.actionRoute,
      actionLabel: comp.actionLabel,
    };
  }

  return null;
};

/**
 * Generate foundation pillar recommendations
 */
const getFoundationRecommendation = (
  score: DailyWellnessScore,
  timePeriod: TimePeriod
): NextActionRecommendation | null => {
  const weakComponent = getWeakestComponent(score, 'foundation');
  if (!weakComponent) return null;

  // Handle missing data scenarios with higher priority
  const isMissing = !weakComponent.hasData;

  switch (weakComponent.name) {
    case 'sleepQuality':
      if (isMissing) {
        return {
          type: 'improve_sleep',
          priority: 8,
          pillarTarget: 'foundation',
          icon: 'sleep',
          iconColor: Colors.dewSage,
          accentColor: Colors.dewSage,
          title: 'Log your sleep quality',
          subtitle: 'How well did you sleep last night?',
          reason: 'Track sleep to complete your wellness score',
          actionLabel: 'Log sleep',
          navigationTarget: weakComponent.actionRoute || 'BrainHealth',
        };
      }
      if (timePeriod === 'evening' || timePeriod === 'night') {
        return {
          type: 'improve_sleep',
          priority: 9,
          pillarTarget: 'foundation',
          icon: 'moon-waning-crescent',
          iconColor: Colors.dewSage,
          accentColor: Colors.dewSage,
          title: 'Wind down for better sleep',
          subtitle: 'Start your bedtime routine to improve tomorrow\'s energy.',
          reason: 'Your sleep quality is affecting your wellness score',
          actionLabel: 'Sleep tools',
          navigationTarget: 'Sleep',
        };
      }
      return {
        type: 'improve_sleep',
        priority: 6,
        pillarTarget: 'foundation',
        icon: 'sleep',
        iconColor: Colors.dewSage,
        accentColor: Colors.dewSage,
        title: 'Plan for better sleep tonight',
        subtitle: 'Good sleep starts with an evening routine.',
        reason: 'Sleep quality is your biggest opportunity today',
        actionLabel: 'Learn more',
        navigationTarget: 'Sleep',
      };

    case 'hydration':
      return {
        type: 'hydrate',
        priority: isMissing ? 8 : 7,
        pillarTarget: 'foundation',
        icon: 'cup-water',
        iconColor: Colors.evergreenTeal,
        accentColor: Colors.evergreenTeal,
        title: isMissing ? 'Track your hydration' : 'Time to hydrate',
        subtitle: isMissing
          ? 'Log your water intake to complete your score.'
          : 'Drink a glass of water to boost your energy and focus.',
        reason: isMissing
          ? 'Hydration tracking helps complete your wellness score'
          : 'Hydration directly impacts your wellness score',
        actionLabel: 'Log water',
        navigationTarget: weakComponent.actionRoute || 'BrainHealth',
      };

    case 'stressLevel':
      return {
        type: 'reduce_stress',
        priority: isMissing ? 8 : 8,
        pillarTarget: 'foundation',
        icon: 'meditation',
        iconColor: Colors.dewSage,
        accentColor: Colors.dewSage,
        title: isMissing ? 'Log your stress level' : 'Take a calming moment',
        subtitle: isMissing
          ? 'How stressed are you feeling today?'
          : 'A quick breathing exercise can lower your stress.',
        reason: isMissing
          ? 'Track stress to complete your wellness score'
          : 'Your stress level is higher than usual',
        actionLabel: isMissing ? 'Log stress' : 'Breathe',
        navigationTarget: isMissing ? (weakComponent.actionRoute || 'BrainHealth') : 'Breathwork',
      };
  }

  return null;
};

/**
 * Generate consistency pillar recommendations
 */
const getConsistencyRecommendation = (
  score: DailyWellnessScore,
  context: RecommendationContext
): NextActionRecommendation | null => {
  const { habits, completedTodayHabits, fourThreeTwoOne } = context;
  const weakComponent = getWeakestComponent(score, 'consistency');

  // Check for incomplete habits first
  const incompleteHabits = habits.filter(h => !completedTodayHabits.has(h.id));
  if (incompleteHabits.length > 0) {
    const nextHabit = incompleteHabits[0];
    const habitName = nextHabit.name || 'your habit';

    // If just one habit left, make it feel achievable
    if (incompleteHabits.length === 1) {
      return {
        type: 'complete_habit',
        priority: 9,
        pillarTarget: 'consistency',
        icon: 'check-circle-outline',
        iconColor: Colors.sunriseAmber,
        accentColor: Colors.sunriseAmber,
        title: 'One habit away from 100%',
        subtitle: `Complete "${habitName}" to finish strong today.`,
        reason: 'This will complete all your habits for today',
        actionLabel: 'Do it now',
        navigationTarget: 'Track',
        navigationParams: { tab: 'habits' },
        metadata: { habitId: nextHabit.id, habitName },
      };
    }

    // Multiple habits - suggest starting with the first one
    return {
      type: 'complete_habit',
      priority: 8,
      pillarTarget: 'consistency',
      icon: 'checkbox-marked-circle-outline',
      iconColor: Colors.sunriseAmber,
      accentColor: Colors.sunriseAmber,
      title: `Start with "${habitName}"`,
      subtitle: `${incompleteHabits.length} habits waiting. Small steps add up.`,
      reason: 'Building consistency is key to lasting change',
      actionLabel: 'Begin',
      navigationTarget: 'Track',
      navigationParams: { tab: 'habits' },
      metadata: { habitId: nextHabit.id, habitName, remaining: incompleteHabits.length },
    };
  }

  // Check 4-3-2-1 practice
  if (!fourThreeTwoOne?.completed) {
    const partsCompleted = fourThreeTwoOne
      ? [
          fourThreeTwoOne.fourMinutes,
          fourThreeTwoOne.threeWins?.completed,
          fourThreeTwoOne.twoFuel?.completed,
          fourThreeTwoOne.oneConnection,
        ].filter(Boolean).length
      : 0;

    if (partsCompleted < 4) {
      return {
        type: 'four_three_two_one',
        priority: 7,
        pillarTarget: 'consistency',
        icon: 'numeric-4-box-outline',
        iconColor: Colors.evergreenTeal,
        accentColor: Colors.evergreenTeal,
        title: partsCompleted > 0 ? 'Continue your 4-3-2-1' : 'Try the 4-3-2-1 practice',
        subtitle: partsCompleted > 0
          ? `${4 - partsCompleted} steps left. You're almost there.`
          : 'A simple daily ritual that boosts wellbeing.',
        reason: 'This practice strengthens multiple wellness areas',
        actionLabel: 'Continue',
        navigationTarget: 'Home',
      };
    }
  }

  return null;
};

/**
 * Generate mind pillar recommendations
 */
const getMindRecommendation = (
  score: DailyWellnessScore,
  context: RecommendationContext,
  timePeriod: TimePeriod
): NextActionRecommendation | null => {
  const { lastJournalDate, hasMorningCheckIn } = context;
  const weakComponent = getWeakestComponent(score, 'mind');

  // Morning check-in if not done
  if (!hasMorningCheckIn && (timePeriod === 'morning' || timePeriod === 'early_morning' || timePeriod === 'midday')) {
    return {
      type: 'morning_checkin',
      priority: 8,
      pillarTarget: 'mind',
      icon: 'weather-sunny',
      iconColor: Colors.sunriseAmber,
      accentColor: Colors.sunriseAmber,
      title: 'Quick check-in',
      subtitle: 'How are your energy and mood right now?',
      reason: 'This helps personalize your wellness score',
      actionLabel: 'Check in',
      navigationTarget: 'Home',
    };
  }

  // Journal based on recency
  if (lastJournalDate) {
    const daysSinceJournal = Math.floor(
      (Date.now() - lastJournalDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    if (daysSinceJournal >= 2) {
      return {
        type: 'journal',
        priority: 7,
        pillarTarget: 'mind',
        icon: 'book-open-page-variant',
        iconColor: Colors.evergreenTeal,
        accentColor: Colors.evergreenTeal,
        title: 'Take a moment to reflect',
        subtitle: `It's been ${daysSinceJournal} days since you journaled.`,
        reason: 'Journaling improves your mind pillar score',
        actionLabel: 'Open journal',
        navigationTarget: 'Journal',
      };
    }
  } else {
    // Never journaled
    return {
      type: 'journal',
      priority: 6,
      pillarTarget: 'mind',
      icon: 'book-open-page-variant',
      iconColor: Colors.evergreenTeal,
      accentColor: Colors.evergreenTeal,
      title: 'Start journaling',
      subtitle: 'Capture your thoughts and track your journey.',
      reason: 'Regular reflection strengthens your mind pillar',
      actionLabel: 'Begin',
      navigationTarget: 'Journal',
    };
  }

  // Nervous system regulation
  if (weakComponent?.name === 'nervousSystemRegulation') {
    return {
      type: 'nervous_system',
      priority: 7,
      pillarTarget: 'mind',
      icon: 'meditation',
      iconColor: Colors.dewSage,
      accentColor: Colors.dewSage,
      title: 'Regulate your nervous system',
      subtitle: 'Try a physiological sigh or panoramic vision.',
      reason: 'Calming tools boost your mind wellness',
      actionLabel: 'Try now',
      navigationTarget: 'BrainHealth',
    };
  }

  return null;
};

/**
 * Generate growth pillar recommendations
 */
const getGrowthRecommendation = (
  score: DailyWellnessScore,
  context: RecommendationContext
): NextActionRecommendation | null => {
  const weakComponent = getWeakestComponent(score, 'growth');
  const { fourThreeTwoOne } = context;

  if (weakComponent?.name === 'amccChallenge') {
    return {
      type: 'do_hard_thing',
      priority: 6,
      pillarTarget: 'growth',
      icon: 'arm-flex',
      iconColor: Colors.sunriseAmber,
      accentColor: Colors.sunriseAmber,
      title: 'Do one hard thing',
      subtitle: 'Small challenges build mental resilience.',
      reason: 'Growth comes from stepping outside comfort zones',
      actionLabel: 'Challenge',
      navigationTarget: 'BrainHealth',
    };
  }

  if (weakComponent?.name === 'connection' || !fourThreeTwoOne?.oneConnection) {
    return {
      type: 'connect',
      priority: 5,
      pillarTarget: 'growth',
      icon: 'account-heart',
      iconColor: Colors.evergreenTeal,
      accentColor: Colors.evergreenTeal,
      title: 'Connect with someone',
      subtitle: 'Reach out to a friend, family member, or colleague.',
      reason: 'Meaningful connections boost your wellbeing',
      actionLabel: 'Ideas',
      navigationTarget: 'Home',
    };
  }

  return null;
};

/**
 * Get a celebration recommendation when everything is going well
 */
const getCelebrationRecommendation = (
  score: DailyWellnessScore
): NextActionRecommendation | null => {
  if (score.score >= 80) {
    return {
      type: 'celebrate',
      priority: 5,
      icon: 'check-circle',
      iconColor: Colors.evergreenTeal,
      accentColor: Colors.evergreenTeal,
      title: 'You\'ve had a good day.',
      subtitle: `Wellness score: ${score.score}. Keep up the great work.`,
      reason: 'Your wellness score is excellent',
      actionLabel: 'View progress',
      navigationTarget: 'Home',
    };
  }

  return null;
};

/**
 * Get a rest recommendation for late night
 */
const getRestRecommendation = (timePeriod: TimePeriod): NextActionRecommendation | null => {
  if (timePeriod === 'night') {
    return {
      type: 'rest',
      priority: 10,
      pillarTarget: 'foundation',
      icon: 'bed',
      iconColor: Colors.dewSage,
      accentColor: Colors.dewSage,
      title: 'Time to rest',
      subtitle: 'Quality sleep is the foundation of wellness.',
      reason: 'It\'s late - sleep is your highest priority',
      actionLabel: 'Sleep tools',
      navigationTarget: 'Sleep',
    };
  }

  return null;
};

/**
 * Main recommendation function
 * Returns the single most impactful action based on all context
 */
export const getNextActionRecommendation = (
  context: RecommendationContext
): NextActionRecommendation => {
  const { wellnessScore, habits, completedTodayHabits, tasks } = context;
  const timePeriod = getTimePeriod();
  const candidates: NextActionRecommendation[] = [];

  // Late night? Prioritize rest
  const restRec = getRestRecommendation(timePeriod);
  if (restRec) {
    candidates.push(restRec);
  }

  // If we have wellness score data, use pillar-based recommendations
  if (wellnessScore) {
    const lowestPillar = getLowestPillar(wellnessScore);

    if (lowestPillar) {
      // Get recommendation for the lowest pillar
      let pillarRec: NextActionRecommendation | null = null;

      switch (lowestPillar.pillar) {
        case 'foundation':
          pillarRec = getFoundationRecommendation(wellnessScore, timePeriod);
          break;
        case 'consistency':
          pillarRec = getConsistencyRecommendation(wellnessScore, context);
          break;
        case 'mind':
          pillarRec = getMindRecommendation(wellnessScore, context, timePeriod);
          break;
        case 'growth':
          pillarRec = getGrowthRecommendation(wellnessScore, context);
          break;
      }

      if (pillarRec) {
        // Boost priority for lowest pillar
        pillarRec.priority += 1;
        candidates.push(pillarRec);
      }
    }

    // Also check other pillars for urgent items
    const foundationRec = getFoundationRecommendation(wellnessScore, timePeriod);
    if (foundationRec && !candidates.find(c => c.type === foundationRec.type)) {
      candidates.push(foundationRec);
    }

    const consistencyRec = getConsistencyRecommendation(wellnessScore, context);
    if (consistencyRec && !candidates.find(c => c.type === consistencyRec.type)) {
      candidates.push(consistencyRec);
    }

    const mindRec = getMindRecommendation(wellnessScore, context, timePeriod);
    if (mindRec && !candidates.find(c => c.type === mindRec.type)) {
      candidates.push(mindRec);
    }

    const growthRec = getGrowthRecommendation(wellnessScore, context);
    if (growthRec && !candidates.find(c => c.type === growthRec.type)) {
      candidates.push(growthRec);
    }

    // Check for celebration
    const celebrationRec = getCelebrationRecommendation(wellnessScore);
    if (celebrationRec) {
      candidates.push(celebrationRec);
    }
  } else {
    // No wellness score - fall back to habit-based logic
    const incompleteHabits = habits.filter(h => !completedTodayHabits.has(h.id));
    if (incompleteHabits.length > 0) {
      const nextHabit = incompleteHabits[0];
      candidates.push({
        type: 'complete_habit',
        priority: 8,
        pillarTarget: 'consistency',
        icon: 'checkbox-marked-circle-outline',
        iconColor: Colors.sunriseAmber,
        accentColor: Colors.sunriseAmber,
        title: `Start with "${nextHabit.name || 'your habit'}"`,
        subtitle: `${incompleteHabits.length} habits waiting for you today.`,
        reason: 'Building consistency is key to lasting change',
        actionLabel: 'Begin',
        navigationTarget: 'Track',
        navigationParams: { tab: 'habits' },
      });
    }

    // Check for tasks
    const today = new Date().toISOString().split('T')[0];
    const tasksDueToday = tasks.filter(t => {
      if (t.completed) return false;
      const dueDate = t.dueDate?.toDate?.()
        ? t.dueDate.toDate().toISOString().split('T')[0]
        : t.dueDate?.seconds
        ? new Date(t.dueDate.seconds * 1000).toISOString().split('T')[0]
        : null;
      return dueDate === today;
    });

    if (tasksDueToday.length > 0) {
      candidates.push({
        type: 'complete_task',
        priority: 7,
        icon: 'calendar-check',
        iconColor: Colors.evergreenTeal,
        accentColor: Colors.evergreenTeal,
        title: `Task due today`,
        subtitle: tasksDueToday[0].title || 'Complete your task',
        reason: 'Staying on top of tasks reduces stress',
        actionLabel: 'View',
        navigationTarget: 'Track',
        navigationParams: { tab: 'tasks' },
      });
    }
  }

  // Sort by priority and return the highest
  candidates.sort((a, b) => b.priority - a.priority);

  // Return top recommendation, or a fallback
  if (candidates.length > 0) {
    return candidates[0];
  }

  // Ultimate fallback - explore wellness
  return {
    type: 'brain_health',
    priority: 3,
    icon: 'brain',
    iconColor: Colors.evergreenTeal,
    accentColor: Colors.evergreenTeal,
    title: 'Explore brain health tools',
    subtitle: 'Discover ways to optimize your wellbeing.',
    reason: 'Always more to explore',
    actionLabel: 'Explore',
    navigationTarget: 'BrainHealth',
  };
};

/**
 * Get a greeting based on time of day
 */
export const getTimeBasedContext = (): { greeting: string; timeHint: string } => {
  const timePeriod = getTimePeriod();

  switch (timePeriod) {
    case 'early_morning':
      return { greeting: 'Early bird!', timeHint: 'Start your day right' };
    case 'morning':
      return { greeting: 'Good morning', timeHint: 'Set the tone for today' };
    case 'midday':
      return { greeting: 'Midday check', timeHint: 'Stay on track' };
    case 'afternoon':
      return { greeting: 'Afternoon', timeHint: 'Keep the momentum' };
    case 'evening':
      return { greeting: 'Good evening', timeHint: 'Wind down well' };
    case 'night':
      return { greeting: 'Late night', timeHint: 'Rest is important' };
    default:
      return { greeting: 'Hello', timeHint: '' };
  }
};

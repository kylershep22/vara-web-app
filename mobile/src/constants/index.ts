/**
 * Central export for all constants
 */

export { Colors } from './colors';
export { Typography, TextStyles } from './typography';
export { Spacing, Layout } from './spacing';
export { theme, lightTheme, darkTheme } from './theme';
export { HABIT_CATEGORIES, type HabitCategory } from './habitCategories';
export {
  GROUP_CATEGORIES,
  GROUP_CATEGORY_LIST,
  getGroupCategory,
  type GroupCategoryConfig,
} from './groupCategories';
export {
  WELLNESS_INTERESTS,
  WELLNESS_GOALS,
  INTEREST_CATEGORIES,
  GOAL_CATEGORIES,
  getInterestById,
  getGoalById,
  getInterestsByCategory,
  getGoalsByCategory,
  getInterestLabels,
  getGoalLabels,
  type WellnessInterest,
  type WellnessGoal,
} from './interests';
export {
  MILESTONE_TEMPLATES,
  DEFAULT_MILESTONES,
  getSuggestedMilestones,
  templatesToMilestones,
  type MilestoneTemplate,
} from './milestoneTemplates';
export {
  JOURNAL_TAGS,
  JOURNAL_FILTER_CHIPS,
  MOOD_CONFIG,
  getMoodConfig,
  type MoodValue,
} from './journalTags';
export {
  BRAIN_PILLARS,
  FEATURE_UNLOCK_TIERS,
  ALL_FEATURES,
  FEATURE_METADATA,
  getPillarById,
  getFeaturesForPillar,
  type BrainPillar,
  type FeatureId,
  type BrainPillarConfig,
} from './featureUnlock';
export {
  BRAIN_HEALTH_TRANSLATIONS,
  INPUT_LABEL_TRANSLATIONS,
  ACTION_TRANSLATIONS,
  getTranslation,
  getActionLabel,
  type BrainHealthTranslation,
} from './brainHealth';

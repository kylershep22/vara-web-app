/**
 * Central export for all constants
 */

export { Colors } from './colors';
export { Typography, TextStyles } from './typography';
export { Spacing, Layout } from './spacing';
export { theme, lightTheme, darkTheme } from './theme';
export {
  HABIT_CATEGORIES,
  COGNITIVE_RESERVE_CATEGORIES,
  isCognitiveReserveCategory,
  CR_CALLOUT_CONTENT,
  CR_CALLOUT_FALLBACK,
  type HabitCategory,
} from './habitCategories';
export {
  ALL_BRAIN_STATE_WINDOWS,
  getBrainStateForTimeString,
  getBrainStateWindow,
  parseHourFromTimeString,
  type BrainStateWindow,
} from './brainStateWindows';
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
export {
  INTENTION_OPTIONS,
  INTENTION_CATEGORY_LABELS,
  INTENTION_INSIGHTS,
} from './intentions';
export {
  VARA_VALUES,
  MIN_VALUES,
  MAX_VALUES,
  toggleValue,
  getValueById,
  type ValueId,
  type VaraValue,
} from './values';
export {
  ALL_DISCOVERABLE_FEATURES,
  PILLAR_INITIAL_FEATURES,
  PILLAR_FEATURE_ORDER,
  UNLOCK_TRIGGERS,
  FEATURE_PREVIEW_CONTENT,
  FEATURE_CARD_CONTENT,
  UNLOCK_TOAST_CONTENT,
  DEFAULT_FEATURE_STATE,
  DEFAULT_ENGAGEMENT_METRICS,
  getUnlockTrigger,
  getOrderedUpcomingFeatures,
  initializeFeatureStates,
} from './featureDiscovery';
export { DASHBOARD_V2 } from './dashboardConfig';
export {
  BRAIN_STATE_PROTOCOLS,
  getProtocolForState,
  type BrainStateProtocol,
  type ProtocolCategory,
} from './brainStateProtocols';

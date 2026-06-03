/**
 * Central export for all reusable components
 *
 * NOTE: Uses explicit named re-exports instead of "export *" to avoid
 * Metro 0.83+ "property is not configurable" errors that occur when
 * barrel files use "export *" from multiple sub-barrels.
 */

export { default as Button } from './Button';
export { default as Input } from './Input';
export { default as Card } from './Card';
export { default as LoadingSpinner } from './LoadingSpinner';
export { default as KeyboardDismissButton } from './KeyboardDismissButton';
export { default as KeyboardAccessoryToolbar } from './KeyboardAccessoryToolbar';

// Auth components
export { AuthHeader } from './auth/AuthHeader';
export { default as FloatingLabelInput } from './auth/FloatingLabelInput';
export { default as CustomCheckbox } from './auth/CustomCheckbox';
export { default as PasswordRequirements, allRequirementsMet } from './auth/PasswordRequirements';

// Dashboard components
export { StatCard } from './dashboard/StatCard';
export { FourThreeTwoOneCard } from './dashboard/FourThreeTwoOneCard';
export { FourThreeTwoOneCarousel } from './dashboard/FourThreeTwoOneCarousel';
export { UpNextCard } from './dashboard/UpNextCard';
export { default as ProgressNudgeCard } from './dashboard/ProgressNudgeCard';
export { BrainHealthInsightStrip } from './dashboard/BrainHealthInsightStrip';
export { NextBestActionCard } from './dashboard/NextBestActionCard';
export { GoalsCard } from './dashboard/GoalsCard';
export { QuickActionButtons } from './dashboard/QuickActionButtons';
export { QuickActionCarousel } from './dashboard/QuickActionCarousel';
export { BrainHealthEducationCard } from './dashboard/BrainHealthEducationCard';
export { TasksCard } from './dashboard/TasksCard';
export { WellnessScoreCard } from './dashboard/WellnessScoreCard';
export { WellnessScoreBreakdown } from './dashboard/WellnessScoreBreakdown';
export { MorningCheckIn, MorningCheckInComplete } from './dashboard/MorningCheckIn';
export { WellnessScoreOptInCard } from './dashboard/WellnessScoreOptInCard';
export { default as NotificationOptInCard } from './dashboard/NotificationOptInCard';
export { QuickActionsRow } from './dashboard/QuickActionsRow';
export { BrainStateCheckin } from './dashboard/BrainStateCheckin';
export { TodaysProtocolCard } from './dashboard/TodaysProtocolCard';
export { DailyReflectionCard } from './dashboard/DailyReflectionCard';

// Community components
export { PostCard } from './community/PostCard';
export { QuickNavButton } from './community/QuickNavButton';
export { GroupCard } from './community/GroupCard';
export { ChallengeCard } from './community/ChallengeCard';
export { PersonCard } from './community/PersonCard';
export { InvitePermissionPicker } from './community/InvitePermissionPicker';
export type { InvitePermission } from './community/InvitePermissionPicker';
export { InviteMembersModal } from './community/InviteMembersModal';
export { PendingInvitesSection } from './community/PendingInvitesSection';
export { CreateChallengeFromGroupModal } from './community/CreateChallengeFromGroupModal';

// Profile components
export { ProfileHeader } from './profile/ProfileHeader';
export { ProfileStats } from './profile/ProfileStats';
export { InterestPicker } from './profile/InterestPicker';

// Shared components
export { default as ErrorBoundary } from './shared/ErrorBoundary';
export { PriorityBadge } from './shared/PriorityBadge';
export { ProgressBar } from './shared/ProgressBar';
export { AnimatedProgressBar, CompactProgressBar } from './shared/AnimatedProgressBar';
export { BrainPillarBadge } from './shared/BrainPillarBadge';
export { BrainPillarInfoModal } from './shared/BrainPillarInfoModal';
export { EnhancedModal, ModalFooterActions } from './shared/EnhancedModal';
export { KeyboardAwareScrollView, useKeyboardContext } from './shared/KeyboardAwareScrollView';
export { Tag } from './shared/Tag';
export type { TagVariant } from './shared/Tag';
export { BaseCard } from './shared/BaseCard';
export { InlineCreateButton } from './shared/InlineCreateButton';
export { FeatureGate, LockedFeaturePreview, LockedBadge } from './shared/FeatureGate';
export { OfflineIndicator } from './shared/OfflineIndicator';
export { Badge } from './shared/Badge';
export type { BadgeVariant } from './shared/Badge';
export { CommunityAvatar } from './shared/CommunityAvatar';

// Library components
export { ContentCard } from './library/ContentCard';
export { CategoryHeader } from './library/CategoryHeader';
export { AudioMiniPlayer } from './library/AudioMiniPlayer';
export { AudioExpandedPlayer } from './library/AudioExpandedPlayer';
export { BreathworkTimer } from './library/BreathworkTimer';
export { MasterclassCard } from './library/MasterclassCard';

// AI components
export { AIAssistantFAB } from './ai/AIAssistantFAB';
export { AIChatModal } from './ai/AIChatModal';

// Celebration components
export { default as AnimatedCheckbox } from './celebrations/AnimatedCheckbox';
export { default as MomentOfRecognitionModal } from './celebrations/StreakMilestoneModal';
export { default as QuietFinish } from './celebrations/QuietFinish';
export { GoalMilestoneCheckmark, InlineCheckmark } from './celebrations/GoalMilestoneCheckmark';

// Goals components
export { SwipeableGoalCard } from './goals/SwipeableGoalCard';
export { ProgressUpdateModal } from './goals/ProgressUpdateModal';

// Insights components
export { HeroSummaryCard } from './insights/HeroSummaryCard';
export { SparklineTrendCard, SparklineTrendCardRow, AtAGlanceCard } from './insights/SparklineTrendCard';
export { RingProgressCard } from './insights/RingProgressCard';
export { HabitHeatmap } from './insights/HabitHeatmap';
export { WeeklyBarChart } from './insights/WeeklyBarChart';
export { NarrativeRecap } from './insights/NarrativeRecap';
export { EmptyStateCard } from './insights/EmptyStateCard';
export { ConsolidatedMetricsCard } from './insights/ConsolidatedMetricsCard';
export { CorrelationInsightCard } from './insights/CorrelationInsightCard';

// Journal components
export { MoodGradientDot } from './journal/MoodGradientDot';
export { JournalEntryCard } from './journal/JournalEntryCard';
export {
  RelativeDateHeader,
  getDateGroup,
  groupEntriesByRelativeDate,
} from './journal/RelativeDateHeader';
export type { DateGroup } from './journal/RelativeDateHeader';
export { CollapsibleSearchBar } from './journal/CollapsibleSearchBar';
export { FilterChipBar } from './journal/FilterChipBar';
export { GentleEncouragementCard } from './journal/GentleEncouragementCard';
export { JournalEmptyState } from './journal/JournalEmptyState';
export { AIWeeklySummaryCard } from './journal/AIWeeklySummaryCard';

// Onboarding components
export { default as DotScaleSelector } from './onboarding/DotScaleSelector';
export { default as OnboardingProgressDots } from './onboarding/OnboardingProgressDots';
export { default as InsightCard } from './onboarding/InsightCard';
export { default as FocusRecommendationCard } from './onboarding/FocusRecommendationCard';
export { default as FocusAreaBottomSheet } from './onboarding/FocusAreaBottomSheet';
export { default as OnboardingActivityCard } from './onboarding/OnboardingActivityCard';
export { default as OnboardingBreathingActivity } from './onboarding/activities/OnboardingBreathingActivity';
export { default as OnboardingReflectionActivity } from './onboarding/activities/OnboardingReflectionActivity';
export { default as OnboardingIntentionActivity } from './onboarding/activities/OnboardingIntentionActivity';

// Discovery components (progressive feature unlock)
export { default as FeaturePreviewBottomSheet } from './discovery/FeaturePreviewBottomSheet';
export { default as SoftRevealCard } from './discovery/SoftRevealCard';
export { default as NewlyAvailableCard } from './discovery/NewlyAvailableCard';
export { default as UnlockToast } from './discovery/UnlockToast';
export { default as ComingUpSection } from './discovery/ComingUpSection';

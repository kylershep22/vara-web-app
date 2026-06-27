/**
 * Custom hooks barrel export
 */

export { useGoals } from './useGoals';
export { useHabits } from './useHabits';
export { useTasks } from './useTasks';
export { useJournal } from './useJournal';
export { useGroups } from './useGroups';
export { useConnections, useUserSearch, useConnectionProfiles } from './useConnections';
export { useConversations, useConversation, useStartConversation } from './useConversations';
export { useFeed } from './useFeed';
export {
  useBreathwork,
  useSleep,
  useMovement,
  useMasterclasses,
  useMasterclassProgress,
  useLibraryContent,
} from './useLibrary';
export { useCelebrations } from './useCelebrations';
export { useSubscription } from './useSubscription';
export {
  useSuggestedConnections,
  useMutualConnections,
  formatLastActive,
  getSuggestionReasonLabel,
} from './useSuggestedConnections';
export { useNotificationPreferences } from './useNotificationPreferences';
export { useNotificationOptIn } from './useNotificationOptIn';
export { useNotificationOptInCards } from './useNotificationOptInCards';
export { useBreathworkTracking } from './useBreathworkTracking';
export { usePodcastFeed } from './usePodcastFeed';
export { useReducedMotion } from './useReducedMotion';
export { useJournalStats } from './useJournalStats';
export { useWeeklySummary } from './useWeeklySummary';

// Focus Page Hooks
export { useTimer, type TimerState } from './useTimer';
export { useAmbientSound } from './useAmbientSound';

// Feature Unlock
export { useFeatureUnlock } from './useFeatureUnlock';

// Feature Discovery (Progressive Unlock)
export { useFeatureDiscovery } from './useFeatureDiscovery';

// Brain Health
export { useBrainHealthVocabulary } from './useBrainHealthVocabulary';

// Network & Offline
export { useNetworkStatus, type NetworkStatus } from './useNetworkStatus';

// User Values
export { useUserValues } from './useUserValues';

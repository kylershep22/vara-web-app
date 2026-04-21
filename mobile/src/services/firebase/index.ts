/**
 * Firebase services barrel export
 *
 * NOTE: Uses explicit named re-exports instead of "export *" to avoid
 * Metro 0.83+ "property is not configurable" errors with inlineRequires.
 */

// goals.service
export {
  listGoals,
  getGoal,
  createGoal,
  updateGoal,
  deleteGoal,
  updateGoalProgress,
  updateGoalProgressWithMilestones,
  completeMilestone,
  addMilestonesToGoal,
} from './goals.service';

// habits.service
export {
  listHabits,
  getHabit,
  createHabit,
  updateHabit,
  deleteHabit,
  markHabitComplete,
  unmarkHabitComplete,
  getHabitCompletions,
  isHabitCompletedToday,
} from './habits.service';
export type { CompletionReflectionData } from './habits.service';

// tasks.service
export {
  listTasks,
  getTask,
  createTask,
  updateTask,
  deleteTask,
  toggleTaskComplete,
  completeTask,
  uncompleteTask,
} from './tasks.service';

// journal.service
export {
  listJournalEntries,
  getJournalEntry,
  createJournalEntry,
  updateJournalEntry,
  deleteJournalEntry,
  getJournalEntriesByDateRange,
  getJournalEntriesByMood,
  searchJournalEntries,
} from './journal.service';

// community.service
export {
  fetchPublicGroups,
  fetchUserGroups,
  getGroupInfo,
  createGroup,
  joinGroup,
  leaveGroup,
  createPost,
  fetchGroupPosts,
  togglePostLike,
  addCommentToPost,
  sendConnectionRequest,
  acceptConnection,
  declineConnection,
  fetchUserConnections,
  fetchIncomingConnectionRequests,
  fetchSentConnectionRequests,
  getUserById,
  searchUsers,
  getGroupPrompt,
  createGroupPrompt,
  ensureWeeklyPromptPost,
} from './community.service';
export type { Group, Post, Comment, Connection, UserProfile } from './community.service';

// messaging.service
export {
  createOrGetConversation,
  fetchUserConversations,
  subscribeToConversations,
  markConversationAsRead,
  sendDirectMessage,
  fetchConversationMessages,
  subscribeToMessages,
  markMessageAsRead,
} from './messaging.service';
export type { Conversation, DirectMessage } from './messaging.service';

// storage.service
export {
  uploadPostImage,
  uploadPostVideo,
  uploadPostMedia,
  deletePostMedia,
} from './storage.service';
export type { MediaUploadResult, UploadProgress } from './storage.service';

// fourThreeTwoOne.service
export {
  getTodayEntry,
  updateTodayEntry,
  toggleFourMinutes,
  updateThreeWins,
  updateTwoFuel,
  toggleOneConnection,
  getCurrentStreak,
  getLongestStreak,
  getRecentEntries,
  getWeeklyStats,
} from './fourThreeTwoOne.service';

// challenges.service
export {
  createChallenge,
  fetchChallenges,
  fetchChallengeById,
  updateChallenge,
  updateChallengeStatus,
  deleteChallenge,
  joinChallenge,
  leaveChallenge,
  fetchChallengeLeaderboard,
  fetchMyParticipation,
  checkIn,
  fetchMyCheckIns,
  fetchChallengeCheckIns,
  hasCheckedInToday,
  fetchWeeklyCheckInCounts,
  getDaysRemaining,
  getChallengeProgress,
  formatChallengeDuration,
  formatChallengePosition,
  isUserMemberOfChallenge,
  fetchChallengesByGroup,
} from './challenges.service';
export type { CreateChallengeInput } from './challenges.service';

// connections.service
export {
  getConnectionIds,
  getPendingConnectionIds,
  getMutualConnections,
  getMutualConnectionProfiles,
  getUserGroups,
  getUserInterests,
  getSuggestedConnections,
  formatLastActive,
  getSuggestionReasonLabel,
} from './connections.service';
export type { EnhancedUserProfile } from './connections.service';

// notificationPreferences.service
export {
  getNotificationPreferences,
  createDefaultNotificationPreferences,
  updateNotificationPreferences,
  toggleAllNotifications,
  updateQuietHours,
  updateNotificationCategory,
  isWithinQuietHours,
  formatReminderTime,
  parseTimeToReminder,
} from './notificationPreferences.service';

// routines.service
export {
  fetchUserRoutines,
  fetchActiveRoutineByType,
  createRoutine,
  updateRoutine,
  deleteRoutine,
  calculateTotalDuration,
  markRoutineComplete,
  getRoutineCompletionToday,
} from './routines.service';
export type { RoutineType, Activity, Routine } from './routines.service';

// routineMigration.service
export {
  migrateSundayToCustom,
  migrateBedtimeToEvening,
  needsMigration,
  runMigrationIfNeeded,
} from './routineMigration.service';

// wellnessScore.service
export {
  getMorningCheckIn,
  saveMorningCheckIn,
  calculateWellnessScore,
  getTodayWellnessScore,
  saveWellnessScore,
  refreshWellnessScore,
  getWellnessScoreHistory,
  getScoreColor,
  getScoreLabel,
  getWellnessScoreEnabled,
  setWellnessScoreEnabled,
} from './wellnessScore.service';

// featureUnlock.service
export {
  getFeatureUnlockState,
  setSelectedPillar,
  unlockAllFeatures,
  computeFeatureAccess,
  isFeatureUnlocked,
} from './featureUnlock.service';
export type { FeatureUnlockState, ComputedFeatureAccess } from './featureUnlock.service';

// invites.service
export {
  canUserInviteToGroup,
  canUserInviteToChallenge,
  sendGroupInvite,
  sendGroupInvites,
  acceptGroupInvite,
  declineGroupInvite,
  getPendingGroupInvites,
  getGroupInvitesSent,
  cancelGroupInvite,
  sendChallengeInvite,
  sendChallengeInvites,
  acceptChallengeInvite,
  declineChallengeInvite,
  getPendingChallengeInvites,
  getChallengeInvitesSent,
  cancelChallengeInvite,
  getAllPendingInvites,
  createChallengeFromGroup,
  getUserDisplayInfo,
} from './invites.service';
export type { CreateChallengeFromGroupInput } from './invites.service';

// onboarding.service
export {
  saveOnboardingCheckIn,
  saveOnboardingInsight,
  saveSelectedFocus,
  saveCompletedActivity,
  completeOnboarding,
  saveSelectedValues,
  saveOnboardingState,
} from './onboarding.service';

// featureDiscovery.service
export {
  initializeFeatureDiscovery,
  getFeatureDiscoveryState,
  trackEngagementMetric,
  trackFeatureEngaged,
  trackNewSession,
  evaluateUnlockTriggers,
  markFeatureOpened,
  markToastShown,
  getPendingToasts,
  isFeatureAccessible,
  isFeatureUpcoming,
  getFeaturesByStatus,
  migrateFromOldSystem,
} from './featureDiscovery.service';

// moderation.service
export {
  checkDuplicateReport,
  submitReport,
  hidePost,
  unhidePost,
  fetchHiddenPostIds,
  muteUser,
  unmuteUser,
  fetchMutedUserIds,
  softDeletePost,
  updatePostContent,
} from './moderation.service';

// brainStateCheckIn.service
export {
  getTodayBrainStateCheckIn,
  saveBrainStateCheckIn,
  markProtocolCompleted,
  getBrainStateHistory,
} from './brainStateCheckIn.service';

// dailyReflection.service
export {
  getTodayDailyReflection,
  saveDailyReflection,
} from './dailyReflection.service';

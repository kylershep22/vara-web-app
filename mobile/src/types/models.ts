/**
 * Data Model Types
 * TypeScript interfaces for all Firestore collections
 */

import { Timestamp } from 'firebase/firestore';

// ==========================================
// VALUE MODELS
// ==========================================

export interface UserValue {
  id: string;
  label: string; // e.g. "Clarity", "Resilience"
}

// ==========================================
// USER MODELS
// ==========================================

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  bio?: string;
  avatar?: string;
  avatarUrl?: string; // Alternative field name used in some places
  bannerUrl?: string;
  location?: string;
  // Personal values (set during onboarding, displayed in habit wizard Step 5)
  values?: string[];
  // Value alignment objects (id + label pairs for habit completion sheet)
  userValues?: UserValue[];

  privacy: 'public' | 'connections' | 'private';
  searchable?: boolean;

  // Habit completion reflections master toggle (default: true)
  reflectionEnabled?: boolean;

  // Standardized interests (IDs from WELLNESS_INTERESTS)
  interests?: string[];
  interestsPublic?: boolean; // Toggle for showing interests publicly

  // Wellness goals (IDs from WELLNESS_GOALS)
  goals?: string[];
  goalsPublic?: boolean; // Toggle for showing goals publicly

  // Activity tracking
  lastActiveAt?: Timestamp;

  // Group memberships (for suggested connections)
  groupIds?: string[];

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// BRAIN HEALTH MODELS
// ==========================================

// User-facing accessible names for brain health pillars
export type BrainPillar =
  | 'growth'      // Learning, adaptation, trying new things (neuroplasticity)
  | 'energy'      // Sleep, nutrition, vitality (neuroenergy)
  | 'focus'       // Attention, concentration, clarity (neurofocus)
  | 'resilience'  // Stress management, recovery (neuroresilience)
  | 'connection'; // Social bonds, belonging (neurosocial)

// ==========================================
// GOAL MODELS
// ==========================================

export interface Goal {
  id: string;
  userId: string;
  title: string;
  primaryFocus: string;
  refinedFocus?: string;
  timeframe: string;
  progress: number;
  milestones?: Milestone[];
  status: 'active' | 'completed' | 'paused';
  brainPillars?: BrainPillar[]; // Brain health pillars this goal supports
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Milestone {
  id: string;
  title: string;
  completed: boolean;
  completedAt?: Timestamp;
  targetProgress?: number; // Associated progress percentage (e.g., 25, 50, 75, 100)
  isUserDefined?: boolean; // True if user created/modified, false if from suggestions
}

// ==========================================
// INTENTION SYSTEM
// ==========================================

export type IntentionCategory =
  | 'focus_clarity'
  | 'regulation_recovery'
  | 'sustainable_consistency'
  | 'energy_resilience'
  | 'brain_health';

export interface HabitIntention {
  label: string;
  category: IntentionCategory;
  isCustom: boolean;
}

// ==========================================
// HABIT MODELS
// ==========================================

export interface Habit {
  id: string;
  userId: string;
  name: string;
  type: 'daily' | 'weekly' | 'custom';
  frequency: number; // times per week
  streak: number;
  longestStreak: number;
  active: boolean;
  category?: string;
  neurochemicalTags?: string[]; // Brain health neurochemical impacts (e.g., 'dopamine', 'serotonin', 'cortisol')

  // ==========================================
  // VARA HABITS ENHANCEMENTS
  // Identity-based habit system
  // ==========================================

  // Who you're becoming (Vara's "Who Are You Becoming?" system)
  identity?: string; // e.g., "A Runner", "Someone who writes", "A healthy eater"
  identityStatement?: string; // e.g., "I'm becoming a person who runs daily"
  outcomeGoal?: string; // Optional: traditional goal, de-emphasized (e.g., "Run a 5K")

  // Quick Start System (Vara's scaling versions for flexibility)
  fullVersion?: string; // The ideal/target completion (e.g., "Run 30 minutes")
  quickStartVersion?: string; // 5-10 minute simplified version (e.g., "Run 10 minutes")
  justShowUpVersion?: string; // 1-2 minute minimal version (e.g., "Put on shoes, step outside")
  scalingPhase?: 'getting_started' | 'building_momentum' | 'committed' | 'established' | 'expert';

  // Bounce Back System (Vara's "Never Miss Twice" tracking)
  missedYesterday?: boolean; // Flag to trigger bounce back alerts
  consecutiveMisses?: number; // Track consecutive misses to prevent spirals

  // Your When/Where Plan (implementation intention)
  cue?: {
    type: 'time' | 'location' | 'after_habit' | 'emotion';
    value: string;
  };
  implementationIntention?: string; // e.g., "When I finish coffee, I will run for 30 min"

  // Context & Purpose
  problem?: string; // What problem does this habit solve?
  trigger?: string; // What situation/feeling triggers the need for this habit?

  // Progress Tracking (Vara's "Steps Taken" system)
  totalStepsTaken?: number; // Total completions (any version counts)
  thisWeekSteps?: number; // Steps taken this week

  // Build On What Works (habit stacking)
  stackedAfter?: string; // Habit ID or routine name this is stacked after

  // Intention System
  intention?: HabitIntention;

  // Values alignment (from Step 5 — links habit to a personal value)
  valueAlignment?: string | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export type HabitReflection = 'smooth' | 'okay' | 'hard';
export type ConnectionQuality = 'nourishing' | 'fine' | 'draining';
export type CompletionSource = 'track' | 'home';

export interface HabitCompletion {
  id: string;
  habitId: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  completed: boolean;
  completedAt: Timestamp;

  // Vara Habits Enhancement: Track which version was completed
  versionCompleted?: 'full' | 'quick_start' | 'just_show_up'; // Which version did they do?
  satisfaction?: 'great' | 'good' | 'okay'; // How did they feel after?
  quickNote?: string; // Optional 1-line reflection

  // Completion reflection (from HabitCompletionSheet)
  reflection?: HabitReflection | null;        // For non-Connection habits
  connectionQuality?: ConnectionQuality | null; // For Connection-category habits
  source?: CompletionSource;                   // Where the completion was triggered
  crFlagged?: boolean;                         // Denormalized from habit at completion time
  valueAlignment?: string | null;              // Denormalized from habit at completion time
  skippedReflection?: boolean;                 // True when user explicitly tapped skip
}

/** Data passed from HabitCompletionSheet to the completion handler */
export interface CompletionData {
  habitId: string;
  reflection: HabitReflection | null;
  connectionQuality: ConnectionQuality | null;
  skippedReflection: boolean;
  source: CompletionSource;
}

// ==========================================
// TASK MODELS
// ==========================================

export interface Task {
  id: string;
  userId: string;
  title: string;
  description?: string;
  priority: 'low' | 'medium' | 'high';
  completed: boolean;
  dueDate?: Timestamp;
  completedAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// JOURNAL MODELS
// ==========================================

export interface JournalEntry {
  id: string;
  userId: string;
  content?: string; // Mobile app format
  text?: string; // Web app format
  mood?: 'great' | 'good' | 'okay' | 'bad' | 'terrible';
  tags?: string[];
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface JournalWeeklySummary {
  text: string;
  moodTrend: 'improving' | 'stable' | 'declining';
  topThemes: string[];
  wordCount: number;
  entryCount: number;
}

// ==========================================
// 4-3-2-1 DAILY PRACTICE MODELS
// ==========================================

export type BodyFuelOption =
  | 'healthy_meal'
  | 'hydration'
  | 'vitamins'
  | 'fruits_veggies'
  | 'protein'
  | 'exercise'
  | 'rest'
  | 'stretch'
  | 'other';

export interface FourThreeTwoOneEntry {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format for easy querying

  // 4 minutes to yourself
  fourMinutes: boolean;

  // 3 wins from the day (optional to write)
  threeWins: {
    completed: boolean;
    wins?: string[]; // Optional array of win descriptions
  };

  // 2 ways fueled body
  twoFuel: {
    completed: boolean;
    options?: BodyFuelOption[]; // Selected fuel options
  };

  // 1 connection
  oneConnection: boolean;

  // Overall completion
  completed: boolean; // True when all 4 parts are checked

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// MOOD MODELS
// ==========================================

export interface Mood {
  id: string;
  userId: string;
  mood: 'great' | 'good' | 'okay' | 'bad' | 'terrible';
  note?: string;
  createdAt: Timestamp;
}

// ==========================================
// COMMUNITY MODELS
// ==========================================

export type GroupCategory =
  | 'fitness'
  | 'mindfulness'
  | 'nutrition'
  | 'sleep'
  | 'mental-health'
  | 'productivity'
  | 'social'
  | 'learning'
  | 'other';

export interface Group {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  visibility: 'public' | 'private';
  members: string[]; // array of user IDs
  memberCount?: number;
  category?: GroupCategory;
  coverImage?: string;
  // Invite permission settings
  invitePermission: 'owner_only' | 'all_members';
  // Activity tracking
  lastActivityAt?: Timestamp;
  postCount?: number;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// GROUP PROMPT MODELS
// ==========================================

export interface GroupPrompt {
  id: string;
  groupId: string;
  prompt: string;
  frequency: 'weekly';
  dayOfWeek: number; // 0=Sunday, 1=Monday, etc.
  createdBy: string;
  active: boolean;
  currentPostId?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// CHALLENGE MODELS
// ==========================================

export type ChallengeStatus = 'upcoming' | 'active' | 'completed';
export type ChallengeFrequency = 'daily' | 'weekly' | 'total';

export interface Challenge {
  id: string;
  // Basic info (similar to Group)
  ownerId: string;
  name: string;
  description?: string;
  visibility: 'public' | 'private';
  members: string[];
  memberCount?: number;
  category?: GroupCategory;
  coverImage?: string;

  // Challenge-specific fields
  type: 'challenge'; // Distinguishes from regular groups
  challengeGoal: string; // e.g., "Run 4 days a week"
  startDate: Timestamp;
  endDate: Timestamp;
  frequency: ChallengeFrequency; // How often to check in
  targetCount: number; // Target completions (e.g., 16 runs over 4 weeks)
  unit?: string; // e.g., "runs", "sessions", "days"

  // Invite permission settings
  invitePermission: 'owner_only' | 'all_members';
  sourceGroupId?: string; // If created from a group

  // Status
  status: ChallengeStatus;

  // Activity tracking
  lastActivityAt?: Timestamp;
  postCount?: number;
  totalCheckIns?: number;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChallengeCheckIn {
  id: string;
  challengeId: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  note?: string;
  mood?: string;
  proofImageUrl?: string;
  createdAt: Timestamp;
}

export interface ChallengeParticipant {
  id: string;
  challengeId: string;
  userId: string;
  displayName?: string;
  avatar?: string;
  joinedAt: Timestamp;
  checkInCount: number;
  currentStreak: number;
  longestStreak: number;
  lastCheckInDate?: string;
  completedTarget: boolean;
  rank?: number; // Calculated field for leaderboard
}

// ==========================================
// INVITE MODELS
// ==========================================

export type InviteStatus = 'pending' | 'accepted' | 'declined';

export interface GroupInvite {
  id: string;
  groupId: string;
  groupName: string; // Denormalized for display
  inviterId: string;
  inviterName: string; // Denormalized for display
  inviteeId: string;
  status: InviteStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface ChallengeInvite {
  id: string;
  challengeId: string;
  challengeName: string; // Denormalized for display
  inviterId: string;
  inviterName: string; // Denormalized for display
  inviteeId: string;
  status: InviteStatus;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Post {
  id: string;
  userId: string;
  groupId: string;
  content: string;
  imageUrl?: string;
  likes: string[]; // array of user IDs
  comments: Comment[];
  postType?: 'update' | 'win' | 'reflection' | 'ask';
  challengeId?: string;
  challengeName?: string;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface Comment {
  id: string;
  userId: string;
  content: string;
  createdAt: Timestamp;
}

// ==========================================
// CONNECTION MODELS
// ==========================================

export interface Connection {
  id: string;
  a: string; // user ID
  b: string; // user ID
  pairId: string; // sorted IDs joined with _
  status: 'pending' | 'accepted' | 'declined';
  requestedBy: string; // user ID who sent request
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// MESSAGING MODELS
// ==========================================

export interface Conversation {
  id: string;
  participants: string[]; // array of user IDs
  lastMessage?: string;
  lastMessageAt?: Timestamp;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface DirectMessage {
  id: string;
  conversationId: string;
  senderId: string;
  receiverId: string;
  text: string;
  read: boolean;
  createdAt: Timestamp;
}

// ==========================================
// NOTIFICATION MODELS
// ==========================================

export type NotificationType =
  | 'connection'
  | 'message'
  | 'post'
  | 'comment'
  | 'system'
  | 'goal_milestone'         // 25%, 50%, 75%, 100% progress
  | 'goal_completed'         // Goal reached 100%
  | 'daily_reminder'         // Daily rhythm reminder
  | 'community_activity'     // Group activity
  | 'welcome_back';          // Returning user welcome

export interface Notification {
  id: string;
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, string | number | boolean>;
  createdAt: Timestamp;
}

// ==========================================
// NOTIFICATION PREFERENCES MODELS
// ==========================================

export type NotificationFrequency = 'realtime' | 'daily' | 'weekly' | 'never';
export type ReminderTime = { hour: number; minute: number };

export interface NotificationCategory {
  enabled: boolean;
  frequency?: NotificationFrequency;
  // For push vs in-app control
  push?: boolean;
  inApp?: boolean;
}

export interface LegacyNotificationPreferences {
  enabled?: boolean;
  [key: string]: unknown;
}

export interface NotificationPreferences {
  id: string;
  userId: string;
  schemaVersion?: number;

  // Master toggle
  allNotificationsEnabled: boolean;

  // Quiet Hours
  quietHours: {
    enabled: boolean;
    startTime: ReminderTime;
    endTime: ReminderTime;
  };

  // Daily Rhythm (1 notification/day at user-selected time)
  dailyRhythm: {
    enabled: boolean;
    reminderTime: ReminderTime | null;
  };

  // Insights & Learning (2-3/week brain-health content)
  insightsLearning: {
    enabled: boolean;
    frequency: 'twice_weekly' | 'three_weekly';
  };

  // Social & Connection
  socialConnection: {
    directMessages: boolean;
    connectionRequests: boolean;
    communityDigest: boolean;
  };

  // Milestones & Reflection (calendar-time based, not streaks)
  milestonesReflection: {
    enabled: boolean;
  };

  completionSound: {
    enabled: boolean;
    sound: 'singing-bowl' | 'soft-chime' | 'nature-bell' | 'stream';
  };

  // Legacy fields (kept for backward compat during migration)
  dailyReminders?: LegacyNotificationPreferences;
  milestones?: LegacyNotificationPreferences;
  messages?: LegacyNotificationPreferences;
  community?: LegacyNotificationPreferences;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// API REQUEST/RESPONSE TYPES
// ==========================================

export interface DailyPlanRequest {
  userId: string;
  goals?: Goal[];
  habits?: Habit[];
  tasks?: Task[];
}

export interface DailyPlanResponse {
  plan: string;
  suggestions: string[];
}

export interface AIPromptRequest {
  context: string;
  type: 'goal' | 'habit' | 'task' | 'journal';
}

export interface AIPromptResponse {
  prompt: string;
}

export interface JournalPromptRawResponse {
  text: string;
}

export interface JournalSummaryRequest {
  userId: string;
  entries: JournalEntry[];
  startDate: string;
  endDate: string;
}

export interface JournalSummaryResponse {
  summary: string;
  insights: string[];
}

// ==========================================
// BRAIN HEALTH TRACKING MODELS
// ==========================================

export interface BrainMetrics {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  readinessScore: number; // 0-100 calculated score
  sleepQuality: number; // 1-5 user input
  hydrationChecks: number; // 0-8 glasses
  stressLevel: number; // 1-5 user input
  nervousSystemToolUses: number; // count of sigh + panoramic vision uses
  amccCompleted: boolean; // Did One Hard Thing completed
  amccType?: 'cold' | 'movement' | 'conversation' | 'skill';
  neuroplasticityStimulus: boolean; // Did something uncomfortable
  focusMinutes: number; // Total focus session time
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

export interface NervousSystemSession {
  id: string;
  userId: string;
  type: 'physiological-sigh' | 'panoramic-vision';
  duration: number; // seconds
  completedAt: Timestamp;
}

export interface AMCCChallenge {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  type: 'cold' | 'movement' | 'conversation' | 'skill';
  description: string;
  completed: boolean;
  reflection?: string;
  completedAt?: Timestamp;
  createdAt: Timestamp;
}

// ==========================================
// VARA WELLNESS SCORE MODELS
// ==========================================

/**
 * Wellness Score Pillar
 * Individual component scores that make up the overall wellness score
 */
export interface WellnessScorePillar {
  name: 'foundation' | 'consistency' | 'mind' | 'growth';
  score: number; // 0-100 for the pillar
  weight: number; // Percentage weight (0.40, 0.30, 0.20, 0.10)
  weightedScore: number; // score * weight
  components: WellnessScoreComponent[];
}

/**
 * Individual component within a pillar
 */
export interface WellnessScoreComponent {
  name: string;
  value: number; // Raw value or normalized 0-100
  maxValue?: number; // For display purposes (e.g., "3/5 habits")
  contribution: number; // Points contributed to pillar score
  status: 'positive' | 'neutral' | 'negative' | 'missing'; // For UI coloring
  label?: string; // Human-readable label
  hasData: boolean; // Whether this component has actual user data
  actionRoute?: string; // Navigation route to complete this component
  actionLabel?: string; // Label for the action button (e.g., "Log sleep")
}

/**
 * Incomplete action item for wellness score
 */
export interface WellnessIncompleteAction {
  component: string; // Component name
  label: string; // Human-readable label
  description: string; // What the user needs to do
  route: string; // Navigation route
  priority: number; // 1 = highest priority
  pillar: 'foundation' | 'consistency' | 'mind' | 'growth';
}

/**
 * Morning Check-In
 * Quick subjective input to ground the objective data
 */
export interface MorningCheckIn {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format
  energyLevel: number; // 1-5 scale
  mood: number; // 1-5 scale
  note?: string; // Optional quick note
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

// ==========================================
// BRAIN STATE CHECK-IN (Dashboard V2)
// ==========================================

export type BrainState = 'wired' | 'foggy' | 'okay' | 'clear' | 'energized';

/**
 * Brain State Check-In
 * Single-tap daily check-in that maps to a recommended protocol.
 * Stored in the `brainStateCheckIns` collection.
 */
export interface BrainStateCheckIn {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  brainState: BrainState;
  protocolId: string;
  protocolCompleted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Daily Wellness Score
 * Calculated daily score with full breakdown
 */
export interface DailyWellnessScore {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD format

  // Overall score
  score: number; // 0-100 composite score
  previousScore: number | null; // Yesterday's score for trend (null if no previous)
  trend: 'up' | 'down' | 'stable'; // Compared to yesterday

  // Pillar breakdown
  pillars: {
    foundation: WellnessScorePillar;
    consistency: WellnessScorePillar;
    mind: WellnessScorePillar;
    growth: WellnessScorePillar;
  };

  // Quick insights for the user
  topContributor?: string; // What's helping most
  topDetractor?: string; // What's dragging the score down
  suggestion?: string; // One actionable suggestion

  // Data completeness (for transparency)
  dataCompleteness: number; // 0-100 how much data we have
  missingData: string[] | null; // What data is missing (null if none)

  // Score context
  maxPossibleScore: number; // Max score possible with current data (components with data)
  componentsTracked: number; // How many components have data
  componentsTotal: number; // Total possible components

  // Actionable items to complete the score
  incompleteActions: WellnessIncompleteAction[];

  // Morning check-in data (if submitted)
  morningCheckIn: {
    energyLevel: number;
    mood: number;
  } | null;

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

/**
 * Wellness Score History Entry (for trends/charts)
 */
export interface WellnessScoreHistoryEntry {
  date: string;
  score: number;
  pillars: {
    foundation: number;
    consistency: number;
    mind: number;
    growth: number;
  };
}

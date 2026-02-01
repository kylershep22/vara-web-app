/**
 * Data Model Types
 * TypeScript interfaces for all Firestore collections
 */

import { Timestamp } from 'firebase/firestore';

// ==========================================
// USER MODELS
// ==========================================

export interface UserProfile {
  uid: string;
  displayName: string;
  email: string;
  bio?: string;
  avatar?: string;
  privacy: 'public' | 'connections' | 'private';
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

  createdAt: Timestamp;
  updatedAt: Timestamp;
}

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
  // Activity tracking
  lastActivityAt?: Timestamp;
  postCount?: number;
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

export interface Notification {
  id: string;
  userId: string;
  type: 'connection' | 'message' | 'post' | 'comment' | 'system';
  title: string;
  body: string;
  read: boolean;
  data?: Record<string, any>;
  createdAt: Timestamp;
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

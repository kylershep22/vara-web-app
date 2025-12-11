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
  content: string;
  mood?: 'great' | 'good' | 'okay' | 'bad' | 'terrible';
  tags?: string[];
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

export interface Group {
  id: string;
  ownerId: string;
  name: string;
  description?: string;
  visibility: 'public' | 'private';
  members: string[]; // array of user IDs
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

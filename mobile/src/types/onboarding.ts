/**
 * Onboarding Types
 * TypeScript interfaces for the onboarding flow
 */

import { Timestamp } from 'firebase/firestore';
import { BrainPillar } from './models';
import { ValueId } from '../constants/values';

// ==========================================
// CHECK-IN DATA
// ==========================================

/**
 * Data captured during the Quick Check-in screen (Screen 2)
 * Each dimension is rated 1-10
 */
export interface OnboardingCheckInData {
  energy: number;      // 1-10: User's current energy level
  focus: number;       // 1-10: User's current focus/attention
  mood: number;        // 1-10: User's current emotional state
  timestamp: string;   // ISO 8601 timestamp
}

// ==========================================
// INSIGHT GENERATION
// ==========================================

/**
 * Result of the insight generation based on check-in data
 * Displayed on the Brain-Health Insight screen (Screen 3)
 */
export interface OnboardingInsightResult {
  text: string;                    // Personalized insight message (2-3 sentences)
  recommendedFocus: BrainPillar;   // AI-recommended starting focus area
  focusExplanation: string;        // Why this focus was recommended
}

// ==========================================
// ACTIVITY DATA
// ==========================================

/**
 * Activity option presented on the Try One Thing screen (Screen 4)
 */
export interface OnboardingActivityOption {
  id: string;
  name: string;
  type: 'breathing' | 'reflection' | 'intention';
  duration: string;             // Display format: "30 sec", "1 min", "2 min"
  durationSeconds: number;      // Actual duration in seconds
  icon: string;                 // MaterialCommunityIcons name
  description: string;          // Brief description of the activity
  prompt?: string;              // For reflection/intention: the question or prompt
}

/**
 * Data recorded when user completes an activity
 */
export interface CompletedOnboardingActivity {
  id: string;
  name: string;
  type: 'breathing' | 'reflection' | 'intention';
  duration: string;
  completedAt: Timestamp;
  response?: string;            // User's text response (for reflection/intention)
}

// ==========================================
// ONBOARDING STATE
// ==========================================

/**
 * Complete state of the onboarding flow
 * Used for navigation and persistence
 */
export interface OnboardingState {
  checkIn: OnboardingCheckInData | null;
  insight: OnboardingInsightResult | null;
  selectedFocus: BrainPillar | null;
  completedActivity: CompletedOnboardingActivity | null;
  habitCreated: boolean;
  isComplete: boolean;
}

// ==========================================
// FEATURE DISCOVERY (Contextual Tooltips)
// ==========================================

/**
 * Tracks which app sections the user has visited for contextual tooltips
 */
export interface OnboardingFeatureDiscoveryState {
  dashboardSeen: boolean;         // Home tab
  dailyHubSeen: boolean;          // Track tab
  deepWorkSeen: boolean;          // Focus tab
  connectSeen: boolean;           // Community tab
  wellnessLibrarySeen: boolean;   // More/Wellness tab
}

// ==========================================
// NAVIGATION PARAMS
// ==========================================

/**
 * Navigation params passed between onboarding screens
 */
export type OnboardingStackParamList = {
  OnboardingWelcome: undefined;
  OnboardingCheckIn: undefined;
  OnboardingInsight: {
    checkIn: OnboardingCheckInData;
  };
  OnboardingActivity: {
    checkIn: OnboardingCheckInData;
    insight: OnboardingInsightResult;
    selectedFocus: BrainPillar;
  };
  OnboardingConfirmation: {
    checkIn: OnboardingCheckInData;
    insight: OnboardingInsightResult;
    selectedFocus: BrainPillar;
    completedActivity: CompletedOnboardingActivity;
  };
  OnboardingValues: {
    checkIn: OnboardingCheckInData;
    insight: OnboardingInsightResult;
    selectedFocus: BrainPillar;
    completedActivity: CompletedOnboardingActivity | null;
  };
  OnboardingPersonalizedEntry: {
    checkIn: OnboardingCheckInData;
    insight: OnboardingInsightResult;
    selectedFocus: BrainPillar;
    completedActivity: CompletedOnboardingActivity | null;
    selectedValues: ValueId[];
  };
};

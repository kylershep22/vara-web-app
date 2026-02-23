/**
 * Feature Discovery Types
 * Defines types for the progressive discovery system
 *
 * Design Philosophy: Features unlock through natural engagement,
 * not time gates. Users preview upcoming features and organically
 * unlock them as they explore the app.
 */

import { Timestamp } from 'firebase/firestore';
import { BrainPillar } from '../constants/featureUnlock';

/**
 * Discoverable features that can be in upcoming/available/active states
 * These are the main features shown in the "Coming up" section
 */
export type DiscoverableFeatureId =
  | 'journal'
  | 'discover'
  | 'community'
  | 'brain_dashboard'
  | 'ai_chat'
  | 'breathwork_full'
  | 'movement'
  | 'sleep'
  | 'challenges'
  | 'messaging'
  | 'masterclass'
  | 'goals_advanced'
  | 'habits_advanced'
  | 'journal_ai';

/**
 * Feature discovery status
 * - upcoming: Not yet unlocked, shows soft-reveal card, tap opens preview
 * - available: Just unlocked, shows active card with glow, toast shown
 * - active: User has opened the feature at least once after unlock
 */
export type FeatureDiscoveryStatus = 'upcoming' | 'available' | 'active';

/**
 * Individual feature discovery state
 */
export interface FeatureDiscoveryState {
  /** Current status of the feature */
  status: FeatureDiscoveryStatus;
  /** When the feature was unlocked (null if still upcoming) */
  unlockedAt: Date | null;
  /** Whether the unlock toast has been shown */
  toastShown: boolean;
  /** When the user first opened the feature after unlock */
  firstOpenedAt: Date | null;
}

/**
 * All discoverable features state map
 */
export type FeatureDiscoveryMap = {
  [K in DiscoverableFeatureId]: FeatureDiscoveryState;
};

/**
 * User engagement metrics used for unlock trigger evaluation
 */
export interface UserEngagementMetrics {
  /** Total number of app sessions */
  sessionCount: number;
  /** Number of habits completed (all time) */
  habitsCompleted: number;
  /** Number of morning check-ins completed */
  morningCheckInsCompleted: number;
  /** Number of journal entries created */
  journalEntriesCount: number;
  /** Number of goals created */
  goalsCreated: number;
  /** Number of breathwork sessions completed */
  breathworkSessionsCount: number;
  /** Number of discover articles read */
  discoverArticlesRead: number;
  /** Number of groups joined */
  groupsJoined: number;
  /** Number of distinct features engaged with */
  featuresEngaged: string[];
  /** Last activity timestamp */
  lastActivityAt: Date | null;
}

/**
 * Unlock trigger definition
 * Defines the conditions under which a feature becomes available
 */
export interface UnlockTrigger {
  /** Feature this trigger unlocks */
  featureId: DiscoverableFeatureId;
  /** Human-readable description of the unlock condition */
  description: string;
  /** Function to evaluate if the trigger condition is met */
  evaluate: (metrics: UserEngagementMetrics, selectedPillar: BrainPillar | null) => boolean;
  /** Priority for evaluation order (lower = earlier) */
  priority: number;
}

/**
 * Feature preview content for the bottom sheet
 */
export interface FeaturePreviewContent {
  /** Feature identifier */
  id: DiscoverableFeatureId;
  /** Feature title */
  title: string;
  /** Short tagline */
  tagline: string;
  /** Longer description paragraph */
  description: string;
  /** Icon name (MaterialCommunityIcons) */
  icon: string;
  /** "What's inside" list items */
  whatsInside: string[];
  /** Availability note (shown when upcoming) */
  availabilityNote: string;
  /** CTA label when feature is available */
  ctaAvailable: string;
  /** Navigation target when feature is available */
  navigationTarget: string;
}

/**
 * Feature card content for home screen
 */
export interface FeatureCardContent {
  /** Feature identifier */
  id: DiscoverableFeatureId;
  /** Feature name */
  name: string;
  /** Subtitle for soft-reveal (upcoming) state */
  subtitleUpcoming: string;
  /** Subtitle for newly available state */
  subtitleAvailable: string;
  /** Icon name (MaterialCommunityIcons) */
  icon: string;
}

/**
 * Toast content for unlock notifications
 */
export interface UnlockToastContent {
  /** Feature identifier */
  id: DiscoverableFeatureId;
  /** Toast title */
  title: string;
  /** Toast subtitle */
  subtitle: string;
  /** Icon name (MaterialCommunityIcons) */
  icon: string;
}

/**
 * Firestore document structure for feature discovery
 * Stored in user document under featureDiscovery field
 */
export interface FeatureDiscoveryDocument {
  /** Map of feature states */
  features: {
    [K in DiscoverableFeatureId]?: {
      status: FeatureDiscoveryStatus;
      unlockedAt: Timestamp | null;
      toastShown: boolean;
      firstOpenedAt: Timestamp | null;
    };
  };
  /** User engagement metrics for trigger evaluation */
  engagement: {
    sessionCount: number;
    habitsCompleted: number;
    morningCheckInsCompleted: number;
    journalEntriesCount: number;
    goalsCreated: number;
    breathworkSessionsCount: number;
    discoverArticlesRead: number;
    groupsJoined: number;
    featuresEngaged: string[];
    lastActivityAt: Timestamp | null;
  };
  /** When the discovery system was initialized */
  initializedAt: Timestamp;
  /** Last time triggers were evaluated */
  lastEvaluatedAt: Timestamp | null;
}

/**
 * Pending toast to be shown
 */
export interface PendingUnlockToast {
  featureId: DiscoverableFeatureId;
  queuedAt: Date;
}

/**
 * Hook return type for useFeatureDiscovery
 */
export interface UseFeatureDiscoveryReturn {
  /** Map of all feature discovery states */
  features: FeatureDiscoveryMap | null;
  /** User engagement metrics */
  engagement: UserEngagementMetrics | null;
  /** Features currently in "upcoming" status */
  upcomingFeatures: DiscoverableFeatureId[];
  /** Features currently in "available" status (just unlocked) */
  availableFeatures: DiscoverableFeatureId[];
  /** Features in "active" status (opened after unlock) */
  activeFeatures: DiscoverableFeatureId[];
  /** Pending toasts to show */
  pendingToasts: PendingUnlockToast[];
  /** Whether the hook is loading */
  loading: boolean;
  /** Error state */
  error: Error | null;
  /** Check if a feature is accessible (available or active) */
  isAccessible: (featureId: DiscoverableFeatureId) => boolean;
  /** Check if a feature is upcoming (preview only) */
  isUpcoming: (featureId: DiscoverableFeatureId) => boolean;
  /** Mark a feature as opened (transitions available → active) */
  markFeatureOpened: (featureId: DiscoverableFeatureId) => Promise<void>;
  /** Mark a toast as shown */
  markToastShown: (featureId: DiscoverableFeatureId) => Promise<void>;
  /** Manually trigger evaluation of unlock conditions */
  evaluateTriggers: () => Promise<DiscoverableFeatureId[]>;
  /** Increment an engagement metric */
  trackEngagement: (metric: keyof Omit<UserEngagementMetrics, 'featuresEngaged' | 'lastActivityAt'>, increment?: number) => Promise<void>;
  /** Track a feature as engaged */
  trackFeatureEngaged: (featureId: string) => Promise<void>;
  /** Get preview content for a feature */
  getPreviewContent: (featureId: DiscoverableFeatureId) => FeaturePreviewContent;
  /** Get card content for a feature */
  getCardContent: (featureId: DiscoverableFeatureId) => FeatureCardContent;
  /** Get toast content for a feature */
  getToastContent: (featureId: DiscoverableFeatureId) => UnlockToastContent;
}

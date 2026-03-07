# Vara Mobile App: Strategic Implementation Plan

**Status:** TEMPORARY - Delete after implementation complete
**Created:** 2026-02-13
**Based on:** Competitive Analysis & Market Research Report

---

## Overview

10 strategic improvements organized by priority tier. Community changes and paywall excluded (paywall already built, community deferred).

---

## Tier 1: Pre-Launch Critical

### 1. "Calm Start" Onboarding Mode

**Priority:** Very High | **Effort:** High

#### Current State
- 4-screen linear onboarding flow
- User selects multiple focus areas
- All 50+ features unlock immediately after completion

#### Goal
Progressive feature unlocking that guides without restricting. Users can skip ahead anytime.

#### Implementation

**A. Single Pillar Selection**

Modify `OnboardingFocusScreen.tsx` to single-select (not multi-select):
- Focus
- Energy
- Growth
- Resilience
- Connection

Each pillar unlocks a curated starter set of features.

**B. Feature Unlock Tiers**

```
Day 1:  Core features for selected pillar
Day 7:  Additional related features
Day 14: All features unlocked
```

Example for "Focus" pillar:
- Day 1: Pomodoro timer, journaling, basic breathwork
- Day 7: Full breathwork library, movement, insights
- Day 14: Full brain dashboard, all pillars, advanced features

**C. "Unlock Everything" Escape Hatch**

Users can skip progressive unlocking at any time:
- Persistent "Unlock All Features" option in settings
- Optional prompt after completing Day 1 features: "Ready for more?"
- One tap to immediately access full app
- Track in analytics which users skip vs complete journey

**D. Locked Feature Presentation**

Show locked features as teasers (not hidden):
- Grayed/dimmed card with lock icon
- "Unlocks in X days" or "Unlock now" option
- Tapping shows preview + unlock options

#### Files to Create
- `mobile/src/services/firebase/featureUnlock.service.ts`
- `mobile/src/hooks/useFeatureUnlock.ts`
- `mobile/src/components/shared/FeatureGate.tsx`
- `mobile/src/components/shared/LockedFeaturePreview.tsx`

#### Files to Modify
- `mobile/src/screens/onboarding/OnboardingFocusScreen.tsx` (single-select)
- `mobile/src/navigation/AppNavigator.tsx` (feature gating)
- `mobile/src/screens/DashboardScreen.tsx` (show unlock progress)
- `mobile/src/screens/SettingsScreen.tsx` (add unlock all option)

#### Data Model

```typescript
// In users/{userId} document
{
  onboarding: {
    completedAt: Timestamp,
    selectedPillar: 'focus' | 'energy' | 'growth' | 'resilience' | 'connection',
    featureUnlockMode: 'progressive' | 'full', // 'full' if user skipped
    unlockedAt?: Timestamp // if user chose to unlock early
  }
}

// Feature unlock state (computed from above + days since onboarding)
interface FeatureUnlockState {
  currentTier: 1 | 2 | 3;
  unlockedFeatures: string[];
  lockedFeatures: string[];
  daysUntilNextUnlock: number;
  canUnlockAll: boolean;
}
```

---

### 2. Define "Day One Win"

**Priority:** Very High | **Effort:** Medium

#### Current State
- Onboarding creates first habit from templates
- No immediate completion moment
- User leaves having "set up" but not "done"

#### Goal
User completes something meaningful in their first session.

#### Implementation

**A. New Final Onboarding Screen**

Add `OnboardingFirstWinScreen.tsx` after `OnboardingQuickStartScreen`:

```typescript
const FIRST_WIN_OPTIONS = [
  {
    id: 'reflection',
    title: '2-Minute Reflection',
    subtitle: 'Set an intention for your wellness journey',
    duration: '2 min',
    icon: 'book-outline'
  },
  {
    id: 'breath',
    title: 'Grounding Breath',
    subtitle: 'A quick breathing exercise to center yourself',
    duration: '1 min',
    icon: 'leaf-outline'
  },
  {
    id: 'brain_check',
    title: 'Brain Readiness Check',
    subtitle: 'How is your mind feeling right now?',
    duration: '30 sec',
    icon: 'pulse-outline'
  }
];
```

**B. Inline Completion Components**

Each option completes without navigating away:

1. **Quick Reflection:**
   - Single text input: "What's one thing you want to focus on?"
   - 200 character limit
   - Save as first journal entry

2. **Grounding Breath:**
   - 1-minute guided breathing animation
   - Simple inhale/exhale visual
   - No audio required

3. **Brain Check-in:**
   - 3 quick sliders (energy, focus, calm)
   - Immediate score display
   - Save as first brain readiness entry

**C. Celebration Moment**

After completion:
- Confetti animation (use existing `useCelebrations` hook)
- "You did it! Your wellness journey has begun."
- Transition to main dashboard

#### Files to Create
- `mobile/src/screens/onboarding/OnboardingFirstWinScreen.tsx`
- `mobile/src/components/onboarding/QuickReflection.tsx`
- `mobile/src/components/onboarding/QuickBreathwork.tsx`
- `mobile/src/components/onboarding/QuickBrainCheckin.tsx`

#### Files to Modify
- `mobile/src/navigation/AppNavigator.tsx` (add to onboarding stack)

#### Data Model

```typescript
// In users/{userId} document
{
  onboarding: {
    // ... existing fields
    firstWin: {
      type: 'reflection' | 'breath' | 'brain_check',
      completedAt: Timestamp
    }
  }
}
```

---

### 3. Resolve Streak Contradiction

**Priority:** High | **Effort:** Low

#### Current State
- `calculateStreak()` in `HabitsScreen.tsx` counts consecutive days
- UI shows "X day streak" badges
- Milestone celebrations at 7, 21, 30, 66, 100 days
- Contradicts UI Standards which prohibit streak pressure

#### Goal
Replace streak counters with "consistency rhythm" visualization.

#### Implementation

**A. New Consistency Visualization Component**

```typescript
// mobile/src/components/habits/ConsistencyRhythm.tsx

interface ConsistencyRhythmProps {
  completions: Date[];
  habitName: string;
}

// Shows 30-day dot/heatmap pattern
// Completed days: filled dots (teal)
// Missed days: light dots (not red/alarming)
// Pattern speaks for itself without counting
```

**B. Language Changes**

Find and replace across codebase:

| Before | After |
|--------|-------|
| "X day streak" | "X days this month" or "Active X of last Y days" |
| "Don't break your streak" | (remove entirely) |
| "Streak: X" | "Your rhythm" |
| Streak fire emoji | Rhythm/wave icon or remove |

**C. Milestone Message Updates**

```typescript
const CONSISTENCY_MILESTONES = {
  7: {
    title: "A week of showing up",
    message: "Your brain is starting to notice this new pattern."
  },
  21: {
    title: "Three weeks of practice",
    message: "New neural pathways are forming."
  },
  30: {
    title: "30 times you've chosen this",
    message: "This is becoming part of who you are."
  },
  66: {
    title: "The habit threshold",
    message: "Research suggests this is now automatic for you."
  },
  100: {
    title: "100 sessions completed",
    message: "You've built something lasting."
  }
};
```

**D. Notification Copy Updates**

Update `useNotificationScheduler.ts` messages:
- Before: "Don't lose your streak! Check in now."
- After: "Ready for your [habit name]?"

#### Files to Create
- `mobile/src/components/habits/ConsistencyRhythm.tsx`

#### Files to Modify
- `mobile/src/screens/HabitsScreen.tsx` (replace streak display)
- `mobile/src/screens/DashboardScreen.tsx` (update habit card)
- `mobile/src/components/celebrations/StreakMilestoneModal.tsx` (rename, update copy)
- `mobile/src/hooks/useNotificationScheduler.ts` (update notification copy)

---

## Tier 2: First 90 Days

### 4. Simplify Brain Health Vocabulary

**Priority:** High | **Effort:** Medium

#### Current State
- 7 brain components with specialized terminology
- Terms: AMCC, neuroplasticity, circadian rhythm, nervous system
- `BrainPillarInfoModal` provides education
- Heavy cognitive load for casual users

#### Goal
Plain language by default, science as optional depth.

#### Implementation

**A. Plain Language Translation Layer**

```typescript
// mobile/src/constants/brainHealth.ts

export const BRAIN_HEALTH_TRANSLATIONS = {
  components: {
    'AMCCChallengeCard': {
      scientific: 'AMCC Challenge',
      plain: 'Do One Hard Thing',
      description: 'Building mental resilience through daily challenges'
    },
    'NeuroplasticityTracker': {
      scientific: 'Neuroplasticity Tracker',
      plain: 'Try Something New',
      description: 'Your brain grows when you step outside your comfort zone'
    },
    'NervousSystemToolsWidget': {
      scientific: 'Nervous System Tools',
      plain: 'Calm Your Mind',
      description: 'Techniques to help you feel centered'
    },
    'BrainReadinessWidget': {
      scientific: 'Brain Readiness Score',
      plain: 'How Fresh Is Your Mind?',
      description: 'A quick check-in on your mental state'
    },
    'FocusWindowIndicator': {
      scientific: 'Circadian Focus Windows',
      plain: 'Your Best Hours',
      description: 'When your brain is naturally most alert'
    }
  }
};
```

**B. User Preference Toggle**

```typescript
// In user preferences
{
  preferences: {
    showBrainScience: false // default: plain language
  }
}

// Hook usage
const { showScience } = useUserPreferences();
const label = showScience ? translation.scientific : translation.plain;
```

**C. Progressive Science Disclosure**

On each brain card:
1. Default: Plain language title + simple description
2. On tap/expand: Brief science explanation
3. "Learn more" link: Opens full `BrainPillarInfoModal`

#### Files to Create
- `mobile/src/constants/brainHealth.ts`

#### Files to Modify
- `mobile/src/components/brain/AMCCChallengeCard.tsx`
- `mobile/src/components/brain/NeuroplasticityTracker.tsx`
- `mobile/src/components/brain/NervousSystemToolsWidget.tsx`
- `mobile/src/components/brain/BrainReadinessWidget.tsx`
- `mobile/src/components/brain/FocusWindowIndicator.tsx`
- `mobile/src/screens/SettingsScreen.tsx` (add toggle)

---

### 5. Flatten Key User Journeys

**Priority:** High | **Effort:** Medium

#### Current State
- Dashboard: 1-2 taps for Journal, Habits, Goals
- Breathwork: Dashboard → Wellness → Discover → Breathwork → Session (4 taps)
- Some features unnecessarily deep

#### Goal
Core daily actions within 2 taps maximum.

#### Implementation

**A. Quick Action Carousel on Dashboard**

```typescript
// mobile/src/components/dashboard/QuickActionCarousel.tsx

const QUICK_ACTIONS = [
  { id: 'breathe', icon: 'leaf-outline', label: 'Breathe', action: 'openBreathworkQuick' },
  { id: 'journal', icon: 'book-outline', label: 'Journal', screen: 'Journal' },
  { id: 'focus', icon: 'timer-outline', label: 'Focus', screen: 'Focus' },
  { id: 'move', icon: 'walk-outline', label: 'Move', action: 'openMovementQuick' },
  { id: 'sleep', icon: 'moon-outline', label: 'Sleep', action: 'openSleepQuick' }
];

// Horizontal scrollable row of circular buttons
// Placed prominently on dashboard (after greeting, before other cards)
```

**B. Quick Start Modals**

For deep features, create modal shortcuts:

```typescript
// mobile/src/components/library/BreathworkQuickStart.tsx

// Modal with 3 preset options - no browsing required
const QUICK_BREATHWORK = [
  { duration: 60, technique: 'box', label: '1 min - Box Breathing' },
  { duration: 180, technique: '478', label: '3 min - 4-7-8 Calm' },
  { duration: 300, technique: 'coherent', label: '5 min - Coherent Breathing' }
];

// "Browse full library" link at bottom for users who want more
```

Similar quick-start modals for Movement and Sleep.

**C. Flatten Discover Screen**

Current: Category cards → Category screen → Item
Target: Show top 2-3 items per category inline

```typescript
// In DiscoverScreen.tsx
// Instead of just category cards, show:
// - Category header
// - Top 2-3 items for that category (horizontal scroll)
// - "See all" link to full category
```

#### Files to Create
- `mobile/src/components/dashboard/QuickActionCarousel.tsx`
- `mobile/src/components/library/BreathworkQuickStart.tsx`
- `mobile/src/components/library/MovementQuickStart.tsx`
- `mobile/src/components/library/SleepQuickStart.tsx`

#### Files to Modify
- `mobile/src/screens/DashboardScreen.tsx` (add carousel)
- `mobile/src/screens/discover/DiscoverScreen.tsx` (flatten)

---

### 6. Build Offline-First for Core Actions

**Priority:** Medium | **Effort:** High

#### Current State
- Firestore `CACHE_SIZE_UNLIMITED` enabled (reads work offline)
- No explicit write queue for offline submissions
- No offline indicator in UI

#### Goal
Habit check-ins, journal entries, and timer sessions work offline.

#### Implementation

**A. Offline Queue Service**

```typescript
// mobile/src/services/offlineQueue.service.ts

interface QueuedAction {
  id: string;
  type: 'habit_completion' | 'journal_entry' | 'focus_session';
  payload: any;
  timestamp: number;
  retryCount: number;
}

class OfflineQueueService {
  private queue: QueuedAction[] = [];
  private readonly STORAGE_KEY = '@offline_queue';

  async addToQueue(action: Omit<QueuedAction, 'id' | 'timestamp' | 'retryCount'>): Promise<void>;
  async processQueue(): Promise<void>; // Called when online
  async getQueueLength(): Promise<number>;
  private async persistQueue(): Promise<void>;
  private async loadQueue(): Promise<void>;
}
```

**B. Network Status Hook**

```typescript
// mobile/src/hooks/useNetworkStatus.ts

import NetInfo from '@react-native-community/netinfo';

export const useNetworkStatus = () => {
  const [isOnline, setIsOnline] = useState(true);
  const [pendingActions, setPendingActions] = useState(0);

  // Subscribe to network changes
  // Auto-sync queue when coming back online

  return { isOnline, pendingActions };
};
```

**C. Offline Indicator Component**

```typescript
// mobile/src/components/shared/OfflineIndicator.tsx

// Subtle banner at top of screen when offline
// Shows pending action count
// Non-alarming styling (informational, not error)
```

**D. Wrap Core Actions**

Modify service functions to queue when offline:

```typescript
// In habits.service.ts
export const completeHabit = async (habitId: string, date: string) => {
  const isOnline = await NetInfo.fetch().then(s => s.isConnected);

  if (isOnline) {
    return markHabitCompleteFirestore(habitId, date);
  } else {
    await offlineQueue.addToQueue({
      type: 'habit_completion',
      payload: { habitId, date }
    });
    // Update local state optimistically
    return { queued: true };
  }
};
```

#### Files to Create
- `mobile/src/services/offlineQueue.service.ts`
- `mobile/src/hooks/useNetworkStatus.ts`
- `mobile/src/hooks/useOfflineQueue.ts`
- `mobile/src/components/shared/OfflineIndicator.tsx`

#### Files to Modify
- `mobile/src/services/firebase/habits.service.ts`
- `mobile/src/services/firebase/community.service.ts` (journal entries)
- `mobile/src/screens/DashboardScreen.tsx` (add indicator)
- `mobile/src/navigation/AppNavigator.tsx` (add indicator globally)

#### Dependencies to Add
```json
{
  "@react-native-community/netinfo": "^11.0.0"
}
```

---

### 7. Reduce Notification Surface Area

**Priority:** Medium | **Effort:** Low

#### Current State
- 12+ notification categories
- Granular control in `NotificationSettingsScreen`
- Quiet hours implemented
- All categories available immediately
- Not "quiet by default"

#### Goal
Launch with 2-3 essential channels, let users opt into more.

#### Implementation

**A. Change Default Preferences**

```typescript
// In notificationPreferences.service.ts

const DEFAULT_PREFERENCES: NotificationPreferences = {
  // ENABLED by default (essential)
  dailyReminders: true,
  weeklySummary: true,

  // DISABLED by default (opt-in)
  streakProtection: false,    // Was true
  milestones: false,          // Was true
  challengeReminders: false,
  communityActivity: false,
  directMessages: false,
  wellnessSuggestions: false,
  inactivityReminders: false,

  // Keep quiet hours
  quietHoursEnabled: false,
  quietHoursStart: '22:00',
  quietHoursEnd: '07:00'
};
```

**B. Simplify Settings UI**

```typescript
// NotificationSettingsScreen.tsx structure

<Section title="Your Notifications">
  <Toggle label="Daily Check-in Reminder" />
  <Toggle label="Weekly Progress Summary" />
</Section>

<ExpandableSection title="Get More Notifications" defaultExpanded={false}>
  <Toggle label="Milestone Celebrations" />
  <Toggle label="Consistency Support" /> // renamed from streak protection
  <Toggle label="AI Wellness Tips" />
  <Toggle label="Community Activity" />
  <Toggle label="Direct Messages" />
</ExpandableSection>

<Section title="Quiet Hours">
  {/* existing quiet hours UI */}
</Section>
```

**C. Notification Copy Audit**

Review and update all notification text:

| Category | Before | After |
|----------|--------|-------|
| Daily reminder | "Time to check in!" | "Ready for a moment of wellness?" |
| Consistency | "Don't lose your streak!" | "Your [habit] is waiting when you're ready" |
| Inactivity | "You haven't logged in 3 days" | "Your wellness journey is here when you need it" |
| Milestone | "AMAZING! 7 day streak!" | "7 days of showing up. Well done." |

#### Files to Modify
- `mobile/src/services/firebase/notificationPreferences.service.ts` (change defaults)
- `mobile/src/screens/NotificationSettingsScreen.tsx` (simplify UI)
- `mobile/src/hooks/useNotificationScheduler.ts` (update copy)

---

## Tier 3: Strategic (3-6 Months)

### 8. Wearable Integration

**Priority:** High | **Effort:** High

#### Current State
- Not implemented
- Brain readiness currently requires manual input (sleep, hydration, stress)

#### Goal
Auto-populate brain readiness data from health platforms, reducing friction.

#### Implementation

**A. Apple Health Integration (iOS First)**

```typescript
// mobile/src/services/health/appleHealth.service.ts

import AppleHealthKit from 'react-native-health';

const REQUESTED_PERMISSIONS = {
  read: [
    AppleHealthKit.Constants.Permissions.SleepAnalysis,
    AppleHealthKit.Constants.Permissions.HeartRateVariability,
    AppleHealthKit.Constants.Permissions.StepCount,
    AppleHealthKit.Constants.Permissions.ActiveEnergyBurned,
    AppleHealthKit.Constants.Permissions.MindfulSession
  ]
};

export const fetchSleepData = async (date: Date): Promise<SleepData>;
export const fetchHRV = async (date: Date): Promise<number | null>;
export const fetchActivityData = async (date: Date): Promise<ActivityData>;
```

**B. Google Health Connect (Android)**

```typescript
// mobile/src/services/health/googleHealth.service.ts

import { initialize, readRecords } from 'react-native-health-connect';

// Similar API surface as Apple Health service
```

**C. Platform Abstraction**

```typescript
// mobile/src/services/health/index.ts

import { Platform } from 'react-native';

export const healthService = Platform.select({
  ios: require('./appleHealth.service'),
  android: require('./googleHealth.service')
});
```

**D. Enhanced Brain Readiness**

```typescript
// Modify BrainReadinessWidget.tsx

// Show auto-populated values with source indicator
// Allow manual override
// "Data from Apple Health" / "Data from Health Connect" badge
```

**E. Consent Flow**

```typescript
// New: mobile/src/screens/settings/HealthConnectScreen.tsx

// Clear explanation of:
// - What data is accessed (read-only)
// - How it improves recommendations
// - Data stays on device, only derived scores stored
// - Can disconnect anytime
```

#### Files to Create
- `mobile/src/services/health/appleHealth.service.ts`
- `mobile/src/services/health/googleHealth.service.ts`
- `mobile/src/services/health/index.ts`
- `mobile/src/hooks/useHealthData.ts`
- `mobile/src/screens/settings/HealthConnectScreen.tsx`

#### Files to Modify
- `mobile/src/components/brain/BrainReadinessWidget.tsx`
- `mobile/src/screens/SettingsScreen.tsx` (add health connect option)

#### Dependencies to Add
```json
{
  "react-native-health": "^2.0.0",
  "react-native-health-connect": "^3.0.0"
}
```

---

### 9. Brain Health Education Content Moat

**Priority:** High | **Effort:** High (content, not code)

#### Current State
- Masterclass system built (`MasterclassScreen`, `MasterclassDetailScreen`)
- `BrainHealthInsightStrip` shows daily facts on dashboard
- Library structure exists for breathwork, movement, sleep
- Content needs population

#### Goal
Differentiate through unique brain-health education paired with daily tools.

#### Implementation

**A. Content Strategy (Non-Code)**

Target partners:
- Neuroscience communicators (accessible science explainers)
- Behavioral scientists with practical focus
- NOT clinical researchers (too academic)
- NOT wellness influencers (too hype-driven)

**B. Content Structure Enhancement**

```typescript
// Expand existing content model if needed

interface BrainHealthContent {
  id: string;
  type: 'article' | 'video' | 'audio' | 'interactive';
  pillar: 'focus' | 'energy' | 'growth' | 'resilience' | 'connection';
  difficulty: 'beginner' | 'intermediate' | 'advanced';
  scienceLevel: 'light' | 'moderate' | 'deep';

  title: string;
  summary: string;
  duration: number; // minutes

  // Pair education with action
  relatedPractice?: {
    type: 'breathwork' | 'movement' | 'journal_prompt';
    id: string;
  };
}
```

**C. Content Delivery Features**

Existing infrastructure supports:
- Daily brain fact (BrainHealthInsightStrip) - needs content
- Masterclass library - needs content
- Pillar-specific recommendations - needs content mapping

Minor enhancements:
- "Learn why" links from brain components to relevant education
- Weekly featured content based on user's focus pillar

#### Primary Work
- Content creation/curation (non-code)
- Partnership outreach (non-code)
- Content management workflow (minor code)

---

### 10. Accessibility Audit

**Priority:** Medium | **Effort:** Medium

#### Current State
- `useReducedMotion` hook implemented
- `accessibilityRole` and `accessibilityLabel` on many components
- 48px touch targets specified in UI standards
- No formal VoiceOver/TalkBack testing documented

#### Goal
WCAG 2.1 AA compliance, formal screen reader testing.

#### Implementation

**A. Audit Checklist**

```markdown
## Screen Reader Testing

### Per-Screen Checklist
- [ ] All interactive elements have accessibilityLabel
- [ ] accessibilityRole matches element function
- [ ] accessibilityState reflects current state (checked, expanded, etc.)
- [ ] Heading hierarchy uses accessibilityRole="header"
- [ ] Images/icons have descriptions
- [ ] Focus order is logical
- [ ] No content skipped by screen reader

### Global Checklist
- [ ] VoiceOver (iOS) full app walkthrough
- [ ] TalkBack (Android) full app walkthrough
- [ ] Switch Control testing
- [ ] Large text (200%) rendering
- [ ] Reduced motion animations disabled
- [ ] Color contrast WCAG AA (4.5:1 text, 3:1 UI)
```

**B. Known Gaps to Address**

Based on codebase review:
- Add `accessibilityLabel` to all `IconButton` instances
- Add `accessibilityRole="header"` to section titles
- Ensure modals announce properly when opened
- Test celebration animations respect reduced motion
- Verify touch targets meet 48dp minimum

**C. Documentation**

Create accessibility documentation:
- Testing results
- Known issues and remediation
- Component accessibility patterns for future development

#### Files to Create
- `mobile/ACCESSIBILITY_AUDIT.md` (testing results)

#### Files to Modify
- Various components (fixes based on audit findings)

---

## Implementation Sequence

### Phase 1: Pre-Launch (Weeks 1-3)

| Week | Focus | Items |
|------|-------|-------|
| 1 | Quick wins | #3 Streak → Consistency (low effort, high impact) |
| 2 | Core experience | #2 Day One Win |
| 3 | Foundation | #1 Calm Start Onboarding (foundation for progressive unlock) |

### Phase 2: Post-Launch Month 1-2

| Week | Focus | Items |
|------|-------|-------|
| 4-5 | Simplification | #4 Brain Health Vocabulary |
| 6-7 | Navigation | #5 Flatten User Journeys |
| 8 | Notifications | #7 Reduce Notification Surface |

### Phase 3: Post-Launch Month 2-3

| Week | Focus | Items |
|------|-------|-------|
| 9-12 | Reliability | #6 Offline-First Core Actions |

### Phase 4: Strategic (Months 4-6)

| Month | Focus | Items |
|-------|-------|-------|
| 4 | Health data | #8 Wearable Integration (iOS first) |
| 5 | Content | #9 Brain Health Education (content work) |
| 6 | Compliance | #10 Accessibility Audit |

---

## Success Metrics

### Tier 1 (Pre-Launch)
- Day-1 retention: Target 60%+ (from ~35% industry avg)
- Day-7 retention: Target 35%+ (from ~15% industry avg)
- Onboarding completion: Target 85%+
- First win completion: Target 90%+

### Tier 2 (90 Days)
- Avg taps to core action: Target <2
- Offline action success rate: Target 99%+
- Notification opt-out rate: Target <20%

### Tier 3 (6 Months)
- Wearable connection rate: Target 30%+ of users
- Accessibility compliance: WCAG 2.1 AA
- Content engagement: Masterclass completion rate

---

## Dependencies Summary

### New Packages

```json
{
  "@react-native-community/netinfo": "^11.0.0",
  "react-native-health": "^2.0.0",
  "react-native-health-connect": "^3.0.0"
}
```

### New Firebase Collections

```javascript
// Feature unlock already tracked in users/{userId}.onboarding
// No new collections required
```

---

## Open Questions

1. **Feature unlock tiers:** Exact feature mapping per pillar per tier?
2. **Offline queue limits:** Max queued actions before warning user?
3. **Wearable fallback:** If no wearable, still require manual input or estimate?
4. **Content partnerships:** Any existing relationships to leverage?

---

**DELETE THIS FILE AFTER ALL ITEMS IMPLEMENTED**

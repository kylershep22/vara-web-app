# Brain Check-In Entry Point Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Transform the dashboard into a brain-state-responsive experience where the check-in is the focal point, completing it visibly changes what the dashboard shows, and returning users see a compact status bar.

**Architecture:** A dashboard state machine with 3 phases (pre-checkin, post-checkin, returning) drives the entire layout. A new `getDashboardCardOrder` utility maps brain states to card ordering using the existing nudge priority map. Two new components (BrainBrief, BrainStatusBar) handle the post-checkin and returning states. The DashboardScreen wraps non-checkin cards in a muted container that animates to full opacity on check-in completion.

**Tech Stack:** React Native, TypeScript, react-native-reanimated, Expo

**Spec:** `docs/superpowers/specs/2026-04-11-brain-checkin-entry-point-design.md`

---

## File Map

| File | Action | Responsibility |
|------|--------|----------------|
| `mobile/src/utils/getDashboardCardOrder.ts` | Create | Map brain state to ordered card IDs using nudge priority map |
| `mobile/src/utils/getNudgeSuggestion.ts` | Modify | Update energized priority, add masterclass feature, export PRIORITY_MAP |
| `mobile/src/components/dashboard/BrainBrief.tsx` | Create | Personalized message card for post-checkin phase |
| `mobile/src/components/dashboard/BrainStatusBar.tsx` | Create | Compact status bar for returning phase |
| `mobile/src/hooks/useDashboard.ts` | Modify | Add dashboardPhase, hasSeenBriefThisSession ref, expose cardOrder |
| `mobile/src/screens/DashboardScreen.tsx` | Modify | Render based on phase: muted wrapper, brief/status bar, reordered cards |

---

### Task 1: Update Nudge Priority Map and Add Masterclass Feature

**Files:**
- Modify: `mobile/src/utils/getNudgeSuggestion.ts`

- [ ] **Step 1: Add masterclass to the Feature type and update energized priority**

In `mobile/src/utils/getNudgeSuggestion.ts`, update the Feature type (line 16):

Replace:
```typescript
type Feature = 'journal' | 'focus' | 'breathwork' | 'community' | 'brainHealth' | 'discover';
```

With:
```typescript
type Feature = 'journal' | 'focus' | 'breathwork' | 'community' | 'brainHealth' | 'discover' | 'masterclass';
```

- [ ] **Step 2: Update the energized priority and export PRIORITY_MAP**

Replace lines 18-24:

```typescript
const PRIORITY_MAP: Record<BrainState, Feature[]> = {
  wired: ['breathwork', 'journal', 'discover', 'community', 'brainHealth', 'focus'],
  foggy: ['focus', 'breathwork', 'brainHealth', 'journal', 'discover', 'community'],
  okay: ['journal', 'community', 'discover', 'focus', 'breathwork', 'brainHealth'],
  clear: ['focus', 'journal', 'brainHealth', 'discover', 'community', 'breathwork'],
  energized: ['focus', 'community', 'brainHealth', 'journal', 'discover', 'breathwork'],
};
```

With:
```typescript
export const PRIORITY_MAP: Record<BrainState, Feature[]> = {
  wired: ['breathwork', 'journal', 'discover', 'community', 'brainHealth', 'focus'],
  foggy: ['focus', 'breathwork', 'brainHealth', 'journal', 'discover', 'community'],
  okay: ['journal', 'community', 'discover', 'focus', 'breathwork', 'brainHealth'],
  clear: ['focus', 'journal', 'brainHealth', 'discover', 'community', 'breathwork'],
  energized: ['masterclass', 'community', 'brainHealth', 'journal', 'focus', 'breathwork'],
};
```

Two changes: `export` added to `PRIORITY_MAP`, and energized priority updated.

- [ ] **Step 3: Add masterclass to FEATURE_CONFIG**

After the `discover` entry in `FEATURE_CONFIG` (after line 105), add:

```typescript
  masterclass: {
    icon: 'school-outline',
    ctaLabel: 'Browse Masterclasses',
    screenName: 'DiscoverNavigator',
    headlines: {
      wired: { headline: 'Learn something calming', description: 'A masterclass can redirect a restless mind.' },
      foggy: { headline: 'Let an expert guide you', description: 'Sometimes listening is easier than doing.' },
      okay: { headline: 'Grow your knowledge', description: 'Masterclasses for your wellness journey.' },
      clear: { headline: 'Deepen your understanding', description: 'A clear mind absorbs knowledge best.' },
      energized: { headline: 'Feed your curiosity', description: 'Channel your energy into learning something new.' },
    },
  },
```

- [ ] **Step 4: Also export the BrainState and Feature types**

At line 15-16, change from unexported types to exported:

Replace:
```typescript
type BrainState = 'wired' | 'foggy' | 'okay' | 'clear' | 'energized';
type Feature = 'journal' | 'focus' | 'breathwork' | 'community' | 'brainHealth' | 'discover' | 'masterclass';
```

With:
```typescript
export type BrainState = 'wired' | 'foggy' | 'okay' | 'clear' | 'energized';
export type Feature = 'journal' | 'focus' | 'breathwork' | 'community' | 'brainHealth' | 'discover' | 'masterclass';
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/utils/getNudgeSuggestion.ts
git commit -m "feat(dashboard): update energized nudge priority, add masterclass feature, export types"
```

---

### Task 2: Create getDashboardCardOrder Utility

**Files:**
- Create: `mobile/src/utils/getDashboardCardOrder.ts`

- [ ] **Step 1: Create the utility file**

Create `mobile/src/utils/getDashboardCardOrder.ts`:

```typescript
/**
 * getDashboardCardOrder
 * Maps brain state to an ordered list of dashboard card IDs
 * using the nudge priority map from getNudgeSuggestion.
 */

import { PRIORITY_MAP, type BrainState, type Feature } from './getNudgeSuggestion';

/**
 * Dashboard card identifiers.
 * These match the keys used in DashboardScreen to render cards.
 */
export type DashboardCardId =
  | 'protocol'
  | 'nudge'
  | 'reflection'
  | 'habits'
  | 'routines'
  | 'weekInsight';

/**
 * Maps nudge features to the dashboard card they correspond to.
 * Features without a dedicated card (community, discover, masterclass)
 * map to 'nudge' since they surface as nudge suggestions.
 */
const FEATURE_TO_CARD: Record<Feature, DashboardCardId> = {
  breathwork: 'protocol',
  focus: 'routines',
  journal: 'reflection',
  brainHealth: 'weekInsight',
  community: 'nudge',
  discover: 'nudge',
  masterclass: 'nudge',
};

/**
 * Default card order when no brain state is available.
 */
const DEFAULT_ORDER: DashboardCardId[] = [
  'protocol',
  'nudge',
  'reflection',
  'habits',
  'routines',
  'weekInsight',
];

/**
 * Returns an ordered array of dashboard card IDs based on brain state.
 * Uses the nudge priority map to determine card ordering.
 * Cards not covered by the priority map are appended at the end.
 */
export function getDashboardCardOrder(brainState: BrainState | null): DashboardCardId[] {
  if (!brainState) return DEFAULT_ORDER;

  const priorities = PRIORITY_MAP[brainState];
  if (!priorities) return DEFAULT_ORDER;

  const ordered: DashboardCardId[] = [];
  const seen = new Set<DashboardCardId>();

  for (const feature of priorities) {
    const cardId = FEATURE_TO_CARD[feature];
    if (cardId && !seen.has(cardId)) {
      ordered.push(cardId);
      seen.add(cardId);
    }
  }

  // Append any cards not covered by the priority map
  for (const cardId of DEFAULT_ORDER) {
    if (!seen.has(cardId)) {
      ordered.push(cardId);
      seen.add(cardId);
    }
  }

  return ordered;
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/utils/getDashboardCardOrder.ts
git commit -m "feat(dashboard): add getDashboardCardOrder utility for brain-state card ordering"
```

---

### Task 3: Create BrainBrief Component

**Files:**
- Create: `mobile/src/components/dashboard/BrainBrief.tsx`

- [ ] **Step 1: Create the component**

Create `mobile/src/components/dashboard/BrainBrief.tsx`:

```typescript
/**
 * BrainBrief
 * Personalized message shown after completing the brain check-in.
 * Appears in the post-checkin dashboard phase.
 */

import React from 'react';
import { View, Text, StyleSheet } from 'react-native';
import Animated, { FadeIn, SlideInUp } from 'react-native-reanimated';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';
import { BrainState } from '../../types';

interface BrainBriefProps {
  brainState: BrainState;
}

const BRAIN_STATE_CONFIG: Record<BrainState, { emoji: string; label: string; message: string; accentColor: string }> = {
  wired: {
    emoji: 'lightning-bolt',
    label: 'Wired',
    message: 'Your mind is running hot today. Let\'s channel that energy. Start with a calming protocol, then ease into your habits.',
    accentColor: Colors.softCoral,
  },
  foggy: {
    emoji: 'weather-fog',
    label: 'Foggy',
    message: 'Low energy day. That\'s okay, your brain needs activation. A short breathwork session can shift things before you dive in.',
    accentColor: Colors.sunriseAmber,
  },
  okay: {
    emoji: 'minus-circle-outline',
    label: 'Okay',
    message: 'Steady baseline today. A good day to reflect and connect. Your journal and community are where you\'ll find momentum.',
    accentColor: Colors.mutedSageGray,
  },
  clear: {
    emoji: 'check-circle-outline',
    label: 'Clear',
    message: 'You\'re in a great headspace. This is the day to lock in focus work and build on your habits.',
    accentColor: Colors.evergreenTeal,
  },
  energized: {
    emoji: 'flash-outline',
    label: 'Energized',
    message: 'Sharp and ready. Use this energy. Explore a masterclass, connect with your community, then ride the momentum through your habits.',
    accentColor: Colors.success,
  },
};

export const BrainBrief: React.FC<BrainBriefProps> = ({ brainState }) => {
  const config = BRAIN_STATE_CONFIG[brainState];

  return (
    <Animated.View
      entering={SlideInUp.duration(300).springify()}
      style={[styles.container, { borderLeftColor: config.accentColor }]}
    >
      <View style={styles.header}>
        <Icon name={config.emoji as any} size={20} color={config.accentColor} />
        <Text style={styles.label}>{config.label}</Text>
      </View>
      <Text style={styles.message}>{config.message}</Text>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 16,
    marginBottom: 12,
    borderLeftWidth: 3,
    shadowColor: Colors.evergreenTeal,
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.07,
    shadowRadius: 12,
    elevation: 3,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: 8,
    gap: 8,
  },
  label: {
    fontSize: 15,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  message: {
    fontSize: 14,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/components/dashboard/BrainBrief.tsx
git commit -m "feat(dashboard): add BrainBrief component for post-checkin personalized message"
```

---

### Task 4: Create BrainStatusBar Component

**Files:**
- Create: `mobile/src/components/dashboard/BrainStatusBar.tsx`

- [ ] **Step 1: Create the component**

Create `mobile/src/components/dashboard/BrainStatusBar.tsx`:

```typescript
/**
 * BrainStatusBar
 * Compact status bar shown on return visits after today's brain check-in.
 * Displays current brain state and protocol status. Tappable to change state.
 */

import React, { useState } from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';
import { BrainState } from '../../types';

interface BrainStatusBarProps {
  brainState: BrainState;
  protocolCompleted: boolean;
  onChangeState: (state: BrainState) => void;
}

const STATE_DISPLAY: Record<BrainState, { icon: string; label: string; color: string }> = {
  wired: { icon: 'lightning-bolt', label: 'Wired', color: Colors.softCoral },
  foggy: { icon: 'weather-fog', label: 'Foggy', color: Colors.sunriseAmber },
  okay: { icon: 'minus-circle-outline', label: 'Okay', color: Colors.mutedSageGray },
  clear: { icon: 'check-circle-outline', label: 'Clear', color: Colors.evergreenTeal },
  energized: { icon: 'flash-outline', label: 'Energized', color: Colors.success },
};

const ALL_STATES: BrainState[] = ['wired', 'foggy', 'okay', 'clear', 'energized'];

export const BrainStatusBar: React.FC<BrainStatusBarProps> = ({
  brainState,
  protocolCompleted,
  onChangeState,
}) => {
  const [expanded, setExpanded] = useState(false);
  const display = STATE_DISPLAY[brainState];
  const protocolText = protocolCompleted ? 'Protocol done' : 'Protocol ready';

  const handleTap = () => {
    setExpanded(!expanded);
  };

  const handleSelectState = (state: BrainState) => {
    onChangeState(state);
    setExpanded(false);
  };

  return (
    <View style={styles.wrapper}>
      <TouchableOpacity
        style={styles.container}
        onPress={handleTap}
        activeOpacity={0.7}
      >
        <View style={styles.leftSection}>
          <Icon name={display.icon as any} size={18} color={display.color} />
          <Text style={styles.stateLabel}>{display.label}</Text>
        </View>
        <View style={styles.rightSection}>
          <Text style={styles.protocolText}>{protocolText}</Text>
          <Icon
            name={expanded ? 'chevron-up' : 'chevron-down'}
            size={16}
            color={Colors.textSecondary}
          />
        </View>
      </TouchableOpacity>

      {expanded && (
        <View style={styles.statePickerContainer}>
          {ALL_STATES.map((state) => {
            const stateDisplay = STATE_DISPLAY[state];
            const isSelected = state === brainState;
            return (
              <TouchableOpacity
                key={state}
                style={[
                  styles.statePill,
                  isSelected && { backgroundColor: stateDisplay.color + '20' },
                ]}
                onPress={() => handleSelectState(state)}
              >
                <Icon name={stateDisplay.icon as any} size={16} color={stateDisplay.color} />
                <Text
                  style={[
                    styles.statePillLabel,
                    isSelected && { color: stateDisplay.color, fontWeight: Typography.fontWeight.semibold },
                  ]}
                >
                  {stateDisplay.label}
                </Text>
              </TouchableOpacity>
            );
          })}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: 12,
  },
  container: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    paddingHorizontal: 14,
    paddingVertical: 12,
    shadowColor: Colors.evergreenTeal,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.05,
    shadowRadius: 6,
    elevation: 2,
  },
  leftSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  stateLabel: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  rightSection: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  protocolText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
  statePickerContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
    marginTop: 8,
    paddingHorizontal: 4,
  },
  statePill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 20,
    backgroundColor: '#F5F5F5',
  },
  statePillLabel: {
    fontSize: 13,
    color: Colors.textPrimary,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/components/dashboard/BrainStatusBar.tsx
git commit -m "feat(dashboard): add BrainStatusBar component for returning visit phase"
```

---

### Task 5: Add Dashboard Phase Logic to useDashboard

**Files:**
- Modify: `mobile/src/hooks/useDashboard.ts`

- [ ] **Step 1: Add imports for getDashboardCardOrder**

At the top of `mobile/src/hooks/useDashboard.ts`, after the existing imports (around line 46), add:

```typescript
import { getDashboardCardOrder, type DashboardCardId } from '../utils/getDashboardCardOrder';
```

- [ ] **Step 2: Add useRef import**

The file already imports `useState, useEffect, useMemo, useCallback` from React (line 6). Add `useRef`:

Replace:
```typescript
import { useState, useEffect, useMemo, useCallback } from 'react';
```

With:
```typescript
import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
```

- [ ] **Step 3: Add the phase state and ref**

Inside the `useDashboard` function, after the existing state declarations (find the area around line 110-120 where `brainStateCheckIn` state is declared), add:

```typescript
  // Dashboard phase state machine
  const hasSeenBriefThisSession = useRef(false);
```

- [ ] **Step 4: Add the dashboardPhase and cardOrder computed values**

After the `todaysProtocol` useMemo (around line 499), add:

```typescript
  // Dashboard phase: pre-checkin, post-checkin, or returning
  const dashboardPhase = useMemo((): 'pre-checkin' | 'post-checkin' | 'returning' => {
    if (!brainStateCheckIn) return 'pre-checkin';
    if (!hasSeenBriefThisSession.current) return 'post-checkin';
    return 'returning';
  }, [brainStateCheckIn]);

  // Mark brief as seen when we enter post-checkin
  useEffect(() => {
    if (dashboardPhase === 'post-checkin') {
      hasSeenBriefThisSession.current = true;
    }
  }, [dashboardPhase]);

  // Card order based on brain state
  const cardOrder = useMemo((): DashboardCardId[] => {
    const state = brainStateCheckIn?.brainState ?? null;
    return getDashboardCardOrder(state);
  }, [brainStateCheckIn]);
```

- [ ] **Step 5: Expose dashboardPhase and cardOrder in the return object**

In the return object at the end of `useDashboard` (around line 725-758), add after the nudge section:

```typescript
    // Dashboard phase
    dashboardPhase,
    cardOrder,
```

- [ ] **Step 6: Commit**

```bash
git add mobile/src/hooks/useDashboard.ts
git commit -m "feat(dashboard): add dashboardPhase state machine and cardOrder to useDashboard"
```

---

### Task 6: Restructure DashboardScreen with Phase-Based Rendering

**Files:**
- Modify: `mobile/src/screens/DashboardScreen.tsx`

- [ ] **Step 1: Add new imports**

In `mobile/src/screens/DashboardScreen.tsx`, add these imports after the existing dashboard component imports (around line 31):

```typescript
import { BrainBrief } from '../components/dashboard/BrainBrief';
import { BrainStatusBar } from '../components/dashboard/BrainStatusBar';
```

Add Animated import from reanimated at the top imports:

```typescript
import Animated, { useSharedValue, useAnimatedStyle, withTiming } from 'react-native-reanimated';
```

Also add `useEffect` to the React import on line 7:

Replace:
```typescript
import React, { useState } from 'react';
```

With:
```typescript
import React, { useState, useEffect } from 'react';
```

- [ ] **Step 2: Destructure new fields from useDashboard**

In the destructuring of `useDashboard()` (lines 41-104), add `dashboardPhase` and `cardOrder`:

After `handleApplyRoutineTemplate,` (line 103), add:

```typescript
    dashboardPhase,
    cardOrder,
```

- [ ] **Step 3: Add muted opacity animation**

Inside the `DashboardScreen` component, after the `weekInsight` computation (line 107), add:

```typescript
  // Muted overlay animation for pre-checkin state
  const cardOpacity = useSharedValue(dashboardPhase === 'pre-checkin' ? 0.5 : 1);

  useEffect(() => {
    cardOpacity.value = withTiming(
      dashboardPhase === 'pre-checkin' ? 0.5 : 1,
      { duration: 400 }
    );
  }, [dashboardPhase]);

  const mutedStyle = useAnimatedStyle(() => ({
    opacity: cardOpacity.value,
  }));

  const isMuted = dashboardPhase === 'pre-checkin';
```

- [ ] **Step 4: Create a card rendering helper**

After the animation code, add a helper that renders cards in the order specified by `cardOrder`:

```typescript
  // Render a dashboard card by its ID
  const renderCard = (cardId: string) => {
    switch (cardId) {
      case 'protocol':
        return brainStateCheckIn && todaysProtocol ? (
          <TodaysProtocolCard
            key="protocol"
            protocol={todaysProtocol}
            completed={brainStateCheckIn.protocolCompleted}
            onMarkCompleted={handleMarkProtocolCompleted}
          />
        ) : null;
      case 'nudge':
        return nudgeSuggestion ? (
          <NudgeCard
            key="nudge"
            suggestion={nudgeSuggestion}
            onAction={() => {
              markFeatureVisited(nudgeSuggestion.feature);
              navigation.navigate(nudgeSuggestion.screenName as never);
            }}
            onDismiss={dismissNudge}
          />
        ) : null;
      case 'reflection':
        return showDailyReflection ? (
          <DailyReflectionCard
            key="reflection"
            onReflect={handleDailyReflection}
            onSkip={handleDailyReflectionSkip}
          />
        ) : null;
      case 'habits':
        return (
          <WeeklyHabitsCard
            key="habits"
            habits={habits}
            visibleDays={visibleDays}
            today={today}
            allCompletions={allCompletions}
            weeklyCompletions={weeklyCompletions}
            processingHabits={processingHabits}
            onHabitToggle={handleHabitToggle}
            onNavigateToHabits={() => navigation.navigate('Rhythms' as never, { tab: 'habits' } as never)}
            onAddHabit={() => navigation.navigate('Rhythms' as never, { tab: 'habits', openCreateModal: true } as never)}
          />
        );
      case 'routines':
        return (
          <RoutinesCard
            key="routines"
            routines={dashboardRoutines}
            completions={routineCompletions}
            onBeginRoutine={handleBeginRoutine}
            onNavigateToRoutines={() => navigation.navigate('Rhythms' as never, { tab: 'routines' } as never)}
            onApplyTemplate={handleApplyRoutineTemplate}
          />
        );
      case 'weekInsight':
        return (
          <WeekInsightCard
            key="weekInsight"
            headline={weekInsight?.headline}
            supporting={weekInsight?.supporting}
            onPressFullStory={weekInsight ? () => navigation.navigate('Insights' as never) : undefined}
            empty={!weekInsight}
          />
        );
      default:
        return null;
    }
  };
```

- [ ] **Step 5: Replace the V2 dashboard layout**

Find the `{DASHBOARD_V2 ? (` block (line 146). Replace the entire V2 content (from the `<>` after `DASHBOARD_V2 ? (` to the matching `</>`before `) : (`) with:

```tsx
          <>
            {/* Notification Opt-In Card (progressive disclosure) */}
            {notifOptInCard && (
              <View style={{ paddingHorizontal: Spacing.base }}>
                <NotificationOptInCard
                  category={notifOptInCard}
                  onOptIn={() => handleNotifOptIn(notifOptInCard)}
                  onDismiss={() => handleNotifDismiss(notifOptInCard)}
                />
              </View>
            )}

            {/* Event Code Card (new users < 48 hours, contextual) */}
            {showEventCodeCard && (
              <View style={{ paddingHorizontal: Spacing.base }}>
                <EventCodeCard
                  onEnterCode={() => setEventCodeSheetVisible(true)}
                  onDismiss={handleEventCodeDismiss}
                />
              </View>
            )}

            {/* Phase-dependent top section */}
            {dashboardPhase === 'post-checkin' && brainStateCheckIn && (
              <BrainBrief brainState={brainStateCheckIn.brainState} />
            )}

            {dashboardPhase === 'returning' && brainStateCheckIn && (
              <BrainStatusBar
                brainState={brainStateCheckIn.brainState}
                protocolCompleted={brainStateCheckIn.protocolCompleted}
                onChangeState={handleBrainStateCheckIn}
              />
            )}

            {/* Brain State Check-In (always visible, prominent in pre-checkin) */}
            {dashboardPhase === 'pre-checkin' && (
              <BrainStateCheckin
                currentCheckIn={brainStateCheckIn}
                onSelect={handleBrainStateCheckIn}
                loading={brainStateCheckInLoading}
              />
            )}

            {/* Pre-checkin hint */}
            {dashboardPhase === 'pre-checkin' && (
              <Text style={styles.checkinHint}>
                Check in to unlock your personalized dashboard
              </Text>
            )}

            {/* Dashboard cards: muted in pre-checkin, ordered by brain state */}
            <Animated.View
              style={[mutedStyle]}
              pointerEvents={isMuted ? 'none' : 'auto'}
            >
              {cardOrder.map((cardId) => renderCard(cardId))}
            </Animated.View>
          </>
```

- [ ] **Step 6: Add the checkinHint style**

In the `StyleSheet.create` block at the bottom, add:

```typescript
  checkinHint: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.base,
    fontStyle: 'italic',
  },
```

- [ ] **Step 7: Commit**

```bash
git add mobile/src/screens/DashboardScreen.tsx
git commit -m "feat(dashboard): restructure DashboardScreen with phase-based rendering and card ordering"
```

---

### Task 7: Smoke Test and Verify

**Files:**
- No file changes (verification only)

- [ ] **Step 1: Check TypeScript compilation**

```bash
cd mobile && npx tsc --noEmit 2>&1 | head -30
```

Verify no new errors from our changes. Pre-existing errors may appear.

- [ ] **Step 2: Test pre-checkin phase**

Open the app on a new day (or clear today's brain check-in from Firestore). Verify:
- Brain check-in card is at full opacity and expanded
- All other cards are visible but muted (50% opacity)
- Muted cards are not tappable
- "Check in to unlock your personalized dashboard" hint is visible

- [ ] **Step 3: Test post-checkin phase**

Tap a brain state (e.g., "Clear"). Verify:
- BrainBrief slides in at the top with the correct message for the selected state
- Muted cards animate to full opacity
- Cards are now in the brain-state-specific order (e.g., for Clear: focus-related cards first)
- Cards are fully interactive

- [ ] **Step 4: Test returning phase**

Close the app and reopen. Verify:
- Compact BrainStatusBar appears at the top (not the brief)
- Shows the brain state and protocol status
- Cards are in brain-state order
- Tapping the status bar expands the state picker
- Selecting a new state reorders the cards

- [ ] **Step 5: Test energized state specifically**

Select "Energized" brain state. Verify:
- The nudge suggestion prioritizes masterclass content
- Card order reflects the energized priority

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix(dashboard): address issues found during brain check-in entry point testing"
```

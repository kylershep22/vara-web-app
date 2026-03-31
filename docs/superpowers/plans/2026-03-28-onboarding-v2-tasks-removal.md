# Onboarding V2 & Tasks Removal Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 6-screen onboarding with a 3-screen flow (Welcome → BrainStateCheckin → Protocol), remove Tasks from navigation, and rename Track to Rhythms.

**Architecture:** `ONBOARDING_V2` feature flag gates the onboarding navigator. New screens reuse Dashboard V2 components (BrainStateCheckin, TodaysProtocolCard). Tasks removal is a navigation-only change — no data or components deleted. The `useTasks()` hook and task Firestore subscriptions are gated behind `!DASHBOARD_V2` for performance.

**Tech Stack:** React Native, TypeScript, Firebase Firestore, expo-haptics, expo-notifications

**Spec:** `docs/superpowers/specs/2026-03-28-onboarding-v2-tasks-removal-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `mobile/src/constants/dashboardConfig.ts` | Modify | Add `ONBOARDING_V2 = true` |
| `mobile/src/constants/index.ts` | Modify | Export `ONBOARDING_V2` |
| `mobile/src/components/dashboard/TodaysProtocolCard.tsx` | Modify | Add `startExpanded` prop |
| `mobile/src/screens/onboarding/OnboardingV2WelcomeScreen.tsx` | Create | Welcome screen |
| `mobile/src/screens/onboarding/OnboardingV2CheckInScreen.tsx` | Create | Brain state check-in screen |
| `mobile/src/screens/onboarding/OnboardingV2ProtocolScreen.tsx` | Create | Protocol + notifications + complete |
| `mobile/src/screens/onboarding/index.ts` | Modify | Export new screens |
| `mobile/src/navigation/AppNavigator.tsx` | Modify | V2 onboarding stack, Track→Rhythms, remove TaskDetail |
| `mobile/src/screens/PlanScreen.tsx` | Modify | Remove Tasks tab |
| `mobile/src/hooks/useDashboard.ts` | Modify | Gate task loading |
| `mobile/src/screens/InsightsScreen.tsx` | Modify | Remove task references |

---

### Task 1: Feature Flag and TodaysProtocolCard Prop

**Files:**
- Modify: `mobile/src/constants/dashboardConfig.ts`
- Modify: `mobile/src/constants/index.ts`
- Modify: `mobile/src/components/dashboard/TodaysProtocolCard.tsx`

- [ ] **Step 1: Add ONBOARDING_V2 flag**

In `mobile/src/constants/dashboardConfig.ts`, add below the existing `DASHBOARD_V2` line:

```typescript
export const ONBOARDING_V2 = true;
```

- [ ] **Step 2: Export from barrel**

In `mobile/src/constants/index.ts`, find the existing `DASHBOARD_V2` export line and update it:

```typescript
export { DASHBOARD_V2, ONBOARDING_V2 } from './dashboardConfig';
```

- [ ] **Step 3: Add startExpanded prop to TodaysProtocolCard**

In `mobile/src/components/dashboard/TodaysProtocolCard.tsx`, update the interface and component:

Replace:

```typescript
interface TodaysProtocolCardProps {
  protocol: BrainStateProtocol;
  completed: boolean;
  onMarkCompleted: () => void;
}

export const TodaysProtocolCard: React.FC<TodaysProtocolCardProps> = ({
  protocol,
  completed,
  onMarkCompleted,
}) => {
  const [showInstructions, setShowInstructions] = useState(false);
```

With:

```typescript
interface TodaysProtocolCardProps {
  protocol: BrainStateProtocol;
  completed: boolean;
  onMarkCompleted: () => void;
  startExpanded?: boolean;
}

export const TodaysProtocolCard: React.FC<TodaysProtocolCardProps> = ({
  protocol,
  completed,
  onMarkCompleted,
  startExpanded = false,
}) => {
  const [showInstructions, setShowInstructions] = useState(startExpanded);
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/constants/dashboardConfig.ts mobile/src/constants/index.ts mobile/src/components/dashboard/TodaysProtocolCard.tsx
git commit -m "feat: add ONBOARDING_V2 flag and startExpanded prop to TodaysProtocolCard"
```

---

### Task 2: OnboardingV2WelcomeScreen

**Files:**
- Create: `mobile/src/screens/onboarding/OnboardingV2WelcomeScreen.tsx`

- [ ] **Step 1: Create the welcome screen**

Create `mobile/src/screens/onboarding/OnboardingV2WelcomeScreen.tsx`:

```typescript
/**
 * Onboarding V2 - Welcome Screen
 * Screen 1 of 3: Brand introduction with CTA.
 * No data collected — name comes from signup.
 */

import React from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Button } from '../../components';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface OnboardingV2WelcomeScreenProps {
  navigation: any;
}

const OnboardingV2WelcomeScreen: React.FC<OnboardingV2WelcomeScreenProps> = ({
  navigation,
}) => {
  const handleBegin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.navigate('OnboardingV2CheckIn');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <View style={styles.content}>
        {/* Spacer for vertical centering */}
        <View style={styles.topSpacer} />

        {/* Logo / Icon */}
        <View style={styles.iconContainer}>
          <View style={styles.iconCircle}>
            <Icon name="brain" size={48} color={Colors.white} />
          </View>
        </View>

        {/* Headline */}
        <Text style={styles.headline}>
          Vara works with your brain, not against it.
        </Text>

        {/* Subtext */}
        <Text style={styles.subtext}>
          Build habits that last by first supporting how your brain actually works.
        </Text>

        {/* Spacer */}
        <View style={styles.bottomSpacer} />
      </View>

      {/* CTA Button - Fixed at bottom */}
      <View style={styles.ctaContainer}>
        <Button
          variant="primary"
          onPress={handleBegin}
          fullWidth
          accessibilityLabel="Let's begin"
          accessibilityRole="button"
        >
          Let's begin
        </Button>
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
  },
  topSpacer: {
    flex: 1,
    minHeight: Spacing['3xl'],
  },
  iconContainer: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  iconCircle: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
    ...Layout.shadow.md,
  },
  headline: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.semibold,
    textAlign: 'center',
    marginBottom: Spacing.lg,
    letterSpacing: -0.25,
  },
  subtext: {
    color: Colors.softCharcoal,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.regular,
    textAlign: 'center',
    paddingHorizontal: Spacing.sm,
  },
  bottomSpacer: {
    flex: 1,
    minHeight: Spacing['3xl'],
  },
  ctaContainer: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.base,
    paddingTop: Spacing.sm,
  },
});

export default OnboardingV2WelcomeScreen;
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/screens/onboarding/OnboardingV2WelcomeScreen.tsx
git commit -m "feat: add OnboardingV2WelcomeScreen"
```

---

### Task 3: OnboardingV2CheckInScreen

**Files:**
- Create: `mobile/src/screens/onboarding/OnboardingV2CheckInScreen.tsx`

- [ ] **Step 1: Create the check-in screen**

Create `mobile/src/screens/onboarding/OnboardingV2CheckInScreen.tsx`:

```typescript
/**
 * Onboarding V2 - Check-In Screen
 * Screen 2 of 3: Single-tap brain state selection.
 * Reuses BrainStateCheckin from Dashboard V2.
 * Auto-advances to protocol screen after selection.
 */

import React, { useState, useEffect, useRef } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { BrainStateCheckin } from '../../components/dashboard/BrainStateCheckin';
import { useAuth } from '../../context/AuthContext';
import { saveBrainStateCheckIn } from '../../services/firebase';
import { getProtocolForState } from '../../constants/brainStateProtocols';
import { Colors, Spacing, Typography } from '../../constants';
import { BrainState } from '../../types';
import { logger } from '../../utils/logger';

interface OnboardingV2CheckInScreenProps {
  navigation: any;
}

const OnboardingV2CheckInScreen: React.FC<OnboardingV2CheckInScreenProps> = ({
  navigation,
}) => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);
  const hasNavigated = useRef(false);

  const handleSelect = async (state: BrainState) => {
    if (!user?.uid || hasNavigated.current) return;
    setLoading(true);
    try {
      const checkIn = await saveBrainStateCheckIn(user.uid, state);
      const protocol = getProtocolForState(state);

      // Wait for the "Captured." animation (2 seconds), then navigate
      setTimeout(() => {
        if (!hasNavigated.current) {
          hasNavigated.current = true;
          navigation.navigate('OnboardingV2Protocol', {
            brainState: state,
            protocolId: protocol.id,
          });
        }
      }, 2200);
    } catch (error) {
      logger.error('Error saving onboarding check-in:', error);
      setLoading(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Back button */}
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Icon name="chevron-left" size={28} color={Colors.evergreenTeal} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Headline */}
        <Text style={styles.headline}>How's your brain feeling right now?</Text>
        <Text style={styles.subtext}>This is what you'll do each day. Just one tap.</Text>

        {/* Reuse BrainStateCheckin — always expanded (no currentCheckIn) */}
        <BrainStateCheckin
          currentCheckIn={null}
          onSelect={handleSelect}
          loading={loading}
        />
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  backButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  headline: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  subtext: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.xl,
  },
});

export default OnboardingV2CheckInScreen;
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/screens/onboarding/OnboardingV2CheckInScreen.tsx
git commit -m "feat: add OnboardingV2CheckInScreen"
```

---

### Task 4: OnboardingV2ProtocolScreen

**Files:**
- Create: `mobile/src/screens/onboarding/OnboardingV2ProtocolScreen.tsx`

- [ ] **Step 1: Create the protocol screen**

Create `mobile/src/screens/onboarding/OnboardingV2ProtocolScreen.tsx`:

```typescript
/**
 * Onboarding V2 - Protocol Screen
 * Screen 3 of 3: Guided protocol experience.
 * After "Done": requests notification permission, then completes onboarding.
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import * as Notifications from 'expo-notifications';
import { TodaysProtocolCard } from '../../components/dashboard/TodaysProtocolCard';
import { useAuth } from '../../context/AuthContext';
import { markProtocolCompleted } from '../../services/firebase';
import { completeOnboarding } from '../../services/firebase/onboarding.service';
import { getProtocolForState } from '../../constants/brainStateProtocols';
import { Colors, Spacing, Typography } from '../../constants';
import { BrainState } from '../../types';
import { logger } from '../../utils/logger';

interface OnboardingV2ProtocolScreenProps {
  navigation: any;
  route: {
    params: {
      brainState: BrainState;
      protocolId: string;
    };
  };
}

const OnboardingV2ProtocolScreen: React.FC<OnboardingV2ProtocolScreenProps> = ({
  navigation,
  route,
}) => {
  const { user } = useAuth();
  const { brainState } = route.params;
  const protocol = getProtocolForState(brainState);
  const [completing, setCompleting] = useState(false);

  const handleMarkCompleted = async () => {
    if (!user?.uid || completing) return;
    setCompleting(true);
    try {
      // 1. Mark protocol completed
      await markProtocolCompleted(user.uid);

      // 2. Request native notification permission
      const { status: existingStatus } = await Notifications.getPermissionsAsync();
      if (existingStatus !== 'granted') {
        await Notifications.requestPermissionsAsync();
      }

      // 3. Complete onboarding — Firestore listener in AppNavigator
      //    will automatically transition to MainNavigator
      await completeOnboarding(user.uid);
    } catch (error) {
      logger.error('Error completing onboarding:', error);
      setCompleting(false);
    }
  };

  const handleBack = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    navigation.goBack();
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Back button */}
      <TouchableOpacity onPress={handleBack} style={styles.backButton}>
        <Icon name="chevron-left" size={28} color={Colors.evergreenTeal} />
      </TouchableOpacity>

      <View style={styles.content}>
        {/* Protocol card with instructions pre-expanded */}
        <TodaysProtocolCard
          protocol={protocol}
          completed={false}
          onMarkCompleted={handleMarkCompleted}
          startExpanded
        />

        {completing && (
          <View style={styles.completingContainer}>
            <Text style={styles.completingText}>Saved.</Text>
          </View>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  backButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    alignSelf: 'flex-start',
  },
  content: {
    flex: 1,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  completingContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  completingText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
});

export default OnboardingV2ProtocolScreen;
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/screens/onboarding/OnboardingV2ProtocolScreen.tsx
git commit -m "feat: add OnboardingV2ProtocolScreen with notification permission"
```

---

### Task 5: Export Onboarding V2 Screens

**Files:**
- Modify: `mobile/src/screens/onboarding/index.ts`

- [ ] **Step 1: Add V2 screen exports**

Add these lines to `mobile/src/screens/onboarding/index.ts`, after the existing exports:

```typescript
// V2 Onboarding Screens (simplified 3-screen flow)
export { default as OnboardingV2WelcomeScreen } from './OnboardingV2WelcomeScreen';
export { default as OnboardingV2CheckInScreen } from './OnboardingV2CheckInScreen';
export { default as OnboardingV2ProtocolScreen } from './OnboardingV2ProtocolScreen';
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/screens/onboarding/index.ts
git commit -m "feat: export onboarding V2 screens from barrel"
```

---

### Task 6: Update AppNavigator (Onboarding V2 + Tasks Removal + Rename)

**Files:**
- Modify: `mobile/src/navigation/AppNavigator.tsx`

This task makes three changes to AppNavigator: (1) V2 onboarding stack, (2) Track → Rhythms rename, (3) TaskDetail route removal, (4) gate app-level task loading.

- [ ] **Step 1: Add V2 screen imports**

At the top of `mobile/src/navigation/AppNavigator.tsx`, find the onboarding screen imports (lines 76-82):

```typescript
  OnboardingWelcomeScreen,
  OnboardingCheckInScreen,
  OnboardingInsightScreen,
  OnboardingActivityScreen,
  OnboardingValuesScreen,
  OnboardingPersonalizedEntryScreen,
```

Add the V2 screen imports after them:

```typescript
  OnboardingV2WelcomeScreen,
  OnboardingV2CheckInScreen,
  OnboardingV2ProtocolScreen,
```

Also add the feature flag import. Find existing constant imports and add:

```typescript
import { DASHBOARD_V2, ONBOARDING_V2 } from '../constants/dashboardConfig';
```

- [ ] **Step 2: Update OnboardingNavigator with V2 conditional**

Replace the existing `OnboardingNavigator` function (lines 113-129):

```typescript
const OnboardingNavigator = () => {
  return (
    <OnboardingStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      <OnboardingStack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
      <OnboardingStack.Screen name="OnboardingCheckIn" component={OnboardingCheckInScreen} />
      <OnboardingStack.Screen name="OnboardingInsight" component={OnboardingInsightScreen} />
      <OnboardingStack.Screen name="OnboardingActivity" component={OnboardingActivityScreen} />
      <OnboardingStack.Screen name="OnboardingValues" component={OnboardingValuesScreen} />
      <OnboardingStack.Screen name="OnboardingPersonalizedEntry" component={OnboardingPersonalizedEntryScreen} />
    </OnboardingStack.Navigator>
  );
};
```

With:

```typescript
const OnboardingNavigator = () => {
  return (
    <OnboardingStack.Navigator
      screenOptions={{
        headerShown: false,
        animation: 'slide_from_right',
      }}
    >
      {ONBOARDING_V2 ? (
        <>
          <OnboardingStack.Screen name="OnboardingV2Welcome" component={OnboardingV2WelcomeScreen} />
          <OnboardingStack.Screen name="OnboardingV2CheckIn" component={OnboardingV2CheckInScreen} />
          <OnboardingStack.Screen name="OnboardingV2Protocol" component={OnboardingV2ProtocolScreen} />
        </>
      ) : (
        <>
          <OnboardingStack.Screen name="OnboardingWelcome" component={OnboardingWelcomeScreen} />
          <OnboardingStack.Screen name="OnboardingCheckIn" component={OnboardingCheckInScreen} />
          <OnboardingStack.Screen name="OnboardingInsight" component={OnboardingInsightScreen} />
          <OnboardingStack.Screen name="OnboardingActivity" component={OnboardingActivityScreen} />
          <OnboardingStack.Screen name="OnboardingValues" component={OnboardingValuesScreen} />
          <OnboardingStack.Screen name="OnboardingPersonalizedEntry" component={OnboardingPersonalizedEntryScreen} />
        </>
      )}
    </OnboardingStack.Navigator>
  );
};
```

- [ ] **Step 3: Rename Track tab to Rhythms**

In the `BottomTabsNavigator` function (around line 416-424), find:

```typescript
      <BottomTabs.Screen
        name="Track"
        component={PlanScreen}
        options={{
          tabBarLabel: 'Track',
          tabBarIcon: ({ color, size }) => (
            <Icon name="clipboard-check" size={size} color={color} />
          ),
        }}
      />
```

Replace with:

```typescript
      <BottomTabs.Screen
        name="Rhythms"
        component={PlanScreen}
        options={{
          tabBarLabel: 'Rhythms',
          tabBarIcon: ({ color, size }) => (
            <Icon name="clipboard-check" size={size} color={color} />
          ),
        }}
      />
```

- [ ] **Step 4: Remove TaskDetail route**

Find the TaskDetail screen registration (around lines 675-688):

```typescript
        {/* Task Detail - Accessible from Plan/Track screen */}
        <AppStack.Screen
          name="TaskDetail"
          component={TaskDetailScreen}
          options={{
            ...standardHeaderOptions,
            animation: 'slide_from_right',
            headerShown: true,
            title: 'Task Details',
            headerStyle: { backgroundColor: Colors.evergreenTeal, elevation: 0, shadowOpacity: 0 } as any,
            headerTintColor: '#fff',
            headerTitleStyle: { fontWeight: '700' as const, color: '#fff' },
          }}
        />
```

Delete this entire block. Also remove the `TaskDetailScreen` import at the top of the file (line 58):

```typescript
import TaskDetailScreen from '../screens/TaskDetailScreen';
```

- [ ] **Step 5: Gate app-level task loading**

In the `MainNavigator` function (around lines 464-477), find:

```typescript
  const tasksData = useTasks();
```

And:

```typescript
  const tasks = tasksData?.tasks || [];
```

Replace with:

```typescript
  const tasksData = DASHBOARD_V2 ? null : useTasks();
```

And:

```typescript
  const tasks = tasksData?.tasks || [];
```

**Wait** — hooks can't be called conditionally. Instead, keep `useTasks()` but gate how it's used. Find where `tasks` is passed to the AI FAB or other components and pass an empty array when V2 is active:

Replace:

```typescript
  const goalsData = useGoals();
  const habitsData = useHabits();
  const tasksData = useTasks();
```

With:

```typescript
  const goalsData = useGoals();
  const habitsData = useHabits();
  const tasksData = useTasks(!DASHBOARD_V2);
```

**Check**: Read the `useTasks` hook to see if it accepts an `enabled` parameter. If not, keep the original call and just override the output:

Replace:

```typescript
  const tasks = tasksData?.tasks || [];
```

With:

```typescript
  const tasks = DASHBOARD_V2 ? [] : (tasksData?.tasks || []);
```

This prevents task data from reaching the AI FAB while keeping the hook call valid (React rules of hooks require consistent call order).

- [ ] **Step 6: Update navigation references to Track**

Search the file for any `navigation.navigate('Track'` references that might need to become `'Rhythms'`. Check if any exist in this file. If they do, update them. The PlanScreen and dashboard cards may also reference `'Track'` — those will be handled in their respective tasks.

- [ ] **Step 7: Commit**

```bash
git add mobile/src/navigation/AppNavigator.tsx
git commit -m "feat: V2 onboarding navigator, rename Track to Rhythms, remove TaskDetail"
```

---

### Task 7: Update PlanScreen (Remove Tasks Tab)

**Files:**
- Modify: `mobile/src/screens/PlanScreen.tsx`

- [ ] **Step 1: Remove Tasks from tab type and tabs array**

Replace the type definition (line 33):

```typescript
type TabType = 'habits' | 'routines' | 'tasks';
```

With:

```typescript
type TabType = 'habits' | 'routines';
```

Replace the tabs array (lines 259-263):

```typescript
  const tabs = [
    { value: 'habits' as TabType, label: 'Habits' },
    { value: 'routines' as TabType, label: 'Routines' },
    { value: 'tasks' as TabType, label: 'Tasks' },
  ];
```

With:

```typescript
  const tabs = [
    { value: 'habits' as TabType, label: 'Habits' },
    { value: 'routines' as TabType, label: 'Routines' },
  ];
```

- [ ] **Step 2: Remove Tasks rendering and filter logic**

Remove the Tasks rendering block (lines 305-311):

```typescript
        {activeTab === 'tasks' && (
          <TasksScreen
            hideHeader
            externalFilter={getScreenFilter()}
            showInlineCreate
          />
        )}
```

In the `getScreenFilter` function (lines 232-243), remove the tasks-specific mapping. Replace:

```typescript
  const getScreenFilter = (): string => {
    switch (activeFilter) {
      case 'all':
        return 'all';
      case 'active':
        return activeTab === 'tasks' ? 'todo' : 'active';
      case 'complete':
        return activeTab === 'tasks' ? 'done' : 'completed';
      default:
        return 'all';
    }
  };
```

With:

```typescript
  const getScreenFilter = (): string => {
    switch (activeFilter) {
      case 'all':
        return 'all';
      case 'active':
        return 'active';
      case 'complete':
        return 'completed';
      default:
        return 'all';
    }
  };
```

In `getCreateLabel` (lines 211-222), remove the tasks case:

```typescript
      case 'tasks':
        return 'Add a task';
```

In `getSubtitle` (lines 246-257), remove the tasks case:

```typescript
      case 'tasks':
        return 'Stay organized and productive';
```

- [ ] **Step 3: Remove Tasks imports and date banner condition**

Remove the TasksScreen import (line 27):

```typescript
import TasksScreen from './TasksScreen';
```

Update the date banner condition (line 291). Replace:

```typescript
      {(activeTab === 'habits' || activeTab === 'tasks') && <DateBanner />}
```

With:

```typescript
      {activeTab === 'habits' && <DateBanner />}
```

- [ ] **Step 4: Update header title**

Replace the header title (line 269):

```typescript
        <Text style={styles.pageTitle}>Track</Text>
```

With:

```typescript
        <Text style={styles.pageTitle}>Rhythms</Text>
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/PlanScreen.tsx
git commit -m "feat: remove Tasks tab from PlanScreen, rename header to Rhythms"
```

---

### Task 8: Gate Task Loading in useDashboard

**Files:**
- Modify: `mobile/src/hooks/useDashboard.ts`

- [ ] **Step 1: Gate the useTasks hook**

In `mobile/src/hooks/useDashboard.ts`, find the existing `useTasks` import and call. The hook is imported at line 18:

```typescript
import { useTasks } from './useTasks';
```

And called at line 48:

```typescript
  const { tasks: allTasks, loading: tasksLoading } = useTasks();
```

The `DASHBOARD_V2` import already exists from the Dashboard V2 work. Replace the useTasks call:

```typescript
  const { tasks: allTasks, loading: tasksLoading } = useTasks();
```

With:

```typescript
  const tasksResult = useTasks();
  const allTasks = DASHBOARD_V2 ? [] : tasksResult.tasks;
  const tasksLoading = DASHBOARD_V2 ? false : tasksResult.loading;
```

This keeps the hook call (React rules) but prevents task data from being used in V2.

- [ ] **Step 2: Commit**

```bash
git add mobile/src/hooks/useDashboard.ts
git commit -m "feat: gate task data behind DASHBOARD_V2 in useDashboard"
```

---

### Task 9: Remove Task References from InsightsScreen

**Files:**
- Modify: `mobile/src/screens/InsightsScreen.tsx`

- [ ] **Step 1: Remove useTasks import and call**

In `mobile/src/screens/InsightsScreen.tsx`, find the import (line 24):

```typescript
import { useGoals, useHabits, useTasks } from '../hooks';
```

Replace with:

```typescript
import { useGoals, useHabits } from '../hooks';
```

Find the useTasks call (line 79):

```typescript
  const { tasks: allTasks, loading: tasksLoading } = useTasks();
```

Remove this line entirely.

- [ ] **Step 2: Remove task metrics from the metrics computation**

In the `useMemo` that computes metrics, find the tasks block (around lines 486-490):

```typescript
      tasks: {
        completed: completedTasks.length,
        total: allTasks.length,
        completionRate: taskCompletionRate,
      },
```

Remove this block. Also remove any variables that compute task metrics (like `completedTasks`, `taskCompletionRate`) that reference `allTasks`. Search the useMemo for all `allTasks` references and remove them.

Remove `allTasks` from the useMemo dependency array (line 501):

```typescript
  }, [goals, habits, allTasks, habitCompletionData, focusSessions, journalEntries, communityActivity, timeFrame]);
```

Replace with:

```typescript
  }, [goals, habits, habitCompletionData, focusSessions, journalEntries, communityActivity, timeFrame]);
```

- [ ] **Step 3: Remove tasksLoading from loading checks**

Find any references to `tasksLoading` in the file (lines 347, 549) and remove them. For example:

```typescript
    if (!goalsLoading && !habitsLoading && !tasksLoading) {
```

Replace with:

```typescript
    if (!goalsLoading && !habitsLoading) {
```

And:

```typescript
  if (loading || goalsLoading || habitsLoading || tasksLoading) {
```

Replace with:

```typescript
  if (loading || goalsLoading || habitsLoading) {
```

- [ ] **Step 4: Remove tasks from RingProgressCard**

Find the RingProgressCard usage (around line 631-636):

```typescript
        <RingProgressCard
          goals={{ percentage: metrics.goals.avgProgress }}
          habits={{ percentage: metrics.habits.completionRate }}
          tasks={{ percentage: metrics.tasks.completionRate }}
          totalCheckIns={metrics.habits.completions}
        />
```

Remove the `tasks` prop:

```typescript
        <RingProgressCard
          goals={{ percentage: metrics.goals.avgProgress }}
          habits={{ percentage: metrics.habits.completionRate }}
          totalCheckIns={metrics.habits.completions}
        />
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/InsightsScreen.tsx
git commit -m "feat: remove task references from InsightsScreen"
```

---

### Task 10: Update Navigation References

**Files:**
- Search and update any remaining `'Track'` navigation references

- [ ] **Step 1: Search for Track navigation references**

Search the entire `mobile/src/` directory for `navigate('Track'` or `navigate("Track"` references. Common locations:
- Dashboard cards (WeeklyHabitsCard, TasksCard, UpNextCard, NextBestActionCard)
- Any deep links or navigation helpers

For each reference found, replace `'Track'` with `'Rhythms'`.

Note: Dashboard V2 hides most cards that reference Track, but the WeeklyHabitsCard is still shown and its `onNavigateToHabits` callback in DashboardScreen.tsx navigates to Track. Update these.

In `mobile/src/screens/DashboardScreen.tsx`, find:

```typescript
              onNavigateToHabits={() => navigation.navigate('Track' as never, { tab: 'habits' } as never)}
              onAddHabit={() => navigation.navigate('Track' as never, { tab: 'habits', openCreateModal: true } as never)}
```

Replace with:

```typescript
              onNavigateToHabits={() => navigation.navigate('Rhythms' as never, { tab: 'habits' } as never)}
              onAddHabit={() => navigation.navigate('Rhythms' as never, { tab: 'habits', openCreateModal: true } as never)}
```

Do this for BOTH the V2 and V1 branches in the DashboardScreen.

- [ ] **Step 2: Commit**

```bash
git add -A
git commit -m "feat: update Track navigation references to Rhythms"
```

---

### Task 11: Smoke Test

**Files:** None (verification only)

- [ ] **Step 1: TypeScript check**

```bash
cd mobile && npx tsc --noEmit
```

Verify no new type errors related to our changes.

- [ ] **Step 2: Verify onboarding flow**

Reset onboarding for a test user (set `hasCompletedOnboarding: false` in Firestore) and walk through:
- Screen 1: Welcome shows headline + "Let's begin"
- Screen 2: BrainStateCheckin shows 5 options, tapping auto-advances
- Screen 3: Protocol shows with instructions expanded, "Done" triggers notification permission then transitions to dashboard

- [ ] **Step 3: Verify Rhythms tab**

- Bottom nav shows "Rhythms" (not "Track")
- Tapping Rhythms shows Habits and Routines tabs only (no Tasks)
- Header says "Rhythms"

- [ ] **Step 4: Verify Insights screen**

- No task-related metrics visible
- No crashes from missing task data

- [ ] **Step 5: Verify V1 fallback**

Temporarily set `ONBOARDING_V2 = false` in dashboardConfig.ts. Verify the original 6-screen onboarding loads. Set it back to `true`.

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues from onboarding V2 and tasks removal smoke test"
```

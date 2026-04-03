# Dashboard Engagement Phase 2 — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make the mobile dashboard feel dynamic and engaging with an always-visible insight card, a brain-state-driven nudge for the next best action, and a greeting fix.

**Architecture:** Add empty state to existing WeekInsightCard. Create a pure function for nudge suggestion logic and a new NudgeCard component. Wire both into DashboardScreen within the existing V2 layout. Fix the greeting in useDashboard.

**Tech Stack:** React Native, TypeScript, Expo, MaterialCommunityIcons, Firebase Firestore

---

## File Structure

### New Files
| File | Responsibility |
|---|---|
| `mobile/src/utils/getNudgeSuggestion.ts` | Pure function: (brainState, completedFeatures) → NudgeSuggestion or null |
| `mobile/src/components/dashboard/NudgeCard.tsx` | Renders a single nudge suggestion with CTA and dismiss |

### Modified Files
| File | Changes |
|---|---|
| `mobile/src/components/dashboard/WeekInsightCard.tsx` | Add `empty` prop and warm empty state rendering |
| `mobile/src/hooks/useDashboard.ts` | Fix greeting, add nudge state + feature-done checks |
| `mobile/src/screens/DashboardScreen.tsx` | Always render WeekInsightCard, add NudgeCard after protocol |

---

## Task 0: Create Feature Branch

- [ ] **Step 1: Create the branch**

```bash
cd /c/Users/kyler/wellness-app && git checkout main && git checkout -b feat/dashboard-engagement-phase2
```

---

## Task 1: Fix Greeting

**Files:**
- Modify: `mobile/src/hooks/useDashboard.ts`

- [ ] **Step 1: Replace the late-night "Hey" fallback**

In `mobile/src/hooks/useDashboard.ts`, find line 147:
```typescript
      else timeGreeting = 'Hey';
```

Replace with:
```typescript
      else timeGreeting = 'Good evening';
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/hooks/useDashboard.ts
git commit -m "fix(mobile): replace late-night 'Hey' greeting with 'Good evening'"
```

---

## Task 2: WeekInsightCard Empty State

**Files:**
- Modify: `mobile/src/components/dashboard/WeekInsightCard.tsx`

- [ ] **Step 1: Add `empty` prop to the component interface**

Find:
```typescript
interface WeekInsightCardProps {
  headline: string;
  supporting: string;
  onPressFullStory?: () => void;
  onDismiss?: () => void;
}
```

Replace with:
```typescript
interface WeekInsightCardProps {
  headline?: string;
  supporting?: string;
  onPressFullStory?: () => void;
  onDismiss?: () => void;
  empty?: boolean;
}
```

- [ ] **Step 2: Add empty state rendering**

Find the component function start:
```typescript
const WeekInsightCard: React.FC<WeekInsightCardProps> = ({
  headline,
  supporting,
  onPressFullStory,
  onDismiss,
}) => {
  return (
```

Replace with:
```typescript
const WeekInsightCard: React.FC<WeekInsightCardProps> = ({
  headline,
  supporting,
  onPressFullStory,
  onDismiss,
  empty,
}) => {
  if (empty) {
    return (
      <View style={styles.container}>
        <View style={styles.accentBar} />
        <View style={styles.content}>
          <View style={styles.headlineRow}>
            <Icon name="lightbulb-outline" size={18} color={Colors.evergreenTeal} style={styles.icon} />
            <Text style={styles.headline}>Your weekly patterns</Text>
          </View>
          <Text style={styles.supporting}>
            As you check in and build habits this week, patterns will appear here to help you understand what works for your brain.
          </Text>
        </View>
      </View>
    );
  }

  return (
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/dashboard/WeekInsightCard.tsx
git commit -m "feat(mobile): add warm empty state to WeekInsightCard"
```

---

## Task 3: Always Render WeekInsightCard on Dashboard

**Files:**
- Modify: `mobile/src/screens/DashboardScreen.tsx`

- [ ] **Step 1: Replace conditional rendering with always-visible card**

In `DashboardScreen.tsx`, find the V2 dashboard section (around line 193):
```typescript
            {/* Position 4: Week Insight (below fold, conditional) */}
            {weekInsight && !weekInsightDismissed && (
              <WeekInsightCard
                headline={weekInsight.headline}
                supporting={weekInsight.supporting}
                onPressFullStory={() => navigation.navigate('Insights' as never)}
                onDismiss={() => setWeekInsightDismissed(true)}
              />
            )}
```

Replace with:
```typescript
            {/* Position 4: Week Insight (always visible) */}
            <WeekInsightCard
              headline={weekInsight?.headline}
              supporting={weekInsight?.supporting}
              onPressFullStory={weekInsight ? () => navigation.navigate('Insights' as never) : undefined}
              empty={!weekInsight}
            />
```

- [ ] **Step 2: Remove the `weekInsightDismissed` state**

Find:
```typescript
  const [weekInsightDismissed, setWeekInsightDismissed] = useState(false);
```

Remove this line entirely. The card is no longer dismissible.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/DashboardScreen.tsx
git commit -m "feat(mobile): always render WeekInsightCard with empty state for new users"
```

---

## Task 4: Create getNudgeSuggestion Utility

**Files:**
- Create: `mobile/src/utils/getNudgeSuggestion.ts`

- [ ] **Step 1: Create the file with full nudge logic**

```typescript
/**
 * Pure function that picks the best next action based on brain state
 * and which features the user has already engaged with today.
 */

export interface NudgeSuggestion {
  feature: string;
  icon: string;
  headline: string;
  description: string;
  ctaLabel: string;
  screenName: string;
}

type BrainState = 'wired' | 'foggy' | 'okay' | 'clear' | 'energized';
type Feature = 'journal' | 'focus' | 'breathwork' | 'community' | 'brainHealth' | 'discover';

const PRIORITY_MAP: Record<BrainState, Feature[]> = {
  wired: ['breathwork', 'journal', 'discover', 'community', 'brainHealth', 'focus'],
  foggy: ['focus', 'breathwork', 'brainHealth', 'journal', 'discover', 'community'],
  okay: ['journal', 'community', 'discover', 'focus', 'breathwork', 'brainHealth'],
  clear: ['focus', 'journal', 'brainHealth', 'discover', 'community', 'breathwork'],
  energized: ['focus', 'community', 'brainHealth', 'journal', 'discover', 'breathwork'],
};

interface FeatureConfig {
  icon: string;
  ctaLabel: string;
  screenName: string;
  headlines: Record<BrainState, { headline: string; description: string }>;
}

const FEATURE_CONFIG: Record<Feature, FeatureConfig> = {
  journal: {
    icon: 'book-open-variant',
    ctaLabel: 'Open Journal',
    screenName: 'Journal',
    headlines: {
      wired: { headline: 'Write it out', description: 'Journaling can help a busy mind find its thread.' },
      foggy: { headline: 'Clear the fog with words', description: 'Even a few sentences can bring surprising clarity.' },
      okay: { headline: 'Check in with yourself', description: 'A quick journal entry can turn an okay day into a good one.' },
      clear: { headline: 'Capture this clarity', description: 'A clear mind is the best time to reflect.' },
      energized: { headline: 'Channel your thoughts', description: 'High energy is great for reflective writing.' },
    },
  },
  focus: {
    icon: 'timer-outline',
    ctaLabel: 'Start Session',
    screenName: 'FocusTimer',
    headlines: {
      wired: { headline: 'Try focused calm', description: 'A structured session can channel racing thoughts.' },
      foggy: { headline: 'Sharpen your focus', description: 'A short focus session can cut through the fog.' },
      okay: { headline: 'Build some momentum', description: 'A focus session can turn okay into productive.' },
      clear: { headline: 'Ride this focus', description: 'Your brain is ready — a focus session will feel effortless.' },
      energized: { headline: 'Put this energy to work', description: 'Channel your momentum into something meaningful.' },
    },
  },
  breathwork: {
    icon: 'weather-windy',
    ctaLabel: 'Start Breathwork',
    screenName: 'Breathwork',
    headlines: {
      wired: { headline: 'Settle your mind', description: 'Extended exhales help a racing brain find its rhythm.' },
      foggy: { headline: 'Wake up your brain', description: 'Activating breathwork boosts oxygen flow and alertness.' },
      okay: { headline: 'Reset with a breath', description: 'A quick breathwork session can shift your state.' },
      clear: { headline: 'Deepen this calm', description: 'Breathwork can extend a clear, present state.' },
      energized: { headline: 'Breathe and center', description: 'Ground your energy before diving into the day.' },
    },
  },
  community: {
    icon: 'account-group-outline',
    ctaLabel: 'Open Community',
    screenName: 'Community',
    headlines: {
      wired: { headline: 'Connect with others', description: 'Sometimes sharing what you\u2019re feeling helps more than solving it.' },
      foggy: { headline: 'See what others are up to', description: 'A little social energy can lift the fog.' },
      okay: { headline: 'Check in with the community', description: 'See what\u2019s happening and maybe share something of your own.' },
      clear: { headline: 'Share your clarity', description: 'Your calm perspective might be what someone needs today.' },
      energized: { headline: 'Share your energy', description: 'Your momentum might be what someone else needs today.' },
    },
  },
  brainHealth: {
    icon: 'brain',
    ctaLabel: 'Check Brain Health',
    screenName: 'Insights',
    headlines: {
      wired: { headline: 'Track your patterns', description: 'Logging sleep and stress helps you spot what triggers wired days.' },
      foggy: { headline: 'Check your readiness', description: 'Sleep and hydration data might explain the fog.' },
      okay: { headline: 'Build your baseline', description: 'Tracking brain health turns okay days into data you can learn from.' },
      clear: { headline: 'See what\u2019s working', description: 'Track the factors behind your clear state.' },
      energized: { headline: 'Log your peak state', description: 'Capturing what fuels your best days builds a personal playbook.' },
    },
  },
  discover: {
    icon: 'headphones',
    ctaLabel: 'Browse Content',
    screenName: 'DiscoverNavigator',
    headlines: {
      wired: { headline: 'Listen and unwind', description: 'A podcast or masterclass can redirect a restless mind.' },
      foggy: { headline: 'Let someone else do the thinking', description: 'Listen to something that sparks a new thought.' },
      okay: { headline: 'Explore something new', description: 'Masterclasses and podcasts for your wellness journey.' },
      clear: { headline: 'Learn something new', description: 'A clear mind absorbs information best.' },
      energized: { headline: 'Feed your curiosity', description: 'Channel your energy into learning something new.' },
    },
  },
};

/**
 * Given a brain state and a set of features the user has already done today,
 * returns the best nudge suggestion, or null if everything is done.
 */
export function getNudgeSuggestion(
  brainState: BrainState,
  completedFeatures: Set<Feature>
): NudgeSuggestion | null {
  const priorities = PRIORITY_MAP[brainState];
  if (!priorities) return null;

  for (const feature of priorities) {
    if (!completedFeatures.has(feature)) {
      const config = FEATURE_CONFIG[feature];
      const copy = config.headlines[brainState];
      return {
        feature,
        icon: config.icon,
        headline: copy.headline,
        description: copy.description,
        ctaLabel: config.ctaLabel,
        screenName: config.screenName,
      };
    }
  }

  return null; // All features done today
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/utils/getNudgeSuggestion.ts
git commit -m "feat(mobile): add getNudgeSuggestion pure function with brain-state priority map"
```

---

## Task 5: Create NudgeCard Component

**Files:**
- Create: `mobile/src/components/dashboard/NudgeCard.tsx`

- [ ] **Step 1: Create the component**

```typescript
import React from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';
import type { NudgeSuggestion } from '../../utils/getNudgeSuggestion';

interface NudgeCardProps {
  suggestion: NudgeSuggestion;
  onAction: () => void;
  onDismiss: () => void;
}

const NudgeCard: React.FC<NudgeCardProps> = ({ suggestion, onAction, onDismiss }) => {
  return (
    <View style={styles.container}>
      <View style={styles.row}>
        <View style={styles.iconCircle}>
          <Icon name={suggestion.icon as any} size={22} color={Colors.evergreenTeal} />
        </View>
        <View style={styles.textContainer}>
          <Text style={styles.headline}>{suggestion.headline}</Text>
          <Text style={styles.description}>{suggestion.description}</Text>
        </View>
      </View>

      <TouchableOpacity style={styles.ctaButton} onPress={onAction} activeOpacity={0.8}>
        <Text style={styles.ctaText}>{suggestion.ctaLabel}</Text>
      </TouchableOpacity>

      <TouchableOpacity onPress={onDismiss} style={styles.dismissRow} activeOpacity={0.7}>
        <Text style={styles.dismissText}>Not now</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(184,205,186,0.3)',
    padding: 16,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
  },
  row: {
    flexDirection: 'row',
    alignItems: 'flex-start',
  },
  iconCircle: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 12,
  },
  textContainer: {
    flex: 1,
  },
  headline: {
    fontSize: 15,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    lineHeight: 21,
  },
  description: {
    fontSize: 13,
    color: Colors.textSecondary,
    lineHeight: 18,
    marginTop: 2,
  },
  ctaButton: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 10,
    paddingVertical: 12,
    alignItems: 'center',
    marginTop: 14,
  },
  ctaText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
  },
  dismissRow: {
    alignItems: 'center',
    marginTop: 8,
  },
  dismissText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});

export default NudgeCard;
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/components/dashboard/NudgeCard.tsx
git commit -m "feat(mobile): add NudgeCard component for brain-state-driven suggestions"
```

---

## Task 6: Add Nudge Logic to useDashboard

**Files:**
- Modify: `mobile/src/hooks/useDashboard.ts`

- [ ] **Step 1: Add imports**

At the top of `mobile/src/hooks/useDashboard.ts`, add:
```typescript
import { getNudgeSuggestion, NudgeSuggestion } from '../utils/getNudgeSuggestion';
```

Also ensure these Firestore imports are present (they likely already are):
```typescript
import { collection, query, where, getDocs, limit } from 'firebase/firestore';
```

- [ ] **Step 2: Add nudge state and feature-done detection**

Inside the `useDashboard` function, near the other state declarations, add:

```typescript
  // Nudge card state
  const [nudgeSuggestion, setNudgeSuggestion] = useState<NudgeSuggestion | null>(null);
  const [nudgeDismissed, setNudgeDismissed] = useState(false);
  const [visitedFeatures] = useState<Set<string>>(() => new Set());
```

- [ ] **Step 3: Add nudge computation effect**

Add a useEffect that computes the nudge suggestion after brain state and protocol are done. Place it after the existing data-loading effects:

```typescript
  // Compute nudge suggestion after check-in + protocol
  useEffect(() => {
    if (!user || !db || !brainStateCheckIn?.brainState || nudgeDismissed) {
      setNudgeSuggestion(null);
      return;
    }

    // Only show nudge after protocol is done or not available
    if (todaysProtocol && !brainStateCheckIn.protocolCompleted) {
      setNudgeSuggestion(null);
      return;
    }

    const checkCompletedFeatures = async () => {
      const todayStr = new Date().toISOString().split('T')[0];
      const completed = new Set<string>(visitedFeatures);

      try {
        // Check journal
        const journalSnap = await getDocs(
          query(collection(db, 'journalEntries'), where('userId', '==', user.uid), where('createdAt', '>=', new Date(todayStr)), limit(1))
        );
        if (journalSnap.size > 0) completed.add('journal');

        // Check focus sessions
        const focusSnap = await getDocs(
          query(collection(db, 'focusSessions'), where('userId', '==', user.uid), where('startedAt', '>=', new Date(todayStr)), limit(1))
        );
        if (focusSnap.size > 0) completed.add('focus');

        // Check brain metrics
        const metricsSnap = await getDocs(
          query(collection(db, 'brainMetrics'), where('userId', '==', user.uid), where('date', '==', todayStr), limit(1))
        );
        if (metricsSnap.size > 0) completed.add('brainHealth');
      } catch (error) {
        // Non-blocking — if checks fail, just show a nudge anyway
      }

      const suggestion = getNudgeSuggestion(brainStateCheckIn.brainState as any, completed as any);
      setNudgeSuggestion(suggestion);
    };

    checkCompletedFeatures();
  }, [user, db, brainStateCheckIn, todaysProtocol, nudgeDismissed, visitedFeatures]);

  const dismissNudge = useCallback(() => {
    setNudgeDismissed(true);
    setNudgeSuggestion(null);
  }, []);

  const markFeatureVisited = useCallback((feature: string) => {
    visitedFeatures.add(feature);
  }, [visitedFeatures]);
```

- [ ] **Step 4: Add nudge to the return object**

Find the return statement and add these to the `// Dashboard V2` section:

```typescript
    // Nudge
    nudgeSuggestion,
    dismissNudge,
    markFeatureVisited,
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/hooks/useDashboard.ts
git commit -m "feat(mobile): add nudge suggestion logic to useDashboard with feature-done detection"
```

---

## Task 7: Wire NudgeCard into DashboardScreen

**Files:**
- Modify: `mobile/src/screens/DashboardScreen.tsx`

- [ ] **Step 1: Add NudgeCard import**

Add near the other dashboard component imports:
```typescript
import NudgeCard from '../components/dashboard/NudgeCard';
```

- [ ] **Step 2: Destructure nudge data from useDashboard**

Find the destructuring of `useDashboard()` and add:
```typescript
    nudgeSuggestion,
    dismissNudge,
    markFeatureVisited,
```

- [ ] **Step 3: Add NudgeCard between protocol and habits in V2 layout**

In the V2 dashboard section, find (around line 170):
```typescript
            {/* Daily Reflection (after all habits completed) */}
```

Add the NudgeCard BEFORE that line:
```typescript
            {/* Nudge Card (after protocol, before habits) */}
            {nudgeSuggestion && (
              <NudgeCard
                suggestion={nudgeSuggestion}
                onAction={() => {
                  markFeatureVisited(nudgeSuggestion.feature);
                  navigation.navigate(nudgeSuggestion.screenName as never);
                }}
                onDismiss={dismissNudge}
              />
            )}

```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/DashboardScreen.tsx
git commit -m "feat(mobile): wire NudgeCard into V2 dashboard after protocol card"
```

---

## Task 8: Final Verification

- [ ] **Step 1: TypeScript check**

```bash
cd /c/Users/kyler/wellness-app/mobile && npx tsc --noEmit 2>&1 | grep -E "getNudge|NudgeCard|WeekInsight|useDashboard" | head -10
```

Expected: No errors related to our new/modified files. Pre-existing errors in other files are acceptable.

- [ ] **Step 2: Verify all new files exist**

```bash
ls mobile/src/utils/getNudgeSuggestion.ts mobile/src/components/dashboard/NudgeCard.tsx
```

Expected: Both files listed.

- [ ] **Step 3: Verify commit history on branch**

```bash
git log --oneline feat/dashboard-engagement-phase2 --not main | head -10
```

Expected: 7 commits (greeting fix, WeekInsightCard empty state, always render, getNudgeSuggestion, NudgeCard, useDashboard nudge logic, DashboardScreen wiring).

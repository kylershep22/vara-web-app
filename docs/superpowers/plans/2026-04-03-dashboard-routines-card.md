# Dashboard Routines Card — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a collapsible routines card to the mobile dashboard with completion tracking, auto-expand by time of day, and the ability to launch routines directly.

**Architecture:** Add completion service functions to `routines.service.ts`. Wire completion writes into `ActiveRoutinePlayer` and `ChecklistPlayer`. Create a new `RoutinesCard` dashboard component that fetches active routines + today's completions. Integrate into `DashboardScreen` with `ActiveRoutinePlayer` modal support. Update Firestore rules.

**Tech Stack:** React Native, TypeScript, Expo, Firebase Firestore, AsyncStorage

---

## File Structure

### New Files
| File | Responsibility |
|---|---|
| `mobile/src/components/dashboard/RoutinesCard.tsx` | Collapsible card showing all active routines with expand/collapse, Begin button, completion state, empty state |

### Modified Files
| File | Changes |
|---|---|
| `mobile/src/services/firebase/routines.service.ts` | Add `markRoutineComplete()` and `getRoutineCompletionToday()` |
| `mobile/src/screens/Focus/ActiveRoutinePlayer.tsx` | Add `onComplete` prop, call it when reaching RoutineCompleteState |
| `mobile/src/screens/Focus/components/ChecklistPlayer.tsx` | Add `onRoutineComplete` prop, call it when all items checked |
| `mobile/src/hooks/useDashboard.ts` | Fetch user routines + completions, expose routines data |
| `mobile/src/screens/DashboardScreen.tsx` | Add RoutinesCard + ActiveRoutinePlayer modal state |
| `firestore.rules` | Add completions subcollection rule under routines |

---

## Task 0: Create Feature Branch

- [ ] **Step 1: Create branch**

```bash
cd /c/Users/kyler/wellness-app && git checkout main && git checkout -b feat/dashboard-routines-card
```

---

## Task 1: Add Completion Service Functions

**Files:**
- Modify: `mobile/src/services/firebase/routines.service.ts`

- [ ] **Step 1: Add getDoc and setDoc to imports**

Find the import block at the top:
```typescript
import {
  collection,
  query,
  where,
  getDocs,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
```

Add `getDoc` and `setDoc` to the import list:
```typescript
import {
  collection,
  query,
  where,
  getDocs,
  getDoc,
  addDoc,
  updateDoc,
  deleteDoc,
  doc,
  setDoc,
  serverTimestamp,
  Timestamp,
} from 'firebase/firestore';
```

- [ ] **Step 2: Add completion functions at the end of the file**

Add before the closing of the file, after `calculateTotalDuration`:

```typescript
/**
 * Mark a routine as completed for a given date.
 * Writes to routines/{routineId}/completions/{dateISO}.
 * Skips write if already completed today.
 */
export async function markRoutineComplete(
  routineId: string,
  data: { mode: 'timed' | 'checklist'; durationMinutes: number }
): Promise<void> {
  if (!db) throw new Error('Firestore is not initialized');
  const today = new Date();
  const dateISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;

  const ref = doc(db, 'routines', routineId, 'completions', dateISO);
  const existing = await getDoc(ref);
  if (existing.exists()) return; // Already completed today

  await setDoc(ref, {
    date: dateISO,
    completedAt: serverTimestamp(),
    mode: data.mode,
    durationMinutes: data.durationMinutes,
  });
}

/**
 * Check if a routine was completed today.
 * Returns the completion doc data or null.
 */
export async function getRoutineCompletionToday(
  routineId: string,
  dateISO: string
): Promise<{ date: string; mode: string; durationMinutes: number } | null> {
  if (!db) return null;
  try {
    const ref = doc(db, 'routines', routineId, 'completions', dateISO);
    const snap = await getDoc(ref);
    return snap.exists() ? (snap.data() as any) : null;
  } catch {
    return null;
  }
}
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/services/firebase/routines.service.ts
git commit -m "feat(mobile): add markRoutineComplete and getRoutineCompletionToday to routines service"
```

---

## Task 2: Update Firestore Security Rules

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Add completions subcollection rule**

Find the routines rule block:
```
    // Routines (morning, evening, Sunday routines)
    match /routines/{routineId} {
      allow read: if isAuthenticated() && isOwner(resource.data.userId);
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update, delete: if isAuthenticated() && isOwner(resource.data.userId);
```

Add right after the closing `}` of the routines match block:

```
    // Routine completions subcollection
    match /routines/{routineId}/completions/{completionId} {
      allow read, write: if isAuthenticated()
        && get(/databases/$(database)/documents/routines/$(routineId)).data.userId == request.auth.uid;
    }
```

- [ ] **Step 2: Deploy rules**

```bash
cd /c/Users/kyler/wellness-app && npx firebase deploy --only firestore:rules
```

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: add Firestore rules for routine completions subcollection"
```

---

## Task 3: Wire Completion into ActiveRoutinePlayer

**Files:**
- Modify: `mobile/src/screens/Focus/ActiveRoutinePlayer.tsx`

- [ ] **Step 1: Add onComplete prop to interface**

Find:
```typescript
interface ActiveRoutinePlayerProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Routine to play */
  routine: Routine;
  /** Callback when routine is closed/completed */
  onClose: () => void;
  /** Callback to edit routine */
  onEditRoutine: () => void;
}
```

Replace with:
```typescript
interface ActiveRoutinePlayerProps {
  /** Whether the modal is visible */
  visible: boolean;
  /** Routine to play */
  routine: Routine;
  /** Callback when routine is closed/completed */
  onClose: () => void;
  /** Callback to edit routine */
  onEditRoutine: () => void;
  /** Called when routine is completed (for persistence) */
  onComplete?: (routineId: string) => void;
}
```

- [ ] **Step 2: Destructure onComplete and add import**

Add to the destructured props:
```typescript
  onComplete,
```

Add import at top:
```typescript
import { markRoutineComplete, calculateTotalDuration } from '../../services/firebase/routines.service';
```

Note: `calculateTotalDuration` may already be imported via the `Routine` type import chain. Check and add only if needed.

- [ ] **Step 3: Call markRoutineComplete when routine completes**

Find where `setIsCompleted(true)` is called (there are 3 places — lines ~181, ~302, ~351). After each `setIsCompleted(true)`, the player enters the complete state. The best place to write the completion is in a useEffect that watches `isCompleted`:

Add this useEffect after the existing `isCompleted` state declaration:

```typescript
  // Persist completion when routine finishes
  useEffect(() => {
    if (isCompleted && routine.id) {
      const totalDuration = calculateTotalDuration(safeActivities);
      markRoutineComplete(routine.id, {
        mode: routine.mode || 'timed',
        durationMinutes: totalDuration,
      }).catch(() => {}); // Non-blocking
      onComplete?.(routine.id);
    }
  }, [isCompleted]);
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/Focus/ActiveRoutinePlayer.tsx
git commit -m "feat(mobile): write routine completion on ActiveRoutinePlayer finish"
```

---

## Task 4: Wire Completion into ChecklistPlayer

**Files:**
- Modify: `mobile/src/screens/Focus/components/ChecklistPlayer.tsx`

- [ ] **Step 1: Add onRoutineComplete prop**

Find:
```typescript
interface ChecklistPlayerProps {
  activities: Activity[];
  onComplete: () => void;
  routineName: string;
}
```

Replace with:
```typescript
interface ChecklistPlayerProps {
  activities: Activity[];
  onComplete: () => void;
  routineName: string;
  /** Called with routine ID when all items are checked for completion persistence */
  onRoutineComplete?: () => void;
}
```

Add `onRoutineComplete` to the destructured props.

- [ ] **Step 2: Call onRoutineComplete when all done**

Find the existing `allDone` useEffect:
```typescript
  useEffect(() => {
    if (allDone && activities.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      const timeout = setTimeout(() => onComplete(), 600);
      return () => clearTimeout(timeout);
    }
  }, [allDone]);
```

Replace with:
```typescript
  useEffect(() => {
    if (allDone && activities.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onRoutineComplete?.();
      const timeout = setTimeout(() => onComplete(), 600);
      return () => clearTimeout(timeout);
    }
  }, [allDone]);
```

- [ ] **Step 3: Pass onRoutineComplete from RoutinesTab**

In `mobile/src/screens/Focus/RoutinesTab.tsx`, find where `ChecklistPlayer` is rendered and add the `onRoutineComplete` prop. This requires reading the file to find the exact location. The ChecklistPlayer should receive a callback that calls `markRoutineComplete`.

Add import in RoutinesTab.tsx:
```typescript
import { markRoutineComplete, calculateTotalDuration } from '../../services/firebase/routines.service';
```

Find the `<ChecklistPlayer` render and add:
```typescript
onRoutineComplete={() => {
  if (activeRoutine) {
    markRoutineComplete(activeRoutine.id, {
      mode: 'checklist',
      durationMinutes: calculateTotalDuration(activeRoutine.activities),
    }).catch(() => {});
  }
}}
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/Focus/components/ChecklistPlayer.tsx mobile/src/screens/Focus/RoutinesTab.tsx
git commit -m "feat(mobile): write routine completion on ChecklistPlayer all-done"
```

---

## Task 5: Create RoutinesCard Component

**Files:**
- Create: `mobile/src/components/dashboard/RoutinesCard.tsx`

- [ ] **Step 1: Create the full component**

```typescript
/**
 * RoutinesCard — Dashboard card surfacing user's routines
 * Collapsible container with auto-expand by time of day.
 */

import React, { useState, useEffect, useCallback } from 'react';
import { View, Text, TouchableOpacity, StyleSheet } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';
import { Routine, Activity, calculateTotalDuration } from '../../services/firebase/routines.service';
import { getTemplatesForType, RoutineTemplate } from '../../constants/routineTemplates';

const COLLAPSE_KEY = 'dashboard_routines_collapsed';

interface RoutineCompletion {
  [routineId: string]: boolean; // true if completed today
}

interface RoutinesCardProps {
  routines: Routine[];
  completions: RoutineCompletion;
  onBeginRoutine: (routine: Routine) => void;
  onNavigateToRoutines: () => void;
  onApplyTemplate: (template: RoutineTemplate) => void;
}

function getTimeRelevantTypes(): Set<string> {
  const hour = new Date().getHours();
  const day = new Date().getDay(); // 0 = Sunday
  const relevant = new Set<string>();

  if (hour >= 5 && hour < 12) relevant.add('morning');
  if (hour >= 12) relevant.add('evening');
  if (day === 0) relevant.add('custom'); // Sunday routines stored as 'custom'

  return relevant;
}

function getTimeBasedTemplates(): RoutineTemplate[] {
  const hour = new Date().getHours();
  const day = new Date().getDay();

  if (day === 0) return getTemplatesForType('sunday').slice(0, 2);
  if (hour < 12) return getTemplatesForType('morning').slice(0, 2);
  return getTemplatesForType('evening').slice(0, 2);
}

const RoutineRow: React.FC<{
  routine: Routine;
  isExpanded: boolean;
  isCompleted: boolean;
  onToggleExpand: () => void;
  onBegin: () => void;
}> = ({ routine, isExpanded, isCompleted, onToggleExpand, onBegin }) => {
  const totalDuration = calculateTotalDuration(routine.activities);

  return (
    <View style={rowStyles.container}>
      <TouchableOpacity style={rowStyles.header} onPress={onToggleExpand} activeOpacity={0.7}>
        <View style={rowStyles.headerLeft}>
          {isCompleted && (
            <Icon name="check-circle" size={18} color={Colors.evergreenTeal} style={{ marginRight: 6 }} />
          )}
          <Text style={[rowStyles.name, isCompleted && rowStyles.nameCompleted]}>{routine.name}</Text>
        </View>
        <View style={rowStyles.headerRight}>
          <Text style={rowStyles.duration}>{totalDuration} min</Text>
          <Icon name={isExpanded ? 'chevron-up' : 'chevron-down'} size={20} color={Colors.textSecondary} />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={rowStyles.expandedContent}>
          {routine.activities.map((activity, idx) => (
            <View key={activity.id || idx} style={rowStyles.activityRow}>
              <Icon name={activity.icon as any} size={16} color={Colors.evergreenTeal} />
              <Text style={rowStyles.activityName}>{activity.name}</Text>
              <Text style={rowStyles.activityDuration}>{activity.duration} min</Text>
            </View>
          ))}

          {routine.reminderTime && (
            <View style={rowStyles.reminderRow}>
              <Icon name="bell-outline" size={14} color={Colors.textSecondary} />
              <Text style={rowStyles.reminderText}>Reminder at {routine.reminderTime}</Text>
            </View>
          )}

          {isCompleted ? (
            <TouchableOpacity style={rowStyles.doAgainButton} onPress={onBegin} activeOpacity={0.7}>
              <Text style={rowStyles.doAgainText}>Do again</Text>
            </TouchableOpacity>
          ) : (
            <TouchableOpacity style={rowStyles.beginButton} onPress={onBegin} activeOpacity={0.8}>
              <Text style={rowStyles.beginText}>Begin</Text>
            </TouchableOpacity>
          )}
        </View>
      )}
    </View>
  );
};

const RoutinesCard: React.FC<RoutinesCardProps> = ({
  routines,
  completions,
  onBeginRoutine,
  onNavigateToRoutines,
  onApplyTemplate,
}) => {
  const [cardCollapsed, setCardCollapsed] = useState(false);
  const [expandedIds, setExpandedIds] = useState<Set<string>>(new Set());

  // Load collapse state from AsyncStorage
  useEffect(() => {
    AsyncStorage.getItem(COLLAPSE_KEY).then(val => {
      if (val === 'true') setCardCollapsed(true);
    }).catch(() => {});
  }, []);

  // Auto-expand time-relevant routines on mount
  useEffect(() => {
    if (routines.length === 0) return;
    const relevant = getTimeRelevantTypes();
    const autoExpand = new Set<string>();

    routines.forEach(r => {
      // Auto-expand if time-relevant AND not completed today
      if (relevant.has(r.type) && !completions[r.id]) {
        autoExpand.add(r.id);
      }
    });

    setExpandedIds(autoExpand);
  }, [routines, completions]);

  const toggleCardCollapse = useCallback(() => {
    const next = !cardCollapsed;
    setCardCollapsed(next);
    AsyncStorage.setItem(COLLAPSE_KEY, next ? 'true' : 'false').catch(() => {});
  }, [cardCollapsed]);

  const toggleRowExpand = useCallback((id: string) => {
    setExpandedIds(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  // Empty state — no routines built
  if (routines.length === 0) {
    const templates = getTimeBasedTemplates();

    return (
      <View style={styles.card}>
        <View style={styles.headerRow}>
          <Text style={styles.headerTitle}>Your Routines</Text>
        </View>
        <View style={styles.emptyState}>
          <Icon name="lightbulb-outline" size={28} color={Colors.evergreenTeal} />
          <Text style={styles.emptyHeadline}>Build your first routine</Text>
          <Text style={styles.emptyBody}>
            Structured routines help your brain build consistency.
          </Text>
          {templates.map(template => (
            <TouchableOpacity
              key={template.id}
              style={styles.templateRow}
              onPress={() => onApplyTemplate(template)}
              activeOpacity={0.7}
            >
              <View style={styles.templateInfo}>
                <Text style={styles.templateName}>{template.name}</Text>
                <Text style={styles.templateDuration}>{template.totalMinutes} min</Text>
              </View>
              <Text style={styles.templateCta}>Try this</Text>
            </TouchableOpacity>
          ))}
          <TouchableOpacity onPress={onNavigateToRoutines} style={styles.browseLink}>
            <Text style={styles.browseLinkText}>Browse all routines</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.card}>
      <TouchableOpacity style={styles.headerRow} onPress={toggleCardCollapse} activeOpacity={0.7}>
        <Text style={styles.headerTitle}>Your Routines</Text>
        <Icon name={cardCollapsed ? 'chevron-down' : 'chevron-up'} size={22} color={Colors.textSecondary} />
      </TouchableOpacity>

      {!cardCollapsed && (
        <View style={styles.routinesList}>
          {routines.map(routine => (
            <RoutineRow
              key={routine.id}
              routine={routine}
              isExpanded={expandedIds.has(routine.id)}
              isCompleted={!!completions[routine.id]}
              onToggleExpand={() => toggleRowExpand(routine.id)}
              onBegin={() => onBeginRoutine(routine)}
            />
          ))}
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    borderWidth: 1,
    borderColor: 'rgba(184,205,186,0.3)',
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 14,
  },
  headerTitle: {
    fontSize: 16,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  routinesList: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  emptyState: {
    alignItems: 'center',
    paddingHorizontal: 20,
    paddingBottom: 20,
  },
  emptyHeadline: {
    fontSize: 16,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginTop: 10,
  },
  emptyBody: {
    fontSize: 13,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: 4,
    marginBottom: 16,
  },
  templateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    width: '100%',
    paddingVertical: 10,
    paddingHorizontal: 12,
    backgroundColor: Colors.dewSage,
    borderRadius: 8,
    marginBottom: 8,
  },
  templateInfo: {
    flex: 1,
  },
  templateName: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
  },
  templateDuration: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  templateCta: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  browseLink: {
    marginTop: 4,
  },
  browseLinkText: {
    fontSize: 13,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
});

const rowStyles = StyleSheet.create({
  container: {
    backgroundColor: Colors.dewSage,
    borderRadius: 10,
    marginBottom: 6,
    overflow: 'hidden',
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 12,
    paddingVertical: 12,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  name: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
  },
  nameCompleted: {
    color: Colors.textSecondary,
  },
  duration: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  expandedContent: {
    paddingHorizontal: 12,
    paddingBottom: 12,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 4,
    gap: 8,
  },
  activityName: {
    flex: 1,
    fontSize: 13,
    color: Colors.textPrimary,
  },
  activityDuration: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  reminderRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginTop: 6,
  },
  reminderText: {
    fontSize: 12,
    color: Colors.textSecondary,
  },
  beginButton: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 8,
    paddingVertical: 10,
    alignItems: 'center',
    marginTop: 10,
  },
  beginText: {
    color: '#FFFFFF',
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
  },
  doAgainButton: {
    alignItems: 'center',
    marginTop: 10,
  },
  doAgainText: {
    fontSize: 13,
    color: Colors.textSecondary,
  },
});

export default RoutinesCard;
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/components/dashboard/RoutinesCard.tsx
git commit -m "feat(mobile): add RoutinesCard dashboard component with collapse, auto-expand, empty state"
```

---

## Task 6: Add Routine Data to useDashboard

**Files:**
- Modify: `mobile/src/hooks/useDashboard.ts`

- [ ] **Step 1: Add imports**

Add at the top of the file:
```typescript
import {
  fetchUserRoutines,
  getRoutineCompletionToday,
  createRoutine,
  Routine,
} from '../services/firebase/routines.service';
import { RoutineTemplate } from '../constants/routineTemplates';
```

- [ ] **Step 2: Add routine state**

Near the other state declarations in the hook, add:
```typescript
  // Routines
  const [dashboardRoutines, setDashboardRoutines] = useState<Routine[]>([]);
  const [routineCompletions, setRoutineCompletions] = useState<Record<string, boolean>>({});
  const [activePlayerRoutine, setActivePlayerRoutine] = useState<Routine | null>(null);
  const [routinePlayerVisible, setRoutinePlayerVisible] = useState(false);
```

- [ ] **Step 3: Add routine data loading**

Add a useEffect to fetch routines and their completions. Place it after the existing data-loading effects:

```typescript
  // Load routines + today's completions for dashboard card
  useEffect(() => {
    if (!user) return;
    let cancelled = false;

    (async () => {
      try {
        const allRoutines = await fetchUserRoutines(user.uid);
        const activeRoutines = allRoutines.filter(r => r.active);

        if (cancelled) return;
        setDashboardRoutines(activeRoutines);

        // Check completions for each active routine
        const todayStr = new Date().toISOString().split('T')[0];
        const completionMap: Record<string, boolean> = {};
        await Promise.all(
          activeRoutines.map(async (r) => {
            const completion = await getRoutineCompletionToday(r.id, todayStr);
            completionMap[r.id] = !!completion;
          })
        );

        if (!cancelled) setRoutineCompletions(completionMap);
      } catch (error) {
        console.error('Error loading dashboard routines:', error);
      }
    })();

    return () => { cancelled = true; };
  }, [user]);
```

- [ ] **Step 4: Add handler functions**

```typescript
  const handleBeginRoutine = useCallback((routine: Routine) => {
    setActivePlayerRoutine(routine);
    setRoutinePlayerVisible(true);
  }, []);

  const handleCloseRoutinePlayer = useCallback(() => {
    setRoutinePlayerVisible(false);
    setActivePlayerRoutine(null);
  }, []);

  const handleRoutineComplete = useCallback((routineId: string) => {
    setRoutineCompletions(prev => ({ ...prev, [routineId]: true }));
  }, []);

  const handleApplyRoutineTemplate = useCallback(async (template: RoutineTemplate) => {
    if (!user) return;
    try {
      const activities = template.activities.map((a, i) => ({
        ...a,
        id: i + 1,
        order: i,
      }));
      await createRoutine(user.uid, {
        name: template.name,
        type: template.type as any,
        activities,
        active: true,
        reminderTime: null,
        mode: 'checklist',
      });
      // Re-fetch routines
      const allRoutines = await fetchUserRoutines(user.uid);
      setDashboardRoutines(allRoutines.filter(r => r.active));
    } catch (error) {
      console.error('Error applying routine template:', error);
    }
  }, [user]);
```

- [ ] **Step 5: Add to return object**

In the return statement, add a `// Routines` section:

```typescript
    // Routines (dashboard card)
    dashboardRoutines,
    routineCompletions,
    activePlayerRoutine,
    routinePlayerVisible,
    handleBeginRoutine,
    handleCloseRoutinePlayer,
    handleRoutineComplete,
    handleApplyRoutineTemplate,
```

- [ ] **Step 6: Commit**

```bash
git add mobile/src/hooks/useDashboard.ts
git commit -m "feat(mobile): add routine fetching, completions, and player state to useDashboard"
```

---

## Task 7: Wire RoutinesCard + Player into DashboardScreen

**Files:**
- Modify: `mobile/src/screens/DashboardScreen.tsx`

- [ ] **Step 1: Add imports**

```typescript
import RoutinesCard from '../components/dashboard/RoutinesCard';
import { ActiveRoutinePlayer } from '../screens/Focus/ActiveRoutinePlayer';
```

Note: `ActiveRoutinePlayer` may need a relative path adjustment. The DashboardScreen is at `screens/DashboardScreen.tsx` and ActiveRoutinePlayer is at `screens/Focus/ActiveRoutinePlayer.tsx`, so the import is `'./Focus/ActiveRoutinePlayer'`.

- [ ] **Step 2: Destructure routine data from useDashboard**

Add to the existing destructuring of `useDashboard()`:
```typescript
    dashboardRoutines,
    routineCompletions,
    activePlayerRoutine,
    routinePlayerVisible,
    handleBeginRoutine,
    handleCloseRoutinePlayer,
    handleRoutineComplete,
    handleApplyRoutineTemplate,
```

- [ ] **Step 3: Add RoutinesCard to V2 layout**

Find the comment `{/* Position 4: Week Insight (always visible) */}` and add the RoutinesCard BEFORE it:

```typescript
            {/* Position 5: Routines Card */}
            <RoutinesCard
              routines={dashboardRoutines}
              completions={routineCompletions}
              onBeginRoutine={handleBeginRoutine}
              onNavigateToRoutines={() => navigation.navigate('Rhythms' as never, { tab: 'routines' } as never)}
              onApplyTemplate={handleApplyRoutineTemplate}
            />

```

- [ ] **Step 4: Add ActiveRoutinePlayer modal**

Find the end of the V2 section (the `</>` closing tag around line 216) and add BEFORE the closing of the entire ScrollView/SafeAreaView (outside the V2 conditional, so it's always available as a modal overlay):

Actually, the ActiveRoutinePlayer should go at the very end of the component, outside the ScrollView, since it's a full-screen modal. Find the very end of the return statement, just before the final `</SafeAreaView>` closing tag, and add:

```typescript
      {/* Routine Player Modal */}
      {activePlayerRoutine && (
        <ActiveRoutinePlayer
          visible={routinePlayerVisible}
          routine={activePlayerRoutine}
          onClose={handleCloseRoutinePlayer}
          onEditRoutine={() => {
            handleCloseRoutinePlayer();
            navigation.navigate('Rhythms' as never, { tab: 'routines' } as never);
          }}
          onComplete={handleRoutineComplete}
        />
      )}
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/DashboardScreen.tsx
git commit -m "feat(mobile): add RoutinesCard and ActiveRoutinePlayer to V2 dashboard"
```

---

## Task 8: Final Verification

- [ ] **Step 1: TypeScript check**

```bash
cd /c/Users/kyler/wellness-app/mobile && npx tsc --noEmit 2>&1 | grep -E "RoutinesCard|routines\.service|ActiveRoutinePlayer|ChecklistPlayer|useDashboard" | head -15
```

Expected: No errors in our modified files.

- [ ] **Step 2: Verify new file exists**

```bash
ls mobile/src/components/dashboard/RoutinesCard.tsx
```

- [ ] **Step 3: Verify commit history**

```bash
git log --oneline feat/dashboard-routines-card --not main | head -10
```

Expected: 7 commits (service functions, firestore rules, ActiveRoutinePlayer completion, ChecklistPlayer completion, RoutinesCard component, useDashboard routines, DashboardScreen wiring).

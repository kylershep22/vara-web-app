# Routines Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enhance the mobile Routines feature with checklist mode (default), templated best-practice routines, and Evening/Bedtime consolidation.

**Architecture:** Three sequential changes: (1) Consolidate `bedtime` type into `evening` via data migration and UI updates, (2) Add routine templates as a constant file with a template picker in the creation flow, (3) Add checklist mode as the default routine execution with a Checklist|Timed toggle persisted per routine. The existing `ActiveRoutinePlayer` remains for timed mode.

**Tech Stack:** React Native, TypeScript, Firebase Firestore, expo-haptics

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `mobile/src/services/firebase/routines.service.ts` | Update `RoutineType`, add `mode` field to `Routine` interface |
| Modify | `mobile/src/services/firebase/routineMigration.service.ts` | Add bedtime→evening migration |
| Modify | `mobile/src/constants/activityLibrary.ts` | Merge bedtime+evening activities, remove `bedtime` references, update `sunday` display to `Sunday` |
| Create | `mobile/src/constants/routineTemplates.ts` | Curated routine template definitions |
| Modify | `mobile/src/screens/Focus/components/TimeOfDaySelector.tsx` | Replace bedtime with sunday, update type |
| Modify | `mobile/src/screens/Focus/RoutinesTab.tsx` | Template picker in empty state, mode toggle, checklist execution |
| Create | `mobile/src/screens/Focus/components/ChecklistPlayer.tsx` | Checklist mode routine execution component |
| Modify | `mobile/src/components/routines/RoutineEditor.tsx` | Remove `bedtime` references |

---

### Task 1: Consolidate Evening/Bedtime type and migrate data

**Files:**
- Modify: `mobile/src/services/firebase/routines.service.ts`
- Modify: `mobile/src/services/firebase/routineMigration.service.ts`
- Modify: `mobile/src/constants/activityLibrary.ts`
- Modify: `mobile/src/screens/Focus/components/TimeOfDaySelector.tsx`
- Modify: `mobile/src/components/routines/RoutineEditor.tsx`

- [ ] **Step 1: Update RoutineType and Routine interface**

In `mobile/src/services/firebase/routines.service.ts`, make two changes:

a) Update the type union (line 20):
```typescript
export type RoutineType = 'morning' | 'evening' | 'custom';
```

b) Add `mode` field to the `Routine` interface (after `reminderTime`, line 38):
```typescript
export interface Routine {
  id: string;
  userId: string;
  name: string;
  type: RoutineType;
  activities: Activity[];
  active: boolean;
  reminderTime: string | null;
  mode: 'checklist' | 'timed';
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

c) Update `createRoutine` to default `mode` to `'checklist'` if not provided. In the `addDoc` call (around line 113), add:
```typescript
mode: routineData.mode || 'checklist',
```

- [ ] **Step 2: Add bedtime→evening migration**

In `mobile/src/services/firebase/routineMigration.service.ts`, extend the existing migration pattern. Add a new function `migrateBedtimeToEvening(userId)` that follows the same batch-write pattern as `migrateSundayToCustom`:
- Query routines where `type == 'bedtime'`
- Batch update each to `type: 'evening'`, `migratedFrom: 'bedtime'`, `migratedAt: serverTimestamp()`
- Update `needsMigration` to also check for `type: 'bedtime'`
- Update `runMigrationIfNeeded` to call both migrations

- [ ] **Step 3: Merge activity libraries**

In `mobile/src/constants/activityLibrary.ts`:

a) Remove `BEDTIME_ACTIVITIES` export. Merge its unique activities into `EVENING_ACTIVITIES`. The new `EVENING_ACTIVITIES` should be:
```typescript
export const EVENING_ACTIVITIES: ActivityTemplate[] = [
  { name: 'Dim Lights', duration: 5, icon: 'brightness-6', color: 'orange' },
  { name: 'Phone to DND', duration: 1, icon: 'cellphone-off', color: 'gray' },
  { name: 'Evening Walk', duration: 20, icon: 'walk', color: 'green' },
  { name: 'Stretching', duration: 10, icon: 'yoga', color: 'green' },
  { name: 'Meditation/Breathwork', duration: 10, icon: 'meditation', color: 'purple' },
  { name: 'Gratitude Journal', duration: 10, icon: 'notebook', color: 'blue' },
  { name: 'Reading', duration: 20, icon: 'book-open', color: 'indigo' },
  { name: 'Herbal Tea', duration: 10, icon: 'tea', color: 'brown' },
  { name: 'Journaling', duration: 15, icon: 'notebook', color: 'indigo' },
  { name: 'Plan Tomorrow', duration: 10, icon: 'calendar-check', color: 'teal' },
  { name: 'Sleep Sounds', duration: 2, icon: 'music-note', color: 'purple' },
  { name: 'Skincare', duration: 10, icon: 'face-woman', color: 'pink' },
  { name: 'No Screens', duration: 30, icon: 'monitor-off', color: 'red' },
];
```

b) Update `getActivitiesForType`: remove the `case 'bedtime'` branch.

c) Update `getRoutineTypeDisplayName`: remove `bedtime` case, update `evening` to return `'Evening'`.

d) Update `getRoutineTypeDescription`: remove `bedtime` case, update `evening` to `'Wind down and prepare for restful sleep'`.

e) Update `getRoutineTypeIcon`: remove `bedtime` case, update `evening` to use `'moon-waning-crescent'` (the bedtime icon — better represents wind-down).

f) Rename `SUNDAY_ACTIVITIES` to just keep as-is but update `CUSTOM_ACTIVITIES` to not spread it. Instead, `CUSTOM_ACTIVITIES` should be its own standalone list.

- [ ] **Step 4: Update TimeOfDaySelector**

In `mobile/src/screens/Focus/components/TimeOfDaySelector.tsx`:

a) Update the `TimeOfDay` type (line 22):
```typescript
export type TimeOfDay = 'morning' | 'evening' | 'custom';
```

Wait — we need Sunday too. The design calls for Morning | Evening | Sunday | Custom. But Sunday is not a `RoutineType` (it was migrated to `custom`). We need to handle this mapping.

Update `TimeOfDay` to include `sunday`:
```typescript
export type TimeOfDay = 'morning' | 'evening' | 'sunday' | 'custom';
```

Update `TIME_OPTIONS` (line 30-35):
```typescript
const TIME_OPTIONS: TimeOption[] = [
  { value: 'morning', label: 'Morning', icon: 'white-balance-sunny' },
  { value: 'evening', label: 'Evening', icon: 'moon-waning-crescent' },
  { value: 'sunday', label: 'Sunday', icon: 'calendar' },
  { value: 'custom', label: 'Custom', icon: 'sparkles' },
];
```

- [ ] **Step 5: Update RoutinesTab mapping**

In `mobile/src/screens/Focus/RoutinesTab.tsx`, update `mapTimeOfDayToRoutineType` to handle the sunday→custom mapping:

```typescript
const mapTimeOfDayToRoutineType = (time: TimeOfDay): RoutineType => {
  if (time === 'sunday') return 'custom';
  return time as RoutineType;
};
```

Also update the migration call to include the new bedtime migration (already handled by `runMigrationIfNeeded`).

- [ ] **Step 6: Update RoutineEditor**

In `mobile/src/components/routines/RoutineEditor.tsx`, ensure any references to `'bedtime'` type are removed or mapped to `'evening'`.

- [ ] **Step 7: Commit**

```bash
git add mobile/src/services/firebase/routines.service.ts mobile/src/services/firebase/routineMigration.service.ts mobile/src/constants/activityLibrary.ts mobile/src/screens/Focus/components/TimeOfDaySelector.tsx mobile/src/screens/Focus/RoutinesTab.tsx mobile/src/components/routines/RoutineEditor.tsx
git commit -m "feat: consolidate bedtime into evening routine type with data migration"
```

---

### Task 2: Add routine templates

**Files:**
- Create: `mobile/src/constants/routineTemplates.ts`
- Modify: `mobile/src/screens/Focus/RoutinesTab.tsx`

- [ ] **Step 1: Create routineTemplates.ts**

Create `mobile/src/constants/routineTemplates.ts`:

```typescript
/**
 * Routine Templates
 * Curated best-practice routines users can apply with one tap
 */

import { Activity } from '../services/firebase/routines.service';

export interface RoutineTemplate {
  id: string;
  name: string;
  description: string;
  type: 'morning' | 'evening' | 'custom';
  activities: Omit<Activity, 'id' | 'order'>[];
  totalMinutes: number;
}

function buildActivities(
  items: { name: string; duration: number; icon: string; color: string }[]
): Omit<Activity, 'id' | 'order'>[] {
  return items.map((item) => ({
    name: item.name,
    duration: item.duration,
    icon: item.icon,
    color: item.color,
  }));
}

// ===== MORNING TEMPLATES =====

export const MORNING_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'morning-essentials',
    name: 'The Essentials',
    description: 'For people who hit snooze twice and need a fast start',
    type: 'morning',
    totalMinutes: 10,
    activities: buildActivities([
      { name: 'Hydration', duration: 1, icon: 'water', color: 'cyan' },
      { name: 'Stretching', duration: 3, icon: 'yoga', color: 'green' },
      { name: 'Intention Setting', duration: 3, icon: 'lightbulb', color: 'yellow' },
      { name: 'Breakfast', duration: 3, icon: 'coffee', color: 'orange' },
    ]),
  },
  {
    id: 'morning-energize',
    name: 'Energize & Focus',
    description: 'For people who want to own their morning before the day owns them',
    type: 'morning',
    totalMinutes: 25,
    activities: buildActivities([
      { name: 'Hydration', duration: 1, icon: 'water', color: 'cyan' },
      { name: 'Movement / Exercise', duration: 10, icon: 'dumbbell', color: 'green' },
      { name: 'Breathwork', duration: 3, icon: 'meditation', color: 'purple' },
      { name: 'Journaling', duration: 5, icon: 'book-open-outline', color: 'blue' },
      { name: 'Goal Review', duration: 3, icon: 'checkbox-marked-circle', color: 'teal' },
      { name: 'Breakfast', duration: 3, icon: 'coffee', color: 'orange' },
    ]),
  },
  {
    id: 'morning-mindful',
    name: 'Mindful Morning',
    description: 'For people who want calm clarity before the noise starts',
    type: 'morning',
    totalMinutes: 20,
    activities: buildActivities([
      { name: 'Hydration', duration: 1, icon: 'water', color: 'cyan' },
      { name: 'Meditation', duration: 5, icon: 'meditation', color: 'purple' },
      { name: 'Gratitude Practice', duration: 3, icon: 'heart', color: 'red' },
      { name: 'Journaling', duration: 5, icon: 'book-open-outline', color: 'blue' },
      { name: 'Fresh Air', duration: 6, icon: 'weather-sunny', color: 'yellow' },
    ]),
  },
];

// ===== EVENING TEMPLATES =====

export const EVENING_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'evening-quick',
    name: 'Quick Wind-Down',
    description: 'For people who just need to signal their brain it\'s time to stop',
    type: 'evening',
    totalMinutes: 10,
    activities: buildActivities([
      { name: 'Phone to DND', duration: 1, icon: 'cellphone-off', color: 'gray' },
      { name: 'Breathwork', duration: 4, icon: 'meditation', color: 'purple' },
      { name: 'Gratitude Journal', duration: 5, icon: 'notebook', color: 'blue' },
    ]),
  },
  {
    id: 'evening-full-reset',
    name: 'Full Reset',
    description: 'For people who carry the day\'s stress into the night',
    type: 'evening',
    totalMinutes: 25,
    activities: buildActivities([
      { name: 'Dim Lights', duration: 1, icon: 'brightness-6', color: 'orange' },
      { name: 'Phone to DND', duration: 1, icon: 'cellphone-off', color: 'gray' },
      { name: 'Stretching', duration: 5, icon: 'yoga', color: 'green' },
      { name: 'Gratitude Journal', duration: 5, icon: 'notebook', color: 'blue' },
      { name: 'Reading', duration: 13, icon: 'book-open', color: 'indigo' },
    ]),
  },
  {
    id: 'evening-sleep-optimizer',
    name: 'Sleep Optimizer',
    description: 'For people who struggle to fall or stay asleep',
    type: 'evening',
    totalMinutes: 20,
    activities: buildActivities([
      { name: 'No Screens', duration: 1, icon: 'monitor-off', color: 'red' },
      { name: 'Cool Room', duration: 1, icon: 'thermometer', color: 'blue' },
      { name: 'Herbal Tea', duration: 3, icon: 'tea', color: 'brown' },
      { name: 'Meditation / Breathwork', duration: 5, icon: 'meditation', color: 'purple' },
      { name: 'Sleep Sounds', duration: 10, icon: 'music-note', color: 'purple' },
    ]),
  },
];

// ===== SUNDAY TEMPLATES =====

export const SUNDAY_TEMPLATES: RoutineTemplate[] = [
  {
    id: 'sunday-weekly-reset',
    name: 'Weekly Reset',
    description: 'For people who want to start Monday feeling prepared, not behind',
    type: 'custom',
    totalMinutes: 30,
    activities: buildActivities([
      { name: 'Week Review', duration: 5, icon: 'calendar-month', color: 'blue' },
      { name: 'Goal Setting', duration: 5, icon: 'flag', color: 'teal' },
      { name: 'Meal Planning', duration: 10, icon: 'food-variant', color: 'orange' },
      { name: 'Learning Time', duration: 5, icon: 'school', color: 'blue' },
      { name: 'Relaxation', duration: 5, icon: 'spa', color: 'green' },
    ]),
  },
  {
    id: 'sunday-recharge',
    name: 'Recharge Day',
    description: 'For people who need permission to slow down',
    type: 'custom',
    totalMinutes: 25,
    activities: buildActivities([
      { name: 'Gratitude Practice', duration: 5, icon: 'heart', color: 'red' },
      { name: 'Creative Time', duration: 10, icon: 'palette', color: 'purple' },
      { name: 'Social Connection', duration: 5, icon: 'account-group', color: 'purple' },
      { name: 'Relaxation', duration: 5, icon: 'spa', color: 'green' },
    ]),
  },
];

/**
 * Get templates for a given TimeOfDay selection
 */
export function getTemplatesForType(timeOfDay: string): RoutineTemplate[] {
  switch (timeOfDay) {
    case 'morning':
      return MORNING_TEMPLATES;
    case 'evening':
      return EVENING_TEMPLATES;
    case 'sunday':
      return SUNDAY_TEMPLATES;
    case 'custom':
      return []; // No templates for custom — user builds from scratch
    default:
      return [];
  }
}
```

- [ ] **Step 2: Add template picker to RoutinesTab empty state**

In `mobile/src/screens/Focus/RoutinesTab.tsx`, update the `EmptyState` component to show template cards when templates exist for the selected type.

Import the templates:
```typescript
import { getTemplatesForType, RoutineTemplate } from '../../constants/routineTemplates';
import { createRoutine } from '../../services/firebase/routines.service';
```

Update the `EmptyState` component to accept `selectedTime` and `userId`, and show template cards:

```typescript
interface EmptyStateProps {
  onCreate: () => void;
  selectedTime: TimeOfDay;
  userId: string;
  onTemplateApplied: () => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onCreate, selectedTime, userId, onTemplateApplied }) => {
  const templates = getTemplatesForType(selectedTime);
  const [applying, setApplying] = useState<string | null>(null);

  const handleApplyTemplate = async (template: RoutineTemplate) => {
    setApplying(template.id);
    try {
      const activities = template.activities.map((a, index) => ({
        ...a,
        id: index + 1,
        order: index,
      }));

      await createRoutine(userId, {
        name: template.name,
        type: template.type as any,
        activities,
        active: true,
        reminderTime: null,
        mode: 'checklist',
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      onTemplateApplied();
    } catch (error) {
      console.error('Error applying template:', error);
    } finally {
      setApplying(null);
    }
  };

  return (
    <ScrollView contentContainerStyle={styles.emptyContainer}>
      <Text style={styles.emptyEmoji}>🌱</Text>
      <Text style={styles.emptyHeadline}>{FocusCopy.emptyHeadline}</Text>
      <Text style={styles.emptyBody}>{FocusCopy.emptyBody}</Text>

      {/* Template Cards */}
      {templates.length > 0 && (
        <View style={{ width: '100%', gap: 12, marginTop: 16, marginBottom: 16 }}>
          {templates.map((template) => (
            <TouchableOpacity
              key={template.id}
              onPress={() => handleApplyTemplate(template)}
              disabled={applying !== null}
              style={{
                backgroundColor: ColorTokens.backgroundSurface,
                borderRadius: RadiusTokens.lg,
                padding: 16,
                borderWidth: 1,
                borderColor: ColorTokens.border,
                opacity: applying === template.id ? 0.5 : 1,
              }}
            >
              <Text style={{ fontSize: 16, fontWeight: '600', color: ColorTokens.textPrimary }}>
                {template.name}
              </Text>
              <Text style={{ fontSize: 13, color: ColorTokens.textSecondary, marginTop: 4 }}>
                {template.description}
              </Text>
              <Text style={{ fontSize: 12, color: ColorTokens.primary, marginTop: 8 }}>
                {template.activities.length} activities · ~{template.totalMinutes} min
              </Text>
            </TouchableOpacity>
          ))}
        </View>
      )}

      {/* Build from scratch button */}
      <TouchableOpacity
        style={styles.createButton}
        onPress={onCreate}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={templates.length > 0 ? 'Build from scratch' : FocusCopy.emptyCta}
      >
        <Text style={styles.createButtonText}>
          {templates.length > 0 ? 'Build from scratch' : FocusCopy.emptyCta}
        </Text>
      </TouchableOpacity>
    </ScrollView>
  );
};
```

Update the `EmptyState` usage in the main render (around line 180):
```tsx
<EmptyState
  onCreate={handleCreate}
  selectedTime={selectedTime}
  userId={user.uid}
  onTemplateApplied={loadActiveRoutine}
/>
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/constants/routineTemplates.ts mobile/src/screens/Focus/RoutinesTab.tsx
git commit -m "feat: add routine templates with one-tap apply on empty state"
```

---

### Task 3: Add checklist mode with Checklist|Timed toggle

**Files:**
- Create: `mobile/src/screens/Focus/components/ChecklistPlayer.tsx`
- Modify: `mobile/src/screens/Focus/RoutinesTab.tsx`

- [ ] **Step 1: Create ChecklistPlayer component**

Create `mobile/src/screens/Focus/components/ChecklistPlayer.tsx`:

```typescript
/**
 * ChecklistPlayer Component
 * Routine execution as an ordered checklist — no timer, no pressure.
 * Activities can be checked off in any order.
 */

import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import {
  ColorTokens,
  SpacingTokens,
  RadiusTokens,
} from '../../../tokens/design-tokens';
import { Activity } from '../../../services/firebase/routines.service';
import { getActivityColor } from './activityColors';

interface ChecklistPlayerProps {
  activities: Activity[];
  onComplete: () => void;
  routineName: string;
}

export const ChecklistPlayer: React.FC<ChecklistPlayerProps> = ({
  activities,
  onComplete,
  routineName,
}) => {
  const [completedIds, setCompletedIds] = useState<Set<number>>(new Set());
  const allDone = completedIds.size === activities.length;

  useEffect(() => {
    if (allDone && activities.length > 0) {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      // Small delay so the user sees the last item check before completion
      const timeout = setTimeout(() => onComplete(), 600);
      return () => clearTimeout(timeout);
    }
  }, [allDone]);

  const toggleActivity = (id: number) => {
    Haptics.selectionAsync();
    setCompletedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) {
        next.delete(id);
      } else {
        next.add(id);
      }
      return next;
    });
  };

  const completedCount = completedIds.size;
  const totalCount = activities.length;

  return (
    <View style={styles.container}>
      {/* Progress header */}
      <View style={styles.progressHeader}>
        <Text style={styles.progressText}>
          {completedCount} of {totalCount} complete
        </Text>
        <View style={styles.progressBarTrack}>
          <View
            style={[
              styles.progressBarFill,
              { width: `${totalCount > 0 ? (completedCount / totalCount) * 100 : 0}%` },
            ]}
          />
        </View>
      </View>

      {/* Activity checklist */}
      <ScrollView
        style={styles.list}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      >
        {activities.map((activity) => {
          const isCompleted = completedIds.has(activity.id);
          const activityColor = getActivityColor(activity.color);

          return (
            <TouchableOpacity
              key={activity.id}
              style={[
                styles.activityRow,
                isCompleted && styles.activityRowCompleted,
              ]}
              onPress={() => toggleActivity(activity.id)}
              activeOpacity={0.7}
              accessibilityRole="checkbox"
              accessibilityState={{ checked: isCompleted }}
              accessibilityLabel={`${activity.name}, ${activity.duration} minutes${isCompleted ? ', completed' : ''}`}
            >
              {/* Checkbox */}
              <View
                style={[
                  styles.checkbox,
                  isCompleted && { backgroundColor: ColorTokens.primary, borderColor: ColorTokens.primary },
                ]}
              >
                {isCompleted && (
                  <Icon name="check" size={14} color="#FFFFFF" />
                )}
              </View>

              {/* Activity icon */}
              <View
                style={[
                  styles.activityIcon,
                  { backgroundColor: isCompleted ? ColorTokens.backgroundPrimary : activityColor + '20' },
                ]}
              >
                <Icon
                  name={activity.icon as any}
                  size={18}
                  color={isCompleted ? ColorTokens.textSecondary : activityColor}
                />
              </View>

              {/* Activity info */}
              <View style={styles.activityInfo}>
                <Text
                  style={[
                    styles.activityName,
                    isCompleted && styles.activityNameCompleted,
                  ]}
                >
                  {activity.name}
                </Text>
                <Text style={styles.activityDuration}>
                  {activity.duration} min
                </Text>
              </View>
            </TouchableOpacity>
          );
        })}
      </ScrollView>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
  },
  progressHeader: {
    paddingHorizontal: SpacingTokens.lg,
    paddingVertical: SpacingTokens.md,
  },
  progressText: {
    fontSize: 14,
    fontWeight: '500',
    color: ColorTokens.textSecondary,
    marginBottom: SpacingTokens.sm,
  },
  progressBarTrack: {
    height: 4,
    backgroundColor: ColorTokens.backgroundPrimary,
    borderRadius: 2,
    overflow: 'hidden',
  },
  progressBarFill: {
    height: '100%',
    backgroundColor: ColorTokens.primary,
    borderRadius: 2,
  },
  list: {
    flex: 1,
  },
  listContent: {
    paddingHorizontal: SpacingTokens.lg,
    paddingBottom: SpacingTokens.xl,
  },
  activityRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 12,
    backgroundColor: ColorTokens.backgroundSurface,
    borderRadius: RadiusTokens.md,
    marginBottom: SpacingTokens.sm,
    gap: 12,
  },
  activityRowCompleted: {
    opacity: 0.6,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 6,
    borderWidth: 2,
    borderColor: ColorTokens.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    alignItems: 'center',
    justifyContent: 'center',
  },
  activityInfo: {
    flex: 1,
  },
  activityName: {
    fontSize: 15,
    fontWeight: '500',
    color: ColorTokens.textPrimary,
  },
  activityNameCompleted: {
    textDecorationLine: 'line-through',
    color: ColorTokens.textSecondary,
  },
  activityDuration: {
    fontSize: 13,
    color: ColorTokens.textSecondary,
    marginTop: 2,
  },
});

export default ChecklistPlayer;
```

- [ ] **Step 2: Add export to components index**

In `mobile/src/screens/Focus/components/index.ts`, add:
```typescript
export { ChecklistPlayer } from './ChecklistPlayer';
```

- [ ] **Step 3: Add mode toggle and checklist execution to RoutinesTab**

In `mobile/src/screens/Focus/RoutinesTab.tsx`, update the `RoutineView` component:

a) Import ChecklistPlayer:
```typescript
import { ChecklistPlayer } from './components';
```

b) Add a mode toggle (segmented control) between the routine header and the activity list. Add state for tracking checklist execution:

In the `RoutineView` component, add:
```typescript
const [isExecuting, setIsExecuting] = useState(false);
```

Add a mode toggle after the routine header:
```tsx
{/* Mode Toggle */}
<View style={styles.modeToggle}>
  <TouchableOpacity
    style={[styles.modeChip, routine.mode !== 'timed' && styles.modeChipActive]}
    onPress={() => handleModeChange('checklist')}
  >
    <Icon name="checkbox-marked-outline" size={16} color={routine.mode !== 'timed' ? '#FFFFFF' : ColorTokens.primary} />
    <Text style={[styles.modeChipText, routine.mode !== 'timed' && styles.modeChipTextActive]}>Checklist</Text>
  </TouchableOpacity>
  <TouchableOpacity
    style={[styles.modeChip, routine.mode === 'timed' && styles.modeChipActive]}
    onPress={() => handleModeChange('timed')}
  >
    <Icon name="timer-outline" size={16} color={routine.mode === 'timed' ? '#FFFFFF' : ColorTokens.primary} />
    <Text style={[styles.modeChipText, routine.mode === 'timed' && styles.modeChipTextActive]}>Timed</Text>
  </TouchableOpacity>
</View>
```

The `handleModeChange` function should persist the mode to Firestore:
```typescript
const handleModeChange = async (mode: 'checklist' | 'timed') => {
  if (!routine) return;
  try {
    await updateRoutine(routine.id, { mode });
    // Update local state
    setActiveRoutine({ ...routine, mode });
  } catch (error) {
    console.error('Error updating mode:', error);
  }
};
```

Note: `handleModeChange` needs access to `setActiveRoutine` — this function should be defined in the parent `RoutinesTab` and passed to `RoutineView` via props along with `routine`.

c) Update the "Begin" CTA behavior:
- If mode is `checklist` (or undefined/null — default): show `ChecklistPlayer` inline instead of launching `ActiveRoutinePlayer` modal
- If mode is `timed`: launch `ActiveRoutinePlayer` as before (call `onStartRoutine`)

When the user taps "Begin" in checklist mode:
```typescript
const handleStart = () => {
  if (routine.mode === 'timed') {
    onStart(); // launches ActiveRoutinePlayer modal
  } else {
    setIsExecuting(true); // shows ChecklistPlayer inline
  }
};
```

When checklist completes (all items checked), show the existing `RoutineCompleteState` component, then reset.

d) Add styles for the mode toggle:
```typescript
modeToggle: {
  flexDirection: 'row',
  gap: 0,
  marginBottom: SpacingTokens.md,
  borderRadius: RadiusTokens.md,
  borderWidth: 1,
  borderColor: ColorTokens.border,
  overflow: 'hidden',
},
modeChip: {
  flex: 1,
  flexDirection: 'row',
  alignItems: 'center',
  justifyContent: 'center',
  gap: 6,
  paddingVertical: 10,
  backgroundColor: ColorTokens.backgroundSurface,
},
modeChipActive: {
  backgroundColor: ColorTokens.primary,
},
modeChipText: {
  fontSize: 14,
  fontWeight: '500',
  color: ColorTokens.primary,
},
modeChipTextActive: {
  color: '#FFFFFF',
},
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/Focus/components/ChecklistPlayer.tsx mobile/src/screens/Focus/components/index.ts mobile/src/screens/Focus/RoutinesTab.tsx
git commit -m "feat: add checklist mode with Checklist|Timed toggle for routines"
```

---

### Task 4: Verify all changes

**Files:**
- No changes

- [ ] **Step 1: TypeScript compile check**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep -i "routine\|checklist\|template\|TimeOfDay" | head -20`
Expected: No new errors from our changes.

- [ ] **Step 2: Manual verification checklist**

Open the app and verify:
- [ ] TimeOfDaySelector shows: Morning | Evening | Sunday | Custom (no "Bedtime")
- [ ] Existing bedtime routines migrated to evening
- [ ] Morning empty state shows 3 template cards + "Build from scratch"
- [ ] Evening empty state shows 3 template cards
- [ ] Sunday empty state shows 2 template cards
- [ ] Custom empty state shows only "Build from scratch" (no templates)
- [ ] Tapping a template creates the routine immediately with correct activities
- [ ] Routine view shows Checklist|Timed toggle (Checklist selected by default)
- [ ] Tapping "Begin" in checklist mode shows checklist inline
- [ ] Activities can be checked in any order
- [ ] Progress bar updates as items are checked
- [ ] All items checked triggers completion
- [ ] Switching to Timed mode and tapping "Begin" launches the timer player
- [ ] Mode persists after closing/reopening

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: routines enhancement — checklist mode, templates, evening consolidation"
```

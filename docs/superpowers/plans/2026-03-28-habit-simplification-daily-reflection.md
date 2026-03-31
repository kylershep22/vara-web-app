# Habit Simplification & Daily Reflection Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the 6-step habit creation wizard with a single-screen form, make habit completion a single tap (no bottom sheet), and add an end-of-day micro check-in card to capture daily difficulty.

**Architecture:** `DASHBOARD_V2` flag gates all changes. New `SimpleHabitCreateScreen` modal replaces `WizardContainer`. `handleToggleCompletion` in `useHabitsScreen` bypasses the completion sheet in V2. New `DailyReflectionCard` on the dashboard triggers when all habits are completed and no reflection saved today. New `dailyReflections` Firestore collection stores daily difficulty signals.

**Tech Stack:** React Native, TypeScript, Firebase Firestore, expo-haptics

**Spec:** `docs/superpowers/specs/2026-03-28-habit-simplification-daily-reflection-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `mobile/src/types/models.ts` | Modify | Add `frequencyType`, `specificDays`, `timeOfDay` to Habit; add `DailyReflection` types |
| `mobile/src/components/habits/SimpleHabitCreateScreen.tsx` | Create | Single-screen habit creation form |
| `mobile/src/hooks/useHabitsScreen.ts` | Modify | V2 gate: simple create + single-tap completion |
| `mobile/src/screens/HabitsScreen.tsx` | Modify | V2 gate: render SimpleHabitCreateScreen instead of WizardContainer |
| `mobile/src/services/firebase/dailyReflection.service.ts` | Create | CRUD for dailyReflections collection |
| `mobile/src/services/firebase/index.ts` | Modify | Export new service |
| `mobile/src/components/dashboard/DailyReflectionCard.tsx` | Create | End-of-day "How did today feel?" card |
| `mobile/src/components/dashboard/index.ts` | Modify | Export new component |
| `mobile/src/hooks/useDashboard.ts` | Modify | Add daily reflection state + all-habits-completed detection |
| `mobile/src/screens/DashboardScreen.tsx` | Modify | Render DailyReflectionCard in V2 layout |
| `firestore.rules` | Modify | Add dailyReflections rules |

---

### Task 1: Types — Habit Fields + DailyReflection

**Files:**
- Modify: `mobile/src/types/models.ts`

- [ ] **Step 1: Add new Habit fields**

In `mobile/src/types/models.ts`, find the `Habit` interface. After the existing `frequency: number;` field (around line 125), add:

```typescript
  frequencyType?: 'daily' | 'specific_days' | 'flexible';
  specificDays?: number[];  // 0=Sun, 1=Mon, ..., 6=Sat
  timeOfDay?: 'morning' | 'afternoon' | 'evening' | 'anytime';
```

- [ ] **Step 2: Add DailyReflection types**

After the `BrainStateCheckIn` interface (added in earlier work), add:

```typescript
// ==========================================
// DAILY REFLECTION (End-of-Day Check-In)
// ==========================================

export type DailyReflectionValue = 'smooth' | 'okay' | 'hard';

/**
 * Daily Reflection
 * End-of-day difficulty signal captured after all habits completed.
 * Stored in the `dailyReflections` collection.
 */
export interface DailyReflection {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  reflection: DailyReflectionValue;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/types/models.ts
git commit -m "feat: add Habit V2 fields and DailyReflection types"
```

---

### Task 2: Firestore Rules + Daily Reflection Service

**Files:**
- Modify: `firestore.rules`
- Create: `mobile/src/services/firebase/dailyReflection.service.ts`
- Modify: `mobile/src/services/firebase/index.ts`

- [ ] **Step 1: Add dailyReflections security rules**

In `firestore.rules`, after the `brainStateCheckIns` match block, add:

```
    // Daily Reflections (end-of-day difficulty signal)
    match /dailyReflections/{docId} {
      allow read: if isAuthenticated() && (resource == null || resource.data.userId == request.auth.uid);
      allow create: if isAuthenticated() && request.resource.data.userId == request.auth.uid;
      allow update: if isAuthenticated() && resource.data.userId == request.auth.uid;
      allow delete: if isAuthenticated() && resource.data.userId == request.auth.uid;
    }
```

- [ ] **Step 2: Create the daily reflection service**

Create `mobile/src/services/firebase/dailyReflection.service.ts`:

```typescript
/**
 * Daily Reflection Service
 * CRUD operations for the dailyReflections Firestore collection.
 */

import {
  doc,
  getDoc,
  setDoc,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { DailyReflection, DailyReflectionValue } from '../../types';
import { logger } from '../../utils/logger';

const COLLECTION = 'dailyReflections';

const getTodayDate = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * Fetch today's daily reflection for a user.
 */
export const getTodayDailyReflection = async (
  userId: string
): Promise<DailyReflection | null> => {
  if (!db) return null;
  try {
    const todayDate = getTodayDate();
    const docId = `${userId}_${todayDate}`;
    const docRef = doc(db, COLLECTION, docId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as DailyReflection;
    }
    return null;
  } catch (error) {
    logger.error('Error getting daily reflection:', error);
    return null;
  }
};

/**
 * Save today's daily reflection.
 */
export const saveDailyReflection = async (
  userId: string,
  reflection: DailyReflectionValue
): Promise<DailyReflection> => {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    const todayDate = getTodayDate();
    const docId = `${userId}_${todayDate}`;
    const docRef = doc(db, COLLECTION, docId);

    await setDoc(docRef, {
      userId,
      date: todayDate,
      reflection,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });

    return {
      id: docId,
      userId,
      date: todayDate,
      reflection,
    } as DailyReflection;
  } catch (error) {
    logger.error('Error saving daily reflection:', error);
    throw error;
  }
};
```

- [ ] **Step 3: Export from barrel**

Add to `mobile/src/services/firebase/index.ts`:

```typescript
export * from './dailyReflection.service';
```

- [ ] **Step 4: Commit**

```bash
git add firestore.rules mobile/src/services/firebase/dailyReflection.service.ts mobile/src/services/firebase/index.ts
git commit -m "feat: add dailyReflections Firestore rules and service"
```

---

### Task 3: SimpleHabitCreateScreen Component

**Files:**
- Create: `mobile/src/components/habits/SimpleHabitCreateScreen.tsx`

- [ ] **Step 1: Create the component**

Create `mobile/src/components/habits/SimpleHabitCreateScreen.tsx`:

```typescript
/**
 * SimpleHabitCreateScreen
 * Single-screen habit creation for Dashboard V2.
 * Replaces the 6-step WizardContainer.
 */

import React, { useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  KeyboardAvoidingView,
  Platform,
  Text,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Input, Button } from '../../components';
import { EnhancedModal } from '../../components/shared/EnhancedModal';
import { Colors, Spacing, Typography, Layout } from '../../constants';

type FrequencyType = 'daily' | 'specific_days' | 'flexible';
type TimeOfDay = 'morning' | 'afternoon' | 'evening' | 'anytime';

const DAY_LABELS = ['S', 'M', 'T', 'W', 'T', 'F', 'S'];

interface SimpleHabitCreateScreenProps {
  visible: boolean;
  onDismiss: () => void;
  onSave: (data: SimpleHabitFormData) => void;
}

export interface SimpleHabitFormData {
  name: string;
  frequencyType: FrequencyType;
  specificDays: number[];
  timeOfDay: TimeOfDay;
  intention: string;
}

export const SimpleHabitCreateScreen: React.FC<SimpleHabitCreateScreenProps> = ({
  visible,
  onDismiss,
  onSave,
}) => {
  const [name, setName] = useState('');
  const [frequencyType, setFrequencyType] = useState<FrequencyType>('daily');
  const [specificDays, setSpecificDays] = useState<number[]>([]);
  const [timeOfDay, setTimeOfDay] = useState<TimeOfDay>('anytime');
  const [intention, setIntention] = useState('');
  const [showIntention, setShowIntention] = useState(false);
  const [showCaptured, setShowCaptured] = useState(false);

  const resetForm = () => {
    setName('');
    setFrequencyType('daily');
    setSpecificDays([]);
    setTimeOfDay('anytime');
    setIntention('');
    setShowIntention(false);
    setShowCaptured(false);
  };

  const handleSave = () => {
    if (!name.trim()) return;
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

    onSave({
      name: name.trim(),
      frequencyType,
      specificDays,
      timeOfDay,
      intention: intention.trim(),
    });

    setShowCaptured(true);
    setTimeout(() => {
      setShowCaptured(false);
      resetForm();
      onDismiss();
    }, 2000);
  };

  const handleDismiss = () => {
    resetForm();
    onDismiss();
  };

  const toggleDay = (dayIndex: number) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSpecificDays((prev) =>
      prev.includes(dayIndex) ? prev.filter((d) => d !== dayIndex) : [...prev, dayIndex]
    );
  };

  const selectFrequency = (type: FrequencyType) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setFrequencyType(type);
    if (type !== 'specific_days') setSpecificDays([]);
  };

  const selectTimeOfDay = (time: TimeOfDay) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setTimeOfDay(time);
  };

  if (showCaptured) {
    return (
      <EnhancedModal visible={visible} onDismiss={handleDismiss}>
        <View style={styles.capturedContainer}>
          <Text style={styles.capturedText}>Saved.</Text>
        </View>
      </EnhancedModal>
    );
  }

  return (
    <EnhancedModal visible={visible} onDismiss={handleDismiss}>
      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        style={styles.keyboardAvoid}
      >
        <ScrollView
          contentContainerStyle={styles.scrollContent}
          showsVerticalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          {/* Header */}
          <Text style={styles.title}>New rhythm</Text>

          {/* Habit Name */}
          <Input
            label="What's the habit?"
            value={name}
            onChangeText={setName}
            placeholder="e.g. Morning walk, Read 10 pages"
            style={styles.input}
            autoFocus
          />

          {/* Frequency */}
          <Text style={styles.sectionLabel}>How often?</Text>
          <View style={styles.chipRow}>
            {([
              { value: 'daily' as FrequencyType, label: 'Every day' },
              { value: 'specific_days' as FrequencyType, label: 'Specific days' },
              { value: 'flexible' as FrequencyType, label: 'Flexible' },
            ]).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, frequencyType === opt.value && styles.chipSelected]}
                onPress={() => selectFrequency(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, frequencyType === opt.value && styles.chipTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Specific Days Dots */}
          {frequencyType === 'specific_days' && (
            <View style={styles.daysRow}>
              {DAY_LABELS.map((label, index) => (
                <TouchableOpacity
                  key={index}
                  style={[styles.dayDot, specificDays.includes(index) && styles.dayDotSelected]}
                  onPress={() => toggleDay(index)}
                  activeOpacity={0.7}
                >
                  <Text style={[styles.dayDotText, specificDays.includes(index) && styles.dayDotTextSelected]}>
                    {label}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Time of Day */}
          <Text style={styles.sectionLabel}>When?</Text>
          <View style={styles.chipRow}>
            {([
              { value: 'morning' as TimeOfDay, label: 'Morning' },
              { value: 'afternoon' as TimeOfDay, label: 'Afternoon' },
              { value: 'evening' as TimeOfDay, label: 'Evening' },
              { value: 'anytime' as TimeOfDay, label: 'Anytime' },
            ]).map((opt) => (
              <TouchableOpacity
                key={opt.value}
                style={[styles.chip, timeOfDay === opt.value && styles.chipSelected]}
                onPress={() => selectTimeOfDay(opt.value)}
                activeOpacity={0.7}
              >
                <Text style={[styles.chipText, timeOfDay === opt.value && styles.chipTextSelected]}>
                  {opt.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* One-line Intention */}
          {!showIntention ? (
            <TouchableOpacity onPress={() => setShowIntention(true)} style={styles.addIntentionLink}>
              <Icon name="plus" size={16} color={Colors.evergreenTeal} />
              <Text style={styles.addIntentionText}>Add a one-line intention (optional)</Text>
            </TouchableOpacity>
          ) : (
            <Input
              label="Why does this matter to you?"
              value={intention}
              onChangeText={setIntention}
              placeholder="Why does this matter to you?"
              style={styles.input}
            />
          )}

          {/* Save Button */}
          <View style={styles.saveContainer}>
            <Button
              variant="primary"
              onPress={handleSave}
              fullWidth
              disabled={!name.trim()}
              accessibilityLabel="Save rhythm"
            >
              Save rhythm
            </Button>
            <Text style={styles.saveSubtext}>You can always adjust this later</Text>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </EnhancedModal>
  );
};

const styles = StyleSheet.create({
  keyboardAvoid: {
    flex: 1,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing['2xl'],
  },
  title: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.lg,
  },
  input: {
    marginBottom: Spacing.base,
  },
  sectionLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    marginTop: Spacing.sm,
  },
  chipRow: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  chip: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.pill,
    backgroundColor: Colors.background.default,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  chipSelected: {
    backgroundColor: Colors.dewSage,
    borderColor: Colors.evergreenTeal,
  },
  chipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  chipTextSelected: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  daysRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.base,
    paddingHorizontal: Spacing.xs,
  },
  dayDot: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.background.default,
    borderWidth: 1,
    borderColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
  },
  dayDotSelected: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  dayDotText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
  },
  dayDotTextSelected: {
    color: Colors.white,
  },
  addIntentionLink: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.base,
  },
  addIntentionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  saveContainer: {
    marginTop: Spacing.xl,
  },
  saveSubtext: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
  capturedContainer: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
  },
  capturedText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/components/habits/SimpleHabitCreateScreen.tsx
git commit -m "feat: add SimpleHabitCreateScreen for single-screen habit creation"
```

---

### Task 4: Gate Habit Creation in useHabitsScreen + HabitsScreen

**Files:**
- Modify: `mobile/src/hooks/useHabitsScreen.ts`
- Modify: `mobile/src/screens/HabitsScreen.tsx`

- [ ] **Step 1: Add V2 save handler to useHabitsScreen**

In `mobile/src/hooks/useHabitsScreen.ts`, add import at the top:

```typescript
import { DASHBOARD_V2 } from '../constants/dashboardConfig';
import { SimpleHabitFormData } from '../components/habits/SimpleHabitCreateScreen';
```

After `handleWizardComplete` (around line 178), add a new handler:

```typescript
  const handleSimpleHabitSave = useCallback(async (formData: SimpleHabitFormData) => {
    if (!user || !user.uid) {
      Alert.alert('Authentication Error', 'You must be logged in to create a habit.');
      return;
    }

    try {
      // Map V2 form data to habit data with backward-compatible fields
      const frequencyMap = {
        daily: { type: 'daily' as const, frequency: 7 },
        specific_days: { type: 'weekly' as const, frequency: formData.specificDays.length },
        flexible: { type: 'custom' as const, frequency: 0 },
      };
      const { type, frequency } = frequencyMap[formData.frequencyType];

      const habitData: any = {
        name: formData.name,
        type,
        frequency,
        frequencyType: formData.frequencyType,
        active: true,
        totalStepsTaken: 0,
        thisWeekSteps: 0,
        missedYesterday: false,
        consecutiveMisses: 0,
        scalingPhase: 'getting_started',
      };

      if (formData.specificDays.length > 0) {
        habitData.specificDays = formData.specificDays;
      }

      if (formData.timeOfDay !== 'anytime') {
        habitData.timeOfDay = formData.timeOfDay;
      }

      if (formData.intention) {
        habitData.intention = {
          label: formData.intention,
          category: 'focus_clarity',
          isCustom: true,
        };
      }

      await createHabit(user.uid, habitData);
      setModalVisible(false);
    } catch (error: any) {
      logger.error('Error saving habit:', error);
      Alert.alert('Unable to Save Habit', error?.message || 'Failed to save habit.');
    }
  }, [user]);
```

Add `handleSimpleHabitSave` to the return object.

- [ ] **Step 2: Gate completion in handleToggleCompletion**

In `handleToggleCompletion` (around line 203), find:

```typescript
      } else if (!reflectionEnabled) {
        // Silent completion — reflections disabled, mark done immediately
        await markHabitComplete(habitId, user!.uid, today, { source: 'track' });
        completeHabitLocally(habitId);
      } else {
        // Open the completion sheet for reflection
        const habit = habits.find((h) => h.id === habitId);
        if (habit) {
          setCompletionSheetHabit(habit);
        }
      }
```

Replace with:

```typescript
      } else if (DASHBOARD_V2 || !reflectionEnabled) {
        // V2: single-tap completion, no sheet. Also used when reflections disabled.
        await markHabitComplete(habitId, user!.uid, today, { source: 'track' });
        completeHabitLocally(habitId);
      } else {
        // V1: Open the completion sheet for reflection
        const habit = habits.find((h) => h.id === habitId);
        if (habit) {
          setCompletionSheetHabit(habit);
        }
      }
```

- [ ] **Step 3: Gate wizard vs simple create in HabitsScreen**

In `mobile/src/screens/HabitsScreen.tsx`, add imports:

```typescript
import { DASHBOARD_V2 } from '../constants/dashboardConfig';
import { SimpleHabitCreateScreen } from '../components/habits/SimpleHabitCreateScreen';
```

Add `handleSimpleHabitSave` to the destructured values from `useHabitsScreen()`.

Find the `WizardContainer` block (around lines 174-179):

```tsx
      <WizardContainer
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        editingHabit={editingHabit}
        onComplete={handleWizardComplete}
      />
```

Replace with:

```tsx
      {DASHBOARD_V2 ? (
        <SimpleHabitCreateScreen
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          onSave={handleSimpleHabitSave}
        />
      ) : (
        <WizardContainer
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          editingHabit={editingHabit}
          onComplete={handleWizardComplete}
        />
      )}
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/hooks/useHabitsScreen.ts mobile/src/screens/HabitsScreen.tsx
git commit -m "feat: gate habit creation and completion behind DASHBOARD_V2"
```

---

### Task 5: DailyReflectionCard Component

**Files:**
- Create: `mobile/src/components/dashboard/DailyReflectionCard.tsx`
- Modify: `mobile/src/components/dashboard/index.ts`

- [ ] **Step 1: Create the component**

Create `mobile/src/components/dashboard/DailyReflectionCard.tsx`:

```typescript
/**
 * DailyReflectionCard
 * End-of-day micro check-in: "How did today feel overall?"
 * Shown when all daily habits are completed and no reflection saved today.
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { DailyReflectionValue } from '../../types';

interface DailyReflectionCardProps {
  onReflect: (value: DailyReflectionValue) => void;
  onSkip: () => void;
}

const REFLECTION_OPTIONS: { value: DailyReflectionValue; label: string }[] = [
  { value: 'smooth', label: 'Smooth' },
  { value: 'okay', label: 'Okay' },
  { value: 'hard', label: 'Hard' },
];

export const DailyReflectionCard: React.FC<DailyReflectionCardProps> = ({
  onReflect,
  onSkip,
}) => {
  const [showCaptured, setShowCaptured] = useState(false);

  const handleSelect = (value: DailyReflectionValue) => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onReflect(value);
    setShowCaptured(true);
    setTimeout(() => setShowCaptured(false), 2000);
  };

  if (showCaptured) {
    return (
      <View style={styles.container}>
        <View style={styles.capturedContainer}>
          <Text style={styles.capturedText}>Captured.</Text>
        </View>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>How did today feel overall?</Text>
      <View style={styles.chipRow}>
        {REFLECTION_OPTIONS.map((opt) => (
          <TouchableOpacity
            key={opt.value}
            style={styles.chip}
            onPress={() => handleSelect(opt.value)}
            activeOpacity={0.7}
          >
            <Text style={styles.chipText}>{opt.label}</Text>
          </TouchableOpacity>
        ))}
      </View>
      <TouchableOpacity onPress={onSkip} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
        <Text style={styles.skipText}>Skip for now</Text>
      </TouchableOpacity>
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
  },
  prompt: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  chipRow: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.base,
  },
  chip: {
    flex: 1,
    paddingVertical: Spacing.md,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.background.default,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  chipText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
  },
  skipText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  capturedContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  capturedText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
});
```

- [ ] **Step 2: Export from barrel**

Add to `mobile/src/components/dashboard/index.ts`:

```typescript
export { DailyReflectionCard } from './DailyReflectionCard';
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/dashboard/DailyReflectionCard.tsx mobile/src/components/dashboard/index.ts
git commit -m "feat: add DailyReflectionCard component"
```

---

### Task 6: Wire Daily Reflection into useDashboard

**Files:**
- Modify: `mobile/src/hooks/useDashboard.ts`

- [ ] **Step 1: Add imports**

Add to the existing imports in `useDashboard.ts`:

```typescript
import {
  getTodayDailyReflection,
  saveDailyReflection,
} from '../services/firebase';
import { DailyReflection as DailyReflectionType, DailyReflectionValue } from '../types';
```

- [ ] **Step 2: Add state variables**

After the existing brain state check-in state variables, add:

```typescript
  // Dashboard V2: Daily Reflection
  const [dailyReflection, setDailyReflection] = useState<DailyReflectionType | null>(null);
  const [dailyReflectionDismissed, setDailyReflectionDismissed] = useState(false);
```

- [ ] **Step 3: Add data loading**

In the existing V2 brain state check-in useEffect (the one starting with `if (!DASHBOARD_V2 || !user?.uid) return;`), add the daily reflection load alongside the brain state load:

Find the V2 useEffect and add `getTodayDailyReflection` to it. After `setBrainStateCheckIn(existing)`, add:

```typescript
        const existingReflection = await getTodayDailyReflection(user.uid);
        setDailyReflection(existingReflection);
```

- [ ] **Step 4: Add computed flag for showing reflection card**

After the `todaysProtocol` useMemo, add:

```typescript
  const showDailyReflection = useMemo(() => {
    if (!DASHBOARD_V2) return false;
    if (dailyReflection || dailyReflectionDismissed) return false;
    if (habits.length === 0) return false;
    // Check if all active habits are completed today
    const activeHabits = habits.filter((h) => h.active);
    if (activeHabits.length === 0) return false;
    return activeHabits.every((h) => completedToday.has(h.id));
  }, [habits, completedToday, dailyReflection, dailyReflectionDismissed]);
```

- [ ] **Step 5: Add handlers**

After the computed flag, add:

```typescript
  const handleDailyReflection = useCallback(async (value: DailyReflectionValue) => {
    if (!user?.uid) return;
    try {
      const reflection = await saveDailyReflection(user.uid, value);
      setDailyReflection(reflection);
    } catch (error) {
      logger.error('Error saving daily reflection:', error);
    }
  }, [user]);

  const handleDailyReflectionSkip = useCallback(() => {
    setDailyReflectionDismissed(true);
  }, []);
```

- [ ] **Step 6: Add to return object**

Add these to the return object:

```typescript
    // Daily Reflection
    showDailyReflection,
    handleDailyReflection,
    handleDailyReflectionSkip,
```

- [ ] **Step 7: Commit**

```bash
git add mobile/src/hooks/useDashboard.ts
git commit -m "feat: add daily reflection state and handlers to useDashboard"
```

---

### Task 7: Render DailyReflectionCard on Dashboard

**Files:**
- Modify: `mobile/src/screens/DashboardScreen.tsx`

- [ ] **Step 1: Add imports**

Add to the existing dashboard component imports:

```typescript
import { DailyReflectionCard } from '../components/dashboard/DailyReflectionCard';
```

- [ ] **Step 2: Destructure new values**

Add to the `useDashboard()` destructuring:

```typescript
    showDailyReflection,
    handleDailyReflection,
    handleDailyReflectionSkip,
```

- [ ] **Step 3: Add card to V2 layout**

In the V2 branch of the `DASHBOARD_V2` conditional, find the `TodaysProtocolCard` block and add the `DailyReflectionCard` after it (before `WeeklyHabitsCard`):

```tsx
            {/* Daily Reflection (after all habits completed) */}
            {showDailyReflection && (
              <DailyReflectionCard
                onReflect={handleDailyReflection}
                onSkip={handleDailyReflectionSkip}
              />
            )}
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/DashboardScreen.tsx
git commit -m "feat: render DailyReflectionCard on Dashboard V2"
```

---

### Task 8: Deploy Firestore Rules + Smoke Test

**Files:** None (verification only)

- [ ] **Step 1: Deploy Firestore rules**

```bash
cd C:/Users/kyler/wellness-app && firebase deploy --only firestore:rules
```

Wait 30 seconds for propagation.

- [ ] **Step 2: TypeScript check**

```bash
cd mobile && npx tsc --noEmit
```

Verify no new type errors from our changes.

- [ ] **Step 3: Verify habit creation**

- Navigate to Rhythms tab
- Tap FAB or "Add a habit"
- Verify single-screen form appears with: name input, frequency chips, time-of-day chips, intention link
- Create a habit with just a name → "Saved." confirmation → returns to Rhythms
- Create a habit with "Specific days" → verify day dots appear and are tappable
- Create a habit with intention → verify it saves

- [ ] **Step 4: Verify single-tap completion**

- Tap a habit checkbox → immediately marks complete, no bottom sheet
- Verify haptic feedback fires
- Verify AnimatedCheckbox animation plays
- Tap again → unchecks (undo works)
- Complete all habits → verify QuietFinish celebration appears

- [ ] **Step 5: Verify daily reflection card**

- After all habits are completed, navigate to Home
- Verify "How did today feel overall?" card appears between protocol and habits
- Tap "Smooth" → "Captured." confirmation → card disappears
- Reload → card does not reappear (reflection saved)

- [ ] **Step 6: Commit any fixes**

```bash
git add -A
git commit -m "fix: address issues from habit simplification smoke test"
```

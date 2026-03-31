# Dashboard V2 Simplification Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Simplify the mobile dashboard to 5 focused cards with a new single-tap brain state check-in, protocol recommendations, and updated greeting — all gated behind a `DASHBOARD_V2` feature flag.

**Architecture:** New `DASHBOARD_V2` boolean flag gates both rendering and data-fetching. Two new components (BrainStateCheckin, TodaysProtocolCard) replace the old check-in modal. A new Firestore collection `brainStateCheckIns` stores data separately from the legacy `morningCheckIns`. The useDashboard hook conditionally skips V1-only fetches for performance.

**Tech Stack:** React Native, TypeScript, Firebase Firestore, expo-haptics

**Spec:** `docs/superpowers/specs/2026-03-28-dashboard-v2-simplification-design.md`

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `mobile/src/constants/dashboardConfig.ts` | Create | Feature flag `DASHBOARD_V2` |
| `mobile/src/constants/brainStateProtocols.ts` | Create | 5 protocol definitions with instructions |
| `mobile/src/constants/index.ts` | Modify | Export new constants |
| `mobile/src/types/models.ts` | Modify | Add `BrainState` type and `BrainStateCheckIn` interface |
| `mobile/src/services/firebase/brainStateCheckIn.service.ts` | Create | CRUD for `brainStateCheckIns` collection |
| `mobile/src/services/firebase/index.ts` | Modify | Export new service |
| `mobile/src/components/dashboard/BrainStateCheckin.tsx` | Create | Check-in card (expanded + collapsed) |
| `mobile/src/components/dashboard/TodaysProtocolCard.tsx` | Create | Protocol recommendation card |
| `mobile/src/components/dashboard/index.ts` | Modify | Export new components |
| `mobile/src/hooks/useDashboard.ts` | Modify | V2 gated data-fetching, greeting, brain state handlers |
| `mobile/src/screens/DashboardScreen.tsx` | Modify | V2 conditional layout |
| `firestore.rules` | Modify | Add `brainStateCheckIns` security rules |

---

### Task 1: Feature Flag and Constants

**Files:**
- Create: `mobile/src/constants/dashboardConfig.ts`
- Create: `mobile/src/constants/brainStateProtocols.ts`
- Modify: `mobile/src/constants/index.ts`

- [ ] **Step 1: Create the dashboard config file**

Create `mobile/src/constants/dashboardConfig.ts`:

```typescript
/**
 * Dashboard configuration flags
 * DASHBOARD_V2: When true, renders the simplified dashboard layout.
 * Set to false to restore the original V1 layout.
 */
export const DASHBOARD_V2 = true;
```

- [ ] **Step 2: Create the brain state protocols file**

Create `mobile/src/constants/brainStateProtocols.ts`:

```typescript
/**
 * Brain State Protocol Definitions
 * Maps each brain state to a recommended protocol with instructions.
 */

import { BrainState } from '../types';

export type ProtocolCategory = 'breathwork' | 'reflection' | 'reset';

export interface BrainStateProtocol {
  id: string;
  brainState: BrainState;
  name: string;
  description: string;
  duration: string;
  durationSeconds: number;
  instructions: string[];
  category: ProtocolCategory;
}

export const BRAIN_STATE_PROTOCOLS: Record<BrainState, BrainStateProtocol> = {
  wired: {
    id: 'extended-exhale',
    brainState: 'wired',
    name: 'Extended Exhale',
    description: 'Longer exhales activate your parasympathetic nervous system, slowing a racing mind.',
    duration: '5 min',
    durationSeconds: 300,
    category: 'breathwork',
    instructions: [
      'Find a comfortable seated position and close your eyes.',
      'Inhale slowly through your nose for 4 seconds.',
      'Exhale slowly through your mouth for 8 seconds.',
      'Repeat this pattern for 5 minutes, letting each exhale feel longer and softer.',
      'When your mind wanders, gently return to the breath count.',
    ],
  },
  foggy: {
    id: 'activating-breathwork',
    brainState: 'foggy',
    name: 'Activating Breathwork',
    description: 'Short, rhythmic breathing increases oxygen flow and wakes up your prefrontal cortex.',
    duration: '4 min',
    durationSeconds: 240,
    category: 'breathwork',
    instructions: [
      'Sit upright with your shoulders back.',
      'Inhale sharply through your nose for 2 seconds.',
      'Exhale forcefully through your mouth for 2 seconds.',
      'Keep a steady, energizing rhythm for 4 minutes.',
      'Finish with one deep breath in and a slow exhale out.',
    ],
  },
  okay: {
    id: 'micro-reset',
    brainState: 'okay',
    name: '90-Second Micro-Reset',
    description: 'A brief pause to reconnect with your senses and sharpen your awareness.',
    duration: '90 sec',
    durationSeconds: 90,
    category: 'reset',
    instructions: [
      'Pause whatever you are doing and sit still.',
      'Name 3 things you can see right now.',
      'Name 2 things you can hear.',
      'Name 1 thing you can feel (texture, temperature, pressure).',
      'Take one slow breath and continue your day.',
    ],
  },
  clear: {
    id: 'gratitude-clarity',
    brainState: 'clear',
    name: 'Gratitude & Clarity Reflection',
    description: 'When your mind is already calm, gratitude deepens that state and builds momentum.',
    duration: '3 min',
    durationSeconds: 180,
    category: 'reflection',
    instructions: [
      'Close your eyes and take three slow breaths.',
      'Think of one thing you are genuinely grateful for today. Stay with it for a moment.',
      'Ask yourself: what is the one thing that matters most today?',
      'Visualize yourself completing that one thing with calm focus.',
      'Open your eyes when you are ready.',
    ],
  },
  energized: {
    id: 'focus-primer',
    brainState: 'energized',
    name: 'Focus Primer',
    description: 'Channel high energy into a single intention before it scatters.',
    duration: '5 min',
    durationSeconds: 300,
    category: 'reflection',
    instructions: [
      'Write down or mentally name the single most important task for this energy.',
      'Close your eyes. Take 5 deep breaths to center your focus.',
      'Visualize the task from start to finish — what does "done" look like?',
      'Set a clear intention: "For the next block of time, I focus only on this."',
      'Open your eyes and begin immediately. Do not check your phone first.',
    ],
  },
};

export const getProtocolForState = (state: BrainState): BrainStateProtocol => {
  return BRAIN_STATE_PROTOCOLS[state];
};
```

- [ ] **Step 3: Export new constants from the barrel**

In `mobile/src/constants/index.ts`, add these lines at the bottom:

```typescript
export { DASHBOARD_V2 } from './dashboardConfig';
export {
  BRAIN_STATE_PROTOCOLS,
  getProtocolForState,
  type BrainStateProtocol,
  type ProtocolCategory,
} from './brainStateProtocols';
```

- [ ] **Step 4: Commit**

```bash
git add mobile/src/constants/dashboardConfig.ts mobile/src/constants/brainStateProtocols.ts mobile/src/constants/index.ts
git commit -m "feat: add dashboard V2 feature flag and brain state protocol constants"
```

---

### Task 2: Types and Data Model

**Files:**
- Modify: `mobile/src/types/models.ts`

- [ ] **Step 1: Add BrainState type and BrainStateCheckIn interface**

In `mobile/src/types/models.ts`, add the following after the existing `MorningCheckIn` interface (around line 762):

```typescript
// ==========================================
// BRAIN STATE CHECK-IN (Dashboard V2)
// ==========================================

export type BrainState = 'wired' | 'foggy' | 'okay' | 'clear' | 'energized';

/**
 * Brain State Check-In
 * Single-tap daily check-in that maps to a recommended protocol.
 * Stored in the `brainStateCheckIns` collection.
 */
export interface BrainStateCheckIn {
  id: string;
  userId: string;
  date: string; // YYYY-MM-DD
  brainState: BrainState;
  protocolId: string;
  protocolCompleted: boolean;
  createdAt: Timestamp;
  updatedAt: Timestamp;
}
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/types/models.ts
git commit -m "feat: add BrainState type and BrainStateCheckIn interface"
```

---

### Task 3: Firestore Security Rules

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Add brainStateCheckIns rules**

In `firestore.rules`, add the following block directly after the `morningCheckIns` match block (after line 193):

```
    // Brain State Check-Ins (Dashboard V2 single-tap check-in)
    match /brainStateCheckIns/{checkInId} {
      allow read: if isAuthenticated() && (resource == null || isOwner(resource.data.userId));
      allow create: if isAuthenticated() && isOwner(request.resource.data.userId);
      allow update, delete: if isAuthenticated() && isOwner(resource.data.userId);
    }
```

- [ ] **Step 2: Commit**

```bash
git add firestore.rules
git commit -m "feat: add Firestore security rules for brainStateCheckIns collection"
```

---

### Task 4: Brain State Check-In Service

**Files:**
- Create: `mobile/src/services/firebase/brainStateCheckIn.service.ts`
- Modify: `mobile/src/services/firebase/index.ts`

- [ ] **Step 1: Create the service file**

Create `mobile/src/services/firebase/brainStateCheckIn.service.ts`:

```typescript
/**
 * Brain State Check-In Service
 * CRUD operations for the brainStateCheckIns Firestore collection.
 */

import {
  doc,
  getDoc,
  setDoc,
  updateDoc,
  query,
  collection,
  where,
  orderBy,
  limit,
  getDocs,
  serverTimestamp,
} from 'firebase/firestore';
import { db } from '../../config/firebase';
import { BrainState, BrainStateCheckIn } from '../../types';
import { getProtocolForState } from '../../constants/brainStateProtocols';
import { logger } from '../../utils/logger';

const COLLECTION = 'brainStateCheckIns';

const getTodayDate = (): string => {
  const now = new Date();
  return `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
};

/**
 * Fetch today's brain state check-in for a user.
 * Returns null if no check-in exists for today.
 */
export const getTodayBrainStateCheckIn = async (
  userId: string
): Promise<BrainStateCheckIn | null> => {
  if (!db) return null;
  try {
    const todayDate = getTodayDate();
    const checkInId = `${userId}_${todayDate}`;
    const docRef = doc(db, COLLECTION, checkInId);
    const docSnap = await getDoc(docRef);

    if (docSnap.exists()) {
      return { id: docSnap.id, ...docSnap.data() } as BrainStateCheckIn;
    }
    return null;
  } catch (error) {
    logger.error('Error getting brain state check-in:', error);
    return null;
  }
};

/**
 * Save (or update) today's brain state check-in.
 * Automatically maps the brain state to the corresponding protocol.
 */
export const saveBrainStateCheckIn = async (
  userId: string,
  brainState: BrainState
): Promise<BrainStateCheckIn> => {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    const todayDate = getTodayDate();
    const checkInId = `${userId}_${todayDate}`;
    const docRef = doc(db, COLLECTION, checkInId);
    const protocol = getProtocolForState(brainState);

    const existingDoc = await getDoc(docRef);

    if (existingDoc.exists()) {
      await updateDoc(docRef, {
        brainState,
        protocolId: protocol.id,
        protocolCompleted: false,
        updatedAt: serverTimestamp(),
      });
    } else {
      await setDoc(docRef, {
        userId,
        date: todayDate,
        brainState,
        protocolId: protocol.id,
        protocolCompleted: false,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }

    const savedDoc = await getDoc(docRef);
    return { id: savedDoc.id, ...savedDoc.data() } as BrainStateCheckIn;
  } catch (error) {
    logger.error('Error saving brain state check-in:', error);
    throw error;
  }
};

/**
 * Mark today's protocol as completed.
 */
export const markProtocolCompleted = async (userId: string): Promise<void> => {
  if (!db) throw new Error('Firestore is not initialized');
  try {
    const todayDate = getTodayDate();
    const checkInId = `${userId}_${todayDate}`;
    const docRef = doc(db, COLLECTION, checkInId);
    await updateDoc(docRef, {
      protocolCompleted: true,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    logger.error('Error marking protocol completed:', error);
    throw error;
  }
};

/**
 * Fetch brain state check-in history for the last N days.
 * For use in insights and correlation analysis.
 */
export const getBrainStateHistory = async (
  userId: string,
  days: number = 7
): Promise<BrainStateCheckIn[]> => {
  if (!db) return [];
  try {
    const q = query(
      collection(db, COLLECTION),
      where('userId', '==', userId),
      orderBy('date', 'desc'),
      limit(days)
    );
    const snapshot = await getDocs(q);
    return snapshot.docs.map((d) => ({ id: d.id, ...d.data() } as BrainStateCheckIn));
  } catch (error) {
    logger.error('Error getting brain state history:', error);
    return [];
  }
};
```

- [ ] **Step 2: Export from the firebase services barrel**

Add this line to `mobile/src/services/firebase/index.ts`:

```typescript
export * from './brainStateCheckIn.service';
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/services/firebase/brainStateCheckIn.service.ts mobile/src/services/firebase/index.ts
git commit -m "feat: add brainStateCheckIn service for Dashboard V2"
```

---

### Task 5: BrainStateCheckin Component

**Files:**
- Create: `mobile/src/components/dashboard/BrainStateCheckin.tsx`
- Modify: `mobile/src/components/dashboard/index.ts`

- [ ] **Step 1: Create the BrainStateCheckin component**

Create `mobile/src/components/dashboard/BrainStateCheckin.tsx`:

```typescript
/**
 * BrainStateCheckin
 * Single-tap daily check-in for Dashboard V2.
 * Shows expanded state picker when not completed, collapses after selection.
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { BrainState } from '../../types';

interface BrainStateCheckinProps {
  currentCheckIn: { brainState: BrainState } | null;
  onSelect: (state: BrainState) => void;
  loading?: boolean;
}

const BRAIN_STATES: {
  state: BrainState;
  label: string;
  description: string;
  color: string;
}[] = [
  { state: 'wired', label: 'Wired', description: 'Racing thoughts, can\'t settle', color: Colors.softCoral },
  { state: 'foggy', label: 'Foggy', description: 'Low energy, hard to focus', color: Colors.sunriseAmber },
  { state: 'okay', label: 'Okay', description: 'Nothing great, nothing bad', color: Colors.mutedSageGray },
  { state: 'clear', label: 'Clear', description: 'Calm, present, ready', color: Colors.evergreenTeal },
  { state: 'energized', label: 'Energized', description: 'Focused and sharp', color: Colors.success },
];

export const BrainStateCheckin: React.FC<BrainStateCheckinProps> = ({
  currentCheckIn,
  onSelect,
  loading = false,
}) => {
  const [isExpanded, setIsExpanded] = useState(!currentCheckIn);
  const [showCaptured, setShowCaptured] = useState(false);

  useEffect(() => {
    setIsExpanded(!currentCheckIn);
  }, [currentCheckIn]);

  const handleSelect = (state: BrainState) => {
    if (loading) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    onSelect(state);
    setShowCaptured(true);

    setTimeout(() => {
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
      setShowCaptured(false);
      setIsExpanded(false);
    }, 2000);
  };

  const handleChange = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setIsExpanded(true);
  };

  // Captured confirmation overlay
  if (showCaptured) {
    return (
      <View style={styles.container}>
        <View style={styles.capturedContainer}>
          <Text style={styles.capturedText}>Captured.</Text>
        </View>
      </View>
    );
  }

  // Collapsed state (already checked in today)
  if (!isExpanded && currentCheckIn) {
    const selectedState = BRAIN_STATES.find((s) => s.state === currentCheckIn.brainState);
    if (!selectedState) return null;

    return (
      <View style={styles.container}>
        <View style={styles.collapsedRow}>
          <View style={styles.collapsedLeft}>
            <View style={[styles.dot, { backgroundColor: selectedState.color }]} />
            <Text style={styles.collapsedLabel}>{selectedState.label}</Text>
          </View>
          <TouchableOpacity onPress={handleChange} hitSlop={{ top: 12, bottom: 12, left: 12, right: 12 }}>
            <Text style={styles.changeButton}>Change</Text>
          </TouchableOpacity>
        </View>
      </View>
    );
  }

  // Expanded state (not yet checked in, or user tapped "Change")
  return (
    <View style={styles.container}>
      <Text style={styles.prompt}>How's your brain feeling?</Text>
      <Text style={styles.subtext}>Just one tap. No wrong answers.</Text>

      <View style={styles.statesContainer}>
        {BRAIN_STATES.map((item) => (
          <TouchableOpacity
            key={item.state}
            style={[
              styles.stateRow,
              currentCheckIn?.brainState === item.state && styles.stateRowSelected,
            ]}
            onPress={() => handleSelect(item.state)}
            activeOpacity={0.7}
            disabled={loading}
          >
            <View style={[styles.dot, { backgroundColor: item.color }]} />
            <View style={styles.stateTextContainer}>
              <Text style={styles.stateLabel}>{item.label}</Text>
              <Text style={styles.stateDescription}>{item.description}</Text>
            </View>
          </TouchableOpacity>
        ))}
      </View>

      {loading && (
        <View style={styles.loadingOverlay}>
          <Text style={styles.loadingText}>Saving...</Text>
        </View>
      )}
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
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  subtext: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginBottom: Spacing.lg,
  },
  statesContainer: {
    gap: Spacing.sm,
  },
  stateRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.background.default,
  },
  stateRowSelected: {
    backgroundColor: Colors.dewSage,
  },
  dot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.md,
  },
  stateTextContainer: {
    flex: 1,
  },
  stateLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  stateDescription: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 1,
  },
  // Collapsed state
  collapsedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
  },
  collapsedLeft: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  collapsedLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  changeButton: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  // Captured confirmation
  capturedContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  capturedText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  // Loading
  loadingOverlay: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: 'rgba(255,255,255,0.9)',
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Layout.borderRadius.lg,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
});
```

- [ ] **Step 2: Export from the dashboard barrel**

Add this line to `mobile/src/components/dashboard/index.ts`:

```typescript
export { BrainStateCheckin } from './BrainStateCheckin';
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/dashboard/BrainStateCheckin.tsx mobile/src/components/dashboard/index.ts
git commit -m "feat: add BrainStateCheckin component for Dashboard V2"
```

---

### Task 6: TodaysProtocolCard Component

**Files:**
- Create: `mobile/src/components/dashboard/TodaysProtocolCard.tsx`
- Modify: `mobile/src/components/dashboard/index.ts`

- [ ] **Step 1: Create the TodaysProtocolCard component**

Create `mobile/src/components/dashboard/TodaysProtocolCard.tsx`:

```typescript
/**
 * TodaysProtocolCard
 * Shows the recommended protocol after brain state check-in.
 * Expands inline to show instructions. "Done" marks protocol completed.
 */

import React, { useState } from 'react';
import { View, StyleSheet, TouchableOpacity, Text } from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { BrainStateProtocol } from '../../constants/brainStateProtocols';

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

  const handleBegin = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setShowInstructions(true);
  };

  const handleDone = () => {
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);
    onMarkCompleted();
    setShowInstructions(false);
  };

  const categoryIcon = {
    breathwork: 'weather-windy',
    reflection: 'head-lightbulb-outline',
    reset: 'refresh',
  }[protocol.category] as 'weather-windy' | 'head-lightbulb-outline' | 'refresh';

  return (
    <View style={styles.container}>
      {/* Header row */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Icon name={categoryIcon} size={20} color={Colors.evergreenTeal} />
          <Text style={styles.protocolName}>{protocol.name}</Text>
        </View>
        <View style={styles.durationBadge}>
          <Text style={styles.durationText}>{protocol.duration}</Text>
        </View>
      </View>

      {/* Description */}
      <Text style={styles.description}>{protocol.description}</Text>

      {/* Completed state */}
      {completed && !showInstructions && (
        <View style={styles.completedRow}>
          <Icon name="check-circle" size={16} color={Colors.success} />
          <Text style={styles.completedText}>Completed</Text>
        </View>
      )}

      {/* CTA or Instructions */}
      {!completed && !showInstructions && (
        <TouchableOpacity style={styles.ctaButton} onPress={handleBegin} activeOpacity={0.7}>
          <Text style={styles.ctaText}>Begin when ready</Text>
        </TouchableOpacity>
      )}

      {showInstructions && (
        <View style={styles.instructionsContainer}>
          {protocol.instructions.map((step, index) => (
            <View key={index} style={styles.instructionRow}>
              <Text style={styles.instructionNumber}>{index + 1}.</Text>
              <Text style={styles.instructionText}>{step}</Text>
            </View>
          ))}
          <TouchableOpacity style={styles.doneButton} onPress={handleDone} activeOpacity={0.7}>
            <Text style={styles.doneButtonText}>Done</Text>
          </TouchableOpacity>
        </View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    borderLeftWidth: 3,
    borderLeftColor: Colors.evergreenTeal,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    flex: 1,
  },
  protocolName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textPrimary,
  },
  durationBadge: {
    backgroundColor: Colors.dewSage,
    borderRadius: Layout.borderRadius.pill,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
  },
  durationText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  description: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: 20,
    marginBottom: Spacing.base,
  },
  ctaButton: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
  },
  ctaText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textOnPrimary,
  },
  instructionsContainer: {
    marginTop: Spacing.sm,
  },
  instructionRow: {
    flexDirection: 'row',
    marginBottom: Spacing.md,
  },
  instructionNumber: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    width: 24,
  },
  instructionText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    lineHeight: 20,
    flex: 1,
  },
  doneButton: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.md,
    paddingVertical: Spacing.md,
    alignItems: 'center',
    marginTop: Spacing.sm,
  },
  doneButtonText: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textOnPrimary,
  },
  completedRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  completedText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
});
```

- [ ] **Step 2: Export from the dashboard barrel**

Add this line to `mobile/src/components/dashboard/index.ts`:

```typescript
export { TodaysProtocolCard } from './TodaysProtocolCard';
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/components/dashboard/TodaysProtocolCard.tsx mobile/src/components/dashboard/index.ts
git commit -m "feat: add TodaysProtocolCard component for Dashboard V2"
```

---

### Task 7: Update useDashboard Hook

**Files:**
- Modify: `mobile/src/hooks/useDashboard.ts`

- [ ] **Step 1: Add imports for V2**

At the top of `mobile/src/hooks/useDashboard.ts`, add these imports after the existing imports:

```typescript
import { DASHBOARD_V2 } from '../constants/dashboardConfig';
import { getProtocolForState } from '../constants/brainStateProtocols';
import {
  getTodayBrainStateCheckIn,
  saveBrainStateCheckIn,
  markProtocolCompleted,
} from '../services/firebase';
import { BrainState, BrainStateCheckIn as BrainStateCheckInType } from '../types';
```

- [ ] **Step 2: Add V2 state variables**

Inside the `useDashboard` function, after the existing state declarations (after line 86 — the `showWelcomeBack` state), add:

```typescript
  // Dashboard V2: Brain State Check-In
  const [brainStateCheckIn, setBrainStateCheckIn] = useState<BrainStateCheckInType | null>(null);
  const [brainStateCheckInLoading, setBrainStateCheckInLoading] = useState(false);
```

- [ ] **Step 3: Update the greeting logic**

Replace the existing greeting `useMemo` (lines 107-112):

```typescript
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    const firstName = user?.displayName?.split(' ')[0];
    return firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;
  }, [user?.displayName]);
```

With:

```typescript
  const greeting = useMemo(() => {
    const hour = new Date().getHours();
    let timeGreeting: string;
    if (DASHBOARD_V2) {
      if (hour >= 5 && hour < 12) timeGreeting = 'Good morning';
      else if (hour >= 12 && hour < 17) timeGreeting = 'Good afternoon';
      else if (hour >= 17 && hour < 22) timeGreeting = 'Good evening';
      else timeGreeting = 'Hey';
    } else {
      timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    }
    const firstName = user?.displayName?.split(' ')[0];
    return firstName ? `${timeGreeting}, ${firstName}` : timeGreeting;
  }, [user?.displayName]);
```

- [ ] **Step 4: Gate the welcome-back display logic**

In the `useEffect` that checks `lastActiveAt` (around line 136-156), change the line:

```typescript
          if (daysSince >= 3) {
            setShowWelcomeBack(true);
          }
```

To:

```typescript
          if (daysSince >= 3 && !DASHBOARD_V2) {
            setShowWelcomeBack(true);
          }
```

- [ ] **Step 5: Gate V1-only data fetching in the wellness data useEffect**

Replace the existing wellness data `useEffect` (lines 203-232):

```typescript
  useEffect(() => {
    const loadWellnessData = async () => {
      if (!user?.uid) return;
      setWellnessScoreLoading(true);
      try {
        const [existingCheckIn, todayFourThreeTwoOne] = await Promise.all([
          getMorningCheckIn(user.uid),
          getTodayEntry(user.uid),
        ]);
        setMorningCheckIn(existingCheckIn);
        setFourThreeTwoOneEntry(todayFourThreeTwoOne);

        const hour = new Date().getHours();
        if (!existingCheckIn && hour < 12) setShowMorningCheckIn(true);

        const existingScore = await getTodayWellnessScore(user.uid);
        if (existingScore) {
          setWellnessScore(existingScore);
        } else {
          const newScore = await calculateWellnessScore(user.uid);
          setWellnessScore(newScore);
        }
      } catch (error) {
        logger.error('Error loading wellness data:', error);
      } finally {
        setWellnessScoreLoading(false);
      }
    };
    loadWellnessData();
  }, [user?.uid, today]);
```

With:

```typescript
  // V2: Load brain state check-in
  useEffect(() => {
    if (!DASHBOARD_V2 || !user?.uid) return;
    const loadBrainStateCheckIn = async () => {
      setBrainStateCheckInLoading(true);
      try {
        const existing = await getTodayBrainStateCheckIn(user.uid);
        setBrainStateCheckIn(existing);
      } catch (error) {
        logger.error('Error loading brain state check-in:', error);
      } finally {
        setBrainStateCheckInLoading(false);
      }
    };
    loadBrainStateCheckIn();
  }, [user?.uid, today]);

  // V1: Load wellness score, morning check-in, and 4-3-2-1 entry
  useEffect(() => {
    if (DASHBOARD_V2) return;
    const loadWellnessData = async () => {
      if (!user?.uid) return;
      setWellnessScoreLoading(true);
      try {
        const [existingCheckIn, todayFourThreeTwoOne] = await Promise.all([
          getMorningCheckIn(user.uid),
          getTodayEntry(user.uid),
        ]);
        setMorningCheckIn(existingCheckIn);
        setFourThreeTwoOneEntry(todayFourThreeTwoOne);

        const hour = new Date().getHours();
        if (!existingCheckIn && hour < 12) setShowMorningCheckIn(true);

        const existingScore = await getTodayWellnessScore(user.uid);
        if (existingScore) {
          setWellnessScore(existingScore);
        } else {
          const newScore = await calculateWellnessScore(user.uid);
          setWellnessScore(newScore);
        }
      } catch (error) {
        logger.error('Error loading wellness data:', error);
      } finally {
        setWellnessScoreLoading(false);
      }
    };
    loadWellnessData();
  }, [user?.uid, today]);
```

- [ ] **Step 6: Gate the daily plan useEffect**

In the daily plan loading `useEffect` (lines 159-169), add at the top of the effect:

```typescript
    if (DASHBOARD_V2) return;
```

So the full effect becomes:

```typescript
  useEffect(() => {
    if (DASHBOARD_V2) return;
    const loadDailyPlan = async () => {
      try {
        const storedPlan = await SecureStore.getItemAsync(`dailyPlan_${today}`);
        if (storedPlan) setDailyPlan(storedPlan);
      } catch (error) {
        logger.error('Error loading daily plan:', error);
      }
    };
    loadDailyPlan();
  }, [today]);
```

- [ ] **Step 7: Gate the wellness score preference useEffect**

In the wellness score preference `useEffect` (lines 172-184), add at the top of the effect:

```typescript
    if (DASHBOARD_V2) return;
```

- [ ] **Step 8: Add brain state check-in handler and protocol derivation**

After the existing `handleMorningCheckInComplete` callback (around line 364), add:

```typescript
  const handleBrainStateCheckIn = useCallback(async (state: BrainState) => {
    if (!user?.uid) return;
    setBrainStateCheckInLoading(true);
    try {
      const checkIn = await saveBrainStateCheckIn(user.uid, state);
      setBrainStateCheckIn(checkIn);
      trackEngagement('morningCheckInsCompleted').then(() => evaluateTriggers()).catch(logger.error);
    } catch (error) {
      logger.error('Error saving brain state check-in:', error);
    } finally {
      setBrainStateCheckInLoading(false);
    }
  }, [user, trackEngagement, evaluateTriggers]);

  const handleMarkProtocolCompleted = useCallback(async () => {
    if (!user?.uid) return;
    try {
      await markProtocolCompleted(user.uid);
      setBrainStateCheckIn((prev) =>
        prev ? { ...prev, protocolCompleted: true } : null
      );
    } catch (error) {
      logger.error('Error marking protocol completed:', error);
    }
  }, [user]);

  const todaysProtocol = useMemo(() => {
    if (!brainStateCheckIn) return null;
    return getProtocolForState(brainStateCheckIn.brainState);
  }, [brainStateCheckIn]);
```

- [ ] **Step 9: Add V2 values to the return object**

Add these to the return object (after the `handleRefresh` line):

```typescript
    // Dashboard V2
    brainStateCheckIn,
    brainStateCheckInLoading,
    handleBrainStateCheckIn,
    handleMarkProtocolCompleted,
    todaysProtocol,
```

- [ ] **Step 10: Commit**

```bash
git add mobile/src/hooks/useDashboard.ts
git commit -m "feat: add V2-gated data fetching and brain state handlers to useDashboard"
```

---

### Task 8: Update DashboardScreen

**Files:**
- Modify: `mobile/src/screens/DashboardScreen.tsx`

- [ ] **Step 1: Add V2 imports**

Add these imports to the top of `mobile/src/screens/DashboardScreen.tsx`:

After the existing dashboard component imports, add:

```typescript
import { BrainStateCheckin } from '../components/dashboard/BrainStateCheckin';
import { TodaysProtocolCard } from '../components/dashboard/TodaysProtocolCard';
import { DASHBOARD_V2 } from '../constants/dashboardConfig';
```

- [ ] **Step 2: Destructure V2 values from the hook**

In the `useDashboard()` destructuring, add the new values:

```typescript
    brainStateCheckIn,
    brainStateCheckInLoading,
    handleBrainStateCheckIn,
    handleMarkProtocolCompleted,
    todaysProtocol,
```

- [ ] **Step 3: Replace the ScrollView content with V2 conditional rendering**

Replace the entire `<ScrollView>` content (everything between the opening `<ScrollView ...>` and closing `</ScrollView>` tags, lines 92-219) with:

```tsx
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerTop}>
            <View style={styles.headerTextContainer}>
              <Text style={styles.greeting}>{greeting}</Text>
              <Text style={styles.dateText}>{formattedDate}</Text>
            </View>
            <TouchableOpacity
              onPress={() => navigation.navigate('ProfileStack' as never, { screen: 'Settings' } as never)}
              style={styles.settingsButton}
              accessibilityLabel="Settings"
            >
              <Icon name="cog-outline" size={28} color={Colors.evergreenTeal} />
            </TouchableOpacity>
          </View>
        </View>

        {DASHBOARD_V2 ? (
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

            {/* Position 1: Brain State Check-In */}
            <BrainStateCheckin
              currentCheckIn={brainStateCheckIn}
              onSelect={handleBrainStateCheckIn}
              loading={brainStateCheckInLoading}
            />

            {/* Position 2: Today's Protocol (only after check-in) */}
            {brainStateCheckIn && todaysProtocol && (
              <TodaysProtocolCard
                protocol={todaysProtocol}
                completed={brainStateCheckIn.protocolCompleted}
                onMarkCompleted={handleMarkProtocolCompleted}
              />
            )}

            {/* Position 3: Weekly Habits Tracker */}
            <WeeklyHabitsCard
              habits={habits}
              visibleDays={visibleDays}
              today={today}
              allCompletions={allCompletions}
              weeklyCompletions={weeklyCompletions}
              processingHabits={processingHabits}
              onHabitToggle={handleHabitToggle}
              onNavigateToHabits={() => navigation.navigate('Track' as never, { tab: 'habits' } as never)}
              onAddHabit={() => navigation.navigate('Track' as never, { tab: 'habits', openCreateModal: true } as never)}
            />

            {/* Position 4: Week Insight (below fold, conditional) */}
            {weekInsight && !weekInsightDismissed && (
              <WeekInsightCard
                headline={weekInsight.headline}
                supporting={weekInsight.supporting}
                onPressFullStory={() => navigation.navigate('Insights' as never)}
                onDismiss={() => setWeekInsightDismissed(true)}
              />
            )}

            {/* Position 5: Brain Health Education (below fold) */}
            <BrainHealthEducationCard />
          </>
        ) : (
          <>
            {/* ========== V1 DASHBOARD LAYOUT ========== */}

            {/* Welcome Back Card (returning users, 3+ days away) */}
            {showWelcomeBack && (
              <WelcomeBackCard
                onDismiss={() => {
                  setShowWelcomeBack(false);
                }}
              />
            )}

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

            {/* Weekly Habits Tracker */}
            <WeeklyHabitsCard
              habits={habits}
              visibleDays={visibleDays}
              today={today}
              allCompletions={allCompletions}
              weeklyCompletions={weeklyCompletions}
              processingHabits={processingHabits}
              onHabitToggle={handleHabitToggle}
              onNavigateToHabits={() => navigation.navigate('Track' as never, { tab: 'habits' } as never)}
              onAddHabit={() => navigation.navigate('Track' as never, { tab: 'habits', openCreateModal: true } as never)}
            />

            {/* Next Best Action Card */}
            <NextBestActionCard
              wellnessScore={wellnessScore}
              habits={habits}
              tasks={tasks}
              completedTodayHabits={completedToday}
              fourThreeTwoOne={fourThreeTwoOneEntry}
              lastJournalDate={lastJournalDate}
              hasMorningCheckIn={!!morningCheckIn}
              hasDailyPlan={!!dailyPlan}
              onGeneratePlan={handleGenerateDailyPlan}
              onMorningCheckIn={() => setShowMorningCheckIn(true)}
            />

            {/* Quick Actions Row */}
            <QuickActionsRow
              onJournalPress={() => navigation.navigate('Journal' as never)}
              onReflectPress={() => navigation.navigate('Focus' as never)}
            />

            {/* --- Below fold --- */}

            {/* 4-3-2-1 Daily Practice */}
            <FourThreeTwoOneCard onChange={handleFourThreeTwoOneChange} defaultCollapsed={true} />

            {/* Week Insight Card */}
            {weekInsight && !weekInsightDismissed && (
              <WeekInsightCard
                headline={weekInsight.headline}
                supporting={weekInsight.supporting}
                onPressFullStory={() => navigation.navigate('Insights' as never)}
                onDismiss={() => setWeekInsightDismissed(true)}
              />
            )}

            {/* Brain Health Education Card */}
            <BrainHealthEducationCard />

            {/* AI Daily Plan Card */}
            <AIDailyPlanCard
              dailyPlan={dailyPlan}
              generatingPlan={generatingPlan}
              isPlanExpanded={isPlanExpanded}
              onToggleExpand={() => setIsPlanExpanded(!isPlanExpanded)}
              onGenerate={handleGenerateDailyPlan}
            />

            {/* Brain Health Insight Strip */}
            <BrainHealthInsightStrip compact />

            {/* Wellness Score Opt-In */}
            {wellnessScoreEnabled === false && showOptInPrompt && (
              <WellnessScoreOptInCard
                onEnable={handleWellnessScoreEnable}
                onDismiss={() => setShowOptInPrompt(false)}
              />
            )}

            {/* Wellness Score Card */}
            {wellnessScoreEnabled && (
              <WellnessScoreCard
                score={wellnessScore}
                loading={wellnessScoreLoading}
                onPress={() => setShowScoreBreakdown(true)}
                onRefresh={handleRefreshWellnessScore}
              />
            )}

            {/* Morning Check-In */}
            {showMorningCheckIn && !morningCheckIn && (
              <MorningCheckIn
                onComplete={handleMorningCheckInComplete}
                onDismiss={() => setShowMorningCheckIn(false)}
                loading={morningCheckInLoading}
              />
            )}
          </>
        )}
```

- [ ] **Step 4: Gate the WellnessScoreBreakdown modal**

After the closing `</ScrollView>`, wrap the `WellnessScoreBreakdown` modal in a V1 check:

Replace:

```tsx
      {/* Wellness Score Breakdown Modal */}
      <WellnessScoreBreakdown
        visible={showScoreBreakdown}
        onClose={() => setShowScoreBreakdown(false)}
        score={wellnessScore}
        onNavigate={(route) => navigation.navigate(route as never)}
      />
```

With:

```tsx
      {/* Wellness Score Breakdown Modal (V1 only) */}
      {!DASHBOARD_V2 && (
        <WellnessScoreBreakdown
          visible={showScoreBreakdown}
          onClose={() => setShowScoreBreakdown(false)}
          score={wellnessScore}
          onNavigate={(route) => navigation.navigate(route as never)}
        />
      )}
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/DashboardScreen.tsx
git commit -m "feat: add V2 conditional rendering to DashboardScreen"
```

---

### Task 9: Smoke Test and Verify

**Files:** None (verification only)

- [ ] **Step 1: Run TypeScript compiler to check for type errors**

```bash
cd mobile && npx tsc --noEmit
```

Expected: No type errors related to the new files. Pre-existing errors in other files are acceptable.

- [ ] **Step 2: Verify the app starts without crashing**

```bash
cd mobile && npx expo start
```

Open the app on a device or emulator. Verify:
- Dashboard loads without crash
- Greeting shows correct time-of-day text with no absence reference
- BrainStateCheckin card is visible with 5 tappable rows
- Tapping a state shows "Captured." then collapses to summary
- TodaysProtocolCard appears after check-in with correct protocol
- "Begin when ready" expands instructions inline
- "Done" collapses instructions and shows "Completed"
- WeeklyHabitsCard renders normally below the protocol card
- WeekInsightCard and BrainHealthEducationCard render below fold
- None of the hidden V1 cards are visible
- Pull-to-refresh works

- [ ] **Step 3: Verify V1 fallback works**

Temporarily change `DASHBOARD_V2` to `false` in `mobile/src/constants/dashboardConfig.ts`. Reload the app. Verify the full original dashboard renders correctly with all V1 cards. Change it back to `true`.

- [ ] **Step 4: Final commit with any fixes**

If any fixes were needed during testing:

```bash
git add -A
git commit -m "fix: address issues found during Dashboard V2 smoke test"
```

Set `DASHBOARD_V2` back to `true` if changed.

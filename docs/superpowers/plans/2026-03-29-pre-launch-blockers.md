# Pre-Launch Blockers Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the morning check-in (mood/energy sliders) and update streak-related dot grid styling to align with Vara's "progress without pressure" philosophy before April 15 launch.

**Architecture:** Task 1 removes all rendering, state management, and recommendation logic for the morning check-in across dashboard, hooks, next-action service, feature discovery, weekly correlations, and AI coach context. Task 2 updates the 30-day dot grid to match the spec (8px dots, Silver Sage 30% opacity for missed days, round dots) and verifies no streak numbers or celebrations are visible.

**Tech Stack:** React Native, Firebase Firestore, AsyncStorage

---

## File Map

### Task 1 — Remove Morning Check-In
| Action | File | What Changes |
|--------|------|-------------|
| Modify | `mobile/src/screens/DashboardScreen.tsx` | Remove MorningCheckIn import and V1 rendering block |
| Modify | `mobile/src/hooks/useDashboard.ts` | Remove morning check-in state, load logic, handler, exports |
| Modify | `mobile/src/services/nextAction.service.ts` | Remove morning_checkin recommendation |
| Modify | `mobile/src/constants/featureDiscovery.ts` | Replace morningCheckInsCompleted with lower barriers |
| Modify | `mobile/src/hooks/useWeeklyCorrelations.ts` | Remove morning check-in fetch, use brain state data |
| Modify | `mobile/src/components/ai/AIChatModal.tsx` | Remove morning check-in query from coach context |
| Modify | `mobile/src/services/firebase/wellnessScore.service.ts` | Remove morningCheckIn from wellness score fetch |

### Task 2 — Update Dot Grid Styling
| Action | File | What Changes |
|--------|------|-------------|
| Modify | `mobile/src/components/habits/ConsistencyRhythm.tsx` | Update dot size to 8px, round dots, Silver Sage 30% for missed |

---

### Task 1: Remove Morning Check-In from DashboardScreen

**Files:**
- Modify: `mobile/src/screens/DashboardScreen.tsx`

- [ ] **Step 1: Remove MorningCheckIn import**

Find and remove `MorningCheckIn` from the imports (line 18):

Change:
```typescript
  WellnessScoreCard,
  WellnessScoreBreakdown,
  MorningCheckIn,
  WellnessScoreOptInCard,
```

To:
```typescript
  WellnessScoreCard,
  WellnessScoreBreakdown,
  WellnessScoreOptInCard,
```

- [ ] **Step 2: Remove morning check-in destructuring from useDashboard**

Find the destructuring of `useDashboard()` (around line 68). Remove these five lines:
```typescript
    morningCheckIn,
    morningCheckInLoading,
    showMorningCheckIn,
    setShowMorningCheckIn,
    handleMorningCheckInComplete,
```

- [ ] **Step 3: Remove morningCheckIn references in V1 dashboard rendering**

Find the NextBestActionCard rendering (around line 228-234). Remove the `hasMorningCheckIn` and `onMorningCheckIn` props:

Change:
```typescript
              hasMorningCheckIn={!!morningCheckIn}
              hasDailyPlan={!!dailyPlan}
              onGeneratePlan={handleGenerateDailyPlan}
              onMorningCheckIn={() => setShowMorningCheckIn(true)}
```

To:
```typescript
              hasMorningCheckIn={true}
              hasDailyPlan={!!dailyPlan}
              onGeneratePlan={handleGenerateDailyPlan}
              onMorningCheckIn={() => {}}
```

Note: We pass `true` and a no-op to avoid breaking the component's prop types. The V1 dashboard is disabled anyway.

- [ ] **Step 4: Remove MorningCheckIn rendering block**

Find and remove the entire V1 morning check-in rendering block (around lines 290-297):

```typescript
            {/* Morning Check-In */}
            {showMorningCheckIn && !morningCheckIn && (
              <MorningCheckIn
                onComplete={handleMorningCheckInComplete}
                onDismiss={() => setShowMorningCheckIn(false)}
                loading={morningCheckInLoading}
              />
            )}
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/screens/DashboardScreen.tsx
git commit -m "refactor: remove MorningCheckIn rendering from dashboard"
```

---

### Task 2: Remove Morning Check-In from useDashboard Hook

**Files:**
- Modify: `mobile/src/hooks/useDashboard.ts`

- [ ] **Step 1: Remove morning check-in state variables**

Find and remove these three state declarations (around lines 90-92):

```typescript
  const [morningCheckIn, setMorningCheckIn] = useState<MorningCheckInType | null>(null);
  const [morningCheckInLoading, setMorningCheckInLoading] = useState(false);
  const [showMorningCheckIn, setShowMorningCheckIn] = useState(false);
```

- [ ] **Step 2: Remove morning check-in load logic**

Find the section that loads existing check-in and auto-shows form (around lines 256-287 — look for `getMorningCheckIn`). Remove the morning check-in fetch and auto-show logic. This is inside a `loadDashboardData` or similar function. Remove:

```typescript
    const existingCheckIn = await getMorningCheckIn(user.uid);
    setMorningCheckIn(existingCheckIn);
    // Auto-show if not completed and before noon
    const hour = new Date().getHours();
    if (!existingCheckIn && hour < 12) setShowMorningCheckIn(true);
```

Also remove the `getMorningCheckIn` and `saveMorningCheckIn` imports from the firebase services import at the top of the file.

- [ ] **Step 3: Remove handleMorningCheckInComplete handler**

Find and remove the entire `handleMorningCheckInComplete` callback (around lines 404-419).

- [ ] **Step 4: Remove from return object**

Find the return object of `useDashboard()` and remove:

```typescript
    morningCheckIn,
    morningCheckInLoading,
    showMorningCheckIn,
    setShowMorningCheckIn,
    handleMorningCheckInComplete,
```

Also remove `MorningCheckIn as MorningCheckInType` from the type import at the top of the file if it's only used for morning check-in state.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/hooks/useDashboard.ts
git commit -m "refactor: remove morning check-in state and handlers from useDashboard"
```

---

### Task 3: Remove Morning Check-In from Next Action Service

**Files:**
- Modify: `mobile/src/services/nextAction.service.ts`

- [ ] **Step 1: Remove the morning_checkin recommendation block**

Find the morning check-in recommendation (around lines 353-368):

```typescript
  // Morning check-in if not done
  if (!hasMorningCheckIn && (timePeriod === 'morning' || timePeriod === 'early_morning' || timePeriod === 'midday')) {
    return {
      type: 'morning_checkin',
      ...
    };
  }
```

Remove the entire if-block (all lines including the return statement inside it).

- [ ] **Step 2: Remove hasMorningCheckIn from RecommendationContext interface**

Find the `RecommendationContext` interface (around line 63) and remove:

```typescript
  hasMorningCheckIn: boolean;
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/services/nextAction.service.ts
git commit -m "refactor: remove morning check-in from next action recommendations"
```

---

### Task 4: Update Feature Discovery Unlock Criteria

**Files:**
- Modify: `mobile/src/constants/featureDiscovery.ts`

- [ ] **Step 1: Replace morningCheckInsCompleted references**

Find and update these unlock triggers:

**Journal unlock (line 122):** Change from:
```typescript
    evaluate: (metrics) =>
      metrics.habitsCompleted >= 1 || metrics.morningCheckInsCompleted >= 1,
```
To:
```typescript
    evaluate: (metrics) =>
      metrics.habitsCompleted >= 1 || metrics.sessionCount >= 1,
```

**Brain Dashboard unlock (line 148):** Change from:
```typescript
    evaluate: (metrics) =>
      metrics.morningCheckInsCompleted >= 3,
```
To:
```typescript
    evaluate: (metrics) =>
      metrics.sessionCount >= 3 || metrics.habitsCompleted >= 3,
```

**Movement unlock (line 178):** Change from:
```typescript
      metrics.morningCheckInsCompleted >= 3,
```
To:
```typescript
      metrics.sessionCount >= 3,
```

**Sleep unlock (line 189):** Change from:
```typescript
      metrics.morningCheckInsCompleted >= 3,
```
To:
```typescript
      metrics.sessionCount >= 3,
```

Also update the description strings to match (e.g., "Complete a few morning check-ins" → "Use the app a few times").

- [ ] **Step 2: Commit**

```bash
git add mobile/src/constants/featureDiscovery.ts
git commit -m "refactor: replace morning check-in unlock criteria with session-based triggers"
```

---

### Task 5: Update Weekly Correlations to Use Brain State

**Files:**
- Modify: `mobile/src/hooks/useWeeklyCorrelations.ts`

- [ ] **Step 1: Replace morning check-in fetch with brain state fetch**

Find `fetchMorningCheckIns` function (around lines 131-151). Replace it with a function that fetches brain state check-ins instead:

```typescript
async function fetchBrainStateCheckIns(
  uid: string,
  dates: string[],
): Promise<Map<string, { brainState: string }>> {
  const map = new Map();
  const fetches = dates.map(async (date) => {
    try {
      if (!db) return;
      const docRef = doc(db, 'brainStateCheckIns', `${uid}_${date}`);
      const snap = await getDoc(docRef);
      if (snap.exists()) {
        const data = snap.data();
        map.set(date, { brainState: data.brainState });
      }
    } catch {
      // Skip this date
    }
  });
  await Promise.all(fetches);
  return map;
}
```

- [ ] **Step 2: Update the data loading to use brain state**

In the `load()` function (around line 75), change:
```typescript
        const [morningCheckIns, brainMetrics, ...] = await Promise.all([
          fetchMorningCheckIns(uid, dates),
```
To:
```typescript
        const [brainStateCheckIns, brainMetrics, ...] = await Promise.all([
          fetchBrainStateCheckIns(uid, dates),
```

- [ ] **Step 3: Update DailyDataPoint construction**

In the `dates.map()` where daily data points are built (around lines 84-101), change:
```typescript
          const checkIn = morningCheckIns.get(date);
```
To:
```typescript
          const brainCheck = brainStateCheckIns.get(date);
```

And update the mood/energy mapping. Brain state is qualitative ('wired', 'foggy', 'okay', 'clear', 'energized'), so map it to numeric for correlations:

```typescript
          // Map brain state to approximate mood/energy values for correlation
          const brainStateToMood: Record<string, number> = {
            wired: 3, foggy: 2, okay: 3, clear: 4, energized: 5,
          };
          const brainStateToEnergy: Record<string, number> = {
            wired: 4, foggy: 2, okay: 3, clear: 4, energized: 5,
          };
          const bState = brainCheck?.brainState;
```

Then in the return object:
```typescript
          return {
            date,
            sleepQuality: brain?.sleepQuality ?? null,
            mood: bState ? brainStateToMood[bState] ?? null : null,
            energy: bState ? brainStateToEnergy[bState] ?? null : null,
            stress: brain?.stressLevel ?? null,
            habitCompletionRate: habitRate ?? null,
            focusMinutes: focus > 0 ? focus : null,
            journaled,
          };
```

- [ ] **Step 4: Remove the old fetchMorningCheckIns function**

Delete the `fetchMorningCheckIns` function entirely.

- [ ] **Step 5: Commit**

```bash
git add mobile/src/hooks/useWeeklyCorrelations.ts
git commit -m "refactor: replace morning check-in with brain state data in weekly correlations"
```

---

### Task 6: Update AI Coach Context

**Files:**
- Modify: `mobile/src/components/ai/AIChatModal.tsx`

- [ ] **Step 1: Remove morning check-in query from buildCoachContext**

In the `buildCoachContext` function, find the Promise.all array. Remove the `morningCheckInResult` entry:

```typescript
      morningCheckInResult,
```
and its corresponding query:
```typescript
      getDoc(doc(db, 'morningCheckIns', `${uid}_${today}`)).catch(() => null),
```

- [ ] **Step 2: Remove morningCheckInResult parsing**

Remove:
```typescript
    const checkIn = morningCheckInResult?.exists?.() ? morningCheckInResult.data() : null;
```

- [ ] **Step 3: Replace todayCheckIn in returned context**

Change:
```typescript
      todayCheckIn: checkIn
        ? `mood ${checkIn.mood}/5, energy ${checkIn.energyLevel}/5`
        : 'not checked in today',
```

To (use brain state which is already parsed):
```typescript
      todayCheckIn: brainState || 'not checked in today',
```

The `brainState` field already exists in the return object. Now `todayCheckIn` mirrors it. The backend context template already has both `brainState` and `todayCheckIn` fields — having them both show brain state is fine since they serve different prompt lines (one is labeled "Brain state:", the other "Today's check-in:").

- [ ] **Step 4: Commit**

```bash
git add mobile/src/components/ai/AIChatModal.tsx
git commit -m "refactor: replace morning check-in with brain state in AI coach context"
```

---

### Task 7: Update Dot Grid Styling to Match Spec

**Files:**
- Modify: `mobile/src/components/habits/ConsistencyRhythm.tsx`

- [ ] **Step 1: Update full-mode dot styles**

Find the styles section (around line 282-296). Update:

```typescript
  dayDot: {
    width: 12,
    height: 12,
    borderRadius: 2,
  },
  dayDotCompleted: {
    backgroundColor: Colors.evergreenTeal,
  },
  dayDotMissed: {
    backgroundColor: Colors.borderLight,
  },
  dayDotToday: {
    borderWidth: 1.5,
    borderColor: Colors.evergreenTeal,
  },
```

To:
```typescript
  dayDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
  },
  dayDotCompleted: {
    backgroundColor: Colors.evergreenTeal,
  },
  dayDotMissed: {
    backgroundColor: 'rgba(184, 205, 186, 0.3)',
  },
  dayDotToday: {
    borderWidth: 1,
    borderColor: Colors.silverSage,
    backgroundColor: 'transparent',
  },
```

Changes:
- Dot size: 12px → 8px
- Border radius: 2 → 4 (fully round)
- Missed day color: `Colors.borderLight` → Silver Sage (#B8CDBA) at 30% opacity
- Today: outline only with Silver Sage border, transparent background

- [ ] **Step 2: Update gap in weekRow**

Change:
```typescript
  weekRow: {
    flexDirection: 'row',
    justifyContent: 'flex-start',
    gap: 4,
    marginBottom: 4,
  },
```

The gap is already 4px (matching `spacing.xs`). Leave as-is.

- [ ] **Step 3: Update compact-mode dot styles for consistency**

```typescript
  compactDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
  },
  compactDotCompleted: {
    backgroundColor: Colors.evergreenTeal,
  },
  compactDotMissed: {
    backgroundColor: 'rgba(184, 205, 186, 0.3)',
  },
  compactDotToday: {
    borderWidth: 1,
    borderColor: Colors.silverSage,
    backgroundColor: 'transparent',
  },
```

Compact dots stay at 6px (smaller for inline display). Update missed color and today styling to match full mode.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/components/habits/ConsistencyRhythm.tsx
git commit -m "fix: update dot grid to spec — 8px round dots, Silver Sage 30% for missed days"
```

---

### Task 8: Verification

- [ ] **Step 1: Verify no morning check-in references in V2 dashboard path**

```bash
grep -r "morningCheckIn\|MorningCheckIn\|morning_checkin" mobile/src/screens/DashboardScreen.tsx
```
Expected: No matches (or only in V1 disabled code with safe fallbacks).

- [ ] **Step 2: Verify no streak counter on habit cards**

```bash
grep -r "streak" mobile/src/components/habits/HabitListItem.tsx
```
Expected: No matches.

- [ ] **Step 3: Verify dot grid styling**

Check that `ConsistencyRhythm.tsx` has:
- `dayDot` width/height: 8, borderRadius: 4
- `dayDotMissed`: rgba(184, 205, 186, 0.3)
- `dayDotToday`: borderColor: Colors.silverSage, transparent background

- [ ] **Step 4: Verify brain state in weekly correlations**

```bash
grep -r "morningCheckIn\|fetchMorningCheckIns" mobile/src/hooks/useWeeklyCorrelations.ts
```
Expected: No matches.

- [ ] **Step 5: Verify AI coach context uses brain state**

```bash
grep -r "morningCheckIn" mobile/src/components/ai/AIChatModal.tsx
```
Expected: No matches.

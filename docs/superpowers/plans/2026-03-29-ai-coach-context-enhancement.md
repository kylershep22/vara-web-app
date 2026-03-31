# AI Coach Context Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Enrich the AI coach's context injection with today's state, weekly patterns, habit identity, time-of-day awareness, and session continuity so responses are specific and relevant rather than generic.

**Architecture:** A new `buildCoachContext()` function in `AIChatModal.tsx` replaces the old `fetchBrainMetrics()`. It queries Firestore for today's check-ins, recent journal tags, weekly habit completion, and focus sessions, then assembles a flat context string matching the recommended structure. The backend system prompt's context template is updated to consume these new fields. Last coach session timestamp is tracked in AsyncStorage.

**Tech Stack:** React Native, Firebase Firestore, AsyncStorage, Express.js backend

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Modify | `mobile/src/components/ai/AIChatModal.tsx` | Replace `fetchBrainMetrics()` with `buildCoachContext()`, track last session |
| Modify | `mobile/src/navigation/AppNavigator.tsx` | Update FAB context prop (remove goals/tasks, pass habits) |
| Modify | `backend/server.js` | Update context template in system prompt, add scaling phase definitions |

---

### Task 1: Build the Enhanced Context Function in AIChatModal

**Files:**
- Modify: `mobile/src/components/ai/AIChatModal.tsx:29-31, 236-311, 339-351`

- [ ] **Step 1: Add new imports**

At the top of the file (after the existing Firebase imports on line 30), add `doc, getDoc` to the existing Firestore import and add AsyncStorage:

```typescript
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
```

Add after the firebase import:

```typescript
import AsyncStorage from '@react-native-async-storage/async-storage';
```

- [ ] **Step 2: Add the LAST_COACH_SESSION_KEY constant**

After the `TIMESTAMP_COLOR` and `ONLINE_GREEN` constants (around line 41), add:

```typescript
const LAST_COACH_SESSION_KEY = '@vara_last_coach_session';
```

- [ ] **Step 3: Replace `fetchBrainMetrics` with `buildCoachContext`**

Delete the entire `fetchBrainMetrics` function (lines 237-311) and replace with:

```typescript
  // Build enhanced context for AI coach
  const buildCoachContext = async (): Promise<Record<string, any>> => {
    if (!user || !db) return {};

    const uid = user.uid;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // All queries in parallel
    const [
      brainStateResult,
      morningCheckInResult,
      dailyReflectionResult,
      brainMetricsResult,
      recentJournalResult,
      focusSessionsResult,
      habitCompletionsResult,
      lastCoachSession,
    ] = await Promise.all([
      // Brain state check-in (today)
      getDoc(doc(db, 'brainStateCheckIns', `${uid}_${today}`)).catch(() => null),
      // Morning check-in (today)
      getDoc(doc(db, 'morningCheckIns', `${uid}_${today}`)).catch(() => null),
      // Daily reflection (today)
      getDoc(doc(db, 'dailyReflections', `${uid}_${today}`)).catch(() => null),
      // Brain metrics - sleep & stress (today)
      getDoc(doc(db, 'brainMetrics', `${uid}_${today}`)).catch(() => null),
      // Recent journal entries (last 7 days, limit 5)
      getDocs(query(
        collection(db, 'journalEntries'),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(5),
      )).catch(() => null),
      // Focus sessions this week
      getDocs(query(
        collection(db, 'focusSessions'),
        where('userId', '==', uid),
        orderBy('startedAt', 'desc'),
        limit(20),
      )).catch(() => null),
      // Habit completions (fetched per-habit below)
      Promise.resolve(null), // placeholder — habits come from initialContext
      // Last coach session
      AsyncStorage.getItem(LAST_COACH_SESSION_KEY).catch(() => null),
    ]);

    // Parse results
    const brainState = brainStateResult?.exists() ? brainStateResult.data()?.brainState : null;
    const checkIn = morningCheckInResult?.exists() ? morningCheckInResult.data() : null;
    const reflection = dailyReflectionResult?.exists() ? dailyReflectionResult.data()?.reflection : null;
    const brainMetrics = brainMetricsResult?.exists() ? brainMetricsResult.data() : null;

    // Journal tags from recent entries (no content — just tags and moods)
    const journalTags: string[] = [];
    const journalMoods: string[] = [];
    if (recentJournalResult) {
      recentJournalResult.docs.forEach(d => {
        const data = d.data();
        if (data.tags) journalTags.push(...data.tags);
        if (data.mood) journalMoods.push(data.mood);
      });
    }
    const uniqueTags = [...new Set(journalTags)].slice(0, 8);

    // Mood trend from recent journal moods
    const moodToNum: Record<string, number> = { great: 5, good: 4, okay: 3, low: 2, difficult: 1, bad: 1, terrible: 0 };
    let moodTrend = 'not enough data';
    if (journalMoods.length >= 3) {
      const recent = journalMoods.slice(0, 2).map(m => moodToNum[m] ?? 3);
      const older = journalMoods.slice(2, 5).map(m => moodToNum[m] ?? 3);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      if (recentAvg > olderAvg + 0.5) moodTrend = 'improving';
      else if (recentAvg < olderAvg - 0.5) moodTrend = 'declining';
      else moodTrend = 'stable';
    }

    // Focus sessions this week
    const sevenDaysAgo = Date.now() / 1000 - 7 * 86400;
    let focusCount = 0;
    let focusMinutes = 0;
    if (focusSessionsResult) {
      focusSessionsResult.docs.forEach(d => {
        const data = d.data();
        if ((data.startedAt?.seconds || 0) >= sevenDaysAgo && data.completed) {
          focusCount++;
          focusMinutes += data.duration || 0;
        }
      });
    }

    // Days active this week (from habit completions in initialContext)
    const habits = initialContext?.userHabits || [];
    let daysActive = 0;
    let habitCompletionPct = 0;
    // We'll compute this from the habits' thisWeekSteps if available
    const activeDaysSet = new Set<string>();
    habits.forEach((h: any) => {
      if (h.thisWeekSteps && Array.isArray(h.thisWeekSteps)) {
        h.thisWeekSteps.forEach((step: any) => {
          if (step.date) activeDaysSet.add(step.date);
        });
      }
    });
    daysActive = activeDaysSet.size;

    // Days since last coach session
    let daysSinceLastSession = 'first time';
    if (lastCoachSession) {
      const lastDate = new Date(lastCoachSession);
      const diffDays = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
      daysSinceLastSession = diffDays === 0 ? 'today' : diffDays === 1 ? 'yesterday' : `${diffDays} days ago`;
    }

    // Save this session timestamp
    AsyncStorage.setItem(LAST_COACH_SESSION_KEY, new Date().toISOString()).catch(() => {});

    // Top 5 habits by totalStepsTaken, with identity/intention
    const topHabits = [...habits]
      .sort((a: any, b: any) => (b.totalStepsTaken || 0) - (a.totalStepsTaken || 0))
      .slice(0, 5)
      .map((h: any) => {
        const parts = [h.name || h.title || 'Untitled'];
        if (h.scalingPhase) parts.push(`phase: ${h.scalingPhase.replace(/_/g, ' ')}`);
        if (h.identity || h.identityStatement) parts.push(`identity: "${h.identity || h.identityStatement}"`);
        else if (h.intention) parts.push(`why: "${h.intention}"`);
        return parts.join(' | ');
      });

    return {
      currentTime: `${currentTime} ${timezone}`,
      page: initialContext?.screen || 'unknown',
      brainState: brainState || 'not checked in today',
      todayCheckIn: checkIn
        ? `mood ${checkIn.mood}/5, energy ${checkIn.energyLevel}/5`
        : 'not checked in today',
      dailyReflection: reflection || 'not reflected yet',
      sleepQuality: brainMetrics?.sleepQuality ? `${brainMetrics.sleepQuality}/5` : 'not tracked',
      stressLevel: brainMetrics?.stressLevel ? `${brainMetrics.stressLevel}/5` : 'not tracked',
      weekSummary: `${daysActive} of 7 days active, ${focusCount} focus sessions (${focusMinutes} min total)`,
      moodTrend: moodTrend,
      recentJournalTags: uniqueTags.length > 0 ? uniqueTags.join(', ') : 'none',
      daysSinceLastCoachSession: daysSinceLastSession,
      habits: topHabits,
    };
  };
```

- [ ] **Step 4: Update `handleSend` to use `buildCoachContext`**

In the `handleSend` function (around line 339-351), replace:

```typescript
      const brainMetrics = await fetchBrainMetrics();
      const enhancedContext = {
        ...initialContext,
        brainMetrics,
      };

      const response = await chatWithAI(messageHistory, enhancedContext);
```

With:

```typescript
      const coachContext = await buildCoachContext();
      const response = await chatWithAI(messageHistory, coachContext);
```

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/ai/AIChatModal.tsx
git commit -m "feat: build enhanced coach context with today's state, patterns, and session tracking"
```

---

### Task 2: Update FAB Context in AppNavigator

**Files:**
- Modify: `mobile/src/navigation/AppNavigator.tsx:700-706`

- [ ] **Step 1: Update the AIAssistantFAB context prop**

Find the AIAssistantFAB rendering (around line 700-706). Change:

```typescript
        <AIAssistantFAB
          context={{
            screen: 'global',
            userGoals: goals.slice(0, 5),
            userHabits: habits.slice(0, 10),
            userTasks: tasks.slice(0, 10),
          }}
```

To:

```typescript
        <AIAssistantFAB
          context={{
            screen: 'global',
            userHabits: habits,
          }}
```

Goals and tasks are removed from the app. We pass all habits here — the `buildCoachContext` function in AIChatModal handles sorting to top 5 and extracting relevant fields.

- [ ] **Step 2: Remove unused hook imports if goals/tasks are only used for FAB**

Check if `useGoals` and `useTasks` are still used elsewhere in `MainNavigator`. If the only usage was the FAB context, remove the imports and hook calls. The existing code has:

```typescript
  const goalsData = useGoals();
  const tasksData = useTasks();
```

And:

```typescript
  const goals = DASHBOARD_V2 ? [] : (goalsData?.goals || []);
  const tasks = DASHBOARD_V2 ? [] : (tasksData?.tasks || []);
```

Since `DASHBOARD_V2` is `true`, these are already `[]`. Remove the hook calls and the variables if nothing else in `MainNavigator` references `goals` or `tasks`. Keep the imports if other navigators in the same file use them.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/navigation/AppNavigator.tsx
git commit -m "refactor: simplify FAB context to habits only, remove unused goals/tasks"
```

---

### Task 3: Update Backend System Prompt Context Template

**Files:**
- Modify: `backend/server.js` (the `/api/ai-chat` route's system prompt context block)

- [ ] **Step 1: Replace the context block in the system prompt**

In the system prompt for `/api/ai-chat` (inside the template literal), find the `Context:` section and everything after it through the `CONTEXT USAGE:` section. Replace the entire context block with:

```javascript
Context:
- Current time: ${context?.currentTime || new Date().toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit' })}
- Current page: ${context?.page || page?.label || 'Unknown'}
- Brain state: ${context?.brainState || 'unknown'}
- Today's check-in: ${context?.todayCheckIn || 'not checked in'}
- Daily reflection: ${context?.dailyReflection || 'not reflected yet'}
- Sleep quality: ${context?.sleepQuality || 'not tracked'}, Stress level: ${context?.stressLevel || 'not tracked'}
- This week: ${context?.weekSummary || 'no data yet'}
- Mood trend (7-day): ${context?.moodTrend || 'not enough data'}
- Recent journal tags: ${context?.recentJournalTags || 'none'}
- Days since last coach session: ${context?.daysSinceLastCoachSession || 'unknown'}
- Top habits: ${
    (context?.habits || []).length > 0
      ? context.habits.join('; ')
      : (userSummary?.habits || [])
          .map(h => h.title || 'Untitled habit')
          .slice(0, 5)
          .join('; ') || 'None on file'
  }

Scaling phases explained (for interpreting habit data): getting_started = just began, building_momentum = forming the pattern, committed = consistent but still developing, established = solid routine, expert = deeply ingrained.

CONTEXT USAGE:
You receive the user's current state and recent patterns as context. Use this information naturally. If someone says "I can't focus today" and you can see their brain state is "foggy," connect the dots through the BRAIN framework. But don't recite their data back at them like a dashboard. Weave it into your coaching naturally. Use trend data to inform your approach, not narrate it back to the user. A coach who sees a declining mood trend asks better questions, they don't open with "your numbers are down." Never reference journal content directly, only use tags for thematic awareness.
```

Note: The old context block used `${page?.label}` and `${userSummary?.habits}` from destructured `req.body.context`. The new block uses `${context?.brainState}` etc. We need to also destructure `context` from `req.body`. Check the existing destructuring:

```javascript
    const { messages = [], context = {} } = req.body || {};
    const { page, userSummary } = context || {};
```

The `context` variable already exists. The new template references `context?.brainState` etc. directly. Keep `page` and `userSummary` destructured as fallbacks for the old mobile app format (deployed version may still send old format).

- [ ] **Step 2: Commit**

```bash
git add backend/server.js
git commit -m "feat: update AI coach context template with enhanced state and pattern fields"
```

---

### Task 4: Update chatWithAI Service to Pass Full Context

**Files:**
- Modify: `mobile/src/services/api/ai.service.ts:146-177`

- [ ] **Step 1: Simplify the context parameter type**

The `chatWithAI` function currently has a rigid type for the context parameter. Update it to accept the new flat context object. Change the function signature from:

```typescript
export const chatWithAI = async (
  messages: Array<{ role: string; content: string }>,
  context?: {
    page?: { label: string; path: string };
    userSummary?: {
      goals?: any[];
      habits?: any[];
      tasks?: any[];
    };
    brainMetrics?: {
      readinessScore?: number;
      neuroplasticityCount?: number;
      amccStreak?: number;
      nervousSystemToolUses?: number;
      lastCheckIn?: string;
    };
  }
): Promise<string> => {
```

To:

```typescript
export const chatWithAI = async (
  messages: Array<{ role: string; content: string }>,
  context?: Record<string, any>,
): Promise<string> => {
```

The rest of the function body stays the same — it already passes `context` directly to the API.

- [ ] **Step 2: Commit**

```bash
git add mobile/src/services/api/ai.service.ts
git commit -m "refactor: simplify chatWithAI context type to accept enhanced context"
```

---

### Task 5: Verification

- [ ] **Step 1: Verify context fields are assembled correctly**

Read `mobile/src/components/ai/AIChatModal.tsx` and confirm:
- `buildCoachContext` queries all data sources in parallel
- Brain state is first field in returned object
- Habits are sorted by `totalStepsTaken` and limited to 5
- `LAST_COACH_SESSION_KEY` is saved on each send
- No journal content is passed, only tags and mood
- Current time includes timezone

- [ ] **Step 2: Verify backend context template**

Read `backend/server.js` and confirm:
- Brain state is the third context line (after time and page)
- Scaling phase definitions are included
- Context usage instructions say "don't narrate data back" and "never reference journal content directly"
- Fallback to old `userSummary?.habits` format exists for deployed app compatibility

- [ ] **Step 3: Verify no TypeScript errors**

Run: `cd mobile && npx tsc --noEmit 2>&1 | head -30`

- [ ] **Step 4: Test manually**

Open the app, tap the Vara Coach FAB, send a message. Check the backend console to see the context object being received. Verify it contains: currentTime, brainState, todayCheckIn, weekSummary, moodTrend, recentJournalTags, daysSinceLastCoachSession, and habits array.

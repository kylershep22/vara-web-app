# Phase 6: AI Chat Alignment — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the dedicated `/ai` page and sidebar link, enhance the existing AIChatWidget with richer context (brain state, reflection, habit completions), and add spec-defined quick prompts.

**Architecture:** The web already has `AIChatWidget.jsx` (FAB + chat modal, rendered globally in SidebarLayout). This plan enhances `userContextService.js` with brain state/reflection/completion data, updates the widget's quick prompts, removes the `/ai` route and `AICompanion.jsx` page, and removes the sidebar nav entry.

**Tech Stack:** React, Tailwind CSS, Firebase Firestore

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/services/userContextService.js` | Modify | Add brain state, reflection, completion counts to context |
| `src/components/ai/AIChatWidget.jsx` | Modify | Add quick prompts when no messages, use enhanced context |
| `src/App.js` | Modify | Remove `/ai` route |
| `src/components/layout/SidebarLayout.jsx` | Modify | Remove AI Companion sidebar link |

---

### Task 1: Enhance User Context Service

**Files:**
- Modify: `src/services/userContextService.js`

- [ ] **Step 1: Add brain state, reflection, and completion count queries**

Add imports for the services we've already built and expand `buildUserContextSummary`:

```js
import { getTodayCheckIn } from './db/brainStateCheckIn.service';
import { getTodayReflection } from './db/dailyReflection.service';
```

Add after the habits query block (before the `return` on line 44):

```js
  // ---- Brain state check-in ----
  let brainState = null;
  try {
    const checkIn = await getTodayCheckIn(userId);
    brainState = checkIn?.brainState || null;
  } catch { /* non-critical */ }

  // ---- Daily reflection ----
  let dailyReflection = null;
  try {
    const refl = await getTodayReflection(userId);
    dailyReflection = refl?.difficulty || null;
  } catch { /* non-critical */ }

  // ---- Habits completed today ----
  const today = new Date();
  const todayISO = `${today.getFullYear()}-${String(today.getMonth() + 1).padStart(2, '0')}-${String(today.getDate()).padStart(2, '0')}`;
  let habitsCompletedToday = 0;
  try {
    const compSnap = await getDocs(
      query(collection(db, 'habitCompletions'), where('userId', '==', userId), where('dateISO', '==', todayISO))
    );
    habitsCompletedToday = compSnap.size;
  } catch { /* non-critical */ }
```

Update the return to include the new fields:

```js
  return {
    goals,
    habits,
    brainState,
    dailyReflection,
    activeHabits: habits.length,
    habitsCompletedToday,
  };
```

- [ ] **Step 2: Commit**

```bash
git add src/services/userContextService.js
git commit -m "feat(web): enhance AI context with brain state, reflection, completions"
```

---

### Task 2: Update Quick Prompts and Context in AIChatWidget

**Files:**
- Modify: `src/components/ai/AIChatWidget.jsx`

- [ ] **Step 1: Add universal quick prompts when chat has only the initial greeting**

Find the `suggestionChips` useMemo (around line 135). When messages only has the initial greeting (length === 1), show the spec's quick prompts instead of page-specific ones.

Replace the existing `suggestionChips` with:

```js
  const suggestionChips = useMemo(() => {
    // Show universal quick prompts when chat is fresh
    if (messages.length <= 1) {
      return [
        'Help me focus',
        'I need a reset',
        'Build a routine',
        'Feeling overwhelmed',
      ];
    }
    // Page-specific suggestions after conversation starts
    switch (pageLabel) {
      case 'Goals':
        return ['Recommend habits for my top goal', 'Break my goal into milestones'];
      case 'Habits':
        return ['Suggest a plan to build consistency', 'Give me habit stacking ideas'];
      case 'Journal':
        return ['Give me a reflection prompt', 'Help me reframe a stressful thought'];
      default:
        return ["What's a small win I can get today?", 'Recommend a 10-minute routine'];
    }
  }, [pageLabel, messages.length]);
```

- [ ] **Step 2: Commit**

```bash
git add src/components/ai/AIChatWidget.jsx
git commit -m "feat(web): add universal quick prompts to AI chat widget"
```

---

### Task 3: Remove /ai Route and Sidebar Entry

**Files:**
- Modify: `src/App.js`
- Modify: `src/components/layout/SidebarLayout.jsx`

- [ ] **Step 1: Remove /ai route from App.js**

Find and remove the `/ai` route block and the `AICompanion` import.

- [ ] **Step 2: Remove AI Companion from SidebarLayout.jsx**

Find the `bottomItems` or nav items array that contains `{ path: "/ai", label: "AI Companion", icon: Bot }` and remove that entry. Keep the `AIChatWidget` render — that's the FAB.

- [ ] **Step 3: Commit**

```bash
git add src/App.js src/components/layout/SidebarLayout.jsx
git commit -m "refactor(web): remove /ai page, replace with global AI chat FAB"
```

---

### Task 4: Build Verification

- [ ] **Step 1: Build**

```bash
npx react-scripts build 2>&1 | tail -15
```

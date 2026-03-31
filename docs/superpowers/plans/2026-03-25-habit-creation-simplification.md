# Habit Creation Simplification & Reminder Notifications

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the existing multi-field habit creation forms with a single unified modal (Name, Category, Frequency, optional Reminder) used across all pages, and build a Cloud Function to send push notifications for incomplete habits at the user's chosen reminder time.

**Architecture:** Single `HabitCreateModal` component replaces both `AddHabitForm` and the old `HabitCreateModal`. Reminder time is stored on the habit document. A new `sendHabitReminders` Cloud Function runs every 15 minutes, queries habits with reminders due in the current window, checks completions, and sends FCM push via the existing `fcmSender` utility.

**Tech Stack:** React 19, Tailwind CSS, Firebase Firestore, Firebase Cloud Functions v2, FCM

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Rewrite | `src/components/dashboard/HabitCreateModal.jsx` | Unified single-step habit creation modal |
| Modify | `src/components/dashboard/HabitTrackerWeekly.jsx` | Update import (no functional change needed, already uses HabitCreateModal) |
| Modify | `src/pages/GoalsHabits.jsx` | Replace `AddHabitForm` with new `HabitCreateModal` |
| Modify | `src/pages/Habits.jsx` | Replace `AddHabitForm` with new `HabitCreateModal` |
| Modify | `src/services/db/habits.service.js` | Add reminder fields to `createHabit` |
| Create | `functions/src/notifications/habitReminders.js` | Cloud Function: check & send habit reminders |
| Modify | `functions/src/notifications/index.js` | Export new `sendHabitReminders` |
| Modify | `functions/index.js` | Register `sendHabitReminders` export |

---

### Task 1: Rewrite HabitCreateModal as the unified creation modal

**Files:**
- Rewrite: `src/components/dashboard/HabitCreateModal.jsx`

This is the core UI change. The new modal has 4 fields:
1. **Habit Name** (text, required)
2. **Category** (dropdown, optional — uses `getAllHabitCategories()` from `brainHealthMapping.js`)
3. **Frequency** (two-option toggle: Daily / Weekly)
4. **Reminder** (toggle + time picker, optional)

- [ ] **Step 1: Rewrite HabitCreateModal**

```jsx
// src/components/dashboard/HabitCreateModal.jsx

import React, { useState } from 'react';
import { X, Bell } from 'lucide-react';
import { createHabit } from '../../services/db/habits.service';
import { getAllHabitCategories } from '../../constants/brainHealthMapping';

const HabitCreateModal = ({ userId, onClose, onSave }) => {
  const [name, setName] = useState('');
  const [category, setCategory] = useState('');
  const [frequency, setFrequency] = useState('daily');
  const [reminderEnabled, setReminderEnabled] = useState(false);
  const [reminderTime, setReminderTime] = useState('18:00');
  const [saving, setSaving] = useState(false);

  const categories = getAllHabitCategories();

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!name.trim()) return;
    setSaving(true);

    try {
      const [hour, minute] = reminderTime.split(':').map(Number);

      await createHabit(userId, {
        name: name.trim(),
        category: category || null,
        frequency,
        reminderEnabled,
        reminderTime: reminderEnabled ? { hour, minute } : null,
      });

      if (onSave) onSave();
      onClose();
    } catch (error) {
      console.error('Error creating habit:', error);
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-md w-full">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-divider">
          <h2 className="text-xl font-bold text-soft-charcoal">Create Habit</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-dew-sage-light rounded-lg transition-colors"
          >
            <X size={20} className="text-muted-sage-gray" />
          </button>
        </div>

        {/* Form */}
        <form onSubmit={handleSubmit} className="p-6 space-y-5">
          {/* Name */}
          <div>
            <label className="block text-sm font-medium text-soft-charcoal mb-1.5">
              Habit Name
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g., Morning meditation, Drink water"
              className="w-full px-4 py-2.5 border border-divider rounded-lg focus:ring-2 focus:ring-evergreen-teal focus:border-evergreen-teal outline-none"
              required
              autoFocus
            />
          </div>

          {/* Category */}
          <div>
            <label className="block text-sm font-medium text-soft-charcoal mb-1.5">
              Category <span className="text-muted-sage-gray font-normal">(optional)</span>
            </label>
            <select
              value={category}
              onChange={(e) => setCategory(e.target.value)}
              className="w-full px-4 py-2.5 border border-divider rounded-lg focus:ring-2 focus:ring-evergreen-teal focus:border-evergreen-teal outline-none"
            >
              <option value="">Select a category...</option>
              {categories.map(cat => (
                <option key={cat} value={cat}>
                  {cat.charAt(0).toUpperCase() + cat.slice(1).replace('-', ' ')}
                </option>
              ))}
            </select>
          </div>

          {/* Frequency Toggle */}
          <div>
            <label className="block text-sm font-medium text-soft-charcoal mb-1.5">
              Frequency
            </label>
            <div className="flex rounded-lg border border-divider overflow-hidden">
              <button
                type="button"
                onClick={() => setFrequency('daily')}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  frequency === 'daily'
                    ? 'bg-evergreen-teal text-white'
                    : 'bg-white text-soft-charcoal hover:bg-dew-sage-light'
                }`}
              >
                Daily
              </button>
              <button
                type="button"
                onClick={() => setFrequency('weekly')}
                className={`flex-1 py-2.5 text-sm font-medium transition-colors ${
                  frequency === 'weekly'
                    ? 'bg-evergreen-teal text-white'
                    : 'bg-white text-soft-charcoal hover:bg-dew-sage-light'
                }`}
              >
                Weekly
              </button>
            </div>
          </div>

          {/* Reminder Toggle + Time Picker */}
          <div>
            <div className="flex items-center justify-between mb-1.5">
              <label className="text-sm font-medium text-soft-charcoal flex items-center gap-1.5">
                <Bell size={16} className="text-muted-sage-gray" />
                Reminder
              </label>
              <button
                type="button"
                onClick={() => setReminderEnabled(!reminderEnabled)}
                className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                  reminderEnabled ? 'bg-evergreen-teal' : 'bg-silver-sage'
                }`}
              >
                <span
                  className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                    reminderEnabled ? 'translate-x-6' : 'translate-x-1'
                  }`}
                />
              </button>
            </div>
            {reminderEnabled && (
              <div className="mt-2">
                <p className="text-xs text-muted-sage-gray mb-2">
                  Get a push notification if this habit isn't completed by this time
                </p>
                <input
                  type="time"
                  value={reminderTime}
                  onChange={(e) => setReminderTime(e.target.value)}
                  className="w-full px-4 py-2.5 border border-divider rounded-lg focus:ring-2 focus:ring-evergreen-teal focus:border-evergreen-teal outline-none"
                />
              </div>
            )}
          </div>

          {/* Buttons */}
          <div className="flex gap-3 pt-2">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2.5 border border-divider rounded-lg text-soft-charcoal font-medium hover:bg-dew-sage-light transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={saving || !name.trim()}
              className="flex-1 px-4 py-2.5 bg-evergreen-teal text-white rounded-lg font-medium hover:opacity-90 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
            >
              {saving ? 'Creating...' : 'Create Habit'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default HabitCreateModal;
```

- [ ] **Step 2: Manually verify modal renders**

Run: `npm start`
Navigate to Dashboard, click "Create Habit" button. Verify:
- Modal opens with Name, Category, Frequency toggle, Reminder toggle
- Category dropdown shows all 16 categories
- Frequency toggles between Daily/Weekly
- Reminder toggle reveals time picker
- Creating a habit saves and closes modal

- [ ] **Step 3: Commit**

```bash
git add src/components/dashboard/HabitCreateModal.jsx
git commit -m "feat: rewrite HabitCreateModal as unified single-step creation form"
```

---

### Task 2: Replace AddHabitForm usage in GoalsHabits page

**Files:**
- Modify: `src/pages/GoalsHabits.jsx`

Replace the inline `AddHabitForm` with the new `HabitCreateModal` popup. The GoalsHabits page currently shows AddHabitForm in two places:
1. Line ~1520: Create habit section (inline, toggled by `creatingHabit` state)
2. Line ~1712: Edit habit modal (reuses AddHabitForm with `initialData`)

For creation, we swap to `HabitCreateModal`. The edit modal (line ~1712) is out of scope for this plan — it uses AddHabitForm with `initialData` for editing, which is a different flow.

- [ ] **Step 1: Update GoalsHabits.jsx imports**

Add the `HabitCreateModal` import alongside the existing `AddHabitForm` import (which is still needed for the edit-habit modal at line ~1712):

In `src/pages/GoalsHabits.jsx`, add after the `AddHabitForm` import:
```jsx
import HabitCreateModal from '../components/dashboard/HabitCreateModal';
```

> **Note:** Do NOT remove the `AddHabitForm` import — it is still used by the edit-habit modal further down the file.

- [ ] **Step 2: Replace the creation section**

Find the block around lines 1512-1528 that renders `AddHabitForm` inside a container div when `creatingHabit` is true. Replace the entire block.

The `HabitCreateModal` handles its own Firestore write via `createHabit()` from the service layer, so `onSave` here is only used as a callback to trigger a re-fetch. Do NOT pass `handleSaveHabit` (which does its own `addDoc` and would create a duplicate). Instead pass a simple re-fetch callback.

Old (approximate lines 1512-1528):
```jsx
            {creatingHabit && (
              <div className="bg-white border border-silver-sage rounded-vara-lg p-vara-lg shadow-vara-sm">
                <div className="flex items-center justify-between mb-vara-base">
                  <h3 className="text-vara-lg font-semibold text-evergreen-teal">Create New Habit</h3>
                  <button onClick={() => setCreatingHabit(false)} className="p-2 hover:bg-dew-sage-light rounded-vara-md">
                    <X size={18} className="text-muted-sage-gray" />
                  </button>
                </div>
                <AddHabitForm
                  userId={user.uid}
                  goals={goals}
                  connectedApps={connectedApps.filter((app) => app.connected)}
                  onSave={handleSaveHabit}
                  onCancel={() => setCreatingHabit(false)}
                />
              </div>
            )}
```

New:
```jsx
            {creatingHabit && (
              <HabitCreateModal
                userId={user.uid}
                onClose={() => setCreatingHabit(false)}
                onSave={() => fetchHabits()}
              />
            )}
```

- [ ] **Step 3: Verify GoalsHabits page**

Run: `npm start`
Navigate to Goals & Habits page, click "Create Habit". Verify the unified modal appears as a popup overlay.

- [ ] **Step 4: Commit**

```bash
git add src/pages/GoalsHabits.jsx
git commit -m "refactor: replace AddHabitForm with HabitCreateModal on GoalsHabits page"
```

---

### Task 3: Replace AddHabitForm usage in Habits page

**Files:**
- Modify: `src/pages/Habits.jsx`

The Habits page renders `AddHabitForm` inline per-goal (line 72). Replace with a modal triggered by a button.

> **Note:** The old `AddHabitForm` passed `goalId={goal.id}` to link habits to goals. Since goals are being removed from the app, this linkage is intentionally dropped. Habits created via the new modal will not have a `goalId` and will not appear under goal-filtered `HabitList` sections — this is expected.

- [ ] **Step 1: Rewrite Habits.jsx**

Replace the `AddHabitForm` import and usage. Add modal state and trigger button:

```jsx
// src/pages/Habits.jsx

import React, { useEffect, useState } from 'react';
import SidebarLayout from '../components/layout/SidebarLayout';
import { Target, Plus } from 'lucide-react';
import { db } from '../firebase';
import { collection, query, where, getDocs } from 'firebase/firestore';
import { useAuth } from '../context/AuthContext';
import HabitCreateModal from '../components/dashboard/HabitCreateModal';
import HabitList from '../components/habits/HabitList';
import AIBasedSuggestions from '../components/habits/AIBasedSuggestions';

export default function Habits() {
  const { user } = useAuth();
  const [goals, setGoals] = useState([]);
  const [selectedGoalId, setSelectedGoalId] = useState(null);
  const [habitSectionOpen, setHabitSectionOpen] = useState({});
  const [showCreateModal, setShowCreateModal] = useState(false);

  useEffect(() => {
    if (user) fetchGoals();
  }, [user]);

  const fetchGoals = async () => {
    const q = query(collection(db, 'goals'), where('userId', '==', user.uid));
    const snapshot = await getDocs(q);
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setGoals(data);
  };

  const toggleHabitSection = (goalId) => {
    setHabitSectionOpen(prev => ({ ...prev, [goalId]: !prev[goalId] }));
    setSelectedGoalId(goalId);
  };

  return (
    <SidebarLayout>
      <div className="p-6 max-w-6xl mx-auto space-y-10">
        <div className="flex items-center justify-between">
          <div>
            <h1 className="text-3xl font-semibold text-evergreen-teal flex items-center gap-2">
              <Target size={28} />
              Goals & Habits
            </h1>
            <p className="text-muted-sage-gray mt-1">
              Link habits to each goal to better track your wellness journey and build consistency.
            </p>
          </div>
          <button
            onClick={() => setShowCreateModal(true)}
            className="inline-flex items-center gap-1.5 px-4 py-2.5 bg-evergreen-teal text-white rounded-lg text-sm font-medium hover:opacity-90 transition-colors"
          >
            <Plus size={16} />
            Create Habit
          </button>
        </div>

        {goals.map(goal => (
          <div key={goal.id} className="bg-white/90 border border-divider rounded-2xl p-6 shadow-md">
            <div className="flex justify-between items-start mb-4">
              <div>
                <h2 className="text-xl font-semibold text-soft-charcoal">{goal.title}</h2>
                <p className="text-sm text-muted-sage-gray">Category: {goal.category}</p>
              </div>
              <button
                onClick={() => toggleHabitSection(goal.id)}
                className="text-sm px-4 py-2 rounded-lg bg-gradient-to-r from-evergreen-teal to-silver-sage text-white hover:scale-105 transition"
              >
                {habitSectionOpen[goal.id] ? 'Hide Habits' : 'View Habits'}
              </button>
            </div>

            {habitSectionOpen[goal.id] && (
              <div className="space-y-6">
                <HabitList userId={user?.uid} goalId={goal.id} showCalendar />
                <AIBasedSuggestions userId={user?.uid} goal={goal} />
              </div>
            )}
          </div>
        ))}

        {showCreateModal && (
          <HabitCreateModal
            userId={user?.uid}
            onClose={() => setShowCreateModal(false)}
            onSave={() => fetchGoals()}
          />
        )}
      </div>
    </SidebarLayout>
  );
}
```

- [ ] **Step 2: Verify Habits page**

Run: `npm start`
Navigate to Habits page. Verify "Create Habit" button opens the unified modal.

- [ ] **Step 3: Commit**

```bash
git add src/pages/Habits.jsx
git commit -m "refactor: replace AddHabitForm with HabitCreateModal on Habits page"
```

---

### Task 4: Update habits.service.js to support reminder fields

**Files:**
- Modify: `src/services/db/habits.service.js`

Ensure `createHabit` includes `reminderEnabled` and `reminderTime` in the saved document.

- [ ] **Step 1: Update createHabit function**

In `src/services/db/habits.service.js`, change the `createHabit` function:

```javascript
export async function createHabit(userId, payload) {
  const col = collection(db, "habits");
  const docData = {
    userId,
    name: payload.name ?? "",
    title: payload.name ?? "",
    category: payload.category ?? null,
    frequency: payload.frequency ?? "daily",
    active: true,
    streak: 0,
    reminderEnabled: payload.reminderEnabled ?? false,
    reminderTime: payload.reminderTime ?? null,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };
  const res = await addDoc(col, docData);
  return { id: res.id, ...docData };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/db/habits.service.js
git commit -m "feat: add reminder fields to habits.service.js createHabit"
```

---

### Task 5: Create habitReminders Cloud Function

**Files:**
- Create: `functions/src/notifications/habitReminders.js`

New scheduled Cloud Function that runs every 15 minutes. It:
1. Checks if server push is enabled (feature flag)
2. Queries all habits where `reminderEnabled == true` and `reminderTime.hour == currentHour`
3. Filters by minute within the 15-min window
4. Checks if the habit has a completion for today (queries `habitCompletions` collection where `dateISO == today`)
5. If NOT completed, gets user FCM token and sends a push notification
6. Logs to `notificationLog/{userId}/habitReminder/{habitId}_{date}` to prevent duplicates

**Known limitations (carried forward from existing `dailyRhythm.js` pattern):**
- The 15-minute window calculation doesn't wrap across hour boundaries (e.g., minute 50 + 14 = 64, which won't match minute 4 of the next hour). This is a pre-existing pattern limitation.
- `new Date()` in Cloud Functions uses UTC. Users setting a reminder for "6:00 PM" likely mean local time. Timezone-aware scheduling is a future enhancement.

**Firestore composite index required:** The query uses `reminderEnabled`, `active`, and `reminderTime.hour` — Firestore will auto-prompt for index creation on first invocation, or you can add it to `firestore.indexes.json`.

- [ ] **Step 1: Create habitReminders.js**

```javascript
// functions/src/notifications/habitReminders.js

/**
 * Habit Reminder Notification — Cloud Function
 * CRON: every 15 minutes, checks habits with reminders due in current window.
 * Sends FCM push only if the habit has NOT been completed today.
 */

const {onSchedule} = require("firebase-functions/v2/scheduler");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");
const {sendNotification} = require("./utils/fcmSender");
const {isWithinQuietHours} = require("./utils/quietHours");

const sendHabitReminders = onSchedule(
  {
    schedule: "every 15 minutes",
    region: "us-central1",
    timeoutSeconds: 120,
  },
  async () => {
    const db = admin.firestore();
    const now = new Date();
    const currentHour = now.getHours();
    const currentMinute = now.getMinutes();
    const windowEnd = currentMinute + 14;
    const todayISO = now.toISOString().split("T")[0];

    logger.info(`Habit reminder check: ${currentHour}:${currentMinute}`);

    // Check feature flag
    try {
      const configSnap = await db.doc("config/notifications").get();
      const config = configSnap.exists ? configSnap.data() : {};
      if (!config.serverPushEnabled) {
        logger.info("Server push disabled via feature flag");
        return;
      }
    } catch (err) {
      logger.warn("Could not read feature flag, skipping:", err);
      return;
    }

    // Query habits with reminders at this hour
    const habitsSnapshot = await db
      .collection("habits")
      .where("reminderEnabled", "==", true)
      .where("active", "==", true)
      .where("reminderTime.hour", "==", currentHour)
      .get();

    if (habitsSnapshot.empty) {
      logger.info("No habit reminders at this hour");
      return;
    }

    let sent = 0;
    let skipped = 0;

    for (const habitDoc of habitsSnapshot.docs) {
      const habit = habitDoc.data();
      const habitId = habitDoc.id;

      // Check minute within 15-minute window
      const habitMinute = habit.reminderTime?.minute ?? 0;
      if (habitMinute < currentMinute || habitMinute > windowEnd) {
        skipped++;
        continue;
      }

      // Check for duplicate send today
      const logRef = db.doc(
        `notificationLog/${habit.userId}/habitReminder/${habitId}_${todayISO}`,
      );
      const logSnap = await logRef.get();
      if (logSnap.exists) {
        skipped++;
        continue;
      }

      // Check if habit was completed today
      const completionSnapshot = await db
        .collection("habitCompletions")
        .where("habitId", "==", habitId)
        .where("dateISO", "==", todayISO)
        .limit(1)
        .get();

      if (!completionSnapshot.empty) {
        skipped++;
        continue;
      }

      // Get user data for FCM token and quiet hours
      const userSnap = await db.doc(`users/${habit.userId}`).get();
      if (!userSnap.exists) continue;
      const userData = userSnap.data();
      const fcmToken = userData.fcmToken;
      if (!fcmToken) {
        skipped++;
        continue;
      }

      // Check quiet hours from notification preferences
      const prefsSnap = await db
        .doc(`notificationPreferences/${habit.userId}`)
        .get();
      if (prefsSnap.exists) {
        const prefs = prefsSnap.data();
        if (isWithinQuietHours(prefs.quietHours)) {
          skipped++;
          continue;
        }
      }

      // Send notification
      const habitName = habit.name || habit.title || "your habit";
      const messageId = await sendNotification(
        fcmToken,
        {
          title: "Habit Reminder",
          body: `Don't forget to complete "${habitName}" today!`,
        },
        {
          type: "habit_reminder",
          habitId: habitId,
        },
      );

      if (messageId) {
        await logRef.set({sentAt: admin.firestore.FieldValue.serverTimestamp()});
        sent++;
      }
    }

    logger.info(
      `Habit reminders complete: ${sent} sent, ${skipped} skipped`,
    );
  },
);

module.exports = {sendHabitReminders};
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/notifications/habitReminders.js
git commit -m "feat: add habitReminders Cloud Function for push notifications"
```

---

### Task 6: Wire up habitReminders export

**Files:**
- Modify: `functions/src/notifications/index.js`
- Modify: `functions/index.js`

- [ ] **Step 1: Update notifications barrel export**

Replace the full contents of `functions/src/notifications/index.js` with:

```javascript
/**
 * Notification Cloud Functions — Barrel Export
 * 4 categories: daily_rhythm, insights_learning, social_connection, milestones_reflection
 * + habit reminders
 */

const {sendDailyRhythm} = require("./dailyRhythm");
const {sendInsights} = require("./insights");
const {onNewDirectMessage, onNewConnection} = require("./social");
const {sendMilestones} = require("./milestones");
const {sendHabitReminders} = require("./habitReminders");

module.exports = {
  sendDailyRhythm,
  sendInsights,
  onNewDirectMessage,
  onNewConnection,
  sendMilestones,
  sendHabitReminders,
};
```

- [ ] **Step 2: Add to functions/index.js**

In `functions/index.js`, after the existing notification exports (around line 25), add:

```javascript
exports.sendHabitReminders = notifications.sendHabitReminders;
```

- [ ] **Step 3: Commit**

```bash
git add functions/src/notifications/index.js functions/index.js
git commit -m "feat: wire up sendHabitReminders Cloud Function export"
```

---

### Task 7: Verify end-to-end and clean up

**Files:**
- No new files

- [ ] **Step 1: Run the app and test full flow**

Run: `npm start`

Test checklist:
- [ ] Dashboard: "Create Habit" opens unified modal
- [ ] GoalsHabits page: "Create Habit" opens unified modal
- [ ] Habits page: "Create Habit" opens unified modal
- [ ] Modal fields: Name (required), Category (optional dropdown), Frequency (Daily/Weekly toggle), Reminder (toggle + time picker)
- [ ] Creating a habit with reminder saves `reminderEnabled: true` and `reminderTime: { hour, minute }` to Firestore
- [ ] Creating a habit without reminder saves `reminderEnabled: false` and `reminderTime: null`

- [ ] **Step 2: Verify Cloud Function deploys**

Run: `cd functions && npm run lint` (or `npx eslint src/notifications/habitReminders.js`)
Ensure no lint errors in the new file.

- [ ] **Step 3: Final commit**

```bash
git add -A
git commit -m "feat: unified habit creation modal with optional reminder notifications"
```

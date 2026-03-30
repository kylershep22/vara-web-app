# Education Card Removal + Notification Audit Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Remove the Brain Health Education Card from the home screen and audit/fix all notification copy to align with Vara's philosophy, implementing frequency de-escalation tiers based on user activity.

**Architecture:** Task 3 is a single-file edit on DashboardScreen. Task 4 spans mobile notification services and Cloud Functions: fix one red-flag string, remove goal milestone strings, create a shared `notificationTier` utility for Cloud Functions, and add tier checks to all 4 scheduled notification functions.

**Tech Stack:** React Native, Firebase Cloud Functions, Firestore

---

## File Map

### Task 3 — Education Card
| Action | File | What Changes |
|--------|------|-------------|
| Modify | `mobile/src/screens/DashboardScreen.tsx` | Remove BrainHealthEducationCard rendering and import |

### Task 4 — Notification Audit
| Action | File | What Changes |
|--------|------|-------------|
| Modify | `functions/src/notifications/habitReminders.js` | Fix red-flag copy |
| Modify | `mobile/src/services/notificationScheduler.service.ts` | Remove goal milestone strings |
| Create | `functions/src/notifications/notificationTier.js` | Shared tier utility |
| Modify | `functions/src/notifications/dailyRhythm.js` | Add tier check |
| Modify | `functions/src/notifications/insights.js` | Add tier check |
| Modify | `functions/src/notifications/milestones.js` | Add tier check |
| Modify | `functions/src/notifications/habitReminders.js` | Add tier check |

---

### Task 1: Remove Brain Health Education Card from Dashboard

**Files:**
- Modify: `mobile/src/screens/DashboardScreen.tsx`

- [ ] **Step 1: Remove the import**

Find the imports from dashboard components. Remove `BrainHealthEducationCard`:

Search for `BrainHealthEducationCard` in the imports section and remove it.

- [ ] **Step 2: Remove the V2 rendering**

Find and remove (around line 176-177):
```typescript
            {/* Position 5: Brain Health Education (below fold) */}
            <BrainHealthEducationCard />
```

- [ ] **Step 3: Remove the V1 rendering if present**

Search for any other `<BrainHealthEducationCard` rendering in the V1 section (around line 252) and remove it.

- [ ] **Step 4: Commit**

```bash
git add mobile/src/screens/DashboardScreen.tsx
git commit -m "refactor: remove Brain Health Education Card from home screen"
```

---

### Task 2: Fix Habit Reminder Red-Flag Copy

**Files:**
- Modify: `functions/src/notifications/habitReminders.js`

- [ ] **Step 1: Fix the notification copy**

Find (around line 120-121):
```javascript
              title: "Habit Reminder",
              body: `Don't forget to complete "${habitName}" today!`,
```

Replace with:
```javascript
              title: `Time for ${habitName}`,
              body: `Your ${habitName} reminder is ready whenever you are.`,
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/notifications/habitReminders.js
git commit -m "fix: replace red-flag habit reminder copy with brand-aligned language"
```

---

### Task 3: Remove Goal Milestone Notification Strings

**Files:**
- Modify: `mobile/src/services/notificationScheduler.service.ts`

- [ ] **Step 1: Remove GOAL_MILESTONE_MESSAGES**

Find and remove the entire `GOAL_MILESTONE_MESSAGES` constant (around lines 81-86):

```typescript
const GOAL_MILESTONE_MESSAGES: Record<number, { title: string; body: string }> = {
  25: { title: 'A quarter of the way', body: 'Your goal is taking shape. Nice work so far.' },
  50: { title: 'Halfway to your goal', body: 'You\'ve made real progress. Take a moment to appreciate that.' },
  75: { title: 'Three-quarters complete', body: 'Your goal is well within reach.' },
  100: { title: 'Goal complete', body: 'You did it. That\'s worth celebrating.' },
};
```

- [ ] **Step 2: Remove any function that uses GOAL_MILESTONE_MESSAGES**

Search the file for any function that references `GOAL_MILESTONE_MESSAGES` and remove the usage. If the function does other things too, only remove the goal milestone branch. If it only sends goal milestones, remove the whole function.

- [ ] **Step 3: Do the same in Cloud Functions**

Check `functions/src/notifications/milestones.js` for goal milestone messages. If found, remove them but keep the time-based milestones (1 week, 1 month, 3 months).

- [ ] **Step 4: Commit**

```bash
git add mobile/src/services/notificationScheduler.service.ts functions/src/notifications/milestones.js
git commit -m "refactor: remove goal milestone notification strings"
```

---

### Task 4: Create Notification Tier Utility

**Files:**
- Create: `functions/src/notifications/notificationTier.js`

- [ ] **Step 1: Create the shared tier utility**

```javascript
/**
 * Notification De-Escalation Tier Logic
 *
 * Tiers based on lastActiveAt on user document:
 * - active: opened app within 3 days → max 1 notification/day
 * - cooling: 4-14 days since last open → max 3/week
 * - quiet: 15-29 days since last open → max 1/week, single approved string
 * - silent: 30+ days → 0 notifications
 */

const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

/**
 * Get the notification tier for a user.
 * @param {string} userId
 * @returns {Promise<{tier: string, allowed: boolean, maxPerDay: number}>}
 */
async function getNotificationTier(userId) {
  try {
    const userDoc = await admin.firestore()
        .collection("users")
        .doc(userId)
        .get();

    if (!userDoc.exists) {
      return {tier: "active", allowed: true, maxPerDay: 1};
    }

    const lastActiveAt = userDoc.data().lastActiveAt;
    if (!lastActiveAt) {
      return {tier: "active", allowed: true, maxPerDay: 1};
    }

    const lastActiveMs = lastActiveAt.toMillis
        ? lastActiveAt.toMillis()
        : new Date(lastActiveAt).getTime();
    const daysSinceActive = Math.floor(
        (Date.now() - lastActiveMs) / (1000 * 60 * 60 * 24),
    );

    if (daysSinceActive <= 3) {
      return {tier: "active", allowed: true, maxPerDay: 1};
    } else if (daysSinceActive <= 14) {
      return {tier: "cooling", allowed: true, maxPerDay: 0.43}; // ~3/week
    } else if (daysSinceActive <= 29) {
      return {tier: "quiet", allowed: true, maxPerDay: 0.14}; // ~1/week
    } else {
      return {tier: "silent", allowed: false, maxPerDay: 0};
    }
  } catch (err) {
    logger.warn("Error checking notification tier:", err.message);
    return {tier: "active", allowed: true, maxPerDay: 1};
  }
}

/**
 * Check if a notification should be sent based on tier and recent send count.
 * Uses notificationLog to count recent sends.
 * @param {string} userId
 * @param {string} category - e.g., 'dailyRhythm', 'insights', 'milestones', 'habitReminder'
 * @returns {Promise<{allowed: boolean, tier: string, reason: string}>}
 */
async function shouldSendNotification(userId, category) {
  const {tier, allowed} = await getNotificationTier(userId);

  if (!allowed) {
    return {allowed: false, tier, reason: "silent tier - no notifications"};
  }

  const db = admin.firestore();
  const now = new Date();

  if (tier === "active") {
    // Max 1/day across all categories
    const todayStr = now.toISOString().split("T")[0];
    const todayLogs = await db
        .collection(`notificationLog/${userId}/dailyRhythm`)
        .where("sentAt", ">=", admin.firestore.Timestamp.fromDate(
            new Date(todayStr + "T00:00:00Z"),
        ))
        .limit(1)
        .get();

    // Check other categories too
    const habitLogs = await db
        .collection(`notificationLog/${userId}/habitReminder`)
        .where("sentAt", ">=", admin.firestore.Timestamp.fromDate(
            new Date(todayStr + "T00:00:00Z"),
        ))
        .limit(1)
        .get();

    if (!todayLogs.empty || !habitLogs.empty) {
      return {allowed: false, tier, reason: "active tier - already sent today"};
    }
    return {allowed: true, tier, reason: "active tier - ok"};
  }

  if (tier === "cooling") {
    // Max 3/week
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekLogs = await db
        .collectionGroup("notificationLog")
        .where("sentAt", ">=", admin.firestore.Timestamp.fromDate(weekAgo))
        .limit(4)
        .get();

    // Filter to this user's logs
    const userLogs = weekLogs.docs.filter((d) =>
      d.ref.path.startsWith(`notificationLog/${userId}/`),
    );

    if (userLogs.length >= 3) {
      return {allowed: false, tier, reason: "cooling tier - 3/week limit reached"};
    }
    return {allowed: true, tier, reason: "cooling tier - ok"};
  }

  if (tier === "quiet") {
    // Max 1/week, special copy only
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000);
    const weekLogs = await db
        .collectionGroup("notificationLog")
        .where("sentAt", ">=", admin.firestore.Timestamp.fromDate(weekAgo))
        .limit(2)
        .get();

    const userLogs = weekLogs.docs.filter((d) =>
      d.ref.path.startsWith(`notificationLog/${userId}/`),
    );

    if (userLogs.length >= 1) {
      return {allowed: false, tier, reason: "quiet tier - 1/week limit reached"};
    }
    return {allowed: true, tier, reason: "quiet tier - ok"};
  }

  return {allowed: true, tier, reason: "unknown tier - allowing"};
}

/**
 * Get the quiet-tier notification content (single approved message).
 */
function getQuietTierMessage() {
  return {
    title: "Vara",
    body: "Vara is here whenever you're ready.",
  };
}

module.exports = {
  getNotificationTier,
  shouldSendNotification,
  getQuietTierMessage,
};
```

- [ ] **Step 2: Commit**

```bash
git add functions/src/notifications/notificationTier.js
git commit -m "feat: add notification de-escalation tier utility"
```

---

### Task 5: Add Tier Checks to All Scheduled Cloud Functions

**Files:**
- Modify: `functions/src/notifications/dailyRhythm.js`
- Modify: `functions/src/notifications/insights.js`
- Modify: `functions/src/notifications/milestones.js`
- Modify: `functions/src/notifications/habitReminders.js`

- [ ] **Step 1: Add tier check to dailyRhythm.js**

Add import at top:
```javascript
const {shouldSendNotification, getQuietTierMessage} = require("./notificationTier");
```

Inside the `for (const prefDoc of prefsSnapshot.docs)` loop, after the quiet hours and dedup checks but before sending, add:

```javascript
      // Check notification tier
      const tierResult = await shouldSendNotification(userId, "dailyRhythm");
      if (!tierResult.allowed) {
        skipped++;
        continue;
      }

      // Use quiet-tier message if applicable
      let notification;
      if (tierResult.tier === "quiet") {
        notification = getQuietTierMessage();
      } else {
        // existing message selection logic
```

Close the else block after the existing message selection, before the `sendNotification` call.

- [ ] **Step 2: Add tier check to insights.js**

Same pattern: import the utility, add tier check before sending, use quiet message if quiet tier.

- [ ] **Step 3: Add tier check to milestones.js**

Same pattern. Note: milestones in quiet tier should still use the quiet message, not the milestone message.

- [ ] **Step 4: Add tier check to habitReminders.js**

Same pattern. Habit reminders in quiet tier use the quiet message.

- [ ] **Step 5: Commit**

```bash
git add functions/src/notifications/dailyRhythm.js functions/src/notifications/insights.js functions/src/notifications/milestones.js functions/src/notifications/habitReminders.js
git commit -m "feat: add notification tier de-escalation to all scheduled Cloud Functions"
```

---

### Task 6: Deploy and Verify

- [ ] **Step 1: Deploy Cloud Functions**

```bash
cd C:/Users/kyler/wellness-app && npx firebase deploy --only functions:api
```

- [ ] **Step 2: Verify education card removed**

```bash
grep -n "BrainHealthEducationCard" mobile/src/screens/DashboardScreen.tsx
```
Expected: No matches.

- [ ] **Step 3: Verify no red-flag notification copy**

```bash
grep -rn "Don't forget\|You haven't\|Get back on track\|falling behind\|don't miss\|hurry" functions/src/notifications/ mobile/src/services/notification*
```
Expected: No matches.

- [ ] **Step 4: Verify goal milestone strings removed**

```bash
grep -n "GOAL_MILESTONE" mobile/src/services/notificationScheduler.service.ts
```
Expected: No matches.

- [ ] **Step 5: Verify tier utility exists**

```bash
ls functions/src/notifications/notificationTier.js
```
Expected: File exists.

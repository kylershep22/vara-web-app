# Security Phase 2 Remediation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 5 pre-launch security findings from Phase 2: wire up dead sanitization code on community write paths (C4), move hardcoded Firebase config to env vars (C5), expand `isActiveUser()` to all community write rules (H1), restrict group member update fields (H2), and add input validation to Cloud Functions API handlers (H6).

**Architecture:** C4 adds `sanitizeText()`/`sanitizeTitle()` calls at the service layer before Firestore writes. C5 replaces hardcoded config with `REACT_APP_*` env vars. H1/H2 are Firestore rules changes. H6 adds a shared `sanitizeString` helper to Cloud Functions and applies it to all user-supplied inputs before they reach OpenAI prompts.

**Tech Stack:** Firestore Security Rules, React, Express.js, Firebase Cloud Functions v2

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `src/firebase.js` | Replace hardcoded config with env vars (C5) |
| Modify | `src/services/communityService.js` | Sanitize post content, group names, comments on write (C4) |
| Modify | `src/services/db/community.service.js` | Sanitize group/post fields on write (C4) |
| Modify | `src/services/db/profiles.service.js` | Sanitize displayName/bio on write (C4) |
| Modify | `src/services/messagingService.js` | Sanitize message text on write (C4) |
| Modify | `firestore.rules:259-291` | Add `isActiveUser()` to group create/update/delete (H1) |
| Modify | `firestore.rules:267-282` | Restrict group member updates to safe fields (H2) |
| Modify | `functions/index.js:543-894` | Add input sanitization to all API handlers (H6) |

---

### Task 1: Move Firebase config to env vars (C5)

**Files:**
- Modify: `src/firebase.js`

The Firebase config is hardcoded with the actual API key, project ID, etc. The `.env.example` already defines the `REACT_APP_*` variables. We need to read from env vars with no fallback.

- [ ] **Step 1: Replace hardcoded config with env vars**

In `src/firebase.js`, replace lines 10-17:

```javascript
const firebaseConfig = {
  apiKey: "AIzaSyB_RQJh0cMU3ruEm3vAY1uSKIk7vPlY6lc",
  authDomain: "vara-4a99f.firebaseapp.com",
  projectId: "vara-4a99f",
  storageBucket: "vara-4a99f.firebasestorage.app",
  messagingSenderId: "621980275569",
  appId: "1:621980275569:web:10a8fe77b202ac97575cd0",
};
```

With:

```javascript
const firebaseConfig = {
  apiKey: process.env.REACT_APP_FIREBASE_API_KEY,
  authDomain: process.env.REACT_APP_FIREBASE_AUTH_DOMAIN,
  projectId: process.env.REACT_APP_FIREBASE_PROJECT_ID,
  storageBucket: process.env.REACT_APP_FIREBASE_STORAGE_BUCKET,
  messagingSenderId: process.env.REACT_APP_FIREBASE_MESSAGING_SENDER_ID,
  appId: process.env.REACT_APP_FIREBASE_APP_ID,
};
```

> **Important:** The app will only work if `.env.local` (or `.env`) has these values set. They are already in `.env.local` per the existing setup. Do NOT add fallback values — that would defeat the purpose of this fix.

- [ ] **Step 2: Commit**

```bash
git add src/firebase.js
git commit -m "fix(security): move Firebase config to env vars, remove hardcoded credentials (C5)"
```

---

### Task 2: Wire up sanitization on community write paths (C4)

**Files:**
- Modify: `src/services/communityService.js`
- Modify: `src/services/db/community.service.js`
- Modify: `src/services/messagingService.js`

The sanitization utilities in `src/utils/sanitization.js` exist but are never imported. We need to apply them at the service layer before writing to Firestore.

- [ ] **Step 1: Sanitize posts and groups in communityService.js**

In `src/services/communityService.js`, add import at top:
```javascript
import { sanitizeText, sanitizeTitle } from '../utils/sanitization';
```

Find the `createPost` function (around line 100-117). Before the `addDoc` call, sanitize the content and title fields. Find where `postData` is constructed and wrap the text fields:

Change `content` and any title fields to use sanitization:
- `content: sanitizeText(content)` (where `content` is the post content parameter)
- Any `title` field: `sanitizeTitle(title)`

Find the `createGroup` function (around line 225-242). Sanitize group name and description:
- `name: sanitizeText(name)` or `sanitizeTitle(name)`
- `description: sanitizeText(description)`

Find `addComment` (around line 179-186). Sanitize the comment text before adding to the array.

- [ ] **Step 2: Sanitize in db/community.service.js**

In `src/services/db/community.service.js`, add import at top:
```javascript
import { sanitizeText, sanitizeTitle } from '../../utils/sanitization';
```

In the `createGroup` function, sanitize the `name` and `description` fields before they hit the `addDoc`:
```javascript
name: sanitizeTitle(payload.name) || "",
description: sanitizeText(payload.description) || "",
```

In the `createPost` function, sanitize the `content` field:
```javascript
content: sanitizeText(payload.content) || "",
```

- [ ] **Step 3: Sanitize messages in messagingService.js**

In `src/services/messagingService.js`, add import at top:
```javascript
import { sanitizeText } from '../utils/sanitization';
```

Find where messages are written to Firestore (the `sendMessage` or `addDoc` for directMessages). Wrap the message text field with `sanitizeText()`.

- [ ] **Step 4: Commit**

```bash
git add src/services/communityService.js src/services/db/community.service.js src/services/messagingService.js
git commit -m "fix(security): wire up sanitization on community write paths (C4)"
```

---

### Task 3: Sanitize profile writes (C4 continued)

**Files:**
- Modify: `src/services/db/profiles.service.js` (if it exists) or the profile update path

- [ ] **Step 1: Find and sanitize profile update path**

Search for where user profile updates happen (displayName, bio). This may be in `src/services/db/profiles.service.js` or `src/services/userService.js` or directly in a profile edit component.

Add import:
```javascript
import { sanitizeText, sanitizeBio } from '../../utils/sanitization';
```

Wrap `displayName` with `sanitizeText()` and `bio` with `sanitizeBio()` before the `updateDoc` call.

- [ ] **Step 2: Commit**

```bash
git add -A src/services/
git commit -m "fix(security): sanitize profile displayName and bio on write (C4)"
```

---

### Task 4: Expand isActiveUser() to all community write rules (H1)

**Files:**
- Modify: `firestore.rules:259-291` (groups section)

Currently `isActiveUser()` is only on posts create, challenges, connections, conversations, and direct messages. It's missing from: group create, group update, group delete, post update (likes/comments), and post delete.

- [ ] **Step 1: Add isActiveUser() to group create**

Find group create rule (around line 261):
```
      allow create: if isAuthenticated() && (
```
Change to:
```
      allow create: if isAuthenticated() && isActiveUser() && (
```

- [ ] **Step 2: Add isActiveUser() to group update**

Find group update rule (around line 269):
```
      allow update: if isAuthenticated() && (
```
Change to:
```
      allow update: if isAuthenticated() && isActiveUser() && (
```

- [ ] **Step 3: Add isActiveUser() to group delete**

Find group delete rule (around line 286):
```
      allow delete: if isAuthenticated() && (
```
Change to:
```
      allow delete: if isAuthenticated() && isActiveUser() && (
```

- [ ] **Step 4: Add isActiveUser() to post update**

Find post update rule (around line 318):
```
      allow update: if isAuthenticated() && (
```
Change to:
```
      allow update: if isAuthenticated() && isActiveUser() && (
```

- [ ] **Step 5: Add isActiveUser() to post delete**

Find post delete rule (around line 329):
```
      allow delete: if isAuthenticated() && (
```
Change to:
```
      allow delete: if isAuthenticated() && isActiveUser() && (
```

- [ ] **Step 6: Commit**

```bash
git add firestore.rules
git commit -m "fix(security): expand isActiveUser() to all community write rules (H1)"
```

---

### Task 5: Restrict group member update fields (H2)

**Files:**
- Modify: `firestore.rules:267-282` (group update rule)

Currently group members have full update access. They can change name, visibility, ownerId, remove other members. Members should only be able to modify `members`, `memberCount`, and `updatedAt`.

- [ ] **Step 1: Add field restriction to member update path**

In `firestore.rules`, find the group update rule. The current member path (around line 275) is:

```
        // Existing members can update (for leaving, etc.)
        request.auth.uid in resource.data.members ||
```

Replace with a field-restricted version:

```
        // Existing members can only update member-related fields (join/leave)
        (request.auth.uid in resource.data.members &&
         request.resource.data.diff(resource.data).affectedKeys()
           .hasOnly(['members', 'memberCount', 'updatedAt'])) ||
```

This ensures members can only modify the members array (join/leave), memberCount, and updatedAt. They cannot change name, visibility, ownerId, or other group metadata.

- [ ] **Step 2: Commit**

```bash
git add firestore.rules
git commit -m "fix(security): restrict group member updates to member-related fields only (H2)"
```

---

### Task 6: Add input sanitization to Cloud Functions API handlers (H6)

**Files:**
- Modify: `functions/index.js`

User strings are interpolated directly into OpenAI prompts with no sanitization. The Express backend has validation middleware but Cloud Functions don't share it. We'll add a simple `sanitizeString` helper and apply it to all user inputs.

- [ ] **Step 1: Add sanitizeString helper**

In `functions/index.js`, add a helper function after the `makeOpenAI()` function (around line 46):

```javascript
/**
 * Sanitize user input for safe interpolation into prompts.
 * Strips HTML, trims, and limits length.
 */
function sanitizeInput(str, maxLength = 2000) {
  if (typeof str !== "string") return "";
  return str.replace(/<[^>]*>/g, "").trim().slice(0, maxLength);
}
```

- [ ] **Step 2: Apply to handleJournalSummary**

In `handleJournalSummary` (around line 548), after extracting `entries` from request body, sanitize:

```javascript
  const rawEntries = req.body?.entries;
  const instruction = sanitizeInput(req.body?.instruction || "", 500);

  const entries = typeof rawEntries === "string"
    ? sanitizeInput(rawEntries, 10000)
    : Array.isArray(rawEntries)
      ? rawEntries.map((e) => sanitizeInput(String(e), 2000)).join("\n")
      : "";
```

Replace the existing `const {entries, type, guardrails, instruction} = req.body || {};` and update the prompt construction to use the sanitized variables.

- [ ] **Step 3: Apply to handleAIChat**

In `handleAIChat` (around line 597), sanitize the messages array content:

After `const {messages = [], context = {}} = req.body || {};`, add:

```javascript
    const sanitizedMessages = messages.slice(-20).map((m) => ({
      role: ["user", "assistant"].includes(m.role) ? m.role : "user",
      content: sanitizeInput(m.content, 4000),
    }));
```

Then use `sanitizedMessages` instead of `messages` when building the history array (line 674).

- [ ] **Step 4: Apply to handleOpenAISuggestions**

In `handleOpenAISuggestions` (around line 705), sanitize `context` and `modifier`:

```javascript
  const type = sanitizeInput(req.body?.type || "", 50);
  const context = sanitizeInput(req.body?.context || "", 1000);
  const modifier = sanitizeInput(req.body?.modifier || "", 500);
```

Replace the existing `const {type, context, modifier = ""} = req.body || {};`.

- [ ] **Step 5: Apply to handleJournalPrompt**

In `handleJournalPrompt` (around line 755), sanitize `prompt`:

```javascript
  const prompt = sanitizeInput(req.body?.prompt || "", 1000);
```

Replace the existing `const {prompt, brainFocused} = req.body || {};`. Keep `brainFocused` extraction separately: `const brainFocused = !!req.body?.brainFocused;`.

- [ ] **Step 6: Apply to handleGenerateDailyPlan**

In `handleGenerateDailyPlan` (around line 805), sanitize the input fields:

```javascript
  const goals = Array.isArray(req.body?.goals)
    ? req.body.goals.map((g) => sanitizeInput(String(g), 500))
    : [];
  const habits = Array.isArray(req.body?.habits)
    ? req.body.habits.map((h) => sanitizeInput(String(h), 500))
    : [];
  const tasks = Array.isArray(req.body?.tasks)
    ? req.body.tasks.map((t) => sanitizeInput(String(t), 500))
    : [];
```

- [ ] **Step 7: Apply to handleWeekRecapSuggestions (if exists)**

Check if `handleWeekRecapSuggestions` exists and apply similar sanitization to its inputs.

- [ ] **Step 8: Commit**

```bash
git add functions/index.js
git commit -m "fix(security): add input sanitization to all Cloud Functions API handlers (H6)"
```

---

### Task 7: Verify all fixes

**Files:**
- No changes

- [ ] **Step 1: Run Firestore security rules tests**

Run: `npm run test:rules`
Expected: All tests pass.

- [ ] **Step 2: Verify frontend starts**

Run: `npm start`
Expected: App loads correctly (Firebase config reads from env vars).

- [ ] **Step 3: Syntax check backend and functions**

Run: `cd backend && node -c server.js && cd ../functions && node -c index.js`
Expected: No errors.

- [ ] **Step 4: Final commit**

```bash
git add -A
git commit -m "fix(security): phase 2 security remediation complete"
```

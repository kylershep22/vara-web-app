# Security Phase 1 Remediation

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Fix the 5 highest-priority security findings (C1+C2 privilege escalation, C3 unauthenticated callables, H5 system role injection, H7 open CORS, H10 dead API route) identified in the pre-launch security audit.

**Architecture:** All fixes are isolated single-file changes. The Firestore rules fix (C1+C2) blocks users from writing admin-controlled fields on their own document. The callable auth fix (C3) adds `request.auth` guards. The remaining three are one-line changes or file deletions.

**Tech Stack:** Firestore Security Rules, Firebase Cloud Functions v2, Express.js middleware

---

## File Structure

| Action | File | Responsibility |
|--------|------|----------------|
| Modify | `firestore.rules:78` | Block users from writing `role`, `moderationStatus`, `suspendedUntil` on own doc (C1+C2) |
| Modify | `functions/index.js:161,212` | Add auth checks to `generateHabitSuggestions` and `generateDailyPlan` (C3) |
| Modify | `backend/middleware/validate.js:43` | Remove `system` from allowed AI chat roles (H5) |
| Modify | `functions/index.js:441` | Replace `cors: true` with explicit origin list (H7) |
| Delete | `src/pages/api/openai.js` | Remove dead Next.js-style API route (H10) |

---

### Task 1: Block privilege escalation on user document (C1 + C2)

**Files:**
- Modify: `firestore.rules:78`

This is the most critical fix. Currently, a user updating their own profile (line 78: `allow update: if request.auth.uid == userId`) has no field restrictions. They can write `role: 'admin'` or `moderationStatus: 'active'` to their own document.

- [ ] **Step 1: Add field exclusion guard to owner update rule**

In `firestore.rules`, find the user document update rule (line 78):

```
      allow update: if request.auth.uid == userId
        || (isAdmin() && request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['role', 'moderationStatus', 'suspendedUntil', 'updatedAt']));
```

Replace with:

```
      allow update: if (request.auth.uid == userId
            && !request.resource.data.diff(resource.data).affectedKeys()
                .hasAny(['role', 'moderationStatus', 'suspendedUntil']))
        || (isAdmin() && request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['role', 'moderationStatus', 'suspendedUntil', 'updatedAt']));
```

This ensures:
- **Owner path:** User can update their own doc BUT cannot touch `role`, `moderationStatus`, or `suspendedUntil`
- **Admin path:** Admins can ONLY modify `role`, `moderationStatus`, `suspendedUntil`, and `updatedAt`

- [ ] **Step 2: Run Firestore rules tests to verify**

Run: `npm run test:rules`
Expected: All existing tests pass. If the test suite has a test for user self-update, it should still pass as long as it doesn't try to write `role`.

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "fix(security): block users from writing role/moderationStatus on own doc (C1+C2)"
```

---

### Task 2: Add auth checks to unprotected callable functions (C3)

**Files:**
- Modify: `functions/index.js:161-204,212-260`

Both `generateHabitSuggestions` and `generateDailyPlan` are `onCall` functions that don't check `request.auth`. Any unauthenticated caller can invoke them and consume OpenAI API credits.

- [ ] **Step 1: Add auth guard to generateHabitSuggestions**

In `functions/index.js`, find `exports.generateHabitSuggestions` (line 161). Inside the async handler, immediately after `async (request) => {`, add before the existing `const {goal} = request.data || {};` line:

```javascript
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be logged in.");
      }
```

- [ ] **Step 2: Add auth guard to generateDailyPlan**

Find `exports.generateDailyPlan` (line 212). Inside the async handler, immediately after `async (request) => {`, add before the existing `const {name, preferences, mood, goals, modifier} = request.data || {};` line:

```javascript
      if (!request.auth) {
        throw new HttpsError("unauthenticated", "Must be logged in.");
      }
```

- [ ] **Step 3: Commit**

```bash
git add functions/index.js
git commit -m "fix(security): add auth checks to generateHabitSuggestions and generateDailyPlan (C3)"
```

---

### Task 3: Remove system role from AI chat validation (H5)

**Files:**
- Modify: `backend/middleware/validate.js:43`

The `validateAIChat` middleware allows clients to send messages with `role: 'system'`, enabling prompt injection by overriding the system instructions.

- [ ] **Step 1: Remove system from validRoles**

In `backend/middleware/validate.js`, find line 43:

```javascript
  const validRoles = ['user', 'assistant', 'system'];
```

Replace with:

```javascript
  const validRoles = ['user', 'assistant'];
```

This means any message with `role: 'system'` sent by a client will be remapped to `role: 'user'` by line 45 (`validRoles.includes(m.role) ? m.role : 'user'`).

- [ ] **Step 2: Commit**

```bash
git add backend/middleware/validate.js
git commit -m "fix(security): remove system from allowed AI chat roles (H5)"
```

---

### Task 4: Replace open CORS with explicit origins (H7)

**Files:**
- Modify: `functions/index.js:441`

The unified API endpoint uses `cors: true` which accepts requests from any origin. The handler has manual CORS headers restricting to specific origins (lines 447-459), but the Firebase `cors: true` setting overrides this by sending permissive headers before the handler runs.

- [ ] **Step 1: Replace cors: true with explicit origin list**

In `functions/index.js`, find the `exports.api` options (line 439-444):

```javascript
exports.api = onRequest(
    {
      cors: true,
      secrets: [OPENAI_API_KEY],
      timeoutSeconds: 120,
    },
```

Replace `cors: true` with the explicit origin list:

```javascript
exports.api = onRequest(
    {
      cors: ["https://vara-4a99f.web.app", "https://vara-4a99f.firebaseapp.com"],
      secrets: [OPENAI_API_KEY],
      timeoutSeconds: 120,
    },
```

- [ ] **Step 2: Commit**

```bash
git add functions/index.js
git commit -m "fix(security): replace cors: true with explicit origins on unified API (H7)"
```

> **Note:** Tasks 2 and 4 both modify `functions/index.js`. Task 2 touches callable functions (lines 161, 212) while Task 4 touches the API handler config (line 441). They affect different parts of the file and will not conflict, but they must be committed sequentially.

---

### Task 5: Delete dead OpenAI API route (H10)

**Files:**
- Delete: `src/pages/api/openai.js`

This is a dead Next.js-style API route that imports the OpenAI SDK directly. It's never called by the React app (which uses `backend/server.js` instead), but its existence is a risk — if env var naming ever changes, it could accidentally expose the API key.

- [ ] **Step 1: Verify the file is not imported anywhere**

Search the codebase for any imports of this file:
```bash
grep -r "pages/api/openai" src/ --include="*.js" --include="*.jsx"
```
Expected: No results.

- [ ] **Step 2: Delete the file**

```bash
rm src/pages/api/openai.js
```

- [ ] **Step 3: Remove the parent directory if empty**

```bash
rmdir src/pages/api 2>/dev/null || true
```

- [ ] **Step 4: Commit**

```bash
git add -A src/pages/api/
git commit -m "fix(security): delete dead Next.js-style OpenAI API route (H10)"
```

---

### Task 6: Verify all fixes

**Files:**
- No changes

- [ ] **Step 1: Run Firestore security rules tests**

Run: `npm run test:rules`
Expected: All tests pass. The privilege escalation fix (Task 1) should not break existing tests unless a test tries to write `role` as a regular user.

- [ ] **Step 2: Lint Cloud Functions**

Run: `cd functions && npx eslint index.js 2>&1 | head -20`
Expected: No new errors from our changes.

- [ ] **Step 3: Syntax check backend**

Run: `cd backend && node -c server.js && node -c middleware/validate.js`
Expected: No errors.

- [ ] **Step 4: Verify dead file is gone**

Run: `ls src/pages/api/openai.js 2>&1`
Expected: "No such file or directory"

- [ ] **Step 5: Final commit (if any remaining changes)**

```bash
git add -A
git commit -m "fix(security): phase 1 security remediation complete"
```

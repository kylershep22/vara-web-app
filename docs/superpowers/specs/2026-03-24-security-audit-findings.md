# Pre-Launch Security Audit — Findings & Remediation Plan

**Date:** 2026-03-24
**Branch:** feature/admin-dashboard
**Audited by:** Three parallel review agents (Firestore Rules, Frontend, Backend/Cloud Functions)

---

## Executive Summary

The app has a solid security foundation (Firebase Auth, Firestore rules with 890+ lines of coverage, backend middleware with helmet/CORS/rate-limiting, auth on all Express endpoints). However, the audit identified **5 critical**, **11 high**, **11 medium**, and **6 low** severity issues. The most urgent: any authenticated user can promote themselves to admin by writing `role: 'admin'` to their own user document — a single-edit fix that closes 2 of the 5 critical issues.

---

## CRITICAL — Must Fix Before Launch

### C1. Users can set their own `role` to `admin` (Privilege Escalation)
- **File:** `firestore.rules` line 78
- **Root cause:** The owner update path (`request.auth.uid == userId`) has no field restrictions. A user updating their own profile can include `role: 'admin'`.
- **Fix:** Add field exclusion guard to owner update path:
  ```
  allow update: if request.auth.uid == userId
    && !request.resource.data.diff(resource.data).affectedKeys()
        .hasAny(['role', 'moderationStatus', 'suspendedUntil'])
  ```

### C2. Users can clear their own suspension (Moderation Bypass)
- **File:** `firestore.rules` line 78
- **Root cause:** Same as C1. A suspended user can set `moderationStatus: 'active'` on their own doc.
- **Fix:** Same fix as C1 — the field exclusion guard blocks both vectors.

### C3. `generateHabitSuggestions` and `generateDailyPlan` callables missing auth check
- **File:** `functions/index.js` lines 160, 211
- **Root cause:** Neither `onCall` function checks `request.auth`. Any unauthenticated caller can invoke them and consume OpenAI API credits.
- **Fix:** Add `if (!request.auth) throw new HttpsError("unauthenticated", "Must be logged in.");` at the top of both functions.

### C4. Sanitization utilities are dead code — community UGC rendered unsanitized
- **Files:** `src/utils/sanitization.js` (never imported), `src/utils/validation.js` (never imported)
- **Root cause:** Comprehensive sanitization and validation modules were written but never wired into any component or service. All post content, comments, display names, and bios go unsanitized on the write path.
- **Impact:** While React JSX escapes HTML by default (preventing basic `<script>` injection), there's no protection against NoSQL injection via search inputs, no length/content validation on writes, and no defense if rendering changes in the future.
- **Fix:** Import and apply `sanitizeText()` on all user-generated text fields before writing to Firestore. Wire up validation schemas on form submissions.

### C5. Firebase config with API key hardcoded in source
- **File:** `src/firebase.js` line 11
- **Root cause:** Config is hardcoded despite comments saying to use env vars. API key is in git history.
- **Note:** Firebase API keys are designed to be public (restricted by domain + security rules), but exposure of project ID enables enumeration. Combined with no Firebase App Check, unauthenticated abuse is possible.
- **Fix:** Move config to `REACT_APP_*` env vars. Verify API key restrictions in GCP Console. Consider enabling Firebase App Check.

---

## HIGH — Should Fix Before Launch

### H1. `isActiveUser()` not enforced on most write operations
- **File:** `firestore.rules`
- **Detail:** Only applied to posts, connections, conversations, directMessages, and challenges. Missing from: group creation/updates, post updates (likes/comments), post deletion, connection updates, group/challenge invite creation, notification updates.
- **Fix:** Add `isActiveUser()` to all community-facing write rules.

### H2. Group members can modify any group field
- **File:** `firestore.rules` lines 267-280
- **Detail:** Members get full update access. Can change name, visibility, ownerId, remove other members.
- **Fix:** Restrict member updates to `['members', 'memberCount', 'updatedAt']` using `affectedKeys().hasOnly()`.

### H3. Any authenticated user can manipulate post likes/comments arrays
- **File:** `firestore.rules` lines 316-323
- **Detail:** Non-group-members can interact with private group posts. Users can inject/remove other users' comments or fake likes.
- **Fix:** Restrict to group members for group posts. Validate that only the auth user's UID is added/removed from likes.

### H4. Connection creation allows impersonation
- **File:** `firestore.rules` lines 562-568
- **Detail:** Create rule uses OR across `a`, `b`, `requesterId`, `requester`, `participants`. A user can set another UID as requester.
- **Fix:** Tighten to require auth user is specifically the requester/initiator field.

### H5. `system` role allowed in client AI chat messages
- **File:** `backend/middleware/validate.js` line 43
- **Detail:** `validRoles = ['user', 'assistant', 'system']` allows clients to inject system-level instructions.
- **Fix:** Remove `system` from allowed roles: `['user', 'assistant']`.

### H6. Cloud Functions API handlers lack input validation
- **File:** `functions/index.js` lines 536-890
- **Detail:** User strings interpolated directly into OpenAI prompts with no sanitization. The Express backend has validation middleware but Cloud Functions don't share it.
- **Fix:** Extract validation logic into shared module or duplicate within Cloud Functions.

### H7. `cors: true` on Cloud Functions unified API
- **File:** `functions/index.js` line 440
- **Detail:** Accepts requests from any origin despite manual CORS headers inside the handler.
- **Fix:** Replace with explicit origin list: `cors: ["https://vara-4a99f.web.app", "https://vara-4a99f.firebaseapp.com"]`.

### H8. Rate limiting fails open on Firestore errors
- **File:** `functions/index.js` lines 131-135
- **Detail:** If Firestore is unavailable, rate limits are bypassed. Attacker could exploit during outage.
- **Fix:** Fail closed for AI endpoints specifically, or implement in-memory fallback counter.

### H9. Admin role management has no super-admin safeguard
- **Files:** `src/services/db/admin.service.js`, `firestore.rules` lines 78-80
- **Detail:** Any admin can grant admin to any user via client SDK. Single compromised admin = unlimited escalation.
- **Fix:** Move role management to Cloud Functions with audit logging. Consider super-admin tier or two-admin approval.

### H10. `src/pages/api/openai.js` exists in frontend
- **File:** `src/pages/api/openai.js`
- **Detail:** Dead Next.js-style API route that imports OpenAI SDK. Risk of accidental key exposure if env var naming changes.
- **Fix:** Delete the file entirely. All OpenAI calls go through `backend/server.js`.

### H11. User document reads allow email/role/subscription enumeration
- **File:** `firestore.rules` line 73
- **Detail:** `allow read: if isAuthenticated()` means any logged-in user can read all users' full profiles including email, role, moderationStatus, subscription type.
- **Fix:** Restrict non-admin reads to public profile fields only, or add field-level read filtering.

---

## MEDIUM — Fix Soon After Launch

| # | Finding | File(s) |
|---|---------|---------|
| M1 | No field validation on personal data creates (goals, habits, tasks) | `firestore.rules` |
| M2 | Group ownership hijackable via multiple owner fields (ownerId/createdBy/creatorId) | `firestore.rules` lines 39-44 |
| M3 | `connectionInvites` update rule too permissive — sender can redirect invites | `firestore.rules` lines 533-537 |
| M4 | `groupInvites` create lacks group membership validation | `firestore.rules` line 480 |
| M5 | No client-side write rate limiting for posts, messages, reports | `firestore.rules` |
| M6 | Callable functions (`generateHabitSuggestions`, `generateDailyPlan`) bypass rate limiting | `functions/index.js` lines 160, 211 |
| M7 | ReDoS risk from admin-managed regex patterns in moderation blocklist | `functions/src/admin/moderation.js` line 59 |
| M8 | Journal entries (health/mental health data) sent raw to OpenAI — PII concern | `backend/server.js` line 140 |
| M9 | 249 raw `console.log/warn/error` statements across 81 files (some log sensitive context) | `src/` throughout |
| M10 | No Content Security Policy headers on frontend (Firebase Hosting) | `firebase.json` |
| M11 | `gpt-4` model used in `habitSuggestionService.js` (cost risk vs `gpt-4o-mini` elsewhere) | `backend/services/habitSuggestionService.js` line 41 |

---

## LOW — Address When Convenient

| # | Finding |
|---|---------|
| L1 | Profile privacy (`canReadProfile()`) defined but not enforced in rules — app-layer only |
| L2 | Challenge participants/check-ins readable by all authenticated users (even non-members) |
| L3 | Group prompts readable by all users (including private group prompts) |
| L4 | External avatar service (`ui-avatars.com`) leaks display names to third party |
| L5 | Subscription paywall commented out (expected for beta — re-enable at launch) |
| L6 | `ProtectedRoute` fails open on onboarding check error |

---

## Positive Findings

Things done well:
- Firestore rules are comprehensive (890+ lines) with good personal data isolation
- DOMPurify used correctly in Journal with restrictive allowlist
- Express backend uses helmet(), origin-restricted CORS, rate limiting, auth middleware
- Auth state management uses Firebase `onAuthStateChanged` correctly
- AdminRoute uses real-time listener — role revocation takes effect immediately
- Password validation requires 8+ chars with uppercase, lowercase, digit
- ErrorBoundary hides stack traces in production
- Cloud Functions use `defineSecret()` for OpenAI key management
- Backend returns generic error messages, doesn't leak internals

---

## Remediation Priority

### Phase 1 — Immediate (blocks launch)
1. Block users from writing `role`/`moderationStatus`/`suspendedUntil` on own doc (C1 + C2)
2. Add auth checks to unprotected callable functions (C3)
3. Remove `system` from allowed AI chat roles (H5)
4. Replace `cors: true` with explicit origins (H7)
5. Delete `src/pages/api/openai.js` (H10)

### Phase 2 — Pre-launch (strong recommendation)
6. Wire up sanitization/validation utilities on write paths (C4)
7. Move Firebase config to env vars (C5)
8. Expand `isActiveUser()` to all community write rules (H1)
9. Add field restrictions to group member updates (H2)
10. Add input validation to Cloud Functions API handlers (H6)

### Phase 3 — Post-launch
11. All MEDIUM items (M1-M11)
12. All LOW items (L1-L6)

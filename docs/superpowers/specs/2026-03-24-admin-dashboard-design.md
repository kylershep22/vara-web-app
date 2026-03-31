# Admin Dashboard - Design Spec

**Date:** 2026-03-24
**Branch:** feature/admin-dashboard
**Status:** Draft

---

## Overview

A Master Admin dashboard within the existing React web app, accessible only to users with an `admin` role. Provides high-level usage analytics, automated and manual community moderation, global challenge management, and user administration. Designed with a privacy-first principle: no access to individual user content (journal entries, AI chats, DMs), only aggregated analytics and moderation-relevant data.

---

## 1. Auth & Role System

### User Document Changes

Add to user documents:

```
role: 'user' | 'admin'          // default: 'user'
moderationStatus: 'active' | 'suspended' | 'banned'   // default: 'active'
suspendedUntil: Timestamp | null
```

### Bootstrap

The seed admin is bootstrapped server-side using a one-time Firebase Admin SDK script (not client-side env vars, to avoid exposing the UID in the JS bundle):

```bash
# One-time setup script (run locally or as a Cloud Function)
node scripts/bootstrap-admin.js <your-firebase-uid>
```

The script uses Admin SDK to set `role: 'admin'` on the specified user doc. After bootstrap, all subsequent admin management happens through the UI.

### Firestore Rules Helper

```javascript
function isAdmin() {
  return get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
}

function isActiveUser() {
  let userData = get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
  return userData.moderationStatus == null || userData.moderationStatus == 'active'
    || (userData.moderationStatus == 'suspended' && userData.suspendedUntil < request.time);
}
```

### User Document Rules Update

The existing user doc rules must be extended to allow admin writes for role and moderation fields:

```javascript
match /users/{userId} {
  // Existing: owner can read/write their own doc
  allow read: if request.auth.uid == userId || isAdmin();
  allow update: if request.auth.uid == userId
    || (isAdmin() && request.resource.data.diff(resource.data).affectedKeys()
        .hasOnly(['role', 'moderationStatus', 'suspendedUntil']));
}
```

This ensures admins can only modify role/moderation fields, not arbitrary user data.

### Web Route Protection

- `/admin` route checks user doc for `role === 'admin'` before rendering
- Non-admins redirected to `/dashboard`
- Sidebar shows admin link (shield icon + "Admin") only when `role === 'admin'`

### Admin Promotion/Demotion

- Only admins can set `role` field on other user docs
- Available in the Users tab: "Grant Admin" / "Revoke Admin"

---

## 2. Analytics & Data Aggregation

### Approach

Cloud Functions run on a nightly schedule and write pre-computed rollups to an `adminAnalytics` collection. The dashboard reads from these docs -- no expensive cross-collection queries at load time.

### Aggregation Strategy

Use **incremental aggregation** to control Firestore read costs:
- Each nightly run queries only documents created/updated since the last run (using `createdAt >= lastRunTimestamp`)
- A `adminAnalytics/meta` document tracks `lastRunAt` timestamp
- Full recount runs weekly (e.g., Sunday night) to correct any drift
- Estimated cost: ~1 read per new doc per day, vs. N*M reads for a full scan

### Collection: `adminAnalytics`

| Document ID | Contents | Update Frequency |
|---|---|---|
| `meta` | `lastRunAt` timestamp, run status | Every run |
| `daily/{YYYY-MM-DD}` | New signups, DAU, posts created, habits completed, journal entries created, library plays | Nightly |
| `rolling` | WAU, MAU, 7-day retention, 30-day retention, total users | Nightly |
| `featureAdoption` | % users with goals/habits/journal/tasks, avg habits per user, avg completion rates | Nightly |
| `communityVitals` | Active groups, avg posts per group, connection rates, challenge participation | Nightly |
| `contentPerformance` | Top sleep stories, breathwork, movement by play count and completion rate | Nightly |
| `moderationStats` | Open reports, auto-flags pending, actions taken (weekly/monthly breakdown), repeat offenders | Nightly + on moderation action |
| `subscriptionMetrics` | Active trials, paid users, expired, conversion rate (trial to paid over 7-day window), churn rate, revenue cohorts by signup week/month | Nightly |

### Subscription Analytics

Leverages existing subscription fields on user documents:
- `subscription.type`: `'trial'` | `'premium'` | `'coaching'` | `'expired'`
- `subscription.trialStartedAt`, `subscription.trialExpiresAt`
- `subscription.premiumStartedAt`, `subscription.premiumExpiresAt`
- `subscription.billingPeriod`: `'monthly'` | `'annual'`

Metrics computed:
- **Trial funnel:** New trials started, active trials, trials expiring soon
- **Conversion rate:** % of users converting from trial to paid within the 7-day window
- **Churn:** Paid users who cancelled, by timeframe
- **Revenue cohorts:** Conversion rate by signup week/month

Note: `premiumStartedAt` and `premiumExpiresAt` fields are defined in the subscription type interface but will only be populated when users upgrade from trial. The aggregation function handles missing fields gracefully (treats as not-yet-converted).

### Cloud Function: `aggregateAnalytics`

- Scheduled to run nightly (e.g., 3:00 AM)
- Reads `meta.lastRunAt` to determine incremental window
- Queries each collection for docs created/updated since last run
- Writes results to `adminAnalytics` docs
- Updates `meta.lastRunAt` on completion
- Uses Admin SDK (bypasses security rules)
- Timeout: 540s (max for Cloud Functions) to accommodate large datasets

### Firestore Rules

```javascript
match /adminAnalytics/{docId} {
  allow read: if isAdmin();
  allow write: if false; // Cloud Functions use Admin SDK
}
match /adminAnalytics/{collection}/{docId} {
  allow read: if isAdmin();
  allow write: if false;
}
```

---

## 3. Moderation Pipeline

Three-layer system: Keyword Filter -> AI Review -> Human Review

### Layer 1: Keyword Filter (Synchronous)

Cloud Function trigger on document create in `posts` collection.

**Blocklist storage:** `config/moderationBlocklist` Firestore doc:
- `exactMatch[]` -- Slurs, threats, specific banned phrases
- `patternMatch[]` -- Regex patterns for variations/obfuscation
- `severity` -- Maps terms to severity levels (low/medium/high)

**Behavior:**
- Checks post text content against blocklist
- High severity match (threats, slurs) -> auto-hide post, flag as urgent in moderation queue
- Medium/low severity match -> post publishes, flagged for review in queue
- No match -> passes to Layer 2

**Image moderation (synchronous):**
- If post includes an image, sends it to OpenAI's moderation endpoint
- Returns category scores for violence, sexual content, self-harm, etc.
- High confidence violation -> auto-hide post immediately, flag as urgent
- Medium confidence -> post publishes, flagged for manual review
- Low/no flags -> passes through

**Error handling:** If OpenAI API is unavailable, the post publishes unmoderated and is flagged with `source: 'moderation_error'` for later manual review. No posts are blocked due to API failures.

### Layer 2: AI Review (Async)

Separate Cloud Function runs after Layer 1.

**Text review:**
- Sends post content to OpenAI (GPT-4o-mini) with community standards as system context
- Returns: `flagged`, `confidence` (0-1), `reason`, `severity`
- Confidence > 0.8 + high severity -> auto-hide post, add to queue as urgent
- Confidence > 0.5 -> add to queue for manual review
- Confidence < 0.5 -> no action, log for analytics only

**Image context review:**
- For images attached to flagged text or borderline Layer 1 results
- Uses GPT-4o-mini with vision to evaluate image in context of post and community standards
- Catches contextually inappropriate content that the moderation endpoint might miss

**Cost:** GPT-4o-mini at thousands of posts/day is a few dollars/day. Optimize by only running full vision review on images the moderation endpoint flags as borderline.

**Timeout/retry:** Cloud Function timeout set to 60s. On transient OpenAI failure, retry once after 5s. On persistent failure, flag post with `source: 'moderation_error'` for manual review.

### Comment Moderation

The existing `posts` collection stores comments as a nested `comments[]` array. To catch offensive comments:
- An `onUpdate` Cloud Function trigger on `posts` detects when new comments are added (compares `before.comments.length` vs `after.comments.length`)
- New comments run through the same keyword filter and AI review pipeline
- Flagged comments are added to the moderation queue with the comment text and parent post reference

### Layer 3: Human Review (Admin Dashboard)

Moderation queue in the admin dashboard. Items arrive from four sources:
1. User reports (bridged from `postReports` via Cloud Function -- see below)
2. Keyword filter flags
3. AI review flags
4. Moderation errors (API failures requiring manual review)

### Bridging User Reports to Moderation Queue

A Cloud Function trigger on `postReports` document creation copies relevant data into `moderationQueue`:
- Reads the reported post content and author info
- Creates a `moderationQueue` item with `source: 'user_report'`
- Includes the reporter's reason and detail text
- The original `postReports` doc remains immutable (existing rules preserved)
- Existing `postReports` rules do NOT need to change -- the Cloud Function uses Admin SDK

### Collection: `moderationQueue`

Each document contains:
- `postId` -- Reference to the flagged post
- `postContent` -- Text content snapshot
- `postImageUrl` -- Image URL if applicable (thumbnail in queue view)
- `postAuthorId`, `postAuthorName` -- Post author info
- `commentIndex` -- If flagging a specific comment (null for post-level flags)
- `source`: `'user_report'` | `'keyword_filter'` | `'ai_review'` | `'moderation_error'`
- `reason` -- Report reason, keyword matched, or AI explanation
- `severity`: `'low'` | `'medium'` | `'high'`
- `aiConfidence` -- Confidence score (if AI-sourced)
- `status`: `'pending'` | `'reviewed'`
- `createdAt` -- When the item entered the queue
- `reviewedBy`, `reviewedAt`, `action` -- Filled when admin acts

**Pagination:** Queue is queried with cursor-based pagination (`startAfter` on `createdAt`), 25 items per page, default sorted by severity (high first) then date. Reviewed items remain in the collection with `status: 'reviewed'` for audit purposes, filterable in the UI.

### Admin Actions

| Action | Effect |
|---|---|
| **Dismiss** | False positive, mark reviewed, no further action |
| **Remove post** | Hide post from all users, notify author |
| **Warn user** | Post stays, user receives admin warning notification |
| **Remove + Warn** | Hide post and warn user |
| **Suspend user** | Temporary lockout (1/3/7/30 days), all posts hidden during suspension |
| **Ban user** | Permanent, account disabled via Firebase Auth |

### Notification Flow for Admin Actions

All admin actions (warn, suspend, ban) follow this flow:
1. Admin clicks action in dashboard -> writes to `moderationActions` collection
2. `onModerationAction` Cloud Function triggers and:
   - Updates user doc (`moderationStatus`, `suspendedUntil`) if suspension/ban
   - Creates notification in `notifications` collection (via Admin SDK, consistent with existing `allow create: if false` rule)
   - For bans: calls `admin.auth().updateUser(uid, { disabled: true })` and `admin.auth().revokeRefreshTokens(uid)` to disable account and kill active sessions
   - Writes to `users/{uid}/moderationHistory` subcollection

This keeps all side effects in Cloud Functions, consistent with the existing notification architecture.

### User Moderation History

Subcollection: `users/{uid}/moderationHistory`

Written by the `onModerationAction` Cloud Function (not client-side). Each doc records:
- `action`: warn/suspend/ban/unsuspend/unban
- `reason` -- Admin-provided reason
- `adminId` -- Who took the action
- `timestamp`
- `duration` -- For suspensions

Visible to admins in user lookup. Queue items show prior warning count next to flagged user.

Note: `moderationActions` (top-level) serves as the global audit trail queryable by admin or date range. `moderationHistory` (per-user subcollection) is the same data organized for fast per-user lookup. Both are written by the Cloud Function in a single batch write.

### Suspended/Banned Enforcement

Fields on user doc:
- `moderationStatus`: `'active'` | `'suspended'` | `'banned'`
- `suspendedUntil`: Timestamp for temporary suspensions

**Firestore rules enforcement:** The `isActiveUser()` helper (defined in Section 1) is added to write rules for collections where suspended/banned users must be blocked:

```javascript
// Applied to: posts, directMessages, conversations, connections
allow create: if isAuthenticated() && isActiveUser() && ...existing checks...;
```

**`get()` budget consideration:** `isActiveUser()` costs 1 `get()` call. Collections that already use `get()` calls (e.g., posts with group membership check, DMs with conversation participant check) must stay within Firestore's 10-call limit. Current rules use at most 2 `get()` calls in the heaviest paths, so adding 1 more for `isActiveUser()` is safe.

**Auto-unsuspend:** The `isActiveUser()` helper compares `suspendedUntil` to `request.time` at the rules level. If the suspension has expired, the user is treated as active for write purposes. A nightly Cloud Function also cleans up by resetting `moderationStatus` to `'active'` on expired suspensions, so the UI reflects the correct state.

---

## 4. Global Challenges

### Approach

Extend the existing `challenges` collection with admin-specific fields. No new collections needed.

### New Fields on `challenges` Documents

- `isGlobal: boolean` -- Distinguishes admin challenges from user-created
- `createdByAdmin: true` -- Flag for queries
- `featured: boolean` -- Pins to top of challenges list in the app
- `bannerImage: string` -- Optional promotional image URL

All other fields (title, description, frequency, targetCount, unit, startDate, endDate, participants, check-ins) reuse the existing infrastructure.

### Admin Capabilities (Challenges Tab)

- **Create global challenge** -- All existing challenge fields plus global/featured flags and optional banner
- **Edit active challenges** -- Modify details mid-challenge
- **End challenge early** -- Close before scheduled end date
- **View participation stats** -- Signups, active participants, completion rates, drop-off
- **Invite users** -- Send challenge invitations to specific users or broadcast via notification

### User Experience

- Global challenges appear in a "Featured" section at the top of challenges list
- Distinguished visually from community challenges (badge or styling)
- Users join/check-in using existing flow -- no mobile changes beyond filtering for `isGlobal`

### Firestore Rules (Merged with Existing)

The existing challenge rules use `visibility`/`members` for read access and `ownerId` for writes. The merged rules preserve private challenge access control while adding admin capabilities:

```javascript
match /challenges/{challengeId} {
  // Read: public challenges visible to all, private to members only, global to all
  allow read: if request.auth != null
    && (resource.data.visibility == 'public'
        || resource.data.isGlobal == true
        || request.auth.uid in resource.data.members
        || isAdmin());

  // Create: any user can create non-global, only admins can create global
  allow create: if request.auth != null
    && isActiveUser()
    && (!request.resource.data.isGlobal || isAdmin());

  // Update: members can update non-global (check-ins, leave), admins can update global
  allow update: if request.auth != null
    && isActiveUser()
    && ((!resource.data.isGlobal && request.auth.uid in resource.data.members)
        || isAdmin());

  // Delete: owner can delete non-global, admins can delete any
  allow delete: if isAdmin()
    || (request.auth.uid == resource.data.ownerId && !resource.data.isGlobal);
}
```

---

## 5. User Management

### User Search/Lookup

- Search by display name or email
- Results show: display name, email, join date, subscription status, moderation status

### User Detail View

**Visible to admins:**
- Profile summary: display name, avatar, email, join date, last active, subscription type/dates
- Activity stats (aggregated): number of goals, habits, journal entries, posts, groups, connections, challenges
- Moderation history: timeline of all warnings, suspensions, bans with reasons and acting admin
- Current moderation status

**Explicitly NOT visible:**
- Journal entry content
- AI chat conversations
- Direct message content
- Specific goal/habit names or details

### Actions

| Action | Description |
|---|---|
| **Warn** | Send notification with reason |
| **Suspend** | Temporary lockout, duration picker (1/3/7/30 days), reason required |
| **Ban** | Permanent, confirmation dialog, reason required |
| **Unsuspend/Unban** | Reverse previous action |
| **Grant Admin** | Elevate to admin role |
| **Revoke Admin** | Remove admin role |

### Audit Trail

Collection: `moderationActions`

Every admin action logged:
- `adminId` -- Who performed the action
- `targetUserId` -- Who it was performed on
- `action` -- What was done
- `reason` -- Admin-provided reason
- `timestamp`

Full accountability if multiple admins are added.

---

## 6. UI Structure & Routing

### Route

`/admin` -- Single page with tab navigation.

### Tabs

| Tab | Primary Content | Key Actions |
|---|---|---|
| **Overview** | KPI cards (total users, DAU, trial conversion, open mod items), sparkline trends, alerts | Quick links to problem areas |
| **Analytics** | Charts by section (User Health, Feature Adoption, Community, Content, Subscriptions), date range picker | Filter by date range |
| **Moderation** | Queue table sorted by severity/date, filter by source, post preview with image thumbnails, 25 items per page | Dismiss, Remove, Warn, Suspend, Ban |
| **Challenges** | Global challenges list with status and participation stats | Create, Edit, End, Invite |
| **Users** | Search bar, results table | View detail, Warn, Suspend, Ban, Grant Admin |

### Sidebar Integration

Existing `SidebarLayout` gets a conditional admin link:
- Shield icon + "Admin" label
- Only renders when `user.role === 'admin'`

### Component Structure

```
src/pages/Admin/
  AdminDashboard.jsx          -- Tab container + route protection
  OverviewTab.jsx             -- KPI cards + sparkline trends
  AnalyticsTab.jsx            -- Charts + date range filtering
  ModerationTab.jsx           -- Queue table + action modals
  ChallengesTab.jsx           -- Global challenge management
  UsersTab.jsx                -- User search + detail view
```

### Service Layer

```
src/services/db/
  admin.service.js            -- Read analytics docs, user lookup
  adminModeration.service.js  -- Queue management, moderation actions
  adminChallenges.service.js  -- Global challenge CRUD
```

### Charting Library

Recharts -- lightweight, React-based, no heavy dependencies. Used for sparklines in Overview and charts in Analytics.

---

## 7. New Firestore Collections Summary

| Collection | Purpose | Access |
|---|---|---|
| `adminAnalytics` (+ `daily` subcollection) | Pre-computed analytics rollups | Admin read, Cloud Functions write |
| `moderationQueue` | Flagged/reported posts pending review | Admin read/write |
| `moderationActions` | Audit trail of all admin actions | Admin read, Cloud Functions write |
| `users/{uid}/moderationHistory` | Per-user moderation timeline | Admin read, Cloud Functions write |
| `config/moderationBlocklist` | Keyword filter blocklist | Admin read/write via Admin SDK |

### Complete Firestore Rules for New Collections

```javascript
// Admin analytics -- read-only for admins
match /adminAnalytics/{docId} {
  allow read: if isAdmin();
  allow write: if false;
}
match /adminAnalytics/{collection}/{docId} {
  allow read: if isAdmin();
  allow write: if false;
}

// Moderation queue -- admins can read and update status/action fields
match /moderationQueue/{itemId} {
  allow read: if isAdmin();
  allow create: if false; // Only Cloud Functions create queue items
  allow update: if isAdmin()
    && request.resource.data.diff(resource.data).affectedKeys()
       .hasOnly(['status', 'reviewedBy', 'reviewedAt', 'action']);
  allow delete: if false;
}

// Moderation actions audit trail -- admins can create, no one can modify
match /moderationActions/{actionId} {
  allow read: if isAdmin();
  allow create: if isAdmin();
  allow update, delete: if false;
}

// Per-user moderation history -- admin read only, Cloud Functions write
match /users/{userId}/moderationHistory/{entryId} {
  allow read: if isAdmin();
  allow write: if false; // Cloud Functions use Admin SDK
}

// Blocklist config -- managed via Admin SDK (Cloud Functions or scripts)
// Inherits existing config rules: read for authenticated, write: false
// Admin updates to blocklist done via a Cloud Function endpoint
```

---

## 8. Cloud Functions Summary

| Function | Trigger | Purpose |
|---|---|---|
| `aggregateAnalytics` | Scheduled (nightly, 3 AM) | Compute and write analytics rollups incrementally |
| `aggregateAnalyticsFull` | Scheduled (weekly, Sunday 3 AM) | Full recount to correct incremental drift |
| `onPostCreate_moderateContent` | Firestore onCreate (`posts`) | Keyword filter + image moderation, then async AI review |
| `onPostUpdate_moderateComments` | Firestore onUpdate (`posts`) | Detect new comments, run through moderation pipeline |
| `onPostReport_createQueueItem` | Firestore onCreate (`postReports`) | Bridge user reports into moderation queue |
| `onModerationAction` | Firestore onCreate (`moderationActions`) | Update user doc, send notifications, disable auth for bans, write moderation history |
| `cleanupExpiredSuspensions` | Scheduled (nightly) | Reset `moderationStatus` to `'active'` on expired suspensions |
| `updateModerationBlocklist` | HTTPS callable (admin only) | Update `config/moderationBlocklist` from admin dashboard |

---

## 9. Dependencies

- **Recharts** -- Charting library for analytics visualizations
- **OpenAI API** -- Already integrated for AI features; used for content moderation and image review
- **Firebase Cloud Functions** -- For scheduled analytics aggregation, post moderation triggers, and admin action side effects

---

## 10. Privacy Principles

1. Admin analytics are always aggregated -- no individual user content exposed
2. Moderation views show only community-visible content (posts, comments, profile info)
3. Journal entries, AI chats, and DMs are never accessible to admins
4. All admin actions are logged with full audit trail
5. Subscription data visible only as status/dates, not payment details

---

## 11. Security Considerations

1. `isAdmin()` check in Firestore rules for all admin collections
2. Seed admin bootstrapped via Admin SDK script (not client-side env vars)
3. Suspended/banned users enforced at Firestore rules level via `isActiveUser()` helper
4. Auto-unsuspend handled at both rules level (`suspendedUntil < request.time`) and via nightly cleanup function
5. Admin actions require reason field for accountability
6. Admin can only modify `role`, `moderationStatus`, `suspendedUntil` on user docs (field-level restriction in rules)
7. Moderation blocklist updates go through an HTTPS callable Cloud Function (not direct client writes)
8. Cloud Functions use Admin SDK (bypass rules); dashboard uses client SDK (subject to rules)
9. Ban action disables Firebase Auth account and revokes refresh tokens (kills active sessions)
10. `moderationQueue` items can only be created by Cloud Functions; admins can only update status/review fields

# Phase 7: Community Parity — Design Spec

**Date:** 2026-03-30
**Status:** Pending
**Parent:** Web-Mobile Parity Roadmap

## Problem

Web community has basic posting (text + image), likes, and comments. Mobile adds post types, a structured report flow, user muting, and a community orientation card for new users.

## Solution

Add the 4 missing community features to the web app.

## Feature 1: Post Types

### Data Model Change

Add `postType` field to posts:

```js
// posts collection — new field
{
  ...existingFields,
  postType: 'update' | 'win' | 'reflection' | 'ask',  // default: 'update'
}
```

### Create Post UI
- Post type selector at top of create post modal
- 4 chip buttons: Update, Win, Reflection, Ask
- Default: Update
- Each type can have a subtle icon/color in the post card

### Post Card Display
- Small type badge/label on each post card (e.g., "Win" with trophy icon)
- Type-specific styling:
  - Update: neutral (no special treatment)
  - Win: celebration accent (amber/gold border or icon)
  - Reflection: thoughtful accent (sage/teal icon)
  - Ask: question accent (blue icon)

### Feed Filtering
- Filter chips above feed: All | Updates | Wins | Reflections | Asks
- Filter applied client-side (no Firestore query change needed)

## Feature 2: Report Flow (3 Stages)

### Stage 1: Reason Selection
- Modal with 5 reason options:
  - Spam
  - Harmful language
  - Inappropriate content
  - Unsafe behavior
  - Other
- Single select, then "Next" button

### Stage 2: Detail Input
- Optional text field (max 500 chars)
- "Your report is confidential" notice
- Two buttons: "Submit report" (with details) or "Skip and submit" (reason only)

### Stage 3: Confirmation
- Success message: "Report submitted"
- Brief explanation of what happens next
- "Done" button closes modal

### Report Data Model

```js
// reports collection (already exists for admin moderation)
{
  postId: string,
  reporterId: string,
  reportedUserId: string,
  reason: 'spam' | 'harmful_language' | 'inappropriate' | 'unsafe' | 'other',
  detail: string | null,
  status: 'pending',
  createdAt: Timestamp,
}
```

### UI Entry Point
- Three-dot overflow menu on each post → "Report" option
- Opens the 3-stage report modal

## Feature 3: Mute User

### Flow
- Three-dot overflow menu on posts → "Mute {username}" option
- Confirmation toast: "{username} muted"
- Saves to `mutedUsers` collection (same as Phase 5)
- Muted user's posts immediately filtered from feed

### Feed Integration
- On feed load, fetch user's muted list
- Filter out posts where `userId` is in muted set
- No server-side filtering needed (client-side)

### Unmute
- Via Settings → Muted Accounts (Phase 5)
- Or three-dot menu on the same user's post shows "Unmute" instead

## Feature 4: Community Orientation Card

### Display Rules
- Shown on first visit to community page
- Checked via `users` doc field: `community_orientation_seen`
- Dismissible — sets flag to `true`

### Card Content
- **Heading:** "Welcome to Community"
- **Body:** "A space to share, encourage, and build alongside people on similar paths."
- **Three concept pills:**
  - Groups: "Ongoing shared spaces for connection" (Users icon)
  - Challenges: "Time-bound intentions to try together" (Trophy icon)
  - Posts & Check-ins: "Share moments from your journey" (MessageCircle icon)
- **CTA:** "Find a group to start →" (navigates to Groups)
- **Dismiss:** "Skip for now" link

## Web Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/community/CreatePostModal.jsx` | Modify — Add post type selector |
| `src/components/community/PostCard.jsx` | Modify — Show post type badge |
| `src/components/community/PostOverflowMenu.jsx` | Create or modify — Add Report + Mute options |
| `src/components/community/ReportModal.jsx` | Create — 3-stage report flow |
| `src/components/community/CommunityOrientationCard.jsx` | Create — First-visit card |
| `src/services/db/reports.service.js` | Create — Submit reports |
| `src/pages/CommunityPage.jsx` | Modify — Add orientation card, feed filtering, mute integration |

## Out of Scope
- Admin-side report management (already exists in Admin dashboard)
- Block user (stronger than mute — not in mobile MVP)
- Post editing restrictions by type

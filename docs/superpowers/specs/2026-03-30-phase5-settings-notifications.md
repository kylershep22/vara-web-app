# Phase 5: Settings & Notifications Parity — Design Spec

**Date:** 2026-03-30
**Status:** Pending
**Parent:** Web-Mobile Parity Roadmap

## Problem

Web settings are basic (name, email, avatar, simple notification toggle). Mobile has structured notification preferences with quiet hours, 4 notification categories, completion sounds, and muted account management.

## Solution

Align web settings and notification preferences with mobile's V2 schema.

## Notification Preferences Schema (V2)

```js
// notificationPreferences collection
// Doc ID: userId
{
  userId: string,
  schemaVersion: 2,
  allNotificationsEnabled: boolean,

  quietHours: {
    enabled: boolean,
    startTime: { hour: number, minute: number },  // default 21:00
    endTime: { hour: number, minute: number },     // default 08:00
  },

  dailyRhythm: {
    enabled: boolean,
    reminderTime: { hour: number, minute: number } | null,
  },

  insightsLearning: {
    enabled: boolean,
    frequency: 'twice_weekly' | 'three_weekly',
  },

  socialConnection: {
    directMessages: boolean,
    connectionRequests: boolean,
    communityDigest: boolean,
  },

  milestonesReflection: {
    enabled: boolean,
  },

  completionSound: {
    enabled: boolean,
    sound: 'singing-bowl' | 'soft-chime' | 'nature-bell' | 'stream',
  },

  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

## Notification Settings Page Sections

### 1. Master Toggle
- "All Notifications" on/off switch
- When off, all categories disabled (greyed out)

### 2. Quiet Hours
- Enable/disable toggle
- Start time picker (default 9:00 PM)
- End time picker (default 8:00 AM)
- Supports overnight ranges

### 3. Daily Rhythm
- Enable/disable toggle
- Time picker for daily reminder (user must set)

### 4. Insights & Learning
- Enable/disable toggle
- Frequency selector: "2x per week" or "3x per week"

### 5. Social & Connection
- Three individual toggles:
  - Direct messages
  - Connection requests
  - Community digest

### 6. Milestones & Reflection
- Enable/disable toggle

### 7. Completion Sound
- Enable/disable toggle
- Sound selector (4 options with preview):
  - Singing Bowl (default)
  - Soft Chime
  - Nature Bell
  - Stream

## Muted Accounts

### Data Model
```js
// mutedUsers collection
{
  muterId: string,
  mutedUserId: string,
  createdAt: Timestamp,
}
```

### Muted Accounts Page
- Accessed from Settings → Privacy → Muted Accounts
- Lists muted users with avatar, display name
- "Unmute" button per user
- Empty state: "No muted accounts"

### Muting Flow
- Three-dot menu on posts → "Mute" option
- Saves to `mutedUsers` collection
- Muted user's posts filtered from community feed

## Web Files to Create/Modify

| File | Action |
|------|--------|
| `src/services/db/notificationPreferences.service.js` | Create — CRUD for preferences |
| `src/services/db/mutedUsers.service.js` | Create — Mute/unmute operations |
| `src/pages/NotificationSettings.jsx` | Create — Full notification settings page |
| `src/pages/MutedAccounts.jsx` | Create — Muted accounts list |
| `src/pages/Settings.jsx` | Modify — Add links to new pages, update layout |
| `src/App.js` | Modify — Add routes |

## Out of Scope
- Push notification delivery infrastructure (web push API)
- Local notification scheduling (browser-level)
- Sound playback on web (may need Web Audio API — evaluate feasibility)

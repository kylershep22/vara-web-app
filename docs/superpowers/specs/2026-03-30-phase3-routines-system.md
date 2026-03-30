# Phase 3: Routines System — Design Spec

**Date:** 2026-03-30
**Status:** Pending
**Parent:** Web-Mobile Parity Roadmap
**Depends on:** Phase 2 (Habits) recommended but not required

## Problem

The web app has no routines system. Mobile users can create morning/evening/bedtime/custom routines with ordered activities and play through them with a timer or checklist. Web users have no equivalent.

## Solution

Add the full routines system to the web app: routine CRUD, activity management with drag-to-reorder, and an Active Routine Player with checklist and timed modes.

## Routine Document Schema

```js
// routines collection
{
  userId: string,
  name: string,
  type: 'morning' | 'evening' | 'bedtime' | 'custom',
  activities: [
    {
      id: number,
      name: string,
      duration: number,        // minutes
      order: number,
      icon: string,            // icon identifier
      color: string,           // hex color
    }
  ],
  active: boolean,
  reminderTime: string | null, // HH:MM format
  createdAt: Timestamp,
  updatedAt: Timestamp,
}
```

## Routine Types (4)

| Type | Description | Typical Time |
|------|-------------|-------------|
| Morning | Start-of-day routine | 6:00-8:00 AM |
| Evening | End-of-day wind-down | Flexible |
| Bedtime | Sleep preparation | Before bed |
| Custom | User-defined | Any time |

## Routine Editor

- **Name input** with type selector (4 tabs: Morning/Evening/Bedtime/Custom)
- **Activity list** with drag-to-reorder (react-beautiful-dnd or similar)
- **Each activity row:** icon, name, duration input (minutes), color picker, delete button
- **Add activity button** at bottom
- **Save/Cancel** actions
- **Delete routine** option (with confirmation)

## Active Routine Player

Two modes toggled by the user:

### Checklist Mode
- Activity list with checkboxes
- Check off each activity as completed
- Overall progress bar at top
- "Done" button when all checked

### Timed Mode
- Current activity displayed prominently with name and duration
- Circular timer ring showing countdown
- "Up Next" card showing next activity
- Pause/Resume button
- Skip button to advance to next activity
- Overall routine progress bar
- Activity transition animation

### Completion
- Celebration state when routine finishes
- Session logged to `focusSessions` collection:
  ```js
  {
    userId: string,
    routineId: string,
    routineType: string,
    completed: boolean,
    startedAt: Timestamp,
    completedAt: Timestamp,
    activitiesCompleted: number,
    totalActivities: number,
  }
  ```

## Web Files to Create/Modify

| File | Action |
|------|--------|
| `src/services/db/routines.service.js` | Create — CRUD for routines collection |
| `src/components/routines/RoutineEditor.jsx` | Create — Create/edit routine with activity management |
| `src/components/routines/RoutinePlayer.jsx` | Create — Active routine player (checklist + timed) |
| `src/components/routines/ActivityCard.jsx` | Create — Single activity row in editor/player |
| `src/pages/Routines.jsx` | Create — Routines page (or integrate into existing Focus page) |
| `src/App.js` | Modify — Add route if new page |
| `src/components/layout/SidebarLayout.jsx` | Modify — Update nav if needed |

## Navigation

Routines should live alongside Focus (Pomodoro) since mobile puts them together in the Rhythms tab. Options:
- Add as a tab within the existing `/focus` page
- Or add as `/routines` with sidebar link in Focus section

## Out of Scope
- Routine reminders/push notifications (Phase 5)
- Ambient sounds during routines (nice-to-have, not in MVP)

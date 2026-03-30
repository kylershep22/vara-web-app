# Phase 6: AI Chat Alignment — Design Spec

**Date:** 2026-03-30
**Status:** Pending
**Parent:** Web-Mobile Parity Roadmap

## Problem

Web AI is a dedicated `/ai` page with separate tabs (Mood Check-In, Micro Coaching, Daily Plans, Ask Vara, AI Reflections). Mobile uses a floating action button (FAB) that opens a context-aware chat modal from any screen. The web approach fragments AI features across tabs instead of offering a unified, always-available assistant.

## Solution

Replace the dedicated `/ai` page with a floating action button + chat modal accessible from every page. The chat is context-aware, receiving the current page, user habits, brain state, and other relevant data.

## Floating Action Button (FAB)

- **Position:** Fixed, bottom-right corner (bottom: 24px, right: 24px)
- **Size:** 56x56px circle (slightly smaller than mobile's 68px for web density)
- **Style:** Gradient background (evergreen teal), white icon, drop shadow
- **Icon:** Chat bubble or Vara "V" icon
- **Z-index:** Above all content, below modals
- **Hidden on:** Admin pages (no AI needed there)
- **Hover:** Scale 1.05 with shadow increase

## Chat Modal

### Layout
- **Slide-up panel** from bottom-right (not full-screen on desktop)
- **Desktop:** 400px wide, max 600px tall, anchored to bottom-right
- **Mobile web:** Full-width, 80% height
- **Header:** "Vara" title + close button
- **Body:** Scrollable message thread
- **Footer:** Text input + send button

### Context Gathered (Sent with Each Request)

```js
{
  screen: string,                    // Current route path
  brainState: string | null,         // Today's brain state check-in
  dailyReflection: string | null,    // Today's reflection (smooth/okay/hard)
  activeHabits: number,              // Count of active habits
  habitsCompletedToday: number,      // Count completed today
  recentJournalMood: string | null,  // Most recent journal mood
}
```

### API Endpoint
- `POST /api/ai-chat`
- Request: `{ messages: Array<{role, content}>, context: object }`
- Response: `{ reply: string }`
- Timeout: 60 seconds

### Quick Prompts
Shown when chat is empty (no messages yet):
- "Help me focus"
- "I need a reset"
- "Build a routine"
- "Feeling overwhelmed"

### Message History
- Stored in component state (not persisted to Firestore)
- Cleared when modal closes
- Messages: `{ id, role: 'user'|'assistant', content, timestamp }`

## Web Pages to Remove

- `/ai` route and `AICompanion.jsx` page
- Sidebar link for "AI Companion" replaced with FAB

## Web Files to Create/Modify

| File | Action |
|------|--------|
| `src/components/ai/AIFloatingButton.jsx` | Create — FAB component |
| `src/components/ai/AIChatModal.jsx` | Create — Chat modal with context |
| `src/hooks/useAIChatContext.js` | Create — Gathers current context for AI |
| `src/App.js` | Modify — Remove `/ai` route, add FAB to layout |
| `src/components/layout/SidebarLayout.jsx` | Modify — Remove AI Companion from bottomItems, add FAB |
| `src/pages/AICompanion.jsx` | Remove |

## Out of Scope
- Streaming responses (use simple request/response for now)
- Chat history persistence across sessions
- Voice input
- Image/file attachments

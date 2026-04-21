# OpenAI Data Flow Audit

**Date:** 2026-04-21
**Purpose:** Comprehensive inventory of every data point that leaves Vara and is sent to the OpenAI API. Intended for privacy reviews, DPA conversations, data subject requests, and security audits. No quality judgments — just the flows as they exist in code.

---

## Overview

All OpenAI traffic originates on the server side. The mobile client never calls OpenAI directly — it always goes through a Vara-owned backend endpoint.

### Entry points

| Layer | Location | Role |
|-------|----------|------|
| Mobile client | `mobile/src/services/api/ai.service.ts` | Wraps backend calls; no direct OpenAI access |
| Express backend | `backend/server.js` + `backend/routes/*.js` | Primary dev / local server (7 endpoints) |
| Firebase Cloud Functions | `functions/index.js` | Production mirror of most backend endpoints |
| Moderation trigger | `functions/src/admin/moderation.js` | Fires automatically on every community post |
| Shared helpers | `backend/services/openaiService.js`, `backend/services/habitSuggestionService.js` | Prompt construction helpers |

The Express backend and the Cloud Functions file overlap significantly — the same logical endpoint (e.g. `/api/ai-chat`) is defined in both. Whichever is deployed receives the client traffic; the other is dormant.

---

## Per-endpoint data inventory

### 1. `/api/generate-daily-plan`

**Backend:** `backend/routes/dailyPlan.js` → `backend/services/openaiService.js`
**Cloud Functions:** `handleGenerateDailyPlan` in `functions/index.js` (also `generateDailyPlan` callable)
**Model:** `gpt-4o` (backend), `gpt-4o-mini` (functions HTTP handler)

Data fetched server-side from Firestore:
- `users/{uid}` doc → `name`, `preferences`
- `users/{uid}/moods` subcollection → latest entry
- `goals` collection where `userId == uid`

Data sent to OpenAI inside the prompt:
- Display name
- `preferences.tone` (gentle / motivating / direct / playful)
- `preferences.intensity` (light / standard / intense)
- Time-of-day label (Morning / Afternoon / Evening)
- Latest mood: emoji + label + **free-text note**
- Each goal's title, progress, target, unit
- Optional user-provided `modifier` (free text)

### 2. `/api/openai` (generic goal / habit / task suggestions)

**Backend:** `backend/server.js` L95-105 → `backend/services/habitSuggestionService.js`
**Cloud Functions:** `handleOpenAISuggestions` in `functions/index.js`
**Model:** `gpt-4` (backend), `gpt-4o-mini` (functions)

Data sent to OpenAI:
- Suggestion type ("goals" | "habits" | "tasks")
- **Full context object embedded via `JSON.stringify(context, null, 2)`** — whatever the client passes in `context` (typically goals, habits, tasks arrays) lands verbatim in the prompt
- Optional `modifier` (free text)

Largest exposure surface per single call because of the unstructured JSON embedding.

### 3. `/api/journal-prompt`

**Backend:** `backend/server.js` L108-128
**Cloud Functions:** `handleJournalPrompt` in `functions/index.js` (also dedicated `exports.journalPrompt` HTTPS function)
**Model:** `gpt-4o-mini`

Data sent:
- Free-text `prompt` string from the client request body
- Cloud Functions version sanitizes for prompt-injection phrases ("ignore previous instructions", "you are now...", "system:")

### 4. `/api/journal-summary`

**Backend:** `backend/server.js` L131-163 (also legacy `backend/routes/journalSummary.js`)
**Cloud Functions:** `handleJournalSummary` in `functions/index.js`
**Model:** `gpt-4o-mini` (backend + functions); `gpt-4` (legacy route)

Data sent:
- **All journal entries from the past week, full text body**, concatenated (or JSON-stringified if sent as array)
- Functions version accepts an additional user-controlled `instruction` field
- Legacy route supports a `structured: true` flag that asks for a JSON return with `moodTrend`, `topThemes`, `wordCount`, `entryCount`

### 5. `/api/ai-chat`

**Backend:** `backend/server.js` L167-255
**Cloud Functions:** `handleAIChat` in `functions/index.js`
**Model:** `gpt-4o-mini`

Data sent:
- **Full chat message history** (array of `{role, content}`; Cloud Functions truncates to last 20 messages, each sanitized to 4000 chars)
- `context.page.label` + `context.page.path` — current screen in the app
- `context.userSummary.goals` — up to 5, each with title + category + progress%
- `context.userSummary.habits` — up to 8, each with title + cadence + streak
- Note: the functions handler references `${brainHealthContext}` in the template, but the variable is never defined in scope (latent bug — currently interpolates `undefined`)

Most data-rich endpoint.

### 6. `/api/week-recap-suggestions`

**Backend:** `backend/server.js` L258-319
**Cloud Functions:** `handleWeekRecapSuggestions` in `functions/index.js`
**Model:** `gpt-4o-mini`

Data sent:
- Goals (joined comma-separated)
- Habits: each habit's name + streak count
- **Recent journal entries** (joined with `" | "`)
- Current 4-3-2-1 recap state (JSON-stringified)

### 7. `/api/weekly-narrative`

**Backend:** `backend/server.js` L323-388
**Model:** `gpt-4o-mini`

Data sent (**explicitly anonymized — the code comment states "Receives ONLY anonymized aggregate numbers. No PII."**):
- Sleep / mood / energy / stress averages on a 1–5 scale
- Habit completion rate (%)
- Focus minutes per day (average)
- Days journaled this week, out of total
- Sleep-habit correlation (numeric %)
- Journal-mood correlation (numeric mood deltas)
- Stress trend direction
- Bright-spot insight string
- Week-over-week wellness score delta
- Best day / hardest day name (e.g. "Wednesday") + factor tags (sleep, energy, etc.)
- Top behavioral correlations (factor, direction, impact points)

### 8. Callable `generateHabitSuggestions`

**Location:** `functions/index.js` L197-246
**Model:** `gpt-4o-mini`

Data sent:
- Single `goal` string (sanitized, capped at 500 chars)

### 9. Auto-moderation on every community post

**Location:** `functions/src/admin/moderation.js` — `onPostCreate_moderateContent`
**Models:** `omni-moderation-latest` (images) and `gpt-4o-mini` (text)

Runs automatically when a new doc lands at `posts/{postId}`. For every post:
- **Post's full text content** → `gpt-4o-mini` for text review (flag/confidence/severity/reason)
- **Post's `imageUrl`** (if present) → `omni-moderation-latest` for image content scanning
- Fixed community standards string is included in the system prompt

Silent to the user — fires the moment a post is created. User has no opt-out.

Also fires on user-submitted reports (`postReports/{reportId}`) — in that case, the reported post's content and image URL are added to the moderation queue (sent to OpenAI if the queued item is subsequently reviewed via the text/image paths above).

---

## Data categories summary

### Direct identifiers
- **Display name** — only in daily plan prompts
- **Firebase UID** — never sent; used server-side only for auth and Firestore lookup
- **Email** — never sent

### Behavioral data
- Goal titles, categories, progress values, targets, units
- Habit titles, cadences, streaks, frequencies
- Task titles

### Subjective / free-form content
- Mood notes (free text, daily plan path)
- **Full journal entries** (journal summary, week recap)
- **Full chat transcripts** (AI chat, up to 20 messages × 4000 chars)
- **Community post text and image URL** (auto-moderation, every post)
- User-supplied `modifier` / `instruction` / `prompt` fields (various endpoints)

### Derived aggregates
- Weekly averages (sleep/mood/energy/stress 1–5, habit %, focus min)
- Correlation deltas and bright-spot strings
- Best/hardest day names and factor tags

### Context
- Current app screen label + path (AI chat)
- Time of day (daily plan)

---

## Privacy-relevant observations

1. **Only `/api/weekly-narrative` has an explicit no-PII contract.** Its prompt construction is aggregates-only and the code comment documents this. All other endpoints send raw user content.

2. **Community auto-moderation is silent and opt-out-less.** Every new post's text and image URL go to OpenAI the moment the post is created. Users may not be aware.

3. **Journal entries and chat transcripts are sent in full — no truncation, no summarization, no redaction** (other than the 4000-char-per-message chat cap).

4. **`/api/openai` is the widest exposure per call** — the `context` object is embedded via `JSON.stringify`, so any fields the mobile client adds to it get forwarded to OpenAI unchanged.

5. **Default OpenAI API retention** (per OpenAI's published API terms): 30 days, not used for training. A zero-retention DPA is available as an enterprise agreement upgrade if stronger guarantees are needed for any of these flows — particularly journal summary, AI chat, and community moderation.

6. **Prompt-injection hardening exists only on the functions version of `journalPrompt`.** Other free-text user inputs (`modifier`, `instruction`, chat messages) are sanitized in some places (sanitizeInput helper) but not filtered for injection phrases.

7. **`brainHealthContext`** is referenced in the Cloud Functions `ai-chat` handler's system prompt template but is never defined, so it currently interpolates `undefined`. A latent bug, not a privacy issue — sends less data, not more — but worth noting when/if that code path is revisited.

---

## How to re-verify this audit later

If the backend changes and you need to re-check what goes to OpenAI:

```bash
# All OpenAI call sites
grep -rn "openai\.chat\.completions\|openai\.moderations\|openai\.embeddings" backend/ functions/

# All references to the OpenAI SDK
grep -rn "new OpenAI\|require('openai')\|from \"openai\"" backend/ functions/
```

Read each call site and enumerate what text ends up in the `messages[]` array — that is the exact payload transmitted to OpenAI.

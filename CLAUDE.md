# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

**Last Updated:** 2025-11-02
**Project:** Vara Wellness App (vara-4a99f)
**Main Branch:** main

---

## Project Overview

Vara is a comprehensive wellness application that helps users set and track goals, build healthy habits, manage tasks, connect with a community, and receive AI-powered coaching. The app combines personal wellness tracking with social features and intelligent recommendations.

**Core Features:**
- Goal and habit tracking with streak visualization
- AI-powered daily plans and wellness coaching (GPT-4o-mini)
- Community groups with forums and social connections
- Wellness library (breathwork, movement, sleep content)
- Journal with AI prompts and weekly summaries
- Task management with prioritization
- Direct messaging and notifications

---

## Architecture

### System Design

```
Frontend (React SPA) ──→ Firebase (Firestore, Auth, Storage)
       │
       └──→ Express Backend (port 5001) ──→ OpenAI API
```

**Key Points:**
- Frontend communicates **directly** with Firestore (no REST API for data)
- Express backend is **only** for AI/OpenAI integration
- Firebase Security Rules enforce all access control
- Real-time updates via Firestore `onSnapshot()`

### Technology Stack

**Frontend:** React 19, Tailwind CSS, Firebase SDK, React Router v7
**Backend:** Express.js, OpenAI SDK, Firebase Admin SDK
**Database:** Firebase Firestore (NoSQL)
**Auth:** Firebase Authentication
**Storage:** Firebase Storage
**Deployment:** Firebase Hosting

---

## Development Commands

```bash
# Start development (both frontend + backend)
npm run dev

# Frontend only (port 3000)
npm start

# Backend only (port 5001)
npm run server

# Build for production
npm run build

# Run tests
npm test

# Test Firestore security rules
npm run test:rules

# Start Firebase emulators
npm run emulators
```

---

## Environment Setup

**Required files:**
- `.env` - Frontend Firebase config (see `.env.example`)
- `backend/.env` - Backend config with `OPENAI_API_KEY`

**Important:**
- React env vars MUST start with `REACT_APP_`
- Restart dev server after changing `.env`
- Never commit `.env` files

See `ENVIRONMENT_VARIABLES_SETUP.md` for full setup guide.

---

## Database Schema (Firestore)

### Core Collections

| Collection | Purpose | Key Fields |
|------------|---------|-----------|
| `users` | User profiles | `displayName`, `email`, `privacy`, `bio`, `avatar` |
| `goals` | User goals | `userId`, `title`, `primaryFocus`, `refinedFocus`, `timeframe`, `progress` |
| `habits` | Habit tracking | `userId`, `name`, `frequency`, `type`, `streak`, `active` |
| `tasks` | To-do items | `userId`, `title`, `priority`, `completed`, `dueDate` |
| `journalEntries` | Journal entries | `userId`, `content`, `mood`, `tags` |
| `groups` | Community groups | `ownerId`, `name`, `visibility` (public/private), `members[]` |
| `posts` | Forum posts | `userId`, `groupId`, `content`, `likes[]`, `comments[]` |
| `connections` | User connections | `a`, `b`, `status` (pending/accepted/declined) |
| `conversations` | DM conversations | `participants[]`, `lastMessage` |
| `directMessages` | Individual messages | `senderId`, `receiverId`, `text`, `conversationId` |
| `notifications` | In-app notifications | `userId`, `type`, `title`, `body`, `read` |

### Sub-collections

- `habits/{habitId}/completions/{date}` - Daily habit check-ins
- `users/{userId}/moods/{moodId}` - Mood tracking (legacy pattern)

**Connection ID Pattern:** Connections use pairId: `[uidA, uidB].sort().join('_')`

---

## Service Layer Architecture

### New Pattern (Preferred)

Location: `src/services/db/`

**Files:**
- `goals.service.js` - CRUD for goals
- `habits.service.js` - CRUD for habits
- `profiles.service.js` - User profile management
- `community.service.js` - Groups and posts

**Pattern:**
```javascript
// Consistent API
export async function listGoals(userId, opts = {})
export async function getGoal(id)
export async function createGoal(userId, payload)
export async function updateGoal(id, patch)
export async function removeGoal(id)
```

**Benefits:**
- Clean, testable functions
- Automatic timestamps (`serverTimestamp()`)
- Error handling at service level
- Unit tests in `__tests__/`

### Legacy Services (Being Migrated)

Location: `src/services/`

- `communityService.js` - Legacy community functions
- `connectionService.js` - Connection management
- `messagingService.js` - Direct messaging
- `userService.js` - User operations

**Migration Strategy:** Gradually move legacy code to new `db/` pattern.

---

## Authentication & Authorization

### Authentication Flow

1. User signs up/logs in via Firebase Auth (`src/pages/Login.jsx`, `src/pages/Signup.jsx`)
2. Auth state managed by `AuthContext` (`src/context/AuthContext.jsx`)
3. `useAuth()` hook provides `user`, `isAuthReady` to all components
4. `<ProtectedRoute>` HOC wraps authenticated pages

### Authorization (Firestore Rules)

**File:** `firestore.rules` (270+ lines)

**Key Principles:**
- Personal data isolated by `userId`
- Profile privacy enforced (public/connections/private)
- Group access based on membership
- Messages restricted to participants
- Notifications restricted to recipients

**Important:** All data access is validated server-side by Firestore Security Rules.

See `FIRESTORE_SECURITY_RULES.md` for complete documentation.

---

## Routing Structure

**Public Routes:**
- `/` - Welcome/landing
- `/login` - Login
- `/signup` - Signup

**Protected Routes:** (require authentication)
- `/dashboard` - Main dashboard
- `/goals-habits` - Life design hub
- `/daily` - Daily wellness check-in
- `/library/*` - Wellness library (breathwork, sleep, movement)
- `/community` - Community hub
- `/community/people` - People search
- `/group/:groupId` - Group details/chat
- `/profile`, `/profile/edit` - User profile
- `/u/:uid` - Other user profiles
- `/notifications` - Notifications page
- `/journal` - Journaling
- `/ai` - AI companion

All routes wrapped in `<SidebarLayout>` after authentication.

---

## State Management

### Context API

**Primary Contexts:**

1. **AuthContext** (`src/context/AuthContext.jsx`)
   - Manages user authentication state
   - Provides: `user`, `isAuthReady`, `signup()`, `login()`, `logout()`
   - Used via `useAuth()` hook

2. **AudioPlayerContext** (`src/context/AudioPlayerContext.jsx`)
   - Global audio player state (breathwork/meditation)
   - Persistent player bar at bottom of app

3. **VideoPlayerContext** (`src/context/VideoPlayerContext.jsx`)
   - Global video player state (movement content)
   - Persistent video player bar

**Pattern:**
```javascript
import { useAuth } from '../context/AuthContext';

function MyComponent() {
  const { user, isAuthReady } = useAuth();
  // ...
}
```

### Component State

- Local state with `useState()` for UI-specific data
- `useEffect()` for data fetching and subscriptions
- Real-time Firestore subscriptions with `onSnapshot()`

---

## Key Patterns

### Real-Time Data Subscriptions

```javascript
useEffect(() => {
  if (!user) return;

  const q = query(collection(db, 'habits'), where('userId', '==', user.uid));
  const unsubscribe = onSnapshot(q, (snapshot) => {
    const data = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }));
    setHabits(data);
  });

return () => unsubscribe(); // Cleanup
}, [user]);
```

### Service Layer Calls

```javascript
import { createGoal, listGoals } from '../services/db/goals.service';

// Create
await createGoal(user.uid, {
  title: 'Exercise daily',
  primaryFocus: 'fitness',
  timeframe: '30 days'
});

// Read
const goals = await listGoals(user.uid, { sortBy: 'createdAt' });
```

### Protected Routes

```javascript
<Route path="/dashboard" element={
  <ProtectedRoute>
    <Dashboard />
  </ProtectedRoute>
} />
```

### Timestamps

Always use `serverTimestamp()` for consistency:

```javascript
import { serverTimestamp } from 'firebase/firestore';

const data = {
  ...payload,
  createdAt: serverTimestamp(),
  updatedAt: serverTimestamp()
};
```

---

## AI Integration

### Backend API Endpoints

**Base URL:** `http://localhost:5001/api`

| Endpoint | Method | Purpose |
|----------|--------|---------|
| `/generate-daily-plan` | POST | Generate personalized daily plan |
| `/openai` | POST | AI suggestions for goals/habits/tasks |
| `/journal-prompt` | POST | AI journal prompts |
| `/journal-summary` | POST | Weekly journal summary |
| `/ai-chat` | POST | Non-streaming chat with AI companion |

### AI Model

**Model:** GPT-4o-mini (via OpenAI API)
**Config:** `backend/server.js` initializes OpenAI client

**Context Injection:**
- User's recent goals, habits, and streaks
- Page-specific context
- Strengths-based coaching style

---

## Component Organization

### Directory Structure

```
src/
├── components/          # Reusable components
│   ├── ai/             # AI chat widget
│   ├── audio/          # Audio player
│   ├── chat/           # Direct messaging
│   ├── community/      # Community features
│   ├── dashboard/      # Dashboard-specific
│   ├── goalFlow/       # Multi-step goal wizard
│   ├── goals/          # Goal components
│   ├── groups/         # Group management
│   ├── habits/         # Habit tracking
│   ├── layout/         # SidebarLayout
│   ├── MindBody/       # Meditation/breathwork
│   ├── notifications/  # Notification bell
│   ├── profile/        # User profile
│   ├── tasks/          # Task management
│   └── video/          # Video player
├── context/            # React Context providers
├── pages/              # Top-level route components
├── services/           # Business logic & Firestore access
│   └── db/            # New service layer (preferred)
├── styles/             # CSS files
└── utils/              # Utility functions
```

### Naming Conventions

- **Components:** PascalCase (e.g., `GoalCreationForm.jsx`)
- **Services:** camelCase with `.service.js` suffix
- **Hooks:** `use` prefix (e.g., `useAuth`)
- **Context:** PascalCase with `Context` suffix

---

## Testing

### Unit Tests

- Service layer tests in `src/services/db/__tests__/`
- Run with: `npm test`

### Security Rules Tests

- Comprehensive test suite: `firestore.rules.test.js` (57+ tests)
- Run with: `npm run test:rules`
- Requires Firebase emulators

**Test Structure:**
```javascript
describe('Goals (Personal Data)', () => {
  test('users can create their own goals', async () => {
    // Test implementation
  });
});
```

---

## Deployment

### Production Deploy

```bash
# Deploy everything
firebase deploy

# Deploy specific services
firebase deploy --only hosting        # Frontend
firebase deploy --only firestore:rules # Security rules
firebase deploy --only functions       # Cloud Functions
```

### Project Configuration

- **Project ID:** vara-4a99f
- **Hosting:** Firebase Hosting
- **Location:** nam5 (North America)

### Pre-Deployment Checklist

- [ ] Run `npm run build` successfully
- [ ] Test security rules locally
- [ ] Verify environment variables set
- [ ] Check Firestore indexes
- [ ] Test on staging (if available)

---

## Security Best Practices

### Firestore Security Rules

**Current Status:** ✅ Comprehensive rules deployed

**Key Rules:**
- Personal data (goals, habits, tasks, journals) → Owner only
- User profiles → Privacy-aware (public/connections/private)
- Groups → Membership-based access
- Messages → Participants only
- Notifications → Recipients only

**Testing:** Always test rules before deployment using emulators.

### Environment Variables

- ✅ Firebase config in `.env` (not hardcoded)
- ✅ `.env` files in `.gitignore`
- ✅ OpenAI API key in `backend/.env`
- ❌ Never commit secrets to git

### Input Validation

**TODO:** Add comprehensive input validation and sanitization (DOMPurify for rich text).

---

## Common Development Tasks

### Adding a New Feature

1. **Create route** in `src/App.js`
2. **Create page component** in `src/pages/`
3. **Add to sidebar** in `src/components/layout/SidebarLayout.jsx`
4. **Create service** in `src/services/db/` for data access
5. **Add Firestore security rules** in `firestore.rules`
6. **Deploy rules** with `firebase deploy --only firestore:rules`

### Adding a New Firestore Collection

1. **Define data structure** (field names, types)
2. **Add security rules** in `firestore.rules`:
   ```javascript
   match /myCollection/{docId} {
     allow read: if <condition>;
     allow write: if <condition>;
   }
   ```
3. **Create service** in `src/services/db/myCollection.service.js`
4. **Write unit tests** in `src/services/db/__tests__/myCollection.service.test.js`
5. **Deploy rules** and test

### Debugging Firestore Permission Errors

**Error:** `FirebaseError: Missing or insufficient permissions`

**Steps:**
1. Check browser console for full error
2. Verify user is authenticated (`user.uid` exists)
3. Check Firestore rules match your data structure
4. Use Firebase Console → Firestore → Rules to test
5. Check document has required `userId` field

---

## Troubleshooting

### Environment Variables Not Loading

**Symptom:** `Firebase: Error (auth/api-key-not-valid)`

**Solution:**
1. Check `.env` exists in root directory
2. All React vars must start with `REACT_APP_`
3. **Restart dev server** (env vars load at startup)
4. Check for `.env.local` overriding `.env`
5. Remove trailing commas from values

### Firestore Permission Denied

**Symptom:** `Missing or insufficient permissions` in console

**Common Causes:**
- Document missing `userId` field
- Trying to access another user's data
- Security rules not updated after schema change
- Accessing subcollection without rules

**Solution:** Check `firestore.rules` and ensure rules match your data structure.

### Backend Connection Refused

**Symptom:** `POST http://localhost:5001/api/... net::ERR_CONNECTION_REFUSED`

**Solution:**
```bash
# Start backend server
npm run server

# Or start both frontend + backend
npm run dev
```

### Habit Completions Not Loading

**Cause:** Missing security rules for `habits/{habitId}/completions` subcollection.

**Solution:** Rules have been updated to include subcollection access.

---

## Important Files

| File | Purpose |
|------|---------|
| `firestore.rules` | Security rules (270+ lines) |
| `src/firebase.js` | Firebase initialization |
| `src/App.js` | Route configuration |
| `src/context/AuthContext.jsx` | Authentication state |
| `backend/server.js` | Express server & OpenAI integration |
| `.env` / `backend/.env` | Environment configuration |
| `FIRESTORE_SECURITY_RULES.md` | Security rules documentation |
| `ENVIRONMENT_VARIABLES_SETUP.md` | Environment setup guide |

---

## Additional Documentation

- `FIRESTORE_SECURITY_RULES.md` - Complete security rules documentation
- `TESTING_SECURITY_RULES.md` - Testing guide
- `ENVIRONMENT_VARIABLES_SETUP.md` - Environment setup instructions
- `POST_DEPLOYMENT_TESTING.md` - Post-deployment checklist

---

**For questions or issues, check the troubleshooting section above or review the comprehensive documentation files.**

# Admin Dashboard Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Build a Master Admin dashboard in the web app with role-based access, analytics, moderation, global challenges, and user management.

**Architecture:** Admin role stored on Firestore user docs, checked via `isAdmin()` helper in security rules and a React hook. Dashboard is a tabbed page at `/admin` with 5 tabs. Cloud Functions (v2 API) handle analytics aggregation, content moderation pipeline, and admin action side effects.

**Tech Stack:** React 19, Tailwind CSS, Recharts, Firebase Firestore/Auth/Cloud Functions v2, OpenAI API

**Spec:** `docs/superpowers/specs/2026-03-24-admin-dashboard-design.md`

**Important codebase conventions:**
- Cloud Functions use **v2 API** (`firebase-functions/v2/firestore`, `firebase-functions/v2/scheduler`, etc.)
- v2 Firestore triggers use `onDocumentCreated(event)` where `event.data?.data()` gets the doc data
- OpenAI key accessed via `defineSecret("OPENAI_API_KEY")` — dynamic import pattern (see `functions/index.js:31-36`)
- Functions are organized in `functions/src/` subdirectories, exported via barrel files
- Console logging in production gated behind `__DEV__` (web) or use `logger` (Cloud Functions)
- Existing `SidebarLayout` renders inside each page component (not at route level)

---

## Phase 1: Auth & Role System (Foundation)

### Task 1: Bootstrap Admin Script

**Files:**
- Create: `scripts/bootstrap-admin.js`

- [ ] **Step 1: Create the bootstrap script**

```javascript
// scripts/bootstrap-admin.js
const admin = require('firebase-admin');

// Initialize with application default credentials or service account
const serviceAccount = require('../service-account-key.json');
admin.initializeApp({
  credential: admin.credential.cert(serviceAccount),
});

const uid = process.argv[2];
if (!uid) {
  console.error('Usage: node scripts/bootstrap-admin.js <firebase-uid>');
  process.exit(1);
}

(async () => {
  try {
    const db = admin.firestore();
    await db.collection('users').doc(uid).update({
      role: 'admin',
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    });
    console.log(`Successfully set role: 'admin' on user ${uid}`);
  } catch (err) {
    console.error('Error setting admin role:', err.message);
    process.exit(1);
  }
  process.exit(0);
})();
```

**Security note:** Ensure `service-account-key.json` is listed in `.gitignore`. Verify before committing.

- [ ] **Step 2: Verify .gitignore includes service account key**

Run: `grep -q 'service-account-key' .gitignore && echo "OK" || echo "MISSING - add it"`

If missing, add `service-account-key.json` to `.gitignore`.

- [ ] **Step 3: Verify script syntax**

Run: `node -c scripts/bootstrap-admin.js`
Expected: No syntax errors

- [ ] **Step 4: Commit**

```bash
git add scripts/bootstrap-admin.js
git commit -m "feat: add admin bootstrap script using Firebase Admin SDK"
```

---

### Task 2: Firestore Security Rules — Admin Helpers & Enforcement

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Add `isAdmin()` and `isActiveUser()` helpers after `isPublicGroup()` (after line 50)**

```javascript
    // Check if user has admin role
    function isAdmin() {
      return isAuthenticated()
        && get(/databases/$(database)/documents/users/$(request.auth.uid)).data.role == 'admin';
    }

    // Check if user is not suspended or banned (auto-unsuspend if past expiry)
    function isActiveUser() {
      let userData = get(/databases/$(database)/documents/users/$(request.auth.uid)).data;
      return userData.moderationStatus == null
        || userData.moderationStatus == 'active'
        || (userData.moderationStatus == 'suspended'
            && userData.suspendedUntil != null
            && userData.suspendedUntil < request.time);
    }
```

- [ ] **Step 2: Update user document update rule (line 61)**

Change:
```javascript
      allow update: if request.auth.uid == userId;
```
To:
```javascript
      allow update: if request.auth.uid == userId
        || (isAdmin() && request.resource.data.diff(resource.data).affectedKeys()
            .hasOnly(['role', 'moderationStatus', 'suspendedUntil', 'updatedAt']));
```

- [ ] **Step 3: Add moderation history subcollection after existing user subcollections (after line 75)**

```javascript
      // Sub-collection: moderationHistory (admin-only)
      match /moderationHistory/{entryId} {
        allow read: if isAdmin();
        allow write: if false; // Cloud Functions use Admin SDK
      }
```

- [ ] **Step 4: Add `isActiveUser()` to posts create rule (line 279)**

Change:
```javascript
      allow create: if isAuthenticated() &&
```
To:
```javascript
      allow create: if isAuthenticated() && isActiveUser() &&
```

- [ ] **Step 5: Add `isActiveUser()` to connections create rule**

Find the connections create rule and add `isActiveUser()`:
```javascript
      allow create: if isAuthenticated() && isActiveUser() &&
```

- [ ] **Step 6: Add `isActiveUser()` to conversations create rule**

Change:
```javascript
      allow create: if isAuthenticated() && request.auth.uid in request.resource.data.participants;
```
To:
```javascript
      allow create: if isAuthenticated() && isActiveUser() && request.auth.uid in request.resource.data.participants;
```

- [ ] **Step 7: Add `isActiveUser()` to directMessages create rule**

Add `isActiveUser()` to the existing create rule for directMessages.

- [ ] **Step 8: Commit**

```bash
git add firestore.rules
git commit -m "feat: add isAdmin/isActiveUser helpers and enforce suspension on posts, DMs, connections"
```

---

### Task 3: Firestore Rules — Admin Collections & Challenge Rules

**Files:**
- Modify: `firestore.rules`

- [ ] **Step 1: Update challenge rules (lines 376-403) to support global challenges**

Replace the entire `match /challenges/{challengeId}` block:

```javascript
    match /challenges/{challengeId} {
      // Read: public/global visible to all authenticated, private to members, admin sees all
      allow read: if isAuthenticated() && (
        resource.data.visibility == 'public' ||
        resource.data.isGlobal == true ||
        request.auth.uid in resource.data.members ||
        isAdmin()
      );

      // Create: any active user for non-global, only admins for global
      allow create: if isAuthenticated() && isActiveUser() &&
        ((!request.resource.data.isGlobal && request.auth.uid == request.resource.data.ownerId)
         || (request.resource.data.isGlobal == true && isAdmin()));

      // Update: owner/members for non-global, admins for global, public join
      allow update: if isAuthenticated() && isActiveUser() && (
        request.auth.uid == resource.data.ownerId ||
        request.auth.uid in resource.data.members ||
        isAdmin() ||
        (resource.data.visibility == 'public' &&
         request.resource.data.diff(resource.data).affectedKeys().hasOnly(['members', 'memberCount', 'updatedAt', 'lastActivityAt']))
      );

      // Delete: owner for non-global, admin for any
      allow delete: if isAuthenticated() &&
        (isAdmin() || (request.auth.uid == resource.data.ownerId && resource.data.isGlobal != true));
    }
```

- [ ] **Step 2: Add rules for all admin collections (before final closing braces)**

```javascript
    // ========== ADMIN COLLECTIONS ==========

    // Admin analytics — read-only for admins, written by Cloud Functions
    match /adminAnalytics/{docId} {
      allow read: if isAdmin();
      allow write: if false;
    }

    // Moderation queue — admins read + update status fields only
    match /moderationQueue/{itemId} {
      allow read: if isAdmin();
      allow create: if false;
      allow update: if isAdmin()
        && request.resource.data.diff(resource.data).affectedKeys()
           .hasOnly(['status', 'reviewedBy', 'reviewedAt', 'action']);
      allow delete: if false;
    }

    // Moderation actions audit trail — admins create, no modifications
    match /moderationActions/{actionId} {
      allow read: if isAdmin();
      allow create: if isAdmin();
      allow update, delete: if false;
    }
```

- [ ] **Step 3: Commit**

```bash
git add firestore.rules
git commit -m "feat: add admin collection rules and merge global challenge support into challenge rules"
```

---

### Task 4: Admin Service Layer

**Files:**
- Create: `src/services/db/admin.service.js`

- [ ] **Step 1: Create admin service**

```javascript
import { db } from "../../firebase";
import {
  doc, getDoc, updateDoc, collection, query, where,
  getDocs, orderBy, limit, startAfter, serverTimestamp
} from "firebase/firestore";

/** Check if a user has admin role */
export async function checkIsAdmin(userId) {
  const ref = doc(db, "users", userId);
  const snap = await getDoc(ref);
  return snap.exists() && snap.data().role === "admin";
}

/** Grant admin role to a user */
export async function grantAdminRole(userId) {
  const ref = doc(db, "users", userId);
  await updateDoc(ref, { role: "admin", updatedAt: serverTimestamp() });
}

/** Revoke admin role from a user */
export async function revokeAdminRole(userId) {
  const ref = doc(db, "users", userId);
  await updateDoc(ref, { role: "user", updatedAt: serverTimestamp() });
}

/** Search users by display name prefix (Firestore range query) */
export async function searchUsers(searchTerm, pageSize = 25, lastDoc = null) {
  const usersRef = collection(db, "users");
  const prefix = searchTerm.trim();
  const endPrefix = prefix + "\uf8ff"; // Firestore prefix trick

  const constraints = [
    orderBy("displayName"),
    where("displayName", ">=", prefix),
    where("displayName", "<=", endPrefix),
    limit(pageSize),
  ];

  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(usersRef, ...constraints);
  const snap = await getDocs(q);

  const users = snap.docs.map(d => ({
    id: d.id,
    displayName: d.data().displayName,
    email: d.data().email,
    role: d.data().role || "user",
    moderationStatus: d.data().moderationStatus || "active",
    subscriptionType: d.data().subscription?.type || "unknown",
    createdAt: d.data().createdAt,
  }));

  return { users, lastDoc: snap.docs[snap.docs.length - 1] || null };
}

/** Get user detail for admin view (aggregated stats, no private content) */
export async function getAdminUserDetail(userId) {
  const userRef = doc(db, "users", userId);
  const userSnap = await getDoc(userRef);
  if (!userSnap.exists()) return null;

  const userData = userSnap.data();

  // Count documents in parallel for activity stats
  const [goalsSnap, habitsSnap, journalSnap, postsSnap, tasksSnap] = await Promise.all([
    getDocs(query(collection(db, "goals"), where("userId", "==", userId))),
    getDocs(query(collection(db, "habits"), where("userId", "==", userId))),
    getDocs(query(collection(db, "journalEntries"), where("userId", "==", userId))),
    getDocs(query(collection(db, "posts"), where("userId", "==", userId))),
    getDocs(query(collection(db, "tasks"), where("userId", "==", userId))),
  ]);

  // Get moderation history
  const modHistorySnap = await getDocs(
    query(
      collection(db, "users", userId, "moderationHistory"),
      orderBy("timestamp", "desc")
    )
  );

  return {
    id: userId,
    displayName: userData.displayName,
    email: userData.email,
    avatar: userData.avatar || userData.photoURL,
    bio: userData.bio,
    role: userData.role || "user",
    moderationStatus: userData.moderationStatus || "active",
    suspendedUntil: userData.suspendedUntil,
    subscription: {
      type: userData.subscription?.type || "unknown",
      trialStartedAt: userData.subscription?.trialStartedAt,
      trialExpiresAt: userData.subscription?.trialExpiresAt,
      premiumStartedAt: userData.subscription?.premiumStartedAt,
      billingPeriod: userData.subscription?.billingPeriod,
    },
    createdAt: userData.createdAt,
    activityStats: {
      goals: goalsSnap.size,
      habits: habitsSnap.size,
      journalEntries: journalSnap.size,
      posts: postsSnap.size,
      tasks: tasksSnap.size,
    },
    moderationHistory: modHistorySnap.docs.map(d => ({
      id: d.id,
      ...d.data(),
    })),
  };
}

/** Read a single analytics document */
export async function getAnalyticsDoc(docId) {
  const ref = doc(db, "adminAnalytics", docId);
  const snap = await getDoc(ref);
  return snap.exists() ? { id: snap.id, ...snap.data() } : null;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/db/admin.service.js
git commit -m "feat: add admin service layer for role management, user lookup, and analytics"
```

---

### Task 5: useAdmin Hook

**Files:**
- Create: `src/hooks/useAdmin.js`

- [ ] **Step 1: Create the hook**

```javascript
import { useState, useEffect } from "react";
import { useAuth } from "../context/AuthContext";
import { doc, onSnapshot } from "firebase/firestore";
import { db } from "../firebase";

/**
 * Hook that checks if the current user has admin role.
 * Uses a real-time listener so role changes take effect immediately.
 */
export function useAdmin() {
  const { user, isAuthReady } = useAuth();
  const [isAdmin, setIsAdmin] = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    if (!isAuthReady || !user?.uid) {
      setIsAdmin(false);
      setLoading(false);
      return;
    }

    const ref = doc(db, "users", user.uid);
    const unsubscribe = onSnapshot(ref, (snap) => {
      setIsAdmin(snap.exists() && snap.data().role === "admin");
      setLoading(false);
    }, () => {
      setIsAdmin(false);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [user?.uid, isAuthReady]);

  return { isAdmin, loading };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/hooks/useAdmin.js
git commit -m "feat: add useAdmin hook with real-time Firestore listener"
```

---

### Task 6: AdminRoute Component

**Files:**
- Create: `src/components/AdminRoute.jsx`

- [ ] **Step 1: Create the admin route guard**

```javascript
import React from "react";
import { Navigate } from "react-router-dom";
import { useAuth } from "../context/AuthContext";
import { useAdmin } from "../hooks/useAdmin";

export default function AdminRoute({ children }) {
  const { user, isAuthReady } = useAuth();
  const { isAdmin, loading } = useAdmin();

  if (!isAuthReady || loading) {
    return (
      <div className="p-10 text-center text-lg text-muted-sage-gray">
        Loading...
      </div>
    );
  }

  if (!user) {
    return <Navigate to="/login" />;
  }

  if (!isAdmin) {
    return <Navigate to="/dashboard" replace />;
  }

  return children;
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/AdminRoute.jsx
git commit -m "feat: add AdminRoute guard component"
```

---

### Task 7: Admin Dashboard Shell + Route + Sidebar

**Files:**
- Create: `src/pages/Admin/AdminDashboard.jsx`
- Modify: `src/App.js` (imports + route)
- Modify: `src/components/layout/SidebarLayout.jsx` (admin nav item)

- [ ] **Step 1: Create the tabbed dashboard shell**

```jsx
import React, { useState } from "react";
import SidebarLayout from "../../components/layout/SidebarLayout";

const TABS = [
  { id: "overview", label: "Overview" },
  { id: "analytics", label: "Analytics" },
  { id: "moderation", label: "Moderation" },
  { id: "challenges", label: "Challenges" },
  { id: "users", label: "Users" },
];

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState("overview");

  return (
    <SidebarLayout>
      <div className="max-w-7xl mx-auto px-vara-base py-vara-lg">
        <h1 className="text-vara-2xl font-bold text-soft-charcoal mb-vara-base">
          Admin Dashboard
        </h1>

        {/* Tab Navigation */}
        <div className="flex border-b border-divider mb-vara-lg overflow-x-auto">
          {TABS.map((tab) => (
            <button
              key={tab.id}
              onClick={() => setActiveTab(tab.id)}
              className={`px-vara-base py-vara-sm text-vara-sm font-medium whitespace-nowrap transition-colors ${
                activeTab === tab.id
                  ? "text-evergreen-teal border-b-2 border-evergreen-teal"
                  : "text-muted-sage-gray hover:text-soft-charcoal"
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>

        {/* Tab Content — placeholders replaced in later tasks */}
        <div>
          {activeTab === "overview" && <Placeholder label="Overview" />}
          {activeTab === "analytics" && <Placeholder label="Analytics" />}
          {activeTab === "moderation" && <Placeholder label="Moderation" />}
          {activeTab === "challenges" && <Placeholder label="Challenges" />}
          {activeTab === "users" && <Placeholder label="Users" />}
        </div>
      </div>
    </SidebarLayout>
  );
}

function Placeholder({ label }) {
  return <div className="text-muted-sage-gray">{label} tab coming soon...</div>;
}
```

- [ ] **Step 2: Add route and import to `src/App.js`**

Add imports after line 52:
```javascript
import AdminDashboard from "./pages/Admin/AdminDashboard";
import AdminRoute from "./components/AdminRoute";
```

Add route before closing `</Routes>` (before line 371):
```jsx
          <Route
            path="/admin"
            element={
              <AdminRoute>
                <AdminDashboard />
              </AdminRoute>
            }
          />
```

- [ ] **Step 3: Add admin link to sidebar in `src/components/layout/SidebarLayout.jsx`**

Add `Shield` to the lucide-react import:
```javascript
import {
  // ... existing imports ...
  UserSearch,
  Shield,
} from "lucide-react";
```

Add import for useAdmin after existing imports:
```javascript
import { useAdmin } from "../../hooks/useAdmin";
```

Inside the component function (after `const [mobileOpen, setMobileOpen] = useState(false);`), add:
```javascript
  const { isAdmin } = useAdmin();
```

Move `bottomItems` from module level (lines 82-86) into the component, making it conditional:
```javascript
  const bottomItems = [
    { path: "/ai", label: "AI Companion", icon: Bot },
    { path: "/profile", label: "My Profile", icon: User },
    { path: "/settings", label: "Settings", icon: SettingsIcon },
    ...(isAdmin ? [{ path: "/admin", label: "Admin", icon: Shield }] : []),
  ];
```

Delete the old module-level `bottomItems` constant (lines 82-86).

- [ ] **Step 4: Verify build**

Run: `cd C:/Users/kyler/wellness-app && npm run build`
Expected: Build succeeds

- [ ] **Step 5: Commit**

```bash
git add src/pages/Admin/AdminDashboard.jsx src/App.js src/components/layout/SidebarLayout.jsx
git commit -m "feat: add admin dashboard shell with tabbed layout, route guard, and sidebar link"
```

---

## Phase 2: Moderation Service & Queue UI

### Task 8: Moderation Service Layer

**Files:**
- Create: `src/services/db/adminModeration.service.js`

- [ ] **Step 1: Create moderation service**

```javascript
import { db } from "../../firebase";
import {
  collection, query, where, orderBy, limit, startAfter,
  getDocs, getCountFromServer, doc, updateDoc, addDoc, serverTimestamp
} from "firebase/firestore";

/** Fetch moderation queue with pagination and filters */
export async function getModerationQueue({
  status = "pending",
  source = null,
  pageSize = 25,
  lastDoc = null,
} = {}) {
  const queueRef = collection(db, "moderationQueue");
  const constraints = [
    where("status", "==", status),
    orderBy("severity", "desc"),
    orderBy("createdAt", "desc"),
    limit(pageSize),
  ];

  if (source) {
    constraints.splice(1, 0, where("source", "==", source));
  }
  if (lastDoc) {
    constraints.push(startAfter(lastDoc));
  }

  const q = query(queueRef, ...constraints);
  const snap = await getDocs(q);

  return {
    items: snap.docs.map(d => ({ id: d.id, ...d.data() })),
    lastDoc: snap.docs[snap.docs.length - 1] || null,
    hasMore: snap.docs.length === pageSize,
  };
}

/** Take a moderation action from the queue (updates queue item + creates audit entry) */
export async function takeQueueModerationAction({
  queueItemId,
  adminId,
  targetUserId,
  action,
  reason,
  duration = null,
}) {
  // 1. Update the queue item status
  const queueRef = doc(db, "moderationQueue", queueItemId);
  await updateDoc(queueRef, {
    status: "reviewed",
    reviewedBy: adminId,
    reviewedAt: serverTimestamp(),
    action,
  });

  // 2. Create audit trail entry (triggers onModerationAction Cloud Function)
  await addDoc(collection(db, "moderationActions"), {
    adminId,
    targetUserId,
    action,
    reason,
    duration,
    queueItemId,
    timestamp: serverTimestamp(),
  });
}

/** Take a direct moderation action on a user (no queue item involved) */
export async function takeDirectModerationAction({
  adminId,
  targetUserId,
  action,
  reason,
  duration = null,
}) {
  await addDoc(collection(db, "moderationActions"), {
    adminId,
    targetUserId,
    action,
    reason,
    duration,
    queueItemId: null,
    timestamp: serverTimestamp(),
  });
}

/** Get moderation stats for overview (uses count aggregation) */
export async function getModerationStats() {
  const pendingQuery = query(
    collection(db, "moderationQueue"),
    where("status", "==", "pending")
  );
  const urgentQuery = query(
    collection(db, "moderationQueue"),
    where("status", "==", "pending"),
    where("severity", "==", "high")
  );

  const [pendingSnap, urgentSnap] = await Promise.all([
    getCountFromServer(pendingQuery),
    getCountFromServer(urgentQuery),
  ]);

  return {
    pendingCount: pendingSnap.data().count,
    urgentCount: urgentSnap.data().count,
  };
}
```

- [ ] **Step 2: Commit**

```bash
git add src/services/db/adminModeration.service.js
git commit -m "feat: add admin moderation service with queue management, direct actions, and count aggregation"
```

---

### Task 9: Moderation Tab UI

**Files:**
- Create: `src/pages/Admin/ModerationTab.jsx`
- Modify: `src/pages/Admin/AdminDashboard.jsx`

- [ ] **Step 1: Create ModerationTab component**

```jsx
import React, { useState, useEffect, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { getModerationQueue, takeQueueModerationAction } from "../../services/db/adminModeration.service";
import { AlertTriangle, Shield, Trash2, MessageSquareWarning, Ban, Clock } from "lucide-react";

const SOURCE_LABELS = {
  user_report: "User Report",
  keyword_filter: "Keyword Filter",
  ai_review: "AI Review",
  moderation_error: "Needs Review",
};

const SEVERITY_COLORS = {
  high: "bg-red-100 text-red-800",
  medium: "bg-yellow-100 text-yellow-800",
  low: "bg-blue-100 text-blue-700",
};

export default function ModerationTab() {
  const { user } = useAuth();
  const [items, setItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState({ status: "pending", source: null });
  const [actionModal, setActionModal] = useState(null);
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const fetchQueue = useCallback(async () => {
    setLoading(true);
    try {
      const result = await getModerationQueue(filter);
      setItems(result.items);
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("Error fetching queue:", err);
    } finally {
      setLoading(false);
    }
  }, [filter]);

  useEffect(() => { fetchQueue(); }, [fetchQueue]);

  const handleAction = async () => {
    if (!actionModal || !reason.trim()) return;
    setSubmitting(true);
    try {
      await takeQueueModerationAction({
        queueItemId: actionModal.item.id,
        adminId: user.uid,
        targetUserId: actionModal.item.postAuthorId,
        action: actionModal.action,
        reason: reason.trim(),
        duration,
      });
      setActionModal(null);
      setReason("");
      setDuration(null);
      fetchQueue();
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("Error taking action:", err);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div>
      {/* Filters */}
      <div className="flex gap-vara-sm mb-vara-base flex-wrap">
        <select
          value={filter.status}
          onChange={(e) => setFilter(f => ({ ...f, status: e.target.value }))}
          className="border border-divider rounded-vara-md px-vara-sm py-vara-xs text-vara-sm"
        >
          <option value="pending">Pending</option>
          <option value="reviewed">Reviewed</option>
        </select>
        <select
          value={filter.source || ""}
          onChange={(e) => setFilter(f => ({ ...f, source: e.target.value || null }))}
          className="border border-divider rounded-vara-md px-vara-sm py-vara-xs text-vara-sm"
        >
          <option value="">All Sources</option>
          <option value="user_report">User Reports</option>
          <option value="keyword_filter">Keyword Filter</option>
          <option value="ai_review">AI Review</option>
          <option value="moderation_error">Needs Review</option>
        </select>
      </div>

      {/* Queue */}
      {loading ? (
        <div className="text-muted-sage-gray text-center py-vara-lg">Loading queue...</div>
      ) : items.length === 0 ? (
        <div className="text-center py-vara-xl text-muted-sage-gray">
          <Shield size={48} className="mx-auto mb-vara-sm opacity-50" />
          <p>No items in the moderation queue</p>
        </div>
      ) : (
        <div className="space-y-vara-sm">
          {items.map((item) => (
            <div key={item.id} className="border border-divider rounded-vara-lg p-vara-base bg-white">
              <div className="flex items-start justify-between gap-vara-sm">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center gap-vara-xs mb-vara-xs flex-wrap">
                    <span className={`px-2 py-0.5 rounded-full text-vara-xs font-medium ${SEVERITY_COLORS[item.severity] || SEVERITY_COLORS.low}`}>
                      {item.severity}
                    </span>
                    <span className="text-vara-xs text-muted-sage-gray">{SOURCE_LABELS[item.source] || item.source}</span>
                    <span className="text-vara-xs text-muted-sage-gray">by {item.postAuthorName || "Unknown"}</span>
                  </div>
                  <p className="text-vara-sm text-soft-charcoal mb-vara-xs line-clamp-3">{item.postContent}</p>
                  {item.postImageUrl && (
                    <img src={item.postImageUrl} alt="Flagged content" className="w-24 h-24 object-cover rounded-vara-md border border-divider mb-vara-xs" />
                  )}
                  <p className="text-vara-xs text-muted-sage-gray">
                    <span className="font-medium">Reason:</span> {item.reason}
                  </p>
                  {item.aiConfidence != null && (
                    <p className="text-vara-xs text-muted-sage-gray">AI Confidence: {(item.aiConfidence * 100).toFixed(0)}%</p>
                  )}
                </div>
                {item.status === "pending" && (
                  <div className="flex flex-col gap-1 flex-shrink-0">
                    <button onClick={() => setActionModal({ item, action: "dismiss" })} className="px-3 py-1.5 text-vara-xs rounded-vara-md border border-divider hover:bg-dew-sage-light">Dismiss</button>
                    <button onClick={() => setActionModal({ item, action: "remove_post" })} className="px-3 py-1.5 text-vara-xs rounded-vara-md bg-red-50 text-red-700 hover:bg-red-100 flex items-center gap-1"><Trash2 size={12} /> Remove</button>
                    <button onClick={() => setActionModal({ item, action: "warn" })} className="px-3 py-1.5 text-vara-xs rounded-vara-md bg-yellow-50 text-yellow-700 hover:bg-yellow-100 flex items-center gap-1"><MessageSquareWarning size={12} /> Warn</button>
                    <button onClick={() => setActionModal({ item, action: "remove_warn" })} className="px-3 py-1.5 text-vara-xs rounded-vara-md bg-orange-50 text-orange-700 hover:bg-orange-100 flex items-center gap-1"><Trash2 size={12} /> Remove + Warn</button>
                    <button onClick={() => setActionModal({ item, action: "suspend" })} className="px-3 py-1.5 text-vara-xs rounded-vara-md bg-orange-50 text-orange-700 hover:bg-orange-100 flex items-center gap-1"><Clock size={12} /> Suspend</button>
                    <button onClick={() => setActionModal({ item, action: "ban" })} className="px-3 py-1.5 text-vara-xs rounded-vara-md bg-red-100 text-red-800 hover:bg-red-200 flex items-center gap-1"><Ban size={12} /> Ban</button>
                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Action Confirmation Modal */}
      {actionModal && (
        <div className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-vara-base">
          <div className="bg-white rounded-vara-xl p-vara-lg w-full max-w-md shadow-vara-lg">
            <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-sm capitalize">
              {actionModal.action.replace(/_/g, " ")} — Confirm
            </h3>
            <p className="text-vara-sm text-muted-sage-gray mb-vara-base">Target: {actionModal.item.postAuthorName || "Unknown"}</p>

            {actionModal.action === "suspend" && (
              <div className="mb-vara-base">
                <label className="block text-vara-sm font-medium mb-vara-xs">Duration</label>
                <select value={duration || ""} onChange={(e) => setDuration(Number(e.target.value))} className="w-full border border-divider rounded-vara-md px-vara-sm py-vara-xs text-vara-sm">
                  <option value="">Select duration</option>
                  <option value="1">1 day</option>
                  <option value="3">3 days</option>
                  <option value="7">7 days</option>
                  <option value="30">30 days</option>
                </select>
              </div>
            )}

            <div className="mb-vara-base">
              <label className="block text-vara-sm font-medium mb-vara-xs">Reason (required)</label>
              <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border border-divider rounded-vara-md px-vara-sm py-vara-xs text-vara-sm min-h-[80px] resize-y" placeholder="Describe the reason..." />
            </div>

            {actionModal.action === "ban" && (
              <div className="bg-red-50 border border-red-200 rounded-vara-md p-vara-sm mb-vara-base">
                <p className="text-vara-xs text-red-800 font-medium flex items-center gap-1"><AlertTriangle size={14} /> This will permanently disable this user's account.</p>
              </div>
            )}

            <div className="flex gap-vara-sm justify-end">
              <button onClick={() => { setActionModal(null); setReason(""); setDuration(null); }} className="px-vara-base py-vara-xs border border-divider rounded-vara-md text-vara-sm hover:bg-dew-sage-light">Cancel</button>
              <button onClick={handleAction} disabled={!reason.trim() || submitting || (actionModal.action === "suspend" && !duration)} className="px-vara-base py-vara-xs bg-evergreen-teal text-white rounded-vara-md text-vara-sm disabled:opacity-50">
                {submitting ? "Processing..." : "Confirm"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update AdminDashboard to import and render ModerationTab**

In `src/pages/Admin/AdminDashboard.jsx`, add import:
```javascript
import ModerationTab from "./ModerationTab";
```

Replace `{activeTab === "moderation" && <Placeholder label="Moderation" />}` with:
```jsx
{activeTab === "moderation" && <ModerationTab />}
```

- [ ] **Step 3: Verify build**

Run: `npm run build`

- [ ] **Step 4: Commit**

```bash
git add src/pages/Admin/ModerationTab.jsx src/pages/Admin/AdminDashboard.jsx
git commit -m "feat: add moderation queue tab with filtering, actions, and remove+warn option"
```

---

## Phase 3: Users Tab

### Task 10: Users Tab UI

**Files:**
- Create: `src/pages/Admin/UsersTab.jsx`
- Modify: `src/pages/Admin/AdminDashboard.jsx`

- [ ] **Step 1: Create UsersTab component**

Key differences from v1 plan:
- Uses `takeDirectModerationAction` (no fake queue IDs)
- Shows Unsuspend/Unban buttons for suspended/banned users
- Includes tasks count in activity stats

```jsx
import React, { useState, useCallback } from "react";
import { useAuth } from "../../context/AuthContext";
import { searchUsers, getAdminUserDetail, grantAdminRole, revokeAdminRole } from "../../services/db/admin.service";
import { takeDirectModerationAction } from "../../services/db/adminModeration.service";
import { Search, Shield, ShieldOff, MessageSquareWarning, Clock, Ban, ChevronLeft, User, Undo2 } from "lucide-react";

export default function UsersTab() {
  const { user: currentUser } = useAuth();
  const [searchTerm, setSearchTerm] = useState("");
  const [users, setUsers] = useState([]);
  const [searching, setSearching] = useState(false);
  const [selectedUser, setSelectedUser] = useState(null);
  const [loadingDetail, setLoadingDetail] = useState(false);
  const [actionModal, setActionModal] = useState(null);
  const [reason, setReason] = useState("");
  const [duration, setDuration] = useState(null);
  const [submitting, setSubmitting] = useState(false);

  const handleSearch = useCallback(async () => {
    if (!searchTerm.trim()) return;
    setSearching(true);
    try {
      const result = await searchUsers(searchTerm.trim());
      setUsers(result.users);
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("Error searching:", err);
    } finally {
      setSearching(false);
    }
  }, [searchTerm]);

  const handleSelectUser = async (userId) => {
    setLoadingDetail(true);
    try {
      const detail = await getAdminUserDetail(userId);
      setSelectedUser(detail);
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("Error loading user:", err);
    } finally {
      setLoadingDetail(false);
    }
  };

  const handleRoleToggle = async (userId, currentRole) => {
    try {
      if (currentRole === "admin") {
        await revokeAdminRole(userId);
      } else {
        await grantAdminRole(userId);
      }
      handleSelectUser(userId);
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("Error updating role:", err);
    }
  };

  const handleUserAction = async () => {
    if (!actionModal || !reason.trim()) return;
    setSubmitting(true);
    try {
      await takeDirectModerationAction({
        adminId: currentUser.uid,
        targetUserId: selectedUser.id,
        action: actionModal,
        reason: reason.trim(),
        duration,
      });
      setActionModal(null);
      setReason("");
      setDuration(null);
      handleSelectUser(selectedUser.id);
    } catch (err) {
      if (process.env.NODE_ENV === "development") console.error("Error taking action:", err);
    } finally {
      setSubmitting(false);
    }
  };

  // Detail view
  if (selectedUser) {
    const isSuspended = selectedUser.moderationStatus === "suspended";
    const isBanned = selectedUser.moderationStatus === "banned";
    const isNotSelf = selectedUser.id !== currentUser.uid;

    return (
      <div>
        <button onClick={() => setSelectedUser(null)} className="flex items-center gap-1 text-vara-sm text-evergreen-teal hover:underline mb-vara-base">
          <ChevronLeft size={16} /> Back to search
        </button>

        {loadingDetail ? (
          <div className="text-muted-sage-gray text-center py-vara-lg">Loading...</div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-vara-base">
            {/* Profile Summary */}
            <div className="lg:col-span-1 border border-divider rounded-vara-lg p-vara-base bg-white">
              <div className="flex items-center gap-vara-sm mb-vara-base">
                {selectedUser.avatar ? (
                  <img src={selectedUser.avatar} alt="" className="w-12 h-12 rounded-full object-cover" />
                ) : (
                  <div className="w-12 h-12 rounded-full bg-dew-sage flex items-center justify-center">
                    <User size={24} className="text-evergreen-teal" />
                  </div>
                )}
                <div>
                  <h3 className="text-vara-base font-semibold text-soft-charcoal">{selectedUser.displayName}</h3>
                  <p className="text-vara-xs text-muted-sage-gray">{selectedUser.email}</p>
                </div>
              </div>
              <div className="space-y-vara-xs text-vara-sm">
                <div className="flex justify-between"><span className="text-muted-sage-gray">Role</span><span className="font-medium capitalize">{selectedUser.role}</span></div>
                <div className="flex justify-between"><span className="text-muted-sage-gray">Status</span>
                  <span className={`font-medium capitalize ${isBanned ? "text-red-700" : isSuspended ? "text-orange-700" : "text-green-700"}`}>{selectedUser.moderationStatus}</span>
                </div>
                <div className="flex justify-between"><span className="text-muted-sage-gray">Subscription</span><span className="font-medium capitalize">{selectedUser.subscription.type}</span></div>
                <div className="flex justify-between"><span className="text-muted-sage-gray">Joined</span>
                  <span className="font-medium">{selectedUser.createdAt?.toDate?.()?.toLocaleDateString() || "Unknown"}</span>
                </div>
              </div>

              {/* Actions */}
              {isNotSelf && (
                <div className="mt-vara-base pt-vara-base border-t border-divider space-y-vara-xs">
                  <button onClick={() => handleRoleToggle(selectedUser.id, selectedUser.role)} className="w-full flex items-center gap-2 px-vara-sm py-vara-xs rounded-vara-md text-vara-sm border border-divider hover:bg-dew-sage-light">
                    {selectedUser.role === "admin" ? <ShieldOff size={14} /> : <Shield size={14} />}
                    {selectedUser.role === "admin" ? "Revoke Admin" : "Grant Admin"}
                  </button>
                  {(isSuspended || isBanned) && (
                    <button onClick={() => setActionModal(isBanned ? "unban" : "unsuspend")} className="w-full flex items-center gap-2 px-vara-sm py-vara-xs rounded-vara-md text-vara-sm bg-green-50 text-green-700 hover:bg-green-100">
                      <Undo2 size={14} /> {isBanned ? "Unban User" : "Unsuspend User"}
                    </button>
                  )}
                  {!isBanned && (
                    <>
                      <button onClick={() => setActionModal("warn")} className="w-full flex items-center gap-2 px-vara-sm py-vara-xs rounded-vara-md text-vara-sm bg-yellow-50 text-yellow-700 hover:bg-yellow-100">
                        <MessageSquareWarning size={14} /> Warn User
                      </button>
                      <button onClick={() => setActionModal("suspend")} className="w-full flex items-center gap-2 px-vara-sm py-vara-xs rounded-vara-md text-vara-sm bg-orange-50 text-orange-700 hover:bg-orange-100">
                        <Clock size={14} /> Suspend User
                      </button>
                      <button onClick={() => setActionModal("ban")} className="w-full flex items-center gap-2 px-vara-sm py-vara-xs rounded-vara-md text-vara-sm bg-red-100 text-red-800 hover:bg-red-200">
                        <Ban size={14} /> Ban User
                      </button>
                    </>
                  )}
                </div>
              )}
            </div>

            {/* Activity Stats */}
            <div className="lg:col-span-1 border border-divider rounded-vara-lg p-vara-base bg-white">
              <h3 className="text-vara-base font-semibold text-soft-charcoal mb-vara-sm">Activity</h3>
              <div className="grid grid-cols-2 gap-vara-sm">
                {Object.entries(selectedUser.activityStats).map(([key, value]) => (
                  <div key={key} className="bg-mist-white rounded-vara-md p-vara-sm text-center">
                    <p className="text-vara-lg font-bold text-evergreen-teal">{value}</p>
                    <p className="text-vara-xs text-muted-sage-gray capitalize">{key.replace(/([A-Z])/g, " $1")}</p>
                  </div>
                ))}
              </div>
            </div>

            {/* Moderation History */}
            <div className="lg:col-span-1 border border-divider rounded-vara-lg p-vara-base bg-white">
              <h3 className="text-vara-base font-semibold text-soft-charcoal mb-vara-sm">Moderation History</h3>
              {selectedUser.moderationHistory.length === 0 ? (
                <p className="text-vara-sm text-muted-sage-gray">No moderation history</p>
              ) : (
                <div className="space-y-vara-sm max-h-64 overflow-y-auto">
                  {selectedUser.moderationHistory.map((entry) => (
                    <div key={entry.id} className="border-l-2 border-divider pl-vara-sm">
                      <p className="text-vara-sm font-medium capitalize">{entry.action}</p>
                      <p className="text-vara-xs text-muted-sage-gray">{entry.reason}</p>
                      <p className="text-vara-xs text-muted-sage-gray">{entry.timestamp?.toDate?.()?.toLocaleDateString() || "Unknown"}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* Action Modal */}
        {actionModal && (
          <div className="fixed inset-0 z-50 bg-overlay flex items-center justify-center p-vara-base">
            <div className="bg-white rounded-vara-xl p-vara-lg w-full max-w-md shadow-vara-lg">
              <h3 className="text-vara-lg font-semibold text-soft-charcoal mb-vara-sm capitalize">{actionModal} — {selectedUser.displayName}</h3>
              {actionModal === "suspend" && (
                <div className="mb-vara-base">
                  <label className="block text-vara-sm font-medium mb-vara-xs">Duration</label>
                  <select value={duration || ""} onChange={(e) => setDuration(Number(e.target.value))} className="w-full border border-divider rounded-vara-md px-vara-sm py-vara-xs text-vara-sm">
                    <option value="">Select duration</option>
                    <option value="1">1 day</option><option value="3">3 days</option><option value="7">7 days</option><option value="30">30 days</option>
                  </select>
                </div>
              )}
              <div className="mb-vara-base">
                <label className="block text-vara-sm font-medium mb-vara-xs">Reason (required)</label>
                <textarea value={reason} onChange={(e) => setReason(e.target.value)} className="w-full border border-divider rounded-vara-md px-vara-sm py-vara-xs text-vara-sm min-h-[80px] resize-y" placeholder="Describe the reason..." />
              </div>
              <div className="flex gap-vara-sm justify-end">
                <button onClick={() => { setActionModal(null); setReason(""); setDuration(null); }} className="px-vara-base py-vara-xs border border-divider rounded-vara-md text-vara-sm">Cancel</button>
                <button onClick={handleUserAction} disabled={!reason.trim() || submitting || (actionModal === "suspend" && !duration)} className="px-vara-base py-vara-xs bg-evergreen-teal text-white rounded-vara-md text-vara-sm disabled:opacity-50">
                  {submitting ? "Processing..." : "Confirm"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }

  // Search view
  return (
    <div>
      <div className="flex gap-vara-sm mb-vara-base">
        <div className="relative flex-1">
          <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-muted-sage-gray" />
          <input type="text" value={searchTerm} onChange={(e) => setSearchTerm(e.target.value)} onKeyDown={(e) => e.key === "Enter" && handleSearch()} placeholder="Search by display name..." className="w-full pl-9 pr-vara-sm py-vara-xs border border-divider rounded-vara-md text-vara-sm" />
        </div>
        <button onClick={handleSearch} disabled={searching || !searchTerm.trim()} className="px-vara-base py-vara-xs bg-evergreen-teal text-white rounded-vara-md text-vara-sm disabled:opacity-50">
          {searching ? "Searching..." : "Search"}
        </button>
      </div>
      {users.length > 0 && (
        <div className="border border-divider rounded-vara-lg overflow-hidden">
          <table className="w-full text-vara-sm">
            <thead className="bg-mist-white">
              <tr>
                <th className="text-left px-vara-base py-vara-sm font-medium text-muted-sage-gray">Name</th>
                <th className="text-left px-vara-base py-vara-sm font-medium text-muted-sage-gray">Email</th>
                <th className="text-left px-vara-base py-vara-sm font-medium text-muted-sage-gray">Role</th>
                <th className="text-left px-vara-base py-vara-sm font-medium text-muted-sage-gray">Status</th>
                <th className="text-left px-vara-base py-vara-sm font-medium text-muted-sage-gray">Subscription</th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} onClick={() => handleSelectUser(u.id)} className="border-t border-divider hover:bg-dew-sage-light cursor-pointer">
                  <td className="px-vara-base py-vara-sm font-medium">{u.displayName || "—"}</td>
                  <td className="px-vara-base py-vara-sm text-muted-sage-gray">{u.email}</td>
                  <td className="px-vara-base py-vara-sm capitalize">{u.role}</td>
                  <td className="px-vara-base py-vara-sm"><span className={`capitalize ${u.moderationStatus === "banned" ? "text-red-700" : u.moderationStatus === "suspended" ? "text-orange-700" : "text-green-700"}`}>{u.moderationStatus}</span></td>
                  <td className="px-vara-base py-vara-sm capitalize">{u.subscriptionType}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Update AdminDashboard to import and render UsersTab**

Add import and replace placeholder, same pattern as ModerationTab.

- [ ] **Step 3: Verify build, commit**

```bash
git add src/pages/Admin/UsersTab.jsx src/pages/Admin/AdminDashboard.jsx
git commit -m "feat: add users tab with prefix search, detail view, unsuspend/unban, and direct moderation actions"
```

---

## Phase 4: Overview & Analytics Tabs

### Task 11: Install Recharts

- [ ] **Step 1:** Run: `cd C:/Users/kyler/wellness-app && npm install recharts`
- [ ] **Step 2:** Commit: `git add package.json package-lock.json && git commit -m "chore: add recharts for admin analytics charts"`

---

### Task 12: Overview Tab

**Files:**
- Create: `src/pages/Admin/OverviewTab.jsx`
- Modify: `src/pages/Admin/AdminDashboard.jsx`

- [ ] **Step 1: Create OverviewTab** with KPI cards (Total Users, WAU, Trial Conversion, Moderation Queue). Uses `getAnalyticsDoc("rolling")`, `getAnalyticsDoc("subscriptionMetrics")`, and `getModerationStats()`. Shows helpful message when analytics data hasn't been aggregated yet.

- [ ] **Step 2: Update AdminDashboard**, verify build, commit

```bash
git commit -m "feat: add overview tab with KPI cards for users, retention, conversions, and moderation"
```

---

### Task 13: Analytics Tab

**Files:**
- Create: `src/pages/Admin/AnalyticsTab.jsx`
- Modify: `src/pages/Admin/AdminDashboard.jsx`

- [ ] **Step 1: Create AnalyticsTab** with sections: User Health (from `rolling`), Subscriptions with PieChart (from `subscriptionMetrics`), Feature Adoption with BarChart including Tasks (from `featureAdoption`), Community Vitals (from `communityVitals`), Content Performance top 5 (from `contentPerformance`). Uses Recharts `BarChart`, `PieChart`, `ResponsiveContainer`.

- [ ] **Step 2: Update AdminDashboard**, verify build, commit

```bash
git commit -m "feat: add analytics tab with charts for users, subscriptions, adoption, community, and content"
```

---

## Phase 5: Challenges Tab

### Task 14: Admin Challenges Service

**Files:**
- Create: `src/services/db/adminChallenges.service.js`

- [ ] **Step 1: Create service** with: `createGlobalChallenge`, `updateGlobalChallenge`, `endChallenge`, `listGlobalChallenges`, `getChallengeStats`. Sets `isGlobal: true`, `createdByAdmin: true` on creation.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add admin challenges service for global challenge CRUD"
```

---

### Task 15: Challenges Tab UI

**Files:**
- Create: `src/pages/Admin/ChallengesTab.jsx`
- Modify: `src/pages/Admin/AdminDashboard.jsx`

- [ ] **Step 1: Create ChallengesTab** with: create form (title, description, frequency, target, dates, featured toggle), challenges list with participation stats, feature/unfeature and end buttons.

- [ ] **Step 2: Update AdminDashboard**, verify build, commit

```bash
git commit -m "feat: add challenges tab with global challenge creation, stats, and management"
```

---

## Phase 6: Cloud Functions (v2 API)

### Task 16: Content Moderation Cloud Function

**Files:**
- Create: `functions/src/admin/moderation.js`
- Modify: `functions/index.js` (add exports)

- [ ] **Step 1: Create `functions/src/admin/moderation.js`**

Must use v2 API patterns:
```javascript
const {onDocumentCreated} = require("firebase-functions/v2/firestore");
const {defineSecret} = require("firebase-functions/params");
const admin = require("firebase-admin");
const logger = require("firebase-functions/logger");

const OPENAI_API_KEY = defineSecret("OPENAI_API_KEY");

async function makeOpenAI() {
  const {default: OpenAI} = await import("openai");
  return new OpenAI({apiKey: OPENAI_API_KEY.value()});
}

// Export trigger
const onPostCreate_moderateContent = onDocumentCreated(
  {document: "posts/{postId}", secrets: [OPENAI_API_KEY]},
  async (event) => {
    const post = event.data?.data();
    if (!post) return;
    const postId = event.params.postId;
    // ... keyword check, image moderation, AI review
  }
);

const onPostReport_createQueueItem = onDocumentCreated(
  {document: "postReports/{reportId}"},
  async (event) => {
    const report = event.data?.data();
    if (!report) return;
    // ... bridge to moderationQueue
  }
);

const onPostUpdate_moderateComments = onDocumentCreated(
  // NOTE: v2 doesn't have onDocumentUpdated with before/after in the same way
  // Use onDocumentWritten from firebase-functions/v2/firestore instead
  // ...
);

module.exports = {onPostCreate_moderateContent, onPostReport_createQueueItem};
```

Implementation includes:
- `getBlocklist()` — reads `config/moderationBlocklist`
- `checkKeywords()` — exact match + regex patterns
- `moderateImage()` — OpenAI moderation endpoint
- `aiReviewText()` — GPT-4o-mini with community standards context
- `addToQueue()` — writes to `moderationQueue`
- Error handling: API failures flag post with `source: 'moderation_error'` for manual review
- Auto-hide on high severity matches
- Marks post as `moderationReviewed: true` to prevent re-processing

- [ ] **Step 2: Commit**

```bash
git add functions/src/admin/moderation.js
git commit -m "feat: add content moderation Cloud Function with keyword, AI, and image review"
```

---

### Task 17: Moderation Action + Comment Moderation Cloud Functions

**Files:**
- Create: `functions/src/admin/moderationActions.js`

- [ ] **Step 1: Create `functions/src/admin/moderationActions.js`**

Uses v2 API: `onDocumentCreated` for `moderationActions/{actionId}`.

Handles: suspend (set `suspendedUntil`), ban (disable Firebase Auth + revoke tokens), unsuspend/unban (restore), remove_post (hide post), remove_warn (hide post + warn), warn (notification only), dismiss (no-op).

Writes to `users/{uid}/moderationHistory` subcollection and creates notification via Admin SDK.

Batch writes limited to 500 operations (check size before commit, chunk if needed).

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add moderation action handler and comment moderation trigger"
```

---

### Task 18: Analytics Aggregation Cloud Function

**Files:**
- Create: `functions/src/admin/analytics.js`

- [ ] **Step 1: Create `functions/src/admin/analytics.js`**

Uses v2 API: `onSchedule` from `firebase-functions/v2/scheduler`.

```javascript
const {onSchedule} = require("firebase-functions/v2/scheduler");

const aggregateAnalytics = onSchedule(
  {schedule: "0 3 * * *", timeZone: "America/New_York"},
  async () => { /* ... */ }
);

const aggregateAnalyticsFull = onSchedule(
  {schedule: "0 3 * * 0", timeZone: "America/New_York"}, // Sunday 3 AM
  async () => { /* full recount */ }
);
```

Writes to `adminAnalytics` collection using **flat document structure** (not subcollections):
- `adminAnalytics/rolling` — WAU, MAU, DAU, retention
- `adminAnalytics/featureAdoption` — adoption percentages including tasks
- `adminAnalytics/subscriptionMetrics` — trial/paid/coaching/expired counts, conversion rate
- `adminAnalytics/communityVitals` — groups, posts, connections
- `adminAnalytics/meta` — lastRunAt timestamp

Daily snapshots stored as `adminAnalytics/daily-YYYY-MM-DD` (flat docs with date prefix, avoids subcollection path issues).

Uses Firestore `count()` aggregation where possible to minimize reads.

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add nightly + weekly analytics aggregation Cloud Functions"
```

---

### Task 19: Suspension Cleanup + Blocklist Callable

**Files:**
- Create: `functions/src/admin/cleanup.js`

- [ ] **Step 1: Create cleanup and blocklist functions**

```javascript
const {onSchedule} = require("firebase-functions/v2/scheduler");
const {onCall, HttpsError} = require("firebase-functions/v2/https");

// Nightly cleanup of expired suspensions
const cleanupExpiredSuspensions = onSchedule(
  {schedule: "0 4 * * *", timeZone: "America/New_York"},
  async () => { /* query suspended users with expired suspendedUntil, batch update in chunks of 500 */ }
);

// HTTPS callable for admin to update moderation blocklist
const updateModerationBlocklist = onCall(async (request) => {
  // Verify caller is admin
  const uid = request.auth?.uid;
  if (!uid) throw new HttpsError("unauthenticated", "Must be logged in");
  const userDoc = await admin.firestore().doc(`users/${uid}`).get();
  if (userDoc.data()?.role !== "admin") throw new HttpsError("permission-denied", "Admin only");

  const {exactMatch, patternMatch, severity} = request.data;
  await admin.firestore().doc("config/moderationBlocklist").set(
    {exactMatch, patternMatch, severity, updatedAt: admin.firestore.FieldValue.serverTimestamp()},
    {merge: true}
  );
  return {success: true};
});
```

- [ ] **Step 2: Commit**

```bash
git commit -m "feat: add expired suspension cleanup and blocklist management callable"
```

---

### Task 20: Wire Up Cloud Functions Exports

**Files:**
- Create: `functions/src/admin/index.js` (barrel export)
- Modify: `functions/index.js` (add admin exports)

- [ ] **Step 1: Create barrel export at `functions/src/admin/index.js`**

```javascript
const {onPostCreate_moderateContent, onPostReport_createQueueItem} = require("./moderation");
const {onModerationAction} = require("./moderationActions");
const {aggregateAnalytics, aggregateAnalyticsFull} = require("./analytics");
const {cleanupExpiredSuspensions, updateModerationBlocklist} = require("./cleanup");

module.exports = {
  onPostCreate_moderateContent,
  onPostReport_createQueueItem,
  onModerationAction,
  aggregateAnalytics,
  aggregateAnalyticsFull,
  cleanupExpiredSuspensions,
  updateModerationBlocklist,
};
```

- [ ] **Step 2: Add exports to `functions/index.js`**

After existing notification exports, add:
```javascript
// Admin & Moderation Cloud Functions
const adminFunctions = require("./src/admin");
exports.onPostCreate_moderateContent = adminFunctions.onPostCreate_moderateContent;
exports.onPostReport_createQueueItem = adminFunctions.onPostReport_createQueueItem;
exports.onModerationAction = adminFunctions.onModerationAction;
exports.aggregateAnalytics = adminFunctions.aggregateAnalytics;
exports.aggregateAnalyticsFull = adminFunctions.aggregateAnalyticsFull;
exports.cleanupExpiredSuspensions = adminFunctions.cleanupExpiredSuspensions;
exports.updateModerationBlocklist = adminFunctions.updateModerationBlocklist;
```

- [ ] **Step 3: Verify functions parse**

Run: `cd functions && node -e "require('./index.js'); console.log('OK')"`

- [ ] **Step 4: Commit**

```bash
git add functions/src/admin/ functions/index.js
git commit -m "feat: wire up all admin Cloud Functions exports"
```

---

## Phase 7: Final Verification

### Task 21: Full Build + File Verification

- [ ] **Step 1:** Run: `npm run build` — Expected: succeeds
- [ ] **Step 2:** Verify all files exist:
  - `scripts/bootstrap-admin.js`
  - `src/hooks/useAdmin.js`
  - `src/components/AdminRoute.jsx`
  - `src/pages/Admin/AdminDashboard.jsx`
  - `src/pages/Admin/OverviewTab.jsx`
  - `src/pages/Admin/AnalyticsTab.jsx`
  - `src/pages/Admin/ModerationTab.jsx`
  - `src/pages/Admin/ChallengesTab.jsx`
  - `src/pages/Admin/UsersTab.jsx`
  - `src/services/db/admin.service.js`
  - `src/services/db/adminModeration.service.js`
  - `src/services/db/adminChallenges.service.js`
  - `functions/src/admin/moderation.js`
  - `functions/src/admin/moderationActions.js`
  - `functions/src/admin/analytics.js`
  - `functions/src/admin/cleanup.js`
  - `functions/src/admin/index.js`

- [ ] **Step 3: Final commit if cleanup needed**

---

## Deployment Notes (Post-Implementation)

1. **Bootstrap admin:** `node scripts/bootstrap-admin.js <your-firebase-uid>`
2. **Deploy rules:** `firebase deploy --only firestore:rules`
3. **Deploy functions:** `cd functions && npm install && firebase deploy --only functions`
4. **Set OpenAI secret:** `firebase functions:secrets:set OPENAI_API_KEY`
5. **Seed blocklist:** Create `config/moderationBlocklist` doc in Firestore Console
6. **Deploy web:** `npm run build && firebase deploy --only hosting`

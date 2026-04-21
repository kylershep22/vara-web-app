# Phase 7: Community Parity — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add post types, wire the existing report modal, add mute integration, feed filtering, and a community orientation card.

**Architecture:** CommunityPage.jsx is 2143 lines with an inline PostCard. Rather than heavily refactoring, we create small standalone components (CommunityOrientationCard, PostTypeSelector, PostTypeBadge) and make targeted edits to CommunityPage.jsx to wire them in. The existing ReportPostModal and moderation.service.js are already built — they just need to be connected. The mutedUsers service from Phase 5 is also ready.

**Tech Stack:** React, Tailwind CSS, Firebase Firestore, lucide-react

---

## File Structure

| File | Action | Responsibility |
|------|--------|----------------|
| `src/components/community/CommunityOrientationCard.jsx` | Create | First-visit welcome card |
| `src/components/community/PostTypeSelector.jsx` | Create | Post type chip selector for creation |
| `src/components/community/PostTypeBadge.jsx` | Create | Type badge displayed on post cards |
| `src/pages/Community/CommunityPage.jsx` | Modify | Wire orientation card, post types, overflow menu, mute filtering, feed filter chips |

---

### Task 1: CommunityOrientationCard Component

**Files:**
- Create: `src/components/community/CommunityOrientationCard.jsx`

- [ ] **Step 1: Create the component**

```jsx
import React from "react";
import { useNavigate } from "react-router-dom";
import { Users, Trophy, MessageCircle, ArrowRight, X } from "lucide-react";
import { doc, updateDoc } from "firebase/firestore";
import { db } from "../../firebase";

const CONCEPTS = [
  { icon: Users, label: "Groups", desc: "Ongoing shared spaces for connection" },
  { icon: Trophy, label: "Challenges", desc: "Time-bound intentions to try together" },
  { icon: MessageCircle, label: "Posts & Check-ins", desc: "Share moments from your journey" },
];

export default function CommunityOrientationCard({ userId, onDismiss }) {
  const navigate = useNavigate();

  async function dismiss() {
    if (userId) {
      try {
        await updateDoc(doc(db, "users", userId), { community_orientation_seen: true });
      } catch { /* non-critical */ }
    }
    onDismiss();
  }

  return (
    <div className="bg-white rounded-vara-lg border border-divider p-vara-lg mb-6 relative">
      <button
        onClick={dismiss}
        className="absolute top-3 right-3 text-muted-sage-gray hover:text-soft-charcoal"
      >
        <X size={18} />
      </button>

      <h2 className="text-lg font-semibold text-soft-charcoal mb-2">Welcome to Community</h2>
      <p className="text-sm text-muted-sage-gray mb-4">
        A space to share, encourage, and build alongside people on similar paths.
      </p>

      <div className="grid grid-cols-1 sm:grid-cols-3 gap-3 mb-4">
        {CONCEPTS.map(({ icon: Icon, label, desc }) => (
          <div key={label} className="flex items-start gap-2 p-3 bg-dew-sage-light rounded-lg">
            <Icon size={18} className="text-evergreen-teal mt-0.5 flex-shrink-0" />
            <div>
              <p className="text-sm font-medium text-soft-charcoal">{label}</p>
              <p className="text-xs text-muted-sage-gray">{desc}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="flex items-center justify-between">
        <button
          onClick={() => { dismiss(); navigate("/community/groups"); }}
          className="flex items-center gap-1 text-sm font-medium text-evergreen-teal hover:underline"
        >
          Find a group to start <ArrowRight size={14} />
        </button>
        <button onClick={dismiss} className="text-sm text-muted-sage-gray hover:text-soft-charcoal">
          Skip for now
        </button>
      </div>
    </div>
  );
}
```

- [ ] **Step 2: Commit**

```bash
git add src/components/community/CommunityOrientationCard.jsx
git commit -m "feat(web): add CommunityOrientationCard for first-visit onboarding"
```

---

### Task 2: PostTypeSelector and PostTypeBadge

**Files:**
- Create: `src/components/community/PostTypeSelector.jsx`
- Create: `src/components/community/PostTypeBadge.jsx`

- [ ] **Step 1: Create PostTypeSelector**

```jsx
import React from "react";
import { MessageSquare, Trophy, BookOpen, HelpCircle } from "lucide-react";

const POST_TYPES = [
  { id: "update", label: "Update", icon: MessageSquare },
  { id: "win", label: "Win", icon: Trophy },
  { id: "reflection", label: "Reflection", icon: BookOpen },
  { id: "ask", label: "Ask", icon: HelpCircle },
];

export default function PostTypeSelector({ value, onChange }) {
  return (
    <div className="flex gap-2 mb-3">
      {POST_TYPES.map(({ id, label, icon: Icon }) => (
        <button
          key={id}
          type="button"
          onClick={() => onChange(id)}
          className={`flex items-center gap-1.5 px-3 py-1.5 rounded-full text-sm border transition ${
            value === id
              ? "border-evergreen-teal bg-teal-light/30 text-evergreen-teal font-medium"
              : "border-divider text-soft-charcoal hover:border-silver-sage"
          }`}
        >
          <Icon size={14} />
          {label}
        </button>
      ))}
    </div>
  );
}

export { POST_TYPES };
```

- [ ] **Step 2: Create PostTypeBadge**

```jsx
import React from "react";
import { Trophy, BookOpen, HelpCircle } from "lucide-react";

const BADGE_CONFIG = {
  win: { icon: Trophy, label: "Win", color: "text-amber-600 bg-amber-50 border-amber-200" },
  reflection: { icon: BookOpen, label: "Reflection", color: "text-teal-600 bg-teal-50 border-teal-200" },
  ask: { icon: HelpCircle, label: "Ask", color: "text-blue-600 bg-blue-50 border-blue-200" },
};

export default function PostTypeBadge({ postType }) {
  if (!postType || postType === "update") return null;
  const config = BADGE_CONFIG[postType];
  if (!config) return null;
  const Icon = config.icon;

  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs border ${config.color}`}>
      <Icon size={12} />
      {config.label}
    </span>
  );
}
```

- [ ] **Step 3: Commit**

```bash
git add src/components/community/PostTypeSelector.jsx src/components/community/PostTypeBadge.jsx
git commit -m "feat(web): add PostTypeSelector and PostTypeBadge components"
```

---

### Task 3: Wire Everything into CommunityPage

**Files:**
- Modify: `src/pages/Community/CommunityPage.jsx`

This is the integration task. The file is 2143 lines. Make ONLY targeted edits.

- [ ] **Step 1: Add imports**

Add at top of file with other imports:

```js
import CommunityOrientationCard from '../../components/community/CommunityOrientationCard';
import PostTypeSelector from '../../components/community/PostTypeSelector';
import PostTypeBadge from '../../components/community/PostTypeBadge';
import ReportPostModal from '../../components/community/ReportPostModal';
import { fetchMutedUserIds, muteUser as muteUserService } from '../../services/db/moderation.service';
```

- [ ] **Step 2: Add state variables**

Add after existing state declarations:

```js
const [postType, setPostType] = useState('update');
const [feedFilter, setFeedFilter] = useState('all');
const [showOrientation, setShowOrientation] = useState(false);
const [mutedUserIds, setMutedUserIds] = useState(new Set());
const [reportingPost, setReportingPost] = useState(null);
```

- [ ] **Step 3: Load orientation flag and muted users**

Add useEffect to load orientation seen flag and muted users:

```js
useEffect(() => {
  if (!user?.uid) return;
  // Check orientation
  const checkOrientation = async () => {
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      if (userDoc.exists() && !userDoc.data().community_orientation_seen) {
        setShowOrientation(true);
      }
    } catch { /* non-critical */ }
  };
  checkOrientation();
  // Load muted users
  fetchMutedUserIds(user.uid).then(ids => setMutedUserIds(new Set(ids))).catch(() => {});
}, [user?.uid]);
```

- [ ] **Step 4: Add postType to post creation**

In the `handlePostSubmit` function, add `postType` to the post data object:

Find where `createPost` is called and add `postType: postType` (or `postType`) to the data passed.

- [ ] **Step 5: Add PostTypeSelector to the post creation form**

Find the post creation textarea/form area and add `<PostTypeSelector value={postType} onChange={setPostType} />` above it.

- [ ] **Step 6: Add PostTypeBadge to PostCard**

In the inline PostCard component, find the post header area (near the author name/timestamp) and add `<PostTypeBadge postType={post.postType} />` after the timestamp.

- [ ] **Step 7: Expand overflow menu for other users' posts**

The current overflow menu only shows for `isOwnPost`. Change it to always show, but with different options:
- Own posts: Delete
- Other users' posts: Report, Mute user

```jsx
<div className="relative">
  <button onClick={(e) => { e.stopPropagation(); setOpenPostMenu(openPostMenu === post.id ? null : post.id); }}>
    <MoreHorizontal size={18} className="text-muted-sage-gray" />
  </button>
  {openPostMenu === post.id && (
    <div className="absolute right-0 mt-2 w-48 rounded-vara-lg bg-white shadow-lg border border-divider z-10 py-1">
      {isOwnPost ? (
        <button onClick={() => handleDeletePost(post.id)} className="w-full text-left px-4 py-2 text-sm text-red-600 hover:bg-red-50">
          Delete Post
        </button>
      ) : (
        <>
          <button
            onClick={() => { setReportingPost(post); setOpenPostMenu(null); }}
            className="w-full text-left px-4 py-2 text-sm text-soft-charcoal hover:bg-dew-sage-light"
          >
            Report
          </button>
          <button
            onClick={async () => {
              await muteUserService(user.uid, post.userId);
              setMutedUserIds(prev => new Set([...prev, post.userId]));
              setOpenPostMenu(null);
            }}
            className="w-full text-left px-4 py-2 text-sm text-soft-charcoal hover:bg-dew-sage-light"
          >
            Mute {post.authorName || 'user'}
          </button>
        </>
      )}
    </div>
  )}
</div>
```

- [ ] **Step 8: Add feed filter chips and mute filtering**

Before the feed posts list, add filter chips:

```jsx
<div className="flex gap-2 mb-4 flex-wrap">
  {['all', 'update', 'win', 'reflection', 'ask'].map(f => (
    <button
      key={f}
      onClick={() => setFeedFilter(f)}
      className={`px-3 py-1.5 rounded-full text-sm border transition ${
        feedFilter === f
          ? 'border-evergreen-teal bg-teal-light/30 text-evergreen-teal font-medium'
          : 'border-divider text-soft-charcoal'
      }`}
    >
      {f === 'all' ? 'All' : f.charAt(0).toUpperCase() + f.slice(1) + 's'}
    </button>
  ))}
</div>
```

Filter the displayed posts by type and muted users:

```js
const displayedPosts = posts.filter(p => {
  if (mutedUserIds.has(p.userId)) return false;
  if (feedFilter !== 'all' && (p.postType || 'update') !== feedFilter) return false;
  return true;
});
```

- [ ] **Step 9: Render orientation card and report modal**

Add orientation card at the top of the feed area:

```jsx
{showOrientation && (
  <CommunityOrientationCard userId={user?.uid} onDismiss={() => setShowOrientation(false)} />
)}
```

Add report modal at the end of the component JSX:

```jsx
{reportingPost && (
  <ReportPostModal
    postId={reportingPost.id}
    reportedUserId={reportingPost.userId}
    reporterId={user?.uid}
    onClose={() => setReportingPost(null)}
  />
)}
```

- [ ] **Step 10: Commit**

```bash
git add src/pages/Community/CommunityPage.jsx
git commit -m "feat(web): wire post types, report, mute, orientation into community"
```

---

### Task 4: Build Verification

- [ ] **Step 1: Build**

```bash
npx react-scripts build 2>&1 | tail -15
```

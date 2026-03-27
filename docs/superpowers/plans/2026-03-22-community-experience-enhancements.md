# Community Experience Enhancements Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Improve the Community tab experience with clearer labels, better tile affordances, a redesigned composer row, a new group post context bar, updated Challenges screen copy, and a first-visit orientation card.

**Architecture:** Six independent UI changes across CommunityFeedHeader, QuickNavButton, PostCard, ChallengesScreen, ChallengeCard, QuickStatusCard, and a new CommunityOrientationCard component. The orientation card stores a `community_orientation_seen` flag in the user's Firestore document for cross-device sync. All other changes are pure UI/copy updates with no data model changes.

**Tech Stack:** React Native, react-native-svg (for group icon), Firestore (orientation flag), AsyncStorage fallback not needed (Firestore syncs across web+mobile)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `mobile/src/components/community/CommunityFeedHeader.tsx` | **Modify** | Task 1: rename filter tabs + fix contrast. Task 3: replace composer row. |
| `mobile/src/components/community/QuickNavButton.tsx` | **Modify** | Task 2: add subtitle prop and display. |
| `mobile/src/components/community/PostCard.tsx` | **Modify** | Task 4: replace group badge with full-width context bar. |
| `mobile/src/components/community/GroupContextBar.tsx` | **Create** | Task 4: extracted group context bar with people SVG icon. |
| `mobile/src/components/community/CommunityOrientationCard.tsx` | **Create** | Task 6: first-visit orientation card with pills and CTA. |
| `mobile/src/screens/community/CommunityScreen.tsx` | **Modify** | Task 6: integrate orientation card, conditionally hide quick-nav tiles. |
| `mobile/src/screens/community/ChallengesScreen.tsx` | **Modify** | Task 5: subtitle, section labels, filter contrast fix. |
| `mobile/src/components/community/ChallengeCard.tsx` | **Modify** | Task 5: rename "Join Challenge" to "Explore this challenge". |
| `mobile/src/components/community/QuickStatusCard.tsx` | **Modify** | Task 5: rename "Check In" to "Log today". |

---

### Task 1: Feed Filter Tab Rename + Contrast Fix

**Files:**
- Modify: `mobile/src/components/community/CommunityFeedHeader.tsx` (lines 79-94 for tabs, lines 155-171 for styles)

- [ ] **Step 1: Update filter tab labels**

In `CommunityFeedHeader.tsx`, replace the labels map (line 80):

```typescript
const labels = { all: 'All', groups: 'My Groups', connections: 'Connections' };
```

with:

```typescript
const labels = { all: 'All Posts', groups: 'Group Posts', connections: 'User Posts' };
```

- [ ] **Step 2: Update inactive filter pill styles**

Replace the `filterPill` and `filterPillText` styles (lines 155-168):

```typescript
filterPill: {
  backgroundColor: Colors.white,
  borderRadius: 20,
  borderWidth: 1.5,
  borderColor: Colors.silverSage,
  paddingVertical: 8,
  paddingHorizontal: Spacing.base,
},
filterPillActive: {
  backgroundColor: Colors.evergreenTeal,
  borderColor: Colors.evergreenTeal,
},
filterPillText: {
  fontSize: 13,
  fontWeight: Typography.fontWeight.medium,
  color: Colors.softCharcoal,
},
filterPillTextActive: {
  color: Colors.white,
},
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep "CommunityFeedHeader" | head -5`

- [ ] **Step 4: Commit**

```bash
git add mobile/src/components/community/CommunityFeedHeader.tsx
git commit -m "feat: rename feed filter tabs and fix inactive contrast"
```

---

### Task 2: Quick-Access Tile Subtitles

**Files:**
- Modify: `mobile/src/components/community/QuickNavButton.tsx` (add `subtitle` prop)
- Modify: `mobile/src/components/community/CommunityFeedHeader.tsx` (pass subtitles to QuickNavButton)

- [ ] **Step 1: Add subtitle prop to QuickNavButton**

In `QuickNavButton.tsx`, update the interface (line 11-16):

```typescript
interface QuickNavButtonProps {
  icon: string;
  label: string;
  subtitle?: string;
  onPress: () => void;
  active?: boolean;
}
```

Update the component destructuring (line 18) to include `subtitle`.

Add the subtitle Text element after the label Text (after line 38):

```tsx
{subtitle && (
  <Text style={styles.subtitle}>{subtitle}</Text>
)}
```

Add the subtitle style:

```typescript
subtitle: {
  color: Colors.mutedSageGray,
  marginTop: 2,
  fontSize: 9.5,
  fontWeight: Typography.fontWeight.regular,
  textAlign: 'center' as const,
  lineHeight: 12,
},
```

- [ ] **Step 2: Pass subtitles in CommunityFeedHeader**

In `CommunityFeedHeader.tsx`, update the QuickNavButton calls (lines 64-67):

```tsx
<QuickNavButton icon="account-group" label="Groups" subtitle="Your spaces" onPress={() => onNavigate('Groups')} />
<QuickNavButton icon="account-multiple" label="People" subtitle="Connect" onPress={() => onNavigate('People')} />
<QuickNavButton icon="leaf" label="Challenges" subtitle="Together" onPress={() => onNavigate('Challenges')} />
<QuickNavButton icon="message-text" label="Messages" subtitle="Inbox" onPress={() => onNavigate('Conversations')} />
```

- [ ] **Step 3: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep "QuickNavButton\|CommunityFeedHeader" | head -5`

- [ ] **Step 4: Commit**

```bash
git add mobile/src/components/community/QuickNavButton.tsx mobile/src/components/community/CommunityFeedHeader.tsx
git commit -m "feat: add subtitles to quick-access navigation tiles"
```

---

### Task 3: Post Composer Row Replacement

**Files:**
- Modify: `mobile/src/components/community/CommunityFeedHeader.tsx` (lines 96-132 for composer, lines 172-253 for styles)

Replace the existing composer card with a structured row: avatar + placeholder text + send icon. Keep the post type selector grid — it still appears when tapped.

- [ ] **Step 1: Add Icon import**

Add this import at the top of `CommunityFeedHeader.tsx` (the file does not currently import it):

```typescript
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
```

- [ ] **Step 2: Replace the create post card JSX**

Replace the `{/* Create Post Button with Contextual Prompt */}` block (lines 96-132) with:

```tsx
{/* Create Post Composer Row */}
<View style={styles.composerRow}>
  <TouchableOpacity
    style={styles.composerTouchable}
    onPress={onTogglePostTypeSelector}
    activeOpacity={0.7}
  >
    {userProfile?.avatarUrl ? (
      <Image
        source={{ uri: userProfile.avatarUrl }}
        style={styles.composerAvatar as ImageStyle}
      />
    ) : (
      <View style={styles.composerAvatarFallback}>
        <Text style={styles.composerAvatarText}>{initials}</Text>
      </View>
    )}
    <Text style={styles.composerPlaceholder}>
      Share something with your community...
    </Text>
    <View style={styles.composerSendButton}>
      <Icon name="arrow-right" size={14} color={Colors.white} />
    </View>
  </TouchableOpacity>

  {/* Post Type Selector Grid */}
  {showPostTypeSelector && (
    <View style={styles.postTypeGrid}>
      {POST_TYPE_OPTIONS.map((item) => (
        <TouchableOpacity
          key={item.type}
          style={styles.postTypeCard}
          onPress={() => onPostTypeSelected(item.type)}
        >
          <Text style={styles.postTypeLabel}>{item.emoji} {item.label}</Text>
          <Text style={styles.postTypeSubtitle}>{item.subtitle}</Text>
        </TouchableOpacity>
      ))}
    </View>
  )}
</View>
```

- [ ] **Step 2: Replace the composer styles**

Remove the old `createPostCard`, `createPostButton`, `createPostPlaceholder`, `createPostAvatar`, `createPostAvatarFallback`, and `avatarText` styles (lines 172-226).

Add the new composer styles:

```typescript
composerRow: {
  marginHorizontal: Spacing.base,
  marginBottom: Spacing.md,
},
composerTouchable: {
  flexDirection: 'row',
  alignItems: 'center',
  backgroundColor: Colors.white,
  borderWidth: 0.5,
  borderColor: '#E5EDE4',
  borderRadius: 12,
  paddingVertical: 12,
  paddingHorizontal: 14,
  gap: 10,
},
composerAvatar: {
  width: 30,
  height: 30,
  borderRadius: 15,
},
composerAvatarFallback: {
  width: 30,
  height: 30,
  borderRadius: 15,
  backgroundColor: Colors.evergreenTeal,
  justifyContent: 'center',
  alignItems: 'center',
},
composerAvatarText: {
  color: Colors.white,
  fontSize: 11,
  fontWeight: Typography.fontWeight.semibold,
},
composerPlaceholder: {
  flex: 1,
  fontSize: 13,
  color: Colors.mutedSageGray,
},
composerSendButton: {
  width: 30,
  height: 30,
  borderRadius: 15,
  backgroundColor: Colors.evergreenTeal,
  justifyContent: 'center',
  alignItems: 'center',
},
```

- [ ] **Step 4: Remove unused `currentPrompt` prop if desired**

The `currentPrompt` prop in `CommunityFeedHeaderProps` is no longer used in the JSX (the placeholder is now static). However, since it's passed from `CommunityScreen` and removing it would require changes there too, leave it in the interface for now. It's harmless and avoids touching another file in this task.

- [ ] **Step 5: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep "CommunityFeedHeader" | head -5`

- [ ] **Step 6: Commit**

```bash
git add mobile/src/components/community/CommunityFeedHeader.tsx
git commit -m "feat: replace post composer with structured row and send button"
```

---

### Task 4: Group Post Context Bar

**Files:**
- Create: `mobile/src/components/community/GroupContextBar.tsx`
- Modify: `mobile/src/components/community/PostCard.tsx` (replace group badge with context bar)

- [ ] **Step 1: Create GroupContextBar component**

Create `mobile/src/components/community/GroupContextBar.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Colors, Typography } from '../../constants';

interface GroupContextBarProps {
  groupName: string;
  onPress?: () => void;
}

const PeopleIcon: React.FC = () => (
  <Svg width={13} height={13} viewBox="0 0 16 16" fill="none">
    <Circle cx={6} cy={5} r={2.5} stroke={Colors.evergreenTeal} strokeWidth={1.4} strokeLinecap="round" />
    <Path d="M1 14C1 11.2 3.2 9 6 9" stroke={Colors.evergreenTeal} strokeWidth={1.4} strokeLinecap="round" />
    <Circle cx={11} cy={5} r={2.5} stroke={Colors.evergreenTeal} strokeWidth={1.4} strokeLinecap="round" />
    <Path d="M16 14C16 11.2 13.8 9 11 9" stroke={Colors.evergreenTeal} strokeWidth={1.4} strokeLinecap="round" />
  </Svg>
);

export const GroupContextBar: React.FC<GroupContextBarProps> = ({ groupName, onPress }) => {
  const Container = onPress ? TouchableOpacity : View;
  const containerProps = onPress ? { onPress, activeOpacity: 0.7 } : {};

  return (
    <Container style={styles.bar} {...containerProps}>
      <PeopleIcon />
      <Text style={styles.groupName} numberOfLines={1}>{groupName}</Text>
    </Container>
  );
};

const styles = StyleSheet.create({
  bar: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 7,
    backgroundColor: '#EEF5EC',
    borderBottomWidth: 0.5,
    borderBottomColor: '#E8F0E7',
    paddingVertical: 8,
    paddingHorizontal: 14,
    borderTopLeftRadius: 12,
    borderTopRightRadius: 12,
  },
  groupName: {
    fontSize: 11.5,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    flex: 1,
  },
});
```

- [ ] **Step 2: Replace group badge in PostCard with GroupContextBar**

In `PostCard.tsx`, add the import at the top:

```typescript
import { GroupContextBar } from './GroupContextBar';
```

Find and replace the `{/* Group Context Badge */}` block (search for the comment — it contains a `TouchableOpacity` with `groupBadgeContainer` and `groupBadge` styles) with:

```tsx
{/* Group Context Bar */}
{post.groupName && !isChallengePost && !hideGroupBadge && (
  <GroupContextBar
    groupName={post.groupName}
    onPress={onGroupPress}
  />
)}
```

- [ ] **Step 3: Remove unused group badge styles from PostCard**

Remove these styles from PostCard's StyleSheet: `groupBadgeContainer`, `groupBadge`, `groupBadgeText`.

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep "PostCard\|GroupContextBar" | head -5`

- [ ] **Step 5: Commit**

```bash
git add mobile/src/components/community/GroupContextBar.tsx mobile/src/components/community/PostCard.tsx
git commit -m "feat: replace group badge with full-width context bar on post cards"
```

---

### Task 5: Challenges Screen Copy + CTA Rename

**Files:**
- Modify: `mobile/src/screens/community/ChallengesScreen.tsx` (subtitle, section labels, filter contrast)
- Modify: `mobile/src/components/community/ChallengeCard.tsx` (rename "Join Challenge")
- Modify: `mobile/src/components/community/QuickStatusCard.tsx` (rename "Check In")

- [ ] **Step 1: Update Challenges screen subtitle**

In `ChallengesScreen.tsx`, replace the subtitle text (line 427):

```typescript
<Text style={styles.subtitle}>Grow together through shared commitment</Text>
```

with:

```typescript
<Text style={styles.subtitle}>A time-bound intention you explore alongside others. No pressure — just shared commitment.</Text>
```

Update the `subtitle` style to match spec:

```typescript
subtitle: {
  fontSize: 13,
  color: Colors.mutedSageGray,
  marginTop: Spacing.xs,
  marginBottom: Spacing.sm + 6,
  lineHeight: 13 * 1.5,
},
```

- [ ] **Step 2: Update section header labels**

Replace the `sectionHeaderText` logic (lines 315-319):

```typescript
const sectionHeaderText = filter === 'active'
  ? 'All active challenges'
  : filter === 'all'
  ? 'Browse challenges'
  : null;
```

with:

```typescript
const sectionHeaderText = filter === 'active'
  ? 'YOUR ACTIVE CHALLENGES'
  : filter === 'all'
  ? 'OPEN TO JOIN'
  : null;
```

Update the `sectionHeader` style to match the uppercase section label spec:

```typescript
sectionHeader: {
  paddingHorizontal: Spacing.base,
  marginBottom: Spacing.sm + 2,
  fontSize: 11,
  fontWeight: Typography.fontWeight.semibold,
  color: Colors.mutedSageGray,
  letterSpacing: 0.7,
  textTransform: 'uppercase',
},
```

Also update the `quickStatusTitle` style to match:

```typescript
quickStatusTitle: {
  paddingHorizontal: Spacing.base,
  marginBottom: Spacing.sm + 2,
  fontSize: 11,
  fontWeight: Typography.fontWeight.semibold,
  color: Colors.mutedSageGray,
  letterSpacing: 0.7,
  textTransform: 'uppercase',
},
```

And update the quick status title text (line 386):

```typescript
<Text style={styles.quickStatusTitle}>YOUR ACTIVE CHALLENGES</Text>
```

- [ ] **Step 3: Fix filter pill contrast**

Update the filter pill styles in `ChallengesScreen.tsx` to match the Community feed spec:

```typescript
filterPill: {
  paddingVertical: 8,
  paddingHorizontal: Spacing.base,
  borderRadius: 20,
},
filterPillActive: {
  backgroundColor: Colors.evergreenTeal,
  borderWidth: 1.5,
  borderColor: Colors.evergreenTeal,
},
filterPillInactive: {
  backgroundColor: Colors.white,
  borderWidth: 1.5,
  borderColor: Colors.silverSage,
},
filterPillText: {
  fontSize: 13,
  fontWeight: Typography.fontWeight.medium,
},
filterPillTextActive: {
  color: Colors.white,
},
filterPillTextInactive: {
  color: Colors.softCharcoal,
},
```

- [ ] **Step 4: Rename "Join Challenge" in ChallengeCard**

In `ChallengeCard.tsx`, find line 135:

```typescript
<Text style={styles.joinButtonText}>Join Challenge</Text>
```

Replace with:

```typescript
<Text style={styles.joinButtonText}>Explore this challenge</Text>
```

- [ ] **Step 5: Rename "Check In" in QuickStatusCard**

In `QuickStatusCard.tsx`, find the "Check In" text (around line 92):

```typescript
<Text style={styles.checkInButtonText}>Check In</Text>
```

Replace with:

```typescript
<Text style={styles.checkInButtonText}>Log today</Text>
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep "ChallengesScreen\|ChallengeCard\|QuickStatusCard" | head -5`

- [ ] **Step 7: Commit**

```bash
git add mobile/src/screens/community/ChallengesScreen.tsx mobile/src/components/community/ChallengeCard.tsx mobile/src/components/community/QuickStatusCard.tsx
git commit -m "feat: update Challenges screen copy, section labels, and CTA names"
```

---

### Task 6: First-Visit Orientation Card

**Files:**
- Create: `mobile/src/components/community/CommunityOrientationCard.tsx`
- Modify: `mobile/src/screens/community/CommunityScreen.tsx`
- Modify: `mobile/src/components/community/CommunityFeedHeader.tsx` (conditionally hide quick-nav)

This is the most complex change. The orientation card stores `community_orientation_seen: true` in the user's Firestore document (`users/{uid}`) for cross-device sync.

- [ ] **Step 1: Create CommunityOrientationCard component**

Create `mobile/src/components/community/CommunityOrientationCard.tsx`:

```tsx
import React from 'react';
import { View, Text, StyleSheet, TouchableOpacity } from 'react-native';
import Svg, { Circle, Path } from 'react-native-svg';
import { Colors, Typography, Spacing, Layout } from '../../constants';

interface CommunityOrientationCardProps {
  onFindGroup: () => void;
  onSkip: () => void;
}

const GroupsIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Circle cx={6} cy={5} r={2.5} stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" />
    <Path d="M1 14C1 11.2 3.2 9 6 9" stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" />
    <Circle cx={11} cy={5} r={2.5} stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" />
    <Path d="M16 14C16 11.2 13.8 9 11 9" stroke="#FFFFFF" strokeWidth={1.4} strokeLinecap="round" />
  </Svg>
);

const ChallengesIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M8 1L9.8 5.8L15 6.2L11 9.6L12.4 15L8 12L3.6 15L5 9.6L1 6.2L6.2 5.8L8 1Z" stroke="#FFFFFF" strokeWidth={1.3} strokeLinejoin="round" />
  </Svg>
);

const PostsIcon: React.FC = () => (
  <Svg width={16} height={16} viewBox="0 0 16 16" fill="none">
    <Path d="M2 2H14V11H9L6 14V11H2V2Z" stroke="#FFFFFF" strokeWidth={1.3} strokeLinejoin="round" strokeLinecap="round" />
  </Svg>
);

interface PillProps {
  icon: React.ReactNode;
  title: string;
  subtitle: string;
}

const ConceptPill: React.FC<PillProps> = ({ icon, title, subtitle }) => (
  <View style={styles.pill}>
    <View style={styles.pillIconBox}>
      {icon}
    </View>
    <View style={styles.pillTextBlock}>
      <Text style={styles.pillTitle}>{title}</Text>
      <Text style={styles.pillSubtitle}>{subtitle}</Text>
    </View>
  </View>
);

export const CommunityOrientationCard: React.FC<CommunityOrientationCardProps> = ({
  onFindGroup,
  onSkip,
}) => (
  <View>
    <View style={styles.card}>
      <Text style={styles.heading}>Welcome to Community</Text>
      <Text style={styles.body}>
        A space to share, encourage, and build alongside people working on the same things you are.
      </Text>

      <View style={styles.pillsContainer}>
        <ConceptPill
          icon={<GroupsIcon />}
          title="Groups"
          subtitle="Ongoing shared spaces for connection"
        />
        <ConceptPill
          icon={<ChallengesIcon />}
          title="Challenges"
          subtitle="Time-bound intentions to try together"
        />
        <ConceptPill
          icon={<PostsIcon />}
          title="Posts & Check-ins"
          subtitle="Share moments from your journey"
        />
      </View>

      <TouchableOpacity style={styles.ctaButton} onPress={onFindGroup} activeOpacity={0.8}>
        <Text style={styles.ctaText}>Find a group to start →</Text>
      </TouchableOpacity>
    </View>

    <TouchableOpacity onPress={onSkip} activeOpacity={0.7}>
      <Text style={styles.skipText}>Skip for now</Text>
    </TouchableOpacity>
  </View>
);

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 16,
    padding: 20,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.sm,
  },
  heading: {
    fontSize: 16,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
    marginBottom: 6,
  },
  body: {
    fontSize: 13,
    lineHeight: 13 * 1.5,
    color: 'rgba(255, 255, 255, 0.85)',
    marginBottom: 14,
  },
  pillsContainer: {
    gap: 8,
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: 'rgba(255, 255, 255, 0.15)',
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    gap: 10,
  },
  pillIconBox: {
    width: 28,
    height: 28,
    backgroundColor: 'rgba(255, 255, 255, 0.20)',
    borderRadius: 7,
    justifyContent: 'center',
    alignItems: 'center',
  },
  pillTextBlock: {
    flex: 1,
  },
  pillTitle: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
  pillSubtitle: {
    fontSize: 11,
    color: 'rgba(255, 255, 255, 0.75)',
  },
  ctaButton: {
    backgroundColor: Colors.white,
    borderRadius: 10,
    paddingVertical: 11,
    alignItems: 'center',
    marginTop: 16,
  },
  ctaText: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  skipText: {
    textAlign: 'center',
    fontSize: 12,
    color: Colors.mutedSageGray,
    textDecorationLine: 'underline',
    marginTop: 8,
    marginBottom: Spacing.base,
  },
});
```

- [ ] **Step 2: Add orientation state to CommunityScreen**

In `CommunityScreen.tsx`, update the existing React import (line 6) to include `useState` and `useEffect`:

```typescript
import React, { useCallback, useState, useEffect } from 'react';
```

Add these new imports below the existing ones:

```typescript
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import { CommunityOrientationCard } from '../../components/community/CommunityOrientationCard';
```

Add state and loading logic inside the `CommunityScreen` component, after the `useCommunityFeed()` call:

```typescript
const [showOrientation, setShowOrientation] = useState(false);
const [orientationChecked, setOrientationChecked] = useState(false);

// Check if user has seen orientation card
useEffect(() => {
  const checkOrientation = async () => {
    if (!user || !db) {
      setOrientationChecked(true);
      return;
    }
    try {
      const userDoc = await getDoc(doc(db, 'users', user.uid));
      const seen = userDoc.data()?.community_orientation_seen === true;
      setShowOrientation(!seen);
    } catch {
      // On error, don't show orientation (fail silently)
    }
    setOrientationChecked(true);
  };
  checkOrientation();
}, [user]);

const dismissOrientation = useCallback(async (navigateToGroups = false) => {
  setShowOrientation(false);
  if (user && db) {
    try {
      await updateDoc(doc(db, 'users', user.uid), {
        community_orientation_seen: true,
      });
    } catch {
      // Best-effort persist
    }
  }
  if (navigateToGroups) {
    navigation.navigate('Groups');
  }
}, [user, navigation]);
```

- [ ] **Step 3: Add showOrientation prop to CommunityFeedHeader**

In `CommunityFeedHeader.tsx`, add a `showOrientation` prop to the interface:

```typescript
showOrientation?: boolean;
```

Destructure it in the component. Wrap the quick nav, pending invites, filter pills, and composer sections with a conditional so they are hidden when the orientation card is visible. The component return should look like:

```tsx
return (
  <>
    {!showOrientation && (
      <>
        {/* Quick Navigation */}
        <View style={styles.quickNav}>
          {/* ...existing QuickNavButton elements... */}
        </View>

        {/* Pending Invites Section */}
        <View style={styles.pendingInvitesContainer}>
          <PendingInvitesSection onInviteAccepted={onInviteAction} />
        </View>

        {/* Feed Filter Pills */}
        <View style={styles.filterPillsContainer}>
          {/* ...existing filter pill map... */}
        </View>

        {/* Create Post Composer Row */}
        <View style={styles.composerRow}>
          {/* ...existing composer content... */}
        </View>
      </>
    )}
  </>
);
```

This hides all feed chrome when the orientation card is visible. Only the orientation card + "Recent activity" label + feed posts show on first visit.

- [ ] **Step 4: Integrate orientation card in CommunityScreen**

In `CommunityScreen.tsx`, update the `renderHeader` callback. Add the orientation card before CommunityFeedHeader and add a "Recent activity" label:

```tsx
const renderHeader = useCallback(() => (
  <>
    {showOrientation && (
      <>
        <CommunityOrientationCard
          onFindGroup={() => dismissOrientation(true)}
          onSkip={() => dismissOrientation(false)}
        />
        <Text style={styles.recentActivityLabel}>RECENT ACTIVITY</Text>
      </>
    )}
    <CommunityFeedHeader
      userProfile={userProfile}
      displayName={user?.displayName || 'U'}
      currentPrompt={currentPrompt}
      feedFilter={feedFilter}
      showPostTypeSelector={showPostTypeSelector}
      showOrientation={showOrientation}
      onNavigate={handleNavigate}
      onSetFeedFilter={setFeedFilter}
      onPostTypeSelected={handlePostTypeSelected}
      onTogglePostTypeSelector={handleTogglePostTypeSelector}
      onInviteAction={handleInviteAction}
    />
  </>
), [userProfile, user?.displayName, currentPrompt, feedFilter, showPostTypeSelector,
    showOrientation, dismissOrientation, handleNavigate, setFeedFilter, handlePostTypeSelected,
    handleTogglePostTypeSelector, handleInviteAction]);
```

Add the `recentActivityLabel` style:

```typescript
recentActivityLabel: {
  fontSize: 11,
  fontWeight: '600',
  color: Colors.mutedSageGray,
  letterSpacing: 0.7,
  textTransform: 'uppercase',
  paddingHorizontal: Spacing.base,
  marginTop: Spacing.sm,
  marginBottom: Spacing.sm,
},
```

Also conditionally hide the filter pills and composer row in `CommunityFeedHeader` when `showOrientation` is true — wrap them with `{!showOrientation && (...)}`.

- [ ] **Step 5: Wait for `orientationChecked` before rendering**

Update the loading condition in CommunityScreen (line 148) to also wait for orientation check:

```typescript
{!isReady || !orientationChecked || (loading && posts.length === 0) ? (
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep "CommunityScreen\|CommunityOrientationCard\|CommunityFeedHeader" | head -10`

- [ ] **Step 7: Commit**

```bash
git add mobile/src/components/community/CommunityOrientationCard.tsx mobile/src/screens/community/CommunityScreen.tsx mobile/src/components/community/CommunityFeedHeader.tsx
git commit -m "feat: add first-visit orientation card with Firestore persistence"
```

---

### Task 7: Manual QA Checklist

- [ ] **Step 1: Filter tabs** — Community feed shows "All Posts", "Group Posts", "User Posts". Inactive tabs have white background, Silver Sage border, Soft Charcoal text. Active tab is Evergreen Teal.

- [ ] **Step 2: Tile subtitles** — Each quick-nav tile shows its subtitle (Your spaces, Connect, Together, Inbox) in small gray text below the label.

- [ ] **Step 3: Composer row** — Composer shows avatar + "Share something with your community..." + teal send button. Tapping opens post type selector grid, then the create modal.

- [ ] **Step 4: Group context bar** — Group posts in the feed show a `#EEF5EC` bar with people icon + group name above the author row. Personal posts show no bar.

- [ ] **Step 5: Challenges screen** — New subtitle copy visible. Filter tabs have fixed contrast. Section labels show "YOUR ACTIVE CHALLENGES" and "OPEN TO JOIN" in uppercase. "Join Challenge" button reads "Explore this challenge". Quick status "Check In" button reads "Log today".

- [ ] **Step 6: Orientation card (first visit)** — Clear app data or use a new account. Open Community tab. Teal orientation card appears with 3 concept pills and "Find a group to start" CTA. Quick-access tiles are hidden. "Skip for now" dismisses the card. On next visit, card does not appear and tiles are visible.

- [ ] **Step 7: Orientation card (cross-device)** — Dismiss orientation on mobile. Open web app. The orientation should not appear there either (verify `community_orientation_seen` is set in Firestore user doc).

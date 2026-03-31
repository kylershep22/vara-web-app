# Sleep Library UI Enhancement Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Overhaul the Sleep Library screen UI with a highlight card intro, grouped card layout, SVG section icons, heart favorites, corrected copy, two new sleep stories, and a Volume 2 nudge.

**Architecture:** The Sleep screen (`SleepScreen.tsx`) gets a full layout rework. Content data and audio paths are updated in `library.service.ts` to add two new stories and fix copy. A new `useSleepFavorites` hook (mirroring `useBreathworkTracking`) provides AsyncStorage-based favorites. SVG icons are inline in the screen component. The nav bar is updated in `AppNavigator.tsx`.

**Tech Stack:** React Native, react-native-svg, AsyncStorage, Firebase Storage (audio URLs)

---

## File Structure

| File | Action | Responsibility |
|------|--------|---------------|
| `mobile/src/navigation/AppNavigator.tsx` | **Modify** | Task 1: Nav bar colors for Sleep screens |
| `mobile/src/services/firebase/library.service.ts` | **Modify** | Task 2: Fix copy, add 2 new stories, add audio paths |
| `mobile/src/hooks/useSleepFavorites.ts` | **Create** | Task 3: AsyncStorage favorites hook |
| `mobile/src/screens/discover/SleepScreen.tsx` | **Modify** | Tasks 4-7: Full layout rework |

---

### Task 1: Nav Bar Update

**Files:**
- Modify: `mobile/src/navigation/AppNavigator.tsx`

Update the Sleep screen header options in BOTH the AppStack (around line 584-593) and DiscoverStack (around line 298-300) registrations.

- [ ] **Step 1: Update AppStack Sleep screen options**

Find the AppStack Sleep screen registration (around line 584):

```typescript
options={{
  animation: 'slide_from_right',
  headerShown: true,
  title: 'Sleep Library',
  headerStyle: { backgroundColor: Colors.evergreenTeal },
  headerTintColor: '#fff',
  headerTitleStyle: { fontWeight: '700' },
}}
```

Replace with:

```typescript
options={{
  animation: 'slide_from_right',
  headerShown: true,
  title: 'Sleep Library',
  headerStyle: {
    backgroundColor: Colors.mistWhite,
  },
  headerTintColor: Colors.evergreenTeal,
  headerTitleStyle: {
    fontWeight: '600',
    color: Colors.softCharcoal,
  },
  headerShadowVisible: false,
}}
```

- [ ] **Step 2: Update AppStack SleepDetail options the same way**

Find the AppStack SleepDetail registration (around line 596) and apply the same style changes (title stays 'Sleep Content').

- [ ] **Step 3: Update DiscoverStack Sleep and SleepDetail options**

The DiscoverStack entries (around lines 298-305) use a simpler `options={{ title: '...' }}`. The stack likely inherits a shared `screenOptions` from the parent navigator. Check if the DiscoverStack has a `screenOptions` prop that sets the teal header. If so, override it on the Sleep and SleepDetail screens specifically:

```typescript
<DiscoverStack.Screen
  name="Sleep"
  component={SleepScreen}
  options={{
    title: 'Sleep Library',
    headerStyle: { backgroundColor: Colors.mistWhite },
    headerTintColor: Colors.evergreenTeal,
    headerTitleStyle: { fontWeight: '600', color: Colors.softCharcoal },
    headerShadowVisible: false,
  }}
/>
<DiscoverStack.Screen
  name="SleepDetail"
  component={SleepDetailScreen}
  options={{
    title: 'Sleep Content',
    headerStyle: { backgroundColor: Colors.mistWhite },
    headerTintColor: Colors.evergreenTeal,
    headerTitleStyle: { fontWeight: '600', color: Colors.softCharcoal },
    headerShadowVisible: false,
  }}
/>
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep "AppNavigator" | head -5`

- [ ] **Step 5: Commit**

```bash
git add mobile/src/navigation/AppNavigator.tsx
git commit -m "feat: update Sleep Library nav bar to Mist White background"
```

---

### Task 2: Content Data Updates — Copy Fixes + New Stories

**Files:**
- Modify: `mobile/src/services/firebase/library.service.ts`

- [ ] **Step 1: Fix existing content copy and titles**

In `SLEEP_SOUNDS_BASE` (around lines 211-236), update:

1. `title: 'Delta Waves'` → `title: 'Delta waves'`
   `description:` → `'Deep sleep waves to support stage 3 & 4 sleep.'`

2. `title: 'Calming Melody'` → `title: 'Calming melody'`
   `description:` → `'Gentle rainfall sounds to help your mind wind down.'`

3. `title: 'Surreal Forest'` → `title: 'Surreal forest'`
   `description:` → `'Soft forest ambience to ease you toward sleep.'`

In `SLEEP_STORIES_BASE` (around lines 301-310), update:

1. `description:` → `'A soothing story to ease you into peaceful sleep.'`
   (Title "The Warmth" stays as-is — proper noun)

- [ ] **Step 2: Add two new sleep stories**

Add to `SLEEP_STORIES_BASE` array after the existing "The Warmth" entry:

```typescript
{
  id: 'story-2',
  title: 'A Sky Full of Drift',
  duration: '9:17 min',
  type: 'Story',
  description: 'A gentle journey through an open sky to quiet the mind.',
  category: 'stories',
},
{
  id: 'story-3',
  title: 'The Stone Path Home',
  duration: '10:36 min',
  type: 'Story',
  description: 'A calming walk along a familiar path toward rest.',
  category: 'stories',
},
```

- [ ] **Step 3: Add audio paths for new stories**

In `SLEEP_AUDIO_PATHS` (around lines 239-246), add:

```typescript
'story-2': 'sleep-audio/A Sky Full of Drift.wav',
'story-3': 'sleep-audio/The Stone Path Home.wav',
```

- [ ] **Step 4: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep "library.service" | head -5`

- [ ] **Step 5: Commit**

```bash
git add mobile/src/services/firebase/library.service.ts
git commit -m "feat: fix sleep content copy, add two new sleep stories"
```

---

### Task 3: Sleep Favorites Hook

**Files:**
- Create: `mobile/src/hooks/useSleepFavorites.ts`

Mirror the `useBreathworkTracking.ts` pattern but simplified — only favorites, no completions.

- [ ] **Step 1: Create the hook**

Create `mobile/src/hooks/useSleepFavorites.ts`:

```typescript
/**
 * Sleep Favorites Hook
 * Manages favorite state for sleep content using AsyncStorage
 */

import { useState, useEffect, useCallback } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';

const SLEEP_FAVORITES_KEY = '@sleep_favorites';

interface UseSleepFavoritesReturn {
  favorites: string[];
  isFavorite: (contentId: string) => boolean;
  toggleFavorite: (contentId: string) => Promise<void>;
  loading: boolean;
}

export function useSleepFavorites(): UseSleepFavoritesReturn {
  const [favorites, setFavorites] = useState<string[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadFavorites = async () => {
      try {
        const data = await AsyncStorage.getItem(SLEEP_FAVORITES_KEY);
        if (data) {
          setFavorites(JSON.parse(data));
        }
      } catch (error) {
        console.error('Error loading sleep favorites:', error);
      } finally {
        setLoading(false);
      }
    };
    loadFavorites();
  }, []);

  const isFavorite = useCallback(
    (contentId: string) => favorites.includes(contentId),
    [favorites]
  );

  const toggleFavorite = useCallback(
    async (contentId: string) => {
      try {
        const newFavorites = favorites.includes(contentId)
          ? favorites.filter((id) => id !== contentId)
          : [...favorites, contentId];
        setFavorites(newFavorites);
        await AsyncStorage.setItem(SLEEP_FAVORITES_KEY, JSON.stringify(newFavorites));
      } catch (error) {
        console.error('Error toggling sleep favorite:', error);
      }
    },
    [favorites]
  );

  return { favorites, isFavorite, toggleFavorite, loading };
}
```

- [ ] **Step 2: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep "useSleepFavorites" | head -5`

- [ ] **Step 3: Commit**

```bash
git add mobile/src/hooks/useSleepFavorites.ts
git commit -m "feat: add sleep favorites hook with AsyncStorage persistence"
```

---

### Task 4: Sleep Screen Full Layout Rework

**Files:**
- Modify: `mobile/src/screens/discover/SleepScreen.tsx`

This is the main task. The entire screen layout changes:
- Intro text → highlight card
- Section headers → SVG icon circles + sentence case + count badge
- Content cards → grouped card with internal dividers
- Play button → circular with teal triangle
- Heart icon on each row
- Volume 2 nudge below stories
- Brain Health tips header gets icon circle treatment

- [ ] **Step 1: Add imports**

Replace the imports section with:

```typescript
import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Svg, { Path, Circle as SvgCircle } from 'react-native-svg';
import { Colors, Spacing, Layout, Typography } from '../../constants';
import { useSleep } from '../../hooks';
import { useSleepFavorites } from '../../hooks/useSleepFavorites';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { LoadingSpinner } from '../../components';
import { SleepContent } from '../../services/firebase/library.service';
```

Remove the `CategoryHeader` and `MaterialCommunityIcons` imports — we no longer use them on this screen.

- [ ] **Step 2: Add SVG icon components**

Add these inline SVG components above the `SleepScreen` function:

```tsx
// Wave icon for Sleep Sounds
const WaveIcon: React.FC = () => (
  <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
    <Path d="M1 10C1 10 3 6 4 8C5 10 6 4 8 8C10 12 11 2 12 8C13 14 15 6 15 6" stroke={Colors.evergreenTeal} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Moon icon for Sleep Stories
const MoonIcon: React.FC = () => (
  <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
    <Path d="M13.5 8.5C12.8 12 9.5 14 6 13.3C2.5 12.5 0.5 9.2 1.2 5.7C1.9 2.2 5 0.2 8.3 0.8C6 2.5 5 5.8 6.2 9C7.2 11.5 10 13 13.5 8.5Z" stroke={Colors.evergreenTeal} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
  </Svg>
);

// Leaf icon for Brain Health Tips
const LeafIcon: React.FC = () => (
  <Svg width={14} height={14} viewBox="0 0 16 16" fill="none">
    <Path d="M2 14C2 14 3 8 8 5C13 2 14 2 14 2C14 2 13 8 8 11C3 14 2 14 2 14Z" stroke={Colors.evergreenTeal} strokeWidth={1.3} strokeLinecap="round" strokeLinejoin="round" />
    <Path d="M2 14C5 11 8 8 14 2" stroke={Colors.evergreenTeal} strokeWidth={1.3} strokeLinecap="round" />
  </Svg>
);

// Heart icon for favorites
const HeartIcon: React.FC<{ filled: boolean }> = ({ filled }) => (
  <Svg width={16} height={14} viewBox="0 0 14 13" fill="none">
    <Path
      d="M7 12C7 12 1 8 1 4C1 2.3 2.3 1 4 1C5.1 1 6.1 1.6 7 2.5C7.9 1.6 8.9 1 10 1C11.7 1 13 2.3 13 4C13 8 7 12 7 12Z"
      fill={filled ? Colors.evergreenTeal : 'none'}
      stroke={filled ? Colors.evergreenTeal : Colors.silverSage}
      strokeWidth={1.3}
      strokeLinejoin="round"
    />
  </Svg>
);

// Play triangle icon
const PlayTriangle: React.FC = () => (
  <Svg width={10} height={11} viewBox="0 0 10 11" fill={Colors.evergreenTeal}>
    <Path d="M1 0.5V10.5L9.5 5.5L1 0.5Z" fill={Colors.evergreenTeal} />
  </Svg>
);
```

- [ ] **Step 3: Add section header helper component**

Add this inline component:

```tsx
const SectionHeader: React.FC<{ icon: React.ReactNode; title: string; count?: number }> = ({ icon, title, count }) => (
  <View style={styles.sectionHeader}>
    <View style={styles.sectionIconCircle}>{icon}</View>
    <Text style={styles.sectionTitle}>{title}</Text>
    {count !== undefined && (
      <View style={styles.sectionCountBadge}>
        <Text style={styles.sectionCountText}>{count}</Text>
      </View>
    )}
  </View>
);
```

- [ ] **Step 4: Rewrite the SleepScreen function**

Replace the entire `SleepScreen` function body (from `export default function SleepScreen()` through the closing `}` before `const styles`) with:

```tsx
export default function SleepScreen() {
  const navigation = useNavigation();
  const { sounds, stories, meditations, loading } = useSleep();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();
  const { isFavorite, toggleFavorite } = useSleepFavorites();

  const handlePlaySound = (sound: SleepContent) => {
    if (!sound.audioUrl) return;
    playTrack(sound.title, sound.audioUrl, true);
  };

  const handleToggleFavorite = async (contentId: string) => {
    if (Platform.OS === 'ios') {
      Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    }
    await toggleFavorite(contentId);
  };

  const renderContentRow = (item: SleepContent, isLast: boolean) => {
    const isCurrentlyPlaying = currentTrack?.title === item.title && isPlaying;
    const isAvailable = !!item.audioUrl;
    const saved = isFavorite(item.id);

    return (
      <View key={item.id} style={[styles.contentRow, !isLast && styles.contentRowDivider]}>
        {/* Play Button */}
        <TouchableOpacity
          style={[styles.playButton, !isAvailable && { opacity: 0.5 }]}
          onPress={() => isAvailable && handlePlaySound(item)}
          disabled={!isAvailable}
          activeOpacity={0.7}
        >
          {isCurrentlyPlaying ? (
            <Svg width={10} height={11} viewBox="0 0 10 11" fill={Colors.evergreenTeal}>
              <Path d="M1 0.5V10.5" stroke={Colors.evergreenTeal} strokeWidth={2.5} strokeLinecap="round" />
              <Path d="M8.5 0.5V10.5" stroke={Colors.evergreenTeal} strokeWidth={2.5} strokeLinecap="round" />
            </Svg>
          ) : (
            <PlayTriangle />
          )}
        </TouchableOpacity>

        {/* Text Block */}
        <View style={styles.contentTextBlock}>
          <Text style={styles.contentTitle} numberOfLines={1}>{item.title}</Text>
          <Text style={styles.contentMeta}>{item.duration} · {item.type}</Text>
          <Text style={styles.contentDescription} numberOfLines={2}>{item.description}</Text>
        </View>

        {/* Heart Icon */}
        <TouchableOpacity
          style={styles.heartButton}
          onPress={() => handleToggleFavorite(item.id)}
          hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
        >
          <HeartIcon filled={saved} />
        </TouchableOpacity>
      </View>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading sleep content..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Highlight Card — Intro */}
        <View style={styles.highlightCard}>
          <Text style={styles.highlightText}>
            Quality sleep is your brain's cleanup crew. While you rest, your brain clears toxins, consolidates memories, and recharges for the day ahead.
          </Text>
        </View>

        {/* Sleep Sounds */}
        {sounds.length > 0 && (
          <View>
            <SectionHeader icon={<WaveIcon />} title="Sleep sounds" count={sounds.length} />
            <View style={styles.groupedCard}>
              {sounds.map((item, i) => renderContentRow(item, i === sounds.length - 1))}
            </View>
          </View>
        )}

        {/* Sleep Stories */}
        {stories.length > 0 && (
          <View>
            <SectionHeader icon={<MoonIcon />} title="Sleep stories" count={stories.length} />
            <View style={styles.groupedCard}>
              {stories.map((item, i) => renderContentRow(item, i === stories.length - 1))}
            </View>

            {/* Volume 2 Nudge */}
            <View style={styles.nudgeCard}>
              <Text style={styles.nudgeText}>
                More stories are on the way — Volume 2 coming soon.
              </Text>
            </View>
          </View>
        )}

        {/* Guided Meditations */}
        {meditations.length > 0 && (
          <View>
            <SectionHeader icon={<MoonIcon />} title="Guided meditations" count={meditations.length} />
            <View style={styles.groupedCard}>
              {meditations.map((item, i) => renderContentRow(item, i === meditations.length - 1))}
            </View>
          </View>
        )}

        {/* Brain-Healthy Sleep Tips */}
        <SectionHeader icon={<LeafIcon />} title="Brain-healthy sleep tips" />
        <View style={styles.groupedCard}>
          <View style={styles.tipsContent}>
            <Text style={styles.tipsText}>
              Use headphones or speakers at a comfortable volume{'\n\n'}
              Aim for 7-9 hours — your brain needs this time to clean up and consolidate memories{'\n\n'}
              Keep your room cool (65-68°F) — brain cleanup works best when you're cool{'\n\n'}
              Avoid screens 30 minutes before bed — blue light disrupts your brain's sleep signals
            </Text>
          </View>
        </View>

        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}
```

- [ ] **Step 5: Replace all styles**

Replace the entire `const styles = StyleSheet.create({...})` with:

```typescript
const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  scrollContent: {
    paddingBottom: Spacing['4xl'],
  },

  // Highlight Card (intro + nudge)
  highlightCard: {
    backgroundColor: 'rgba(213,227,209,0.38)',
    borderLeftWidth: 2.5,
    borderLeftColor: Colors.evergreenTeal,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    paddingVertical: 10,
    paddingHorizontal: 12,
    marginHorizontal: Spacing.base,
    marginTop: Spacing.base,
    marginBottom: 4,
  },
  highlightText: {
    fontSize: 11,
    fontWeight: '400',
    color: Colors.softCharcoal,
    lineHeight: 11 * 1.65,
  },

  // Section Headers
  sectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    marginTop: 14,
    marginBottom: 9,
  },
  sectionIconCircle: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(213,227,209,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 12,
    fontWeight: '600',
    color: Colors.softCharcoal,
    marginLeft: 8,
  },
  sectionCountBadge: {
    backgroundColor: Colors.dewSage,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 7,
    marginLeft: 8,
  },
  sectionCountText: {
    fontSize: 9,
    fontWeight: '600',
    color: Colors.evergreenTeal,
  },

  // Grouped Card Container
  groupedCard: {
    backgroundColor: Colors.white,
    borderWidth: 0.5,
    borderColor: 'rgba(184,205,186,0.45)',
    borderRadius: 12,
    overflow: 'hidden',
    marginHorizontal: Spacing.base,
    marginBottom: 10,
  },

  // Content Row
  contentRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: 10,
    paddingHorizontal: 10,
    gap: 10,
  },
  contentRowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(184,205,186,0.4)',
  },

  // Play Button
  playButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.silverSage,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  // Text Block
  contentTextBlock: {
    flex: 1,
    minWidth: 0,
  },
  contentTitle: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.softCharcoal,
    marginBottom: 2,
  },
  contentMeta: {
    fontSize: 9,
    fontWeight: '400',
    color: Colors.mutedSageGray,
    marginBottom: 3,
  },
  contentDescription: {
    fontSize: 10,
    fontWeight: '400',
    color: Colors.mutedSageGray,
    lineHeight: 10 * 1.5,
  },

  // Heart Button
  heartButton: {
    width: 28,
    height: 28,
    justifyContent: 'center',
    alignItems: 'center',
    flexShrink: 0,
  },

  // Nudge Card
  nudgeCard: {
    backgroundColor: 'rgba(213,227,209,0.38)',
    borderLeftWidth: 2.5,
    borderLeftColor: Colors.evergreenTeal,
    borderTopRightRadius: 10,
    borderBottomRightRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    marginHorizontal: Spacing.base,
    marginTop: 2,
  },
  nudgeText: {
    fontSize: 10,
    fontWeight: '400',
    color: Colors.softCharcoal,
    lineHeight: 10 * 1.6,
  },

  // Tips
  tipsContent: {
    padding: 12,
  },
  tipsText: {
    fontSize: 10,
    fontWeight: '400',
    color: Colors.softCharcoal,
    lineHeight: 10 * 1.6,
  },

  // Bottom spacing
  bottomSpacing: {
    height: Spacing['4xl'],
  },
});
```

- [ ] **Step 6: Verify TypeScript compiles**

Run: `cd mobile && npx tsc --noEmit 2>&1 | grep "SleepScreen" | head -5`

- [ ] **Step 7: Commit**

```bash
git add mobile/src/screens/discover/SleepScreen.tsx
git commit -m "feat: rework Sleep Library with grouped cards, SVG icons, favorites, and nudge"
```

---

### Task 5: Manual QA Checklist

- [ ] **Step 1: Nav bar** — Sleep Library has Mist White background, Soft Charcoal title, Evergreen Teal back arrow. No teal background.

- [ ] **Step 2: Highlight card** — Intro paragraph is in a Dew Sage card with teal left accent. No bare text or bottom border separator.

- [ ] **Step 3: Section headers** — "Sleep sounds" and "Sleep stories" use SVG icons in Dew Sage circles, sentence case, with count badges. No emoji icons anywhere.

- [ ] **Step 4: Grouped cards** — All 3 sleep sounds are in ONE card with internal dividers. All 3 sleep stories are in ONE card with internal dividers. No individual card borders per item.

- [ ] **Step 5: Play buttons** — Circular, white background, Silver Sage border, teal play triangle. Changes to pause bars when playing.

- [ ] **Step 6: Heart icons** — Present on every row, default Silver Sage outline. Taps toggle to filled teal. State persists after leaving and returning to the screen.

- [ ] **Step 7: Copy corrections** — "Delta waves" (sentence case), "Calming melody", "Surreal forest". Surreal forest description says "forest ambience" not "ocean". All descriptions fit in 2 lines.

- [ ] **Step 8: New stories** — "A Sky Full of Drift" (9:17) and "The Stone Path Home" (10:36) appear in Sleep Stories section. Audio plays when tapped.

- [ ] **Step 9: Volume 2 nudge** — Below the Sleep Stories grouped card, Dew Sage card with teal left accent reads "More stories are on the way — Volume 2 coming soon."

- [ ] **Step 10: Brain Health tips** — Section header has leaf icon in Dew Sage circle. Tips are in a grouped card. No emoji bullets.

- [ ] **Step 11: Haptics** — On iOS, tapping a heart gives light haptic feedback.

# Podcast Section Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a podcast section to the Masterclass screen that streams The Resilient Brain podcast from its RSS feed, with episode list, detail view, and enhanced audio controls (playback speed, skip buttons, resume position).

**Architecture:** A `usePodcastFeed` hook fetches and caches the Captivate RSS feed (1-hour TTL). The MasterclassScreen gets a podcast section above the existing Coming Soon block. Episode cards link to a new PodcastEpisodeScreen for show notes. Audio plays through the existing AudioPlayerContext with new skip/speed controls. Resume position is persisted in AsyncStorage.

**Tech Stack:** React Native, expo-av (existing), react-native-rss-parser (new), AsyncStorage, existing AudioPlayerContext

---

## File Map

| Action | File | Responsibility |
|--------|------|---------------|
| Install | `react-native-rss-parser` | Parse RSS XML into episode objects |
| Create | `mobile/src/hooks/usePodcastFeed.ts` | Fetch, parse, cache RSS feed |
| Create | `mobile/src/screens/discover/PodcastEpisodeScreen.tsx` | Episode detail with show notes + play button |
| Modify | `mobile/src/screens/discover/MasterclassScreen.tsx` | Add podcast section above Coming Soon |
| Modify | `mobile/src/context/AudioPlayerContext.tsx` | Add skipForward, skipBack, setPlaybackRate, persistPosition |
| Modify | `mobile/src/components/library/AudioExpandedPlayer.tsx` | Add skip/speed buttons to expanded player |
| Modify | `mobile/src/navigation/AppNavigator.tsx` | Register PodcastEpisode screen |

---

### Task 1: Install RSS Parser Dependency

**Files:**
- Modify: `mobile/package.json`

- [ ] **Step 1: Install react-native-rss-parser**

```bash
cd mobile && npm install react-native-rss-parser
```

This is a pure JS package (no native modules), so no pod install or rebuild needed.

- [ ] **Step 2: Commit**

```bash
git add mobile/package.json mobile/package-lock.json
git commit -m "chore: add react-native-rss-parser for podcast feed"
```

---

### Task 2: Create usePodcastFeed Hook

**Files:**
- Create: `mobile/src/hooks/usePodcastFeed.ts`

- [ ] **Step 1: Create the hook**

```typescript
/**
 * usePodcastFeed
 * Fetches and caches The Resilient Brain podcast RSS feed from Captivate.
 * Episodes auto-update when new ones are published.
 */

import { useState, useEffect } from 'react';
import AsyncStorage from '@react-native-async-storage/async-storage';
import * as rssParser from 'react-native-rss-parser';

const FEED_URL = 'https://feeds.captivate.fm/the-resilient-brain/';
const CACHE_KEY = '@vara_podcast_feed';
const CACHE_TTL_MS = 60 * 60 * 1000; // 1 hour

export interface PodcastEpisode {
  id: string;
  title: string;
  description: string;       // Plain text (HTML stripped)
  descriptionHtml: string;   // Raw HTML for detail screen
  audioUrl: string;
  duration: string;           // "01:02:13" format from feed
  durationSeconds: number;
  publishedAt: string;        // ISO date string
  episodeNumber: number | null;
  imageUrl: string;
}

export interface PodcastShow {
  title: string;
  description: string;
  imageUrl: string;
  episodes: PodcastEpisode[];
}

function stripHtml(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, '\n')
    .replace(/<\/p>/gi, '\n')
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&nbsp;/g, ' ')
    .replace(/\n{3,}/g, '\n\n')
    .trim();
}

function parseDuration(durationStr: string): number {
  if (!durationStr) return 0;
  const parts = durationStr.split(':').map(Number);
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function formatDuration(durationStr: string): string {
  const seconds = parseDuration(durationStr);
  const mins = Math.round(seconds / 60);
  return `${mins} min`;
}

export function usePodcastFeed(): {
  show: PodcastShow | null;
  loading: boolean;
  error: Error | null;
  refresh: () => Promise<void>;
} {
  const [show, setShow] = useState<PodcastShow | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  const fetchFeed = async (skipCache = false) => {
    // Check cache first
    if (!skipCache) {
      try {
        const cached = await AsyncStorage.getItem(CACHE_KEY);
        if (cached) {
          const parsed = JSON.parse(cached);
          if (parsed.timestamp && Date.now() - parsed.timestamp < CACHE_TTL_MS) {
            setShow(parsed.data);
            setLoading(false);
            return;
          }
        }
      } catch {
        // Cache miss
      }
    }

    try {
      setLoading(true);
      const response = await fetch(FEED_URL);
      const xml = await response.text();
      const feed = await rssParser.parse(xml);

      const episodes: PodcastEpisode[] = feed.items.map((item: any) => {
        const enclosure = item.enclosures?.[0];
        const itunesDuration = item.itunes?.duration || '';
        const episodeNum = item.itunes?.episode ? parseInt(item.itunes.episode, 10) : null;
        const rawDescription = item.content || item.description || '';

        return {
          id: item.id || item.links?.[0]?.url || item.title,
          title: (item.title || '').replace(/^\d+\.\s*/, ''), // Strip leading "1. " numbering
          description: stripHtml(rawDescription),
          descriptionHtml: rawDescription,
          audioUrl: enclosure?.url || '',
          duration: formatDuration(itunesDuration),
          durationSeconds: parseDuration(itunesDuration),
          publishedAt: item.published || '',
          episodeNumber: episodeNum,
          imageUrl: item.itunes?.image || feed.image?.url || '',
        };
      }).filter((ep: PodcastEpisode) => ep.audioUrl);

      const showData: PodcastShow = {
        title: feed.title || 'The Resilient Brain',
        description: stripHtml(feed.description || ''),
        imageUrl: feed.image?.url || feed.itunes?.image || '',
        episodes,
      };

      setShow(showData);
      setError(null);

      // Cache result
      try {
        await AsyncStorage.setItem(CACHE_KEY, JSON.stringify({
          data: showData,
          timestamp: Date.now(),
        }));
      } catch {
        // Non-critical
      }
    } catch (err) {
      console.error('Error fetching podcast feed:', err);
      setError(err as Error);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchFeed();
  }, []);

  return { show, loading, error, refresh: () => fetchFeed(true) };
}
```

- [ ] **Step 2: Export from hooks barrel**

Add to `mobile/src/hooks/index.ts`:

```typescript
export { usePodcastFeed } from './usePodcastFeed';
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/hooks/usePodcastFeed.ts mobile/src/hooks/index.ts
git commit -m "feat: add usePodcastFeed hook for RSS feed parsing and caching"
```

---

### Task 3: Add Podcast Section to MasterclassScreen

**Files:**
- Modify: `mobile/src/screens/discover/MasterclassScreen.tsx`

- [ ] **Step 1: Rewrite MasterclassScreen with podcast section**

Replace the entire file. The new screen has two sections:
1. Podcast section at top (show art, episode list with play + info buttons)
2. Coming Soon section below for future masterclass content

```typescript
/**
 * Masterclass Screen
 * Podcasts + Educational courses
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  ActivityIndicator,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography } from '../../constants';
import { useMasterclasses, useMasterclassProgress } from '../../hooks';
import { usePodcastFeed, PodcastEpisode } from '../../hooks/usePodcastFeed';
import { LoadingSpinner } from '../../components';
import { MasterclassCard } from '../../components/library/MasterclassCard';
import { Masterclass } from '../../services/firebase/library.service';
import { useAudioPlayer } from '../../context/AudioPlayerContext';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const podcastCover = require('../../../assets/images/resilient-brain-cover.webp');

const VARA_COLORS = {
  teal: '#1B5E57',
  mistWhite: '#FAFAF6',
  charcoal: '#3E3E3E',
  sageGray: '#6F7F77',
  dewSage: '#D5E3D1',
  apricot: '#F5B971',
};

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

interface EpisodeCardProps {
  episode: PodcastEpisode;
  isPlaying: boolean;
  onPlay: () => void;
  onInfo: () => void;
}

const EpisodeCard: React.FC<EpisodeCardProps> = ({ episode, isPlaying, onPlay, onInfo }) => (
  <View style={styles.episodeCard}>
    <View style={styles.episodeContent}>
      <Text style={styles.episodeTitle} numberOfLines={2}>{episode.title}</Text>
      <View style={styles.episodeMeta}>
        {episode.episodeNumber != null && (
          <Text style={styles.episodeNumber}>Ep. {episode.episodeNumber}</Text>
        )}
        <Text style={styles.episodeDuration}>{episode.duration}</Text>
        <Text style={styles.episodeDate}>{formatDate(episode.publishedAt)}</Text>
      </View>
    </View>
    <View style={styles.episodeActions}>
      <TouchableOpacity
        onPress={onInfo}
        style={styles.infoButton}
        accessibilityRole="button"
        accessibilityLabel="Episode details"
      >
        <Icon name="information-outline" size={22} color={VARA_COLORS.sageGray} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onPlay}
        style={[styles.playButton, isPlaying && styles.playButtonActive]}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Now playing' : 'Play episode'}
      >
        <Icon
          name={isPlaying ? 'pause' : 'play'}
          size={20}
          color={isPlaying ? '#FFFFFF' : VARA_COLORS.teal}
        />
      </TouchableOpacity>
    </View>
  </View>
);

export default function MasterclassScreen() {
  const navigation = useNavigation<any>();
  const { masterclasses, loading: masterclassLoading } = useMasterclasses();
  const { progress } = useMasterclassProgress();
  const { show, loading: podcastLoading } = usePodcastFeed();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  const getProgress = (masterclassId: string) => {
    const userProgress = progress.find((p) => p.masterclassId === masterclassId);
    return userProgress?.progress || 0;
  };

  const handlePlayEpisode = (episode: PodcastEpisode) => {
    playTrack(episode.title, episode.audioUrl, false);
  };

  const handleEpisodeInfo = (episode: PodcastEpisode) => {
    navigation.navigate('PodcastEpisode', { episode });
  };

  const isEpisodePlaying = (episode: PodcastEpisode) => {
    return isPlaying && currentTrack === episode.title;
  };

  if (podcastLoading && masterclassLoading) {
    return <LoadingSpinner message="Loading content..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>

        {/* Podcast Section */}
        {show && (
          <View style={styles.podcastSection}>
            {/* Show Header */}
            <View style={styles.showHeader}>
              <Image source={podcastCover} style={styles.showArt} />
              <View style={styles.showInfo}>
                <Text style={styles.showTitle}>{show.title}</Text>
                <Text style={styles.showHost}>Jen Shepard</Text>
                <Text style={styles.showEpisodeCount}>
                  {show.episodes.length} episode{show.episodes.length !== 1 ? 's' : ''}
                </Text>
              </View>
            </View>

            {/* Also Available On */}
            <View style={styles.availableOn}>
              <Text style={styles.availableOnLabel}>Also available on</Text>
              <View style={styles.platformLinks}>
                <TouchableOpacity style={styles.platformChip}>
                  <Icon name="apple" size={14} color={VARA_COLORS.charcoal} />
                  <Text style={styles.platformText}>Apple</Text>
                </TouchableOpacity>
                <TouchableOpacity style={styles.platformChip}>
                  <Icon name="spotify" size={14} color="#1DB954" />
                  <Text style={styles.platformText}>Spotify</Text>
                </TouchableOpacity>
              </View>
            </View>

            {/* Section Label */}
            <Text style={styles.sectionLabel}>EPISODES</Text>

            {/* Episode List */}
            {show.episodes.map((episode) => (
              <EpisodeCard
                key={episode.id}
                episode={episode}
                isPlaying={isEpisodePlaying(episode)}
                onPlay={() => handlePlayEpisode(episode)}
                onInfo={() => handleEpisodeInfo(episode)}
              />
            ))}
          </View>
        )}

        {podcastLoading && (
          <View style={styles.podcastLoading}>
            <ActivityIndicator size="small" color={VARA_COLORS.teal} />
            <Text style={styles.podcastLoadingText}>Loading podcast...</Text>
          </View>
        )}

        {/* Masterclass Section - Coming Soon */}
        <View style={styles.masterclassSection}>
          <Text style={styles.sectionLabel}>MASTERCLASS</Text>
          {masterclasses.length > 0 ? (
            masterclasses.map((item: Masterclass) => (
              <MasterclassCard
                key={item.id}
                masterclass={item}
                progress={getProgress(item.id)}
                onPress={() => navigation.navigate('MasterclassDetail', { classId: item.id })}
              />
            ))
          ) : (
            <View style={styles.comingSoonCard}>
              <Icon name="school-outline" size={32} color={VARA_COLORS.apricot} />
              <Text style={styles.comingSoonTitle}>Coming Soon</Text>
              <Text style={styles.comingSoonText}>
                Expert-led masterclasses on brain health, stress resilience, and peak performance.
              </Text>
            </View>
          )}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VARA_COLORS.mistWhite,
  },
  scrollContent: {
    paddingBottom: 100,
  },

  // Podcast Section
  podcastSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.base,
  },
  showHeader: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 16,
  },
  showArt: {
    width: 100,
    height: 100,
    borderRadius: 12,
    backgroundColor: VARA_COLORS.dewSage,
  },
  showInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  showTitle: {
    fontSize: 18,
    fontWeight: '700',
    color: VARA_COLORS.charcoal,
    marginBottom: 4,
  },
  showHost: {
    fontSize: 14,
    color: VARA_COLORS.sageGray,
    marginBottom: 2,
  },
  showEpisodeCount: {
    fontSize: 13,
    color: VARA_COLORS.sageGray,
  },

  // Also Available On
  availableOn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 20,
  },
  availableOnLabel: {
    fontSize: 12,
    color: VARA_COLORS.sageGray,
  },
  platformLinks: {
    flexDirection: 'row',
    gap: 8,
  },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(27,94,87,0.1)',
  },
  platformText: {
    fontSize: 12,
    fontWeight: '500',
    color: VARA_COLORS.charcoal,
  },

  // Section Label
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    color: VARA_COLORS.sageGray,
    marginBottom: 12,
  },

  // Episode Card
  episodeCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    padding: 14,
    marginBottom: 10,
    borderWidth: 1,
    borderColor: 'rgba(27,94,87,0.06)',
    shadowColor: VARA_COLORS.teal,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  episodeContent: {
    flex: 1,
    marginRight: 12,
  },
  episodeTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: VARA_COLORS.charcoal,
    marginBottom: 6,
    lineHeight: 20,
  },
  episodeMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  episodeNumber: {
    fontSize: 12,
    fontWeight: '600',
    color: VARA_COLORS.teal,
  },
  episodeDuration: {
    fontSize: 12,
    color: VARA_COLORS.sageGray,
  },
  episodeDate: {
    fontSize: 12,
    color: VARA_COLORS.sageGray,
  },
  episodeActions: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
  },
  infoButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
    alignItems: 'center',
    justifyContent: 'center',
  },
  playButton: {
    width: 42,
    height: 42,
    borderRadius: 21,
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: VARA_COLORS.dewSage,
  },
  playButtonActive: {
    backgroundColor: VARA_COLORS.teal,
  },

  // Podcast Loading
  podcastLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: 24,
    gap: 8,
  },
  podcastLoadingText: {
    fontSize: 14,
    color: VARA_COLORS.sageGray,
  },

  // Masterclass Section
  masterclassSection: {
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.xl,
  },
  comingSoonCard: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 24,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: 'rgba(27,94,87,0.06)',
    borderStyle: 'dashed',
  },
  comingSoonTitle: {
    fontSize: 16,
    fontWeight: '600',
    color: VARA_COLORS.charcoal,
    marginTop: 12,
    marginBottom: 6,
  },
  comingSoonText: {
    fontSize: 14,
    color: VARA_COLORS.sageGray,
    textAlign: 'center',
    lineHeight: 20,
  },
});
```

- [ ] **Step 2: Commit**

```bash
git add mobile/src/screens/discover/MasterclassScreen.tsx
git commit -m "feat: add podcast section to Masterclass screen with episode list"
```

---

### Task 4: Create PodcastEpisodeScreen

**Files:**
- Create: `mobile/src/screens/discover/PodcastEpisodeScreen.tsx`
- Modify: `mobile/src/navigation/AppNavigator.tsx`

- [ ] **Step 1: Create the episode detail screen**

```typescript
/**
 * Podcast Episode Screen
 * Show notes, description, and play button for a single episode
 */

import React from 'react';
import {
  View,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  Image,
  Linking,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { PodcastEpisode } from '../../hooks/usePodcastFeed';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const podcastCover = require('../../../assets/images/resilient-brain-cover.webp');

const VARA_COLORS = {
  teal: '#1B5E57',
  mistWhite: '#FAFAF6',
  charcoal: '#3E3E3E',
  sageGray: '#6F7F77',
  dewSage: '#D5E3D1',
};

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

export default function PodcastEpisodeScreen() {
  const route = useRoute<any>();
  const episode: PodcastEpisode = route.params?.episode;
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  if (!episode) return null;

  const isCurrentlyPlaying = isPlaying && currentTrack === episode.title;

  const handlePlay = () => {
    playTrack(episode.title, episode.audioUrl, false);
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView showsVerticalScrollIndicator={false} contentContainerStyle={styles.scrollContent}>
        {/* Episode Header */}
        <View style={styles.header}>
          <Image source={podcastCover} style={styles.coverArt} />
          <View style={styles.headerInfo}>
            {episode.episodeNumber != null && (
              <Text style={styles.episodeLabel}>Episode {episode.episodeNumber}</Text>
            )}
            <Text style={styles.title}>{episode.title}</Text>
            <Text style={styles.meta}>
              {episode.duration} {'\u00B7'} {formatDate(episode.publishedAt)}
            </Text>
          </View>
        </View>

        {/* Play Button */}
        <TouchableOpacity
          onPress={handlePlay}
          style={[styles.playButton, isCurrentlyPlaying && styles.playButtonActive]}
          activeOpacity={0.8}
        >
          <Icon
            name={isCurrentlyPlaying ? 'pause' : 'play'}
            size={22}
            color="#FFFFFF"
          />
          <Text style={styles.playButtonText}>
            {isCurrentlyPlaying ? 'Playing' : 'Play Episode'}
          </Text>
        </TouchableOpacity>

        {/* Also Available On */}
        <View style={styles.availableOn}>
          <Text style={styles.availableOnLabel}>Also available on</Text>
          <View style={styles.platformLinks}>
            <TouchableOpacity
              style={styles.platformChip}
              onPress={() => Linking.openURL('https://podcasts.apple.com/us/podcast/the-resilient-brain/id1800655498')}
            >
              <Icon name="apple" size={14} color={VARA_COLORS.charcoal} />
              <Text style={styles.platformText}>Apple Podcasts</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.platformChip}
              onPress={() => Linking.openURL('https://open.spotify.com/show/4PYCeTiYRfeWKiYtyMIen4')}
            >
              <Icon name="spotify" size={14} color="#1DB954" />
              <Text style={styles.platformText}>Spotify</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Show Notes */}
        <View style={styles.showNotes}>
          <Text style={styles.showNotesLabel}>SHOW NOTES</Text>
          <Text style={styles.showNotesText}>{episode.description}</Text>
        </View>
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: VARA_COLORS.mistWhite,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: 120,
  },

  // Header
  header: {
    flexDirection: 'row',
    gap: 16,
    marginBottom: 20,
  },
  coverArt: {
    width: 80,
    height: 80,
    borderRadius: 10,
    backgroundColor: VARA_COLORS.dewSage,
  },
  headerInfo: {
    flex: 1,
    justifyContent: 'center',
  },
  episodeLabel: {
    fontSize: 12,
    fontWeight: '600',
    color: VARA_COLORS.teal,
    marginBottom: 4,
  },
  title: {
    fontSize: 18,
    fontWeight: '700',
    color: VARA_COLORS.charcoal,
    lineHeight: 24,
    marginBottom: 6,
  },
  meta: {
    fontSize: 13,
    color: VARA_COLORS.sageGray,
  },

  // Play Button
  playButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 8,
    backgroundColor: VARA_COLORS.teal,
    borderRadius: 12,
    paddingVertical: 14,
    marginBottom: 20,
  },
  playButtonActive: {
    backgroundColor: VARA_COLORS.charcoal,
  },
  playButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: '#FFFFFF',
  },

  // Available On
  availableOn: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 24,
  },
  availableOnLabel: {
    fontSize: 12,
    color: VARA_COLORS.sageGray,
  },
  platformLinks: {
    flexDirection: 'row',
    gap: 8,
  },
  platformChip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    paddingHorizontal: 10,
    paddingVertical: 5,
    borderRadius: 12,
    backgroundColor: '#FFFFFF',
    borderWidth: 1,
    borderColor: 'rgba(27,94,87,0.1)',
  },
  platformText: {
    fontSize: 12,
    fontWeight: '500',
    color: VARA_COLORS.charcoal,
  },

  // Show Notes
  showNotes: {
    backgroundColor: '#FFFFFF',
    borderRadius: 16,
    padding: 18,
    borderWidth: 1,
    borderColor: 'rgba(27,94,87,0.06)',
  },
  showNotesLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    color: VARA_COLORS.sageGray,
    marginBottom: 12,
  },
  showNotesText: {
    fontSize: 14,
    color: VARA_COLORS.charcoal,
    lineHeight: 22,
  },
});
```

- [ ] **Step 2: Register PodcastEpisode screen in AppNavigator**

In `mobile/src/navigation/AppNavigator.tsx`, find the DiscoverStack screens (inside the `DiscoverNavigator`). After the `MasterclassDetail` screen, add:

```typescript
      <DiscoverStack.Screen
        name="PodcastEpisode"
        component={PodcastEpisodeScreen}
        options={{
          ...standardHeaderOptions,
          title: 'Episode',
          headerShadowVisible: false,
        }}
      />
```

Import at the top of AppNavigator:

```typescript
import PodcastEpisodeScreen from '../screens/discover/PodcastEpisodeScreen';
```

- [ ] **Step 3: Commit**

```bash
git add mobile/src/screens/discover/PodcastEpisodeScreen.tsx mobile/src/navigation/AppNavigator.tsx
git commit -m "feat: add PodcastEpisodeScreen with show notes and play button"
```

---

### Task 5: Add Skip and Playback Speed to AudioPlayer

**Files:**
- Modify: `mobile/src/context/AudioPlayerContext.tsx`
- Modify: `mobile/src/components/library/AudioExpandedPlayer.tsx`

- [ ] **Step 1: Add skipForward, skipBack, and setPlaybackRate to AudioPlayerContext**

In `AudioPlayerContext.tsx`, add to the `AudioControlsContextValue` interface:

```typescript
  skipForward: (seconds?: number) => Promise<void>;
  skipBack: (seconds?: number) => Promise<void>;
  playbackRate: number;
  setPlaybackRate: (rate: number) => Promise<void>;
```

Add state and implementations inside the provider:

```typescript
  const [playbackRate, setPlaybackRateState] = useState(1.0);
```

Add the functions before the return:

```typescript
  const skipForward = useCallback(async (seconds: number = 15) => {
    if (soundRef.current && durationRef.current > 0) {
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          const newPosition = Math.min(status.positionMillis + seconds * 1000, durationRef.current);
          await soundRef.current.setPositionAsync(newPosition);
          setProgress(newPosition / durationRef.current);
        }
      } catch (err) {
        logger.error('Error skipping forward:', err);
      }
    }
  }, []);

  const skipBack = useCallback(async (seconds: number = 15) => {
    if (soundRef.current && durationRef.current > 0) {
      try {
        const status = await soundRef.current.getStatusAsync();
        if (status.isLoaded) {
          const newPosition = Math.max(status.positionMillis - seconds * 1000, 0);
          await soundRef.current.setPositionAsync(newPosition);
          setProgress(newPosition / durationRef.current);
        }
      } catch (err) {
        logger.error('Error skipping back:', err);
      }
    }
  }, []);

  const setPlaybackRate = useCallback(async (rate: number) => {
    if (soundRef.current) {
      try {
        await soundRef.current.setRateAsync(rate, true);
        setPlaybackRateState(rate);
      } catch (err) {
        logger.error('Error setting playback rate:', err);
      }
    }
  }, []);
```

Add these to the controls context value and the return:

```typescript
  skipForward,
  skipBack,
  playbackRate,
  setPlaybackRate,
```

- [ ] **Step 2: Add skip and speed controls to AudioExpandedPlayer**

In `AudioExpandedPlayer.tsx`, find the play/pause button section. Add skip buttons on either side and a speed button below:

Before the play button:
```typescript
<TouchableOpacity onPress={() => skipBack(15)} style={styles.skipButton}>
  <Icon name="rewind-15" size={28} color={VARA_COLORS.charcoal} />
</TouchableOpacity>
```

After the play button:
```typescript
<TouchableOpacity onPress={() => skipForward(15)} style={styles.skipButton}>
  <Icon name="fast-forward-15" size={28} color={VARA_COLORS.charcoal} />
</TouchableOpacity>
```

Below the controls row, add a speed selector:
```typescript
<View style={styles.speedRow}>
  {[1, 1.25, 1.5, 2].map((rate) => (
    <TouchableOpacity
      key={rate}
      onPress={() => setPlaybackRate(rate)}
      style={[styles.speedChip, playbackRate === rate && styles.speedChipActive]}
    >
      <Text style={[styles.speedText, playbackRate === rate && styles.speedTextActive]}>
        {rate}x
      </Text>
    </TouchableOpacity>
  ))}
</View>
```

Add corresponding styles for `skipButton`, `speedRow`, `speedChip`, `speedChipActive`, `speedText`, `speedTextActive`.

- [ ] **Step 3: Commit**

```bash
git add mobile/src/context/AudioPlayerContext.tsx mobile/src/components/library/AudioExpandedPlayer.tsx
git commit -m "feat: add skip forward/back, playback speed to audio player"
```

---

### Task 6: Verification

- [ ] **Step 1: Verify podcast feed loads**

Open the Masterclass screen. Should see The Resilient Brain cover art, show info, and 2 episodes.

- [ ] **Step 2: Verify episode playback**

Tap play on an episode. Audio should stream, mini player bar should appear. Tap mini player to expand. Skip and speed buttons should be visible.

- [ ] **Step 3: Verify episode detail**

Tap the info icon on an episode. PodcastEpisodeScreen should show cover art, title, duration, date, play button, "Also available on" links, and show notes.

- [ ] **Step 4: Verify Coming Soon section still visible**

Scroll below episodes. "MASTERCLASS" section with Coming Soon card should appear.

- [ ] **Step 5: Verify no TypeScript errors**

Run: `cd mobile && npx tsc --noEmit 2>&1 | head -30`

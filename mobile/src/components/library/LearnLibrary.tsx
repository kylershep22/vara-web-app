/**
 * LearnLibrary — the podcast + masterclass body, extracted from MasterclassScreen.
 *
 * WHY THIS COMPONENT EXISTS (LEARN-REHOUSE, shape A). The Learn tab needed this
 * content and the `Masterclass` AppStack route had to keep rendering, so the
 * body was extracted rather than moved. Each host supplies its own chrome and
 * the two chromes DIVERGE ON PURPOSE:
 *
 *   - `MasterclassScreen` is a pushed screen with the tab bar hidden. It keeps
 *     `SafeAreaView edges={['bottom']}` and its own `paddingBottom: 100`.
 *   - `LearnHubScreen` is a tab root under the floating capsule. It keeps
 *     `edges={['top']}`, its title row, and `useTabBarInset()`.
 *
 * THE RAW 100 MUST NEVER ENTER THIS FILE. It is 10 too small on a 14 Plus and
 * 12 too large on an SE (`useTabBarInset` composes 110 and 88 respectively), so
 * a literal here would be wrong on both. This component renders CHILDREN, not a
 * scroller, which is what keeps that value confined to the host that needs it.
 *
 * NO EARLY FULL-SCREEN RETURN. The version this was extracted from returned
 * `<LoadingSpinner />` above its SafeAreaView, which on a tab root would blank
 * the title row. Per standards 14.1 - "Loading never blocks the whole screen if
 * part of it can render" - loading renders in place, and the masterclass
 * section is evaluated independently of the podcast region's state.
 *
 * TOKEN DEBT IS INHERITED, NOT INTRODUCED, AND IT IS DELIBERATE. `VARA_COLORS`
 * below and the raw `rgba()` values in the styles came with the body unchanged.
 * They are recorded as debt on the LEARN-REHOUSE row rather than fixed here,
 * because a visual change riding inside a structural move is the separation R1b
 * existed to enforce, and R6+ restyles this surface anyway. NOTE FOR ANYONE
 * CHECKING: the no-raw-hex lint rule does NOT match `rgba()` (DESIGN_BACKLOG
 * item 12), so a green lint on this file proves nothing about token compliance.
 */

import React, { useCallback, useEffect, useState } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Image,
  Alert,
  Linking,
} from 'react-native';
import Text from '../shared/Text';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Network from 'expo-network';
import { Colors, Spacing } from '../../constants';
import { useMasterclasses, useMasterclassProgress } from '../../hooks';
import { usePodcastFeed, PodcastEpisode } from '../../hooks/usePodcastFeed';
import LoadingSpinner from '../LoadingSpinner';
import { MasterclassCard } from './MasterclassCard';
import { Masterclass } from '../../services/firebase/library.service';
import { useAudioPlayer } from '../../context/AudioPlayerContext';

// eslint-disable-next-line @typescript-eslint/no-var-requires
const podcastCover = require('../../../assets/images/resilient-brain-cover.webp');

const VARA_COLORS = {
  teal: '#1B5E57',
  mistWhite: '#FAFAF6',
  charcoal: '#3E3E3E',
  sageGray: Colors.mutedSageGray,
  dewSage: '#D5E3D1',
  apricot: '#F5B971',
};

/**
 * The two platform links.
 *
 * The walk of 2026-09-27 settled which pair is current. The pair that had been
 * in the tree since March 404ed on both platforms; these two are the ones Kyle
 * confirmed resolve to The Resilient Brain in a browser on the device. The same
 * pair is inlined in `PodcastEpisodeScreen.tsx`, which is a duplication no one
 * has collapsed yet — change one surface and you must change the other.
 */
const APPLE_URL = 'https://podcasts.apple.com/us/podcast/the-resilient-brain/id1882167234';
const SPOTIFY_URL = 'https://open.spotify.com/show/2Q22r7SDIHkN0cvy1zmH4F';

/**
 * Copy for the six states.
 *
 * The seven strings below are KYLE'S, authored and approved as UI copy, and
 * they carry no draft sentinel for that reason (the "entering flat" case, per
 * the precedent at `__tests__/copyDraftSentinel.test.ts`). The two
 * accessibility labels further down are NOT his and are marked accordingly.
 */
const COPY = {
  /** State 2 - offline, no usable cache. */
  offlineEmptyHeadline: "Episodes aren't available",
  offlineEmptyBody: "You're offline, so we can't load them right now.",
  /** State 3 - offline, cache available at any age. */
  offlineWithCache: "You're offline. Showing episodes saved earlier.",
  /** State 4 - feed failed with no cache; also state 6, connectivity unknown. */
  errorHeadline: 'Episodes didn’t load',
  errorBody: "We couldn't reach the feed right now.",
  errorCta: 'Try again',
  /** State 5 - feed failed, cache available. */
  staleAfterFailedRefresh: "Showing saved episodes. We couldn't refresh the feed.",
} as const;

/**
 * Connectivity, as THREE states rather than a boolean.
 *
 * `unknown` has to exist as its own value. The app's shared `useNetworkStatus`
 * hook defaults optimistically to connected and swallows a failed check back to
 * connected, so a boolean cannot distinguish "checked, online" from "have not
 * looked yet" - and the difference decides whether the user is told they are
 * offline. Standards-wise this is the same discipline as the three-state rule:
 * something, nothing, or not known, never a confident wrong answer.
 */
type Connectivity = 'online' | 'offline' | 'unknown';

/**
 * Reads connectivity directly from `expo-network`.
 *
 * DELIBERATELY NOT `useNetworkStatus`. That hook is already mounted app-wide by
 * `OfflineIndicator` (AppNavigator.tsx:920) and is not a singleton: a second
 * call starts a second 5-second poll, a second `initializeOfflineQueue()` and a
 * second sync driver that fires `processQueue()` - a Firestore write-queue
 * drain. Tabs stay mounted once focused, so all of that would run for the rest
 * of the session. A podcast list must not drive the offline write queue.
 */
function useConnectivity(): [Connectivity, () => Promise<void>] {
  const [connectivity, setConnectivity] = useState<Connectivity>('unknown');

  const check = useCallback(async () => {
    try {
      const state = await Network.getNetworkStateAsync();
      if (state.isConnected === false || state.isInternetReachable === false) {
        setConnectivity('offline');
        return;
      }
      if (state.isConnected === true) {
        setConnectivity('online');
        return;
      }
      // A state object that answers neither way is not evidence of either.
      setConnectivity('unknown');
    } catch {
      // A failed check is NOT evidence of being offline. It stays unknown, and
      // unknown routes to the generic failure copy rather than the offline copy.
      setConnectivity('unknown');
    }
  }, []);

  useEffect(() => {
    check();
  }, [check]);

  return [connectivity, check];
}

function formatDate(dateStr: string): string {
  try {
    const date = new Date(dateStr);
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  } catch {
    return '';
  }
}

/**
 * Opens an external URL.
 *
 * THE STANDARDS ARE SILENT ON EXTERNAL LINKS - there is no rule in
 * `Vara_Mobile_UI_Standards.md` about leaving the app, and none is invented
 * here. The failure handling is a HOUSE CONVENTION, copied from the only two
 * places that do it properly (`SettingsScreen.tsx:242-246` and
 * `PaywallScreen.tsx:156-160`), including their alert wording verbatim.
 * `PodcastEpisodeScreen`'s bare call is the pattern NOT followed: an uncaught
 * `openURL` rejection is an unhandled promise rejection.
 */
function openExternal(url: string) {
  Linking.openURL(url).catch(() => {
    Alert.alert('Unavailable', 'Could not open the link. Please try again later.');
  });
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
        testID={`learn-episode-info-${episode.id}`}
      >
        <Icon name="information-outline" size={22} color={VARA_COLORS.sageGray} />
      </TouchableOpacity>
      <TouchableOpacity
        onPress={onPlay}
        style={[styles.playButton, isPlaying && styles.playButtonActive]}
        accessibilityRole="button"
        accessibilityLabel={isPlaying ? 'Now playing' : 'Play episode'}
        testID={`learn-episode-play-${episode.id}`}
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

/**
 * The 14.2 empty state and the 14.4 error state, which are DIFFERENT SURFACES
 * and are written as such rather than as one component with a flag.
 *
 * 14.2 is an invitation: spot illustration, H3 headline in Teal, body, no blame
 * and here no CTA, because there is nothing a tap can do about being offline.
 * 14.4 is a failure: Soft Coral, supportive, and it ALWAYS offers the retry in
 * place - "a screen must never look healthy while its button is dead."
 *
 * THE ILLUSTRATION IS A CODE-RENDERED GLYPH, AND `SpotIllustration` WAS CHECKED
 * FIRST. That component takes `source: ImageProps['source']` - a `require(...)`
 * of a transparent raster - so it cannot render without a new image asset, and
 * a new asset was explicitly barred. (It also has zero consumers today;
 * `JournalEmptyState` uses an Ionicons glyph, not this component.) The glyph in
 * a tinted 80pt circle is the in-tree empty-state illustration pattern, used by
 * `MessagingEmptyState` and echoed by `JournalEmptyState`, and 80 sits inside
 * 14.2's stated 80-to-120 band. It is static, so Reduce Motion is satisfied by
 * construction.
 */
const OfflineEmptyState: React.FC = () => (
  <View style={styles.stateBlock} testID="learn-podcast-offline-empty">
    <View style={styles.spot}>
      <Icon name="wifi-off" size={40} color={Colors.evergreenTeal} />
    </View>
    <Text style={styles.stateHeadline}>{COPY.offlineEmptyHeadline}</Text>
    <Text style={styles.stateBody}>{COPY.offlineEmptyBody}</Text>
  </View>
);

const FeedErrorState: React.FC<{ onRetry: () => void }> = ({ onRetry }) => (
  <View style={styles.errorBlock} testID="learn-podcast-error">
    <View style={styles.errorHeader}>
      <Icon name="alert-circle-outline" size={20} color={Colors.error} />
      <Text style={styles.errorHeadline}>{COPY.errorHeadline}</Text>
    </View>
    <Text style={styles.stateBody}>{COPY.errorBody}</Text>
    <TouchableOpacity
      onPress={onRetry}
      style={styles.retryButton}
      accessibilityRole="button"
      accessibilityLabel={COPY.errorCta}
      testID="learn-podcast-retry"
    >
      <Text style={styles.retryLabel}>{COPY.errorCta}</Text>
    </TouchableOpacity>
  </View>
);

/** States 3 and 5: content is real, the line explains why it may be behind. */
const StaleNotice: React.FC<{ message: string }> = ({ message }) => (
  <View style={styles.notice} testID="learn-podcast-notice">
    <Icon name="information-outline" size={16} color={VARA_COLORS.sageGray} />
    <Text style={styles.noticeText}>{message}</Text>
  </View>
);

export function LearnLibrary() {
  const navigation = useNavigation<any>();
  const { masterclasses } = useMasterclasses();
  const { progress } = useMasterclassProgress();
  const {
    show,
    loading: podcastLoading,
    error: podcastError,
    fromCache,
    refresh,
  } = usePodcastFeed();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();
  const [connectivity, recheckConnectivity] = useConnectivity();

  const getProgress = (masterclassId: string) => {
    const userProgress = progress.find((p: any) => p.masterclassId === masterclassId);
    return userProgress?.progress || 0;
  };

  const handlePlayEpisode = (episode: PodcastEpisode) => {
    playTrack(episode.title, episode.audioUrl, false, podcastCover);
  };

  const handleEpisodeInfo = (episode: PodcastEpisode) => {
    navigation.navigate('PodcastEpisode', { episode });
  };

  /**
   * FIXED IN LEARN-REHOUSE, AND IT WAS A SHIPPED DEFECT RATHER THAN A TYPE NIT.
   * This read `currentTrack === episode.title`. `currentTrack` is an
   * `AudioTrack | null` - an OBJECT with a `.title` - so the comparison was
   * always false and the play button never swapped to pause or took the active
   * fill. Audio played; the row just never said which row was playing. It sat
   * inside the tsc baseline as TS2367, which is how a type error became a
   * visual defect nobody looked at.
   */
  const isEpisodePlaying = (episode: PodcastEpisode) => {
    return isPlaying && currentTrack?.title === episode.title;
  };

  const handleRetry = () => {
    // Re-read connectivity alongside the refetch: a retry is exactly the moment
    // the answer may have changed, and state 2 vs state 4 depends on it.
    recheckConnectivity();
    refresh();
  };

  const hasEpisodes = !!show && show.episodes.length > 0;

  /**
   * STATE SELECTION, and the ordering is load-bearing.
   *
   * Offline outranks a generic failure because it is the more specific and more
   * actionable explanation for the same symptom. `unknown` deliberately does
   * NOT reach the offline copy: state 6 says offline-specific wording is used
   * only when connectivity is explicitly established as unavailable, so unknown
   * falls through to the generic failure state.
   */
  const notice = !hasEpisodes || !fromCache
    ? null
    : connectivity === 'offline'
      ? COPY.offlineWithCache          // state 3
      : podcastError
        ? COPY.staleAfterFailedRefresh // state 5
        : null;                        // state 1 via a fresh cache hit

  const renderPodcastRegion = () => {
    // Loading, but only while there is nothing real to show. A refresh over
    // existing episodes leaves them on screen (14.1).
    if (podcastLoading && !hasEpisodes) {
      return (
        <View style={styles.stateBlock} testID="learn-podcast-loading">
          <LoadingSpinner message="Loading content..." fullScreen={false} />
        </View>
      );
    }

    if (!hasEpisodes) {
      // State 2 only on an established offline. States 4 and 6 share this.
      return connectivity === 'offline' ? (
        <OfflineEmptyState />
      ) : (
        <FeedErrorState onRetry={handleRetry} />
      );
    }

    return (
      <View style={styles.podcastSection} testID="learn-podcast-list">
        {notice && <StaleNotice message={notice} />}

        {/* Show Header */}
        <View style={styles.showHeader}>
          <Image source={podcastCover} style={styles.showArt} />
          <View style={styles.showInfo}>
            <Text style={styles.showTitle}>{show!.title}</Text>
            <Text style={styles.showHost}>Jen Shepard</Text>
            <Text style={styles.showEpisodeCount}>
              {show!.episodes.length} episode{show!.episodes.length !== 1 ? 's' : ''}
            </Text>
          </View>
        </View>

        {/* Also Available On */}
        <View style={styles.availableOn}>
          <Text style={styles.availableOnLabel}>Also available on</Text>
          <View style={styles.platformLinks}>
            <TouchableOpacity
              style={styles.platformChip}
              onPress={() => openExternal(APPLE_URL)}
              accessibilityRole="button"
              // COPY: draft, not from guidelines doc - pending Kyle
              accessibilityLabel="Listen on Apple Podcasts. Opens outside the app."
              testID="learn-chip-apple"
            >
              <Icon name="apple" size={14} color={VARA_COLORS.charcoal} />
              <Text style={styles.platformText}>Apple</Text>
            </TouchableOpacity>
            <TouchableOpacity
              style={styles.platformChip}
              onPress={() => openExternal(SPOTIFY_URL)}
              accessibilityRole="button"
              // COPY: draft, not from guidelines doc - pending Kyle
              accessibilityLabel="Listen on Spotify. Opens outside the app."
              testID="learn-chip-spotify"
            >
              <Icon name="spotify" size={14} color="#1DB954" />
              <Text style={styles.platformText}>Spotify</Text>
            </TouchableOpacity>
          </View>
        </View>

        {/* Section Label */}
        <Text style={styles.sectionLabel}>EPISODES</Text>

        {/* Episode List */}
        {show!.episodes.map((episode) => (
          <EpisodeCard
            key={episode.id}
            episode={episode}
            isPlaying={isEpisodePlaying(episode)}
            onPlay={() => handlePlayEpisode(episode)}
            onInfo={() => handleEpisodeInfo(episode)}
          />
        ))}
      </View>
    );
  };

  return (
    <>
      {renderPodcastRegion()}

      {/* Masterclass section - only show when content exists. Evaluated
          independently of the podcast region, so a feed failure does not hide
          masterclasses and an empty masterclass collection does not hide the
          podcast. The collection is empty today; this renders nothing. */}
      {masterclasses.length > 0 && (
        <View style={styles.masterclassSection}>
          <Text style={styles.sectionLabel}>MASTERCLASS</Text>
          {masterclasses.map((item: Masterclass) => (
            <MasterclassCard
              key={item.id}
              masterclass={item}
              progress={getProgress(item.id)}
              onPress={() => navigation.navigate('MasterclassDetail', { classId: item.id })}
            />
          ))}
        </View>
      )}
    </>
  );
}

const styles = StyleSheet.create({
  podcastSection: {
    paddingTop: Spacing.base,
  },
  // State blocks sit in the content flow rather than filling the screen, so the
  // host's title row stays visible above them (14.1).
  stateBlock: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  spot: {
    width: 80,
    height: 80,
    borderRadius: 40,
    backgroundColor: Colors.dewSageLight,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.base,
  },
  stateHeadline: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.evergreenTeal,
    textAlign: 'center',
    marginBottom: Spacing.xs,
  },
  stateBody: {
    fontSize: 14,
    color: VARA_COLORS.sageGray,
    textAlign: 'center',
    lineHeight: 20,
  },
  // 14.4: inline, Coral, retry in place. Not centred like the empty state -
  // an error belongs next to the thing that failed, not in the middle of it.
  errorBlock: {
    marginTop: Spacing.base,
    padding: Spacing.base,
    borderRadius: 12,
    borderWidth: 1,
    borderColor: Colors.error,
    backgroundColor: '#FFFFFF',
  },
  errorHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    marginBottom: Spacing.xs,
  },
  errorHeadline: {
    fontSize: 16,
    fontWeight: '600',
    color: VARA_COLORS.charcoal,
  },
  retryButton: {
    alignSelf: 'flex-start',
    minHeight: 48,
    justifyContent: 'center',
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.sm,
  },
  retryLabel: {
    fontSize: 15,
    fontWeight: '600',
    color: VARA_COLORS.teal,
  },
  notice: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    paddingVertical: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  noticeText: {
    flex: 1,
    fontSize: 13,
    color: VARA_COLORS.sageGray,
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
  sectionLabel: {
    fontSize: 12,
    fontWeight: '600',
    letterSpacing: 1,
    color: VARA_COLORS.sageGray,
    marginBottom: 12,
  },
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
  masterclassSection: {
    paddingTop: Spacing.xl,
  },
});

export default LearnLibrary;

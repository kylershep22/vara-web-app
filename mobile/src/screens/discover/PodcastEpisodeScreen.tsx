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
import { Spacing } from '../../constants';
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
    playTrack(episode.title, episode.audioUrl, false, podcastCover);
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

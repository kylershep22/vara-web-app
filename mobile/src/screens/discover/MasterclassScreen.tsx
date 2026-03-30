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
import { Colors, Spacing } from '../../constants';
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
    const userProgress = progress.find((p: any) => p.masterclassId === masterclassId);
    return userProgress?.progress || 0;
  };

  const handlePlayEpisode = (episode: PodcastEpisode) => {
    playTrack(episode.title, episode.audioUrl, false, podcastCover);
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

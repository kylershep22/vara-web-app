/**
 * Sleep Screen
 * Sleep sounds, stories, and guided meditations
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity, Text, Platform } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as Haptics from 'expo-haptics';
import Svg, { Path } from 'react-native-svg';
import { Colors, Spacing, Typography } from '../../constants';
import { useSleep } from '../../hooks';
import { useSleepFavorites } from '../../hooks/useSleepFavorites';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { LoadingSpinner } from '../../components';
import { SleepContent } from '../../services/firebase/library.service';

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
  <Svg width={10} height={11} viewBox="0 0 10 11">
    <Path d="M1 0.5V10.5L9.5 5.5L1 0.5Z" fill={Colors.evergreenTeal} />
  </Svg>
);

// Section header component
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
            <Svg width={10} height={11} viewBox="0 0 10 11">
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
        {/* Highlight Card -- Intro */}
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

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  scrollContent: {
    paddingBottom: Spacing['3xl'],
  },

  // Highlight Card (intro + nudge shared pattern)
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
    fontSize: 14,
    fontWeight: '400',
    color: Colors.softCharcoal,
    lineHeight: 14 * 1.55,
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
    width: 32,
    height: 32,
    borderRadius: 16,
    backgroundColor: 'rgba(213,227,209,0.65)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sectionTitle: {
    fontSize: 15,
    fontWeight: '600',
    color: Colors.softCharcoal,
    marginLeft: 8,
  },
  sectionCountBadge: {
    backgroundColor: Colors.dewSage,
    borderRadius: 10,
    paddingVertical: 2,
    paddingHorizontal: 8,
    marginLeft: 8,
  },
  sectionCountText: {
    fontSize: 12,
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
    paddingVertical: 12,
    paddingHorizontal: 14,
    gap: 12,
  },
  contentRowDivider: {
    borderBottomWidth: 0.5,
    borderBottomColor: 'rgba(184,205,186,0.4)',
  },

  // Play Button
  playButton: {
    width: 38,
    height: 38,
    borderRadius: 19,
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
    fontSize: 15,
    fontWeight: '600',
    color: Colors.softCharcoal,
    marginBottom: 2,
  },
  contentMeta: {
    fontSize: 12,
    fontWeight: '400',
    color: Colors.mutedSageGray,
    marginBottom: 3,
  },
  contentDescription: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.mutedSageGray,
    lineHeight: 13 * 1.5,
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
    fontSize: 13,
    fontWeight: '400',
    color: Colors.softCharcoal,
    lineHeight: 13 * 1.5,
  },

  // Tips
  tipsContent: {
    padding: 12,
  },
  tipsText: {
    fontSize: 13,
    fontWeight: '400',
    color: Colors.softCharcoal,
    lineHeight: 13 * 1.5,
  },

  // Bottom spacing
  bottomSpacing: {
    height: Spacing['3xl'],
  },
});

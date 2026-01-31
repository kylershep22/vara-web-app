/**
 * Sleep Screen
 * Sleep sounds, stories, and guided meditations
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Layout, Typography } from '../../constants';
import { useSleep } from '../../hooks';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { LoadingSpinner } from '../../components';
import { CategoryHeader } from '../../components/library/CategoryHeader';
import { SleepContent } from '../../services/firebase/library.service';

export default function SleepScreen() {
  const navigation = useNavigation();
  const { sounds, stories, meditations, loading } = useSleep();
  const { playTrack, currentTrack, isPlaying } = useAudioPlayer();

  const handlePlaySound = (sound: SleepContent) => {
    if (!sound.audioUrl) {
      // Audio not yet available
      return;
    }
    playTrack(sound.title, sound.audioUrl, true); // Loop sleep sounds
  };

  const renderContentCard = (item: SleepContent) => {
    const isCurrentlyPlaying = currentTrack?.title === item.title && isPlaying;
    const isAvailable = !!item.audioUrl;

    return (
      <TouchableOpacity
        key={item.id}
        style={[styles.contentCard, !isAvailable && styles.contentCardDisabled]}
        onPress={() => isAvailable && handlePlaySound(item)}
        activeOpacity={isAvailable ? 0.7 : 1}
        disabled={!isAvailable}
      >
        <View style={[styles.iconContainer, isCurrentlyPlaying && styles.iconContainerPlaying]}>
          <Icon
            name={isAvailable ? (isCurrentlyPlaying ? 'pause-circle' : 'play-circle') : 'clock-outline'}
            size={32}
            color={isAvailable ? (isCurrentlyPlaying ? Colors.evergreenTeal : Colors.textSecondary) : Colors.textSecondary}
          />
        </View>

        <View style={styles.contentInfo}>
          <Text variant="titleSmall" style={styles.contentTitle} numberOfLines={1}>
            {item.title}
          </Text>
          <Text variant="bodySmall" style={styles.contentMeta}>
            {item.duration} • {item.type}
          </Text>
          <Text variant="bodySmall" style={styles.contentDescription} numberOfLines={2}>
            {item.description}
          </Text>
        </View>

        {isCurrentlyPlaying && (
          <Icon name="volume-high" size={20} color={Colors.evergreenTeal} />
        )}
      </TouchableOpacity>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading sleep content..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header Description */}
        <View style={styles.descriptionSection}>
          <Text variant="bodyMedium" style={styles.description}>
            Quality sleep is your brain's cleanup crew. While you rest, your brain clears toxins, consolidates memories, and recharges for the day ahead.
          </Text>
        </View>

        {/* Sleep Sounds */}
        {sounds.length > 0 && (
          <View style={styles.section}>
            <CategoryHeader title="Sleep Sounds" icon="music-note" count={sounds.length} />
            <View style={styles.cardsList}>
              {sounds.map(renderContentCard)}
            </View>
          </View>
        )}

        {/* Sleep Stories */}
        {stories.length > 0 && (
          <View style={styles.section}>
            <CategoryHeader title="Sleep Stories" icon="book-open-variant" count={stories.length} />
            <View style={styles.cardsList}>
              {stories.map(renderContentCard)}
            </View>
          </View>
        )}

        {/* Guided Meditations */}
        {meditations.length > 0 && (
          <View style={styles.section}>
            <CategoryHeader title="Guided Meditations" icon="meditation" count={meditations.length} />
            <View style={styles.cardsList}>
              {meditations.map(renderContentCard)}
            </View>
          </View>
        )}

        {/* Coming Soon Message if categories are empty */}
        {stories.length === 0 && meditations.length === 0 && (
          <View style={styles.comingSoonSection}>
            <Icon name="sleep" size={48} color={Colors.textSecondary} />
            <Text variant="titleMedium" style={styles.comingSoonTitle}>
              More Content Coming Soon
            </Text>
            <Text variant="bodyMedium" style={styles.comingSoonText}>
              We're working on adding sleep stories and guided meditations. Check back soon!
            </Text>
          </View>
        )}

        {/* Sleep Tips */}
        <View style={styles.tipsSection}>
          <CategoryHeader title="Brain-Healthy Sleep Tips" icon="lightbulb-on-outline" />
          <View style={styles.tipsCard}>
            <Text variant="bodyMedium" style={styles.tipsText}>
              💤 Use headphones or speakers at a comfortable volume{'\n\n'}
              🧠 Aim for 7-9 hours — your brain needs this time to clean up and consolidate memories{'\n\n'}
              🌡️ Keep your room cool (65-68°F) — brain cleanup works best when you're cool{'\n\n'}
              📱 Avoid screens 30 minutes before bed — blue light disrupts your brain's sleep signals
            </Text>
          </View>
        </View>

        {/* Bottom Spacing for FAB */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    paddingBottom: Spacing['4xl'],
  },
  descriptionSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: '#7E57C2' + '10', // Purple tint
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  description: {
    color: Colors.textPrimary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  section: {
    marginTop: Spacing.md,
  },
  cardsList: {
    paddingHorizontal: Spacing.md,
  },
  contentCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
    ...Layout.shadow.sm,
    gap: Spacing.md,
  },
  contentCardDisabled: {
    opacity: 0.6,
    backgroundColor: Colors.background,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.background,
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerPlaying: {
    backgroundColor: Colors.evergreenTeal + '20',
  },
  contentInfo: {
    flex: 1,
  },
  contentTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 2,
  },
  contentMeta: {
    color: Colors.textSecondary,
    marginBottom: 4,
  },
  contentDescription: {
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },
  comingSoonSection: {
    alignItems: 'center',
    paddingVertical: Spacing['3xl'],
    paddingHorizontal: Spacing.xl,
  },
  comingSoonTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  comingSoonText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  tipsSection: {
    marginTop: Spacing.xl,
  },
  tipsCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    marginHorizontal: Spacing.md,
    padding: Spacing.lg,
    ...Layout.shadow.sm,
  },
  tipsText: {
    color: Colors.textPrimary,
    lineHeight: Typography.lineHeight.relaxed * Typography.fontSize.base,
  },
  bottomSpacing: {
    height: Spacing['4xl'],
  },
});

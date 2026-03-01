/**
 * Sleep Detail Screen
 * Individual sleep content with audio playback
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text, Button, Switch, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants';
import { useAudioPlayer } from '../../context/AudioPlayerContext';
import { useSleep } from '../../hooks';
import { LoadingSpinner, ContentCard } from '../../components';

export default function SleepDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { contentId, category } = route.params as { contentId: string; category: 'sounds' | 'stories' | 'meditations' };

  const { sounds, stories, meditations, loading } = useSleep();
  const { currentTrack, isPlaying, playTrack, pause, resume, stop, isLooping, setLooping } = useAudioPlayer();

  // Get all content based on category
  const allContent = category === 'sounds' ? sounds : category === 'stories' ? stories : meditations;
  const content = allContent.find((item) => item.id === contentId);

  // Get related content (same category, different item)
  const relatedContent = allContent.filter((item) => item.id !== contentId).slice(0, 3);

  const isCurrentlyPlaying = currentTrack?.uri === content?.audioUrl && isPlaying;

  const handlePlayPause = async () => {
    if (!content) return;

    if (currentTrack?.uri === content.audioUrl) {
      if (isPlaying) {
        await pause();
      } else {
        await resume();
      }
    } else {
      await playTrack(content.title, content.audioUrl, true); // Default to loop for sleep content
    }
  };

  const handleStop = async () => {
    await stop();
  };

  if (loading) {
    return <LoadingSpinner message="Loading content..." />;
  }

  if (!content) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color={Colors.error} />
          <Text variant="titleLarge" style={styles.errorText}>
            Content not found
          </Text>
          <Button mode="contained" onPress={() => navigation.goBack()}>
            Go Back
          </Button>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.hero}>
          <View style={styles.iconContainer}>
            <Icon
              name={category === 'sounds' ? 'music-note' : category === 'stories' ? 'book-open-variant' : 'meditation'}
              size={80}
              color={Colors.evergreenTeal}
            />
          </View>

          <Text variant="headlineSmall" style={styles.title}>
            {content.title}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icon name="clock-outline" size={16} color={Colors.textSecondary} />
              <Text variant="bodyMedium" style={styles.metaText}>
                {content.duration}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="tag-outline" size={16} color={Colors.textSecondary} />
              <Text variant="bodyMedium" style={styles.metaText}>
                {content.type}
              </Text>
            </View>
          </View>

          <Text variant="bodyLarge" style={styles.description}>
            {content.description}
          </Text>
        </View>

        {/* Playback Controls */}
        <View style={styles.controls}>
          <View style={styles.playButtonContainer}>
            <IconButton
              icon={isCurrentlyPlaying ? 'pause-circle' : 'play-circle'}
              size={80}
              iconColor={Colors.evergreenTeal}
              onPress={handlePlayPause}
            />
          </View>

          {isPlaying && currentTrack?.uri === content.audioUrl && (
            <Button
              mode="outlined"
              onPress={handleStop}
              icon="stop"
              style={styles.stopButton}
            >
              Stop
            </Button>
          )}
        </View>

        {/* Loop Control */}
        <View style={styles.settingRow}>
          <View style={styles.settingLabel}>
            <Icon name="repeat" size={24} color={Colors.textPrimary} />
            <Text variant="bodyLarge" style={styles.settingText}>
              Loop Audio
            </Text>
          </View>
          <Switch
            value={isLooping}
            onValueChange={setLooping}
            color={Colors.evergreenTeal}
          />
        </View>

        {/* Related Content */}
        {relatedContent.length > 0 && (
          <View style={styles.relatedSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              More {category === 'sounds' ? 'Sleep Sounds' : category === 'stories' ? 'Sleep Stories' : 'Meditations'}
            </Text>

            {relatedContent.map((item) => (
              <ContentCard
                key={item.id}
                title={item.title}
                description={item.description}
                duration={item.duration}
                category={item.type}
                type="audio"
                onPress={() => {
                  navigation.push('SleepDetail' as never, {
                    contentId: item.id,
                    category
                  } as never);
                }}
              />
            ))}
          </View>
        )}

        {/* Sleep Tips */}
        <View style={styles.tipsSection}>
          <Text variant="titleMedium" style={styles.sectionTitle}>
            Sleep Tips
          </Text>
          <View style={styles.tipItem}>
            <Icon name="lightbulb-outline" size={20} color={Colors.goldenApricot} />
            <Text variant="bodyMedium" style={styles.tipText}>
              Create a dark, cool environment for optimal sleep
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="lightbulb-outline" size={20} color={Colors.goldenApricot} />
            <Text variant="bodyMedium" style={styles.tipText}>
              Avoid screens 30 minutes before bed
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="lightbulb-outline" size={20} color={Colors.goldenApricot} />
            <Text variant="bodyMedium" style={styles.tipText}>
              Use headphones or speakers at a comfortable volume
            </Text>
          </View>
        </View>
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
    paddingBottom: Spacing['4xl'],
  },
  hero: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
    alignItems: 'center',
  },
  iconContainer: {
    width: 120,
    height: 120,
    borderRadius: 60,
    backgroundColor: Colors.evergreenTeal + '15',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  title: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.base,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  metaText: {
    color: Colors.textSecondary,
  },
  description: {
    color: Colors.textPrimary,
    textAlign: 'center',
    lineHeight: 24,
  },
  controls: {
    alignItems: 'center',
    paddingVertical: Spacing.lg,
  },
  playButtonContainer: {
    marginBottom: Spacing.sm,
  },
  stopButton: {
    borderColor: Colors.error,
  },
  settingRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.base,
    marginBottom: Spacing.base,
    borderRadius: 12,
  },
  settingLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  settingText: {
    color: Colors.textPrimary,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    marginBottom: Spacing.xs,
  },
  relatedSection: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
  },
  tipsSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.goldenApricot + '10',
    marginHorizontal: Spacing.base,
    borderRadius: 12,
  },
  tipItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  tipText: {
    flex: 1,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  errorContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  errorText: {
    color: Colors.textPrimary,
    marginTop: Spacing.base,
    marginBottom: Spacing.lg,
  },
});

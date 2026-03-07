/**
 * Movement Detail Screen
 * Individual movement/workout video detail
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants';
import { useMovement } from '../../hooks';
import { LoadingSpinner, ContentCard } from '../../components';

export default function MovementDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { contentId } = route.params as { contentId: string };

  const { content, loading } = useMovement();
  const [completed, setCompleted] = useState(false);
  const [showVideo, setShowVideo] = useState(false);

  const movement = content.find((item) => item.id === contentId);

  // Get related content (same category, different item)
  const relatedContent = movement
    ? content.filter((item) => item.category === movement.category && item.id !== contentId).slice(0, 3)
    : [];

  const handleStartWorkout = () => {
    setShowVideo(true);
    // In a real implementation, this would open a full-screen video player
    // For now, we'll just navigate or show a modal with the video
  };

  if (loading) {
    return <LoadingSpinner message="Loading workout..." />;
  }

  if (!movement) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color={Colors.error} />
          <Text style={styles.errorText}>
            Workout not found
          </Text>
          <TouchableOpacity
            onPress={() => navigation.goBack()}
            style={{backgroundColor: Colors.evergreenTeal, paddingHorizontal: 24, paddingVertical: 12, borderRadius: 12}}
          >
            <Text style={{color: '#FFFFFF', fontSize: 16, fontWeight: '600'}}>Go Back</Text>
          </TouchableOpacity>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Video Thumbnail */}
        <View style={styles.thumbnailContainer}>
          {movement.thumbnail ? (
            <Image
              source={{ uri: movement.thumbnail }}
              style={styles.thumbnail}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.thumbnail, styles.placeholderThumbnail]}>
              <Icon name="play-circle" size={80} color={Colors.white} />
            </View>
          )}
          <View style={styles.playOverlay}>
            <Icon name="play-circle-outline" size={80} color={Colors.white} />
          </View>
        </View>

        {/* Content Info */}
        <View style={styles.contentInfo}>
          <Text style={styles.title}>
            {movement.title}
          </Text>

          <View style={styles.metaRow}>
            <View style={styles.metaItem}>
              <Icon name="clock-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.metaText}>
                {movement.duration}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="tag-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.metaText}>
                {movement.category}
              </Text>
            </View>
            <View style={styles.metaItem}>
              <Icon name="video-outline" size={16} color={Colors.textSecondary} />
              <Text style={styles.metaText}>
                Video
              </Text>
            </View>
          </View>

          <Text style={styles.description}>
            {movement.description}
          </Text>

          {/* Start Workout Button */}
          <TouchableOpacity
            onPress={handleStartWorkout}
            style={[styles.startButton, {flexDirection: 'row', justifyContent: 'center', alignItems: 'center', gap: 8, paddingVertical: Spacing.sm, borderRadius: 12, backgroundColor: Colors.evergreenTeal}]}
          >
            <Icon name="play" size={20} color="#FFFFFF" />
            <Text style={{color: '#FFFFFF', fontSize: 16, fontWeight: '600'}}>Start Workout</Text>
          </TouchableOpacity>

          {/* Progress Tracking */}
          <View style={styles.progressSection}>
            <View style={styles.checkboxRow}>
              <TouchableOpacity onPress={() => setCompleted(!completed)} style={{padding: 8}}>
                <Icon
                  name={completed ? 'checkbox-marked' : 'checkbox-blank-outline'}
                  size={24}
                  color={completed ? Colors.success : Colors.textSecondary}
                />
              </TouchableOpacity>
              <Text style={styles.checkboxLabel}>
                Mark as completed
              </Text>
            </View>
            {completed && (
              <View style={styles.completedBadge}>
                <Icon name="check-circle" size={20} color={Colors.success} />
                <Text style={styles.completedText}>
                  Great work! Keep up the momentum.
                </Text>
              </View>
            )}
          </View>
        </View>

        {/* What You'll Need */}
        <View style={styles.section}>
          <Text style={styles.sectionTitle}>
            What You'll Need
          </Text>
          <View style={styles.needItem}>
            <Icon name="check" size={20} color={Colors.evergreenTeal} />
            <Text style={styles.needText}>
              Comfortable workout clothes
            </Text>
          </View>
          <View style={styles.needItem}>
            <Icon name="check" size={20} color={Colors.evergreenTeal} />
            <Text style={styles.needText}>
              Yoga mat or soft surface
            </Text>
          </View>
          <View style={styles.needItem}>
            <Icon name="check" size={20} color={Colors.evergreenTeal} />
            <Text style={styles.needText}>
              Water bottle
            </Text>
          </View>
        </View>

        {/* Safety Tips */}
        <View style={styles.tipsSection}>
          <Text style={styles.sectionTitle}>
            Safety Tips
          </Text>
          <View style={styles.tipItem}>
            <Icon name="alert-circle-outline" size={20} color={Colors.sunriseAmber} />
            <Text style={styles.tipText}>
              Warm up before starting and cool down after
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="alert-circle-outline" size={20} color={Colors.sunriseAmber} />
            <Text style={styles.tipText}>
              Listen to your body and modify as needed
            </Text>
          </View>
          <View style={styles.tipItem}>
            <Icon name="alert-circle-outline" size={20} color={Colors.sunriseAmber} />
            <Text style={styles.tipText}>
              Stop if you experience pain or discomfort
            </Text>
          </View>
        </View>

        {/* Related Workouts */}
        {relatedContent.length > 0 && (
          <View style={styles.relatedSection}>
            <Text style={styles.sectionTitle}>
              More {movement.category} Workouts
            </Text>

            {relatedContent.map((item) => (
              <ContentCard
                key={item.id}
                title={item.title}
                description={item.description}
                duration={item.duration}
                category={item.category}
                thumbnail={item.thumbnail}
                type="video"
                onPress={() => {
                  navigation.push('MovementDetail' as never, {
                    contentId: item.id
                  } as never);
                }}
              />
            ))}
          </View>
        )}
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
  thumbnailContainer: {
    width: '100%',
    height: 250,
    position: 'relative',
  },
  thumbnail: {
    width: '100%',
    height: '100%',
  },
  placeholderThumbnail: {
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  playOverlay: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  contentInfo: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  title: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  metaRow: {
    flexDirection: 'row',
    gap: Spacing.base,
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
    lineHeight: 24,
    marginBottom: Spacing.lg,
  },
  startButton: {
    marginBottom: Spacing.lg,
  },
  startButtonContent: {
    paddingVertical: Spacing.sm,
  },
  progressSection: {
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.sm,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  checkboxRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  checkboxLabel: {
    color: Colors.textPrimary,
    marginLeft: Spacing.sm,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.base,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.success + '20',
    borderRadius: 8,
  },
  completedText: {
    flex: 1,
    color: Colors.success,
  },
  section: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  needItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  needText: {
    flex: 1,
    color: Colors.textPrimary,
  },
  tipsSection: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.sunriseAmber + '10',
    marginHorizontal: Spacing.base,
    borderRadius: 12,
    marginBottom: Spacing.lg,
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
  relatedSection: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.lg,
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

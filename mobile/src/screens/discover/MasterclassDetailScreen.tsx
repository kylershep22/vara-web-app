/**
 * Masterclass Detail Screen
 * Educational course detail with progress tracking
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text, Button, Chip, ProgressBar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants';
import { useMasterclasses, useMasterclassProgress } from '../../hooks';
import { LoadingSpinner } from '../../components';

export default function MasterclassDetailScreen() {
  const route = useRoute();
  const navigation = useNavigation();
  const { classId } = route.params as { classId: string };

  const { masterclasses, loading } = useMasterclasses();
  const { progress } = useMasterclassProgress();

  const masterclass = masterclasses.find((item) => item.id === classId);
  const userProgress = progress.find((p) => p.masterclassId === classId);

  const getDifficultyColor = (difficulty: string) => {
    switch (difficulty) {
      case 'beginner':
        return Colors.success;
      case 'intermediate':
        return Colors.sunriseAmber;
      case 'advanced':
        return Colors.error;
      default:
        return Colors.textSecondary;
    }
  };

  const handleStartContinue = () => {
    // In a real implementation, this would navigate to the course content
    // For now, we'll just show a placeholder
    alert('Masterclass content player coming soon!');
  };

  if (loading) {
    return <LoadingSpinner message="Loading masterclass..." />;
  }

  if (!masterclass) {
    return (
      <SafeAreaView style={styles.container}>
        <View style={styles.errorContainer}>
          <Icon name="alert-circle" size={64} color={Colors.error} />
          <Text variant="titleLarge" style={styles.errorText}>
            Masterclass not found
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
        {/* Hero Image */}
        <View style={styles.heroContainer}>
          {masterclass.thumbnail ? (
            <Image
              source={{ uri: masterclass.thumbnail }}
              style={styles.heroImage}
              resizeMode="cover"
            />
          ) : (
            <View style={[styles.heroImage, styles.placeholderHero]}>
              <Icon name="school" size={80} color={Colors.white} />
            </View>
          )}
          <View style={styles.heroOverlay} />
        </View>

        {/* Content */}
        <View style={styles.content}>
          {/* Header */}
          <View style={styles.header}>
            <Text variant="headlineMedium" style={styles.title}>
              {masterclass.title}
            </Text>

            <Text variant="bodyLarge" style={styles.instructor}>
              with {masterclass.instructor}
            </Text>

            <View style={styles.badges}>
              <Chip
                icon="clock-outline"
                style={styles.chip}
                textStyle={styles.chipText}
              >
                {masterclass.duration}
              </Chip>
              <Chip
                style={[
                  styles.chip,
                  { backgroundColor: getDifficultyColor(masterclass.difficulty) + '20' },
                ]}
                textStyle={[
                  styles.chipText,
                  { color: getDifficultyColor(masterclass.difficulty) },
                ]}
              >
                {masterclass.difficulty.charAt(0).toUpperCase() + masterclass.difficulty.slice(1)}
              </Chip>
            </View>
          </View>

          {/* Progress Bar */}
          {userProgress && userProgress.progress > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text variant="bodyMedium" style={styles.progressText}>
                  Your Progress
                </Text>
                <Text variant="bodyMedium" style={styles.progressPercentage}>
                  {Math.round(userProgress.progress * 100)}%
                </Text>
              </View>
              <ProgressBar
                progress={userProgress.progress}
                color={Colors.evergreenTeal}
                style={styles.progressBar}
              />
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              About This Masterclass
            </Text>
            <Text variant="bodyLarge" style={styles.description}>
              {masterclass.description}
            </Text>
          </View>

          {/* Topics Covered */}
          {masterclass.topics && masterclass.topics.length > 0 && (
            <View style={styles.section}>
              <Text variant="titleMedium" style={styles.sectionTitle}>
                What You'll Learn
              </Text>
              {masterclass.topics.map((topic, index) => (
                <View key={index} style={styles.topicItem}>
                  <Icon name="checkbox-marked-circle" size={20} color={Colors.evergreenTeal} />
                  <Text variant="bodyMedium" style={styles.topicText}>
                    {topic}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Start/Continue Button */}
          <View style={styles.actionSection}>
            <Button
              mode="contained"
              onPress={handleStartContinue}
              icon={userProgress && userProgress.progress > 0 ? 'play-circle' : 'play'}
              contentStyle={styles.buttonContent}
            >
              {userProgress && userProgress.progress > 0 ? 'Continue Learning' : 'Start Masterclass'}
            </Button>

            {userProgress?.completed && (
              <View style={styles.completedBadge}>
                <Icon name="check-circle" size={24} color={Colors.success} />
                <Text variant="bodyLarge" style={styles.completedText}>
                  Completed
                </Text>
              </View>
            )}
          </View>

          {/* About the Instructor */}
          <View style={styles.instructorSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              About the Instructor
            </Text>
            <View style={styles.instructorCard}>
              <View style={styles.instructorAvatar}>
                <Icon name="account" size={32} color={Colors.evergreenTeal} />
              </View>
              <View style={styles.instructorInfo}>
                <Text variant="bodyLarge" style={styles.instructorName}>
                  {masterclass.instructor}
                </Text>
                <Text variant="bodyMedium" style={styles.instructorBio}>
                  Expert wellness educator and practitioner
                </Text>
              </View>
            </View>
          </View>

          {/* Requirements */}
          <View style={styles.requirementsSection}>
            <Text variant="titleMedium" style={styles.sectionTitle}>
              What You'll Need
            </Text>
            <View style={styles.requirementItem}>
              <Icon name="notebook-outline" size={20} color={Colors.textSecondary} />
              <Text variant="bodyMedium" style={styles.requirementText}>
                Notebook for taking notes (optional)
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Icon name="clock-outline" size={20} color={Colors.textSecondary} />
              <Text variant="bodyMedium" style={styles.requirementText}>
                Dedicated time to focus and learn
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Icon name="lightbulb-outline" size={20} color={Colors.textSecondary} />
              <Text variant="bodyMedium" style={styles.requirementText}>
                Open mind and curiosity
              </Text>
            </View>
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
  heroContainer: {
    width: '100%',
    height: 250,
    position: 'relative',
  },
  heroImage: {
    width: '100%',
    height: '100%',
  },
  placeholderHero: {
    backgroundColor: Colors.goldenApricot,
    justifyContent: 'center',
    alignItems: 'center',
  },
  heroOverlay: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    height: 80,
    backgroundColor: 'linear-gradient(to top, rgba(0,0,0,0.6), transparent)',
  },
  content: {
    paddingHorizontal: Spacing.lg,
  },
  header: {
    paddingVertical: Spacing.lg,
  },
  title: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  instructor: {
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  badges: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  chip: {
    backgroundColor: Colors.surface,
  },
  chipText: {
    fontSize: 12,
  },
  progressSection: {
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.evergreenTeal + '10',
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
  progressHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  progressText: {
    color: Colors.textPrimary,
  },
  progressPercentage: {
    color: Colors.evergreenTeal,
    fontWeight: '700',
  },
  progressBar: {
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderLight,
  },
  section: {
    marginBottom: Spacing.lg,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  description: {
    color: Colors.textPrimary,
    lineHeight: 24,
  },
  topicItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  topicText: {
    flex: 1,
    color: Colors.textPrimary,
    lineHeight: 20,
  },
  actionSection: {
    marginBottom: Spacing.xl,
  },
  buttonContent: {
    paddingVertical: Spacing.sm,
  },
  completedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.base,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.success + '20',
    borderRadius: 12,
  },
  completedText: {
    color: Colors.success,
    fontWeight: '700',
  },
  instructorSection: {
    marginBottom: Spacing.lg,
  },
  instructorCard: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
    padding: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  instructorAvatar: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.evergreenTeal + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  instructorInfo: {
    flex: 1,
  },
  instructorName: {
    color: Colors.textPrimary,
    fontWeight: '600',
    marginBottom: Spacing.xs,
  },
  instructorBio: {
    color: Colors.textSecondary,
  },
  requirementsSection: {
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.surface,
    borderRadius: 12,
    marginBottom: Spacing.lg,
  },
  requirementItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  requirementText: {
    flex: 1,
    color: Colors.textPrimary,
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

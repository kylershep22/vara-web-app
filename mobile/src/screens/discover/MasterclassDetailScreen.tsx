/**
 * Masterclass Detail Screen
 * Educational course detail with progress tracking
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, Image, TouchableOpacity, Text } from 'react-native';
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
          <Text style={styles.errorText}>
            Masterclass not found
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
            <Text style={styles.title}>
              {masterclass.title}
            </Text>

            <Text style={styles.instructor}>
              with {masterclass.instructor}
            </Text>

            <View style={styles.badges}>
              <View style={[styles.chip, {flexDirection: 'row', alignItems: 'center', gap: 4, paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9999}]}>
                <Icon name="clock-outline" size={16} color={Colors.textSecondary} />
                <Text style={styles.chipText}>{masterclass.duration}</Text>
              </View>
              <View style={[styles.chip, {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 8, borderRadius: 9999, backgroundColor: getDifficultyColor(masterclass.difficulty) + '20'}]}>
                <Text style={[styles.chipText, {color: getDifficultyColor(masterclass.difficulty)}]}>
                  {masterclass.difficulty.charAt(0).toUpperCase() + masterclass.difficulty.slice(1)}
                </Text>
              </View>
            </View>
          </View>

          {/* Progress Bar */}
          {userProgress && userProgress.progress > 0 && (
            <View style={styles.progressSection}>
              <View style={styles.progressHeader}>
                <Text style={styles.progressText}>
                  Your Progress
                </Text>
                <Text style={styles.progressPercentage}>
                  {Math.round(userProgress.progress * 100)}%
                </Text>
              </View>
              <View style={[styles.progressBar, {height: 8, borderRadius: 9999, backgroundColor: Colors.borderLight, overflow: 'hidden'}]}>
                <View style={{height: 8, borderRadius: 9999, backgroundColor: Colors.evergreenTeal, width: `${userProgress.progress * 100}%`}} />
              </View>
            </View>
          )}

          {/* Description */}
          <View style={styles.section}>
            <Text style={styles.sectionTitle}>
              About This Masterclass
            </Text>
            <Text style={styles.description}>
              {masterclass.description}
            </Text>
          </View>

          {/* Topics Covered */}
          {masterclass.topics && masterclass.topics.length > 0 && (
            <View style={styles.section}>
              <Text style={styles.sectionTitle}>
                What You'll Learn
              </Text>
              {masterclass.topics.map((topic, index) => (
                <View key={index} style={styles.topicItem}>
                  <Icon name="checkbox-marked-circle" size={20} color={Colors.evergreenTeal} />
                  <Text style={styles.topicText}>
                    {topic}
                  </Text>
                </View>
              ))}
            </View>
          )}

          {/* Start/Continue Button */}
          <View style={styles.actionSection}>
            <TouchableOpacity
              onPress={handleStartContinue}
              style={{backgroundColor: Colors.evergreenTeal, paddingVertical: Spacing.sm, alignItems: 'center', borderRadius: 12, flexDirection: 'row', justifyContent: 'center', gap: 8}}
            >
              <Icon name={userProgress && userProgress.progress > 0 ? 'play-circle' : 'play'} size={20} color="#FFFFFF" />
              <Text style={{color: '#FFFFFF', fontSize: 16, fontWeight: '600'}}>
                {userProgress && userProgress.progress > 0 ? 'Continue Learning' : 'Start Masterclass'}
              </Text>
            </TouchableOpacity>

            {userProgress?.completed && (
              <View style={styles.completedBadge}>
                <Icon name="check-circle" size={24} color={Colors.success} />
                <Text style={styles.completedText}>
                  Completed
                </Text>
              </View>
            )}
          </View>

          {/* About the Instructor */}
          <View style={styles.instructorSection}>
            <Text style={styles.sectionTitle}>
              About the Instructor
            </Text>
            <View style={styles.instructorCard}>
              <View style={styles.instructorAvatar}>
                <Icon name="account" size={32} color={Colors.evergreenTeal} />
              </View>
              <View style={styles.instructorInfo}>
                <Text style={styles.instructorName}>
                  {masterclass.instructor}
                </Text>
                <Text style={styles.instructorBio}>
                  Expert wellness educator and practitioner
                </Text>
              </View>
            </View>
          </View>

          {/* Requirements */}
          <View style={styles.requirementsSection}>
            <Text style={styles.sectionTitle}>
              What You'll Need
            </Text>
            <View style={styles.requirementItem}>
              <Icon name="notebook-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.requirementText}>
                Notebook for taking notes (optional)
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Icon name="clock-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.requirementText}>
                Dedicated time to focus and learn
              </Text>
            </View>
            <View style={styles.requirementItem}>
              <Icon name="lightbulb-outline" size={20} color={Colors.textSecondary} />
              <Text style={styles.requirementText}>
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

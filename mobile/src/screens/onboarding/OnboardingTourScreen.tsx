/**
 * Onboarding Tour Screen
 * Quick feature tour to familiarize users with the app
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, Dimensions } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Button } from '../../components';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { doc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

const { width } = Dimensions.get('window');

interface OnboardingTourScreenProps {
  navigation: any;
  route: any;
}

interface TourSlide {
  id: string;
  title: string;
  description: string;
  icon: string;
  color: string;
}

const TOUR_SLIDES: TourSlide[] = [
  {
    id: 'brain-health',
    title: 'Brain Health Dashboard',
    description: 'Check your daily brain readiness score, track neuroplasticity signals, and use 1-tap nervous system regulation tools.',
    icon: 'brain',
    color: Colors.evergreenTeal,
  },
  {
    id: 'home',
    title: 'Your Daily Hub',
    description: 'Track goals, build habit streaks, manage tasks, and see your AI-generated daily wellness plan.',
    icon: 'view-dashboard',
    color: Colors.sunriseAmber,
  },
  {
    id: 'focus',
    title: 'Deep Work Sessions',
    description: 'Use the 90-minute ultradian protocol or Pomodoro timer for peak cognitive performance.',
    icon: 'timer-outline',
    color: Colors.lavenderMist,
  },
  {
    id: 'community',
    title: 'Connect & Support',
    description: 'Join groups, share your journey, and build meaningful connections with others.',
    icon: 'account-group',
    color: Colors.secondary,
  },
  {
    id: 'discover',
    title: 'Wellness Library',
    description: 'Explore breathwork for stress relief, sleep content for brain cleanup, and movement for energy.',
    icon: 'compass',
    color: Colors.success,
  },
];

const OnboardingTourScreen: React.FC<OnboardingTourScreenProps> = ({ navigation, route }) => {
  const { user } = useAuth();
  const { createdType, createdTitle, skipped } = route.params || {};

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSuccessBanner, setShowSuccessBanner] = useState(!skipped && !!createdType);
  const flatListRef = useRef<FlatList>(null);

  // Auto-dismiss success banner after 5 seconds
  useEffect(() => {
    if (showSuccessBanner) {
      const timer = setTimeout(() => {
        setShowSuccessBanner(false);
      }, 5000); // 5 seconds

      return () => clearTimeout(timer);
    }
  }, [showSuccessBanner]);

  const handleNext = () => {
    if (currentIndex < TOUR_SLIDES.length - 1) {
      const nextIndex = currentIndex + 1;
      flatListRef.current?.scrollToIndex({ index: nextIndex, animated: true });
      setCurrentIndex(nextIndex);
    } else {
      handleFinish();
    }
  };

  const handleSkip = () => {
    handleFinish();
  };

  const handleFinish = async () => {
    // Mark onboarding as completed in Firestore
    if (user) {
      try {
        const userRef = doc(db, 'users', user.uid);
        await updateDoc(userRef, {
          hasCompletedOnboarding: true,
          onboardingCompletedAt: new Date(),
        });
        console.log('✅ Onboarding completed, user document updated');

        // The AppNavigator will automatically detect the change and navigate to MainNavigator
        // No manual navigation needed - the navigation state update happens via the
        // useEffect in AppNavigator that watches user.emailVerified and hasCompletedOnboarding
      } catch (error) {
        console.error('Error updating onboarding status:', error);
      }
    }
  };

  const renderSlide = ({ item }: { item: TourSlide }) => (
    <View style={styles.slide}>
      <View style={[styles.iconContainer, { backgroundColor: item.color + '20' }]}>
        <Icon name={item.icon} size={80} color={item.color} />
      </View>

      <Text variant="headlineMedium" style={styles.slideTitle}>
        {item.title}
      </Text>

      <Text variant="bodyLarge" style={styles.slideDescription}>
        {item.description}
      </Text>
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
      </View>

      {/* Success Message if user created something - only show on first slide and auto-dismiss after 5s */}
      {showSuccessBanner && currentIndex === 0 && (
        <View style={styles.successBanner}>
          <Icon name="check-circle" size={20} color={Colors.success} />
          <Text variant="bodyMedium" style={styles.successText}>
            Great! Your first {createdType} "{createdTitle}" has been created 🎉
          </Text>
        </View>
      )}

      {/* Tour Slides */}
      <FlatList
        ref={flatListRef}
        data={TOUR_SLIDES}
        renderItem={renderSlide}
        keyExtractor={(item) => item.id}
        horizontal
        pagingEnabled
        showsHorizontalScrollIndicator={false}
        onMomentumScrollEnd={(event) => {
          const index = Math.round(event.nativeEvent.contentOffset.x / width);
          setCurrentIndex(index);
        }}
        getItemLayout={(data, index) => ({
          length: width,
          offset: width * index,
          index,
        })}
      />

      {/* Pagination Dots */}
      <View style={styles.pagination}>
        {TOUR_SLIDES.map((_, index) => (
          <View
            key={index}
            style={[
              styles.paginationDot,
              index === currentIndex && styles.paginationDotActive,
            ]}
          />
        ))}
      </View>

      {/* Action Buttons */}
      <View style={styles.actions}>
        <Button
          variant="primary"
          onPress={handleNext}
          fullWidth
          style={styles.nextButton}
        >
          {currentIndex === TOUR_SLIDES.length - 1 ? 'Start My Journey' : 'Next'}
        </Button>

        {currentIndex < TOUR_SLIDES.length - 1 && (
          <Button
            variant="text"
            onPress={handleSkip}
            fullWidth
          >
            Skip Tour
          </Button>
        )}
      </View>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  progressContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginTop: Spacing.md,
    marginBottom: Spacing.lg,
  },
  progressDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderLight,
  },
  progressDotActive: {
    backgroundColor: Colors.evergreenTeal,
    width: 24,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '20',
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    marginHorizontal: Spacing.lg,
    marginBottom: Spacing.lg,
    gap: Spacing.sm,
  },
  successText: {
    flex: 1,
    color: Colors.textPrimary,
  },
  slide: {
    width,
    paddingHorizontal: Spacing.xl,
    alignItems: 'center',
    justifyContent: 'center',
  },
  iconContainer: {
    width: 160,
    height: 160,
    borderRadius: 80,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  slideTitle: {
    color: Colors.evergreenTeal,
    textAlign: 'center',
    marginBottom: Spacing.md,
    fontWeight: Typography.fontWeight.bold,
  },
  slideDescription: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.fontSize.base * 1.6,
    paddingHorizontal: Spacing.md,
  },
  pagination: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    gap: Spacing.sm,
    marginVertical: Spacing.lg,
  },
  paginationDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.borderLight,
  },
  paginationDotActive: {
    backgroundColor: Colors.evergreenTeal,
    width: 24,
  },
  actions: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.lg,
  },
  nextButton: {
    marginBottom: Spacing.sm,
  },
});

export default OnboardingTourScreen;

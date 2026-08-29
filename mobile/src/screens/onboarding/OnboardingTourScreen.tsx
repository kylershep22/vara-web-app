/**
 * Onboarding Tour Screen
 * Quick feature tour to familiarize users with the app
 * Now includes mandatory "First Action" step before completing onboarding
 */

import React, { useState, useRef, useEffect } from 'react';
import { View, StyleSheet, FlatList, Dimensions, ScrollView, Text } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Button } from '../../components';
import { QuietFinish } from '../../components/celebrations';
import { FirstActionCard } from '../../components/onboarding/FirstActionCard';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { doc, writeBatch, type Timestamp } from 'firebase/firestore';
import { stageUserPrivate } from '../../services/firebase/userPrivate.service';
import { db } from '../../config/firebase';
import { FocusArea } from './OnboardingFocusScreen';

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
    description: 'Track goals, build healthy habits, manage tasks, and see your AI-generated daily wellness plan.',
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
  const { createdType, createdTitle, skipped, selectedFocus = [] } = route.params || {};

  const [currentIndex, setCurrentIndex] = useState(0);
  const [showSuccessBanner, setShowSuccessBanner] = useState(!skipped && !!createdType);
  const [showFirstAction, setShowFirstAction] = useState(false);
  const [showConfetti, setShowConfetti] = useState(false);
  const [completedAction, setCompletedAction] = useState<{ type: string; data?: any } | null>(null);
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
      // After tour slides, show the First Action step
      setShowFirstAction(true);
    }
  };

  const handleSkip = () => {
    // Skip tour but still show first action (it's mandatory for the Day One Win)
    setShowFirstAction(true);
  };

  const handleFirstActionComplete = (actionType: string, actionData?: any) => {
    // Store what action was completed for the success message
    setCompletedAction({ type: actionType, data: actionData });
    // Show confetti celebration
    setShowConfetti(true);
  };

  const handleConfettiComplete = () => {
    setShowConfetti(false);
    // Now finish the onboarding
    handleFinish();
  };

  const handleFinish = async () => {
    // Mark onboarding as completed in Firestore
    if (user && db) {
      try {
        const batch = writeBatch(db);
        // MIGRATION_FALLBACK — gate-field dual-write. hasCompletedOnboarding
        // and onboardingCompletedAt stay mirrored on users/{uid} until slice 4
        // so a client still reading there does not re-run onboarding.
        // firstAction is not a gate field and goes private only.
        batch.update(doc(db, 'users', user.uid), {
          hasCompletedOnboarding: true,
          onboardingCompletedAt: new Date(),
        });
        await stageUserPrivate(batch, user.uid, {
          hasCompletedOnboarding: true,
          onboardingCompletedAt: new Date() as unknown as Timestamp,
          firstAction: completedAction ? {
            type: completedAction.type,
            data: completedAction.data,
            completedAt: new Date(),
          } : null,
        });
        await batch.commit();
        console.log('✅ Onboarding completed with first action, user document updated');

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

      <Text style={styles.slideTitle}>
        {item.title}
      </Text>

      <Text style={styles.slideDescription}>
        {item.description}
      </Text>
    </View>
  );

  // Render the First Action step after tour
  if (showFirstAction) {
    return (
      <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
        {/* Progress Indicator - all steps complete, on final action */}
        <View style={styles.progressContainer}>
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotActive]} />
          <View style={[styles.progressDot, styles.progressDotFinal]} />
        </View>

        <ScrollView
          contentContainerStyle={styles.firstActionScrollContent}
          keyboardShouldPersistTaps="handled"
        >
          <FirstActionCard
            selectedFocus={selectedFocus as FocusArea[]}
            onComplete={handleFirstActionComplete}
          />
        </ScrollView>

        {/* Quiet acknowledgment */}
        <QuietFinish
          visible={showConfetti}
          onDismiss={handleConfettiComplete}
        />
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      {/* Progress Indicator */}
      <View style={styles.progressContainer}>
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={[styles.progressDot, styles.progressDotActive]} />
        <View style={styles.progressDot} />
      </View>

      {/* Success Message if user created something - only show on first slide and auto-dismiss after 5s */}
      {showSuccessBanner && currentIndex === 0 && (
        <View style={styles.successBanner}>
          <Icon name="check-circle" size={20} color={Colors.success} />
          <Text style={styles.successText}>
            Great! Your first {createdType} "{createdTitle}" has been created
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
          {currentIndex === TOUR_SLIDES.length - 1 ? 'Before you go' : 'Continue'}
        </Button>

        {currentIndex < TOUR_SLIDES.length - 1 && (
          <Button
            variant="text"
            onPress={handleSkip}
            fullWidth
          >
            Skip for now
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
    marginTop: Spacing.base,
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
  progressDotFinal: {
    backgroundColor: Colors.sunriseAmber,
    width: 24,
  },
  successBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.success + '20',
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
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
    marginBottom: Spacing.base,
    fontWeight: Typography.fontWeight.bold,
  },
  slideDescription: {
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.fontSize.base * 1.6,
    paddingHorizontal: Spacing.base,
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
  firstActionScrollContent: {
    flexGrow: 1,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.xl,
  },
});

export default OnboardingTourScreen;

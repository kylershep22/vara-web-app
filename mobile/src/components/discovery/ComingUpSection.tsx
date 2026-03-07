/**
 * ComingUpSection Component
 * Home screen section displaying upcoming and newly available features
 *
 * Renders:
 * - Newly available feature cards (with glow animation)
 * - "Coming up as you explore" section header
 * - Soft-reveal cards for upcoming features
 *
 * Hides completely when no upcoming features remain.
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, Text } from 'react-native';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography } from '../../constants';
import { DiscoverableFeatureId } from '../../types/featureDiscovery';
import { FEATURE_PREVIEW_CONTENT } from '../../constants/featureDiscovery';
import SoftRevealCard from './SoftRevealCard';
import NewlyAvailableCard from './NewlyAvailableCard';
import FeaturePreviewBottomSheet from './FeaturePreviewBottomSheet';
import { useFeatureDiscovery } from '../../hooks';

interface ComingUpSectionProps {
  /** Maximum number of upcoming features to show */
  maxUpcomingFeatures?: number;
  /** Callback when a feature is opened (for tracking) */
  onFeatureOpened?: (featureId: DiscoverableFeatureId) => void;
}

const ComingUpSection: React.FC<ComingUpSectionProps> = ({
  maxUpcomingFeatures = 3,
  onFeatureOpened,
}) => {
  const navigation = useNavigation<any>();
  const {
    upcomingFeatures,
    availableFeatures,
    markFeatureOpened,
    isAccessible,
  } = useFeatureDiscovery();

  const [previewFeature, setPreviewFeature] = useState<DiscoverableFeatureId | null>(null);
  const [previewVisible, setPreviewVisible] = useState(false);

  // Handle tap on soft-reveal (upcoming) card
  const handleUpcomingPress = useCallback((featureId: DiscoverableFeatureId) => {
    setPreviewFeature(featureId);
    setPreviewVisible(true);
  }, []);

  // Handle tap on newly available card
  const handleAvailablePress = useCallback(
    async (featureId: DiscoverableFeatureId) => {
      // Mark as opened (transitions available → active)
      await markFeatureOpened(featureId);

      // Track the open
      onFeatureOpened?.(featureId);

      // Navigate to the feature
      const content = FEATURE_PREVIEW_CONTENT[featureId];
      if (content?.navigationTarget) {
        navigation.navigate(content.navigationTarget);
      }
    },
    [markFeatureOpened, onFeatureOpened, navigation]
  );

  // Handle closing the preview bottom sheet
  const handlePreviewDismiss = useCallback(() => {
    setPreviewVisible(false);
    setPreviewFeature(null);
  }, []);

  // Handle navigating from the preview bottom sheet
  const handlePreviewNavigate = useCallback(async () => {
    if (!previewFeature) return;

    // If the feature is available, mark it as opened
    if (isAccessible(previewFeature)) {
      await markFeatureOpened(previewFeature);
      onFeatureOpened?.(previewFeature);
    }

    // Navigate
    const content = FEATURE_PREVIEW_CONTENT[previewFeature];
    if (content?.navigationTarget) {
      navigation.navigate(content.navigationTarget);
    }
  }, [previewFeature, isAccessible, markFeatureOpened, onFeatureOpened, navigation]);

  // Filter to only features that are truly available (not yet active)
  const newlyAvailable = availableFeatures.filter((id) => {
    // Only show features that haven't been opened yet
    return true; // The hook already filters for 'available' status
  });

  // Limit upcoming features
  const displayedUpcoming = upcomingFeatures.slice(0, maxUpcomingFeatures);

  // If no features to show, render nothing
  if (newlyAvailable.length === 0 && displayedUpcoming.length === 0) {
    return null;
  }

  return (
    <View style={styles.container}>
      {/* Newly Available Features */}
      {newlyAvailable.length > 0 && (
        <View
          style={styles.newlyAvailableSection}
          accessibilityLabel={`${newlyAvailable.length} new feature${newlyAvailable.length > 1 ? 's' : ''} available`}
          accessibilityRole="none"
        >
          {newlyAvailable.map((featureId, index) => (
            <View key={featureId} style={styles.cardWrapper}>
              <NewlyAvailableCard
                featureId={featureId}
                onPress={() => handleAvailablePress(featureId)}
                showGlow={index === 0} // Only first one gets glow
              />
            </View>
          ))}
        </View>
      )}

      {/* Coming Up Section */}
      {displayedUpcoming.length > 0 && (
        <View style={styles.comingUpSection} accessibilityRole="none">
          {/* Section Header */}
          <Text
            style={styles.sectionHeader}
            accessibilityRole="header"
            accessibilityLabel={`Coming up as you explore. ${displayedUpcoming.length} feature${displayedUpcoming.length > 1 ? 's' : ''} to discover.`}
          >
            Coming up as you explore
          </Text>

          {/* Upcoming Feature Cards */}
          {displayedUpcoming.map((featureId) => (
            <View key={featureId} style={styles.cardWrapper}>
              <SoftRevealCard
                featureId={featureId}
                onPress={() => handleUpcomingPress(featureId)}
              />
            </View>
          ))}
        </View>
      )}

      {/* Feature Preview Bottom Sheet */}
      <FeaturePreviewBottomSheet
        visible={previewVisible}
        featureId={previewFeature}
        isAvailable={previewFeature ? isAccessible(previewFeature) : false}
        onDismiss={handlePreviewDismiss}
        onNavigate={handlePreviewNavigate}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    marginTop: Spacing.lg,
  },
  newlyAvailableSection: {
    marginBottom: Spacing.md,
  },
  comingUpSection: {
    marginTop: Spacing.sm,
  },
  sectionHeader: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    letterSpacing: 0.24,
    marginBottom: 10,
  },
  cardWrapper: {
    marginBottom: 10,
  },
});

export default ComingUpSection;

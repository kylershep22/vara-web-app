/**
 * SoftRevealCard Component
 * Displays upcoming (not yet unlocked) features in a soft-reveal style
 *
 * Design:
 * - Dashed border, muted colors
 * - No lock icon - the styling communicates "not yet active"
 * - Tappable - opens preview bottom sheet
 * - "Preview" label on right side
 */

import React, { useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Text,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { DiscoverableFeatureId, FeatureCardContent } from '../../types/featureDiscovery';
import { FEATURE_CARD_CONTENT } from '../../constants/featureDiscovery';
import { useReducedMotion } from '../../hooks';

interface SoftRevealCardProps {
  featureId: DiscoverableFeatureId;
  onPress: () => void;
}

const ICON_CONTAINER_SIZE = 36;
const ICON_SIZE = 20;

const SoftRevealCard: React.FC<SoftRevealCardProps> = ({
  featureId,
  onPress,
}) => {
  const reduceMotion = useReducedMotion();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const content: FeatureCardContent = FEATURE_CARD_CONTENT[featureId];

  const handlePressIn = useCallback(() => {
    if (reduceMotion) return;
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [reduceMotion, scaleAnim]);

  const handlePressOut = useCallback(() => {
    if (reduceMotion) return;
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 150,
      useNativeDriver: true,
    }).start();
  }, [reduceMotion, scaleAnim]);

  const handlePress = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  }, [onPress]);

  return (
    <Animated.View style={{ transform: [{ scale: scaleAnim }] }}>
      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={`${content.name}. Preview available. Double tap to learn more.`}
      >
        {/* Left: Icon + Text */}
        <View style={styles.leftContent}>
          <View style={styles.iconContainer}>
            <Icon
              name={content.icon as any}
              size={ICON_SIZE}
              color={Colors.silverSage}
            />
          </View>
          <View style={styles.textContent}>
            <Text style={styles.featureName}>{content.name}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {content.subtitleUpcoming}
            </Text>
          </View>
        </View>

        {/* Right: Preview Label */}
        <View style={styles.previewLabel}>
          <Text style={styles.previewText}>Preview</Text>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderStyle: 'dashed',
    borderColor: `${Colors.silverSage}E6`, // 90% opacity
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
  },
  leftContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  iconContainer: {
    width: ICON_CONTAINER_SIZE,
    height: ICON_CONTAINER_SIZE,
    borderRadius: 10,
    backgroundColor: `${Colors.silverSage}33`, // 20% opacity
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    marginLeft: 12,
    flex: 1,
  },
  featureName: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
  subtitle: {
    fontSize: 12,
    color: `${Colors.textSecondary}E6`, // 90% opacity
    marginTop: 2,
  },
  previewLabel: {
    backgroundColor: `${Colors.dewSage}80`, // 50% opacity
    paddingVertical: 4,
    paddingHorizontal: 10,
    borderRadius: 6,
    marginLeft: Spacing.sm,
  },
  previewText: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.silverSage,
  },
});

export default SoftRevealCard;

/**
 * NewlyAvailableCard Component
 * Displays features that just transitioned from upcoming to available
 *
 * Design:
 * - Active styling with solid border and shadow
 * - One-time glow animation on first render
 * - "Explore" label with chevron on right
 * - Navigates to feature on tap
 */

import React, { useRef, useCallback, useEffect } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { DiscoverableFeatureId, FeatureCardContent } from '../../types/featureDiscovery';
import { FEATURE_CARD_CONTENT } from '../../constants/featureDiscovery';
import { useReducedMotion } from '../../hooks';

interface NewlyAvailableCardProps {
  featureId: DiscoverableFeatureId;
  onPress: () => void;
  showGlow?: boolean;
}

const ICON_CONTAINER_SIZE = 36;
const ICON_SIZE = 20;

const NewlyAvailableCard: React.FC<NewlyAvailableCardProps> = ({
  featureId,
  onPress,
  showGlow = false,
}) => {
  const reduceMotion = useReducedMotion();
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const glowAnim = useRef(new Animated.Value(0)).current;
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(12)).current;
  const content: FeatureCardContent = FEATURE_CARD_CONTENT[featureId];

  // Entry animation
  useEffect(() => {
    if (reduceMotion) {
      fadeAnim.setValue(1);
      translateAnim.setValue(0);
      return;
    }

    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.timing(translateAnim, {
        toValue: 0,
        duration: 400,
        useNativeDriver: true,
      }),
    ]).start();
  }, [reduceMotion, fadeAnim, translateAnim]);

  // Glow animation (one-time)
  useEffect(() => {
    if (!showGlow || reduceMotion) return;

    Animated.sequence([
      Animated.timing(glowAnim, {
        toValue: 1,
        duration: 1000,
        useNativeDriver: false,
      }),
      Animated.timing(glowAnim, {
        toValue: 0,
        duration: 1000,
        useNativeDriver: false,
      }),
    ]).start();
  }, [showGlow, reduceMotion, glowAnim]);

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

  // Interpolate glow shadow
  const glowShadowRadius = glowAnim.interpolate({
    inputRange: [0, 1],
    outputRange: [3, 12],
  });

  const glowShadowOpacity = glowAnim.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [0.04, 0.12, 0.08],
  });

  return (
    <Animated.View
      style={[
        styles.animatedContainer,
        {
          opacity: fadeAnim,
          transform: [
            { translateY: translateAnim },
            { scale: scaleAnim },
          ],
        },
      ]}
    >
      {/* Glow layer (animated shadow) */}
      {showGlow && !reduceMotion && (
        <Animated.View
          style={[
            styles.glowLayer,
            {
              shadowRadius: glowShadowRadius,
              shadowOpacity: glowShadowOpacity,
            },
          ]}
        />
      )}

      <TouchableOpacity
        style={styles.container}
        onPress={handlePress}
        onPressIn={handlePressIn}
        onPressOut={handlePressOut}
        activeOpacity={1}
        accessibilityRole="button"
        accessibilityLabel={`${content.name}. ${content.subtitleAvailable}. Double tap to open.`}
      >
        {/* Left: Icon + Text */}
        <View style={styles.leftContent}>
          <View style={styles.iconContainer}>
            <Icon
              name={content.icon as any}
              size={ICON_SIZE}
              color={Colors.evergreenTeal}
            />
          </View>
          <View style={styles.textContent}>
            <Text style={styles.featureName}>{content.name}</Text>
            <Text style={styles.subtitle} numberOfLines={1}>
              {content.subtitleAvailable}
            </Text>
          </View>
        </View>

        {/* Right: Explore Label + Chevron */}
        <View style={styles.exploreLabel}>
          <Text style={styles.exploreText}>Explore</Text>
          <Icon
            name="chevron-right"
            size={14}
            color={Colors.evergreenTeal}
          />
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  animatedContainer: {
    position: 'relative',
  },
  glowLayer: {
    ...StyleSheet.absoluteFillObject,
    backgroundColor: Colors.white,
    borderRadius: 12,
    shadowColor: Colors.evergreenTeal,
    shadowOffset: { width: 0, height: 0 },
    elevation: 4,
  },
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.white,
    borderWidth: 1,
    borderColor: Colors.dewSage,
    borderRadius: 12,
    paddingVertical: 14,
    paddingHorizontal: 16,
    // Shadow
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 3,
    elevation: 2,
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
    backgroundColor: `${Colors.dewSage}CC`, // 80% opacity
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
    color: Colors.softCharcoal,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  exploreLabel: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
    marginLeft: Spacing.sm,
  },
  exploreText: {
    fontSize: 11,
    fontWeight: '500',
    color: Colors.evergreenTeal,
  },
});

export default NewlyAvailableCard;

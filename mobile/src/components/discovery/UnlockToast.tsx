/**
 * UnlockToast Component
 * Toast notification shown when a feature transitions to available
 *
 * Design:
 * - White background with teal left accent
 * - Feature icon + title + subtitle
 * - Slides in from top, auto-dismisses after 3.5s
 * - Tapping also dismisses
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Dimensions,
  Text,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography } from '../../constants';
import { DiscoverableFeatureId, UnlockToastContent } from '../../types/featureDiscovery';
import { UNLOCK_TOAST_CONTENT } from '../../constants/featureDiscovery';
import { useReducedMotion } from '../../hooks';

interface UnlockToastProps {
  featureId: DiscoverableFeatureId;
  visible: boolean;
  onDismiss: () => void;
  autoDismissDelay?: number;
}

const ICON_CONTAINER_SIZE = 36;
const ICON_SIZE = 20;
const TOAST_DURATION = 3500;
const FADE_DURATION = 300;

const UnlockToast: React.FC<UnlockToastProps> = ({
  featureId,
  visible,
  onDismiss,
  autoDismissDelay = TOAST_DURATION,
}) => {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(-16)).current;
  const content: UnlockToastContent = UNLOCK_TOAST_CONTENT[featureId];
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  // Show/hide animation
  useEffect(() => {
    if (visible) {
      // Clear any existing timer
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }

      // Animate in
      if (reduceMotion) {
        fadeAnim.setValue(1);
        translateAnim.setValue(0);
      } else {
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
      }

      // Set auto-dismiss timer
      dismissTimerRef.current = setTimeout(() => {
        handleDismiss();
      }, autoDismissDelay);
    } else {
      // Animate out
      if (reduceMotion) {
        fadeAnim.setValue(0);
        translateAnim.setValue(-16);
      } else {
        Animated.parallel([
          Animated.timing(fadeAnim, {
            toValue: 0,
            duration: FADE_DURATION,
            useNativeDriver: true,
          }),
          Animated.timing(translateAnim, {
            toValue: -16,
            duration: FADE_DURATION,
            useNativeDriver: true,
          }),
        ]).start();
      }
    }

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [visible, reduceMotion, fadeAnim, translateAnim, autoDismissDelay]);

  const handleDismiss = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }

    // Animate out then call onDismiss
    if (reduceMotion) {
      onDismiss();
    } else {
      Animated.parallel([
        Animated.timing(fadeAnim, {
          toValue: 0,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }),
        Animated.timing(translateAnim, {
          toValue: -16,
          duration: FADE_DURATION,
          useNativeDriver: true,
        }),
      ]).start(() => {
        onDismiss();
      });
    }
  }, [reduceMotion, fadeAnim, translateAnim, onDismiss]);

  // Don't render if not visible (the animation handles fade out)
  if (!visible) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        {
          top: insets.top + 16,
          opacity: fadeAnim,
          transform: [{ translateY: translateAnim }],
        },
      ]}
      accessibilityLiveRegion="polite"
      accessibilityLabel={`${content.title}. ${content.subtitle}`}
    >
      <TouchableOpacity
        style={styles.toast}
        onPress={handleDismiss}
        activeOpacity={0.9}
      >
        {/* Left Accent */}
        <View style={styles.leftAccent} />

        {/* Content */}
        <View style={styles.content}>
          {/* Icon */}
          <View style={styles.iconContainer}>
            <Icon
              name={content.icon as any}
              size={ICON_SIZE}
              color={Colors.evergreenTeal}
            />
          </View>

          {/* Text */}
          <View style={styles.textContent}>
            <Text style={styles.title}>{content.title}</Text>
            <Text style={styles.subtitle}>{content.subtitle}</Text>
          </View>
        </View>
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  container: {
    position: 'absolute',
    left: 16,
    right: 16,
    zIndex: 9999,
  },
  toast: {
    flexDirection: 'row',
    backgroundColor: Colors.white,
    borderRadius: 12,
    overflow: 'hidden',
    // Shadow with teal tint
    shadowColor: Colors.evergreenTeal,
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 20,
    elevation: 8,
  },
  leftAccent: {
    width: 4,
    backgroundColor: Colors.evergreenTeal,
  },
  content: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 14,
    paddingHorizontal: 18,
  },
  iconContainer: {
    width: ICON_CONTAINER_SIZE,
    height: ICON_CONTAINER_SIZE,
    borderRadius: 10,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
  },
  textContent: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 14,
    fontWeight: '500',
    color: Colors.softCharcoal,
  },
  subtitle: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
});

export default UnlockToast;

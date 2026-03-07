/**
 * Moment of Recognition Modal
 * Shown at meaningful engagement thresholds (7, 30, 60, 100 days of any app use).
 * The threshold is based on total engagement day count — not consecutive days.
 * The number is never displayed to the user.
 *
 * Design Philosophy: Quiet acknowledgment over celebration.
 * Aligns with Vara's "Progress Without Pressure" brand pillar.
 */

import React, { useEffect, useRef } from 'react';
import { View, StyleSheet, Modal, TouchableOpacity, Text } from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import * as Haptics from 'expo-haptics';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';

const HEADINGS = [
  "You've been taking care of yourself.",
  'Showing up, even briefly, is worth something.',
  'Whatever brought you back — it counts.',
  "You're building something that matters.",
];

interface MomentOfRecognitionModalProps {
  visible: boolean;
  onDismiss: () => void;
}

const MomentOfRecognitionModal: React.FC<MomentOfRecognitionModalProps> = ({
  visible,
  onDismiss,
}) => {
  const insets = useSafeAreaInsets();
  const reduceMotion = useReducedMotion();
  const scale = useSharedValue(reduceMotion ? 1 : 0.97);
  const opacity = useSharedValue(reduceMotion ? 1 : 0);
  const iconScale = useSharedValue(reduceMotion ? 1 : 0.9);
  const autoDismissTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  // Pick a random heading on each show
  const headingRef = useRef(HEADINGS[Math.floor(Math.random() * HEADINGS.length)]);

  useEffect(() => {
    if (visible) {
      headingRef.current = HEADINGS[Math.floor(Math.random() * HEADINGS.length)];
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (!reduceMotion) {
        opacity.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
        scale.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
        iconScale.value = withTiming(1, { duration: 250, easing: Easing.out(Easing.ease) });
      } else {
        opacity.value = 1;
        scale.value = 1;
        iconScale.value = 1;
      }

      // Auto-dismiss after 5 seconds
      autoDismissTimer.current = setTimeout(() => {
        onDismiss();
      }, 5000);
    } else {
      opacity.value = reduceMotion ? 0 : withTiming(0, { duration: 150 });
      scale.value = reduceMotion ? 0.97 : 0.97;
      iconScale.value = reduceMotion ? 0.9 : 0.9;
    }

    return () => {
      if (autoDismissTimer.current) clearTimeout(autoDismissTimer.current);
    };
  }, [visible]);

  const modalStyle = useAnimatedStyle(() => ({
    transform: [{ scale: scale.value }],
    opacity: opacity.value,
  }));

  const iconAnimStyle = useAnimatedStyle(() => ({
    transform: [{ scale: iconScale.value }],
  }));

  if (!visible) return null;

  return (
    <Modal
      visible={visible}
      transparent
      animationType="none"
      onRequestClose={onDismiss}
    >
      <View style={[styles.overlay, { paddingBottom: insets.bottom }]}>
        <Animated.View style={[styles.modal, modalStyle]}>
          {/* Checkmark icon */}
          <Animated.View style={[styles.iconContainer, iconAnimStyle]}>
            <Icon name="check" size={48} color={Colors.evergreenTeal} />
          </Animated.View>

          {/* Heading */}
          <Text style={styles.heading}>
            {headingRef.current}
          </Text>

          {/* Body */}
          <Text style={styles.body}>
            Keep going at whatever pace works for you.
          </Text>

          {/* Continue button */}
          <TouchableOpacity
            style={styles.button}
            onPress={onDismiss}
            activeOpacity={0.8}
            accessibilityRole="button"
            accessibilityLabel="Continue"
          >
            <Text style={styles.buttonText}>Continue</Text>
          </TouchableOpacity>
        </Animated.View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0,0,0,0.3)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modal: {
    backgroundColor: Colors.white,
    borderRadius: 16,
    padding: 24,
    width: '100%',
    maxWidth: 400,
    alignItems: 'center',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 5,
  },
  iconContainer: {
    marginBottom: Spacing.base,
  },
  heading: {
    fontSize: 22,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    textAlign: 'center',
    marginBottom: Spacing.sm,
  },
  body: {
    fontSize: 14,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  button: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 12,
    paddingVertical: 12,
    paddingHorizontal: 32,
    width: '100%',
    alignItems: 'center',
    minHeight: 48,
    justifyContent: 'center',
  },
  buttonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: Typography.fontWeight.medium,
  },
});

// Export as both names for migration compatibility
export { MomentOfRecognitionModal };
export default MomentOfRecognitionModal;

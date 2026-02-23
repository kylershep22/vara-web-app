/**
 * OnboardingActivityCard Component
 * Card displaying an activity option on the Try One Thing screen
 *
 * Specs:
 * - Standard card, horizontal layout
 * - 48px icon circle (Dew Sage bg, Teal icon)
 * - Title + description + duration badge + chevron
 * - Scale 0.98 on press, haptic feedback
 */

import React, { useRef } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Platform,
} from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { OnboardingActivityOption } from '../../types/onboarding';

interface OnboardingActivityCardProps {
  activity: OnboardingActivityOption;
  onPress: () => void;
  disabled?: boolean;
}

const ICON_CIRCLE_SIZE = 48;
const ICON_SIZE = 24;

const OnboardingActivityCard: React.FC<OnboardingActivityCardProps> = ({
  activity,
  onPress,
  disabled = false,
}) => {
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    Animated.timing(scaleAnim, {
      toValue: 0.98,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    Animated.timing(scaleAnim, {
      toValue: 1,
      duration: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePress = () => {
    if (disabled) return;
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onPress();
  };

  return (
    <TouchableOpacity
      onPress={handlePress}
      onPressIn={handlePressIn}
      onPressOut={handlePressOut}
      disabled={disabled}
      activeOpacity={1}
      accessibilityRole="button"
      accessibilityLabel={`${activity.name}, ${activity.duration}`}
      accessibilityHint={activity.description}
    >
      <Animated.View
        style={[
          styles.card,
          { transform: [{ scale: scaleAnim }] },
          disabled && styles.cardDisabled,
        ]}
      >
        {/* Icon Circle */}
        <View style={styles.iconCircle}>
          <Icon
            name={activity.icon as any}
            size={ICON_SIZE}
            color={Colors.evergreenTeal}
          />
        </View>

        {/* Content */}
        <View style={styles.content}>
          <View style={styles.titleRow}>
            <Text style={styles.title}>{activity.name}</Text>
            <View style={styles.durationBadge}>
              <Text style={styles.durationText}>{activity.duration}</Text>
            </View>
          </View>
          <Text style={styles.description} numberOfLines={2}>
            {activity.description}
          </Text>
        </View>

        {/* Chevron */}
        <Icon
          name="chevron-right"
          size={20}
          color={Colors.textSecondary}
          style={styles.chevron}
        />
      </Animated.View>
    </TouchableOpacity>
  );
};

const styles = StyleSheet.create({
  card: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.05,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  cardDisabled: {
    opacity: 0.6,
  },
  iconCircle: {
    width: ICON_CIRCLE_SIZE,
    height: ICON_CIRCLE_SIZE,
    borderRadius: ICON_CIRCLE_SIZE / 2,
    backgroundColor: `${Colors.dewSage}80`, // 50% opacity
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  content: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  title: {
    color: Colors.softCharcoal,
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
    flex: 1,
  },
  durationBadge: {
    backgroundColor: `${Colors.evergreenTeal}1A`, // 10% opacity
    paddingHorizontal: Spacing.sm,
    paddingVertical: 2,
    borderRadius: Layout.borderRadius.sm,
    marginLeft: Spacing.sm,
  },
  durationText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
  },
  description: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
  },
  chevron: {
    marginLeft: Spacing.sm,
  },
});

export default OnboardingActivityCard;

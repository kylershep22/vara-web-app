/**
 * GuidePill — the docked AI Guide affordance.
 *
 * Four-Pillar IA: the Guide is a single, calm, docked pill (top-right on pillar
 * screens), replacing the old bottom-right floating circle (AIAssistantFAB).
 * It is one quiet help affordance per pillar screen, never two.
 *
 * Placement is owned by the host screen, not by this component: the pill renders
 * inline wherever it is mounted (over a hero band on Focus/Energy/Time, or in the
 * header row left of the existing control on Home/Community). Pass a `style` to
 * anchor it. Session surfaces (timer, practice player, check-in flow) simply do
 * not mount it, so the Guide is hidden during sessions by construction.
 *
 * The pill carries an opaque teal fill + shadow so it stays legible over the
 * watercolor hero bands without an extra scrim (WCAG AA: mistWhite content on
 * evergreenTeal). Tokens only; touch target >= 48px; Reduce Motion respected
 * (the press-scale is skipped when the user prefers reduced motion).
 */

import React, { useRef, useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, Animated } from 'react-native';
import type { StyleProp, ViewStyle } from 'react-native';
import Svg, { Path } from 'react-native-svg';

import { Colors, Spacing, Layout, Typography } from '../../constants';
import { AIChatModal } from './AIChatModal';
import { useAIConsent } from '../../context/AIConsentContext';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface GuidePillProps {
  /** Context passed through to the chat modal (screen tag, user habits, etc.). */
  context?: {
    screen: string;
    userGoals?: any[];
    userHabits?: any[];
    [key: string]: any;
  };
  /** Anchor style applied by the host screen (absolute over a band, or inline). */
  style?: StyleProp<ViewStyle>;
  testID?: string;
}

// Chat bubble with Vara "V" — signals AI chat while keeping brand identity.
// Carried over from the previous FAB so the affordance reads the same.
const VaraChatIcon = ({ size = 20, color = Colors.mistWhite }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <Path
      d="M12 18 C12 12 18 6 28 6 L72 6 C82 6 88 12 88 18 L88 58 C88 64 82 70 72 70 L32 70 L20 82 L20 70 L28 70 C18 70 12 64 12 58 Z"
      fill={color}
      opacity={0.2}
    />
    <Path
      d="M32 24 Q42 46 50 60 Q58 46 68 24"
      stroke={color}
      strokeWidth={7}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

export function GuidePill({ context, style, testID }: GuidePillProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;
  const { requireConsent } = useAIConsent();
  const reduceMotion = useReducedMotion();

  const handlePress = () => {
    requireConsent(() => setModalVisible(true));
  };

  const animateTo = (toValue: number) => {
    if (reduceMotion) return;
    Animated.timing(scaleAnim, {
      toValue,
      duration: 120,
      useNativeDriver: true,
    }).start();
  };

  return (
    <>
      <Animated.View
        style={[styles.wrap, { transform: [{ scale: scaleAnim }] }, style]}
      >
        <TouchableOpacity
          onPress={handlePress}
          onPressIn={() => animateTo(0.96)}
          onPressOut={() => animateTo(1)}
          activeOpacity={0.9}
          hitSlop={{ top: 6, bottom: 6, left: 6, right: 6 }}
          accessibilityRole="button"
          accessibilityLabel="Open the Guide, your wellness assistant"
          testID={testID ?? 'guide-pill'}
          style={styles.pill}
        >
          <VaraChatIcon size={20} color={Colors.mistWhite} />
          <Text style={styles.label}>Guide</Text>
        </TouchableOpacity>
      </Animated.View>

      <AIChatModal
        visible={modalVisible}
        onClose={() => setModalVisible(false)}
        initialContext={context}
      />
    </>
  );
}

const styles = StyleSheet.create({
  // Hug the content so the pill never stretches to its container's width when
  // mounted inline in a flex row.
  wrap: {
    alignSelf: 'flex-start',
  },
  pill: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    // >= 48px touch target (WCAG); matches the 48px Settings control on Home.
    minHeight: 48,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: Layout.borderRadius.full,
    // Opaque teal fill so the pill stays legible over the watercolor hero bands.
    backgroundColor: Colors.evergreenTeal,
    ...Layout.shadow.md,
  },
  label: {
    color: Colors.mistWhite,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default GuidePill;

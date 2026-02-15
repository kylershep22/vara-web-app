/**
 * AI Assistant FAB Component
 * Floating action button for AI assistant access
 * Redesigned with Vara brand: calm, grounded, brain-health centered
 */

import React, { useState, useRef } from 'react';
import {
  StyleSheet,
  TouchableOpacity,
  Animated,
} from 'react-native';
import { LinearGradient } from 'expo-linear-gradient';
import Svg, { Path } from 'react-native-svg';
import { Spacing } from '../../constants';
import { AIChatModal } from './AIChatModal';

// Brand colors
const EVERGREEN_TEAL = '#1B5E57';
const TEAL_DARK = '#174e48';
const MIST_WHITE = '#FAFAF6';

interface AIAssistantFABProps {
  context?: {
    screen: string;
    userGoals?: any[];
    userHabits?: any[];
    [key: string]: any;
  };
}

// Abstract Ribbon V Icon Component
const VaraIcon = ({ size = 40, color = MIST_WHITE }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <Path
      d="M20 20 Q35 50 50 80 Q65 50 80 20"
      stroke={color}
      strokeWidth={10}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

export function AIAssistantFAB({ context }: AIAssistantFABProps) {
  const [modalVisible, setModalVisible] = useState(false);
  const [isPressed, setIsPressed] = useState(false);
  const scaleAnim = useRef(new Animated.Value(1)).current;

  const handlePressIn = () => {
    setIsPressed(true);
    Animated.spring(scaleAnim, {
      toValue: 1.08,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  const handlePressOut = () => {
    setIsPressed(false);
    Animated.spring(scaleAnim, {
      toValue: 1,
      friction: 4,
      tension: 100,
      useNativeDriver: true,
    }).start();
  };

  return (
    <>
      <Animated.View
        style={[
          styles.fabContainer,
          {
            transform: [{ scale: scaleAnim }],
          },
          isPressed && styles.fabContainerPressed,
        ]}
      >
        <TouchableOpacity
          onPress={() => setModalVisible(true)}
          onPressIn={handlePressIn}
          onPressOut={handlePressOut}
          activeOpacity={1}
          style={styles.fabTouchable}
        >
          <LinearGradient
            colors={[EVERGREEN_TEAL, TEAL_DARK]}
            start={{ x: 0, y: 0 }}
            end={{ x: 1, y: 1 }}
            style={styles.fab}
          >
            <VaraIcon size={40} color={MIST_WHITE} />
          </LinearGradient>
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
  fabContainer: {
    position: 'absolute',
    bottom: Spacing.xl + 60, // Above tab bar
    right: Spacing.base,
    width: 68,
    height: 68,
    borderRadius: 34,
    shadowColor: 'rgba(27, 94, 87, 1)',
    shadowOffset: { width: 0, height: 6 },
    shadowOpacity: 0.3,
    shadowRadius: 24,
    elevation: 12,
    zIndex: 999,
  },
  fabContainerPressed: {
    shadowOpacity: 0.35,
    shadowRadius: 32,
    shadowOffset: { width: 0, height: 8 },
  },
  fabTouchable: {
    width: 68,
    height: 68,
    borderRadius: 34,
    overflow: 'hidden',
  },
  fab: {
    width: 68,
    height: 68,
    borderRadius: 34,
    justifyContent: 'center',
    alignItems: 'center',
  },
});

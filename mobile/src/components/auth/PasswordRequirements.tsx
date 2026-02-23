/**
 * PasswordRequirements Component
 * Displays password requirements with real-time validation
 *
 * Features:
 * - Real-time requirement checking
 * - Animated state transitions
 * - Reduced opacity until user starts typing
 */

import React, { useRef, useEffect } from 'react';
import { View, StyleSheet, Animated } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface PasswordRequirementsProps {
  password: string;
}

interface Requirement {
  id: string;
  label: string;
  validator: (password: string) => boolean;
}

const REQUIREMENTS: Requirement[] = [
  {
    id: 'length',
    label: 'At least 8 characters',
    validator: (password) => password.length >= 8,
  },
  {
    id: 'uppercase',
    label: 'One uppercase letter',
    validator: (password) => /[A-Z]/.test(password),
  },
  {
    id: 'lowercase',
    label: 'One lowercase letter',
    validator: (password) => /[a-z]/.test(password),
  },
  {
    id: 'number',
    label: 'One number',
    validator: (password) => /[0-9]/.test(password),
  },
];

const ANIMATION_DURATION = 300;

const RequirementItem: React.FC<{
  label: string;
  isMet: boolean;
  reduceMotion: boolean;
}> = ({ label, isMet, reduceMotion }) => {
  const animValue = useRef(new Animated.Value(isMet ? 1 : 0)).current;

  useEffect(() => {
    const duration = reduceMotion ? 0 : ANIMATION_DURATION;

    Animated.timing(animValue, {
      toValue: isMet ? 1 : 0,
      duration,
      useNativeDriver: false, // Required for color interpolation
    }).start();
  }, [isMet, reduceMotion]);

  const backgroundColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: ['transparent', Colors.evergreenTeal],
  });

  const borderColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.silverSage, Colors.evergreenTeal],
  });

  const textColor = animValue.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.textSecondary, Colors.evergreenTeal],
  });

  // Scale interpolation instead of separate animated value
  const scale = animValue.interpolate({
    inputRange: [0, 0.5, 1],
    outputRange: [1, 1.1, 1],
  });

  return (
    <View style={styles.requirementRow}>
      <Animated.View
        style={[
          styles.indicator,
          {
            backgroundColor,
            borderColor,
            transform: [{ scale }],
          },
        ]}
      >
        {isMet && (
          <Icon name="check" size={10} color={Colors.white} />
        )}
      </Animated.View>
      <Animated.Text
        style={[
          styles.requirementText,
          { color: textColor },
        ]}
      >
        {label}
      </Animated.Text>
    </View>
  );
};

const PasswordRequirements: React.FC<PasswordRequirementsProps> = ({
  password,
}) => {
  const reduceMotion = useReducedMotion();
  const opacityAnim = useRef(new Animated.Value(0.55)).current;
  const hasStartedTyping = password.length > 0;

  useEffect(() => {
    const duration = reduceMotion ? 0 : 200;
    Animated.timing(opacityAnim, {
      toValue: hasStartedTyping ? 1 : 0.55,
      duration,
      useNativeDriver: true,
    }).start();
  }, [hasStartedTyping, reduceMotion]);

  return (
    <Animated.View style={[styles.container, { opacity: opacityAnim }]}>
      <Text style={styles.title}>Password should include:</Text>
      {REQUIREMENTS.map((req) => (
        <RequirementItem
          key={req.id}
          label={req.label}
          isMet={req.validator(password)}
          reduceMotion={reduceMotion}
        />
      ))}
    </Animated.View>
  );
};

/**
 * Utility function to check if all password requirements are met
 */
export const allRequirementsMet = (password: string): boolean => {
  return REQUIREMENTS.every((req) => req.validator(password));
};

const styles = StyleSheet.create({
  container: {
    backgroundColor: 'rgba(213, 227, 209, 0.33)',
    borderRadius: 12,
    padding: 16,
    paddingHorizontal: 18,
    marginBottom: Spacing.lg,
  },
  title: {
    fontSize: 13,
    fontWeight: '600',
    color: Colors.softCharcoal,
    marginBottom: Spacing.sm,
  },
  requirementRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 8,
  },
  indicator: {
    width: 16,
    height: 16,
    borderRadius: 8,
    borderWidth: 1.5,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: 10,
  },
  requirementText: {
    fontSize: 13,
  },
});

export default PasswordRequirements;

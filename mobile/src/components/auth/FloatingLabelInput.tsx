/**
 * FloatingLabelInput Component
 * Custom text input with animated floating label
 *
 * Features:
 * - Label starts centered, floats up on focus or when filled
 * - Smooth animations with reduced motion support
 * - Custom styling per Vara design system
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  TextInput,
  StyleSheet,
  Animated,
  TouchableWithoutFeedback,
  TextInputProps,
  ViewStyle,
  Text,
} from 'react-native';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';

interface FloatingLabelInputProps extends Omit<TextInputProps, 'style'> {
  label: string;
  value: string;
  onChangeText: (text: string) => void;
  error?: boolean;
  errorText?: string;
  left?: React.ReactNode;
  right?: React.ReactNode;
  containerStyle?: ViewStyle;
}

const FIELD_HEIGHT = 56;
const ANIMATION_DURATION = 150;

const FloatingLabelInput: React.FC<FloatingLabelInputProps> = ({
  label,
  value,
  onChangeText,
  error = false,
  errorText,
  left,
  right,
  containerStyle,
  secureTextEntry,
  ...props
}) => {
  const [isFocused, setIsFocused] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const reduceMotion = useReducedMotion();

  // Animated values
  const labelPosition = useRef(new Animated.Value(value ? 1 : 0)).current;
  const focusRingOpacity = useRef(new Animated.Value(0)).current;

  const isFloating = isFocused || value.length > 0;

  useEffect(() => {
    const toValue = isFloating ? 1 : 0;
    const duration = reduceMotion ? 0 : ANIMATION_DURATION;

    Animated.parallel([
      Animated.timing(labelPosition, {
        toValue,
        duration,
        useNativeDriver: false,
      }),
      Animated.timing(focusRingOpacity, {
        toValue: isFocused ? 1 : 0,
        duration,
        useNativeDriver: false,
      }),
    ]).start();
  }, [isFloating, isFocused, reduceMotion]);

  const handleFocus = () => {
    setIsFocused(true);
    props.onFocus?.({} as any);
  };

  const handleBlur = () => {
    setIsFocused(false);
    props.onBlur?.({} as any);
  };

  const handleContainerPress = () => {
    inputRef.current?.focus();
  };

  // Interpolated styles
  const labelTop = labelPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [18, 8],
  });

  const labelFontSize = labelPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [15, 11],
  });

  const labelColor = labelPosition.interpolate({
    inputRange: [0, 1],
    outputRange: [Colors.textSecondary, isFocused ? Colors.evergreenTeal : Colors.textSecondary],
  });

  const borderColor = error
    ? Colors.error
    : isFocused
    ? Colors.evergreenTeal
    : Colors.silverSage;

  return (
    <View style={[styles.wrapper, containerStyle]}>
      <TouchableWithoutFeedback onPress={handleContainerPress}>
        <View style={styles.container}>
          {/* Focus ring */}
          <Animated.View
            style={[
              styles.focusRing,
              {
                opacity: focusRingOpacity,
                borderColor: Colors.evergreenTeal,
              },
            ]}
            pointerEvents="none"
          />

          {/* Main input container */}
          <View
            style={[
              styles.inputContainer,
              {
                borderColor,
                borderWidth: isFocused ? 1.5 : 1.5,
              },
            ]}
          >
            {/* Left icon */}
            {left && <View style={styles.leftIcon}>{left}</View>}

            {/* Input area */}
            <View style={styles.inputWrapper}>
              {/* Floating label */}
              <Animated.Text
                style={[
                  styles.label,
                  {
                    top: labelTop,
                    fontSize: labelFontSize,
                    color: labelColor,
                    fontWeight: isFloating ? '500' : '400',
                    letterSpacing: isFloating ? 0.02 : 0,
                  },
                ]}
                numberOfLines={1}
              >
                {label}
              </Animated.Text>

              {/* Text input */}
              <TextInput
                ref={inputRef}
                style={[
                  styles.input,
                  { paddingTop: isFloating ? 22 : 14 },
                ]}
                value={value}
                onChangeText={onChangeText}
                onFocus={handleFocus}
                onBlur={handleBlur}
                secureTextEntry={secureTextEntry}
                placeholderTextColor={Colors.textSecondary}
                selectionColor={Colors.evergreenTeal}
                {...props}
              />
            </View>

            {/* Right icon */}
            {right && <View style={styles.rightIcon}>{right}</View>}
          </View>
        </View>
      </TouchableWithoutFeedback>

      {/* Error text */}
      {error && errorText && (
        <Text style={styles.errorText}>{errorText}</Text>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  wrapper: {
    marginBottom: Spacing.base,
  },
  container: {
    position: 'relative',
  },
  focusRing: {
    position: 'absolute',
    top: -3,
    left: -3,
    right: -3,
    bottom: -3,
    borderRadius: 13,
    borderWidth: 3,
    borderColor: 'rgba(27, 94, 87, 0.09)',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    height: FIELD_HEIGHT,
    borderRadius: 12,
    backgroundColor: Colors.white,
    borderWidth: 1.5,
  },
  leftIcon: {
    paddingLeft: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  rightIcon: {
    paddingRight: 16,
    justifyContent: 'center',
    alignItems: 'center',
  },
  inputWrapper: {
    flex: 1,
    position: 'relative',
    height: '100%',
    justifyContent: 'center',
  },
  label: {
    position: 'absolute',
    left: 16,
    backgroundColor: 'transparent',
  },
  input: {
    flex: 1,
    paddingHorizontal: 16,
    paddingBottom: 8,
    fontSize: 16,
    fontWeight: '400',
    color: Colors.softCharcoal,
  },
  errorText: {
    color: Colors.error,
    fontSize: 14,
    fontWeight: '500',
    marginTop: 4,
    marginLeft: 4,
  },
});

export default FloatingLabelInput;

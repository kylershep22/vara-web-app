/**
 * CollapsibleSearchBar Component
 * Icon-only search bar that expands on tap
 */

import React, { useState, useRef, useCallback } from 'react';
import { View, StyleSheet, TextInput, TouchableOpacity, Keyboard } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import { Ionicons } from '@expo/vector-icons';
import { Colors, Spacing, Layout } from '../../constants';
import { useReducedMotion } from '../../hooks';

interface CollapsibleSearchBarProps {
  /** Current search value */
  value: string;
  /** Callback when text changes */
  onChangeText: (text: string) => void;
  /** Callback when search is cleared */
  onClear?: () => void;
  /** Placeholder text */
  placeholder?: string;
}

const ANIMATION_DURATION = 200;

export const CollapsibleSearchBar: React.FC<CollapsibleSearchBarProps> = ({
  value,
  onChangeText,
  onClear,
  placeholder = 'Search entries...',
}) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const inputRef = useRef<TextInput>(null);
  const reduceMotion = useReducedMotion();

  const expandProgress = useSharedValue(0);

  const expand = useCallback(() => {
    setIsExpanded(true);
    expandProgress.value = withTiming(1, {
      duration: reduceMotion ? 0 : ANIMATION_DURATION,
      easing: Easing.out(Easing.ease),
    });
    // Focus input after animation
    setTimeout(() => {
      inputRef.current?.focus();
    }, reduceMotion ? 0 : ANIMATION_DURATION);
  }, [expandProgress, reduceMotion]);

  const collapse = useCallback(() => {
    Keyboard.dismiss();
    if (value.length === 0) {
      setIsExpanded(false);
      expandProgress.value = withTiming(0, {
        duration: reduceMotion ? 0 : ANIMATION_DURATION,
        easing: Easing.out(Easing.ease),
      });
    }
  }, [expandProgress, reduceMotion, value]);

  const handleClear = useCallback(() => {
    onChangeText('');
    onClear?.();
    // Collapse after clearing
    setIsExpanded(false);
    expandProgress.value = withTiming(0, {
      duration: reduceMotion ? 0 : ANIMATION_DURATION,
      easing: Easing.out(Easing.ease),
    });
  }, [onChangeText, onClear, expandProgress, reduceMotion]);

  const handleBlur = useCallback(() => {
    if (value.length === 0) {
      collapse();
    }
  }, [value, collapse]);

  const inputOpacityStyle = useAnimatedStyle(() => ({
    opacity: expandProgress.value,
  }));

  return (
    <View style={styles.container}>
      {!isExpanded ? (
        // Collapsed: Icon button only
        <TouchableOpacity
          onPress={expand}
          style={styles.iconButton}
          accessibilityLabel="Search entries"
          accessibilityRole="button"
          accessibilityHint="Double tap to open search"
        >
          <Ionicons name="search" size={24} color={Colors.evergreenTeal} />
        </TouchableOpacity>
      ) : (
        // Expanded: Full search input
        <Animated.View style={[styles.expandedContainer, inputOpacityStyle]}>
          <Ionicons
            name="search"
            size={20}
            color={Colors.textSecondary}
            style={styles.searchIcon}
          />
          <TextInput
            ref={inputRef}
            value={value}
            onChangeText={onChangeText}
            onBlur={handleBlur}
            placeholder={placeholder}
            placeholderTextColor={Colors.textSecondary}
            style={styles.input}
            returnKeyType="search"
            autoCapitalize="none"
            autoCorrect={false}
            accessibilityLabel="Search entries"
          />
          {value.length > 0 ? (
            <TouchableOpacity
              onPress={handleClear}
              style={styles.clearButton}
              accessibilityLabel="Clear search"
              accessibilityRole="button"
            >
              <Ionicons name="close-circle" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          ) : (
            <TouchableOpacity
              onPress={collapse}
              style={styles.clearButton}
              accessibilityLabel="Close search"
              accessibilityRole="button"
            >
              <Ionicons name="close" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          )}
        </Animated.View>
      )}
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    minHeight: 48,
    justifyContent: 'center',
  },
  iconButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    alignSelf: 'flex-start',
  },
  expandedContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Spacing.sm,
    height: 48,
  },
  searchIcon: {
    marginRight: Spacing.sm,
  },
  input: {
    flex: 1,
    fontSize: 16,
    color: Colors.textPrimary,
    paddingVertical: Spacing.sm,
  },
  clearButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.xs,
  },
});

export default CollapsibleSearchBar;

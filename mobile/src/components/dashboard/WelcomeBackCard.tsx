/**
 * WelcomeBackCard
 * Shown on the Dashboard when a user returns after 48+ hours away.
 * Dismisses on tap or auto-dismisses after 6 seconds.
 *
 * Brand: No guilt, no "we missed you", no days-away counting.
 */

import React, { useState, useEffect, useRef } from 'react';
import { TouchableOpacity, StyleSheet, Platform, Text, View, LayoutAnimation, UIManager } from 'react-native';
import Animated, {
  useSharedValue,
  useAnimatedStyle,
  withTiming,
  Easing,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { Colors, Spacing, Typography } from '../../constants';
import { useReducedMotion } from '../../hooks/useReducedMotion';
import { getLapseMessage } from '../../constants/lapseEducation';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

const LAST_OPEN_KEY = 'vara_last_app_open_date';
const LAPSE_COUNT_KEY = 'vara_lapse_count';
const FORTY_EIGHT_HOURS = 48 * 60 * 60 * 1000;

const HEADINGS = [
  'Good to see you.',
  'Welcome back.',
  "You're here.",
];

const BODIES = [
  'Nothing to catch up on. Just today.',
  'Pick up wherever feels right.',
  "Whenever you're ready.",
];

interface WelcomeBackCardProps {
  onDismiss?: () => void;
}

const WelcomeBackCard: React.FC<WelcomeBackCardProps> = ({ onDismiss }) => {
  const reduceMotion = useReducedMotion();
  const [shouldShow, setShouldShow] = useState(false);
  const [expanded, setExpanded] = useState(false);
  const [lapseMessage, setLapseMessage] = useState('');
  const opacity = useSharedValue(0);
  const headingRef = useRef(HEADINGS[Math.floor(Math.random() * HEADINGS.length)]);
  const bodyRef = useRef(BODIES[Math.floor(Math.random() * BODIES.length)]);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    const checkLastOpen = async () => {
      try {
        const lastOpenStr = await AsyncStorage.getItem(LAST_OPEN_KEY);
        const now = Date.now();

        // Update last open date
        await AsyncStorage.setItem(LAST_OPEN_KEY, now.toString());

        if (lastOpenStr) {
          const lastOpen = parseInt(lastOpenStr, 10);
          if (now - lastOpen > FORTY_EIGHT_HOURS) {
            headingRef.current = HEADINGS[Math.floor(Math.random() * HEADINGS.length)];
            bodyRef.current = BODIES[Math.floor(Math.random() * BODIES.length)];

            // Read and increment lapse counter
            const lapseCountStr = await AsyncStorage.getItem(LAPSE_COUNT_KEY);
            const lapseCount = lapseCountStr ? parseInt(lapseCountStr, 10) : 0;
            await AsyncStorage.setItem(LAPSE_COUNT_KEY, (lapseCount + 1).toString());
            setLapseMessage(getLapseMessage(lapseCount));

            setShouldShow(true);

            if (!reduceMotion) {
              opacity.value = withTiming(1, { duration: 200, easing: Easing.in(Easing.ease) });
            } else {
              opacity.value = 1;
            }

            // Auto-dismiss after 6 seconds
            timerRef.current = setTimeout(handleDismiss, 6000);
          }
        }
      } catch {
        // Silently fail
      }
    };

    checkLastOpen();

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current);
    };
  }, []);

  const handleDismiss = () => {
    if (timerRef.current) clearTimeout(timerRef.current);

    if (!reduceMotion) {
      opacity.value = withTiming(0, { duration: 150 });
      setTimeout(() => {
        setShouldShow(false);
        onDismiss?.();
      }, 150);
    } else {
      setShouldShow(false);
      onDismiss?.();
    }
  };

  const handleExpandToggle = () => {
    // Cancel auto-dismiss when user engages with expanded section
    if (!expanded && timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }

    if (!reduceMotion) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpanded(prev => !prev);
  };

  const handleCollapseOnly = () => {
    if (!reduceMotion) {
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    }
    setExpanded(false);
  };

  const animStyle = useAnimatedStyle(() => ({
    opacity: opacity.value,
  }));

  if (!shouldShow) return null;

  return (
    <Animated.View style={animStyle}>
      <TouchableOpacity
        style={styles.card}
        onPress={handleDismiss}
        activeOpacity={0.9}
        accessibilityRole="button"
        accessibilityLabel={`${headingRef.current} ${bodyRef.current}`}
        accessibilityHint="Tap to dismiss"
      >
        <Text style={styles.heading}>{headingRef.current}</Text>
        <Text style={styles.body}>{bodyRef.current}</Text>

        {/* Why habits can be hard toggle */}
        <TouchableOpacity
          style={styles.expandToggle}
          onPress={handleExpandToggle}
          activeOpacity={0.7}
          accessibilityRole="button"
          accessibilityLabel="Why habits can be hard"
          accessibilityHint={expanded ? 'Tap to collapse explanation' : 'Tap to expand explanation'}
        >
          <Text style={styles.expandIcon}>ⓘ</Text>
          <Text style={styles.expandLabel}>Why habits can be hard</Text>
        </TouchableOpacity>

        {/* Expanded education section */}
        {expanded && (
          <View>
            <View style={styles.divider} />
            <View style={styles.expandedContent}>
              <Text style={styles.expandedBody}>{lapseMessage}</Text>
              <TouchableOpacity
                style={styles.collapseButton}
                onPress={handleCollapseOnly}
                activeOpacity={0.7}
                accessibilityRole="button"
                accessibilityLabel="Close explanation"
              >
                <Text style={styles.collapseIcon}>✕</Text>
              </TouchableOpacity>
            </View>
          </View>
        )}
      </TouchableOpacity>
    </Animated.View>
  );
};

const styles = StyleSheet.create({
  card: {
    backgroundColor: Colors.white,
    borderRadius: 12,
    padding: 24,
    marginBottom: Spacing.base,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 4,
      },
      android: {
        elevation: 2,
      },
    }),
  },
  heading: {
    fontSize: 18,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginBottom: 4,
  },
  body: {
    fontSize: 14,
    color: Colors.mutedSageGray,
  },
  expandToggle: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: 12,
    gap: 5,
  },
  expandIcon: {
    fontSize: 16,
    color: Colors.textSecondary,
    lineHeight: 20,
  },
  expandLabel: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
  },
  divider: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginTop: 12,
    marginBottom: 12,
  },
  expandedContent: {
    position: 'relative',
  },
  expandedBody: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.textPrimary,
    lineHeight: 21,
    paddingRight: 28,
  },
  collapseButton: {
    position: 'absolute',
    bottom: 0,
    right: 0,
    padding: 4,
  },
  collapseIcon: {
    fontSize: 14,
    color: Colors.textSecondary,
  },
});

export default WelcomeBackCard;

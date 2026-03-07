/**
 * NotificationToast Component
 * In-app toast for surfacing consolidated notifications when the app foregrounds.
 *
 * Design:
 * - White background with evergreenTeal left accent
 * - Leaf icon + title + body
 * - Slides in from top, auto-dismisses after 3.5s
 * - Tap to dismiss and optionally navigate
 */

import React, { useEffect, useRef, useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Animated,
  Text,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors } from '../../constants';

interface NotificationToastProps {
  title: string;
  body: string;
  visible: boolean;
  onDismiss: () => void;
  onTap?: () => void;
  autoDismissDelay?: number;
  /** Optional action button text (e.g., "Undo") shown on the right side */
  actionLabel?: string;
  /** Called when the action button is tapped */
  onAction?: () => void;
}

const ICON_CONTAINER_SIZE = 36;
const ICON_SIZE = 20;
const TOAST_DURATION = 3500;
const FADE_DURATION = 300;

const NotificationToast: React.FC<NotificationToastProps> = ({
  title,
  body,
  visible,
  onDismiss,
  onTap,
  autoDismissDelay = TOAST_DURATION,
  actionLabel,
  onAction,
}) => {
  const insets = useSafeAreaInsets();
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateAnim = useRef(new Animated.Value(-16)).current;
  const dismissTimerRef = useRef<NodeJS.Timeout | null>(null);

  const handleDismiss = useCallback(() => {
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current);
    }

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
  }, [fadeAnim, translateAnim, onDismiss]);

  useEffect(() => {
    if (visible) {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
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

      dismissTimerRef.current = setTimeout(handleDismiss, autoDismissDelay);
    }

    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current);
      }
    };
  }, [visible, fadeAnim, translateAnim, autoDismissDelay, handleDismiss]);

  if (!visible) return null;

  const handlePress = () => {
    if (onTap) onTap();
    handleDismiss();
  };

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
      accessibilityLabel={`${title}. ${body}`}
    >
      <TouchableOpacity
        style={styles.toast}
        onPress={handlePress}
        activeOpacity={0.9}
      >
        <View style={styles.leftAccent} />
        <View style={styles.content}>
          <View style={styles.iconContainer}>
            <Icon name="leaf" size={ICON_SIZE} color={Colors.evergreenTeal} />
          </View>
          <View style={styles.textContent}>
            <Text style={styles.title} numberOfLines={1}>{title}</Text>
            {body ? <Text style={styles.body} numberOfLines={2}>{body}</Text> : null}
          </View>
          {actionLabel && onAction && (
            <TouchableOpacity
              onPress={() => { onAction(); handleDismiss(); }}
              style={styles.actionButton}
              hitSlop={{ top: 8, bottom: 8, left: 8, right: 8 }}
            >
              <Text style={styles.actionLabel}>{actionLabel}</Text>
            </TouchableOpacity>
          )}
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
    backgroundColor: '#FFFFFF',
    borderRadius: 12,
    overflow: 'hidden',
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
  body: {
    fontSize: 12,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  actionButton: {
    marginLeft: 12,
    paddingVertical: 4,
    paddingHorizontal: 8,
  },
  actionLabel: {
    fontSize: 14,
    fontWeight: '600',
    color: Colors.evergreenTeal,
  },
});

export default NotificationToast;

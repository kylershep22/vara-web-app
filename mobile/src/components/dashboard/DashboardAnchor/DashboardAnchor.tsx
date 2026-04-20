import React, { useCallback, useEffect, useState } from 'react';
import { Pressable } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useAnimatedReaction,
  useSharedValue,
  runOnJS,
  FadeIn,
  FadeOut,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BrainState } from '../../../types';
import { getBrainStateBrief } from './brainStateBriefs';
import { DashboardAnchorExpanded } from './DashboardAnchorExpanded';
import { DashboardAnchorCollapsed } from './DashboardAnchorCollapsed';

interface DashboardAnchorProps {
  brainState: BrainState;
  protocolCompleted: boolean;
  checkInDate: string;                          // YYYY-MM-DD from the check-in doc
  onChangeStatePress: () => void;
  scrollY: Animated.SharedValue<number>;
}

const COLLAPSE_THRESHOLD = 200;
const EXPAND_THRESHOLD = 50;
const STORAGE_KEY_PREFIX = 'dashboard_anchor_collapsed_';

// Numeric codes for manualOverrideDirection shared value (worklet-safe).
// 0 = null (no override), 1 = 'collapse', 2 = 'expand'
const OVERRIDE_NONE = 0;
const OVERRIDE_COLLAPSE = 1;
const OVERRIDE_EXPAND = 2;

function storageKey(checkInDate: string): string {
  return `${STORAGE_KEY_PREFIX}${checkInDate}`;
}

export const DashboardAnchor: React.FC<DashboardAnchorProps> = ({
  brainState,
  protocolCompleted,
  checkInDate,
  onChangeStatePress,
  scrollY,
}) => {
  const [collapsed, setCollapsed] = useState(false);
  const [hydrated, setHydrated] = useState(false);
  const manualOverrideActive = useSharedValue(false);
  const manualOverrideDirection = useSharedValue(OVERRIDE_NONE);

  // Hydrate from AsyncStorage whenever checkInDate changes (new day = new key).
  useEffect(() => {
    let cancelled = false;
    setHydrated(false);
    AsyncStorage.getItem(storageKey(checkInDate))
      .then((val) => {
        if (!cancelled) {
          setCollapsed(val === 'true');
          setHydrated(true);
        }
      })
      .catch(() => {
        if (!cancelled) setHydrated(true);
      });
    return () => {
      cancelled = true;
    };
  }, [checkInDate]);

  // Persist on change.
  useEffect(() => {
    if (!hydrated) return;
    AsyncStorage.setItem(storageKey(checkInDate), collapsed ? 'true' : 'false')?.catch(() => {});
  }, [collapsed, hydrated, checkInDate]);

  const setCollapsedFromScroll = useCallback((next: boolean) => {
    setCollapsed(next);
  }, []);

  // Scroll-driven auto-collapse/expand. Paused by manualOverrideActive until
  // the scroll position crosses the *opposite* threshold from the direction of
  // the manual toggle.
  useAnimatedReaction(
    () => scrollY.value,
    (y) => {
      if (manualOverrideActive.value) {
        const dir = manualOverrideDirection.value;
        // User manually collapsed → clear only when scrolling back to top.
        // User manually expanded → clear only when scrolling down past threshold.
        const shouldClear =
          (dir === OVERRIDE_COLLAPSE && y < EXPAND_THRESHOLD) ||
          (dir === OVERRIDE_EXPAND && y > COLLAPSE_THRESHOLD);

        if (shouldClear) {
          manualOverrideActive.value = false;
          manualOverrideDirection.value = OVERRIDE_NONE;
        }
        return;
      }
      if (y > COLLAPSE_THRESHOLD) {
        runOnJS(setCollapsedFromScroll)(true);
      } else if (y < EXPAND_THRESHOLD) {
        runOnJS(setCollapsedFromScroll)(false);
      }
    },
    [setCollapsedFromScroll]
  );

  const handleManualToggle = useCallback(() => {
    // Record the direction the toggle is moving INTO before flipping state.
    // If currently collapsed, user is expanding; otherwise collapsing.
    manualOverrideDirection.value = collapsed ? OVERRIDE_EXPAND : OVERRIDE_COLLAPSE;
    manualOverrideActive.value = true;
    setCollapsed((prev) => !prev);
  }, [manualOverrideActive, manualOverrideDirection, collapsed]);

  // Sticky-to-top: when collapsed, translate the anchor down by the current
  // scrollY so it visually stays at the top of the viewport.
  const stickyStyle = useAnimatedStyle(() => {
    if (!collapsed) {
      return { transform: [{ translateY: 0 }] };
    }
    return { transform: [{ translateY: Math.max(0, scrollY.value) }], zIndex: 10 };
  }, [collapsed]);

  const brief = getBrainStateBrief(brainState);
  const protocolText = protocolCompleted ? 'Protocol done' : 'Protocol ready';
  const fullAccessibilityLabel =
    `${brief.label}. ${brief.message} ${protocolText}.`;

  return (
    <Animated.View style={stickyStyle}>
      {!collapsed && (
        <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(250)}>
          <Pressable
            testID="dashboard-anchor-expanded-pressable"
            onPress={handleManualToggle}
            accessibilityLabel={fullAccessibilityLabel}
            accessibilityHint="Double-tap to collapse"
          >
            <DashboardAnchorExpanded brainState={brainState} />
          </Pressable>
        </Animated.View>
      )}
      {collapsed && (
        <Animated.View entering={FadeIn.duration(250)} exiting={FadeOut.duration(250)}>
          <DashboardAnchorCollapsed
            brainState={brainState}
            protocolCompleted={protocolCompleted}
            onChangePress={onChangeStatePress}
            onAnchorPress={handleManualToggle}
            accessibilityLabel={fullAccessibilityLabel}
            accessibilityHint="Double-tap to expand"
          />
        </Animated.View>
      )}
    </Animated.View>
  );
};

import React, { useCallback, useEffect, useState } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useAnimatedReaction,
  useSharedValue,
  withTiming,
  runOnJS,
  interpolate,
  Extrapolation,
} from 'react-native-reanimated';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { BrainState } from '../../../types';
import { BRAIN_STATE_BRIEFS } from './brainStateBriefs';
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
  // the scroll position crosses the opposite threshold.
  useAnimatedReaction(
    () => scrollY.value,
    (y) => {
      if (manualOverrideActive.value) {
        if (y > COLLAPSE_THRESHOLD || y < EXPAND_THRESHOLD) {
          manualOverrideActive.value = false;
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
    manualOverrideActive.value = true;
    setCollapsed((prev) => !prev);
  }, [manualOverrideActive]);

  // Sticky-to-top: when collapsed, translate the anchor down by the current
  // scrollY so it visually stays at the top of the viewport.
  const stickyStyle = useAnimatedStyle(() => {
    if (!collapsed) {
      return { transform: [{ translateY: 0 }] };
    }
    const translate = interpolate(
      scrollY.value,
      [0, 10000],
      [0, 10000],
      Extrapolation.CLAMP
    );
    return { transform: [{ translateY: translate }], zIndex: 10 };
  }, [collapsed]);

  // Cross-fade between expanded and collapsed views.
  const expandedOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(collapsed ? 0 : 1, { duration: 250 }),
  }), [collapsed]);
  const collapsedOpacity = useAnimatedStyle(() => ({
    opacity: withTiming(collapsed ? 1 : 0, { duration: 250 }),
  }), [collapsed]);

  const brief = BRAIN_STATE_BRIEFS[brainState];
  const protocolText = protocolCompleted ? 'Protocol done' : 'Protocol ready';
  const fullAccessibilityLabel =
    `${brief.label}. ${brief.message} ${protocolText}.`;

  return (
    <Animated.View
      style={stickyStyle}
      accessibilityLabel={fullAccessibilityLabel}
      accessibilityHint={collapsed ? 'Double-tap to expand' : 'Double-tap to collapse'}
    >
      {!collapsed && (
        <Animated.View style={expandedOpacity}>
          <Pressable
            testID="dashboard-anchor-expanded-pressable"
            onPress={handleManualToggle}
          >
            <DashboardAnchorExpanded brainState={brainState} />
          </Pressable>
        </Animated.View>
      )}
      {collapsed && (
        <Animated.View style={collapsedOpacity}>
          <DashboardAnchorCollapsed
            brainState={brainState}
            protocolCompleted={protocolCompleted}
            onChangePress={onChangeStatePress}
            onAnchorPress={handleManualToggle}
          />
        </Animated.View>
      )}
    </Animated.View>
  );
};

const styles = StyleSheet.create({});

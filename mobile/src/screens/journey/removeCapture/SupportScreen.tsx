/**
 * The screen shown when the crisis pre-check does not pass (slice 3c-i).
 *
 * IT NEVER RECEIVES THE TEXT. The only thing that travels here is the matched
 * category, an enum value used to order the resources, and it is a navigation
 * param held in memory: this app does not persist navigation state (no
 * `initialState` / `onStateChange` in AppNavigator), so nothing about this
 * screen reaches storage. The screen has no field the user's words could be
 * rendered into, which is what makes "never echo or paraphrase" structural
 * rather than a rule someone has to remember.
 *
 * IT STORES NOTHING. The only telemetry is a bare `safety_precheck_shown` with
 * an empty payload; the event's own type is `Record<string, never>`, so a
 * careless call site cannot add the text or the category to it.
 *
 * IT DOES NOT NAME WHAT IT MATCHED. The category orders two rows and is never
 * rendered, described, or implied. Telling someone which word tripped a filter
 * reads as being scanned and invites rephrasing to get past it.
 *
 * IT DOES NOT ASK THEM TO TRY AGAIN. One action, back to Today.
 *
 * NO CORAL, NO ALARM ICONOGRAPHY, NO SEVERITY TIERS. Ordinary body text
 * throughout, including the immediate-danger line, which is the one line that
 * must not be skipped and which styling as an alert is exactly how it would be.
 */
import React, { useCallback, useEffect, useState } from 'react';
import { LayoutAnimation, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation, useRoute } from '@react-navigation/native';

import { Colors, Layout, Spacing, Typography } from '../../../constants';
import { useAuth } from '../../../context/AuthContext';
import { useReducedMotion } from '../../../hooks/useReducedMotion';
import { logEvent } from '../../../services/firebase/analyticsEvents.service';
import { SAFETY_COPY } from '../../../safety/safetyCopy';
import { orderResources } from '../../../safety/resourceOrder';
import type { PrecheckCategory } from '../../../safety/textPrecheck';

const MIN_TOUCH_TARGET = 48;

export const SupportScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<any>();
  const { user } = useAuth();
  const reduceMotion = useReducedMotion();
  const [expanded, setExpanded] = useState(false);

  // The matched category, when the pre-check supplied one. Undefined is a
  // legitimate state (the screen reached any other way) and orders the general
  // second door rather than guessing.
  const category = route.params?.category as PrecheckCategory | undefined;
  const { surfaced, collapsed } = orderResources(category);

  // Fired once on mount, empty payload. The ONLY telemetry this path produces.
  useEffect(() => {
    if (user?.uid) logEvent(user.uid, 'safety_precheck_shown', {});
  }, [user?.uid]);

  const toggle = useCallback(() => {
    // Section 5.2: a short fade, or nothing at all when Reduce Motion is on.
    // The expander must open either way, so the animation is the only thing
    // the preference removes.
    if (!reduceMotion) {
      LayoutAnimation.configureNext(
        LayoutAnimation.create(180, LayoutAnimation.Types.easeInEaseOut, LayoutAnimation.Properties.opacity)
      );
    }
    setExpanded((open) => !open);
  }, [reduceMotion]);

  const onAction = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <ScrollView contentContainerStyle={styles.container} testID="safety-support-screen">
      <Text style={styles.title}>{SAFETY_COPY.title}</Text>
      <Text style={styles.body}>{SAFETY_COPY.body}</Text>

      <Text style={styles.privacy} testID="safety-support-privacy">
        {SAFETY_COPY.privacy}
      </Text>

      {/* Its own element, always shown, between the privacy line and the
          resources. Plain body text by design. */}
      <Text style={styles.immediateDanger} testID="safety-support-immediate-danger">
        {SAFETY_COPY.immediateDanger}
      </Text>

      <View style={styles.resources} testID="safety-support-resources">
        <Text style={styles.resourcesHeading}>{SAFETY_COPY.resourcesHeading}</Text>

        {surfaced.map((resource) => (
          <View key={resource.id} style={styles.resource} testID={`safety-resource-${resource.id}`}>
            <Text style={styles.resourceLabel}>{resource.label}</Text>
            <Text style={styles.resourceDetail}>{resource.detail}</Text>
          </View>
        ))}

        {collapsed.length > 0 && (
          <>
            <TouchableOpacity
              style={styles.expander}
              onPress={toggle}
              accessibilityRole="button"
              accessibilityState={{ expanded }}
              accessibilityLabel={SAFETY_COPY.expander}
              testID="safety-support-expander"
            >
              <Text style={styles.expanderLabel}>{SAFETY_COPY.expander}</Text>
            </TouchableOpacity>

            {expanded &&
              collapsed.map((resource) => (
                <View
                  key={resource.id}
                  style={styles.resource}
                  testID={`safety-resource-${resource.id}`}
                >
                  <Text style={styles.resourceLabel}>{resource.label}</Text>
                  <Text style={styles.resourceDetail}>{resource.detail}</Text>
                </View>
              ))}
          </>
        )}
      </View>

      <TouchableOpacity
        style={styles.action}
        onPress={onAction}
        activeOpacity={0.8}
        accessibilityRole="button"
        accessibilityLabel={SAFETY_COPY.action}
        testID="safety-support-action"
      >
        <Text style={styles.actionLabel}>{SAFETY_COPY.action}</Text>
      </TouchableOpacity>
    </ScrollView>
  );
};

const styles = StyleSheet.create({
  container: {
    padding: Spacing.lg,
    flexGrow: 1,
    justifyContent: 'center',
  },
  title: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.md,
  },
  body: {
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    lineHeight: Typography.fontSize.base * 1.5,
  },
  privacy: {
    marginTop: Spacing.base,
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
  },
  immediateDanger: {
    marginTop: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.softCharcoal,
  },
  resources: {
    marginTop: Spacing.lg,
  },
  resourcesHeading: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.sm,
  },
  resource: {
    marginBottom: Spacing.base,
  },
  resourceLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  resourceDetail: {
    fontSize: Typography.fontSize.sm,
    color: Colors.softCharcoal,
  },
  expander: {
    minHeight: MIN_TOUCH_TARGET,
    justifyContent: 'center',
  },
  expanderLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
  },
  action: {
    marginTop: Spacing.xl,
    minHeight: MIN_TOUCH_TARGET,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.evergreenTeal,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.md,
  },
  actionLabel: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
});

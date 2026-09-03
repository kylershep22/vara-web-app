/**
 * The screen shown when the crisis pre-check does not pass (slice 3c-i).
 *
 * IT STORES NOTHING. No text, no category, no derived signal, no route param.
 * The only thing that leaves this screen is a bare `safety_precheck_shown`
 * event with an empty payload, which records that the screen appeared and
 * nothing about who saw it or why.
 *
 * IT DOES NOT NAME WHAT IT MATCHED, and must not start. Telling someone which
 * word tripped a filter reads as being scanned, and it invites rephrasing to
 * get past it, which is the opposite of what this moment is for.
 *
 * IT DOES NOT ASK THEM TO TRY AGAIN. There is one action and it goes back to
 * Today. Offering "edit your answer" would read as "say that differently so we
 * can file it".
 *
 * EVERY STRING HERE IS A PLACEHOLDER pending Jen, and
 * safety/__tests__/safetyCopy.authored.test.ts is red until they land.
 */
import React, { useCallback, useEffect } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { useNavigation } from '@react-navigation/native';

import { Colors, Layout, Spacing, Typography } from '../../../constants';
import { useAuth } from '../../../context/AuthContext';
import { logEvent } from '../../../services/firebase/analyticsEvents.service';
import { SAFETY_COPY, SAFETY_RESOURCES } from '../../../safety/safetyCopy';

const MIN_TOUCH_TARGET = 48;

export const SupportScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  // Fired once on mount, with an empty payload. This is the ONLY telemetry the
  // failing path produces.
  useEffect(() => {
    if (user?.uid) logEvent(user.uid, 'safety_precheck_shown', {});
  }, [user?.uid]);

  // Returns to Today. The capture context is left untouched and unmounts with
  // the flow, so the answer that brought them here is not carried anywhere.
  const onAction = useCallback(() => {
    navigation.goBack();
  }, [navigation]);

  return (
    <ScrollView contentContainerStyle={styles.container} testID="safety-support-screen">
      <Text style={styles.title}>{SAFETY_COPY.title}</Text>
      <Text style={styles.body}>{SAFETY_COPY.body}</Text>

      <View style={styles.resources} testID="safety-support-resources">
        <Text style={styles.resourcesHeading}>{SAFETY_COPY.resourcesHeading}</Text>
        {/* Renders a heading with nothing under it until Jen supplies the list.
            That looks unfinished because it is; a guessed crisis number would
            be the single most damaging string this app could carry. */}
        {SAFETY_RESOURCES.map((resource) => (
          <View key={resource.label} style={styles.resource}>
            <Text style={styles.resourceLabel}>{resource.label}</Text>
            <Text style={styles.resourceDetail}>{resource.detail}</Text>
          </View>
        ))}
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
  resources: {
    marginTop: Spacing.lg,
  },
  resourcesHeading: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    marginBottom: Spacing.sm,
  },
  resource: {
    marginBottom: Spacing.sm,
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

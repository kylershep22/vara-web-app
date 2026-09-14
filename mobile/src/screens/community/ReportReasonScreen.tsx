/**
 * Report Reason Screen (Stage 2)
 * User selects a reason for reporting a post
 */

import React from 'react';
import {
  View,
  TouchableOpacity,
  StyleSheet,
  ScrollView,
} from 'react-native';
// SAFE AREA FROM `react-native-safe-area-context`, NOT FROM `react-native`
// (R2). The RN component applies on iOS only and applies ALL FOUR edges; on
// Android it is a plain View, and app.json sets `edgeToEdgeEnabled: true`
// there, so this screen was drawing under the system bars with nothing
// reserving space. The context version is what the other 80 files in `src/`
// already use, and `edges` makes the choice explicit rather than implied.
import { SafeAreaView } from 'react-native-safe-area-context';
import { useTabBarInset } from '../../hooks/useTabBarInset';
import Text from '../../components/shared/Text';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { REPORT_REASONS } from '../../types/moderation';

const ReportReasonScreen = ({ navigation, route }: any) => {
  // Bottom clearance for the floating tab bar (12.2). This screen sits inside
  // the Community tab, so the bar is visible over it.
  const tabBarInset = useTabBarInset();
  const { postId, reportedUserId } = route.params ?? {};

  if (!postId || !reportedUserId) {
    navigation.goBack();
    return null;
  }

  const handleSelectReason = (reasonId: string) => {
    navigation.navigate('ReportDetail', {
      postId,
      reportedUserId,
      reason: reasonId,
    });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Nav bar */}
      <View style={styles.navBar}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Icon name="chevron-left" size={24} color={Colors.evergreenTeal} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Report this post</Text>
        <View style={styles.navSpacer} />
      </View>

      <ScrollView
        style={styles.content}
        contentContainerStyle={[
          styles.contentContainer,
          { paddingBottom: tabBarInset },
        ]}
      >
        {/* Heading */}
        <Text style={styles.heading} accessibilityRole="header">
          What's going on?
        </Text>
        <Text style={styles.subheading}>
          We want this to be a safe, supportive space. Let us know what felt off.
        </Text>

        {/* Reason list */}
        <View style={styles.reasonList}>
          {REPORT_REASONS.map((reason) => (
            <TouchableOpacity
              key={reason.id}
              style={styles.reasonItem}
              onPress={() => handleSelectReason(reason.id)}
              activeOpacity={0.7}
              accessibilityLabel={`${reason.label}. ${reason.description}`}
              accessibilityRole="button"
            >
              <View style={styles.reasonTextContainer}>
                <Text style={styles.reasonLabel}>{reason.label}</Text>
                <Text style={styles.reasonDescription}>{reason.description}</Text>
              </View>
              <Icon name="chevron-right" size={16} color={Colors.silverSage} />
            </TouchableOpacity>
          ))}
        </View>
      </ScrollView>
    </SafeAreaView>
  );
};

export default ReportReasonScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    height: Layout.headerHeight,
    paddingHorizontal: Spacing.base,
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    padding: Spacing.xs,
  },
  navTitle: {
    flex: 1,
    textAlign: 'center',
    fontSize: 18,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
  navSpacer: {
    width: 32,
  },
  content: {
    flex: 1,
  },
  contentContainer: {
    // PADDING SPLIT AT R2. This was a uniform `padding: Spacing.lg`, which made
    // the bottom clearance 24 by accident rather than by decision. The three
    // sides that are not the bottom keep 24; the bottom comes from
    // `useTabBarInset()` at the call site.
    paddingTop: Spacing.lg,
    paddingHorizontal: Spacing.lg,
  },
  heading: {
    fontSize: 22,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
  },
  subheading: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.mutedSageGray,
    lineHeight: 21,
    marginBottom: Spacing.lg,
  },
  reasonList: {
    gap: 10,
  },
  reasonItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.white,
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.base,
  },
  reasonTextContainer: {
    flex: 1,
  },
  reasonLabel: {
    fontSize: 16,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
  reasonDescription: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },
});

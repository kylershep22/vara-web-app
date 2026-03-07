/**
 * Report Reason Screen (Stage 2)
 * User selects a reason for reporting a post
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
  ScrollView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { REPORT_REASONS } from '../../types/moderation';

const ReportReasonScreen = ({ navigation, route }: any) => {
  const { postId, reportedUserId } = route.params;

  const handleSelectReason = (reasonId: string) => {
    navigation.navigate('ReportDetail', {
      postId,
      reportedUserId,
      reason: reasonId,
    });
  };

  return (
    <SafeAreaView style={styles.container}>
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
        contentContainerStyle={styles.contentContainer}
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
    padding: Spacing.lg,
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

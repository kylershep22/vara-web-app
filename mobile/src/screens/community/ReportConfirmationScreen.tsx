/**
 * Report Confirmation Screen (Stage 4)
 * Shows confirmation that the report was received
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  StyleSheet,
  SafeAreaView,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Typography, Layout } from '../../constants';

const ReportConfirmationScreen = ({ navigation }: any) => {
  const handleReturn = () => {
    // Pop all 3 report screens to get back to the community feed
    navigation.pop(3);
  };

  return (
    <SafeAreaView style={styles.container}>
      {/* Close button */}
      <TouchableOpacity
        style={styles.closeButton}
        onPress={handleReturn}
        hitSlop={{ top: 10, bottom: 10, left: 10, right: 10 }}
        accessibilityLabel="Close"
        accessibilityRole="button"
      >
        <Icon name="close" size={24} color={Colors.mutedSageGray} />
      </TouchableOpacity>

      {/* Centered content */}
      <View style={styles.content}>
        {/* Check icon */}
        <View
          style={styles.checkIcon}
          accessibilityElementsHidden
          importantForAccessibility="no"
        >
          <Icon name="check" size={28} color={Colors.evergreenTeal} />
        </View>

        <Text style={styles.heading} accessibilityRole="header">
          Report received
        </Text>

        <Text style={styles.body}>
          We'll review this thoughtfully. Thank you for helping keep the community safe.
        </Text>

        <TouchableOpacity
          style={styles.primaryButton}
          onPress={handleReturn}
          activeOpacity={0.7}
        >
          <Text style={styles.primaryButtonText}>Return to Community</Text>
        </TouchableOpacity>
      </View>
    </SafeAreaView>
  );
};

export default ReportConfirmationScreen;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.white,
  },
  closeButton: {
    position: 'absolute',
    top: 56,
    right: Spacing.base,
    padding: Spacing.sm,
    zIndex: 1,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  checkIcon: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: 'rgba(27, 94, 87, 0.06)',
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  heading: {
    fontSize: 22,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginBottom: 10,
    textAlign: 'center',
  },
  body: {
    fontSize: 16,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    lineHeight: 24,
    marginBottom: Spacing.xl,
  },
  primaryButton: {
    height: Layout.buttonHeight.md,
    backgroundColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    maxWidth: 260,
    width: '100%',
  },
  primaryButtonText: {
    fontSize: 16,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.white,
  },
});

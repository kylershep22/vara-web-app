/**
 * FeaturePreviewBottomSheet Component
 * Bottom sheet that previews upcoming features
 *
 * Replaces the old lock screen with an inviting preview experience.
 * Shows feature description, what's inside, and availability note.
 */

import React, { useCallback } from 'react';
import {
  View,
  StyleSheet,
  TouchableOpacity,
  Modal,
  Pressable,
  ScrollView,
  Text,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { DiscoverableFeatureId, FeaturePreviewContent } from '../../types/featureDiscovery';
import { FEATURE_PREVIEW_CONTENT } from '../../constants/featureDiscovery';
import { useReducedMotion } from '../../hooks';
import Button from '../Button';

interface FeaturePreviewBottomSheetProps {
  visible: boolean;
  featureId: DiscoverableFeatureId | null;
  isAvailable: boolean;
  onDismiss: () => void;
  onNavigate?: () => void;
}

const ICON_CIRCLE_SIZE = 48;
const ICON_SIZE = 32;
const CHECK_ICON_SIZE = 16;

const FeaturePreviewBottomSheet: React.FC<FeaturePreviewBottomSheetProps> = ({
  visible,
  featureId,
  isAvailable,
  onDismiss,
  onNavigate,
}) => {
  const insets = useSafeAreaInsets();
  const navigation = useNavigation<any>();
  const reduceMotion = useReducedMotion();

  const content: FeaturePreviewContent | null = featureId
    ? FEATURE_PREVIEW_CONTENT[featureId]
    : null;

  const handleNavigate = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();

    if (onNavigate) {
      onNavigate();
    } else if (content?.navigationTarget) {
      // Small delay to let the modal close
      setTimeout(() => {
        navigation.navigate(content.navigationTarget);
      }, 100);
    }
  }, [onDismiss, onNavigate, content, navigation]);

  const handleDismiss = useCallback(() => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onDismiss();
  }, [onDismiss]);

  if (!content) {
    return null;
  }

  return (
    <Modal
      visible={visible}
      transparent
      animationType={reduceMotion ? 'fade' : 'slide'}
      onRequestClose={handleDismiss}
    >
      {/* Overlay */}
      <Pressable
        style={styles.overlay}
        onPress={handleDismiss}
        accessibilityLabel="Close preview"
        accessibilityRole="button"
      >
        <View />
      </Pressable>

      {/* Bottom Sheet */}
      <View
        style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.xl }]}
        accessibilityViewIsModal={true}
        accessibilityLabel={`${content.title} preview`}
      >
        {/* Handle Bar */}
        <View style={styles.handleContainer} accessibilityElementsHidden={true}>
          <View style={styles.handle} />
        </View>

        <ScrollView
          style={styles.scrollContent}
          contentContainerStyle={styles.scrollContentContainer}
          showsVerticalScrollIndicator={false}
          bounces={false}
        >
          {/* Feature Icon + Title Row */}
          <View style={styles.headerRow}>
            <View style={styles.iconCircle}>
              <Icon
                name={content.icon as any}
                size={ICON_SIZE}
                color={Colors.evergreenTeal}
              />
            </View>
            <View style={styles.headerText}>
              <Text style={styles.title}>{content.title}</Text>
              <Text style={styles.tagline}>{content.tagline}</Text>
            </View>
          </View>

          {/* Description */}
          <Text style={styles.description}>{content.description}</Text>

          {/* What's Inside Section */}
          <View style={styles.whatsInsideSection}>
            <Text style={styles.sectionLabel}>WHAT'S INSIDE</Text>
            {content.whatsInside.map((item, index) => (
              <View key={index} style={styles.whatsInsideItem}>
                <Icon
                  name="check"
                  size={CHECK_ICON_SIZE}
                  color={Colors.evergreenTeal}
                />
                <Text style={styles.whatsInsideText}>{item}</Text>
              </View>
            ))}
          </View>

          {/* Availability Note (only shown when upcoming) */}
          {!isAvailable && (
            <View style={styles.availabilityNote}>
              <Icon
                name="white-balance-sunny"
                size={18}
                color={Colors.sunriseAmber}
                style={styles.availabilityIcon}
              />
              <Text style={styles.availabilityText}>
                {content.availabilityNote}
              </Text>
            </View>
          )}
        </ScrollView>

        {/* CTA Button */}
        <View style={styles.buttonContainer}>
          {isAvailable ? (
            <Button
              variant="primary"
              onPress={handleNavigate}
              fullWidth
              accessibilityLabel={content.ctaAvailable}
              accessibilityRole="button"
            >
              {content.ctaAvailable}
            </Button>
          ) : (
            <View
              style={styles.mutedButton}
              accessibilityLabel="This feature will be available soon as you continue exploring the app"
              accessibilityRole="text"
            >
              <Text style={styles.mutedButtonText}>Available soon</Text>
            </View>
          )}
        </View>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.25)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: 16,
    borderTopRightRadius: 16,
    paddingHorizontal: 20,
    maxHeight: '80%',
    shadowColor: Colors.shadow,
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: 12,
    paddingBottom: 12,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.silverSage,
    borderRadius: 2,
  },
  scrollContent: {
    flexGrow: 0,
  },
  scrollContentContainer: {
    paddingBottom: Spacing.md,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  iconCircle: {
    width: ICON_CIRCLE_SIZE,
    height: ICON_CIRCLE_SIZE,
    borderRadius: 12,
    backgroundColor: `${Colors.dewSage}99`, // 60% opacity
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerText: {
    marginLeft: 12,
    flex: 1,
  },
  title: {
    fontSize: 18,
    fontWeight: '600',
    color: Colors.evergreenTeal,
  },
  tagline: {
    fontSize: 14,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  description: {
    fontSize: 14,
    fontWeight: '400',
    color: Colors.softCharcoal,
    lineHeight: 14 * 1.6,
    marginTop: Spacing.md,
    marginBottom: Spacing.md,
  },
  whatsInsideSection: {
    marginTop: Spacing.sm,
  },
  sectionLabel: {
    fontSize: 12,
    fontWeight: '500',
    color: Colors.textSecondary,
    letterSpacing: 0.24,
    marginBottom: Spacing.sm,
  },
  whatsInsideItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.sm,
    gap: 8,
  },
  whatsInsideText: {
    fontSize: 14,
    color: Colors.softCharcoal,
    lineHeight: 14 * 1.5,
    flex: 1,
  },
  availabilityNote: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: `${Colors.dewSage}66`, // 40% opacity
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 14,
    marginTop: Spacing.md,
  },
  availabilityIcon: {
    marginTop: 2,
  },
  availabilityText: {
    fontSize: 14,
    color: Colors.softCharcoal,
    lineHeight: 14 * 1.5,
    marginLeft: 8,
    flex: 1,
  },
  buttonContainer: {
    marginTop: Spacing.md,
  },
  mutedButton: {
    backgroundColor: `${Colors.silverSage}66`, // 40% opacity
    borderRadius: 10,
    height: 46,
    justifyContent: 'center',
    alignItems: 'center',
  },
  mutedButtonText: {
    fontSize: 16,
    fontWeight: '500',
    color: Colors.textSecondary,
  },
});

export default FeaturePreviewBottomSheet;

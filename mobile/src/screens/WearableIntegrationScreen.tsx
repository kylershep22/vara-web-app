/**
 * Wearable Integration Screen
 * Coming Soon placeholder for wearable device integration
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Image } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Button, BaseCard } from '../components';
import { Colors, Spacing, Typography, Layout } from '../constants';

interface WearableDevice {
  id: string;
  name: string;
  icon: string;
  description: string;
  status: 'coming-soon' | 'available';
}

const WEARABLE_DEVICES: WearableDevice[] = [
  {
    id: 'apple-watch',
    name: 'Apple Watch',
    icon: 'watch',
    description: 'Sync activity, heart rate, and sleep data from your Apple Watch',
    status: 'coming-soon',
  },
  {
    id: 'fitbit',
    name: 'Fitbit',
    icon: 'watch-variant',
    description: 'Connect your Fitbit to track steps, exercise, and sleep patterns',
    status: 'coming-soon',
  },
  {
    id: 'garmin',
    name: 'Garmin',
    icon: 'watch-vibrate',
    description: 'Import fitness metrics and stress tracking from Garmin devices',
    status: 'coming-soon',
  },
  {
    id: 'oura',
    name: 'Oura Ring',
    icon: 'ring',
    description: 'Track sleep quality, readiness score, and activity with Oura',
    status: 'coming-soon',
  },
  {
    id: 'whoop',
    name: 'WHOOP',
    icon: 'arm-flex',
    description: 'Sync strain, recovery, and sleep data from your WHOOP band',
    status: 'coming-soon',
  },
  {
    id: 'health-apps',
    name: 'Apple Health & Google Fit',
    icon: 'heart-pulse',
    description: 'Connect to Apple Health or Google Fit as a central hub',
    status: 'coming-soon',
  },
];

const WearableIntegrationScreen: React.FC = () => {
  const navigation = useNavigation();

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Hero Section */}
        <View style={styles.heroSection}>
          <View style={styles.comingSoonBadge}>
            <Icon name="clock-outline" size={16} color={Colors.evergreenTeal} />
            <Text style={styles.comingSoonText}>Coming Soon</Text>
          </View>

          <View style={styles.iconCircle}>
            <Icon name="watch" size={48} color={Colors.evergreenTeal} />
          </View>

          <Text style={styles.heroTitle}>Wearable Integration</Text>
          <Text style={styles.heroSubtitle}>
            Connect your favorite wearables to automatically sync health data
            and get personalized insights based on your real-world metrics.
          </Text>
        </View>

        {/* Benefits Section */}
        <View style={styles.benefitsSection}>
          <Text style={styles.sectionTitle}>What You'll Get</Text>

          <View style={styles.benefitRow}>
            <View style={styles.benefitIcon}>
              <Icon name="sync" size={20} color={Colors.evergreenTeal} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Automatic Sync</Text>
              <Text style={styles.benefitDescription}>
                Your activity, sleep, and wellness data syncs seamlessly in the background
              </Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <View style={styles.benefitIcon}>
              <Icon name="brain" size={20} color={Colors.evergreenTeal} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Smarter Insights</Text>
              <Text style={styles.benefitDescription}>
                AI recommendations adapt based on your actual sleep, stress, and activity levels
              </Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <View style={styles.benefitIcon}>
              <Icon name="target" size={20} color={Colors.evergreenTeal} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Goal Tracking</Text>
              <Text style={styles.benefitDescription}>
                Automatically track fitness and wellness goals with real data
              </Text>
            </View>
          </View>

          <View style={styles.benefitRow}>
            <View style={styles.benefitIcon}>
              <Icon name="chart-timeline-variant" size={20} color={Colors.evergreenTeal} />
            </View>
            <View style={styles.benefitContent}>
              <Text style={styles.benefitTitle}>Trend Analysis</Text>
              <Text style={styles.benefitDescription}>
                See how your habits impact your health metrics over time
              </Text>
            </View>
          </View>
        </View>

        {/* Devices Section */}
        <View style={styles.devicesSection}>
          <Text style={styles.sectionTitle}>Supported Devices</Text>
          <Text style={styles.sectionSubtitle}>
            We're working on integrations for these popular wearables
          </Text>

          <View style={styles.devicesGrid}>
            {WEARABLE_DEVICES.map((device) => (
              <View key={device.id} style={styles.deviceCard}>
                <View style={styles.deviceIconContainer}>
                  <Icon name={device.icon as any} size={28} color={Colors.textSecondary} />
                </View>
                <Text style={styles.deviceName}>{device.name}</Text>
              </View>
            ))}
          </View>
        </View>

        {/* Notify Section */}
        <BaseCard style={styles.notifyCard}>
          <Icon name="bell-outline" size={32} color={Colors.evergreenTeal} />
          <Text style={styles.notifyTitle}>Get Notified</Text>
          <Text style={styles.notifyDescription}>
            We'll let you know as soon as wearable integration is available.
            Your notification preferences already have you covered.
          </Text>
          <View style={styles.notifyBadge}>
            <Icon name="check-circle" size={16} color={Colors.success} />
            <Text style={styles.notifyBadgeText}>You're on the list</Text>
          </View>
        </BaseCard>

        {/* Back Button */}
        <Button
          variant="outline"
          onPress={() => navigation.goBack()}
          style={styles.backButton}
        >
          Back to Wellness
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  scrollContent: {
    padding: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  // Hero Section
  heroSection: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  comingSoonBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.evergreenTeal + '15',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.full,
    marginBottom: Spacing.lg,
    gap: Spacing.xs,
  },
  comingSoonText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold as any,
    fontSize: Typography.fontSize.sm,
  },
  iconCircle: {
    width: 100,
    height: 100,
    borderRadius: 50,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  heroTitle: {
    fontSize: Typography.fontSize['2xl'],
    fontWeight: Typography.fontWeight.bold as any,
    color: Colors.softCharcoal,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  heroSubtitle: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.fontSize.base * 1.5,
    paddingHorizontal: Spacing.base,
  },
  // Benefits Section
  benefitsSection: {
    marginBottom: Spacing.xl,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.softCharcoal,
    marginBottom: Spacing.base,
  },
  sectionSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginBottom: Spacing.base,
  },
  benefitRow: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    marginBottom: Spacing.base,
    backgroundColor: Colors.surface,
    padding: Spacing.base,
    borderRadius: Layout.borderRadius.md,
  },
  benefitIcon: {
    width: 40,
    height: 40,
    borderRadius: 20,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  benefitContent: {
    flex: 1,
  },
  benefitTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.softCharcoal,
    marginBottom: 4,
  },
  benefitDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    lineHeight: Typography.fontSize.sm * 1.4,
  },
  // Devices Section
  devicesSection: {
    marginBottom: Spacing.xl,
  },
  devicesGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  deviceCard: {
    width: '31%',
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    alignItems: 'center',
    borderWidth: 1,
    borderColor: Colors.borderLight,
    borderStyle: 'dashed',
  },
  deviceIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.borderLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  deviceName: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium as any,
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  // Notify Section
  notifyCard: {
    alignItems: 'center',
    padding: Spacing.xl,
    marginBottom: Spacing.lg,
    backgroundColor: Colors.evergreenTeal + '08',
    borderWidth: 1,
    borderColor: Colors.evergreenTeal + '20',
  },
  notifyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold as any,
    color: Colors.softCharcoal,
    marginTop: Spacing.base,
    marginBottom: Spacing.sm,
  },
  notifyDescription: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    lineHeight: Typography.fontSize.sm * 1.5,
    marginBottom: Spacing.base,
  },
  notifyBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.success + '15',
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.full,
  },
  notifyBadgeText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.success,
    fontWeight: Typography.fontWeight.medium as any,
  },
  // Back Button
  backButton: {
    marginTop: Spacing.base,
  },
});

export default WearableIntegrationScreen;

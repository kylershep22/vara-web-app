/**
 * Discover Screen
 * Main hub for wellness library content
 */

import React, { useState } from 'react';
import { View, StyleSheet, ScrollView, RefreshControl, TouchableOpacity } from 'react-native';
import { Text, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Layout, Typography } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { CategoryHeader } from '../../components/library/CategoryHeader';

export default function DiscoverScreen() {
  const navigation = useNavigation();
  const { user } = useAuth();
  const [refreshing, setRefreshing] = useState(false);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Refresh logic here
    setTimeout(() => setRefreshing(false), 1000);
  };

  const categories = [
    {
      title: 'Breathwork',
      icon: 'lungs',
      description: 'Calm your nervous system & sharpen focus',
      color: Colors.evergreenTeal,
      screen: 'Breathwork',
    },
    {
      title: 'Sleep',
      icon: 'moon-waning-crescent',
      description: 'Brain cleanup & memory consolidation',
      color: '#7E57C2', // Purple
      screen: 'Sleep',
    },
    {
      title: 'Movement',
      icon: 'dumbbell',
      description: 'Boost blood flow & brain energy',
      color: Colors.sunriseAmber,
      screen: 'Movement',
    },
    {
      title: 'Masterclass',
      icon: 'school',
      description: 'Deep-dive brain health education',
      color: Colors.goldenApricot,
      screen: 'Masterclass',
    },
  ];

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
      >
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <IconButton
              icon="arrow-left"
              size={24}
              iconColor={Colors.evergreenTeal}
              onPress={() => navigation.goBack()}
              style={styles.backButton}
            />
            <View>
              <Text variant="headlineMedium" style={styles.headerTitle}>
                Discover
              </Text>
              <Text variant="bodyMedium" style={styles.headerSubtitle}>
                Science-backed tools for your brain & body
              </Text>
            </View>
          </View>
          <IconButton
            icon="account-circle"
            size={32}
            iconColor={Colors.evergreenTeal}
            onPress={() => navigation.navigate('ProfileStack' as never)}
          />
        </View>

        {/* Featured Section */}
        <View style={styles.featuredSection}>
          <View style={styles.featuredCard}>
            <Icon name="star-circle" size={48} color={Colors.sunriseAmber} />
            <Text variant="titleLarge" style={styles.featuredTitle}>
              Welcome to Discover
            </Text>
            <Text variant="bodyMedium" style={styles.featuredText}>
              Build focus, energy, resilience, growth, and connection through evidence-based practices.
            </Text>
          </View>
        </View>

        {/* Quick Categories */}
        <CategoryHeader title="Browse by Category" icon="compass" />

        <View style={styles.categoriesGrid}>
          {categories.map((category, index) => (
            <TouchableOpacity
              key={index}
              style={[styles.categoryCard, { borderColor: category.color }]}
              onPress={() => navigation.navigate(category.screen as never)}
              activeOpacity={0.7}
            >
              <View style={[styles.categoryIconContainer, { backgroundColor: category.color + '20' }]}>
                <Icon name={category.icon} size={32} color={category.color} />
              </View>
              <Text variant="titleMedium" style={styles.categoryTitle}>
                {category.title}
              </Text>
              <Text variant="bodySmall" style={styles.categoryDescription}>
                {category.description}
              </Text>
              <Icon
                name="chevron-right"
                size={20}
                color={Colors.textSecondary}
                style={styles.categoryArrow}
              />
            </TouchableOpacity>
          ))}
        </View>

        {/* Quick Access Links */}
        <View style={styles.quickLinksSection}>
          <CategoryHeader title="Popular Content" />

          <View style={styles.quickLinksList}>
            <TouchableOpacity
              style={styles.quickLink}
              onPress={() => navigation.navigate('Breathwork' as never)}
            >
              <Icon name="meditation" size={24} color={Colors.evergreenTeal} />
              <View style={styles.quickLinkContent}>
                <Text variant="titleSmall" style={styles.quickLinkTitle}>
                  Box Breathing
                </Text>
                <Text variant="bodySmall" style={styles.quickLinkSubtitle}>
                  5 min • Calm mind & build resilience
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLink}
              onPress={() => navigation.navigate('Sleep' as never)}
            >
              <Icon name="sleep" size={24} color={Colors.evergreenTeal} />
              <View style={styles.quickLinkContent}>
                <Text variant="titleSmall" style={styles.quickLinkTitle}>
                  Delta Waves
                </Text>
                <Text variant="bodySmall" style={styles.quickLinkSubtitle}>
                  3:43 min • Memory consolidation & brain cleanup
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>

            <TouchableOpacity
              style={styles.quickLink}
              onPress={() => navigation.navigate('Movement' as never)}
            >
              <Icon name="yoga" size={24} color={Colors.evergreenTeal} />
              <View style={styles.quickLinkContent}>
                <Text variant="titleSmall" style={styles.quickLinkTitle}>
                  Morning Mobility
                </Text>
                <Text variant="bodySmall" style={styles.quickLinkSubtitle}>
                  10 min • Wake up your body & brain
                </Text>
              </View>
              <Icon name="chevron-right" size={20} color={Colors.textSecondary} />
            </TouchableOpacity>
          </View>
        </View>

        {/* Bottom Spacing for FAB */}
        <View style={styles.bottomSpacing} />
      </ScrollView>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollView: {
    flex: 1,
  },
  scrollContent: {
    paddingBottom: Spacing['4xl'],
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingTop: Spacing.sm,
    paddingBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  backButton: {
    marginRight: Spacing.xs,
    marginLeft: -Spacing.xs,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
  },
  headerSubtitle: {
    color: Colors.textSecondary,
    marginTop: 2,
  },
  featuredSection: {
    paddingHorizontal: Spacing.md,
    marginBottom: Spacing.md,
  },
  featuredCard: {
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.xl,
    padding: Spacing.lg,
    alignItems: 'center',
    ...Layout.shadow.md,
  },
  featuredTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
    marginTop: Spacing.md,
    textAlign: 'center',
  },
  featuredText: {
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  categoriesGrid: {
    paddingHorizontal: Spacing.md,
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.md,
    marginTop: Spacing.sm,
  },
  categoryCard: {
    width: '47%',
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.md,
    borderWidth: 2,
    ...Layout.shadow.sm,
    minHeight: 160,
  },
  categoryIconContainer: {
    width: 56,
    height: 56,
    borderRadius: Layout.borderRadius.lg,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  categoryTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 4,
  },
  categoryDescription: {
    color: Colors.textSecondary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
    flex: 1,
  },
  categoryArrow: {
    alignSelf: 'flex-end',
    marginTop: Spacing.xs,
  },
  quickLinksSection: {
    marginTop: Spacing.lg,
  },
  quickLinksList: {
    paddingHorizontal: Spacing.md,
    gap: Spacing.sm,
  },
  quickLink: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.md,
    ...Layout.shadow.sm,
    gap: Spacing.md,
  },
  quickLinkContent: {
    flex: 1,
  },
  quickLinkTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  quickLinkSubtitle: {
    color: Colors.textSecondary,
    marginTop: 2,
  },
  bottomSpacing: {
    height: Spacing['4xl'],
  },
});

/**
 * More Menu Screen
 * Central hub for additional app sections
 */

import React from 'react';
import { View, StyleSheet, ScrollView, TouchableOpacity } from 'react-native';
import { Text } from 'react-native-paper';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { useAuth } from '../context/AuthContext';

interface MenuItem {
  id: string;
  title: string;
  description: string;
  icon: string;
  iconColor: string;
  route: string;
  navigator?: string;
}

const MENU_ITEMS: MenuItem[] = [
  {
    id: 'discover',
    title: 'Discover',
    description: 'Explore wellness library, breathwork, and more',
    icon: 'compass-outline',
    iconColor: Colors.evergreenTeal,
    route: 'DiscoverNavigator',
  },
  {
    id: 'journal',
    title: 'Journal',
    description: 'Personal journaling with AI prompts',
    icon: 'book-open-page-variant',
    iconColor: Colors.lavenderMist,
    route: 'Journal',
  },
  {
    id: 'profile',
    title: 'Profile',
    description: 'View and edit your profile',
    icon: 'account-circle-outline',
    iconColor: Colors.evergreenTeal,
    route: 'ProfileStack',
  },
  {
    id: 'settings',
    title: 'Settings',
    description: 'App preferences and account settings',
    icon: 'cog-outline',
    iconColor: Colors.textSecondary,
    route: 'ProfileStack',
    navigator: 'Settings',
  },
];

export default function MoreMenuScreen() {
  const navigation = useNavigation<any>();
  const { user } = useAuth();

  const handleItemPress = (item: MenuItem) => {
    if (item.navigator) {
      // Navigate to a nested screen within a navigator
      navigation.navigate(item.route, { screen: item.navigator });
    } else {
      // Navigate directly to a screen or navigator
      navigation.navigate(item.route);
    }
  };

  return (
    <ScrollView style={styles.container} showsVerticalScrollIndicator={false}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerContent}>
          <Icon name="dots-horizontal" size={32} color={Colors.evergreenTeal} />
          <View style={styles.headerText}>
            <Text variant="headlineMedium" style={styles.title}>
              More
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Explore additional features
            </Text>
          </View>
        </View>
      </View>

      {/* Menu Items */}
      <View style={styles.content}>
        {MENU_ITEMS.map((item) => (
          <TouchableOpacity
            key={item.id}
            style={styles.menuItem}
            onPress={() => handleItemPress(item)}
            activeOpacity={0.7}
          >
            <View style={[styles.iconContainer, { backgroundColor: item.iconColor + '15' }]}>
              <Icon name={item.icon} size={28} color={item.iconColor} />
            </View>
            <View style={styles.menuItemContent}>
              <Text variant="titleMedium" style={styles.menuItemTitle}>
                {item.title}
              </Text>
              <Text variant="bodySmall" style={styles.menuItemDescription}>
                {item.description}
              </Text>
            </View>
            <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
          </TouchableOpacity>
        ))}
      </View>

      {/* User Info Section */}
      {user && (
        <View style={styles.userSection}>
          <View style={styles.userInfo}>
            <Icon name="account-circle" size={48} color={Colors.evergreenTeal} />
            <View style={styles.userDetails}>
              <Text variant="titleMedium" style={styles.userName}>
                {user.displayName || 'User'}
              </Text>
              <Text variant="bodySmall" style={styles.userEmail}>
                {user.email}
              </Text>
            </View>
          </View>
        </View>
      )}

      {/* App Info */}
      <View style={styles.appInfo}>
        <Text variant="bodySmall" style={styles.appInfoText}>
          Vara Wellness App
        </Text>
        <Text variant="bodySmall" style={styles.appInfoText}>
          Version 1.0.0
        </Text>
      </View>
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    backgroundColor: Colors.surface,
    paddingTop: Spacing.xl,
    paddingBottom: Spacing.lg,
    paddingHorizontal: Spacing.lg,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerContent: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  headerText: {
    flex: 1,
  },
  title: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs / 2,
  },
  content: {
    padding: Spacing.lg,
  },
  menuItem: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.borderLight,
  },
  iconContainer: {
    width: 56,
    height: 56,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  menuItemContent: {
    flex: 1,
  },
  menuItemTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.xs / 2,
  },
  menuItemDescription: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  userSection: {
    padding: Spacing.lg,
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginTop: Spacing.md,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.borderLight,
  },
  userInfo: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  userDetails: {
    flex: 1,
  },
  userName: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  userEmail: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs / 2,
  },
  appInfo: {
    padding: Spacing.lg,
    alignItems: 'center',
    marginTop: Spacing.md,
  },
  appInfoText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
    marginBottom: Spacing.xs / 2,
  },
});

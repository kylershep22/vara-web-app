/**
 * Home Screen (Temporary)
 * Placeholder for authenticated users until dashboard is built
 */

import React from 'react';
import { View, StyleSheet, ScrollView } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Card } from '../components';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { useAuth } from '../context/AuthContext';

const HomeScreen: React.FC = () => {
  const { user, logout, isLoading } = useAuth();

  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout error:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Header */}
        <View style={styles.header}>
          <Text variant="displayMedium" style={styles.title}>
            Welcome, {user?.displayName || 'User'}!
          </Text>
          <Text variant="bodyLarge" style={styles.subtitle}>
            You're successfully logged in 🎉
          </Text>
        </View>

        {/* User Info Card */}
        <Card style={styles.card}>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Your Account
          </Text>
          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.label}>
              Name:
            </Text>
            <Text variant="bodyMedium" style={styles.value}>
              {user?.displayName || 'Not set'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.label}>
              Email:
            </Text>
            <Text variant="bodyMedium" style={styles.value}>
              {user?.email}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.label}>
              Email Verified:
            </Text>
            <Text
              variant="bodyMedium"
              style={[
                styles.value,
                user?.emailVerified ? styles.verified : styles.notVerified,
              ]}
            >
              {user?.emailVerified ? '✓ Yes' : '✗ No'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text variant="bodyMedium" style={styles.label}>
              User ID:
            </Text>
            <Text variant="bodySmall" style={styles.userId}>
              {user?.uid}
            </Text>
          </View>
        </Card>

        {/* Phase 3 Complete Card */}
        <Card style={styles.card}>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Phase 3: Authentication ✓
          </Text>
          <Text variant="bodyMedium" style={styles.description}>
            Authentication system is complete and working!
          </Text>
          <Text variant="bodySmall" style={styles.feature}>
            ✓ Email/password login
          </Text>
          <Text variant="bodySmall" style={styles.feature}>
            ✓ User registration
          </Text>
          <Text variant="bodySmall" style={styles.feature}>
            ✓ Email verification
          </Text>
          <Text variant="bodySmall" style={styles.feature}>
            ✓ Password reset
          </Text>
          <Text variant="bodySmall" style={styles.feature}>
            ✓ Protected routes
          </Text>
          <Text variant="bodySmall" style={styles.feature}>
            ✓ Auth state management
          </Text>
        </Card>

        {/* Next Steps Card */}
        <Card style={styles.card}>
          <Text variant="titleMedium" style={styles.cardTitle}>
            Next: Phase 4
          </Text>
          <Text variant="bodyMedium" style={styles.description}>
            Coming soon:
          </Text>
          <Text variant="bodySmall" style={styles.nextStep}>
            • Dashboard with wellness insights
          </Text>
          <Text variant="bodySmall" style={styles.nextStep}>
            • Journal with AI prompts
          </Text>
          <Text variant="bodySmall" style={styles.nextStep}>
            • Habit tracking with streaks
          </Text>
          <Text variant="bodySmall" style={styles.nextStep}>
            • Goal management
          </Text>
          <Text variant="bodySmall" style={styles.nextStep}>
            • Community features
          </Text>
          <Text variant="bodySmall" style={styles.nextStep}>
            • Focus tools (Pomodoro, routines)
          </Text>
        </Card>

        {/* Logout Button */}
        <Button
          variant="outline"
          onPress={handleLogout}
          loading={isLoading}
          disabled={isLoading}
          fullWidth
          style={styles.logoutButton}
        >
          Log Out
        </Button>
      </ScrollView>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  scrollContent: {
    flexGrow: 1,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.xl,
  },
  header: {
    marginBottom: Spacing.xl,
    alignItems: 'center',
  },
  title: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  subtitle: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  card: {
    marginBottom: Spacing.lg,
  },
  cardTitle: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.md,
    fontWeight: Typography.fontWeight.semibold,
  },
  infoRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
  },
  label: {
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
  },
  value: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  verified: {
    color: Colors.success,
  },
  notVerified: {
    color: Colors.warning,
  },
  userId: {
    color: Colors.textSecondary,
    flex: 1,
    textAlign: 'right',
    marginLeft: Spacing.md,
  },
  description: {
    color: Colors.textPrimary,
    marginBottom: Spacing.md,
  },
  feature: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.md,
  },
  nextStep: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  logoutButton: {
    marginTop: Spacing.md,
  },
});

export default HomeScreen;

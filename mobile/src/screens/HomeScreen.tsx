/**
 * Home Screen (Temporary)
 * Placeholder for authenticated users until dashboard is built
 */

import React from 'react';
import { View, StyleSheet, ScrollView, Text } from 'react-native';
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
          <Text style={styles.title}>
            Welcome, {user?.displayName || 'User'}!
          </Text>
          <Text style={styles.subtitle}>
            You're successfully logged in
          </Text>
        </View>

        {/* User Info Card */}
        <Card style={styles.card}>
          <Text style={styles.cardTitle}>
            Your Account
          </Text>
          <View style={styles.infoRow}>
            <Text style={styles.label}>
              Name:
            </Text>
            <Text style={styles.value}>
              {user?.displayName || 'Not set'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>
              Email:
            </Text>
            <Text style={styles.value}>
              {user?.email}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>
              Email Verified:
            </Text>
            <Text
              style={[
                styles.value,
                user?.emailVerified ? styles.verified : styles.notVerified,
              ]}
            >
              {user?.emailVerified ? '✓ Yes' : '✗ No'}
            </Text>
          </View>
          <View style={styles.infoRow}>
            <Text style={styles.label}>
              User ID:
            </Text>
            <Text style={styles.userId}>
              {user?.uid}
            </Text>
          </View>
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
    backgroundColor: Colors.mistWhite,
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
    marginBottom: Spacing.base,
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
    marginLeft: Spacing.base,
  },
  description: {
    color: Colors.textPrimary,
    marginBottom: Spacing.base,
  },
  feature: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.base,
  },
  nextStep: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  logoutButton: {
    marginTop: Spacing.base,
  },
});

export default HomeScreen;

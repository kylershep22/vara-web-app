/**
 * Breathwork Screen
 * List of breathwork sessions
 */

import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Chip } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing, Layout, Typography } from '../../constants';
import { useBreathwork } from '../../hooks';
import { LoadingSpinner } from '../../components';
import { BreathworkSession } from '../../services/firebase/library.service';

export default function BreathworkScreen() {
  const navigation = useNavigation();
  const { sessions, loading } = useBreathwork();

  const getPurposeColor = (purpose: string) => {
    switch (purpose) {
      case 'Relax':
        return Colors.silverSage;
      case 'Sleep':
        return '#9FA8DA';
      case 'Focus':
        return Colors.sunriseAmber;
      default:
        return Colors.silverSage;
    }
  };

  const renderSession = ({ item }: { item: BreathworkSession }) => (
    <TouchableOpacity
      style={styles.sessionCard}
      onPress={() => navigation.navigate('BreathworkDetail' as never, { sessionId: item.id } as never)}
      activeOpacity={0.7}
    >
      <View style={styles.sessionIcon}>
        <Icon name="meditation" size={32} color={Colors.evergreenTeal} />
      </View>

      <View style={styles.sessionContent}>
        <Text variant="titleMedium" style={styles.sessionTitle}>
          {item.title}
        </Text>

        <Text variant="bodySmall" style={styles.sessionDescription} numberOfLines={2}>
          {item.description}
        </Text>

        <View style={styles.sessionMeta}>
          <View style={styles.metaItem}>
            <Icon name="clock-outline" size={14} color={Colors.textSecondary} />
            <Text variant="labelSmall" style={styles.metaText}>
              {item.duration}
            </Text>
          </View>

          <Chip
            mode="flat"
            compact
            style={[styles.purposeChip, { backgroundColor: getPurposeColor(item.purpose) }]}
            textStyle={styles.purposeText}
          >
            {item.purpose}
          </Chip>

          <Chip
            mode="outlined"
            compact
            style={styles.typeChip}
            textStyle={styles.typeText}
          >
            {item.type}
          </Chip>
        </View>
      </View>

      <Icon name="chevron-right" size={24} color={Colors.textSecondary} />
    </TouchableOpacity>
  );

  if (loading) {
    return <LoadingSpinner message="Loading breathwork sessions..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Description */}
      <View style={styles.descriptionSection}>
        <Text variant="bodyMedium" style={styles.description}>
          Breathwork exercises to reduce stress, improve focus, and enhance well-being. Each session includes guided instructions.
        </Text>
      </View>

      {/* Sessions List */}
      <FlatList
        data={sessions}
        renderItem={renderSession}
        keyExtractor={(item) => item.id}
        contentContainerStyle={styles.listContent}
        showsVerticalScrollIndicator={false}
      />
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  descriptionSection: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.evergreenTeal + '10',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  description: {
    color: Colors.textPrimary,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.base,
  },
  listContent: {
    paddingVertical: Spacing.md,
  },
  sessionCard: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.md,
    marginBottom: Spacing.md,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.md,
    ...Layout.shadow.sm,
    gap: Spacing.md,
  },
  sessionIcon: {
    width: 56,
    height: 56,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: Colors.evergreenTeal + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  sessionContent: {
    flex: 1,
  },
  sessionTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 4,
  },
  sessionDescription: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    lineHeight: Typography.lineHeight.normal * Typography.fontSize.sm,
  },
  sessionMeta: {
    flexDirection: 'row',
    alignItems: 'center',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  metaItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 4,
  },
  metaText: {
    color: Colors.textSecondary,
  },
  purposeChip: {
    height: 24,
  },
  purposeText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
    marginVertical: 0,
  },
  typeChip: {
    height: 24,
    borderColor: Colors.borderLight,
  },
  typeText: {
    fontSize: Typography.fontSize.xs,
    marginVertical: 0,
  },
});

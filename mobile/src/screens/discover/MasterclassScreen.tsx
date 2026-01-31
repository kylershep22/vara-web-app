/**
 * Masterclass Screen
 * Educational courses and learning modules
 */

import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Colors, Spacing } from '../../constants';
import { useMasterclasses, useMasterclassProgress } from '../../hooks';
import { LoadingSpinner } from '../../components';
import { MasterclassCard } from '../../components/library/MasterclassCard';
import { Masterclass } from '../../services/firebase/library.service';

export default function MasterclassScreen() {
  const navigation = useNavigation();
  const { masterclasses, loading } = useMasterclasses();
  const { progress } = useMasterclassProgress();

  const getProgress = (masterclassId: string) => {
    const userProgress = progress.find((p) => p.masterclassId === masterclassId);
    return userProgress?.progress || 0;
  };

  const renderItem = ({ item }: { item: Masterclass }) => (
    <MasterclassCard
      masterclass={item}
      progress={getProgress(item.id)}
      onPress={() => navigation.navigate('MasterclassDetail' as never, { classId: item.id } as never)}
    />
  );

  if (loading) {
    return <LoadingSpinner message="Loading masterclasses..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Description */}
      <View style={styles.descriptionSection}>
        <Text variant="bodyMedium" style={styles.description}>
          Expert-led courses on wellness, nutrition, sleep science, and more.
        </Text>
      </View>

      {/* Content List */}
      {masterclasses.length > 0 ? (
        <FlatList
          data={masterclasses}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.comingSoonContainer}>
          <Icon name="school" size={64} color={Colors.goldenApricot} />
          <Text variant="headlineSmall" style={styles.comingSoonTitle}>
            Coming Soon
          </Text>
          <Text variant="bodyLarge" style={styles.comingSoonText}>
            Expert-led masterclasses are on the way. Get ready for in-depth learning from leading wellness experts.
          </Text>
          <View style={styles.featuresContainer}>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color={Colors.success} />
              <Text variant="bodyMedium" style={styles.featureText}>
                Science-backed content
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color={Colors.success} />
              <Text variant="bodyMedium" style={styles.featureText}>
                Progress tracking
              </Text>
            </View>
            <View style={styles.featureItem}>
              <Icon name="check-circle" size={20} color={Colors.success} />
              <Text variant="bodyMedium" style={styles.featureText}>
                Expert instructors
              </Text>
            </View>
          </View>
        </View>
      )}
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
    backgroundColor: Colors.goldenApricot + '10',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  description: {
    color: Colors.textPrimary,
  },
  listContent: {
    paddingVertical: Spacing.md,
    paddingBottom: Spacing['4xl'],
  },
  comingSoonContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  comingSoonTitle: {
    color: Colors.textPrimary,
    marginTop: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  comingSoonText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.xl,
  },
  featuresContainer: {
    gap: Spacing.md,
  },
  featureItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  featureText: {
    color: Colors.textPrimary,
  },
});

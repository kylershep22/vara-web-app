/**
 * Movement Screen
 * Video library for workouts and mobility
 */

import React from 'react';
import { View, StyleSheet, FlatList } from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing } from '../../constants';
import { useMovement } from '../../hooks';
import { LoadingSpinner } from '../../components';
import { ContentCard } from '../../components/library/ContentCard';
import { MovementContent } from '../../services/firebase/library.service';

export default function MovementScreen() {
  const navigation = useNavigation();
  const { content, loading } = useMovement();

  const renderItem = ({ item }: { item: MovementContent }) => (
    <ContentCard
      title={item.title}
      description={item.description}
      duration={item.duration}
      category={item.category}
      thumbnail={item.thumbnail}
      type="video"
      onPress={() => navigation.navigate('MovementDetail' as never, { contentId: item.id } as never)}
    />
  );

  if (loading) {
    return <LoadingSpinner message="Loading movement content..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      {/* Description */}
      <View style={styles.descriptionSection}>
        <Text variant="bodyMedium" style={styles.description}>
          Movement boosts blood flow to your brain, releases growth signals, and primes your mind for focus and learning.
        </Text>
      </View>

      {/* Content List */}
      {content.length > 0 ? (
        <FlatList
          data={content}
          renderItem={renderItem}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          showsVerticalScrollIndicator={false}
        />
      ) : (
        <View style={styles.emptyState}>
          <Text variant="titleMedium" style={styles.emptyTitle}>
            No movement content yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Movement videos will appear here when added to the library.
          </Text>
        </View>
      )}
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  descriptionSection: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.sunriseAmber + '10',
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  description: {
    color: Colors.textPrimary,
  },
  listContent: {
    paddingVertical: Spacing.base,
    paddingBottom: Spacing['4xl'],
  },
  emptyState: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
});

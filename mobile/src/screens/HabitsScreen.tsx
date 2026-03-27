/**
 * Habits Screen
 * Daily habit tracking with consistency rhythm visualization.
 * Thin UI shell that delegates state/handlers to useHabitsScreen.
 */

import React, { useCallback } from 'react';
import { View, Text, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { SafeAreaView, useSafeAreaInsets } from 'react-native-safe-area-context';
import { LoadingSpinner, BrainPillarInfoModal, InlineCreateButton } from '../components';
import { QuietFinish } from '../components/celebrations';
import { WizardContainer } from '../components/habits/wizard';
import { HabitListItem } from '../components/habits/HabitListItem';
import { IntentionsSummaryCard } from '../components/habits/IntentionsSummaryCard';
import { HabitCompletionSheet } from '../components/HabitCompletionSheet';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { Habit } from '../types';
import { useHabitsScreen } from '../hooks/useHabitsScreen';

interface HabitsScreenProps {
  hideHeader?: boolean;
  externalFilter?: string;
  showInlineCreate?: boolean;
}

const HabitsScreen: React.FC<HabitsScreenProps> = ({
  hideHeader = false,
  externalFilter,
  showInlineCreate = false,
}) => {
  const insets = useSafeAreaInsets();
  const {
    navigation,
    habits,
    loading,
    habitsError,
    modalVisible,
    setModalVisible,
    editingHabit,
    completedToday,
    pillarInfoVisible,
    setPillarInfoVisible,
    allHabitsCompletedToday,
    setAllHabitsCompletedToday,
    handleCreateHabit,
    handleWizardComplete,
    handleToggleCompletion,
    completionSheetHabit,
    handleCompletionSheetDone,
    handleCompletionSheetDismiss,
  } = useHabitsScreen();

  const handleNavigateToDetail = useCallback((habit: Habit) => {
    navigation.navigate('HabitDetail', { habitId: habit.id, habit });
  }, [navigation]);

  const renderHabitItem = useCallback(({ item }: { item: Habit }) => {
    try {
      return (
        <HabitListItem
          habit={item}
          isCompleted={completedToday.has(item.id)}
          onToggle={handleToggleCompletion}
          onNavigateToDetail={handleNavigateToDetail}
        />
      );
    } catch (error) {
      return (
        <View style={styles.errorCard}>
          <Text style={styles.errorCardText}>Unable to display this habit.</Text>
        </View>
      );
    }
  }, [completedToday, handleToggleCompletion, handleNavigateToDetail]);

  if (loading) {
    return <LoadingSpinner message="Loading habits..." />;
  }

  if (habitsError) {
    return (
      <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
        <View style={styles.emptyContainer}>
          <Icon name="alert-circle" size={64} color={Colors.error} />
          <Text style={[styles.emptyTitle, { color: Colors.error }]}>
            Unable to Load Habits
          </Text>
          <Text style={styles.emptyText}>
            There was a problem loading your habits. Please check your connection and try again.
          </Text>
          <Text style={[styles.emptyText, { marginTop: Spacing.sm }]}>
            Error: {habitsError.message}
          </Text>
        </View>
      </SafeAreaView>
    );
  }

  return (
    <SafeAreaView style={styles.container} edges={hideHeader ? [] : ['top']}>
      {!hideHeader && (
        <View style={styles.header}>
          <Text style={styles.screenTitle}>Habits</Text>
          <Text style={styles.subtitle}>Build consistency, one day at a time</Text>
        </View>
      )}

      {!externalFilter && (
        <View style={styles.dateContainer}>
          <Text style={styles.dateText}>
            Today: {new Date().toLocaleDateString('en-US', {
              weekday: 'long',
              month: 'long',
              day: 'numeric',
            })}
          </Text>
        </View>
      )}

      {showInlineCreate && (
        <InlineCreateButton label="Add a habit" onPress={handleCreateHabit} />
      )}

      {habits.length === 0 ? (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconContainer}>
            <Icon name="waves" size={32} color={Colors.silverSage} />
          </View>
          <Text style={styles.emptyTitle}>Your habits live here</Text>
          <Text style={styles.emptyText}>Start with one small thing that feels manageable.</Text>
        </View>
      ) : (
        <FlatList
          data={habits}
          renderItem={renderHabitItem}
          keyExtractor={(item) => item.id}
          ListFooterComponent={
            <>
              <View style={styles.insightNudge}>
                <Text style={styles.insightHeadline}>🌿 Some habits build more than consistency</Text>
                <Text style={styles.insightBody}>
                  Habits marked 🌿 CR support cognitive reserve, your brain's long-term resilience. These are worth prioritizing.
                </Text>
              </View>
              <IntentionsSummaryCard habits={habits} />
            </>
          }
          contentContainerStyle={[
            styles.listContent,
            { paddingBottom: Math.max(100, 80 + insets.bottom) },
          ]}
        />
      )}

      {!showInlineCreate && (
        <TouchableOpacity
          style={[styles.fab, { bottom: Math.max(Spacing.lg, insets.bottom + Spacing.sm) }]}
          onPress={handleCreateHabit}
          activeOpacity={0.8}
        >
          <Icon name="plus" size={24} color="#fff" />
        </TouchableOpacity>
      )}

      <WizardContainer
        visible={modalVisible}
        onDismiss={() => setModalVisible(false)}
        editingHabit={editingHabit}
        onComplete={handleWizardComplete}
      />

      <BrainPillarInfoModal
        visible={pillarInfoVisible}
        onDismiss={() => setPillarInfoVisible(false)}
      />

      <QuietFinish
        visible={allHabitsCompletedToday}
        onDismiss={() => setAllHabitsCompletedToday(false)}
      />

      {completionSheetHabit && (
        <HabitCompletionSheet
          habit={completionSheetHabit}
          source="track"
          visible={!!completionSheetHabit}
          onComplete={handleCompletionSheetDone}
          onDismiss={handleCompletionSheetDismiss}
        />
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  dateContainer: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
    backgroundColor: Colors.dewSage,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Spacing.base,
  },
  dateText: {
    color: Colors.evergreenTeal,
    textAlign: 'center',
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIconContainer: {
    width: 64,
    height: 64,
    borderRadius: 32,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
    opacity: 0.6,
  },
  emptyTitle: {
    fontSize: 18,
    fontWeight: '500',
    color: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    fontSize: 14,
    fontWeight: '400',
    color: '#6F7F77',
    textAlign: 'center',
    maxWidth: 240,
    lineHeight: 21,
  },
  insightNudge: {
    backgroundColor: '#EAF2E8',
    borderRadius: 14,
    paddingVertical: 14,
    paddingHorizontal: 16,
    marginTop: 16,
    marginBottom: 20,
  },
  insightHeadline: {
    fontSize: 13,
    fontWeight: '700',
    color: '#1B5E57',
    marginBottom: 4,
  },
  insightBody: {
    fontSize: 12,
    fontWeight: '400',
    color: '#6F7F77',
    lineHeight: 12 * 1.55,
  },
  errorCard: {
    padding: Spacing.base,
  },
  errorCardText: {
    color: Colors.textSecondary,
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    width: 56,
    height: 56,
    borderRadius: 9999,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
    elevation: 4,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.2,
    shadowRadius: 4,
  },
});

export default HabitsScreen;

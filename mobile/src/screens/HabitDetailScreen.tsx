/**
 * Habit Detail Screen
 * View and manage individual habit details
 */

import React, { useState, useCallback } from 'react';
import { View, StyleSheet, ScrollView, Alert } from 'react-native';
import { Text, Divider } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation, useRoute, RouteProp } from '@react-navigation/native';
import { Button, Input, EnhancedModal, ModalFooterActions, BaseCard } from '../components';
import { IntentionHighlightCard } from '../components/habits/IntentionHighlightCard';
import { BrainHealthInsightNote } from '../components/habits/BrainHealthInsightNote';
import { IntentionEditSheet } from '../components/habits/IntentionEditSheet';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useAuth } from '../context/AuthContext';
import { updateHabit, deleteHabit } from '../services/firebase';
import { Habit, HabitIntention } from '../types';

type HabitDetailRouteParams = {
  HabitDetail: {
    habitId: string;
    habit: Habit;
  };
};

const HabitDetailScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const route = useRoute<RouteProp<HabitDetailRouteParams, 'HabitDetail'>>();
  const { habit: initialHabit } = route.params;
  const { user } = useAuth();

  const [habit, setHabit] = useState<Habit>(initialHabit);
  const [editModalVisible, setEditModalVisible] = useState(false);
  const [intentionSheetVisible, setIntentionSheetVisible] = useState(false);
  const [formData, setFormData] = useState({
    name: habit.name,
    type: habit.type,
    frequency: habit.frequency,
    category: habit.category || '',
    identity: habit.identity || '',
    identityStatement: habit.identityStatement || '',
  });
  const [submitting, setSubmitting] = useState(false);

  const handleEdit = () => {
    setFormData({
      name: habit.name,
      type: habit.type,
      frequency: habit.frequency,
      category: habit.category || '',
      identity: habit.identity || '',
      identityStatement: habit.identityStatement || '',
    });
    setEditModalVisible(true);
  };

  const handleSubmit = async () => {
    if (!formData.name.trim()) {
      Alert.alert('Error', 'Please enter a habit name');
      return;
    }

    setSubmitting(true);
    try {
      await updateHabit(habit.id, formData);
      setHabit({ ...habit, ...formData });
      setEditModalVisible(false);
    } catch (error) {
      console.error('Error updating habit:', error);
      Alert.alert('Error', 'Failed to update habit. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDelete = () => {
    Alert.alert(
      'Delete Habit',
      'Are you sure you want to delete this habit? This action cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteHabit(habit.id);
              navigation.goBack();
            } catch (error) {
              console.error('Error deleting habit:', error);
              Alert.alert('Error', 'Failed to delete habit');
            }
          },
        },
      ]
    );
  };

  const handleSaveIntention = async (intention?: HabitIntention) => {
    try {
      const updateData: any = {};
      if (intention) {
        updateData.intention = intention;
      } else {
        // Remove intention - set to null for Firestore
        updateData.intention = null;
      }
      await updateHabit(habit.id, updateData);
      setHabit({ ...habit, intention: intention || undefined });
    } catch (error) {
      console.error('Error updating intention:', error);
      Alert.alert('Error', 'Failed to update intention. Please try again.');
    }
  };

  const getFrequencyLabel = () => {
    if (habit.type === 'daily') return 'Daily';
    if (habit.type === 'weekly') return `${habit.frequency}x per week`;
    return `${habit.frequency}x (custom)`;
  };

  return (
    <SafeAreaView style={styles.container} edges={['bottom']}>
      <ScrollView contentContainerStyle={styles.scrollContent}>
        {/* Main Info Card */}
        <BaseCard style={styles.mainCard}>
          <Text style={styles.habitName}>{habit.name}</Text>

          <View style={styles.metaRow}>
            <Icon name="calendar-repeat" size={16} color={Colors.mutedSageGray} />
            <Text style={styles.metaText}>{getFrequencyLabel()}</Text>
          </View>

          {habit.category && (
            <View style={styles.metaRow}>
              <Icon name="tag-outline" size={16} color={Colors.mutedSageGray} />
              <Text style={styles.metaText}>{habit.category}</Text>
            </View>
          )}
        </BaseCard>

        {/* Consistency Stats Card */}
        <BaseCard style={styles.statsCard}>
          <Text style={styles.sectionTitle}>Your Progress</Text>

          <View style={styles.statsRow}>
            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Icon name="leaf" size={24} color={Colors.evergreenTeal} />
              </View>
              <Text style={styles.statValue}>{habit.streak}</Text>
              <Text style={styles.statLabel}>Current Run</Text>
            </View>

            <View style={styles.statDivider} />

            <View style={styles.statItem}>
              <View style={styles.statIconContainer}>
                <Icon name="trophy" size={24} color={Colors.evergreenTeal} />
              </View>
              <Text style={styles.statValue}>{habit.longestStreak}</Text>
              <Text style={styles.statLabel}>Best Run</Text>
            </View>
          </View>
        </BaseCard>

        {/* Intention Highlight Card */}
        {habit.intention && (
          <IntentionHighlightCard
            intention={habit.intention}
            onEdit={() => setIntentionSheetVisible(true)}
          />
        )}

        {/* Identity Section (if applicable) */}
        {(habit.identity || habit.identityStatement) && (
          <BaseCard style={styles.identityCard}>
            <Text style={styles.sectionTitle}>Who You're Becoming</Text>

            {habit.identity && (
              <Text style={styles.identityText}>{habit.identity}</Text>
            )}

            {habit.identityStatement && (
              <Text style={styles.identityStatement}>
                "{habit.identityStatement}"
              </Text>
            )}
          </BaseCard>
        )}

        {/* Brain Health Insight Note */}
        <BrainHealthInsightNote
          category={habit.category}
          intentionCategory={habit.intention?.category}
        />

        {/* Actions */}
        <View style={styles.actionsContainer}>
          <Button
            variant="outline"
            onPress={handleEdit}
            style={styles.actionButton}
          >
            Edit Habit
          </Button>

          <Button
            variant="text"
            onPress={handleDelete}
            style={styles.deleteButton}
            textColor={Colors.error}
          >
            Delete Habit
          </Button>
        </View>
      </ScrollView>

      {/* Edit Modal */}
      <EnhancedModal
        visible={editModalVisible}
        onDismiss={() => setEditModalVisible(false)}
        title="Edit Habit"
        subtitle="Update your habit details"
        headerIcon="pencil"
        inputAccessoryViewID="habit-edit-modal"
        footer={
          <ModalFooterActions
            onCancel={() => setEditModalVisible(false)}
            onSubmit={handleSubmit}
            submitLabel="Save"
            submitLoading={submitting}
            submitDisabled={submitting}
          />
        }
      >
        <Input
          label="Habit Name *"
          value={formData.name}
          onChangeText={(text) => setFormData({ ...formData, name: text })}
          placeholder="e.g., Morning meditation"
          style={styles.input}
          inputAccessoryViewID="habit-edit-modal"
        />

        <Input
          label="Category"
          value={formData.category}
          onChangeText={(text) => setFormData({ ...formData, category: text })}
          placeholder="e.g., Mindfulness, Health"
          style={styles.input}
          inputAccessoryViewID="habit-edit-modal"
        />

        <Input
          label="Identity (Who are you becoming?)"
          value={formData.identity}
          onChangeText={(text) => setFormData({ ...formData, identity: text })}
          placeholder="e.g., A mindful person"
          style={styles.input}
          inputAccessoryViewID="habit-edit-modal"
        />

        <Input
          label="Identity Statement"
          value={formData.identityStatement}
          onChangeText={(text) => setFormData({ ...formData, identityStatement: text })}
          placeholder="e.g., I'm becoming someone who starts each day with clarity"
          multiline
          numberOfLines={2}
          style={styles.input}
          inputAccessoryViewID="habit-edit-modal"
        />
      </EnhancedModal>

      {/* Intention Edit Sheet */}
      <IntentionEditSheet
        visible={intentionSheetVisible}
        onDismiss={() => setIntentionSheetVisible(false)}
        currentIntention={habit.intention}
        onSave={handleSaveIntention}
      />
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
  mainCard: {
    marginBottom: Spacing.base,
  },
  habitName: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.base,
  },
  metaRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  metaText: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
    marginLeft: Spacing.sm,
  },
  statsCard: {
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
    marginBottom: Spacing.base,
  },
  statsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-around',
  },
  statItem: {
    alignItems: 'center',
    flex: 1,
  },
  statIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.dewSage,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.sm,
  },
  statValue: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.softCharcoal,
  },
  statLabel: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    marginTop: Spacing.xs,
  },
  statDivider: {
    width: 1,
    height: 60,
    backgroundColor: Colors.borderLight,
  },
  identityCard: {
    marginBottom: Spacing.base,
  },
  identityText: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
  },
  identityStatement: {
    fontSize: Typography.fontSize.base,
    color: Colors.mutedSageGray,
    fontStyle: 'italic',
    lineHeight: Typography.fontSize.base * 1.5,
  },
  actionsContainer: {
    marginTop: Spacing.lg,
    gap: Spacing.sm,
  },
  actionButton: {
    width: '100%',
  },
  deleteButton: {
    width: '100%',
  },
  input: {
    marginBottom: Spacing.base,
  },
});

export default HabitDetailScreen;

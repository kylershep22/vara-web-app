/**
 * CreateChallengeFromGroupModal
 * Modal for creating a challenge from within a group, with option to auto-invite all group members
 */

import React, { useState, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Alert,
  Platform,
  Switch,
} from 'react-native';
import DateTimePicker from '@react-native-community/datetimepicker';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';

import { EnhancedModal, ModalFooterActions } from '../shared/EnhancedModal';
import Input from '../Input';
import { InvitePermissionPicker, InvitePermission } from './InvitePermissionPicker';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { createChallengeFromGroup } from '../../services/firebase/invites.service';
import { ChallengeFrequency } from '../../types/models';

interface CreateChallengeFromGroupModalProps {
  visible: boolean;
  onDismiss: () => void;
  groupId: string;
  groupName: string;
  memberCount: number;
  onSuccess?: (challengeId: string) => void;
}

export const CreateChallengeFromGroupModal: React.FC<CreateChallengeFromGroupModalProps> = ({
  visible,
  onDismiss,
  groupId,
  groupName,
  memberCount,
  onSuccess,
}) => {
  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [challengeGoal, setChallengeGoal] = useState('');
  const [frequency, setFrequency] = useState<ChallengeFrequency>('daily');
  const [targetCount, setTargetCount] = useState('20');
  const [unit, setUnit] = useState('times');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // 30 days
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [autoInviteMembers, setAutoInviteMembers] = useState(true);
  const [invitePermission, setInvitePermission] = useState<InvitePermission>('owner_only');
  const [submitting, setSubmitting] = useState(false);

  const resetForm = useCallback(() => {
    setName('');
    setDescription('');
    setChallengeGoal('');
    setFrequency('daily');
    setTargetCount('20');
    setUnit('times');
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    setAutoInviteMembers(true);
    setInvitePermission('owner_only');
  }, []);

  const handleDismiss = useCallback(() => {
    resetForm();
    onDismiss();
  }, [resetForm, onDismiss]);

  const handleCreate = async () => {
    if (!name.trim()) {
      Alert.alert('Error', 'Please enter a challenge name');
      return;
    }
    if (!challengeGoal.trim()) {
      Alert.alert('Error', 'Please enter the challenge goal');
      return;
    }
    if (startDate >= endDate) {
      Alert.alert('Error', 'End date must be after start date');
      return;
    }

    setSubmitting(true);
    try {
      const challengeId = await createChallengeFromGroup({
        groupId,
        name: name.trim(),
        description: description.trim(),
        challengeGoal: challengeGoal.trim(),
        startDate,
        endDate,
        frequency,
        targetCount: parseInt(targetCount, 10) || 20,
        unit: unit.trim() || 'times',
        autoInviteMembers,
        invitePermission,
      });

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      const inviteMessage = autoInviteMembers
        ? `All ${memberCount - 1} group members have been invited!`
        : 'You can now invite members to join.';

      Alert.alert('Challenge Created!', inviteMessage, [
        {
          text: 'OK',
          onPress: () => {
            handleDismiss();
            onSuccess?.(challengeId);
          },
        },
      ]);
    } catch (error: any) {
      console.error('Error creating challenge:', error);
      Alert.alert('Error', error.message || 'Failed to create challenge');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  const footer = (
    <ModalFooterActions
      onCancel={handleDismiss}
      onSubmit={handleCreate}
      cancelLabel="Cancel"
      submitLabel="Create Challenge"
      submitLoading={submitting}
      submitDisabled={!name.trim() || !challengeGoal.trim()}
    />
  );

  return (
    <EnhancedModal
      visible={visible}
      onDismiss={handleDismiss}
      title="Create Group Challenge"
      subtitle={`For "${groupName}"`}
      headerIcon="trophy-outline"
      footer={footer}
      maxHeightPercent={0.95}
    >
      <Input
        label="Challenge Name *"
        value={name}
        onChangeText={setName}
        placeholder="e.g., 30-Day Running Challenge"
        style={styles.input}
      />

      <Input
        label="Challenge Goal *"
        value={challengeGoal}
        onChangeText={setChallengeGoal}
        placeholder="e.g., Run 4 days a week"
        style={styles.input}
      />

      <Input
        label="Description"
        value={description}
        onChangeText={setDescription}
        placeholder="What's this challenge about?"
        multiline
        numberOfLines={3}
        style={styles.input}
      />

      {/* Frequency Selection */}
      <Text style={styles.sectionLabel}>
        Check-in Frequency
      </Text>
      <View style={styles.segmentedButtons}>
        {(['daily', 'weekly', 'total'] as const).map((value) => (
          <TouchableOpacity
            key={value}
            onPress={() => setFrequency(value as ChallengeFrequency)}
            style={[
              styles.segmentButton,
              frequency === value && styles.segmentButtonActive,
            ]}
          >
            <Text
              style={[
                styles.segmentButtonText,
                frequency === value && styles.segmentButtonTextActive,
              ]}
            >
              {value.charAt(0).toUpperCase() + value.slice(1)}
            </Text>
          </TouchableOpacity>
        ))}
      </View>

      {/* Target & Unit */}
      <View style={styles.targetRow}>
        <View style={styles.targetInput}>
          <Input
            label="Target Count"
            value={targetCount}
            onChangeText={setTargetCount}
            keyboardType="number-pad"
            placeholder="20"
          />
        </View>
        <View style={styles.unitInput}>
          <Input label="Unit" value={unit} onChangeText={setUnit} placeholder="times" />
        </View>
      </View>

      {/* Date Selection */}
      <Text style={styles.sectionLabel}>
        Duration
      </Text>
      <View style={styles.dateRow}>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowStartPicker(true)}>
          <Icon name="calendar-start" size={20} color={Colors.evergreenTeal} />
          <View>
            <Text style={styles.dateLabel}>Start Date</Text>
            <Text style={styles.dateValue}>{formatDate(startDate)}</Text>
          </View>
        </TouchableOpacity>
        <TouchableOpacity style={styles.dateButton} onPress={() => setShowEndPicker(true)}>
          <Icon name="calendar-end" size={20} color={Colors.evergreenTeal} />
          <View>
            <Text style={styles.dateLabel}>End Date</Text>
            <Text style={styles.dateValue}>{formatDate(endDate)}</Text>
          </View>
        </TouchableOpacity>
      </View>

      {showStartPicker && (
        <DateTimePicker
          value={startDate}
          mode="date"
          onChange={(event, date) => {
            setShowStartPicker(Platform.OS === 'ios');
            if (date) setStartDate(date);
          }}
        />
      )}
      {showEndPicker && (
        <DateTimePicker
          value={endDate}
          mode="date"
          minimumDate={startDate}
          onChange={(event, date) => {
            setShowEndPicker(Platform.OS === 'ios');
            if (date) setEndDate(date);
          }}
        />
      )}

      {/* Auto-invite Members */}
      <View style={styles.switchContainer}>
        <View style={styles.switchLabel}>
          <Text style={styles.switchLabelText}>
            Invite All Group Members
          </Text>
          <Text style={styles.switchDescription}>
            Automatically send invites to {memberCount - 1} {memberCount - 1 === 1 ? 'member' : 'members'}
          </Text>
        </View>
        <Switch
          value={autoInviteMembers}
          onValueChange={setAutoInviteMembers}
          trackColor={{ false: Colors.silverSage, true: Colors.evergreenTeal }}
          thumbColor={Colors.white}
        />
      </View>

      {/* Invite Permissions */}
      <InvitePermissionPicker
        value={invitePermission}
        onChange={setInvitePermission}
        entityType="challenge"
      />
    </EnhancedModal>
  );
};

const styles = StyleSheet.create({
  input: {
    marginBottom: Spacing.base,
  },
  sectionLabel: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.sm,
  },
  segmentedButtons: {
    flexDirection: 'row',
    marginBottom: Spacing.base,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.border,
    overflow: 'hidden',
  },
  segmentButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  segmentButtonActive: {
    backgroundColor: Colors.evergreenTeal,
  },
  segmentButtonText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
  },
  segmentButtonTextActive: {
    color: Colors.white,
    fontWeight: Typography.fontWeight.semibold,
  },
  targetRow: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginBottom: Spacing.base,
  },
  targetInput: {
    flex: 1,
  },
  unitInput: {
    flex: 1,
  },
  dateRow: {
    flexDirection: 'row',
    gap: Spacing.base,
    marginBottom: Spacing.base,
  },
  dateButton: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.dewSage,
    padding: Spacing.base,
    borderRadius: Layout.borderRadius.md,
    gap: Spacing.sm,
  },
  dateLabel: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  dateValue: {
    fontSize: Typography.fontSize.sm,
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  switchContainer: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingVertical: Spacing.base,
    marginBottom: Spacing.sm,
    borderTopWidth: Layout.borderWidth.thin,
    borderBottomWidth: Layout.borderWidth.thin,
    borderColor: Colors.borderLight,
  },
  switchLabel: {
    flex: 1,
    marginRight: Spacing.base,
  },
  switchLabelText: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.xs / 2,
  },
  switchDescription: {
    color: Colors.textSecondary,
  },
});

export default CreateChallengeFromGroupModal;

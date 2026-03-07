/**
 * Quick Action Carousel
 * Horizontal scrollable actions with inline quick-start modals
 * Flattens user journeys by reducing taps to complete common actions
 */

import React, { useState, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  ScrollView,
  Animated,
  TextInput,
  KeyboardAvoidingView,
  Platform,
  Modal,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, addDoc, serverTimestamp } from 'firebase/firestore';

interface QuickAction {
  id: string;
  label: string;
  icon: string;
  color: string;
  bgColor: string;
  type: 'modal' | 'navigate';
  target?: string;
  modalType?: 'habit' | 'task' | 'goal' | 'journal';
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'quick-habit',
    label: 'Quick Habit',
    icon: 'repeat',
    color: Colors.evergreenTeal,
    bgColor: Colors.dewSage,
    type: 'modal',
    modalType: 'habit',
  },
  {
    id: 'quick-task',
    label: 'Quick Task',
    icon: 'checkbox-marked-outline',
    color: Colors.sunriseAmber,
    bgColor: Colors.sunriseAmber + '15',
    type: 'modal',
    modalType: 'task',
  },
  {
    id: 'quick-journal',
    label: 'Quick Note',
    icon: 'pencil',
    color: Colors.evergreenTeal,
    bgColor: Colors.dewSage,
    type: 'modal',
    modalType: 'journal',
  },
  {
    id: 'breathwork',
    label: 'Breathwork',
    icon: 'weather-windy',
    color: Colors.evergreenTeal,
    bgColor: Colors.dewSage,
    type: 'navigate',
    target: 'Breathwork',
  },
  {
    id: 'movement',
    label: 'Movement',
    icon: 'yoga',
    color: Colors.goldenApricot,
    bgColor: Colors.goldenApricot + '15',
    type: 'navigate',
    target: 'Movement',
  },
];

interface QuickStartModalProps {
  visible: boolean;
  type: 'habit' | 'task' | 'goal' | 'journal' | null;
  onDismiss: () => void;
  onSave: (value: string) => Promise<void>;
}

const QuickStartModal: React.FC<QuickStartModalProps> = ({
  visible,
  type,
  onDismiss,
  onSave,
}) => {
  const [value, setValue] = useState('');
  const [saving, setSaving] = useState(false);
  const inputRef = useRef<TextInput>(null);

  const handleSave = async () => {
    if (!value.trim()) return;

    setSaving(true);
    try {
      await onSave(value.trim());
      setValue('');
      onDismiss();
    } catch (error) {
      console.error('Error saving:', error);
    } finally {
      setSaving(false);
    }
  };

  const getModalConfig = () => {
    switch (type) {
      case 'habit':
        return {
          title: 'Quick Habit',
          placeholder: 'What habit do you want to build?',
          icon: 'repeat',
          color: Colors.evergreenTeal,
          examples: ['Drink water', 'Meditate 5 min', 'Read 10 pages'],
        };
      case 'task':
        return {
          title: 'Quick Task',
          placeholder: 'What do you need to do?',
          icon: 'checkbox-marked-outline',
          color: Colors.sunriseAmber,
          examples: ['Call mom', 'Buy groceries', 'Schedule appointment'],
        };
      case 'journal':
        return {
          title: 'Quick Note',
          placeholder: 'What\'s on your mind?',
          icon: 'pencil',
          color: Colors.evergreenTeal,
          examples: ['Grateful for...', 'Today I learned...', 'Feeling...'],
        };
      case 'goal':
        return {
          title: 'Quick Goal',
          placeholder: 'What do you want to achieve?',
          icon: 'flag',
          color: Colors.evergreenTeal,
          examples: ['Run a 5K', 'Learn Spanish', 'Save $1000'],
        };
      default:
        return {
          title: 'Quick Add',
          placeholder: 'Enter something...',
          icon: 'plus',
          color: Colors.evergreenTeal,
          examples: [],
        };
    }
  };

  const config = getModalConfig();

  return (
    <Modal
      visible={visible}
      transparent
      animationType="fade"
      onRequestClose={onDismiss}
    >
      <View style={styles.modalOverlay}>
      <View style={styles.modal}>
        <KeyboardAvoidingView
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        >
          <View style={styles.modalHeader}>
            <View style={[styles.modalIconContainer, { backgroundColor: config.color + '15' }]}>
              <Icon name={config.icon as any} size={24} color={config.color} />
            </View>
            <Text style={styles.modalTitle}>
              {config.title}
            </Text>
          </View>

          <TextInput
            ref={inputRef}
            style={styles.input}
            placeholder={config.placeholder}
            placeholderTextColor={Colors.textSecondary}
            value={value}
            onChangeText={setValue}
            autoFocus
            multiline={type === 'journal'}
            numberOfLines={type === 'journal' ? 3 : 1}
            returnKeyType={type === 'journal' ? 'default' : 'done'}
            onSubmitEditing={type !== 'journal' ? handleSave : undefined}
          />

          {config.examples.length > 0 && (
            <View style={styles.examples}>
              <Text style={styles.examplesLabel}>
                Try:
              </Text>
              <View style={styles.exampleChips}>
                {config.examples.map((example, index) => (
                  <TouchableOpacity
                    key={index}
                    style={styles.exampleChip}
                    onPress={() => setValue(example)}
                  >
                    <Text style={styles.exampleChipText}>{example}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}

          <View style={styles.modalActions}>
            <TouchableOpacity
              onPress={onDismiss}
              style={[styles.modalButton, styles.modalButtonOutline]}
            >
              <Text style={styles.modalButtonOutlineText}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSave}
              style={[styles.modalButton, {backgroundColor: config.color}, (!value.trim() || saving) && {opacity: 0.5}]}
              disabled={!value.trim() || saving}
            >
              <Text style={styles.modalButtonPrimaryText}>{saving ? 'Adding...' : 'Add'}</Text>
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </View>
      </View>
    </Modal>
  );
};

export const QuickActionCarousel: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [modalType, setModalType] = useState<'habit' | 'task' | 'goal' | 'journal' | null>(null);

  const handleActionPress = (action: QuickAction) => {
    if (action.type === 'navigate' && action.target) {
      navigation.navigate(action.target);
    } else if (action.type === 'modal' && action.modalType) {
      setModalType(action.modalType);
    }
  };

  const handleQuickSave = async (value: string) => {
    if (!user || !modalType) return;

    switch (modalType) {
      case 'habit':
        await addDoc(collection(db, 'habits'), {
          userId: user.uid,
          name: value,
          frequency: 'daily',
          type: 'count',
          targetCount: 1,
          streak: 0,
          active: true,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        break;
      case 'task':
        await addDoc(collection(db, 'tasks'), {
          userId: user.uid,
          title: value,
          completed: false,
          priority: 'medium',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        break;
      case 'journal':
        await addDoc(collection(db, 'journalEntries'), {
          userId: user.uid,
          content: value,
          type: 'quickNote',
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        break;
      case 'goal':
        await addDoc(collection(db, 'goals'), {
          userId: user.uid,
          title: value,
          progress: 0,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
        break;
    }
  };

  return (
    <>
      <View style={styles.container}>
        <Text style={styles.sectionTitle}>
          Quick Actions
        </Text>
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          contentContainerStyle={styles.scrollContent}
        >
          {QUICK_ACTIONS.map((action) => (
            <TouchableOpacity
              key={action.id}
              style={[styles.actionButton, { backgroundColor: action.bgColor }]}
              onPress={() => handleActionPress(action)}
              activeOpacity={0.7}
              accessibilityLabel={action.label}
              accessibilityRole="button"
            >
              <View style={[styles.iconContainer, { backgroundColor: action.color + '20' }]}>
                <Icon name={action.icon as any} size={20} color={action.color} />
              </View>
              <Text style={styles.actionLabel}>{action.label}</Text>
            </TouchableOpacity>
          ))}
        </ScrollView>
      </View>

      <QuickStartModal
        visible={modalType !== null}
        type={modalType}
        onDismiss={() => setModalType(null)}
        onSave={handleQuickSave}
      />
    </>
  );
};

const styles = StyleSheet.create({
  container: {
    marginBottom: Spacing.base,
  },
  sectionTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
    paddingHorizontal: Spacing.base,
  },
  scrollContent: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm,
  },
  actionButton: {
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.base,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
    minWidth: 90,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Layout.borderRadius.full,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.xs,
  },
  actionLabel: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
    textAlign: 'center',
  },
  modal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.lg,
  },
  modalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: Layout.borderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
  },
  input: {
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.mistWhite,
    marginBottom: Spacing.base,
    minHeight: 48,
  },
  examples: {
    marginBottom: Spacing.lg,
  },
  examplesLabel: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  exampleChips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  exampleChip: {
    backgroundColor: Colors.dewSage,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.sm,
  },
  exampleChipText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.evergreenTeal,
  },
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  modalButtonOutline: {
    borderWidth: 1,
    borderColor: Colors.evergreenTeal,
  },
  modalButtonOutlineText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  modalButtonPrimaryText: {
    color: Colors.white,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default QuickActionCarousel;

/**
 * Journal Screen
 * Personal journaling with AI prompts and mood tracking
 */

import React, { useState, useMemo, useEffect, useCallback, memo } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput as RNTextInput, ScrollView, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, InputAccessoryView } from 'react-native';
import { Text, FAB, Portal, Modal, Button as PaperButton, Searchbar, Chip, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Card, LoadingSpinner } from '../components';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useJournal } from '../hooks';
import { createJournalEntry, updateJournalEntry, deleteJournalEntry } from '../services/firebase';
import { getJournalPrompt } from '../services/api';
import { JournalEntry } from '../types';
import { Ionicons } from '@expo/vector-icons';

const INPUT_ACCESSORY_VIEW_ID = 'journalInputAccessory';

const MOODS = [
  { value: 'great', emoji: '😄', label: 'Great' },
  { value: 'good', emoji: '🙂', label: 'Good' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'bad', emoji: '😟', label: 'Bad' },
  { value: 'terrible', emoji: '😢', label: 'Terrible' },
];

// Brain health reflection prompts
const BRAIN_HEALTH_PROMPTS = [
  { text: 'What felt uncomfortable today?', pillar: 'growth', icon: 'sprout' },
  { text: 'What required sustained attention?', pillar: 'focus', icon: 'eye' },
  { text: 'What did you learn that surprised you?', pillar: 'growth', icon: 'lightbulb' },
  { text: 'What challenged you today?', pillar: 'resilience', icon: 'shield-check' },
  { text: 'Who did you connect with?', pillar: 'connection', icon: 'account-heart' },
  { text: 'What gave you energy?', pillar: 'energy', icon: 'lightning-bolt' },
];

// Extracted Journal Entry Modal component to prevent re-renders from parent Firestore subscriptions
interface JournalEntryModalProps {
  visible: boolean;
  editingEntry: JournalEntry | null;
  onDismiss: () => void;
  onSubmit: (data: { text: string; mood: string; tags: string[] }, isEditing: boolean, entryId?: string) => Promise<void>;
}

const JournalEntryModal = memo(({ visible, editingEntry, onDismiss, onSubmit }: JournalEntryModalProps) => {
  const [content, setContent] = useState('');
  const [mood, setMood] = useState('okay');
  const [tags, setTags] = useState<string[]>([]);
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingPrompt, setLoadingPrompt] = useState(false);

  // Reset form when modal opens with editing entry
  useEffect(() => {
    if (visible) {
      if (editingEntry) {
        setContent(editingEntry.text || editingEntry.content || '');
        setMood(editingEntry.mood || 'okay');
        setTags(editingEntry.tags || []);
      } else {
        setContent('');
        setMood('okay');
        setTags([]);
      }
      setTagInput('');
    }
  }, [visible, editingEntry]);

  const handleSelectPrompt = (promptText: string) => {
    const newContent = content.trim()
      ? `${content}\n\n${promptText}\n`
      : `${promptText}\n`;
    setContent(newContent);
  };

  const handleGetAIPrompt = async (brainFocused: boolean = true) => {
    setLoadingPrompt(true);
    try {
      const prompt = await getJournalPrompt(brainFocused ? 'brain-focused' : undefined);
      setContent(prompt);
    } catch (error) {
      console.error('Error getting AI prompt:', error);
      Alert.alert('Error', 'Failed to generate prompt. Please try again.');
    } finally {
      setLoadingPrompt(false);
    }
  };

  const handleAddTag = () => {
    if (!tagInput.trim()) return;

    const newTag = tagInput.trim().toLowerCase();
    if (!tags.includes(newTag)) {
      setTags(prev => [...prev, newTag]);
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setTags(prev => prev.filter((t) => t !== tag));
  };

  const handleSubmit = async () => {
    if (!content.trim()) {
      Alert.alert('Error', 'Please write something in your journal entry');
      return;
    }

    setSubmitting(true);
    try {
      const entryData = {
        text: content,
        mood: mood,
        tags: tags,
      };

      await onSubmit(entryData, !!editingEntry, editingEntry?.id);
      onDismiss();
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save journal entry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleVoiceInput = async () => {
    Alert.alert(
      'Voice Input Not Available',
      'Voice-to-text requires a custom development build and is not available in Expo Go.\n\nYou can use your device keyboard to type your journal entry, or if you need voice input, you can use your device\'s keyboard dictation feature (microphone button on the keyboard).',
      [{ text: 'Got it' }]
    );
  };

  const handleDismiss = useCallback(() => {
    Keyboard.dismiss();
    onDismiss();
  }, [onDismiss]);

  return (
    <Modal
      visible={visible}
      onDismiss={handleDismiss}
      contentContainerStyle={styles.modal}
    >
      <View style={styles.modalHeader}>
        <Text variant="headlineSmall" style={styles.modalTitle}>
          {editingEntry ? 'Edit Entry' : 'New Journal Entry'}
        </Text>
      </View>

      <KeyboardAvoidingView
        behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
        keyboardVerticalOffset={Platform.OS === 'ios' ? 64 : 0}
      >
        <ScrollView
          showsVerticalScrollIndicator={true}
          contentContainerStyle={styles.scrollContent}
          keyboardShouldPersistTaps="handled"
          keyboardDismissMode="on-drag"
        >

          {/* Mood Selector */}
          <Text variant="bodyMedium" style={styles.fieldLabel}>
            How are you feeling?
          </Text>
          <View style={styles.moodButtons}>
            {MOODS.map((m) => (
              <TouchableOpacity
                key={m.value}
                onPress={() => setMood(m.value)}
                style={[
                  styles.moodButton,
                  mood === m.value && styles.moodButtonActive,
                ]}
              >
                <Text style={styles.moodButtonEmoji}>{m.emoji}</Text>
                <Text
                  style={[
                    styles.moodButtonText,
                    mood === m.value && styles.moodButtonTextActive,
                  ]}
                >
                  {m.label}
                </Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* Brain Health Reflection Prompts */}
          <Text variant="bodyMedium" style={styles.fieldLabel}>
            Reflection Prompts
          </Text>
          <Text variant="bodySmall" style={styles.helpText}>
            Tap a prompt to add it to your entry
          </Text>
          <View style={styles.promptsContainer}>
            {BRAIN_HEALTH_PROMPTS.map((prompt, index) => (
              <TouchableOpacity
                key={index}
                style={styles.promptChip}
                onPress={() => handleSelectPrompt(prompt.text)}
              >
                <Text style={styles.promptChipText}>{prompt.text}</Text>
              </TouchableOpacity>
            ))}
          </View>

          {/* AI Prompt Button */}
          <PaperButton
            mode="outlined"
            onPress={() => handleGetAIPrompt()}
            loading={loadingPrompt}
            disabled={loadingPrompt}
            style={styles.aiPromptButton}
            icon="lightbulb-outline"
          >
            Get AI Writing Prompt
          </PaperButton>

          {/* Content Input with Voice Button */}
          <View style={styles.contentInputContainer}>
            <Text variant="bodyMedium" style={styles.fieldLabel}>
              What's on your mind? *
            </Text>
            <View style={styles.textInputWithVoice}>
              <RNTextInput
                value={content}
                onChangeText={setContent}
                placeholder="Write your thoughts or use voice input..."
                multiline
                numberOfLines={15}
                style={styles.largeTextInput}
                textAlignVertical="top"
                blurOnSubmit={false}
                returnKeyType="default"
                inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
              />
              <TouchableOpacity
                style={styles.voiceButton}
                onPress={handleVoiceInput}
              >
                <Ionicons
                  name="mic-outline"
                  size={24}
                  color={Colors.evergreenTeal}
                />
              </TouchableOpacity>
            </View>
          </View>

          {/* Tags Input */}
          <Text variant="bodyMedium" style={styles.fieldLabel}>
            Tags (optional)
          </Text>
          <View style={styles.tagInputContainer}>
            <RNTextInput
              value={tagInput}
              onChangeText={setTagInput}
              placeholder="Add a tag"
              style={styles.tagInput}
              onSubmitEditing={() => {
                handleAddTag();
                Keyboard.dismiss();
              }}
              returnKeyType="done"
              blurOnSubmit={true}
              inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
            />
            <PaperButton
              mode="contained"
              onPress={() => {
                handleAddTag();
                Keyboard.dismiss();
              }}
              disabled={!tagInput.trim()}
              style={styles.addTagButton}
              buttonColor={Colors.evergreenTeal}
            >
              Add
            </PaperButton>
          </View>

          {/* Tags Display */}
          {tags.length > 0 && (
            <View style={styles.tagsDisplay}>
              {tags.map((tag) => (
                <Chip
                  key={tag}
                  style={styles.editTag}
                  textStyle={styles.tagText}
                  onClose={() => handleRemoveTag(tag)}
                >
                  #{tag}
                </Chip>
              ))}
            </View>
          )}

          {/* Modal Actions */}
          <View style={styles.modalActions}>
            <PaperButton
              mode="outlined"
              onPress={handleDismiss}
              style={styles.modalButton}
            >
              Cancel
            </PaperButton>
            <PaperButton
              mode="contained"
              onPress={handleSubmit}
              loading={submitting}
              disabled={submitting}
              style={styles.modalButton}
              buttonColor={Colors.evergreenTeal}
            >
              {editingEntry ? 'Update' : 'Save'}
            </PaperButton>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </Modal>
  );
});

const JournalScreen: React.FC = () => {
  const { user } = useAuth();
  const { entries, loading } = useJournal();
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  // Filter entries by search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries || [];

    const query = searchQuery.toLowerCase();
    return (entries || []).filter((entry) => {
      const entryText = entry.text || entry.content || '';
      return entryText.toLowerCase().includes(query) ||
        entry.tags?.some(tag => tag.toLowerCase().includes(query));
    });
  }, [entries, searchQuery]);

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: { [key: string]: JournalEntry[] } = {};

    filteredEntries.forEach((entry) => {
      // Skip entries without valid createdAt timestamp
      if (!entry.createdAt || !entry.createdAt.seconds) {
        console.warn('Journal entry missing createdAt:', entry.id);
        return;
      }

      const date = new Date(entry.createdAt.seconds * 1000).toLocaleDateString('en-US', {
        weekday: 'long',
        year: 'numeric',
        month: 'long',
        day: 'numeric',
      });

      if (!groups[date]) {
        groups[date] = [];
      }
      groups[date].push(entry);
    });

    return Object.entries(groups).sort((a, b) => {
      const entryA = filteredEntries.find(e => groups[a[0]].includes(e));
      const entryB = filteredEntries.find(e => groups[b[0]].includes(e));

      if (!entryA?.createdAt?.seconds || !entryB?.createdAt?.seconds) {
        return 0;
      }

      const dateA = new Date(entryA.createdAt.seconds * 1000);
      const dateB = new Date(entryB.createdAt.seconds * 1000);
      return dateB.getTime() - dateA.getTime();
    });
  }, [filteredEntries]);

  const handleCreateEntry = useCallback(() => {
    setEditingEntry(null);
    setModalVisible(true);
  }, []);

  const handleEditEntry = useCallback((entry: JournalEntry) => {
    setEditingEntry(entry);
    setModalVisible(true);
  }, []);

  const handleCloseModal = useCallback(() => {
    setModalVisible(false);
    setEditingEntry(null);
  }, []);

  // Memoized callback for submitting entries (used by extracted modal)
  const handleSubmitEntry = useCallback(async (
    data: { text: string; mood: string; tags: string[] },
    isEditing: boolean,
    entryId?: string
  ) => {
    if (isEditing && entryId) {
      await updateJournalEntry(entryId, data);
    } else {
      await createJournalEntry(user!.uid, data);
    }
    setEditingEntry(null);
  }, [user]);

  const handleDeleteEntry = useCallback((entryId: string) => {
    Alert.alert(
      'Delete Entry',
      'Are you sure you want to delete this journal entry?',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: async () => {
            try {
              await deleteJournalEntry(entryId);
            } catch (error) {
              console.error('Error deleting entry:', error);
              Alert.alert('Error', 'Failed to delete entry');
            }
          },
        },
      ]
    );
  }, []);

  const handleViewEntry = useCallback((entry: JournalEntry) => {
    setSelectedEntry(entry);
    setDetailModalVisible(true);
  }, []);

  const getMoodEmoji = (mood: string) => {
    return MOODS.find((m) => m.value === mood)?.emoji || '😐';
  };

  const truncateText = (text: string, maxLength: number = 150) => {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength).trim() + '...';
  };

  const renderEntry = (entry: JournalEntry) => (
    <TouchableOpacity
      key={entry.id}
      onPress={() => handleViewEntry(entry)}
      activeOpacity={0.7}
    >
      <Card style={styles.entryCard}>
        <View style={styles.entryHeader}>
          <Text style={styles.moodEmoji}>{getMoodEmoji(entry.mood)}</Text>
          <Text variant="bodySmall" style={styles.entryTime}>
            {entry.createdAt?.seconds
              ? new Date(entry.createdAt.seconds * 1000).toLocaleTimeString('en-US', {
                  hour: 'numeric',
                  minute: '2-digit',
                })
              : 'N/A'}
          </Text>
        </View>

        <Text variant="bodyMedium" style={styles.entryPreview} numberOfLines={3}>
          {truncateText(entry.text || entry.content || '')}
        </Text>

        {entry.tags && entry.tags.length > 0 && (
          <View style={styles.tagsContainer}>
            {entry.tags.slice(0, 3).map((tag) => (
              <Chip key={tag} style={styles.tag} textStyle={styles.tagText}>
                #{tag}
              </Chip>
            ))}
            {entry.tags.length > 3 && (
              <Text variant="bodySmall" style={styles.moreTagsText}>
                +{entry.tags.length - 3} more
              </Text>
            )}
          </View>
        )}

        <View style={styles.entryFooter}>
          <Text variant="bodySmall" style={styles.readMoreText}>
            Tap to read more
          </Text>
        </View>
      </Card>
    </TouchableOpacity>
  );

  const renderDateSection = ({ item }: { item: [string, JournalEntry[]] }) => {
    const [date, dateEntries] = item;
    return (
      <View style={styles.dateSection}>
        <Text variant="titleMedium" style={styles.dateHeader}>
          {date}
        </Text>
        {dateEntries.map((entry) => renderEntry(entry))}
      </View>
    );
  };

  if (loading) {
    return <LoadingSpinner message="Loading journal..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.screenTitle}>
          Journal
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Reflect on your wellness journey
        </Text>
      </View>

      {/* Search Bar */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search entries..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          iconColor={Colors.evergreenTeal}
        />
      </View>

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Text style={styles.emptyIcon}>📔</Text>
          <Text variant="titleMedium" style={styles.emptyTitle}>
            {searchQuery ? 'No entries found' : 'No journal entries yet'}
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            {searchQuery
              ? 'Try a different search term'
              : 'Start journaling to track your thoughts and feelings'}
          </Text>
        </View>
      ) : (
        <FlatList
          data={groupedEntries}
          renderItem={renderDateSection}
          keyExtractor={(item) => item[0]}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB */}
      <FAB
        icon="plus"
        label="New Entry"
        style={styles.fab}
        onPress={handleCreateEntry}
        color={Colors.textOnPrimary}
      />

      {/* Create/Edit Modal - Extracted to prevent re-renders */}
      <Portal>
        <JournalEntryModal
          visible={modalVisible}
          editingEntry={editingEntry}
          onDismiss={handleCloseModal}
          onSubmit={handleSubmitEntry}
        />
      </Portal>

      {/* Entry Detail Modal */}
      <Portal>
        <Modal
          visible={detailModalVisible}
          onDismiss={() => setDetailModalVisible(false)}
          contentContainerStyle={styles.detailModal}
        >
          <ScrollView showsVerticalScrollIndicator={true}>
            {selectedEntry && (
              <>
                <View style={styles.detailHeader}>
                  <View style={styles.detailMoodRow}>
                    <Text style={styles.detailMoodEmoji}>{getMoodEmoji(selectedEntry.mood)}</Text>
                    <View style={styles.detailDateContainer}>
                      <Text variant="titleMedium" style={styles.detailDate}>
                        {selectedEntry.createdAt?.seconds
                          ? new Date(selectedEntry.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'Date unavailable'}
                      </Text>
                      <Text variant="bodySmall" style={styles.detailTime}>
                        {selectedEntry.createdAt?.seconds
                          ? new Date(selectedEntry.createdAt.seconds * 1000).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                            })
                          : ''}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text variant="bodyLarge" style={styles.detailContent}>
                  {selectedEntry.text || selectedEntry.content || ''}
                </Text>

                {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                  <View style={styles.detailTagsContainer}>
                    {selectedEntry.tags.map((tag) => (
                      <Chip key={tag} style={styles.detailTag} textStyle={styles.tagText}>
                        #{tag}
                      </Chip>
                    ))}
                  </View>
                )}

                <View style={styles.detailActions}>
                  <PaperButton
                    mode="outlined"
                    onPress={() => {
                      setDetailModalVisible(false);
                      handleEditEntry(selectedEntry);
                    }}
                    style={styles.detailActionButton}
                    icon="pencil"
                  >
                    Edit
                  </PaperButton>
                  <PaperButton
                    mode="outlined"
                    onPress={() => {
                      setDetailModalVisible(false);
                      handleDeleteEntry(selectedEntry.id);
                    }}
                    style={styles.detailActionButton}
                    icon="delete"
                    textColor={Colors.error}
                  >
                    Delete
                  </PaperButton>
                </View>

                <PaperButton
                  mode="contained"
                  onPress={() => setDetailModalVisible(false)}
                  style={styles.closeButton}
                  buttonColor={Colors.evergreenTeal}
                >
                  Close
                </PaperButton>
              </>
            )}
          </ScrollView>
        </Modal>
      </Portal>

      {/* Keyboard Accessory Toolbar (iOS) */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={INPUT_ACCESSORY_VIEW_ID}>
          <View style={styles.keyboardAccessory}>
            <TouchableOpacity
              onPress={() => Keyboard.dismiss()}
              style={styles.keyboardAccessoryButton}
            >
              <Text style={styles.keyboardAccessoryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  searchContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.md,
  },
  searchbar: {
    backgroundColor: Colors.surface,
    elevation: 0,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: 100,
  },
  dateSection: {
    marginBottom: Spacing.lg,
  },
  dateHeader: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: Spacing.sm,
  },
  entryCard: {
    marginBottom: Spacing.md,
  },
  entryHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  moodEmoji: {
    fontSize: Typography.fontSize['3xl'] + 4,
  },
  entryTime: {
    color: Colors.textSecondary,
  },
  entryContent: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.relaxed,
  },
  entryPreview: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.relaxed,
  },
  entryFooter: {
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
    alignItems: 'center',
  },
  readMoreText: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  moreTagsText: {
    color: Colors.textSecondary,
    alignSelf: 'center',
    marginLeft: Spacing.xs,
  },
  tagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.sm,
  },
  tag: {
    backgroundColor: Colors.dewSage,
  },
  tagText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xs,
  },
  entryActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
  },
  actionButton: {
    marginLeft: Spacing.sm,
  },
  deleteButton: {
    marginLeft: Spacing.sm,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize: Typography.fontSize['5xl'] + 16,
    marginBottom: Spacing.md,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    backgroundColor: Colors.evergreenTeal,
  },
  modal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalHeader: {
    marginBottom: Spacing.md,
  },
  scrollContent: {
    // No bottom padding needed - modalActions handles spacing
  },
  modalTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
    flex: 1,
  },
  fieldLabel: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  fieldHint: {
    color: Colors.textDisabled,
    fontSize: Typography.fontSize.xs,
    fontStyle: 'italic',
  },
  moodButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  moodButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  moodButtonActive: {
    backgroundColor: Colors.dewSage,
    borderColor: Colors.evergreenTeal,
  },
  moodButtonEmoji: {
    fontSize: Typography.fontSize['2xl'],
    marginBottom: 4,
  },
  moodButtonText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
  },
  moodButtonTextActive: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
  },
  helpText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.sm,
    marginBottom: Spacing.sm,
  },
  promptsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  promptChip: {
    backgroundColor: Colors.dewSage,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.lg,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.evergreenTeal + '40', // 40% opacity
  },
  promptChipText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  aiPromptButton: {
    marginBottom: Spacing.md,
  },
  contentInput: {
    marginBottom: Spacing.md,
  },
  contentInputContainer: {
    marginBottom: Spacing.md,
  },
  textInputWithVoice: {
    position: 'relative',
  },
  largeTextInput: {
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    minHeight: 200,
    maxHeight: 300,
  },
  voiceButton: {
    position: 'absolute',
    bottom: Spacing.sm,
    right: Spacing.sm,
    backgroundColor: Colors.surface,
    padding: Spacing.sm,
    borderRadius: Layout.borderRadius['2xl'],
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 2 },
        shadowOpacity: 0.2,
        shadowRadius: 4,
      },
      android: {
        elevation: 4,
      },
    }),
  },
  tagInputContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  tagInput: {
    flex: 1,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  addTagButton: {
    justifyContent: 'center',
  },
  tagsDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  editTag: {
    backgroundColor: Colors.dewSage,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
  // Detail Modal Styles
  detailModal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.xl * 2,
    borderRadius: Layout.borderRadius.xl,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  detailHeader: {
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
  },
  detailMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  detailMoodEmoji: {
    fontSize: Typography.fontSize['5xl'],
  },
  detailDateContainer: {
    flex: 1,
  },
  detailDate: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 4,
  },
  detailTime: {
    color: Colors.textSecondary,
  },
  detailContent: {
    color: Colors.textPrimary,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.relaxed,
    fontSize: Typography.fontSize.base,
    marginBottom: Spacing.lg,
  },
  detailTagsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.lg,
  },
  detailTag: {
    backgroundColor: Colors.dewSage,
  },
  detailActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  detailActionButton: {
    flex: 1,
  },
  closeButton: {
    marginTop: Spacing.sm,
  },
  // Keyboard Accessory Toolbar
  keyboardAccessory: {
    backgroundColor: Colors.surface,
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: Colors.border,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    flexDirection: 'row',
    justifyContent: 'flex-end',
    alignItems: 'center',
  },
  keyboardAccessoryButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.md,
  },
  keyboardAccessoryButtonText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default JournalScreen;

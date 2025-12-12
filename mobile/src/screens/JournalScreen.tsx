/**
 * Journal Screen
 * Personal journaling with AI prompts and mood tracking
 */

import React, { useState, useMemo, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Alert, TextInput as RNTextInput, ScrollView, KeyboardAvoidingView, Platform } from 'react-native';
import { Text, FAB, Portal, Modal, Button as PaperButton, Searchbar, Chip, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Button, Input, Card, LoadingSpinner } from '../components';
import { Colors, Spacing } from '../constants';
import { useAuth } from '../context/AuthContext';
import { useJournal } from '../hooks';
import { createJournalEntry, updateJournalEntry, deleteJournalEntry } from '../services/firebase';
import { getJournalPrompt } from '../services/api';
import { JournalEntry } from '../types';
import { Ionicons } from '@expo/vector-icons';

const MOODS = [
  { value: 'great', emoji: '😄', label: 'Great' },
  { value: 'good', emoji: '🙂', label: 'Good' },
  { value: 'okay', emoji: '😐', label: 'Okay' },
  { value: 'bad', emoji: '😟', label: 'Bad' },
  { value: 'terrible', emoji: '😢', label: 'Terrible' },
];

const JournalScreen: React.FC = () => {
  const { user } = useAuth();
  const { entries, loading } = useJournal();
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [formData, setFormData] = useState({
    content: '',
    mood: 'okay',
    tags: [] as string[],
  });
  const [tagInput, setTagInput] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [loadingPrompt, setLoadingPrompt] = useState(false);
  const [isRecording, setIsRecording] = useState(false);

  // Filter entries by search query
  const filteredEntries = useMemo(() => {
    if (!searchQuery.trim()) return entries;

    const query = searchQuery.toLowerCase();
    return entries.filter((entry) =>
      entry.content.toLowerCase().includes(query) ||
      entry.tags?.some(tag => tag.toLowerCase().includes(query))
    );
  }, [entries, searchQuery]);

  // Group entries by date
  const groupedEntries = useMemo(() => {
    const groups: { [key: string]: JournalEntry[] } = {};

    filteredEntries.forEach((entry) => {
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
      const dateA = new Date(filteredEntries.find(e => groups[a[0]].includes(e))!.createdAt.seconds * 1000);
      const dateB = new Date(filteredEntries.find(e => groups[b[0]].includes(e))!.createdAt.seconds * 1000);
      return dateB.getTime() - dateA.getTime();
    });
  }, [filteredEntries]);

  const handleCreateEntry = () => {
    setEditingEntry(null);
    setFormData({ content: '', mood: 'okay', tags: [] });
    setTagInput('');
    setModalVisible(true);
  };

  const handleEditEntry = (entry: JournalEntry) => {
    setEditingEntry(entry);
    setFormData({
      content: entry.content,
      mood: entry.mood,
      tags: entry.tags || [],
    });
    setTagInput('');
    setModalVisible(true);
  };

  const handleGetAIPrompt = async () => {
    setLoadingPrompt(true);
    try {
      const prompt = await getJournalPrompt();
      setFormData({ ...formData, content: prompt });
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
    if (!formData.tags.includes(newTag)) {
      setFormData({
        ...formData,
        tags: [...formData.tags, newTag],
      });
    }
    setTagInput('');
  };

  const handleRemoveTag = (tag: string) => {
    setFormData({
      ...formData,
      tags: formData.tags.filter((t) => t !== tag),
    });
  };

  const handleSubmit = async () => {
    if (!formData.content.trim()) {
      Alert.alert('Error', 'Please write something in your journal entry');
      return;
    }

    setSubmitting(true);
    try {
      if (editingEntry) {
        await updateJournalEntry(editingEntry.id, formData);
      } else {
        await createJournalEntry(user!.uid, formData);
      }
      setModalVisible(false);
      setFormData({ content: '', mood: 'okay', tags: [] });
      setTagInput('');
    } catch (error) {
      console.error('Error saving entry:', error);
      Alert.alert('Error', 'Failed to save journal entry. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleDeleteEntry = (entryId: string) => {
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
  };

  const handleVoiceInput = async () => {
    Alert.alert(
      'Voice Input',
      'Voice-to-text feature is coming soon! This will allow you to dictate your journal entries using your device microphone.',
      [{ text: 'OK' }]
    );
    // TODO: Implement voice recognition
    // This would use expo-speech-recognition or @react-native-voice/voice
  };

  const handleViewEntry = (entry: JournalEntry) => {
    setSelectedEntry(entry);
    setDetailModalVisible(true);
  };

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
            {new Date(entry.createdAt.seconds * 1000).toLocaleTimeString('en-US', {
              hour: 'numeric',
              minute: '2-digit',
            })}
          </Text>
        </View>

        <Text variant="bodyMedium" style={styles.entryPreview} numberOfLines={3}>
          {truncateText(entry.content)}
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

      {/* Create/Edit Modal */}
      <Portal>
        <Modal
          visible={modalVisible}
          onDismiss={() => setModalVisible(false)}
          contentContainerStyle={styles.modal}
        >
          <KeyboardAvoidingView
            behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
          >
            <ScrollView
              showsVerticalScrollIndicator={false}
              contentContainerStyle={styles.scrollContent}
            >
              <Text variant="headlineSmall" style={styles.modalTitle}>
                {editingEntry ? 'Edit Entry' : 'New Journal Entry'}
              </Text>

              {/* Mood Selector */}
              <Text variant="bodyMedium" style={styles.fieldLabel}>
                How are you feeling?
              </Text>
              <View style={styles.moodButtons}>
                {MOODS.map((mood) => (
                  <TouchableOpacity
                    key={mood.value}
                    onPress={() => setFormData({ ...formData, mood: mood.value })}
                    style={[
                      styles.moodButton,
                      formData.mood === mood.value && styles.moodButtonActive,
                    ]}
                  >
                    <Text style={styles.moodButtonEmoji}>{mood.emoji}</Text>
                    <Text
                      style={[
                        styles.moodButtonText,
                        formData.mood === mood.value && styles.moodButtonTextActive,
                      ]}
                    >
                      {mood.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </View>

              {/* AI Prompt Button */}
              <PaperButton
                mode="outlined"
                onPress={handleGetAIPrompt}
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
                    value={formData.content}
                    onChangeText={(text) => setFormData({ ...formData, content: text })}
                    placeholder="Write your thoughts or use voice input..."
                    multiline
                    numberOfLines={15}
                    style={styles.largeTextInput}
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={styles.voiceButton}
                    onPress={handleVoiceInput}
                  >
                    <Ionicons
                      name={isRecording ? 'mic' : 'mic-outline'}
                      size={24}
                      color={isRecording ? Colors.error : Colors.evergreenTeal}
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
                  onSubmitEditing={handleAddTag}
                  returnKeyType="done"
                />
                <PaperButton
                  mode="contained"
                  onPress={handleAddTag}
                  disabled={!tagInput.trim()}
                  style={styles.addTagButton}
                  buttonColor={Colors.evergreenTeal}
                >
                  Add
                </PaperButton>
              </View>

              {/* Tags Display */}
              {formData.tags.length > 0 && (
                <View style={styles.tagsDisplay}>
                  {formData.tags.map((tag) => (
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
                  onPress={() => setModalVisible(false)}
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
      </Portal>

      {/* Entry Detail Modal */}
      <Portal>
        <Modal
          visible={detailModalVisible}
          onDismiss={() => setDetailModalVisible(false)}
          contentContainerStyle={styles.detailModal}
        >
          <ScrollView showsVerticalScrollIndicator={false}>
            {selectedEntry && (
              <>
                <View style={styles.detailHeader}>
                  <View style={styles.detailMoodRow}>
                    <Text style={styles.detailMoodEmoji}>{getMoodEmoji(selectedEntry.mood)}</Text>
                    <View style={styles.detailDateContainer}>
                      <Text variant="titleMedium" style={styles.detailDate}>
                        {new Date(selectedEntry.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                          weekday: 'long',
                          year: 'numeric',
                          month: 'long',
                          day: 'numeric',
                        })}
                      </Text>
                      <Text variant="bodySmall" style={styles.detailTime}>
                        {new Date(selectedEntry.createdAt.seconds * 1000).toLocaleTimeString('en-US', {
                          hour: 'numeric',
                          minute: '2-digit',
                        })}
                      </Text>
                    </View>
                  </View>
                </View>

                <Text variant="bodyLarge" style={styles.detailContent}>
                  {selectedEntry.content}
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
    fontWeight: '700',
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
    fontWeight: '600',
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
    fontSize: 32,
  },
  entryTime: {
    color: Colors.textSecondary,
  },
  entryContent: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  entryPreview: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
    lineHeight: 22,
  },
  entryFooter: {
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    paddingTop: Spacing.sm,
    alignItems: 'center',
  },
  readMoreText: {
    color: Colors.evergreenTeal,
    fontWeight: '600',
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
    fontSize: 12,
  },
  entryActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    borderTopWidth: 1,
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
    fontSize: 64,
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
    borderRadius: 12,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  scrollContent: {
    paddingBottom: Spacing.md,
  },
  modalTitle: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.lg,
    fontWeight: '600',
  },
  fieldLabel: {
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
  },
  moodButtons: {
    flexDirection: 'row',
    gap: Spacing.xs,
    marginBottom: Spacing.md,
  },
  moodButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: 8,
    borderWidth: 1,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surface,
  },
  moodButtonActive: {
    backgroundColor: Colors.dewSage,
    borderColor: Colors.evergreenTeal,
  },
  moodButtonEmoji: {
    fontSize: 24,
    marginBottom: 4,
  },
  moodButtonText: {
    fontSize: 10,
    color: Colors.textSecondary,
  },
  moodButtonTextActive: {
    color: Colors.evergreenTeal,
    fontWeight: '600',
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
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 12,
    padding: Spacing.md,
    fontSize: 16,
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
    borderRadius: 20,
    ...Platform.select({
      ios: {
        shadowColor: '#000',
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
    borderWidth: 1,
    borderColor: Colors.border,
    borderRadius: 8,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    fontSize: 14,
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
    borderRadius: 16,
    padding: Spacing.lg,
    maxHeight: '85%',
  },
  detailHeader: {
    marginBottom: Spacing.lg,
    paddingBottom: Spacing.md,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  detailMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.md,
  },
  detailMoodEmoji: {
    fontSize: 48,
  },
  detailDateContainer: {
    flex: 1,
  },
  detailDate: {
    color: Colors.evergreenTeal,
    fontWeight: '600',
    marginBottom: 4,
  },
  detailTime: {
    color: Colors.textSecondary,
  },
  detailContent: {
    color: Colors.textPrimary,
    lineHeight: 26,
    fontSize: 16,
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
});

export default JournalScreen;

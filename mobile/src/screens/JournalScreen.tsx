/**
 * Journal Screen
 * Personal journaling with AI prompts and mood tracking
 */

import React, { useState, useMemo, useEffect, useCallback, memo, useRef } from 'react';
import { View, Text, StyleSheet, SectionList, TouchableOpacity, Alert, TextInput as RNTextInput, ScrollView, KeyboardAvoidingView, Platform, Keyboard, TouchableWithoutFeedback, InputAccessoryView, Modal } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import {
  Button,
  Input,
  LoadingSpinner,
  JournalEntryCard,
  CollapsibleSearchBar,
  FilterChipBar,
  RelativeDateHeader,
  groupEntriesByRelativeDate,
  AIWeeklySummaryCard,
  GentleEncouragementCard,
  MoodGradientDot,
} from '../components';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { getMoodConfig } from '../constants/journalTags';
import { useAuth } from '../context/AuthContext';
import { useJournal, useJournalStats, useWeeklySummary } from '../hooks';
import { useNotificationOptIn } from '../hooks/useNotificationOptIn';
import { createJournalEntry, updateJournalEntry, deleteJournalEntry, refreshWellnessScore } from '../services/firebase';
import { getJournalPromptSuggestions } from '../services/api';
import { JournalEntry } from '../types';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';

const INPUT_ACCESSORY_VIEW_ID = 'journalInputAccessory';

// Mood options for the entry modal (values match MOOD_CONFIG in journalTags.ts)
const MOOD_OPTIONS = [
  { value: 'great', label: 'Great' },
  { value: 'good', label: 'Good' },
  { value: 'okay', label: 'Okay' },
  { value: 'bad', label: 'Low' },
  { value: 'terrible', label: 'Difficult' },
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
  const [aiSuggestions, setAiSuggestions] = useState<string[]>([]);

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
      setLoadingPrompt(false);
      setAiSuggestions([]);
    }
  }, [visible, editingEntry]);

  const handleGetSuggestions = async () => {
    setLoadingPrompt(true);
    try {
      const suggestions = await getJournalPromptSuggestions();
      setAiSuggestions(suggestions);
    } catch (error) {
      console.error('Error getting suggestions:', error);
      Alert.alert('Error', 'Failed to generate suggestions. Please try again.');
    } finally {
      setLoadingPrompt(false);
    }
  };

  const handleSelectSuggestion = (suggestion: string) => {
    const newContent = content.trim()
      ? `${content}\n\n${suggestion}`
      : suggestion;
    setContent(newContent);
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
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
    <TouchableWithoutFeedback onPress={handleDismiss}>
      <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center'}}>
        <TouchableWithoutFeedback onPress={() => {}}>
    <View style={styles.modal}>
      <View style={styles.modalHeader}>
        <Text style={styles.modalTitle}>
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
          <Text style={styles.fieldLabel}>
            How are you feeling?
          </Text>
          <View style={styles.moodButtons}>
            {MOOD_OPTIONS.map((m) => (
              <TouchableOpacity
                key={m.value}
                onPress={() => setMood(m.value)}
                style={[
                  styles.moodButton,
                  mood === m.value && styles.moodButtonActive,
                ]}
                accessibilityRole="button"
                accessibilityLabel={`Mood: ${m.label}`}
                accessibilityState={{ selected: mood === m.value }}
              >
                <View style={styles.moodButtonDot}>
                  <MoodGradientDot mood={m.value} size={20} />
                </View>
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

          {/* AI Suggestions */}
          <TouchableOpacity
            onPress={handleGetSuggestions}
            disabled={loadingPrompt}
            style={{
              flexDirection: 'row',
              alignItems: 'center',
              justifyContent: 'center',
              borderWidth: 1,
              borderColor: Colors.evergreenTeal,
              borderRadius: 8,
              paddingVertical: 10,
              paddingHorizontal: 16,
              marginBottom: Spacing.sm,
              opacity: loadingPrompt ? 0.5 : 1,
            }}
          >
            <Ionicons name="sparkles-outline" size={18} color={Colors.evergreenTeal} style={{marginRight: 8}} />
            <Text style={{color: Colors.evergreenTeal, fontSize: 14, fontWeight: '500'}}>
              {loadingPrompt ? 'Loading...' : 'Inspire Me'}
            </Text>
          </TouchableOpacity>

          {aiSuggestions.length > 0 && (
            <View style={{
              flexDirection: 'row',
              flexWrap: 'wrap',
              gap: Spacing.sm,
              marginBottom: Spacing.base,
            }}>
              {aiSuggestions.map((suggestion, index) => (
                <TouchableOpacity
                  key={index}
                  onPress={() => handleSelectSuggestion(suggestion)}
                  style={{
                    backgroundColor: Colors.dewSage,
                    paddingHorizontal: Spacing.base,
                    paddingVertical: Spacing.sm,
                    borderRadius: Layout.borderRadius.full,
                    borderWidth: Layout.borderWidth.thin,
                    borderColor: Colors.evergreenTeal + '40',
                  }}
                >
                  <Text style={{
                    color: Colors.evergreenTeal,
                    fontSize: Typography.fontSize.sm,
                    fontWeight: Typography.fontWeight.medium,
                  }}>
                    {suggestion}
                  </Text>
                </TouchableOpacity>
              ))}
            </View>
          )}

          {/* Content Input with Voice Button */}
          <View style={styles.contentInputContainer}>
            <Text style={styles.fieldLabel}>
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
          <Text style={styles.fieldLabel}>
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
            <TouchableOpacity
              onPress={() => {
                handleAddTag();
                Keyboard.dismiss();
              }}
              disabled={!tagInput.trim()}
              style={[styles.addTagButton, {backgroundColor: Colors.evergreenTeal, borderRadius: 8, paddingHorizontal: 16, justifyContent: 'center', opacity: !tagInput.trim() ? 0.5 : 1}]}
            >
              <Text style={{color: '#fff', fontSize: 14, fontWeight: '500'}}>Add</Text>
            </TouchableOpacity>
          </View>

          {/* Tags Display */}
          {tags.length > 0 && (
            <View style={styles.tagsDisplay}>
              {tags.map((tag) => (
                <View key={tag} style={[styles.editTag, {flexDirection: 'row', alignItems: 'center', paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16}]}>
                  <Text style={styles.tagText}>#{tag}</Text>
                  <TouchableOpacity onPress={() => handleRemoveTag(tag)} style={{marginLeft: 6}}>
                    <Ionicons name="close-circle" size={16} color={Colors.evergreenTeal} />
                  </TouchableOpacity>
                </View>
              ))}
            </View>
          )}

          {/* Modal Actions */}
          <View style={styles.modalActions}>
            <TouchableOpacity
              onPress={handleDismiss}
              style={[styles.modalButton, {borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingVertical: 10, alignItems: 'center' as const}]}
            >
              <Text style={{color: Colors.textPrimary, fontSize: 14, fontWeight: '500'}}>Cancel</Text>
            </TouchableOpacity>
            <TouchableOpacity
              onPress={handleSubmit}
              disabled={submitting}
              style={[styles.modalButton, {backgroundColor: Colors.evergreenTeal, borderRadius: 8, paddingVertical: 10, alignItems: 'center' as const, opacity: submitting ? 0.5 : 1}]}
            >
              <Text style={{color: '#fff', fontSize: 14, fontWeight: '500'}}>{submitting ? 'Saving...' : (editingEntry ? 'Update' : 'Save')}</Text>
            </TouchableOpacity>
          </View>
        </ScrollView>
      </KeyboardAvoidingView>
    </View>
        </TouchableWithoutFeedback>
      </View>
    </TouchableWithoutFeedback>
    </Modal>
  );
});

const JournalScreen: React.FC = () => {
  const { user } = useAuth();
  const { entries, loading } = useJournal();
  const navigation = useNavigation<any>();
  const { shouldShowPrompt: shouldShowNotifPrompt, markPromptShown: markNotifPromptShown } = useNotificationOptIn();
  const notifOptInChecked = useRef(false);
  const [modalVisible, setModalVisible] = useState(false);
  const [detailModalVisible, setDetailModalVisible] = useState(false);
  const [selectedEntry, setSelectedEntry] = useState<JournalEntry | null>(null);
  const [editingEntry, setEditingEntry] = useState<JournalEntry | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedTagFilter, setSelectedTagFilter] = useState<string | null>(null);

  // Journal stats for filter chips
  const journalStats = useJournalStats(entries || []);

  // AI weekly summary
  const {
    summary: weeklySummary,
    loading: summaryLoading,
    error: summaryError,
    refetch: refetchSummary,
    hasEnoughEntries: summaryHasEnoughEntries,
  } = useWeeklySummary(entries || []);

  // Filter entries by search query and tag
  const filteredEntries = useMemo(() => {
    let result = entries || [];

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter((entry) => {
        const entryText = entry.text || entry.content || '';
        return entryText.toLowerCase().includes(query) ||
          entry.tags?.some(tag => tag.toLowerCase().includes(query));
      });
    }

    // Filter by selected tag
    if (selectedTagFilter) {
      result = result.filter((entry) =>
        entry.tags?.includes(selectedTagFilter)
      );
    }

    return result;
  }, [entries, searchQuery, selectedTagFilter]);

  // Group entries by relative date (Today, Yesterday, This Week, etc.)
  const groupedEntries = useMemo(() => {
    // Filter out entries without valid timestamps
    const validEntries = filteredEntries.filter((entry) => {
      if (!entry.createdAt || !entry.createdAt.seconds) {
        console.warn('Journal entry missing createdAt:', entry.id);
        return false;
      }
      return true;
    });

    return groupEntriesByRelativeDate(validEntries);
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
    // Cast mood to the expected type
    if (!user?.uid) return;

    const entryData = {
      text: data.text,
      mood: data.mood as 'great' | 'good' | 'okay' | 'bad' | 'terrible',
      tags: data.tags,
    };

    if (isEditing && entryId) {
      await updateJournalEntry(entryId, entryData);
    } else {
      await createJournalEntry(user.uid, entryData);

      // Notification opt-in: trigger on first journal entry save
      if (!notifOptInChecked.current && shouldShowNotifPrompt) {
        notifOptInChecked.current = true;
        markNotifPromptShown();
        navigation.navigate('NotificationOptIn');
      }
    }
    setEditingEntry(null);

    // Refresh wellness score to reflect journal activity (affects Mind pillar)
    if (user?.uid) {
      try {
        await refreshWellnessScore(user.uid);
      } catch (error) {
        console.error('Error refreshing wellness score after journal entry:', error);
      }
    }
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

  const handleClearSearch = useCallback(() => {
    setSearchQuery('');
  }, []);

  // Render individual entry using JournalEntryCard
  const renderEntry = useCallback(({ item: entry }: { item: JournalEntry }) => (
    <JournalEntryCard
      entry={entry}
      onPress={() => handleViewEntry(entry)}
      onLongPress={() => handleEditEntry(entry)}
    />
  ), [handleViewEntry, handleEditEntry]);

  // Render section header with relative date
  const renderSectionHeader = useCallback(({ section }: { section: { dateGroup: any; date?: Date } }) => (
    <RelativeDateHeader dateGroup={section.dateGroup} date={section.date} />
  ), []);

  // Get section key
  const getSectionKey = useCallback((section: any) => {
    return `${section.dateGroup}-${section.date?.getTime() || 'none'}`;
  }, []);

  if (loading) {
    return <LoadingSpinner message="Loading journal..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header with back button and + Reflect button */}
      <View style={styles.header}>
        <TouchableOpacity
          onPress={() => navigation.goBack()}
          style={styles.backButton}
          accessibilityLabel="Go back"
          accessibilityRole="button"
        >
          <Ionicons name="chevron-back" size={28} color={Colors.evergreenTeal} />
        </TouchableOpacity>
        <View style={styles.headerCenter}>
          <Text style={styles.screenTitle}>
            Journal
          </Text>
          <Text style={styles.subtitle}>
            Reflect on your wellness journey
          </Text>
        </View>
        <TouchableOpacity
          onPress={handleCreateEntry}
          style={styles.reflectButton}
          accessibilityLabel="Create new journal entry"
          accessibilityRole="button"
        >
          <Ionicons name="add" size={20} color={Colors.textOnPrimary} />
          <Text style={styles.reflectButtonText}>Reflect</Text>
        </TouchableOpacity>
      </View>

      {/* Collapsible Search Bar and Filter Chips */}
      <View style={styles.toolbarContainer}>
        <CollapsibleSearchBar
          value={searchQuery}
          onChangeText={setSearchQuery}
          onClear={handleClearSearch}
          placeholder="Search entries..."
        />
      </View>

      {/* Filter Chips */}
      <FilterChipBar
        tags={journalStats.topTags}
        selectedTag={selectedTagFilter}
        onSelectTag={setSelectedTagFilter}
      />

      {/* Entries List */}
      {filteredEntries.length === 0 ? (
        <View style={styles.emptyContainer}>
          {/* Show encouragement card if no entries this week, otherwise show empty state */}
          {!journalStats.hasEntriesThisWeek && !searchQuery && !selectedTagFilter ? (
            <GentleEncouragementCard visible={true} />
          ) : (
            <>
              <Text style={styles.emptyIcon}>📔</Text>
              <Text style={styles.emptyTitle}>
                {searchQuery || selectedTagFilter ? 'No entries found' : 'No journal entries yet'}
              </Text>
              <Text style={styles.emptyText}>
                {searchQuery || selectedTagFilter
                  ? 'Try a different search or filter'
                  : 'Start journaling to track your thoughts and feelings'}
              </Text>
            </>
          )}
        </View>
      ) : (
        <SectionList
          sections={groupedEntries}
          renderItem={renderEntry}
          renderSectionHeader={renderSectionHeader}
          keyExtractor={(item) => item.id}
          stickySectionHeadersEnabled={true}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={
            <AIWeeklySummaryCard
              summary={weeklySummary}
              loading={summaryLoading}
              error={summaryError}
              onRetry={refetchSummary}
              hasEnoughEntries={summaryHasEnoughEntries}
              weekEntryCount={journalStats.thisWeekCount}
            />
          }
        />
      )}

      {/* Create/Edit Modal - Extracted to prevent re-renders */}
      <JournalEntryModal
        visible={modalVisible}
        editingEntry={editingEntry}
        onDismiss={handleCloseModal}
        onSubmit={handleSubmitEntry}
      />

      {/* Entry Detail Modal */}
      <Modal
        visible={detailModalVisible}
        transparent
        animationType="fade"
        onRequestClose={() => setDetailModalVisible(false)}
      >
        <TouchableWithoutFeedback onPress={() => setDetailModalVisible(false)}>
          <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center'}}>
            <TouchableWithoutFeedback onPress={() => {}}>
        <View style={styles.detailModal}>
          <ScrollView showsVerticalScrollIndicator={true}>
            {selectedEntry && (
              <>
                <View style={styles.detailHeader}>
                  <View style={styles.detailMoodRow}>
                    <View style={styles.detailMoodContainer}>
                      <MoodGradientDot mood={selectedEntry.mood || 'okay'} size={24} />
                      <Text style={styles.detailMoodLabel}>
                        {getMoodConfig(selectedEntry.mood || 'okay').label}
                      </Text>
                    </View>
                    <View style={styles.detailDateContainer}>
                      <Text style={styles.detailDate}>
                        {selectedEntry.createdAt?.seconds
                          ? new Date(selectedEntry.createdAt.seconds * 1000).toLocaleDateString('en-US', {
                              weekday: 'long',
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                            })
                          : 'Date unavailable'}
                      </Text>
                      <Text style={styles.detailTime}>
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

                <Text style={styles.detailContent}>
                  {selectedEntry.text || selectedEntry.content || ''}
                </Text>

                {selectedEntry.tags && selectedEntry.tags.length > 0 && (
                  <View style={styles.detailTagsContainer}>
                    {selectedEntry.tags.map((tag) => (
                      <View key={tag} style={[styles.detailTag, {paddingHorizontal: 12, paddingVertical: 6, borderRadius: 16}]}>
                        <Text style={styles.tagText}>#{tag}</Text>
                      </View>
                    ))}
                  </View>
                )}

                <View style={styles.detailActions}>
                  <TouchableOpacity
                    onPress={() => {
                      setDetailModalVisible(false);
                      handleEditEntry(selectedEntry);
                    }}
                    style={[styles.detailActionButton, {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingVertical: 10}]}
                  >
                    <Ionicons name="pencil-outline" size={16} color={Colors.textPrimary} style={{marginRight: 6}} />
                    <Text style={{color: Colors.textPrimary, fontSize: 14, fontWeight: '500'}}>Edit</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    onPress={() => {
                      setDetailModalVisible(false);
                      handleDeleteEntry(selectedEntry.id);
                    }}
                    style={[styles.detailActionButton, {flexDirection: 'row', alignItems: 'center', justifyContent: 'center', borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingVertical: 10}]}
                  >
                    <Ionicons name="trash-outline" size={16} color={Colors.error} style={{marginRight: 6}} />
                    <Text style={{color: Colors.error, fontSize: 14, fontWeight: '500'}}>Delete</Text>
                  </TouchableOpacity>
                </View>

                <TouchableOpacity
                  onPress={() => setDetailModalVisible(false)}
                  style={[styles.closeButton, {backgroundColor: Colors.evergreenTeal, borderRadius: 8, paddingVertical: 12, alignItems: 'center' as const}]}
                >
                  <Text style={{color: '#fff', fontSize: 14, fontWeight: '500'}}>Close</Text>
                </TouchableOpacity>
              </>
            )}
          </ScrollView>
        </View>
            </TouchableWithoutFeedback>
          </View>
        </TouchableWithoutFeedback>
      </Modal>

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
    backgroundColor: Colors.background.default,
  },
  header: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.base,
  },
  backButton: {
    width: 48,
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerCenter: {
    flex: 1,
    paddingHorizontal: Spacing.sm,
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  reflectButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.evergreenTeal,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: Layout.borderRadius.full,
    gap: Spacing.xs,
    minHeight: 48,
  },
  reflectButtonText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  toolbarContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: 100,
  },
  tag: {
    backgroundColor: Colors.dewSage,
  },
  tagText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.xs,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    fontSize: Typography.fontSize['5xl'] + 16,
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
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
    marginBottom: Spacing.base,
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
    marginBottom: Spacing.base,
  },
  moodButton: {
    flex: 1,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.border,
    alignItems: 'center',
    backgroundColor: Colors.surface,
    minHeight: 56,
    justifyContent: 'center',
  },
  moodButtonActive: {
    backgroundColor: Colors.dewSage,
    borderColor: Colors.evergreenTeal,
  },
  moodButtonDot: {
    marginBottom: Spacing.xs,
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
  contentInput: {
    marginBottom: Spacing.base,
  },
  contentInputContainer: {
    marginBottom: Spacing.base,
  },
  textInputWithVoice: {
    position: 'relative',
  },
  largeTextInput: {
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.base,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.background.default,
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
    marginBottom: Spacing.base,
  },
  tagInput: {
    flex: 1,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.background.default,
  },
  addTagButton: {
    justifyContent: 'center',
  },
  tagsDisplay: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
    marginBottom: Spacing.base,
  },
  editTag: {
    backgroundColor: Colors.dewSage,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.base,
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
    paddingBottom: Spacing.base,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
  },
  detailMoodRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.base,
  },
  detailMoodContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  detailMoodLabel: {
    fontSize: Typography.fontSize.base,
    color: Colors.textSecondary,
    fontWeight: Typography.fontWeight.medium,
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
    marginBottom: Spacing.base,
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
    paddingHorizontal: Spacing.base,
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

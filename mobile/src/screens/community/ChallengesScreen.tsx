/**
 * Challenges Screen
 * Browse and join time-limited wellness challenges
 */

import React, { useState, useEffect, useCallback, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  Keyboard,
  ScrollView,
  Platform,
  TouchableOpacity,
  RefreshControl,
} from 'react-native';
import {
  Text,
  SegmentedButtons,
  Searchbar,
  FAB,
  Portal,
  Modal,
  Button as PaperButton,
  Switch,
  Chip,
} from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, LoadingSpinner, Input } from '../../components';
import { KeyboardAwareScrollView } from '../../components/shared';
import ChallengeCard from '../../components/community/ChallengeCard';
import { InvitePermissionPicker, InvitePermission } from '../../components/community';
import {
  Colors,
  Spacing,
  Typography,
  Layout,
  GROUP_CATEGORY_LIST,
  getGroupCategory,
} from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import {
  fetchChallenges,
  createChallenge,
  joinChallenge,
  fetchMyParticipation,
  checkIn,
  isUserMemberOfChallenge,
  CreateChallengeInput,
} from '../../services/firebase/challenges.service';
import { Challenge, ChallengeParticipant, GroupCategory, ChallengeFrequency } from '../../types/models';
import DateTimePicker from '@react-native-community/datetimepicker';

const ChallengesScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<'all' | 'my' | 'active'>('active');
  const [categoryFilter, setCategoryFilter] = useState<GroupCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Data state
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [participations, setParticipations] = useState<Record<string, ChallengeParticipant | null>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);

  // Create challenge modal state
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [submitting, setSubmitting] = useState(false);

  // Form state
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [challengeGoal, setChallengeGoal] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<GroupCategory>('fitness');
  const [frequency, setFrequency] = useState<ChallengeFrequency>('daily');
  const [targetCount, setTargetCount] = useState('20');
  const [unit, setUnit] = useState('times');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000)); // 30 days from now
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [invitePermission, setInvitePermission] = useState<InvitePermission>('owner_only');

  // Load challenges
  const loadChallenges = useCallback(async () => {
    try {
      const data = await fetchChallenges(filter, user?.uid);
      setChallenges(data);

      // Load participation for each challenge the user is part of
      if (user) {
        const participationPromises = data
          .filter((c) => c.members.includes(user.uid))
          .map(async (c) => {
            const p = await fetchMyParticipation(c.id);
            return { id: c.id, participation: p };
          });

        const results = await Promise.all(participationPromises);
        const participationMap: Record<string, ChallengeParticipant | null> = {};
        results.forEach((r) => {
          participationMap[r.id] = r.participation;
        });
        setParticipations(participationMap);
      }
    } catch (error) {
      console.error('Error loading challenges:', error);
      Alert.alert('Error', 'Failed to load challenges');
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  }, [filter, user]);

  useEffect(() => {
    loadChallenges();
  }, [loadChallenges]);

  const onRefresh = useCallback(() => {
    setRefreshing(true);
    loadChallenges();
  }, [loadChallenges]);

  // Filter challenges
  const filteredChallenges = useMemo(() => {
    let result = challenges;

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (c) =>
          c.name.toLowerCase().includes(query) ||
          c.description?.toLowerCase().includes(query) ||
          c.challengeGoal.toLowerCase().includes(query)
      );
    }

    if (categoryFilter !== 'all') {
      result = result.filter((c) => c.category === categoryFilter);
    }

    return result;
  }, [challenges, searchQuery, categoryFilter]);

  // Handlers
  const handleJoinChallenge = async (challengeId: string, challengeName: string) => {
    try {
      await joinChallenge(challengeId);
      Alert.alert('Success', `You joined "${challengeName}"!`);
      loadChallenges();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join challenge');
    }
  };

  const handleCheckIn = async (challengeId: string) => {
    try {
      await checkIn(challengeId);
      Alert.alert('Great job!', "You've checked in for today!");
      loadChallenges();
    } catch (error: any) {
      if (error.message === 'Already checked in today') {
        Alert.alert('Already Done', "You've already checked in today. Keep up the great work!");
      } else {
        Alert.alert('Error', error.message || 'Failed to check in');
      }
    }
  };

  const handleNavigateToChallenge = (challengeId: string, challengeName: string) => {
    navigation.navigate('ChallengeDetail', { challengeId, challengeName });
  };

  const handleCreateChallenge = async () => {
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
      const input: CreateChallengeInput = {
        name: name.trim(),
        description: description.trim(),
        visibility: isPublic ? 'public' : 'private',
        category: selectedCategory,
        challengeGoal: challengeGoal.trim(),
        startDate,
        endDate,
        frequency,
        targetCount: parseInt(targetCount, 10) || 20,
        unit: unit.trim() || 'times',
        invitePermission,
      };

      await createChallenge(input);
      Alert.alert('Success', 'Challenge created! Invite others to join.');
      resetForm();
      setShowCreateModal(false);
      loadChallenges();
    } catch (error: any) {
      console.error('Error creating challenge:', error);
      Alert.alert('Error', error.message || 'Failed to create challenge');
    } finally {
      setSubmitting(false);
    }
  };

  const resetForm = () => {
    setName('');
    setDescription('');
    setChallengeGoal('');
    setIsPublic(true);
    setSelectedCategory('fitness');
    setFrequency('daily');
    setTargetCount('20');
    setUnit('times');
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    setInvitePermission('owner_only');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text variant="headlineMedium" style={styles.screenTitle}>
              Challenges
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Join a challenge, build accountability
            </Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search challenges..."
          onChangeText={setSearchQuery}
          value={searchQuery}
          style={styles.searchbar}
          iconColor={Colors.evergreenTeal}
        />
      </View>

      {/* Filter Tabs */}
      <View style={styles.filterContainer}>
        <SegmentedButtons
          value={filter}
          onValueChange={(value) => setFilter(value as 'all' | 'my' | 'active')}
          buttons={[
            { value: 'active', label: 'Active' },
            { value: 'my', label: 'My Challenges' },
            { value: 'all', label: 'All' },
          ]}
          style={styles.segmentedButtons}
        />
      </View>

      {/* Category Filter */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        <Chip
          selected={categoryFilter === 'all'}
          onPress={() => setCategoryFilter('all')}
          style={[styles.categoryChip, categoryFilter === 'all' && styles.categoryChipSelected]}
          textStyle={categoryFilter === 'all' ? styles.categoryChipTextSelected : undefined}
        >
          All
        </Chip>
        {GROUP_CATEGORY_LIST.map((cat) => (
          <Chip
            key={cat.key}
            selected={categoryFilter === cat.key}
            onPress={() => setCategoryFilter(cat.key)}
            style={[
              styles.categoryChip,
              categoryFilter === cat.key && styles.categoryChipSelected,
            ]}
            textStyle={categoryFilter === cat.key ? styles.categoryChipTextSelected : undefined}
            icon={() => (
              <Icon
                name={cat.icon as any}
                size={16}
                color={categoryFilter === cat.key ? Colors.textOnPrimary : cat.color}
              />
            )}
          >
            {cat.label}
          </Chip>
        ))}
      </ScrollView>

      {/* Challenges List */}
      {loading ? (
        <LoadingSpinner message="Loading challenges..." />
      ) : filteredChallenges.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="trophy-outline" size={64} color={Colors.textSecondary} style={styles.emptyIcon} />
          <Text variant="titleMedium" style={styles.emptyTitle}>
            {searchQuery || categoryFilter !== 'all' ? 'No challenges found' : 'No challenges yet'}
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            {searchQuery
              ? 'Try a different search term'
              : filter === 'my'
              ? "You haven't joined any challenges yet"
              : 'Be the first to create a challenge!'}
          </Text>
          <Button variant="primary" style={styles.createButton} onPress={() => setShowCreateModal(true)}>
            Create Challenge
          </Button>
        </View>
      ) : (
        <FlatList
          data={filteredChallenges}
          renderItem={({ item }) => (
            <ChallengeCard
              challenge={item}
              participation={participations[item.id]}
              isMember={isUserMemberOfChallenge(item, user?.uid)}
              onPress={() => handleNavigateToChallenge(item.id, item.name)}
              onJoin={() => handleJoinChallenge(item.id, item.name)}
              onCheckIn={() => handleCheckIn(item.id)}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.evergreenTeal]} />
          }
        />
      )}

      {/* FAB */}
      <FAB
        icon="plus"
        label="Create"
        style={styles.fab}
        onPress={() => setShowCreateModal(true)}
        color={Colors.textOnPrimary}
      />

      {/* Create Challenge Modal */}
      <Portal>
        <Modal
          visible={showCreateModal}
          onDismiss={() => {
            Keyboard.dismiss();
            setShowCreateModal(false);
          }}
          contentContainerStyle={styles.modal}
        >
          <KeyboardAwareScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            enableKeyboardAvoidance={false}
          >
              <Text variant="headlineSmall" style={styles.modalTitle}>
                Create a Challenge
              </Text>

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

              {/* Category Selection */}
              <Text variant="bodyLarge" style={styles.sectionLabel}>
                Category
              </Text>
              <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelectScroll}>
                {GROUP_CATEGORY_LIST.map((cat) => (
                  <TouchableOpacity
                    key={cat.key}
                    style={[
                      styles.categorySelectItem,
                      selectedCategory === cat.key && styles.categorySelectItemActive,
                      { borderColor: cat.color },
                    ]}
                    onPress={() => setSelectedCategory(cat.key)}
                  >
                    <Icon
                      name={cat.icon as any}
                      size={24}
                      color={selectedCategory === cat.key ? Colors.textOnPrimary : cat.color}
                    />
                    <Text
                      style={[
                        styles.categorySelectText,
                        selectedCategory === cat.key && styles.categorySelectTextActive,
                      ]}
                    >
                      {cat.label}
                    </Text>
                  </TouchableOpacity>
                ))}
              </ScrollView>

              {/* Frequency Selection */}
              <Text variant="bodyLarge" style={styles.sectionLabel}>
                Check-in Frequency
              </Text>
              <SegmentedButtons
                value={frequency}
                onValueChange={(value) => setFrequency(value as ChallengeFrequency)}
                buttons={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'total', label: 'Total' },
                ]}
                style={styles.frequencyButtons}
              />

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
              <Text variant="bodyLarge" style={styles.sectionLabel}>
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
                    setShowStartPicker(false);
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
                    setShowEndPicker(false);
                    if (date) setEndDate(date);
                  }}
                />
              )}

              {/* Public/Private Switch */}
              <View style={styles.switchContainer}>
                <View style={styles.switchLabel}>
                  <Text variant="bodyLarge" style={styles.switchLabelText}>
                    Public Challenge
                  </Text>
                  <Text variant="bodySmall" style={styles.switchDescription}>
                    Anyone can discover and join
                  </Text>
                </View>
                <Switch value={isPublic} onValueChange={setIsPublic} color={Colors.evergreenTeal} />
              </View>

              {/* Invite Permissions */}
              <InvitePermissionPicker
                value={invitePermission}
                onChange={setInvitePermission}
                entityType="challenge"
              />

              {/* Actions */}
              <View style={styles.modalActions}>
                <PaperButton mode="outlined" onPress={() => setShowCreateModal(false)} style={styles.modalButton}>
                  Cancel
                </PaperButton>
                <PaperButton
                  mode="contained"
                  onPress={handleCreateChallenge}
                  loading={submitting}
                  disabled={submitting || !name.trim() || !challengeGoal.trim()}
                  style={styles.modalButton}
                  buttonColor={Colors.evergreenTeal}
                >
                  Create
                </PaperButton>
              </View>
          </KeyboardAwareScrollView>
        </Modal>
      </Portal>
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
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    padding: Spacing.xs,
    marginRight: Spacing.sm,
  },
  headerTitles: {
    flex: 1,
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
    marginBottom: Spacing.base,
  },
  searchbar: {
    backgroundColor: Colors.surface,
    elevation: 0,
  },
  filterContainer: {
    paddingHorizontal: Spacing.lg,
    marginBottom: Spacing.sm,
  },
  segmentedButtons: {
    backgroundColor: Colors.surface,
  },
  categoryScroll: {
    maxHeight: 44,
    marginBottom: Spacing.base,
  },
  categoryContainer: {
    paddingHorizontal: Spacing.lg,
    gap: Spacing.xs,
  },
  categoryChip: {
    backgroundColor: Colors.surface,
    marginRight: Spacing.xs,
  },
  categoryChipSelected: {
    backgroundColor: Colors.evergreenTeal,
  },
  categoryChipTextSelected: {
    color: Colors.textOnPrimary,
  },
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
    marginBottom: Spacing.base,
  },
  emptyTitle: {
    color: Colors.textPrimary,
    marginBottom: Spacing.sm,
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    marginBottom: Spacing.lg,
  },
  createButton: {
    minWidth: 160,
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
    padding: Spacing.lg,
    maxHeight: '90%',
  },
  scrollContent: {
    paddingBottom: Spacing.base,
  },
  modalTitle: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.lg,
    fontWeight: Typography.fontWeight.semibold,
  },
  input: {
    marginBottom: Spacing.base,
  },
  sectionLabel: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.sm,
  },
  categorySelectScroll: {
    marginBottom: Spacing.base,
  },
  categorySelectItem: {
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 2,
    marginRight: Spacing.sm,
    minWidth: 80,
    backgroundColor: Colors.surface,
  },
  categorySelectItemActive: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  categorySelectText: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 4,
  },
  categorySelectTextActive: {
    color: Colors.textOnPrimary,
    fontWeight: Typography.fontWeight.medium,
  },
  frequencyButtons: {
    marginBottom: Spacing.base,
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
    marginBottom: Spacing.lg,
    borderTopWidth: Layout.borderWidth.thin,
    borderBottomWidth: Layout.borderWidth.thin,
    borderColor: Colors.borderLight,
  },
  switchLabel: {
    flex: 1,
  },
  switchLabelText: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.medium,
    marginBottom: Spacing.xs / 2,
  },
  switchDescription: {
    color: Colors.textSecondary,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    marginTop: Spacing.base,
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
});

export default ChallengesScreen;

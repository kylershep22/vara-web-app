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
  TextInput,
} from 'react-native';
import { Text } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, LoadingSpinner, Input } from '../../components';
import { EnhancedModal, ModalFooterActions } from '../../components/shared/EnhancedModal';
import ChallengeCard from '../../components/community/ChallengeCard';
import QuickStatusCard from '../../components/community/QuickStatusCard';
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
  hasCheckedInToday,
  isUserMemberOfChallenge,
  CreateChallengeInput,
} from '../../services/firebase/challenges.service';
import { getUserDisplayInfo } from '../../services/firebase/invites.service';
import { getGroupInfo } from '../../services/firebase/community.service';
import { Challenge, ChallengeParticipant, GroupCategory, ChallengeFrequency } from '../../types/models';
import DateTimePicker from '@react-native-community/datetimepicker';
import { SegmentedButtons, Switch } from 'react-native-paper';

type FilterType = 'all' | 'my' | 'active';

const FILTER_OPTIONS: { value: FilterType; label: string }[] = [
  { value: 'active', label: 'Active' },
  { value: 'my', label: 'My Challenges' },
  { value: 'all', label: 'All' },
];

const ChallengesScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<FilterType>('active');
  const [categoryFilter, setCategoryFilter] = useState<GroupCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [searchFocused, setSearchFocused] = useState(false);

  // Data state
  const [challenges, setChallenges] = useState<Challenge[]>([]);
  const [participations, setParticipations] = useState<Record<string, ChallengeParticipant | null>>({});
  const [checkedInMap, setCheckedInMap] = useState<Record<string, boolean>>({});
  const [ownerProfiles, setOwnerProfiles] = useState<Record<string, { displayName: string; avatar?: string }>>({});
  const [groupNames, setGroupNames] = useState<Record<string, string>>({});
  const [loading, setLoading] = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [joiningChallengeId, setJoiningChallengeId] = useState<string | null>(null);
  const [checkingInChallengeId, setCheckingInChallengeId] = useState<string | null>(null);

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
  const [targetCount, setTargetCount] = useState('');
  const [unit, setUnit] = useState('');
  const [startDate, setStartDate] = useState(new Date());
  const [endDate, setEndDate] = useState(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
  const [showStartPicker, setShowStartPicker] = useState(false);
  const [showEndPicker, setShowEndPicker] = useState(false);
  const [invitePermission, setInvitePermission] = useState<InvitePermission>('owner_only');

  // Load challenges
  const loadChallenges = useCallback(async () => {
    try {
      const data = await fetchChallenges(filter, user?.uid);
      setChallenges(data);

      if (user) {
        // Load participation for joined challenges
        const joinedChallenges = data.filter((c) => c.members.includes(user.uid));
        const participationPromises = joinedChallenges.map(async (c) => {
          const p = await fetchMyParticipation(c.id);
          return { id: c.id, participation: p };
        });

        const results = await Promise.all(participationPromises);
        const participationMap: Record<string, ChallengeParticipant | null> = {};
        results.forEach((r) => {
          participationMap[r.id] = r.participation;
        });
        setParticipations(participationMap);

        // Load check-in status for joined active challenges
        const activeJoined = joinedChallenges.filter((c) => c.status === 'active');
        const checkInPromises = activeJoined.map(async (c) => {
          const checked = await hasCheckedInToday(c.id);
          return { id: c.id, checked };
        });
        const checkInResults = await Promise.all(checkInPromises);
        const checkInMap: Record<string, boolean> = {};
        checkInResults.forEach((r) => {
          checkInMap[r.id] = r.checked;
        });
        setCheckedInMap(checkInMap);

        // Load owner profiles (deduplicated)
        const uniqueOwnerIds = [...new Set(data.map((c) => c.ownerId))];
        const profilePromises = uniqueOwnerIds.map(async (ownerId) => {
          const info = await getUserDisplayInfo(ownerId);
          return { ownerId, info };
        });
        const profileResults = await Promise.all(profilePromises);
        const profiles: Record<string, { displayName: string; avatar?: string }> = {};
        profileResults.forEach((r) => {
          if (r.info) {
            profiles[r.ownerId] = { displayName: r.info.displayName, avatar: r.info.avatar };
          }
        });
        setOwnerProfiles(profiles);

        // Load group names for challenges with sourceGroupId
        const challengesWithGroup = data.filter((c) => c.sourceGroupId);
        const uniqueGroupIds = [...new Set(challengesWithGroup.map((c) => c.sourceGroupId!))];
        if (uniqueGroupIds.length > 0) {
          const groupPromises = uniqueGroupIds.map(async (groupId) => {
            try {
              const group = await getGroupInfo(groupId);
              return { groupId, name: group?.name || null };
            } catch {
              return { groupId, name: null };
            }
          });
          const groupResults = await Promise.all(groupPromises);
          const names: Record<string, string> = {};
          groupResults.forEach((r) => {
            if (r.name) names[r.groupId] = r.name;
          });
          setGroupNames(names);
        }
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

  // Joined challenges for quick-status section
  const joinedActiveChallenges = useMemo(() => {
    if (!user) return [];
    return challenges.filter(
      (c) => c.members.includes(user.uid) && c.status === 'active'
    );
  }, [challenges, user]);

  const showQuickStatus = filter !== 'my' && joinedActiveChallenges.length > 0;

  // Handlers
  const handleJoinChallenge = async (challengeId: string, challengeName: string) => {
    setJoiningChallengeId(challengeId);
    try {
      await joinChallenge(challengeId);
      Alert.alert('Success', `You joined "${challengeName}"!`);
      loadChallenges();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to join challenge');
    } finally {
      setJoiningChallengeId(null);
    }
  };

  const handleCheckIn = async (challengeId: string) => {
    setCheckingInChallengeId(challengeId);
    try {
      await checkIn(challengeId);
      setCheckedInMap((prev) => ({ ...prev, [challengeId]: true }));
      Alert.alert('Great job!', "You've checked in for today!");
    } catch (error: any) {
      if (error.message === 'Already checked in today') {
        Alert.alert('Already Done', "You've already checked in today. Keep up the great work!");
        setCheckedInMap((prev) => ({ ...prev, [challengeId]: true }));
      } else {
        Alert.alert('Error', error.message || 'Failed to check in');
      }
    } finally {
      setCheckingInChallengeId(null);
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
    setTargetCount('');
    setUnit('');
    setStartDate(new Date());
    setEndDate(new Date(Date.now() + 30 * 24 * 60 * 60 * 1000));
    setInvitePermission('owner_only');
  };

  const formatDate = (date: Date) => {
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric', year: 'numeric' });
  };

  // Section header text
  const sectionHeaderText = filter === 'active'
    ? 'All active challenges'
    : filter === 'all'
    ? 'Browse challenges'
    : null;

  // Empty state type
  const getEmptyState = () => {
    if (searchQuery.trim() || categoryFilter !== 'all') return 'no-match';
    if (filter === 'my') return 'my-empty';
    return 'no-active';
  };

  // Render empty state
  const renderEmptyState = () => {
    const type = getEmptyState();

    if (type === 'no-match') {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIconEmoji}>🔍</Text>
          </View>
          <Text style={styles.emptyTitle}>No challenges match this filter</Text>
          <Text style={styles.emptyBody}>Try a different category or search term</Text>
        </View>
      );
    }

    if (type === 'my-empty') {
      return (
        <View style={styles.emptyContainer}>
          <View style={styles.emptyIconCircle}>
            <Text style={styles.emptyIconEmoji}>◈</Text>
          </View>
          <Text style={styles.emptyTitle}>No challenges yet</Text>
          <Text style={styles.emptyBody}>
            Join a challenge to get started with others on a similar path
          </Text>
          <TouchableOpacity onPress={() => setFilter('active')}>
            <Text style={styles.emptyCta}>Browse challenges →</Text>
          </TouchableOpacity>
        </View>
      );
    }

    // no-active
    return (
      <View style={styles.emptyContainer}>
        <View style={styles.emptyIconCircle}>
          <Text style={styles.emptyIconEmoji}>◈</Text>
        </View>
        <Text style={styles.emptyTitle}>No active challenges right now</Text>
        <Text style={styles.emptyBody}>Check back soon or create one for your group</Text>
        <TouchableOpacity
          style={styles.emptyCreateButton}
          onPress={() => setShowCreateModal(true)}
          activeOpacity={0.7}
        >
          <Text style={styles.emptyCreateButtonText}>+ Create a Challenge</Text>
        </TouchableOpacity>
      </View>
    );
  };

  // Render list header (quick-status + section header)
  const renderListHeader = () => (
    <View>
      {/* Quick-Status Section */}
      {showQuickStatus && (
        <View style={styles.quickStatusSection}>
          <Text style={styles.quickStatusTitle}>Your active challenges</Text>
          <ScrollView
            horizontal
            showsHorizontalScrollIndicator={false}
            contentContainerStyle={styles.quickStatusScroll}
          >
            {joinedActiveChallenges.map((challenge) => (
              <QuickStatusCard
                key={challenge.id}
                challenge={challenge}
                participation={participations[challenge.id]}
                hasCheckedIn={checkedInMap[challenge.id] || false}
                checkingIn={checkingInChallengeId === challenge.id}
                onCheckIn={() => handleCheckIn(challenge.id)}
                onPress={() => handleNavigateToChallenge(challenge.id, challenge.name)}
              />
            ))}
          </ScrollView>
        </View>
      )}

      {/* Section Header */}
      {sectionHeaderText && (
        <Text style={styles.sectionHeader}>{sectionHeaderText}</Text>
      )}
    </View>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      {/* Section A: Top Navigation Bar */}
      <View style={styles.navBar}>
        <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
          <Icon name="arrow-left" size={20} color={Colors.evergreenTeal} />
        </TouchableOpacity>
        <Text style={styles.navTitle}>Challenges</Text>
      </View>

      {/* Section B: Title Area */}
      <View style={styles.titleArea}>
        <Text style={styles.screenTitle}>Challenges</Text>
        <Text style={styles.subtitle}>Grow together through shared commitment</Text>
      </View>

      {/* Section C: Search Bar */}
      <View style={styles.searchContainer}>
        <View style={[styles.searchInputContainer, searchFocused && styles.searchInputFocused]}>
          <Icon name="magnify" size={16} color={Colors.mutedSageGray} />
          <TextInput
            placeholder="Search challenges..."
            placeholderTextColor={Colors.mutedSageGray}
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchInput}
            onFocus={() => setSearchFocused(true)}
            onBlur={() => setSearchFocused(false)}
          />
        </View>
      </View>

      {/* Section D: Filter Pills */}
      <View style={styles.filterContainer}>
        {FILTER_OPTIONS.map((option) => {
          const isActive = filter === option.value;
          return (
            <TouchableOpacity
              key={option.value}
              style={[styles.filterPill, isActive ? styles.filterPillActive : styles.filterPillInactive]}
              onPress={() => setFilter(option.value)}
              activeOpacity={0.7}
            >
              <Text style={[styles.filterPillText, isActive ? styles.filterPillTextActive : styles.filterPillTextInactive]}>
                {option.label}
              </Text>
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Section E: Category Chips */}
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        style={styles.categoryScroll}
        contentContainerStyle={styles.categoryContainer}
      >
        <TouchableOpacity
          onPress={() => setCategoryFilter('all')}
          style={[styles.categoryChip, categoryFilter === 'all' && styles.categoryChipSelected]}
          activeOpacity={0.7}
        >
          <Text style={[styles.categoryChipText, categoryFilter === 'all' && styles.categoryChipTextSelected]}>
            All
          </Text>
        </TouchableOpacity>
        {GROUP_CATEGORY_LIST.map((cat) => (
          <TouchableOpacity
            key={cat.key}
            onPress={() => setCategoryFilter(cat.key)}
            style={[styles.categoryChip, categoryFilter === cat.key && styles.categoryChipSelected]}
            activeOpacity={0.7}
          >
            <Text style={[styles.categoryChipText, categoryFilter === cat.key && styles.categoryChipTextSelected]}>
              {cat.label}
            </Text>
          </TouchableOpacity>
        ))}
      </ScrollView>

      {/* Challenges List */}
      {loading ? (
        <LoadingSpinner message="Loading challenges..." />
      ) : filteredChallenges.length === 0 ? (
        renderEmptyState()
      ) : (
        <FlatList
          data={filteredChallenges}
          renderItem={({ item }) => (
            <ChallengeCard
              challenge={item}
              participation={participations[item.id]}
              isMember={isUserMemberOfChallenge(item, user?.uid)}
              creatorName={ownerProfiles[item.ownerId]?.displayName}
              creatorAvatar={ownerProfiles[item.ownerId]?.avatar}
              groupName={item.sourceGroupId ? groupNames[item.sourceGroupId] : undefined}
              joining={joiningChallengeId === item.id}
              onPress={() => handleNavigateToChallenge(item.id, item.name)}
              onJoin={() => handleJoinChallenge(item.id, item.name)}
              onCheckIn={() => handleCheckIn(item.id)}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ListHeaderComponent={renderListHeader}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={onRefresh} colors={[Colors.evergreenTeal]} />
          }
          ListFooterComponent={
            <TouchableOpacity
              style={styles.inlineCreateButton}
              onPress={() => setShowCreateModal(true)}
              activeOpacity={0.8}
            >
              <Text style={styles.inlineCreateButtonText}>+ Create a Challenge</Text>
            </TouchableOpacity>
          }
        />
      )}

      {/* Create Challenge Modal */}
      <EnhancedModal
        visible={showCreateModal}
        onDismiss={() => {
          Keyboard.dismiss();
          resetForm();
          setShowCreateModal(false);
        }}
        title="Create a Challenge"
        headerIcon="trophy-outline"
        maxHeightPercent={0.92}
        footer={
          <ModalFooterActions
            onCancel={() => { resetForm(); setShowCreateModal(false); }}
            onSubmit={handleCreateChallenge}
            cancelLabel="Cancel"
            submitLabel="Create"
            submitLoading={submitting}
            submitDisabled={!name.trim() || !challengeGoal.trim()}
          />
        }
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

        {/* Category Selection */}
        <Text variant="bodyLarge" style={styles.formSectionLabel}>
          Category
        </Text>
        <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.categorySelectScroll}>
          {GROUP_CATEGORY_LIST.map((cat) => (
            <TouchableOpacity
              key={cat.key}
              style={[
                styles.categorySelectItem,
                selectedCategory === cat.key && styles.categorySelectItemActive,
                { borderColor: selectedCategory === cat.key ? Colors.evergreenTeal : Colors.silverSage },
              ]}
              onPress={() => setSelectedCategory(cat.key)}
            >
              <Icon
                name={cat.icon as any}
                size={24}
                color={selectedCategory === cat.key ? Colors.textOnPrimary : Colors.evergreenTeal}
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
        <Text variant="bodyLarge" style={styles.formSectionLabel}>
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
        <Text variant="bodyLarge" style={styles.formSectionLabel}>
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
      </EnhancedModal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },

  // Section A: Nav Bar
  navBar: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    gap: Spacing.md,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.divider,
  },
  backButton: {
    padding: Spacing.xs,
  },
  navTitle: {
    fontSize: 17,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },

  // Section B: Title Area
  titleArea: {
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.base,
  },
  screenTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.evergreenTeal,
  },
  subtitle: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    marginTop: Spacing.xs,
    marginBottom: Spacing.sm + 6, // ~14px
  },

  // Section C: Search Bar
  searchContainer: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    paddingVertical: 10,
    paddingHorizontal: 14,
    borderRadius: 10,
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
    backgroundColor: Colors.white,
  },
  searchInputFocused: {
    borderColor: Colors.evergreenTeal,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.sm,
    color: Colors.softCharcoal,
    padding: 0,
  },

  // Section D: Filter Pills
  filterContainer: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.md,
  },
  filterPill: {
    paddingVertical: 6,
    paddingHorizontal: Spacing.base,
    borderRadius: Layout.borderRadius.pill,
  },
  filterPillActive: {
    backgroundColor: Colors.evergreenTeal,
  },
  filterPillInactive: {
    backgroundColor: Colors.dewSageLight,
  },
  filterPillText: {
    fontSize: 13,
    fontWeight: Typography.fontWeight.medium,
  },
  filterPillTextActive: {
    color: Colors.white,
  },
  filterPillTextInactive: {
    color: Colors.mutedSageGray,
  },

  // Section E: Category Chips
  categoryScroll: {
    flexGrow: 0,
  },
  categoryContainer: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.sm + 6, // ~14px
    gap: Spacing.sm,
  },
  categoryChip: {
    backgroundColor: Colors.white,
    paddingVertical: 5,
    paddingHorizontal: 14,
    borderRadius: Layout.borderRadius.pill,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.divider,
    flexShrink: 0,
  },
  categoryChipSelected: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  categoryChipText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.mutedSageGray,
  },
  categoryChipTextSelected: {
    color: Colors.white,
  },

  // Section F: Quick-Status
  quickStatusSection: {
    marginBottom: Spacing.sm + 6, // ~14px
  },
  quickStatusTitle: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm + 2, // ~10px
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },
  quickStatusScroll: {
    paddingHorizontal: Spacing.base,
    gap: Spacing.sm + 2, // ~10px
  },

  // Section G: Section Header
  sectionHeader: {
    paddingHorizontal: Spacing.base,
    marginBottom: Spacing.sm + 2, // ~10px
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.softCharcoal,
  },

  // Challenge List
  listContent: {
    paddingHorizontal: Spacing.base,
    paddingBottom: Spacing.xl * 2,
  },

  // Section H: Create Button
  inlineCreateButton: {
    backgroundColor: Colors.evergreenTeal,
    height: 48,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginBottom: Spacing.lg,
    marginTop: Spacing.lg - 4, // ~20px
  },
  inlineCreateButtonText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
  },

  // Empty States
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
  },
  emptyIconCircle: {
    width: 80,
    height: 80,
    borderRadius: 80,
    backgroundColor: Colors.dewSageLight,
    justifyContent: 'center',
    alignItems: 'center',
    marginBottom: Spacing.base,
  },
  emptyIconEmoji: {
    fontSize: 32,
  },
  emptyTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
    textAlign: 'center',
  },
  emptyBody: {
    fontSize: Typography.fontSize.sm,
    color: Colors.mutedSageGray,
    textAlign: 'center',
    lineHeight: Typography.fontSize.sm * 1.4,
    marginBottom: Spacing.base,
  },
  emptyCta: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.evergreenTeal,
  },
  emptyCreateButton: {
    backgroundColor: Colors.evergreenTeal,
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
  },
  emptyCreateButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },

  // Modal Form Styles
  input: {
    marginBottom: Spacing.base,
  },
  formSectionLabel: {
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
});

export default ChallengesScreen;

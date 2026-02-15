/**
 * Groups Screen
 * Browse and join community groups with enhanced cards
 */

import React, { useState, useMemo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  Alert,
  Keyboard,
  ScrollView,
  TouchableOpacity,
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
import { Button, LoadingSpinner, Input, GroupCard } from '../../components';
import { KeyboardAwareScrollView } from '../../components/shared';
import { InvitePermissionPicker, InvitePermission } from '../../components/community';
import {
  Colors,
  Spacing,
  Typography,
  Layout,
  GROUP_CATEGORY_LIST,
  getGroupCategory,
} from '../../constants';
import { useGroups } from '../../hooks';
import { useAuth } from '../../context/AuthContext';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { createGroup } from '../../services/firebase';
import { GroupCategory } from '../../types/models';

const GroupsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<'all' | 'my' | 'public'>('all');
  const [categoryFilter, setCategoryFilter] = useState<GroupCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const { groups, loading, joinGroup, leaveGroup, isUserMember, refresh } = useGroups(filter);

  // Create group modal state
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');
  const [isPublic, setIsPublic] = useState(true);
  const [selectedCategory, setSelectedCategory] = useState<GroupCategory>('other');
  const [invitePermission, setInvitePermission] = useState<InvitePermission>('owner_only');
  const [submitting, setSubmitting] = useState(false);

  // Filter groups by search query and category
  const filteredGroups = useMemo(() => {
    let result = groups;

    // Filter by search query
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      result = result.filter(
        (group) =>
          group.name.toLowerCase().includes(query) ||
          group.description?.toLowerCase().includes(query)
      );
    }

    // Filter by category
    if (categoryFilter !== 'all') {
      result = result.filter((group) => group.category === categoryFilter);
    }

    return result;
  }, [groups, searchQuery, categoryFilter]);

  const handleJoinGroup = async (groupId: string, groupName: string) => {
    try {
      await joinGroup(groupId);
      Alert.alert('Success', `You joined ${groupName}!`);
    } catch (error) {
      Alert.alert('Error', 'Failed to join group. Please try again.');
    }
  };

  const handleLeaveGroup = async (groupId: string, groupName: string) => {
    Alert.alert(
      'Leave Group',
      `Are you sure you want to leave ${groupName}?`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Leave',
          style: 'destructive',
          onPress: async () => {
            try {
              await leaveGroup(groupId);
              Alert.alert('Success', `You left ${groupName}`);
            } catch (error) {
              Alert.alert('Error', 'Failed to leave group. Please try again.');
            }
          },
        },
      ]
    );
  };

  const handleCreateGroup = async () => {
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setSubmitting(true);
    try {
      await createGroup({
        name: groupName,
        description: groupDescription,
        visibility: isPublic ? 'public' : 'private',
        ownerId: user!.uid,
        category: selectedCategory,
        invitePermission: invitePermission,
      });
      // Reset form
      setGroupName('');
      setGroupDescription('');
      setIsPublic(true);
      setSelectedCategory('other');
      setInvitePermission('owner_only');
      setShowCreateGroup(false);
      Alert.alert('Success', 'Group created successfully!');
      // Refresh groups list
      refresh?.();
    } catch (error) {
      console.error('Error creating group:', error);
      Alert.alert('Error', 'Failed to create group. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleNavigateToGroup = (groupId: string, groupName: string) => {
    navigation.navigate('GroupDetail', { groupId, groupName });
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="arrow-left" size={24} color={Colors.textPrimary} />
          </TouchableOpacity>
          <View style={styles.headerTitles}>
            <Text variant="headlineMedium" style={styles.screenTitle}>
              Groups
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Find your community
            </Text>
          </View>
        </View>
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <Searchbar
          placeholder="Search groups..."
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
          onValueChange={(value) => setFilter(value as 'all' | 'my' | 'public')}
          buttons={[
            { value: 'all', label: 'All' },
            { value: 'my', label: 'My Groups' },
            { value: 'public', label: 'Public' },
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

      {/* Groups List */}
      {loading ? (
        <LoadingSpinner message="Loading groups..." />
      ) : filteredGroups.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon
            name="account-group"
            size={64}
            color={Colors.textSecondary}
            style={styles.emptyIcon}
          />
          <Text variant="titleMedium" style={styles.emptyTitle}>
            {searchQuery || categoryFilter !== 'all'
              ? 'No groups found'
              : 'No groups available'}
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            {searchQuery
              ? 'Try a different search term'
              : categoryFilter !== 'all'
              ? `No ${getGroupCategory(categoryFilter as GroupCategory).label} groups yet`
              : filter === 'my'
              ? "You haven't joined any groups yet"
              : 'Be the first to create a group!'}
          </Text>
          {filter !== 'my' && (
            <Button
              variant="primary"
              style={styles.createButton}
              onPress={() => setShowCreateGroup(true)}
            >
              Create Group
            </Button>
          )}
        </View>
      ) : (
        <FlatList
          data={filteredGroups}
          renderItem={({ item }) => (
            <GroupCard
              group={item}
              isMember={isUserMember(item)}
              onPress={() => handleNavigateToGroup(item.id, item.name)}
              onJoin={() => handleJoinGroup(item.id, item.name)}
              onLeave={() => handleLeaveGroup(item.id, item.name)}
            />
          )}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
        />
      )}

      {/* FAB for Create Group */}
      <FAB
        icon="plus"
        label="Create"
        style={styles.fab}
        onPress={() => setShowCreateGroup(true)}
        color={Colors.textOnPrimary}
      />

      {/* Create Group Modal */}
      <Portal>
        <Modal
          visible={showCreateGroup}
          onDismiss={() => {
            Keyboard.dismiss();
            setShowCreateGroup(false);
          }}
          contentContainerStyle={styles.modal}
        >
          <KeyboardAwareScrollView
            showsVerticalScrollIndicator={false}
            contentContainerStyle={styles.scrollContent}
            enableKeyboardAvoidance={false}
          >
              <Text variant="headlineSmall" style={styles.modalTitle}>
                Create New Group
              </Text>

              <Input
                label="Group Name *"
                value={groupName}
                onChangeText={setGroupName}
                placeholder="e.g., Morning Meditation Circle"
                style={styles.input}
              />

              <Input
                label="Description"
                value={groupDescription}
                onChangeText={setGroupDescription}
                placeholder="What is this group about?"
                multiline
                numberOfLines={3}
                style={styles.input}
              />

              {/* Category Selection */}
              <Text variant="bodyLarge" style={styles.sectionLabel}>
                Category
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categorySelectScroll}
              >
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

              {/* Public/Private Switch */}
              <View style={styles.switchContainer}>
                <View style={styles.switchLabel}>
                  <Text variant="bodyLarge" style={styles.switchLabelText}>
                    Public Group
                  </Text>
                  <Text variant="bodySmall" style={styles.switchDescription}>
                    Anyone can discover and join
                  </Text>
                </View>
                <Switch
                  value={isPublic}
                  onValueChange={setIsPublic}
                  color={Colors.evergreenTeal}
                />
              </View>

              {/* Invite Permission */}
              <InvitePermissionPicker
                value={invitePermission}
                onChange={setInvitePermission}
              />

              <View style={styles.modalActions}>
                <PaperButton
                  mode="outlined"
                  onPress={() => setShowCreateGroup(false)}
                  style={styles.modalButton}
                >
                  Cancel
                </PaperButton>
                <PaperButton
                  mode="contained"
                  onPress={handleCreateGroup}
                  loading={submitting}
                  disabled={submitting || !groupName.trim()}
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
    minWidth: 140,
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

export default GroupsScreen;

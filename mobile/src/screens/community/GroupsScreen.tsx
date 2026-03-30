/**
 * Groups Screen
 * Browse and join community groups with enhanced cards
 */

import React, { useState, useEffect, useMemo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  Alert,
  Keyboard,
  ScrollView,
  Platform,
  TouchableOpacity,
  TextInput,
  Switch,
  Modal as RNModal,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Button, LoadingSpinner, Input, GroupCard } from '../../components';
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
import { GroupCategory, GroupInvite } from '../../types/models';
import { getAllPendingInvites, acceptGroupInvite, declineGroupInvite } from '../../services/firebase/invites.service';

const GroupsScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const [filter, setFilter] = useState<'my' | 'discover' | 'invites'>('my');
  const [categoryFilter, setCategoryFilter] = useState<GroupCategory | 'all'>('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [pendingInvites, setPendingInvites] = useState<GroupInvite[]>([]);
  const [invitesLoading, setInvitesLoading] = useState(false);

  // Map filter to useGroups format: 'my' -> 'my', 'discover' -> 'public'
  const hookFilter = filter === 'discover' ? 'public' : filter === 'my' ? 'my' : 'all';
  const { groups, loading, joinGroup, leaveGroup, isUserMember, refresh } = useGroups(hookFilter as 'all' | 'my' | 'public');

  // Load invites when invites tab is active
  useEffect(() => {
    if (filter === 'invites') {
      loadInvites();
    }
  }, [filter]);

  const loadInvites = async () => {
    setInvitesLoading(true);
    try {
      const result = await getAllPendingInvites();
      setPendingInvites(result.groups);
    } catch (error) {
      console.error('Error loading invites:', error);
    } finally {
      setInvitesLoading(false);
    }
  };

  const handleAcceptInvite = async (invite: GroupInvite) => {
    try {
      await acceptGroupInvite(invite.id);
      Alert.alert('Success', `You joined ${invite.groupName}!`);
      setPendingInvites(prev => prev.filter(i => i.id !== invite.id));
      refresh?.();
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to accept invite');
    }
  };

  const handleDeclineInvite = async (invite: GroupInvite) => {
    try {
      await declineGroupInvite(invite.id);
      setPendingInvites(prev => prev.filter(i => i.id !== invite.id));
    } catch (error: any) {
      Alert.alert('Error', error.message || 'Failed to decline invite');
    }
  };

  // Create group modal state
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [groupName, setGroupName] = useState('');
  const [groupDescription, setGroupDescription] = useState('');

  // Use ref for description to avoid multiline re-render glitch
  const descriptionRef = useRef('');
  const [descriptionFocused, setDescriptionFocused] = useState(false);

  // Track keyboard height for modal scroll padding
  const [keyboardHeight, setKeyboardHeight] = useState(0);
  useEffect(() => {
    const showEvent = Platform.OS === 'ios' ? 'keyboardWillShow' : 'keyboardDidShow';
    const hideEvent = Platform.OS === 'ios' ? 'keyboardWillHide' : 'keyboardDidHide';
    const showSub = Keyboard.addListener(showEvent, (e) => setKeyboardHeight(e.endCoordinates.height));
    const hideSub = Keyboard.addListener(hideEvent, () => setKeyboardHeight(0));
    return () => { showSub.remove(); hideSub.remove(); };
  }, []);
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
    if (!user?.uid) return;
    if (!groupName.trim()) {
      Alert.alert('Error', 'Please enter a group name');
      return;
    }

    setSubmitting(true);
    try {
      await createGroup({
        name: groupName,
        description: descriptionRef.current,
        visibility: isPublic ? 'public' : 'private',
        ownerId: user.uid,
        category: selectedCategory,
        invitePermission: invitePermission,
      });
      // Reset form
      setGroupName('');
      setGroupDescription('');
      descriptionRef.current = '';
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
            <Text style={styles.screenTitle}>
              Groups
            </Text>
            <Text style={styles.subtitle}>
              Find your community
            </Text>
          </View>
          <TouchableOpacity
            onPress={() => setShowCreateGroup(true)}
            style={{ width: 36, height: 36, borderRadius: 18, backgroundColor: Colors.evergreenTeal, alignItems: 'center', justifyContent: 'center' }}
            accessibilityRole="button"
            accessibilityLabel="Create group"
          >
            <Icon name="plus" size={20} color="#FFFFFF" />
          </TouchableOpacity>
        </View>
      </View>

      {/* Filter Tabs */}
      <View style={styles.tabContainer}>
        {(['my', 'discover', 'invites'] as const).map((tab) => {
          const isActive = filter === tab;
          const label = tab === 'my' ? 'My Groups' : tab === 'discover' ? 'Discover' : 'Invites';
          return (
            <TouchableOpacity
              key={tab}
              style={[styles.tabPill, isActive ? styles.tabPillActive : styles.tabPillInactive]}
              onPress={() => setFilter(tab)}
              activeOpacity={0.7}
            >
              <Text style={[styles.tabPillText, isActive ? styles.tabPillTextActive : styles.tabPillTextInactive]}>
                {label}
              </Text>
              {tab === 'invites' && pendingInvites.length > 0 && (
                <View style={[styles.inviteBadge, isActive ? styles.inviteBadgeActive : styles.inviteBadgeInactive]}>
                  <Text style={styles.inviteBadgeText}>{pendingInvites.length}</Text>
                </View>
              )}
            </TouchableOpacity>
          );
        })}
      </View>

      {/* Search */}
      <View style={styles.searchContainer}>
        <View style={styles.searchInputContainer}>
          <Icon name="magnify" size={20} color={Colors.mutedSageGray} />
          <TextInput
            placeholder="Search groups by name or category..."
            placeholderTextColor={Colors.mutedSageGray}
            onChangeText={setSearchQuery}
            value={searchQuery}
            style={styles.searchInput}
          />
        </View>
      </View>

      {/* Category Filter */}
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

      {/* Invites Tab */}
      {filter === 'invites' ? (
        invitesLoading ? (
          <LoadingSpinner message="Loading invites..." />
        ) : pendingInvites.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon
              name="email-outline"
              size={64}
              color={Colors.textSecondary}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>
              No pending invites
            </Text>
            <Text style={styles.emptyText}>
              When someone invites you to a group, it will appear here.
            </Text>
            <TouchableOpacity onPress={() => setFilter('discover')} activeOpacity={0.7}>
              <Text style={styles.discoverLink}>Discover groups to join</Text>
            </TouchableOpacity>
          </View>
        ) : (
          <FlatList
            data={pendingInvites}
            renderItem={({ item }) => (
              <View style={styles.inviteCard}>
                <View style={styles.inviteInfo}>
                  <Text style={styles.inviteGroupName}>
                    {item.groupName}
                  </Text>
                  <Text style={styles.inviteFromText}>
                    Invited by {item.inviterName}
                  </Text>
                </View>
                <View style={styles.inviteActions}>
                  <TouchableOpacity
                    style={styles.declineButton}
                    onPress={() => handleDeclineInvite(item)}
                  >
                    <Text style={styles.declineButtonText}>Decline</Text>
                  </TouchableOpacity>
                  <TouchableOpacity
                    style={styles.acceptButton}
                    onPress={() => handleAcceptInvite(item)}
                  >
                    <Text style={styles.acceptButtonText}>Accept</Text>
                  </TouchableOpacity>
                </View>
              </View>
            )}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.listContent}
          />
        )
      ) : (
        /* Groups List */
        loading ? (
          <LoadingSpinner message="Loading groups..." />
        ) : filteredGroups.length === 0 ? (
          <View style={styles.emptyContainer}>
            <Icon
              name="account-group"
              size={64}
              color={Colors.textSecondary}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>
              {searchQuery || categoryFilter !== 'all'
                ? 'No groups found'
                : 'No groups available'}
            </Text>
            <Text style={styles.emptyText}>
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
            ListFooterComponent={
              <TouchableOpacity
                style={styles.inlineCreateButton}
                onPress={() => setShowCreateGroup(true)}
                activeOpacity={0.8}
              >
                <Text style={styles.inlineCreateButtonText}>+ Create a Group</Text>
              </TouchableOpacity>
            }
          />
        )
      )}

      {/* Create Group button removed from FAB, now inline in list */}

      {/* Create Group Modal */}
      <RNModal
        visible={showCreateGroup}
        transparent
        animationType="fade"
        onRequestClose={() => {
          Keyboard.dismiss();
          setShowCreateGroup(false);
        }}
      >
        <View style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: Spacing.lg}}>
        <View style={styles.modal}>
          {/* Header */}
          <Text style={styles.modalTitle}>
            Create New Group
          </Text>

          {/* Scrollable form content */}
          <ScrollView
            style={styles.modalScrollView}
            showsVerticalScrollIndicator={false}
            contentContainerStyle={[
              styles.scrollContent,
              keyboardHeight > 0 && { paddingBottom: keyboardHeight - 40 },
            ]}
            keyboardShouldPersistTaps="handled"
          >
              <Input
                label="Group Name *"
                value={groupName}
                onChangeText={setGroupName}
                placeholder="e.g., Morning Meditation Circle"
                style={styles.input}
              />

              {/* Description — plain RN TextInput to avoid multiline re-render glitch */}
              <View style={styles.descriptionContainer}>
                <Text style={styles.descriptionLabel}>Description</Text>
                <TextInput
                  defaultValue={descriptionRef.current}
                  onChangeText={(text) => { descriptionRef.current = text; }}
                  onFocus={() => setDescriptionFocused(true)}
                  onBlur={() => setDescriptionFocused(false)}
                  placeholder="What is this group about?"
                  placeholderTextColor={Colors.mutedSageGray}
                  multiline
                  textAlignVertical="top"
                  style={[
                    styles.descriptionInput,
                    descriptionFocused && styles.descriptionInputFocused,
                  ]}
                />
              </View>

              {/* Category Selection */}
              <Text style={styles.sectionLabel}>
                Category
              </Text>
              <ScrollView
                horizontal
                showsHorizontalScrollIndicator={false}
                style={styles.categorySelectScroll}
                nestedScrollEnabled
              >
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

              {/* Public/Private Switch */}
              <View style={styles.switchContainer}>
                <View style={styles.switchLabel}>
                  <Text style={styles.switchLabelText}>
                    Public Group
                  </Text>
                  <Text style={styles.switchDescription}>
                    Anyone can discover and join
                  </Text>
                </View>
                <Switch
                  value={isPublic}
                  onValueChange={setIsPublic}
                  trackColor={{false: Colors.silverSage, true: Colors.evergreenTeal}}
                  thumbColor={isPublic ? '#fff' : '#f4f3f4'}
                />
              </View>

              {/* Invite Permission */}
              <InvitePermissionPicker
                value={invitePermission}
                onChange={setInvitePermission}
              />

              {/* Action buttons */}
              <View style={styles.modalFooter}>
                <TouchableOpacity
                  onPress={() => setShowCreateGroup(false)}
                  style={[styles.modalButton, {borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingVertical: 10, alignItems: 'center' as const}]}
                >
                  <Text style={{color: Colors.textPrimary, fontSize: 14, fontWeight: '500'}}>Cancel</Text>
                </TouchableOpacity>
                <TouchableOpacity
                  onPress={handleCreateGroup}
                  disabled={submitting || !groupName.trim()}
                  style={[styles.modalButton, {backgroundColor: Colors.evergreenTeal, borderRadius: 8, paddingVertical: 10, alignItems: 'center' as const, opacity: (submitting || !groupName.trim()) ? 0.5 : 1}]}
                >
                  <Text style={{color: '#fff', fontSize: 14, fontWeight: '500'}}>{submitting ? 'Creating...' : 'Create'}</Text>
                </TouchableOpacity>
              </View>
          </ScrollView>
        </View>
        </View>
      </RNModal>

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

  // Tab Navigation (pill-style)
  tabContainer: {
    flexDirection: 'row',
    gap: 8,
    paddingHorizontal: 16,
    paddingBottom: 16,
  },
  tabPill: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: 8,
    paddingHorizontal: 16,
    borderRadius: 16,
  },
  tabPillActive: {
    backgroundColor: Colors.evergreenTeal,
  },
  tabPillInactive: {
    backgroundColor: Colors.dewSageLight,
  },
  tabPillText: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.medium,
  },
  tabPillTextActive: {
    color: Colors.white,
  },
  tabPillTextInactive: {
    color: Colors.mutedSageGray,
  },
  inviteBadge: {
    marginLeft: 8,
    paddingVertical: 1,
    paddingHorizontal: 8,
    borderRadius: 12,
  },
  inviteBadgeActive: {
    backgroundColor: 'rgba(255,255,255,0.25)',
  },
  inviteBadgeInactive: {
    backgroundColor: Colors.softCoral,
  },
  inviteBadgeText: {
    color: Colors.white,
    fontSize: 12,
    fontWeight: Typography.fontWeight.bold,
  },

  // Search Bar
  searchContainer: {
    paddingHorizontal: 16,
    paddingBottom: 12,
  },
  searchInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    paddingVertical: 12,
    paddingHorizontal: 16,
    borderRadius: 12,
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
    backgroundColor: Colors.white,
  },
  searchInput: {
    flex: 1,
    fontSize: 14,
    color: Colors.softCharcoal,
    padding: 0,
  },

  // Category Filter Chips
  categoryScroll: {
    flexGrow: 0,
  },
  categoryContainer: {
    paddingHorizontal: 16,
    paddingVertical: 8,
    paddingBottom: 12,
    gap: 8,
    alignItems: 'center',
  },
  categoryChip: {
    backgroundColor: Colors.white,
    height: 34,
    justifyContent: 'center',
    paddingHorizontal: 16,
    borderRadius: 17,
    borderWidth: 1,
    borderColor: Colors.divider,
  },
  categoryChipSelected: {
    backgroundColor: Colors.evergreenTeal,
    borderWidth: 0,
  },
  categoryChipText: {
    fontSize: 12,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.mutedSageGray,
  },
  categoryChipTextSelected: {
    color: Colors.white,
  },

  // Groups List
  listContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.xl * 2,
  },

  // Empty State
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
  discoverLink: {
    color: Colors.evergreenTeal,
    fontSize: 14,
    fontWeight: Typography.fontWeight.medium,
  },
  createButton: {
    minWidth: 140,
  },

  // Inline Create Group Button
  inlineCreateButton: {
    backgroundColor: Colors.evergreenTeal,
    height: 48,
    borderRadius: Layout.borderRadius.lg,
    alignItems: 'center',
    justifyContent: 'center',
    marginHorizontal: -8,
    marginBottom: 24,
    marginTop: Spacing.base,
  },
  inlineCreateButtonText: {
    color: Colors.white,
    fontSize: 16,
    fontWeight: Typography.fontWeight.medium,
  },

  // Modal
  modal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    maxHeight: '85%',
    overflow: 'hidden',
  },
  modalTitle: {
    color: Colors.evergreenTeal,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.base,
    fontWeight: Typography.fontWeight.semibold,
  },
  modalScrollView: {
    flexShrink: 1,
  },
  scrollContent: {
    paddingHorizontal: Spacing.lg,
    paddingBottom: Spacing.sm,
  },
  modalFooter: {
    flexDirection: 'row',
    gap: Spacing.sm,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  input: {
    marginBottom: Spacing.base,
  },
  descriptionContainer: {
    marginBottom: Spacing.base,
  },
  descriptionLabel: {
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
    marginLeft: Spacing.xs,
  },
  descriptionInput: {
    backgroundColor: Colors.inputBackground,
    borderWidth: 1.5,
    borderColor: Colors.inputBorder,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.sm + 4,
    paddingBottom: Spacing.sm + 4,
    fontSize: Typography.fontSize.base,
    color: Colors.softCharcoal,
    minHeight: 88,
  },
  descriptionInputFocused: {
    borderColor: Colors.inputBorderFocus,
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
  modalButton: {
    flex: 1,
  },

  // Invite card styles
  inviteCard: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    backgroundColor: Colors.surface,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.sm,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.borderLight,
  },
  inviteInfo: {
    flex: 1,
    marginRight: Spacing.base,
  },
  inviteGroupName: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 2,
  },
  inviteFromText: {
    color: Colors.textSecondary,
    fontSize: Typography.fontSize.xs,
  },
  inviteActions: {
    flexDirection: 'row',
    gap: Spacing.sm,
  },
  declineButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.md,
    borderWidth: 1,
    borderColor: Colors.divider,
    backgroundColor: 'transparent',
  },
  declineButtonText: {
    color: Colors.mutedSageGray,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  acceptButton: {
    paddingHorizontal: Spacing.base,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.evergreenTeal,
  },
  acceptButtonText: {
    color: Colors.white,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default GroupsScreen;

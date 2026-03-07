/**
 * InviteMembersModal Component
 * Modal for inviting users to groups or challenges
 */

import React, { useState, useCallback, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  Image,
  Alert,
  TextInput,
  ActivityIndicator,
} from 'react-native';
import CommunityAvatar from '../shared/CommunityAvatar';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { EnhancedModal, ModalFooterActions } from '../shared/EnhancedModal';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { fetchUserConnections, searchUsers, getUserById } from '../../services/firebase/community.service';
import {
  sendGroupInvites,
  sendChallengeInvites,
  getGroupInvitesSent,
  getChallengeInvitesSent,
} from '../../services/firebase/invites.service';

interface UserItem {
  id: string;
  displayName: string;
  avatar?: string;
  avatarUrl?: string;
  email?: string;
}

interface InviteMembersModalProps {
  visible: boolean;
  onDismiss: () => void;
  type: 'group' | 'challenge';
  entityId: string;
  entityName: string;
  existingMemberIds: string[];
  onInvitesSent?: (count: number) => void;
}

export const InviteMembersModal: React.FC<InviteMembersModalProps> = ({
  visible,
  onDismiss,
  type,
  entityId,
  entityName,
  existingMemberIds,
  onInvitesSent,
}) => {
  const { user } = useAuth();
  const [searchQuery, setSearchQuery] = useState('');
  const [connections, setConnections] = useState<UserItem[]>([]);
  const [searchResults, setSearchResults] = useState<UserItem[]>([]);
  const [pendingInviteUserIds, setPendingInviteUserIds] = useState<string[]>([]);
  const [selectedUsers, setSelectedUsers] = useState<UserItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searching, setSearching] = useState(false);
  const [sending, setSending] = useState(false);

  // Load connections and pending invites on mount
  useEffect(() => {
    if (visible && user) {
      loadData();
    }
  }, [visible, user]);

  const loadData = async () => {
    if (!user) return;
    setLoading(true);
    try {
      // Load user's connections
      const connectionsData = await fetchUserConnections(user.uid);
      const connectionUsers: UserItem[] = [];

      for (const conn of connectionsData) {
        const otherId = conn.a === user.uid ? conn.b : conn.a;
        if (otherId) {
          const userProfile = await getUserById(otherId);
          if (userProfile) {
            connectionUsers.push({
              id: otherId,
              displayName: userProfile.displayName || 'Unknown',
              avatar: userProfile.avatar,
            });
          }
        }
      }

      setConnections(connectionUsers);

      // Load pending invites (gracefully handle errors)
      try {
        const pendingInvites = type === 'group'
          ? await getGroupInvitesSent(entityId)
          : await getChallengeInvitesSent(entityId);
        setPendingInviteUserIds(pendingInvites.map(inv => inv.inviteeId));
      } catch (inviteError) {
        // Silently fail - user can still send invites, we just won't know about pending ones
        console.log('Could not load pending invites:', inviteError);
        setPendingInviteUserIds([]);
      }
    } catch (error) {
      console.error('Error loading invite data:', error);
    } finally {
      setLoading(false);
    }
  };

  // Search users
  const handleSearch = useCallback(async (query: string) => {
    setSearchQuery(query);
    if (query.length < 2) {
      setSearchResults([]);
      return;
    }

    setSearching(true);
    try {
      const results = await searchUsers(query);
      setSearchResults(
        results
          .filter(u => u.id !== user?.uid) // Exclude current user
          .map(u => ({
            id: u.id,
            displayName: u.displayName || 'Unknown',
            avatar: u.avatar,
            email: u.email,
          }))
      );
    } catch (error) {
      console.error('Error searching users:', error);
    } finally {
      setSearching(false);
    }
  }, [user]);

  // Toggle user selection
  const toggleUserSelection = useCallback((userItem: UserItem) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedUsers(prev => {
      const isSelected = prev.some(u => u.id === userItem.id);
      if (isSelected) {
        return prev.filter(u => u.id !== userItem.id);
      } else {
        return [...prev, userItem];
      }
    });
  }, []);

  // Remove selected user
  const removeSelectedUser = useCallback((userId: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    setSelectedUsers(prev => prev.filter(u => u.id !== userId));
  }, []);

  // Send invites
  const handleSendInvites = async () => {
    if (selectedUsers.length === 0) return;

    setSending(true);
    try {
      const inviteeIds = selectedUsers.map(u => u.id);
      const results = type === 'group'
        ? await sendGroupInvites(entityId, inviteeIds)
        : await sendChallengeInvites(entityId, inviteeIds);

      const successCount = results.success.length;
      const failedCount = results.failed.length;

      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success);

      if (failedCount > 0) {
        Alert.alert(
          'Invites Sent',
          `${successCount} invite${successCount !== 1 ? 's' : ''} sent successfully. ${failedCount} failed (user may already be invited).`
        );
      }

      onInvitesSent?.(successCount);
      onDismiss();
    } catch (error) {
      console.error('Error sending invites:', error);
      Haptics.notificationAsync(Haptics.NotificationFeedbackType.Error);
      Alert.alert('Error', 'Failed to send invites. Please try again.');
    } finally {
      setSending(false);
    }
  };

  // Handle dismiss with cleanup
  const handleDismiss = () => {
    setSearchQuery('');
    setSearchResults([]);
    setSelectedUsers([]);
    onDismiss();
  };

  // Check if user can be selected
  const isUserSelectable = (userId: string): boolean => {
    return !existingMemberIds.includes(userId) && !pendingInviteUserIds.includes(userId);
  };

  // Get status text for non-selectable users
  const getUserStatus = (userId: string): string | null => {
    if (existingMemberIds.includes(userId)) return 'Already a member';
    if (pendingInviteUserIds.includes(userId)) return 'Invite pending';
    return null;
  };

  // Render user item
  const renderUserItem = ({ item }: { item: UserItem }) => {
    const isSelected = selectedUsers.some(u => u.id === item.id);
    const selectable = isUserSelectable(item.id);
    const status = getUserStatus(item.id);
    const initials = (item.displayName || 'U').substring(0, 2).toUpperCase();

    return (
      <TouchableOpacity
        style={[
          styles.userItem,
          isSelected && styles.userItemSelected,
          !selectable && styles.userItemDisabled,
        ]}
        onPress={() => selectable && toggleUserSelection(item)}
        disabled={!selectable}
        activeOpacity={0.7}
      >
        <View style={styles.userAvatarContainer}>
          <CommunityAvatar
            uri={item.avatar || item.avatarUrl}
            name={item.displayName}
            size={40}
          />
        </View>
        <View style={styles.userInfo}>
          <Text style={[styles.userName, !selectable && styles.userNameDisabled]}>
            {item.displayName}
          </Text>
          {status && (
            <Text style={styles.userStatus}>{status}</Text>
          )}
        </View>
        {selectable && (
          <View style={[styles.checkbox, isSelected && styles.checkboxSelected]}>
            {isSelected && (
              <Icon name="check" size={16} color={Colors.white} />
            )}
          </View>
        )}
      </TouchableOpacity>
    );
  };

  // Determine which list to show
  const displayList = searchQuery.length >= 2 ? searchResults : connections;
  const emptyMessage = searchQuery.length >= 2
    ? 'No users found'
    : 'No connections yet. Search for users above.';

  return (
    <EnhancedModal
      visible={visible}
      onDismiss={handleDismiss}
      title={`Invite to ${entityName}`}
      subtitle={type === 'group' ? 'Invite people to join your group' : 'Invite people to join your challenge'}
      headerIcon="account-multiple-plus"
      maxHeightPercent={0.85}
      hasInputs={true}
      footer={
        <ModalFooterActions
          onCancel={handleDismiss}
          onSubmit={handleSendInvites}
          cancelLabel="Cancel"
          submitLabel={`Send ${selectedUsers.length > 0 ? `(${selectedUsers.length})` : ''}`}
          submitLoading={sending}
          submitDisabled={selectedUsers.length === 0}
        />
      }
    >
      {/* Search Bar */}
      <View style={styles.searchBar}>
        <Icon name="magnify" size={20} color={Colors.evergreenTeal} />
        <TextInput
          placeholder="Search users by name..."
          onChangeText={handleSearch}
          value={searchQuery}
          style={styles.searchInput}
          placeholderTextColor={Colors.textSecondary}
        />
        {searching && <ActivityIndicator size="small" color={Colors.evergreenTeal} />}
      </View>

      {/* Selected Users Chips */}
      {selectedUsers.length > 0 && (
        <View style={styles.selectedContainer}>
          <Text style={styles.selectedLabel}>Selected ({selectedUsers.length})</Text>
          <View style={styles.chipsContainer}>
            {selectedUsers.map(user => (
              <View key={user.id} style={styles.chip}>
                <Text style={styles.chipText}>{user.displayName}</Text>
                <TouchableOpacity onPress={() => removeSelectedUser(user.id)}>
                  <Icon name="close-circle" size={18} color={Colors.evergreenTeal} />
                </TouchableOpacity>
              </View>
            ))}
          </View>
        </View>
      )}

      {/* Section Header */}
      <Text style={styles.sectionHeader}>
        {searchQuery.length >= 2 ? 'Search Results' : 'Your Connections'}
      </Text>

      {/* User List */}
      {loading ? (
        <View style={styles.loadingContainer}>
          <ActivityIndicator color={Colors.evergreenTeal} />
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      ) : displayList.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon name="account-search" size={48} color={Colors.silverSage} />
          <Text style={styles.emptyText}>{emptyMessage}</Text>
        </View>
      ) : (
        <FlatList
          data={displayList}
          renderItem={renderUserItem}
          keyExtractor={item => item.id}
          scrollEnabled={false}
          style={styles.userList}
        />
      )}
    </EnhancedModal>
  );
};

const styles = StyleSheet.create({
  searchBar: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.inputBackground,
    borderRadius: Layout.borderRadius.md,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.base,
    height: 48,
    gap: Spacing.xs,
  },
  searchInput: {
    flex: 1,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
  },
  selectedContainer: {
    marginBottom: Spacing.base,
  },
  selectedLabel: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textSecondary,
    marginBottom: Spacing.xs,
  },
  chipsContainer: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.xs,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    backgroundColor: Colors.dewSage,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: Layout.borderRadius.full,
  },
  chipText: {
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.sm,
  },
  sectionHeader: {
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.textSecondary,
    marginBottom: Spacing.sm,
    textTransform: 'uppercase',
    letterSpacing: 0.5,
  },
  userList: {
    flex: 1,
  },
  userItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.sm,
    marginBottom: Spacing.xs,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: Colors.surface,
    borderWidth: 1,
    borderColor: Colors.borderLight,
  },
  userItemSelected: {
    borderColor: Colors.evergreenTeal,
    backgroundColor: Colors.tealLight,
  },
  userItemDisabled: {
    opacity: 0.5,
  },
  userAvatarContainer: {
    marginRight: Spacing.sm,
  },
  userAvatar: {
    width: 40,
    height: 40,
    borderRadius: 20,
  },
  avatarText: {
    backgroundColor: Colors.evergreenTeal,
  },
  userInfo: {
    flex: 1,
  },
  userName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.textPrimary,
  },
  userNameDisabled: {
    color: Colors.textSecondary,
  },
  userStatus: {
    fontSize: Typography.fontSize.xs,
    color: Colors.textSecondary,
    marginTop: 2,
  },
  checkbox: {
    width: 24,
    height: 24,
    borderRadius: 12,
    borderWidth: 2,
    borderColor: Colors.border,
    alignItems: 'center',
    justifyContent: 'center',
  },
  checkboxSelected: {
    backgroundColor: Colors.evergreenTeal,
    borderColor: Colors.evergreenTeal,
  },
  loadingContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  loadingText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    marginTop: Spacing.sm,
  },
  emptyContainer: {
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
    color: Colors.textSecondary,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});

export default InviteMembersModal;

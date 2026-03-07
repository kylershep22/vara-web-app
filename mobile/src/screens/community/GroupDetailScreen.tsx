/**
 * Group Detail Screen
 * Thin UI shell that delegates data loading and event handling to useGroupDetail.
 */

import React, { useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Keyboard,
  InputAccessoryView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useRoute, RouteProp } from '@react-navigation/native';
import { LoadingSpinner, Button, PostCard } from '../../components';
import { InviteMembersModal, CreateChallengeFromGroupModal } from '../../components/community';
import { PostOverflowSheet } from '../../components/community/PostOverflowSheet';
import { EditPostModal } from '../../components/community/EditPostModal';
import CreatePostModal from '../../components/community/CreatePostModal';
import CommentModal from '../../components/community/CommentModal';
import MembersModal from '../../components/community/MembersModal';
import GroupDetailHeader from '../../components/community/GroupDetailHeader';
import SetPromptModal from '../../components/community/SetPromptModal';
import { Colors, Spacing } from '../../constants';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useGroupDetail } from '../../hooks/useGroupDetail';

type GroupDetailRouteParams = {
  GroupDetail: {
    groupId: string;
    groupName?: string;
  };
};

const INPUT_ACCESSORY_VIEW_ID = 'groupDetailInputAccessory';

const GroupDetailScreen: React.FC = () => {
  const route = useRoute<RouteProp<GroupDetailRouteParams, 'GroupDetail'>>();
  const { groupId, groupName: initialGroupName } = route.params;

  const {
    user,
    group,
    posts,
    members,
    owner,
    loading,
    refreshing,
    showCreatePost,
    commentPost,
    showMembers,
    showInviteModal,
    showCreateChallengeModal,
    canInvite,
    groupChallenges,
    challengeParticipations,
    groupPrompt,
    promptResponseCount,
    showSetPrompt,
    overflowPost,
    showOverflow,
    editPost,
    visiblePosts,
    isMember,
    isOwner,
    setShowCreatePost,
    setCommentPost,
    setShowMembers,
    setShowInviteModal,
    setShowCreateChallengeModal,
    setShowSetPrompt,
    setEditPost,
    handleRefresh,
    handleJoinGroup,
    handleLeaveGroup,
    handleCreatePost,
    handleLikePost,
    handleCommentSubmit,
    handleNavigateToChallenge,
    handleJoinChallenge,
    handleMorePress,
    handleReport,
    handleHidePost,
    handleMuteUser,
    handleEditPost,
    handleDeletePost,
    handleInvitesSent,
    handleChallengeCreated,
    dismissOverflow,
    formatTimestamp,
    loadGroupData,
    navigation,
  } = useGroupDetail(groupId, initialGroupName);

  const renderHeader = useCallback(() => (
    <GroupDetailHeader
      group={group}
      initialGroupName={initialGroupName}
      owner={owner}
      isMember={!!isMember}
      isOwner={!!isOwner}
      canInvite={canInvite}
      postCount={posts.length}
      groupChallenges={groupChallenges}
      challengeParticipations={challengeParticipations}
      groupPrompt={groupPrompt}
      promptResponseCount={promptResponseCount}
      currentUserId={user?.uid || ''}
      onGoBack={() => navigation.goBack()}
      onLeaveGroup={handleLeaveGroup}
      onShowMembers={() => setShowMembers(true)}
      onShowCreatePost={() => setShowCreatePost(true)}
      onShowCreateChallenge={() => setShowCreateChallengeModal(true)}
      onShowInviteModal={() => setShowInviteModal(true)}
      onJoinGroup={handleJoinGroup}
      onNavigateToChallenge={handleNavigateToChallenge}
      onJoinChallenge={handleJoinChallenge}
      onShowSetPrompt={() => setShowSetPrompt(true)}
    />
  ), [group, initialGroupName, owner, isMember, isOwner, canInvite, posts.length,
      groupChallenges, challengeParticipations, groupPrompt, promptResponseCount,
      user?.uid, navigation, handleLeaveGroup, handleJoinGroup,
      handleNavigateToChallenge, handleJoinChallenge, setShowMembers,
      setShowCreatePost, setShowCreateChallengeModal, setShowInviteModal,
      setShowSetPrompt]);

  const renderPost = useCallback(({ item }: { item: any }) => (
    <PostCard
      post={item}
      onLike={handleLikePost}
      onComment={(post) => setCommentPost(post)}
      formatTimestamp={formatTimestamp}
      disabled={!isMember}
      disabledMessage="Join this group to support and comment on posts"
      hideGroupBadge
      onMorePress={handleMorePress}
    />
  ), [handleLikePost, isMember, handleMorePress, setCommentPost, formatTimestamp]);

  if (loading) {
    return <LoadingSpinner message="Loading group..." />;
  }

  return (
    <SafeAreaView style={styles.container} edges={['top', 'bottom']}>
      <FlatList
        data={visiblePosts}
        renderItem={renderPost}
        keyExtractor={(item) => item.id}
        ListHeaderComponent={renderHeader}
        contentContainerStyle={styles.content}
        refreshControl={
          <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
        }
        ListEmptyComponent={
          <View style={styles.emptyState}>
            <Icon
              name="post-outline"
              size={64}
              color={Colors.textSecondary}
              style={styles.emptyIcon}
            />
            <Text style={styles.emptyTitle}>
              No posts yet
            </Text>
            <Text style={styles.emptyText}>
              {isMember
                ? 'Be the first to share something with the group!'
                : 'Join the group to see and create posts'}
            </Text>
            {isMember && (
              <Button
                variant="primary"
                style={styles.emptyButton}
                onPress={() => setShowCreatePost(true)}
              >
                Create First Post
              </Button>
            )}
          </View>
        }
      />

      <CreatePostModal
        visible={showCreatePost}
        onDismiss={() => setShowCreatePost(false)}
        onSubmit={handleCreatePost}
        groupName={group?.name || 'Group'}
      />

      <CommentModal
        visible={commentPost !== null}
        post={commentPost}
        onDismiss={() => setCommentPost(null)}
        onSubmit={handleCommentSubmit}
      />

      <MembersModal
        visible={showMembers}
        members={members}
        ownerId={group?.ownerId || ''}
        onDismiss={() => setShowMembers(false)}
      />

      <InviteMembersModal
        visible={showInviteModal}
        onDismiss={() => setShowInviteModal(false)}
        type="group"
        entityId={groupId}
        entityName={group?.name || 'Group'}
        existingMemberIds={group?.members || []}
        onInvitesSent={handleInvitesSent}
      />

      <CreateChallengeFromGroupModal
        visible={showCreateChallengeModal}
        onDismiss={() => setShowCreateChallengeModal(false)}
        groupId={groupId}
        groupName={group?.name || 'Group'}
        memberCount={group?.memberCount || group?.members?.length || 1}
        onSuccess={handleChallengeCreated}
      />

      <SetPromptModal
        visible={showSetPrompt}
        onDismiss={() => setShowSetPrompt(false)}
        groupId={groupId}
        currentPrompt={groupPrompt?.prompt || null}
        onSaved={loadGroupData}
      />

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

      <PostOverflowSheet
        visible={showOverflow}
        onDismiss={dismissOverflow}
        post={overflowPost}
        currentUserId={user?.uid || ''}
        onReport={handleReport}
        onHide={handleHidePost}
        onMute={handleMuteUser}
        onEdit={handleEditPost}
        onDelete={handleDeletePost}
      />

      <EditPostModal
        visible={!!editPost}
        onDismiss={() => setEditPost(null)}
        post={editPost}
        onSaved={() => loadGroupData()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  content: {
    paddingBottom: Spacing.xl,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
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
  emptyButton: {
    minWidth: 160,
  },
  keyboardAccessory: {
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
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
    borderRadius: 8,
  },
  keyboardAccessoryButtonText: {
    color: Colors.textOnPrimary,
    fontSize: 14,
    fontWeight: '600',
  },
});

export default GroupDetailScreen;

/**
 * Community Screen
 * Thin UI shell that delegates data loading and event handling to useCommunityFeed.
 */

import React, { useCallback, useState, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  Image,
  ImageStyle,
  Keyboard,
  InputAccessoryView,
  Platform,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import { LoadingSpinner, PostCard } from '../../components';
import { PostOverflowSheet } from '../../components/community/PostOverflowSheet';
import { EditPostModal } from '../../components/community/EditPostModal';
import { CommunityFeedHeader } from '../../components/community/CommunityFeedHeader';
import { CommunityOrientationCard } from '../../components/community/CommunityOrientationCard';
import CreatePostModal from '../../components/community/CreatePostModal';
import { doc, getDoc, updateDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';
import CommentModal from '../../components/community/CommentModal';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useCommunityFeed } from '../../hooks/useCommunityFeed';

const INPUT_ACCESSORY_VIEW_ID = 'communityInputAccessory';

const CommunityScreen: React.FC = () => {
  const {
    user,
    navigation,
    loading,
    posts,
    refreshing,
    feedFilter,
    setFeedFilter,
    selectedPostType,
    setSelectedPostType,
    showPostTypeSelector,
    setShowPostTypeSelector,
    showCreatePost,
    setShowCreatePost,
    commentPost,
    setCommentPost,
    overflowPost,
    showOverflow,
    editPost,
    setEditPost,
    userProfile,
    isReady,
    currentPrompt,
    postPlaceholder,
    filteredPosts,
    handleRefresh,
    handleSubmitPost,
    handleLike,
    handleCommentSubmit,
    handleMorePress,
    dismissOverflow,
    handleReport,
    handleHidePost,
    handleMuteUser,
    handleEditPost,
    handleDeletePost,
    handleInviteAction,
    formatTimestamp,
    refreshFilters,
  } = useCommunityFeed();

  const [showOrientation, setShowOrientation] = useState(false);
  const [orientationChecked, setOrientationChecked] = useState(false);

  // Check if user has seen orientation card
  useEffect(() => {
    const checkOrientation = async () => {
      if (!user || !db) {
        setOrientationChecked(true);
        return;
      }
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        const seen = userDoc.data()?.community_orientation_seen === true;
        setShowOrientation(!seen);
      } catch {
        // On error, don't show orientation (fail silently)
      }
      setOrientationChecked(true);
    };
    checkOrientation();
  }, [user]);

  const dismissOrientation = useCallback(async (navigateToGroups = false) => {
    setShowOrientation(false);
    if (user && db) {
      try {
        await updateDoc(doc(db, 'users', user.uid), {
          community_orientation_seen: true,
        });
      } catch {
        // Best-effort persist
      }
    }
    if (navigateToGroups) {
      navigation.navigate('Groups');
    }
  }, [user, navigation]);

  const handleNavigate = useCallback((screen: string) => {
    navigation.navigate(screen);
  }, [navigation]);

  const handleTogglePostTypeSelector = useCallback(() => {
    if (showPostTypeSelector) {
      setSelectedPostType('update');
      setShowPostTypeSelector(false);
      setShowCreatePost(true);
    } else {
      setShowPostTypeSelector(true);
    }
  }, [showPostTypeSelector, setSelectedPostType, setShowPostTypeSelector, setShowCreatePost]);

  const handlePostTypeSelected = useCallback((type: 'update' | 'win' | 'reflection' | 'ask') => {
    setSelectedPostType(type);
    setShowPostTypeSelector(false);
    setShowCreatePost(true);
  }, [setSelectedPostType, setShowPostTypeSelector, setShowCreatePost]);

  const renderHeader = useCallback(() => (
    <>
      {showOrientation && (
        <>
          <CommunityOrientationCard
            onFindGroup={() => dismissOrientation(true)}
            onSkip={() => dismissOrientation(false)}
            onNavigateGroups={() => navigation.navigate('Groups')}
            onNavigateChallenges={() => navigation.navigate('Challenges')}
          />
          <Text style={styles.recentActivityLabel}>RECENT ACTIVITY</Text>
        </>
      )}
      <CommunityFeedHeader
        userProfile={userProfile}
        displayName={user?.displayName || 'U'}
        currentPrompt={currentPrompt}
        feedFilter={feedFilter}
        showPostTypeSelector={showPostTypeSelector}
        showOrientation={showOrientation}
        onNavigate={handleNavigate}
        onSetFeedFilter={setFeedFilter}
        onPostTypeSelected={handlePostTypeSelected}
        onTogglePostTypeSelector={handleTogglePostTypeSelector}
        onInviteAction={handleInviteAction}
      />
    </>
  ), [userProfile, user?.displayName, currentPrompt, feedFilter, showPostTypeSelector,
      showOrientation, dismissOrientation, handleNavigate, setFeedFilter, handlePostTypeSelected,
      handleTogglePostTypeSelector, handleInviteAction]);

  const renderPost = useCallback(({ item }: { item: any }) => (
    <View style={{ marginHorizontal: Spacing.base, marginBottom: Spacing.md }}>
      <PostCard
        post={item}
        onLike={handleLike}
        onComment={(post: any) => setCommentPost(post)}
        formatTimestamp={formatTimestamp}
        onGroupPress={item.groupId ? () => navigation.navigate('GroupDetail', { groupId: item.groupId, groupName: item.groupName }) : undefined}
        onMorePress={handleMorePress}
      />
    </View>
  ), [handleLike, setCommentPost, formatTimestamp, navigation, handleMorePress]);

  const initials = (userProfile?.displayName || user?.displayName || 'U').substring(0, 2).toUpperCase();

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text style={styles.screenTitle}>Community</Text>
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('ProfileStack')}
        >
          {userProfile?.avatarUrl ? (
            <Image
              source={{ uri: userProfile.avatarUrl }}
              style={styles.profileImage as ImageStyle}
            />
          ) : (
            <View style={styles.profileAvatarFallback}>
              <Text style={styles.profileAvatarText}>{initials}</Text>
            </View>
          )}
        </TouchableOpacity>
      </View>

      {!isReady || !orientationChecked || (loading && posts.length === 0) ? (
        <LoadingSpinner message="Loading feed..." />
      ) : (
        <FlatList
          data={filteredPosts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader()}
          contentContainerStyle={styles.feedContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          initialNumToRender={5}
          maxToRenderPerBatch={5}
          windowSize={5}
          removeClippedSubviews={true}
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon
                name="hand-wave-outline"
                size={64}
                color={Colors.evergreenTeal}
                style={styles.emptyIcon}
              />
              <Text style={styles.emptyTitle}>Welcome to the community</Text>
              <Text style={styles.emptyText}>
                Connect with others and join groups to build your wellness network
              </Text>
            </View>
          }
        />
      )}

      <CreatePostModal
        visible={showCreatePost}
        onDismiss={() => {
          setShowCreatePost(false);
          setSelectedPostType(null);
        }}
        onSubmit={handleSubmitPost}
        placeholder={postPlaceholder}
      />

      <CommentModal
        visible={commentPost !== null}
        post={commentPost}
        onDismiss={() => setCommentPost(null)}
        onSubmit={handleCommentSubmit}
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
        onSaved={() => refreshFilters()}
      />
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.mistWhite,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: 0,
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.semibold,
    fontSize: 26,
  },
  profileButton: {
    borderRadius: Layout.borderRadius.full,
    overflow: 'hidden',
  },
  profileImage: {
    width: 36,
    height: 36,
    borderRadius: Layout.borderRadius.full,
  },
  profileAvatarFallback: {
    width: 36,
    height: 36,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  profileAvatarText: {
    color: Colors.white,
    fontSize: 14,
    fontWeight: Typography.fontWeight.semibold,
  },
  feedContent: {
    paddingBottom: Spacing.xl,
  },
  recentActivityLabel: {
    fontSize: 11,
    fontWeight: '600',
    color: Colors.mutedSageGray,
    letterSpacing: 0.7,
    textTransform: 'uppercase',
    paddingHorizontal: Spacing.base,
    marginTop: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.xl,
    backgroundColor: Colors.mintCream,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    marginTop: Spacing.base,
  },
  emptyIcon: {
    marginBottom: Spacing.lg,
    opacity: 0.9,
  },
  emptyTitle: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.sm,
    fontSize: 18,
    fontWeight: '600',
  },
  emptyText: {
    color: Colors.textSecondary,
    textAlign: 'center',
    fontSize: 16,
    lineHeight: 22,
  },
  keyboardAccessory: {
    backgroundColor: Colors.surface,
    borderTopWidth: Layout.borderWidth.thin,
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
    borderRadius: Layout.borderRadius.md,
  },
  keyboardAccessoryButtonText: {
    color: Colors.textOnPrimary,
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
  },
});

export default CommunityScreen;

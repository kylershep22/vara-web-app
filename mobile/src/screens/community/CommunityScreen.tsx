/**
 * Community Screen
 * Social feed with posts from connections and groups
 */

import React, { useState, useEffect, useCallback, memo } from 'react';
import {
  View,
  StyleSheet,
  FlatList,
  TouchableOpacity,
  RefreshControl,
  TextInput as RNTextInput,
  Alert,
  Image,
  Keyboard,
  InputAccessoryView,
  Platform,
  ScrollView,
} from 'react-native';
import { Text, Avatar, IconButton, Portal, Modal, Button as PaperButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import * as ImagePicker from 'expo-image-picker';
import { Card, LoadingSpinner, PostCard, QuickNavButton } from '../../components';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useAuth } from '../../context/AuthContext';
import { useFeed } from '../../hooks';
import { uploadPostMedia } from '../../services/firebase';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { doc, getDoc } from 'firebase/firestore';
import { db } from '../../config/firebase';

// Extracted Create Post Modal component to prevent re-renders from parent Firestore subscriptions
interface CreatePostModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (content: string, media: Array<{ uri: string; type: 'image' | 'video'; id: string }>) => Promise<void>;
  userId: string;
}

const CreatePostModal = memo(({ visible, onDismiss, onSubmit, userId }: CreatePostModalProps) => {
  const [postContent, setPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Array<{
    uri: string;
    type: 'image' | 'video';
    id: string;
  }>>([]);

  // Permission request functions
  const requestCameraPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestCameraPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Camera access is needed to take photos and videos');
      return false;
    }
    return true;
  };

  const requestLibraryPermission = async (): Promise<boolean> => {
    const { status } = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (status !== 'granted') {
      Alert.alert('Permission Required', 'Photo library access is needed to select media');
      return false;
    }
    return true;
  };

  // Media selection functions
  const handleTakePhoto = async () => {
    if (!(await requestCameraPermission())) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Images,
      allowsEditing: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      setSelectedMedia(prev => [...prev, {
        uri: result.assets[0].uri,
        type: 'image',
        id: Date.now().toString(),
      }]);
    }
  };

  const handleRecordVideo = async () => {
    if (!(await requestCameraPermission())) return;

    const result = await ImagePicker.launchCameraAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.Videos,
      videoMaxDuration: 300, // 5 minutes
      videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
    });

    if (!result.canceled) {
      // Validate duration
      if (result.assets[0].duration && result.assets[0].duration > 300) {
        Alert.alert('Video Too Long', 'Videos must be 5 minutes or less');
        return;
      }

      setSelectedMedia(prev => [...prev, {
        uri: result.assets[0].uri,
        type: 'video',
        id: Date.now().toString(),
      }]);
    }
  };

  const handleChooseFromLibrary = async () => {
    if (!(await requestLibraryPermission())) return;

    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ImagePicker.MediaTypeOptions.All,
      allowsMultipleSelection: true,
      quality: 0.8,
    });

    if (!result.canceled) {
      const newMedia = result.assets.map(asset => ({
        uri: asset.uri,
        type: asset.type === 'video' ? 'video' as const : 'image' as const,
        id: `${Date.now()}_${Math.random()}`,
      }));

      setSelectedMedia(prev => [...prev, ...newMedia]);
    }
  };

  const showMediaOptions = () => {
    Alert.alert(
      'Add Media',
      'Choose a source',
      [
        { text: 'Take Photo', onPress: handleTakePhoto },
        { text: 'Record Video', onPress: handleRecordVideo },
        { text: 'Choose from Library', onPress: handleChooseFromLibrary },
        { text: 'Cancel', style: 'cancel' },
      ],
      { cancelable: true }
    );
  };

  const removeMedia = (id: string) => {
    setSelectedMedia(prev => prev.filter(m => m.id !== id));
  };

  const handleCreatePost = async () => {
    if (!postContent.trim() && selectedMedia.length === 0) {
      Alert.alert('Error', 'Please enter some content or add media');
      return;
    }

    setSubmitting(true);
    setIsUploading(selectedMedia.length > 0);

    try {
      await onSubmit(postContent, selectedMedia);
      // Success - clear and close
      setPostContent('');
      setSelectedMedia([]);
      onDismiss();
      Alert.alert('Success', 'Post created!');
    } catch (error) {
      console.error('Error creating post:', error);
      Alert.alert(
        'Upload Failed',
        'Would you like to try again?',
        [
          { text: 'Retry', onPress: handleCreatePost },
          { text: 'Cancel', style: 'cancel' }
        ]
      );
    } finally {
      setSubmitting(false);
      setIsUploading(false);
    }
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
      <Text variant="headlineSmall" style={styles.modalTitle}>
        Create Post
      </Text>

      <RNTextInput
        value={postContent}
        onChangeText={setPostContent}
        placeholder="What's on your mind?"
        multiline
        numberOfLines={6}
        style={styles.postInput}
        textAlignVertical="top"
        inputAccessoryViewID="communityInputAccessory"
        blurOnSubmit={false}
      />

      {/* Media Preview Grid */}
      {selectedMedia.length > 0 && (
        <ScrollView
          horizontal
          style={styles.mediaPreview}
          showsHorizontalScrollIndicator={false}
        >
          {selectedMedia.map((media) => (
            <View key={media.id} style={styles.mediaThumbnail}>
              <Image
                source={{ uri: media.uri }}
                style={styles.thumbnailImage}
              />

              {/* Remove button */}
              <TouchableOpacity
                style={styles.removeButton}
                onPress={() => removeMedia(media.id)}
              >
                <Icon name="close-circle" size={24} color={Colors.error} />
              </TouchableOpacity>

              {/* Video indicator */}
              {media.type === 'video' && (
                <View style={styles.videoIndicator}>
                  <Icon name="play-circle" size={32} color="#fff" />
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      {/* Add Media Button */}
      <TouchableOpacity
        style={styles.addMediaButton}
        onPress={showMediaOptions}
      >
        <Icon name="image-plus" size={24} color={Colors.evergreenTeal} />
        <Text style={styles.addMediaText}>Add Photos/Videos</Text>
      </TouchableOpacity>

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
          onPress={handleCreatePost}
          loading={submitting || isUploading}
          disabled={submitting || isUploading || (!postContent.trim() && selectedMedia.length === 0)}
          style={styles.modalButton}
          buttonColor={Colors.evergreenTeal}
        >
          {isUploading ? 'Uploading...' : 'Post'}
        </PaperButton>
      </View>
    </Modal>
  );
});

// Extracted Comment Modal component
interface CommentModalProps {
  visible: boolean;
  postId: string | null;
  onDismiss: () => void;
  onSubmit: (postId: string, text: string) => Promise<void>;
}

const CommentModal = memo(({ visible, postId, onDismiss, onSubmit }: CommentModalProps) => {
  const [commentText, setCommentText] = useState('');

  const handleComment = async () => {
    if (!commentText.trim() || !postId) return;

    try {
      await onSubmit(postId, commentText);
      setCommentText('');
      onDismiss();
    } catch (error) {
      Alert.alert('Error', 'Failed to add comment');
    }
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
      <Text variant="headlineSmall" style={styles.modalTitle}>
        Comments
      </Text>

      <View style={styles.commentInputContainer}>
        <RNTextInput
          value={commentText}
          onChangeText={setCommentText}
          placeholder="Write a comment..."
          style={styles.commentInput}
          inputAccessoryViewID="communityInputAccessory"
          returnKeyType="send"
          onSubmitEditing={handleComment}
          blurOnSubmit={false}
        />
        <IconButton
          icon="send"
          size={24}
          iconColor={Colors.evergreenTeal}
          onPress={handleComment}
        />
      </View>

      <PaperButton
        mode="outlined"
        onPress={handleDismiss}
        style={styles.modalButton}
      >
        Close
      </PaperButton>
    </Modal>
  );
});

const INPUT_ACCESSORY_VIEW_ID = 'communityInputAccessory';

const CommunityScreen: React.FC = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { posts, loading, createPost, likePost, commentOnPost } = useFeed();
  const [refreshing, setRefreshing] = useState(false);
  const [showCreatePost, setShowCreatePost] = useState(false);
  const [showComments, setShowComments] = useState<string | null>(null);
  const [userProfile, setUserProfile] = useState<any>(null);

  // Load user profile data for avatar
  useEffect(() => {
    const loadUserProfile = async () => {
      if (!user) return;
      try {
        const userDoc = await getDoc(doc(db, 'users', user.uid));
        if (userDoc.exists()) {
          setUserProfile(userDoc.data());
        }
      } catch (error) {
        console.error('Error loading user profile:', error);
      }
    };
    loadUserProfile();
  }, [user]);

  const handleRefresh = async () => {
    setRefreshing(true);
    // Posts update automatically via real-time subscription
    setTimeout(() => setRefreshing(false), 1000);
  };

  // Memoized callback for creating posts (used by extracted modal)
  const handleSubmitPost = useCallback(async (
    content: string,
    selectedMedia: Array<{ uri: string; type: 'image' | 'video'; id: string }>
  ) => {
    let mediaArray: Array<{ url: string; type: 'image' | 'video' }> = [];

    // Upload media if selected
    if (selectedMedia.length > 0) {
      const uploadResults = await uploadPostMedia(user!.uid, selectedMedia);
      mediaArray = uploadResults.map(r => ({
        url: r.url,
        type: r.type,
      }));
    }

    // Create post with media array
    await createPost(content, undefined, mediaArray);
  }, [user, createPost]);

  const handleLike = useCallback(async (postId: string) => {
    try {
      await likePost(postId);
    } catch (error) {
      Alert.alert('Error', 'Failed to like post');
    }
  }, [likePost]);

  // Memoized callback for commenting (used by extracted modal)
  const handleCommentSubmit = useCallback(async (postId: string, text: string) => {
    await commentOnPost(postId, text);
  }, [commentOnPost]);

  const handleCloseCreatePost = useCallback(() => {
    setShowCreatePost(false);
  }, []);

  const handleCloseComments = useCallback(() => {
    setShowComments(null);
  }, []);

  const formatTimestamp = (post: any) => {
    // Support both timestamp (web app) and createdAt (mobile app)
    const timestamp = post.timestamp || post.createdAt;
    if (!timestamp) return '';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const minutes = Math.floor(diff / 60000);
    const hours = Math.floor(diff / 3600000);
    const days = Math.floor(diff / 86400000);

    if (minutes < 1) return 'Just now';
    if (minutes < 60) return `${minutes}m ago`;
    if (hours < 24) return `${hours}h ago`;
    if (days < 7) return `${days}d ago`;

    return date.toLocaleDateString('en-US', {
      month: 'short',
      day: 'numeric',
    });
  };

  const renderPost = ({ item }: { item: any }) => (
    <PostCard
      post={item}
      onLike={handleLike}
      onComment={setShowComments}
      formatTimestamp={formatTimestamp}
    />
  );

  const renderHeader = () => (
    <>
      {/* Quick Navigation */}
      <View style={styles.quickNav}>
        <QuickNavButton
          icon="account-group"
          label="Groups"
          onPress={() => navigation.navigate('Groups')}
        />
        <QuickNavButton
          icon="account-multiple"
          label="People"
          onPress={() => navigation.navigate('People')}
        />
        <QuickNavButton
          icon="message-text"
          label="Messages"
          onPress={() => navigation.navigate('Conversations')}
        />
      </View>

      {/* Create Post Button */}
      <Card style={styles.createPostCard}>
        <TouchableOpacity
          style={styles.createPostButton}
          onPress={() => setShowCreatePost(true)}
        >
          <Avatar.Text
            size={36}
            label={(user?.displayName || 'U').substring(0, 2).toUpperCase()}
            style={styles.avatar}
            color={Colors.textOnPrimary}
          />
          <Text variant="bodyMedium" style={styles.createPostPlaceholder}>
            What's on your mind?
          </Text>
        </TouchableOpacity>
      </Card>
    </>
  );

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.screenTitle}>
          Community
        </Text>
        {/* Profile Picture Button */}
        <TouchableOpacity
          style={styles.profileButton}
          onPress={() => navigation.navigate('ProfileStack')}
        >
          {userProfile?.avatarUrl ? (
            <Image
              source={{ uri: userProfile.avatarUrl }}
              style={styles.profileImage}
            />
          ) : (
            <Avatar.Text
              size={40}
              label={(userProfile?.displayName || user?.displayName || 'U').substring(0, 2).toUpperCase()}
              style={styles.profileAvatar}
              color={Colors.textOnPrimary}
            />
          )}
        </TouchableOpacity>
      </View>

      {loading && posts.length === 0 ? (
        <LoadingSpinner message="Loading feed..." />
      ) : (
        <FlatList
          data={posts}
          renderItem={renderPost}
          keyExtractor={(item) => item.id}
          ListHeaderComponent={renderHeader}
          contentContainerStyle={styles.feedContent}
          refreshControl={
            <RefreshControl refreshing={refreshing} onRefresh={handleRefresh} />
          }
          ListEmptyComponent={
            <View style={styles.emptyState}>
              <Icon
                name="earth"
                size={64}
                color={Colors.textSecondary}
                style={styles.emptyIcon}
              />
              <Text variant="titleMedium" style={styles.emptyTitle}>
                Your feed is empty
              </Text>
              <Text variant="bodyMedium" style={styles.emptyText}>
                Connect with people and join groups to see posts here
              </Text>
            </View>
          }
        />
      )}

      {/* Create Post Modal - Extracted to prevent re-renders */}
      <Portal>
        <CreatePostModal
          visible={showCreatePost}
          onDismiss={handleCloseCreatePost}
          onSubmit={handleSubmitPost}
          userId={user?.uid || ''}
        />
      </Portal>

      {/* Comment Modal - Extracted to prevent re-renders */}
      <Portal>
        <CommentModal
          visible={showComments !== null}
          postId={showComments}
          onDismiss={handleCloseComments}
          onSubmit={handleCommentSubmit}
        />
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
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
  },
  profileButton: {
    borderRadius: Layout.borderRadius['2xl'],
    overflow: 'hidden',
  },
  profileImage: {
    width: 40,
    height: 40,
    borderRadius: Layout.borderRadius['2xl'],
    borderWidth: Layout.borderWidth.medium,
    borderColor: Colors.evergreenTeal,
  },
  profileAvatar: {
    backgroundColor: Colors.evergreenTeal,
  },
  feedContent: {
    paddingBottom: Spacing.xl,
  },
  quickNav: {
    flexDirection: 'row',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
    justifyContent: 'space-around',
  },
  createPostCard: {
    marginHorizontal: Spacing.lg,
    marginVertical: Spacing.md,
  },
  createPostButton: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.sm,
  },
  createPostPlaceholder: {
    color: Colors.textSecondary,
    marginLeft: Spacing.md,
    flex: 1,
  },
  avatar: {
    backgroundColor: Colors.evergreenTeal,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing.xl * 2,
    paddingHorizontal: Spacing.xl,
  },
  emptyIcon: {
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
  modal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
  },
  modalTitle: {
    color: Colors.evergreenTeal,
    marginBottom: Spacing.lg,
    fontWeight: Typography.fontWeight.semibold,
  },
  postInput: {
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
    minHeight: 120,
    marginBottom: Spacing.md,
  },
  commentInputContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  commentInput: {
    flex: 1,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.border,
    borderRadius: Layout.borderRadius.md,
    padding: Spacing.md,
    fontSize: Typography.fontSize.sm,
    color: Colors.textPrimary,
    backgroundColor: Colors.background,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
  // Media preview
  mediaPreview: {
    marginVertical: Spacing.md,
    maxHeight: 100,
  },
  mediaThumbnail: {
    width: 80,
    height: 80,
    marginRight: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
    overflow: 'hidden',
    position: 'relative',
  },
  thumbnailImage: {
    width: '100%',
    height: '100%',
  },
  removeButton: {
    position: 'absolute',
    top: -8,
    right: -8,
    backgroundColor: Colors.surface,
    borderRadius: 12,
  },
  videoIndicator: {
    position: 'absolute',
    top: 0,
    left: 0,
    right: 0,
    bottom: 0,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
  },
  // Add media button
  addMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.borderLight,
    borderRadius: Layout.borderRadius.md,
    borderStyle: 'dashed',
    marginBottom: Spacing.md,
  },
  addMediaText: {
    marginLeft: Spacing.sm,
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
  // Keyboard Accessory Toolbar
  keyboardAccessory: {
    backgroundColor: Colors.surface,
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: Colors.borderLight,
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

export default CommunityScreen;

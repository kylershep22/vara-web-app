/**
 * CreatePostModal
 * Modal for creating a new post in a group with optional media attachments.
 */

import React, { useState, useCallback, memo, useRef } from 'react';
import {
  View,
  Text,
  StyleSheet,
  TouchableOpacity,
  TextInput as RNTextInput,
  Alert,
  Image,
  Keyboard,
  InputAccessoryView,
  Platform,
  ScrollView,
  ImageStyle,
  Modal,
  KeyboardAvoidingView,
  TouchableWithoutFeedback,
} from 'react-native';
import * as ImagePicker from 'expo-image-picker';
import { safePickFromLibrary, safePickFromCamera } from '../../utils/safeImagePicker';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { logger } from '../../utils/logger';

const INPUT_ACCESSORY_VIEW_ID = 'groupDetailInputAccessory';

export interface CreatePostModalProps {
  visible: boolean;
  onDismiss: () => void;
  onSubmit: (content: string, media: Array<{ uri: string; type: 'image' | 'video'; id: string }>) => Promise<void>;
  groupName?: string;
  title?: string;
  placeholder?: string;
}

const CreatePostModal = memo(({ visible, onDismiss, onSubmit, groupName, title, placeholder }: CreatePostModalProps) => {
  const isPickerOpen = useRef(false);
  const [postContent, setPostContent] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [isUploading, setIsUploading] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Array<{
    uri: string;
    type: 'image' | 'video';
    id: string;
  }>>([]);

  const handleTakePhoto = async () => {
    if (isPickerOpen.current) return;
    isPickerOpen.current = true;
    try {
      const assets = await safePickFromCamera({
        mediaTypes: ImagePicker.MediaTypeOptions.Images,
        allowsEditing: true,
        quality: 0.8,
      });
      if (assets) {
        setSelectedMedia(prev => [...prev, {
          uri: assets[0].uri,
          type: 'image' as const,
          id: Date.now().toString(),
        }]);
      }
    } finally {
      isPickerOpen.current = false;
    }
  };

  const handleRecordVideo = async () => {
    if (isPickerOpen.current) return;
    isPickerOpen.current = true;
    try {
      const assets = await safePickFromCamera({
        mediaTypes: ImagePicker.MediaTypeOptions.Videos,
        videoMaxDuration: 300,
        videoQuality: ImagePicker.UIImagePickerControllerQualityType.Medium,
      });
      if (assets) {
        if (assets[0].duration && assets[0].duration > 300) {
          Alert.alert('Video Too Long', 'Videos must be 5 minutes or less');
          return;
        }
        setSelectedMedia(prev => [...prev, {
          uri: assets[0].uri,
          type: 'video' as const,
          id: Date.now().toString(),
        }]);
      }
    } finally {
      isPickerOpen.current = false;
    }
  };

  const handleChooseFromLibrary = async () => {
    if (isPickerOpen.current) return;
    isPickerOpen.current = true;
    try {
      const assets = await safePickFromLibrary({
        mediaTypes: ImagePicker.MediaTypeOptions.All,
        allowsMultipleSelection: true,
        quality: 0.8,
      });
      if (assets) {
        const newMedia = assets.map(asset => ({
          uri: asset.uri,
          type: asset.type === 'video' ? 'video' as const : 'image' as const,
          id: `${Date.now()}_${Math.random()}`,
        }));
        setSelectedMedia(prev => [...prev, ...newMedia]);
      }
    } finally {
      isPickerOpen.current = false;
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
      setPostContent('');
      setSelectedMedia([]);
      onDismiss();
      Alert.alert('Success', 'Post created!');
    } catch (error) {
      logger.error('Error creating post:', error);
      Alert.alert('Upload Failed', 'Would you like to try again?', [
        { text: 'Retry', onPress: handleCreatePost },
        { text: 'Cancel', style: 'cancel' }
      ]);
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
      transparent
      animationType="fade"
      onRequestClose={handleDismiss}
    >
    <TouchableWithoutFeedback onPress={Keyboard.dismiss}>
    <KeyboardAvoidingView
      style={{flex: 1, backgroundColor: 'rgba(0,0,0,0.5)', justifyContent: 'center', paddingHorizontal: Spacing.lg}}
      behavior={Platform.OS === 'ios' ? 'padding' : 'height'}
    >
    <View style={modalStyles.modal}>
    <ScrollView
      keyboardShouldPersistTaps="handled"
      showsVerticalScrollIndicator={false}
      bounces={false}
    >
      <Text style={modalStyles.modalTitle}>
        {title || (groupName ? `Post to ${groupName}` : 'Share with the community')}
      </Text>

      <RNTextInput
        value={postContent}
        onChangeText={setPostContent}
        placeholder={placeholder || 'Share something with the group...'}
        multiline
        numberOfLines={6}
        style={modalStyles.postInput}
        textAlignVertical="top"
        inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
        blurOnSubmit={false}
      />

      {selectedMedia.length > 0 && (
        <ScrollView
          horizontal
          style={modalStyles.mediaPreview}
          showsHorizontalScrollIndicator={false}
        >
          {selectedMedia.map((media) => (
            <View key={media.id} style={modalStyles.mediaThumbnail}>
              <Image
                source={{ uri: media.uri }}
                style={modalStyles.thumbnailImage}
              />
              <TouchableOpacity
                style={modalStyles.removeButton}
                onPress={() => removeMedia(media.id)}
              >
                <Icon name="close-circle" size={24} color={Colors.error} />
              </TouchableOpacity>
              {media.type === 'video' && (
                <View style={modalStyles.videoIndicator}>
                  <Icon name="play-circle" size={32} color={Colors.white} />
                </View>
              )}
            </View>
          ))}
        </ScrollView>
      )}

      <TouchableOpacity
        style={modalStyles.addMediaButton}
        onPress={showMediaOptions}
      >
        <Icon name="image-plus" size={24} color={Colors.evergreenTeal} />
        <Text style={modalStyles.addMediaText}>Add Photos/Videos</Text>
      </TouchableOpacity>

      <View style={modalStyles.modalActions}>
        <TouchableOpacity
          onPress={handleDismiss}
          style={[modalStyles.modalButton, {borderWidth: 1, borderColor: Colors.border, borderRadius: 8, paddingVertical: 10, alignItems: 'center' as const}]}
        >
          <Text style={{color: Colors.textPrimary, fontSize: 14, fontWeight: '500'}}>Cancel</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleCreatePost}
          disabled={submitting || isUploading || (!postContent.trim() && selectedMedia.length === 0)}
          style={[modalStyles.modalButton, {backgroundColor: Colors.evergreenTeal, borderRadius: 8, paddingVertical: 10, alignItems: 'center' as const, opacity: (submitting || isUploading || (!postContent.trim() && selectedMedia.length === 0)) ? 0.5 : 1}]}
        >
          <Text style={{color: '#fff', fontSize: 14, fontWeight: '500'}}>{isUploading ? 'Uploading...' : 'Post'}</Text>
        </TouchableOpacity>
      </View>
    </ScrollView>
    </View>
    </KeyboardAvoidingView>
    </TouchableWithoutFeedback>
    </Modal>
  );
});

const modalStyles = StyleSheet.create({
  modal: {
    backgroundColor: Colors.surface,
    marginHorizontal: Spacing.lg,
    borderRadius: Layout.borderRadius.lg,
    padding: Spacing.lg,
    maxHeight: '80%',
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
    padding: Spacing.base,
    fontSize: Typography.fontSize.base,
    color: Colors.textPrimary,
    backgroundColor: Colors.mistWhite,
    minHeight: 120,
    marginBottom: Spacing.base,
  },
  modalActions: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.sm,
  },
  modalButton: {
    flex: 1,
  },
  mediaPreview: {
    marginVertical: Spacing.base,
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
  } as ImageStyle,
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
  addMediaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.base,
    borderWidth: Layout.borderWidth.thin,
    borderColor: Colors.borderLight,
    borderRadius: Layout.borderRadius.md,
    borderStyle: 'dashed',
    marginBottom: Spacing.base,
  },
  addMediaText: {
    marginLeft: Spacing.sm,
    color: Colors.evergreenTeal,
    fontSize: Typography.fontSize.sm,
    fontWeight: Typography.fontWeight.medium,
  },
});

export default CreatePostModal;

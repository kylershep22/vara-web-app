/**
 * Post Overflow Bottom Sheet
 * Shows Report/Hide/Mute for other users' posts, Edit/Delete for own posts
 */

import React from 'react';
import {
  View,
  Text,
  Modal,
  Pressable,
  TouchableOpacity,
  StyleSheet,
  Alert,
} from 'react-native';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface ActionItem {
  icon: string;
  label: string;
  sublabel: string;
  onPress: () => void;
  destructive?: boolean;
}

interface PostOverflowSheetProps {
  visible: boolean;
  onDismiss: () => void;
  post: any;
  currentUserId: string;
  onReport: () => void;
  onHide: () => void;
  onMute: () => void;
  onEdit: () => void;
  onDelete: () => void;
}

export const PostOverflowSheet: React.FC<PostOverflowSheetProps> = ({
  visible,
  onDismiss,
  post,
  currentUserId,
  onReport,
  onHide,
  onMute,
  onEdit,
  onDelete,
}) => {
  const insets = useSafeAreaInsets();

  if (!post) return null;

  const postAuthorId = post.authorId || post.userId || post.author?.uid;
  const isOwnPost = postAuthorId === currentUserId;

  const handleDelete = () => {
    onDismiss();
    Alert.alert(
      'Delete post',
      'Are you sure you want to delete this post? This cannot be undone.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: onDelete,
        },
      ]
    );
  };

  const actions: ActionItem[] = isOwnPost
    ? [
        {
          icon: 'pencil-outline',
          label: 'Edit post',
          sublabel: 'Make changes to your post',
          onPress: () => { onDismiss(); onEdit(); },
        },
        {
          icon: 'trash-can-outline',
          label: 'Delete post',
          sublabel: 'Remove this from the community',
          onPress: handleDelete,
          destructive: true,
        },
      ]
    : [
        {
          icon: 'flag-outline',
          label: 'Report this post',
          sublabel: 'Let us know if something feels off',
          onPress: () => { onDismiss(); onReport(); },
        },
        {
          icon: 'eye-off-outline',
          label: 'Hide this post',
          sublabel: 'Remove from your feed',
          onPress: () => { onDismiss(); onHide(); },
        },
        {
          icon: 'volume-off',
          label: 'Mute this person',
          sublabel: 'Stop seeing their posts',
          onPress: () => { onDismiss(); onMute(); },
        },
      ];

  return (
    <Modal
      visible={visible}
      transparent
      animationType="slide"
      onRequestClose={onDismiss}
    >
      <Pressable style={styles.overlay} onPress={onDismiss}>
        <View />
      </Pressable>
      <View style={[styles.sheet, { paddingBottom: insets.bottom + Spacing.xl }]}>
        {/* Handle bar */}
        <View style={styles.handleContainer}>
          <View style={styles.handle} />
        </View>

        {/* Action rows */}
        {actions.map((action, index) => (
          <TouchableOpacity
            key={action.label}
            style={[
              styles.actionRow,
              index < actions.length - 1 && styles.actionRowBorder,
            ]}
            onPress={action.onPress}
            activeOpacity={0.7}
            accessibilityLabel={`${action.label}. ${action.sublabel}`}
            accessibilityRole="button"
          >
            <View style={[
              styles.iconContainer,
              action.destructive && styles.iconContainerDestructive,
            ]}>
              <Icon
                name={action.icon as any}
                size={22}
                color={action.destructive ? Colors.softCoral : Colors.evergreenTeal}
              />
            </View>
            <View style={styles.actionTextContainer}>
              <Text style={[
                styles.actionLabel,
                action.destructive && styles.actionLabelDestructive,
              ]}>
                {action.label}
              </Text>
              <Text style={styles.actionSublabel}>{action.sublabel}</Text>
            </View>
          </TouchableOpacity>
        ))}

        {/* Cancel button */}
        <TouchableOpacity
          style={styles.cancelButton}
          onPress={onDismiss}
          activeOpacity={0.7}
        >
          <Text style={styles.cancelText}>Cancel</Text>
        </TouchableOpacity>
      </View>
    </Modal>
  );
};

const styles = StyleSheet.create({
  overlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.3)',
    justifyContent: 'flex-end',
  },
  sheet: {
    backgroundColor: Colors.white,
    borderTopLeftRadius: Layout.borderRadius.xl,
    borderTopRightRadius: Layout.borderRadius.xl,
    paddingHorizontal: Spacing.lg,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.08,
    shadowRadius: 16,
    elevation: 8,
  },
  handleContainer: {
    alignItems: 'center',
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  handle: {
    width: 40,
    height: 4,
    backgroundColor: Colors.silverSage,
    borderRadius: 2,
  },
  actionRow: {
    flexDirection: 'row',
    alignItems: 'center',
    height: 64,
    paddingVertical: 14,
  },
  actionRowBorder: {
    borderBottomWidth: 1,
    borderBottomColor: Colors.divider,
  },
  iconContainer: {
    width: 40,
    height: 40,
    borderRadius: Layout.borderRadius.md,
    backgroundColor: 'rgba(213, 227, 209, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
  },
  iconContainerDestructive: {
    backgroundColor: 'rgba(217, 122, 110, 0.12)',
  },
  actionTextContainer: {
    flex: 1,
    marginLeft: 14,
  },
  actionLabel: {
    fontSize: 16,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.softCharcoal,
  },
  actionLabelDestructive: {
    color: Colors.softCoral,
  },
  actionSublabel: {
    fontSize: 14,
    fontWeight: Typography.fontWeight.regular,
    color: Colors.mutedSageGray,
    marginTop: 2,
  },
  cancelButton: {
    height: 48,
    justifyContent: 'center',
    alignItems: 'center',
    borderRadius: Layout.borderRadius.lg,
    borderWidth: 1.5,
    borderColor: Colors.silverSage,
    marginTop: Spacing.md,
  },
  cancelText: {
    fontSize: 16,
    fontWeight: Typography.fontWeight.medium,
    color: Colors.mutedSageGray,
  },
});

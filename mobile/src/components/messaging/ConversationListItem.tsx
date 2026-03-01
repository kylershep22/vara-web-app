/**
 * ConversationListItem
 * Displays a single conversation row in the messages list.
 * Accepts pre-enriched ConversationWithUser data from the useConversations hook.
 */

import React from 'react';
import {
  View,
  Text,
  TouchableOpacity,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import type { ConversationWithUser } from '../../hooks/useConversations';

interface ConversationListItemProps {
  conversation: ConversationWithUser;
  currentUserId: string;
  onPress: () => void;
}

const formatRelativeTime = (timestamp: any): string => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  const now = new Date();
  const diffMs = now.getTime() - date.getTime();
  const seconds = Math.floor(diffMs / 1000);
  const minutes = Math.floor(seconds / 60);
  const hours = Math.floor(minutes / 60);
  const days = Math.floor(hours / 24);

  if (seconds < 60) return 'Just now';
  if (minutes < 60) return `${minutes}m`;
  if (hours < 24) return `${hours}h`;
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
};

export const ConversationListItem: React.FC<ConversationListItemProps> = ({
  conversation,
  currentUserId,
  onPress,
}) => {
  const otherUser = conversation.otherUser;
  const lastMessage = conversation.lastMessage;
  const isUnread = conversation.unreadCount > 0;

  const displayName = otherUser?.displayName || 'User';
  const initial = displayName[0]?.toUpperCase() || 'U';

  const previewText = lastMessage
    ? `${lastMessage.senderId === currentUserId ? 'You: ' : ''}${lastMessage.text}`
    : 'No messages yet';

  return (
    <TouchableOpacity
      style={styles.container}
      onPress={onPress}
      activeOpacity={0.7}
      accessibilityRole="button"
      accessibilityLabel={`Conversation with ${displayName}${isUnread ? ', unread' : ''}`}
    >
      <View style={styles.avatarContainer}>
        {otherUser?.avatarUrl ? (
          <Image source={{ uri: otherUser.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>{initial}</Text>
          </View>
        )}
        {isUnread && <View style={styles.unreadDot} />}
      </View>

      <View style={styles.content}>
        <View style={styles.headerRow}>
          <Text
            style={[styles.name, isUnread && styles.nameUnread]}
            numberOfLines={1}
          >
            {displayName}
          </Text>
          {lastMessage && (
            <Text style={[styles.timestamp, isUnread && styles.timestampUnread]}>
              {formatRelativeTime(lastMessage.createdAt)}
            </Text>
          )}
        </View>
        <Text
          style={[styles.preview, isUnread && styles.previewUnread]}
          numberOfLines={1}
        >
          {previewText}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const AVATAR_SIZE = 52;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.base,
    backgroundColor: Colors.white,
    minHeight: 72,
  },
  avatarContainer: {
    position: 'relative',
    marginRight: Spacing.md,
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textOnPrimary,
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: Colors.sunriseAmber,
    borderWidth: 2,
    borderColor: Colors.white,
  },
  content: {
    flex: 1,
    justifyContent: 'center',
  },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 3,
  },
  name: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    flex: 1,
    marginRight: Spacing.sm,
  },
  nameUnread: {
    fontWeight: Typography.fontWeight.bold,
  },
  timestamp: {
    fontSize: Typography.fontSize.xs,
    color: Colors.text.secondary,
  },
  timestampUnread: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.medium,
  },
  preview: {
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
    lineHeight: Typography.fontSize.sm * Typography.lineHeight.normal,
  },
  previewUnread: {
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
  },
});

export default ConversationListItem;

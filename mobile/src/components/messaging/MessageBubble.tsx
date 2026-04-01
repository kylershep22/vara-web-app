/**
 * MessageBubble
 * Individual message bubble with support for grouping consecutive messages.
 */

import React, { useState } from 'react';
import {
  View,
  Text,
  Image,
  StyleSheet,
  Platform,
} from 'react-native';
import { Colors, Spacing, Typography, Layout } from '../../constants';

interface MessageBubbleProps {
  text: string;
  timestamp: any;
  isMine: boolean;
  senderAvatarUrl?: string;
  /** First message in a consecutive group from the same sender */
  isFirstInGroup: boolean;
  /** Last message in a consecutive group from the same sender */
  isLastInGroup: boolean;
}

const formatTime = (timestamp: any): string => {
  if (!timestamp) return '';
  const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
  return date.toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
};

export const MessageBubble: React.FC<MessageBubbleProps> = ({
  text,
  timestamp,
  isMine,
  senderAvatarUrl,
  isFirstInGroup,
  isLastInGroup,
}) => {
  const [avatarError, setAvatarError] = useState(false);
  const showAvatar = !isMine && isLastInGroup;
  const showTimestamp = isLastInGroup;

  // Determine border radii based on position in group
  const bubbleRadius = Layout.borderRadius.lg;
  const tailRadius = Layout.borderRadius.sm;

  const dynamicBubbleStyle = isMine
    ? {
        borderTopRightRadius: isFirstInGroup ? bubbleRadius : tailRadius,
        borderBottomRightRadius: isLastInGroup ? tailRadius : tailRadius,
        borderTopLeftRadius: bubbleRadius,
        borderBottomLeftRadius: bubbleRadius,
      }
    : {
        borderTopLeftRadius: isFirstInGroup ? bubbleRadius : tailRadius,
        borderBottomLeftRadius: isLastInGroup ? tailRadius : tailRadius,
        borderTopRightRadius: bubbleRadius,
        borderBottomRightRadius: bubbleRadius,
      };

  return (
    <View
      style={[
        styles.container,
        isMine ? styles.containerMine : styles.containerTheirs,
        !isLastInGroup && styles.containerGrouped,
      ]}
    >
      {/* Avatar space for received messages */}
      {!isMine && (
        <View style={styles.avatarSpace}>
          {showAvatar && senderAvatarUrl && !avatarError ? (
            <Image
              source={{ uri: senderAvatarUrl }}
              style={styles.avatar}
              onError={() => setAvatarError(true)}
            />
          ) : showAvatar ? (
            <View style={styles.avatarPlaceholder} />
          ) : null}
        </View>
      )}

      <View style={styles.bubbleWrapper}>
        <View
          style={[
            styles.bubble,
            isMine ? styles.bubbleMine : styles.bubbleTheirs,
            dynamicBubbleStyle,
          ]}
        >
          <Text style={[styles.text, isMine ? styles.textMine : styles.textTheirs]}>
            {text}
          </Text>
        </View>

        {showTimestamp && (
          <Text
            style={[
              styles.timestamp,
              isMine ? styles.timestampMine : styles.timestampTheirs,
            ]}
          >
            {formatTime(timestamp)}
          </Text>
        )}
      </View>
    </View>
  );
};

const AVATAR_SIZE = 28;

const styles = StyleSheet.create({
  container: {
    flexDirection: 'row',
    marginBottom: Spacing.xs,
    paddingHorizontal: Spacing.md,
    alignItems: 'flex-end',
  },
  containerMine: {
    justifyContent: 'flex-end',
  },
  containerTheirs: {
    justifyContent: 'flex-start',
  },
  containerGrouped: {
    marginBottom: 2,
  },
  avatarSpace: {
    width: AVATAR_SIZE + Spacing.xs,
    alignItems: 'flex-start',
  },
  avatar: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
    borderRadius: AVATAR_SIZE / 2,
  },
  avatarPlaceholder: {
    width: AVATAR_SIZE,
    height: AVATAR_SIZE,
  },
  bubbleWrapper: {
    maxWidth: '75%',
  },
  bubble: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
  },
  bubbleMine: {
    backgroundColor: Colors.evergreenTeal,
  },
  bubbleTheirs: {
    backgroundColor: Colors.surface,
    ...Platform.select({
      ios: {
        shadowColor: Colors.shadow,
        shadowOffset: { width: 0, height: 1 },
        shadowOpacity: 0.08,
        shadowRadius: 2,
      },
      android: {
        elevation: 1,
      },
    }),
  },
  text: {
    fontSize: Typography.fontSize.base,
    lineHeight: Typography.fontSize.base * Typography.lineHeight.normal,
  },
  textMine: {
    color: Colors.textOnPrimary,
  },
  textTheirs: {
    color: Colors.text.primary,
  },
  timestamp: {
    fontSize: Typography.fontSize.xs,
    marginTop: 2,
    paddingHorizontal: Spacing.xs,
  },
  timestampMine: {
    color: Colors.text.secondary,
    textAlign: 'right',
  },
  timestampTheirs: {
    color: Colors.text.secondary,
    textAlign: 'left',
  },
});

export default MessageBubble;

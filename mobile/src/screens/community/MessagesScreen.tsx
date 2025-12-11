/**
 * Messages Screen
 * List of DM conversations
 */

import React from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity } from 'react-native';
import { Text, Avatar } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Card, LoadingSpinner } from '../../components';
import { Colors, Spacing } from '../../constants';
import { useConversations } from '../../hooks';
import Icon from 'react-native-vector-icons/MaterialCommunityIcons';

const MessagesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { conversations, loading, markAsRead } = useConversations();

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';

    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const days = Math.floor(diff / (1000 * 60 * 60 * 24));

    if (days === 0) {
      return date.toLocaleTimeString('en-US', {
        hour: 'numeric',
        minute: '2-digit',
      });
    } else if (days === 1) {
      return 'Yesterday';
    } else if (days < 7) {
      return date.toLocaleDateString('en-US', { weekday: 'short' });
    } else {
      return date.toLocaleDateString('en-US', {
        month: 'short',
        day: 'numeric',
      });
    }
  };

  const handleOpenConversation = async (conversationId: string, userId: string) => {
    // TODO: Navigate to chat screen when it's created
    // await markAsRead(conversationId);
    // navigation.navigate('Chat', { conversationId, userId });
    alert('Chat screen coming soon!');
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <Text variant="headlineMedium" style={styles.screenTitle}>
          Messages
        </Text>
        <Text variant="bodyMedium" style={styles.subtitle}>
          Your conversations
        </Text>
      </View>

      {/* Conversations List */}
      {loading ? (
        <LoadingSpinner message="Loading messages..." />
      ) : conversations.length === 0 ? (
        <View style={styles.emptyContainer}>
          <Icon
            name="message-text"
            size={64}
            color={Colors.textSecondary}
            style={styles.emptyIcon}
          />
          <Text variant="titleMedium" style={styles.emptyTitle}>
            No messages yet
          </Text>
          <Text variant="bodyMedium" style={styles.emptyText}>
            Start a conversation with your connections
          </Text>
        </View>
      ) : (
        <FlatList
          data={conversations}
          renderItem={({ item }) => {
            const otherUserId = item.participants.find((id) => id !== item.otherUser?.id);

            return (
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleOpenConversation(item.id, otherUserId || '')}
              >
                <View style={styles.conversationItem}>
                  <Avatar.Text
                    size={50}
                    label={(item.otherUser?.displayName || 'U').substring(0, 2).toUpperCase()}
                    style={styles.avatar}
                    color={Colors.textOnPrimary}
                  />
                  <View style={styles.conversationInfo}>
                    <View style={styles.conversationHeader}>
                      <Text variant="titleMedium" style={styles.userName}>
                        {item.otherUser?.displayName || 'Unknown'}
                      </Text>
                      <Text variant="bodySmall" style={styles.time}>
                        {formatTime(item.lastMessage?.createdAt)}
                      </Text>
                    </View>
                    <Text
                      variant="bodyMedium"
                      style={[
                        styles.lastMessage,
                        item.unreadCount > 0 && styles.unreadMessage,
                      ]}
                      numberOfLines={1}
                    >
                      {item.lastMessage?.text || 'No messages yet'}
                    </Text>
                  </View>
                  {item.unreadCount > 0 && (
                    <View style={styles.unreadBadge}>
                      <Text variant="bodySmall" style={styles.unreadText}>
                        {item.unreadCount}
                      </Text>
                    </View>
                  )}
                </View>
              </TouchableOpacity>
            );
          }}
          keyExtractor={(item) => item.id}
          contentContainerStyle={styles.listContent}
          ItemSeparatorComponent={() => <View style={styles.separator} />}
        />
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
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: '700',
  },
  subtitle: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
  },
  listContent: {
    paddingBottom: Spacing.xl,
  },
  conversationItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    backgroundColor: Colors.surface,
  },
  avatar: {
    backgroundColor: Colors.evergreenTeal,
    marginRight: Spacing.md,
  },
  conversationInfo: {
    flex: 1,
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  userName: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  time: {
    color: Colors.textSecondary,
  },
  lastMessage: {
    color: Colors.textSecondary,
  },
  unreadMessage: {
    color: Colors.textPrimary,
    fontWeight: '600',
  },
  unreadBadge: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: 12,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: 8,
    marginLeft: Spacing.sm,
  },
  unreadText: {
    color: Colors.textOnPrimary,
    fontWeight: '600',
    fontSize: 12,
  },
  separator: {
    height: 1,
    backgroundColor: Colors.borderLight,
    marginLeft: Spacing.lg + 50 + Spacing.md, // Align with text
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
});

export default MessagesScreen;

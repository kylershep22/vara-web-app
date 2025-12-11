// mobile/src/screens/ConversationsScreen.tsx
import React, { useState, useEffect } from 'react';
import {
  View,
  Text,
  FlatList,
  TouchableOpacity,
  Image,
  StyleSheet,
  ActivityIndicator,
  Platform,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useConversations } from '../hooks/useConversations';
import { colors, spacing } from '../constants';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

interface ConversationItemProps {
  conversation: any;
  currentUserId: string;
  onPress: () => void;
}

const ConversationItem: React.FC<ConversationItemProps> = ({
  conversation,
  currentUserId,
  onPress,
}) => {
  const [otherUser, setOtherUser] = useState<any>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    loadOtherUser();
  }, [conversation]);

  const loadOtherUser = async () => {
    try {
      const otherUserId = conversation.participants.find(
        (id: string) => id !== currentUserId
      );

      if (otherUserId) {
        const userDoc = await getDoc(doc(db, 'users', otherUserId));
        if (userDoc.exists()) {
          setOtherUser({ id: userDoc.id, ...userDoc.data() });
        }
      }
    } catch (error) {
      console.error('Error loading other user:', error);
    } finally {
      setLoading(false);
    }
  };

  if (loading || !otherUser) {
    return (
      <View style={styles.conversationItem}>
        <View style={styles.avatarPlaceholder} />
        <View style={{ flex: 1 }}>
          <Text style={styles.loadingText}>Loading...</Text>
        </View>
      </View>
    );
  }

  const lastMessage = conversation.lastMessage;
  const isUnread =
    lastMessage &&
    lastMessage.senderId !== currentUserId &&
    (!conversation.lastReadBy ||
      !conversation.lastReadBy[currentUserId] ||
      new Date(lastMessage.createdAt?.toDate?.() || lastMessage.createdAt) >
        new Date(
          conversation.lastReadBy[currentUserId]?.toDate?.() ||
            conversation.lastReadBy[currentUserId]
        ));

  const formatTime = (timestamp: any) => {
    if (!timestamp) return '';
    const date = timestamp.toDate ? timestamp.toDate() : new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const seconds = Math.floor(diff / 1000);
    const minutes = Math.floor(seconds / 60);
    const hours = Math.floor(minutes / 60);
    const days = Math.floor(hours / 24);

    if (seconds < 60) return 'Just now';
    if (minutes < 60) return `${minutes}m`;
    if (hours < 24) return `${hours}h`;
    if (days < 7) return `${days}d`;
    return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
  };

  return (
    <TouchableOpacity style={styles.conversationItem} onPress={onPress}>
      <View style={styles.avatarContainer}>
        {otherUser.avatarUrl ? (
          <Image source={{ uri: otherUser.avatarUrl }} style={styles.avatar} />
        ) : (
          <View style={styles.avatarPlaceholder}>
            <Text style={styles.avatarText}>
              {otherUser.displayName
                ? otherUser.displayName[0].toUpperCase()
                : 'U'}
            </Text>
          </View>
        )}
        {isUnread && <View style={styles.unreadDot} />}
      </View>

      <View style={styles.conversationContent}>
        <View style={styles.conversationHeader}>
          <Text
            style={[styles.userName, isUnread && styles.userNameUnread]}
            numberOfLines={1}
          >
            {otherUser.displayName || 'User'}
          </Text>
          {lastMessage && (
            <Text style={styles.timestamp}>
              {formatTime(lastMessage.createdAt)}
            </Text>
          )}
        </View>
        <Text
          style={[
            styles.lastMessage,
            isUnread && styles.lastMessageUnread,
          ]}
          numberOfLines={1}
        >
          {lastMessage
            ? `${lastMessage.senderId === currentUserId ? 'You: ' : ''}${
                lastMessage.text
              }`
            : 'No messages yet'}
        </Text>
      </View>
    </TouchableOpacity>
  );
};

const ConversationsScreen = () => {
  const { user } = useAuth();
  const navigation = useNavigation<any>();
  const { conversations, loading } = useConversations();

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={colors.primary} />
        <Text style={styles.loadingText}>Loading conversations...</Text>
      </View>
    );
  }

  if (conversations.length === 0) {
    return (
      <View style={styles.emptyContainer}>
        <Ionicons
          name="chatbubbles-outline"
          size={64}
          color={colors.text.secondary}
        />
        <Text style={styles.emptyTitle}>No Messages Yet</Text>
        <Text style={styles.emptyText}>
          Start a conversation with someone from the community!
        </Text>
      </View>
    );
  }

  return (
    <View style={styles.container}>
      <FlatList
        data={conversations}
        keyExtractor={(item) => item.id}
        renderItem={({ item }) => (
          <ConversationItem
            conversation={item}
            currentUserId={user?.uid || ''}
            onPress={() =>
              navigation.navigate('Chat', {
                conversationId: item.id,
                otherUserId: item.participants.find(
                  (id: string) => id !== user?.uid
                ),
              })
            }
          />
        )}
        ItemSeparatorComponent={() => <View style={styles.separator} />}
      />
    </View>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: '#FAFAF6',
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: '#FAFAF6',
  },
  loadingText: {
    marginTop: spacing.md,
    fontSize: 14,
    color: colors.text.secondary,
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.xl,
    backgroundColor: '#FAFAF6',
  },
  emptyTitle: {
    fontSize: 20,
    fontWeight: '700',
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: 14,
    color: colors.text.secondary,
    textAlign: 'center',
  },
  conversationItem: {
    flexDirection: 'row',
    padding: spacing.md,
    backgroundColor: '#fff',
  },
  avatarContainer: {
    position: 'relative',
    marginRight: spacing.md,
  },
  avatar: {
    width: 56,
    height: 56,
    borderRadius: 28,
  },
  avatarPlaceholder: {
    width: 56,
    height: 56,
    borderRadius: 28,
    backgroundColor: colors.primary,
    justifyContent: 'center',
    alignItems: 'center',
  },
  avatarText: {
    fontSize: 20,
    fontWeight: '700',
    color: '#fff',
  },
  unreadDot: {
    position: 'absolute',
    top: 0,
    right: 0,
    width: 12,
    height: 12,
    borderRadius: 6,
    backgroundColor: colors.secondary.amber,
    borderWidth: 2,
    borderColor: '#fff',
  },
  conversationContent: {
    flex: 1,
    justifyContent: 'center',
  },
  conversationHeader: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 4,
  },
  userName: {
    fontSize: 16,
    fontWeight: '600',
    color: colors.text.primary,
    flex: 1,
  },
  userNameUnread: {
    fontWeight: '700',
  },
  timestamp: {
    fontSize: 12,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  lastMessage: {
    fontSize: 14,
    color: colors.text.secondary,
  },
  lastMessageUnread: {
    fontWeight: '600',
    color: colors.text.primary,
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: spacing.md + 56 + spacing.md,
  },
});

export default ConversationsScreen;

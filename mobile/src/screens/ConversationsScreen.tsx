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
import { FAB, Portal, Modal, Button as PaperButton, Searchbar, Avatar as PaperAvatar } from 'react-native-paper';
import { useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useConversations } from '../hooks/useConversations';
import { useConnections, useStartConversation } from '../hooks';
import { Colors as colors, Spacing as spacing, Typography, Layout } from '../constants';
import { db } from '../config/firebase';
import { doc, getDoc } from 'firebase/firestore';
import { LoadingSpinner, Card } from '../components';

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
  const { connections, getConnectionIds } = useConnections();
  const { startConversation } = useStartConversation();
  const [showNewMessage, setShowNewMessage] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [connectionProfiles, setConnectionProfiles] = useState<any[]>([]);
  const [loadingProfiles, setLoadingProfiles] = useState(false);

  // Load connection profiles when modal opens
  useEffect(() => {
    const loadConnectionProfiles = async () => {
      if (!showNewMessage) return;

      setLoadingProfiles(true);
      try {
        const connectionIds = getConnectionIds();
        const profiles = await Promise.all(
          connectionIds.map(async (id) => {
            const userDoc = await getDoc(doc(db, 'users', id));
            if (userDoc.exists()) {
              return { id: userDoc.id, ...userDoc.data() };
            }
            return null;
          })
        );
        setConnectionProfiles(profiles.filter((p) => p !== null));
      } catch (error) {
        console.error('Error loading connection profiles:', error);
      } finally {
        setLoadingProfiles(false);
      }
    };

    loadConnectionProfiles();
  }, [showNewMessage]);

  const filteredConnections = connectionProfiles.filter((profile) =>
    profile.displayName?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleStartConversation = async (userId: string) => {
    try {
      const conversationId = await startConversation(userId);
      setShowNewMessage(false);
      setSearchQuery('');
      navigation.navigate('Chat', { conversationId, otherUserId: userId });
    } catch (error) {
      console.error('Error starting conversation:', error);
    }
  };

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

      {/* FAB for New Message */}
      <FAB
        icon="message-plus"
        label="New Message"
        style={styles.fab}
        onPress={() => setShowNewMessage(true)}
        color={colors.textOnPrimary}
      />

      {/* New Message Modal */}
      <Portal>
        <Modal
          visible={showNewMessage}
          onDismiss={() => {
            setShowNewMessage(false);
            setSearchQuery('');
          }}
          contentContainerStyle={styles.modalContainer}
        >
          <View style={styles.modal}>
            {/* Modal Header */}
            <View style={styles.modalHeader}>
              <View style={styles.modalHeaderContent}>
                <View style={styles.modalIconContainer}>
                  <Ionicons name="chatbubble-ellipses" size={24} color={colors.evergreenTeal} />
                </View>
                <View style={styles.modalTitleContainer}>
                  <Text style={styles.modalTitle}>New Message</Text>
                  <Text style={styles.modalSubtitle}>Select a connection to message</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowNewMessage(false);
                  setSearchQuery('');
                }}
                style={styles.modalCloseButton}
              >
                <Ionicons name="close" size={24} color={colors.text.secondary} />
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={styles.modalSearchContainer}>
              <Searchbar
                placeholder="Search your connections..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.searchbar}
                iconColor={colors.evergreenTeal}
                autoFocus={true}
              />
              {searchQuery.length > 0 && (
                <Text style={styles.searchResultsCount}>
                  {filteredConnections.length} {filteredConnections.length === 1 ? 'connection' : 'connections'} found
                </Text>
              )}
            </View>

            {/* Connection list */}
            <View style={styles.modalContent}>
              {loadingProfiles ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color={colors.evergreenTeal} />
                  <Text style={styles.loadingText}>Loading connections...</Text>
                </View>
              ) : filteredConnections.length === 0 ? (
                <View style={styles.emptyConnections}>
                  <Ionicons name="people-outline" size={48} color={colors.text.secondary} />
                  <Text style={styles.emptyConnectionsTitle}>
                    {searchQuery
                      ? 'No connections found'
                      : 'No connections yet'}
                  </Text>
                  <Text style={styles.emptyText}>
                    {searchQuery
                      ? `No one matching "${searchQuery}"`
                      : 'Connect with people first to start messaging'}
                  </Text>
                </View>
              ) : (
                <FlatList
                  data={filteredConnections}
                  keyExtractor={(item) => item.id}
                  style={styles.connectionsList}
                  showsVerticalScrollIndicator={true}
                  renderItem={({ item }) => (
                    <TouchableOpacity
                      style={styles.connectionItem}
                      onPress={() => handleStartConversation(item.id)}
                      activeOpacity={0.7}
                    >
                      {item.avatarUrl ? (
                        <Image source={{ uri: item.avatarUrl }} style={styles.connectionAvatar} />
                      ) : (
                        <View style={styles.connectionAvatarPlaceholder}>
                          <Text style={styles.connectionAvatarText}>
                            {item.displayName ? item.displayName[0].toUpperCase() : 'U'}
                          </Text>
                        </View>
                      )}
                      <View style={styles.connectionInfo}>
                        <Text style={styles.connectionName}>{item.displayName || 'User'}</Text>
                        {item.bio && (
                          <Text style={styles.connectionBio} numberOfLines={1}>
                            {item.bio}
                          </Text>
                        )}
                      </View>
                      <Ionicons name="chevron-forward" size={20} color={colors.text.secondary} />
                    </TouchableOpacity>
                  )}
                />
              )}
            </View>

            {/* Footer */}
            <View style={styles.modalFooter}>
              <PaperButton
                mode="outlined"
                onPress={() => {
                  setShowNewMessage(false);
                  setSearchQuery('');
                }}
                style={styles.modalButton}
                labelStyle={styles.modalButtonLabel}
              >
                Cancel
              </PaperButton>
            </View>
          </View>
        </Modal>
      </Portal>
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
    fontSize: Typography.fontSize.sm,
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
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  emptyText: {
    fontSize: Typography.fontSize.sm,
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
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: colors.textOnPrimary,
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
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.text.primary,
    flex: 1,
  },
  userNameUnread: {
    fontWeight: Typography.fontWeight.bold,
  },
  timestamp: {
    fontSize: Typography.fontSize.xs,
    color: colors.text.secondary,
    marginLeft: spacing.sm,
  },
  lastMessage: {
    fontSize: Typography.fontSize.sm,
    color: colors.text.secondary,
  },
  lastMessageUnread: {
    fontWeight: Typography.fontWeight.semibold,
    color: colors.text.primary,
  },
  separator: {
    height: 1,
    backgroundColor: '#F0F0F0',
    marginLeft: spacing.md + 56 + spacing.md,
  },
  fab: {
    position: 'absolute',
    right: spacing.lg,
    bottom: spacing.lg,
    backgroundColor: colors.evergreenTeal,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: spacing.lg,
  },
  modal: {
    backgroundColor: colors.surface,
    borderRadius: Layout.borderRadius.xl,
    width: '100%',
    maxWidth: 400,
    maxHeight: '85%',
    overflow: 'hidden',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.15,
    shadowRadius: 12,
    elevation: 8,
  },
  modalHeader: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    padding: spacing.lg,
    paddingBottom: spacing.md,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  modalHeaderContent: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  modalIconContainer: {
    width: 44,
    height: 44,
    borderRadius: Layout.borderRadius.lg,
    backgroundColor: `${colors.evergreenTeal}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: spacing.md,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    fontSize: Typography.fontSize.xl,
    fontWeight: Typography.fontWeight.bold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  modalSubtitle: {
    fontSize: Typography.fontSize.sm,
    color: colors.text.secondary,
  },
  modalCloseButton: {
    padding: spacing.xs,
    marginLeft: spacing.sm,
    marginTop: -spacing.xs,
  },
  modalSearchContainer: {
    padding: spacing.md,
    paddingTop: spacing.md,
    paddingBottom: spacing.sm,
    backgroundColor: colors.surface,
  },
  searchbar: {
    backgroundColor: colors.background.default,
    elevation: 0,
    borderRadius: Layout.borderRadius.md,
  },
  searchResultsCount: {
    fontSize: Typography.fontSize.xs,
    color: colors.text.secondary,
    marginTop: spacing.xs,
    marginLeft: spacing.xs,
  },
  modalContent: {
    flex: 1,
    minHeight: 200,
    maxHeight: 350,
  },
  modalLoading: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl * 2,
  },
  emptyConnections: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: spacing.xl,
    paddingHorizontal: spacing.lg,
  },
  emptyConnectionsTitle: {
    fontSize: Typography.fontSize.lg,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.text.primary,
    marginTop: spacing.md,
    marginBottom: spacing.xs,
  },
  connectionsList: {
    flex: 1,
    paddingHorizontal: spacing.md,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: spacing.md,
    paddingHorizontal: spacing.sm,
    borderRadius: Layout.borderRadius.md,
    marginBottom: spacing.xs,
    backgroundColor: colors.background.default,
  },
  connectionAvatar: {
    width: 44,
    height: 44,
    borderRadius: Layout.borderRadius.full,
    marginRight: spacing.md,
  },
  connectionAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: spacing.md,
  },
  connectionAvatarText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: colors.textOnPrimary,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: colors.text.primary,
    marginBottom: 2,
  },
  connectionBio: {
    fontSize: Typography.fontSize.sm,
    color: colors.text.secondary,
  },
  modalFooter: {
    padding: spacing.md,
    paddingTop: spacing.sm,
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: colors.borderLight,
    backgroundColor: colors.surface,
  },
  modalButton: {
    borderColor: colors.borderLight,
    borderRadius: Layout.borderRadius.md,
  },
  modalButtonLabel: {
    color: colors.text.secondary,
  },
});

export default ConversationsScreen;

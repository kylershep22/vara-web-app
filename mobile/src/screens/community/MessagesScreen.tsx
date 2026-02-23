/**
 * Messages Screen
 * List of DM conversations with new message functionality
 */

import React, { useState, useEffect } from 'react';
import { View, StyleSheet, FlatList, TouchableOpacity, Image, ActivityIndicator } from 'react-native';
import { Text, Avatar, FAB, Portal, Modal, Searchbar, Button as PaperButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { useNavigation } from '@react-navigation/native';
import { Card, LoadingSpinner } from '../../components';
import { Colors, Spacing, Typography, Layout } from '../../constants';
import { useConversations, useConnections, useStartConversation } from '../../hooks';
import { MaterialCommunityIcons as Icon } from '@expo/vector-icons';
import { db } from '../../config/firebase';
import { doc, getDoc } from 'firebase/firestore';

const MessagesScreen: React.FC = () => {
  const navigation = useNavigation<any>();
  const { conversations, loading, markAsRead } = useConversations();
  const { connections, getConnectionIds } = useConnections();
  const { startConversation } = useStartConversation();

  // New message modal state
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

  // Filter connections based on search query
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
    try {
      await markAsRead(conversationId);
      navigation.navigate('Chat', { conversationId, otherUserId: userId });
    } catch (error) {
      console.error('Error opening conversation:', error);
    }
  };

  return (
    <SafeAreaView style={styles.container} edges={['top']}>
      <View style={styles.header}>
        <View style={styles.headerRow}>
          <TouchableOpacity onPress={() => navigation.goBack()} style={styles.backButton}>
            <Icon name="chevron-left" size={24} color={Colors.evergreenTeal} />
          </TouchableOpacity>
          <View>
            <Text variant="headlineMedium" style={styles.screenTitle}>
              Messages
            </Text>
            <Text variant="bodyMedium" style={styles.subtitle}>
              Your conversations
            </Text>
          </View>
        </View>
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

      {/* FAB for New Message */}
      <FAB
        icon="message-plus"
        label="New"
        style={styles.fab}
        onPress={() => setShowNewMessage(true)}
        color={Colors.textOnPrimary}
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
                  <Icon name="message-plus" size={24} color={Colors.evergreenTeal} />
                </View>
                <View style={styles.modalTitleContainer}>
                  <Text variant="titleLarge" style={styles.modalTitle}>New Message</Text>
                  <Text variant="bodySmall" style={styles.modalSubtitle}>Choose a connection to message</Text>
                </View>
              </View>
              <TouchableOpacity
                onPress={() => {
                  setShowNewMessage(false);
                  setSearchQuery('');
                }}
                style={styles.modalCloseButton}
              >
                <Icon name="close" size={24} color={Colors.textSecondary} />
              </TouchableOpacity>
            </View>

            {/* Search bar */}
            <View style={styles.modalSearchContainer}>
              <Searchbar
                placeholder="Search your connections..."
                onChangeText={setSearchQuery}
                value={searchQuery}
                style={styles.modalSearchbar}
                iconColor={Colors.evergreenTeal}
                autoFocus={true}
              />
              {searchQuery.length > 0 && (
                <Text variant="bodySmall" style={styles.searchResultsCount}>
                  {filteredConnections.length} {filteredConnections.length === 1 ? 'connection' : 'connections'} found
                </Text>
              )}
            </View>

            {/* Connection list */}
            <View style={styles.modalContent}>
              {loadingProfiles ? (
                <View style={styles.modalLoading}>
                  <ActivityIndicator size="large" color={Colors.evergreenTeal} />
                  <Text variant="bodyMedium" style={styles.loadingProfilesText}>
                    Loading connections...
                  </Text>
                </View>
              ) : filteredConnections.length === 0 ? (
                <View style={styles.emptyConnections}>
                  <Icon name="account-group" size={48} color={Colors.textSecondary} />
                  <Text variant="titleMedium" style={styles.emptyConnectionsTitle}>
                    {searchQuery
                      ? 'No connections found'
                      : 'No connections yet'}
                  </Text>
                  <Text variant="bodyMedium" style={styles.emptyConnectionsText}>
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
                        <Text variant="titleMedium" style={styles.connectionName}>
                          {item.displayName || 'User'}
                        </Text>
                        {item.bio && (
                          <Text variant="bodySmall" style={styles.connectionBio} numberOfLines={1}>
                            {item.bio}
                          </Text>
                        )}
                      </View>
                      <Icon name="chevron-right" size={20} color={Colors.textSecondary} />
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
              >
                Cancel
              </PaperButton>
            </View>
          </View>
        </Modal>
      </Portal>
    </SafeAreaView>
  );
};

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  header: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.base,
  },
  headerRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  backButton: {
    padding: Spacing.xs,
  },
  screenTitle: {
    color: Colors.evergreenTeal,
    fontWeight: Typography.fontWeight.bold,
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
    paddingVertical: Spacing.base,
    backgroundColor: Colors.surface,
  },
  avatar: {
    backgroundColor: Colors.evergreenTeal,
    marginRight: Spacing.base,
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
    fontWeight: Typography.fontWeight.semibold,
  },
  time: {
    color: Colors.textSecondary,
  },
  lastMessage: {
    color: Colors.textSecondary,
  },
  unreadMessage: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
  },
  unreadBadge: {
    backgroundColor: Colors.evergreenTeal,
    borderRadius: Layout.borderRadius.full,
    minWidth: 24,
    height: 24,
    alignItems: 'center',
    justifyContent: 'center',
    paddingHorizontal: Spacing.xs,
    marginLeft: Spacing.sm,
  },
  unreadText: {
    color: Colors.textOnPrimary,
    fontWeight: Typography.fontWeight.semibold,
    fontSize: Typography.fontSize.xs,
  },
  separator: {
    height: Layout.borderWidth.thin,
    backgroundColor: Colors.borderLight,
    marginLeft: Spacing.lg + 50 + Spacing.base, // Align with text
  },
  emptyContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
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
  },
  // FAB and Modal styles
  fab: {
    position: 'absolute',
    right: Spacing.lg,
    bottom: Spacing.lg,
    backgroundColor: Colors.evergreenTeal,
  },
  modalContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.lg,
  },
  modal: {
    backgroundColor: Colors.surface,
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
    padding: Spacing.lg,
    paddingBottom: Spacing.base,
    borderBottomWidth: Layout.borderWidth.thin,
    borderBottomColor: Colors.borderLight,
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
    backgroundColor: `${Colors.evergreenTeal}15`,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.base,
  },
  modalTitleContainer: {
    flex: 1,
  },
  modalTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
    marginBottom: 2,
  },
  modalSubtitle: {
    color: Colors.textSecondary,
  },
  modalCloseButton: {
    padding: Spacing.xs,
    marginLeft: Spacing.sm,
    marginTop: -Spacing.xs,
  },
  modalSearchContainer: {
    padding: Spacing.base,
    paddingTop: Spacing.base,
    paddingBottom: Spacing.sm,
  },
  modalSearchbar: {
    backgroundColor: Colors.background.default,
    elevation: 0,
    borderRadius: Layout.borderRadius.md,
  },
  searchResultsCount: {
    color: Colors.textSecondary,
    marginTop: Spacing.xs,
    marginLeft: Spacing.xs,
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
    paddingVertical: Spacing.xl * 2,
  },
  loadingProfilesText: {
    color: Colors.textSecondary,
    marginTop: Spacing.base,
  },
  emptyConnections: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    paddingVertical: Spacing.xl,
    paddingHorizontal: Spacing.lg,
  },
  emptyConnectionsTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    marginTop: Spacing.base,
    marginBottom: Spacing.xs,
  },
  emptyConnectionsText: {
    color: Colors.textSecondary,
    textAlign: 'center',
  },
  connectionsList: {
    flex: 1,
    paddingHorizontal: Spacing.base,
  },
  connectionItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.base,
    paddingHorizontal: Spacing.sm,
    borderRadius: Layout.borderRadius.md,
    marginBottom: Spacing.xs,
    backgroundColor: Colors.background.default,
  },
  connectionAvatar: {
    width: 44,
    height: 44,
    borderRadius: Layout.borderRadius.full,
    marginRight: Spacing.base,
  },
  connectionAvatarPlaceholder: {
    width: 44,
    height: 44,
    borderRadius: Layout.borderRadius.full,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
    marginRight: Spacing.base,
  },
  connectionAvatarText: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textOnPrimary,
  },
  connectionInfo: {
    flex: 1,
  },
  connectionName: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.semibold,
    marginBottom: 2,
  },
  connectionBio: {
    color: Colors.textSecondary,
  },
  modalFooter: {
    padding: Spacing.base,
    paddingTop: Spacing.sm,
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: Colors.borderLight,
  },
  modalButton: {
    borderColor: Colors.borderLight,
    borderRadius: Layout.borderRadius.md,
  },
});

export default MessagesScreen;

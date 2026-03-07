// mobile/src/screens/ChatScreen.tsx
import React, { useState, useEffect, useMemo, useCallback } from 'react';
import {
  View,
  Text,
  FlatList,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  StyleSheet,
  Image,
  ActivityIndicator,
  Keyboard,
  InputAccessoryView,
} from 'react-native';
import { Ionicons } from '@expo/vector-icons';
import { useRoute, useNavigation } from '@react-navigation/native';
import { useAuth } from '../context/AuthContext';
import { useConversation } from '../hooks/useConversations';
import { Colors, Spacing, Typography, Layout } from '../constants';
import { db } from '../config/firebase';
import { doc, getDoc, updateDoc, serverTimestamp } from 'firebase/firestore';
import { MessageBubble, DateDivider, MessagingEmptyState } from '../components/messaging';
import type { DirectMessage } from '../services/firebase';

const INPUT_ACCESSORY_VIEW_ID = 'chatInputAccessory';

/** Check if two timestamps are on different calendar days */
const isDifferentDay = (a: any, b: any): boolean => {
  const dateA = a?.toDate ? a.toDate() : new Date(a);
  const dateB = b?.toDate ? b.toDate() : new Date(b);
  return (
    dateA.getFullYear() !== dateB.getFullYear() ||
    dateA.getMonth() !== dateB.getMonth() ||
    dateA.getDate() !== dateB.getDate()
  );
};

/** Check if two timestamps are within N minutes of each other */
const isWithinMinutes = (a: any, b: any, mins: number): boolean => {
  if (!a || !b) return false;
  const dateA = a?.toDate ? a.toDate() : new Date(a);
  const dateB = b?.toDate ? b.toDate() : new Date(b);
  return Math.abs(dateA.getTime() - dateB.getTime()) < mins * 60 * 1000;
};

type ListItem =
  | { type: 'message'; data: DirectMessage; isFirstInGroup: boolean; isLastInGroup: boolean }
  | { type: 'dateDivider'; date: Date; id: string };

const ChatScreen = () => {
  const { user } = useAuth();
  const route = useRoute<any>();
  const navigation = useNavigation<any>();
  const { conversationId, otherUserId } = route.params;

  const { messages, loading, sending, sendMessage } = useConversation(conversationId);
  const [newMessage, setNewMessage] = useState('');
  const [otherUser, setOtherUser] = useState<any>(null);

  useEffect(() => {
    loadOtherUser();
  }, [otherUserId]);

  // Set header title with other user's name
  useEffect(() => {
    if (otherUser?.displayName) {
      navigation.setOptions({
        headerTitle: () => (
          <TouchableOpacity
            onPress={() => navigation.navigate('UserProfile', { userId: otherUserId })}
            style={styles.headerTitleContainer}
            activeOpacity={0.7}
            accessibilityRole="button"
            accessibilityLabel={`View ${otherUser.displayName}'s profile`}
          >
            {otherUser.avatarUrl ? (
              <Image source={{ uri: otherUser.avatarUrl }} style={styles.headerAvatar} />
            ) : (
              <View style={styles.headerAvatarPlaceholder}>
                <Text style={styles.headerAvatarText}>
                  {otherUser.displayName[0]?.toUpperCase() || 'U'}
                </Text>
              </View>
            )}
            <Text style={styles.headerName} numberOfLines={1}>
              {otherUser.displayName}
            </Text>
          </TouchableOpacity>
        ),
      });
    }
  }, [otherUser, navigation]);

  // Mark as read when opening and when messages update
  useEffect(() => {
    if (user && conversationId && messages.length > 0) {
      markAsRead();
    }
  }, [conversationId, messages.length]);

  const loadOtherUser = async () => {
    if (!otherUserId) return;
    try {
      const userDoc = await getDoc(doc(db, 'users', otherUserId));
      if (userDoc.exists()) {
        setOtherUser({ id: userDoc.id, ...userDoc.data() });
      }
    } catch (error) {
      console.error('Error loading other user:', error);
    }
  };

  const markAsRead = async () => {
    if (!user || !conversationId) return;
    try {
      const convRef = doc(db, 'conversations', conversationId);
      await updateDoc(convRef, {
        [`lastReadBy.${user.uid}`]: serverTimestamp(),
        [`unreadCount.${user.uid}`]: 0,
      });
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  // Build list items with grouping and date dividers
  // Messages come in ASC order from the hook; we reverse for inverted FlatList
  const listItems: ListItem[] = useMemo(() => {
    if (messages.length === 0) return [];

    const items: ListItem[] = [];

    for (let i = 0; i < messages.length; i++) {
      const msg = messages[i];
      const prevMsg = i > 0 ? messages[i - 1] : null;
      const nextMsg = i < messages.length - 1 ? messages[i + 1] : null;

      // Insert date divider if this message is on a different day than the previous
      if (!prevMsg || (msg.createdAt && prevMsg.createdAt && isDifferentDay(prevMsg.createdAt, msg.createdAt))) {
        const date = msg.createdAt?.toDate ? msg.createdAt.toDate() : new Date(msg.createdAt || Date.now());
        items.push({
          type: 'dateDivider',
          date,
          id: `date-${date.toISOString().split('T')[0]}-${i}`,
        });
      }

      // Determine grouping
      const sameSenderAsPrev =
        prevMsg &&
        prevMsg.senderId === msg.senderId &&
        msg.createdAt && prevMsg.createdAt &&
        !isDifferentDay(prevMsg.createdAt, msg.createdAt) &&
        isWithinMinutes(prevMsg.createdAt, msg.createdAt, 2);

      const sameSenderAsNext =
        nextMsg &&
        nextMsg.senderId === msg.senderId &&
        msg.createdAt && nextMsg.createdAt &&
        !isDifferentDay(msg.createdAt, nextMsg.createdAt) &&
        isWithinMinutes(msg.createdAt, nextMsg.createdAt, 2);

      items.push({
        type: 'message',
        data: msg,
        isFirstInGroup: !sameSenderAsPrev,
        isLastInGroup: !sameSenderAsNext,
      });
    }

    // Reverse for inverted FlatList (newest first in data, rendered at bottom)
    return items.reverse();
  }, [messages]);

  const handleSend = useCallback(async () => {
    if (!newMessage.trim() || !user || !conversationId) return;

    const messageText = newMessage.trim();
    setNewMessage('');

    try {
      await sendMessage(messageText, otherUserId);
    } catch (error) {
      console.error('Error sending message:', error);
      // Restore message on failure
      setNewMessage(messageText);
    }
  }, [newMessage, user, conversationId, otherUserId, sendMessage]);

  const renderItem = useCallback(
    ({ item }: { item: ListItem }) => {
      if (item.type === 'dateDivider') {
        return <DateDivider date={item.date} />;
      }

      return (
        <MessageBubble
          text={item.data.text}
          timestamp={item.data.createdAt}
          isMine={item.data.senderId === user?.uid}
          senderAvatarUrl={item.data.senderId !== user?.uid ? otherUser?.avatarUrl : undefined}
          isFirstInGroup={item.isFirstInGroup}
          isLastInGroup={item.isLastInGroup}
        />
      );
    },
    [user?.uid, otherUser?.avatarUrl]
  );

  const keyExtractor = useCallback((item: ListItem) => {
    if (item.type === 'dateDivider') return item.id;
    return item.data.id;
  }, []);

  if (loading) {
    return (
      <View style={styles.loadingContainer}>
        <ActivityIndicator size="large" color={Colors.primary} />
        <Text style={styles.loadingText}>Loading messages...</Text>
      </View>
    );
  }

  const isSendDisabled = !newMessage.trim() || sending;

  return (
    <KeyboardAvoidingView
      style={styles.container}
      behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
    >
      <FlatList
        data={listItems}
        keyExtractor={keyExtractor}
        renderItem={renderItem}
        inverted
        contentContainerStyle={styles.messagesList}
        ListEmptyComponent={
          <View style={styles.emptyWrapper}>
            <MessagingEmptyState
              icon="chatbubble-ellipses-outline"
              title="Start the Conversation"
              subtitle={`Say hello to ${otherUser?.displayName || 'this user'}!`}
            />
          </View>
        }
      />

      {/* Input Bar */}
      <View style={styles.inputContainer}>
        <TextInput
          style={styles.input}
          value={newMessage}
          onChangeText={setNewMessage}
          placeholder="Type a message..."
          placeholderTextColor={Colors.text.secondary}
          multiline
          maxLength={1000}
          inputAccessoryViewID={INPUT_ACCESSORY_VIEW_ID}
          blurOnSubmit={false}
        />
        <TouchableOpacity
          style={[styles.sendButton, isSendDisabled && styles.sendButtonDisabled]}
          onPress={handleSend}
          disabled={isSendDisabled}
          accessibilityRole="button"
          accessibilityLabel="Send message"
        >
          {sending ? (
            <ActivityIndicator size="small" color={Colors.textOnPrimary} />
          ) : (
            <Ionicons name="send" size={18} color={Colors.textOnPrimary} />
          )}
        </TouchableOpacity>
      </View>

      {/* Keyboard Accessory Toolbar (iOS) */}
      {Platform.OS === 'ios' && (
        <InputAccessoryView nativeID={INPUT_ACCESSORY_VIEW_ID}>
          <View style={styles.keyboardAccessory}>
            <TouchableOpacity
              onPress={() => Keyboard.dismiss()}
              style={styles.keyboardAccessoryButton}
              accessibilityRole="button"
              accessibilityLabel="Dismiss keyboard"
            >
              <Text style={styles.keyboardAccessoryButtonText}>Done</Text>
            </TouchableOpacity>
          </View>
        </InputAccessoryView>
      )}
    </KeyboardAvoidingView>
  );
};

const HEADER_AVATAR_SIZE = 30;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background.default,
  },
  loadingContainer: {
    flex: 1,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: Colors.background.default,
  },
  loadingText: {
    marginTop: Spacing.md,
    fontSize: Typography.fontSize.sm,
    color: Colors.text.secondary,
  },
  // Header
  headerTitleContainer: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  headerAvatar: {
    width: HEADER_AVATAR_SIZE,
    height: HEADER_AVATAR_SIZE,
    borderRadius: HEADER_AVATAR_SIZE / 2,
  },
  headerAvatarPlaceholder: {
    width: HEADER_AVATAR_SIZE,
    height: HEADER_AVATAR_SIZE,
    borderRadius: HEADER_AVATAR_SIZE / 2,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  headerAvatarText: {
    fontSize: Typography.fontSize.xs,
    fontWeight: Typography.fontWeight.bold,
    color: Colors.textOnPrimary,
  },
  headerName: {
    fontSize: Typography.fontSize.base,
    fontWeight: Typography.fontWeight.semibold,
    color: Colors.text.primary,
    maxWidth: 200,
  },
  // Messages
  messagesList: {
    paddingVertical: Spacing.sm,
    flexGrow: 1,
  },
  emptyWrapper: {
    flex: 1,
    // Inverted FlatList: empty component renders upside down, so flip it
    transform: [{ scaleY: -1 }],
  },
  // Input
  inputContainer: {
    flexDirection: 'row',
    padding: Spacing.md,
    backgroundColor: Colors.surface,
    borderTopWidth: Layout.borderWidth.thin,
    borderTopColor: Colors.borderLight,
    alignItems: 'flex-end',
  },
  input: {
    flex: 1,
    backgroundColor: Colors.background.default,
    borderRadius: Layout.borderRadius['2xl'],
    paddingHorizontal: Spacing.base,
    paddingVertical: Platform.OS === 'ios' ? Spacing.sm : Spacing.xs,
    marginRight: Spacing.sm,
    maxHeight: 100,
    fontSize: Typography.fontSize.base,
    color: Colors.text.primary,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.evergreenTeal,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonDisabled: {
    opacity: 0.4,
  },
  // Keyboard Accessory
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

export default ChatScreen;

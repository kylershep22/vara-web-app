/**
 * useConversations Hook
 * Hook for managing DM conversations
 */

import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  Conversation,
  DirectMessage,
  UserProfile,
  subscribeToConversations,
  subscribeToMessages,
  sendDirectMessage,
  markConversationAsRead,
  createOrGetConversation,
  getUserById,
} from '../services/firebase';

export interface ConversationWithUser extends Conversation {
  otherUser?: UserProfile;
  unreadCount: number;
}

export const useConversations = () => {
  const { user } = useAuth();
  const [conversations, setConversations] = useState<ConversationWithUser[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<Error | null>(null);

  useEffect(() => {
    if (!user) {
      setConversations([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Subscribe to real-time conversations
    const unsubscribe = subscribeToConversations(user.uid, async (convos) => {
      try {
        // Enrich conversations with other user's profile
        const enrichedConvos = await Promise.all(
          convos.map(async (convo) => {
            const otherUserId = convo.participants.find((id) => id !== user.uid);
            const otherUser = otherUserId
              ? await getUserById(otherUserId)
              : null;

            return {
              ...convo,
              otherUser: otherUser || undefined,
              unreadCount: convo.unreadCount?.[user.uid] || 0,
            };
          })
        );

        setConversations(enrichedConvos);
        setError(null);
      } catch (err) {
        console.error('Error enriching conversations:', err);
        setError(err as Error);
      } finally {
        setLoading(false);
      }
    });

    return () => unsubscribe();
  }, [user]);

  const handleMarkAsRead = async (conversationId: string) => {
    if (!user) return;

    try {
      await markConversationAsRead(conversationId, user.uid);
    } catch (err) {
      console.error('Error marking conversation as read:', err);
      throw err;
    }
  };

  const getTotalUnreadCount = (): number => {
    return conversations.reduce((sum, convo) => sum + convo.unreadCount, 0);
  };

  return {
    conversations,
    loading,
    error,
    markAsRead: handleMarkAsRead,
    getTotalUnreadCount,
  };
};

/**
 * Hook for managing a single conversation
 */
export const useConversation = (conversationId?: string) => {
  const { user } = useAuth();
  const [messages, setMessages] = useState<DirectMessage[]>([]);
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);

  useEffect(() => {
    if (!conversationId || !user) {
      setMessages([]);
      setLoading(false);
      return;
    }

    setLoading(true);

    // Subscribe to real-time messages
    const unsubscribe = subscribeToMessages(conversationId, (msgs) => {
      setMessages(msgs);
      setLoading(false);
    });

    return () => unsubscribe();
  }, [conversationId, user]);

  const handleSendMessage = async (text: string, receiverId: string) => {
    if (!user || !conversationId || !text.trim()) return;

    setSending(true);

    try {
      await sendDirectMessage(conversationId, user.uid, receiverId, text);
    } catch (err) {
      console.error('Error sending message:', err);
      throw err;
    } finally {
      setSending(false);
    }
  };

  return {
    messages,
    loading,
    sending,
    sendMessage: handleSendMessage,
  };
};

/**
 * Hook for starting a new conversation
 */
export const useStartConversation = () => {
  const { user } = useAuth();
  const [loading, setLoading] = useState(false);

  const startConversation = async (otherUserId: string): Promise<string> => {
    if (!user) throw new Error('User not authenticated');

    setLoading(true);

    try {
      const conversationId = await createOrGetConversation(user.uid, otherUserId);
      return conversationId;
    } catch (err) {
      console.error('Error starting conversation:', err);
      throw err;
    } finally {
      setLoading(false);
    }
  };

  return {
    loading,
    startConversation,
  };
};

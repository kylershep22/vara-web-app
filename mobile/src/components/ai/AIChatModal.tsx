/**
 * AI Chat Modal Component
 * Full-screen chat interface for AI wellness coach
 */

import React, { useState, useRef, useEffect } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  ActivityIndicator,
} from 'react-native';
import { Text, TextInput, IconButton } from 'react-native-paper';
import { SafeAreaView } from 'react-native-safe-area-context';
import { Colors, Spacing, Layout, Typography } from '../../constants';
import { chatWithAI } from '../../services/api/ai.service';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

interface Message {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: Date;
}

interface AIChatModalProps {
  visible: boolean;
  onClose: () => void;
  initialContext?: any;
}

export function AIChatModal({ visible, onClose, initialContext }: AIChatModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: 'Hi! I\'m Vara, your AI wellness coach. How can I support you today?',
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const flatListRef = useRef<FlatList>(null);

  // Fetch brain metrics for AI context
  const fetchBrainMetrics = async () => {
    if (!user) return undefined;

    try {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

      // Fetch today's metrics
      const metricsQuery = query(
        collection(db, 'brainMetrics'),
        where('userId', '==', user.uid),
        where('date', '==', today),
        limit(1)
      );
      const metricsSnapshot = await getDocs(metricsQuery);
      const todayMetrics = metricsSnapshot.docs[0]?.data();

      // Fetch recent neuroplasticity signals
      const neuroplasticityQuery = query(
        collection(db, 'neuroplasticitySignals'),
        where('userId', '==', user.uid),
        where('date', '>=', sevenDaysAgo)
      );
      const neuroplasticitySnapshot = await getDocs(neuroplasticityQuery);

      // Fetch AMCC streak
      const amccQuery = query(
        collection(db, 'amccChallenges'),
        where('userId', '==', user.uid),
        where('completed', '==', true),
        orderBy('date', 'desc')
      );
      const amccSnapshot = await getDocs(amccQuery);
      const amccDates = amccSnapshot.docs.map(doc => doc.data().date).filter(Boolean);

      // Calculate streak
      const calculateStreak = (dates: string[]): number => {
        if (dates.length === 0) return 0;
        const sorted = dates.sort().reverse();
        const today = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (sorted[0] !== today && sorted[0] !== yesterday) return 0;
        let streak = 0;
        let expectedDate = new Date(sorted[0]);
        for (const date of sorted) {
          if (date === expectedDate.toISOString().split('T')[0]) {
            streak++;
            expectedDate.setDate(expectedDate.getDate() - 1);
          } else {
            break;
          }
        }
        return streak;
      };

      // Fetch nervous system tool uses
      const nervousSystemQuery = query(
        collection(db, 'nervousSystemSessions'),
        where('userId', '==', user.uid),
        orderBy('completedAt', 'desc')
      );
      const nervousSystemSnapshot = await getDocs(nervousSystemQuery);
      const nervousSystemToolUses = nervousSystemSnapshot.docs.filter(doc => {
        const completedAt = doc.data().completedAt?.seconds || 0;
        const sevenDaysAgoTimestamp = Date.now() / 1000 - (7 * 86400);
        return completedAt >= sevenDaysAgoTimestamp;
      }).length;

      return {
        readinessScore: todayMetrics?.readinessScore || 0,
        neuroplasticityCount: neuroplasticitySnapshot.size,
        amccStreak: calculateStreak(amccDates),
        nervousSystemToolUses,
        lastCheckIn: todayMetrics?.date || 'Never',
      };
    } catch (error) {
      console.error('Error fetching brain metrics:', error);
      return undefined;
    }
  };

  // Scroll to bottom when new messages arrive
  useEffect(() => {
    if (messages.length > 0) {
      setTimeout(() => {
        flatListRef.current?.scrollToEnd({ animated: true });
      }, 100);
    }
  }, [messages]);

  const handleSend = async () => {
    if (!inputText.trim() || isLoading) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: inputText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      // Build message history for API
      const messageHistory = [...messages, userMessage].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      // Fetch brain metrics
      const brainMetrics = await fetchBrainMetrics();

      // Build enhanced context with brain metrics
      const enhancedContext = {
        ...initialContext,
        brainMetrics,
      };

      // Call AI service
      const response = await chatWithAI(messageHistory, enhancedContext);

      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: response,
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, assistantMessage]);
    } catch (error) {
      console.error('Error getting AI response:', error);

      const errorMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const renderMessage = ({ item }: { item: Message }) => {
    const isUser = item.role === 'user';

    return (
      <View
        style={[
          styles.messageBubble,
          isUser ? styles.userMessage : styles.assistantMessage,
        ]}
      >
        <Text
          variant="bodyMedium"
          style={[
            styles.messageText,
            isUser ? styles.userMessageText : styles.assistantMessageText,
          ]}
        >
          {item.content}
        </Text>
        <Text
          variant="labelSmall"
          style={[
            styles.timestamp,
            isUser ? styles.userTimestamp : styles.assistantTimestamp,
          ]}
        >
          {item.timestamp.toLocaleTimeString([], {
            hour: '2-digit',
            minute: '2-digit',
          })}
        </Text>
      </View>
    );
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={onClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerLeft}>
            <View style={styles.aiIconContainer}>
              <Text style={styles.aiIcon}>🤖</Text>
            </View>
            <View>
              <Text variant="titleLarge" style={styles.headerTitle}>
                AI Wellness Coach
              </Text>
              <Text variant="bodySmall" style={styles.headerSubtitle}>
                Powered by Vara
              </Text>
            </View>
          </View>
          <IconButton
            icon="close"
            size={24}
            iconColor={Colors.textPrimary}
            onPress={onClose}
          />
        </View>

        {/* Messages */}
        <KeyboardAvoidingView
          style={styles.chatContainer}
          behavior={Platform.OS === 'ios' ? 'padding' : undefined}
          keyboardVerticalOffset={Platform.OS === 'ios' ? 90 : 0}
        >
          <FlatList
            ref={flatListRef}
            data={messages}
            renderItem={renderMessage}
            keyExtractor={(item) => item.id}
            contentContainerStyle={styles.messagesList}
            showsVerticalScrollIndicator={false}
          />

          {/* Typing Indicator */}
          {isLoading && (
            <View style={styles.typingIndicator}>
              <ActivityIndicator size="small" color={Colors.evergreenTeal} />
              <Text variant="bodySmall" style={styles.typingText}>
                Vara is typing...
              </Text>
            </View>
          )}

          {/* Input Bar */}
          <View style={styles.inputContainer}>
            <TextInput
              mode="outlined"
              placeholder="Ask me anything about wellness..."
              value={inputText}
              onChangeText={setInputText}
              multiline
              maxLength={500}
              style={styles.input}
              outlineColor={Colors.borderLight}
              activeOutlineColor={Colors.evergreenTeal}
              onSubmitEditing={handleSend}
            />
            <TouchableOpacity
              onPress={handleSend}
              style={[
                styles.sendButton,
                (!inputText.trim() || isLoading) && styles.sendButtonDisabled,
              ]}
              disabled={!inputText.trim() || isLoading}
            >
              <IconButton
                icon="send"
                size={24}
                iconColor={inputText.trim() && !isLoading ? Colors.white : Colors.textDisabled}
              />
            </TouchableOpacity>
          </View>
        </KeyboardAvoidingView>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.background,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderBottomWidth: 1,
    borderBottomColor: Colors.borderLight,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  aiIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    backgroundColor: Colors.evergreenTeal + '20',
    justifyContent: 'center',
    alignItems: 'center',
  },
  aiIcon: {
    fontSize: 28,
  },
  headerTitle: {
    color: Colors.textPrimary,
    fontWeight: Typography.fontWeight.bold,
  },
  headerSubtitle: {
    color: Colors.textSecondary,
  },
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    flexGrow: 1,
  },
  messageBubble: {
    maxWidth: '80%',
    padding: Spacing.md,
    borderRadius: Layout.borderRadius.lg,
    marginBottom: Spacing.sm,
  },
  userMessage: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.evergreenTeal,
    borderBottomRightRadius: 4,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.surface,
    borderBottomLeftRadius: 4,
    ...Layout.shadow.sm,
  },
  messageText: {
    marginBottom: 4,
  },
  userMessageText: {
    color: Colors.white,
  },
  assistantMessageText: {
    color: Colors.textPrimary,
  },
  timestamp: {
    fontSize: Typography.fontSize.xs,
  },
  userTimestamp: {
    color: Colors.white + 'CC',
    alignSelf: 'flex-end',
  },
  assistantTimestamp: {
    color: Colors.textSecondary,
    alignSelf: 'flex-start',
  },
  typingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    gap: Spacing.sm,
  },
  typingText: {
    color: Colors.textSecondary,
    fontStyle: 'italic',
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    backgroundColor: Colors.surface,
    borderTopWidth: 1,
    borderTopColor: Colors.borderLight,
    gap: Spacing.sm,
  },
  input: {
    flex: 1,
    maxHeight: 100,
    backgroundColor: Colors.background,
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
    backgroundColor: Colors.borderLight,
  },
});

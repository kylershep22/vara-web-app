/**
 * AI Chat Modal Component
 * Full-screen chat interface for Vara AI wellness coach
 * Redesigned with Vara brand: calm, grounded, brain-health centered
 */

import React, { useState, useRef, useEffect, useCallback } from 'react';
import {
  View,
  StyleSheet,
  Modal,
  FlatList,
  KeyboardAvoidingView,
  Platform,
  TouchableOpacity,
  TextInput,
  ScrollView,
  Animated,
  Easing,
  Text,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';
import Svg, { Path } from 'react-native-svg';
import { LinearGradient } from 'expo-linear-gradient';
import { Ionicons } from '@expo/vector-icons';
import * as Haptics from 'expo-haptics';
import { chatWithAI } from '../../services/api/ai.service';
import { useAuth } from '../../context/AuthContext';
import { db } from '../../config/firebase';
import { collection, query, where, getDocs, orderBy, limit } from 'firebase/firestore';

// Brand Colors
const EVERGREEN_TEAL = '#1B5E57';
const MIST_WHITE = '#FAFAF6';
const SILVER_SAGE = '#B8CDBA';
const DEW_SAGE = '#D5E3D1';
const SOFT_CHARCOAL = '#3E3E3E';
const MUTED_SAGE_GRAY = '#6F7F77';
const BORDER_COLOR = '#e4ebe4';
const TIMESTAMP_COLOR = '#a0b0a0';
const ONLINE_GREEN = '#5CB85C';

// Quick prompt suggestions
const QUICK_PROMPTS = [
  'Help me focus',
  'I need a reset',
  'Build a routine',
  'Feeling overwhelmed',
];

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

// Abstract Ribbon V Icon for header avatar
const VaraIcon = ({ size = 28, color = EVERGREEN_TEAL }: { size?: number; color?: string }) => (
  <Svg width={size} height={size} viewBox="0 0 100 100" fill="none">
    <Path
      d="M20 20 Q35 50 50 80 Q65 50 80 20"
      stroke={color}
      strokeWidth={11}
      strokeLinecap="round"
      strokeLinejoin="round"
      fill="none"
    />
  </Svg>
);

// Typing indicator with animated dots
const TypingIndicator = () => {
  const animatedValue = useRef(new Animated.Value(0)).current;

  useEffect(() => {
    const animation = Animated.loop(
      Animated.timing(animatedValue, {
        toValue: 1,
        duration: 1200,
        easing: Easing.linear,
        useNativeDriver: true,
      })
    );
    animation.start();

    return () => {
      animation.stop();
      animatedValue.setValue(0);
    };
  }, [animatedValue]);

  // Create staggered opacity for each dot
  const getDotStyle = (dotIndex: number) => {
    const inputRange = [0, 0.25, 0.5, 0.75, 1];
    const baseOpacity = 0.3;
    const peakOpacity = 1;

    // Stagger the peak for each dot
    const outputRange = (() => {
      switch (dotIndex) {
        case 0:
          return [peakOpacity, baseOpacity, baseOpacity, baseOpacity, peakOpacity];
        case 1:
          return [baseOpacity, peakOpacity, baseOpacity, baseOpacity, baseOpacity];
        case 2:
          return [baseOpacity, baseOpacity, peakOpacity, baseOpacity, baseOpacity];
        default:
          return [baseOpacity, baseOpacity, baseOpacity, baseOpacity, baseOpacity];
      }
    })();

    return {
      opacity: animatedValue.interpolate({
        inputRange,
        outputRange,
      }),
      transform: [
        {
          scale: animatedValue.interpolate({
            inputRange,
            outputRange: outputRange.map((o) => (o === peakOpacity ? 1.1 : 0.85)),
          }),
        },
      ],
    };
  };

  return (
    <View style={styles.typingContainer}>
      <View style={styles.typingDotsRow}>
        <Animated.View style={[styles.typingDot, getDotStyle(0)]} />
        <Animated.View style={[styles.typingDot, getDotStyle(1)]} />
        <Animated.View style={[styles.typingDot, getDotStyle(2)]} />
      </View>
    </View>
  );
};

// Message bubble component with entry animation
const MessageBubble = ({ message, index }: { message: Message; index: number }) => {
  const isUser = message.role === 'user';
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const translateY = useRef(new Animated.Value(6)).current;

  useEffect(() => {
    const animation = Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 250,
        delay: 50,
        useNativeDriver: true,
      }),
      Animated.timing(translateY, {
        toValue: 0,
        duration: 250,
        delay: 50,
        useNativeDriver: true,
      }),
    ]);

    animation.start();

    return () => {
      animation.stop();
    };
  }, [fadeAnim, translateY]);

  return (
    <Animated.View
      style={[
        styles.messageBubble,
        isUser ? styles.userMessage : styles.assistantMessage,
        {
          opacity: fadeAnim,
          transform: [{ translateY }],
        },
      ]}
    >
      <Text style={[styles.messageText, isUser ? styles.userMessageText : styles.assistantMessageText]}>
        {message.content}
      </Text>
      <Text style={[styles.timestamp, isUser ? styles.userTimestamp : styles.assistantTimestamp]}>
        {message.timestamp.toLocaleTimeString([], {
          hour: '2-digit',
          minute: '2-digit',
        })}
      </Text>
    </Animated.View>
  );
};

export function AIChatModal({ visible, onClose, initialContext }: AIChatModalProps) {
  const { user } = useAuth();
  const [messages, setMessages] = useState<Message[]>([
    {
      id: '0',
      role: 'assistant',
      content: "Hi! I'm Vara, your brain-health wellness coach. How can I support you today?",
      timestamp: new Date(),
    },
  ]);
  const [inputText, setInputText] = useState('');
  const [isLoading, setIsLoading] = useState(false);

  const flatListRef = useRef<FlatList>(null);
  const slideAnim = useRef(new Animated.Value(0)).current;

  // Entry animation when modal opens
  useEffect(() => {
    let animation: Animated.CompositeAnimation | null = null;

    if (visible) {
      slideAnim.setValue(0);
      animation = Animated.timing(slideAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      });
      animation.start();
    }

    return () => {
      if (animation) {
        animation.stop();
      }
    };
  }, [visible, slideAnim]);

  // Fetch brain metrics for AI context
  const fetchBrainMetrics = async () => {
    if (!user || !db) return undefined;

    try {
      const today = new Date().toISOString().split('T')[0];
      const sevenDaysAgo = new Date(Date.now() - 7 * 86400000).toISOString().split('T')[0];

      const metricsQuery = query(
        collection(db, 'brainMetrics'),
        where('userId', '==', user.uid),
        where('date', '==', today),
        limit(1)
      );
      const metricsSnapshot = await getDocs(metricsQuery);
      const todayMetrics = metricsSnapshot.docs[0]?.data();

      const neuroplasticityQuery = query(
        collection(db, 'neuroplasticitySignals'),
        where('userId', '==', user.uid),
        where('date', '>=', sevenDaysAgo)
      );
      const neuroplasticitySnapshot = await getDocs(neuroplasticityQuery);

      const amccQuery = query(
        collection(db, 'amccChallenges'),
        where('userId', '==', user.uid),
        where('completed', '==', true),
        orderBy('date', 'desc')
      );
      const amccSnapshot = await getDocs(amccQuery);
      const amccDates = amccSnapshot.docs.map(doc => doc.data().date).filter(Boolean);

      const calculateStreak = (dates: string[]): number => {
        if (dates.length === 0) return 0;
        const sorted = dates.sort().reverse();
        const todayStr = new Date().toISOString().split('T')[0];
        const yesterday = new Date(Date.now() - 86400000).toISOString().split('T')[0];
        if (sorted[0] !== todayStr && sorted[0] !== yesterday) return 0;
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

      const nervousSystemQuery = query(
        collection(db, 'nervousSystemSessions'),
        where('userId', '==', user.uid),
        orderBy('completedAt', 'desc')
      );
      const nervousSystemSnapshot = await getDocs(nervousSystemQuery);
      const nervousSystemToolUses = nervousSystemSnapshot.docs.filter(doc => {
        const completedAt = doc.data().completedAt?.seconds || 0;
        const sevenDaysAgoTimestamp = Date.now() / 1000 - 7 * 86400;
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

  const handleSend = useCallback(async (text?: string) => {
    const messageText = text || inputText;
    if (!messageText.trim() || isLoading) return;

    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);

    const userMessage: Message = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText.trim(),
      timestamp: new Date(),
    };

    setMessages((prev) => [...prev, userMessage]);
    setInputText('');
    setIsLoading(true);

    try {
      const messageHistory = [...messages, userMessage].map((msg) => ({
        role: msg.role,
        content: msg.content,
      }));

      const brainMetrics = await fetchBrainMetrics();
      const enhancedContext = {
        ...initialContext,
        brainMetrics,
      };

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
        content: "I'm having trouble connecting right now. Please try again in a moment.",
        timestamp: new Date(),
      };

      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputText, isLoading, messages, initialContext]);

  const handleQuickPrompt = (prompt: string) => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Medium);
    handleSend(prompt);
  };

  const handleClose = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light);
    onClose();
  };

  const renderMessage = ({ item, index }: { item: Message; index: number }) => (
    <MessageBubble message={item} index={index} />
  );

  const containerStyle = {
    opacity: slideAnim,
    transform: [
      {
        translateY: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [16, 0],
        }),
      },
      {
        scale: slideAnim.interpolate({
          inputRange: [0, 1],
          outputRange: [0.97, 1],
        }),
      },
    ],
  };

  return (
    <Modal
      visible={visible}
      animationType="slide"
      onRequestClose={handleClose}
      presentationStyle="pageSheet"
    >
      <SafeAreaView style={styles.container} edges={['top']}>
        <Animated.View style={[styles.chatWrapper, containerStyle]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerLeft}>
              {/* Avatar with V icon */}
              <LinearGradient
                colors={[DEW_SAGE, SILVER_SAGE]}
                start={{ x: 0, y: 0 }}
                end={{ x: 1, y: 1 }}
                style={styles.avatar}
              >
                <VaraIcon size={28} color={EVERGREEN_TEAL} />
              </LinearGradient>

              {/* Title area */}
              <View style={styles.titleArea}>
                <View style={styles.titleRow}>
                  <Text style={styles.headerTitle}>Vara Coach</Text>
                  <View style={styles.onlineDot} />
                </View>
                <Text style={styles.headerSubtitle}>Brain-health guidance</Text>
              </View>
            </View>

            {/* Close button */}
            <TouchableOpacity
              onPress={handleClose}
              style={styles.closeButton}
              activeOpacity={0.7}
            >
              <Ionicons name="close" size={22} color={MUTED_SAGE_GRAY} />
            </TouchableOpacity>
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
            {isLoading && <TypingIndicator />}

            {/* Input Area */}
            <View style={styles.inputArea}>
              {/* Quick Prompt Chips */}
              {messages.length <= 1 && !isLoading && (
                <ScrollView
                  horizontal
                  showsHorizontalScrollIndicator={false}
                  contentContainerStyle={styles.quickPromptsContainer}
                  style={styles.quickPromptsScroll}
                >
                  {QUICK_PROMPTS.map((prompt) => (
                    <TouchableOpacity
                      key={prompt}
                      style={styles.quickPromptChip}
                      onPress={() => handleQuickPrompt(prompt)}
                      activeOpacity={0.7}
                    >
                      <Text style={styles.quickPromptText}>{prompt}</Text>
                    </TouchableOpacity>
                  ))}
                </ScrollView>
              )}

              <View style={styles.inputRow}>
                <TextInput
                  placeholder="How can I support you today?"
                  placeholderTextColor={TIMESTAMP_COLOR}
                  value={inputText}
                  onChangeText={setInputText}
                  multiline
                  maxLength={500}
                  style={styles.textInput}
                  returnKeyType="default"
                />
                <TouchableOpacity
                  onPress={() => handleSend()}
                  style={[
                    styles.sendButton,
                    inputText.trim() && !isLoading
                      ? styles.sendButtonActive
                      : styles.sendButtonInactive,
                  ]}
                  disabled={!inputText.trim() || isLoading}
                  activeOpacity={0.8}
                >
                  <Ionicons
                    name="send"
                    size={18}
                    color={inputText.trim() && !isLoading ? MIST_WHITE : MUTED_SAGE_GRAY}
                  />
                </TouchableOpacity>
              </View>

              {/* Footer */}
              <Text style={styles.footerText}>
                Powered by Vara · Brain-health centered wellness
              </Text>
            </View>
          </KeyboardAvoidingView>
        </Animated.View>
      </SafeAreaView>
    </Modal>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: MIST_WHITE,
  },
  chatWrapper: {
    flex: 1,
    borderTopLeftRadius: 20,
    borderTopRightRadius: 20,
    overflow: 'hidden',
    backgroundColor: MIST_WHITE,
  },

  // Header
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: 16,
    paddingVertical: 16,
    backgroundColor: '#fff',
    borderBottomWidth: 1,
    borderBottomColor: BORDER_COLOR,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 12,
    flex: 1,
  },
  avatar: {
    width: 48,
    height: 48,
    borderRadius: 12,
    justifyContent: 'center',
    alignItems: 'center',
  },
  titleArea: {
    flex: 1,
  },
  titleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
  },
  headerTitle: {
    fontSize: 14.5,
    fontWeight: '600',
    color: SOFT_CHARCOAL,
  },
  onlineDot: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: ONLINE_GREEN,
  },
  headerSubtitle: {
    fontSize: 12,
    color: MUTED_SAGE_GRAY,
    marginTop: 2,
  },
  closeButton: {
    width: 48,
    height: 48,
    borderRadius: 24,
    justifyContent: 'center',
    alignItems: 'center',
    backgroundColor: 'transparent',
  },

  // Chat container
  chatContainer: {
    flex: 1,
  },
  messagesList: {
    paddingHorizontal: 16,
    paddingVertical: 16,
    flexGrow: 1,
    gap: 16,
  },

  // Messages
  messageBubble: {
    maxWidth: '90%',
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  userMessage: {
    alignSelf: 'flex-end',
    maxWidth: '82%',
    backgroundColor: EVERGREEN_TEAL,
    borderRadius: 16,
    borderBottomRightRadius: 4,
    paddingHorizontal: 16,
    paddingVertical: 12,
  },
  assistantMessage: {
    alignSelf: 'flex-start',
    backgroundColor: '#fff',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderLeftWidth: 3,
    borderLeftColor: SILVER_SAGE,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.03,
    shadowRadius: 3,
    elevation: 1,
  },
  messageText: {
    fontSize: 14,
    lineHeight: 14 * 1.55,
  },
  userMessageText: {
    color: MIST_WHITE,
  },
  assistantMessageText: {
    color: SOFT_CHARCOAL,
  },
  timestamp: {
    fontSize: 12,
    marginTop: 4,
    paddingHorizontal: 4,
  },
  userTimestamp: {
    color: 'rgba(250, 250, 246, 0.7)',
    alignSelf: 'flex-end',
  },
  assistantTimestamp: {
    color: TIMESTAMP_COLOR,
    alignSelf: 'flex-start',
  },

  // Typing indicator
  typingContainer: {
    alignSelf: 'flex-start',
    marginLeft: 16,
    marginBottom: 16,
    backgroundColor: '#fff',
    borderRadius: 16,
    borderBottomLeftRadius: 4,
    borderWidth: 1,
    borderColor: BORDER_COLOR,
    borderLeftWidth: 3,
    borderLeftColor: SILVER_SAGE,
    paddingHorizontal: 16,
    paddingVertical: 16,
  },
  typingDotsRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 5,
  },
  typingDot: {
    width: 7,
    height: 7,
    borderRadius: 3.5,
    backgroundColor: SILVER_SAGE,
  },

  // Quick prompts
  quickPromptsScroll: {
    flexGrow: 0,
    marginBottom: 12,
  },
  quickPromptsContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  quickPromptChip: {
    paddingHorizontal: 12,
    paddingVertical: 6,
    minHeight: 48,
    justifyContent: 'center',
    borderRadius: 16,
    borderWidth: 1,
    borderColor: DEW_SAGE,
    backgroundColor: MIST_WHITE,
    marginRight: 8,
  },
  quickPromptText: {
    fontSize: 12,
    fontWeight: '500',
    color: EVERGREEN_TEAL,
    lineHeight: 16,
  },

  // Input area
  inputArea: {
    paddingHorizontal: 16,
    paddingTop: 12,
    paddingBottom: 16,
    borderTopWidth: 1,
    borderTopColor: BORDER_COLOR,
    backgroundColor: '#fff',
  },
  inputRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 8,
    backgroundColor: MIST_WHITE,
    borderRadius: 16,
    paddingLeft: 16,
    paddingRight: 4,
    paddingVertical: 4,
    borderWidth: 1.5,
    borderColor: '#e0e8e0',
  },
  textInput: {
    flex: 1,
    fontSize: 14,
    color: SOFT_CHARCOAL,
    maxHeight: 80,
    paddingVertical: 8,
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: 14,
    justifyContent: 'center',
    alignItems: 'center',
  },
  sendButtonActive: {
    backgroundColor: EVERGREEN_TEAL,
  },
  sendButtonInactive: {
    backgroundColor: DEW_SAGE,
  },
  footerText: {
    textAlign: 'center',
    fontSize: 12,
    color: TIMESTAMP_COLOR,
    marginTop: 8,
  },
});

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
import { collection, query, where, getDocs, orderBy, limit, doc, getDoc } from 'firebase/firestore';
import { normalizeBrainState } from '../../utils/brainStateNormalizer';
import AsyncStorage from '@react-native-async-storage/async-storage';

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
const LAST_COACH_SESSION_KEY = '@vara_last_coach_session';

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

// Rate-limit response shape returned by the backend (both Cloud Functions and Express).
// See backend/server.js rateLimitHandler and functions/index.js 429 response.
type RateLimitCode = 'daily_limit_exceeded' | 'hourly_limit_exceeded';
interface RateLimitPayload {
  code: RateLimitCode;
  resetAt: string;
  retryAfter: number;
}

function extractRateLimit(error: unknown): RateLimitPayload | null {
  const data = (error as { response?: { data?: unknown } })?.response?.data;
  if (!data || typeof data !== 'object') return null;
  const d = data as Partial<RateLimitPayload>;
  if (d.code !== 'daily_limit_exceeded' && d.code !== 'hourly_limit_exceeded') return null;
  if (typeof d.resetAt !== 'string' || typeof d.retryAfter !== 'number') return null;
  return { code: d.code, resetAt: d.resetAt, retryAfter: d.retryAfter };
}

function formatResetTime(resetAt: string): string {
  const reset = new Date(resetAt);
  if (Number.isNaN(reset.getTime())) return 'later';
  const now = new Date();
  const timeStr = reset.toLocaleTimeString([], { hour: 'numeric', minute: '2-digit' });
  if (reset.toDateString() === now.toDateString()) {
    return `at ${timeStr}`;
  }
  const tomorrow = new Date(now);
  tomorrow.setDate(tomorrow.getDate() + 1);
  if (reset.toDateString() === tomorrow.toDateString()) {
    return `tomorrow at ${timeStr}`;
  }
  return `on ${reset.toLocaleDateString([], { weekday: 'long' })} at ${timeStr}`;
}

function formatRetryDuration(retryAfter: number): string {
  if (retryAfter <= 60) return 'in about a minute';
  const minutes = Math.ceil(retryAfter / 60);
  if (minutes < 60) return `in about ${minutes} minute${minutes === 1 ? '' : 's'}`;
  const hours = Math.ceil(minutes / 60);
  return `in about ${hours} hour${hours === 1 ? '' : 's'}`;
}

function buildChatErrorContent(error: unknown): string {
  const rate = extractRateLimit(error);
  if (rate?.code === 'daily_limit_exceeded') {
    return `You've reached today's Vara Coach limit. You can chat again ${formatResetTime(rate.resetAt)}.`;
  }
  if (rate?.code === 'hourly_limit_exceeded') {
    return `You've sent a lot of messages quickly. Try again ${formatRetryDuration(rate.retryAfter)}.`;
  }
  return "I'm having trouble connecting right now. Please try again in a moment.";
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

  // Build enhanced context for AI coach
  const buildCoachContext = async (): Promise<Record<string, any>> => {
    if (!user || !db) return {};

    const uid = user.uid;
    const now = new Date();
    const today = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`;
    const currentTime = now.toLocaleTimeString('en-US', { hour: '2-digit', minute: '2-digit', hour12: true });
    const timezone = Intl.DateTimeFormat().resolvedOptions().timeZone;

    // All queries in parallel
    const [
      brainStateResult,
      dailyReflectionResult,
      brainMetricsResult,
      recentJournalResult,
      focusSessionsResult,
      lastCoachSession,
    ] = await Promise.all([
      getDoc(doc(db, 'brainStateCheckIns', `${uid}_${today}`)).catch(() => null),
      getDoc(doc(db, 'dailyReflections', `${uid}_${today}`)).catch(() => null),
      getDoc(doc(db, 'brainMetrics', `${uid}_${today}`)).catch(() => null),
      getDocs(query(
        collection(db, 'journalEntries'),
        where('userId', '==', uid),
        orderBy('createdAt', 'desc'),
        limit(5),
      )).catch(() => null),
      getDocs(query(
        collection(db, 'focusSessions'),
        where('userId', '==', uid),
        orderBy('startedAt', 'desc'),
        limit(20),
      )).catch(() => null),
      AsyncStorage.getItem(LAST_COACH_SESSION_KEY).catch(() => null),
    ]);

    // Parse results
    let brainState: string | null = null;
    if (brainStateResult?.exists?.()) {
      try {
        brainState = normalizeBrainState(brainStateResult.data()?.brainState);
      } catch {
        brainState = null;
      }
    }
    const reflection = dailyReflectionResult?.exists?.() ? dailyReflectionResult.data()?.reflection : null;
    const brainMetrics = brainMetricsResult?.exists?.() ? brainMetricsResult.data() : null;

    // Journal tags from recent entries (no content — just tags and moods)
    const journalTags: string[] = [];
    const journalMoods: string[] = [];
    if (recentJournalResult) {
      recentJournalResult.docs.forEach((d: any) => {
        const data = d.data();
        if (data.tags) journalTags.push(...data.tags);
        if (data.mood) journalMoods.push(data.mood);
      });
    }
    const uniqueTags = [...new Set(journalTags)].slice(0, 8);

    // Mood trend from recent journal moods
    const moodToNum: Record<string, number> = { great: 5, good: 4, okay: 3, low: 2, difficult: 1, bad: 1, terrible: 0 };
    let moodTrend = 'not enough data';
    if (journalMoods.length >= 3) {
      const recent = journalMoods.slice(0, 2).map(m => moodToNum[m] ?? 3);
      const older = journalMoods.slice(2, 5).map(m => moodToNum[m] ?? 3);
      const recentAvg = recent.reduce((a, b) => a + b, 0) / recent.length;
      const olderAvg = older.reduce((a, b) => a + b, 0) / older.length;
      if (recentAvg > olderAvg + 0.5) moodTrend = 'improving';
      else if (recentAvg < olderAvg - 0.5) moodTrend = 'declining';
      else moodTrend = 'stable';
    }

    // Focus sessions this week
    const sevenDaysAgo = Date.now() / 1000 - 7 * 86400;
    let focusCount = 0;
    let focusMinutes = 0;
    if (focusSessionsResult) {
      focusSessionsResult.docs.forEach((d: any) => {
        const data = d.data();
        if ((data.startedAt?.seconds || 0) >= sevenDaysAgo && data.completed) {
          focusCount++;
          focusMinutes += data.duration || 0;
        }
      });
    }

    const habits = initialContext?.userHabits || [];

    // "Days active this week" is not computed. It read h.thisWeekSteps as an
    // array of dated steps, but that field is a number (and permanently 0), so
    // the loop never ran and the value was always 0. Feeding a hard "0 of 7
    // days active" to the coach is worse than dead code — it is false state
    // about the user that the coach could reflect back at them. Silence beats a
    // wrong zero. The honest value needs the completions subcollection, which
    // this modal does not load; that is a separate slice.

    // Days since last coach session
    let daysSinceLastSession = 'first time';
    if (lastCoachSession) {
      const lastDate = new Date(lastCoachSession);
      const diffDays = Math.floor((Date.now() - lastDate.getTime()) / 86400000);
      daysSinceLastSession = diffDays === 0 ? 'today' : diffDays === 1 ? 'yesterday' : `${diffDays} days ago`;
    }

    // Save this session timestamp
    AsyncStorage.setItem(LAST_COACH_SESSION_KEY, new Date().toISOString()).catch(() => {});

    // First 5 habits, with identity/intention. Previously sorted by
    // totalStepsTaken, a field that was always 0 for every habit, so the sort
    // was a no-op; it and the field are gone, leaving load order.
    const topHabits = [...habits]
      .slice(0, 5)
      .map((h: any) => {
        const parts = [h.name || h.title || 'Untitled'];
        if (h.scalingPhase) parts.push(`phase: ${h.scalingPhase.replace(/_/g, ' ')}`);
        if (h.identity || h.identityStatement) parts.push(`identity: "${h.identity || h.identityStatement}"`);
        else if (h.intention) parts.push(`why: "${h.intention}"`);
        return parts.join(' | ');
      });

    return {
      currentTime: `${currentTime} ${timezone}`,
      page: initialContext?.screen || 'unknown',
      brainState: brainState || 'not checked in today',
      todayCheckIn: brainState || 'not checked in today',
      dailyReflection: reflection || 'not reflected yet',
      sleepQuality: brainMetrics?.sleepQuality ? `${brainMetrics.sleepQuality}/5` : 'not tracked',
      stressLevel: brainMetrics?.stressLevel ? `${brainMetrics.stressLevel}/5` : 'not tracked',
      weekSummary: `${focusCount} focus sessions (${focusMinutes} min total)`,
      moodTrend,
      recentJournalTags: uniqueTags.length > 0 ? uniqueTags.join(', ') : 'none',
      daysSinceLastCoachSession: daysSinceLastSession,
      habits: topHabits,
    };
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

      let coachContext = {};
      try {
        coachContext = await buildCoachContext();
      } catch (contextErr) {
        console.warn('Coach context fetch failed, sending without context:', contextErr);
      }
      const response = await chatWithAI(messageHistory, coachContext);

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
        content: buildChatErrorContent(error),
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
                Vara Coach helps with brain-health habits and routines. It's not a therapist or medical provider.
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

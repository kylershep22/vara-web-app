/**
 * AI Service
 * API calls for AI-powered features (OpenAI integration)
 */

import { apiPost } from './client';
import {
  DailyPlanRequest,
  DailyPlanResponse,
  AIPromptRequest,
  AIPromptResponse,
  JournalWeeklySummary,
} from '../../types';

/**
 * Generate daily plan using AI
 */
export const generateDailyPlan = async (
  request: DailyPlanRequest
): Promise<DailyPlanResponse> => {
  try {
    return await apiPost<DailyPlanResponse>('/generate-daily-plan', request, {
      debug: __DEV__,
    });
  } catch (error) {
    console.error('Error generating daily plan:', error);
    throw error;
  }
};

/**
 * Get AI suggestions for goals, habits, or tasks
 */
export const getAISuggestions = async (
  request: AIPromptRequest
): Promise<string[]> => {
  try {
    const response = await apiPost<{ suggestions: string[] }>('/openai', request, {
      debug: __DEV__,
    });
    return response.suggestions;
  } catch (error) {
    console.error('Error getting AI suggestions:', error);
    throw error;
  }
};

/**
 * Get AI journal prompt
 */
export const getJournalPrompt = async (
  context?: string
): Promise<string> => {
  try {
    const response = await apiPost<AIPromptResponse>('/journal-prompt', {
      prompt: context || '',
      brainFocused: context === 'brain-focused',
    }, {
      debug: __DEV__,
    });
    return response.prompt;
  } catch (error) {
    console.error('Error getting journal prompt:', error);
    throw error;
  }
};

/**
 * Generate weekly journal summary (plain text)
 */
export const generateJournalSummary = async (
  entries: string
): Promise<string> => {
  try {
    const response = await apiPost<{ text: string }>('/journal-summary', {
      entries,
    }, {
      debug: __DEV__,
      timeout: 60000, // 60 seconds for summary generation
    });
    return response.text;
  } catch (error) {
    console.error('Error generating journal summary:', error);
    throw error;
  }
};

/**
 * Generate structured weekly journal summary with insights
 * Returns mood trend, top themes, word count, and entry count
 */
export const generateStructuredJournalSummary = async (
  entries: string
): Promise<JournalWeeklySummary> => {
  try {
    const response = await apiPost<JournalWeeklySummary>('/journal-summary', {
      entries,
      structured: true,
    }, {
      debug: __DEV__,
      timeout: 60000, // 60 seconds for summary generation
    });
    return response;
  } catch (error) {
    console.error('Error generating structured journal summary:', error);
    throw error;
  }
};

/**
 * Chat with AI companion
 */
export const chatWithAI = async (
  messages: Array<{ role: string; content: string }>,
  context?: {
    page?: { label: string; path: string };
    userSummary?: {
      goals?: any[];
      habits?: any[];
      tasks?: any[];
    };
    brainMetrics?: {
      readinessScore?: number;
      neuroplasticityCount?: number;
      amccStreak?: number;
      nervousSystemToolUses?: number;
      lastCheckIn?: string;
    };
  }
): Promise<string> => {
  try {
    const response = await apiPost<{ reply: string }>('/ai-chat', {
      messages,
      context: context || {},
    }, {
      debug: __DEV__,
      timeout: 60000, // 60 seconds for AI chat
    });
    return response.reply;
  } catch (error) {
    console.error('Error chatting with AI:', error);
    throw error;
  }
};

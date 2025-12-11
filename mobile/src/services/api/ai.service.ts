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
  JournalSummaryRequest,
  JournalSummaryResponse,
} from '../../types';

/**
 * Generate daily plan using AI
 */
export const generateDailyPlan = async (
  request: DailyPlanRequest
): Promise<DailyPlanResponse> => {
  try {
    return await apiPost<DailyPlanResponse>('/generate-daily-plan', request, {
      debug: true,
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
      debug: true,
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
      context: context || '',
    }, {
      debug: true,
    });
    return response.prompt;
  } catch (error) {
    console.error('Error getting journal prompt:', error);
    throw error;
  }
};

/**
 * Generate weekly journal summary
 */
export const generateJournalSummary = async (
  request: JournalSummaryRequest
): Promise<JournalSummaryResponse> => {
  try {
    return await apiPost<JournalSummaryResponse>('/journal-summary', request, {
      debug: true,
    });
  } catch (error) {
    console.error('Error generating journal summary:', error);
    throw error;
  }
};

/**
 * Chat with AI companion
 */
export const chatWithAI = async (
  message: string,
  context?: {
    goals?: any[];
    habits?: any[];
    tasks?: any[];
    recentJournals?: any[];
  }
): Promise<string> => {
  try {
    const response = await apiPost<{ reply: string }>('/ai-chat', {
      message,
      context: context || {},
    }, {
      debug: true,
      timeout: 60000, // 60 seconds for AI chat
    });
    return response.reply;
  } catch (error) {
    console.error('Error chatting with AI:', error);
    throw error;
  }
};

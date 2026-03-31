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
  JournalPromptRawResponse,
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
 * Get 3 AI journal prompt suggestions (returned as string array)
 */
export const getJournalPromptSuggestions = async (): Promise<string[]> => {
  try {
    // Send empty prompt to use backend default (keeps prompt text in one place)
    const response = await apiPost<JournalPromptRawResponse>('/journal-prompt', {
      prompt: '',
    }, {
      debug: __DEV__,
    });
    // Backend returns prompts in `text` field (local) or `prompt` field (deployed)
    const raw = response.text || (response as any).prompt || '';
    const prompts = raw
      .split('\n')
      .map((p: string) => p
        .trim()
        .replace(/^\d+[\.\)]\s*/, '')   // strip "1. " or "1) " numbering
        .replace(/\*\*/g, '')            // strip bold markdown
        .replace(/[*_#"]/g, '')          // strip other markdown chars and quotes
        .replace(/—/g, ', ')            // replace em dashes
        .trim()
      )
      .filter((p: string) => p.length > 0 && p.length < 80) // skip long paragraphs
      .slice(0, 3);
    return prompts;
  } catch (error) {
    console.error('Error getting journal prompt suggestions:', error);
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
  context?: Record<string, any>,
): Promise<string> => {
  try {
    const response = await apiPost<{ reply: string }>('/ai-chat', {
      messages,
      context: context || {},
    }, {
      debug: __DEV__,
      timeout: 60000, // 60 seconds for AI chat
    });
    // Strip markdown artifacts from deployed backend responses
    return (response.reply || '')
      .replace(/\*\*/g, '')
      .replace(/#{1,3}\s/g, '')
      .replace(/—/g, ', ')
      .replace(/^\s*[-*]\s/gm, '')
      .replace(/^\s*\d+\.\s/gm, '')
      .trim();
  } catch (error) {
    console.error('Error chatting with AI:', error);
    throw error;
  }
};

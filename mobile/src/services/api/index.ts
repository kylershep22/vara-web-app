/**
 * API services barrel export
 *
 * NOTE: Explicit re-exports to avoid Metro "export *" issues.
 */

// client
export {
  apiClient,
  apiRequest,
  apiGet,
  apiPost,
  apiPut,
  apiDelete,
} from './client';

// ai.service
export {
  generateDailyPlan,
  getAISuggestions,
  getJournalPrompt,
  getJournalPromptSuggestions,
  generateJournalSummary,
  generateStructuredJournalSummary,
  chatWithAI,
} from './ai.service';

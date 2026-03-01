// backend/middleware/validate.js
// Input validation and sanitization middleware for API endpoints.

const MAX_PROMPT_LENGTH = 5000;
const MAX_ENTRIES_LENGTH = 50000;
const MAX_MESSAGES_COUNT = 50;
const MAX_MESSAGE_LENGTH = 5000;
const MAX_MODIFIER_LENGTH = 1000;

/**
 * Sanitize a string value: type-check and truncate to max length.
 */
function sanitizeString(val, maxLen = MAX_PROMPT_LENGTH) {
  if (typeof val !== 'string') return '';
  return val.slice(0, maxLen).trim();
}

/**
 * Basic prompt injection filter.
 * This is defense-in-depth — not foolproof, but catches common injection patterns.
 */
function filterPromptInjection(text) {
  if (typeof text !== 'string') return text;
  return text
    .replace(/ignore\s+(previous|all|above)\s+instructions?/gi, '[filtered]')
    .replace(/you\s+are\s+now\s+/gi, '[filtered]')
    .replace(/system\s*:\s*/gi, '[filtered]');
}

/**
 * Validate /api/ai-chat requests.
 */
function validateAIChat(req, res, next) {
  const { messages, context } = req.body || {};

  if (!Array.isArray(messages)) {
    return res.status(400).json({ error: 'messages must be an array' });
  }
  if (messages.length > MAX_MESSAGES_COUNT) {
    return res.status(400).json({ error: `Maximum ${MAX_MESSAGES_COUNT} messages allowed` });
  }

  const validRoles = ['user', 'assistant', 'system'];
  req.body.messages = messages.slice(-MAX_MESSAGES_COUNT).map(m => ({
    role: validRoles.includes(m.role) ? m.role : 'user',
    content: sanitizeString(m.content, MAX_MESSAGE_LENGTH),
  }));

  if (context && typeof context === 'object') {
    if (context.page) {
      context.page.label = sanitizeString(context.page.label || '', 100);
      context.page.path = sanitizeString(context.page.path || '', 200);
    }
    // Sanitize userSummary fields that get interpolated into the AI prompt
    if (context.userSummary && typeof context.userSummary === 'object') {
      const us = context.userSummary;
      if (Array.isArray(us.goals)) {
        us.goals = us.goals.slice(0, 10).map(g => ({
          ...g,
          title: filterPromptInjection(sanitizeString(String(g.title || ''), 200)),
          category: sanitizeString(String(g.category || ''), 100),
        }));
      }
      if (Array.isArray(us.habits)) {
        us.habits = us.habits.slice(0, 10).map(h => ({
          ...h,
          title: filterPromptInjection(sanitizeString(String(h.title || ''), 200)),
          cadence: sanitizeString(String(h.cadence || ''), 50),
        }));
      }
    }
  }

  next();
}

/**
 * Validate /api/journal-summary requests.
 */
function validateJournalEntries(req, res, next) {
  const { entries } = req.body || {};

  if (typeof entries === 'string') {
    req.body.entries = sanitizeString(entries, MAX_ENTRIES_LENGTH);
  } else if (Array.isArray(entries)) {
    req.body.entries = entries.slice(0, 20).map(e =>
      typeof e === 'string' ? sanitizeString(e, MAX_MESSAGE_LENGTH) : ''
    );
  }

  next();
}

/**
 * Validate /api/journal-prompt requests.
 */
function validateJournalPrompt(req, res, next) {
  if (req.body.prompt) {
    req.body.prompt = filterPromptInjection(sanitizeString(req.body.prompt, MAX_PROMPT_LENGTH));
  }
  next();
}

/**
 * Validate /api/openai (AI suggestions) requests.
 */
function validateAISuggestions(req, res, next) {
  const { type, context, modifier } = req.body || {};

  if (!type || typeof type !== 'string') {
    return res.status(400).json({ error: 'type must be a non-empty string' });
  }
  const allowedTypes = ['goals', 'habits', 'tasks'];
  if (!allowedTypes.includes(type)) {
    return res.status(400).json({ error: `type must be one of: ${allowedTypes.join(', ')}` });
  }
  if (!context) {
    return res.status(400).json({ error: 'context is required' });
  }

  // Sanitize context — can be a string or object
  if (typeof context === 'string') {
    req.body.context = filterPromptInjection(sanitizeString(context, MAX_PROMPT_LENGTH));
  } else if (typeof context === 'object' && context !== null) {
    // Stringify, sanitize, and pass through as a sanitized string representation
    const contextStr = JSON.stringify(context);
    req.body.context = filterPromptInjection(sanitizeString(contextStr, MAX_PROMPT_LENGTH));
  } else {
    return res.status(400).json({ error: 'context must be a string or object' });
  }

  if (modifier) {
    req.body.modifier = filterPromptInjection(sanitizeString(modifier, MAX_MODIFIER_LENGTH));
  }

  next();
}

/**
 * Validate /api/week-recap-suggestions requests.
 */
function validateWeekRecap(req, res, next) {
  const { weekData } = req.body || {};

  if (!weekData || typeof weekData !== 'object') {
    return res.status(400).json({ error: 'weekData must be an object' });
  }

  // Sanitize arrays within weekData
  if (Array.isArray(weekData.goals)) {
    weekData.goals = weekData.goals.slice(0, 20).map(g => sanitizeString(String(g), 200));
  }
  if (Array.isArray(weekData.habits)) {
    weekData.habits = weekData.habits.slice(0, 20);
  }
  if (Array.isArray(weekData.recentJournals)) {
    weekData.recentJournals = weekData.recentJournals.slice(0, 5).map(j => sanitizeString(String(j), MAX_MESSAGE_LENGTH));
  }

  next();
}

/**
 * Validate /api/generate-daily-plan requests.
 */
function validateDailyPlan(req, res, next) {
  if (req.body.modifier) {
    req.body.modifier = filterPromptInjection(sanitizeString(req.body.modifier, MAX_MODIFIER_LENGTH));
  }
  next();
}

module.exports = {
  validateAIChat,
  validateJournalEntries,
  validateJournalPrompt,
  validateAISuggestions,
  validateWeekRecap,
  validateDailyPlan,
  sanitizeString,
  filterPromptInjection,
};

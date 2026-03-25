// backend/server.js

require('dotenv').config({ path: './backend/.env' });

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const rateLimit = require('express-rate-limit');
const dotenv = require('dotenv');
const dailyPlanRoute = require('./routes/dailyPlan');
const generateHabitSuggestions = require('./services/habitSuggestionService');
const OpenAI = require('openai');
const { requireAuth } = require('./middleware/auth');
const {
  validateAIChat,
  validateJournalEntries,
  validateJournalPrompt,
  validateAISuggestions,
  validateWeekRecap,
  validateDailyPlan,
} = require('./middleware/validate');

// Load environment variables
dotenv.config();

// ---- Safety checks ----
if (!process.env.OPENAI_API_KEY) {
  console.warn('⚠️  OPENAI_API_KEY is not set. AI routes will fail until this is configured.');
}

const app = express();
const PORT = process.env.PORT || 5001;

// ---- CORS: restrict to known origins ----
const allowedOrigins = [
  'https://vara-4a99f.web.app',
  'https://vara-4a99f.firebaseapp.com',
];
if (process.env.NODE_ENV !== 'production') {
  allowedOrigins.push('http://localhost:3000', 'http://localhost:5001');
}
app.use(cors({
  origin: (origin, callback) => {
    // Allow requests with no origin (mobile apps, curl, server-to-server)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    callback(new Error('Not allowed by CORS'));
  },
  credentials: true,
}));

// ---- Security headers ----
app.use(helmet());

// ---- Body parsing ----
app.use(express.json({ limit: '2mb' }));

// ---- Rate limiting ----
// Global: 100 requests per 15 minutes per IP
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000,
  max: 100,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: 'Too many requests, please try again later.' },
});
app.use('/api', globalLimiter);

// AI endpoints: 30 requests per hour, keyed by authenticated user
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.uid || req.ip,
  message: { error: 'AI rate limit exceeded. Please try again later.' },
});

// ---- Auth: require Firebase token on all /api routes ----
app.use('/api', requireAuth);

// ---- OpenAI client (single instance) ----
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Routes
app.use('/api/generate-daily-plan', aiLimiter, validateDailyPlan, dailyPlanRoute);

// ✅ AI Suggestions for Goals, Habits, or Tasks
app.post('/api/openai', aiLimiter, validateAISuggestions, async (req, res) => {
  const { type, context, modifier = '' } = req.body;

  try {
    const text = await generateHabitSuggestions(type, context, modifier);
    res.status(200).json({ text });
  } catch (err) {
    console.error('OpenAI suggestion error:', err);
    res.status(500).json({ error: 'Failed to generate AI suggestions' });
  }
});

// ✅ Journal Prompt Suggestions
app.post('/api/journal-prompt', aiLimiter, validateJournalPrompt, async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await openai.chat.completions.create({
      // Lightweight + capable; adjust if you prefer a different model.
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a thoughtful journaling assistant. Return exactly 3 short journal prompts, one per line. Each prompt should be a single sentence, warm and conversational. No numbering, no bullets, no markdown. Just 3 lines of text.' },
        { role: 'user', content: prompt || 'Give me 3 reflective journal prompts focused on mindfulness and self-awareness.' }
      ],
      temperature: 0.7
    });

    const text = response.choices?.[0]?.message?.content || '';
    res.status(200).json({ text });
  } catch (err) {
    console.error('Journal AI prompt error:', err);
    res.status(500).json({ error: 'Failed to generate journal prompt' });
  }
});

// ✅ Journal Weekly Summary
app.post('/api/journal-summary', aiLimiter, validateJournalEntries, async (req, res) => {
  const { entries } = req.body;

  if (!entries || (typeof entries === 'string' && entries.trim().length === 0)) {
    return res.status(400).json({ error: 'No journal entries provided.' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a wellness journal assistant that summarizes weekly reflections. Write in a warm, conversational tone like a supportive friend. Never use markdown formatting (no **bold**, no headers, no bullet points). Keep your response natural and encouraging.' },
        {
          role: 'user',
          content:
`Here are my journal entries from the past week:

${typeof entries === 'string' ? entries : JSON.stringify(entries, null, 2)}

Please summarize the main themes, emotions, and any meaningful insights or patterns you notice.
Keep it encouraging and brief (4–6 sentences max), with 1–3 actionable nudges for next week. Write naturally, like you're talking to a friend - no lists or bullet points.`
        }
      ],
      temperature: 0.7
    });

    const text = response.choices?.[0]?.message?.content || '';
    res.status(200).json({ text });
  } catch (err) {
    console.error('Journal summary error:', err);
    res.status(500).json({ error: 'Failed to generate journal summary' });
  }
});

// ✅ AI Chat (non-streaming) — used by the floating AI Companion widget
// Expects: { messages: [{role, content}], context: { page: {path,label}, userSummary: {goals:[], habits:[]}} }
app.post('/api/ai-chat', aiLimiter, validateAIChat, async (req, res) => {
  try {
    const { messages = [], context = {} } = req.body || {};
    const { page, userSummary } = context || {};

    const systemPrompt = `
You are Vara, an empathetic, strengths-based wellness coach having a friendly conversation.

WRITING STYLE - THIS IS CRITICAL:
- Write like you're texting a friend, not writing an article
- NEVER use markdown formatting (no **bold**, no # headers, no bullet points with -)
- Use natural paragraph breaks instead of lists when possible
- Keep responses conversational and warm, like a supportive friend
- If you need to list items, use plain text with commas or "First... Then... Finally..." style
- Avoid formal structure - no "Here's what I recommend:" style headers

Context:
- Current page: ${page?.label || 'Unknown'} (path: ${page?.path || '/'})
- User summary (short):
  - Goals: ${
    (userSummary?.goals || [])
      .map(g => `${g.title || 'Untitled goal'}${g.category ? ` [${g.category}]` : ''}${typeof g.progress === 'number' ? ` (${g.progress}% done)` : ''}`)
      .slice(0, 5)
      .join('; ') || 'None on file'
  }
  - Habits: ${
    (userSummary?.habits || [])
      .map(h => `${h.title || 'Untitled habit'}${h.cadence ? ` [${h.cadence}]` : ''}${typeof h.streak === 'number' ? ` (streak ${h.streak})` : ''}`)
      .slice(0, 8)
      .join('; ') || 'None on file'
  }

Guidelines:
- Prefer small, achievable steps over long lectures.
- Offer at most 1–3 options, mentioned naturally in conversation.
- If user asks for a plan, give time-boxed steps conversationally (e.g., "Try spending about 10 minutes on this today").
- If a query is missing info, ask a single clarifying question.
- Be concise, encouraging, and specific. Offer practical next steps users can do today.
- Avoid medical claims or diagnoses.
    `.trim();

    const history = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: history
    });

    const reply = completion?.choices?.[0]?.message?.content?.trim() || "I couldn't find the right words — try again?";
    return res.status(200).json({ reply });
  } catch (err) {
    console.error('ai-chat error:', err);
    return res.status(500).json({ error: 'AI chat failed' });
  }
});

// ✅ Week Recap AI Suggestions (Phase 2)
app.post('/api/week-recap-suggestions', aiLimiter, validateWeekRecap, async (req, res) => {
  const userId = req.uid; // Use verified UID from auth middleware
  const { weekData, currentRecap } = req.body;

  if (!weekData) {
    return res.status(400).json({ error: 'Missing required field: weekData' });
  }

  try {
    const { goals = [], habits = [], recentJournals = [] } = weekData;

    const systemPrompt = `
You are Vara, an empathetic wellness coach helping users reflect on their week.
Based on the user's goals, habits, and recent journal entries, suggest thoughtful responses for their 4-3-2-1 week recap:
- 4 moments of joy
- 3 ways they fueled their mind or body

Be specific and personalized based on their actual activities. Keep suggestions concise and positive.
Return only a JSON object with "momentsOfJoy" (array of 4 strings) and "mindBodyFuel" (array of 3 strings).
    `.trim();

    const userPrompt = `
User's Week Context:
- Goals: ${goals.join(', ') || 'None'}
- Habits: ${habits.map(h => `${h.name} (${h.streak || 0} day streak)`).join(', ') || 'None'}
- Recent Journal Entries: ${recentJournals.join(' | ') || 'None'}

Current Recap (if any):
${JSON.stringify(currentRecap, null, 2)}

Based on this information, suggest:
1. 4 moments of joy they might have experienced
2. 3 ways they likely fueled their mind or body

Return as JSON: {"momentsOfJoy": [...], "mindBodyFuel": [...]}
    `.trim();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt }
      ],
      temperature: 0.7,
      response_format: { type: 'json_object' }
    });

    const suggestions = JSON.parse(response.choices?.[0]?.message?.content || '{}');
    res.status(200).json(suggestions);
  } catch (err) {
    console.error('Week recap AI suggestions error:', err);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// Health check
app.get('/', (req, res) => {
  res.send('Wellness AI backend is running ✅');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});





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
const stripMarkdown = require('./utils/stripMarkdown');

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
    // Allow requests with no origin (mobile apps, curl, server-to-server, CRA proxy)
    if (!origin) return callback(null, true);
    if (allowedOrigins.includes(origin)) return callback(null, true);
    // In development, allow any localhost origin (CRA proxy forwards browser origin)
    if (process.env.NODE_ENV !== 'production' && origin && origin.startsWith('http://localhost')) {
      return callback(null, true);
    }
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

// Shared 429 response shape — mirrors the Cloud Functions structure so the
// mobile client can render a consistent message on either path.
function rateLimitHandler(code, message, windowMs) {
  return (req, res) => {
    const resetAt = req.rateLimit?.resetTime?.getTime?.() ?? Date.now() + windowMs;
    const retryAfter = Math.max(1, Math.ceil((resetAt - Date.now()) / 1000));
    res.set('Retry-After', retryAfter.toString());
    res.status(429).json({
      error: 'Too many requests',
      code,
      message,
      retryAfter,
      resetAt: new Date(resetAt).toISOString(),
    });
  };
}

// AI endpoints: 30 requests per hour, keyed by authenticated user
const aiLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  max: 30,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.uid || req.ip,
  validate: false,
  handler: rateLimitHandler(
    'hourly_limit_exceeded',
    "You've exceeded the rate limit. Please try again later.",
    60 * 60 * 1000,
  ),
});

// AI endpoints: 150 requests per 24h, keyed by authenticated user
const aiDailyLimiter = rateLimit({
  windowMs: 24 * 60 * 60 * 1000,
  max: 150,
  standardHeaders: true,
  legacyHeaders: false,
  keyGenerator: (req) => req.uid || req.ip,
  validate: false,
  handler: rateLimitHandler(
    'daily_limit_exceeded',
    "You've reached today's limit for this feature. Try again tomorrow.",
    24 * 60 * 60 * 1000,
  ),
});

// ---- Auth: require Firebase token on all /api routes ----
app.use('/api', requireAuth);

// ---- OpenAI client (single instance) ----
const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

// Routes
app.use('/api/generate-daily-plan', aiLimiter, aiDailyLimiter, validateDailyPlan, dailyPlanRoute);

// ✅ AI Suggestions for Goals, Habits, or Tasks
app.post('/api/openai', aiLimiter, aiDailyLimiter, validateAISuggestions, async (req, res) => {
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
app.post('/api/journal-prompt', aiLimiter, aiDailyLimiter, validateJournalPrompt, async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await openai.chat.completions.create({
      // Lightweight + capable; adjust if you prefer a different model.
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are Vara, a warm wellness journaling companion. Return exactly 3 journal prompts, one per line. Rules: Each prompt must be a single question under 12 words. No em dashes. No markdown, no bold, no asterisks, no quotes, no headers, no bullet points, no numbering. No preamble or labels. Just 3 plain short questions, one per line.' },
        { role: 'user', content: prompt || 'Give me 3 reflective journal prompts for today.' }
      ],
      temperature: 0.7,
      max_tokens: 400,
    });

    const raw = response.choices?.[0]?.message?.content || '';
    res.status(200).json({ text: stripMarkdown(raw) });
  } catch (err) {
    console.error('Journal AI prompt error:', err);
    res.status(500).json({ error: 'Failed to generate journal prompt' });
  }
});

// ✅ Journal Weekly Summary
app.post('/api/journal-summary', aiLimiter, aiDailyLimiter, validateJournalEntries, async (req, res) => {
  const { entries } = req.body;

  if (!entries || (typeof entries === 'string' && entries.trim().length === 0)) {
    return res.status(400).json({ error: 'No journal entries provided.' });
  }

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: 'You are a wellness journal assistant that summarizes weekly reflections. Write in a warm, conversational tone like a supportive friend. Your output will be displayed as plain text in a mobile app, so do not use any formatting - no markdown, no bold, no italics, no asterisks, no hashtags, no headers, no bullet points, no numbered lists. Just write naturally in flowing sentences and paragraphs.' },
        {
          role: 'user',
          content:
`Here are my journal entries from the past week:

${typeof entries === 'string' ? entries : JSON.stringify(entries, null, 2)}

Please summarize the main themes, emotions, and any meaningful insights or patterns you notice.
Keep it encouraging and brief (4–6 sentences max), with 1–3 actionable nudges for next week. Write naturally, like you're talking to a friend - no lists or bullet points.`
        }
      ],
      temperature: 0.7,
      max_tokens: 1500,
    });

    const raw = response.choices?.[0]?.message?.content || '';
    res.status(200).json({ text: stripMarkdown(raw) });
  } catch (err) {
    console.error('Journal summary error:', err);
    res.status(500).json({ error: 'Failed to generate journal summary' });
  }
});

// ✅ AI Chat (non-streaming) — used by the floating AI Companion widget
// Expects: { messages: [{role, content}], context: { page: {path,label}, userSummary: {goals:[], habits:[]}} }
app.post('/api/ai-chat', aiLimiter, aiDailyLimiter, validateAIChat, async (req, res) => {
  try {
    const { messages = [], context = {} } = req.body || {};
    const { page, userSummary } = context || {};

    const goalsText = (userSummary?.goals || [])
      .map(g => `${g.title || 'Untitled goal'}${g.category ? ` [${g.category}]` : ''}${typeof g.progress === 'number' ? ` (${g.progress}% done)` : ''}`)
      .slice(0, 5)
      .join('; ') || 'None on file';

    const habitsText = (userSummary?.habits || [])
      .map(h => `${h.title || 'Untitled habit'}${h.cadence ? ` [${h.cadence}]` : ''}${typeof h.streak === 'number' ? ` (streak ${h.streak})` : ''}`)
      .slice(0, 8)
      .join('; ') || 'None on file';

    const systemPrompt = `
You are Vara Coach — a calm, knowledgeable brain-health guide. You help users build sustainable habits, routines, and focus through 5 pillars:

1. Neuroplasticity (growth through challenge and novelty)
2. Neuroenergy (sleep, movement, nutrition as brain fuel)
3. Neurofocus (attention, concentration, reducing cognitive load)
4. Neuroresilience (stress tolerance, recovery, regulation)
5. Neurosocial (connection, belonging, social brain health)

VOICE: Calm, intelligent, supportive, clear. Use conditional language ("can help," "may support," "many people find"). Never use urgency, shame, guilt, streak pressure, or hype. Frame missed days as normal. Keep responses to 2-3 short paragraphs, 1-3 options max. Ask one clarifying question if needed.

AMCC challenges and neuroplasticity activities: frame as invitations, never prescriptions. Do not specify durations, temperatures, or protocols for physical challenges.

=== TOPIC ROUTING ===

TIER 1 — HARD DECLINE (say these are outside your scope, warmly):
Financial advice (stocks, crypto, investing, tax, insurance), medical advice (diagnoses, medications, dosages, supplements with dosing), legal advice, clinical mental health (CBT, trauma processing, diagnostic screening, medication management), political opinions, advice about other people's mental health.

Do not reframe these through brain health — no "well, financial stress affects your brain..." bridges. Acknowledge warmly, state it's outside your lane, optionally suggest the right resource.

Example: "Should I buy ETFs?" → "That's outside what I'm built for — I'm focused on your brain health and routines. A financial advisor would be the right person for that one."

TIER 2 — GENUINE BRIDGE (engage through brain-health lens, stay in your lane):
Sleep, exercise/movement, general nutrition patterns, screen time, work-life balance, decision fatigue, stress from work/life, social connection, mindfulness/breathwork, caffeine/alcohol effects on cognition.

Engage with the brain-health connection. Don't become a nutritionist, trainer, or life coach. If the question goes deeper than your domain, acknowledge the limit.

Example: "I'm stressed about money" → Engage with the stress and its cognitive effects. Do not give financial advice.

TIER 3 — CONVERSATIONAL PASS (brief, human, no brain-health bridge):
Cars, movies, sports, weather, trivia, jokes, anything casual with no liability and no real brain-health connection.

Be briefly warm (1-2 sentences), don't force a brain-health angle, offer to help with brain-health topics. If user stays off-topic for 3+ exchanges, gently redirect.

=== CRISIS RESPONSE ===

If a user expresses self-harm, suicidal thoughts, or acute crisis: respond warmly without judgment, do not coach or diagnose, and say:
"I hear you, and I'm glad you shared that. This is beyond what I can support — but you can reach the 988 Suicide & Crisis Lifeline anytime by calling or texting 988."

Remain available afterward without processing the crisis.

=== NEVER ===

Make medical claims or diagnoses. Prescribe medications or supplement dosages. Provide therapy. Use urgency or shame language. Promise specific outcomes. Say "rewire your brain," "unlock your potential," "no excuses," or "push through."

=== CONTEXT ===

- Current page: ${page?.label || 'Unknown'} (path: ${page?.path || '/'})
- User summary:
  - Goals: ${goalsText}
  - Habits: ${habitsText}

Use the user's actual data (goals, habits, brain state) to personalize responses. Tailor to readiness score when available (low readiness = lighter suggestions). Suggest neuroplasticity activities when user hasn't tried anything new recently. Recommend regulation tools when user seems stressed. If user asks for a plan, give time-boxed steps (e.g., "10 minutes today").
    `.trim();

    const history = [
      { role: 'system', content: systemPrompt },
      ...messages.map(m => ({ role: m.role, content: m.content })),
    ];

    const completion = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      temperature: 0.7,
      messages: history,
      max_tokens: 600,
    });

    const raw = completion?.choices?.[0]?.message?.content?.trim() || "I couldn't find the right words - try again?";
    const reply = stripMarkdown(raw);
    return res.status(200).json({ reply });
  } catch (err) {
    console.error('ai-chat error:', err);
    return res.status(500).json({ error: 'AI chat failed' });
  }
});

// ✅ Week Recap AI Suggestions (Phase 2)
app.post('/api/week-recap-suggestions', aiLimiter, aiDailyLimiter, validateWeekRecap, async (req, res) => {
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
Each string value must be plain text with no formatting - no markdown, no bold, no italics, no asterisks, no hashtags. Write naturally like a friend would text.
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
      response_format: { type: 'json_object' },
      max_tokens: 800,
    });

    const suggestions = JSON.parse(response.choices?.[0]?.message?.content || '{}');
    // Strip markdown from each suggestion string
    if (suggestions.momentsOfJoy) {
      suggestions.momentsOfJoy = suggestions.momentsOfJoy.map(s => stripMarkdown(s));
    }
    if (suggestions.mindBodyFuel) {
      suggestions.mindBodyFuel = suggestions.mindBodyFuel.map(s => stripMarkdown(s));
    }
    res.status(200).json(suggestions);
  } catch (err) {
    console.error('Week recap AI suggestions error:', err);
    res.status(500).json({ error: 'Failed to generate suggestions' });
  }
});

// Weekly Narrative - AI-generated summary from correlation data
// Receives ONLY anonymized aggregate numbers. No PII.
app.post('/api/weekly-narrative', aiLimiter, aiDailyLimiter, requireAuth, async (req, res) => {
  const { correlationData, bestDay, hardestDay, topCorrelations } = req.body;

  if (!correlationData) {
    return res.status(400).json({ error: 'Missing required field: correlationData' });
  }

  try {
    const systemPrompt = `
You are Vara, a calm and observant wellness companion writing a brief weekly reflection.

Voice rules:
- Write 3-5 sentences maximum. One insight per week, not more.
- Frame every observation positively. Never frame as deficit. Say "You were most consistent on mornings where you started with a protocol" not "You missed 40% of your habits."
- Use conditional, observational language: "this pattern suggests", "it seems like", "you may have noticed". Never "this proves" or "you should".
- Your output is plain text for a mobile app. No markdown, no bold, no italics, no asterisks, no headers, no bullet points.
- Never use em dashes. Use commas or periods instead.
- No scientific jargon. No medical claims.
- If insufficient data to draw a meaningful pattern, respond with exactly: "More patterns will emerge as you use Vara this week."
- Acknowledge effort over outcomes. Consistency matters more than perfection.
- When provided with best/worst day info and correlations, weave them naturally into the narrative. Don't list them mechanically. Example: "Wednesday stood out, with good sleep and energy carrying you through your habits." Not: "Best day: Wednesday. Factors: good sleep, high energy."
- End with one gentle observation or reflection, not a directive or suggestion.
- Tone: warm, brief, like a thoughtful friend who notices patterns without judging.
    `.trim();

    const userPrompt = `
Here is a summary of this person's week (all anonymized, no identifying info):

Sleep average: ${correlationData.sleepAvg ?? 'not tracked'}/5
Mood average: ${correlationData.moodAvg ?? 'not tracked'}/5
Energy average: ${correlationData.energyAvg ?? 'not tracked'}/5
Stress average: ${correlationData.stressAvg ?? 'not tracked'}/5
Habit completion rate: ${correlationData.habitCompletionRate != null ? Math.round(correlationData.habitCompletionRate) + '%' : 'not tracked'}
Focus minutes average: ${correlationData.focusMinutesAvg ?? 'not tracked'} min/day
Days journaled: ${correlationData.journalDays ?? 0} of ${correlationData.totalDays ?? 7}

Key patterns:
${correlationData.sleepHabitCorrelation?.significant ? `- On well-rested days, habit completion was ${correlationData.sleepHabitCorrelation.high}% vs ${correlationData.sleepHabitCorrelation.low}% on poor sleep days` : ''}
${correlationData.journalMoodCorrelation?.significant ? `- Mood averaged ${correlationData.journalMoodCorrelation.journalDayMood} on journal days vs ${correlationData.journalMoodCorrelation.nonJournalDayMood} on non-journal days` : ''}
${correlationData.stressTrend ? `- Stress trend: ${correlationData.stressTrend}` : ''}
${correlationData.brightSpot?.insight ? `- Bright spot: ${correlationData.brightSpot.insight}` : ''}
${correlationData.weekOverWeek?.scoreChange ? `- Wellness score change from last week: ${correlationData.weekOverWeek.scoreChange > 0 ? '+' : ''}${correlationData.weekOverWeek.scoreChange} points` : ''}

Best day: ${bestDay?.day || correlationData.bestDay?.day || 'unknown'} (${bestDay?.factors?.join(', ') || correlationData.bestDay?.factors?.join(', ') || 'not enough data'})
Hardest day: ${hardestDay?.day || correlationData.hardestDay?.day || 'unknown'} (${hardestDay?.factors?.join(', ') || correlationData.hardestDay?.factors?.join(', ') || 'not enough data'})
${topCorrelations?.length ? `\nTop behavioral correlations:\n${topCorrelations.map(c => `- ${c.factor}: ${c.direction} impact of ${c.impact} points`).join('\n')}` : ''}

Write a 3-5 sentence weekly summary based on these patterns.
    `.trim();

    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        { role: 'system', content: systemPrompt },
        { role: 'user', content: userPrompt },
      ],
      temperature: 0.7,
      max_tokens: 400,
    });

    const raw = response.choices?.[0]?.message?.content?.trim() || '';
    res.status(200).json({ narrative: stripMarkdown(raw) });
  } catch (err) {
    console.error('Weekly narrative error:', err);
    res.status(500).json({ error: 'Failed to generate weekly narrative' });
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





// backend/server.js

require('dotenv').config({ path: './backend/.env' });

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const dailyPlanRoute = require('./routes/dailyPlan');
const generateHabitSuggestions = require('./services/habitSuggestionService');
const OpenAI = require('openai');

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/generate-daily-plan', dailyPlanRoute);

// ✅ Habit Suggestions
app.post('/api/openai', async (req, res) => {
  const { goal, modifier = '' } = req.body;

  try {
    const text = await generateHabitSuggestions(goal, modifier);
    res.status(200).json({ text });
  } catch (err) {
    console.error('OpenAI suggestion error:', err);
    res.status(500).json({ error: 'Failed to generate habit suggestions' });
  }
});

// ✅ Journal Prompt Suggestions
app.post('/api/journal-prompt', async (req, res) => {
  const { prompt } = req.body;

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a thoughtful journaling assistant.' },
        { role: 'user', content: prompt }
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

// ✅ Journal Weekly Summary (New Route)
app.post('/api/journal-summary', async (req, res) => {
  const { entries } = req.body;

  if (!entries || entries.trim().length === 0) {
    return res.status(400).json({ error: 'No journal entries provided.' });
  }

  try {
    const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a wellness journal assistant that summarizes weekly reflections.' },
        {
          role: 'user',
          content: `Here are my journal entries from the past week:\n\n${entries}\n\nPlease summarize the main themes, emotions, and any meaningful insights or patterns you notice. Keep it encouraging and brief.`
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

// Health check
app.get('/', (req, res) => {
  res.send('Wellness AI backend is running ✅');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});



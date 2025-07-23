// backend/server.js

require('dotenv').config({ path: './backend/.env' });

const express = require('express');
const cors = require('cors');
const dotenv = require('dotenv');
const dailyPlanRoute = require('./routes/dailyPlan');
const generateHabitSuggestions = require('./services/habitSuggestionService'); // ✅ use your file

// Load environment variables
dotenv.config();

const app = express();
const PORT = process.env.PORT || 5001;

// Middleware
app.use(cors());
app.use(express.json());

// Routes
app.use('/api/generate-daily-plan', dailyPlanRoute);

// ✅ New AI Habit Suggestion route
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

// Health check
app.get('/', (req, res) => {
  res.send('Wellness AI backend is running ✅');
});

// Start server
app.listen(PORT, () => {
  console.log(`🚀 Server listening on port ${PORT}`);
});


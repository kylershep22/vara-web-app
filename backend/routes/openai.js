// backend/routes/openai.js
const express = require('express');
const router = express.Router();
const generateHabitSuggestions = require('../services/habitSuggestionService');

// POST /api/openai
router.post('/', async (req, res) => {
  const { goal, modifier = '' } = req.body;

  if (!goal || !goal.title || !goal.category) {
    return res.status(400).json({ error: 'Invalid goal data' });
  }

  try {
    const text = await generateHabitSuggestions(goal, modifier);
    res.status(200).json({ text });
  } catch (err) {
    console.error('OpenAI Habit Suggestion Error:', err);
    res.status(500).json({ error: 'Failed to fetch AI suggestions' });
  }
});

module.exports = router;


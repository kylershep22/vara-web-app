// backend/routes/journalSummary.js
const express = require('express');
const router = express.Router();
const { Configuration, OpenAIApi } = require('openai');

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

router.post('/journal-summary', async (req, res) => {
  const { entries } = req.body;

  try {
    const prompt = `Summarize the following journal entries from the past week. Highlight common themes, emotions, and any helpful insights:\n\n${entries}`;
    
    const completion = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
    });

    res.json({ text: completion.data.choices[0].message.content });
  } catch (err) {
    console.error('OpenAI Error:', err);
    res.status(500).json({ error: 'Failed to generate summary.' });
  }
});

module.exports = router;

const express = require('express');
const router = express.Router();
const OpenAI = require('openai');

const openai = new OpenAI({ apiKey: process.env.OPENAI_API_KEY });

router.post('/', async (req, res) => {
  const { prompt } = req.body;

  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4',
      messages: [
        { role: 'system', content: 'You are a thoughtful journaling assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    });

    const text = response.choices?.[0]?.message?.content || '';
    res.json({ text });
  } catch (err) {
    console.error('Journal AI prompt error:', err);
    res.status(500).json({ error: 'AI prompt failed' });
  }
});

module.exports = router;

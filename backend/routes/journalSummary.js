// backend/routes/journalSummary.js
const express = require('express');
const router = express.Router();
const { Configuration, OpenAIApi } = require('openai');

const openai = new OpenAIApi(new Configuration({
  apiKey: process.env.OPENAI_API_KEY,
}));

router.post('/journal-summary', async (req, res) => {
  const { entries, structured = false } = req.body;

  try {
    // Enhanced prompt for structured response
    const prompt = structured
      ? `Analyze these journal entries from the past week and return a JSON object with the following structure:
{
  "text": "A warm, insightful 2-3 sentence summary highlighting patterns and progress",
  "moodTrend": "improving" | "stable" | "declining",
  "topThemes": ["theme1", "theme2", "theme3"],
  "wordCount": <total word count>,
  "entryCount": <number of entries>
}

Determine moodTrend by comparing early vs late week mood mentions.
Extract the top 3 recurring themes as single words (e.g., "gratitude", "work", "growth").
Count total words across all entries.

Journal entries:
${entries}

Return ONLY the JSON object, no additional text.`
      : `Summarize the following journal entries from the past week. Highlight common themes, emotions, and any helpful insights:\n\n${entries}`;

    const completion = await openai.createChatCompletion({
      model: 'gpt-4',
      messages: [{ role: 'user', content: prompt }],
      ...(structured && { response_format: { type: 'json_object' } }),
    });

    const responseText = completion.data.choices[0].message.content;

    if (structured) {
      try {
        const parsed = JSON.parse(responseText);
        res.json({
          text: parsed.text || '',
          moodTrend: parsed.moodTrend || 'stable',
          topThemes: parsed.topThemes || [],
          wordCount: parsed.wordCount || 0,
          entryCount: parsed.entryCount || 0,
        });
      } catch (parseErr) {
        // Fallback if JSON parsing fails
        console.error('JSON parse error:', parseErr);
        res.json({
          text: responseText,
          moodTrend: 'stable',
          topThemes: [],
          wordCount: 0,
          entryCount: 0,
        });
      }
    } else {
      res.json({ text: responseText });
    }
  } catch (err) {
    console.error('OpenAI Error:', err);
    res.status(500).json({ error: 'Failed to generate summary.' });
  }
});

module.exports = router;

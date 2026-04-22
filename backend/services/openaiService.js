// backend/services/openaiService.js

const OpenAI = require('openai');
require('dotenv').config();

const stripMarkdown = require('../utils/stripMarkdown');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

module.exports = async function generatePlan({ name, preferences, mood, goals, modifier }) {
  const tone = preferences?.tone || 'gentle';
  const intensity = preferences?.intensity || 'standard';
  const timeOfDay = new Date().getHours();

  const readableGoals = goals.map(g => `${g.title}: ${g.progress}/${g.target} ${g.unit}`).join('\n');
  const moodDescription = mood ? `${mood.emoji} (${mood.label})${mood.note ? ' - ' + mood.note : ''}` : 'No mood check-in yet.';
  const modifierText = modifier ? `User added instruction: ${modifier}` : '';

  const prompt = `You are a compassionate and encouraging wellness coach named Vara, having a natural conversation with a friend.

User: ${name}
Tone: ${tone}
Intensity: ${intensity}
Time of Day: ${timeOfDay < 12 ? 'Morning' : timeOfDay < 18 ? 'Afternoon' : 'Evening'}
Mood: ${moodDescription}
Goals:
${readableGoals}
${modifierText}

WRITING STYLE - THIS IS CRITICAL:
- Your output is displayed as plain text in a mobile app. Never use any formatting.
- No markdown, no bold, no italics, no asterisks, no hashtags, no headers, no bullet points, no numbered lists, no dashes at the start of lines.
- Write like you're texting a supportive friend, not writing an article.
- Suggest 3-5 things naturally, like "First, you could... Then maybe... And when you have a moment..."
- Total response should be under 150 words.
- Be encouraging and personal.

Keep tone ${tone}.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a supportive, empathetic wellness coach. Your output is displayed as plain text in a mobile app. Never use any formatting - no markdown, no bold, no italics, no asterisks, no hashtags, no headers, no bullet points, no numbered lists. Write naturally in flowing sentences like you are texting a friend.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7,
    max_tokens: 1500,
  });

  return stripMarkdown(response.choices[0].message.content);
};


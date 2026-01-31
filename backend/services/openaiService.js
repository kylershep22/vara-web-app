// backend/services/openaiService.js

const OpenAI = require('openai');
require('dotenv').config();

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

  const prompt = `You are a compassionate and encouraging wellness coach named Vara.
Generate a CONCISE personalized daily wellness plan for a user based on their goals, mood, and preferences.

User: ${name}
Tone: ${tone}
Intensity: ${intensity}
Time of Day: ${timeOfDay < 12 ? 'Morning' : timeOfDay < 18 ? 'Afternoon' : 'Evening'}
Mood: ${moodDescription}
Goals:
${readableGoals}
${modifierText}

IMPORTANT: Keep your response brief and scannable.
- Provide 3-5 actionable tasks for today
- Each task should be ONE LINE (max 15 words)
- Use a simple bullet list format (•)
- Total response should be under 150 words
- Be encouraging but concise

Keep tone ${tone}.`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4o',
    messages: [
      { role: 'system', content: 'You are a supportive, empathetic wellness coach.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7
  });

  return response.choices[0].message.content;
};


// backend/services/habitSuggestionService.js
const OpenAI = require('openai');
require('dotenv').config();

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

module.exports = async function generateHabitSuggestions(goal, modifier = '') {
  const prompt = `You are a supportive wellness coach. Based on the following goal data, suggest 3 specific daily wellness habits.
Return a JSON array of objects where each object includes: title, type, frequency, trigger, and reward.

Goal Title: ${goal.title}
Goal Category: ${goal.category}
Target: ${goal.target} ${goal.unit}
Frequency: ${goal.frequency}
Existing Habits: ${goal.habits?.join(', ') || 'None'}

${modifier}
`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      { role: 'system', content: 'You are a wellness coach helping users set habits.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.7
  });

  return response.choices?.[0]?.message?.content;
};


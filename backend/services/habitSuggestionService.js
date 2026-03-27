// backend/services/habitSuggestionService.js
const OpenAI = require('openai');
require('dotenv').config();

const stripMarkdown = require('../utils/stripMarkdown');

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

/**
 * Generate AI-based suggestions based on type and context
 * @param {string} type - 'goals', 'habits', or 'tasks'
 * @param {object} context - { goals: [], habits: [], tasks: [] }
 * @param {string} modifier - Optional user input (focus area, problem, etc.)
 */
module.exports = async function generateHabitSuggestions(type = 'habits', context = {}, modifier = '') {
  let promptIntro = '';

  // Build dynamic prompt based on suggestion type
  if (type === 'goals') {
    promptIntro = `Based on this user's current habits and tasks, suggest 3 impactful new wellness goals they could pursue.\n\n`;
  } else if (type === 'habits') {
    promptIntro = `Based on this user's current goals and tasks, suggest 3 new healthy habits they could adopt to support their goals.\n\n`;
  } else if (type === 'tasks') {
    promptIntro = `Given this user's goals and habits, suggest 3 specific, actionable tasks they could complete today.\n\n`;
  } else {
    promptIntro = `Suggest 3 personalized wellness improvements.`;
  }

  // Add full user context to help OpenAI personalize suggestions
  promptIntro += `Here is their current context:\n${JSON.stringify(context, null, 2)}\n`;

  // Add user-specified modifier/focus if provided
  if (modifier) {
    promptIntro += `\nUser's area of focus or problem: ${modifier}\n`;
  }

  // Instruction for formatting the AI's output
  promptIntro += `\nReturn a JSON array of 3 items. Each should include: title, type, frequency, trigger, and reward.\n`;

  const response = await openai.chat.completions.create({
    model: 'gpt-4',
    messages: [
      {
        role: 'system',
        content: 'You are a wellness and productivity coach helping users improve their lives through small, actionable suggestions. All text values you return will be displayed as plain text in a mobile app. Do not use any formatting - no markdown, no bold, no italics, no asterisks, no hashtags, no headers. Write naturally like a human.'
      },
      {
        role: 'user',
        content: promptIntro
      }
    ],
    temperature: 0.7
  });

  return stripMarkdown(response.choices?.[0]?.message?.content);
};



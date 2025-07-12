const {setGlobalOptions} = require('firebase-functions');
const functions = require('firebase-functions');
const logger = require('firebase-functions/logger');
const admin = require('firebase-admin');
const {Configuration, OpenAIApi} = require('openai');

admin.initializeApp();
setGlobalOptions({maxInstances: 10});

const openai = new OpenAIApi(
  new Configuration({
    apiKey: functions.config().openai.key,
  }),
);

exports.generateHabitSuggestions = functions.https.onCall(
  async (data, context) => {
    const {goal} = data;

    if (!goal || typeof goal !== 'string') {
      throw new functions.https.HttpsError(
        'invalid-argument',
        'Goal must be a string.',
      );
    }

    try {
      const prompt = [
        `A user has the wellness goal: "${goal}".`,
        'Suggest 5 simple daily or weekly habits that will help them achieve this goal.',
        'Be specific and encouraging. Return as a JSON array of short strings.',
      ].join(' ');

      const response = await openai.createChatCompletion({
        model: 'gpt-3.5-turbo',
        messages: [
          {
            role: 'user',
            content: prompt,
          },
        ],
        temperature: 0.7,
      });

      const text = response.data.choices[0].message.content;

      let habits;
      try {
        habits = JSON.parse(text);
      } catch (jsonErr) {
        logger.error('OpenAI response was not valid JSON:', text);
        throw new Error('Invalid response format from OpenAI.');
      }

      if (!Array.isArray(habits)) {
        throw new Error('Expected an array of habits.');
      }

      return {
        suggestions: habits,
      };
    } catch (err) {
      logger.error('generateHabitSuggestions error:', err);
      throw new functions.https.HttpsError(
        'internal',
        'Failed to generate suggestions.',
      );
    }
  },
);



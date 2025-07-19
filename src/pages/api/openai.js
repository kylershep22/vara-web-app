// src/pages/api/openai.js

import { OpenAI } from 'openai';

const openai = new OpenAI({
  apiKey: process.env.OPENAI_API_KEY
});

export default async function handler(req, res) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  const { prompt, systemMessage = '', model = 'gpt-4' } = req.body;

  try {
    const response = await openai.chat.completions.create({
      model,
      messages: [
        { role: 'system', content: systemMessage },
        { role: 'user', content: prompt }
      ],
      temperature: 0.7
    });

    const text = response.choices?.[0]?.message?.content;
    return res.status(200).json({ text });
  } catch (err) {
    console.error('OpenAI API Error:', err);
    return res.status(500).json({ error: 'Failed to fetch AI suggestions' });
  }
}

const { OpenAI } = require('openai');
const config = require('../config/env');

const openai = new OpenAI({
  apiKey: config.openai.apiKey,
});

const generateAiReply = async (messageText, systemPrompt) => {
  try {
    const response = await openai.chat.completions.create({
      model: 'gpt-4o-mini',
      messages: [
        {
          role: 'system',
          content: systemPrompt || 'You are a helpful Instagram DM assistant.',
        },
        {
          role: 'user',
          content: messageText,
        },
      ],
      max_tokens: 200,
      temperature: 0.7,
    });

    let reply = response.choices[0].message.content.trim();

    if (reply.length > 1000) {
      reply = reply.substring(0, 997) + '...';
    }

    return reply;
  } catch (error) {
    console.error('Failed to generate AI reply:', error.message);
    throw new Error('AI reply generation failed');
  }
};

module.exports = {
  generateAiReply,
};

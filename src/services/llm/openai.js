import { ChatOpenAI } from '@langchain/openai';
import { OPENAI_API_KEY } from '../../config/env.js';

/**
 * Centralized OpenAI chat model factory.
 * Keep this as the single place we configure model/temperature/etc.
 */
function getChatModel() {
  if (!OPENAI_API_KEY) {
    throw new Error('Missing OPENAI_API_KEY in environment');
  }

  return new ChatOpenAI({
    apiKey: OPENAI_API_KEY,
    model: 'gpt-4o-mini',
    temperature: 0.2,
  });
}

export { getChatModel };

import { ChatOpenAI } from '@langchain/openai';

/**
 * xAI provides an OpenAI-compatible API. We reuse ChatOpenAI with a baseURL.
 */
function getXaiChatModel({ apiKey, model = 'grok-2-latest' } = {}) {
  const key = apiKey || process.env.XAI_API_KEY;
  if (!key) {
    throw new Error('Missing XAI_API_KEY in environment');
  }

  const baseURL = process.env.XAI_BASE_URL || 'https://api.x.ai/v1';

  return new ChatOpenAI({
    apiKey: key,
    model,
    temperature: 0.2,
    configuration: { baseURL },
  });
}

export { getXaiChatModel };

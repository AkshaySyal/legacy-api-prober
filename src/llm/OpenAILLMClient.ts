import type { LLMClient, LLMMessage } from './LLMClient.js';
import type { ExecDecision } from '../probe_agent/executor.js';

type OpenAIResponse = {
  choices: Array<{
    message: { content: string | null };
  }>;
};

function mustGetEnv(name: string): string {
  const v = process.env[name];
  if (!v) throw new Error(`Missing environment variable: ${name}`);
  return v;
}

function safeJsonParse(content: string): unknown {
  return JSON.parse(content);
}

export class OpenAILLMClient implements LLMClient {
  async decideNextCall(msg: LLMMessage): Promise<ExecDecision> {
    const apiKey = mustGetEnv('OPENAI_API_KEY');

    const res = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'gpt-5',
        temperature: 1,
        max_completion_tokens: 1000,
        messages: [
          { role: 'system', content: msg.system },
          { role: 'user', content: msg.user }
        ],
        reasoning_effort: 'low',
        verbosity: 'low'
      })
    });

    if (!res.ok) {
      const text = await res.text();
      throw new Error(`OpenAI error ${res.status}: ${text}`);
    }

    const data = (await res.json()) as OpenAIResponse;
    const content = data.choices?.[0]?.message?.content;
    if (!content) throw new Error('Empty model response');

    const parsed = safeJsonParse(content) as ExecDecision;
    return parsed;
  }
}

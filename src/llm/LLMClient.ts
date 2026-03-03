import { MockLLMClient } from './MockLLMClient.js';
import { OpenAILLMClient } from './OpenAILLMClient.js';
import type { ExecDecision } from '../probe_agent/executor.js';

export type LLMMessage = { system: string; user: string };

export interface LLMClient {
  decideNextCall(msg: LLMMessage): Promise<ExecDecision>;
}

export function createLLMClient(): LLMClient {
  const provider = process.env.LLM_PROVIDER ?? 'mock';
  if (provider === 'openai') {
    return new OpenAILLMClient();
  }
  return new MockLLMClient();
}

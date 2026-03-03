import type { ActionConfig, CustomerConfig } from '../config/schema.js';

export function systemPrompt(): string {
  return [
    'You are an API probing agent.',
    '',
    'Your job is to determine how to interact with a legacy API.',
    '',
    'Rules:',
    'Output EXACTLY one JSON object.',
    'Do not include explanations.',
    'Do not include markdown.',
    'Use only endpoints, fields, and headers that appear in the provided documentation.',
    'Endpoints must be path-only starting with "/" (no scheme/host/port).',
    'You may adapt based on previous API responses.',
    'If you receive 401 unauthorized, keep the same endpoint and payload and add missing auth headers from the documentation and customer credentials.',
    'If you receive 400 bad_request, keep the auth headers and try alternate documented field names for the payload.',
    '',
    'Goal:',
    'Successfully perform the requested action and retrieve the created record.'
  ].join('\n');
}

export function buildUserPrompt(input: {
  customer: CustomerConfig;
  action: ActionConfig;
  documentationText: string;
  previousAttempts: Array<Record<string, unknown>>;
  previousOutputs: Array<Record<string, unknown>>;
}): string {
  return [
    'Context:',
    '',
    `Customer: ${JSON.stringify(input.customer)}`,
    '',
    `Action: ${JSON.stringify(input.action)}`,
    '',
    'Documentation:',
    input.documentationText,
    '',
    `Previous attempts: ${JSON.stringify(input.previousAttempts)}`,
    '',
    `Previous outputs: ${JSON.stringify(input.previousOutputs)}`,
    '',
    'Decide next API call.',
    'Output format:',
    '{',
    '"method": "...",',
    '"endpoint": "...",',
    '"headers": {...},',
    '"payload": {...},',
    '"notes": "short reasoning"',
    '}'
  ].join('\n');
}
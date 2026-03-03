import type { LLMClient, LLMMessage } from './LLMClient.js';
import type { ExecDecision } from '../probe_agent/executor.js';

function extractBetween(text: string, startLabel: string, endLabel: string): string | null {
  const start = text.indexOf(startLabel);
  if (start < 0) return null;
  const afterStart = text.slice(start + startLabel.length);
  const end = afterStart.indexOf(endLabel);
  if (end < 0) return null;
  return afterStart.slice(0, end).trim();
}

function extractJsonBlock(text: string, startLabel: string, endLabel: string): any | null {
  const block = extractBetween(text, startLabel, endLabel);
  if (!block) return null;
  return JSON.parse(block);
}

function containsAny(haystack: string, needles: string[]): boolean {
  return needles.some((n) => haystack.includes(n));
}

export class MockLLMClient implements LLMClient {
  async decideNextCall(msg: LLMMessage): Promise<ExecDecision> {
    const customer = extractJsonBlock(msg.user, 'Customer: ', '\n\nAction:') ?? {};
    const action = extractJsonBlock(msg.user, 'Action: ', '\n\nDocumentation:') ?? {};
    const prevOutputs =
      extractJsonBlock(msg.user, 'Previous outputs: ', '\n\nDecide next API call.') ?? [];

    const version = customer.installedVersion as 'v1.1' | 'v1.2';
    const actionId = action.id as 'create_order' | 'create_invoice';

    const last =
      Array.isArray(prevOutputs) && prevOutputs.length > 0 ? prevOutputs[prevOutputs.length - 1] : null;
    const lastStatus = last?.status as number | undefined;

    const docs = msg.user;

    const headers: Record<string, string> = {};
    if (containsAny(docs, ['X-Api-Key'])) headers['X-Api-Key'] = customer.credentials?.apiKey;
    if (containsAny(docs, ['X-Client-Token']) && version === 'v1.2')
      headers['X-Client-Token'] = customer.credentials?.clientToken;

    if (lastStatus === 401) {
      if (version === 'v1.2') {
        headers['X-Api-Key'] = customer.credentials?.apiKey;
        headers['X-Client-Token'] = customer.credentials?.clientToken;
      } else {
        headers['X-Api-Key'] = customer.credentials?.apiKey;
      }
    }

    const isFirstAttempt = !last;

    if (actionId === 'create_order') {
      const bootstrapEndpoint = version === 'v1.1' ? '/order_bootstrap' : '/order_template';
      const field = version === 'v1.1' ? 'commodity_code_id' : 'commodity_id';

      if (isFirstAttempt) {
        return { method: 'GET', endpoint: bootstrapEndpoint, headers, payload: {}, notes: 'Fetch order template' };
      }

      if (lastStatus === 200 && last?.body && typeof last.body === 'object') {
        const body = last.body as any;
        const payload = {
          customer_ref: body.customer_ref,
          [field]: body[field] ?? body['commodity_code_id'] ?? body['commodity_id'],
          amount: body.amount
        };
        return { method: 'PUT', endpoint: '/orders', headers, payload, notes: 'Create order from template' };
      }

      if (lastStatus === 400) {
        return { method: 'GET', endpoint: bootstrapEndpoint, headers, payload: {}, notes: 'Retry template' };
      }

      return { method: 'GET', endpoint: bootstrapEndpoint, headers, payload: {}, notes: 'Retry template' };
    }

    const bootstrapEndpoint = version === 'v1.1' ? '/invoice_bootstrap' : '/invoice_template';
    const field = version === 'v1.1' ? 'line_item_code' : 'line_item_id';

    if (isFirstAttempt) {
      return { method: 'GET', endpoint: bootstrapEndpoint, headers, payload: {}, notes: 'Fetch invoice template' };
    }

    if (lastStatus === 200 && last?.body && typeof last.body === 'object') {
      const body = last.body as any;
      const payload = {
        customer_ref: body.customer_ref,
        [field]: body[field] ?? body['line_item_code'] ?? body['line_item_id'],
        total: body.total
      };
      return { method: 'PUT', endpoint: '/invoices', headers, payload, notes: 'Create invoice from template' };
    }

    if (lastStatus === 400) {
      return { method: 'GET', endpoint: bootstrapEndpoint, headers, payload: {}, notes: 'Retry template' };
    }

    return { method: 'GET', endpoint: bootstrapEndpoint, headers, payload: {}, notes: 'Retry template' };
  }
}

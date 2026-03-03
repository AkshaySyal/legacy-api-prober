import type { CustomerConfig } from '../config/schema.js';
import type { ExecDecision, ExecResult } from './executor.js';

export type ValidationResult =
  | { ok: true; readBack: unknown }
  | { ok: false; reason: 'validation_failed' | 'read_failed'; readBack?: unknown };

function isObject(x: unknown): x is Record<string, unknown> {
  return typeof x === 'object' && x !== null;
}

export class Validator {
  async validateCreate(input: {
    customer: CustomerConfig;
    writeDecision: ExecDecision;
    writeResult: ExecResult;
    entity: 'order' | 'invoice';
  }): Promise<ValidationResult> {
    if (!isObject(input.writeResult.body)) return { ok: false, reason: 'validation_failed' };
    const id = (input.writeResult.body as Record<string, unknown>)['id'];
    if (typeof id !== 'string') return { ok: false, reason: 'validation_failed' };

    const baseUrl = input.customer.baseUrlByVersion[input.customer.installedVersion];
    const readEndpoint = input.entity === 'order' ? `/orders/${id}` : `/invoices/${id}`;

    const url = new URL(readEndpoint, baseUrl).toString();

    const res = await fetch(url, {
      method: 'GET',
      headers: input.writeDecision.headers
    });

    const text = await res.text();
    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    if (res.status !== 200) {
      return { ok: false, reason: 'read_failed', readBack: body };
    }

    if (!isObject(body) || !isObject(input.writeDecision.payload)) {
      return { ok: false, reason: 'validation_failed', readBack: body };
    }

    for (const [k, v] of Object.entries(input.writeDecision.payload)) {
      if ((body as Record<string, unknown>)[k] !== v) {
        return { ok: false, reason: 'validation_failed', readBack: body };
      }
    }

    return { ok: true, readBack: body };
  }
}

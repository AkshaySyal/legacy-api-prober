import type { CustomerConfig } from '../config/schema.js';

export type ExecDecision = {
  method: string;
  endpoint: string;
  headers: Record<string, string>;
  payload: Record<string, unknown> | null;
  notes: string;
};

export type ExecResult = {
  status: number;
  body: unknown;

  finalUrl: string;
  finalMethod: string;
  finalHeaders: Record<string, string>;
  finalBody: string | null;
};

function normalizeEndpoint(endpoint: string): string {
  const raw = String(endpoint ?? '').trim();
  if (!raw) return '/';

  // If the model returns a full URL, discard scheme/host and keep only path+query.
  if (raw.startsWith('http://') || raw.startsWith('https://')) {
    const u = new URL(raw);
    const path = u.pathname || '/';
    const query = u.search || '';
    return (path.startsWith('/') ? path : `/${path}`) + query;
  }

  // Ensure leading slash for relative paths.
  if (raw.startsWith('/')) return raw;
  return `/${raw}`;
}

export class Executor {
  async run(customer: CustomerConfig, decision: ExecDecision): Promise<ExecResult> {
    const baseUrl = customer.baseUrlByVersion[customer.installedVersion];
    if (!baseUrl) throw new Error(`Missing baseUrl for version ${customer.installedVersion}`);

    const endpoint = normalizeEndpoint(decision.endpoint);
    const finalUrl = new URL(endpoint, baseUrl).toString();

    const finalMethod = String(decision.method || 'GET').toUpperCase();

    const finalHeaders: Record<string, string> = {
      'Content-Type': 'application/json',
      ...decision.headers
    };

    const init: RequestInit = { method: finalMethod, headers: finalHeaders };

    let finalBody: string | null = null;

    // Do not send a body for GET/HEAD
    if (decision.payload && finalMethod !== 'GET' && finalMethod !== 'HEAD') {
      finalBody = JSON.stringify(decision.payload);
      init.body = finalBody;
    }

    const res = await fetch(finalUrl, init);
    const text = await res.text();

    let body: unknown = null;
    try {
      body = text ? JSON.parse(text) : null;
    } catch {
      body = text;
    }

    return {
      status: res.status,
      body,
      finalUrl,
      finalMethod,
      finalHeaders,
      finalBody
    };
  }
}
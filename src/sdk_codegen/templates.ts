import type { Profile } from './types.js';

export function indexTemplate(): string {
  return `export type CustomerConfig = {
  id: string;
  installedVersion: 'v1.1' | 'v1.2';
  baseUrlByVersion: Record<string, string>;
  credentials: { apiKey: string; clientToken: string };
};

export type CreateResult<T> = { id: string; record: T };

import { createOrderV11, createInvoiceV11 } from './adapters/v1_1.js';
import { createOrderV12, createInvoiceV12 } from './adapters/v1_2.js';

export async function createOrder(customer: CustomerConfig): Promise<CreateResult<any>> {
  if (customer.installedVersion === 'v1.1') return createOrderV11(customer);
  return createOrderV12(customer);
}

export async function createInvoice(customer: CustomerConfig): Promise<CreateResult<any>> {
  if (customer.installedVersion === 'v1.1') return createInvoiceV11(customer);
  return createInvoiceV12(customer);
}
`;
}

function adapterHeaderBlock(version: 'v1.1' | 'v1.2'): string {
  const needsToken = version === 'v1.2';
  return `import type { CustomerConfig, CreateResult } from '../index.js';

function headersFor(customer: CustomerConfig): Record<string, string> {
  const h: Record<string, string> = { 'Content-Type': 'application/json', 'X-Api-Key': customer.credentials.apiKey };
  ${needsToken ? "h['X-Client-Token'] = customer.credentials.clientToken;" : ''}
  return h;
}

async function json(res: Response): Promise<any> {
  const t = await res.text();
  try { return t ? JSON.parse(t) : null; } catch { return t; }
}
`;
}

export function adapterTemplate(version: 'v1.1' | 'v1.2', profiles: Profile[]): string {
  const order = profiles.find((p) => p.version === version && p.action === 'create_order');
  const invoice = profiles.find((p) => p.version === version && p.action === 'create_invoice');

  const orderField = order?.payloadKeys.includes('commodity_id') ? 'commodity_id' : 'commodity_code_id';
  const invoiceField = invoice?.payloadKeys.includes('line_item_id') ? 'line_item_id' : 'line_item_code';

  return `${adapterHeaderBlock(version)}

export async function createOrder${version === 'v1.1' ? 'V11' : 'V12'}(customer: CustomerConfig): Promise<CreateResult<any>> {
  const baseUrl = customer.baseUrlByVersion[customer.installedVersion];
  const h = headersFor(customer);

  const payload: any = {
    customer_ref: customer.id,
    amount: 125,
    ${orderField}: 'COMMODITY_CODE_001'
  };

  const writeRes = await fetch(new URL('/orders', baseUrl), { method: 'PUT', headers: h, body: JSON.stringify(payload) });
  const writeBody = await json(writeRes);
  if (writeRes.status !== 201 || !writeBody?.id) throw new Error('create_failed');

  const readRes = await fetch(new URL('/orders/' + writeBody.id, baseUrl), { method: 'GET', headers: h });
  const record = await json(readRes);
  if (readRes.status !== 200) throw new Error('read_failed');

  return { id: writeBody.id, record };
}

export async function createInvoice${version === 'v1.1' ? 'V11' : 'V12'}(customer: CustomerConfig): Promise<CreateResult<any>> {
  const baseUrl = customer.baseUrlByVersion[customer.installedVersion];
  const h = headersFor(customer);

  const payload: any = {
    customer_ref: customer.id,
    total: 999,
    ${invoiceField}: 'LINE_ITEM_CODE_001'
  };

  const writeRes = await fetch(new URL('/invoices', baseUrl), { method: 'PUT', headers: h, body: JSON.stringify(payload) });
  const writeBody = await json(writeRes);
  if (writeRes.status !== 201 || !writeBody?.id) throw new Error('create_failed');

  const readRes = await fetch(new URL('/invoices/' + writeBody.id, baseUrl), { method: 'GET', headers: h });
  const record = await json(readRes);
  if (readRes.status !== 200) throw new Error('read_failed');

  return { id: writeBody.id, record };
}
`;
}
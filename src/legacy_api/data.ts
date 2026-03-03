import { randomUUID } from 'node:crypto';
import type {
  OrderRecordV11,
  OrderRecordV12,
  InvoiceRecordV11,
  InvoiceRecordV12
} from './types.js';

export const ordersV11 = new Map<string, OrderRecordV11>();
export const invoicesV11 = new Map<string, InvoiceRecordV11>();

export const ordersV12 = new Map<string, OrderRecordV12>();
export const invoicesV12 = new Map<string, InvoiceRecordV12>();

export const VALID_API_KEYS = new Set(['A_API_KEY', 'B_API_KEY']);
export const VALID_CLIENT_TOKENS = new Set(['A_CLIENT_TOKEN', 'B_CLIENT_TOKEN']);

export function id(): string {
  return randomUUID();
}

export function customerRefFromApiKey(apiKey: string): string {
  if (apiKey === 'A_API_KEY') return 'customerA_ref';
  if (apiKey === 'B_API_KEY') return 'customerB_ref';
  return 'unknown_customer_ref';
}

import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { ActionsSchema, CustomersSchema } from './schema.js';

export function loadCustomers() {
  const p = join(process.cwd(), 'data', 'customers.json');
  const raw = JSON.parse(readFileSync(p, 'utf-8'));
  return CustomersSchema.parse(raw);
}

export function saveCustomers(customers: unknown) {
  const p = join(process.cwd(), 'data', 'customers.json');
  writeFileSync(p, JSON.stringify(customers, null, 2) + '\n', 'utf-8');
}

export function loadActions() {
  const p = join(process.cwd(), 'data', 'actions.json');
  const raw = JSON.parse(readFileSync(p, 'utf-8'));
  return ActionsSchema.parse(raw);
}

import { createServerV11 } from '../src/legacy_api/server_v1_1.js';
import { createServerV12 } from '../src/legacy_api/server_v1_2.js';
import { probeCommand } from '../src/commands/probe.js';
import { readFileSync, writeFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';

function loadCustomers(): any {
  return JSON.parse(readFileSync(join(process.cwd(), 'data', 'customers.json'), 'utf-8'));
}

function saveCustomers(obj: any): void {
  writeFileSync(join(process.cwd(), 'data', 'customers.json'), JSON.stringify(obj, null, 2) + '\n', 'utf-8');
}

async function importSdk(): Promise<any> {
  jest.resetModules();
  // @ts-ignore
  const mod = await import('../generated/sdk/index.ts');
  return mod as any;
}

test('generated SDK works for both versions and upgrade scenario', async () => {

  rmSync(join(process.cwd(), 'generated'), { recursive: true, force: true });

  const s1 = createServerV11(4011);
  const s2 = createServerV12(4012);

  const original = loadCustomers();

  try {
    await probeCommand();

    const sdk1 = await importSdk();
    const customers1 = loadCustomers().customers;

    const a = customers1.find((c: any) => c.id === 'customerA');
    const b = customers1.find((c: any) => c.id === 'customerB');

    const orderA = await sdk1.createOrder(a);
    expect(orderA.record.commodity_code_id).toBeDefined();

    const orderB = await sdk1.createOrder(b);
    expect(orderB.record.commodity_code_id).toBeDefined();

    const invA = await sdk1.createInvoice(a);
    expect(invA.record.line_item_code).toBeDefined();

    const invB = await sdk1.createInvoice(b);
    expect(invB.record.line_item_code).toBeDefined();

    const upgraded = loadCustomers();
    upgraded.customers = upgraded.customers.map((c: any) =>
      c.id === 'customerA' ? { ...c, installedVersion: 'v1.2' } : c
    );
    saveCustomers(upgraded);

    await probeCommand();

    const sdk2 = await importSdk();
    const customers2 = loadCustomers().customers;

    const a2 = customers2.find((c: any) => c.id === 'customerA');
    const b2 = customers2.find((c: any) => c.id === 'customerB');

    const orderA2 = await sdk2.createOrder(a2);
    expect(orderA2.record.commodity_code_id).toBeDefined();

    const orderB2 = await sdk2.createOrder(b2);
    expect(orderB2.record.commodity_code_id).toBeDefined();

    const invA2 = await sdk2.createInvoice(a2);
    expect(invA2.record.line_item_code).toBeDefined();

    const invB2 = await sdk2.createInvoice(b2);
    expect(invB2.record.line_item_code).toBeDefined();
  } finally {
    saveCustomers(original);
    await s1.close();
    await s2.close();
  }
}, 120000);
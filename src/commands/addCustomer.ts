import { loadCustomers, saveCustomers } from '../config/loader.js';
import { CustomersSchema } from '../config/schema.js';

export async function addCustomerCommand(input: {
  id: string;
  installedVersion: string;
  apiKey: string;
  clientToken: string;
}): Promise<void> {
  const customers = loadCustomers();

  const existing = customers.customers.find((c) => c.id === input.id);
  if (existing) {
    throw new Error(`Customer already exists: ${input.id}`);
  }

  const installedVersion = input.installedVersion;
  if (installedVersion !== 'v1.1' && installedVersion !== 'v1.2') {
    throw new Error(`installedVersion must be v1.1 or v1.2`);
  }

  customers.customers.push({
    id: input.id,
    installedVersion,
    baseUrlByVersion: {
      'v1.1': 'http://localhost:4011',
      'v1.2': 'http://localhost:4012'
    },
    credentials: {
      apiKey: input.apiKey,
      clientToken: input.clientToken
    }
  });

  CustomersSchema.parse(customers);
  saveCustomers(customers);
}

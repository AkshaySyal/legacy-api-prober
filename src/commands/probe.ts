import { loadCustomers, loadActions } from '../config/loader.js';
import { readAllDocs } from '../docs/parser.js';
import { createLLMClient } from '../llm/LLMClient.js';
import { ProbeAgent } from '../probe_agent/agent.js';
import { writeFileSync, mkdirSync } from 'node:fs';
import { join } from 'node:path';
import { generateSdk } from '../sdk_codegen/generateSdk.js';

export async function probeCommand(): Promise<void> {
  const customers = loadCustomers();
  const actions = loadActions();
  const docsText = readAllDocs();

  const llm = createLLMClient();

  const agent = new ProbeAgent(llm);

  const profiles: any[] = [];

  for (const customer of customers.customers) {
    for (const action of actions.actions) {
      const result = await agent.run({
        customer,
        action,
        documentationText: docsText
      });

      profiles.push(result.profile);
    }
  }

  mkdirSync(join(process.cwd(), 'generated'), { recursive: true });
  const profilePath = join(process.cwd(), 'generated', 'profile.json');
  writeFileSync(profilePath, JSON.stringify({ profiles }, null, 2) + '\n', 'utf-8');

  await generateSdk({ profiles });
}

import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import type { ProfilesFile, Profile } from './types.js';
import { indexTemplate, adapterTemplate } from './templates.js';

export async function generateSdk(input: ProfilesFile): Promise<void> {
  const outDir = join(process.cwd(), 'generated', 'sdk');
  const adaptersDir = join(outDir, 'adapters');

  mkdirSync(adaptersDir, { recursive: true });

  const profiles = input.profiles as Profile[];

  writeFileSync(join(outDir, 'index.ts'), indexTemplate(), 'utf-8');
  writeFileSync(join(adaptersDir, 'v1_1.ts'), adapterTemplate('v1.1', profiles), 'utf-8');
  writeFileSync(join(adaptersDir, 'v1_2.ts'), adapterTemplate('v1.2', profiles), 'utf-8');
}

import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';
import { ParsedDocs, mergeDocsTexts } from './model.js';

export function readDocsDir(): ParsedDocs {
  const dir = join(process.cwd(), 'docs');
  const files = readdirSync(dir).filter((f) => f.endsWith('.txt'));
  const texts: Record<string, string> = {};
  for (const f of files) {
    texts[f] = readFileSync(join(dir, f), 'utf-8');
  }
  return { texts };
}

export function readAllDocs(): string {
  const parsed = readDocsDir();
  return mergeDocsTexts(parsed.texts);
}

export type ParsedDocs = {
  texts: Record<string, string>;
};

export function mergeDocsTexts(texts: Record<string, string>): string {
  return Object.entries(texts)
    .map(([name, txt]) => `--- ${name} ---\n${txt}`)
    .join('\n\n');
}

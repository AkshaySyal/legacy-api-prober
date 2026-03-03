import fs from "node:fs/promises";

export async function research_documentation(paths: string[]) {
  console.log("\n[agent] research_documentation(): starting doc research…");
  for (const p of paths) {
    console.log(`[agent] researching: ${p}`);
    await new Promise((r) => setTimeout(r, 120));
  }
  console.log("[agent] research_documentation(): done.\n");

  const docs = await Promise.all(paths.map((p) => fs.readFile(p, "utf-8")));
  return docs.join("\n\n---\n\n");
}
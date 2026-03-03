import OpenAI from "openai";

export async function llmSuggestVariants(args: {
  docsText: string;
  version: string;
  actions: string[];
}) {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) {
    console.log("[agent] (llm) OPENAI_API_KEY not set; using heuristic variants.");
    return null;
  }

  const client = new OpenAI({ apiKey });

  console.log("[agent] (llm) asking OpenAI for likely pitfalls + variants…");

  const prompt = `
You are helping probe a legacy API where documentation may be incorrect.

Given documentation and target actions, propose:
- possible content types (json vs xml)
- possible endpoint method alternatives (POST vs PUT)
- possible parameter name alternatives (commodity_code_id vs commodity_id; quantity vs qty)
- possible prerequisite steps (like GET template before create)

Return ONLY raw JSON.
Do NOT include markdown.
Do NOT include explanation.
Do NOT wrap in code blocks.
The response must be valid JSON that can be parsed directly with JSON.parse().

Return exactly this shape:

{
  "contentTypeHints": ["json"|"xml"],
  "createOrderMethodHints": ["POST"|"PUT"],
  "commodityFieldHints": ["string"],
  "quantityFieldHints": ["string"],
  "prereqHints": ["string"]
}

Docs:
${args.docsText}

Target actions: ${args.actions.join(", ")}
Version: ${args.version}
`;

  const resp = await client.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [{ role: "user", content: prompt }],
    temperature: 0.2
  });

  const text = resp.choices[0]?.message?.content ?? "";
  try {
    // Extract first JSON object if model adds stray text
    const match = text.match(/\{[\s\S]*\}/);
    if (match) {
      return JSON.parse(match[0]);
    }
    return JSON.parse(text);
  } catch {
    console.log("[agent] (llm) Could not parse JSON from model; ignoring.");
    return null;
  }
}
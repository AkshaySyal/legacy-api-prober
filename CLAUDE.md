# Claude Code Instructions (Legacy API Prober)

You are operating inside a TypeScript repository that demonstrates:
- two legacy API servers (v1.1 and v1.2),
- an LLM-driven probe agent (ReAct loop),
- deterministic SDK generation from discovered profiles,
- Jest tests covering baseline + upgrade.

## Safety and execution rules
- Do NOT run any shell commands unless the user explicitly says: `run: <command>`.
- Do NOT modify files not listed in "Repo map" unless necessary; if necessary, explain why.
- Before writing code, output a short plan with:
  1) files to change,
  2) what will change,
  3) how to validate (commands to run).
- Prefer minimal diffs.
- Keep console output and telemetry constraints intact unless asked.

## Repo map (important files)
### Docs
- `docs/v1.1.txt` (accurate doc for v1.1)
- `docs/v1.2.txt` (problematic doc for v1.2; includes drift / inconsistencies)

### Legacy API simulation
- `src/legacy_api/server_v1_1.ts`
- `src/legacy_api/server_v1_2.ts`
- `src/legacy_api/types.ts`
- `src/legacy_api/data.ts`

### Probe agent (ReAct loop)
- `src/probe_agent/agent.ts` (controls attempt loop, telemetry, debug gate via PROBE_DEBUG)
- `src/probe_agent/executor.ts` (executes HTTP; must normalize endpoint paths and always use customer's base URL)
- `src/probe_agent/validator.ts` (read-back validation)
- `src/probe_agent/telemetry.ts` (one-line telemetry; must remain exactly one line per attempt)
- `src/probe_agent/attemptTree.ts`

### LLM layer
- `src/llm/prompts.ts` (system prompt + user prompt template; endpoint must be path-only)
- `src/llm/OpenAILLMClient.ts`
- `src/llm/LLMClient.ts`

### SDK codegen (must not use LLM)
- `src/sdk_codegen/generateSdk.ts`
- `src/sdk_codegen/templates.ts`
- `src/sdk_codegen/types.ts`
Generated output:
- `generated/profile.json`
- `generated/sdk/*`

### CLI / commands / config
- `src/cli.ts`
- `src/commands/probe.ts`
- `src/commands/addCustomer.ts`
- `src/config/schema.ts`
- `src/config/loader.ts`
Inputs:
- `data/customers.json`
- `data/actions.json`

### Tests
- `tests/unit.docsParser.test.ts` (docs vocabulary presence)
- `tests/e2e.generatedSdk.test.ts` (baseline + upgrade + SDK verification)

## Core invariants to preserve
- Probe loop: max attempts = 15.
- Telemetry: exactly one telemetry line per attempt.
- SDK generation: deterministic, no LLM use.
- v1.1: requires only `X-Api-Key`.
- v1.2: requires `X-Api-Key` + `X-Client-Token`.
- Probe validation: successful write must be read back and compared; validation success prints `VALIDATED`.

## How to add a customer
When asked to add a customer:
1) Update `data/customers.json` by appending to `customers[]`.
2) Ensure `baseUrlByVersion` includes v1.1 and v1.2 URLs.
3) Ensure credentials include `apiKey` and `clientToken`.
4) If `add-customer` CLI exists (`src/commands/addCustomer.ts`), keep it consistent with schema.

Validation steps (do not run unless user says `run:`):
- `npm test` (preferred)
- optionally `LLM_PROVIDER=openai OPENAI_API_KEY=... npm run probe`

## How to add a new business action (most common multi-file change)
An "action" here means a new business capability like `create_shipment` or `create_payment`.

When asked to add an action, you must update ALL relevant layers:

A) Inputs
- `data/actions.json`: add new action definition.

B) Legacy API servers (both versions)
- Add write endpoint (e.g., `PUT /shipments`) returning `{ id }`.
- Add read endpoint (e.g., `GET /shipments/:id`) returning the stored record.
- Update `src/legacy_api/types.ts` to define record types for v1.1 and v1.2.
- Update `src/legacy_api/data.ts` to add in-memory Maps for the new entity per version.

C) Documentation
- `docs/v1.1.txt`: add accurate description for the new action.
- `docs/v1.2.txt`: add a problematic description (include plausible inconsistencies), while keeping auth drift accurate.

D) Probe/validation
- Ensure validator supports entity read-back route selection; extend if entity names expand.
- Ensure agent can probe new endpoints (this is typically prompt + docs; executor/validator handle mechanics).

E) SDK generation
- Update `src/sdk_codegen/templates.ts` so the generated SDK exports a new function, and adapters implement it.
- Update `src/sdk_codegen/types.ts` / profile representation if the new action requires additional discovered info.

F) Tests
- Extend `tests/e2e.generatedSdk.test.ts` to cover the new action for baseline and upgrade.
- If docs parser test checks vocab, ensure required new field variants appear somewhere.

Always produce a checklist of files changed + quick reasoning.

## Output format for code changes
- Provide exact file paths and full code blocks for changed files or minimal diff blocks, as the user requests.
- Keep formatting consistent with the repo (TypeScript ESM imports, etc.).
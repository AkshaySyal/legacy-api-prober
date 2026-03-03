import type { ActionConfig, CustomerConfig } from '../config/schema.js';
import type { LLMClient } from '../llm/LLMClient.js';
import { systemPrompt, buildUserPrompt } from '../llm/prompts.js';
import { Executor } from './executor.js';
import { Validator } from './validator.js';
import { telemetryLine } from './telemetry.js';
import { createAttemptTree, addAttempt } from './attemptTree.js';

function truncateHistory(nodes: Array<Record<string, unknown>>, max = 12): Array<Record<string, unknown>> {
  return nodes.slice(-max);
}

function pretty(obj: unknown): string {
  return JSON.stringify(obj, null, 2);
}

export class ProbeAgent {
  private executor = new Executor();
  private validator = new Validator();

  constructor(private llm: LLMClient) {}

  async run(input: { customer: CustomerConfig; action: ActionConfig; documentationText: string }): Promise<{
    profile: Record<string, unknown>;
  }> {
    const maxAttempts = 15;
    const attemptTree = createAttemptTree();
    const previousAttempts: Array<Record<string, unknown>> = [];
    const previousOutputs: Array<Record<string, unknown>> = [];

    const debug = process.env.PROBE_DEBUG === '1';

    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      const userPrompt = buildUserPrompt({
        customer: input.customer,
        action: input.action,
        documentationText: input.documentationText,
        previousAttempts: truncateHistory(previousAttempts),
        previousOutputs: truncateHistory(previousOutputs)
      });

      const decision = await this.llm.decideNextCall({
        system: systemPrompt(),
        user: userPrompt
      });

      const execRes = await this.executor.run(input.customer, decision);

      if (debug) {
        // Pretty debug block: shows exactly what was executed and what came back.
        // eslint-disable-next-line no-console
        console.log(
          [
            '--- DEBUG REQUEST ---',
            `customer=${input.customer.id} version=${input.customer.installedVersion} action=${input.action.id} attempt=${attempt}/${maxAttempts}`,
            `method=${execRes.finalMethod}`,
            `url=${execRes.finalUrl}`,
            `headers=${pretty(execRes.finalHeaders)}`,
            `payloadKeys=${Object.keys(decision.payload ?? {}).join(',')}`,
            `notes=${decision.notes}`,
            `body=${execRes.finalBody ?? ''}`,
            '--- DEBUG RESPONSE ---',
            `status=${execRes.status}`,
            `body=${pretty(execRes.body)}`,
            '----------------------'
          ].join('\n')
        );
      }

      addAttempt(attemptTree, {
        attempt,
        method: decision.method,
        endpoint: decision.endpoint,
        status: execRes.status,
        responseBody: execRes.body
      });

      // Feed the real decision back to the LLM.
      previousAttempts.push({ attempt, decision });
      previousOutputs.push({ attempt, status: execRes.status, body: execRes.body });

      let resultLabel = String(execRes.status);

      if (execRes.status === 201 && (decision.method === 'PUT' || decision.method === 'POST')) {
        const validation = await this.validator.validateCreate({
          customer: input.customer,
          writeDecision: decision,
          writeResult: execRes,
          entity: input.action.entity
        });

        resultLabel = validation.ok ? 'VALIDATED' : validation.reason;

        if (validation.ok) {
          const profile = {
            customerId: input.customer.id,
            action: input.action.id,
            version: input.customer.installedVersion,
            endpoint: decision.endpoint,
            headers: decision.headers,
            payloadKeys: Object.keys(decision.payload ?? {})
          };

          const line = telemetryLine({
            customerId: input.customer.id,
            version: input.customer.installedVersion,
            actionId: input.action.id,
            attempt,
            maxAttempts,
            method: decision.method,
            endpoint: decision.endpoint,
            result: resultLabel
          });
          // eslint-disable-next-line no-console
          console.log(line);

          return { profile };
        }
      }

      const line = telemetryLine({
        customerId: input.customer.id,
        version: input.customer.installedVersion,
        actionId: input.action.id,
        attempt,
        maxAttempts,
        method: decision.method,
        endpoint: decision.endpoint,
        result: resultLabel
      });
      // eslint-disable-next-line no-console
      console.log(line);
    }

    throw new Error(`Probe failed for customer=${input.customer.id} action=${input.action.id}`);
  }
}
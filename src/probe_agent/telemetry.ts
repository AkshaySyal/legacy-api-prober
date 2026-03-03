export function telemetryLine(input: {
  customerId: string;
  version: string;
  actionId: string;
  attempt: number;
  maxAttempts: number;
  method: string;
  endpoint: string;
  result: string;
}): string {
  return `[customer=${input.customerId}] [version=${input.version}] [action=${input.actionId}] [attempt=${input.attempt}/${input.maxAttempts}] [method=${input.method}] [endpoint=${input.endpoint}] [result=${input.result}]`;
}

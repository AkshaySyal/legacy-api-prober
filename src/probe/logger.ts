import fs from "node:fs/promises";

export type ProbeLogEvent =
  | { ts: string; type: "start"; customerId: string; version: string; actions: string[] }
  | { ts: string; type: "access_analysis"; needsWrite: boolean }
  | {
      ts: string;
      type: "candidates";
      contentTypes: string[];
      methods: string[];
      commodityFields: string[];
      quantityFields: string[];
    }
  | { ts: string; type: "prereq_probe"; endpoint: string; ok: boolean; status: number }
  | {
      ts: string;
      type: "attempt";
      action: string;
      variant: Record<string, any>;
      request: { method: string; path: string; contentType?: string };
      response: { ok: boolean; status: number; sample?: string };
      note?: string;
    }
  | { ts: string; type: "validated"; what: string; ok: boolean; details?: any }
  | { ts: string; type: "discovered"; discovered: any }
  | { ts: string; type: "error"; message: string; stack?: string };

// ✅ DISTRIBUTIVE OMIT over a union:
type WithoutTs<T> = T extends any ? Omit<T, "ts"> : never;
export type ProbeLogEventInput = WithoutTs<ProbeLogEvent>;

export class ProbeLogger {
  private events: ProbeLogEvent[] = [];
  constructor(private readonly logPath: string) {}

  add(event: ProbeLogEventInput) {
    this.events.push({ ts: new Date().toISOString(), ...(event as any) });
  }

  async flush() {
    await fs.mkdir("generated", { recursive: true });
    await fs.writeFile(this.logPath, JSON.stringify({ events: this.events }, null, 2), "utf-8");
  }
}
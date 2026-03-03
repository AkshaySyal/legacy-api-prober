import { createV1App } from "../server/v1";
import { createV2App } from "../server/v2";
import { research_documentation } from "./research";
import { probeCustomerInstallation } from "./prober";
import type { Action, Credentials } from "./variants.js";

let s1: any, s2: any;

beforeAll(async () => {
  const v1 = createV1App();
  const v2 = createV2App();
  await new Promise<void>((r) => (s1 = v1.listen(4011, () => r())));
  await new Promise<void>((r) => (s2 = v2.listen(4012, () => r())));
});

afterAll(async () => {
  await new Promise<void>((r) => s1.close(() => r()));
  await new Promise<void>((r) => s2.close(() => r()));
});

test("prober works on v2 even when v2 docs are wrong (POST vs PUT, commodity_id vs commodity_code_id, xml vs json, template step)", async () => {
  const docsText = await research_documentation(["docs/legacy_v1.txt", "docs/legacy_v2.txt"]);

  const actions: Action[] = [
    { type: "create_order", input: { commodity: "RICE", quantity: 5 } },
    { type: "read_invoice", input: { invoice_id: "inv_seed_v2" } },
    { type: "post_invoice", input: { amount: 10.25 } }
  ];

  const creds: Credentials = {
    kind: "v2",
    customerId: "customer_b",
    oauthToken: "B_V2_OAUTH",
    twoFactor: "654321",
    specialHeader: "B-SPECIAL"
  };

  const out = await probeCustomerInstallation({
    customerId: "customer_b",
    version: "v2",
    credentials: creds,
    docsText,
    actions,
    logPath: "generated/probe-log-test-customer_b-v2.json"
  });

  expect(out.discovered.contentType).toBe("xml");
  expect(out.discovered.createOrderMethod).toBe("PUT");
  expect(out.outputs.posted_invoice_id).toBeTruthy();
});

test("prober works on v1 as documented (json + POST + commodity_code_id)", async () => {
  const docsText = await research_documentation(["docs/legacy_v1.txt", "docs/legacy_v2.txt"]);

  const actions: Action[] = [
    { type: "create_order", input: { commodity: "CORN", quantity: 2 } },
    { type: "read_invoice", input: { invoice_id: "inv_seed_v1" } }
  ];

  const creds: Credentials = { kind: "v1", customerId: "customer_a", apiToken: "A_V1_TOKEN" };

  const out = await probeCustomerInstallation({
    customerId: "customer_a",
    version: "v1",
    credentials: creds,
    docsText,
    actions,
    logPath: "generated/probe-log-test-customer_a-v1.json"
  });

  expect(out.discovered.contentType).toBe("json");
  expect(out.discovered.createOrderMethod).toBe("POST");
});
import { research_documentation } from "./research";
import { probeCustomerInstallation } from "./prober";
import { generateSdk } from "./sdkGenerator";
import type { Action, Credentials } from "./variants";

async function main() {
  const docsText = await research_documentation(["docs/legacy_v1.txt", "docs/legacy_v2.txt"]);

  // requested actions (v1 seed invoice id)
  const actionsV1: Action[] = [
    { type: "create_order", input: { commodity: "CORN", quantity: 7 } },
    { type: "read_invoice", input: { invoice_id: "inv_seed_v1" } },
    { type: "post_invoice", input: { amount: 99.5 } }
  ];

  const discoveredByCustomer: Record<string, any> = {};

  // Customer B stays on v1
  const customerB_creds: Credentials = { kind: "v1", customerId: "customer_b", apiToken: "B_V1_TOKEN" };
  const b = await probeCustomerInstallation({
    customerId: "customer_b",
    version: "v1",
    credentials: customerB_creds,
    docsText,
    actions: actionsV1,
    logPath: "generated/probe-log-customer_b-v1.json"
  });
  discoveredByCustomer["customer_b"] = b.discovered;

  // Customer A initially v1
  const customerA_v1_creds: Credentials = { kind: "v1", customerId: "customer_a", apiToken: "A_V1_TOKEN" };
  const a1 = await probeCustomerInstallation({
    customerId: "customer_a",
    version: "v1",
    credentials: customerA_v1_creds,
    docsText,
    actions: actionsV1,
    logPath: "generated/probe-log-customer_a-v1.json"
  });
  discoveredByCustomer["customer_a"] = a1.discovered;

  // Simulate Customer A upgrade to v2
  console.log("\n[demo] --- Simulating customer_a upgrade: v1 -> v2 ---");

  const actionsV2: Action[] = [
    { type: "create_order", input: { commodity: "WHEAT", quantity: 3 } },
    { type: "read_invoice", input: { invoice_id: "inv_seed_v2" } },
    { type: "post_invoice", input: { amount: 123.45 } }
  ];

  const customerA_v2_creds: Credentials = {
    kind: "v2",
    customerId: "customer_a",
    oauthToken: "A_V2_OAUTH",
    twoFactor: "123456",
    specialHeader: "A-SPECIAL"
  };

  const a2 = await probeCustomerInstallation({
    customerId: "customer_a",
    version: "v2",
    credentials: customerA_v2_creds,
    docsText,
    actions: actionsV2,
    logPath: "generated/probe-log-customer_a-v2.json"
  });
  discoveredByCustomer["customer_a"] = a2.discovered;

  // Generate multi-customer SDK
  await generateSdk({ discoveredByCustomer });

  console.log("\n[demo] Done. Logs are in /generated. SDK is generated/sdk.ts");
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
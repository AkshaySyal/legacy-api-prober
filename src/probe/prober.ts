import type { Action, Credentials, CustomerId, LegacyVersion } from "./variants";
import { defaultVariantCandidates } from "./variants";
import { llmSuggestVariants } from "./llm";
import { ProbeLogger } from "./logger";

function buildXml(fields: Record<string, string | number>) {
  const inner = Object.entries(fields)
    .map(([k, v]) => `<${k}>${String(v)}</${k}>`)
    .join("");
  return `<request>${inner}</request>`;
}

function parseSimpleXml(xml: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<([a-zA-Z0-9_:-]+)>([^<]*)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out[m[1]] = m[2];
  return out;
}

async function http(req: {
  baseUrl: string;
  method: string;
  path: string;
  headers: Record<string, string>;
  body?: string;
}) {
  const url = `${req.baseUrl}${req.path}`;
  const res = await fetch(url, { method: req.method, headers: req.headers, body: req.body });
  const text = await res.text();
  return { ok: res.ok, status: res.status, text };
}

function credHeaders(creds: Credentials): Record<string, string> {
  if (creds.kind === "v1") {
    return { "x-customer-id": creds.customerId, "x-api-token": creds.apiToken };
  }
  return {
    "x-customer-id": creds.customerId,
    authorization: `Bearer ${creds.oauthToken}`,
    "x-2fa-code": creds.twoFactor,
    "x-special-header": creds.specialHeader
  };
}

export async function probeCustomerInstallation(args: {
  customerId: CustomerId;
  version: LegacyVersion;
  credentials: Credentials;
  docsText: string;
  actions: Action[];
  logPath?: string; // NEW
}) {
  console.log(`\n[agent] ===== Probing start: customer=${args.customerId} version=${args.version} =====`);
  const logPath = args.logPath ?? `generated/probe-log-${args.customerId}-${args.version}.json`;
  const logger = new ProbeLogger(logPath);

  logger.add({
    type: "start",
    customerId: args.customerId,
    version: args.version,
    actions: args.actions.map((a) => a.type)
  });

  try {
    const needsWrite = args.actions.some((a) => a.type === "create_order" || a.type === "post_invoice");
    console.log(`[agent] Access analysis: needsWrite=${needsWrite} (based on requested actions)`);
    logger.add({ type: "access_analysis", needsWrite });

    const baseVariants = defaultVariantCandidates(args.version);
    const llm = await llmSuggestVariants({
      docsText: args.docsText,
      version: args.version,
      actions: args.actions.map((a) => a.type)
    });

    if (llm) {
      console.log("[agent] (llm) parsed hints:", llm);
    }

    const contentTypeHints: ("json" | "xml")[] =
      (llm?.contentTypeHints?.filter((x: any) => x === "json" || x === "xml") ?? []) as any;
    const createMethodHints: ("POST" | "PUT")[] =
      (llm?.createOrderMethodHints?.filter((x: any) => x === "POST" || x === "PUT") ?? []) as any;

    const contentTypeCandidates = [
      ...new Set([...(contentTypeHints.length ? contentTypeHints : []), ...baseVariants.contentTypeCandidates])
    ];

    const createMethodCandidates = [
      ...new Set([...(createMethodHints.length ? createMethodHints : []), ...baseVariants.createMethodCandidates])
    ];

    const commodityFieldCandidates = [
      ...new Set([...(llm?.commodityFieldHints ?? []), ...baseVariants.commodityFieldCandidates])
    ].filter(Boolean);

    const quantityFieldCandidates = [
      ...new Set([...(llm?.quantityFieldHints ?? []), ...baseVariants.quantityFieldCandidates])
    ].filter(Boolean);

    console.log("[agent] Candidate content-types:", contentTypeCandidates.join(", "));
    console.log("[agent] Candidate create-order methods:", createMethodCandidates.join(", "));
    console.log("[agent] Candidate commodity fields:", commodityFieldCandidates.join(", "));
    console.log("[agent] Candidate quantity fields:", quantityFieldCandidates.join(", "));

    logger.add({
      type: "candidates",
      contentTypes: contentTypeCandidates,
      methods: createMethodCandidates,
      commodityFields: commodityFieldCandidates,
      quantityFields: quantityFieldCandidates
    });

    const baseUrl = args.version === "v1" ? "http://localhost:4011" : "http://localhost:4012";
    const authHeaders = credHeaders(args.credentials);

    // Probe prerequisite
    let requiresTemplate = false;
    if (args.version === "v2") {
      console.log("[agent] Probing for prerequisite: GET /order-template …");
      const r = await http({ baseUrl, method: "GET", path: "/order-template", headers: { ...authHeaders } });
      logger.add({ type: "prereq_probe", endpoint: "GET /order-template", ok: r.ok, status: r.status });

      if (r.ok) {
        requiresTemplate = true;
        console.log("[agent] Prerequisite confirmed: /order-template exists and succeeded.");
      } else {
        console.log(`[agent] /order-template not required or failed (status=${r.status}). Continuing.`);
      }
    }

    const discovered: any = {
      version: args.version,
      baseUrl,
      contentType: null as null | "json" | "xml",
      createOrderMethod: null as null | "POST" | "PUT",
      createOrderCommodityField: null as null | string,
      createOrderQuantityField: null as null | string,
      requiresTemplate
    };

    const outputs: any = {};

    for (const action of args.actions) {
      if (action.type === "create_order") {
        console.log(`[agent] Action: create_order commodity=${action.input.commodity} quantity=${action.input.quantity}`);

        if (requiresTemplate) {
          console.log("[agent] Step: calling GET /order-template (required) …");
          const t = await http({ baseUrl, method: "GET", path: "/order-template", headers: { ...authHeaders } });
          if (!t.ok) throw new Error(`template step failed: ${t.status} ${t.text}`);
        }

        let success = false;

        for (const ct of contentTypeCandidates) {
          for (const method of createMethodCandidates) {
            for (const commodityField of commodityFieldCandidates) {
              for (const quantityField of quantityFieldCandidates) {
                console.log(`[agent] Trying create-order variant: ct=${ct} method=${method} ${commodityField},${quantityField}`);

                const headers: Record<string, string> = { ...authHeaders };
                let body: string | undefined;

                if (ct === "json") {
                  headers["content-type"] = "application/json";
                  body = JSON.stringify({ [commodityField]: action.input.commodity, [quantityField]: action.input.quantity });
                } else {
                  headers["content-type"] = "application/xml";
                  body = buildXml({ [commodityField]: action.input.commodity, [quantityField]: action.input.quantity });
                }

                const resp = await http({ baseUrl, method, path: "/orders", headers, body });

                logger.add({
                  type: "attempt",
                  action: "create_order",
                  variant: { ct, method, commodityField, quantityField, requiresTemplate },
                  request: { method, path: "/orders", contentType: ct },
                  response: { ok: resp.ok, status: resp.status, sample: resp.text.slice(0, 180) }
                });

                if (!resp.ok) {
                  console.log(`[agent] → failed status=${resp.status}`);
                  continue;
                }

                // parse order_id
                let order_id: string | undefined;
                if (ct === "json") {
                  const parsed = JSON.parse(resp.text);
                  order_id = parsed.order_id;
                } else {
                  const fields = parseSimpleXml(resp.text);
                  order_id = fields["order_id"];
                }
                if (!order_id) {
                  console.log("[agent] → success response but could not parse order_id; continuing.");
                  continue;
                }

                // validate by reading back
                console.log(`[agent] Validating: read back order_id=${order_id}`);
                const read = await http({
                  baseUrl,
                  method: "GET",
                  path: `/orders/${order_id}`,
                  headers: { ...authHeaders, accept: ct === "json" ? "application/json" : "application/xml" }
                });

                if (!read.ok) {
                  logger.add({ type: "validated", what: `readback order ${order_id}`, ok: false, details: { status: read.status } });
                  console.log("[agent] → readback failed; continuing.");
                  continue;
                }

                let commodityBack: string | undefined;
                let quantityBack: number | undefined;

                if (ct === "json") {
                  const rb = JSON.parse(read.text);
                  commodityBack = rb.commodity_code_id ?? rb.commodity_id;
                  quantityBack = rb.quantity;
                } else {
                  const rb = parseSimpleXml(read.text);
                  commodityBack = rb["commodity_code_id"] || rb["commodity_id"];
                  quantityBack = Number(rb["quantity"]);
                }

                if (commodityBack !== action.input.commodity || quantityBack !== action.input.quantity) {
                  logger.add({
                    type: "validated",
                    what: `readback order ${order_id}`,
                    ok: false,
                    details: { commodityBack, quantityBack, expected: action.input }
                  });
                  console.log(`[agent] → readback mismatch; continuing.`);
                  continue;
                }

                logger.add({
                  type: "validated",
                  what: `readback order ${order_id}`,
                  ok: true,
                  details: { commodityBack, quantityBack }
                });

                console.log(`[agent] ✅ create_order succeeded with ct=${ct} method=${method} commodityField=${commodityField} quantityField=${quantityField}`);

                discovered.contentType = ct;
                discovered.createOrderMethod = method;
                discovered.createOrderCommodityField = commodityField;
                discovered.createOrderQuantityField = quantityField;

                outputs.created_order_id = order_id;
                success = true;
                break;
              }
              if (success) break;
            }
            if (success) break;
          }
          if (success) break;
        }

        if (!success) throw new Error("Could not find a working create_order variant");
      }

      if (action.type === "read_invoice") {
        console.log(`[agent] Action: read_invoice invoice_id=${action.input.invoice_id}`);
        const ct = discovered.contentType ?? (args.version === "v1" ? "json" : "xml");
        const r = await http({
          baseUrl,
          method: "GET",
          path: `/invoices/${action.input.invoice_id}`,
          headers: { ...authHeaders, accept: ct === "json" ? "application/json" : "application/xml" }
        });
        if (!r.ok) throw new Error(`read_invoice failed: ${r.status} ${r.text}`);
        outputs.read_invoice_raw = r.text;
        console.log("[agent] ✅ read_invoice succeeded");
      }

      if (action.type === "post_invoice") {
        console.log(`[agent] Action: post_invoice amount=${action.input.amount}`);
        const ct = discovered.contentType ?? (args.version === "v1" ? "json" : "xml");
        const headers: Record<string, string> = { ...authHeaders };
        let body: string;

        if (ct === "json") {
          headers["content-type"] = "application/json";
          body = JSON.stringify({ amount: action.input.amount });
        } else {
          headers["content-type"] = "application/xml";
          body = buildXml({ amount: action.input.amount });
        }

        const r = await http({ baseUrl, method: "POST", path: "/invoices", headers, body });
        if (!r.ok) throw new Error(`post_invoice failed: ${r.status} ${r.text}`);

        let invoice_id: string | undefined;
        if (ct === "json") invoice_id = JSON.parse(r.text).invoice_id;
        else invoice_id = parseSimpleXml(r.text)["invoice_id"];

        if (!invoice_id) throw new Error("post_invoice succeeded but invoice_id missing");

        console.log(`[agent] Validating: read back invoice_id=${invoice_id}`);
        const rr = await http({
          baseUrl,
          method: "GET",
          path: `/invoices/${invoice_id}`,
          headers: { ...authHeaders, accept: ct === "json" ? "application/json" : "application/xml" }
        });

        if (!rr.ok) throw new Error(`post_invoice readback failed: ${rr.status} ${rr.text}`);

        outputs.posted_invoice_id = invoice_id;
        logger.add({ type: "validated", what: `readback invoice ${invoice_id}`, ok: true });
        console.log("[agent] ✅ post_invoice validated");
      }
    }

    logger.add({ type: "discovered", discovered });
    console.log(`[agent] ===== Probing done: discovered=`, discovered);
    return { discovered, outputs };
  } catch (e: any) {
    logger.add({ type: "error", message: String(e?.message ?? e), stack: e?.stack });
    throw e;
  } finally {
    await logger.flush();
    console.log(`[agent] 🧾 reasoning log written: ${logPath}`);
  }
}
/**
 * AUTO-GENERATED SDK
 * Supports multiple customers + versions by reading generated/manifest.json at runtime.
 */

import fs from "node:fs";

type CustomerId = string;

function loadManifest(): any {
  const raw = fs.readFileSync(new URL("./manifest.json", import.meta.url), "utf-8");
  return JSON.parse(raw);
}

function buildXml(fields: Record<string, string | number>) {
  const inner = Object.entries(fields).map(([k,v]) => `<${k}>${String(v)}</${k}>`).join("");
  return `<request>${inner}</request>`;
}
function parseSimpleXml(xml: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<([a-zA-Z0-9_:-]+)>([^<]*)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) out[m[1]] = m[2];
  return out;
}

export type V1Creds = { kind: "v1"; customerId: CustomerId; apiToken: string };
export type V2Creds = { kind: "v2"; customerId: CustomerId; oauthToken: string; twoFactor: string; specialHeader: string };
export type Creds = V1Creds | V2Creds;

function authHeaders(creds: Creds) {
  if (creds.kind === "v1") return { "x-customer-id": creds.customerId, "x-api-token": creds.apiToken };
  return {
    "x-customer-id": creds.customerId,
    authorization: `Bearer ${creds.oauthToken}`,
    "x-2fa-code": creds.twoFactor,
    "x-special-header": creds.specialHeader
  };
}

async function http(baseUrl: string, method: string, path: string, headers: Record<string,string>, body?: string) {
  const res = await fetch(`${baseUrl}${path}`, { method, headers, body });
  const text = await res.text();
  if (!res.ok) throw new Error(`HTTP ${res.status}: ${text}`);
  return text;
}

export function createClient(customerId: CustomerId, creds: Creds) {
  const manifest = loadManifest();
  const conf = manifest[customerId];
  if (!conf) throw new Error("Unknown customerId in manifest. Re-run probe tool.");

  const baseUrl = conf.baseUrl as string;
  const ct = conf.contentType as ("json"|"xml");

  return {
    async createOrder(input: { commodity: string; quantity: number }) {
      const headers: Record<string,string> = { ...authHeaders(creds) };
      if (ct === "json") {
        headers["content-type"] = "application/json";
        const body = JSON.stringify({
          [conf.createOrderCommodityField]: input.commodity,
          [conf.createOrderQuantityField]: input.quantity
        });
        const txt = await http(baseUrl, conf.createOrderMethod, "/orders", headers, body);
        return JSON.parse(txt);
      } else {
        headers["content-type"] = "application/xml";
        if (conf.requiresTemplate) await http(baseUrl, "GET", "/order-template", { ...authHeaders(creds) });
        const body = buildXml({
          [conf.createOrderCommodityField]: input.commodity,
          [conf.createOrderQuantityField]: input.quantity
        });
        const txt = await http(baseUrl, conf.createOrderMethod, "/orders", headers, body);
        return parseSimpleXml(txt);
      }
    },

    async getOrder(order_id: string) {
      const headers: Record<string,string> = { ...authHeaders(creds), accept: ct === "json" ? "application/json" : "application/xml" };
      const txt = await http(baseUrl, "GET", `/orders/${order_id}`, headers);
      return ct === "json" ? JSON.parse(txt) : parseSimpleXml(txt);
    },

    async readInvoice(invoice_id: string) {
      const headers: Record<string,string> = { ...authHeaders(creds), accept: ct === "json" ? "application/json" : "application/xml" };
      const txt = await http(baseUrl, "GET", `/invoices/${invoice_id}`, headers);
      return ct === "json" ? JSON.parse(txt) : parseSimpleXml(txt);
    },

    async postInvoice(amount: number) {
      const headers: Record<string,string> = { ...authHeaders(creds) };
      if (ct === "json") {
        headers["content-type"] = "application/json";
        const txt = await http(baseUrl, "POST", "/invoices", headers, JSON.stringify({ amount }));
        const inv = JSON.parse(txt);
        await http(baseUrl, "GET", `/invoices/${inv.invoice_id}`, { ...authHeaders(creds), accept: "application/json" });
        return inv;
      } else {
        headers["content-type"] = "application/xml";
        const txt = await http(baseUrl, "POST", "/invoices", headers, buildXml({ amount }));
        const inv = parseSimpleXml(txt);
        await http(baseUrl, "GET", `/invoices/${inv.invoice_id}`, { ...authHeaders(creds), accept: "application/xml" });
        return inv;
      }
    }
  };
}

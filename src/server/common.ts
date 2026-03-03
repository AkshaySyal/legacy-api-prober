export type CustomerId = "customer_a" | "customer_b";
export type LegacyVersion = "v1" | "v2";

export const customers = {
  customer_a: {
    v1: { apiToken: "A_V1_TOKEN" },
    v2: { oauthToken: "A_V2_OAUTH", twoFactor: "123456", specialHeader: "A-SPECIAL" }
  },
  customer_b: {
    v1: { apiToken: "B_V1_TOKEN" },
    v2: { oauthToken: "B_V2_OAUTH", twoFactor: "654321", specialHeader: "B-SPECIAL" }
  }
} as const;

export function jsonError(res: any, status: number, message: string) {
  res.status(status).json({ error: message });
}

export function escapeXml(s: string) {
  return s.replaceAll("&", "&amp;").replaceAll("<", "&lt;").replaceAll(">", "&gt;");
}

export function xmlError(res: any, status: number, message: string) {
  res.status(status).type("application/xml").send(`<error>${escapeXml(message)}</error>`);
}

export function parseSimpleXml(xml: string): Record<string, string> {
  const out: Record<string, string> = {};
  const re = /<([a-zA-Z0-9_:-]+)>([^<]*)<\/\1>/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(xml))) {
    out[m[1]] = m[2];
  }
  return out;
}

export function buildOrderXml(order: any) {
  return `<order>
  <order_id>${escapeXml(order.order_id)}</order_id>
  <status>${escapeXml(order.status)}</status>
  <commodity_code_id>${escapeXml(order.commodity_code_id ?? "")}</commodity_code_id>
  <commodity_id>${escapeXml(order.commodity_id ?? "")}</commodity_id>
  <quantity>${String(order.quantity ?? "")}</quantity>
</order>`;
}

export function buildInvoiceXml(inv: any) {
  return `<invoice>
  <invoice_id>${escapeXml(inv.invoice_id)}</invoice_id>
  <amount>${String(inv.amount)}</amount>
  <status>${escapeXml(inv.status)}</status>
</invoice>`;
}
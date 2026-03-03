export type Action =
  | { type: "create_order"; input: { commodity: string; quantity: number } }
  | { type: "read_order"; input: { order_id: string } }
  | { type: "read_invoice"; input: { invoice_id: string } }
  | { type: "post_invoice"; input: { amount: number } };

export type CustomerId = "customer_a" | "customer_b";
export type LegacyVersion = "v1" | "v2";

export type Credentials =
  | { kind: "v1"; customerId: CustomerId; apiToken: string }
  | { kind: "v2"; customerId: CustomerId; oauthToken: string; twoFactor: string; specialHeader: string };

export function defaultVariantCandidates(version: LegacyVersion) {
  if (version === "v1") {
    return {
      createMethodCandidates: ["POST"] as const,
      contentTypeCandidates: ["json"] as const,
      commodityFieldCandidates: ["commodity_code_id", "commodity_id"],
      quantityFieldCandidates: ["quantity", "qty"]
    };
  }
  return {
    createMethodCandidates: ["POST", "PUT"] as const, // docs wrong; try both
    contentTypeCandidates: ["json", "xml"] as const,  // docs wrong; try both
    commodityFieldCandidates: ["commodity_id", "commodity_code_id"], // docs wrong order
    quantityFieldCandidates: ["qty", "quantity"] // docs wrong order
  };
}
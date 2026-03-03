import express from "express";
import {
  customers,
  xmlError,
  parseSimpleXml,
  buildOrderXml,
  buildInvoiceXml
} from "./common";

export function createV2App() {
  const app = express();
  app.use(express.text({ type: "*/*" }));

  const orders = new Map<string, any>();
  const invoices = new Map<string, any>();
  const templatesIssued = new Set<string>();

  function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const customerId = req.header("x-customer-id");
    if (!customerId || (customerId !== "customer_a" && customerId !== "customer_b")) {
      return xmlError(res, 401, "missing/invalid x-customer-id");
    }

    const authz = req.header("authorization") ?? "";
    const twofa = req.header("x-2fa-code");
    const special = req.header("x-special-header");

    const expected = customers[customerId].v2;
    if (authz !== `Bearer ${expected.oauthToken}`) return xmlError(res, 401, "invalid oauth token");
    if (twofa !== expected.twoFactor) return xmlError(res, 401, "invalid 2fa");
    if (special !== expected.specialHeader) return xmlError(res, 401, "missing/invalid x-special-header");

    (req as any).customerId = customerId;
    next();
  }

  app.get("/order-template", auth, (req, res) => {
    const customerId = (req as any).customerId as string;
    templatesIssued.add(customerId);
    res.type("application/xml").send(`<template>
      <required>commodity_code_id</required>
      <required>quantity</required>
    </template>`);
  });

  // docs say POST; reality is PUT
  app.put("/orders", auth, (req, res) => {
    const customerId = (req as any).customerId as string;
    if (!templatesIssued.has(customerId)) return xmlError(res, 428, "must call GET /order-template first");

    const xml = String(req.body ?? "");
    const fields = parseSimpleXml(xml);

    const commodity_code_id = fields["commodity_code_id"];
    const quantityStr = fields["quantity"];

    if (!commodity_code_id) return xmlError(res, 400, "commodity_code_id required");
    const quantity = Number(quantityStr);
    if (!Number.isFinite(quantity)) return xmlError(res, 400, "quantity must be number");

    const order_id = `ord_v2_${Math.random().toString(16).slice(2)}`;
    const order = { order_id, status: "created", commodity_code_id, quantity };
    orders.set(order_id, order);
    res.status(201).type("application/xml").send(buildOrderXml(order));
  });

  app.get("/orders/:order_id", auth, (req, res) => {
    const order = orders.get(req.params.order_id);
    if (!order) return xmlError(res, 404, "order not found");
    res.type("application/xml").send(buildOrderXml(order));
  });

  app.get("/invoices/:invoice_id", auth, (req, res) => {
    const inv = invoices.get(req.params.invoice_id);
    if (!inv) return xmlError(res, 404, "invoice not found");
    res.type("application/xml").send(buildInvoiceXml(inv));
  });

  app.post("/invoices", auth, (req, res) => {
    const xml = String(req.body ?? "");
    const fields = parseSimpleXml(xml);
    const amount = Number(fields["amount"]);
    if (!Number.isFinite(amount)) return xmlError(res, 400, "amount must be number");
    const invoice_id = `inv_v2_${Math.random().toString(16).slice(2)}`;
    const inv = { invoice_id, amount, status: "unpaid" };
    invoices.set(invoice_id, inv);
    res.status(201).type("application/xml").send(buildInvoiceXml(inv));
  });

  invoices.set("inv_seed_v2", { invoice_id: "inv_seed_v2", amount: 420.0, status: "unpaid" });

  return app;
}
import express from "express";
import { customers, jsonError } from "./common";

export function createV1App() {
  const app = express();
  app.use(express.json());

  const orders = new Map<string, any>();
  const invoices = new Map<string, any>();

  function auth(req: express.Request, res: express.Response, next: express.NextFunction) {
    const customerId = req.header("x-customer-id");
    const token = req.header("x-api-token");
    if (!customerId || (customerId !== "customer_a" && customerId !== "customer_b")) {
      return jsonError(res, 401, "missing/invalid x-customer-id");
    }
    const expected = customers[customerId].v1.apiToken;
    if (token !== expected) return jsonError(res, 401, "invalid x-api-token");
    (req as any).customerId = customerId;
    next();
  }

  app.post("/orders", auth, (req, res) => {
    const { commodity_code_id, quantity } = req.body ?? {};
    if (typeof commodity_code_id !== "string") return jsonError(res, 400, "commodity_code_id required");
    if (typeof quantity !== "number") return jsonError(res, 400, "quantity must be number");

    const order_id = `ord_v1_${Math.random().toString(16).slice(2)}`;
    const order = { order_id, status: "created", commodity_code_id, quantity };
    orders.set(order_id, order);
    res.status(201).json(order);
  });

  app.get("/orders/:order_id", auth, (req, res) => {
    const order = orders.get(req.params.order_id);
    if (!order) return jsonError(res, 404, "order not found");
    res.json(order);
  });

  app.get("/invoices/:invoice_id", auth, (req, res) => {
    const inv = invoices.get(req.params.invoice_id);
    if (!inv) return jsonError(res, 404, "invoice not found");
    res.json(inv);
  });

  app.post("/invoices", auth, (req, res) => {
    const { amount } = req.body ?? {};
    if (typeof amount !== "number") return jsonError(res, 400, "amount must be number");
    const invoice_id = `inv_v1_${Math.random().toString(16).slice(2)}`;
    const inv = { invoice_id, amount, status: "unpaid" };
    invoices.set(invoice_id, inv);
    res.status(201).json(inv);
  });

  // seed invoice for read demo
  invoices.set("inv_seed_v1", { invoice_id: "inv_seed_v1", amount: 199.0, status: "unpaid" });

  return app;
}
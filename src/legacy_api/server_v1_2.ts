import express from 'express';
import {
  ordersV12,
  invoicesV12,
  VALID_API_KEYS,
  VALID_CLIENT_TOKENS,
  customerRefFromApiKey,
  id
} from './data.js';
import type { ErrorBody, OrderRecordV12, InvoiceRecordV12 } from './types.js';

export type ServerHandle = { close: () => Promise<void> };

function unauthorized(res: express.Response) {
  const body: ErrorBody = { error: 'unauthorized' };
  res.status(401).json(body);
}

function badRequest(res: express.Response) {
  const body: ErrorBody = { error: 'bad_request' };
  res.status(400).json(body);
}

function notFound(res: express.Response) {
  const body: ErrorBody = { error: 'not_found' };
  res.status(404).json(body);
}

function authOk(req: express.Request): boolean {
  const apiKey = req.header('X-Api-Key');
  const clientToken = req.header('X-Client-Token');
  if (!apiKey) return false;
  if (!VALID_API_KEYS.has(apiKey)) return false;
  if (!clientToken) return false;
  return VALID_CLIENT_TOKENS.has(clientToken);
}

export function createServerV12(port = 4012): ServerHandle {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    if (!authOk(req)) return unauthorized(res);
    next();
  });

  // NOTE: customerRefFromApiKey remains available for realism, but no longer used by a template route.

  // Real v1.2 behavior: field names did NOT change for write/read, only auth changed.
  // Orders still require commodity_code_id (not commodity_id).
  app.put('/orders', (req, res) => {
    const body = req.body as Partial<OrderRecordV12>;
    if (
      typeof body.customer_ref !== 'string' ||
      typeof body.commodity_code_id !== 'string' ||
      typeof body.amount !== 'number'
    ) {
      return badRequest(res);
    }
    const newId = id();
    const rec: OrderRecordV12 = {
      id: newId,
      customer_ref: body.customer_ref,
      commodity_code_id: body.commodity_code_id,
      amount: body.amount
    };
    ordersV12.set(newId, rec);
    res.status(201).json({ id: newId });
  });

  app.get('/orders/:id', (req, res) => {
    const rec = ordersV12.get(req.params.id);
    if (!rec) return notFound(res);
    res.json(rec);
  });

  // Invoices still require line_item_code (not line_item_id).
  app.put('/invoices', (req, res) => {
    const body = req.body as Partial<InvoiceRecordV12>;
    if (
      typeof body.customer_ref !== 'string' ||
      typeof body.line_item_code !== 'string' ||
      typeof body.total !== 'number'
    ) {
      return badRequest(res);
    }
    const newId = id();
    const rec: InvoiceRecordV12 = {
      id: newId,
      customer_ref: body.customer_ref,
      line_item_code: body.line_item_code,
      total: body.total
    };
    invoicesV12.set(newId, rec);
    res.status(201).json({ id: newId });
  });

  app.get('/invoices/:id', (req, res) => {
    const rec = invoicesV12.get(req.params.id);
    if (!rec) return notFound(res);
    res.json(rec);
  });

  const server = app.listen(port);

  return {
    close: () =>
      new Promise<void>((resolve, reject) => {
        server.close((err) => (err ? reject(err) : resolve()));
      })
  };
}

if (process.argv[1] && process.argv[1].includes('server_v1_2')) {
  createServerV12(4012);
  // eslint-disable-next-line no-console
  console.log('Legacy API v1.2 listening on http://localhost:4012');
}
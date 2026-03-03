import express from 'express';
import {
  ordersV11,
  invoicesV11,
  VALID_API_KEYS,
  customerRefFromApiKey,
  id
} from './data.js';
import type { ErrorBody, OrderRecordV11, InvoiceRecordV11 } from './types.js';

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
  if (!apiKey) return false;
  return VALID_API_KEYS.has(apiKey);
}

export function createServerV11(port = 4011): ServerHandle {
  const app = express();
  app.use(express.json());

  app.use((req, res, next) => {
    if (!authOk(req)) return unauthorized(res);
    next();
  });

  // NOTE: customerRefFromApiKey remains available for realism, but no longer used by a bootstrap route.
  // It can still be used by clients if they choose to align customer_ref with API key identity.

  app.put('/orders', (req, res) => {
    const body = req.body as Partial<OrderRecordV11>;
    if (
      typeof body.customer_ref !== 'string' ||
      typeof body.commodity_code_id !== 'string' ||
      typeof body.amount !== 'number'
    ) {
      return badRequest(res);
    }
    const newId = id();
    const rec: OrderRecordV11 = {
      id: newId,
      customer_ref: body.customer_ref,
      commodity_code_id: body.commodity_code_id,
      amount: body.amount
    };
    ordersV11.set(newId, rec);
    res.status(201).json({ id: newId });
  });

  app.get('/orders/:id', (req, res) => {
    const rec = ordersV11.get(req.params.id);
    if (!rec) return notFound(res);
    res.json(rec);
  });

  app.put('/invoices', (req, res) => {
    const body = req.body as Partial<InvoiceRecordV11>;
    if (
      typeof body.customer_ref !== 'string' ||
      typeof body.line_item_code !== 'string' ||
      typeof body.total !== 'number'
    ) {
      return badRequest(res);
    }
    const newId = id();
    const rec: InvoiceRecordV11 = {
      id: newId,
      customer_ref: body.customer_ref,
      line_item_code: body.line_item_code,
      total: body.total
    };
    invoicesV11.set(newId, rec);
    res.status(201).json({ id: newId });
  });

  app.get('/invoices/:id', (req, res) => {
    const rec = invoicesV11.get(req.params.id);
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

if (process.argv[1] && process.argv[1].includes('server_v1_1')) {
  createServerV11(4011);
  // eslint-disable-next-line no-console
  console.log('Legacy API v1.1 listening on http://localhost:4011');
}
import { z } from 'zod';

export const CustomerSchema = z.object({
  id: z.string(),
  installedVersion: z.union([z.literal('v1.1'), z.literal('v1.2')]),
  baseUrlByVersion: z.record(z.string(), z.string()),
  credentials: z.object({
    apiKey: z.string(),
    clientToken: z.string()
  })
});

export const CustomersSchema = z.object({
  customers: z.array(CustomerSchema)
});

export type CustomerConfig = z.infer<typeof CustomerSchema>;

export const ActionSchema = z.object({
  id: z.union([z.literal('create_order'), z.literal('create_invoice')]),
  type: z.literal('create'),
  entity: z.union([z.literal('order'), z.literal('invoice')])
});

export const ActionsSchema = z.object({
  actions: z.array(ActionSchema)
});

export type ActionConfig = z.infer<typeof ActionSchema>;

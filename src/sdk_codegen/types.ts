export type Profile = {
  customerId: string;
  action: 'create_order' | 'create_invoice';
  version: 'v1.1' | 'v1.2';
  endpoint: string;
  headers: Record<string, string>;
  payloadKeys: string[];
};

export type ProfilesFile = { profiles: Profile[] };

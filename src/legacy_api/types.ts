export type OrderRecordV11 = {
  id: string;
  customer_ref: string;
  commodity_code_id: string;
  amount: number;
};

export type OrderRecordV12 = {
  id: string;
  customer_ref: string;
  commodity_code_id: string;
  amount: number;
};

export type InvoiceRecordV11 = {
  id: string;
  customer_ref: string;
  line_item_code: string;
  total: number;
};

export type InvoiceRecordV12 = {
  id: string;
  customer_ref: string;
  line_item_code: string;
  total: number;
};

export type ErrorBody = { error: 'unauthorized' | 'not_found' | 'bad_request' };
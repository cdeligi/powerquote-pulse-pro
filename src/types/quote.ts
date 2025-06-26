
import { BOMItem } from "./product";

export type QuotePriority = 'High' | 'Medium' | 'Low' | 'Urgent';
export type Currency = 'USD' | 'EURO' | 'GBP' | 'CAD';
export type QuoteStatus = 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'under-review';

export interface Quote {
  id: string;
  user_id: string;
  customer_name: string;
  oracle_customer_id: string;
  sfdc_opportunity: string;
  status: QuoteStatus;
  priority: QuotePriority;
  is_rep_involved: boolean;
  shipping_terms: string;
  payment_terms: string;
  currency: Currency;
  original_quote_value: number;
  discounted_value: number;
  requested_discount: number;
  approved_discount?: number;
  original_margin: number;
  discounted_margin: number;
  total_cost: number;
  gross_profit: number;
  discount_justification?: string;
  quote_fields?: Record<string, any>;
  counter_offers?: any[];
  approval_notes?: string;
  rejection_reason?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  submitted_by_name?: string;
  submitted_by_email?: string;
  created_at: string;
  updated_at: string;
  bom_items?: BOMItem[];
}

export interface QuoteItem {
  id: number;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  enabled: boolean;
}

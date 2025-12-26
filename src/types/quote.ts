
import { BOMItem } from "./product";

export type QuotePriority = 'High' | 'Medium' | 'Low' | 'Urgent';
export type Currency = 'USD' | 'EURO' | 'GBP' | 'CAD' | 'BRL';
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
  price_adjustments?: Record<string, any> | null;
  draft_bom?: {
    items?: any[];
    rackConfiguration?: any;
  };
  counter_offers?: any[];
  approval_notes?: string;
  additional_quote_information?: string | null;
  rejection_reason?: string;
  reviewed_at?: string;
  reviewed_by?: string;
  submitted_by_name?: string;
  submitted_by_email?: string;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
  bom_items?: BOMItem[];
  exchange_rate_metadata?: {
    currency: string;
    rate: number;
    fetchedAt: string;
    convertedFrom: string;
  } | null;
  partner_commission_rate?: number;
  partner_commission_type?: 'discount' | 'commission' | null;
  partner_commission_value?: number;
}

export interface QuoteItem {
  id: number;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  enabled: boolean;
}

// Enhanced BOM Item for quote approval with admin editing capabilities
export interface BOMItemWithDetails extends BOMItem {
  id: string;
  /**
   * The identifier persisted in the database for this BOM row. When a BOM
   * item hasn't been stored yet we still generate a client-side id for React
   * list rendering, but we skip persistence updates if this value is missing.
   */
  persisted_id?: string;
  name: string;
  description?: string;
  part_number?: string;
  unit_price: number;
  unit_cost: number;
  total_price: number;
  margin: number;
  quantity: number;
  original_unit_price?: number;
  approved_unit_price?: number;
  price_adjustment_history?: any[];
  updated_at?: string;
}

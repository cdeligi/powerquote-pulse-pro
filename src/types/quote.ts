
import { BOMItem } from "./product";

export type QuotePriority = 'High' | 'Medium' | 'Low' | 'Urgent';
export type Currency = 'USD' | 'EURO' | 'GBP' | 'CAD';
export type QuoteStatus = 'draft' | 'pending' | 'approved' | 'rejected' | 'under-review';

export interface Quote {
  id: string;
  items: BOMItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: QuoteStatus;
  customerName: string;
  oracleCustomerId: string;
  sfdcOpportunity: string; // Mandatory SFDC Opportunity ID
  priority: QuotePriority;
  isRepInvolved: boolean;
  shippingTerms: string;
  paymentTerms: string;
  quoteCurrency: Currency;
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  approvedBy?: string;
  rejectionReason?: string;
  counter_offers?: any[];
  reviewed_by?: string;
  reviewed_at?: string;
  approval_notes?: string;
}

export interface QuoteItem {
  id: number;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  enabled: boolean;
}

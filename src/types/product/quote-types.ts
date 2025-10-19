
export type ShippingTerms = 
  | 'Ex-Works' 
  | 'CFR' 
  | 'CIF' 
  | 'CIP' 
  | 'CPT' 
  | 'DDP' 
  | 'DAP' 
  | 'FCA' 
  | 'Prepaid'
  | (string & {});

export type PaymentTerms = 
  | 'Prepaid' 
  | '15' 
  | '30' 
  | '60' 
  | '90' 
  | '120'
  | (string & {});

export type QuotePriority = 'High' | 'Medium' | 'Low' | 'Urgent';
export type Currency = 'USD' | 'EURO' | 'GBP' | 'CAD' | 'BRL';

export interface Quote {
  id: string;
  userId: string;
  items: import('./interfaces').BOMItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected' | 'finalized';
  createdAt: string;
  updatedAt: string;
  notes?: string;
  rejectionReason?: string;
  oracleCustomerId?: string;
  customerName?: string;
  sfdcOpportunity: string; // Mandatory SFDC Opportunity ID
  priority: QuotePriority;
  termsAndConditions?: string;
  isRepInvolved?: boolean;
  shippingTerms?: ShippingTerms;
  paymentTerms?: PaymentTerms;
  quoteCurrency?: Currency;
}

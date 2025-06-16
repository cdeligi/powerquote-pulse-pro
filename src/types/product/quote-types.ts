
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
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  termsAndConditions?: string;
  isRepInvolved?: boolean;
  shippingTerms?: ShippingTerms;
  paymentTerms?: PaymentTerms;
  quoteCurrency?: 'USD' | 'EURO' | 'GBP' | 'CAD';
}

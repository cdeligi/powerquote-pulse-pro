
export interface Quote {
  id: string;
  items: any[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  customerName?: string;
  oracleCustomerId?: string;
  priority?: string;
  isRepInvolved?: boolean;
  shippingTerms?: string;
  paymentTerms?: string;
  quoteCurrency?: 'USD' | 'EURO' | 'GBP' | 'CAD';
  createdAt: string;
  updatedAt: string;
}

export type Currency = 'USD' | 'EURO' | 'GBP' | 'CAD';


export interface Quote {
  id: string;
  items: QuoteItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  customerName: string;
  oracleCustomerId: string;
  priority: 'low' | 'normal' | 'high' | 'urgent';
  isRepInvolved: boolean;
  shippingTerms: string;
  paymentTerms: string;
  quoteCurrency: 'USD' | 'EURO' | 'GBP' | 'CAD';
  createdAt: string;
  updatedAt: string;
  createdBy?: string;
  approvedBy?: string;
  rejectionReason?: string;
}

export interface QuoteItem {
  id: number;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  enabled: boolean;
}

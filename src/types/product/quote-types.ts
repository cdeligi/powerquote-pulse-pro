
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
  oracleCustomerId: string; // Required field
  customerName: string; // Required field
  sfdcOpportunity: string; // Mandatory SFDC Opportunity ID
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  termsAndConditions?: string;
  isRepInvolved: boolean; // Required field
  shippingTerms: ShippingTerms; // Required field
  paymentTerms: PaymentTerms; // Required field
  quoteCurrency: 'USD' | 'EURO' | 'GBP' | 'CAD'; // Required field
  
  // Additional approval information
  submittedBy?: string;
  approvedBy?: string;
  approvedDiscount?: number;
  marginAnalysis?: {
    originalMargin: number;
    discountedMargin: number;
    totalCost: number;
    totalRevenue: number;
    grossProfit: number;
  };
  
  // Item-level details for approval
  itemDetails?: Array<{
    itemId: string;
    name: string;
    partNumber?: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    totalPrice: number;
    totalCost: number;
    margin: number;
  }>;
}

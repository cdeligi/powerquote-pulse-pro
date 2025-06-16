
import { BOMItem } from "./product";

export interface Quote {
  id: string;
  items: BOMItem[];
  subtotal: number;
  discount: number;
  total: number;
  status: 'draft' | 'pending_approval' | 'approved' | 'rejected';
  customerName: string;
  oracleCustomerId: string;
  sfdcOpportunity: string; // Mandatory SFDC Opportunity ID
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
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


import { BOMItem } from '@/types/product';

export interface SubmittedQuote {
  id: string;
  customerName: string;
  oracleCustomerId: string;
  sfdcOpportunity: string;
  submittedBy: string;
  submittedDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'under-review';
  originalQuoteValue: number;
  requestedDiscount: number;
  discountedValue: number;
  totalCost: number;
  originalMargin: number;
  discountedMargin: number;
  grossProfit: number;
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  paymentTerms: string;
  shippingTerms: string;
  currency: string;
  isRepInvolved: boolean;
  discountJustification?: string;
  bomItems: Array<{
    id: string;
    name: string;
    partNumber: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    totalPrice: number;
    totalCost: number;
    margin: number;
    description?: string;
  }>;
  quoteFields?: Record<string, string>;
}

class QuoteSubmissionService {
  private static instance: QuoteSubmissionService;
  private storageKey = 'submittedQuotes';

  private constructor() {}

  static getInstance(): QuoteSubmissionService {
    if (!QuoteSubmissionService.instance) {
      QuoteSubmissionService.instance = new QuoteSubmissionService();
    }
    return QuoteSubmissionService.instance;
  }

  submitQuote(quoteData: {
    id: string;
    bomItems: BOMItem[];
    requestedDiscount: number;
    justification: string;
    originalMargin: number;
    discountedMargin: number;
    totalValue: number;
    totalCost: number;
    grossProfit: number;
    quoteFields: Record<string, string>;
  }): void {
    const submittedQuote: SubmittedQuote = {
      id: quoteData.id,
      customerName: quoteData.quoteFields.customerName || 'Unknown Customer',
      oracleCustomerId: quoteData.quoteFields.oracleCustomerId || '',
      sfdcOpportunity: quoteData.quoteFields.sfdcOpportunity || '',
      submittedBy: 'Current User', // TODO: Get from auth context
      submittedDate: new Date().toISOString(),
      status: 'pending',
      originalQuoteValue: quoteData.totalValue,
      requestedDiscount: quoteData.requestedDiscount,
      discountedValue: quoteData.totalValue * (1 - quoteData.requestedDiscount / 100),
      totalCost: quoteData.totalCost,
      originalMargin: quoteData.originalMargin,
      discountedMargin: quoteData.discountedMargin,
      grossProfit: quoteData.grossProfit,
      priority: 'Medium', // TODO: Allow user to set priority
      paymentTerms: quoteData.quoteFields.paymentTerms || '30 days',
      shippingTerms: quoteData.quoteFields.shippingTerms || 'Ex-Works',
      currency: quoteData.quoteFields.currency || 'USD',
      isRepInvolved: false, // TODO: Allow user to set this
      discountJustification: quoteData.justification,
      bomItems: quoteData.bomItems.map(item => ({
        id: item.id,
        name: item.product.name,
        partNumber: item.partNumber || item.product.id.toUpperCase(),
        quantity: item.quantity,
        unitPrice: item.product.price || 0,
        unitCost: 0, // TODO: Get actual cost from product data
        totalPrice: (item.product.price || 0) * item.quantity,
        totalCost: 0, // TODO: Calculate actual total cost
        margin: 100, // TODO: Calculate actual margin
        description: item.product.description
      })),
      quoteFields: quoteData.quoteFields
    };

    const existingQuotes = this.getSubmittedQuotes();
    const updatedQuotes = [...existingQuotes, submittedQuote];
    localStorage.setItem(this.storageKey, JSON.stringify(updatedQuotes));
  }

  getSubmittedQuotes(): SubmittedQuote[] {
    const stored = localStorage.getItem(this.storageKey);
    return stored ? JSON.parse(stored) : [];
  }

  updateQuoteStatus(quoteId: string, status: SubmittedQuote['status'], rejectionReason?: string): void {
    const quotes = this.getSubmittedQuotes();
    const quoteIndex = quotes.findIndex(q => q.id === quoteId);
    
    if (quoteIndex !== -1) {
      quotes[quoteIndex].status = status;
      if (rejectionReason) {
        quotes[quoteIndex].discountJustification = rejectionReason;
      }
      localStorage.setItem(this.storageKey, JSON.stringify(quotes));
    }
  }
}

export const quoteSubmissionService = QuoteSubmissionService.getInstance();

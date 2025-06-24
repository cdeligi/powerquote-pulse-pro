
import { supabase } from '@/integrations/supabase/client';
import { BOMItem } from '@/types/product';

export interface SubmittedQuote {
  id: string;
  user_id: string;
  customer_name: string;
  oracle_customer_id: string;
  sfdc_opportunity: string;
  status: 'pending' | 'approved' | 'rejected' | 'under-review';
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  payment_terms: string;
  shipping_terms: string;
  currency: string;
  original_quote_value: number;
  requested_discount: number;
  discounted_value: number;
  total_cost: number;
  original_margin: number;
  discounted_margin: number;
  gross_profit: number;
  is_rep_involved: boolean;
  discount_justification?: string;
  quote_fields?: Record<string, string>;
  created_at: string;
  updated_at: string;
  reviewed_at?: string;
  reviewed_by?: string;
  rejection_reason?: string;
  bomItems?: Array<{
    id: string;
    name: string;
    part_number: string;
    quantity: number;
    unit_price: number;
    unit_cost: number;
    total_price: number;
    total_cost: number;
    margin: number;
    description?: string;
  }>;
}

class SupabaseQuoteSubmissionService {
  private static instance: SupabaseQuoteSubmissionService;

  private constructor() {}

  static getInstance(): SupabaseQuoteSubmissionService {
    if (!SupabaseQuoteSubmissionService.instance) {
      SupabaseQuoteSubmissionService.instance = new SupabaseQuoteSubmissionService();
    }
    return SupabaseQuoteSubmissionService.instance;
  }

  async submitQuote(quoteData: {
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
  }): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      // Prepare quote data
      const quoteRecord = {
        id: quoteData.id,
        user_id: user.id,
        customer_name: quoteData.quoteFields.customerName || 'Unknown Customer',
        oracle_customer_id: quoteData.quoteFields.oracleCustomerId || '',
        sfdc_opportunity: quoteData.quoteFields.sfdcOpportunity || '',
        status: 'pending',
        priority: (quoteData.quoteFields.priority as 'High' | 'Medium' | 'Low' | 'Urgent') || 'Medium',
        payment_terms: quoteData.quoteFields.paymentTerms || '30 days',
        shipping_terms: quoteData.quoteFields.shippingTerms || 'Ex-Works',
        currency: quoteData.quoteFields.currency || 'USD',
        original_quote_value: quoteData.totalValue,
        requested_discount: quoteData.requestedDiscount,
        discounted_value: quoteData.totalValue * (1 - quoteData.requestedDiscount / 100),
        total_cost: quoteData.totalCost,
        original_margin: quoteData.originalMargin,
        discounted_margin: quoteData.discountedMargin,
        gross_profit: quoteData.grossProfit,
        is_rep_involved: quoteData.quoteFields.isRepInvolved === 'Yes',
        discount_justification: quoteData.justification,
        quote_fields: quoteData.quoteFields
      };

      // Insert quote
      const { error: quoteError } = await supabase
        .from('quotes')
        .insert([quoteRecord]);

      if (quoteError) {
        console.error('Error inserting quote:', quoteError);
        throw quoteError;
      }

      // Insert BOM items
      const bomItemsData = quoteData.bomItems.map(item => ({
        quote_id: quoteData.id,
        product_id: item.product.id,
        name: item.product.name,
        description: item.product.description,
        part_number: item.partNumber || item.product.id.toUpperCase(),
        quantity: item.quantity,
        unit_price: item.product.price || 0,
        total_price: (item.product.price || 0) * item.quantity,
        unit_cost: item.product.cost || 0,
        total_cost: (item.product.cost || 0) * item.quantity,
        margin: item.product.price && item.product.cost 
          ? ((item.product.price - item.product.cost) / item.product.price) * 100 
          : 0
      }));

      const { error: bomError } = await supabase
        .from('bom_items')
        .insert(bomItemsData);

      if (bomError) {
        console.error('Error inserting BOM items:', bomError);
        throw bomError;
      }

    } catch (error) {
      console.error('Error submitting quote:', error);
      throw error;
    }
  }

  async getSubmittedQuotes(): Promise<SubmittedQuote[]> {
    try {
      const { data, error } = await supabase
        .from('quotes')
        .select(`
          *,
          bom_items (*)
        `)
        .order('created_at', { ascending: false });

      if (error) {
        console.error('Error fetching quotes:', error);
        throw error;
      }

      return data.map(quote => ({
        ...quote,
        status: quote.status as SubmittedQuote['status'],
        priority: quote.priority as SubmittedQuote['priority'], // Type assertion for priority
        bomItems: quote.bom_items?.map((item: any) => ({
          id: item.id,
          name: item.name,
          part_number: item.part_number,
          quantity: item.quantity,
          unit_price: item.unit_price,
          unit_cost: item.unit_cost,
          total_price: item.total_price,
          total_cost: item.total_cost,
          margin: item.margin,
          description: item.description
        }))
      }));
    } catch (error) {
      console.error('Error fetching submitted quotes:', error);
      throw error;
    }
  }

  async updateQuoteStatus(
    quoteId: string, 
    status: SubmittedQuote['status'], 
    rejectionReason?: string
  ): Promise<void> {
    try {
      const { data: { user } } = await supabase.auth.getUser();
      if (!user) throw new Error('User not authenticated');

      const updateData: any = {
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: user.id
      };

      if (rejectionReason) {
        updateData.rejection_reason = rejectionReason;
      }

      const { error } = await supabase
        .from('quotes')
        .update(updateData)
        .eq('id', quoteId);

      if (error) {
        console.error('Error updating quote status:', error);
        throw error;
      }
    } catch (error) {
      console.error('Error updating quote status:', error);
      throw error;
    }
  }
}

export const supabaseQuoteSubmissionService = SupabaseQuoteSubmissionService.getInstance();

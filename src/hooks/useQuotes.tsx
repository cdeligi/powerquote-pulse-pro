
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface Quote {
  id: string;
  customer_name: string;
  oracle_customer_id: string;
  sfdc_opportunity: string;
  user_id: string;
  submitted_by_name: string;
  submitted_by_email: string;
  created_at: string;
  updated_at: string;
  status: 'pending_approval' | 'approved' | 'rejected' | 'under-review';
  original_quote_value: number;
  discounted_value: number;
  requested_discount: number;
  approved_discount?: number;
  original_margin: number;
  discounted_margin: number;
  total_cost: number;
  gross_profit: number;
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  is_rep_involved: boolean;
  shipping_terms: string;
  payment_terms: string;
  currency: 'USD' | 'EURO' | 'GBP' | 'CAD';
  discount_justification?: string;
  quote_fields: Record<string, any>;
  counter_offers?: Array<{
    discountOffered: number;
    offeredAt: string;
    status: 'pending_approval' | 'accepted' | 'rejected';
  }>;
  approval_notes?: string;
  rejection_reason?: string;
  reviewed_at?: string;
  reviewed_by?: string;
}

export interface BOMItemWithDetails {
  id: string;
  quote_id: string;
  product_id: string;
  name: string;
  description: string;
  part_number: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total_price: number;
  total_cost: number;
  margin: number;
  original_unit_price: number;
  approved_unit_price: number;
  product_type: 'standard' | 'qtms_configuration' | 'dga_configuration';
  configuration_data?: any;
  price_adjustment_history: Array<{
    original_price: number;
    new_price: number;
    adjusted_at: string;
    adjusted_by: string;
    reason: string;
  }>;
}

export const useQuotes = () => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  const fetchQuotes = async () => {
    console.log('Fetching quotes from database...');
    setLoading(true);
    setError(null);

    try {
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (quotesError) {
        console.error('Error fetching quotes:', quotesError);
        throw quotesError;
      }

      console.log(`Fetched ${quotesData?.length || 0} quotes from database`);
      setQuotes(quotesData || []);
    } catch (err) {
      console.error('Failed to fetch quotes:', err);
      setError(err instanceof Error ? err.message : 'Failed to fetch quotes');
      toast({
        title: "Error",
        description: "Failed to load quotes from database",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchBOMItems = async (quoteId: string): Promise<BOMItemWithDetails[]> => {
    console.log(`Fetching BOM items for quote ${quoteId}...`);
    
    try {
      const { data: bomData, error: bomError } = await supabase
        .from('bom_items')
        .select('*')
        .eq('quote_id', quoteId)
        .order('created_at', { ascending: true });

      if (bomError) {
        console.error('Error fetching BOM items:', bomError);
        throw bomError;
      }

      console.log(`Fetched ${bomData?.length || 0} BOM items for quote ${quoteId}`);
      return bomData || [];
    } catch (err) {
      console.error('Failed to fetch BOM items:', err);
      toast({
        title: "Error",
        description: "Failed to load BOM items",
        variant: "destructive"
      });
      return [];
    }
  };

  const getMarginThresholds = async () => {
    try {
      const { data, error } = await supabase
        .from('margin_thresholds')
        .select('*')
        .order('minimum_margin_percent', { ascending: true });

      if (error) throw error;
      return data || [];
    } catch (err) {
      console.error('Failed to fetch margin thresholds:', err);
      return [];
    }
  };

  const checkMarginApprovalRequired = async (discountedMargin: number, userRole: string) => {
    const thresholds = await getMarginThresholds();
    
    // Find the applicable threshold
    const applicableThreshold = thresholds.find(t => discountedMargin < t.minimum_margin_percent);
    
    if (!applicableThreshold) return { canApprove: true, requiresFinance: false };
    
    // Admin can approve up to 25% margin
    const adminThreshold = 25;
    
    if (discountedMargin < adminThreshold && userRole === 'admin') {
      return { canApprove: true, requiresFinance: false };
    }
    
    // Finance required for margins below admin threshold
    if (discountedMargin < adminThreshold && userRole !== 'finance') {
      return { canApprove: false, requiresFinance: true };
    }
    
    // Finance can approve anything
    if (userRole === 'finance') {
      return { canApprove: true, requiresFinance: false };
    }
    
    return { canApprove: false, requiresFinance: true };
  };

  const updateQuoteStatus = async (
    quoteId: string, 
    status: Quote['status'], 
    approvedDiscount?: number,
    approvalNotes?: string,
    rejectionReason?: string
  ) => {
    console.log(`Updating quote ${quoteId} status to ${status}`);
    
    try {
      const { data: currentUser } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.user?.id)
        .single();

      // Check margin requirements before approval
      if (status === 'approved') {
        const { data: quoteData } = await supabase
          .from('quotes')
          .select('discounted_margin')
          .eq('id', quoteId)
          .single();

        if (quoteData) {
          const { canApprove, requiresFinance } = await checkMarginApprovalRequired(
            quoteData.discounted_margin, 
            userProfile?.role || 'level1'
          );

          if (!canApprove && requiresFinance) {
            toast({
              title: "Approval Restricted",
              description: "This quote requires Finance approval due to low margin",
              variant: "destructive"
            });
            return;
          }
        }
      }

      const updateData: any = {
        status,
        reviewed_at: new Date().toISOString(),
        reviewed_by: currentUser.user?.id
      };

      if (approvedDiscount !== undefined) {
        updateData.approved_discount = approvedDiscount;
      }
      
      if (approvalNotes) {
        updateData.approval_notes = approvalNotes;
      }
      
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

      console.log(`Successfully updated quote ${quoteId} status to ${status}`);
      
      // Refresh quotes after update
      await fetchQuotes();
      
      toast({
        title: "Success",
        description: `Quote ${status} successfully`
      });
    } catch (err) {
      console.error('Failed to update quote status:', err);
      toast({
        title: "Error",
        description: "Failed to update quote status",
        variant: "destructive"
      });
      throw err;
    }
  };

  const updateBOMItemPrice = async (
    bomItemId: string,
    newPrice: number,
    reason: string
  ) => {
    console.log(`Updating BOM item ${bomItemId} price to ${newPrice}`);
    
    try {
      // First get the current item to preserve history
      const { data: currentItem, error: fetchError } = await supabase
        .from('bom_items')
        .select('*')
        .eq('id', bomItemId)
        .single();

      if (fetchError) throw fetchError;

      // Calculate new totals
      const newTotalPrice = newPrice * currentItem.quantity;
      const newMargin = currentItem.unit_cost > 0 
        ? ((newPrice - currentItem.unit_cost) / newPrice) * 100 
        : 0;

      // Create price adjustment history entry
      const priceAdjustment = {
        original_price: currentItem.unit_price,
        new_price: newPrice,
        adjusted_at: new Date().toISOString(),
        adjusted_by: (await supabase.auth.getUser()).data.user?.id,
        reason
      };

      const updatedHistory = [
        ...(currentItem.price_adjustment_history || []),
        priceAdjustment
      ];

      const { error: updateError } = await supabase
        .from('bom_items')
        .update({
          unit_price: newPrice,
          total_price: newTotalPrice,
          approved_unit_price: newPrice,
          margin: newMargin,
          price_adjustment_history: updatedHistory
        })
        .eq('id', bomItemId);

      if (updateError) throw updateError;

      // Recalculate quote totals
      await recalculateQuoteTotals(currentItem.quote_id);

      console.log(`Successfully updated BOM item ${bomItemId} price`);
      
      toast({
        title: "Success",
        description: "Item price updated successfully"
      });
    } catch (err) {
      console.error('Failed to update BOM item price:', err);
      toast({
        title: "Error",
        description: "Failed to update item price",
        variant: "destructive"
      });
      throw err;
    }
  };

  const recalculateQuoteTotals = async (quoteId: string) => {
    try {
      const { data: bomItems } = await supabase
        .from('bom_items')
        .select('*')
        .eq('quote_id', quoteId);

      if (!bomItems) return;

      const totalCost = bomItems.reduce((sum, item) => sum + item.total_cost, 0);
      const totalPrice = bomItems.reduce((sum, item) => sum + item.total_price, 0);
      const grossProfit = totalPrice - totalCost;
      const margin = totalPrice > 0 ? (grossProfit / totalPrice) * 100 : 0;

      await supabase
        .from('quotes')
        .update({
          total_cost: totalCost,
          discounted_value: totalPrice,
          gross_profit: grossProfit,
          discounted_margin: margin,
          updated_at: new Date().toISOString()
        })
        .eq('id', quoteId);

    } catch (err) {
      console.error('Failed to recalculate quote totals:', err);
    }
  };

  useEffect(() => {
    fetchQuotes();
  }, []);

  return {
    quotes,
    loading,
    error,
    fetchQuotes,
    fetchBOMItems,
    updateQuoteStatus,
    updateBOMItemPrice,
    getMarginThresholds,
    checkMarginApprovalRequired
  };
};

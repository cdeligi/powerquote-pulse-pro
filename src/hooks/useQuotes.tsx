/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

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
  price_override_history?: Array<{
    item_id: string;
    original_price: number;
    new_price: number;
    reason: string;
    timestamp: string;
    approved_by: string;
  }>;
  requires_finance_approval?: boolean;
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
      
      // Ensure all required fields are present and properly typed
      const processedItems: BOMItemWithDetails[] = (bomData || []).map(item => ({
        id: item.id,
        quote_id: item.quote_id,
        product_id: item.product_id,
        name: item.name || 'Unnamed Product',
        description: item.description || '',
        part_number: item.part_number || '',
        quantity: item.quantity || 1,
        unit_price: Number(item.unit_price) || 0,
        unit_cost: Number(item.unit_cost) || 0,
        total_price: Number(item.total_price) || 0,
        total_cost: Number(item.total_cost) || 0,
        margin: Number(item.margin) || 0,
        original_unit_price: Number(item.original_unit_price) || Number(item.unit_price) || 0,
        approved_unit_price: Number(item.approved_unit_price) || Number(item.unit_price) || 0,
        product_type: item.product_type || 'standard',
        configuration_data: item.configuration_data || null,
        price_adjustment_history: item.price_adjustment_history || []
      }));

      return processedItems;
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

  const updateBOMItemPrice = async (
    bomItemId: string,
    newPrice: number,
    reason: string,
    isIncrease: boolean = true
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

      // Get current user and check permissions
      const { data: currentUser } = await supabase.auth.getUser();
      const { data: userProfile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', currentUser.user?.id)
        .single();

      // Check permissions for price changes
      const canIncrease = ['admin', 'finance', 'level2'].includes(userProfile?.role || '');
      const canDecrease = ['admin', 'finance'].includes(userProfile?.role || '');

      if (!isIncrease && !canDecrease) {
        toast({
          title: "Permission Denied",
          description: "You don't have permission to decrease prices. Use the discount request process instead.",
          variant: "destructive"
        });
        return;
      }

      if (isIncrease && !canIncrease) {
        toast({
          title: "Permission Denied",
          description: "You don't have permission to increase prices",
          variant: "destructive"
        });
        return;
      }

      // Calculate new totals and margin
      const newTotalPrice = newPrice * currentItem.quantity;
      const newTotalCost = currentItem.unit_cost * currentItem.quantity;
      const newMargin = newPrice > 0 
        ? ((newPrice - currentItem.unit_cost) / newPrice) * 100 
        : 0;

      // Create price adjustment history entry
      const priceAdjustment = {
        original_price: currentItem.unit_price,
        new_price: newPrice,
        adjusted_at: new Date().toISOString(),
        adjusted_by: currentUser.user?.id,
        reason
      };

      const updatedHistory = [
        ...(currentItem.price_adjustment_history || []),
        priceAdjustment
      ];

      // Update the BOM item
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

      // Update quote with price override history
      const { data: quoteData } = await supabase
        .from('quotes')
        .select('price_override_history')
        .eq('id', currentItem.quote_id)
        .single();

      const overrideEntry = {
        item_id: bomItemId,
        original_price: currentItem.unit_price,
        new_price: newPrice,
        reason,
        timestamp: new Date().toISOString(),
        approved_by: currentUser.user?.id
      };

      const updatedOverrides = [
        ...(quoteData?.price_override_history || []),
        overrideEntry
      ];

      await supabase
        .from('quotes')
        .update({ price_override_history: updatedOverrides })
        .eq('id', currentItem.quote_id);

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

      const totalCost = bomItems.reduce((sum, item) => sum + (item.total_cost || 0), 0);
      const totalPrice = bomItems.reduce((sum, item) => sum + (item.total_price || 0), 0);
      const grossProfit = totalPrice - totalCost;
      const margin = totalPrice > 0 ? (grossProfit / totalPrice) * 100 : 0;

      // Check if finance approval is required
      const { data: marginSetting } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'margin_limit')
        .single();

      const marginLimit = parseFloat(marginSetting?.value as string) || 25;
      const requiresFinanceApproval = margin < marginLimit;

      await supabase
        .from('quotes')
        .update({
          total_cost: totalCost,
          discounted_value: totalPrice,
          gross_profit: grossProfit,
          discounted_margin: margin,
          requires_finance_approval: requiresFinanceApproval,
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
    updateBOMItemPrice,
    recalculateQuoteTotals
  };
};


import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

export interface QuoteWithBOM {
  id: string;
  customer_name: string;
  oracle_customer_id: string;
  sfdc_opportunity: string;
  status: string;
  priority: string;
  original_quote_value: number;
  requested_discount: number;
  discounted_value: number;
  original_margin: number;
  discounted_margin: number;
  gross_profit: number;
  total_cost: number;
  currency: string;
  payment_terms: string;
  shipping_terms: string;
  is_rep_involved: boolean;
  created_at: string;
  submitted_by_name: string | null;
  submitted_by_email: string | null;
  quote_fields: any;
  counter_offers: any[];
  approval_notes: string | null;
  approved_discount: number | null;
  rejection_reason: string | null;
  bom_items: Array<{
    id: string;
    name: string;
    description: string | null;
    part_number: string | null;
    quantity: number;
    unit_price: number;
    unit_cost: number;
    total_price: number;
    total_cost: number;
    margin: number;
  }>;
}

export const useQuoteData = () => {
  return useQuery({
    queryKey: ['quotes-with-bom'],
    queryFn: async (): Promise<QuoteWithBOM[]> => {
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (quotesError) throw quotesError;

      const quotesWithBOM = await Promise.all(
        quotes.map(async (quote) => {
          const { data: bomItems, error: bomError } = await supabase
            .from('bom_items')
            .select('*')
            .eq('quote_id', quote.id);

          if (bomError) throw bomError;

          return {
            ...quote,
            bom_items: bomItems || []
          };
        })
      );

      return quotesWithBOM;
    }
  });
};

export const useMarginSettings = () => {
  return useQuery({
    queryKey: ['margin-settings'],
    queryFn: async () => {
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .in('key', ['margin_thresholds', 'approval_requirements', 'quote_approval_settings']);

      if (error) throw error;

      const settings: any = {};
      data?.forEach(setting => {
        settings[setting.key] = setting.value;
      });

      return settings;
    }
  });
};

export const useQuoteActions = () => {
  const queryClient = useQueryClient();
  const { toast } = useToast();

  const approveQuote = useMutation({
    mutationFn: async ({ quoteId, notes, discount }: { quoteId: string; notes?: string; discount?: number }) => {
      const { error } = await supabase
        .from('quotes')
        .update({
          status: 'approved',
          approval_notes: notes,
          approved_discount: discount || 0,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', quoteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes-with-bom'] });
      toast({
        title: "Quote Approved",
        description: "Quote has been successfully approved."
      });
    }
  });

  const rejectQuote = useMutation({
    mutationFn: async ({ quoteId, reason }: { quoteId: string; reason: string }) => {
      const { error } = await supabase
        .from('quotes')
        .update({
          status: 'rejected',
          rejection_reason: reason,
          reviewed_at: new Date().toISOString(),
          reviewed_by: (await supabase.auth.getUser()).data.user?.id
        })
        .eq('id', quoteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes-with-bom'] });
      toast({
        title: "Quote Rejected",
        description: "Quote has been rejected.",
        variant: "destructive"
      });
    }
  });

  const counterOffer = useMutation({
    mutationFn: async ({ quoteId, discountPercentage, notes }: { quoteId: string; discountPercentage: number; notes?: string }) => {
      // First get current quote data
      const { data: quote } = await supabase
        .from('quotes')
        .select('counter_offers, original_quote_value')
        .eq('id', quoteId)
        .single();

      if (!quote) throw new Error('Quote not found');

      const newCounterOffer = {
        discount: discountPercentage,
        notes: notes,
        created_at: new Date().toISOString(),
        created_by: (await supabase.auth.getUser()).data.user?.id
      };

      const updatedCounterOffers = [...(quote.counter_offers || []), newCounterOffer];
      const newDiscountedValue = quote.original_quote_value * (1 - discountPercentage / 100);

      const { error } = await supabase
        .from('quotes')
        .update({
          counter_offers: updatedCounterOffers,
          discounted_value: newDiscountedValue,
          requested_discount: discountPercentage,
          status: 'under_review'
        })
        .eq('id', quoteId);

      if (error) throw error;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ['quotes-with-bom'] });
      toast({
        title: "Counter Offer Sent",
        description: "Counter offer has been submitted."
      });
    }
  });

  return {
    approveQuote,
    rejectQuote,
    counterOffer
  };
};


/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { MarginSettings, FinanceApprovalRequirement } from '@/types/finance';

export const useFinanceApproval = () => {
  const [marginSettings, setMarginSettings] = useState<MarginSettings>({ marginLimit: 25 });
  const [loading, setLoading] = useState(true);
  const { toast } = useToast();

  const fetchMarginSettings = async () => {
    try {
      const { data, error } = await supabase
        .from('app_settings')
        .select('value')
        .eq('key', 'margin_limit')
        .single();

      if (error) throw error;

      if (data) {
        setMarginSettings({ marginLimit: parseFloat(data.value as string) });
      }
    } catch (error) {
      console.error('Failed to fetch margin settings:', error);
      toast({
        title: "Error",
        description: "Failed to load margin settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const checkFinanceApprovalRequired = (
    currentMargin: number,
    userRole: string
  ): FinanceApprovalRequirement => {
    const isFinanceApprovalRequired = currentMargin < marginSettings.marginLimit;
    const canUserApprove = userRole === 'finance' || userRole === 'admin';

    return {
      required: isFinanceApprovalRequired && !canUserApprove,
      reason: isFinanceApprovalRequired 
        ? `Margin ${currentMargin.toFixed(1)}% is below threshold of ${marginSettings.marginLimit}%`
        : '',
      current_margin: currentMargin,
      minimum_margin: marginSettings.marginLimit
    };
  };

  const updateMarginLimit = async (newLimit: number) => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .update({ value: newLimit.toString() })
        .eq('key', 'margin_limit');

      if (error) throw error;

      setMarginSettings({ marginLimit: newLimit });
      toast({
        title: "Success",
        description: "Margin limit updated successfully"
      });
    } catch (error) {
      console.error('Failed to update margin limit:', error);
      toast({
        title: "Error",
        description: "Failed to update margin limit",
        variant: "destructive"
      });
    }
  };

  useEffect(() => {
    fetchMarginSettings();
  }, []);

  return {
    marginSettings,
    loading,
    checkFinanceApprovalRequired,
    updateMarginLimit,
    refetch: fetchMarginSettings
  };
};

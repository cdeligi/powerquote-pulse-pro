
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Separator } from '@/components/ui/separator';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { Percent, Calculator, AlertTriangle, Save, RefreshCw } from 'lucide-react';

const MarginConfigurationPanel = () => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [minimumMargin, setMinimumMargin] = useState(40); // Default 40%
  const [applyingMargins, setApplyingMargins] = useState(false);
  const [lastApplied, setLastApplied] = useState<string | null>(null);

  useEffect(() => {
    loadMarginSettings();
  }, []);

  const loadMarginSettings = async () => {
    try {
      setLoading(true);
      
      const { data, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'minimum_margin_percent')
        .single();

      if (error && error.code !== 'PGRST116') { // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        setMinimumMargin(Number(data.value) || 40);
      }

      // Get last applied timestamp
      const { data: lastAppliedData } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'margin_last_applied')
        .single();

      if (lastAppliedData) {
        setLastApplied(lastAppliedData.value as string);
      }

    } catch (error) {
      console.error('Error loading margin settings:', error);
      toast({
        title: "Error",
        description: "Failed to load margin settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const saveMarginSettings = async () => {
    try {
      setLoading(true);

      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'minimum_margin_percent',
          value: minimumMargin,
          description: 'Minimum margin percentage for all products'
        });

      if (error) throw error;

      toast({
        title: "Success",
        description: "Minimum margin percentage saved successfully"
      });
    } catch (error) {
      console.error('Error saving margin settings:', error);
      toast({
        title: "Error",
        description: "Failed to save margin settings",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const applyMarginsToAllProducts = async () => {
    try {
      setApplyingMargins(true);

      // Update all products with the new margin
      const { data: products, error: fetchError } = await supabase
        .from('products')
        .select('id, cost')
        .not('cost', 'is', null);

      if (fetchError) throw fetchError;

      // Calculate new prices for all products
      const updates = products.map(product => ({
        id: product.id,
        price: product.cost * (1 + minimumMargin / 100)
      }));

      // Batch update all products
      for (const update of updates) {
        const { error } = await supabase
          .from('products')
          .update({ price: update.price })
          .eq('id', update.id);

        if (error) throw error;
      }

      // Record the timestamp of this operation
      await supabase
        .from('app_settings')
        .upsert({
          key: 'margin_last_applied',
          value: new Date().toISOString(),
          description: 'Timestamp when margins were last applied to all products'
        });

      setLastApplied(new Date().toISOString());

      toast({
        title: "Success",
        description: `Applied ${minimumMargin}% margin to ${updates.length} products`
      });

    } catch (error) {
      console.error('Error applying margins:', error);
      toast({
        title: "Error",
        description: "Failed to apply margins to all products",
        variant: "destructive"
      });
    } finally {
      setApplyingMargins(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-white">Loading margin configuration...</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-800 border-gray-700">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Percent className="mr-2 h-5 w-5" />
            Margin Configuration
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          <Alert className="bg-blue-900/20 border-blue-600/50">
            <AlertTriangle className="h-4 w-4 text-blue-400" />
            <AlertDescription className="text-blue-300">
              The minimum margin percentage will be applied to all products to calculate their list prices.
              Formula: List Price = Cost × (1 + Margin%)
            </AlertDescription>
          </Alert>

          <div className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <Label htmlFor="minimum-margin" className="text-gray-300">
                  Minimum Margin Percentage (%)
                </Label>
                <div className="flex items-center space-x-2">
                  <Input
                    id="minimum-margin"
                    type="number"
                    min="0"
                    max="100"
                    step="0.1"
                    value={minimumMargin}
                    onChange={(e) => setMinimumMargin(Number(e.target.value))}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                  <span className="text-gray-400">%</span>
                </div>
                <p className="text-sm text-gray-400 mt-1">
                  This margin will be applied to product costs to determine list prices
                </p>
              </div>

              <div>
                <Label className="text-gray-300">Example Calculation</Label>
                <div className="bg-gray-700 p-3 rounded-lg">
                  <div className="text-sm text-gray-300 space-y-1">
                    <div>Product Cost: $13,000</div>
                    <div>Margin: {minimumMargin}%</div>
                    <div className="border-t border-gray-600 pt-1 font-medium">
                      List Price: ${(13000 * (1 + minimumMargin / 100)).toLocaleString()}
                    </div>
                  </div>
                </div>
              </div>
            </div>

            <div className="flex items-center space-x-4">
              <Button
                onClick={saveMarginSettings}
                className="bg-blue-600 hover:bg-blue-700"
                disabled={loading}
              >
                <Save className="w-4 h-4 mr-2" />
                Save Margin Settings
              </Button>

              <Button
                onClick={applyMarginsToAllProducts}
                className="bg-green-600 hover:bg-green-700"
                disabled={applyingMargins || loading}
              >
                {applyingMargins ? (
                  <>
                    <RefreshCw className="w-4 h-4 mr-2 animate-spin" />
                    Applying Margins...
                  </>
                ) : (
                  <>
                    <Calculator className="w-4 h-4 mr-2" />
                    Apply to All Products
                  </>
                )}
              </Button>
            </div>

            {lastApplied && (
              <div className="text-sm text-gray-400">
                Margins last applied to all products: {new Date(lastApplied).toLocaleString()}
              </div>
            )}
          </div>

          <Separator className="bg-gray-700" />

          <Alert className="bg-yellow-900/20 border-yellow-600/50">
            <AlertTriangle className="h-4 w-4 text-yellow-400" />
            <AlertDescription className="text-yellow-300">
              <strong>Important:</strong> Applying margins to all products will recalculate and update 
              the list price for every product in your system. This action cannot be undone. 
              Make sure to backup your data before proceeding.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
};

export default MarginConfigurationPanel;

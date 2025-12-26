
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 */

import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { RefreshCw, Database, AlertCircle, CheckCircle } from "lucide-react";
import { getSupabaseClient } from "@/integrations/supabase/client";

const supabase = getSupabaseClient();
import { toast } from "@/components/ui/use-toast";
import { productDataService } from "@/services/productDataService";

interface ProductSyncStats {
  level1Count: number;
  level2Count: number;
  level3Count: number;
  level4Count: number;
  lastSyncAt: string | null;
}

const ProductSyncManager = () => {
  const [syncing, setSyncing] = useState(false);
  const [syncStats, setSyncStats] = useState<ProductSyncStats>({
    level1Count: 0,
    level2Count: 0,
    level3Count: 0,
    level4Count: 0,
    lastSyncAt: null
  });

  const handleSyncProducts = async () => {
    setSyncing(true);
    
    try {
      // Fetch all product data from database
      const [level1Result, level2Result, level3Result, level4Result] = await Promise.all([
        supabase.from('products').select('*').eq('category', 'level1'),
        supabase.from('products').select('*').eq('category', 'level2'),
        supabase.from('products').select('*').eq('category', 'level3'),
        supabase.from('level4_products').select('*')
      ]);

      if (level1Result.error) throw level1Result.error;
      if (level2Result.error) throw level2Result.error;
      if (level3Result.error) throw level3Result.error;
      if (level4Result.error) throw level4Result.error;

      // Products are now always fetched fresh from Supabase
      // No need to replaceAllProducts since service now queries database directly

      // Update local state with fresh data
      setSyncStats({
        level1Count: level1Result.data?.length || 0,
        level2Count: level2Result.data?.length || 0,
        level3Count: level3Result.data?.length || 0,
        level4Count: level4Result.data?.length || 0,
        lastSyncAt: new Date().toISOString()
      });

      toast({
        title: "Products Synced Successfully",
        description: `Synchronized ${(level1Result.data?.length || 0) + (level2Result.data?.length || 0) + (level3Result.data?.length || 0) + (level4Result.data?.length || 0)} products across all levels.`,
      });

    } catch (error) {
      console.error('Error syncing products:', error);
      toast({
        title: "Sync Failed",
        description: "Failed to sync products. Please try again.",
        variant: "destructive",
      });
    } finally {
      setSyncing(false);
    }
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h3 className="text-xl font-bold text-white mb-2">Product Data Synchronization</h3>
          <p className="text-gray-400">Sync product data across all hierarchy levels</p>
        </div>
        <Button
          onClick={handleSyncProducts}
          disabled={syncing}
          className="bg-blue-600 hover:bg-blue-700"
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${syncing ? 'animate-spin' : ''}`} />
          {syncing ? 'Syncing...' : 'Sync Products'}
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Level 1 Products</p>
                <p className="text-2xl font-bold text-blue-500">
                  {syncStats.level1Count}
                </p>
              </div>
              <Database className="h-8 w-8 text-blue-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Level 2 Products</p>
                <p className="text-2xl font-bold text-green-500">
                  {syncStats.level2Count}
                </p>
              </div>
              <Database className="h-8 w-8 text-green-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Level 3 Products</p>
                <p className="text-2xl font-bold text-yellow-500">
                  {syncStats.level3Count}
                </p>
              </div>
              <Database className="h-8 w-8 text-yellow-500" />
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-400">Level 4 Products</p>
                <p className="text-2xl font-bold text-purple-500">
                  {syncStats.level4Count}
                </p>
              </div>
              <Database className="h-8 w-8 text-purple-500" />
            </div>
          </CardContent>
        </Card>
      </div>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Database className="h-5 w-5 mr-2" />
            Synchronization Status
          </CardTitle>
          <CardDescription className="text-gray-400">
            Current status of product data synchronization
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex items-center justify-between">
            <span className="text-gray-300">Last Sync:</span>
            <span className="text-white">
              {syncStats.lastSyncAt 
                ? new Date(syncStats.lastSyncAt).toLocaleString()
                : 'Never'
              }
            </span>
          </div>

          <div className="flex items-center justify-between">
            <span className="text-gray-300">Total Products:</span>
            <Badge variant="outline" className="text-white border-gray-600">
              {syncStats.level1Count + syncStats.level2Count + syncStats.level3Count + syncStats.level4Count} items
            </Badge>
          </div>

          <div className="flex items-center space-x-2">
            {syncStats.lastSyncAt ? (
              <>
                <CheckCircle className="h-4 w-4 text-green-500" />
                <span className="text-green-400">Products are synchronized</span>
              </>
            ) : (
              <>
                <AlertCircle className="h-4 w-4 text-yellow-500" />
                <span className="text-yellow-400">Products need synchronization</span>
              </>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default ProductSyncManager;

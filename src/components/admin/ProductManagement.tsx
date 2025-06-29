
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import Level1ProductForm from "./product-forms/Level1ProductForm";
import ChassisForm from "./product-forms/ChassisForm";
import CardForm from "./product-forms/CardForm";
import Level2OptionForm from "./product-forms/Level2OptionForm";
import { Level4ConfigurationManager } from "./Level4ConfigurationManager";
import { Level1Product, Level2Product, Level3Product, Level4Product } from "@/types/product";
import { productDataService } from "@/services/productDataService";
import { useToast } from "@/hooks/use-toast";

export const ProductManagement = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [level1Products, setLevel1Products] = useState<Level1Product[]>([]);
  const [level2Products, setLevel2Products] = useState<Level2Product[]>([]);

  useEffect(() => {
    const initializeData = async () => {
      try {
        setIsLoading(true);
        setError(null);
        
        console.log('ProductManagement: Initializing data...');
        
        // Small delay to ensure service is fully initialized
        await new Promise(resolve => setTimeout(resolve, 50));
        
        // Load product data
        const l1Products = productDataService.getLevel1Products();
        const l2Products = productDataService.getLevel2Products();
        
        console.log('ProductManagement: Loaded products:', { 
          l1Count: l1Products.length, 
          l2Count: l2Products.length 
        });
        
        if (l1Products.length === 0) {
          console.warn('ProductManagement: No Level 1 products found');
        }
        
        setLevel1Products(l1Products);
        setLevel2Products(l2Products);
        
      } catch (err) {
        console.error('ProductManagement: Error initializing product data:', err);
        setError('Failed to load product data. Please try refreshing the page.');
      } finally {
        setIsLoading(false);
      }
    };

    initializeData();
  }, []);

  const refreshProductData = () => {
    try {
      console.log('ProductManagement: Refreshing product data...');
      const l1Products = productDataService.getLevel1Products();
      const l2Products = productDataService.getLevel2Products();
      
      console.log('ProductManagement: Refreshed products:', { 
        l1Count: l1Products.length, 
        l2Count: l2Products.length 
      });
      
      setLevel1Products(l1Products);
      setLevel2Products(l2Products);
    } catch (error) {
      console.error('ProductManagement: Error refreshing product data:', error);
      toast({
        title: "Error",
        description: "Failed to refresh product data",
        variant: "destructive"
      });
    }
  };

  const handleLevel1Save = async (productData: Omit<Level1Product, 'id'> | Level1Product) => {
    try {
      console.log('ProductManagement: Saving Level 1 product:', productData);
      
      if ('id' in productData) {
        await productDataService.updateLevel1Product(productData.id, productData);
        toast({ title: "Success", description: "Level 1 product updated successfully" });
      } else {
        await productDataService.createLevel1Product(productData);
        toast({ title: "Success", description: "Level 1 product created successfully" });
      }
      refreshProductData();
    } catch (error) {
      console.error('ProductManagement: Error saving Level 1 product:', error);
      toast({ 
        title: "Error", 
        description: "Failed to save Level 1 product", 
        variant: "destructive" 
      });
    }
  };

  const handleLevel2Save = async (productData: Omit<Level2Product, 'id'> | Level2Product) => {
    try {
      console.log('ProductManagement: Saving Level 2 product:', productData);
      
      if ('id' in productData) {
        await productDataService.updateLevel2Product(productData.id, productData);
        toast({ title: "Success", description: "Level 2 product updated successfully" });
      } else {
        await productDataService.createLevel2Product(productData);
        toast({ title: "Success", description: "Level 2 product created successfully" });
      }
      refreshProductData();
    } catch (error) {
      console.error('ProductManagement: Error saving Level 2 product:', error);
      toast({ 
        title: "Error", 
        description: "Failed to save Level 2 product", 
        variant: "destructive" 
      });
    }
  };

  const handleLevel3Save = async (productData: Omit<Level3Product, 'id'> | Level3Product) => {
    try {
      console.log('ProductManagement: Saving Level 3 product:', productData);
      
      if ('id' in productData) {
        await productDataService.updateLevel3Product(productData.id, productData);
        toast({ title: "Success", description: "Level 3 product updated successfully" });
      } else {
        await productDataService.createLevel3Product(productData);
        toast({ title: "Success", description: "Level 3 product created successfully" });
      }
      // Level 3 changes might affect Level 4, so we could refresh here too if needed
    } catch (error) {
      console.error('ProductManagement: Error saving Level 3 product:', error);
      toast({ 
        title: "Error", 
        description: "Failed to save Level 3 product", 
        variant: "destructive" 
      });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Product Management</h2>
          <p className="text-muted-foreground">Loading product data...</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Initializing product management...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Product Management</h2>
          <p className="text-red-600">{error}</p>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <p className="text-gray-600 mb-4">There was an error loading the product data.</p>
            <button 
              onClick={() => window.location.reload()} 
              className="px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700"
            >
              Refresh Page
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-3xl font-bold tracking-tight">Product Management</h2>
        <p className="text-muted-foreground">
          Manage your product hierarchy and configurations across all levels.
        </p>
        <div className="mt-2 text-sm text-gray-600">
          Level 1: {level1Products.length} products | Level 2: {level2Products.length} products
        </div>
      </div>

      <Tabs defaultValue="level1" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4">
          <TabsTrigger value="level1">Level 1 Products</TabsTrigger>
          <TabsTrigger value="level2">Level 2 Products</TabsTrigger>
          <TabsTrigger value="level3">Level 3 Products</TabsTrigger>
          <TabsTrigger value="level4">Level 4 Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="level1" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Level 1 Products</CardTitle>
              <CardDescription>
                Main product categories (QTMS, TM8, TM3, etc.). These are the top-level products in your hierarchy.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Level1ProductForm onSubmit={handleLevel1Save} />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="level2" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Level 2 Products</CardTitle>
              <CardDescription>
                Product variants and chassis (LTX, MTX, STX for QTMS). These are linked to Level 1 products.
                {level1Products.length === 0 && (
                  <span className="block text-amber-600 mt-1">
                    Note: Create Level 1 products first to enable Level 2 product creation.
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              {level1Products.length > 0 ? (
                <ChassisForm 
                  onSubmit={handleLevel2Save} 
                  level1Products={level1Products}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No Level 1 products available.</p>
                  <p>Create Level 1 products first to enable Level 2 product creation.</p>
                </div>
              )}
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="level3" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Level 3 Products</CardTitle>
              <CardDescription>
                Components, cards, and options. These are the specific parts that go into Level 2 products.
                {level2Products.length === 0 && level1Products.length === 0 && (
                  <span className="block text-amber-600 mt-1">
                    Note: Create Level 1 and Level 2 products first to enable Level 3 product creation.
                  </span>
                )}
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid gap-6">
                <div>
                  <h4 className="text-lg font-semibold mb-4">Cards & Components</h4>
                  {level2Products.length > 0 ? (
                    <CardForm 
                      onSubmit={handleLevel3Save}
                      level2Products={level2Products}
                    />
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p>No Level 2 products available for card assignment.</p>
                    </div>
                  )}
                </div>
                <div>
                  <h4 className="text-lg font-semibold mb-4">Product Options</h4>
                  {level1Products.length > 0 ? (
                    <Level2OptionForm 
                      onSubmit={handleLevel3Save}
                      level1Products={level1Products}
                    />
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p>No Level 1 products available for option assignment.</p>
                    </div>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="level4" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Level 4 Configuration</CardTitle>
              <CardDescription>
                Product-specific configurations tied to Level 3 products. Create dropdown selections or multi-line configurations for your products.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Level4ConfigurationManager />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

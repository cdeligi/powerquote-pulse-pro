
import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, Edit, Trash2 } from "lucide-react";
import Level1ProductForm from "./product-forms/Level1ProductForm";
import ChassisForm from "./product-forms/ChassisForm";
import CardForm from "./product-forms/CardForm";
import Level2OptionForm from "./product-forms/Level2OptionForm";
import { Level4ConfigurationManager } from "./Level4ConfigurationManager";
import { Level1Product, Level2Product, Level3Product, Level4Product } from "@/types/product";
import { productDataService } from "@/services/productDataService";
import { useToast } from "@/hooks/use-toast";
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from "@/components/ui/table";

export const ProductManagement = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [level1Products, setLevel1Products] = useState<Level1Product[]>([]);
  const [level2Products, setLevel2Products] = useState<Level2Product[]>([]);
  const [level3Products, setLevel3Products] = useState<Level3Product[]>([]);

  const [editingLevel1, setEditingLevel1] = useState<Level1Product | null>(null);
  const [editingLevel2, setEditingLevel2] = useState<Level2Product | null>(null);
  const [editingLevel3, setEditingLevel3] = useState<Level3Product | null>(null);
  const [refreshTrigger, setRefreshTrigger] = useState(0);

  useEffect(() => {
    initializeData();
  }, [refreshTrigger]);

  const initializeData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('ProductManagement: Starting data initialization...');
      
      // Initialize the service and load data
      await productDataService.initialize();
      
      // Load all product data
      const [l1Products, l2Products, l3Products] = await Promise.all([
        productDataService.getLevel1Products(),
        productDataService.getLevel2Products(),
        productDataService.getLevel3Products()
      ]);
      
      console.log('ProductManagement: Data loaded successfully:', {
        l1Count: l1Products.length,
        l2Count: l2Products.length,
        l3Count: l3Products.length
      });

      setLevel1Products(l1Products);
      setLevel2Products(l2Products);
      setLevel3Products(l3Products);
      
    } catch (err) {
      console.error('ProductManagement: Error initializing data:', err);
      setError('Failed to load product data. Please try refreshing.');
      
      // Try to load sync data as fallback
      try {
        const l1Sync = productDataService.getLevel1ProductsSync();
        const l2Sync = productDataService.getLevel2ProductsSync();
        const l3Sync = productDataService.getLevel3ProductsSync();
        setLevel1Products(l1Sync);
        setLevel2Products(l2Sync);
        setLevel3Products(l3Sync);
        console.log('ProductManagement: Fallback to sync data successful');
      } catch (syncError) {
        console.error('ProductManagement: Fallback also failed:', syncError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetData = async () => {
    try {
      setIsLoading(true);
      await productDataService.resetAndReload();
      setRefreshTrigger(prev => prev + 1);
      toast({
        title: "Success",
        description: "Product data has been reset and reloaded"
      });
    } catch (error) {
      console.error('Error resetting data:', error);
      toast({
        title: "Error",
        description: "Failed to reset product data",
        variant: "destructive"
      });
    }
  };

  const refreshProductData = async () => {
    console.log('ProductManagement: Manual refresh triggered');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLevel1Save = async (productData: Omit<Level1Product, 'id'>) => {
    try {
      console.log('ProductManagement: Saving Level 1 product:', productData);

      if (editingLevel1) {
        await productDataService.updateLevel1Product(editingLevel1.id, productData);
        toast({ title: "Success", description: "Level 1 product updated successfully" });
        setEditingLevel1(null);
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

  const handleLevel2Save = async (productData: Omit<Level2Product, 'id'>) => {
    try {
      console.log('ProductManagement: Saving Level 2 product:', productData);

      if (editingLevel2) {
        await productDataService.updateLevel2Product(editingLevel2.id, productData);
        toast({ title: "Success", description: "Level 2 product updated successfully" });
        setEditingLevel2(null);
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

  const handleLevel3Save = async (productData: Omit<Level3Product, 'id'>) => {
    try {
      console.log('ProductManagement: Saving Level 3 product:', productData);

      if (editingLevel3) {
        await productDataService.updateLevel3Product(editingLevel3.id, productData);
        toast({ title: "Success", description: "Level 3 product updated successfully" });
        setEditingLevel3(null);
      } else {
        await productDataService.createLevel3Product(productData);
        toast({ title: "Success", description: "Level 3 product created successfully" });
      }
      // Level 3 changes might affect Level 4, so refresh
      refreshProductData();
    } catch (error) {
      console.error('ProductManagement: Error saving Level 3 product:', error);
      toast({ 
        title: "Error", 
        description: "Failed to save Level 3 product", 
        variant: "destructive" 
      });
    }
  };

  const handleDeleteLevel1 = async (id: string) => {
    if (!confirm('Delete this Level 1 product?')) return;
    try {
      await productDataService.deleteLevel1Product(id);
      toast({ title: 'Deleted', description: 'Level 1 product removed' });
      refreshProductData();
    } catch (error) {
      console.error('Error deleting Level 1 product:', error);
      toast({ title: 'Error', description: 'Failed to delete Level 1 product', variant: 'destructive' });
    }
  };

  const handleDeleteLevel2 = async (id: string) => {
    if (!confirm('Delete this Level 2 product?')) return;
    try {
      await productDataService.deleteLevel2Product(id);
      toast({ title: 'Deleted', description: 'Level 2 product removed' });
      refreshProductData();
    } catch (error) {
      console.error('Error deleting Level 2 product:', error);
      toast({ title: 'Error', description: 'Failed to delete Level 2 product', variant: 'destructive' });
    }
  };

  const handleDeleteLevel3 = async (id: string) => {
    if (!confirm('Delete this Level 3 product?')) return;
    try {
      await productDataService.deleteLevel3Product(id);
      toast({ title: 'Deleted', description: 'Level 3 product removed' });
      refreshProductData();
    } catch (error) {
      console.error('Error deleting Level 3 product:', error);
      toast({ title: 'Error', description: 'Failed to delete Level 3 product', variant: 'destructive' });
    }
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Product Management</h2>
            <p className="text-muted-foreground">Loading product data...</p>
          </div>
          <Button onClick={handleResetData} variant="outline">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Data
          </Button>
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
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight">Product Management</h2>
            <p className="text-red-600 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleResetData} variant="outline">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Data
            </Button>
            <Button onClick={refreshProductData} variant="default">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
        <Card>
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Product Data</h3>
              <p className="text-gray-600 mb-4">
                There was an error loading the product data. You can try to reset the data or retry loading.
              </p>
              <div className="flex justify-center gap-2">
                <Button onClick={refreshProductData} variant="default">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Loading
                </Button>
                <Button onClick={handleResetData} variant="outline">
                  Reset to Defaults
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight">Product Management</h2>
          <p className="text-muted-foreground">
            Manage your product hierarchy and configurations across all levels.
          </p>
          <div className="mt-2 text-sm text-gray-600 flex items-center gap-4">
            <span>Level 1: {level1Products.length} products</span>
            <span>Level 2: {level2Products.length} products</span>
            <span>Level 3: {level3Products.length} products</span>
            <Button 
              onClick={refreshProductData} 
              variant="ghost" 
              size="sm"
              className="h-6 px-2 text-xs"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
        <Button onClick={handleResetData} variant="outline">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset Data
        </Button>
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
            <CardContent className="space-y-6">
              <Level1ProductForm onSubmit={handleLevel1Save} initialData={editingLevel1 ?? undefined} />
              {editingLevel1 && (
                <Button variant="outline" size="sm" onClick={() => setEditingLevel1(null)}>
                  Cancel Edit
                </Button>
              )}

              {level1Products.length > 0 && (
                <Table className="mt-4">
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-gray-300">Name</TableHead>
                      <TableHead className="text-gray-300">Type</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {level1Products.map(p => (
                      <TableRow key={p.id} className="border-gray-800">
                        <TableCell className="text-white">{p.name}</TableCell>
                        <TableCell className="text-gray-300">{p.type}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditingLevel1(p)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteLevel1(p.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
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
            <CardContent className="space-y-6">
              {level1Products.length > 0 ? (
                <ChassisForm
                  onSubmit={handleLevel2Save}
                  level1Products={level1Products}
                  initialData={editingLevel2 ?? undefined}
                />
              ) : (
                <div className="text-center py-8 text-gray-500">
                  <p>No Level 1 products available.</p>
                  <p>Create Level 1 products first to enable Level 2 product creation.</p>
                </div>
              )}

              {editingLevel2 && (
                <Button variant="outline" size="sm" onClick={() => setEditingLevel2(null)}>
                  Cancel Edit
                </Button>
              )}

              {level2Products.length > 0 && (
                <Table className="mt-4">
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-gray-300">Name</TableHead>
                      <TableHead className="text-gray-300">Type</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {level2Products.map(p => (
                      <TableRow key={p.id} className="border-gray-800">
                        <TableCell className="text-white">{p.name}</TableCell>
                        <TableCell className="text-gray-300">{p.type}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditingLevel2(p)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteLevel2(p.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
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
            <CardContent className="space-y-6">
              <div className="grid gap-6">
                <div>
                  <h4 className="text-lg font-semibold mb-4">Cards & Components</h4>
                  {level2Products.length > 0 ? (
                    <CardForm
                      onSubmit={handleLevel3Save}
                      level2Products={level2Products}
                      initialData={editingLevel3 ?? undefined}
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
                      initialData={editingLevel3 ?? undefined}
                    />
                  ) : (
                    <div className="text-center py-4 text-gray-500">
                      <p>No Level 1 products available for option assignment.</p>
                    </div>
                  )}
                </div>
              </div>

              {editingLevel3 && (
                <Button variant="outline" size="sm" onClick={() => setEditingLevel3(null)}>
                  Cancel Edit
                </Button>
              )}

              {level3Products.length > 0 && (
                <Table className="mt-4">
                  <TableHeader>
                    <TableRow className="border-gray-800">
                      <TableHead className="text-gray-300">Name</TableHead>
                      <TableHead className="text-gray-300">Type</TableHead>
                      <TableHead className="text-gray-300">Actions</TableHead>
                    </TableRow>
                  </TableHeader>
                  <TableBody>
                    {level3Products.map(p => (
                      <TableRow key={p.id} className="border-gray-800">
                        <TableCell className="text-white">{p.name}</TableCell>
                        <TableCell className="text-gray-300">{p.type}</TableCell>
                        <TableCell>
                          <div className="flex space-x-2">
                            <Button size="sm" variant="ghost" onClick={() => setEditingLevel3(p)}>
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button size="sm" variant="ghost" onClick={() => handleDeleteLevel3(p.id)}>
                              <Trash2 className="h-4 w-4 text-red-500" />
                            </Button>
                          </div>
                        </TableCell>
                      </TableRow>
                    ))}
                  </TableBody>
                </Table>
              )}
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
              <Level4ConfigurationManager key={refreshTrigger} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>
    </div>
  );
};

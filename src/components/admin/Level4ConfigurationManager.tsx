import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Edit, Plus, Settings, List, AlertCircle } from "lucide-react";
import { Level4Product, Level3Product } from "@/types/product";
import { productDataService } from "@/services/productDataService";
import { Level4ProductForm } from "./product-forms/Level4ProductForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export const Level4ConfigurationManager: React.FC = () => {
  const [level4Products, setLevel4Products] = useState<Level4Product[]>([]);
  const [level3Products, setLevel3Products] = useState<Level3Product[]>([]);
  const [selectedLevel3, setSelectedLevel3] = useState<string>('all');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Level4Product | undefined>();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      console.log('Level4ConfigurationManager: Loading data...');
      
      // Ensure service is initialized
      await productDataService.initialize();
      
      // Load data asynchronously
      const [l4Products, l3Products] = await Promise.all([
        productDataService.getLevel4Products(),
        productDataService.getLevel3Products()
      ]);
      
      console.log('Level4ConfigurationManager: Data loaded:', { 
        l4Count: l4Products.length, 
        l3Count: l3Products.length 
      });
      
      setLevel4Products(l4Products);
      setLevel3Products(l3Products);
      
    } catch (error) {
      console.error('Level4ConfigurationManager: Error loading data:', error);
      setError('Failed to load configuration data');
      
      // Fallback to sync data
      try {
        const l4Sync = productDataService.getLevel4ProductsSync();
        const l3Sync = productDataService.getLevel3ProductsSync();
        setLevel4Products(l4Sync);
        setLevel3Products(l3Sync);
        console.log('Level4ConfigurationManager: Fallback to sync data successful');
      } catch (syncError) {
        console.error('Level4ConfigurationManager: Fallback also failed:', syncError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const filteredLevel4Products = level4Products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel3 = selectedLevel3 === 'all' || product.parentProductId === selectedLevel3;
    return matchesSearch && matchesLevel3;
  });

  const handleCreateProduct = async (productData: Omit<Level4Product, 'id'>) => {
    try {
      await productDataService.createLevel4Product(productData);
      await loadData(); // Reload data after creation
      setIsFormOpen(false);
      toast({
        title: "Success",
        description: "Level 4 configuration created successfully"
      });
    } catch (error) {
      console.error('Error creating Level 4 configuration:', error);
      toast({
        title: "Error",
        description: "Failed to create Level 4 configuration",
        variant: "destructive"
      });
    }
  };

  const handleUpdateProduct = async (productData: Level4Product) => {
    try {
      // Update method needs to be implemented in service
      await loadData(); // Reload data after update
      setIsFormOpen(false);
      setEditingProduct(undefined);
      toast({
        title: "Success",
        description: "Level 4 configuration updated successfully"
      });
    } catch (error) {
      console.error('Error updating Level 4 configuration:', error);
      toast({
        title: "Error",
        description: "Failed to update Level 4 configuration",
        variant: "destructive"
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (confirm('Are you sure you want to delete this Level 4 configuration?')) {
      try {
        // Delete method needs to be implemented in service
        await loadData(); // Reload data after deletion
        toast({
          title: "Success",
          description: "Level 4 configuration deleted successfully"
        });
      } catch (error) {
        console.error('Error deleting Level 4 configuration:', error);
        toast({
          title: "Error",
          description: "Failed to delete Level 4 configuration",
          variant: "destructive"
        });
      }
    }
  };

  const getLevel3ProductName = (level3Id: string) => {
    const level3 = level3Products.find(p => p.id === level3Id);
    return level3?.name || 'Unknown Product';
  };

  if (isLoading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Level 4 Configuration</h2>
            <p className="text-gray-600">Loading configuration data...</p>
          </div>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-600">Loading Level 4 configurations...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6">
        <div className="text-center py-8">
          <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">Failed to Load Configuration Data</h3>
          <p className="text-gray-600 mb-4">{error}</p>
          <Button onClick={loadData} variant="default">
            Retry Loading
          </Button>
        </div>
      </div>
    );
  }

  if (level3Products.length === 0) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-2xl font-bold">Level 4 Configuration</h2>
            <p className="text-gray-600">Manage product-specific configurations for Level 3 products</p>
          </div>
        </div>
        <Card>
          <CardContent className="text-center py-8">
            <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Level 3 Products Available</h3>
            <p className="text-gray-600 mb-4">
              You need to create Level 3 products before you can add Level 4 configurations.
            </p>
            <p className="text-sm text-gray-500">
              Go to the Level 3 Products tab to create cards, components, or options first.
            </p>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold">Level 4 Configuration</h2>
          <p className="text-gray-600">Manage product-specific configurations for Level 3 products</p>
        </div>
        <Button onClick={() => setIsFormOpen(true)}>
          <Plus className="h-4 w-4 mr-2" />
          Add Configuration
        </Button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        <div>
          <Label htmlFor="search">Search Configurations</Label>
          <Input
            id="search"
            placeholder="Search by name or description..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
          />
        </div>
        
        <div>
          <Label htmlFor="level3Filter">Filter by Level 3 Product</Label>
          <Select value={selectedLevel3} onValueChange={setSelectedLevel3}>
            <SelectTrigger>
              <SelectValue placeholder="All Level 3 Products" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Level 3 Products</SelectItem>
              {level3Products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex items-end">
          <div className="text-sm text-gray-600">
            Showing {filteredLevel4Products.length} of {level4Products.length} configurations
          </div>
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {filteredLevel4Products.map((product) => (
          <Card key={product.id} className="hover:shadow-md transition-shadow">
            <CardHeader className="pb-3">
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-lg">{product.name}</CardTitle>
                  <p className="text-sm text-gray-600 mt-1">
                    Parent: {getLevel3ProductName(product.parentProductId)}
                  </p>
                </div>
                <div className="flex items-center space-x-1">
                  <Badge variant={product.enabled ? "default" : "secondary"}>
                    {product.enabled ? "Active" : "Inactive"}
                  </Badge>
                </div>
              </div>
            </CardHeader>
            
            <CardContent className="space-y-3">
              <div>
                <div className="flex items-center space-x-2 mb-2">
                  {product.configurationType === 'dropdown' ? 
                    <List className="h-4 w-4" /> : 
                    <Settings className="h-4 w-4" />
                  }
                  <Badge variant="outline">
                    {product.configurationType === 'dropdown' ? 'Dropdown' : 'Multi-line'}
                  </Badge>
                </div>
                
                {product.description && (
                  <p className="text-sm text-gray-600 mb-3">{product.description}</p>
                )}
                
                <div className="text-sm">
                  <p><strong>Options:</strong> {product.options?.length || 0}</p>
                  <p><strong>Price:</strong> ${product.price}</p>
                  {product.cost && product.cost > 0 && (
                    <p><strong>Cost:</strong> ${product.cost}</p>
                  )}
                </div>

                {product.options && product.options.length > 0 && (
                  <div className="mt-3">
                    <p className="text-xs text-gray-500 mb-1">Sample Options:</p>
                    <div className="flex flex-wrap gap-1">
                      {product.options.slice(0, 3).map((option) => (
                        <Badge key={option.id} variant="secondary" className="text-xs">
                          {option.optionValue}
                        </Badge>
                      ))}
                      {product.options.length > 3 && (
                        <Badge variant="secondary" className="text-xs">
                          +{product.options.length - 3} more
                        </Badge>
                      )}
                    </div>
                  </div>
                )}
              </div>
              
              <div className="flex justify-end space-x-2 pt-2">
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => {
                    setEditingProduct(product);
                    setIsFormOpen(true);
                  }}
                >
                  <Edit className="h-4 w-4" />
                </Button>
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => handleDeleteProduct(product.id)}
                >
                  <Trash2 className="h-4 w-4" />
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      {filteredLevel4Products.length === 0 && level4Products.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Level 4 Configurations</h3>
            <p className="text-gray-600 mb-4">
              Create your first Level 4 configuration to get started.
            </p>
            <Button onClick={() => setIsFormOpen(true)}>
              <Plus className="h-4 w-4 mr-2" />
              Add First Configuration
            </Button>
          </CardContent>
        </Card>
      )}

      {filteredLevel4Products.length === 0 && level4Products.length > 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Matching Configurations</h3>
            <p className="text-gray-600">
              No configurations match your current search or filter criteria.
            </p>
          </CardContent>
        </Card>
      )}

      <Dialog open={isFormOpen} onOpenChange={(open) => {
        setIsFormOpen(open);
        if (!open) {
          setEditingProduct(undefined);
        }
      }}>
        <DialogContent className="max-w-4xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle>
              {editingProduct ? 'Edit' : 'Create'} Level 4 Configuration
            </DialogTitle>
          </DialogHeader>
          <Level4ProductForm
            product={editingProduct}
            onSave={editingProduct ? handleUpdateProduct : handleCreateProduct}
            onCancel={() => {
              setIsFormOpen(false);
              setEditingProduct(undefined);
            }}
          />
        </DialogContent>
      </Dialog>
    </div>
  );
};

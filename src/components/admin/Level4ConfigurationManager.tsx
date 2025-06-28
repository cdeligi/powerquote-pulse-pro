
import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Trash2, Edit, Plus, Settings, List } from "lucide-react";
import { Level4Product, Level3Product } from "@/types/product";
import { productDataService } from "@/services/productDataService";
import { Level4ProductForm } from "./product-forms/Level4ProductForm";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { useToast } from "@/hooks/use-toast";

export const Level4ConfigurationManager: React.FC = () => {
  const [level4Products, setLevel4Products] = useState<Level4Product[]>([]);
  const [level3Products, setLevel3Products] = useState<Level3Product[]>([]);
  const [selectedLevel3, setSelectedLevel3] = useState<string>('');
  const [searchTerm, setSearchTerm] = useState('');
  const [isFormOpen, setIsFormOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<Level4Product | undefined>();
  const { toast } = useToast();

  useEffect(() => {
    loadData();
  }, []);

  const loadData = () => {
    setLevel4Products(productDataService.getLevel4Products());
    setLevel3Products(productDataService.getLevel3Products());
  };

  const filteredLevel4Products = level4Products.filter(product => {
    const matchesSearch = product.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         product.description?.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesLevel3 = !selectedLevel3 || product.parentProductId === selectedLevel3;
    return matchesSearch && matchesLevel3;
  });

  const handleCreateProduct = async (productData: Omit<Level4Product, 'id'>) => {
    try {
      await productDataService.createLevel4Product(productData);
      loadData();
      setIsFormOpen(false);
      toast({
        title: "Success",
        description: "Level 4 configuration created successfully"
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to create Level 4 configuration",
        variant: "destructive"
      });
    }
  };

  const handleUpdateProduct = async (productData: Level4Product) => {
    try {
      await productDataService.updateLevel4Product(productData.id, productData);
      loadData();
      setIsFormOpen(false);
      setEditingProduct(undefined);
      toast({
        title: "Success",
        description: "Level 4 configuration updated successfully"
      });
    } catch (error) {
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
        await productDataService.deleteLevel4Product(productId);
        loadData();
        toast({
          title: "Success",
          description: "Level 4 configuration deleted successfully"
        });
      } catch (error) {
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
              <SelectItem value="">All Level 3 Products</SelectItem>
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

      {filteredLevel4Products.length === 0 && (
        <Card>
          <CardContent className="text-center py-8">
            <Settings className="h-12 w-12 mx-auto text-gray-400 mb-4" />
            <h3 className="text-lg font-medium text-gray-900 mb-2">No Level 4 Configurations</h3>
            <p className="text-gray-600 mb-4">
              {searchTerm || selectedLevel3 
                ? 'No configurations match your current filters.'
                : 'Create your first Level 4 configuration to get started.'
              }
            </p>
            {!searchTerm && !selectedLevel3 && (
              <Button onClick={() => setIsFormOpen(true)}>
                <Plus className="h-4 w-4 mr-2" />
                Add First Configuration
              </Button>
            )}
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


/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Package, Plus, Edit, Trash2, Eye, EyeOff } from 'lucide-react';

interface Level2Product {
  id: string;
  name: string;
  parentProductId: string;
  type: string;
  description: string;
  price: number;
  cost?: number;
  enabled: boolean;
  specifications?: any;
  partNumber?: string;
  image?: string;
  productInfoUrl?: string;
}

const Level2ProductManager = () => {
  const [level2Products, setLevel2Products] = useState<Level2Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Level2Product | null>(null);
  const [showForm, setShowForm] = useState(false);
  const { toast } = useToast();

  const [formData, setFormData] = useState({
    name: '',
    parentProductId: '',
    type: '',
    description: '',
    price: 0,
    cost: 0,
    enabled: true,
    partNumber: '',
    specifications: {}
  });

  useEffect(() => {
    fetchLevel2Products();
  }, []);

  const fetchLevel2Products = async () => {
    try {
      setLoading(true);
      
      // Fetch from products table where category indicates Level 2
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'level2')
        .order('name');

      if (error) throw error;

      const products: Level2Product[] = (data || []).map(item => ({
        id: item.id,
        name: item.name,
        parentProductId: item.subcategory || '',
        type: item.subcategory || 'Standard',
        description: item.description || '',
        price: Number(item.price) || 0,
        cost: Number(item.cost) || 0,
        enabled: item.is_active || false,
        partNumber: '',
        specifications: {}
      }));

      setLevel2Products(products);
    } catch (error) {
      console.error('Error fetching Level 2 products:', error);
      toast({
        title: "Error",
        description: "Failed to fetch Level 2 products",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      if (editingProduct) {
        // Update existing product
        const { error } = await supabase
          .from('products')
          .update({
            name: formData.name,
            description: formData.description,
            price: formData.price,
            cost: formData.cost,
            is_active: formData.enabled,
            subcategory: formData.type,
            updated_at: new Date().toISOString()
          })
          .eq('id', editingProduct.id);

        if (error) throw error;

        toast({
          title: "Success",
          description: "Level 2 product updated successfully"
        });
      } else {
        // Create new product
        const { error } = await supabase
          .from('products')
          .insert({
            id: `level2-${Date.now()}`,
            name: formData.name,
            description: formData.description,
            price: formData.price,
            cost: formData.cost,
            category: 'level2',
            subcategory: formData.type,
            is_active: formData.enabled
          });

        if (error) throw error;

        toast({
          title: "Success",
          description: "Level 2 product created successfully"
        });
      }

      // Reset form and refresh data
      resetForm();
      fetchLevel2Products();
    } catch (error) {
      console.error('Error saving Level 2 product:', error);
      toast({
        title: "Error",
        description: "Failed to save Level 2 product",
        variant: "destructive"
      });
    }
  };

  const handleEdit = (product: Level2Product) => {
    setEditingProduct(product);
    setFormData({
      name: product.name,
      parentProductId: product.parentProductId,
      type: product.type,
      description: product.description,
      price: product.price,
      cost: product.cost || 0,
      enabled: product.enabled,
      partNumber: product.partNumber || '',
      specifications: product.specifications || {}
    });
    setShowForm(true);
  };

  const handleToggleEnabled = async (product: Level2Product) => {
    try {
      const { error } = await supabase
        .from('products')
        .update({ 
          is_active: !product.enabled,
          updated_at: new Date().toISOString()
        })
        .eq('id', product.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: `Product ${!product.enabled ? 'enabled' : 'disabled'} successfully`
      });
      
      fetchLevel2Products();
    } catch (error) {
      console.error('Error toggling product status:', error);
      toast({
        title: "Error",
        description: "Failed to update product status",
        variant: "destructive"
      });
    }
  };

  const handleDelete = async (product: Level2Product) => {
    if (!confirm(`Are you sure you want to delete "${product.name}"?`)) return;

    try {
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', product.id);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Level 2 product deleted successfully"
      });
      
      fetchLevel2Products();
    } catch (error) {
      console.error('Error deleting Level 2 product:', error);
      toast({
        title: "Error",
        description: "Failed to delete Level 2 product",
        variant: "destructive"
      });
    }
  };

  const resetForm = () => {
    setFormData({
      name: '',
      parentProductId: '',
      type: '',
      description: '',
      price: 0,
      cost: 0,
      enabled: true,
      partNumber: '',
      specifications: {}
    });
    setEditingProduct(null);
    setShowForm(false);
  };

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-6">
          <div className="animate-pulse space-y-4">
            <div className="h-4 bg-gray-700 rounded w-1/4"></div>
            <div className="h-4 bg-gray-700 rounded w-1/2"></div>
            <div className="h-4 bg-gray-700 rounded w-3/4"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              Level 2 Products Management
            </div>
            <Button
              onClick={() => setShowForm(true)}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="h-4 w-4 mr-2" />
              Add Level 2 Product
            </Button>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {showForm && (
            <form onSubmit={handleSubmit} className="space-y-4 mb-6 p-4 bg-gray-800 rounded-lg">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="name" className="text-white">Product Name *</Label>
                  <Input
                    id="name"
                    value={formData.name}
                    onChange={(e) => setFormData({ ...formData, name: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="type" className="text-white">Product Type *</Label>
                  <Input
                    id="type"
                    value={formData.type}
                    onChange={(e) => setFormData({ ...formData, type: e.target.value })}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="price" className="text-white">Price *</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={formData.price}
                    onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
                    className="bg-gray-700 border-gray-600 text-white"
                    required
                  />
                </div>
                <div>
                  <Label htmlFor="cost" className="text-white">Cost</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={formData.cost}
                    onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
                </div>
              </div>
              <div>
                <Label htmlFor="description" className="text-white">Description</Label>
                <Input
                  id="description"
                  value={formData.description}
                  onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
              <div className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id="enabled"
                  checked={formData.enabled}
                  onChange={(e) => setFormData({ ...formData, enabled: e.target.checked })}
                  className="rounded"
                />
                <Label htmlFor="enabled" className="text-white">Enabled</Label>
              </div>
              <div className="flex space-x-2">
                <Button type="submit" className="bg-green-600 hover:bg-green-700 text-white">
                  {editingProduct ? 'Update' : 'Create'} Product
                </Button>
                <Button type="button" onClick={resetForm} variant="outline" className="border-gray-600 text-gray-300">
                  Cancel
                </Button>
              </div>
            </form>
          )}

          <div className="space-y-4">
            {level2Products.map((product) => (
              <div key={product.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
                <div className="flex-1">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-white font-medium">{product.name}</h4>
                    <Badge variant={product.enabled ? "default" : "secondary"}>
                      {product.type}
                    </Badge>
                    {!product.enabled && (
                      <Badge variant="outline" className="text-red-400 border-red-400">
                        Disabled
                      </Badge>
                    )}
                  </div>
                  <p className="text-gray-400 text-sm">{product.description}</p>
                  <div className="flex space-x-4 text-sm mt-1">
                    <span className="text-green-400">Price: ${product.price}</span>
                    {product.cost && product.cost > 0 && (
                      <span className="text-orange-400">Cost: ${product.cost}</span>
                    )}
                  </div>
                </div>
                <div className="flex space-x-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleToggleEnabled(product)}
                    className="text-gray-400 hover:text-white"
                  >
                    {product.enabled ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEdit(product)}
                    className="text-blue-400 hover:text-blue-300"
                  >
                    <Edit className="h-4 w-4" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleDelete(product)}
                    className="text-red-400 hover:text-red-300"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              </div>
            ))}
            {level2Products.length === 0 && (
              <div className="text-center py-8 text-gray-400">
                No Level 2 products found. Click "Add Level 2 Product" to create your first one.
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default Level2ProductManager;

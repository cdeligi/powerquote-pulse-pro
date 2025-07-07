
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Plus, Edit3, Trash2, Package, AlertCircle } from 'lucide-react';

const Level2ProductManager: React.FC = () => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [products, setProducts] = useState<any[]>([]);
  const [level1Products, setLevel1Products] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [editingProduct, setEditingProduct] = useState<any>(null);
  const [formData, setFormData] = useState({
    id: '',
    name: '',
    description: '',
    category: 'level2',
    subcategory: '',
    cost: 0,
    price: 0,
    is_active: true,
    level1_relationships: [] as string[]
  });

  useEffect(() => {
    if (user?.role === 'admin') {
      fetchProducts();
      fetchLevel1Products();
    }
  }, [user]);

  const fetchProducts = async () => {
    try {
      console.log('[Level2ProductManager] Fetching Level2 products...');
      
      // Fetch Level2 products with their relationships
      const { data: productsData, error: productsError } = await supabase
        .from('products')
        .select(`
          *,
          level1_level2_relationships!level2_product_id (
            level1_product_id
          )
        `)
        .eq('category', 'level2')
        .order('name');

      if (productsError) {
        console.error('[Level2ProductManager] Error fetching products:', productsError);
        throw productsError;
      }

      console.log('[Level2ProductManager] Fetched products:', productsData);
      setProducts(productsData || []);
    } catch (error) {
      console.error('Error fetching Level2 products:', error);
      toast({
        title: "Error",
        description: "Failed to load Level2 products. Check console for details.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const fetchLevel1Products = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'level1')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setLevel1Products(data || []);
    } catch (error) {
      console.error('Error fetching Level1 products:', error);
    }
  };

  const handleSave = async () => {
    if (!formData.name.trim()) {
      toast({
        title: "Error",
        description: "Product name is required",
        variant: "destructive"
      });
      return;
    }

    if (!formData.id.trim()) {
      toast({
        title: "Error", 
        description: "Product ID is required",
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const productData = {
        id: formData.id,
        name: formData.name,
        description: formData.description,
        category: 'level2',
        subcategory: formData.subcategory,
        cost: formData.cost,
        price: formData.price,
        is_active: formData.is_active
      };

      let error;
      if (editingProduct) {
        const { error: updateError } = await supabase
          .from('products')
          .update(productData)
          .eq('id', editingProduct.id);
        error = updateError;
      } else {
        const { error: insertError } = await supabase
          .from('products')
          .insert(productData);
        error = insertError;
      }

      if (error) throw error;

      // Handle Level1 relationships
      if (formData.level1_relationships.length > 0) {
        // Remove existing relationships
        await supabase
          .from('level1_level2_relationships')
          .delete()
          .eq('level2_product_id', formData.id);

        // Add new relationships
        const relationships = formData.level1_relationships.map(level1Id => ({
          level1_product_id: level1Id,
          level2_product_id: formData.id
        }));

        const { error: relationshipError } = await supabase
          .from('level1_level2_relationships')
          .insert(relationships);

        if (relationshipError) throw relationshipError;
      }

      toast({
        title: "Success",
        description: `Level2 product ${editingProduct ? 'updated' : 'created'} successfully`,
      });

      setIsDialogOpen(false);
      resetForm();
      fetchProducts();
    } catch (error: any) {
      console.error('Error saving Level2 product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to save Level2 product", 
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleEdit = (product: any) => {
    setEditingProduct(product);
    setFormData({
      id: product.id,
      name: product.name,
      description: product.description || '',
      category: 'level2',
      subcategory: product.subcategory || '',
      cost: product.cost || 0,
      price: product.price || 0,
      is_active: product.is_active,
      level1_relationships: product.level1_level2_relationships?.map((rel: any) => rel.level1_product_id) || []
    });
    setIsDialogOpen(true);
  };

  const handleDelete = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this Level2 product?')) return;

    setLoading(true);
    try {
      // Delete relationships first
      await supabase
        .from('level1_level2_relationships')
        .delete()
        .eq('level2_product_id', productId);

      // Then delete product
      const { error } = await supabase
        .from('products')
        .delete()
        .eq('id', productId);

      if (error) throw error;

      toast({
        title: "Success",
        description: "Level2 product deleted successfully",
      });

      fetchProducts();
    } catch (error: any) {
      console.error('Error deleting Level2 product:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete Level2 product",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setFormData({
      id: '',
      name: '',
      description: '',
      category: 'level2',
      subcategory: '',
      cost: 0,
      price: 0,
      is_active: true,
      level1_relationships: []
    });
    setEditingProduct(null);
  };

  const handleOpenDialog = () => {
    resetForm();
    setIsDialogOpen(true);
  };

  if (user?.role !== 'admin') {
    return (
      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <CardContent className="p-8 text-center">
          <AlertCircle className="w-12 h-12 text-red-500 mx-auto mb-4" />
          <p className="text-gray-600 dark:text-gray-400">Access denied. Admin privileges required.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <CardHeader>
        <div className="flex justify-between items-center">
          <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
            <Package className="w-5 h-5" />
            Level 2 Products ({products.length})
          </CardTitle>
          <Dialog open={isDialogOpen} onOpenChange={setIsDialogOpen}>
            <DialogTrigger asChild>
              <Button 
                onClick={handleOpenDialog}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <Plus className="w-4 h-4 mr-2" />
                Add Level2 Product
              </Button>
            </DialogTrigger>
            <DialogContent className="max-w-2xl bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
              <DialogHeader>
                <DialogTitle className="text-gray-900 dark:text-white">
                  {editingProduct ? 'Edit Level2 Product' : 'Add New Level2 Product'}
                </DialogTitle>
              </DialogHeader>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Product ID *</Label>
                    <Input
                      value={formData.id}
                      onChange={(e) => setFormData(prev => ({ ...prev, id: e.target.value }))}
                      placeholder="e.g., L2-OPTION-001"
                      disabled={!!editingProduct}
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Name *</Label>
                    <Input
                      value={formData.name}
                      onChange={(e) => setFormData(prev => ({ ...prev, name: e.target.value }))}
                      placeholder="Product name"
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Description</Label>
                  <Input
                    value={formData.description}
                    onChange={(e) => setFormData(prev => ({ ...prev, description: e.target.value }))}
                    placeholder="Product description"
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-3 gap-4">
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Subcategory</Label>
                    <Input
                      value={formData.subcategory}
                      onChange={(e) => setFormData(prev => ({ ...prev, subcategory: e.target.value }))}
                      placeholder="e.g., advanced"
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Cost</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.cost}
                      onChange={(e) => setFormData(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>
                  <div>
                    <Label className="text-gray-700 dark:text-gray-300">Price</Label>
                    <Input
                      type="number"
                      step="0.01"
                      value={formData.price}
                      onChange={(e) => setFormData(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Compatible Level1 Products</Label>
                  <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-md p-2 bg-white dark:bg-gray-700">
                    {level1Products.map(product => (
                      <label key={product.id} className="flex items-center gap-2 py-1">
                        <input
                          type="checkbox"
                          checked={formData.level1_relationships.includes(product.id)}
                          onChange={(e) => {
                            if (e.target.checked) {
                              setFormData(prev => ({
                                ...prev,
                                level1_relationships: [...prev.level1_relationships, product.id]
                              }));
                            } else {
                              setFormData(prev => ({
                                ...prev,
                                level1_relationships: prev.level1_relationships.filter(id => id !== product.id)
                              }));
                            }
                          }}
                          className="rounded"
                        />
                        <span className="text-gray-700 dark:text-gray-300">{product.name}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    id="is_active"
                    checked={formData.is_active}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_active: e.target.checked }))}
                    className="rounded"
                  />
                  <Label htmlFor="is_active" className="text-gray-700 dark:text-gray-300">Active</Label>
                </div>

                <div className="flex gap-2">
                  <Button 
                    onClick={handleSave}
                    disabled={loading}
                    className="flex-1 bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {loading ? 'Saving...' : editingProduct ? 'Update Product' : 'Create Product'}
                  </Button>
                  <Button 
                    onClick={() => setIsDialogOpen(false)}
                    variant="outline"
                    className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">Loading Level2 products...</div>
        ) : products.length === 0 ? (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No Level2 products found. Create your first Level2 product to get started.
          </div>
        ) : (
          <div className="space-y-4">
            {products.map((product) => (
              <div key={product.id} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <h3 className="font-semibold text-gray-900 dark:text-white">{product.name}</h3>
                      <Badge variant={product.is_active ? "default" : "secondary"}>
                        {product.is_active ? "Active" : "Inactive"}
                      </Badge>
                    </div>
                    <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">ID: {product.id}</p>
                    {product.description && (
                      <p className="text-sm text-gray-600 dark:text-gray-400 mb-2">{product.description}</p>
                    )}
                    <div className="flex gap-4 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">Cost: ${product.cost?.toFixed(2) || '0.00'}</span>
                      <span className="text-gray-600 dark:text-gray-400">Price: ${product.price?.toFixed(2) || '0.00'}</span>
                      {product.subcategory && (
                        <span className="text-gray-600 dark:text-gray-400">Type: {product.subcategory}</span>
                      )}
                    </div>
                    {product.level1_level2_relationships && product.level1_level2_relationships.length > 0 && (
                      <div className="mt-2">
                        <span className="text-xs text-gray-500 dark:text-gray-500">
                          Compatible with {product.level1_level2_relationships.length} Level1 product(s)
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="flex gap-2">
                    <Button
                      onClick={() => handleEdit(product)}
                      size="sm"
                      variant="outline"
                      className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                    <Button
                      onClick={() => handleDelete(product.id)}
                      size="sm"
                      variant="outline"
                      className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900"
                    >
                      <Trash2 className="w-4 h-4" />
                    </Button>
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default Level2ProductManager;

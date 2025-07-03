import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Textarea } from '@/components/ui/textarea';
import { toast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { Edit, Trash2, Plus, Save, X, ExternalLink } from 'lucide-react';

interface Level2Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  cost?: number;
  is_active: boolean;
  category?: string;
  subcategory?: string;
  created_at: string;
  updated_at: string;
  productInfoUrl?: string;
}

const Level2ProductList = () => {
  const [products, setProducts] = useState<Level2Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [editingProduct, setEditingProduct] = useState<Level2Product | null>(null);
  const [showAddForm, setShowAddForm] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  
  const [newProduct, setNewProduct] = useState({
    id: '',
    name: '',
    description: '',
    price: 0,
    cost: 0,
    category: 'Level2',
    subcategory: '',
    productInfoUrl: ''
  });

  useEffect(() => {
    fetchProducts();
  }, []);

  const fetchProducts = async () => {
    setLoading(true);
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'Level2')
        .order('name', { ascending: true });

      if (error) {
        console.error('Error fetching Level2 products:', error);
        toast({
          title: "Error",
          description: "Failed to fetch Level2 products",
          variant: "destructive",
        });
        return;
      }

      setProducts(data || []);
    } catch (error) {
      console.error('Unexpected error:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleSaveProduct = async (product: Partial<Level2Product>, isNew = false) => {
    try {
      if (isNew) {
        const { error } = await supabase
          .from('products')
          .insert({
            id: product.id,
            name: product.name,
            description: product.productInfoUrl ? 
              `${product.description || ''}\n\nProduct Info: ${product.productInfoUrl}`.trim() : 
              product.description,
            price: product.price,
            cost: product.cost,
            category: 'Level2',
            subcategory: product.subcategory,
            is_active: true
          });

        if (error) throw error;
        
        setShowAddForm(false);
        setNewProduct({
          id: '',
          name: '',
          description: '',
          price: 0,
          cost: 0,
          category: 'Level2',
          subcategory: '',
          productInfoUrl: ''
        });
      } else {
        const { error } = await supabase
          .from('products')
          .update({
            name: product.name,
            description: product.productInfoUrl ? 
              `${product.description || ''}\n\nProduct Info: ${product.productInfoUrl}`.trim() : 
              product.description,
            price: product.price,
            cost: product.cost,
            subcategory: product.subcategory,
            updated_at: new Date().toISOString()
          })
          .eq('id', product.id);

        if (error) throw error;
        setEditingProduct(null);
      }

      toast({
        title: "Success",
        description: `Level2 product ${isNew ? 'created' : 'updated'} successfully`,
      });

      fetchProducts();
    } catch (error: any) {
      console.error('Save error:', error);
      toast({
        title: "Error",
        description: error.message || `Failed to ${isNew ? 'create' : 'update'} Level2 product`,
        variant: "destructive",
      });
    }
  };

  const handleDeleteProduct = async (productId: string) => {
    if (!confirm('Are you sure you want to delete this product?')) return;

    try {
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
      console.error('Delete error:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete Level2 product",
        variant: "destructive",
      });
    }
  };

  const extractProductInfoUrl = (description: string) => {
    const match = description?.match(/Product Info:\s*(https?:\/\/[^\s\n]+)/);
    return match ? match[1] : '';
  };

  const cleanDescription = (description: string, productInfoUrl: string) => {
    if (!productInfoUrl) return description;
    return description?.replace(/\n\nProduct Info:\s*https?:\/\/[^\s\n]+/, '') || '';
  };

  const ProductForm = ({ product, isNew = false }: { product: any, isNew?: boolean }) => {
    const [localProduct, setLocalProduct] = useState(() => {
      if (isNew) return product;
      
      const productInfoUrl = extractProductInfoUrl(product.description);
      return {
        ...product,
        description: cleanDescription(product.description, productInfoUrl),
        productInfoUrl
      };
    });

    const handleSave = () => {
      handleSaveProduct(localProduct, isNew);
    };

    return (
      <div className="space-y-4 p-4 bg-gray-800 rounded border border-gray-700">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <Label className="text-white">Product ID *</Label>
            <Input
              value={localProduct.id}
              onChange={(e) => setLocalProduct(prev => ({ ...prev, id: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              disabled={!isNew}
              placeholder="L2-PRODUCT-001"
            />
          </div>
          <div>
            <Label className="text-white">Product Name *</Label>
            <Input
              value={localProduct.name}
              onChange={(e) => setLocalProduct(prev => ({ ...prev, name: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Enter product name"
            />
          </div>
        </div>

        <div>
          <Label className="text-white">Description</Label>
          <Textarea
            value={localProduct.description}
            onChange={(e) => setLocalProduct(prev => ({ ...prev, description: e.target.value }))}
            className="bg-gray-700 border-gray-600 text-white"
            placeholder="Enter product description"
            rows={3}
          />
        </div>

        <div>
          <Label className="text-white">Product Info URL</Label>
          <Input
            value={localProduct.productInfoUrl}
            onChange={(e) => setLocalProduct(prev => ({ ...prev, productInfoUrl: e.target.value }))}
            className="bg-gray-700 border-gray-600 text-white"
            placeholder="https://example.com/product-info"
            type="url"
          />
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label className="text-white">Price ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={localProduct.price}
              onChange={(e) => setLocalProduct(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          <div>
            <Label className="text-white">Cost ($)</Label>
            <Input
              type="number"
              step="0.01"
              value={localProduct.cost}
              onChange={(e) => setLocalProduct(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          <div>
            <Label className="text-white">Subcategory</Label>
            <Input
              value={localProduct.subcategory}
              onChange={(e) => setLocalProduct(prev => ({ ...prev, subcategory: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              placeholder="Optional subcategory"
            />
          </div>
        </div>

        <div className="flex space-x-2">
          <Button onClick={handleSave} className="bg-green-600 hover:bg-green-700 text-white">
            <Save className="mr-2 h-4 w-4" />
            {isNew ? 'Create Product' : 'Save Changes'}
          </Button>
          <Button 
            onClick={() => {
              if (isNew) {
                setShowAddForm(false);
              } else {
                setEditingProduct(null);
              }
            }}
            variant="outline"
            className="border-gray-600 text-gray-300 hover:bg-gray-800 hover:text-white"
          >
            <X className="mr-2 h-4 w-4" />
            Cancel
          </Button>
        </div>
      </div>
    );
  };

  const filteredProducts = products.filter(product =>
    product.name.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.id.toLowerCase().includes(searchQuery.toLowerCase()) ||
    product.subcategory?.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <div className="w-full max-w-none p-6 space-y-6 bg-gray-950 min-h-screen">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-white mb-2">Level 2 Products</h1>
          <p className="text-gray-400">Manage Level 2 product configurations</p>
        </div>
        <div className="flex space-x-2">
          <Button
            onClick={() => setShowAddForm(true)}
            className="bg-green-600 hover:bg-green-700 text-white"
          >
            <Plus className="mr-2 h-4 w-4" />
            Add Product
          </Button>
          <Button onClick={fetchProducts} disabled={loading} className="bg-blue-600 hover:bg-blue-700 text-white">
            {loading ? "Loading..." : "Refresh"}
          </Button>
        </div>
      </div>

      <div className="flex space-x-4">
        <Input
          placeholder="Search products..."
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="flex-1 bg-gray-800 border-gray-700 text-white placeholder-gray-400"
        />
      </div>

      {showAddForm && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Add New Level 2 Product</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductForm product={newProduct} isNew={true} />
          </CardContent>
        </Card>
      )}

      {loading ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8 text-center">
            <div className="text-white">Loading products...</div>
          </CardContent>
        </Card>
      ) : filteredProducts.length === 0 ? (
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="p-8 text-center">
            <div className="text-gray-400">No Level 2 products found</div>
          </CardContent>
        </Card>
      ) : (
        <div className="space-y-4">
          {filteredProducts.map((product) => (
            <Card key={product.id} className="bg-gray-900 border-gray-800 hover:border-gray-700">
              <CardContent className="p-6">
                {editingProduct?.id === product.id ? (
                  <ProductForm product={editingProduct} />
                ) : (
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center space-x-3 mb-2">
                        <h3 className="text-white font-semibold">{product.name}</h3>
                        <Badge className={product.is_active ? 'bg-green-600' : 'bg-red-600'}>
                          {product.is_active ? 'Active' : 'Inactive'}
                        </Badge>
                        {product.subcategory && (
                          <Badge variant="outline" className="text-blue-400 border-blue-400">
                            {product.subcategory}
                          </Badge>
                        )}
                      </div>
                      <p className="text-gray-400 text-sm mb-2">ID: {product.id}</p>
                      
                      {product.description && (
                        <p className="text-gray-300 text-sm mb-2">
                          {cleanDescription(product.description, extractProductInfoUrl(product.description))}
                        </p>
                      )}
                      
                      {extractProductInfoUrl(product.description) && (
                        <div className="flex items-center space-x-2 mb-2">
                          <span className="text-gray-400 text-sm">Product Info:</span>
                          <a 
                            href={extractProductInfoUrl(product.description)} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-400 hover:text-blue-300 text-sm flex items-center space-x-1"
                          >
                            <span>View Details</span>
                            <ExternalLink className="h-3 w-3" />
                          </a>
                        </div>
                      )}
                      
                      <div className="flex space-x-4 text-sm">
                        <span className="text-gray-400">
                          Price: <span className="text-green-400 font-medium">${product.price?.toLocaleString() || '0'}</span>
                        </span>
                        <span className="text-gray-400">
                          Cost: <span className="text-orange-400 font-medium">${product.cost?.toLocaleString() || '0'}</span>
                        </span>
                      </div>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={() => {
                          const productInfoUrl = extractProductInfoUrl(product.description);
                          setEditingProduct({
                            ...product,
                            description: cleanDescription(product.description, productInfoUrl),
                            productInfoUrl
                          });
                        }}
                        size="sm"
                        variant="ghost"
                        className="text-blue-400 hover:text-blue-300 hover:bg-gray-800"
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        onClick={() => handleDeleteProduct(product.id)}
                        size="sm"
                        variant="ghost"
                        className="text-red-400 hover:text-red-300 hover:bg-gray-800"
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
};

export default Level2ProductList;

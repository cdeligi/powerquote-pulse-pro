
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Level1Product } from '@/types/product';
import { productDataService } from '@/services/productDataService';
import { cn } from '@/lib/utils';

interface Level1ProductSelectorProps {
  onProductSelect: (product: Level1Product) => void;
  selectedProduct?: Level1Product;
}

const Level1ProductSelector = ({ onProductSelect, selectedProduct }: Level1ProductSelectorProps) => {
  const [products, setProducts] = useState<Level1Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    const loadProducts = async () => {
      try {
        setLoading(true);
        setError(null);
        
        // Initialize the service first
        await productDataService.initialize();
        
        // Get products from database/service
        const allProducts = await productDataService.getLevel1Products();
        const enabledProducts = allProducts.filter(p => p.enabled);
        
        console.log('Level1ProductSelector: Loaded products:', enabledProducts);
        setProducts(enabledProducts);
        
        if (enabledProducts.length === 0) {
          setError('No products available. Please check the database or create products in the Admin Panel.');
        }
      } catch (error) {
        console.error('Error loading Level 1 products:', error);
        setError('Failed to load products. Using fallback data.');
        
        // Fallback to sync method
        try {
          const syncProducts = productDataService.getLevel1ProductsSync();
          const enabledSyncProducts = syncProducts.filter(p => p.enabled);
          setProducts(enabledSyncProducts);
        } catch (syncError) {
          console.error('Sync fallback also failed:', syncError);
          setProducts([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadProducts();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-medium text-foreground">Select Main Product Category</h3>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading products...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-4">
         <h3 className="text-xl font-medium text-foreground">Select Main Product Category</h3>
        <div className="text-center py-8">
          <div className="text-red-400 mb-4">{error}</div>
          <Button 
            onClick={() => window.location.reload()} 
            variant="outline"
          >
            Reload Page
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-medium text-foreground">Select Main Product Category</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Card
            key={product.id}
            className={cn(
              "cursor-pointer transition-all hover:shadow-md h-full",
              selectedProduct?.id === product.id ? "ring-2 ring-primary" : "hover:border-primary"
            )}
            onClick={() => onProductSelect(product)}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {product.name}
                {product.type && (
                  <Badge variant="outline" className="text-xs">
                    {product.type}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-3">{product.description}</p>
              {product.price > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-foreground font-medium">
                    From ${product.price.toLocaleString()}
                  </span>
                </div>
              )}
              {product.partNumber && (
                <div className="mt-2">
                  <Badge variant="outline" className="text-xs">
                    {product.partNumber}
                  </Badge>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
      
      {products.length === 0 && !loading && !error && (
        <div className="text-center py-8">
          <p className="text-gray-400">No products available. Please create some products in the Admin Panel.</p>
        </div>
      )}
    </div>
  );
};

export default Level1ProductSelector;

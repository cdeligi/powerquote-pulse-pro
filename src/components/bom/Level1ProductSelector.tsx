
import { useState } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Level1Product } from '@/types/product';
import { productDataService } from '@/services/productDataService';

interface Level1ProductSelectorProps {
  onProductSelect: (product: Level1Product) => void;
  selectedProduct?: Level1Product;
}

const Level1ProductSelector = ({ onProductSelect, selectedProduct }: Level1ProductSelectorProps) => {
  const [products] = useState(() => productDataService.getLevel1Products().filter(p => p.enabled));

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-medium text-white">Select Main Product Category</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {products.map((product) => (
          <Card
            key={product.id}
            className={`cursor-pointer transition-all hover:shadow-lg ${
              selectedProduct?.id === product.id
                ? 'bg-red-600 border-red-500'
                : 'bg-gray-900 border-gray-800 hover:border-red-500'
            }`}
            onClick={() => onProductSelect(product)}
          >
            <CardHeader>
              <CardTitle className="text-white flex items-center justify-between">
                {product.name}
                {product.type && (
                  <Badge variant="outline" className="text-xs">
                    {product.type}
                  </Badge>
                )}
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm mb-3">{product.description}</p>
              {product.price > 0 && (
                <div className="flex justify-between items-center">
                  <span className="text-white font-medium">
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
      
      {products.length === 0 && (
        <div className="text-center py-8">
          <p className="text-gray-400">No products available. Please create some products in the Admin Panel.</p>
        </div>
      )}
    </div>
  );
};

export default Level1ProductSelector;

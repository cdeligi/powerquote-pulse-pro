
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Package, Plus } from 'lucide-react';
import { BOMItem } from '@/types/product';

interface ProductSelectorProps {
  level: 'level1' | 'level2' | 'level3';
  onProductSelect: (item: BOMItem) => void;
  canSeePrices: boolean;
}

const ProductSelector = ({ level, onProductSelect, canSeePrices }: ProductSelectorProps) => {
  const [selectedProducts, setSelectedProducts] = useState<string[]>([]);

  // Mock products for each level
  const mockProducts = {
    level1: [
      { id: 'dga-1', name: 'DGA Monitor', description: 'Dissolved Gas Analysis Monitor', price: 15000, cost: 8000 },
      { id: 'pd-1', name: 'PD Monitor', description: 'Partial Discharge Monitor', price: 12000, cost: 6500 },
      { id: 'qtms-1', name: 'QTMS System', description: 'Qualitrol Transformer Monitoring System', price: 25000, cost: 14000 }
    ],
    level2: [
      { id: 'opt-1', name: 'Ethernet Module', description: 'Network connectivity option', price: 500, cost: 200 },
      { id: 'opt-2', name: 'Wireless Module', description: 'Wireless connectivity option', price: 800, cost: 350 },
      { id: 'opt-3', name: 'Display Unit', description: 'Local display option', price: 1200, cost: 600 }
    ],
    level3: [
      { id: 'cust-1', name: 'Custom Enclosure', description: 'Weather-resistant housing', price: 2000, cost: 1000 },
      { id: 'cust-2', name: 'Extended Cable', description: '50ft extension cable', price: 300, cost: 100 },
      { id: 'cust-3', name: 'Mounting Kit', description: 'Pole mounting hardware', price: 150, cost: 50 }
    ]
  };

  const products = mockProducts[level] || [];

  const handleProductSelect = (product: any) => {
    const bomItem: BOMItem = {
      id: Math.random().toString(),
      name: product.name,
      description: product.description,
      partNumber: product.id,
      quantity: 1,
      unitPrice: product.price,
      unitCost: product.cost,
      totalPrice: product.price,
      margin: ((product.price - product.cost) / product.price) * 100
    };

    onProductSelect(bomItem);
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
      {products.map((product) => (
        <Card key={product.id} className="bg-gray-800 border-gray-700 hover:border-blue-600 transition-colors">
          <CardHeader className="pb-3">
            <div className="flex items-center space-x-2">
              <Package className="h-5 w-5 text-blue-400" />
              <CardTitle className="text-white text-lg">{product.name}</CardTitle>
            </div>
          </CardHeader>
          <CardContent className="space-y-3">
            <p className="text-gray-300 text-sm">{product.description}</p>
            {canSeePrices && (
              <div className="flex justify-between items-center">
                <Badge variant="outline" className="text-green-400 border-green-600">
                  ${product.price.toLocaleString()}
                </Badge>
              </div>
            )}
            <Button
              onClick={() => handleProductSelect(product)}
              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
            >
              <Plus className="mr-2 h-4 w-4" />
              Add to BOM
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ProductSelector;

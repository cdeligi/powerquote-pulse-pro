import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Package, Plus, Edit, Trash2, Archive } from 'lucide-react';

interface Product {
  id: string;
  name: string;
  description?: string;
  category: string;
  price?: number;
  cost?: number;
  is_active: boolean;
}

export default function ProductManagement() {
  const [activeTab, setActiveTab] = useState('level1');

  // Mock product data
  const mockProducts = {
    level1: [
      { id: 'L1-001', name: 'PowerGuard System', description: 'Main monitoring system', category: 'Level1', price: 15000, cost: 8000, is_active: true },
      { id: 'L1-002', name: 'TechWatch Pro', description: 'Advanced monitoring solution', category: 'Level1', price: 12000, cost: 6500, is_active: true }
    ],
    level2: [
      { id: 'L2-001', name: '6U Chassis', description: 'Standard 6U chassis configuration', category: 'Level2', price: 3500, cost: 2000, is_active: true },
      { id: 'L2-002', name: '3U Chassis', description: 'Compact 3U chassis', category: 'Level2', price: 2500, cost: 1500, is_active: true }
    ],
    level3: [
      { id: 'L3-001', name: 'Analog Card', description: 'Multi-channel analog input card', category: 'Level3', price: 800, cost: 400, is_active: true },
      { id: 'L3-002', name: 'Digital Card', description: 'Digital I/O card', category: 'Level3', price: 600, cost: 300, is_active: true }
    ]
  };

  const renderProductTable = (products: Product[]) => (
    <div className="space-y-4">
      <div className="flex justify-between items-center">
        <p className="text-gray-400">{products.length} products found</p>
        <Button className="bg-green-600 hover:bg-green-700 text-white">
          <Plus className="mr-2 h-4 w-4" />
          Add Product
        </Button>
      </div>
      
      <div className="space-y-3">
        {products.map((product) => (
          <div
            key={product.id}
            className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
          >
            <div className="flex-1">
              <div className="flex items-center gap-3 mb-2">
                <div className="w-8 h-8 rounded-full bg-blue-600 flex items-center justify-center text-white text-sm font-medium">
                  <Package className="h-4 w-4" />
                </div>
                <div>
                  <h3 className="text-white font-medium">{product.name}</h3>
                  <p className="text-gray-400 text-sm">{product.description}</p>
                </div>
              </div>
              
              <div className="flex items-center gap-2">
                <Badge variant="outline" className="text-gray-300 border-gray-600">
                  {product.id}
                </Badge>
                <Badge className={`${product.is_active ? 'bg-green-600' : 'bg-gray-600'} text-white`}>
                  {product.is_active ? 'Active' : 'Inactive'}
                </Badge>
                {product.price && (
                  <Badge variant="outline" className="text-green-400 border-green-600">
                    ${product.price.toLocaleString()}
                  </Badge>
                )}
              </div>
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="ghost"
                size="sm"
                className="text-blue-400 hover:text-blue-300 hover:bg-gray-700"
              >
                <Edit className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-yellow-400 hover:text-yellow-300 hover:bg-gray-700"
              >
                <Archive className="h-4 w-4" />
              </Button>
              <Button
                variant="ghost"
                size="sm"
                className="text-red-400 hover:text-red-300 hover:bg-gray-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Package className="h-5 w-5" />
          Product Management
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full grid-cols-3 bg-gray-800">
            <TabsTrigger value="level1" className="text-white data-[state=active]:bg-blue-600">
              Level 1 Products
            </TabsTrigger>
            <TabsTrigger value="level2" className="text-white data-[state=active]:bg-blue-600">
              Level 2 Products
            </TabsTrigger>
            <TabsTrigger value="level3" className="text-white data-[state=active]:bg-blue-600">
              Level 3 Products
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="level1" className="mt-6">
            {renderProductTable(mockProducts.level1)}
          </TabsContent>
          
          <TabsContent value="level2" className="mt-6">
            {renderProductTable(mockProducts.level2)}
          </TabsContent>
          
          <TabsContent value="level3" className="mt-6">
            {renderProductTable(mockProducts.level3)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}
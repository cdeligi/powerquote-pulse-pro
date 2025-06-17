
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Level2Product, Level3Product } from "@/types/product";
import { ShoppingCart } from "lucide-react";

interface StandaloneProductSelectorProps {
  onProductSelect: (product: Level2Product | Level3Product) => void;
  canSeePrices: boolean;
}

const StandaloneProductSelector = ({ onProductSelect, canSeePrices }: StandaloneProductSelectorProps) => {
  const [activeTab, setActiveTab] = useState("level2");

  const level2Products: Level2Product[] = [
    {
      id: 'calgas-standalone',
      name: 'CalGas Calibration System',
      parentProductId: 'standalone',
      type: 'CalGas',
      description: 'Standalone gas calibration system for DGA monitoring',
      price: 2850,
      enabled: true,
      specifications: {
        capacity: '6 gas bottles',
        automation: 'Fully automated'
      },
      partNumber: 'CAL-GAS-001'
    },
    {
      id: 'moisture-standalone',
      name: 'Moisture Sensor Kit',
      parentProductId: 'standalone',
      type: 'Moisture',
      description: 'Standalone moisture monitoring solution',
      price: 1950,
      enabled: true,
      specifications: {
        range: '0-100% RH',
        accuracy: '±2%'
      },
      partNumber: 'MST-KIT-001'
    }
  ];

  const level3Products: Level3Product[] = [
    {
      id: 'temp-sensor-standalone',
      name: 'Temperature Sensor Package',
      parentProductId: 'standalone',
      type: 'sensor',
      description: 'Standalone temperature monitoring sensors',
      price: 850,
      enabled: true,
      specifications: {
        range: '-40°C to 150°C',
        accuracy: '±0.5°C',
        channels: 4
      },
      partNumber: 'TEMP-SENS-001'
    },
    {
      id: 'pressure-sensor-standalone',
      name: 'Pressure Sensor Package',
      parentProductId: 'standalone',
      type: 'sensor',
      description: 'Standalone pressure monitoring sensors',
      price: 1250,
      enabled: true,
      specifications: {
        range: '0-500 PSI',
        accuracy: '±1%',
        channels: 2
      },
      partNumber: 'PRES-SENS-001'
    },
    {
      id: 'vibration-sensor-standalone',
      name: 'Vibration Sensor Kit',
      parentProductId: 'standalone',
      type: 'sensor',
      description: 'Standalone vibration monitoring solution',
      price: 1850,
      enabled: true,
      specifications: {
        frequency: '10Hz-1kHz',
        sensitivity: '100mV/g',
        channels: 3
      },
      partNumber: 'VIB-SENS-001'
    },
    {
      id: 'fiber-accessory-standalone',
      name: 'Fiber Optic Accessory Kit',
      parentProductId: 'standalone',
      type: 'accessory',
      description: 'Complete fiber optic connection kit',
      price: 650,
      enabled: true,
      specifications: {
        connector: 'LC/SC',
        length: '50m',
        type: 'Single-mode'
      },
      partNumber: 'FIB-ACC-001'
    }
  ];

  const ProductCard = ({ product, onSelect }: { product: Level2Product | Level3Product, onSelect: () => void }) => (
    <Card className="bg-gray-800 border-gray-700 hover:border-red-600 transition-all cursor-pointer">
      <CardHeader>
        <CardTitle className="text-white text-lg">{product.name}</CardTitle>
        <CardDescription className="text-gray-400">
          {product.description}
        </CardDescription>
        <div className="flex gap-2 flex-wrap">
          <Badge variant="outline" className="text-white border-gray-500">
            {product.type}
          </Badge>
        </div>
      </CardHeader>
      <CardContent>
        <div className="space-y-2 mb-4">
          {Object.entries(product.specifications || {}).map(([key, value]) => (
            <div key={key} className="flex justify-between text-sm">
              <span className="text-gray-400 capitalize">{key}:</span>
              <span className="text-white">{value}</span>
            </div>
          ))}
        </div>
        
        <div className="flex justify-between items-center mb-4">
          <span className="text-white font-bold">
            {canSeePrices ? `$${product.price.toLocaleString()}` : '—'}
          </span>
          <span className="text-gray-400 text-xs">{product.partNumber}</span>
        </div>
        
        <Button 
          className="w-full bg-red-600 hover:bg-red-700 text-white"
          onClick={onSelect}
        >
          <ShoppingCart className="mr-2 h-4 w-4" />
          Add to BOM
        </Button>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h3 className="text-xl font-bold text-white mb-2">Standalone Products</h3>
        <p className="text-gray-400">Level 2 and Level 3 products available as standalone items</p>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-2 bg-gray-800">
          <TabsTrigger value="level2" className="text-white data-[state=active]:bg-red-600">
            Level 2 Products
          </TabsTrigger>
          <TabsTrigger value="level3" className="text-white data-[state=active]:bg-red-600">
            Level 3 Products
          </TabsTrigger>
        </TabsList>

        <TabsContent value="level2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {level2Products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onSelect={() => onProductSelect(product)}
              />
            ))}
          </div>
        </TabsContent>

        <TabsContent value="level3">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
            {level3Products.map((product) => (
              <ProductCard 
                key={product.id} 
                product={product} 
                onSelect={() => onProductSelect(product)}
              />
            ))}
          </div>
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default StandaloneProductSelector;

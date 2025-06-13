
import { Level1Product } from "@/types/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface Level1ProductSelectorProps {
  onProductSelect: (product: Level1Product) => void;
  selectedProduct: Level1Product | null;
  canSeePrices: boolean;
}

const Level1ProductSelector = ({ onProductSelect, selectedProduct, canSeePrices }: Level1ProductSelectorProps) => {
  const level1Products: Level1Product[] = [
    {
      id: 'qtms-ltx',
      name: 'QTMS - LTX Chassis',
      type: 'QTMS',
      description: 'High-capacity modular monitoring system with 14 slots',
      price: 12500,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/qtms',
      enabled: true
    },
    {
      id: 'qtms-mtx',
      name: 'QTMS - MTX Chassis',
      type: 'QTMS',
      description: 'Mid-range modular monitoring system with 7 slots',
      price: 8500,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/qtms',
      enabled: true
    },
    {
      id: 'qtms-stx',
      name: 'QTMS - STX Chassis',
      type: 'QTMS',
      description: 'Compact modular monitoring system with 4 slots',
      price: 5500,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/qtms',
      enabled: true
    },
    {
      id: 'tm8',
      name: 'TM8 - Dissolved Gas Monitor',
      type: 'TM8',
      description: 'Advanced 9-gas dissolved gas analysis monitor',
      price: 18500,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/tm8',
      enabled: true
    },
    {
      id: 'tm3',
      name: 'TM3 - Dissolved Gas Monitor',
      type: 'TM3',
      description: '3-gas dissolved gas analysis monitor',
      price: 12500,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/tm3',
      enabled: true
    },
    {
      id: 'tm1',
      name: 'TM1 - Single Gas H₂ Monitor',
      type: 'TM1',
      description: 'Hydrogen-specific gas monitoring solution',
      price: 8500,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/tm1',
      enabled: true
    },
    {
      id: 'qpdm',
      name: 'QPDM - Partial Discharge Monitor',
      type: 'QPDM',
      description: 'Advanced partial discharge monitoring system',
      price: 15500,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/qpdm',
      enabled: true
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4">Select Main System (Level 1)</h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {level1Products.filter(product => product.enabled).map((product) => (
          <Card 
            key={product.id} 
            className={`bg-gray-900 border-gray-800 cursor-pointer transition-all hover:border-red-600 ${
              selectedProduct?.id === product.id ? 'border-red-600 bg-red-900/20' : ''
            }`}
            onClick={() => onProductSelect(product)}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white text-lg">{product.name}</CardTitle>
                  <CardDescription className="text-gray-400">
                    {product.type}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs">
                  {product.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm mb-4">{product.description}</p>
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-white font-bold">
                  {canSeePrices ? `$${product.price.toLocaleString()}` : '—'}
                </span>
                {product.productInfoUrl && (
                  <Button
                    variant="ghost"
                    size="sm"
                    className="text-blue-400 hover:text-blue-300 p-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      window.open(product.productInfoUrl, '_blank');
                    }}
                  >
                    <ExternalLink className="h-4 w-4 mr-1" />
                    Product Info
                  </Button>
                )}
              </div>
              
              <Button 
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  onProductSelect(product);
                }}
              >
                Select System
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Level1ProductSelector;


import { Level1Product } from "@/types/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { ExternalLink } from "lucide-react";
import { useState } from "react";

interface Level1ProductSelectorProps {
  onProductSelect: (product: Level1Product, configuration?: Record<string, any>) => void;
  selectedProduct: Level1Product | null;
  canSeePrices: boolean;
  productType?: 'QTMS' | 'DGA' | 'PD';
}

const Level1ProductSelector = ({ onProductSelect, selectedProduct, canSeePrices, productType = 'QTMS' }: Level1ProductSelectorProps) => {
  const [productConfigs, setProductConfigs] = useState<Record<string, any>>({});

  const getProductsByType = () => {
    switch (productType) {
      case 'DGA':
        return [
          {
            id: 'tm8',
            name: 'TM8 - Dissolved Gas Monitor',
            type: 'TM8' as const,
            description: 'Advanced 9-gas dissolved gas analysis monitor',
            price: 18500,
            productInfoUrl: 'https://www.qualitrolcorp.com/products/tm8',
            enabled: true,
            customizations: ['CalGas', 'Helium Bottle', 'Moisture Sensor']
          },
          {
            id: 'tm3',
            name: 'TM3 - Dissolved Gas Monitor',
            type: 'TM3' as const,
            description: '3-gas dissolved gas analysis monitor',
            price: 12500,
            productInfoUrl: 'https://www.qualitrolcorp.com/products/tm3',
            enabled: true,
            customizations: ['CalGas', 'Helium Bottle', 'Moisture Sensor']
          },
          {
            id: 'tm1',
            name: 'TM1 - Single Gas H₂ Monitor',
            type: 'TM1' as const,
            description: 'Hydrogen-specific gas monitoring solution',
            price: 8500,
            productInfoUrl: 'https://www.qualitrolcorp.com/products/tm1',
            enabled: true,
            customizations: ['CalGas', 'Helium Bottle', 'Moisture Sensor']
          }
        ];
      case 'PD':
        return [
          {
            id: 'qpdm',
            name: 'QPDM - Partial Discharge Monitor',
            type: 'QPDM' as const,
            description: 'Advanced partial discharge monitoring system',
            price: 15500,
            productInfoUrl: 'https://www.qualitrolcorp.com/products/qpdm',
            enabled: true,
            customizations: ['3-channel', '6-channel']
          },
          {
            id: 'ic43',
            name: 'IC43 Coupler',
            type: 'QPDM' as const,
            description: 'Antenna coupler for partial discharge monitoring',
            price: 850,
            enabled: true,
            hasQuantitySelection: true
          },
          {
            id: 'ic44',
            name: 'IC44 Coupler',
            type: 'QPDM' as const,
            description: 'Antenna coupler for partial discharge monitoring',
            price: 950,
            enabled: true,
            hasQuantitySelection: true
          },
          {
            id: 'dn50',
            name: 'DN50 Drain Type Coupler',
            type: 'QPDM' as const,
            description: 'Drain type coupler for partial discharge monitoring',
            price: 1200,
            enabled: true,
            hasQuantitySelection: true
          },
          {
            id: 'dn25',
            name: 'DN25 Drain Type Coupler',
            type: 'QPDM' as const,
            description: 'Drain type coupler for partial discharge monitoring',
            price: 1100,
            enabled: true,
            hasQuantitySelection: true
          }
        ];
      default:
        return [
          {
            id: 'qtms-ltx',
            name: 'QTMS - LTX Chassis',
            type: 'QTMS' as const,
            description: 'High-capacity modular monitoring system with 14 slots',
            price: 12500,
            productInfoUrl: 'https://www.qualitrolcorp.com/products/qtms',
            enabled: true
          },
          {
            id: 'qtms-mtx',
            name: 'QTMS - MTX Chassis',
            type: 'QTMS' as const,
            description: 'Mid-range modular monitoring system with 7 slots',
            price: 8500,
            productInfoUrl: 'https://www.qualitrolcorp.com/products/qtms',
            enabled: true
          },
          {
            id: 'qtms-stx',
            name: 'QTMS - STX Chassis',
            type: 'QTMS' as const,
            description: 'Compact modular monitoring system with 4 slots',
            price: 5500,
            productInfoUrl: 'https://www.qualitrolcorp.com/products/qtms',
            enabled: true
          }
        ];
    }
  };

  const handleConfigChange = (productId: string, configKey: string, value: any) => {
    setProductConfigs(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [configKey]: value
      }
    }));
  };

  const getProductPrice = (product: any) => {
    let basePrice = product.price;
    const config = productConfigs[product.id];
    
    if (product.hasQuantitySelection && config?.quantity) {
      basePrice *= parseInt(config.quantity);
    }
    
    // Add incremental prices for DGA customizations
    if (product.customizations && productType === 'DGA' && config) {
      const incrementalPrices = {
        'CalGas': 450,
        'Helium Bottle': 280,
        'Moisture Sensor': 320
      };
      
      product.customizations.forEach((option: string) => {
        if (config[option] && incrementalPrices[option as keyof typeof incrementalPrices]) {
          basePrice += incrementalPrices[option as keyof typeof incrementalPrices];
        }
      });
    }
    
    return basePrice;
  };

  const handleProductSelect = (product: any) => {
    const config = productConfigs[product.id];
    onProductSelect(product as Level1Product, config);
  };

  const products = getProductsByType().filter(product => product.enabled);

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4">
        {productType === 'DGA' ? 'Select DGA Products' : 
         productType === 'PD' ? 'Select Partial Discharge Products' : 
         'Select Main System (Level 1)'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => (
          <Card 
            key={product.id} 
            className={`bg-gray-900 border-gray-800 cursor-pointer transition-all hover:border-red-600 ${
              selectedProduct?.id === product.id ? 'border-red-600 bg-red-900/20' : ''
            }`}
          >
            <CardHeader>
              <div className="flex justify-between items-start">
                <div>
                  <CardTitle className="text-white text-lg">{product.name}</CardTitle>
                  <CardDescription className="text-gray-400">
                    {product.type}
                  </CardDescription>
                </div>
                <Badge variant="outline" className="text-xs text-white border-gray-500">
                  {product.type}
                </Badge>
              </div>
            </CardHeader>
            <CardContent>
              <p className="text-gray-400 text-sm mb-4">{product.description}</p>
              
              {/* Customization options for DGA products */}
              {product.customizations && productType === 'DGA' && (
                <div className="space-y-2 mb-4">
                  <Label className="text-white text-sm">Options:</Label>
                  {product.customizations.map((option: string) => (
                    <div key={option} className="flex items-center space-x-2">
                      <input
                        type="checkbox"
                        id={`${product.id}-${option}`}
                        className="rounded"
                        onChange={(e) => handleConfigChange(product.id, option, e.target.checked)}
                      />
                      <label htmlFor={`${product.id}-${option}`} className="text-white text-sm">
                        {option}
                      </label>
                    </div>
                  ))}
                </div>
              )}

              {/* Channel selection for QPDM */}
              {product.id === 'qpdm' && (
                <div className="mb-4">
                  <Label className="text-white text-sm">Channel Configuration:</Label>
                  <Select onValueChange={(value) => handleConfigChange(product.id, 'channels', value)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                      <SelectValue placeholder="Select channels" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 z-50">
                      <SelectItem value="3-channel" className="text-white hover:bg-gray-700">3-channel</SelectItem>
                      <SelectItem value="6-channel" className="text-white hover:bg-gray-700">6-channel</SelectItem>
                    </SelectContent>
                  </Select>
                </div>
              )}

              {/* Quantity selection for couplers */}
              {product.hasQuantitySelection && (
                <div className="mb-4">
                  <Label className="text-white text-sm">Quantity (1-50):</Label>
                  <Select onValueChange={(value) => handleConfigChange(product.id, 'quantity', value)}>
                    <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                      <SelectValue placeholder="Select quantity" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-800 border-gray-700 max-h-60 z-50">
                      {Array.from({ length: 50 }, (_, i) => i + 1).map(num => (
                        <SelectItem key={num} value={num.toString()} className="text-white hover:bg-gray-700">
                          {num}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              )}
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-white font-bold">
                  {canSeePrices ? `$${getProductPrice(product).toLocaleString()}` : '—'}
                </span>
              </div>

              {product.productInfoUrl && (
                <div className="mb-4">
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
                </div>
              )}
              
              <Button 
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                onClick={(e) => {
                  e.stopPropagation();
                  handleProductSelect(product);
                }}
              >
                Select Product
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Level1ProductSelector;

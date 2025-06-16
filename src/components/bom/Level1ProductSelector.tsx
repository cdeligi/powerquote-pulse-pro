
import { useState } from "react";
import { Level1Product } from "@/types/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ExternalLink } from "lucide-react";

interface Level1ProductSelectorProps {
  onProductSelect: (product: Level1Product, configuration?: Record<string, any>) => void;
  selectedProduct: Level1Product | null;
  canSeePrices: boolean;
  productType: 'DGA' | 'PD';
}

const Level1ProductSelector = ({ onProductSelect, selectedProduct, canSeePrices, productType }: Level1ProductSelectorProps) => {
  const [configurations, setConfigurations] = useState<Record<string, Record<string, any>>>({});

  const dgaProducts: Level1Product[] = [
    {
      id: 'tm8-main',
      name: 'TM8 - Top Oil DGA Monitor',
      type: 'TM8',
      description: 'Continuous monitoring of dissolved gases in transformer oil',
      price: 18500,
      enabled: true,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/tm8',
      partNumber: 'TM8-001',
      customizations: ['CalGas', 'Helium Bottle', 'Moisture Sensor', '4-20mA bridge']
    },
    {
      id: 'tm3-main',
      name: 'TM3 - Portable DGA Monitor',
      type: 'TM3',
      description: 'Portable dissolved gas analysis system',
      price: 12800,
      enabled: true,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/tm3',
      partNumber: 'TM3-001',
      customizations: ['CalGas', 'Moisture Sensor']
    },
    {
      id: 'tm1-main',
      name: 'TM1 - Hydrogen Monitor',
      type: 'TM1',
      description: 'Dedicated hydrogen gas monitoring system',
      price: 8900,
      enabled: true,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/tm1',
      partNumber: 'TM1-001',
      customizations: ['4-20mA bridge']
    }
  ];

  const pdProducts: Level1Product[] = [
    {
      id: 'pd-detector-uhf',
      name: 'UHF PD Detector',
      type: 'QPDM',
      description: 'Ultra-high frequency partial discharge detection system',
      price: 15500,
      enabled: true,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/uhf-pd',
      partNumber: 'QPDM-UHF-001',
      hasQuantitySelection: false
    },
    {
      id: 'pd-detector-acoustic',
      name: 'Acoustic PD Detector',
      type: 'QPDM',
      description: 'Acoustic partial discharge monitoring system',
      price: 12800,
      enabled: true,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/acoustic-pd',
      partNumber: 'QPDM-ACO-001',
      hasQuantitySelection: false
    },
    {
      id: 'pd-coupler-dn50',
      name: 'DN50 Drain Type Coupler',
      type: 'QPDM',
      description: 'DN50 capacitive coupler for PD monitoring',
      price: 2800,
      enabled: true,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/dn50-coupler',
      partNumber: 'QPDM-DN50-001',
      hasQuantitySelection: true
    },
    {
      id: 'pd-coupler-dn25',
      name: 'DN25 Drain Type Coupler',
      type: 'QPDM',
      description: 'DN25 capacitive coupler for PD monitoring',
      price: 2400,
      enabled: true,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/dn25-coupler',
      partNumber: 'QPDM-DN25-001',
      hasQuantitySelection: true
    }
  ];

  const products = productType === 'DGA' ? dgaProducts : pdProducts;

  const handleConfigurationChange = (productId: string, key: string, value: any) => {
    setConfigurations(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [key]: value
      }
    }));
  };

  const handleProductSelect = (product: Level1Product) => {
    const config = configurations[product.id] || {};
    onProductSelect(product, config);
  };

  const renderDGAOptions = (product: Level1Product) => {
    if (!product.customizations) return null;

    const config = configurations[product.id] || {};

    return (
      <div className="mt-4 space-y-3">
        <h4 className="text-white font-medium">Available Options:</h4>
        {product.customizations.map((option) => (
          <div key={option} className="flex items-center space-x-2">
            <Checkbox
              id={`${product.id}-${option}`}
              checked={config[option] || false}
              onCheckedChange={(checked) => 
                handleConfigurationChange(product.id, option, checked)
              }
            />
            <Label htmlFor={`${product.id}-${option}`} className="text-white">
              {option}
              {canSeePrices && (
                <span className="text-gray-400 ml-2">
                  (+${getOptionPrice(option).toLocaleString()})
                </span>
              )}
            </Label>
          </div>
        ))}
      </div>
    );
  };

  const renderPDOptions = (product: Level1Product) => {
    const config = configurations[product.id] || {};

    if (product.hasQuantitySelection) {
      return (
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor={`${product.id}-quantity`} className="text-white">Quantity:</Label>
            <Input
              id={`${product.id}-quantity`}
              type="number"
              min="1"
              max="20"
              value={config.quantity || 1}
              onChange={(e) => handleConfigurationChange(product.id, 'quantity', e.target.value)}
              className="bg-gray-800 border-gray-600 text-white mt-1"
            />
          </div>
        </div>
      );
    }

    // For QPDM main units, show channel selection
    if (product.type === 'QPDM' && !product.hasQuantitySelection) {
      return (
        <div className="mt-4 space-y-3">
          <div>
            <Label htmlFor={`${product.id}-channels`} className="text-white">Channel Configuration:</Label>
            <Select
              value={config.channels || '3-channel'}
              onValueChange={(value) => handleConfigurationChange(product.id, 'channels', value)}
            >
              <SelectTrigger className="bg-gray-800 border-gray-600 text-white mt-1">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-600">
                <SelectItem value="3-channel" className="text-white">3-Channel Standard</SelectItem>
                <SelectItem value="6-channel" className="text-white">6-Channel (+$2,500)</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      );
    }

    return null;
  };

  const getOptionPrice = (option: string): number => {
    const prices: Record<string, number> = {
      'CalGas': 450,
      'Helium Bottle': 280,
      'Moisture Sensor': 320,
      '4-20mA bridge': 180
    };
    return prices[option] || 0;
  };

  const calculatePrice = (product: Level1Product): number => {
    const config = configurations[product.id] || {};
    let totalPrice = product.price;

    // DGA options pricing
    if (product.customizations) {
      product.customizations.forEach(option => {
        if (config[option]) {
          totalPrice += getOptionPrice(option);
        }
      });
    }

    // PD quantity pricing
    if (config.quantity) {
      totalPrice = product.price * parseInt(config.quantity);
    }

    // QPDM channel pricing
    if (product.type === 'QPDM' && config.channels === '6-channel') {
      totalPrice += 2500;
    }

    return totalPrice;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4">
        Select {productType === 'DGA' ? 'DGA Monitor' : 'Partial Discharge System'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        {products.map((product) => (
          <Card 
            key={product.id} 
            className={`bg-gray-900 border-gray-800 hover:border-red-600 transition-all cursor-pointer flex flex-col ${
              selectedProduct?.id === product.id ? 'border-red-600 bg-red-900/20' : ''
            }`}
          >
            <CardHeader>
              <CardTitle className="text-white text-lg">{product.name}</CardTitle>
              <CardDescription className="text-gray-400">
                {product.description}
              </CardDescription>
              <Badge variant="outline" className="w-fit text-white border-gray-500">
                {product.type}
              </Badge>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              {productType === 'DGA' ? renderDGAOptions(product) : renderPDOptions(product)}
              
              <div className="flex-1" />
              
              <div className="space-y-3 mt-4">
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">
                    {canSeePrices ? `$${calculatePrice(product).toLocaleString()}` : '—'}
                  </span>
                  <span className="text-gray-400 text-xs">{product.partNumber}</span>
                </div>

                {product.productInfoUrl && (
                  <div>
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
                  onClick={() => handleProductSelect(product)}
                >
                  Add to BOM
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default Level1ProductSelector;

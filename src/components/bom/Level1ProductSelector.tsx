import { Level1Product } from "@/types/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Checkbox } from "@/components/ui/checkbox";
import { ExternalLink } from "lucide-react";
import { useState } from "react";

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
      id: 'tm8-dga',
      name: 'TM8',
      type: 'TM8',
      description: 'Dissolved Gases (9 gases)',
      price: 12500,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/tm8',
      enabled: true,
      customizations: ['CalGas', 'Helium Bottle', 'Moisture Sensor']
    },
    {
      id: 'tm3-dga',
      name: 'TM3',
      type: 'TM3',
      description: 'Dissolved Gases (3 gases)',
      price: 8900,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/tm3',
      enabled: true,
      customizations: ['CalGas', 'Helium Bottle', 'Moisture Sensor']
    },
    {
      id: 'tm1-dga',
      name: 'TM1',
      type: 'TM1',
      description: 'Single Gas H₂ Monitor',
      price: 5400,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/tm1',
      enabled: true,
      customizations: ['Moisture Sensor', '4-20mA bridge']
    }
  ];

  const pdProducts: Level1Product[] = [
    {
      id: 'qpdm-pd',
      name: 'QPDM',
      type: 'QPDM',
      description: 'Partial Discharge Monitor',
      price: 8500,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/qpdm',
      enabled: true
    },
    {
      id: 'ic43-coupler',
      name: 'IC43 Coupler',
      type: 'QPDM',
      description: 'Coupler',
      price: 850,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/ic43',
      enabled: true,
      hasQuantitySelection: true
    },
    {
      id: 'ic44-coupler',
      name: 'IC44 Coupler',
      type: 'QPDM',
      description: 'Coupler',
      price: 950,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/ic44',
      enabled: true,
      hasQuantitySelection: true
    },
    {
      id: 'dn50-coupler',
      name: 'DN50 Drain Type Coupler',
      type: 'QPDM',
      description: 'Coupler',
      price: 1200,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/dn50',
      enabled: true,
      hasQuantitySelection: true
    },
    {
      id: 'dn25-coupler',
      name: 'DN25 Drain Type Coupler',
      type: 'QPDM',
      description: 'Coupler',
      price: 1100,
      productInfoUrl: 'https://www.qualitrolcorp.com/products/dn25',
      enabled: true,
      hasQuantitySelection: true
    }
  ];

  const products = productType === 'DGA' ? dgaProducts : pdProducts;

  const updateConfiguration = (productId: string, key: string, value: any) => {
    setConfigurations(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [key]: value
      }
    }));
  };

  const getProductConfiguration = (productId: string) => {
    return configurations[productId] || {};
  };

  const calculateProductPrice = (product: Level1Product) => {
    const config = getProductConfiguration(product.id);
    let totalPrice = product.price;

    // For DGA products with customization options
    if (product.customizations) {
      const incrementalPrices = {
        'CalGas': 450,
        'Helium Bottle': 280,
        'Moisture Sensor': 320,
        '4-20mA bridge': 180
      };
      
      product.customizations.forEach(option => {
        if (config[option] && incrementalPrices[option as keyof typeof incrementalPrices]) {
          totalPrice += incrementalPrices[option as keyof typeof incrementalPrices];
        }
      });
    }

    // For PD products with quantity selection
    if (config.quantity && product.hasQuantitySelection) {
      totalPrice = product.price * parseInt(config.quantity);
    }

    // For QPDM with channel selection
    if (product.id === 'qpdm-pd' && config.channels === '6-channel') {
      totalPrice += 2500; // Additional cost for 6-channel
    }

    return totalPrice;
  };

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4">
        {productType === 'DGA' ? 'Select DGA Product' : 'Select Partial Discharge Product'}
      </h3>
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {products.map((product) => {
          const config = getProductConfiguration(product.id);
          const totalPrice = calculateProductPrice(product);
          
          return (
            <Card 
              key={product.id} 
              className="bg-gray-900 border-gray-800 hover:border-red-600 transition-all flex flex-col"
            >
              <CardHeader>
                <div className="flex justify-between items-start">
                  <div>
                    <CardTitle className="text-white text-lg">{product.name}</CardTitle>
                    <CardDescription className="text-gray-400">
                      {product.description}
                    </CardDescription>
                  </div>
                </div>
              </CardHeader>
              <CardContent className="space-y-4 flex-1 flex flex-col">
                
                {/* DGA Customization Options */}
                {product.customizations && (
                  <div className="space-y-3">
                    <h4 className="text-white font-medium text-sm">Options:</h4>
                    {product.customizations.map((option) => (
                      <div key={option} className="flex items-center space-x-2">
                        <Checkbox
                          id={`${product.id}-${option}`}
                          checked={config[option] || false}
                          onCheckedChange={(checked) => updateConfiguration(product.id, option, checked)}
                          className="border-gray-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                        />
                        <label 
                          htmlFor={`${product.id}-${option}`}
                          className="text-sm text-gray-300 cursor-pointer"
                        >
                          {option}
                        </label>
                      </div>
                    ))}
                  </div>
                )}

                {/* QPDM Channel Selection */}
                {product.id === 'qpdm-pd' && (
                  <div className="space-y-2">
                    <label className="text-white font-medium text-sm">Channels:</label>
                    <Select 
                      value={config.channels || '3-channel'}
                      onValueChange={(value) => updateConfiguration(product.id, 'channels', value)}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        <SelectItem value="3-channel" className="text-white hover:bg-gray-700">3-channel</SelectItem>
                        <SelectItem value="6-channel" className="text-white hover:bg-gray-700">6-channel (+$2,500)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                )}

                {/* Quantity Selection for Couplers */}
                {product.hasQuantitySelection && (
                  <div className="space-y-2">
                    <label className="text-white font-medium text-sm">Quantity:</label>
                    <Select 
                      value={config.quantity || '1'}
                      onValueChange={(value) => updateConfiguration(product.id, 'quantity', value)}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-700">
                        {Array.from({ length: 50 }, (_, i) => i + 1).map((num) => (
                          <SelectItem key={num} value={num.toString()} className="text-white hover:bg-gray-700">
                            {num}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                )}

                <div className="flex-1" />

                <div className="space-y-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold">
                      {canSeePrices ? `$${totalPrice.toLocaleString()}` : '—'}
                    </span>
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
                    onClick={() => onProductSelect(product, config)}
                  >
                    Select Product
                  </Button>
                </div>
              </CardContent>
            </Card>
          );
        })}
      </div>
    </div>
  );
};

export default Level1ProductSelector;

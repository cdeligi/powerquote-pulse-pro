
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Separator } from "@/components/ui/separator";
import { Level1Product, Level2Product, ProductType, Level2ProductType } from "@/types/product";
import { ExternalLink, Plus, CheckCircle2 } from "lucide-react";

interface PDProductSelectorProps {
  onProductSelect: (product: Level1Product, configuration?: Record<string, any>, level2Options?: Level2Product[]) => void;
  canSeePrices: boolean;
}

const PDProductSelector = ({ onProductSelect, canSeePrices }: PDProductSelectorProps) => {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [standaloneLevel2Options, setStandaloneLevel2Options] = useState<Level2Product[]>([]);
  const [productConfigurations, setProductConfigurations] = useState<Record<string, Record<string, any>>>({});

  const pdProducts: Level1Product[] = [
    {
      id: 'qpdm',
      name: 'QPDM - Partial Discharge Monitor',
      type: 'QPDM' as ProductType,
      description: 'Advanced partial discharge monitoring system',
      price: 18500,
      enabled: true,
      partNumber: 'QPDM-001',
      productInfoUrl: 'https://qualitrol.com/qpdm'
    }
  ];

  const level2Options: Level2Product[] = [
    {
      id: 'analysis-software',
      name: 'Advanced Analysis Software',
      parentProductId: '',
      type: 'Standard' as Level2ProductType,
      description: 'Enhanced PD pattern analysis software',
      price: 1200,
      enabled: false,
      partNumber: 'QPDM-SW'
    },
    {
      id: 'pd-sensor',
      name: 'PD Sensor Array',
      parentProductId: '',
      type: 'Standard' as Level2ProductType,
      description: 'External PD sensor for transformer monitoring',
      price: 3200,
      enabled: false,
      partNumber: 'PDS-001'
    },
    {
      id: 'uhf-sensor',
      name: 'UHF PD Sensor',
      parentProductId: '',
      type: 'Standard' as Level2ProductType,
      description: 'Ultra-high frequency PD detection sensor',
      price: 4800,
      enabled: false,
      partNumber: 'UHF-001'
    },
    {
      id: 'calibrator',
      name: 'PD Calibrator',
      parentProductId: '',
      type: 'Standard' as Level2ProductType,
      description: 'Portable PD calibration source',
      price: 850,
      enabled: false,
      partNumber: 'PDC-001'
    },
    {
      id: 'uhf-amplifier',
      name: 'UHF Signal Amplifier',
      parentProductId: '',
      type: 'Standard' as Level2ProductType,
      description: 'Low-noise UHF signal amplifier',
      price: 680,
      enabled: false,
      partNumber: 'UHFA-001'
    }
  ];

  const handleProductToggle = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
      // Remove configuration
      const updatedConfigs = { ...productConfigurations };
      delete updatedConfigs[productId];
      setProductConfigurations(updatedConfigs);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleStandaloneLevel2Toggle = (option: Level2Product) => {
    const existingIndex = standaloneLevel2Options.findIndex(opt => opt.id === option.id);
    
    let updatedOptions;
    if (existingIndex >= 0) {
      updatedOptions = [...standaloneLevel2Options];
      updatedOptions[existingIndex] = { ...option, enabled: !option.enabled };
      
      // Handle quantity for sensor products
      if (option.id === 'pd-sensor' || option.id === 'uhf-sensor') {
        if (updatedOptions[existingIndex].enabled) {
          // Set default quantity when enabling
          const configs = { ...productConfigurations };
          if (!configs[option.id]) {
            configs[option.id] = { quantity: '1' };
            setProductConfigurations(configs);
          }
        }
      }
    } else {
      const newOption = { ...option, enabled: true };
      updatedOptions = [...standaloneLevel2Options, newOption];
      
      // Set default quantity for sensor products
      if (option.id === 'pd-sensor' || option.id === 'uhf-sensor') {
        const configs = { ...productConfigurations };
        configs[option.id] = { quantity: '1' };
        setProductConfigurations(configs);
      }
    }
    
    setStandaloneLevel2Options(updatedOptions);
  };

  const handleProductConfigurationChange = (productId: string, key: string, value: any) => {
    setProductConfigurations(prev => ({
      ...prev,
      [productId]: {
        ...prev[productId],
        [key]: value
      }
    }));
  };

  const calculateProductPrice = (product: Level1Product, productId: string) => {
    let totalPrice = product.price;
    
    // Add configuration-based pricing
    const config = productConfigurations[productId] || {};
    
    // For QPDM with channel pricing
    if (product.type === 'QPDM' && config.channels === '6-channel') {
      totalPrice += 2500; // Additional cost for 6-channel
    }
    
    return totalPrice;
  };

  const calculateStandaloneLevel2Price = () => {
    return standaloneLevel2Options
      .filter(opt => opt.enabled)
      .reduce((sum, opt) => {
        let price = opt.price;
        // Handle quantity-based pricing for sensor products
        if ((opt.id === 'pd-sensor' || opt.id === 'uhf-sensor') && productConfigurations[opt.id]?.quantity) {
          price = opt.price * parseInt(productConfigurations[opt.id].quantity);
        }
        return sum + price;
      }, 0);
  };

  const handleAddSelectedProducts = () => {
    // Add selected Level 1 products with their configurations
    selectedProducts.forEach(productId => {
      const product = pdProducts.find(p => p.id === productId);
      if (product) {
        const config = productConfigurations[productId] || {};
        onProductSelect(product, config, []);
      }
    });

    // Add standalone Level 2 options as separate products
    standaloneLevel2Options
      .filter(opt => opt.enabled)
      .forEach(option => {
        const config = productConfigurations[option.id] || {};
        onProductSelect(option as any, config, []);
      });

    // Reset selections
    setSelectedProducts(new Set());
    setStandaloneLevel2Options([]);
    setProductConfigurations({});
  };

  const getTotalPrice = () => {
    let total = 0;
    
    // Level 1 products with their configurations
    selectedProducts.forEach(productId => {
      const product = pdProducts.find(p => p.id === productId);
      if (product) {
        total += calculateProductPrice(product, productId);
      }
    });
    
    // Standalone Level 2 options
    total += calculateStandaloneLevel2Price();
    
    return total;
  };

  const hasSelections = selectedProducts.size > 0 || standaloneLevel2Options.some(opt => opt.enabled);

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-3">Partial Discharge Products</h2>
        <p className="text-gray-400 text-lg">Select partial discharge monitoring equipment</p>
      </div>

      {/* Level 1 Products Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Main Products</h3>
          <Badge variant="outline" className="text-white border-gray-500">
            {selectedProducts.size} selected
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {pdProducts.map((product) => {
            const isSelected = selectedProducts.has(product.id);
            const productPrice = calculateProductPrice(product, product.id);
            
            return (
              <Card 
                key={product.id} 
                className={`bg-gray-800 border-gray-700 transition-all duration-200 hover:shadow-lg ${
                  isSelected ? 'border-red-500 bg-gray-750' : 'hover:border-gray-600'
                }`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-lg mb-2">{product.name}</CardTitle>
                      <CardDescription className="text-gray-400 mb-3">
                        {product.description}
                      </CardDescription>
                    </div>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleProductToggle(product.id)}
                      className="border-gray-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-white border-gray-500">
                      {product.type}
                    </Badge>
                    {isSelected && (
                      <Badge className="bg-red-600 text-white">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Selected
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-t border-gray-700">
                    <span className="text-white font-bold text-lg">
                      {canSeePrices ? `$${productPrice.toLocaleString()}` : '—'}
                    </span>
                    <span className="text-gray-400 text-sm">{product.partNumber}</span>
                  </div>

                  {product.productInfoUrl && (
                    <a
                      href={product.productInfoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-400 hover:text-red-300 underline text-sm flex items-center"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Product Information
                    </a>
                  )}

                  {/* Configuration Options */}
                  {isSelected && product.type === 'QPDM' && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <h4 className="text-white font-medium mb-3 text-sm">Configuration</h4>
                      <div>
                        <Label htmlFor="channels" className="text-white mb-2 block text-xs">Channel Configuration</Label>
                        <Select 
                          value={productConfigurations[product.id]?.channels || '3-channel'} 
                          onValueChange={(value) => handleProductConfigurationChange(product.id, 'channels', value)}
                        >
                          <SelectTrigger className="bg-gray-700 border-gray-600 text-white text-sm">
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent className="bg-gray-700 border-gray-600">
                            <SelectItem value="3-channel" className="text-white">3-Channel Standard</SelectItem>
                            <SelectItem value="6-channel" className="text-white">
                              6-Channel {canSeePrices && '(+$2,500)'}
                            </SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator className="bg-gray-700" />

      {/* Standalone Level 2 Products */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Sensors & Accessories</h3>
          <Badge variant="outline" className="text-white border-gray-500">
            {standaloneLevel2Options.filter(opt => opt.enabled).length} selected
          </Badge>
        </div>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Available Components</CardTitle>
            <CardDescription className="text-gray-400">
              These items can be ordered independently or with a main product
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
              {level2Options.map((option) => {
                const isSelected = standaloneLevel2Options.some(opt => opt.id === option.id && opt.enabled);
                const isSensorProduct = option.id === 'pd-sensor' || option.id === 'uhf-sensor';
                const quantity = productConfigurations[option.id]?.quantity || '1';
                const totalPrice = isSensorProduct ? option.price * parseInt(quantity) : option.price;
                
                return (
                  <div key={option.id} className={`p-4 border rounded-lg transition-all ${
                    isSelected ? 'border-red-500 bg-gray-750' : 'border-gray-600 hover:border-gray-500'
                  }`}>
                    <div className="flex items-start justify-between mb-3">
                      <div className="flex items-start space-x-3 flex-1">
                        <Checkbox
                          checked={isSelected}
                          onCheckedChange={() => handleStandaloneLevel2Toggle(option)}
                          className="border-gray-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600 mt-1"
                        />
                        <div className="flex-1">
                          <Label className="text-white font-medium">
                            {option.name}
                          </Label>
                          <p className="text-gray-400 text-sm mt-1">{option.description}</p>
                          <p className="text-gray-500 text-xs mt-2">{option.partNumber}</p>
                        </div>
                      </div>
                      <div className="text-right ml-4">
                        <span className="text-white font-bold">
                          {canSeePrices ? `$${totalPrice.toLocaleString()}` : '—'}
                        </span>
                        {isSensorProduct && (
                          <p className="text-gray-400 text-xs mt-1">
                            ${option.price.toLocaleString()} each
                          </p>
                        )}
                      </div>
                    </div>
                    
                    {/* Quantity selector for sensor products */}
                    {isSelected && isSensorProduct && (
                      <div className="mt-3 pt-3 border-t border-gray-600">
                        <Label htmlFor={`quantity-${option.id}`} className="text-white mb-2 block text-sm">Quantity</Label>
                        <Input
                          id={`quantity-${option.id}`}
                          type="number"
                          min="1"
                          max="10"
                          value={quantity}
                          onChange={(e) => handleProductConfigurationChange(option.id, 'quantity', e.target.value)}
                          className="bg-gray-700 border-gray-600 text-white w-20"
                        />
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Selection Summary and Add Button */}
      {hasSelections && (
        <Card className="bg-gray-800 border-red-600 border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-semibold text-lg">Selection Summary</h4>
                <p className="text-gray-400">
                  {selectedProducts.size} main product{selectedProducts.size !== 1 ? 's' : ''} + {
                    standaloneLevel2Options.filter(opt => opt.enabled).length
                  } component{standaloneLevel2Options.filter(opt => opt.enabled).length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <span className="text-white font-bold text-2xl">
                  {canSeePrices ? `$${getTotalPrice().toLocaleString()}` : '—'}
                </span>
                <Button
                  onClick={handleAddSelectedProducts}
                  className="bg-red-600 hover:bg-red-700 text-white ml-4"
                  size="lg"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add to BOM
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default PDProductSelector;

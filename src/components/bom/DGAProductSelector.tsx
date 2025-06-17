import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Level1Product, Level2Product, ProductType, Level2ProductType } from "@/types/product";
import { ExternalLink, Plus, CheckCircle2 } from "lucide-react";

interface DGAProductSelectorProps {
  onProductSelect: (product: Level1Product, configuration?: Record<string, any>, level2Options?: Level2Product[]) => void;
  canSeePrices: boolean;
}

const DGAProductSelector = ({ onProductSelect, canSeePrices }: DGAProductSelectorProps) => {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectedLevel2Options, setSelectedLevel2Options] = useState<Record<string, Level2Product[]>>({});
  const [standaloneLevel2Options, setStandaloneLevel2Options] = useState<Level2Product[]>([]);
  const [productConfigurations, setProductConfigurations] = useState<Record<string, Record<string, any>>>({});

  const dgaProducts: Level1Product[] = [
    {
      id: 'tm8',
      name: 'TM8 - Advanced DGA Monitor',
      type: 'TM8' as ProductType,
      description: 'Multi-gas transformer monitoring system',
      price: 24500,
      enabled: true,
      partNumber: 'TM8-001',
      productInfoUrl: 'https://qualitrol.com/tm8'
    },
    {
      id: 'tm3',
      name: 'TM3 - Compact DGA Monitor',
      type: 'TM3' as ProductType,
      description: 'Essential dissolved gas analysis monitoring',
      price: 18200,
      enabled: true,
      partNumber: 'TM3-001',
      productInfoUrl: 'https://qualitrol.com/tm3'
    },
    {
      id: 'tm1',
      name: 'TM1 - Basic DGA Monitor',
      type: 'TM1' as ProductType,
      description: 'Single-gas hydrogen monitoring system',
      price: 12800,
      enabled: true,
      partNumber: 'TM1-001',
      productInfoUrl: 'https://qualitrol.com/tm1'
    }
  ];

  const level2Options: Level2Product[] = [
    {
      id: 'calgas-bottle',
      name: 'Calibration Gas Bottle',
      parentProductId: '',
      type: 'CalGas' as Level2ProductType,
      description: 'Precision calibration gas for DGA monitors',
      price: 450,
      enabled: false,
      partNumber: 'CAL-GAS-001'
    },
    {
      id: 'helium-bottle',
      name: 'Helium Carrier Gas Bottle',
      parentProductId: '',
      type: 'Standard' as Level2ProductType,
      description: 'High-purity helium carrier gas supply',
      price: 280,
      enabled: false,
      partNumber: 'HE-GAS-001'
    },
    {
      id: 'moisture-sensor',
      name: 'Moisture Sensor Add-on',
      parentProductId: '',
      type: 'Moisture' as Level2ProductType,
      description: 'Additional moisture detection capability',
      price: 320,
      enabled: false,
      partNumber: 'MOIST-001'
    },
    {
      id: '4-20ma-bridge',
      name: '4-20mA Bridge Interface',
      parentProductId: '',
      type: 'Standard' as Level2ProductType,
      description: 'Analog output interface module',
      price: 180,
      enabled: false,
      partNumber: '420MA-001'
    }
  ];

  const handleProductToggle = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
      // Remove associated level 2 options
      const updatedLevel2 = { ...selectedLevel2Options };
      delete updatedLevel2[productId];
      setSelectedLevel2Options(updatedLevel2);
      // Remove configuration
      const updatedConfigs = { ...productConfigurations };
      delete updatedConfigs[productId];
      setProductConfigurations(updatedConfigs);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleLevel2OptionToggle = (productId: string, option: Level2Product) => {
    const currentOptions = selectedLevel2Options[productId] || [];
    const existingIndex = currentOptions.findIndex(opt => opt.id === option.id);
    
    let updatedOptions;
    if (existingIndex >= 0) {
      updatedOptions = [...currentOptions];
      updatedOptions[existingIndex] = { ...option, enabled: !option.enabled };
    } else {
      updatedOptions = [...currentOptions, { ...option, enabled: true }];
    }
    
    setSelectedLevel2Options({
      ...selectedLevel2Options,
      [productId]: updatedOptions
    });
  };

  const handleStandaloneLevel2Toggle = (option: Level2Product) => {
    const existingIndex = standaloneLevel2Options.findIndex(opt => opt.id === option.id);
    
    let updatedOptions;
    if (existingIndex >= 0) {
      updatedOptions = [...standaloneLevel2Options];
      updatedOptions[existingIndex] = { ...option, enabled: !option.enabled };
    } else {
      updatedOptions = [...standaloneLevel2Options, { ...option, enabled: true }];
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
    Object.entries(config).forEach(([key, value]) => {
      if (value) {
        const incrementalPrices = {
          'CalGas': 450,
          'Helium Bottle': 280,
          'Moisture Sensor': 320,
          '4-20mA bridge': 180
        };
        if (incrementalPrices[key as keyof typeof incrementalPrices]) {
          totalPrice += incrementalPrices[key as keyof typeof incrementalPrices];
        }
      }
    });
    
    // Add level 2 options pricing
    const level2Total = (selectedLevel2Options[productId] || [])
      .filter(opt => opt.enabled)
      .reduce((sum, opt) => sum + opt.price, 0);
    
    return totalPrice + level2Total;
  };

  const calculateStandaloneLevel2Price = () => {
    return standaloneLevel2Options
      .filter(opt => opt.enabled)
      .reduce((sum, opt) => sum + opt.price, 0);
  };

  const handleAddSelectedProducts = () => {
    // Add selected Level 1 products with their configurations and Level 2 options
    selectedProducts.forEach(productId => {
      const product = dgaProducts.find(p => p.id === productId);
      if (product) {
        const config = productConfigurations[productId] || {};
        const level2Opts = selectedLevel2Options[productId] || [];
        onProductSelect(product, config, level2Opts);
      }
    });

    // Add standalone Level 2 options as separate products
    standaloneLevel2Options
      .filter(opt => opt.enabled)
      .forEach(option => {
        onProductSelect(option as any, {}, []);
      });

    // Reset selections
    setSelectedProducts(new Set());
    setSelectedLevel2Options({});
    setStandaloneLevel2Options([]);
    setProductConfigurations({});
  };

  const getTotalPrice = () => {
    let total = 0;
    
    // Level 1 products with their configurations and Level 2 options
    selectedProducts.forEach(productId => {
      const product = dgaProducts.find(p => p.id === productId);
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
        <h2 className="text-3xl font-bold text-white mb-3">DGA Products</h2>
        <p className="text-gray-400 text-lg">Select dissolved gas analysis monitoring equipment</p>
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
          {dgaProducts.map((product) => {
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

                  {/* Level 2 Options for this product */}
                  {isSelected && (
                    <div className="mt-4 pt-4 border-t border-gray-700">
                      <h4 className="text-white font-medium mb-3 text-sm">Add-on Options</h4>
                      <div className="space-y-2">
                        {level2Options.map((option) => {
                          const isOptionSelected = (selectedLevel2Options[product.id] || [])
                            .some(opt => opt.id === option.id && opt.enabled);
                          
                          return (
                            <div key={option.id} className="flex items-center justify-between p-2 bg-gray-700 rounded">
                              <div className="flex items-center space-x-2 flex-1">
                                <Checkbox
                                  checked={isOptionSelected}
                                  onCheckedChange={() => handleLevel2OptionToggle(product.id, option)}
                                  className="border-gray-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                                />
                                <div className="flex-1">
                                  <Label className="text-white font-medium text-xs">
                                    {option.name}
                                  </Label>
                                  <p className="text-gray-400 text-xs">{option.description}</p>
                                </div>
                              </div>
                              <span className="text-white font-bold text-xs ml-2">
                                {canSeePrices ? `$${option.price.toLocaleString()}` : '—'}
                              </span>
                            </div>
                          );
                        })}
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
          <h3 className="text-xl font-semibold text-white">Standalone Add-ons</h3>
          <Badge variant="outline" className="text-white border-gray-500">
            {standaloneLevel2Options.filter(opt => opt.enabled).length} selected
          </Badge>
        </div>
        
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white">Optional Accessories</CardTitle>
            <CardDescription className="text-gray-400">
              These items can be ordered independently without a main product
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {level2Options.map((option) => {
                const isSelected = standaloneLevel2Options.some(opt => opt.id === option.id && opt.enabled);
                
                return (
                  <div key={option.id} className={`p-4 border rounded-lg transition-all ${
                    isSelected ? 'border-red-500 bg-gray-750' : 'border-gray-600 hover:border-gray-500'
                  }`}>
                    <div className="flex items-start justify-between">
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
                      <span className="text-white font-bold ml-4">
                        {canSeePrices ? `$${option.price.toLocaleString()}` : '—'}
                      </span>
                    </div>
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
                    Object.values(selectedLevel2Options).flat().filter(opt => opt.enabled).length +
                    standaloneLevel2Options.filter(opt => opt.enabled).length
                  } add-on{Object.values(selectedLevel2Options).flat().filter(opt => opt.enabled).length +
                    standaloneLevel2Options.filter(opt => opt.enabled).length !== 1 ? 's' : ''}
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

export default DGAProductSelector;

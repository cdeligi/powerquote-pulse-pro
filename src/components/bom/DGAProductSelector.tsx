
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Level1Product, Level2Product, isLevel1Product } from "@/types/product";
import { ExternalLink, Settings } from "lucide-react";

interface DGAProductSelectorProps {
  onProductSelect: (product: Level1Product, configuration?: Record<string, any>, level2Options?: Level2Product[]) => void;
  canSeePrices: boolean;
}

const DGAProductSelector = ({ onProductSelect, canSeePrices }: DGAProductSelectorProps) => {
  const [selectedProduct, setSelectedProduct] = useState<Level1Product | null>(null);
  const [configuration, setConfiguration] = useState<Record<string, any>>({});
  const [selectedLevel2Options, setSelectedLevel2Options] = useState<Level2Product[]>([]);

  const dgaProducts: Level1Product[] = [
    {
      id: 'tm8',
      name: 'TM8 - Complete DGA System',
      type: 'TM8',
      description: 'Complete 8-gas dissolved gas analysis system with advanced diagnostics',
      price: 24500,
      enabled: true,
      specifications: {
        gases: 8,
        sampling: 'Automated',
        analysis: 'Real-time',
        connectivity: 'Ethernet, Serial, Modbus'
      },
      partNumber: 'TM8-001',
      productInfoUrl: 'https://qualitrol.com/tm8'
    },
    {
      id: 'tm3',
      name: 'TM3 - 3-Gas DGA Monitor',
      type: 'TM3',
      description: '3-gas DGA monitor for essential fault gas detection',
      price: 12800,
      enabled: true,
      specifications: {
        gases: 3,
        sampling: 'Manual/Auto',
        analysis: 'Periodic',
        connectivity: 'Serial, Modbus'
      },
      partNumber: 'TM3-001',
      productInfoUrl: 'https://qualitrol.com/tm3'
    },
    {
      id: 'tm1',
      name: 'TM1 - Single Gas Monitor',
      type: 'TM1',
      description: 'Single gas monitor for hydrogen detection',
      price: 6750,
      enabled: true,
      specifications: {
        gases: 1,
        sampling: 'Continuous',
        analysis: 'Real-time',
        connectivity: 'Analog, Digital'
      },
      partNumber: 'TM1-001',
      productInfoUrl: 'https://qualitrol.com/tm1'
    }
  ];

  const level2Options: Level2Product[] = [
    {
      id: 'calgas-option',
      name: 'CalGas Calibration System',
      parentProductId: 'tm8',
      type: 'calibration',
      description: 'Automated calibration gas system for TM8',
      price: 450,
      enabled: false,
      specifications: {
        type: 'Automated',
        gases: 'Multi-gas blend'
      },
      partNumber: 'CAL-001'
    },
    {
      id: 'helium-bottle',
      name: 'Helium Carrier Gas Bottle',
      parentProductId: 'tm8',
      type: 'consumable',
      description: 'High-purity helium carrier gas supply',
      price: 280,
      enabled: false,
      specifications: {
        purity: '99.999%',
        volume: '40L'
      },
      partNumber: 'HE-001'
    },
    {
      id: 'moisture-sensor',
      name: 'Moisture Sensor Add-on',
      parentProductId: 'tm3',
      type: 'sensor',
      description: 'Additional moisture detection capability',
      price: 320,
      enabled: false,
      specifications: {
        range: '0-100ppm',
        accuracy: '±2ppm'
      },
      partNumber: 'MS-001'
    },
    {
      id: '4-20ma-bridge',
      name: '4-20mA Output Bridge',
      parentProductId: 'tm1',
      type: 'interface',
      description: 'Analog output interface for TM1',
      price: 180,
      enabled: false,
      specifications: {
        outputs: 2,
        range: '4-20mA'
      },
      partNumber: 'AO-001'
    }
  ];

  const handleProductSelect = (product: Level1Product) => {
    setSelectedProduct(product);
    setConfiguration({});
    //   const compatibleOptions = level2Options.filter(opt => opt.parentProductId === product.id);
//    setSelectedLevel2Options(compatibleOptions.map(opt => ({ ...opt, enabled: false })));
  };

  const handleConfigurationChange = (key: string, value: any) => {
    setConfiguration(prev => ({ ...prev, [key]: value }));
  };

  const handleLevel2OptionToggle = (optionId: string) => {
    setSelectedLevel2Options(prev => 
      prev.map(opt => 
        opt.id === optionId ? { ...opt, enabled: !opt.enabled } : opt
      )
    );
  };

  const handleAddToBOM = () => {
    if (selectedProduct) {
      onProductSelect(selectedProduct, configuration, selectedLevel2Options);
      // Reset selection
      setSelectedProduct(null);
      setConfiguration({});
      setSelectedLevel2Options([]);
    }
  };

  const calculatePrice = (product: Level1Product) => {
    let totalPrice = product.price;
    
    // Add configuration-based pricing
    if (configuration.CalGas) totalPrice += 450;
    if (configuration['Helium Bottle']) totalPrice += 280;
    if (configuration['Moisture Sensor']) totalPrice += 320;
    if (configuration['4-20mA bridge']) totalPrice += 180;
    
    // Add level 2 options pricing
    const level2Total = selectedLevel2Options
      .filter(opt => opt.enabled)
      .reduce((sum, opt) => sum + opt.price, 0);
    
    return totalPrice + level2Total;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">DGA Products</h2>
        <p className="text-gray-400">Select dissolved gas analysis equipment</p>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {dgaProducts.map((product) => (
          <Card 
            key={product.id} 
            className={`bg-gray-800 border-gray-700 cursor-pointer transition-all hover:border-red-600 ${
              selectedProduct?.id === product.id ? 'border-red-600 ring-2 ring-red-600/50' : ''
            }`}
            onClick={() => handleProductSelect(product)}
          >
            <CardHeader>
              <CardTitle className="text-white">{product.name}</CardTitle>
              <CardDescription className="text-gray-400">
                {product.description}
              </CardDescription>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-white border-gray-500">
                  {product.specifications?.gases} gas{(product.specifications?.gases || 0) > 1 ? 'es' : ''}
                </Badge>
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
                    <span className="text-white">{String(value)}</span>
                  </div>
                ))}
              </div>
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-white font-bold">
                  {canSeePrices ? `$${product.price.toLocaleString()}` : '—'}
                </span>
                <span className="text-gray-400 text-xs">{product.partNumber}</span>
              </div>

              {product.productInfoUrl && (
                <a
                  href={product.productInfoUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-red-400 underline text-sm flex items-center mb-2"
                  onClick={(e) => e.stopPropagation()}
                >
                  <ExternalLink className="h-3 w-3 mr-1" />
                  Product Info
                </a>
              )}
              
              <Button 
                className={`w-full ${
                  selectedProduct?.id === product.id 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                } text-white`}
                onClick={(e) => {
                  e.stopPropagation();
                  handleProductSelect(product);
                }}
              >
                {selectedProduct?.id === product.id ? 'Selected' : 'Select Product'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>

      {/* Configuration Panel */}
      {selectedProduct && (
        <Card className="bg-gray-800 border-gray-700">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Configure {selectedProduct.name}
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-6">
            {/* Configuration Options */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {selectedProduct.type === 'TM8' && (
                <>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="calgas"
                      checked={configuration.CalGas || false}
                      onCheckedChange={(checked) => handleConfigurationChange('CalGas', checked)}
                      className="border-gray-600 data-[state=checked]:bg-red-600"
                    />
                    <Label htmlFor="calgas" className="text-white">
                      CalGas System {canSeePrices && '(+$450)'}
                    </Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="helium"
                      checked={configuration['Helium Bottle'] || false}
                      onCheckedChange={(checked) => handleConfigurationChange('Helium Bottle', checked)}
                      className="border-gray-600 data-[state=checked]:bg-red-600"
                    />
                    <Label htmlFor="helium" className="text-white">
                      Helium Bottle {canSeePrices && '(+$280)'}
                    </Label>
                  </div>
                </>
              )}
              {selectedProduct.type === 'TM3' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="moisture"
                    checked={configuration['Moisture Sensor'] || false}
                    onCheckedChange={(checked) => handleConfigurationChange('Moisture Sensor', checked)}
                    className="border-gray-600 data-[state=checked]:bg-red-600"
                  />
                  <Label htmlFor="moisture" className="text-white">
                    Moisture Sensor {canSeePrices && '(+$320)'}
                  </Label>
                </div>
              )}
              {selectedProduct.type === 'TM1' && (
                <div className="flex items-center space-x-2">
                  <Checkbox
                    id="bridge"
                    checked={configuration['4-20mA bridge'] || false}
                    onCheckedChange={(checked) => handleConfigurationChange('4-20mA bridge', checked)}
                    className="border-gray-600 data-[state=checked]:bg-red-600"
                  />
                  <Label htmlFor="bridge" className="text-white">
                    4-20mA Bridge {canSeePrices && '(+$180)'}
                  </Label>
                </div>
              )}
            </div>

            {/* Level 2 Options */}
            <div className="border-t border-gray-700 pt-4">
              <h4 className="text-white font-medium mb-3">Additional Level 2 Options (Standalone)</h4>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {level2Options
                  .filter(opt => opt.parentProductId === selectedProduct.id || !opt.parentProductId)
                  .map((option) => (
                    <div key={option.id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                      <div className="flex items-center space-x-2">
                        <Checkbox
                          id={option.id}
                          checked={selectedLevel2Options.find(opt => opt.id === option.id)?.enabled || false}
                          onCheckedChange={() => {
                            const existingOption = selectedLevel2Options.find(opt => opt.id === option.id);
                            if (existingOption) {
                              handleLevel2OptionToggle(option.id);
                            } else {
                              setSelectedLevel2Options(prev => [...prev, { ...option, enabled: true }]);
                            }
                          }}
                          className="border-gray-600 data-[state=checked]:bg-red-600"
                        />
                        <div>
                          <Label htmlFor={option.id} className="text-white font-medium">
                            {option.name}
                          </Label>
                          <p className="text-gray-400 text-xs">{option.description}</p>
                        </div>
                      </div>
                      <span className="text-white font-bold">
                        {canSeePrices ? `$${option.price.toLocaleString()}` : '—'}
                      </span>
                    </div>
                  ))}
              </div>
            </div>

            {/* Total and Add Button */}
            <div className="border-t border-gray-700 pt-4 flex justify-between items-center">
              <span className="text-white font-bold text-lg">
                Total: {canSeePrices ? `$${calculatePrice(selectedProduct).toLocaleString()}` : '—'}
              </span>
              <Button
                onClick={handleAddToBOM}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Add to BOM
              </Button>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DGAProductSelector;

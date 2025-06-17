
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Level1Product, Level2Product } from "@/types/product";
import { ExternalLink, Settings } from "lucide-react";

interface PDProductSelectorProps {
  onProductSelect: (product: Level1Product, configuration?: Record<string, any>, level2Options?: Level2Product[]) => void;
  canSeePrices: boolean;
}

const PDProductSelector = ({ onProductSelect, canSeePrices }: PDProductSelectorProps) => {
  const [selectedProduct, setSelectedProduct] = useState<Level1Product | null>(null);
  const [configuration, setConfiguration] = useState<Record<string, any>>({});
  const [selectedLevel2Options, setSelectedLevel2Options] = useState<Level2Product[]>([]);

  const pdProducts: Level1Product[] = [
    {
      id: 'qpdm',
      name: 'QPDM - Partial Discharge Monitor',
      type: 'QPDM',
      description: 'Advanced partial discharge monitoring system',
      price: 18500,
      enabled: true,
      specifications: {
        channels: '3-channel standard',
        frequency: '10kHz - 800kHz',
        sensitivity: 'Sub-pC detection',
        connectivity: 'Ethernet, Modbus'
      },
      partNumber: 'QPDM-001',
      productInfoUrl: 'https://qualitrol.com/qpdm'
    },
    {
      id: 'pdsensor',
      name: 'PD Sensor Array',
      type: 'PDSensor',
      description: 'External PD sensor for transformer monitoring',
      price: 3200,
      enabled: true,
      specifications: {
        type: 'Capacitive',
        bandwidth: '10kHz - 1MHz',
        mounting: 'Tank-mounted',
        temperature: '-40°C to +85°C'
      },
      partNumber: 'PDS-001',
      productInfoUrl: 'https://qualitrol.com/pd-sensors'
    },
    {
      id: 'uhfsensor',
      name: 'UHF PD Sensor',
      type: 'UHFSensor',
      description: 'Ultra-high frequency PD detection sensor',
      price: 4800,
      enabled: true,
      specifications: {
        type: 'UHF',
        bandwidth: '300MHz - 3GHz',
        mounting: 'Internal/External',
        sensitivity: 'Ultra-high'
      },
      partNumber: 'UHF-001',
      productInfoUrl: 'https://qualitrol.com/uhf-sensors'
    }
  ];

  const level2Options: Level2Product[] = [
    {
      id: 'channel-upgrade',
      name: '6-Channel Upgrade',
      parentProductId: 'qpdm',
      type: 'upgrade',
      description: 'Upgrade QPDM to 6-channel monitoring',
      price: 2500,
      enabled: false,
      specifications: {
        channels: 6,
        type: 'Hardware upgrade'
      },
      partNumber: 'QPDM-6CH'
    },
    {
      id: 'analysis-software',
      name: 'Advanced Analysis Software',
      parentProductId: 'qpdm',
      type: 'software',
      description: 'Enhanced PD pattern analysis software',
      price: 1200,
      enabled: false,
      specifications: {
        features: 'Pattern recognition, trending',
        license: 'Perpetual'
      },
      partNumber: 'QPDM-SW'
    },
    {
      id: 'calibrator',
      name: 'PD Calibrator',
      parentProductId: 'pdsensor',
      type: 'calibration',
      description: 'Portable PD calibration source',
      price: 850,
      enabled: false,
      specifications: {
        range: '1pC - 10nC',
        accuracy: '±5%'
      },
      partNumber: 'PDC-001'
    },
    {
      id: 'uhf-amplifier',
      name: 'UHF Signal Amplifier',
      parentProductId: 'uhfsensor',
      type: 'amplifier',
      description: 'Low-noise UHF signal amplifier',
      price: 680,
      enabled: false,
      specifications: {
        gain: '20dB',
        noise: '<3dB'
      },
      partNumber: 'UHFA-001'
    }
  ];

  const handleProductSelect = (product: Level1Product) => {
    setSelectedProduct(product);
    setConfiguration({});
    setSelectedLevel2Options([]);
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
    if (product.type === 'QPDM' && configuration.channels === '6-channel') {
      totalPrice += 2500;
    }
    
    if (configuration.quantity) {
      totalPrice = product.price * parseInt(configuration.quantity);
    }
    
    // Add level 2 options pricing
    const level2Total = selectedLevel2Options
      .filter(opt => opt.enabled)
      .reduce((sum, opt) => sum + opt.price, 0);
    
    return totalPrice + level2Total;
  };

  return (
    <div className="space-y-6">
      <div className="text-center mb-6">
        <h2 className="text-2xl font-bold text-white mb-2">Partial Discharge Products</h2>
        <p className="text-gray-400">Select partial discharge monitoring equipment</p>
      </div>

      {/* Product Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {pdProducts.map((product) => (
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
                  {product.type}
                </Badge>
                {product.specifications?.channels && (
                  <Badge variant="outline" className="text-white border-gray-500">
                    {product.specifications.channels}
                  </Badge>
                )}
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
              {selectedProduct.type === 'QPDM' && (
                <div>
                  <Label htmlFor="channels" className="text-white mb-2 block">Channel Configuration</Label>
                  <Select 
                    value={configuration.channels || '3-channel'} 
                    onValueChange={(value) => handleConfigurationChange('channels', value)}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
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
              )}
              
              {(selectedProduct.type === 'PDSensor' || selectedProduct.type === 'UHFSensor') && (
                <div>
                  <Label htmlFor="quantity" className="text-white mb-2 block">Quantity</Label>
                  <Input
                    id="quantity"
                    type="number"
                    min="1"
                    max="10"
                    value={configuration.quantity || 1}
                    onChange={(e) => handleConfigurationChange('quantity', e.target.value)}
                    className="bg-gray-700 border-gray-600 text-white"
                  />
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

export default PDProductSelector;

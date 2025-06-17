
import { useState } from "react";
import { Level1Product, Level2Product } from "@/types/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Level2OptionsSelector from "./Level2OptionsSelector";
import { ExternalLink, Settings } from "lucide-react";

interface Level1ProductSelectorProps {
  onProductSelect: (product: Level1Product | Level2Product, configuration?: Record<string, any>) => void;
  selectedProduct: Level1Product | null;
  canSeePrices: boolean;
  productType: 'DGA' | 'PD';
}

const Level1ProductSelector = ({ onProductSelect, selectedProduct, canSeePrices, productType }: Level1ProductSelectorProps) => {
  const [showConfiguration, setShowConfiguration] = useState(false);
  const [configuringProduct, setConfiguringProduct] = useState<Level1Product | null>(null);
  const [showLevel2Options, setShowLevel2Options] = useState(false);
  const [selectedLevel2Options, setSelectedLevel2Options] = useState<Level2Product[]>([]);

  const getProducts = (): Level1Product[] => {
    if (productType === 'DGA') {
      return [
        {
          id: 'tm8',
          name: 'TM8',
          type: 'TM8',
          description: '8-Gas DGA Monitor with advanced analytics',
          price: 12500,
          enabled: true,
          customizations: ['CalGas', 'Helium Bottle', 'Moisture Sensor'],
          productInfoUrl: 'https://qualitrol.com/tm8'
        },
        {
          id: 'tm3',
          name: 'TM3',
          type: 'TM3',
          description: '3-Gas DGA Monitor for basic monitoring',
          price: 8500,
          enabled: true,
          customizations: ['CalGas', 'Helium Bottle', 'Moisture Sensor'],
          productInfoUrl: 'https://qualitrol.com/tm3'
        },
        {
          id: 'tm1',
          name: 'TM1',
          type: 'TM1',
          description: 'Single-Gas DGA Monitor for hydrogen detection',
          price: 5500,
          enabled: true,
          customizations: ['4-20mA bridge', 'Moisture Sensor'],
          productInfoUrl: 'https://qualitrol.com/tm1'
        }
      ];
    } else {
      return [
        {
          id: 'qpdm',
          name: 'QPDM',
          type: 'QPDM',
          description: 'Partial Discharge Monitoring System',
          price: 15000,
          enabled: true,
          hasQuantitySelection: true,
          productInfoUrl: 'https://qualitrol.com/qpdm'
        }
      ];
    }
  };

  const products = getProducts();
  const [dgaConfiguration, setDgaConfiguration] = useState<Record<string, any>>({});
  const [pdConfiguration, setPdConfiguration] = useState<Record<string, any>>({});

  const handleProductSelect = (product: Level1Product) => {
    if (productType === 'DGA' && product.customizations) {
      setConfiguringProduct(product);
      setShowConfiguration(true);
    } else if (productType === 'PD' && product.hasQuantitySelection) {
      setConfiguringProduct(product);
      setShowConfiguration(true);
    } else {
      onProductSelect(product);
    }
  };

  const handleConfigurationSave = () => {
    if (!configuringProduct) return;
    
    const configuration = productType === 'DGA' ? dgaConfiguration : pdConfiguration;
    onProductSelect(configuringProduct, configuration);
    setShowConfiguration(false);
    
    // Open Level 2 options for QPDM
    if (configuringProduct.type === 'QPDM') {
      setShowLevel2Options(true);
    } else {
      setConfiguringProduct(null);
    }
  };

  const toggleDgaOption = (option: string) => {
    setDgaConfiguration(prev => ({
      ...prev,
      [option]: !prev[option]
    }));
  };

  const handleLevel2OptionsSelect = (options: Level2Product[]) => {
    setSelectedLevel2Options(options);
    setShowLevel2Options(false);
    setConfiguringProduct(null);
    
    // Add each selected Level 2 option as a separate product
    options.filter(opt => opt.enabled).forEach(option => {
      onProductSelect(option);
    });
  };

  return (
    <>
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">
            {productType === 'DGA' ? 'DGA Products' : 'Partial Discharge Products'}
          </CardTitle>
          <CardDescription className="text-gray-400">
            {productType === 'DGA' 
              ? 'Select dissolved gas analysis monitoring systems'
              : 'Select partial discharge monitoring systems and their couplers'
            }
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4">
            {products.map((product) => (
              <div
                key={product.id}
                className="p-4 rounded-lg border border-gray-700 bg-gray-800 hover:border-gray-600 transition-all cursor-pointer"
                onClick={() => handleProductSelect(product)}
              >
                <div className="flex justify-between items-start">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <h3 className="text-lg font-semibold text-white">{product.name}</h3>
                      <Badge variant="outline" className="text-xs">{product.type}</Badge>
                    </div>
                    <p className="text-gray-400 mb-3">{product.description}</p>
                    
                    {product.customizations && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-400 mb-1">Available Options:</p>
                        <div className="flex flex-wrap gap-1">
                          {product.customizations.map((customization) => (
                            <Badge key={customization} variant="secondary" className="text-xs">
                              {customization}
                            </Badge>
                          ))}
                        </div>
                      </div>
                    )}

                    {product.hasQuantitySelection && (
                      <div className="mb-3">
                        <p className="text-sm text-gray-400 mb-1">Available Couplers:</p>
                        <div className="flex flex-wrap gap-1">
                          <Badge variant="secondary" className="text-xs">IC43 Coupler</Badge>
                          <Badge variant="secondary" className="text-xs">IC44 Coupler</Badge>
                          <Badge variant="secondary" className="text-xs">DN50 Drain Type</Badge>
                          <Badge variant="secondary" className="text-xs">DN25 Drain Type</Badge>
                        </div>
                      </div>
                    )}

                    <div className="flex items-center space-x-4">
                      <p className="text-xl font-bold text-white">
                        {canSeePrices ? `$${product.price.toLocaleString()}` : '—'}
                      </p>
                      
                      {product.productInfoUrl && (
                        <a
                          href={product.productInfoUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-red-400 hover:text-red-300 text-sm flex items-center"
                          onClick={(e) => e.stopPropagation()}
                        >
                          <ExternalLink className="h-4 w-4 mr-1" />
                          Product Info
                        </a>
                      )}
                    </div>
                  </div>
                  
                  <Button
                    variant="outline"
                    className="border-gray-600 text-white hover:bg-gray-700"
                    onClick={(e) => {
                      e.stopPropagation();
                      handleProductSelect(product);
                    }}
                  >
                    {product.customizations || product.hasQuantitySelection ? (
                      <>
                        <Settings className="mr-2 h-4 w-4" />
                        Configure
                      </>
                    ) : (
                      'Add to BOM'
                    )}
                  </Button>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Configuration Modal */}
      <Sheet open={showConfiguration} onOpenChange={setShowConfiguration}>
        <SheetContent className="w-[500px] bg-gray-900 border-gray-800">
          <SheetHeader>
            <SheetTitle className="text-white">
              Configure {configuringProduct?.name}
            </SheetTitle>
            <SheetDescription className="text-gray-400">
              {productType === 'DGA' 
                ? 'Select additional options for your DGA system'
                : 'Configure channel count for your PD system'
              }
            </SheetDescription>
          </SheetHeader>
          
          <div className="mt-6 space-y-6">
            {productType === 'DGA' && configuringProduct?.customizations && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Available Options</h3>
                <div className="space-y-3">
                  {configuringProduct.customizations.map((option) => (
                    <div key={option} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                      <div>
                        <p className="text-white font-medium">{option}</p>
                        <p className="text-gray-400 text-sm">
                          {option === 'CalGas' && 'Automated calibration gas system'}
                          {option === 'Helium Bottle' && 'Helium reference bottle for calibration'}
                          {option === 'Moisture Sensor' && 'Oil moisture content monitoring'}
                          {option === '4-20mA bridge' && 'Current loop interface bridge'}
                        </p>
                      </div>
                      <input
                        type="checkbox"
                        checked={dgaConfiguration[option] || false}
                        onChange={() => toggleDgaOption(option)}
                        className="w-4 h-4 text-red-600 bg-gray-700 border-gray-600 rounded focus:ring-red-500"
                      />
                    </div>
                  ))}
                </div>
              </div>
            )}

            {productType === 'PD' && configuringProduct?.hasQuantitySelection && (
              <div>
                <h3 className="text-lg font-medium text-white mb-4">Channel Configuration</h3>
                <div className="space-y-4">
                  <div>
                    <Label htmlFor="channels" className="text-white">Number of Channels</Label>
                    <Select 
                      value={pdConfiguration.channels || '3-channel'} 
                      onValueChange={(value) => setPdConfiguration(prev => ({ ...prev, channels: value }))}
                    >
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white mt-2">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600">
                        <SelectItem value="3-channel" className="text-white">3-Channel</SelectItem>
                        <SelectItem value="6-channel" className="text-white">6-Channel (+$2,500)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <div>
                    <Label htmlFor="quantity" className="text-white">Quantity</Label>
                    <Input
                      id="quantity"
                      type="number"
                      min="1"
                      max="10"
                      value={pdConfiguration.quantity || 1}
                      onChange={(e) => setPdConfiguration(prev => ({ ...prev, quantity: e.target.value }))}
                      className="bg-gray-800 border-gray-600 text-white mt-2"
                    />
                  </div>
                </div>
              </div>
            )}

            <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
              <Button 
                variant="outline" 
                onClick={() => setShowConfiguration(false)}
                className="border-gray-600 text-white hover:bg-gray-800"
              >
                Cancel
              </Button>
              <Button 
                onClick={handleConfigurationSave}
                className="bg-red-600 hover:bg-red-700"
              >
                {productType === 'PD' ? 'Next: Select Couplers' : 'Add to BOM'}
              </Button>
            </div>
          </div>
        </SheetContent>
      </Sheet>

      {/* Level 2 Options Selector for QPDM */}
      {showLevel2Options && configuringProduct && (
        <Level2OptionsSelector
          level1Product={configuringProduct}
          onOptionsSelect={handleLevel2OptionsSelect}
          selectedOptions={selectedLevel2Options}
          canSeePrices={canSeePrices}
          isOpen={showLevel2Options}
          onClose={() => {
            setShowLevel2Options(false);
            setConfiguringProduct(null);
          }}
        />
      )}
    </>
  );
};

export default Level1ProductSelector;


import { useState } from "react";
import { Level1Product, Level2Product } from "@/types/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Sheet, SheetContent, SheetDescription, SheetHeader, SheetTitle } from "@/components/ui/sheet";
import ToggleSwitch from "@/components/ui/toggle-switch";
import { Plus, Settings } from "lucide-react";

interface Level2OptionsSelectorProps {
  level1Product: Level1Product;
  onOptionsSelect: (options: Level2Product[]) => void;
  selectedOptions: Level2Product[];
  canSeePrices: boolean;
  isOpen: boolean;
  onClose: () => void;
}

const Level2OptionsSelector = ({ 
  level1Product, 
  onOptionsSelect, 
  selectedOptions, 
  canSeePrices,
  isOpen,
  onClose 
}: Level2OptionsSelectorProps) => {
  const [localOptions, setLocalOptions] = useState<Level2Product[]>(selectedOptions);

  const getAvailableOptions = (): Level2Product[] => {
    const baseOptions: Level2Product[] = [];
    
    switch (level1Product.type) {
      case 'TM8':
      case 'TM3':
        baseOptions.push(
          {
            id: `calgas-${level1Product.id}`,
            name: 'CalGas Calibration System',
            parentProductId: level1Product.id,
            type: 'CalGas',
            description: 'Automated calibration gas system',
            price: 3500,
            enabled: true
          },
          {
            id: `helium-${level1Product.id}`,
            name: 'Helium Bottle',
            parentProductId: level1Product.id,
            type: 'Standard',
            description: 'Helium reference bottle for calibration',
            price: 850,
            enabled: true
          },
          {
            id: `moisture-${level1Product.id}`,
            name: 'Moisture Sensor',
            parentProductId: level1Product.id,
            type: 'Moisture',
            description: 'Oil moisture content monitoring',
            price: 2200,
            enabled: true
          }
        );
        break;
      
      case 'TM1':
        baseOptions.push(
          {
            id: `bridge-${level1Product.id}`,
            name: '4-20 mA Bridge',
            parentProductId: level1Product.id,
            type: 'Standard',
            description: 'Current loop interface bridge',
            price: 1200,
            enabled: true
          },
          {
            id: `moisture-tm1-${level1Product.id}`,
            name: 'Moisture Sensor',
            parentProductId: level1Product.id,
            type: 'Moisture',
            description: 'Oil moisture content monitoring',
            price: 2200,
            enabled: true
          }
        );
        break;
      
      case 'QPDM':
        baseOptions.push(
          {
            id: `ic43-coupler-${level1Product.id}`,
            name: 'IC43 Coupler',
            parentProductId: level1Product.id,
            type: 'Standard',
            description: 'IC43 partial discharge coupler for transformer monitoring',
            price: 2500,
            enabled: true,
            specifications: {
              couplerType: 'IC43',
              frequency: '10 kHz - 1 MHz',
              sensitivity: 'High'
            }
          },
          {
            id: `ic44-coupler-${level1Product.id}`,
            name: 'IC44 Coupler',
            parentProductId: level1Product.id,
            type: 'Standard',
            description: 'IC44 partial discharge coupler for enhanced detection',
            price: 2800,
            enabled: true,
            specifications: {
              couplerType: 'IC44',
              frequency: '5 kHz - 2 MHz',
              sensitivity: 'Ultra-high'
            }
          },
          {
            id: `dn50-drain-coupler-${level1Product.id}`,
            name: 'DN50 Drain Type Coupler',
            parentProductId: level1Product.id,
            type: 'Standard',
            description: 'DN50 drain type partial discharge coupler',
            price: 3200,
            enabled: true,
            specifications: {
              couplerType: 'DN50',
              connectionType: 'Drain Type',
              diameter: '50mm'
            }
          },
          {
            id: `dn25-drain-coupler-${level1Product.id}`,
            name: 'DN25 Drain Type Coupler',
            parentProductId: level1Product.id,
            type: 'Standard',
            description: 'DN25 drain type partial discharge coupler',
            price: 2900,
            enabled: true,
            specifications: {
              couplerType: 'DN25',
              connectionType: 'Drain Type',
              diameter: '25mm'
            }
          }
        );
        break;
      
      case 'QTMS':
        baseOptions.push(
          {
            id: `relay-card-${level1Product.id}`,
            name: 'Relay Card',
            parentProductId: level1Product.id,
            type: 'Standard',
            description: '8-channel relay output card',
            price: 1800,
            enabled: true
          },
          {
            id: `analog-card-${level1Product.id}`,
            name: 'Analog Card',
            parentProductId: level1Product.id,
            type: 'Standard',
            description: '8-channel analog input card',
            price: 2200,
            enabled: true
          },
          {
            id: `fiber-card-${level1Product.id}`,
            name: 'Fiber Card',
            parentProductId: level1Product.id,
            type: 'Standard',
            description: 'Fiber optic communication card',
            price: 3200,
            enabled: true
          },
          {
            id: `display-card-${level1Product.id}`,
            name: 'Display Card',
            parentProductId: level1Product.id,
            type: 'Standard',
            description: 'LCD display interface card',
            price: 1500,
            enabled: true
          },
          {
            id: `bushing-card-${level1Product.id}`,
            name: 'Bushing Card',
            parentProductId: level1Product.id,
            type: 'Standard',
            description: 'Bushing monitoring interface card',
            price: 2800,
            enabled: true
          }
        );
        break;
    }
    
    return baseOptions;
  };

  const availableOptions = getAvailableOptions();

  const toggleOption = (option: Level2Product) => {
    const exists = localOptions.find(opt => opt.id === option.id);
    if (exists) {
      setLocalOptions(localOptions.filter(opt => opt.id !== option.id));
    } else {
      setLocalOptions([...localOptions, { ...option, enabled: true }]);
    }
  };

  const toggleOptionEnabled = (optionId: string, enabled: boolean) => {
    setLocalOptions(localOptions.map(opt => 
      opt.id === optionId ? { ...opt, enabled } : opt
    ));
  };

  const handleConfirm = () => {
    onOptionsSelect(localOptions);
    onClose();
  };

  return (
    <Sheet open={isOpen} onOpenChange={onClose}>
      <SheetContent className="w-[600px] sm:w-[800px] bg-gray-900 border-gray-800">
        <SheetHeader>
          <SheetTitle className="text-white">
            Configure {level1Product.name} - Level 2 Options
          </SheetTitle>
          <SheetDescription className="text-gray-400">
            Select additional options and accessories for your {level1Product.type} system
          </SheetDescription>
        </SheetHeader>
        
        <div className="mt-6 space-y-6">
          {/* Available Options */}
          <div>
            <h3 className="text-lg font-medium text-white mb-4">Available Options</h3>
            <div className="grid gap-3">
              {availableOptions.map((option) => {
                const isSelected = localOptions.some(opt => opt.id === option.id);
                return (
                  <div
                    key={option.id}
                    className={`p-4 rounded-lg border cursor-pointer transition-all ${
                      isSelected 
                        ? 'border-red-600 bg-red-900/20' 
                        : 'border-gray-700 bg-gray-800 hover:border-gray-600'
                    }`}
                    onClick={() => toggleOption(option)}
                  >
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <div className="flex items-center space-x-2 mb-2">
                          <h4 className="font-medium text-white">{option.name}</h4>
                          {isSelected && <Badge variant="outline" className="text-xs">Selected</Badge>}
                        </div>
                        <p className="text-sm text-gray-400 mb-2">{option.description}</p>
                        {option.specifications && (
                          <div className="text-xs text-gray-500 mb-2">
                            {Object.entries(option.specifications).map(([key, value]) => (
                              <div key={key}>{key}: {value}</div>
                            ))}
                          </div>
                        )}
                        <p className="text-sm font-bold text-white">
                          {canSeePrices ? `$${option.price.toLocaleString()}` : '—'}
                        </p>
                      </div>
                      <Button
                        variant={isSelected ? "default" : "outline"}
                        size="sm"
                        className={isSelected ? "bg-red-600 hover:bg-red-700" : ""}
                      >
                        <Plus className="h-4 w-4" />
                      </Button>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Selected Options */}
          {localOptions.length > 0 && (
            <div>
              <h3 className="text-lg font-medium text-white mb-4">Selected Options</h3>
              <div className="space-y-3">
                {localOptions.map((option) => (
                  <div key={option.id} className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <ToggleSwitch
                        checked={option.enabled}
                        onCheckedChange={(enabled) => toggleOptionEnabled(option.id, enabled)}
                        size="sm"
                      />
                      <div>
                        <p className={`font-medium text-sm ${option.enabled ? 'text-white' : 'text-gray-500'}`}>
                          {option.name}
                        </p>
                        <p className={`text-xs ${option.enabled ? 'text-gray-400' : 'text-gray-600'}`}>
                          {canSeePrices ? `$${option.price.toLocaleString()}` : '—'}
                        </p>
                      </div>
                    </div>
                    <Button
                      variant="ghost"
                      size="sm"
                      onClick={() => toggleOption(option)}
                      className="text-red-400 hover:text-red-300 hover:bg-red-900/20"
                    >
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* Action Buttons */}
          <div className="flex justify-end space-x-3 pt-6 border-t border-gray-700">
            <Button variant="outline" onClick={onClose} className="border-gray-600 text-white hover:bg-gray-800">
              Cancel
            </Button>
            <Button onClick={handleConfirm} className="bg-red-600 hover:bg-red-700">
              Confirm Selection
            </Button>
          </div>
        </div>
      </SheetContent>
    </Sheet>
  );
};

export default Level2OptionsSelector;

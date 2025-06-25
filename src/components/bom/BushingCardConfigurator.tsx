
import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { BOMItem, Level3Customization } from "@/types/product/interfaces";
import { Settings, Info } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";

interface BushingCardConfiguratorProps {
  bomItem: BOMItem;
  onSave: (customizations: Level3Customization[]) => void;
  onClose: () => void;
}

const BUSHING_TAP_MODELS = [
  'Model 1', 'Model 2', 'Model 3', 'Model 4', 'Model 5',
  'Model 6', 'Model 7', 'Model 8', 'Model 9', 'Model 10'
];

const BushingCardConfigurator = ({ bomItem, onSave, onClose }: BushingCardConfiguratorProps) => {
  const [numberOfBushings, setNumberOfBushings] = useState(1);
  const [bushingConfigurations, setBushingConfigurations] = useState<Record<number, string>>({
    1: 'Model 1'
  });

  const handleBushingCountChange = (count: number) => {
    setNumberOfBushings(count);
    
    // Initialize configurations for new bushings
    const newConfigurations = { ...bushingConfigurations };
    for (let i = 1; i <= count; i++) {
      if (!newConfigurations[i]) {
        newConfigurations[i] = 'Model 1';
      }
    }
    
    // Remove configurations for bushings beyond the new count
    Object.keys(newConfigurations).forEach(key => {
      const bushingIndex = parseInt(key);
      if (bushingIndex > count) {
        delete newConfigurations[bushingIndex];
      }
    });
    
    setBushingConfigurations(newConfigurations);
  };

  const handleTapModelChange = (bushingIndex: number, model: string) => {
    setBushingConfigurations(prev => ({
      ...prev,
      [bushingIndex]: model
    }));
  };

  const handleSave = () => {
    const customizations: Level3Customization[] = [];
    
    for (let i = 1; i <= numberOfBushings; i++) {
      customizations.push({
        id: `bushing-${i}`,
        name: `Bushing ${i}: ${bushingConfigurations[i]}`,
        description: `Bushing ${i} tap model configuration`,
        options: [bushingConfigurations[i]],
        price: 150, // Base price per bushing configuration
        enabled: true
      });
    }
    
    onSave(customizations);
  };

  // Get slot information if available
  const getSlotInfo = () => {
    if (bomItem.slot) {
      const primarySlot = bomItem.slot;
      const secondarySlot = primarySlot + 1;
      return `Slots ${primarySlot}-${secondarySlot}`;
    }
    return 'Slots will be assigned when placed';
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Configure Bushing Monitoring - {bomItem.product.name}
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Slot Information */}
          <Alert className="bg-blue-900/20 border-blue-600">
            <Info className="h-4 w-4" />
            <AlertDescription className="text-blue-400">
              <strong>2-Slot Card:</strong> This bushing monitoring card requires 2 consecutive slots.
              <br />
              <strong>Position:</strong> {getSlotInfo()}
            </AlertDescription>
          </Alert>

          {/* Number of Bushings */}
          <div className="space-y-2">
            <Label className="text-white font-medium">Number of Bushings</Label>
            <div className="flex items-center space-x-4">
              <Input
                type="number"
                min="1"
                max="6"
                value={numberOfBushings}
                onChange={(e) => handleBushingCountChange(parseInt(e.target.value) || 1)}
                className="bg-gray-800 border-gray-600 text-white w-20"
              />
              <span className="text-gray-400 text-sm">(1-6 bushings supported)</span>
            </div>
          </div>

          {/* Bushing Configurations */}
          <div className="space-y-4">
            <Label className="text-white font-medium">Bushing Tap Models</Label>
            <div className="grid grid-cols-1 gap-4 max-h-64 overflow-y-auto">
              {Array.from({ length: numberOfBushings }, (_, index) => {
                const bushingIndex = index + 1;
                return (
                  <div key={bushingIndex} className="flex items-center space-x-4 p-3 bg-gray-800 rounded border border-gray-700">
                    <div className="flex-shrink-0 w-20">
                      <Label className="text-white text-sm">Bushing {bushingIndex}</Label>
                    </div>
                    <div className="flex-1">
                      <Select 
                        value={bushingConfigurations[bushingIndex]} 
                        onValueChange={(value) => handleTapModelChange(bushingIndex, value)}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Select tap model" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600 z-50">
                          {BUSHING_TAP_MODELS.map((model) => (
                            <SelectItem 
                              key={model} 
                              value={model}
                              className="text-white hover:bg-gray-700 focus:bg-gray-700"
                            >
                              {model}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                    <div className="flex-shrink-0 text-right">
                      <span className="text-green-400 font-medium text-sm">+$150</span>
                    </div>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Configuration Summary */}
          <div className="bg-gray-800 p-4 rounded border border-gray-700">
            <h4 className="text-white font-medium mb-2">Configuration Summary</h4>
            <div className="space-y-1 text-sm">
              <div className="flex justify-between">
                <span className="text-gray-400">Card Position:</span>
                <span className="text-white">{getSlotInfo()}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Bushings:</span>
                <span className="text-white">{numberOfBushings}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Configuration Cost:</span>
                <span className="text-green-400">+${(numberOfBushings * 150).toLocaleString()}</span>
              </div>
            </div>
          </div>
        </div>

        <DialogFooter className="flex space-x-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-white hover:bg-gray-800"
          >
            Cancel
          </Button>
          <Button
            onClick={handleSave}
            className="bg-red-600 hover:bg-red-700 text-white"
          >
            Save Configuration
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default BushingCardConfigurator;

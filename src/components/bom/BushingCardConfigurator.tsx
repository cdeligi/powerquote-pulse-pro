
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 */

import { useState, useEffect } from "react";
import { BOMItem, Level3Customization } from "@/types/product/interfaces";
import { ProductDataService } from "@/services/productDataService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { X, Save } from "lucide-react";

interface BushingCardConfiguratorProps {
  bomItem: BOMItem;
  onSave: (customizations: Level3Customization[]) => void;
  onClose: () => void;
}

const BushingCardConfigurator = ({ bomItem, onSave, onClose }: BushingCardConfiguratorProps) => {
  console.log('BushingCardConfigurator rendering for item:', bomItem.product.name);
  
  const [tapModels, setTapModels] = useState<Array<{id: string, name: string}>>([]);
  const [numberOfBushings, setNumberOfBushings] = useState<number>(1);
  const [bushingConfigurations, setBushingConfigurations] = useState<Record<number, string>>({});
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    try {
      const models = ProductDataService.getBushingTapModels();
      console.log('Loaded bushing tap models:', models);
      setTapModels(models || []);
      
      // Load stored defaults
      const stored = localStorage.getItem(`bushingDefaults_${bomItem.product.id}`);
      const parsed = stored ? JSON.parse(stored) : null;
      
      const defaultNumberOfBushings = parsed?.numberOfBushings || 1;
      const defaultModel = models?.[0]?.name || 'Standard';
      
      setNumberOfBushings(defaultNumberOfBushings);
      setBushingConfigurations(parsed?.configs || { 1: defaultModel });
      
      setLoading(false);
    } catch (error) {
      console.error('Error initializing BushingCardConfigurator:', error);
      setTapModels([{ id: 'standard', name: 'Standard' }]);
      setNumberOfBushings(1);
      setBushingConfigurations({ 1: 'Standard' });
      setLoading(false);
    }
  }, [bomItem.product.id]);

  const handleNumberOfBushingsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = parseInt(e.target.value, 10);
    if (isNaN(value) || value < 1 || value > 6) return;

    setNumberOfBushings(value);

    // Ensure configurations exist for each bushing
    setBushingConfigurations(prev => {
      const updatedConfigs = { ...prev };
      const defaultModel = tapModels[0]?.name || 'Standard';
      
      for (let i = 1; i <= value; i++) {
        if (!updatedConfigs[i]) {
          updatedConfigs[i] = defaultModel;
        }
      }
      return updatedConfigs;
    });
  };

  const handleBushingConfigurationChange = (bushingNumber: number, tapModel: string) => {
    setBushingConfigurations(prev => ({
      ...prev,
      [bushingNumber]: tapModel
    }));
  };

  const handleSave = () => {
    try {
      const customizations: Level3Customization[] = [];
      
      for (let i = 1; i <= numberOfBushings; i++) {
        customizations.push({
          id: `bushing-${i}-${bomItem.id}`,
          parentOptionId: bomItem.id || `${Date.now()}-${i}`,
          type: 'bushing_config',
          name: `Bushing ${i}: ${bushingConfigurations[i]}`,
          description: `Bushing ${i} tap model configuration`,
          options: [bushingConfigurations[i]],
          price: 0,
          enabled: true
        });
      }
      
      console.log('Saving bushing customizations:', customizations);
      onSave(customizations);
    } catch (error) {
      console.error('Error saving bushing configuration:', error);
    }
  };

  if (loading) {
    return (
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border-gray-800">
          <div className="text-white text-center p-4">Loading...</div>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">Configure Bushing Card - {bomItem.product.name}</DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-6">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white text-lg">Number of Bushings</CardTitle>
              <CardDescription className="text-gray-400">
                Specify the number of bushings to configure (1-6)
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                <Label htmlFor="num-bushings" className="text-white font-medium">
                  Number of Bushings
                </Label>
                <Input
                  id="num-bushings"
                  type="number"
                  min="1"
                  max="6"
                  value={numberOfBushings}
                  onChange={handleNumberOfBushingsChange}
                  className="bg-gray-700 border-gray-600 text-white"
                />
              </div>
            </CardContent>
          </Card>

          {[...Array(numberOfBushings)].map((_, index) => (
            <Card key={index} className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Bushing {index + 1} Configuration</CardTitle>
                <CardDescription className="text-gray-400">
                  Select the tap model for bushing {index + 1}
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="space-y-2">
                  <Label htmlFor={`bushing-${index + 1}`} className="text-white font-medium">
                    Tap Model
                  </Label>
                  <Select
                    value={bushingConfigurations[index + 1] || tapModels[0]?.name || 'Standard'}
                    onValueChange={(value) => handleBushingConfigurationChange(index + 1, value)}
                  >
                    <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                      <SelectValue placeholder="Select tap model" />
                    </SelectTrigger>
                    <SelectContent className="bg-gray-700 border-gray-600">
                      {tapModels.map((model) => (
                        <SelectItem key={model.id} value={model.name} className="text-white hover:bg-gray-600 focus:bg-gray-600">
                          {model.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </CardContent>
            </Card>
          ))}
          
          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-black bg-white hover:bg-gray-100"
            >
              Cancel
            </Button>
            <Button 
              className="bg-red-600 hover:bg-red-700 text-white"
              onClick={handleSave}
            >
              <Save className="mr-2 h-4 w-4" />
              Save Configuration
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BushingCardConfigurator;

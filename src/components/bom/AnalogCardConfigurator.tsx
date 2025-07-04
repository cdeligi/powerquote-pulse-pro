
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 */

import { useState } from "react";
import { BOMItem, Level3Customization } from "@/types/product/interfaces";
import { productDataService } from "@/services/productDataService";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";
import { X, Save, Info } from "lucide-react";

interface AnalogCardConfiguratorProps {
  bomItem: BOMItem;
  onSave: (customizations: Level3Customization[]) => void;
  onClose: () => void;
}

const AnalogCardConfigurator = ({ bomItem, onSave, onClose }: AnalogCardConfiguratorProps) => {
  const sensorOptions = productDataService.getAnalogSensorTypes();
  const [channelConfigs, setChannelConfigs] = useState<Record<number, string>>(() => {
    // Initialize with existing configurations or default to first sensor type
    const configs: Record<number, string> = {};
    if (bomItem.level3Customizations) {
      bomItem.level3Customizations.forEach((config, index) => {
        if (config.name && sensorOptions.some(s => s.name === config.name)) {
          configs[index + 1] = config.name;
        }
      });
    } else {
      const stored = localStorage.getItem(`analogDefaults_${bomItem.product.id}`);
      if (stored) {
        Object.assign(configs, JSON.parse(stored));
      }
    }

  // Fill in any missing channels with default
    for (let i = 1; i <= 8; i++) {
      if (!configs[i]) {
        configs[i] = sensorOptions[0]?.name || '';
      }
    }

    return configs;
  });

  const handleChannelChange = (channel: number, sensorType: string) => {
    setChannelConfigs(prev => ({
      ...prev,
      [channel]: sensorType
    }));
  };

  const handleSave = () => {
    const customizations: Level3Customization[] = [];
    
    for (let channel = 1; channel <= 8; channel++) {
      const sensorType = channelConfigs[channel];
      customizations.push({
        id: `analog-ch${channel}-${bomItem.id}`,
        parentOptionId: bomItem.id,
        type: 'analog_sensor',
        name: sensorType,
        description: `Channel ${channel} sensor configuration`,
        options: [sensorType],
        price: 0, // No additional cost for sensor type selection
        enabled: true
      });
    }
    
    onSave(customizations);
  };

  return (
    <TooltipProvider>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-4xl max-h-[80vh] overflow-y-auto">
          <DialogHeader>
            <div className="flex items-center justify-between">
              <DialogTitle className="text-white">Configure Analog Card - {bomItem.product.name}</DialogTitle>
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
                <CardTitle className="text-white text-lg">Channel Configuration</CardTitle>
                <CardDescription className="text-gray-400">
                  Configure each of the 8 analog input channels with the appropriate sensor type
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  {[1, 2, 3, 4, 5, 6, 7, 8].map((channel) => (
                    <div key={channel} className="space-y-2">
                      <div className="flex items-center space-x-2">
                        <Label htmlFor={`channel-${channel}`} className="text-white font-medium">
                          Channel {channel}
                        </Label>
                        <Tooltip>
                          <TooltipTrigger>
                            <Info className="h-4 w-4 text-gray-400 hover:text-white" />
                          </TooltipTrigger>
                      <TooltipContent className="bg-gray-800 border-gray-600 text-white max-w-xs">
                            <p>{sensorOptions.find(s => s.name === channelConfigs[channel])?.description}</p>
                          </TooltipContent>
                        </Tooltip>
                      </div>
                      <Select
                        value={channelConfigs[channel]}
                        onValueChange={(value: string) => handleChannelChange(channel, value)}
                      >
                        <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                          <SelectValue placeholder="Select sensor type" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-700 border-gray-600 max-h-60">
                          {sensorOptions.map((sensor) => (
                            <Tooltip key={sensor.id}>
                              <TooltipTrigger asChild>
                                <SelectItem
                                  value={sensor.name}
                                  className="text-white hover:bg-gray-600 focus:bg-gray-600"
                                >
                                  {sensor.name}
                                </SelectItem>
                              </TooltipTrigger>
                              <TooltipContent className="bg-gray-800 border-gray-600 text-white max-w-xs">
                                <p>{sensor.description}</p>
                              </TooltipContent>
                            </Tooltip>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>

            {/* Summary */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg">Configuration Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-2 gap-2 text-sm">
                  {Object.entries(channelConfigs).map(([channel, sensorType]) => (
                    <div key={channel} className="flex justify-between">
                      <span className="text-gray-400">Channel {channel}:</span>
                      <span className="text-white">{sensorType}</span>
                    </div>
                  ))}
                </div>
              </CardContent>
            </Card>
            
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
    </TooltipProvider>
  );
};

export default AnalogCardConfigurator;

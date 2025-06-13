
import { useState } from "react";
import { BOMItem, Level3Customization, ANALOG_SENSOR_TYPES, AnalogSensorType } from "@/types/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { X, Save } from "lucide-react";

interface AnalogCardConfiguratorProps {
  bomItem: BOMItem;
  onSave: (customizations: Level3Customization[]) => void;
  onClose: () => void;
}

const AnalogCardConfigurator = ({ bomItem, onSave, onClose }: AnalogCardConfiguratorProps) => {
  const [channelConfigs, setChannelConfigs] = useState<Record<number, AnalogSensorType>>(() => {
    // Initialize with existing configurations or default to first sensor type
    const configs: Record<number, AnalogSensorType> = {};
    
    if (bomItem.level3Customizations) {
      bomItem.level3Customizations.forEach((config, index) => {
        if (config.name && ANALOG_SENSOR_TYPES.includes(config.name as AnalogSensorType)) {
          configs[index + 1] = config.name as AnalogSensorType;
        }
      });
    }
    
    // Fill in any missing channels with default
    for (let i = 1; i <= 8; i++) {
      if (!configs[i]) {
        configs[i] = 'Pt100/RTD';
      }
    }
    
    return configs;
  });

  const handleChannelChange = (channel: number, sensorType: AnalogSensorType) => {
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
        name: sensorType,
        parentOptionId: bomItem.id,
        type: 'sensor_type',
        options: [sensorType],
        price: 0, // No additional cost for sensor type selection
        enabled: true
      });
    }
    
    onSave(customizations);
  };

  return (
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
                    <Label htmlFor={`channel-${channel}`} className="text-white font-medium">
                      Channel {channel}
                    </Label>
                    <Select
                      value={channelConfigs[channel]}
                      onValueChange={(value: AnalogSensorType) => handleChannelChange(channel, value)}
                    >
                      <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                        <SelectValue placeholder="Select sensor type" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-700 border-gray-600 max-h-60">
                        {ANALOG_SENSOR_TYPES.map((sensorType) => (
                          <SelectItem 
                            key={sensorType} 
                            value={sensorType}
                            className="text-white hover:bg-gray-600 focus:bg-gray-600"
                          >
                            {sensorType}
                          </SelectItem>
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
              className="border-gray-600 text-white hover:bg-gray-800"
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

export default AnalogCardConfigurator;

import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Level3Product, ANALOG_SENSOR_TYPES, AnalogSensorType } from "@/types/product";

interface AnalogDefaultsDialogProps {
  product: Level3Product;
  onClose: () => void;
}

const AnalogDefaultsDialog = ({ product, onClose }: AnalogDefaultsDialogProps) => {
  const [channelConfigs, setChannelConfigs] = useState<Record<number, AnalogSensorType>>(() => {
    const stored = localStorage.getItem(`analogDefaults_${product.id}`);
    if (stored) return JSON.parse(stored);
    const defaults: Record<number, AnalogSensorType> = {};
    for (let i = 1; i <= 8; i++) {
      defaults[i] = 'Pt100/RTD';
    }
    return defaults;
  });

  const handleChannelChange = (channel: number, sensorType: AnalogSensorType) => {
    setChannelConfigs(prev => ({ ...prev, [channel]: sensorType }));
  };

  const handleSave = () => {
    localStorage.setItem(`analogDefaults_${product.id}`, JSON.stringify(channelConfigs));
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-3xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Default Analog Channels - {product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {[1,2,3,4,5,6,7,8].map((channel) => (
              <div key={channel} className="space-y-2">
                <Label className="text-white font-medium">Channel {channel}</Label>
                <Select value={channelConfigs[channel]} onValueChange={(value: AnalogSensorType) => handleChannelChange(channel, value)}>
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                    <SelectValue placeholder="Select sensor type" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600 max-h-60">
                    {ANALOG_SENSOR_TYPES.map(sensor => (
                      <SelectItem key={sensor} value={sensor} className="text-white hover:bg-gray-600 focus:bg-gray-600">
                        {sensor}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
          </div>
          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-700">
            <Button variant="outline" onClick={onClose} className="border-gray-600 text-black bg-white hover:bg-gray-100">
              Cancel
            </Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleSave}>
              Save Defaults
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default AnalogDefaultsDialog;

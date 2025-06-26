import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Level3Product } from "@/types/product";

const BUSHING_TAP_MODELS = ['Standard','High Accuracy','High Frequency','Custom'];

interface BushingDefaultsDialogProps {
  product: Level3Product;
  onClose: () => void;
}

const BushingDefaultsDialog = ({ product, onClose }: BushingDefaultsDialogProps) => {
  const stored = localStorage.getItem(`bushingDefaults_${product.id}`);
  const parsed = stored ? JSON.parse(stored) as {numberOfBushings: number; configs: Record<number,string>} : null;
  const [numberOfBushings, setNumberOfBushings] = useState<number>(parsed?.numberOfBushings || 1);
  const [configs, setConfigs] = useState<Record<number,string>>(() => parsed?.configs || {1: 'Standard'});

  const handleNumberChange = (value: number) => {
    if (value < 1 || value > 6) return;
    setNumberOfBushings(value);
    setConfigs(prev => {
      const updated: Record<number,string> = { ...prev };
      for (let i = 1; i <= value; i++) {
        if (!updated[i]) updated[i] = 'Standard';
      }
      Object.keys(updated).forEach(key => { if (parseInt(key) > value) delete updated[key]; });
      return updated;
    });
  };

  const handleConfigChange = (num: number, model: string) => {
    setConfigs(prev => ({ ...prev, [num]: model }));
  };

  const handleSave = () => {
    localStorage.setItem(`bushingDefaults_${product.id}`, JSON.stringify({ numberOfBushings, configs }));
    onClose();
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white">Default Bushing Taps - {product.name}</DialogTitle>
        </DialogHeader>
        <div className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="num-bushings" className="text-white font-medium">Number of Bushings</Label>
            <Input id="num-bushings" type="number" min="1" max="6" value={numberOfBushings} onChange={e => handleNumberChange(Number(e.target.value))} className="bg-gray-700 border-gray-600 text-white" />
          </div>
          {[...Array(numberOfBushings)].map((_, index) => (
            <div key={index} className="space-y-2">
              <Label className="text-white font-medium">Bushing {index + 1} Tap Model</Label>
              <Select value={configs[index+1]} onValueChange={val => handleConfigChange(index+1, val)}>
                <SelectTrigger className="bg-gray-700 border-gray-600 text-white">
                  <SelectValue placeholder="Select tap model" />
                </SelectTrigger>
                <SelectContent className="bg-gray-700 border-gray-600">
                  {BUSHING_TAP_MODELS.map(model => (
                    <SelectItem key={model} value={model} className="text-white hover:bg-gray-600 focus:bg-gray-600">{model}</SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          ))}
          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-700">
            <Button variant="outline" onClick={onClose} className="border-gray-600 text-black bg-white hover:bg-gray-100">Cancel</Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleSave}>Save Defaults</Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default BushingDefaultsDialog;


import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Checkbox } from "@/components/ui/checkbox";
import { Card as ProductCard, Chassis } from "@/types/product";

interface CardFormProps {
  onSubmit: (card: Omit<ProductCard, 'id'>) => void;
  chassisOptions: Chassis[];
  initialData?: ProductCard;
}

const CardForm = ({ onSubmit, chassisOptions, initialData }: CardFormProps) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    type: initialData?.type || 'relay' as 'relay' | 'analog' | 'fiber' | 'display' | 'bushing',
    description: initialData?.description || '',
    price: initialData?.price || 0,
    cost: initialData?.cost || 0,
    slotRequirement: initialData?.slotRequirement || 1,
    compatibleChassis: initialData?.compatibleChassis || [],
    specifications: initialData?.specifications || {},
    partNumber: initialData?.partNumber || '',
    enabled: initialData?.enabled ?? true
  });

  const handleChassisCompatibilityChange = (chassisId: string, checked: boolean) => {
    if (checked) {
      setFormData({
        ...formData,
        compatibleChassis: [...formData.compatibleChassis, chassisId]
      });
    } else {
      setFormData({
        ...formData,
        compatibleChassis: formData.compatibleChassis.filter(id => id !== chassisId)
      });
    }
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="text-white">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-gray-800 border-gray-700 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="type" className="text-white">Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value: 'relay' | 'analog' | 'fiber' | 'display' | 'bushing') => 
              setFormData({ ...formData, type: value })
            }
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="relay" className="text-white">Relay</SelectItem>
              <SelectItem value="analog" className="text-white">Analog</SelectItem>
              <SelectItem value="fiber" className="text-white">Fiber</SelectItem>
              <SelectItem value="display" className="text-white">Display</SelectItem>
              <SelectItem value="bushing" className="text-white">Bushing</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="description" className="text-white">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
          required
        />
      </div>

      <div className="grid grid-cols-3 gap-4">
        <div>
          <Label htmlFor="price" className="text-white">Price ($)</Label>
          <Input
            id="price"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
            className="bg-gray-800 border-gray-700 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="cost" className="text-white">Cost ($)</Label>
          <Input
            id="cost"
            type="number"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>
        <div>
          <Label htmlFor="slotRequirement" className="text-white">Slot Requirement</Label>
          <Input
            id="slotRequirement"
            type="number"
            value={formData.slotRequirement}
            onChange={(e) => setFormData({ ...formData, slotRequirement: parseInt(e.target.value) })}
            className="bg-gray-800 border-gray-700 text-white"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="partNumber" className="text-white">Part Number</Label>
        <Input
          id="partNumber"
          value={formData.partNumber}
          onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
        />
      </div>

      <div>
        <Label className="text-white">Compatible Chassis</Label>
        <div className="grid grid-cols-2 gap-2 mt-2">
          {chassisOptions.map((chassis) => (
            <div key={chassis.id} className="flex items-center space-x-2">
              <Checkbox
                id={`chassis-${chassis.id}`}
                checked={formData.compatibleChassis.includes(chassis.id)}
                onCheckedChange={(checked) => 
                  handleChassisCompatibilityChange(chassis.id, !!checked)
                }
                className="border-gray-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
              />
              <Label 
                htmlFor={`chassis-${chassis.id}`}
                className="text-sm text-gray-300 cursor-pointer"
              >
                {chassis.name}
              </Label>
            </div>
          ))}
        </div>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="enabled"
          checked={formData.enabled}
          onCheckedChange={(enabled) => setFormData({ ...formData, enabled })}
        />
        <Label htmlFor="enabled" className="text-white">Enabled</Label>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="submit" className="bg-red-600 hover:bg-red-700">
          {initialData ? 'Update' : 'Create'} Card
        </Button>
      </div>
    </form>
  );
};

export default CardForm;

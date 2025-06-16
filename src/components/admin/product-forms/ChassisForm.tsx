
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Level2Product, Level1Product } from "@/types/product";

interface ChassisFormProps {
  onSubmit: (chassis: Omit<Level2Product, 'id'>) => void;
  level1Products: Level1Product[];
  initialData?: Level2Product;
}

const ChassisForm = ({ onSubmit, level1Products, initialData }: ChassisFormProps) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    parentProductId: initialData?.parentProductId || '',
    type: initialData?.type || 'LTX' as 'LTX' | 'MTX' | 'STX' | 'CalGas' | 'Moisture' | 'Standard',
    description: initialData?.description || '',
    price: initialData?.price || 0,
    cost: initialData?.cost || 0,
    enabled: initialData?.enabled ?? true,
    specifications: initialData?.specifications || {
      height: '',
      slots: 0
    },
    partNumber: initialData?.partNumber || ''
  });

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
          <Label htmlFor="parentProductId" className="text-white">Parent Product</Label>
          <Select
            value={formData.parentProductId}
            onValueChange={(value) => setFormData({ ...formData, parentProductId: value })}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Select parent product" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {level1Products.map((product) => (
                <SelectItem key={product.id} value={product.id} className="text-white">
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="type" className="text-white">Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value: 'LTX' | 'MTX' | 'STX' | 'CalGas' | 'Moisture' | 'Standard') => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="LTX" className="text-white">LTX</SelectItem>
              <SelectItem value="MTX" className="text-white">MTX</SelectItem>
              <SelectItem value="STX" className="text-white">STX</SelectItem>
              <SelectItem value="CalGas" className="text-white">CalGas</SelectItem>
              <SelectItem value="Moisture" className="text-white">Moisture</SelectItem>
              <SelectItem value="Standard" className="text-white">Standard</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="slots" className="text-white">Slots</Label>
          <Input
            id="slots"
            type="number"
            value={formData.specifications?.slots || 0}
            onChange={(e) => setFormData({ 
              ...formData, 
              specifications: { 
                ...formData.specifications,
                slots: parseInt(e.target.value) 
              }
            })}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="height" className="text-white">Height</Label>
          <Input
            id="height"
            value={formData.specifications?.height || ''}
            onChange={(e) => setFormData({ 
              ...formData, 
              specifications: { 
                ...formData.specifications,
                height: e.target.value 
              }
            })}
            className="bg-gray-800 border-gray-700 text-white"
            placeholder="e.g., 6U"
          />
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

      <div className="grid grid-cols-2 gap-4">
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
          {initialData ? 'Update' : 'Create'} Chassis
        </Button>
      </div>
    </form>
  );
};

export default ChassisForm;

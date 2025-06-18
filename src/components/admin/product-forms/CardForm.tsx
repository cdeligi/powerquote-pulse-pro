
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Level2Product, Level3Product } from "@/types/product";

interface CardFormProps {
  onSubmit: (product: Omit<Level3Product, 'id'>) => void;
  level2Products: Level2Product[];
  initialData?: Level3Product;
}

const CardForm = ({ onSubmit, level2Products, initialData }: CardFormProps) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    parentProductId: initialData?.parentProductId || '',
    type: initialData?.type || '',
    description: initialData?.description || '',
    price: initialData?.price || 0,
    cost: initialData?.cost || 0,
    enabled: initialData?.enabled ?? true,
    specifications: initialData?.specifications || {},
    partNumber: initialData?.partNumber || '',
    image: initialData?.image || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  const handleSpecificationChange = (key: string, value: any) => {
    setFormData({
      ...formData,
      specifications: {
        ...formData.specifications,
        [key]: value
      }
    });
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="text-white">Component Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-gray-800 border-gray-700 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="parentProductId" className="text-white">Parent Product (Level 2)</Label>
          <Select 
            value={formData.parentProductId} 
            onValueChange={(value) => setFormData({ ...formData, parentProductId: value })}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Select parent product" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {level2Products.map((product) => (
                <SelectItem key={product.id} value={product.id} className="text-white">
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="type" className="text-white">Component Type</Label>
        <Select 
          value={formData.type} 
          onValueChange={(value) => setFormData({ ...formData, type: value })}
        >
          <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
            <SelectValue placeholder="Select component type" />
          </SelectTrigger>
          <SelectContent className="bg-gray-800 border-gray-700">
            <SelectItem value="relay" className="text-white">Relay</SelectItem>
            <SelectItem value="analog" className="text-white">Analog</SelectItem>
            <SelectItem value="fiber" className="text-white">Fiber</SelectItem>
            <SelectItem value="display" className="text-white">Display</SelectItem>
            <SelectItem value="bushing" className="text-white">Bushing</SelectItem>
            <SelectItem value="accessory" className="text-white">Accessory</SelectItem>
            <SelectItem value="sensor" className="text-white">Sensor</SelectItem>
          </SelectContent>
        </Select>
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

      <div className="grid grid-cols-2 gap-4">
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
          <Label htmlFor="image" className="text-white">Image URL</Label>
          <Input
            id="image"
            type="url"
            value={formData.image}
            onChange={(e) => setFormData({ ...formData, image: e.target.value })}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>
      </div>

      {/* Specifications Section */}
      <div className="space-y-2">
        <Label className="text-white">Specifications (Optional)</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="slotRequirement" className="text-white text-sm">Slot Requirement</Label>
            <Input
              id="slotRequirement"
              type="number"
              value={formData.specifications?.slotRequirement || ''}
              onChange={(e) => handleSpecificationChange('slotRequirement', parseInt(e.target.value) || 0)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="e.g., 1, 2"
            />
          </div>
          <div>
            <Label htmlFor="channels" className="text-white text-sm">Channels</Label>
            <Input
              id="channels"
              type="number"
              value={formData.specifications?.channels || ''}
              onChange={(e) => handleSpecificationChange('channels', parseInt(e.target.value) || 0)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="e.g., 8, 4"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="inputs" className="text-white text-sm">Inputs</Label>
            <Input
              id="inputs"
              type="number"
              value={formData.specifications?.inputs || ''}
              onChange={(e) => handleSpecificationChange('inputs', parseInt(e.target.value) || 0)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          <div>
            <Label htmlFor="outputs" className="text-white text-sm">Outputs</Label>
            <Input
              id="outputs"
              type="number"
              value={formData.specifications?.outputs || ''}
              onChange={(e) => handleSpecificationChange('outputs', parseInt(e.target.value) || 0)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="protocols" className="text-white text-sm">Protocols (comma-separated)</Label>
          <Input
            id="protocols"
            value={formData.specifications?.protocols?.join(', ') || ''}
            onChange={(e) => handleSpecificationChange('protocols', e.target.value.split(',').map(s => s.trim()))}
            className="bg-gray-800 border-gray-700 text-white"
            placeholder="e.g., DNP3, IEC 61850"
          />
        </div>
        <div>
          <Label htmlFor="inputTypes" className="text-white text-sm">Input Types (comma-separated)</Label>
          <Input
            id="inputTypes"
            value={formData.specifications?.inputTypes?.join(', ') || ''}
            onChange={(e) => handleSpecificationChange('inputTypes', e.target.value.split(',').map(s => s.trim()))}
            className="bg-gray-800 border-gray-700 text-white"
            placeholder="e.g., 4-20mA, CT, RTD"
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
          {initialData ? 'Update' : 'Create'} Level 3 Component
        </Button>
      </div>
    </form>
  );
};

export default CardForm;

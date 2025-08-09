
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

  // Get the parent product name for the type field
  const selectedParent = level2Products.find(p => p.id === formData.parentProductId);

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
            onValueChange={(value) => {
              const parentProduct = level2Products.find(p => p.id === value);
              setFormData({ 
                ...formData, 
                parentProductId: value,
                type: parentProduct?.name || ''
              });
            }}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Select parent product" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {level2Products.map((product) => (
                <SelectItem key={product.id} value={product.id} className="text-white">
                  {product.name} ({product.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="type" className="text-white">Display Name (Auto-filled from Parent)</Label>
        <Input
          id="type"
          value={selectedParent?.name || formData.type}
          readOnly
          className="bg-gray-700 border-gray-600 text-gray-300"
          placeholder="Select parent product first"
        />
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

      <div>
        <Label className="text-white">Part Number</Label>
        <div className="text-sm text-gray-400">
          Part numbers are configured under Products → Part Numbers.
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
            <Label htmlFor="inputs" className="text-white text-sm">Inputs</Label>
            <Input
              id="inputs"
              type="number"
              value={formData.specifications?.inputs || ''}
              onChange={(e) => handleSpecificationChange('inputs', parseInt(e.target.value) || 0)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="e.g., 8, 16"
            />
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="outputs" className="text-white text-sm">Outputs</Label>
            <Input
              id="outputs"
              type="number"
              value={formData.specifications?.outputs || ''}
              onChange={(e) => handleSpecificationChange('outputs', parseInt(e.target.value) || 0)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="e.g., 2, 4"
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
              placeholder="e.g., 1, 3, 8"
            />
          </div>
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
          {initialData ? 'Update' : 'Create'} Component
        </Button>
      </div>
    </form>
  );
};

export default CardForm;

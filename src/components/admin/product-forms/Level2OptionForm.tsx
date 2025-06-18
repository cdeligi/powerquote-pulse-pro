
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Level1Product, Level2Product } from "@/types/product";

interface Level2OptionFormProps {
  onSubmit: (product: Omit<Level2Product, 'id'>) => void;
  level1Products: Level1Product[];
  initialData?: Level2Product;
}

const Level2OptionForm = ({ onSubmit, level1Products, initialData }: Level2OptionFormProps) => {
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
    image: initialData?.image || '',
    productInfoUrl: initialData?.productInfoUrl || ''
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
  const selectedParent = level1Products.find(p => p.id === formData.parentProductId);

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="text-white">Product Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-gray-800 border-gray-700 text-white"
            required
          />
        </div>
        <div>
          <Label htmlFor="parentProductId" className="text-white">Parent Product (Level 1)</Label>
          <Select 
            value={formData.parentProductId} 
            onValueChange={(value) => {
              const parentProduct = level1Products.find(p => p.id === value);
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
              {level1Products.map((product) => (
                <SelectItem key={product.id} value={product.id} className="text-white">
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="type" className="text-white">Type (Auto-filled from Parent)</Label>
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
          <Label htmlFor="productInfoUrl" className="text-white">Product Info URL</Label>
          <Input
            id="productInfoUrl"
            type="url"
            value={formData.productInfoUrl}
            onChange={(e) => setFormData({ ...formData, productInfoUrl: e.target.value })}
            className="bg-gray-800 border-gray-700 text-white"
          />
        </div>
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

      {/* Specifications Section */}
      <div className="space-y-2">
        <Label className="text-white">Specifications (Optional)</Label>
        <div className="grid grid-cols-2 gap-4">
          <div>
            <Label htmlFor="height" className="text-white text-sm">Height</Label>
            <Input
              id="height"
              value={formData.specifications?.height || ''}
              onChange={(e) => handleSpecificationChange('height', e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="e.g., 6U, 3U, 1.5U"
            />
          </div>
          <div>
            <Label htmlFor="slots" className="text-white text-sm">Slots</Label>
            <Input
              id="slots"
              type="number"
              value={formData.specifications?.slots || ''}
              onChange={(e) => handleSpecificationChange('slots', parseInt(e.target.value) || 0)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="e.g., 14, 7, 4"
            />
          </div>
        </div>
        <div>
          <Label htmlFor="capacity" className="text-white text-sm">Capacity</Label>
          <Input
            id="capacity"
            value={formData.specifications?.capacity || ''}
            onChange={(e) => handleSpecificationChange('capacity', e.target.value)}
            className="bg-gray-800 border-gray-700 text-white"
            placeholder="e.g., Large, Medium, Compact"
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
          {initialData ? 'Update' : 'Create'} Product
        </Button>
      </div>
    </form>
  );
};

export default Level2OptionForm;

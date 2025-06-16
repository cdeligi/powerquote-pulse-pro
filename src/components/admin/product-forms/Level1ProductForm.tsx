
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Level1Product } from "@/types/product";

interface Level1ProductFormProps {
  onSubmit: (product: Omit<Level1Product, 'id'>) => void;
  initialData?: Level1Product;
}

const Level1ProductForm = ({ onSubmit, initialData }: Level1ProductFormProps) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    type: initialData?.type || 'QTMS' as 'QTMS' | 'TM8' | 'TM3' | 'TM1' | 'QPDM',
    description: initialData?.description || '',
    price: initialData?.price || 0,
    cost: initialData?.cost || 0,
    productInfoUrl: initialData?.productInfoUrl || '',
    enabled: initialData?.enabled ?? true,
    customizations: initialData?.customizations || [],
    hasQuantitySelection: initialData?.hasQuantitySelection ?? false,
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
          <Label htmlFor="type" className="text-white">Type</Label>
          <Select
            value={formData.type}
            onValueChange={(value: 'QTMS' | 'TM8' | 'TM3' | 'TM1' | 'QPDM') => 
              setFormData({ ...formData, type: value })
            }
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="QTMS" className="text-white">QTMS</SelectItem>
              <SelectItem value="TM8" className="text-white">TM8</SelectItem>
              <SelectItem value="TM3" className="text-white">TM3</SelectItem>
              <SelectItem value="TM1" className="text-white">TM1</SelectItem>
              <SelectItem value="QPDM" className="text-white">QPDM</SelectItem>
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

      <div className="grid grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="enabled"
            checked={formData.enabled}
            onCheckedChange={(enabled) => setFormData({ ...formData, enabled })}
          />
          <Label htmlFor="enabled" className="text-white">Enabled</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="hasQuantitySelection"
            checked={formData.hasQuantitySelection}
            onCheckedChange={(hasQuantitySelection) => 
              setFormData({ ...formData, hasQuantitySelection })
            }
          />
          <Label htmlFor="hasQuantitySelection" className="text-white">Has Quantity Selection</Label>
        </div>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="submit" className="bg-red-600 hover:bg-red-700">
          {initialData ? 'Update' : 'Create'} Product
        </Button>
      </div>
    </form>
  );
};

export default Level1ProductForm;

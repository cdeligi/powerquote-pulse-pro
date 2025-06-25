
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Level1Product } from "@/types/product";
import { productDataService } from "@/services/productDataService";

interface Level1ProductFormProps {
  onSubmit: (product: Omit<Level1Product, 'id'>) => void;
  initialData?: Level1Product;
}

const Level1ProductForm = ({ onSubmit, initialData }: Level1ProductFormProps) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    type: initialData?.type || '',
    category: initialData?.category || '',
    description: initialData?.description || '',
    price: initialData?.price || 0,
    cost: initialData?.cost || 0,
    productInfoUrl: initialData?.productInfoUrl || '',
    enabled: initialData?.enabled ?? true,
    partNumber: initialData?.partNumber || '',
    image: initialData?.image || ''
  });

  // Get asset types from service
  const assetTypes = productDataService.getAssetTypes();

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

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
            placeholder="e.g., QTMS, DGA, Partial Discharge"
          />
        </div>
        <div>
          <Label htmlFor="type" className="text-white">Asset Type (Level 0)</Label>
          <Select 
            value={formData.type} 
            onValueChange={(value) => setFormData({ ...formData, type: value })}
          >
            <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Select asset type" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {assetTypes.filter(type => type.enabled).map((type) => (
                <SelectItem key={type.id} value={type.name} className="text-white">
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="category" className="text-white">Category (Optional)</Label>
        <Input
          id="category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="bg-gray-800 border-gray-700 text-white"
          placeholder="e.g., Monitoring Systems, DGA Monitors"
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
          <Label htmlFor="price" className="text-white">Base Price ($)</Label>
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
          <Label htmlFor="cost" className="text-white">Base Cost ($)</Label>
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

export default Level1ProductForm;

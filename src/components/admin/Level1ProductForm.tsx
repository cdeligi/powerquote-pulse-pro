import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Level1Product, AssetType } from "@/types/product";
import { productDataService } from "@/services/productDataService";

interface Level1ProductFormProps {
  onSubmit: (product: Omit<Level1Product, 'id'> & { rackConfigurable?: boolean }) => void;
  initialData?: Level1Product & { rackConfigurable?: boolean };
}

const Level1ProductForm: React.FC<Level1ProductFormProps> = ({ onSubmit, initialData }) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    type: initialData?.type || 'QTMS',
    category: initialData?.category || '',
    description: initialData?.description || '',
    price: initialData?.price || 0,
    cost: initialData?.cost || 0,
    enabled: initialData?.enabled ?? true,
    
    image: initialData?.image || '',
    productInfoUrl: initialData?.productInfoUrl || '',
    rackConfigurable: (initialData as any)?.rackConfigurable ?? false
  });

  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const loadAssetTypes = async () => {
      try {
        const types = await productDataService.getAssetTypes();
        setAssetTypes(types);
      } catch (error) {
        console.error('Error loading asset types:', error);
        // Fallback to sync method
        const syncTypes = productDataService.getAssetTypesSync();
        setAssetTypes(syncTypes);
      } finally {
        setIsLoading(false);
      }
    };

    loadAssetTypes();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  if (isLoading) {
    return <div>Loading asset types...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name">Product Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            required
          />
        </div>
        <div>
          <Label htmlFor="type">Product Type</Label>
          <Input
            id="type"
            value={formData.type}
            onChange={(e) => setFormData({ ...formData, type: e.target.value })}
            placeholder="QTMS, DGA, PD"
            required
          />
        </div>
      </div>

      <div>
        <Label htmlFor="category">Category</Label>
        <Select value={formData.category} onValueChange={(value) => setFormData({ ...formData, category: value })}>
          <SelectTrigger>
            <SelectValue placeholder="Select asset type" />
          </SelectTrigger>
          <SelectContent>
            {assetTypes.map((type) => (
              <SelectItem key={type.id} value={type.name}>
                {type.name}
              </SelectItem>
            ))}
            <SelectItem value="monitoring-systems">Monitoring Systems</SelectItem>
            <SelectItem value="accessories">Accessories</SelectItem>
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          rows={3}
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price">Price ($)</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) || 0 })}
            required
          />
        </div>
        <div>
          <Label htmlFor="cost">Cost ($)</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) || 0 })}
          />
        </div>
      </div>

      <div>
        <Label htmlFor="image">Image URL</Label>
        <Input
          id="image"
          type="url"
          value={formData.image}
          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
        />
      </div>

      <div>
        <Label htmlFor="productInfoUrl">Product Info URL</Label>
        <Input
          id="productInfoUrl"
          type="url"
          value={formData.productInfoUrl}
          onChange={(e) => setFormData({ ...formData, productInfoUrl: e.target.value })}
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="enabled"
          checked={formData.enabled}
          onCheckedChange={(checked) => setFormData({ ...formData, enabled: checked })}
        />
        <Label htmlFor="enabled">Enabled</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="rackConfigurable"
          checked={formData.rackConfigurable}
          onCheckedChange={(checked) => setFormData({ ...formData, rackConfigurable: checked })}
        />
        <Label htmlFor="rackConfigurable">Enable Rack Configuration</Label>
        <span className="text-sm text-muted-foreground ml-2">
          Products with rack configuration show chassis/slot selection in BOM Builder
        </span>
      </div>

      <Button type="submit" className="w-full">
        {initialData ? 'Update Product' : 'Create Product'}
      </Button>
    </form>
  );
};

export default Level1ProductForm;
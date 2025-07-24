
import { useState, useEffect } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Level1Product, AssetType } from "@/types/product";
import { productDataService } from "@/services/productDataService";

interface Level1ProductFormProps {
  onSubmit: (product: Omit<Level1Product, 'id'>) => void;
  initialData?: Level1Product;
}

const Level1ProductForm = ({ onSubmit, initialData }: Level1ProductFormProps) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    assetType: initialData?.type || 'power-transformer',
    category: initialData?.category || '',
    description: initialData?.description || '',
    price: initialData?.price || 0,
    cost: initialData?.cost || 0,
    productInfoUrl: initialData?.productInfoUrl || '',
    enabled: initialData?.enabled ?? true,
    partNumber: initialData?.partNumber || '',
    image: initialData?.image || '',
    rackConfigurable: false
  });

  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadAssetTypes = async () => {
      try {
        const types = await productDataService.getAssetTypes();
        setAssetTypes(types.filter(type => type.enabled));
      } catch (error) {
        console.error('Error loading asset types:', error);
        // Fallback to sync method
        const syncTypes = productDataService.getAssetTypesSync();
        setAssetTypes(syncTypes.filter(type => type.enabled));
      } finally {
        setLoading(false);
      }
    };

    loadAssetTypes();
  }, []);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    // Transform assetType to type for backwards compatibility
    const productData = {
      ...formData,
      type: formData.assetType
    };
    delete (productData as any).assetType;
    delete (productData as any).rackConfigurable;
    onSubmit(productData);
  };

  if (loading) {
    return <div className="text-foreground">Loading asset types...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="text-foreground">Product Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-background border-border text-foreground"
            required
            placeholder="e.g., QTMS, DGA, Partial Discharge"
          />
        </div>
        <div>
          <Label htmlFor="assetType" className="text-foreground">Asset Type</Label>
          <Select 
            value={formData.assetType} 
            onValueChange={(value) => setFormData({ ...formData, assetType: value })}
          >
            <SelectTrigger className="bg-background border-border text-foreground">
              <SelectValue placeholder="Select asset type" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              {assetTypes.map((type) => (
                <SelectItem key={type.id} value={type.id} className="text-foreground">
                  {type.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="category" className="text-foreground">Category (Optional)</Label>
        <Input
          id="category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          className="bg-background border-border text-foreground"
          placeholder="e.g., Monitoring Systems, DGA Monitors"
        />
      </div>

      <div>
        <Label htmlFor="description" className="text-foreground">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="bg-background border-border text-foreground"
          required
        />
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="price" className="text-foreground">Base Price ($)</Label>
          <Input
            id="price"
            type="number"
            value={formData.price}
            onChange={(e) => setFormData({ ...formData, price: parseFloat(e.target.value) })}
            className="bg-background border-border text-foreground"
            required
          />
        </div>
        <div>
          <Label htmlFor="cost" className="text-foreground">Base Cost ($)</Label>
          <Input
            id="cost"
            type="number"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
            className="bg-background border-border text-foreground"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="partNumber" className="text-foreground">Part Number</Label>
          <Input
            id="partNumber"
            value={formData.partNumber}
            onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
            className="bg-background border-border text-foreground"
          />
        </div>
        <div>
          <Label htmlFor="productInfoUrl" className="text-foreground">Product Info URL</Label>
          <Input
            id="productInfoUrl"
            type="url"
            value={formData.productInfoUrl}
            onChange={(e) => setFormData({ ...formData, productInfoUrl: e.target.value })}
            className="bg-background border-border text-foreground"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="image" className="text-foreground">Image URL</Label>
        <Input
          id="image"
          type="url"
          value={formData.image}
          onChange={(e) => setFormData({ ...formData, image: e.target.value })}
          className="bg-background border-border text-foreground"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="rackConfigurable"
          checked={formData.rackConfigurable}
          onCheckedChange={(rackConfigurable) => setFormData({ ...formData, rackConfigurable })}
        />
        <Label htmlFor="rackConfigurable" className="text-foreground">Rack Configurable</Label>
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="enabled"
          checked={formData.enabled}
          onCheckedChange={(enabled) => setFormData({ ...formData, enabled })}
        />
        <Label htmlFor="enabled" className="text-foreground">Enabled</Label>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="submit" className="bg-primary hover:bg-primary/90">
          {initialData ? 'Update' : 'Create'} Product
        </Button>
      </div>
    </form>
  );
};

export default Level1ProductForm;

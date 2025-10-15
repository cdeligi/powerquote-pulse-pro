
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
    displayName: initialData?.displayName || '',
    description: initialData?.description || '',
    asset_type_id: initialData?.asset_type_id || '',
    productInfoUrl: initialData?.productInfoUrl || '',
    imageUrl: initialData?.image || '',
    rackConfigurable: initialData?.rackConfigurable ?? false,
    enabled: initialData?.enabled ?? true
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
    
    if (!formData.asset_type_id) {
      alert('Please select an Asset Type');
      return;
    }
    
    onSubmit({
      name: formData.name,
      displayName: formData.displayName || formData.name,
      description: formData.description,
      asset_type_id: formData.asset_type_id,
      productInfoUrl: formData.productInfoUrl,
      image: formData.imageUrl,
      enabled: formData.enabled,
      rackConfigurable: formData.rackConfigurable,
      type: formData.name,
      price: 0,
      cost: 0
    });
  };

  if (loading) {
    return <div className="text-foreground">Loading asset types...</div>;
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div>
        <Label htmlFor="name" className="text-foreground">
          Product Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          className="bg-background border-border text-foreground"
          required
          placeholder="e.g., Transformer Monitoring System, DGA Monitor"
        />
      </div>

      <div>
        <Label htmlFor="displayName" className="text-foreground">Display Name</Label>
        <Input
          id="displayName"
          value={formData.displayName}
          onChange={(e) => setFormData({ ...formData, displayName: e.target.value })}
          className="bg-background border-border text-foreground"
          placeholder="e.g., QTMS, DGA"
        />
        <p className="text-sm text-muted-foreground mt-1">
          Optional shorter name for UI display. If empty, will use full name.
        </p>
      </div>

      <div>
        <Label htmlFor="asset_type_id" className="text-foreground">
          Asset Type <span className="text-destructive">*</span>
        </Label>
        <Select
          value={formData.asset_type_id}
          onValueChange={(value) => setFormData({ ...formData, asset_type_id: value })}
          required
        >
          <SelectTrigger className="bg-background border-border text-foreground">
            <SelectValue placeholder="Select asset type" />
          </SelectTrigger>
          <SelectContent>
            {assetTypes.map((type) => (
              <SelectItem key={type.id} value={type.id}>
                {type.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </div>

      <div>
        <Label htmlFor="description" className="text-foreground">
          Description <span className="text-destructive">*</span>
        </Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="bg-background border-border text-foreground"
          rows={4}
          required
          placeholder="Detailed description of the product and its purpose"
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

      <div>
        <Label htmlFor="imageUrl" className="text-foreground">Image URL</Label>
        <Input
          id="imageUrl"
          type="url"
          value={formData.imageUrl}
          onChange={(e) => setFormData({ ...formData, imageUrl: e.target.value })}
          className="bg-background border-border text-foreground"
          placeholder="https://..."
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="rackConfigurable"
          checked={formData.rackConfigurable}
          onCheckedChange={(rackConfigurable) => setFormData({ ...formData, rackConfigurable })}
        />
        <Label htmlFor="rackConfigurable" className="text-foreground">
          Supports Rack Configuration
        </Label>
      </div>
      <p className="text-sm text-muted-foreground -mt-2 ml-14">
        Enable for products like QTMS that use chassis with slots
      </p>

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


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
    asset_type_id: initialData?.asset_type_id || '',
    category: initialData?.category || '',
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
      description: '',
      asset_type_id: formData.asset_type_id,
      category: formData.category,
      enabled: formData.enabled,
      type: formData.name, // Required by TypeScript, not sent to DB
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
        <Label htmlFor="name">
          Name <span className="text-destructive">*</span>
        </Label>
        <Input
          id="name"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
          placeholder="e.g., Transformer Monitoring System"
        />
      </div>

      <div>
        <Label htmlFor="asset_type_id">
          Asset Type <span className="text-destructive">*</span>
        </Label>
        <Select
          value={formData.asset_type_id}
          onValueChange={(value) => setFormData({ ...formData, asset_type_id: value })}
          required
        >
          <SelectTrigger>
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
        <Label htmlFor="category">Category</Label>
        <Input
          id="category"
          value={formData.category}
          onChange={(e) => setFormData({ ...formData, category: e.target.value })}
          placeholder="e.g., Monitoring Systems"
        />
      </div>

      <div className="flex items-center space-x-2">
        <Switch
          id="enabled"
          checked={formData.enabled}
          onCheckedChange={(enabled) => setFormData({ ...formData, enabled })}
        />
        <Label htmlFor="enabled">Enabled</Label>
      </div>

      <div className="flex justify-end space-x-3 pt-4">
        <Button type="submit">
          {initialData ? 'Update' : 'Create'} Product
        </Button>
      </div>
    </form>
  );
};

export default Level1ProductForm;

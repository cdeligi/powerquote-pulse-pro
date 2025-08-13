
import { useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Switch } from "@/components/ui/switch";
import { Level2Product, Level1Product } from "@/types/product";
import { useChassisTypes } from "@/hooks/useProductQueries";

interface ChassisFormProps {
  onSubmit: (chassis: Omit<Level2Product, 'id'>) => void;
  level1Products: Level1Product[];
  initialData?: Level2Product;
}

const ChassisForm = ({ onSubmit, level1Products, initialData }: ChassisFormProps) => {
  const { data: chassisTypes = [], isLoading: chassisTypesLoading } = useChassisTypes();
  
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    parentProductId: initialData?.parentProductId || '',
    chassisType: initialData?.chassisType || 'N/A',
    description: initialData?.description || '',
    price: initialData?.price || 0,
    cost: initialData?.cost || 0,
    enabled: initialData?.enabled ?? true,
    specifications: initialData?.specifications || {
      slots: 0
    },
    
    productInfoUrl: initialData?.productInfoUrl || ''
  });

  // Auto-populate slots when chassis type changes
  const handleChassisTypeChange = (value: string) => {
    const selectedChassis = chassisTypes.find(ct => ct.code === value);
    setFormData(prev => ({
      ...prev,
      chassisType: value,
      specifications: {
        ...prev.specifications,
        slots: selectedChassis?.totalSlots || (value === 'LTX' ? 14 : value === 'MTX' ? 7 : value === 'STX' ? 4 : 0)
      }
    }));
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    onSubmit(formData);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-4">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="text-foreground">Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-background border-border text-foreground"
            required
          />
        </div>
        <div>
          <Label htmlFor="parentProductId" className="text-foreground">Parent Product</Label>
          <Select
            value={formData.parentProductId}
            onValueChange={(value) => setFormData({ ...formData, parentProductId: value })}
          >
            <SelectTrigger className="bg-background border-border text-foreground">
              <SelectValue placeholder="Select parent product" />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              {level1Products.map((product) => (
                <SelectItem key={product.id} value={product.id} className="text-foreground">
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="chassisType" className="text-foreground">Chassis Type</Label>
          <Select
            value={formData.chassisType}
            onValueChange={handleChassisTypeChange}
            disabled={chassisTypesLoading}
          >
            <SelectTrigger className="bg-background border-border text-foreground">
              <SelectValue placeholder={chassisTypesLoading ? "Loading..." : "Select chassis type"} />
            </SelectTrigger>
            <SelectContent className="bg-background border-border">
              {chassisTypes
                .filter(ct => ct.enabled)
                .map(chassisType => (
                  <SelectItem key={chassisType.code} value={chassisType.code} className="text-foreground">
                    {chassisType.name} ({chassisType.totalSlots} slots)
                  </SelectItem>
                ))
              }
            </SelectContent>
          </Select>
        </div>
        <div>
          <Label htmlFor="slots" className="text-foreground">Slots</Label>
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
            className="bg-background border-border text-foreground"
          />
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label className="text-foreground">Part Number</Label>
          <div className="text-sm text-muted-foreground">
            Part numbers are managed under Products → Part Numbers.
          </div>
        </div>
        <div>
          <Label htmlFor="productInfoUrl" className="text-foreground">Product Info URL</Label>
          <Input
            id="productInfoUrl"
            value={formData.productInfoUrl}
            onChange={(e) => setFormData({ ...formData, productInfoUrl: e.target.value })}
            className="bg-background border-border text-foreground"
            placeholder="https://..."
          />
        </div>
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
          <Label htmlFor="price" className="text-foreground">Price ($)</Label>
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
          <Label htmlFor="cost" className="text-foreground">Cost ($)</Label>
          <Input
            id="cost"
            type="number"
            value={formData.cost}
            onChange={(e) => setFormData({ ...formData, cost: parseFloat(e.target.value) })}
            className="bg-background border-border text-foreground"
          />
        </div>
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
        <Button type="submit" className="bg-red-600 hover:bg-red-700">
          {initialData ? 'Update' : 'Create'} Chassis
        </Button>
      </div>
    </form>
  );
};

export default ChassisForm;

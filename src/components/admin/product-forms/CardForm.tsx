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
  console.log('CardForm: initialData:', initialData); // Add this line
  const [formData, setFormData] = useState({
    name: initialData?.name || '',
    parentProductId: initialData?.parentProductId || '',
    parent_product_id: initialData?.parent_product_id || initialData?.parentProductId || '',
    type: initialData?.type || '',
    description: initialData?.description || '',
    price: initialData?.price || 0,
    cost: initialData?.cost || 0,
    enabled: initialData?.enabled ?? true,
    has_level4: (initialData as any)?.has_level4 || false,
    specifications: initialData?.specifications || {},
    product_level: 3 as const,
    image: initialData?.image || '',
    partNumber: initialData?.partNumber || ''
  });

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    console.log('CardForm: handleSubmit triggered'); // Add this line
    const newCard: Omit<Level3Product, 'id'> = {
      name: formData.name,
      displayName: formData.name,
      parentProductId: formData.parentProductId,
      parent_product_id: formData.parent_product_id,
      type: formData.type,
      description: formData.description,
      price: Number(formData.price),
      cost: Number(formData.cost),
      enabled: formData.enabled,
      has_level4: (formData as any).has_level4,
      specifications: formData.specifications,
      product_level: 3,
      image: formData.image || undefined,
      partNumber: formData.partNumber?.trim() ? formData.partNumber.trim() : undefined
    };
    onSubmit(newCard);
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
  const selectedParent = level2Products.find(p => p.id === formData.parent_product_id);

  return (
    <form onSubmit={handleSubmit} className="space-y-4 dark:text-white">
      <div className="grid grid-cols-2 gap-4">
        <div>
          <Label htmlFor="name" className="text-foreground">Component Name</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(e) => setFormData({ ...formData, name: e.target.value })}
            className="bg-background border-input text-foreground"
            required
          />
        </div>
        <div>
          <Label htmlFor="parentProductId" className="text-foreground">Parent Product (Level 2)</Label>
            <Select 
            value={formData.parent_product_id} 
            onValueChange={(value) => {
              const parentProduct = level2Products.find(p => p.id === value);
              setFormData({ 
                ...formData, 
                parentProductId: value,
                parent_product_id: value,
                type: parentProduct?.name || ''
              });
            }}
          >
            <SelectTrigger className="bg-background border-input text-foreground">
              <SelectValue placeholder="Select parent product" className="text-foreground" />
            </SelectTrigger>
            <SelectContent className="bg-background border-input">
              {level2Products.map((product) => (
                <SelectItem 
                  key={product.id} 
                  value={product.id} 
                  className="text-foreground hover:bg-accent focus:bg-accent"
                >
                  {product.name} ({product.type})
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>

      <div>
        <Label htmlFor="type" className="text-foreground">Display Name (Auto-filled from Parent)</Label>
        <Input
          id="type"
          value={selectedParent?.name || formData.type}
          readOnly
          className="bg-muted text-foreground"
          placeholder="Select parent product first"
        />
      </div>

      <div>
        <Label htmlFor="description" className="text-foreground">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(e) => setFormData({ ...formData, description: e.target.value })}
          className="bg-background border-input text-foreground"
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
            className="bg-background border-input text-foreground"
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
            className="bg-background border-input text-foreground"
          />
        </div>
      </div>

      <div>
        <Label htmlFor="partNumber" className="text-foreground">Part Number</Label>
        <Input
          id="partNumber"
          value={formData.partNumber}
          onChange={(e) => setFormData({ ...formData, partNumber: e.target.value })}
          className="bg-background border-input text-foreground"
          placeholder="e.g., ANA-16CH-001"
        />
      </div>

      {/* Specifications Section */}
      <div className="space-y-2">
        <Label className="text-foreground">Specifications (Optional)</Label>
        <div className="text-gray-300 text-sm mb-2">
          Configure the technical specifications for this component
        </div>
        <div className="grid grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="slotRequirement" className="text-foreground text-sm">Slot Requirement</Label>
            <Input
              id="slotRequirement"
              type="number"
              value={formData.specifications?.slotRequirement || ''}
              onChange={(e) => handleSpecificationChange('slotRequirement', parseInt(e.target.value) || 0)}
              className="bg-background border-input text-foreground placeholder-gray-500"
              placeholder="e.g., 1, 2"
            />
            <p className="text-xs text-gray-400">Number of slots this card requires</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="inputs" className="text-foreground text-sm">Inputs</Label>
            <Input
              id="inputs"
              type="number"
              value={formData.specifications?.inputs || ''}
              onChange={(e) => handleSpecificationChange('inputs', parseInt(e.target.value) || 0)}
              className="bg-background border-input text-foreground placeholder-gray-500"
              placeholder="e.g., 8, 16"
            />
            <p className="text-xs text-gray-400">Number of input channels</p>
          </div>
        </div>
        <div className="grid grid-cols-2 gap-4 mt-2">
          <div className="space-y-1">
            <Label htmlFor="outputs" className="text-foreground text-sm">Outputs</Label>
            <Input
              id="outputs"
              type="number"
              value={formData.specifications?.outputs || ''}
              onChange={(e) => handleSpecificationChange('outputs', parseInt(e.target.value) || 0)}
              className="bg-background border-input text-foreground placeholder-gray-500"
              placeholder="e.g., 2, 4"
            />
            <p className="text-xs text-gray-400">Number of output channels</p>
          </div>
          <div className="space-y-1">
            <Label htmlFor="channels" className="text-foreground text-sm">Channels</Label>
            <Input
              id="channels"
              type="number"
              value={formData.specifications?.channels || ''}
              onChange={(e) => handleSpecificationChange('channels', parseInt(e.target.value) || 0)}
              className="bg-background border-input text-foreground placeholder-gray-500"
              placeholder="e.g., 1, 3, 8"
            />
            <p className="text-xs text-gray-400">Total number of channels</p>
          </div>
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

      <div className="flex items-center space-x-2">
        <Switch
          id="has-level4"
          checked={(formData as any).has_level4}
          onCheckedChange={(checked) => setFormData({ ...formData, has_level4: checked })}
        />
        <Label htmlFor="has-level4" className="text-foreground">Has Level 4 Configuration</Label>
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

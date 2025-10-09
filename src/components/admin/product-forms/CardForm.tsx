import { useMemo, useState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Switch } from "@/components/ui/switch";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue
} from "@/components/ui/select";
import { Level2Product, Level3Product } from "@/types/product";

interface CardFormProps {
  onSubmit: (product: Omit<Level3Product, "id">) => void;
  level2Products: Level2Product[];
  initialData?: Level3Product;
}

const CardForm = ({ onSubmit, level2Products, initialData }: CardFormProps) => {
  const [formData, setFormData] = useState({
    name: initialData?.name || "",
    displayName: initialData?.displayName || initialData?.name || "",
    parent_product_id: initialData?.parent_product_id || initialData?.parentProductId || "",
    type: initialData?.type || "",
    description: initialData?.description || "",
    price: initialData?.price ?? 0,
    cost: initialData?.cost ?? 0,
    enabled: initialData?.enabled ?? true,
    has_level4: (initialData as any)?.has_level4 || (initialData as any)?.requires_level4_config || false,
    partNumber: initialData?.partNumber || "",
    specifications: initialData?.specifications || {}
  });
  const [parentError, setParentError] = useState(false);

  const parentOptions = useMemo(
    () => [...level2Products].sort((a, b) => a.name.localeCompare(b.name)),
    [level2Products]
  );

  const handleNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      name: value,
      displayName:
        prev.displayName && prev.displayName !== prev.name
          ? prev.displayName
          : value,
    }));
  };

  const handleDisplayNameChange = (value: string) => {
    setFormData((prev) => ({
      ...prev,
      displayName: value,
    }));
  };

  const handleSpecificationChange = (key: string, value: number | string) => {
    setFormData((prev) => ({
      ...prev,
      specifications: {
        ...prev.specifications,
        [key]: value,
      },
    }));
  };

  const handleSubmit = (event: React.FormEvent) => {
    event.preventDefault();

    if (!formData.parent_product_id) {
      setParentError(true);
      return;
    }

    const trimmedPartNumber = formData.partNumber.trim();

    const newCard: Omit<Level3Product, "id"> = {
      name: formData.name,
      displayName: formData.displayName || formData.name,
      parent_product_id: formData.parent_product_id,
      parentProductId: formData.parent_product_id,
      description: formData.description,
      price: Number.isFinite(formData.price) ? Number(formData.price) : 0,
      cost: Number.isFinite(formData.cost) ? Number(formData.cost) : 0,
      enabled: formData.enabled,
      product_level: 3,
      has_level4: formData.has_level4,
      requires_level4_config: formData.has_level4,
      specifications: formData.specifications,
      partNumber: trimmedPartNumber ? trimmedPartNumber : undefined,
    };

    if (formData.type) {
      (newCard as any).type = formData.type;
    }

    onSubmit(newCard);
  };

  return (
    <form onSubmit={handleSubmit} className="space-y-6">
      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="name">Name *</Label>
          <Input
            id="name"
            value={formData.name}
            onChange={(event) => handleNameChange(event.target.value)}
            placeholder="e.g., Basic Relay Card"
            required
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="displayName">Display Name</Label>
          <Input
            id="displayName"
            value={formData.displayName}
            onChange={(event) => handleDisplayNameChange(event.target.value)}
            placeholder="Shown on quotes (defaults to Name)"
          />
        </div>
      </div>

      <div className="space-y-2">
        <Label htmlFor="parentProduct">Parent Product *</Label>
        <Select
          value={formData.parent_product_id}
          onValueChange={(value) => {
            setFormData((prev) => ({
              ...prev,
              parent_product_id: value,
            }));
            setParentError(false);
          }}
        >
          <SelectTrigger id="parentProduct">
            <SelectValue placeholder="Select a Level 2 product" />
          </SelectTrigger>
          <SelectContent>
            {parentOptions.map((product) => (
              <SelectItem key={product.id} value={product.id}>
                {product.displayName || product.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {parentError && (
          <p className="text-sm text-destructive">Please select a parent product.</p>
        )}
      </div>
      <div className="space-y-2">
        <Label htmlFor="partNumber">Part Number Shown on Quotes</Label>
        <Input
          id="partNumber"
          value={formData.partNumber}
          onChange={(event) => setFormData((prev) => ({ ...prev, partNumber: event.target.value }))}
          placeholder="e.g., RLY-8CH-001"
        />
        <p className="text-xs text-muted-foreground">
          Appears beside the slot in generated rack quotes.
        </p>
      </div>

      <div className="space-y-2">
        <Label htmlFor="description">Description</Label>
        <Textarea
          id="description"
          value={formData.description}
          onChange={(event) => setFormData((prev) => ({ ...prev, description: event.target.value }))}
          placeholder="Short summary of what this card does"
          rows={3}
        />
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="space-y-2">
          <Label htmlFor="price">Price</Label>
          <Input
            id="price"
            type="number"
            step="0.01"
            value={formData.price}
            onChange={(event) => setFormData((prev) => ({ ...prev, price: Number(event.target.value) }))}
            placeholder="0.00"
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cost">Cost</Label>
          <Input
            id="cost"
            type="number"
            step="0.01"
            value={formData.cost}
            onChange={(event) => setFormData((prev) => ({ ...prev, cost: Number(event.target.value) }))}
            placeholder="0.00"
          />
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
        <div className="flex items-center space-x-2">
          <Switch
            id="enabled"
            checked={formData.enabled}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, enabled: Boolean(checked) }))}
          />
          <Label htmlFor="enabled">Enabled</Label>
        </div>
        <div className="flex items-center space-x-2">
          <Switch
            id="hasLevel4"
            checked={formData.has_level4}
            onCheckedChange={(checked) => setFormData((prev) => ({ ...prev, has_level4: Boolean(checked) }))}
          />
          <Label htmlFor="hasLevel4">Has Level 4 Config</Label>
        </div>
      </div>

      <details className="rounded-lg border border-border bg-muted/40 p-4">
        <summary className="cursor-pointer text-sm font-medium text-foreground">Optional specifications</summary>
        <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1">
            <Label htmlFor="slotRequirement" className="text-sm">Slot Requirement</Label>
            <Input
              id="slotRequirement"
              type="number"
              value={formData.specifications?.slotRequirement ?? ""}
              onChange={(event) =>
                handleSpecificationChange(
                  "slotRequirement",
                  event.target.value ? Number(event.target.value) : ""
                )
              }
              placeholder="Number of slots"
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="channels" className="text-sm">Channels</Label>
            <Input
              id="channels"
              type="number"
              value={formData.specifications?.channels ?? ""}
              onChange={(event) =>
                handleSpecificationChange(
                  "channels",
                  event.target.value ? Number(event.target.value) : ""
                )
              }
              placeholder="e.g., 8"
            />
          </div>
        </div>
      </details>

      <div className="flex justify-end">
        <Button type="submit">{initialData ? "Update" : "Create"} Level 3 Product</Button>
      </div>
    </form>
  );
};

export default CardForm;

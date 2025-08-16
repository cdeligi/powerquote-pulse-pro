import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Level2Product, Level3Product } from '@/types/product';
import AccessoryList from './AccessoryList';

interface NonChassisConfiguratorProps {
  level2Product: Level2Product;
  level3Products: Level3Product[];
  codeMap: Record<string, {
    template: string;
    slot_span: number;
    is_standard?: boolean;
    standard_position?: number | null;
    designated_only?: boolean;
    designated_positions?: number[];
    outside_chassis?: boolean;
    notes?: string | null;
    exclusive_in_slots?: boolean;
    color?: string | null;
  }>;
  partNumberPrefix: string;
  selectedAccessories: Set<string>;
  onToggleAccessory: (id: string) => void;
  onAddToBOM: (customPartNumber?: string) => void;
  canOverridePartNumber?: boolean;
}

const NonChassisConfigurator = ({
  level2Product,
  level3Products,
  codeMap,
  partNumberPrefix,
  selectedAccessories,
  onToggleAccessory,
  onAddToBOM,
  canOverridePartNumber = false
}: NonChassisConfiguratorProps) => {
  const [customPartNumber, setCustomPartNumber] = useState<string>('');
  const [isOverriding, setIsOverriding] = useState<boolean>(false);

  const finalPartNumber = isOverriding && customPartNumber.trim() 
    ? customPartNumber.trim() 
    : partNumberPrefix;

  const handleAddToBOM = () => {
    onAddToBOM(isOverriding && customPartNumber.trim() ? customPartNumber.trim() : undefined);
  };

  return (
    <div className="space-y-6">
      {/* Main Product Display */}
      <Card>
        <CardHeader>
          <CardTitle className="flex items-center justify-between">
            <span>{level2Product.name}</span>
            <Badge variant="outline">Configurable Product</Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {/* Part Number Section */}
          <div className="space-y-3">
            <Label className="text-sm font-medium">Part Number</Label>
            
            {canOverridePartNumber && (
              <div className="flex items-center space-x-2 mb-2">
                <input
                  type="checkbox"
                  id="override-part-number"
                  checked={isOverriding}
                  onChange={(e) => setIsOverriding(e.target.checked)}
                  className="rounded border-input"
                />
                <Label 
                  htmlFor="override-part-number" 
                  className="text-sm text-muted-foreground cursor-pointer"
                >
                  Override part number
                </Label>
              </div>
            )}
            
            {isOverriding ? (
              <Input
                value={customPartNumber}
                onChange={(e) => setCustomPartNumber(e.target.value)}
                placeholder="Enter custom part number"
                className="font-mono"
              />
            ) : (
              <div className="px-3 py-2 bg-muted rounded-md border">
                <span className="font-mono text-sm">{partNumberPrefix}</span>
              </div>
            )}
          </div>

          {/* Product Description */}
          {level2Product.description && (
            <div className="text-sm text-muted-foreground">
              {level2Product.description}
            </div>
          )}

          {/* Add Main Product Button */}
          <Button 
            onClick={handleAddToBOM}
            className="w-full"
            size="lg"
          >
            Add {level2Product.name} to BOM
            <span className="ml-2 font-mono text-xs">
              ({finalPartNumber})
            </span>
          </Button>
        </CardContent>
      </Card>

      {/* Accessories Section */}
      <AccessoryList
        level3Products={level3Products}
        codeMap={codeMap}
        selectedAccessories={selectedAccessories}
        onToggleAccessory={onToggleAccessory}
        title="Available Add-ons"
        description="Optional accessories that can be added to this product"
      />
    </div>
  );
};

export default NonChassisConfigurator;
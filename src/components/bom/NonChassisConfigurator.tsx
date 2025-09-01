import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Level2Product, Level3Product } from '@/types/product';
import { Level4RuntimeModal } from '../level4/Level4RuntimeModal';
import { toast } from '@/components/ui/use-toast';
import AccessoryList from './AccessoryList';

interface NonChassisConfiguratorProps {
  level2Product: Level2Product;
  level3Products: Level3Product[];
  codeMap: Record<string, any>;
  partNumberPrefix: string;
  selectedAccessories: Set<string>;
  onToggleAccessory: (id: string) => void;
  onAddToBOM: (customPartNumber?: string) => void;
  canOverridePartNumber: boolean;
}

export const NonChassisConfigurator = ({
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
  const [configuringAccessory, setConfiguringAccessory] = useState<Level3Product | null>(null);
  const [configuredLevel4Accessories, setConfiguredLevel4Accessories] = useState<Set<string>>(new Set());

  const finalPartNumber = isOverriding && customPartNumber.trim() 
    ? customPartNumber.trim() 
    : partNumberPrefix;

  

  const handleLevel4Save = (data: any) => {
    if (!configuringAccessory) return;
    
    setConfiguredLevel4Accessories(prev => new Set(prev).add(configuringAccessory.id));
    onToggleAccessory(configuringAccessory.id); // Toggle the accessory to select it
    setConfiguringAccessory(null);
    
    toast({
      title: 'Configuration Saved',
      description: `${configuringAccessory.name} has been configured and added.`,
    });
  };

  const handleLevel4Cancel = () => {
    setConfiguringAccessory(null);
  };

  const handleAddToBOM = () => {
    onAddToBOM(isOverriding && customPartNumber.trim() ? customPartNumber.trim() : undefined);
  };

  // Check if all selected accessories with Level 4 have been configured
  const allLevel4Configured = Array.from(selectedAccessories).every(id => {
    const accessory = level3Products.find(p => p.id === id);
    return !accessory || !accessory.has_level4 || configuredLevel4Accessories.has(id);
  });

  // Check if part number is valid
  const isPartNumberValid = !isOverriding || (isOverriding && customPartNumber.trim() !== '');

  return (
    <div className="space-y-6">
      {/* Product Information */}
      <Card>
        <CardHeader>
          <CardTitle>{level2Product.name}</CardTitle>
          {level2Product.description && (
            <CardDescription>{level2Product.description}</CardDescription>
          )}
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="space-y-2">
            <div className="flex items-center justify-between">
              <Label htmlFor="partNumber">Part Number</Label>
              {canOverridePartNumber && (
                <div className="flex items-center space-x-2">
                  <Checkbox 
                    id="overridePN" 
                    checked={isOverriding} 
                    onCheckedChange={(checked) => setIsOverriding(!!checked)}
                  />
                  <Label htmlFor="overridePN" className="text-sm font-normal">
                    Override Part Number
                  </Label>
                </div>
              )}
            </div>
            
            {isOverriding ? (
              <div className="flex space-x-2">
                <Input
                  id="partNumber"
                  value={customPartNumber}
                  onChange={(e) => setCustomPartNumber(e.target.value)}
                  placeholder="Enter custom part number"
                  className="flex-1"
                />
                <Button 
                  variant="outline" 
                  size="sm" 
                  onClick={() => {
                    setCustomPartNumber('');
                    setIsOverriding(false);
                  }}
                >
                  Reset
                </Button>
              </div>
            ) : (
              <div className="rounded-md border border-input bg-background px-3 py-2 text-sm">
                {partNumberPrefix}
              </div>
            )}
            
            <p className="text-sm text-muted-foreground">
              {isOverriding 
                ? 'Enter a custom part number for this item.' 
                : 'This is the automatically generated part number.'}
            </p>
          </div>
        </CardContent>
      </Card>

      {/* Accessories Section */}
      <AccessoryList
        level3Products={level3Products}
        codeMap={codeMap}
        selectedAccessories={selectedAccessories}
        onToggleAccessory={(id) => {
          const accessory = level3Products.find(p => p.id === id);
          if (accessory && accessory.has_level4) {
            setConfiguringAccessory(accessory);
          } else {
            onToggleAccessory(id);
          }
        }}
        title="Available Accessories"
        description="Select optional accessories to include with this product."
      />

      {/* Add to BOM Button */}
      <div className="flex justify-end">
        <Button 
          onClick={handleAddToBOM}
          disabled={!allLevel4Configured || !isPartNumberValid}
          className="w-full sm:w-auto"
        >
          Add to BOM
          {finalPartNumber && (
            <span className="ml-2 text-xs font-mono opacity-80">
              ({finalPartNumber})
            </span>
          )}
        </Button>
      </div>

      {/* Level 4 Configuration Modal */}
      {configuringAccessory && (
        <Level4RuntimeModal
          bomItem={{
            id: `config-${configuringAccessory.id}`,
            product: {
              ...configuringAccessory, // Use the Level3Product directly
              displayName: configuringAccessory.name, // Ensure displayName is set
            },
            quantity: 1,
            enabled: true,
            partNumber: configuringAccessory.partNumber || '',
          }}
          level3ProductId={configuringAccessory.id}
          onSave={handleLevel4Save}
          onCancel={handleLevel4Cancel}
        />
      )}
    </div>
  );
};

export default NonChassisConfigurator;
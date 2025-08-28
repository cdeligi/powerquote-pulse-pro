import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Checkbox } from '@/components/ui/checkbox';
import { Level2Product, Level3Product } from '@/types/product';
import { Level4RuntimeModal } from '../level4/Level4RuntimeModal';
import { toast } from '@/components/ui/use-toast';

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

interface AccessoryWithConfig {
  id: string;
  name: string;
  description?: string;
  hasLevel4: boolean;
  level4Data?: any;
  isSelected: boolean;
  partNumber?: string;
  color?: string;
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
  const [configuringAccessory, setConfiguringAccessory] = useState<AccessoryWithConfig | null>(null);
  const [accessories, setAccessories] = useState<AccessoryWithConfig[]>([]);
  
  // Initialize accessories with Level 4 configuration status
  useEffect(() => {
    const processedAccessories = level3Products.map(accessory => {
      const config = codeMap[accessory.id] || {};
      return {
        id: accessory.id,
        name: accessory.name,
        description: accessory.description,
        hasLevel4: accessory.has_level4 || false,
        isSelected: selectedAccessories.has(accessory.id),
        partNumber: config.template ? String(config.template).replace(/\{[^}]+\}/g, '') : accessory.partNumber,
        color: config.color
      };
    });
    
    setAccessories(processedAccessories);
  }, [level3Products, selectedAccessories, codeMap]);

  const finalPartNumber = isOverriding && customPartNumber.trim() 
    ? customPartNumber.trim() 
    : partNumberPrefix;

  const handleToggleAccessory = async (accessory: AccessoryWithConfig) => {
    // If accessory has Level 4 config, open the modal first
    if (accessory.hasLevel4) {
      setConfiguringAccessory(accessory);
      return;
    }
    
    // Toggle the accessory if it doesn't have Level 4 config
    onToggleAccessory(accessory.id);
  };

  const handleLevel4Save = (data: any) => {
    if (!configuringAccessory) return;
    
    // Update the accessory with Level 4 data
    const updatedAccessories = accessories.map(acc => 
      acc.id === configuringAccessory.id 
        ? { ...acc, level4Data: data, isSelected: true }
        : acc
    );
    
    setAccessories(updatedAccessories);
    onToggleAccessory(configuringAccessory.id);
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
  const allLevel4Configured = accessories.every(acc => 
    !acc.isSelected || (acc.isSelected && !acc.hasLevel4) || acc.level4Data
  );

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
      <Card>
        <CardHeader>
          <CardTitle>Available Accessories</CardTitle>
          <CardDescription>
            Select optional accessories to include with this product.
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          {accessories.length === 0 ? (
            <p className="text-sm text-muted-foreground">No accessories available for this product.</p>
          ) : (
            <div className="space-y-3">
              {accessories.map((accessory) => (
                <div 
                  key={accessory.id} 
                  className={`flex items-center justify-between p-3 rounded-md border ${
                    accessory.isSelected 
                      ? 'bg-primary/10 border-primary' 
                      : 'border-border hover:bg-accent/50'
                  }`}
                >
                  <div className="flex items-center space-x-3">
                    <Checkbox
                      id={`accessory-${accessory.id}`}
                      checked={accessory.isSelected}
                      onCheckedChange={() => handleToggleAccessory(accessory)}
                      disabled={!accessory.isSelected && !allLevel4Configured}
                    />
                    <div>
                      <Label 
                        htmlFor={`accessory-${accessory.id}`}
                        className="flex items-center space-x-2 cursor-pointer"
                      >
                        <span>{accessory.name}</span>
                        {accessory.hasLevel4 && (
                          <Badge variant="outline" className="text-xs">
                            Requires Configuration
                          </Badge>
                        )}
                      </Label>
                      {accessory.description && (
                        <p className="text-sm text-muted-foreground">
                          {accessory.description}
                        </p>
                      )}
                    </div>
                  </div>
                  {accessory.partNumber && (
                    <span className="text-sm text-muted-foreground font-mono">
                      {accessory.partNumber}
                    </span>
                  )}
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

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
              id: configuringAccessory.id,
              name: configuringAccessory.name,
              displayName: configuringAccessory.name,
              parent_product_id: level2Product.id,
              product_level: 3,
              description: configuringAccessory.description || '',
              price: 0,
              cost: 0,
              enabled: true,
              has_level4: true,
              requires_level4_config: true,
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
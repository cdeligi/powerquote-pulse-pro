
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Level4Service } from '@/services/level4Service';
import { BOMItem, Level3Product } from '@/types/product';
import { Level4Configuration, Level4SharedOption } from '@/types/level4';

interface Level4ConfiguratorProps {
  bomItem: BOMItem;
  onSave: (configuredItem: BOMItem) => void;
  onCancel: () => void;
}

export const Level4Configurator: React.FC<Level4ConfiguratorProps> = ({ bomItem, onSave, onCancel }) => {
  const [configuration, setConfiguration] = useState<Level4Configuration | null>(null);
  const [selections, setSelections] = useState<Record<string, string>>({});
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const product = bomItem.product as Level3Product;

  useEffect(() => {
    const fetchConfig = async () => {
      setIsLoading(true);
      try {
        const config = await Level4Service.getLevel4Configuration(product.id);
        if (!config) {
          throw new Error('No Level 4 configuration found for this product.');
        }
        
        setConfiguration(config);
        
        // Initialize selections with defaults
        const initialSelections: Record<string, string> = {};
        
        // If there's a default option, use it for all fields
        if (config.default_option_id && config.shared_options) {
          const defaultOption = config.shared_options.find(opt => opt.id === config.default_option_id);
          if (defaultOption) {
            config.fields.forEach(field => {
              initialSelections[field.id] = defaultOption.value;
            });
          }
        }
        
        // Load existing selections if this item has been configured before
        if (bomItem.level4Selections) {
          Object.assign(initialSelections, bomItem.level4Selections);
        }
        
        setSelections(initialSelections);
      } catch (err) {
        setError('Failed to load configuration.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, [product.id, bomItem.level4Selections]);

  const handleSelectionChange = (fieldId: string, value: string) => {
    setSelections(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSave = () => {
    const configuredItem: BOMItem = {
      ...bomItem,
      level4Selections: selections,
      // Merge level4 selections into configuration_data for BOM persistence
      configuration: {
        ...bomItem.configuration,
        level4Selections: selections,
        level4ConfigurationName: configuration?.name
      }
    };
    onSave(configuredItem);
  };

  if (isLoading) {
    return (
      <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onCancel()}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Loading Configuration...</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p>Loading configuration...</p>
          </div>
        </DialogContent>
      </Dialog>
    );
  }

  if (error) {
    return (
      <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onCancel()}>
        <DialogContent className="sm:max-w-[525px]">
          <DialogHeader>
            <DialogTitle>Configuration Error</DialogTitle>
          </DialogHeader>
          <div className="py-4">
            <p className="text-red-500">{error}</p>
          </div>
          <DialogFooter>
            <Button onClick={onCancel}>Close</Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    );
  }

  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Configure: {product.name}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {configuration && (
            <div className="space-y-4">
              {configuration.fields.map(field => (
                <div key={field.id} className="grid grid-cols-4 items-center gap-4">
                  <Label htmlFor={field.id} className="text-right">
                    {field.label}
                  </Label>
                  <div className="col-span-3">
                    <Select
                      onValueChange={(value) => handleSelectionChange(field.id, value)}
                      value={selections[field.id] || ''}
                    >
                      <SelectTrigger id={field.id}>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {configuration.shared_options?.map(option => (
                          <SelectItem key={option.id} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
              
              {configuration.fields.length === 0 && (
                <p className="text-muted-foreground text-sm">
                  No configuration fields available. Please contact an administrator.
                </p>
              )}
            </div>
          )}
        </div>
        <DialogFooter>
          <Button variant="outline" onClick={onCancel}>Cancel</Button>
          <Button onClick={handleSave}>Save Configuration</Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

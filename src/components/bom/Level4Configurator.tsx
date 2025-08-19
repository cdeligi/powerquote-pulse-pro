import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { productDataService } from '@/services/productDataService';
import { BOMItem, Level3Product, Level4Configuration } from '@/types/product';

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
        const config = await productDataService.getLevel4Configuration(product.id);
        if (!config) {
          throw new Error('No Level 4 configuration found for this product.');
        }
        setConfiguration(config);
        // Initialize selections with defaults
        const initialSelections: Record<string, string> = {};
        config.fields.forEach(field => {
          if (field.default_option_id) {
            const defaultOption = field.dropdown_options.find(opt => opt.id === field.default_option_id);
            if (defaultOption) {
              initialSelections[field.id] = defaultOption.value;
            }
          }
        });
        setSelections(initialSelections);
      } catch (err) {
        setError('Failed to load configuration.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };
    fetchConfig();
  }, [product.id]);

  const handleSelectionChange = (fieldId: string, value: string) => {
    setSelections(prev => ({ ...prev, [fieldId]: value }));
  };

  const handleSave = () => {
    const configuredItem: BOMItem = {
      ...bomItem,
      level4Selections: selections,
    };
    onSave(configuredItem);
  };

  return (
    <Dialog open={true} onOpenChange={(isOpen) => !isOpen && onCancel()}>
      <DialogContent className="sm:max-w-[525px]">
        <DialogHeader>
          <DialogTitle>Configure: {product.name}</DialogTitle>
        </DialogHeader>
        <div className="py-4">
          {isLoading && <p>Loading configuration...</p>}
          {error && <p className="text-red-500">{error}</p>}
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
                      defaultValue={selections[field.id]}
                    >
                      <SelectTrigger id={field.id}>
                        <SelectValue placeholder="Select an option" />
                      </SelectTrigger>
                      <SelectContent>
                        {field.dropdown_options.map(option => (
                          <SelectItem key={option.id} value={option.value}>
                            {option.label}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              ))}
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

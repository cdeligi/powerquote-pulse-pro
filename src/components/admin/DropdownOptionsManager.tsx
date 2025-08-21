import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2 } from 'lucide-react';
import { productDataService } from '@/services/productDataService';
import { Level4Configuration, Level4ConfigurationField, Level4DropdownOption, Level4SharedOption } from '@/types/product';

interface DropdownOptionsManagerPropsFieldScope {
  scope?: 'field';
  field: Level4ConfigurationField;
  configuration?: never;
}

interface DropdownOptionsManagerPropsConfigScope {
  scope: 'configuration';
  configuration: Level4Configuration;
  field?: never;
}

type DropdownOptionsManagerProps = DropdownOptionsManagerPropsFieldScope | DropdownOptionsManagerPropsConfigScope;

export const DropdownOptionsManager: React.FC<DropdownOptionsManagerProps> = (props) => {
  const isConfigScope = props.scope === 'configuration';

  // Initialize options depending on scope
  const [options, setOptions] = useState<(Level4DropdownOption | Level4SharedOption)[]>(
    isConfigScope ? (props.configuration.shared_options || []) : (props.field?.dropdown_options || [])
  );

  const handleAddOption = async () => {
    if (isConfigScope) {
      const newOption = await productDataService.addSharedOption?.(props.configuration.id, {
        label: 'New Option',
        value: 'new_option',
        display_order: options.length,
      } as any);
      if (newOption) setOptions([...options, newOption]);
    } else {
      const newOptionData = {
        field_id: props.field?.id,
        label: 'New Option',
        value: 'new_option',
        display_order: options.length,
      };
      const newOption = await productDataService.addDropdownOptionToField(newOptionData);
      if (newOption) setOptions([...options, newOption]);
    }
  };

  const handleUpdateOption = async (
    optionId: string,
    updates: Partial<Level4DropdownOption & Level4SharedOption>
  ) => {
    if (isConfigScope) {
      const updated = await productDataService.updateSharedOption?.(optionId, updates as any);
      if (updated) setOptions(options.map((opt) => (opt.id === optionId ? { ...opt, ...updated } : opt)));
    } else {
      const updatedOption = await productDataService.updateDropdownOption(optionId, updates as any);
      if (updatedOption) setOptions(options.map((opt) => (opt.id === optionId ? { ...opt, ...updatedOption } : opt)));
    }
  };

  const handleDeleteOption = async (optionId: string) => {
    if (isConfigScope) {
      const success = await productDataService.deleteSharedOption?.(optionId);
      if (success) setOptions(options.filter((opt) => opt.id !== optionId));
    } else {
      const success = await productDataService.deleteDropdownOption(optionId);
      if (success) setOptions(options.filter((opt) => opt.id !== optionId));
    }
  };

  return (
    <div className="space-y-3 pt-3">
      <div className="flex justify-between items-center">
        <Label className="font-medium">
          {isConfigScope ? 'Shared Dropdown Options' : 'Dropdown Options'}
        </Label>
        <Button variant="outline" size="sm" onClick={handleAddOption}>
          <PlusCircle className="mr-2 h-4 w-4" /> Add Option
        </Button>
      </div>
      <div className="space-y-2 pl-4 border-l-2">
        {options
          .slice()
          .sort((a: any, b: any) => (a.display_order || 0) - (b.display_order || 0))
          .map((option: any) => (
            <div key={option.id} className="flex items-center gap-2">
              <Input
                value={option.label}
                onChange={(e) => handleUpdateOption(option.id, { label: e.target.value })}
                placeholder="Display Label"
                className="flex-1"
              />
              <Input
                value={option.value}
                onChange={(e) => handleUpdateOption(option.id, { value: e.target.value })}
                placeholder="Value"
                className="flex-1"
              />
              <Button variant="ghost" size="icon" onClick={() => handleDeleteOption(option.id)}>
                <Trash2 className="h-4 w-4 text-red-500" />
              </Button>
            </div>
          ))}
        {options.length === 0 && (
          <p className="text-xs text-muted-foreground text-center py-2">No options defined.</p>
        )}
      </div>
    </div>
  );
};

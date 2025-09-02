import React, { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { RadioGroup, RadioGroupItem } from '@/components/ui/radio-group';
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@/components/ui/table';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Trash2, ChevronUp, ChevronDown, Copy, Plus, Save } from 'lucide-react';
import { toast } from 'sonner';
import {
  type Level4Config,
  type DropdownOption,
  uid,
  validateConfig,
  emptyFixedConfig,
  emptyVariableConfig
} from './Level4ConfigTypes';

interface Level4ConfiguratorAdminProps {
  value: Level4Config;
  onChange: (config: Level4Config) => void;
  onSave?: (config: Level4Config) => void;
  readOnly?: boolean;
}

export default function Level4ConfiguratorAdmin({
  value,
  onChange,
  onSave,
  readOnly = false
}: Level4ConfiguratorAdminProps) {
  const [editingOption, setEditingOption] = useState<string | null>(null);

  const updateConfig = (updates: Partial<Level4Config>) => {
    const newConfig = { ...value, ...updates };
    onChange(newConfig);
  };

  const handleModeChange = (mode: 'fixed' | 'variable') => {
    if (readOnly) return;
    
    const baseConfig = mode === 'fixed' ? emptyFixedConfig() : emptyVariableConfig();
    updateConfig({
      mode,
      fixed: mode === 'fixed' ? baseConfig.fixed : undefined,
      variable: mode === 'variable' ? baseConfig.variable : undefined
    });
  };

  const addOption = () => {
    if (readOnly) return;
    
    const newOption: DropdownOption = {
      id: uid(),
      name: `Option ${value.options.length + 1}`,
      url: ''
    };
    updateConfig({
      options: [...value.options, newOption]
    });
    setEditingOption(newOption.id);
  };

  const updateOption = (id: string, updates: Partial<DropdownOption>) => {
    if (readOnly) return;
    
    updateConfig({
      options: value.options.map(opt => 
        opt.id === id ? { ...opt, ...updates } : opt
      )
    });
  };

  const removeOption = (id: string) => {
    if (readOnly) return;
    
    updateConfig({
      options: value.options.filter(opt => opt.id !== id)
    });
  };

  const duplicateOption = (id: string) => {
    if (readOnly) return;
    
    const original = value.options.find(opt => opt.id === id);
    if (!original) return;
    
    const duplicate: DropdownOption = {
      ...original,
      id: uid(),
      name: `${original.name} (Copy)`
    };
    
    const index = value.options.findIndex(opt => opt.id === id);
    const newOptions = [...value.options];
    newOptions.splice(index + 1, 0, duplicate);
    
    updateConfig({ options: newOptions });
  };

  const moveOption = (id: string, direction: 'up' | 'down') => {
    if (readOnly) return;
    
    const index = value.options.findIndex(opt => opt.id === id);
    if (index === -1) return;
    
    const newIndex = direction === 'up' ? index - 1 : index + 1;
    if (newIndex < 0 || newIndex >= value.options.length) return;
    
    const newOptions = [...value.options];
    [newOptions[index], newOptions[newIndex]] = [newOptions[newIndex], newOptions[index]];
    
    updateConfig({ options: newOptions });
  };

  const handleSave = () => {
    const errors = validateConfig(value);
    if (errors.length > 0) {
      toast.error(`Validation failed: ${errors.join(', ')}`);
      return;
    }
    
    onSave?.(value);
    toast.success('Level 4 configuration saved successfully');
  };

  return (
    <div className="space-y-6">
      {/* Mode Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Configuration Type</CardTitle>
          <CardDescription>
            Choose between Fixed (exact number) or Variable (user can add/remove) inputs
          </CardDescription>
        </CardHeader>
        <CardContent>
          <RadioGroup 
            value={value.mode} 
            onValueChange={handleModeChange}
            disabled={readOnly}
            className="grid grid-cols-2 gap-4"
          >
            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <RadioGroupItem value="fixed" id="fixed" />
              <Label htmlFor="fixed" className="font-medium">Fixed</Label>
              <span className="text-sm text-muted-foreground ml-2">
                Exact number of inputs
              </span>
            </div>
            <div className="flex items-center space-x-2 p-4 border rounded-lg">
              <RadioGroupItem value="variable" id="variable" />
              <Label htmlFor="variable" className="font-medium">Variable</Label>
              <span className="text-sm text-muted-foreground ml-2">
                Users can add/remove
              </span>
            </div>
          </RadioGroup>
        </CardContent>
      </Card>

      {/* Configuration Settings */}
      <Card>
        <CardHeader>
          <CardTitle>Settings</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label htmlFor="fieldLabel">Field Label</Label>
            <Input
              id="fieldLabel"
              value={value.fieldLabel}
              onChange={(e) => updateConfig({ fieldLabel: e.target.value })}
              placeholder="Enter label shown to users"
              disabled={readOnly}
              className="mt-1"
            />
          </div>

          {value.mode === 'fixed' && (
            <div>
              <Label htmlFor="numberOfInputs">Number of Inputs</Label>
              <Input
                id="numberOfInputs"
                type="number"
                min="1"
                value={value.fixed?.numberOfInputs || 1}
                onChange={(e) => updateConfig({
                  fixed: { numberOfInputs: parseInt(e.target.value) || 1 }
                })}
                disabled={readOnly}
                className="mt-1"
              />
            </div>
          )}

          {value.mode === 'variable' && (
            <div>
              <Label htmlFor="maxInputs">Maximum Inputs</Label>
              <Input
                id="maxInputs"
                type="number"
                min="1"
                value={value.variable?.maxInputs || 3}
                onChange={(e) => updateConfig({
                  variable: { maxInputs: parseInt(e.target.value) || 3 }
                })}
                disabled={readOnly}
                className="mt-1"
              />
            </div>
          )}
        </CardContent>
      </Card>

      {/* Options Configuration */}
      <Card>
        <CardHeader className="flex flex-row items-center justify-between">
          <div>
            <CardTitle>Dropdown Options</CardTitle>
            <CardDescription>
              Configure the options available in each dropdown
            </CardDescription>
          </div>
          {!readOnly && (
            <Button onClick={addOption} variant="outline" size="sm">
              <Plus className="h-4 w-4 mr-2" />
              Add Option
            </Button>
          )}
        </CardHeader>
        <CardContent>
          {value.options.length === 0 ? (
            <div className="text-center py-8 text-muted-foreground">
              No options configured. Add your first option to get started.
            </div>
          ) : (
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Option Name</TableHead>
                  <TableHead>View Link (URL)</TableHead>
                  <TableHead className="w-[120px]">Actions</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {value.options.map((option, index) => (
                  <TableRow key={option.id}>
                    <TableCell>
                      {editingOption === option.id ? (
                        <Input
                          value={option.name}
                          onChange={(e) => updateOption(option.id, { name: e.target.value })}
                          onBlur={() => setEditingOption(null)}
                          onKeyDown={(e) => {
                            if (e.key === 'Enter') setEditingOption(null);
                          }}
                          autoFocus
                          disabled={readOnly}
                        />
                      ) : (
                        <button
                          onClick={() => !readOnly && setEditingOption(option.id)}
                          className="text-left hover:underline disabled:hover:no-underline disabled:cursor-default"
                          disabled={readOnly}
                        >
                          {option.name}
                        </button>
                      )}
                    </TableCell>
                    <TableCell>
                      <Input
                        value={option.url}
                        onChange={(e) => updateOption(option.id, { url: e.target.value })}
                        placeholder="https://example.com/details"
                        disabled={readOnly}
                        className="text-sm"
                      />
                    </TableCell>
                    <TableCell>
                      <div className="flex items-center gap-1">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveOption(option.id, 'up')}
                          disabled={readOnly || index === 0}
                        >
                          <ChevronUp className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => moveOption(option.id, 'down')}
                          disabled={readOnly || index === value.options.length - 1}
                        >
                          <ChevronDown className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => duplicateOption(option.id)}
                          disabled={readOnly}
                        >
                          <Copy className="h-4 w-4" />
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => removeOption(option.id)}
                          disabled={readOnly}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </TableCell>
                  </TableRow>
                ))}
              </TableBody>
            </Table>
          )}
        </CardContent>
      </Card>

      {/* Save Button */}
      {onSave && !readOnly && (
        <div className="flex justify-end">
          <Button onClick={handleSave}>
            <Save className="h-4 w-4 mr-2" />
            Save Configuration
          </Button>
        </div>
      )}
    </div>
  );
}
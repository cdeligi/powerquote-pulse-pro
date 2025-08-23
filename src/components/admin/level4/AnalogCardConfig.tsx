import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Plus } from 'lucide-react';

export interface AnalogInputType {
  id: string;
  name: string;
  unit?: string;
  minValue: number;
  maxValue: number;
}

export interface AnalogInputConfig {
  id: string;
  enabled: boolean;
  selectedTypeId?: string;
  customName?: string;
}

export interface AnalogCardConfigProps {
  value: {
    inputTypes: AnalogInputType[];
    inputs: AnalogInputConfig[];
  };
  onChange: (config: {
    inputTypes: AnalogInputType[];
    inputs: AnalogInputConfig[];
  }) => void;
  title?: string;
}

export const AnalogCardConfig: React.FC<AnalogCardConfigProps> = ({ value, onChange, title }) => {
  const [localConfig, setLocalConfig] = useState(value);
  const [newType, setNewType] = useState<Omit<AnalogInputType, 'id'>>({ 
    name: '', 
    unit: '',
    minValue: 0,
    maxValue: 100
  });

  useEffect(() => setLocalConfig(value), [value]);

  const handleConfigChange = (updates: Partial<typeof localConfig>) => {
    const updated = { ...localConfig, ...updates };
    setLocalConfig(updated);
    onChange(updated);
  };

  const addInputType = () => {
    if (!newType.name) return;
    const newTypeWithId = { ...newType, id: `type-${Date.now()}` };
    handleConfigChange({ inputTypes: [...localConfig.inputTypes, newTypeWithId] });
    setNewType({ name: '', unit: '', minValue: 0, maxValue: 100 });
  };

  const removeInputType = (id: string) => {
    const updatedTypes = localConfig.inputTypes.filter(t => t.id !== id);
    const updatedInputs = localConfig.inputs.map(input => 
      input.selectedTypeId === id ? { ...input, selectedTypeId: undefined } : input
    );
    handleConfigChange({ inputTypes: updatedTypes, inputs: updatedInputs });
  };

  const updateInput = (id: string, updates: Partial<AnalogInputConfig>) => {
    const updatedInputs = localConfig.inputs.map(input => 
      input.id === id ? { ...input, ...updates } : input
    );
    handleConfigChange({ inputs: updatedInputs });
  };

  // Ensure exactly 8 inputs
  useEffect(() => {
    const currentInputs = [...localConfig.inputs];
    if (currentInputs.length < 8) {
      for (let i = currentInputs.length; i < 8; i++) {
        currentInputs.push({
          id: `analog-${i}`,
          enabled: false,
          customName: `Input ${i + 1}`
        });
      }
      handleConfigChange({ inputs: currentInputs });
    } else if (currentInputs.length > 8) {
      handleConfigChange({ inputs: currentInputs.slice(0, 8) });
    }
  }, [localConfig.inputs.length]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{title || 'Configuration'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Input Types Management */}
          <div className="space-y-4">
            <h3 className="font-medium">Analog Input Types</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {localConfig.inputTypes.map((type) => (
                <div key={type.id} className="border p-4 rounded-lg">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium">{type.name} {type.unit && `(${type.unit})`}</p>
                      <p className="text-sm text-muted-foreground">
                        Range: {type.minValue} to {type.maxValue}
                      </p>
                    </div>
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => removeInputType(type.id)}
                      className="text-red-500 hover:bg-red-50"
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </div>

            {/* Add New Type */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Add New Input Type</h4>
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
                <div className="space-y-2">
                  <Label>Name *</Label>
                  <Input
                    value={newType.name}
                    onChange={(e) => setNewType({...newType, name: e.target.value})}
                    placeholder="e.g., Temperature"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Unit</Label>
                  <Input
                    value={newType.unit}
                    onChange={(e) => setNewType({...newType, unit: e.target.value})}
                    placeholder="e.g., °C"
                  />
                </div>
                <div className="space-y-2">
                  <Label>Min</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={newType.minValue}
                    onChange={(e) => setNewType({...newType, minValue: Number(e.target.value)})}
                  />
                </div>
                <div className="space-y-2">
                  <Label>Max</Label>
                  <Input
                    type="text"
                    inputMode="numeric"
                    value={newType.maxValue}
                    onChange={(e) => setNewType({...newType, maxValue: Number(e.target.value)})}
                  />
                </div>
              </div>
              <Button 
                onClick={addInputType}
                disabled={!newType.name}
                size="sm"
              >
                <Plus className="h-4 w-4 mr-2" />
                Add Type
              </Button>
            </div>
          </div>

          {/* Inputs Configuration */}
          <div className="space-y-4">
            <h3 className="font-medium">Analog Inputs (8 total)</h3>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {localConfig.inputs.map((input, index) => (
                <div key={input.id} className="border p-4 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Input {index + 1}</h4>
                    <div className="flex items-center space-x-2">
                      <Label>Enabled</Label>
                      <Switch
                        checked={input.enabled}
                        onCheckedChange={(enabled) => updateInput(input.id, { enabled })}
                      />
                    </div>
                  </div>
                  
                  {input.enabled && (
                    <div className="space-y-4">
                      <div className="space-y-2">
                        <Label>Custom Name (Optional)</Label>
                        <Input
                          value={input.customName || ''}
                          onChange={(e) => updateInput(input.id, { customName: e.target.value })}
                          placeholder={`Input ${index + 1}`}
                        />
                      </div>
                      
                      <div className="space-y-2">
                        <Label>Input Type</Label>
                        <Select
                          value={input.selectedTypeId || ''}
                          onValueChange={(typeId) => updateInput(input.id, { selectedTypeId: typeId })}
                        >
                          <SelectTrigger>
                            <SelectValue placeholder="Select input type" />
                          </SelectTrigger>
                          <SelectContent>
                            {localConfig.inputTypes.map((type) => (
                              <SelectItem key={type.id} value={type.id}>
                                {type.name} {type.unit && `(${type.unit})`}
                              </SelectItem>
                            ))}
                          </SelectContent>
                        </Select>
                      </div>
                    </div>
                  )}
                </div>
              ))}
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default AnalogCardConfig;

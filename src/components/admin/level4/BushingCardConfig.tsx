import React, { useState, useEffect } from 'react';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Switch } from "@/components/ui/switch";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Trash2, Download } from 'lucide-react';

export interface BushingTapModel {
  id: string;
  name: string;
  partNumber: string;
  documentationUrl?: string;
}

export interface BushingInputConfig {
  id: string;
  enabled: boolean;
  selectedModelId?: string;
}

export interface BushingCardConfigProps {
  value: {
    maxInputs: number;
    bushingTapModels: BushingTapModel[];
    inputs: BushingInputConfig[];
  };
  onChange: (config: {
    maxInputs: number;
    bushingTapModels: BushingTapModel[];
    inputs: BushingInputConfig[];
  }) => void;
  title?: string;
}

export const BushingCardConfig: React.FC<BushingCardConfigProps> = ({ value, onChange, title }) => {
  const [localConfig, setLocalConfig] = useState(value);
  const [newModel, setNewModel] = useState<Omit<BushingTapModel, 'id'>>({ 
    name: '', 
    partNumber: '',
    documentationUrl: '' 
  });

  // Update local state when value prop changes
  useEffect(() => {
    setLocalConfig(value);
  }, [value]);

  // Handle configuration changes
  const handleConfigChange = (updates: Partial<typeof localConfig>) => {
    const updated = { ...localConfig, ...updates };
    setLocalConfig(updated);
    onChange(updated);
  };

  // Add a new bushing tap model
  const addBushingTapModel = () => {
    if (!newModel.name || !newModel.partNumber) return;
    
    const newModelWithId = {
      ...newModel,
      id: `model-${Date.now()}`,
    };
    
    const updatedModels = [...localConfig.bushingTapModels, newModelWithId];
    handleConfigChange({ bushingTapModels: updatedModels });
    
    // Reset form
    setNewModel({ name: '', partNumber: '', documentationUrl: '' });
  };

  // Remove a bushing tap model
  const removeBushingTapModel = (id: string) => {
    const updatedModels = localConfig.bushingTapModels.filter(model => model.id !== id);
    
    // Update inputs that were using this model
    const updatedInputs = localConfig.inputs.map(input => 
      input.selectedModelId === id ? { ...input, selectedModelId: undefined } : input
    );
    
    handleConfigChange({ 
      bushingTapModels: updatedModels,
      inputs: updatedInputs
    });
  };

  // Update bushing input configuration
  const updateBushingInput = (id: string, updates: Partial<BushingInputConfig>) => {
    const updatedInputs = localConfig.inputs.map(input => 
      input.id === id ? { ...input, ...updates } : input
    );
    handleConfigChange({ inputs: updatedInputs });
  };

  // Add or remove bushing inputs based on maxInputs
  useEffect(() => {
    const currentInputCount = localConfig.inputs.length;
    
    if (currentInputCount < localConfig.maxInputs) {
      // Add new inputs if needed
      const newInputs = [...localConfig.inputs];
      for (let i = currentInputCount; i < localConfig.maxInputs; i++) {
        newInputs.push({
          id: `input-${i}`,
          enabled: false,
          selectedModelId: undefined
        });
      }
      handleConfigChange({ inputs: newInputs });
    } else if (currentInputCount > localConfig.maxInputs) {
      // Remove extra inputs
      const newInputs = localConfig.inputs.slice(0, localConfig.maxInputs);
      handleConfigChange({ inputs: newInputs });
    }
  }, [localConfig.maxInputs]);

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>{title || 'Configuration'}</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {/* Max Inputs Configuration */}
          <div className="space-y-2">
            <Label htmlFor="maxInputs">Maximum Number of Bushing Inputs</Label>
            <Input
              id="maxInputs"
              type="text"
              inputMode="numeric"
              value={localConfig.maxInputs}
              onChange={(e) => handleConfigChange({ maxInputs: Math.min(12, Math.max(1, parseInt(e.target.value) || 1)) })}
            />
            <p className="text-sm text-muted-foreground">
              Set the maximum number of bushing inputs available (1-12)
            </p>
          </div>

          {/* Bushing Tap Models Management */}
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="font-medium">Bushing Tap Models</h3>
            </div>
            
            <div className="space-y-4">
              {localConfig.bushingTapModels.map((model) => (
                <div key={model.id} className="flex items-center space-x-4 p-3 border rounded-lg">
                  <div className="flex-1 grid grid-cols-3 gap-4">
                    <div>
                      <Label>Name</Label>
                      <p className="font-medium">{model.name}</p>
                    </div>
                    <div>
                      <Label>Part Number</Label>
                      <p>{model.partNumber}</p>
                    </div>
                    <div>
                      <Label>Documentation</Label>
                      {model.documentationUrl ? (
                        <a 
                          href={model.documentationUrl} 
                          target="_blank" 
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline flex items-center space-x-1"
                        >
                          <Download className="h-4 w-4" />
                          <span>Download</span>
                        </a>
                      ) : (
                        <p className="text-muted-foreground">No documentation</p>
                      )}
                    </div>
                  </div>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={() => removeBushingTapModel(model.id)}
                    className="text-red-500 hover:bg-red-50"
                  >
                    <Trash2 className="h-4 w-4" />
                  </Button>
                </div>
              ))}
            </div>

            {/* Add New Bushing Tap Model */}
            <div className="border-t pt-4 space-y-4">
              <h4 className="font-medium">Add New Bushing Tap Model</h4>
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div className="space-y-2">
                  <Label htmlFor="modelName">Model Name *</Label>
                  <Input
                    id="modelName"
                    value={newModel.name}
                    onChange={(e) => setNewModel({...newModel, name: e.target.value})}
                    placeholder="Enter model name"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="partNumber">Part Number *</Label>
                  <Input
                    id="partNumber"
                    value={newModel.partNumber}
                    onChange={(e) => setNewModel({...newModel, partNumber: e.target.value})}
                    placeholder="Enter part number"
                  />
                </div>
                <div className="space-y-2">
                  <Label htmlFor="documentationUrl">Documentation URL</Label>
                  <Input
                    id="documentationUrl"
                    type="text"
                    inputMode="url"
                    value={newModel.documentationUrl || ''}
                    onChange={(e) => setNewModel({...newModel, documentationUrl: e.target.value})}
                    placeholder="https://example.com/docs"
                  />
                </div>
              </div>
              <Button 
                onClick={addBushingTapModel}
                disabled={!newModel.name || !newModel.partNumber}
              >
                Add Model
              </Button>
            </div>
          </div>

          {/* Bushing Inputs Configuration */}
          <div className="space-y-4">
            <h3 className="font-medium">Bushing Inputs</h3>
            <div className="space-y-4">
              {localConfig.inputs.map((input, index) => (
                <div key={input.id} className="border p-4 rounded-lg space-y-4">
                  <div className="flex items-center justify-between">
                    <h4 className="font-medium">Bushing Input {index + 1}</h4>
                    <div className="flex items-center space-x-2">
                      <Label htmlFor={`enabled-${input.id}`}>Enabled</Label>
                      <Switch
                        id={`enabled-${input.id}`}
                        checked={input.enabled}
                        onCheckedChange={(checked) => updateBushingInput(input.id, { enabled: checked })}
                      />
                    </div>
                  </div>
                  
                  {input.enabled && (
                    <div className="space-y-2">
                      <Label>Bushing Tap Model</Label>
                      <Select
                        value={input.selectedModelId || ''}
                        onValueChange={(value) => updateBushingInput(input.id, { selectedModelId: value })}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a bushing tap model" />
                        </SelectTrigger>
                        <SelectContent>
                          {localConfig.bushingTapModels.map((model) => (
                            <SelectItem key={model.id} value={model.id}>
                              {model.name} ({model.partNumber})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      
                      {input.selectedModelId && (
                        <div className="text-sm text-muted-foreground mt-1">
                          {(() => {
                            const model = localConfig.bushingTapModels.find(m => m.id === input.selectedModelId);
                            return model?.documentationUrl ? (
                              <a 
                                href={model.documentationUrl} 
                                target="_blank" 
                                rel="noopener noreferrer"
                                className="text-blue-600 hover:underline flex items-center space-x-1"
                              >
                                <Download className="h-3 w-3" />
                                <span>Download {model.name} Documentation</span>
                              </a>
                            ) : null;
                          })()}
                        </div>
                      )}
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

export default BushingCardConfig;

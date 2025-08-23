import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Badge } from '@/components/ui/badge';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Switch } from '@/components/ui/switch';
import { Plus, Trash2, GripVertical } from 'lucide-react';
import { Level4Service } from '@/services/level4Service';
import { Level4Configuration, Level4Option, Level4TemplateType } from '@/types/level4';
import { toast } from '@/components/ui/use-toast';

interface Level4EditorProps {
  level3ProductId: string;
  level3ProductName: string;
  existingConfiguration?: Level4Configuration;
  onSave: () => void;
  onCancel: () => void;
}

export const Level4Editor: React.FC<Level4EditorProps> = ({
  level3ProductId,
  level3ProductName,
  existingConfiguration,
  onSave,
  onCancel
}) => {
  const [step, setStep] = useState<'template' | 'config' | 'options'>(
    existingConfiguration ? 'config' : 'template'
  );
  
  const [templateType, setTemplateType] = useState<Level4TemplateType>(
    existingConfiguration?.template_type || 'OPTION_1'
  );
  
  const [fieldLabel, setFieldLabel] = useState(
    existingConfiguration?.field_label || ''
  );
  
  const [infoUrl, setInfoUrl] = useState(
    existingConfiguration?.info_url || ''
  );
  
  const [maxInputs, setMaxInputs] = useState(
    existingConfiguration?.max_inputs || 3
  );
  
  const [fixedInputs, setFixedInputs] = useState(
    existingConfiguration?.fixed_inputs || 2
  );
  
  const [options, setOptions] = useState<Level4Option[]>(
    existingConfiguration?.options || []
  );
  
  const [newOption, setNewOption] = useState({ label: '', value: '' });
  const [isSaving, setIsSaving] = useState(false);
  const [configurationId, setConfigurationId] = useState(
    existingConfiguration?.id || ''
  );

  const handleTemplateSelect = (type: Level4TemplateType) => {
    setTemplateType(type);
    setStep('config');
  };

  const handleConfigNext = () => {
    if (!fieldLabel.trim()) {
      toast({
        title: "Field Required",
        description: "Please enter a field label.",
        variant: "destructive"
      });
      return;
    }

    if (templateType === 'OPTION_1' && (!maxInputs || maxInputs < 1)) {
      toast({
        title: "Invalid Max Inputs",
        description: "Max inputs must be at least 1.",
        variant: "destructive"
      });
      return;
    }

    if (templateType === 'OPTION_2' && (!fixedInputs || fixedInputs < 1)) {
      toast({
        title: "Invalid Fixed Inputs",
        description: "Fixed inputs must be at least 1.",
        variant: "destructive"
      });
      return;
    }

    setStep('options');
  };

  const handleAddOption = () => {
    if (!newOption.label.trim() || !newOption.value.trim()) {
      toast({
        title: "Invalid Option",
        description: "Please enter both label and value.",
        variant: "destructive"
      });
      return;
    }

    const option: Level4Option = {
      id: `temp-${Date.now()}`,
      level4_configuration_id: configurationId,
      label: newOption.label.trim(),
      value: newOption.value.trim(),
      display_order: options.length,
      is_default: options.length === 0 // First option is default
    };

    setOptions(prev => [...prev, option]);
    setNewOption({ label: '', value: '' });
  };

  const handleRemoveOption = (index: number) => {
    setOptions(prev => {
      const updated = prev.filter((_, i) => i !== index);
      // If we removed the default, make the first one default
      if (updated.length > 0 && !updated.some(opt => opt.is_default)) {
        updated[0].is_default = true;
      }
      return updated;
    });
  };

  const handleToggleDefault = (index: number) => {
    setOptions(prev => prev.map((opt, i) => ({
      ...opt,
      is_default: i === index
    })));
  };

  const handleSave = async () => {
    if (options.length === 0) {
      toast({
        title: "No Options",
        description: "Please add at least one option.",
        variant: "destructive"
      });
      return;
    }

    setIsSaving(true);
    try {
      // Save configuration
      const configData = {
        id: configurationId || undefined,
        level3_product_id: level3ProductId,
        template_type: templateType,
        field_label: fieldLabel,
        info_url: infoUrl || null,
        max_inputs: templateType === 'OPTION_1' ? maxInputs : null,
        fixed_inputs: templateType === 'OPTION_2' ? fixedInputs : null
      };

      const savedConfig = await Level4Service.saveLevel4Configuration(configData);
      if (!savedConfig) {
        throw new Error('Failed to save configuration');
      }

      if (!configurationId) {
        setConfigurationId(savedConfig.id);
      }

      // Save options
      for (const [index, option] of options.entries()) {
        const optionData = {
          id: option.id.startsWith('temp-') ? undefined : option.id,
          level4_configuration_id: savedConfig.id,
          label: option.label,
          value: option.value,
          display_order: index,
          is_default: option.is_default
        };

        const savedOption = await Level4Service.saveLevel4Option(optionData);
        if (!savedOption) {
          console.warn('Failed to save option:', option.label);
        }
      }

      toast({
        title: "Success",
        description: "Level 4 configuration saved successfully.",
      });

      onSave();
    } catch (error) {
      console.error('Error saving Level 4 configuration:', error);
      toast({
        title: "Error",
        description: "Failed to save configuration. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSaving(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={() => onCancel()}>
      <DialogContent className="sm:max-w-[600px] max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle>
            {existingConfiguration ? 'Edit' : 'Configure'} Level 4: {level3ProductName}
          </DialogTitle>
        </DialogHeader>

        {/* Step 1: Template Selection */}
        {step === 'template' && (
          <div className="space-y-6">
            <div className="text-center">
              <h3 className="text-lg font-semibold mb-2">Choose Template</h3>
              <p className="text-sm text-muted-foreground">
                Select how users will configure this product
              </p>
            </div>

            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary"
                onClick={() => handleTemplateSelect('OPTION_1')}
              >
                <CardHeader>
                  <CardTitle className="text-lg">Option 1</CardTitle>
                  <Badge variant="secondary">Variable Inputs</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Users can add/remove inputs up to a maximum you define. 
                    Good for flexible configurations where the number of inputs varies.
                  </p>
                </CardContent>
              </Card>

              <Card 
                className="cursor-pointer hover:shadow-md transition-shadow border-2 hover:border-primary"
                onClick={() => handleTemplateSelect('OPTION_2')}
              >
                <CardHeader>
                  <CardTitle className="text-lg">Option 2</CardTitle>
                  <Badge variant="secondary">Fixed Inputs</Badge>
                </CardHeader>
                <CardContent>
                  <p className="text-sm text-muted-foreground">
                    Users see exactly the number of inputs you specify. 
                    Good for standardized configurations with fixed requirements.
                  </p>
                </CardContent>
              </Card>
            </div>
          </div>
        )}

        {/* Step 2: Configuration */}
        {step === 'config' && (
          <div className="space-y-4">
            <div className="flex items-center gap-2 mb-4">
              <Badge>{templateType === 'OPTION_1' ? 'Option 1: Variable' : 'Option 2: Fixed'}</Badge>
              {!existingConfiguration && (
                <Button 
                  variant="ghost" 
                  size="sm" 
                  onClick={() => setStep('template')}
                >
                  Change Template
                </Button>
              )}
            </div>

            <div className="space-y-4">
              <div>
                <Label htmlFor="fieldLabel">Field Label *</Label>
                <Input
                  id="fieldLabel"
                  value={fieldLabel}
                  onChange={(e) => setFieldLabel(e.target.value)}
                  placeholder="e.g., Select model"
                />
              </div>

              <div>
                <Label htmlFor="infoUrl">Info URL (optional)</Label>
                <Input
                  id="infoUrl"
                  value={infoUrl}
                  onChange={(e) => setInfoUrl(e.target.value)}
                  placeholder="https://docs.example.com/help"
                />
              </div>

              {templateType === 'OPTION_1' && (
                <div>
                  <Label htmlFor="maxInputs">Maximum Inputs *</Label>
                  <Input
                    id="maxInputs"
                    type="number"
                    min="1"
                    max="20"
                    value={maxInputs}
                    onChange={(e) => setMaxInputs(parseInt(e.target.value) || 1)}
                  />
                </div>
              )}

              {templateType === 'OPTION_2' && (
                <div>
                  <Label htmlFor="fixedInputs">Number of Inputs *</Label>
                  <Input
                    id="fixedInputs"
                    type="number"
                    min="1"
                    max="20"
                    value={fixedInputs}
                    onChange={(e) => setFixedInputs(parseInt(e.target.value) || 1)}
                  />
                </div>
              )}
            </div>

            <div className="flex justify-between pt-4">
              <Button variant="outline" onClick={() => setStep('template')}>
                Back
              </Button>
              <Button onClick={handleConfigNext}>
                Next: Add Options
              </Button>
            </div>
          </div>
        )}

        {/* Step 3: Options */}
        {step === 'options' && (
          <div className="space-y-4">
            <div className="flex items-center justify-between">
              <div>
                <h3 className="text-lg font-semibold">Dropdown Options</h3>
                <p className="text-sm text-muted-foreground">
                  Add options that users can select from
                </p>
              </div>
              <Button variant="outline" size="sm" onClick={() => setStep('config')}>
                Back to Config
              </Button>
            </div>

            {/* Add new option */}
            <Card>
              <CardContent className="pt-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Label</Label>
                    <Input
                      value={newOption.label}
                      onChange={(e) => setNewOption(prev => ({ ...prev, label: e.target.value }))}
                      placeholder="Display name"
                    />
                  </div>
                  <div>
                    <Label>Value</Label>
                    <Input
                      value={newOption.value}
                      onChange={(e) => setNewOption(prev => ({ ...prev, value: e.target.value }))}
                      placeholder="Stored value"
                    />
                  </div>
                </div>
                <Button 
                  onClick={handleAddOption}
                  className="w-full mt-4"
                  disabled={!newOption.label.trim() || !newOption.value.trim()}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  Add Option
                </Button>
              </CardContent>
            </Card>

            {/* Options list */}
            {options.length > 0 && (
              <div className="space-y-2">
                {options.map((option, index) => (
                  <Card key={option.id} className="p-3">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <GripVertical className="h-4 w-4 text-muted-foreground" />
                        <div>
                          <div className="font-medium">{option.label}</div>
                          <div className="text-sm text-muted-foreground">{option.value}</div>
                        </div>
                        {option.is_default && (
                          <Badge variant="default">Default</Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2">
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleToggleDefault(index)}
                          disabled={option.is_default}
                        >
                          Set Default
                        </Button>
                        <Button
                          variant="ghost"
                          size="sm"
                          onClick={() => handleRemoveOption(index)}
                          disabled={options.length === 1}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </Card>
                ))}
              </div>
            )}

            {options.length === 0 && (
              <div className="text-center py-8 text-muted-foreground">
                No options added yet. Add at least one option to continue.
              </div>
            )}
          </div>
        )}

        <DialogFooter>
          <Button variant="outline" onClick={onCancel} disabled={isSaving}>
            Cancel
          </Button>
          {step === 'options' && (
            <Button onClick={handleSave} disabled={isSaving || options.length === 0}>
              {isSaving && <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white mr-2" />}
              Save Configuration
            </Button>
          )}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2 } from 'lucide-react';
import { Level4Service } from '@/services/level4Service';
import { Level3Product } from '@/types/product';
import { Level4Configuration, Level4SharedOption } from '@/types/level4';
import { supabase } from '@/integrations/supabase/client';

interface Level4ConfigEditorProps {
  product: Level3Product;
  onBack: () => void;
}

export const Level4ConfigEditor: React.FC<Level4ConfigEditorProps> = ({ product, onBack }) => {
  const [configuration, setConfiguration] = useState<Level4Configuration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [saving, setSaving] = useState<boolean>(false);
  const [newOptionLabel, setNewOptionLabel] = useState('');
  const [newOptionValue, setNewOptionValue] = useState('');

  useEffect(() => {
    const fetchConfiguration = async () => {
      setIsLoading(true);
      try {
        let config = await Level4Service.getLevel4Configuration(product.id);
        if (!config) {
          // Create a new configuration if none exists
          const { data, error } = await supabase
            .from('level4_configurations')
            .insert({
              level3_product_id: product.id,
              name: `${product.name} Configuration`,
            })
            .select()
            .single();

          if (error) throw error;

          config = {
            id: data.id,
            level3_product_id: data.level3_product_id,
            name: data.name,
            fields: [],
            shared_options: [],
            default_option_id: data.default_option_id
          };
        }
        setConfiguration(config);
      } catch (err) {
        setError('Failed to load configuration.');
        console.error(err);
      } finally {
        setIsLoading(false);
      }
    };

    fetchConfiguration();
  }, [product]);

  const handleAddField = async () => {
    if (!configuration) return;

    try {
      const { data, error } = await supabase
        .from('level4_configuration_fields')
        .insert({
          level4_configuration_id: configuration.id,
          label: 'New Field',
          field_type: 'dropdown',
          display_order: configuration.fields.length,
        })
        .select()
        .single();

      if (error) throw error;

      setConfiguration({
        ...configuration,
        fields: [...configuration.fields, data],
      });
    } catch (error) {
      console.error('Error adding field:', error);
    }
  };

  const handleUpdateField = async (fieldId: string, updates: Partial<{ label: string; info_url?: string; display_order: number; default_option_id?: string }>) => {
    if (!configuration) return;

    try {
      const { error } = await supabase
        .from('level4_configuration_fields')
        .update(updates)
        .eq('id', fieldId);

      if (error) throw error;

      setConfiguration({
        ...configuration,
        fields: configuration.fields.map((f) => (f.id === fieldId ? { ...f, ...updates } : f)),
      });
    } catch (error) {
      console.error('Error updating field:', error);
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!configuration) return;

    try {
      const { error } = await supabase
        .from('level4_configuration_fields')
        .delete()
        .eq('id', fieldId);

      if (error) throw error;

      setConfiguration({
        ...configuration,
        fields: configuration.fields.filter((f) => f.id !== fieldId),
      });
    } catch (error) {
      console.error('Error deleting field:', error);
    }
  };

  const handleAddSharedOption = async () => {
    if (!configuration || !newOptionLabel.trim() || !newOptionValue.trim()) return;

    try {
      const newOption = await Level4Service.addSharedOption(
        configuration.id,
        newOptionLabel.trim(),
        newOptionValue.trim()
      );

      if (newOption) {
        setConfiguration({
          ...configuration,
          shared_options: [...(configuration.shared_options || []), newOption],
        });
        setNewOptionLabel('');
        setNewOptionValue('');
      }
    } catch (error) {
      console.error('Error adding shared option:', error);
    }
  };

  const handleDeleteSharedOption = async (optionId: string) => {
    if (!configuration) return;

    try {
      const { error } = await supabase
        .from('level4_shared_options')
        .delete()
        .eq('id', optionId);

      if (error) throw error;

      setConfiguration({
        ...configuration,
        shared_options: configuration.shared_options?.filter(opt => opt.id !== optionId) || [],
      });
    } catch (error) {
      console.error('Error deleting shared option:', error);
    }
  };

  const handleSetDefault = async (optionId: string) => {
    if (!configuration) return;

    const success = await Level4Service.updateDefaultOption(configuration.id, optionId);
    if (success) {
      setConfiguration({
        ...configuration,
        default_option_id: optionId
      });
    }
  };

  const handleSave = async () => {
    if (!configuration) return;
    setSaving(true);
    try {
      const { error } = await supabase
        .from('level4_configurations')
        .update({
          name: configuration.name,
          default_option_id: configuration.default_option_id
        })
        .eq('id', configuration.id);

      if (error) throw error;
      
      // Show success message or navigate back
      console.log('Configuration saved successfully');
    } catch (e) {
      console.error('Save failed', e);
      setError('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  if (isLoading) return <div>Loading configuration...</div>;
  if (error) return <div className="text-red-500">{error}</div>;

  return (
    <Card>
      <CardHeader>
        <div className="flex justify-between items-center">
          <div>
            <Button variant="link" onClick={onBack} className="p-0 h-auto mb-2">
              &larr; Back to Products
            </Button>
            <CardTitle>Configure: {product.name}</CardTitle>
            <CardDescription>Define the inputs and options for this product.</CardDescription>
          </div>
          <div className="flex items-center gap-2">
            <Button onClick={handleAddField} variant="secondary">
              <PlusCircle className="mr-2 h-4 w-4" /> Add Input Field
            </Button>
            <Button onClick={handleSave} disabled={saving}>
              {saving ? 'Saving...' : 'Save'}
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {configuration && (
          <div className="space-y-6">
            <div className="space-y-1.5">
              <Label htmlFor="config-name">Configuration Name</Label>
              <Input
                id="config-name"
                value={configuration.name}
                onChange={(e) => setConfiguration({ ...configuration, name: e.target.value })}
                placeholder="Name this configuration"
              />
            </div>

            <Card className="border p-4 rounded-lg bg-slate-50/50">
              <CardHeader className="p-0 pb-4">
                <CardTitle className="text-base">Shared Options</CardTitle>
                <CardDescription className="text-sm">
                  Add dropdown options that will be available across all fields in this configuration.
                </CardDescription>
              </CardHeader>
              <CardContent className="p-0 space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <Label>Option Label</Label>
                    <Input
                      value={newOptionLabel}
                      onChange={(e) => setNewOptionLabel(e.target.value)}
                      placeholder="e.g., Standard Option"
                    />
                  </div>
                  <div>
                    <Label>Option Value</Label>
                    <Input
                      value={newOptionValue}
                      onChange={(e) => setNewOptionValue(e.target.value)}
                      placeholder="e.g., standard"
                    />
                  </div>
                </div>
                
                <Button 
                  type="button" 
                  onClick={handleAddSharedOption} 
                  className="w-full" 
                  variant="outline"
                  disabled={!newOptionLabel.trim() || !newOptionValue.trim()}
                >
                  <PlusCircle className="h-4 w-4 mr-2" />
                  Add Option
                </Button>

                {configuration.shared_options && configuration.shared_options.length > 0 && (
                  <div className="space-y-2">
                    <Label className="text-sm font-medium">Current Options:</Label>
                    {configuration.shared_options.map((option) => (
                      <div key={option.id} className="flex items-center justify-between p-3 bg-white rounded-lg border">
                        <div className="flex items-center space-x-3">
                          <span className="font-medium">{option.label}</span>
                          <span className="text-muted-foreground">({option.value})</span>
                          {configuration.default_option_id === option.id && (
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded">Default</span>
                          )}
                        </div>
                        <div className="flex items-center space-x-2">
                          {configuration.default_option_id !== option.id && (
                            <Button
                              type="button"
                              variant="ghost"
                              size="sm"
                              onClick={() => handleSetDefault(option.id)}
                            >
                              Set Default
                            </Button>
                          )}
                          <Button
                            type="button"
                            variant="ghost"
                            size="sm"
                            onClick={() => handleDeleteSharedOption(option.id)}
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>

            {configuration.fields
              .sort((a, b) => a.display_order - b.display_order)
              .map((field, index) => (
                <div key={field.id} className="border p-4 rounded-lg space-y-3 bg-slate-50/50">
                  <div className="flex justify-between items-center">
                    <Label className="font-semibold text-base">Input #{index + 1}</Label>
                    <Button variant="destructive" size="icon" onClick={() => handleDeleteField(field.id)}>
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <Label htmlFor={`label-${field.id}`}>Label</Label>
                      <Input
                        id={`label-${field.id}`}
                        value={field.label}
                        onChange={(e) => handleUpdateField(field.id, { label: e.target.value })}
                        placeholder="Enter input label"
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label htmlFor={`info_url-${field.id}`}>Item Information URL</Label>
                      <Input
                        id={`info_url-${field.id}`}
                        value={field.info_url || ''}
                        onChange={(e) => handleUpdateField(field.id, { info_url: e.target.value })}
                        placeholder="Enter item information URL"
                      />
                    </div>
                  </div>
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

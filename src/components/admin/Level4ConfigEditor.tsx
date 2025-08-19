import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { PlusCircle, Trash2 } from 'lucide-react';
import { productDataService } from '@/services/productDataService';
import { Level3Product, Level4Configuration, Level4ConfigurationField, Level4SharedOption } from '@/types/product';
import { DropdownOptionsManager } from './DropdownOptionsManager';

interface Level4ConfigEditorProps {
  product: Level3Product;
  onBack: () => void;
}

export const Level4ConfigEditor: React.FC<Level4ConfigEditorProps> = ({ product, onBack }) => {
  const [configuration, setConfiguration] = useState<Level4Configuration | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [inputCount, setInputCount] = useState<number>(0);
  const [saving, setSaving] = useState<boolean>(false);

  useEffect(() => {
    const fetchConfiguration = async () => {
      setIsLoading(true);
      try {
        let config = await productDataService.getLevel4Configuration(product.id);
        if (!config) {
          // If no config exists, create a new one
          config = await productDataService.createLevel4Configuration({
            level3_product_id: product.id,
            name: `${product.name} Configuration`,
          } as any);
        }
        setConfiguration(config);
        setInputCount(config?.fields?.length || 0);
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

    const newField: Omit<Level4ConfigurationField, 'id' | 'dropdown_options'> = {
      level4_configuration_id: configuration.id,
      label: 'New Field',
      field_type: 'dropdown', // Explicitly set the field_type
      display_order: configuration.fields.length,
    } as any;

    const createdField = await productDataService.addFieldToLevel4Config(newField);
    if (createdField) {
      setConfiguration({
        ...configuration,
        fields: [...configuration.fields, { ...createdField, dropdown_options: [] }],
      });
      setInputCount((c) => c + 1);
    }
  };

  const handleUpdateField = async (fieldId: string, updates: Partial<Level4ConfigurationField>) => {
    if (!configuration) return;

    const updatedField = await productDataService.updateLevel4ConfigField(fieldId, updates);
    if (updatedField) {
      setConfiguration({
        ...configuration,
        fields: configuration.fields.map((f) => (f.id === fieldId ? { ...f, ...updatedField } : f)),
      });
    }
  };

  const handleDeleteField = async (fieldId: string) => {
    if (!configuration) return;

    const success = await productDataService.deleteLevel4ConfigField(fieldId);
    if (success) {
      setConfiguration({
        ...configuration,
        fields: configuration.fields.filter((f) => f.id !== fieldId),
      });
      setInputCount((c) => Math.max(0, c - 1));
    }
  };

  const handleInputCountChange = async (count: number) => {
    if (!configuration) return;
    setInputCount(count);
    const ok = await productDataService.setInputCount?.(configuration.id, count);
    if (ok) {
      const refreshed = await productDataService.getLevel4Configuration(configuration.level3_product_id);
      if (refreshed) setConfiguration(refreshed);
    }
  };

  const handleSave = async () => {
    if (!configuration) return;
    setSaving(true);
    try {
      await productDataService.updateLevel4Configuration?.(configuration.id, {
        name: configuration.name,
        default_option_id: configuration.default_option_id || null,
      } as any);
    } catch (e) {
      console.error('Save failed', e);
      setError('Failed to save configuration');
    } finally {
      setSaving(false);
    }
  };

  const handleDefaultOptionChange = async (optionId: string) => {
    if (!configuration) return;
    const ok = await productDataService.setConfigDefaultOption?.(configuration.id, optionId || null);
    if (ok) {
      setConfiguration({ ...configuration, default_option_id: optionId || undefined });
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
              <PlusCircle className="mr-2 h-4 w-4" /> Add Input Line
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
            <div className="grid grid-cols-3 gap-4 items-end">
              <div className="space-y-1.5">
                <Label htmlFor="config-name">Configuration Name</Label>
                <Input
                  id="config-name"
                  value={configuration.name}
                  onChange={(e) => setConfiguration({ ...configuration, name: e.target.value })}
                  placeholder="Name this configuration"
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="input-count">Number of Inputs</Label>
                <Input
                  id="input-count"
                  type="number"
                  min={0}
                  value={inputCount}
                  onChange={(e) => handleInputCountChange(Math.max(0, Number(e.target.value || 0)))}
                />
              </div>
              <div className="space-y-1.5">
                <Label htmlFor="default-option">Preferred Option</Label>
                <select
                  id="default-option"
                  value={configuration.default_option_id || ''}
                  onChange={(e) => handleDefaultOptionChange(e.target.value || '')}
                  className="border rounded h-10 px-3"
                >
                  <option value="">None</option>
                  {(configuration.shared_options || []).map((opt: Level4SharedOption) => (
                    <option key={opt.id} value={opt.id}>{opt.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="border p-4 rounded-lg bg-slate-50/50">
              <DropdownOptionsManager scope="configuration" configuration={configuration} />
            </div>

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

                  {/* Options are shared now; legacy per-field options UI removed intentionally */}
                </div>
              ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

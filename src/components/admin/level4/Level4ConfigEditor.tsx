import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import { BushingCardConfig, BushingInputConfig, BushingTapModel } from './BushingCardConfig';
import { AnalogCardConfig, AnalogInputConfig, AnalogInputType } from './AnalogCardConfig';
import { productDataService } from '@/services/productDataService';
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";

export interface Level4ConfigEditorProps {
  productId: string;
  productType: 'bushing' | 'analog';
  onSave?: (configData: any) => void;
  onCancel?: () => void;
  name?: string;
  onNameChange?: (name: string) => void;
  onPreview?: (configData: any) => void;
  initialData?: any;
  onRequestChangeType?: () => void;
}

export const Level4ConfigEditor: React.FC<Level4ConfigEditorProps> = ({
  productId,
  productType,
  onSave,
  onCancel,
  name,
  onNameChange,
  onPreview,
  initialData,
  onRequestChangeType
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [localName, setLocalName] = useState<string>(name || 'Configuration');

  // Map internal types to display names
  const getTypeDisplayName = (type: 'bushing' | 'analog') => {
    return type === 'bushing' ? 'Option 1' : 'Option 2';
  };

  // Bushing card state
  const [bushingConfig, setBushingConfig] = useState({
    maxInputs: 6,
    bushingTapModels: [] as BushingTapModel[],
    inputs: [] as BushingInputConfig[]
  });

  // Analog card state
  const [analogConfig, setAnalogConfig] = useState({
    inputTypes: [] as AnalogInputType[],
    inputs: [] as AnalogInputConfig[]
  });

  useEffect(() => {
    // initialize from initialData if provided
    if (initialData) {
      if (productType === 'bushing') setBushingConfig(initialData);
      if (productType === 'analog') setAnalogConfig(initialData);
    }
    setIsLoading(false);
  }, [initialData, productType]);

  useEffect(() => {
    setLocalName(name || 'Configuration');
  }, [name]);

  const buildConfigPayload = () => {
    return productType === 'bushing'
      ? { type: 'bushing', ...bushingConfig }
      : { type: 'analog', ...analogConfig };
  };

  const handleSave = async () => {
    try {
      setIsSaving(true);
      const configData = buildConfigPayload();
      if (onSave) await onSave(configData);
    } catch (error) {
      console.error('Error in handleSave:', error);
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  const handlePreview = async () => {
    const configData = buildConfigPayload();
    onPreview?.(configData);
  };

  if (isLoading) return <div>Loading...</div>;

  return (
    <div>
      {/* Name editor */}
      <div className="mb-4">
        <Label>Configuration Name</Label>
        <Input
          value={localName}
          onChange={(e) => {
            setLocalName(e.target.value);
            onNameChange?.(e.target.value);
          }}
          placeholder="Configuration name"
        />
      </div>

      {/* Type header and optional change-type control */}
      <div className="flex items-center justify-between mt-6">
        <h3 className="text-xl font-semibold">Configuration</h3>
        {onRequestChangeType && (
          <Button variant="ghost" size="sm" onClick={onRequestChangeType}>
            Change Type ({getTypeDisplayName(productType)})
          </Button>
        )}
      </div>

      {/* Render only the selected type */}
      <div className="mt-4">
        {productType === 'bushing' ? (
          <BushingCardConfig 
            value={bushingConfig}
            onChange={setBushingConfig}
            title={localName || 'Configuration'}
          />
        ) : (
          <AnalogCardConfig 
            value={analogConfig}
            onChange={setAnalogConfig}
            title={localName || 'Configuration'}
          />
        )}
      </div>

      <div className="flex justify-end space-x-4 pt-6">
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
        </Button>
        <Button 
          variant="secondary"
          onClick={handlePreview}
          disabled={isSaving}
        >
          Preview
        </Button>
        <Button 
          onClick={handleSave}
          disabled={isSaving}
        >
          {isSaving ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Saving...
            </>
          ) : 'Save'}
        </Button>
      </div>
    </div>
  );
};

export default Level4ConfigEditor;

import React, { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Loader2, Save } from 'lucide-react';
import { toast } from "@/components/ui/use-toast";
import { BushingCardConfig, BushingInputConfig, BushingTapModel } from './BushingCardConfig';
import { AnalogCardConfig, AnalogInputConfig, AnalogInputType } from './AnalogCardConfig';
import { productDataService } from '@/services/productDataService';

export interface Level4ConfigEditorProps {
  productId: string;
  productType: 'bushing' | 'analog';
  onSave?: (configData: any) => void;
  onCancel?: () => void;
}

export const Level4ConfigEditor: React.FC<Level4ConfigEditorProps> = ({
  productId,
  productType,
  onSave,
  onCancel
}) => {
  const [isLoading, setIsLoading] = useState(true);
  const [isSaving, setIsSaving] = useState(false);
  const [activeTab, setActiveTab] = useState<'bushing' | 'analog'>(productType);

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

  // Load configuration when component mounts or productId changes
  useEffect(() => {
    const loadConfig = async () => {
      try {
        setIsLoading(true);
        
        // Load the product configuration
        const config = await productDataService.getLevel4Config(productId);
        
        if (productType === 'bushing') {
          setBushingConfig({
            maxInputs: config?.maxInputs || 6,
            bushingTapModels: config?.bushingTapModels || [
              { id: 'model-1', name: 'Standard Bushing', partNumber: 'BUSH-001' },
              { id: 'model-2', name: 'High-Voltage Bushing', partNumber: 'BUSH-002' },
            ],
            inputs: config?.inputs || Array(6).fill(0).map((_, i) => ({
              id: `input-${i}`,
              enabled: i < 4, // Enable first 4 by default
              selectedModelId: i < 4 ? 'model-1' : undefined
            }))
          });
        } else {
          setAnalogConfig({
            inputTypes: config?.inputTypes || [
              { id: 'type-1', name: '4-20mA', unit: 'mA', minValue: 4, maxValue: 20 },
              { id: 'type-2', name: '0-10V', unit: 'V', minValue: 0, maxValue: 10 },
              { id: 'type-3', name: 'Temperature', unit: '°C', minValue: -20, maxValue: 120 },
            ],
            inputs: config?.inputs || Array(8).fill(0).map((_, i) => ({
              id: `input-${i}`,
              enabled: i < 4, // Enable first 4 by default
              customName: `Input ${i + 1}`,
              selectedTypeId: i < 4 ? 'type-1' : undefined
            }))
          });
        }
      } catch (error) {
        console.error('Error loading configuration:', error);
        toast({
          title: "Error",
          description: "Failed to load configuration. Using default values.",
          variant: "destructive",
        });
      } finally {
        setIsLoading(false);
      }
    };

    loadConfig();
  }, [productId, productType]);

  const handleSave = async () => {
    try {
      setIsSaving(true);
      
      // Prepare the configuration data based on the active tab
      const configData = activeTab === 'bushing' 
        ? { 
            type: 'bushing',
            maxInputs: bushingConfig.maxInputs,
            bushingTapModels: bushingConfig.bushingTapModels,
            inputs: bushingConfig.inputs
          }
        : { 
            type: 'analog',
            inputTypes: analogConfig.inputTypes,
            inputs: analogConfig.inputs
          };
      
      // Call the onSave callback with the configuration data
      if (onSave) {
        await onSave(configData);
      }
      
    } catch (error) {
      console.error('Error in handleSave:', error);
      // The error will be handled by the parent component
      throw error;
    } finally {
      setIsSaving(false);
    }
  };

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin" />
        <span className="ml-2">Loading configuration...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <Tabs 
        value={activeTab} 
        onValueChange={(value) => setActiveTab(value as 'bushing' | 'analog')}
        className="w-full"
      >
        <TabsList className="grid w-full grid-cols-2 max-w-md">
          <TabsTrigger value="bushing">Bushing Card</TabsTrigger>
          <TabsTrigger value="analog">Analog Card</TabsTrigger>
        </TabsList>
        
        <TabsContent value="bushing" className="mt-6">
          <BushingCardConfig 
            value={bushingConfig}
            onChange={setBushingConfig}
          />
        </TabsContent>
        
        <TabsContent value="analog" className="mt-6">
          <AnalogCardConfig 
            value={analogConfig}
            onChange={setAnalogConfig}
          />
        </TabsContent>
      </Tabs>

      <div className="flex justify-end space-x-4 pt-6">
        <Button 
          variant="outline" 
          onClick={onCancel}
          disabled={isSaving}
        >
          Cancel
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
          ) : (
            <>
              <Save className="h-4 w-4 mr-2" />
              Save Configuration
            </>
          )}
        </Button>
      </div>
    </div>
  );
};

export default Level4ConfigEditor;

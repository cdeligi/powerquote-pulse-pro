
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Plus, Trash2, Save } from 'lucide-react';
import { Level4Product } from '@/types/product';
import { productDataService } from '@/services/productDataService';
import { toast } from 'sonner';

interface Level4ConfigEditorProps {
  productId: string;
  productType: 'analog' | 'bushing';
  onSave: (productData: Level4Product | Omit<Level4Product, 'id'>) => Promise<void>;
  onCancel: () => void;
}

export const Level4ConfigEditor: React.FC<Level4ConfigEditorProps> = ({
  productId,
  productType,
  onSave,
  onCancel
}) => {
  const [product, setProduct] = useState<Level4Product | null>(null);
  const [configJson, setConfigJson] = useState<string>('');
  const [basicInfo, setBasicInfo] = useState({
    name: '',
    description: '',
    price: 0,
    cost: 0
  });
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    loadProductData();
  }, [productId]);

  const loadProductData = async () => {
    try {
      setLoading(true);
      const products = await productDataService.getLevel4ProductsByIds([productId]);
      const productData = products[0];
      
      if (productData) {
        setProduct(productData);
        setBasicInfo({
          name: productData.name,
          description: productData.description || '',
          price: productData.price,
          cost: productData.cost
        });
        
        // Load configuration JSON
        if (productData.configuration) {
          setConfigJson(JSON.stringify(productData.configuration, null, 2));
        } else {
          // Set default configuration based on product type
          const defaultConfig = productType === 'analog' 
            ? getDefaultAnalogConfig()
            : getDefaultBushingConfig();
          setConfigJson(JSON.stringify(defaultConfig, null, 2));
        }
      }
    } catch (error) {
      console.error('Error loading product data:', error);
      toast.error('Failed to load product data');
    } finally {
      setLoading(false);
    }
  };

  const getDefaultAnalogConfig = () => ({
    channels: [
      {
        number: 1,
        name: "Channel 1",
        type: "4-20mA",
        enabled: true,
        scalingFactor: 1.0,
        offset: 0.0,
        units: "mA"
      }
    ],
    samplingRate: 1000,
    resolution: 16,
    calibration: {
      zeroOffset: 0,
      fullScaleGain: 1
    }
  });

  const getDefaultBushingConfig = () => ({
    bushings: [
      {
        id: "tap1",
        name: "H1",
        tapModel: "",
        partNumber: "",
        position: { x: 100, y: 100 },
        isSelected: false
      }
    ],
    connectionType: "wye",
    voltageLevel: "15kV",
    insulationType: "oil"
  });

  const handleSave = async () => {
    try {
      setLoading(true);
      
      // Parse and validate JSON
      let configData;
      try {
        configData = JSON.parse(configJson);
      } catch (error) {
        toast.error('Invalid JSON configuration');
        return;
      }

      // Save configuration data
      await productDataService.saveLevel4Config(productId, configData);
      
      // Update basic product info
      const updatedProduct: Level4Product = {
        ...product!,
        ...basicInfo,
        configuration: configData
      };

      await onSave(updatedProduct);
      toast.success('Configuration saved successfully');
    } catch (error) {
      console.error('Error saving configuration:', error);
      toast.error('Failed to save configuration');
    } finally {
      setLoading(false);
    }
  };

  const addBushingTap = () => {
    try {
      const config = JSON.parse(configJson);
      if (config.bushings) {
        const newTap = {
          id: `tap${config.bushings.length + 1}`,
          name: `Tap ${config.bushings.length + 1}`,
          tapModel: "",
          partNumber: "",
          position: { x: 100 + (config.bushings.length * 50), y: 100 },
          isSelected: false
        };
        config.bushings.push(newTap);
        setConfigJson(JSON.stringify(config, null, 2));
      }
    } catch (error) {
      toast.error('Invalid JSON configuration');
    }
  };

  const addAnalogChannel = () => {
    try {
      const config = JSON.parse(configJson);
      if (config.channels) {
        const newChannel = {
          number: config.channels.length + 1,
          name: `Channel ${config.channels.length + 1}`,
          type: "4-20mA",
          enabled: true,
          scalingFactor: 1.0,
          offset: 0.0,
          units: "mA"
        };
        config.channels.push(newChannel);
        setConfigJson(JSON.stringify(config, null, 2));
      }
    } catch (error) {
      toast.error('Invalid JSON configuration');
    }
  };

  if (loading) {
    return <div className="flex justify-center p-8">Loading...</div>;
  }

  return (
    <div className="space-y-6">
      <Tabs defaultValue="basic" className="w-full">
        <TabsList className="grid w-full grid-cols-2">
          <TabsTrigger value="basic">Basic Information</TabsTrigger>
          <TabsTrigger value="config">Configuration</TabsTrigger>
        </TabsList>
        
        <TabsContent value="basic" className="space-y-4">
          <Card>
            <CardHeader>
              <CardTitle>Product Information</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="name">Name</Label>
                <Input
                  id="name"
                  value={basicInfo.name}
                  onChange={(e) => setBasicInfo(prev => ({ ...prev, name: e.target.value }))}
                />
              </div>
              
              <div>
                <Label htmlFor="description">Description</Label>
                <Textarea
                  id="description"
                  value={basicInfo.description}
                  onChange={(e) => setBasicInfo(prev => ({ ...prev, description: e.target.value }))}
                  rows={3}
                />
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label htmlFor="price">Price ($)</Label>
                  <Input
                    id="price"
                    type="number"
                    step="0.01"
                    value={basicInfo.price}
                    onChange={(e) => setBasicInfo(prev => ({ ...prev, price: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
                
                <div>
                  <Label htmlFor="cost">Cost ($)</Label>
                  <Input
                    id="cost"
                    type="number"
                    step="0.01"
                    value={basicInfo.cost}
                    onChange={(e) => setBasicInfo(prev => ({ ...prev, cost: parseFloat(e.target.value) || 0 }))}
                  />
                </div>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
        
        <TabsContent value="config" className="space-y-4">
          <Card>
            <CardHeader className="flex flex-row items-center justify-between">
              <CardTitle>
                {productType === 'analog' ? 'Analog Card' : 'Bushing Card'} Configuration
              </CardTitle>
              <div className="flex gap-2">
                {productType === 'bushing' && (
                  <Button size="sm" onClick={addBushingTap}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Tap
                  </Button>
                )}
                {productType === 'analog' && (
                  <Button size="sm" onClick={addAnalogChannel}>
                    <Plus className="h-4 w-4 mr-1" />
                    Add Channel
                  </Button>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div>
                <Label htmlFor="configJson">Configuration JSON</Label>
                <ScrollArea className="h-[400px] w-full border rounded">
                  <Textarea
                    id="configJson"
                    value={configJson}
                    onChange={(e) => setConfigJson(e.target.value)}
                    className="min-h-[380px] font-mono text-sm resize-none border-0"
                    placeholder="Enter configuration JSON..."
                  />
                </ScrollArea>
              </div>
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      <div className="flex justify-end gap-2">
        <Button variant="outline" onClick={onCancel}>
          Cancel
        </Button>
        <Button onClick={handleSave} disabled={loading}>
          <Save className="h-4 w-4 mr-1" />
          {loading ? 'Saving...' : 'Save Configuration'}
        </Button>
      </div>
    </div>
  );
};

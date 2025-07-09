import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { 
  Plus, 
  Save, 
  Trash2, 
  Edit, 
  Grid, 
  Square, 
  Settings,
  Eye,
  MousePointer
} from 'lucide-react';

interface ChassisSlot {
  id: string;
  x: number;
  y: number;
  width: number;
  height: number;
  label: string;
  slotType: string;
  linkedLevel3Product?: string;
}

interface ChassisConfiguration {
  id: string;
  name: string;
  description: string;
  width: number;
  height: number;
  slots: ChassisSlot[];
  level2ProductId: string;
}

interface Level2Product {
  id: string;
  name: string;
  description: string;
}

interface Level3Product {
  id: string;
  name: string;
  description: string;
  subcategory: string;
}

const ChassisConfigurationManager = () => {
  const { toast } = useToast();
  const [configurations, setConfigurations] = useState<ChassisConfiguration[]>([]);
  const [level2Products, setLevel2Products] = useState<Level2Product[]>([]);
  const [level3Products, setLevel3Products] = useState<Level3Product[]>([]);
  const [selectedConfig, setSelectedConfig] = useState<ChassisConfiguration | null>(null);
  const [isEditing, setIsEditing] = useState(false);
  const [showSlotEditor, setShowSlotEditor] = useState(false);
  const [selectedSlot, setSelectedSlot] = useState<ChassisSlot | null>(null);

  const [newConfig, setNewConfig] = useState({
    name: '',
    description: '',
    width: 400,
    height: 200,
    level2ProductId: ''
  });

  const [newSlot, setNewSlot] = useState({
    x: 10,
    y: 10,
    width: 60,
    height: 40,
    label: '',
    slotType: 'card',
    linkedLevel3Product: ''
  });

  useEffect(() => {
    loadData();
  }, []);

  const loadData = async () => {
    try {
      // Load Level 2 products
      const { data: l2Products, error: l2Error } = await supabase
        .from('products')
        .select('id, name, description')
        .eq('category', 'Level2')
        .eq('is_active', true);

      if (l2Error) throw l2Error;

      // Load Level 3 products
      const { data: l3Products, error: l3Error } = await supabase
        .from('products')
        .select('id, name, description, subcategory')
        .eq('category', 'Level3')
        .eq('is_active', true);

      if (l3Error) throw l3Error;

      setLevel2Products(l2Products || []);
      setLevel3Products(l3Products || []);

      // Load existing chassis configurations from app_settings
      const { data: configs, error: configError } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'chassis_configurations');

      if (configError && configError.code !== 'PGRST116') {
        throw configError;
      }

      if (configs && configs.length > 0) {
        setConfigurations(configs[0].value as ChassisConfiguration[] || []);
      }

    } catch (error) {
      console.error('Error loading data:', error);
      toast({
        title: "Error",
        description: "Failed to load chassis configuration data",
        variant: "destructive"
      });
    }
  };

  const saveConfigurations = async (updatedConfigurations: ChassisConfiguration[]) => {
    try {
      const { error } = await supabase
        .from('app_settings')
        .upsert({
          key: 'chassis_configurations',
          value: updatedConfigurations,
          description: 'Chassis slot configurations for Level 2 products'
        });

      if (error) throw error;

      setConfigurations(updatedConfigurations);
      toast({
        title: "Success",
        description: "Chassis configurations saved successfully"
      });
    } catch (error) {
      console.error('Error saving configurations:', error);
      toast({
        title: "Error",
        description: "Failed to save chassis configurations",
        variant: "destructive"
      });
    }
  };

  const handleCreateConfiguration = () => {
    if (!newConfig.name || !newConfig.level2ProductId) {
      toast({
        title: "Error",
        description: "Please fill in all required fields",
        variant: "destructive"
      });
      return;
    }

    const configuration: ChassisConfiguration = {
      id: `chassis-${Date.now()}`,
      name: newConfig.name,
      description: newConfig.description,
      width: newConfig.width,
      height: newConfig.height,
      level2ProductId: newConfig.level2ProductId,
      slots: []
    };

    const updatedConfigurations = [...configurations, configuration];
    saveConfigurations(updatedConfigurations);

    setNewConfig({
      name: '',
      description: '',
      width: 400,
      height: 200,
      level2ProductId: ''
    });
  };

  const handleAddSlot = () => {
    if (!selectedConfig || !newSlot.label) {
      toast({
        title: "Error",
        description: "Please provide a slot label",
        variant: "destructive"
      });
      return;
    }

    const slot: ChassisSlot = {
      id: `slot-${Date.now()}`,
      x: newSlot.x,
      y: newSlot.y,
      width: newSlot.width,
      height: newSlot.height,
      label: newSlot.label,
      slotType: newSlot.slotType,
      linkedLevel3Product: newSlot.linkedLevel3Product
    };

    const updatedConfig = {
      ...selectedConfig,
      slots: [...selectedConfig.slots, slot]
    };

    const updatedConfigurations = configurations.map(config =>
      config.id === selectedConfig.id ? updatedConfig : config
    );

    saveConfigurations(updatedConfigurations);
    setSelectedConfig(updatedConfig);

    setNewSlot({
      x: 10,
      y: 10,
      width: 60,
      height: 40,
      label: '',
      slotType: 'card',
      linkedLevel3Product: ''
    });
    setShowSlotEditor(false);
  };

  const handleDeleteSlot = (slotId: string) => {
    if (!selectedConfig) return;

    const updatedConfig = {
      ...selectedConfig,
      slots: selectedConfig.slots.filter(slot => slot.id !== slotId)
    };

    const updatedConfigurations = configurations.map(config =>
      config.id === selectedConfig.id ? updatedConfig : config
    );

    saveConfigurations(updatedConfigurations);
    setSelectedConfig(updatedConfig);
  };

  const handleDeleteConfiguration = (configId: string) => {
    if (!confirm('Are you sure you want to delete this chassis configuration?')) return;

    const updatedConfigurations = configurations.filter(config => config.id !== configId);
    saveConfigurations(updatedConfigurations);

    if (selectedConfig?.id === configId) {
      setSelectedConfig(null);
    }
  };

  const ChassisVisualizer = ({ config }: { config: ChassisConfiguration }) => {
    return (
      <div className="border border-border rounded-lg p-4 bg-card">
        <div className="mb-4">
          <h4 className="font-semibold text-foreground">{config.name}</h4>
          <p className="text-sm text-muted-foreground">{config.description}</p>
        </div>
        
        <div 
          className="relative border-2 border-primary rounded bg-muted/20"
          style={{
            width: config.width,
            height: config.height,
            margin: '0 auto'
          }}
        >
          {/* 6U Rack Guidelines */}
          <div className="absolute inset-0 opacity-20">
            {Array.from({ length: 6 }).map((_, i) => (
              <div
                key={i}
                className="absolute border-t border-muted-foreground"
                style={{
                  top: `${(i + 1) * (config.height / 6)}px`,
                  left: 0,
                  right: 0
                }}
              />
            ))}
          </div>

          {/* Slots */}
          {config.slots.map((slot) => (
            <div
              key={slot.id}
              className="absolute border border-primary/60 bg-primary/10 hover:bg-primary/20 transition-colors cursor-pointer rounded"
              style={{
                left: slot.x,
                top: slot.y,
                width: slot.width,
                height: slot.height
              }}
              onClick={() => setSelectedSlot(slot)}
            >
              <div className="absolute inset-0 flex items-center justify-center">
                <span className="text-xs font-medium text-primary truncate px-1">
                  {slot.label}
                </span>
              </div>
              
              {/* Slot actions */}
              <div className="absolute -top-6 -right-1 opacity-0 hover:opacity-100 transition-opacity">
                <Button
                  size="sm"
                  variant="outline"
                  className="h-6 w-6 p-0"
                  onClick={(e) => {
                    e.stopPropagation();
                    handleDeleteSlot(slot.id);
                  }}
                >
                  <Trash2 className="h-3 w-3" />
                </Button>
              </div>
            </div>
          ))}

          {/* Grid overlay for easier positioning */}
          <div className="absolute inset-0 opacity-10 pointer-events-none">
            <svg width="100%" height="100%">
              <defs>
                <pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse">
                  <path d="M 20 0 L 0 0 0 20" fill="none" stroke="currentColor" strokeWidth="1"/>
                </pattern>
              </defs>
              <rect width="100%" height="100%" fill="url(#grid)" />
            </svg>
          </div>
        </div>

        {/* Slot Details */}
        {selectedSlot && (
          <div className="mt-4 p-3 border border-border rounded bg-muted/50">
            <h5 className="font-semibold mb-2">Slot: {selectedSlot.label}</h5>
            <div className="grid grid-cols-2 gap-2 text-sm">
              <div>Position: ({selectedSlot.x}, {selectedSlot.y})</div>
              <div>Size: {selectedSlot.width} × {selectedSlot.height}</div>
              <div>Type: {selectedSlot.slotType}</div>
              {selectedSlot.linkedLevel3Product && (
                <div>
                  Linked: {level3Products.find(p => p.id === selectedSlot.linkedLevel3Product)?.name}
                </div>
              )}
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className="space-y-6 p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-foreground">Chassis Configuration Manager</h2>
          <p className="text-muted-foreground">
            Create visual representations of chassis with configurable slots for Level 3 products
          </p>
        </div>
      </div>

      <div className="grid grid-cols-1 xl:grid-cols-2 gap-6">
        {/* Configuration List & Creator */}
        <div className="space-y-6">
          {/* Create New Configuration */}
          <Card className="card-modern">
            <CardHeader>
              <CardTitle>Create New Chassis Configuration</CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Configuration Name *</Label>
                  <Input
                    value={newConfig.name}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, name: e.target.value }))}
                    placeholder="LTX Chassis Configuration"
                  />
                </div>
                <div>
                  <Label>Level 2 Product *</Label>
                  <Select
                    value={newConfig.level2ProductId}
                    onValueChange={(value) => setNewConfig(prev => ({ ...prev, level2ProductId: value }))}
                  >
                    <SelectTrigger>
                      <SelectValue placeholder="Select chassis product" />
                    </SelectTrigger>
                    <SelectContent>
                      {level2Products.map((product) => (
                        <SelectItem key={product.id} value={product.id}>
                          {product.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              <div>
                <Label>Description</Label>
                <Textarea
                  value={newConfig.description}
                  onChange={(e) => setNewConfig(prev => ({ ...prev, description: e.target.value }))}
                  placeholder="Describe the chassis layout and purpose"
                />
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label>Canvas Width (px)</Label>
                  <Input
                    type="number"
                    value={newConfig.width}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, width: parseInt(e.target.value) || 400 }))}
                  />
                </div>
                <div>
                  <Label>Canvas Height (px)</Label>
                  <Input
                    type="number"
                    value={newConfig.height}
                    onChange={(e) => setNewConfig(prev => ({ ...prev, height: parseInt(e.target.value) || 200 }))}
                  />
                </div>
              </div>

              <Button onClick={handleCreateConfiguration} className="w-full">
                <Plus className="h-4 w-4 mr-2" />
                Create Configuration
              </Button>
            </CardContent>
          </Card>

          {/* Existing Configurations */}
          <Card className="card-modern">
            <CardHeader>
              <CardTitle>Existing Configurations</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {configurations.map((config) => (
                  <div
                    key={config.id}
                    className={`p-3 border rounded-lg cursor-pointer transition-colors ${
                      selectedConfig?.id === config.id
                        ? 'border-primary bg-primary/10'
                        : 'border-border hover:border-primary/50'
                    }`}
                    onClick={() => setSelectedConfig(config)}
                  >
                    <div className="flex items-center justify-between">
                      <div>
                        <h4 className="font-semibold">{config.name}</h4>
                        <p className="text-sm text-muted-foreground">
                          {level2Products.find(p => p.id === config.level2ProductId)?.name}
                        </p>
                        <p className="text-xs text-muted-foreground">
                          {config.slots.length} slots configured
                        </p>
                      </div>
                      <div className="flex gap-2">
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            setSelectedConfig(config);
                          }}
                        >
                          <Eye className="h-4 w-4" />
                        </Button>
                        <Button
                          size="sm"
                          variant="outline"
                          onClick={(e) => {
                            e.stopPropagation();
                            handleDeleteConfiguration(config.id);
                          }}
                        >
                          <Trash2 className="h-4 w-4" />
                        </Button>
                      </div>
                    </div>
                  </div>
                ))}
                 
                {configurations.length === 0 && (
                  <div className="text-center py-8 text-muted-foreground">
                    No chassis configurations created yet
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        </div>

        {/* Configuration Editor */}
        <div className="space-y-6">
          {selectedConfig ? (
            <>
              {/* Chassis Visualizer */}
              <Card className="card-modern">
                <CardHeader>
                  <CardTitle className="flex items-center justify-between">
                    Chassis Layout: {selectedConfig.name}
                    <Button
                      onClick={() => setShowSlotEditor(true)}
                      size="sm"
                    >
                      <Plus className="h-4 w-4 mr-2" />
                      Add Slot
                    </Button>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChassisVisualizer config={selectedConfig} />
                </CardContent>
              </Card>

              {/* Slot Editor */}
              {showSlotEditor && (
                <Card className="card-modern">
                  <CardHeader>
                    <CardTitle>Add New Slot</CardTitle>
                  </CardHeader>
                  <CardContent className="space-y-4">
                    <div className="grid grid-cols-2 gap-4">
                      <div>
                        <Label>Slot Label *</Label>
                        <Input
                          value={newSlot.label}
                          onChange={(e) => setNewSlot(prev => ({ ...prev, label: e.target.value }))}
                          placeholder="Slot 1"
                        />
                      </div>
                      <div>
                        <Label>Slot Type</Label>
                        <Select
                          value={newSlot.slotType}
                          onValueChange={(value) => setNewSlot(prev => ({ ...prev, slotType: value }))}
                        >
                          <SelectTrigger>
                            <SelectValue />
                          </SelectTrigger>
                          <SelectContent>
                            <SelectItem value="card">Card Slot</SelectItem>
                            <SelectItem value="power">Power Module</SelectItem>
                            <SelectItem value="io">I/O Module</SelectItem>
                            <SelectItem value="cpu">CPU Module</SelectItem>
                          </SelectContent>
                        </Select>
                      </div>
                    </div>

                    <div className="grid grid-cols-4 gap-4">
                      <div>
                        <Label>X Position</Label>
                        <Input
                          type="number"
                          value={newSlot.x}
                          onChange={(e) => setNewSlot(prev => ({ ...prev, x: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label>Y Position</Label>
                        <Input
                          type="number"
                          value={newSlot.y}
                          onChange={(e) => setNewSlot(prev => ({ ...prev, y: parseInt(e.target.value) || 0 }))}
                        />
                      </div>
                      <div>
                        <Label>Width</Label>
                        <Input
                          type="number"
                          value={newSlot.width}
                          onChange={(e) => setNewSlot(prev => ({ ...prev, width: parseInt(e.target.value) || 60 }))}
                        />
                      </div>
                      <div>
                        <Label>Height</Label>
                        <Input
                          type="number"
                          value={newSlot.height}
                          onChange={(e) => setNewSlot(prev => ({ ...prev, height: parseInt(e.target.value) || 40 }))}
                        />
                      </div>
                    </div>

                    <div>
                      <Label>Link to Level 3 Product (Optional)</Label>
                      <Select
                        value={newSlot.linkedLevel3Product}
                        onValueChange={(value) => setNewSlot(prev => ({ ...prev, linkedLevel3Product: value }))}
                      >
                        <SelectTrigger>
                          <SelectValue placeholder="Select a Level 3 product to link" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">No link</SelectItem>
                          {level3Products.map((product) => (
                            <SelectItem key={product.id} value={product.id}>
                              {product.name} ({product.subcategory})
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>

                    <div className="flex gap-2">
                      <Button onClick={handleAddSlot} className="flex-1">
                        <Save className="h-4 w-4 mr-2" />
                        Add Slot
                      </Button>
                      <Button
                        variant="outline"
                        onClick={() => setShowSlotEditor(false)}
                      >
                        Cancel
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              )}
            </>
          ) : (
            <Card className="card-modern">
              <CardContent className="py-12 text-center">
                <Grid className="h-12 w-12 mx-auto text-muted-foreground mb-4" />
                <h3 className="text-lg font-semibold text-foreground mb-2">
                  Select a Configuration
                </h3>
                <p className="text-muted-foreground">
                  Choose a chassis configuration from the list to view and edit its layout
                </p>
              </CardContent>
            </Card>
          )}
        </div>
      </div>
    </div>
  );
};

export default ChassisConfigurationManager;

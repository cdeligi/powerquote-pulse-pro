import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { v4 as uuidv4 } from 'uuid';

import { ProductDataService, productDataService } from '@/services/productDataService';
import { Level1Product, Level2Product, Level3Product, Chassis, BOMItem } from '@/types/product';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Plus, Save, X } from 'lucide-react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { useBOM } from '@/context/BOMContext';
import { BOMItemCard } from './BOMItemCard';
import { arrayMove } from '@dnd-kit/sortable';
import {
  DndContext,
  DragEndEvent,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
} from '@dnd-kit/core';
import {
  SortableContext,
  verticalListSortingStrategy,
} from '@dnd-kit/sortable';
import { SortableItem } from './SortableItem';
import { AnalogConfigurationDialog } from '../configuration/AnalogConfigurationDialog';
import { BushingConfigurationDialog } from '../configuration/BushingConfigurationDialog';

interface ConfigurationState {
  isOpen: boolean;
  type: 'analog' | 'bushing' | null;
  slotNumber: number;
  productId: string;
  productName: string;
}

const BOMBuilder: React.FC = () => {
  const [level1Products, setLevel1Products] = useState<Level1Product[]>([]);
  const [level2Products, setLevel2Products] = useState<Level2Product[]>([]);
  const [level3Products, setLevel3Products] = useState<Level3Product[]>([]);
  const [chassisOptions, setChassisOptions] = useState<Chassis[]>([]);
  const [selectedLevel1, setSelectedLevel1] = useState<string>('');
  const [selectedLevel2, setSelectedLevel2] = useState<string>('');
  const [selectedLevel3, setSelectedLevel3] = useState<string>('');
  const [selectedChassis, setSelectedChassis] = useState<Chassis | null>(null);
  const [quantity, setQuantity] = useState<number>(1);
  const [isAddingChassis, setIsAddingChassis] = useState<boolean>(false);
  const [newChassis, setNewChassis] = useState<{ name: string; description: string }>({
    name: '',
    description: '',
  });
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [isBOMDirty, setIsBOMDirty] = useState<boolean>(false);
  const [configurationState, setConfigurationState] = useState<ConfigurationState>({
    isOpen: false,
    type: null,
    slotNumber: 0,
    productId: '',
    productName: ''
  });
  const { bom, setBom } = useBOM();

  const sensor = useSensor(PointerSensor);
  const sensors = useSensors(
    useSensor(PointerSensor),
    useSensor(KeyboardSensor, {
      coordinateGetter: 'horizontal',
    })
  );

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (bom) {
      setBomItems(bom.items);
    }
  }, [bom]);

  const loadData = async () => {
    try {
      const [level1Data, level2Data, level3Data, chassisData] = await Promise.all([
        productDataService.getLevel1Products(),
        productDataService.getLevel2Products(),
        productDataService.getLevel3Products(),
        productDataService.getChassisOptions(),
      ]);
      setLevel1Products(level1Data);
      setLevel2Products(level2Data);
      setLevel3Products(level3Data);
      setChassisOptions(chassisData);
    } catch (error) {
      console.error('Error loading data:', error);
      toast.error('Failed to load product data');
    }
  };

  const filteredLevel2Products = selectedLevel1
    ? level2Products.filter((product) => product.parentProductId === selectedLevel1)
    : level2Products;

  const filteredLevel3Products = selectedLevel2
    ? level3Products.filter((product) => product.parentProductId === selectedLevel2)
    : level3Products;

  const handleAddChassis = async () => {
    if (!newChassis.name.trim()) {
      toast.error('Please enter a chassis name');
      return;
    }

    try {
      const savedChassis = await productDataService.saveChassis({
        ...newChassis,
        slots: 10, // Default slots
        enabled: true,
      });
      setChassisOptions([...chassisOptions, savedChassis]);
      setSelectedChassis(savedChassis);
      setIsAddingChassis(false);
      setNewChassis({ name: '', description: '' });
      toast.success('Chassis added successfully');
    } catch (error) {
      console.error('Error adding chassis:', error);
      toast.error('Failed to add chassis');
    }
  };

  const addCardToSlot = async (chassis: Chassis, card: Level3Product, slotNumber: number) => {
    if (!chassis || !card) {
      toast.error('Please select a chassis and a card');
      return;
    }

    const existingItemIndex = bomItems.findIndex(
      (item) => item.product.id === card.id && item.chassisId === chassis.id && item.slotNumber === slotNumber
    );

    if (existingItemIndex !== -1) {
      // If the item already exists in the BOM, update the quantity
      const updatedItems = [...bomItems];
      updatedItems[existingItemIndex].quantity += quantity;
      setBomItems(updatedItems);
      setIsBOMDirty(true);
      toast.success('Card quantity updated in BOM');
    } else {
      // If the item doesn't exist, add it to the BOM
      const newBomItem: BOMItem = {
        id: uuidv4(),
        product: card,
        quantity,
        chassisId: chassis.id,
        slotNumber: slotNumber,
        configuration: null, // No config yet
      };
      setBomItems([...bomItems, newBomItem]);
      setIsBOMDirty(true);
      toast.success('Card added to BOM');
    }

    setQuantity(1); // Reset quantity after adding
  };

  const handleCardSelect = async (card: Level3Product, slotNumber: number) => {
    console.log('Card selected:', card, 'for slot:', slotNumber);
    
    // Check if this card type has Level 4 configurations
    const level4Products = await productDataService.getLevel4ProductsByIds([card.id]);
    console.log('Level 4 products for card:', level4Products);
    
    // Determine if we need to show a configurator based on the card's configuration type
    const hasLevel4Configs = level4Products.length > 0;
    let needsConfigurator = false;
    let configuratorType: 'analog' | 'bushing' | null = null;

    if (hasLevel4Configs) {
      // Use the configuration type from the Level 4 product to determine configurator
      const configType = level4Products[0]?.configurationType;
      if (configType === 'analog') {
        needsConfigurator = true;
        configuratorType = 'analog';
      } else if (configType === 'bushing') {
        needsConfigurator = true;
        configuratorType = 'bushing';
      }
    }

    console.log('Needs configurator:', needsConfigurator, 'Type:', configuratorType);

    if (needsConfigurator && configuratorType) {
      if (configuratorType === 'analog') {
        setConfigurationState({
          isOpen: true,
          type: 'analog',
          slotNumber,
          productId: card.id,
          productName: card.name
        });
      } else if (configuratorType === 'bushing') {
        setConfigurationState({
          isOpen: true,
          type: 'bushing',
          slotNumber,
          productId: card.id,
          productName: card.name
        });
      }
    } else {
      // For regular cards without Level 4 configuration, add them directly
      if (selectedChassis) {
        await addCardToSlot(selectedChassis, card, slotNumber);
      }
    }
  };

  const handleSaveBOM = () => {
    if (!bom) {
      toast.error('No BOM context available');
      return;
    }

    setBom({ ...bom, items: bomItems });
    setIsBOMDirty(false);
    toast.success('BOM saved successfully');
  };

  const handleRemoveItem = (itemId: string) => {
    const updatedItems = bomItems.filter((item) => item.id !== itemId);
    setBomItems(updatedItems);
    setIsBOMDirty(true);
  };

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    const updatedItems = bomItems.map((item) =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    );
    setBomItems(updatedItems);
    setIsBOMDirty(true);
  };

  const handleReorder = useCallback((event: DragEndEvent) => {
    const { active, over } = event;

    if (!over) {
      return;
    }

    if (active.id !== over.id) {
      setBomItems((items) => {
        const oldIndex = items.findIndex((item) => item.id === active.id);
        const newIndex = items.findIndex((item) => item.id === over.id);

        return arrayMove(items, oldIndex, newIndex);
      });
      setIsBOMDirty(true);
    }
  }, []);

  const getSlotLabel = (slotNumber: number): string => {
    const slotLabels = ['A', 'B', 'C', 'D', 'E', 'F', 'G', 'H', 'I', 'J'];
    return slotLabels[slotNumber - 1] || String(slotNumber);
  };

  const closeConfigurationDialog = () => {
    setConfigurationState({
      isOpen: false,
      type: null,
      slotNumber: 0,
      productId: '',
      productName: ''
    });
  };

  return (
    <div className="space-y-6">
      <h2 className="text-2xl font-bold">BOM Builder</h2>

      {/* Level 1 Product Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Select Level 1 Product</CardTitle>
        </CardHeader>
        <CardContent>
          <Select value={selectedLevel1} onValueChange={setSelectedLevel1}>
            <SelectTrigger className="w-full">
              <SelectValue placeholder="Select a Level 1 product..." />
            </SelectTrigger>
            <SelectContent>
              {level1Products.map((product) => (
                <SelectItem key={product.id} value={product.id}>
                  {product.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </CardContent>
      </Card>

      {/* Level 2 Product Selection */}
      {selectedLevel1 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Level 2 Product</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedLevel2} onValueChange={setSelectedLevel2}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a Level 2 product..." />
              </SelectTrigger>
              <SelectContent>
                {filteredLevel2Products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Level 3 Product Selection */}
      {selectedLevel2 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Level 3 Product (Card)</CardTitle>
          </CardHeader>
          <CardContent>
            <Select value={selectedLevel3} onValueChange={setSelectedLevel3}>
              <SelectTrigger className="w-full">
                <SelectValue placeholder="Select a Level 3 product..." />
              </SelectTrigger>
              <SelectContent>
                {filteredLevel3Products.map((product) => (
                  <SelectItem key={product.id} value={product.id}>
                    {product.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </Card>
      )}

      {/* Chassis Selection and Addition */}
      {selectedLevel3 && (
        <Card>
          <CardHeader>
            <CardTitle>Select Chassis</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center space-x-4">
              <Select value={selectedChassis?.id} onValueChange={(value) => setSelectedChassis(chassisOptions.find(c => c.id === value) || null)}>
                <SelectTrigger className="w-full">
                  <SelectValue placeholder="Select a chassis..." />
                </SelectTrigger>
                <SelectContent>
                  {chassisOptions.map((chassis) => (
                    <SelectItem key={chassis.id} value={chassis.id}>
                      {chassis.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <Button variant="outline" size="sm" onClick={() => setIsAddingChassis(true)}>
                Add Chassis
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Chassis Addition Dialog */}
      <Dialog open={isAddingChassis} onOpenChange={setIsAddingChassis}>
        <DialogContent className="max-w-md">
          <DialogHeader>
            <DialogTitle>Add New Chassis</DialogTitle>
          </DialogHeader>
          <div className="space-y-4">
            <div>
              <Label htmlFor="chassisName">Chassis Name</Label>
              <Input
                id="chassisName"
                value={newChassis.name}
                onChange={(e) => setNewChassis({ ...newChassis, name: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="chassisDescription">Description</Label>
              <Input
                id="chassisDescription"
                value={newChassis.description}
                onChange={(e) => setNewChassis({ ...newChassis, description: e.target.value })}
              />
            </div>
            <Button onClick={handleAddChassis}>Add Chassis</Button>
          </div>
        </DialogContent>
      </Dialog>

      {/* Card Quantity and Slot Selection */}
      {selectedChassis && selectedLevel3 && (
        <Card>
          <CardHeader>
            <CardTitle>Configure Card in Chassis</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center space-x-4">
              <div>
                <Label htmlFor="quantity">Quantity</Label>
                <Input
                  id="quantity"
                  type="number"
                  min="1"
                  value={quantity}
                  onChange={(e) => setQuantity(parseInt(e.target.value))}
                />
              </div>
              <div>
                <Label>Select Slot</Label>
                <div className="grid grid-cols-5 gap-2">
                  {Array.from({ length: selectedChassis.slots }, (_, i) => i + 1).map((slotNumber) => (
                    <Button
                      key={slotNumber}
                      variant="outline"
                      onClick={() => handleCardSelect(filteredLevel3Products.find(p => p.id === selectedLevel3)!, slotNumber)}
                    >
                      {getSlotLabel(slotNumber)}
                    </Button>
                  ))}
                </div>
              </div>
            </div>
          </CardContent>
        </Card>
      )}

      {/* BOM Items Display */}
      <Card>
        <CardHeader>
          <CardTitle>BOM Items</CardTitle>
        </CardHeader>
        <CardContent>
          <ScrollArea className="h-[400px]">
            {bomItems.length === 0 ? (
              <p className="text-muted-foreground">No items in BOM.</p>
            ) : (
              <DndContext
                sensors={sensors}
                collisionDetection
                onDragEnd={handleReorder}
              >
                <SortableContext
                  items={bomItems.map((item) => item.id)}
                  strategy={verticalListSortingStrategy}
                >
                  <div className="space-y-2">
                    {bomItems.map((item) => (
                      <SortableItem key={item.id} id={item.id}>
                        <BOMItemCard
                          item={item}
                          onRemove={handleRemoveItem}
                          onQuantityChange={handleQuantityChange}
                        />
                      </SortableItem>
                    ))}
                  </div>
                </SortableContext>
              </DndContext>
            )}
          </ScrollArea>
        </CardContent>
      </Card>

      {/* Save BOM Button */}
      {isBOMDirty && (
        <div className="flex justify-end">
          <Button onClick={handleSaveBOM}>
            <Save className="h-4 w-4 mr-2" />
            Save BOM
          </Button>
        </div>
      )}

      {/* Configuration Dialogs */}
      {configurationState.isOpen && configurationState.type === 'analog' && (
        <AnalogConfigurationDialog
          isOpen={configurationState.isOpen}
          onClose={closeConfigurationDialog}
          slotNumber={configurationState.slotNumber}
          productId={configurationState.productId}
          productName={configurationState.productName}
        />
      )}

      {configurationState.isOpen && configurationState.type === 'bushing' && (
        <BushingConfigurationDialog
          isOpen={configurationState.isOpen}
          onClose={closeConfigurationDialog}
          slotNumber={configurationState.slotNumber}
          productId={configurationState.productId}
          productName={configurationState.productName}
        />
      )}
    </div>
  );
};

export default BOMBuilder;

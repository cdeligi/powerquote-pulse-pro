import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { BOMItem, Level1Product, Level2Product, Level3Product, Level3Customization } from '@/types/product';
import Level2OptionsSelector from './Level2OptionsSelector';
import ChassisSelector from './ChassisSelector';
import RackVisualizer from './RackVisualizer';
import SlotCardSelector from './SlotCardSelector';
import DGAProductSelector from './DGAProductSelector';
import PDProductSelector from './PDProductSelector';
import Level1ProductSelector from './Level1ProductSelector';
import BOMDisplay from './BOMDisplay';
import DiscountSection from './DiscountSection';
import QuoteFieldsSection from './QuoteFieldsSection';
import QuoteSubmissionDialog from './QuoteSubmissionDialog';
import QTMSConfigurationEditor from './QTMSConfigurationEditor';
import { consolidateQTMSConfiguration, createQTMSBOMItem } from '@/utils/qtmsConsolidation';
import { productDataService } from '@/services/productDataService';
import { Chassis, Card as ProductCard } from '@/types/product';

interface EditingQTMSConfig {
  level1ProductId: string;
  level2ProductId: string;
  level3ProductId: string;
  customizations: Level3Customization[];
}

interface BOMBuilderProps {
  canSeePrices: boolean;
  onBOMUpdate: (items: BOMItem[]) => void;
  onDiscountUpdate: (discount: number) => void;
  userId?: string;
}

const BOMBuilder = ({ canSeePrices, onBOMUpdate, onDiscountUpdate, userId }: BOMBuilderProps) => {
  const [activeTab, setActiveTab] = useState('qtms');
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [level1Products, setLevel1Products] = useState<Level1Product[]>([]);
  const [selectedLevel1, setSelectedLevel1] = useState<Level1Product | null>(null);
  const [level2Products, setLevel2Products] = useState<Level2Product[]>([]);
  const [selectedLevel2, setSelectedLevel2] = useState<Level2Product | null>(null);
  const [level3Products, setLevel3Products] = useState<Level3Product[]>([]);
  const [selectedLevel3, setSelectedLevel3] = useState<Level3Product | null>(null);
  const [level3Customizations, setLevel3Customizations] = useState<Level3Customization[]>([]);
  const [editingQTMS, setEditingQTMS] = useState<EditingQTMSConfig | null>(null);
  const [chassisOptions, setChassisOptions] = useState<Chassis[]>([]);
  const [selectedChassis, setSelectedChassis] = useState<Chassis | null>(null);
  const [slotAssignments, setSlotAssignments] = useState<Record<number, ProductCard>>({});
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [dgaProducts, setDGAProducts] = useState<Level1Product[]>([]);
  const [selectedDGA, setSelectedDGA] = useState<Level1Product | null>(null);
  const [pdProducts, setPDProducts] = useState<Level1Product[]>([]);
  const [selectedPD, setSelectedPD] = useState<Level1Product | null>(null);
  const [hasRemoteDisplay, setHasRemoteDisplay] = useState(false);

  useEffect(() => {
    const fetchInitialData = async () => {
      const [level1, chassis, dga, pd] = await Promise.all([
        productDataService.getAllLevel1Products(),
        productDataService.getChassisOptions(),
        productDataService.getProductsByCategory('dga'),
        productDataService.getProductsByCategory('power-distribution')
      ]);
      
      setLevel1Products(level1);
      setChassisOptions(chassis);
      setDGAProducts(dga);
      setPDProducts(pd);
    };

    fetchInitialData();
  }, []);

  useEffect(() => {
    if (selectedLevel1) {
      fetchLevel2Products(selectedLevel1.id);
    } else {
      setLevel2Products([]);
      setSelectedLevel2(null);
    }
  }, [selectedLevel1]);

  useEffect(() => {
    if (selectedLevel2) {
      fetchLevel3Products(selectedLevel2.id);
    } else {
      setLevel3Products([]);
      setSelectedLevel3(null);
    }
  }, [selectedLevel2]);

  useEffect(() => {
    // Update BOM items whenever bomItems changes
    onBOMUpdate(bomItems);
  }, [bomItems, onBOMUpdate]);

  const fetchLevel2Products = async (level1ProductId: string) => {
    const products = await productDataService.getLevel2ProductsByLevel1(level1ProductId);
    setLevel2Products(products);
  };

  const fetchLevel3Products = async (level2ProductId: string) => {
    const products = await productDataService.getLevel3ProductsByLevel2(level2ProductId);
    setLevel3Products(products);
  };

  const handleLevel1Select = (product: Level1Product) => {
    setSelectedLevel1(product);
    setSelectedLevel2(null);
    setSelectedLevel3(null);
    setLevel3Customizations([]);
  };

  const handleLevel2Select = (product: Level2Product) => {
    setSelectedLevel2(product);
    setSelectedLevel3(null);
    setLevel3Customizations([]);
  };

  const handleLevel3Select = (product: Level3Product) => {
    setSelectedLevel3(product);
  };

  const handleCustomizationChange = (customizations: Level3Customization[]) => {
    setLevel3Customizations(customizations);
  };

  const handleAddQTMSProduct = () => {
    if (selectedLevel1 && selectedLevel2 && selectedLevel3) {
      const newQTMSConfig = {
        level1ProductId: selectedLevel1.id,
        level2ProductId: selectedLevel2.id,
        level3ProductId: selectedLevel3.id,
        customizations: level3Customizations
      };

      setEditingQTMS(newQTMSConfig);
    }
  };

  const handleSaveQTMSConfiguration = (consolidatedQTMS: any) => {
    const correctedQTMS = consolidateQTMSConfiguration(consolidatedQTMS);
    const newBOMItem = createQTMSBOMItem(correctedQTMS);
    setBomItems([...bomItems, newBOMItem]);
    setEditingQTMS(null);
  };

  const handleBOMConfigurationEdit = (item: BOMItem) => {
    // For QTMS items, open the configuration editor
    if (item.product && selectedLevel1 && selectedLevel2 && selectedLevel3) {
      setEditingQTMS({
        level1ProductId: selectedLevel1.id,
        level2ProductId: selectedLevel2.id,
        level3ProductId: selectedLevel3.id,
        customizations: level3Customizations
      });
    }
  };

  const handleUpdateBOM = (items: BOMItem[]) => {
    setBomItems(items);
  };

  const handleChassisSelect = (chassis: Chassis) => {
    setSelectedChassis(chassis);
    setSlotAssignments({}); // Clear existing assignments
  };

  const handleSlotClick = (slot: number) => {
    setSelectedSlot(slot);
  };

  const handleSlotCardSelect = (card: ProductCard) => {
    if (selectedSlot !== null) {
      setSlotAssignments({ ...slotAssignments, [selectedSlot]: card });
      setSelectedSlot(null); // Clear selected slot after assignment
    }
  };

  const handleSlotClear = (slot: number) => {
    const newAssignments: Record<number, ProductCard> = { ...slotAssignments };
    
    // If clearing a bushing card, clear the main slot and its associated slot
    if (slotAssignments[slot]?.type === 'bushing') {
      delete newAssignments[slot];
      // Find the associated slot and clear it
      Object.keys(slotAssignments).forEach(key => {
        if (slotAssignments[key]?.type === 'bushing' && key !== slot.toString()) {
          delete newAssignments[key];
        }
      });
    } else {
      delete newAssignments[slot];
    }
    
    setSlotAssignments(newAssignments);
    setSelectedSlot(null);
  };

  const handleDGASelect = (product: Level1Product) => {
    setSelectedDGA(product);
    if (product) {
      const newBOMItem: BOMItem = {
        id: `dga-${product.id}`,
        product: product,
        quantity: 1,
        enabled: true,
        partNumber: 'DGA-' + product.id,
      };
      setBomItems([...bomItems, newBOMItem]);
    }
  };

  const handlePDSelect = (product: Level1Product) => {
    setSelectedPD(product);
    if (product) {
      const newBOMItem: BOMItem = {
        id: `pd-${product.id}`,
        product: product,
        quantity: 1,
        enabled: true,
        partNumber: 'PD-' + product.id,
      };
      setBomItems([...bomItems, newBOMItem]);
    }
  };

  const handleRemoteDisplayToggle = (enabled: boolean) => {
    setHasRemoteDisplay(enabled);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">BOM Builder</CardTitle>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-800">
              <TabsTrigger value="qtms" className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white">
                QTMS Products
              </TabsTrigger>
              <TabsTrigger value="dga" className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white">
                DGA Products
              </TabsTrigger>
              <TabsTrigger value="pd" className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white">
                PD Products
              </TabsTrigger>
              <TabsTrigger value="level1" className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white">
                Level 1 Products
              </TabsTrigger>
            </TabsList>

            <TabsContent value="qtms" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <Level1ProductSelector
                    onProductSelect={handleLevel1Select}
                    selectedProduct={selectedLevel1}
                  />
                </div>
                <div>
                  {selectedLevel1 && (
                    <Level2OptionsSelector
                      level1Product={selectedLevel1}
                      selectedOptions={selectedLevel2 ? [selectedLevel2] : []}
                      onOptionToggle={handleLevel2Select}
                    />
                  )}
                </div>
                <div>
                  {selectedLevel2 && (
                    <Level3ProductSelector
                      level3Products={level3Products}
                      onSelect={handleLevel3Select}
                      onCustomizationChange={handleCustomizationChange}
                      selected={selectedLevel3}
                    />
                  )}
                </div>
              </div>
              {selectedLevel3 && (
                <Button onClick={handleAddQTMSProduct} className="mt-4 bg-blue-600 hover:bg-blue-700 text-white">
                  Add QTMS Product
                </Button>
              )}
            </TabsContent>

            <TabsContent value="dga" className="mt-4">
              <DGAProductSelector
                onProductSelect={handleDGASelect}
                canSeePrices={canSeePrices}
              />
            </TabsContent>

            <TabsContent value="pd" className="mt-4">
              <PDProductSelector
                onProductSelect={handlePDSelect}
                canSeePrices={canSeePrices}
              />
            </TabsContent>

            <TabsContent value="level1" className="mt-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <ChassisSelector
                    onChassisSelect={handleChassisSelect}
                    selectedChassis={selectedChassis}
                    canSeePrices={canSeePrices}
                  />
                </div>
                <div>
                  {selectedChassis && (
                    <RackVisualizer
                      chassis={selectedChassis}
                      slotAssignments={slotAssignments}
                      onSlotClick={handleSlotClick}
                      onSlotClear={handleSlotClear}
                      selectedSlot={selectedSlot}
                      hasRemoteDisplay={hasRemoteDisplay}
                      onRemoteDisplayToggle={handleRemoteDisplayToggle}
                    />
                  )}
                </div>
                {selectedSlot !== null && selectedChassis && (
                  <SlotCardSelector
                    chassis={selectedChassis}
                    slot={selectedSlot}
                    onCardSelect={handleSlotCardSelect}
                    onClose={() => setSelectedSlot(null)}
                    canSeePrices={canSeePrices}
                    currentSlotAssignments={slotAssignments}
                  />
                )}
              </div>
            </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* BOM Display */}
      <BOMDisplay 
        bomItems={bomItems}
        canSeePrices={canSeePrices}
        onUpdateBOM={handleUpdateBOM}
      />

      {/* Discount Configuration */}
      <DiscountSection 
        bomItems={bomItems}
        canSeePrices={canSeePrices}
        onDiscountChange={onDiscountUpdate}
      />

      {/* Move Submit Quote Request button here - at the bottom of Discount Section */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-6">
          <div className="flex justify-center">
            <QuoteSubmissionDialog
              bomItems={bomItems.filter(item => item.enabled)}
              canSeePrices={canSeePrices}
              userId={userId}
            />
          </div>
        </CardContent>
      </Card>

      {/* Quote Fields Configuration */}
      <QuoteFieldsSection onFieldsChange={() => {}} />

      {/* QTMS Configuration Editor Dialog */}
      {editingQTMS && (
        <QTMSConfigurationEditor
          configuration={editingQTMS}
          onSave={handleSaveQTMSConfiguration}
          onCancel={() => setEditingQTMS(null)}
          canSeePrices={canSeePrices}
        />
      )}
    </div>
  );
};

interface Level3ProductSelectorProps {
  level3Products: Level3Product[];
  onSelect: (product: Level3Product) => void;
  onCustomizationChange: (customizations: Level3Customization[]) => void;
  selected: Level3Product | null;
}

const Level3ProductSelector = ({
  level3Products,
  onSelect,
  onCustomizationChange,
  selected
}: Level3ProductSelectorProps) => {
  const [customizations, setCustomizations] = useState<Level3Customization[]>([]);

  const handleProductSelect = (product: Level3Product) => {
    onSelect(product);
    setCustomizations([]);
    onCustomizationChange([]);
  };

  const handleCustomizationToggle = (customization: Level3Customization) => {
    const isSelected = customizations.some(c => c.id === customization.id);

    if (isSelected) {
      const updatedCustomizations = customizations.filter(c => c.id !== customization.id);
      setCustomizations(updatedCustomizations);
      onCustomizationChange(updatedCustomizations);
    } else {
      const updatedCustomizations = [...customizations, customization];
      setCustomizations(updatedCustomizations);
      onCustomizationChange(updatedCustomizations);
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Level 3 Products</CardTitle>
      </CardHeader>
      <CardContent className="space-y-4">
        {level3Products.map(product => (
          <Button
            key={product.id}
            variant={selected?.id === product.id ? "default" : "outline"}
            onClick={() => handleProductSelect(product)}
            className={selected?.id === product.id ? "bg-red-600 hover:bg-red-700 text-white" : "text-white border-gray-700"}
          >
            {product.name}
          </Button>
        ))}

        {selected && (
          <div className="space-y-2">
            <h4 className="text-white font-medium">Available Customizations</h4>
            {/* Mock Customizations - Replace with real data */}
            {[{ id: 'c1', name: 'High-Performance Cooling' }, { id: 'c2', name: 'Redundant Power Supply' }].map(customization => (
              <div key={customization.id} className="flex items-center space-x-2">
                <input
                  type="checkbox"
                  id={customization.id}
                  className="h-4 w-4 text-red-600 focus:ring-red-600 rounded bg-gray-800 border-gray-700"
                  checked={customizations.some(c => c.id === customization.id)}
                  onChange={() => handleCustomizationToggle(customization as Level3Customization)}
                />
                <label htmlFor={customization.id} className="text-sm font-medium text-gray-300">{customization.name}</label>
              </div>
            ))}
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BOMBuilder;

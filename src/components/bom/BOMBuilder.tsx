import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BOMItem, Level1Product, Level2Product, Level3Product, Level3Customization } from '@/types/product';
import Level2OptionsSelector from './Level2OptionsSelector';
import ChassisSelector from './ChassisSelector';
import CardLibrary from './CardLibrary';
import RackVisualizer from './RackVisualizer';
import SlotCardSelector from './SlotCardSelector';
import DGAProductSelector from './DGAProductSelector';
import PDProductSelector from './PDProductSelector';
import BOMDisplay from './BOMDisplay';
import AnalogCardConfigurator from './AnalogCardConfigurator';
import BushingCardConfigurator from './BushingCardConfigurator';
import { productDataService } from '@/services/productDataService';
import { generateQTMSPartNumber, generateProductPartNumber } from '@/types/product/part-number-utils';

interface BOMBuilderProps {
  onBOMUpdate: (items: BOMItem[]) => void;
  canSeePrices: boolean;
}

const BOMBuilder = ({ onBOMUpdate, canSeePrices }: BOMBuilderProps) => {
  const [selectedLevel1Product, setSelectedLevel1Product] = useState<Level1Product | null>(null);
  const [selectedLevel2Options, setSelectedLevel2Options] = useState<Level2Product[]>([]);
  const [selectedChassis, setSelectedChassis] = useState<Level2Product | null>(null);
  const [slotAssignments, setSlotAssignments] = useState<Record<number, Level3Product>>({});
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [hasRemoteDisplay, setHasRemoteDisplay] = useState<boolean>(false);
  const [configuringCard, setConfiguringCard] = useState<BOMItem | null>(null);

  // Get all Level 1 products for dynamic tabs
  const level1Products = productDataService.getLevel1Products().filter(p => p.enabled);

  // Set default active tab when products are loaded
  useEffect(() => {
    if (level1Products.length > 0 && !activeTab) {
      setActiveTab(level1Products[0].id);
    }
  }, [level1Products.length, activeTab]);

  // Update selected product when tab changes
  useEffect(() => {
    if (activeTab) {
      const product = level1Products.find(p => p.id === activeTab);
      if (product && selectedLevel1Product?.id !== activeTab) {
        setSelectedLevel1Product(product);
        setSelectedLevel2Options([]);
        setSelectedChassis(null);
        setSlotAssignments({});
        setSelectedSlot(null);
      }
    }
  }, [activeTab, level1Products, selectedLevel1Product?.id]);

  const handleLevel2OptionToggle = (option: Level2Product) => {
    setSelectedLevel2Options(prev => {
      const exists = prev.find(item => item.id === option.id);
      if (exists) {
        return prev.filter(item => item.id !== option.id);
      } else {
        return [...prev, option];
      }
    });
  };

  const handleChassisSelect = (chassis: Level2Product) => {
    setSelectedChassis(chassis);
    setSlotAssignments({});
    setSelectedSlot(null);
    setHasRemoteDisplay(false);
  };

  const handleSlotClick = (slot: number) => {
    setSelectedSlot(slot);
  };

  const handleSlotClear = (slot: number) => {
    setSlotAssignments(prev => {
      const updated = { ...prev };
      const cardAtSlot = updated[slot];
      
      // If it's a bushing card, clear all slots with the same bushing card
      if (cardAtSlot?.type === 'bushing') {
        Object.keys(updated).forEach(slotKey => {
          const slotNum = parseInt(slotKey);
          if (updated[slotNum]?.id === cardAtSlot.id) {
            delete updated[slotNum];
          }
        });
      } else {
        delete updated[slot];
      }
      
      return updated;
    });
  };

  const getBushingSlotPlacement = (chassisType: string) => {
    if (chassisType === 'LTX') {
      // Priority order: 6-7 first, then 13-14, then clear 6-7
      const slots6_7Available = !slotAssignments[6] && !slotAssignments[7];
      const slots13_14Available = !slotAssignments[13] && !slotAssignments[14];
      
      if (slots6_7Available) {
        return [6, 7];
      } else if (slots13_14Available) {
        return [13, 14];
      } else {
        // Clear 6-7 and use them
        return [6, 7];
      }
    } else if (chassisType === 'MTX') {
      // Always 6-7, clear if occupied
      return [6, 7];
    } else if (chassisType === 'STX') {
      // Always 3-4, clear if occupied
      return [3, 4];
    }
    return [6, 7]; // Fallback
  };

  const handleCardSelect = (card: Level3Product, slot?: number) => {
    if (card.name.toLowerCase().includes('analog') || card.name.toLowerCase().includes('bushing')) {
      const newItem: BOMItem = {
        id: `${Date.now()}-${Math.random()}`,
        product: card,
        quantity: 1,
        slot: slot || selectedSlot,
        enabled: true
      };
      setConfiguringCard(newItem);
      return;
    }

    if (selectedSlot !== null || slot !== undefined) {
      const targetSlot = slot !== undefined ? slot : selectedSlot!;
      
      if (card.type === 'bushing' && card.specifications?.slotRequirement === 2) {
        const bushingSlots = getBushingSlotPlacement(selectedChassis?.type || '');
        
        const updatedAssignments = { ...slotAssignments };
        
        // Clear target slots based on chassis type
        if (selectedChassis?.type === 'LTX') {
          if (bushingSlots[0] === 6) {
            // Using 6-7, clear them
            delete updatedAssignments[6];
            delete updatedAssignments[7];
          }
          // If using 13-14, no need to clear anything extra
        } else {
          // For MTX and STX, always clear the target slots
          delete updatedAssignments[bushingSlots[0]];
          delete updatedAssignments[bushingSlots[1]];
        }
        
        setSlotAssignments({
          ...updatedAssignments,
          [bushingSlots[0]]: card,
          [bushingSlots[1]]: card
        });
      } else {
        setSlotAssignments(prev => ({
          ...prev,
          [targetSlot]: card
        }));
      }
      setSelectedSlot(null);
    } else {
      const newItem: BOMItem = {
        id: `${Date.now()}-${Math.random()}`,
        product: card,
        quantity: 1,
        slot,
        enabled: true,
        partNumber: generateProductPartNumber(card as any)
      };
      
      const updatedItems = [...bomItems, newItem];
      setBomItems(updatedItems);
      onBOMUpdate(updatedItems);
    }
  };

  const handleCardConfiguration = (customizations: Level3Customization[]) => {
    if (!configuringCard) return;

    const configuredItem: BOMItem = {
      ...configuringCard,
      level3Customizations: customizations
    };

    if (configuringCard.slot !== undefined) {
      const card = configuringCard.product as Level3Product;
      
      if (card.type === 'bushing' && card.specifications?.slotRequirement === 2) {
        const bushingSlots = getBushingSlotPlacement(selectedChassis?.type || '');
        
        const updatedAssignments = { ...slotAssignments };
        if (selectedChassis?.type === 'LTX') {
          if (bushingSlots[0] === 6) {
            delete updatedAssignments[6];
            delete updatedAssignments[7];
          }
        } else {
          delete updatedAssignments[bushingSlots[0]];
          delete updatedAssignments[bushingSlots[1]];
        }
        
        setSlotAssignments({
          ...updatedAssignments,
          [bushingSlots[0]]: card,
          [bushingSlots[1]]: card
        });
      } else {
        setSlotAssignments(prev => ({
          ...prev,
          [configuringCard.slot!]: card
        }));
      }
    } else {
      const updatedItems = [...bomItems, configuredItem];
      setBomItems(updatedItems);
      onBOMUpdate(updatedItems);
    }

    setConfiguringCard(null);
    setSelectedSlot(null);
  };

  const handleDGAProductSelect = (product: Level1Product, configuration?: Record<string, any>, level2Options?: Level2Product[]) => {
    const newItem: BOMItem = {
      id: `${Date.now()}-${Math.random()}`,
      product: product,
      quantity: 1,
      enabled: true,
      configuration,
      partNumber: generateProductPartNumber(product, configuration)
    };
    
    const updatedItems = [...bomItems, newItem];
    
    if (level2Options) {
      level2Options.forEach(option => {
        const optionItem: BOMItem = {
          id: `${Date.now()}-${Math.random()}-${option.id}`,
          product: option as any,
          quantity: 1,
          enabled: true,
          partNumber: option.partNumber || option.id.toUpperCase()
        };
        updatedItems.push(optionItem);
      });
    }
    
    setBomItems(updatedItems);
    onBOMUpdate(updatedItems);
  };

  const handleRemoteDisplayToggle = (enabled: boolean) => {
    setHasRemoteDisplay(enabled);
  };

  const handleAddChassisAndCardsToBOM = () => {
    if (!selectedChassis) return;

    const chassisPrice = selectedChassis.price || 0;
    const cardsPrice = Object.values(slotAssignments).reduce((total, card) => {
      const cardId = card.id;
      const alreadyCounted = Object.entries(slotAssignments).some(([slot, otherCard]) => 
        parseInt(slot) < parseInt(Object.keys(slotAssignments).find(s => slotAssignments[parseInt(s)]?.id === cardId) || '0') && 
        otherCard.id === cardId
      );
      
      return total + (alreadyCounted ? 0 : (card.price || 0));
    }, 0);
    
    const remoteDisplayPrice = hasRemoteDisplay ? 850 : 0;
    const totalPrice = chassisPrice + cardsPrice + remoteDisplayPrice;

    const qtmsPartNumber = generateQTMSPartNumber(
      selectedChassis as any,
      Object.values(slotAssignments) as any[],
      hasRemoteDisplay,
      slotAssignments as any
    );

    const qtmsAssemblyItem: BOMItem = {
      id: `${Date.now()}-qtms-assembly`,
      product: {
        ...selectedChassis,
        name: `QTMS ${selectedChassis.type} Assembly`,
        description: `Complete QTMS ${selectedChassis.type} chassis with configured cards${hasRemoteDisplay ? ' and remote display' : ''}`,
        price: totalPrice
      },
      quantity: 1,
      enabled: true,
      partNumber: qtmsPartNumber
    };

    const updatedItems = [...bomItems, qtmsAssemblyItem];
    setBomItems(updatedItems);
    onBOMUpdate(updatedItems);
  };

  const handleBOMUpdate = (updatedItems: BOMItem[]) => {
    setBomItems(updatedItems);
    onBOMUpdate(updatedItems);
  };

  const renderProductContent = (productId: string) => {
    const product = level1Products.find(p => p.id === productId);
    if (!product) return null;

    switch (productId) {
      case 'qtms':
        return (
          <div className="space-y-6">
            <ChassisSelector
              onChassisSelect={handleChassisSelect}
              selectedChassis={selectedChassis}
              canSeePrices={canSeePrices}
            />
            
            {selectedChassis && (
              <div className="space-y-6">
                <RackVisualizer
                  chassis={selectedChassis as any}
                  slotAssignments={slotAssignments as any}
                  onSlotClick={handleSlotClick}
                  onSlotClear={handleSlotClear}
                  selectedSlot={selectedSlot}
                  hasRemoteDisplay={hasRemoteDisplay}
                  onRemoteDisplayToggle={handleRemoteDisplayToggle}
                />
                
                <CardLibrary
                  chassis={selectedChassis}
                  onCardSelect={handleCardSelect}
                  canSeePrices={canSeePrices}
                />
                
                {Object.keys(slotAssignments).length > 0 && (
                  <Card className="bg-gray-900 border-gray-800">
                    <CardContent className="pt-6">
                      <button
                        onClick={handleAddChassisAndCardsToBOM}
                        className="w-full bg-green-600 hover:bg-green-700 text-white px-4 py-2 rounded font-medium"
                      >
                        Add QTMS Assembly to BOM
                      </button>
                    </CardContent>
                  </Card>
                )}
              </div>
            )}
            
            {selectedSlot !== null && selectedChassis && (
              <SlotCardSelector
                chassis={selectedChassis as any}
                slot={selectedSlot}
                onCardSelect={handleCardSelect}
                onClose={() => setSelectedSlot(null)}
                canSeePrices={canSeePrices}
              />
            )}
          </div>
        );
      
      case 'dga':
        return (
          <DGAProductSelector
            onProductSelect={handleDGAProductSelect}
            canSeePrices={canSeePrices}
          />
        );
      
      case 'partial-discharge':
        return (
          <PDProductSelector
            onProductSelect={handleDGAProductSelect}
            canSeePrices={canSeePrices}
          />
        );
      
      default:
        return (
          <div className="space-y-6">
            {selectedLevel1Product && (
              <Level2OptionsSelector
                level1Product={selectedLevel1Product}
                selectedOptions={selectedLevel2Options}
                onOptionToggle={handleLevel2OptionToggle}
              />
            )}
          </div>
        );
    }
  };

  return (
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
      <div className="lg:col-span-2 space-y-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">BOM Builder</CardTitle>
            <CardDescription className="text-gray-400">
              Build your Bill of Materials by selecting products and configurations
            </CardDescription>
          </CardHeader>
        </Card>

        <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
          <TabsList className="grid w-full bg-gray-800" style={{ gridTemplateColumns: `repeat(${level1Products.length}, 1fr)` }}>
            {level1Products.map((product) => (
              <TabsTrigger 
                key={product.id}
                value={product.id} 
                className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
              >
                {product.name}
                {product.category && (
                  <Badge variant="outline" className="ml-2 text-xs">
                    {product.category}
                  </Badge>
                )}
              </TabsTrigger>
            ))}
          </TabsList>
          
          {level1Products.map((product) => (
            <TabsContent key={product.id} value={product.id} className="mt-6">
              {renderProductContent(product.id)}
            </TabsContent>
          ))}
        </Tabs>

        {configuringCard && configuringCard.product.name.toLowerCase().includes('analog') && (
          <AnalogCardConfigurator
            bomItem={configuringCard}
            onSave={handleCardConfiguration}
            onClose={() => setConfiguringCard(null)}
          />
        )}

        {configuringCard && configuringCard.product.name.toLowerCase().includes('bushing') && (
          <BushingCardConfigurator
            bomItem={configuringCard}
            onSave={handleCardConfiguration}
            onClose={() => setConfiguringCard(null)}
          />
        )}

        {selectedSlot !== null && selectedChassis && (
          <SlotCardSelector
            chassis={selectedChassis as any}
            slot={selectedSlot}
            onCardSelect={handleCardSelect}
            onClose={() => setSelectedSlot(null)}
            canSeePrices={canSeePrices}
          />
        )}
      </div>

      <div className="lg:col-span-1">
        <BOMDisplay
          bomItems={bomItems}
          onUpdateBOM={handleBOMUpdate}
          canSeePrices={canSeePrices}
        />
      </div>
    </div>
  );
};

export default BOMBuilder;

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
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
import QuoteFieldsSection from './QuoteFieldsSection';
import DiscountSection from './DiscountSection';
import QuoteSubmissionDialog from './QuoteSubmissionDialog';
import QTMSConfigurationEditor from './QTMSConfigurationEditor';
import { consolidateQTMSConfiguration, createQTMSBOMItem, ConsolidatedQTMS } from '@/utils/qtmsConsolidation';

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
  const [quoteFields, setQuoteFields] = useState<Record<string, any>>({});
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [discountJustification, setDiscountJustification] = useState<string>('');
  const [showQuoteSubmission, setShowQuoteSubmission] = useState(false);
  const [editingQTMS, setEditingQTMS] = useState<ConsolidatedQTMS | null>(null);

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
      const card = updated[slot];
      
      // If it's a bushing card, also clear the next slot
      if (card && (card.name.toLowerCase().includes('bushing') || card.type === 'bushing')) {
        const nextSlot = slot + 1;
        delete updated[nextSlot];
      }
      
      delete updated[slot];
      return updated;
    });
  };

  const handleCardSelect = (card: Level3Product, slot?: number) => {
    // Check if card needs configuration
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
      setSlotAssignments(prev => ({
        ...prev,
        [targetSlot]: card
      }));
      setSelectedSlot(null);
    } else {
      // Add directly to BOM for non-chassis items
      const newItem: BOMItem = {
        id: `${Date.now()}-${Math.random()}`,
        product: card,
        quantity: 1,
        slot,
        enabled: true
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
      // Add to slot assignments for chassis cards
      setSlotAssignments(prev => ({
        ...prev,
        [configuringCard.slot!]: configuringCard.product as Level3Product
      }));
    } else {
      // Add directly to BOM
      const updatedItems = [...bomItems, configuredItem];
      setBomItems(updatedItems);
      onBOMUpdate(updatedItems);
    }

    setConfiguringCard(null);
    setSelectedSlot(null);
  };

  const handleDGAProductSelect = (product: Level1Product, configuration?: Record<string, any>, level2Options?: Level2Product[]) => {
    // Handle DGA product selection
    const newItem: BOMItem = {
      id: `${Date.now()}-${Math.random()}`,
      product: product,
      quantity: 1,
      enabled: true,
      configuration
    };
    
    const updatedItems = [...bomItems, newItem];
    
    // Add level 2 options as separate items
    if (level2Options) {
      level2Options.forEach(option => {
        const optionItem: BOMItem = {
          id: `${Date.now()}-${Math.random()}-${option.id}`,
          product: option as any,
          quantity: 1,
          enabled: true
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

    // Consolidate QTMS configuration
    const consolidatedQTMS = consolidateQTMSConfiguration(
      selectedChassis,
      slotAssignments,
      hasRemoteDisplay,
      {}, // analogConfigurations - will be implemented separately
      {} // bushingConfigurations - will be implemented separately
    );

    // Show editor to allow user to review/edit before adding
    setEditingQTMS(consolidatedQTMS);
  };

  const handleQTMSConfigurationSave = (updatedQTMS: ConsolidatedQTMS) => {
    // Create consolidated BOM item
    const qtmsBOMItem = createQTMSBOMItem(updatedQTMS);
    
    const updatedItems = [...bomItems, qtmsBOMItem];
    setBomItems(updatedItems);
    onBOMUpdate(updatedItems);
    
    // Clear chassis configuration
    setSelectedChassis(null);
    setSlotAssignments({});
    setHasRemoteDisplay(false);
    setEditingQTMS(null);
  };

  const handleSubmitQuote = (quoteId: string) => {
    console.log('Quote submitted with ID:', quoteId);
    setShowQuoteSubmission(false);
    // Reset BOM after successful submission
    setBomItems([]);
    setQuoteFields({});
    setDiscountPercentage(0);
    setDiscountJustification('');
    onBOMUpdate([]);
  };

  const handleBOMUpdate = (updatedItems: BOMItem[]) => {
    setBomItems(updatedItems);
    onBOMUpdate(updatedItems);
  };

  const handleQuoteFieldsChange = (fields: Record<string, any>) => {
    setQuoteFields(fields);
  };

  const handleDiscountChange = (discount: number, justification: string) => {
    setDiscountPercentage(discount);
    setDiscountJustification(justification);
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
                        Add Chassis & Cards to BOM
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
                currentSlotAssignments={slotAssignments}
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
    <div className="space-y-6">
      {/* Quote Fields Section - Always at the top */}
      <QuoteFieldsSection 
        onFieldsChange={handleQuoteFieldsChange}
        initialValues={quoteFields}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Left side - Product selection (2/3 width) */}
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

          {/* Card Configuration Dialogs */}
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

          {/* Submit Quote Button */}
          {bomItems.length > 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6">
                <Button
                  onClick={() => setShowQuoteSubmission(true)}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
                  size="lg"
                >
                  Submit Quote Request ({bomItems.length} items)
                </Button>
              </CardContent>
            </Card>
          )}

          {/* Slot Card Selector Dialog */}
          {selectedSlot !== null && selectedChassis && (
            <SlotCardSelector
              chassis={selectedChassis as any}
              slot={selectedSlot}
              onCardSelect={handleCardSelect}
              onClose={() => setSelectedSlot(null)}
              canSeePrices={canSeePrices}
              currentSlotAssignments={slotAssignments}
            />
          )}
        </div>

        {/* Right side - BOM Display and Discount (1/3 width) */}
        <div className="lg:col-span-1 space-y-6">
          <BOMDisplay
            bomItems={bomItems}
            onUpdateBOM={handleBOMUpdate}
            canSeePrices={canSeePrices}
          />
          
          {/* Discount Section - Shows after products are selected */}
          <DiscountSection
            bomItems={bomItems}
            onDiscountChange={handleDiscountChange}
            canSeePrices={canSeePrices}
            initialDiscount={discountPercentage}
            initialJustification={discountJustification}
          />
        </div>
      </div>

      {/* QTMS Configuration Editor */}
      {editingQTMS && (
        <QTMSConfigurationEditor
          consolidatedQTMS={editingQTMS}
          onSave={handleQTMSConfigurationSave}
          onClose={() => setEditingQTMS(null)}
          canSeePrices={canSeePrices}
        />
      )}

      {/* Quote Submission Dialog */}
      {showQuoteSubmission && (
        <QuoteSubmissionDialog
          bomItems={bomItems}
          quoteFields={quoteFields}
          discountPercentage={discountPercentage}
          discountJustification={discountJustification}
          onSubmit={handleSubmitQuote}
          onClose={() => setShowQuoteSubmission(false)}
          canSeePrices={canSeePrices}
        />
      )}
    </div>
  );
};

export default BOMBuilder;

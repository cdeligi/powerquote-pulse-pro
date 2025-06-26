import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BOMItem, Level1Product, Level2Product, Level3Product, Level3Customization } from '@/types/product';
import Level2OptionsSelector from './Level2OptionsSelector';
import ChassisSelector from './ChassisSelector';
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
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import QTMSConfigurationEditor from './QTMSConfigurationEditor';
import { consolidateQTMSConfiguration, createQTMSBOMItem, ConsolidatedQTMS, QTMSConfiguration } from '@/utils/qtmsConsolidation';
import { findOptimalBushingPlacement, findExistingBushingSlots, isBushingCard } from '@/utils/bushingValidation';
import { useAuth } from '@/hooks/useAuth';

interface BOMBuilderProps {
  onBOMUpdate: (items: BOMItem[]) => void;
  canSeePrices: boolean;
}

const BOMBuilder = ({ onBOMUpdate, canSeePrices }: BOMBuilderProps) => {
  // ALL HOOKS MUST BE AT THE TOP - NO CONDITIONAL RETURNS BEFORE HOOKS
  const { user, loading } = useAuth();

  const [selectedLevel1Product, setSelectedLevel1Product] = useState<Level1Product | null>(null);
  const [selectedLevel2Options, setSelectedLevel2Options] = useState<Level2Product[]>([]);
  const [selectedChassis, setSelectedChassis] = useState<Level2Product | null>(null);
  const [slotAssignments, setSlotAssignments] = useState<Record<number, Level3Product>>({});
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [hasRemoteDisplay, setHasRemoteDisplay] = useState<boolean>(false);
  const [configuringCard, setConfiguringCard] = useState<BOMItem | null>(null);
  const [configuringBOMItem, setConfiguringBOMItem] = useState<BOMItem | null>(null);
  const [quoteFields, setQuoteFields] = useState<Record<string, any>>({});
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [discountJustification, setDiscountJustification] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingQTMS, setEditingQTMS] = useState<ConsolidatedQTMS | null>(null);

  // Fixed field change handler to match expected signature
  const handleQuoteFieldChange = (fieldId: string, value: any) => {
    setQuoteFields(prev => ({ ...prev, [fieldId]: value }));
  };

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
      
      if (card && isBushingCard(card)) {
        const bushingSlots = findExistingBushingSlots(updated);
        bushingSlots.forEach(bushingSlot => {
          delete updated[bushingSlot];
        });
      } else {
        delete updated[slot];
      }
      
      return updated;
    });
  };

  const handleCardSelect = (card: Level3Product, slot?: number) => {
    if (isBushingCard(card)) {
      if (!selectedChassis) return;
      
      const placement = findOptimalBushingPlacement(selectedChassis, slotAssignments);
      if (!placement) {
        console.error('Cannot place bushing card - no valid placement found');
        return;
      }

      setSlotAssignments(prev => {
        const updated = { ...prev };
        
        if (placement.shouldClearExisting) {
          placement.existingSlotsToClear.forEach(slotToClear => {
            delete updated[slotToClear];
          });
        }
        
        updated[placement.primarySlot] = card;
        updated[placement.secondarySlot] = card;
        
        return updated;
      });

      if (card.name.toLowerCase().includes('bushing')) {
        const newItem: BOMItem = {
          id: `${Date.now()}-${Math.random()}`,
          product: card,
          quantity: 1,
          slot: placement.primarySlot,
          enabled: true
        };
        setConfiguringCard(newItem);
        return;
      }

      setSelectedSlot(null);
      return;
    }

    if (card.name.toLowerCase().includes('analog')) {
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
      setSlotAssignments(prev => ({
        ...prev,
        [configuringCard.slot!]: configuringCard.product as Level3Product
      }));
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
      configuration
    };
    
    const updatedItems = [...bomItems, newItem];
    
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

    const consolidatedQTMS = consolidateQTMSConfiguration(
      selectedChassis,
      slotAssignments,
      hasRemoteDisplay,
      {},
      {}
    );

    const bomItem = createQTMSBOMItem(consolidatedQTMS);
    
    const updatedItems = [...bomItems, bomItem];
    setBomItems(updatedItems);
    onBOMUpdate(updatedItems);

    setSelectedChassis(null);
    setSlotAssignments({});
    setSelectedSlot(null);
    setHasRemoteDisplay(false);
  };

  const handleBOMConfigurationEdit = (item: BOMItem) => {
    if (item.product.type === 'QTMS' && item.configuration) {
      const consolidatedQTMS: ConsolidatedQTMS = {
        id: item.id,
        name: item.product.name,
        description: item.product.description || '',
        partNumber: item.partNumber || item.product.partNumber || '',
        price: item.product.price || 0,
        configuration: item.configuration as QTMSConfiguration,
        components: []
      };
      setEditingQTMS(consolidatedQTMS);
    } else {
      setConfiguringBOMItem(item);
    }
  };

  const handleQTMSConfigurationSave = (updatedQTMS: ConsolidatedQTMS) => {
    console.log('Saving QTMS configuration:', updatedQTMS);
    
    const updatedBOMItem = createQTMSBOMItem(updatedQTMS);
    
    const existingItemIndex = bomItems.findIndex(item => item.id === updatedQTMS.id);
    
    let updatedItems;
    if (existingItemIndex >= 0) {
      console.log('Updating existing QTMS item at index:', existingItemIndex);
      updatedItems = bomItems.map((item, index) => 
        index === existingItemIndex ? updatedBOMItem : item
      );
    } else {
      console.log('Adding new QTMS item to BOM');
      updatedItems = [...bomItems, updatedBOMItem];
    }
    
    console.log('Updated BOM items:', updatedItems);
    setBomItems(updatedItems);
    onBOMUpdate(updatedItems);
    setEditingQTMS(null);
  };

  const handleSubmitQuote = (quoteId: string) => {
    console.log('Quote submitted with ID:', quoteId);
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

  const handleDiscountChange = (discount: number, justification: string) => {
    setDiscountPercentage(discount);
    setDiscountJustification(justification);
  };

  const submitQuoteRequest = async () => {
    if (isSubmitting) return;

    setIsSubmitting(true);

    try {
      const quoteId = `Q-${Date.now()}`;

      const originalQuoteValue = bomItems.reduce(
        (sum, item) => sum + item.product.price * item.quantity,
        0
      );
      const discountedValue =
        originalQuoteValue * (1 - discountPercentage / 100);
      const totalCost = bomItems.reduce(
        (sum, item) => sum + (item.product.cost || 0) * item.quantity,
        0
      );
      const grossProfit = discountedValue - totalCost;
      const discountedMargin =
        discountedValue > 0 ? (grossProfit / discountedValue) * 100 : 0;

      const { error: quoteError } = await supabase.from('quotes').insert({
        id: quoteId,
        customer_name: quoteFields.customerName,
        oracle_customer_id: quoteFields.oracleCustomerId,
        sfdc_opportunity: quoteFields.sfdcOpportunity,
        status: 'pending_approval',
        user_id: user!.id,
        submitted_by_name: user!.name,
        submitted_by_email: user!.email,
        original_quote_value: originalQuoteValue,
        requested_discount: discountPercentage,
        discount_justification: discountJustification,
        discounted_value: discountedValue,
        total_cost: totalCost,
        gross_profit: grossProfit,
        original_margin:
          originalQuoteValue > 0
            ? ((originalQuoteValue - totalCost) / originalQuoteValue) * 100
            : 0,
        discounted_margin: discountedMargin,
        quote_fields: quoteFields,
        priority: 'Medium',
        currency: 'USD',
        payment_terms: 'Net 30',
        shipping_terms: 'FOB Origin',
      });

      if (quoteError) {
        console.error('SUPABASE ERROR:', quoteError);
        toast({
          title: 'Submission Failed',
          description:
            quoteError.message || 'Unknown error. Check console for more info.',
          variant: 'destructive',
        });
        setIsSubmitting(false);
        return;
      }

      for (const item of bomItems) {
        const { error: bomError } = await supabase.from('bom_items').insert({
          quote_id: quoteId,
          product_id: item.product.id,
          name: item.product.name,
          description: item.product.description || '',
          part_number: item.product.partNumber || item.partNumber || '',
          quantity: item.quantity,
          unit_price: item.product.price,
          unit_cost: item.product.cost || 0,
          total_price: item.product.price * item.quantity,
          total_cost: (item.product.cost || 0) * item.quantity,
          margin:
            item.product.price > 0
              ? ((item.product.price - (item.product.cost || 0)) /
                  item.product.price) *
                100
              : 0,
          original_unit_price: item.product.price,
          approved_unit_price: item.product.price,
          configuration_data: item.configuration || {},
          product_type: item.product.type || 'standard',
        });

        if (bomError) {
          console.error('SUPABASE BOM ERROR:', bomError);
          toast({
            title: 'BOM Item Error',
            description: bomError.message || 'Failed to create BOM item',
            variant: 'destructive',
          });
          throw bomError;
        }
      }

      try {
        const { data: adminIds } = await supabase.rpc('get_admin_user_ids');
        if (adminIds && adminIds.length > 0) {
          await supabase.from('admin_notifications').insert({
            quote_id: quoteId,
            notification_type: 'quote_pending_approval',
            sent_to: adminIds,
            message_content: {
              customer_name: quoteFields.customerName,
              submitted_by: user!.name,
              quote_value: discountedValue,
              discount_percentage: discountPercentage,
            },
          });
        }
      } catch (notificationError) {
        console.error('Failed to send admin notifications:', notificationError);
      }

      toast({
        title: 'Quote Submitted Successfully',
        description: `Quote ${quoteId} has been submitted for approval.`,
      });

      handleSubmitQuote(quoteId);
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast({
        title: 'Submission Failed',
        description: 'Failed to submit quote. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  // Render product content based on selected tab
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

  // CONDITIONAL RENDERING IN JSX - NO EARLY RETURNS
  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white">Loading...</div>
      </div>
    );
  }

  if (!user) {
    return (
      <div className="flex items-center justify-center h-64">
        <div className="text-white text-center">
          <p className="mb-4">Please log in to use the BOM Builder</p>
          <p className="text-gray-400">Authentication is required to submit quotes</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quote Fields Section - Always at the top */}
      <QuoteFieldsSection
        quoteFields={quoteFields}
        onFieldChange={handleQuoteFieldChange}
      />

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6 h-full">
        {/* Left side - Product selection (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">BOM Builder</CardTitle>
              <CardDescription className="text-gray-400">
                Build your Bill of Materials by selecting products and configurations
                <br />
                <span className="text-green-400">Logged in as: {user.name} ({user.email})</span>
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
        </div>

        {/* Right side - BOM Display and Discount (1/3 width) */}
        <div className="lg:col-span-1 space-y-6">
          <BOMDisplay
            bomItems={bomItems}
            onUpdateBOM={handleBOMUpdate}
            onEditConfiguration={handleBOMConfigurationEdit}
            canSeePrices={canSeePrices}
          />
          
          {/* Discount Section with Submit Quote Button */}
          <DiscountSection
            bomItems={bomItems}
            onDiscountChange={handleDiscountChange}
            canSeePrices={canSeePrices}
            initialDiscount={discountPercentage}
            initialJustification={discountJustification}
          />

          {/* Submit Quote Button - Moved here to bottom of discount section */}
          {bomItems.length > 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="pt-6">
                <Button
                  onClick={submitQuoteRequest}
                  className="w-full bg-blue-600 hover:bg-blue-700 text-white font-medium py-3"
                  size="lg"
                  disabled={isSubmitting}
                >
                  {isSubmitting ? 'Submitting...' : `Submit Quote Request (${bomItems.length} items)`}
                </Button>
              </CardContent>
            </Card>
          )}
        </div>
      </div>

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

      {/* QTMS Configuration Editor */}
      {editingQTMS && (
        <QTMSConfigurationEditor
          consolidatedQTMS={editingQTMS}
          onSave={handleQTMSConfigurationSave}
          onClose={() => setEditingQTMS(null)}
          canSeePrices={canSeePrices}
        />
      )}

      {/* End of dialogs */}
    </div>
  );
};

export default BOMBuilder;

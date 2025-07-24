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
import AdditionalConfigTab from './AdditionalConfigTab';
import { productDataService } from '@/services/productDataService';
import QuoteFieldsSection from './QuoteFieldsSection';
import DiscountSection from './DiscountSection';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/components/ui/use-toast';
import QTMSConfigurationEditor from './QTMSConfigurationEditor';
import { consolidateQTMSConfiguration, createQTMSBOMItem, ConsolidatedQTMS, QTMSConfiguration } from '@/utils/qtmsConsolidation';
import { findOptimalBushingPlacement, findExistingBushingSlots, isBushingCard } from '@/utils/bushingValidation';
import { useAuth } from '@/hooks/useAuth';
import { useQuoteValidation } from './QuoteFieldValidation';

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

  // Get available quote fields for validation
  const [availableQuoteFields, setAvailableQuoteFields] = useState<any[]>([]);
  
  useEffect(() => {
    const fetchQuoteFields = async () => {
      try {
        const { data: fields, error } = await supabase
          .from('quote_fields')
          .select('*')
          .eq('enabled', true)
          .order('display_order');
        
        if (error) throw error;
        setAvailableQuoteFields(fields || []);
      } catch (error) {
        console.error('Error fetching quote fields:', error);
      }
    };

    fetchQuoteFields();
  }, []);

  // Use quote validation hook
  const { validation, validateFields } = useQuoteValidation(quoteFields, availableQuoteFields);

  // Fixed field change handler to match expected signature
  const handleQuoteFieldChange = (fieldId: string, value: any) => {
    setQuoteFields(prev => ({ ...prev, [fieldId]: value }));
  };

  // Load Level 1 products for dynamic tabs - use real Supabase data
  const [level1Products, setLevel1Products] = useState<Level1Product[]>([]);
  const [level1Loading, setLevel1Loading] = useState(true);

  useEffect(() => {
    const loadLevel1Products = async () => {
      try {
        const products = await productDataService.getLevel1Products();
        setLevel1Products(products.filter(p => p.enabled));
      } catch (error) {
        console.error('Error loading Level 1 products:', error);
        setLevel1Products([]);
      } finally {
        setLevel1Loading(false);
      }
    };

    loadLevel1Products();
  }, []);

  // Set default active tab when products are loaded
  useEffect(() => {
    if (level1Products.length > 0 && !activeTab) {
      setActiveTab(level1Products[0].id);
    }
  }, [level1Products.length, activeTab]);

  // Update selected product when tab changes
  useEffect(() => {
    if (activeTab && activeTab !== 'additional-config') {
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

    // Validate required fields before submission
    const { isValid, missingFields } = validateFields();
    
    if (!isValid) {
      toast({
        title: 'Missing Required Fields',
        description: `Please fill in the following required fields: ${missingFields.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    if (bomItems.length === 0) {
      toast({
        title: 'No Items in BOM',
        description: 'Please add at least one item to the Bill of Materials before submitting.',
        variant: 'destructive',
      });
      return;
    }

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
              title: 'New Quote Pending Approval',
              message: `Quote ${quoteId} from ${user!.name} is pending approval`,
              quote_value: originalQuoteValue,
              requested_discount: discountPercentage
            }
          });
        }
      } catch (notificationError) {
        console.warn('Failed to send admin notifications:', notificationError);
      }

      toast({
        title: 'Quote Submitted Successfully',
        description: `Your quote ${quoteId} has been submitted for approval.`,
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

  // Determine if the current product supports rack configuration
  const currentProductSupportsRack = selectedLevel1Product && (selectedLevel1Product as any).rackConfigurable === true;

  const renderProductContent = (productId: string) => {
    const product = level1Products.find(p => p.id === productId);
    if (!product) return null;

    // Check if this product has rack configuration enabled
    const hasRackConfig = product.rackConfigurable === true;

    if (hasRackConfig) {
      return (
        <div className="space-y-6">
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <div>
              <Level2OptionsSelector
                level1Product={selectedLevel1Product}
                selectedOptions={selectedLevel2Options}
                onOptionToggle={handleLevel2OptionToggle}
                canSeePrices={canSeePrices}
              />
            </div>
            
            <div>
              <ChassisSelector
                onChassisSelect={handleChassisSelect}
                selectedChassis={selectedChassis}
                canSeePrices={canSeePrices}
              />
            </div>
          </div>

          {selectedChassis && (
            <div className="space-y-4">
              <h3 className="text-lg font-semibold">Configure Chassis</h3>
              <RackVisualizer
                chassis={{
                  ...selectedChassis,
                  height: selectedChassis.specifications?.height || '',
                  slots: selectedChassis.specifications?.slots || 0
                } as any}
                slotAssignments={slotAssignments}
                selectedSlot={selectedSlot}
                onSlotClick={handleSlotClick}
                onSlotClear={handleSlotClear}
                hasRemoteDisplay={hasRemoteDisplay}
                onRemoteDisplayToggle={handleRemoteDisplayToggle}
              />
              
            <SlotCardSelector
              chassis={selectedChassis}
              slot={selectedSlot}
              onCardSelect={handleCardSelect}
              onClose={() => setSelectedSlot(null)}
              canSeePrices={canSeePrices}
            />
              
              {selectedChassis && Object.keys(slotAssignments).length > 0 && (
                <Button 
                  onClick={handleAddChassisAndCardsToBOM}
                  className="w-full"
                >
                  Add Configuration to BOM
                </Button>
              )}
            </div>
          )}
        </div>
      );
    } else {
      // Non-rack configurable products show standard options
      switch (productId) {
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
            <div className="space-y-4">
              <Level2OptionsSelector
                level1Product={selectedLevel1Product}
                selectedOptions={selectedLevel2Options}
                onOptionToggle={handleLevel2OptionToggle}
                canSeePrices={canSeePrices}
              />
            </div>
          );
      }
    }
  };

  // Show loading state while data is being fetched
  if (level1Loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading product catalog...</p>
        </div>
      </div>
    );
  }

  // Check authentication
  if (loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Checking authentication...</p>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <Card>
        <CardContent className="p-6">
          <div className="text-center">
            <h3 className="text-lg font-medium text-gray-900 mb-2">Authentication Required</h3>
            <p className="text-gray-600">Please log in to access the BOM Builder.</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quote Fields Section */}
          <QuoteFieldsSection
            quoteFields={quoteFields}
            onFieldChange={handleQuoteFieldChange}
          />

      {/* Product Selection */}
      <Card>
        <CardHeader>
          <CardTitle>Product Selection</CardTitle>
          <CardDescription>
            Select products to add to your Bill of Materials
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Tabs value={activeTab} onValueChange={setActiveTab}>
            <TabsList className="grid w-full grid-cols-4">
              {level1Products.map(product => (
                <TabsTrigger key={product.id} value={product.id}>
                  {product.name}
                  {product.rackConfigurable && (
                    <Badge variant="secondary" className="ml-2 text-xs">Rack</Badge>
                  )}
                </TabsTrigger>
              ))}
              <TabsTrigger value="additional-config">Additional</TabsTrigger>
            </TabsList>

            {level1Products.map(product => (
              <TabsContent key={product.id} value={product.id}>
                {renderProductContent(product.id)}
              </TabsContent>
            ))}

            <TabsContent value="additional-config">
            <AdditionalConfigTab
              onCardSelect={handleCardSelect}
              canSeePrices={canSeePrices}
            />
          </TabsContent>
          </Tabs>
        </CardContent>
      </Card>

      {/* BOM Display */}
      <BOMDisplay
        bomItems={bomItems}
        onUpdateBOM={handleBOMUpdate}
        onEditConfiguration={handleBOMConfigurationEdit}
        canSeePrices={canSeePrices}
      />

      {/* Discount Section */}
      <DiscountSection
        bomItems={bomItems}
        onDiscountChange={handleDiscountChange}
        canSeePrices={canSeePrices}
        initialDiscount={discountPercentage}
        initialJustification={discountJustification}
      />

      {/* Submit Button */}
      <div className="flex justify-end">
        <Button
          onClick={submitQuoteRequest}
          disabled={isSubmitting || bomItems.length === 0}
          size="lg"
        >
          {isSubmitting ? 'Submitting...' : 'Submit Quote Request'}
        </Button>
      </div>

      {/* Configuration Dialogs */}
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

      {editingQTMS && (
        <QTMSConfigurationEditor
          consolidatedQTMS={editingQTMS}
          onSave={handleQTMSConfigurationSave}
          onClose={() => setEditingQTMS(null)}
          canSeePrices={canSeePrices}
        />
      )}
    </div>
  );
};

export default BOMBuilder;
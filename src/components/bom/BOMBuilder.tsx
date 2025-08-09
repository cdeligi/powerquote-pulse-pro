import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BOMItem, Level1Product, Level2Product, Level3Product, Level3Customization } from '@/types/product';
import Level2OptionsSelector from './Level2OptionsSelector';
import ChassisSelector from './ChassisSelector';
import RackVisualizer from './RackVisualizer';
import SlotCardSelector from './SlotCardSelector';
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
const [configuringChassis, setConfiguringChassis] = useState<Level2Product | null>(null);
const [editingOriginalItem, setEditingOriginalItem] = useState<BOMItem | null>(null);

// Admin-driven part number config and codes for the selected chassis
const [pnConfig, setPnConfig] = useState<any | null>(null);
const [codeMap, setCodeMap] = useState<Record<string, { template: string; slot_span: number; is_standard?: boolean; standard_position?: number | null; designated_only?: boolean; designated_positions?: number[]; outside_chassis?: boolean; notes?: string | null; exclusive_in_slots?: boolean; color?: string | null }>>({});
const [level3Products, setLevel3Products] = useState<Level3Product[]>([]);
const [autoPlaced, setAutoPlaced] = useState(false);

// Hints for standard slot positions not yet filled (top-level to avoid conditional hooks)
const standardSlotHints = useMemo(() => {
  const hints: Record<number, string[]> = {};
  const nameById = Object.fromEntries(level3Products.map(p => [p.id, p.name] as const));
  Object.entries(codeMap).forEach(([l3Id, def]) => {
    if (!def?.is_standard || def?.outside_chassis) return;
    const pos = def.standard_position;
    // Skip CPU std position (0) and ignore outside-chassis items
    if (pos === 0 || pos === null || pos === undefined) return;
    if (!slotAssignments[pos]) {
      const name = nameById[l3Id] || 'Standard Item';
      hints[pos] = hints[pos] ? [...hints[pos], name] : [name];
    }
  });
  return hints;
}, [codeMap, level3Products, slotAssignments]);

// Map configured colors by Level3 id from admin codeMap
const colorByProductId = useMemo(() => {
  const map: Record<string, string> = {};
  Object.entries(codeMap).forEach(([id, def]) => {
    if (def && def.color) map[id] = def.color as string;
  });
  return map;
}, [codeMap]);

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
  const [isLoading, setIsLoading] = useState(false);

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
      console.log('Setting default active tab. Available products:', level1Products.map(p => ({ id: p.id, name: p.name })));
      setActiveTab(level1Products[0].id);
    }
  }, [level1Products.length, activeTab]);

  // Update selected product when tab changes
  useEffect(() => {
    if (activeTab && activeTab !== 'additional-config') {
      console.log('Active tab changed to:', activeTab);
      const product = level1Products.find(p => p.id === activeTab);
      console.log('Found product for tab:', product);
      
      if (product && selectedLevel1Product?.id !== activeTab) {
        console.log('Setting selectedLevel1Product to:', product);
        setSelectedLevel1Product(product);
        setSelectedLevel2Options([]);
        setSelectedChassis(null);
        setSlotAssignments({});
        setSelectedSlot(null);
      }
    }
  }, [activeTab, level1Products, selectedLevel1Product?.id]);

  const handleAddToBOM = (product: Level1Product | Level2Product | Level3Product) => {
    console.log('Adding product to BOM:', product.name);
    
    const newItem: BOMItem = {
      id: `${product.id}-${Date.now()}`,
      product: product,
      quantity: 1,
      enabled: true
    };
    
    // Add to BOM
    setBomItems(prev => [...prev, newItem]);
    onBOMUpdate([...bomItems, newItem]);
    
    // Show success message
    toast({
      title: 'Added to BOM',
      description: `${product.name} has been added to your bill of materials.`,
    });
  };

  const handleLevel2OptionToggle = (option: Level2Product) => {
    console.log('Level2OptionToggle called with option:', option.name, 'chassisType:', option.chassisType);
    
    // Check if this is a single-selection context (clear other selections first)
    setSelectedLevel2Options([]);
    
    // If the option has a chassis type and it's not 'N/A', show chassis config
    if (option.chassisType && option.chassisType !== 'N/A') {
      console.log('Showing chassis configuration for:', option.name);
      setConfiguringChassis(option);
      setSelectedChassis(option);
      setSlotAssignments({});
      setSelectedSlot(null);
      return;
    }

    // For N/A chassis type or no chassis type, add directly to BOM
    console.log('Adding N/A chassis product directly to BOM:', option.name);
    handleAddToBOM(option);
  };

const handleChassisSelect = (chassis: Level2Product) => {
  console.log('Chassis selected:', chassis.name, 'chassisType:', chassis.chassisType);
  setSelectedChassis(chassis);

  if (chassis.chassisType && chassis.chassisType !== 'N/A') {
    console.log('Setting up chassis configuration for:', chassis.name);
    setConfiguringChassis(chassis);
    setSlotAssignments({});
    setSelectedSlot(null);

    // Load admin config and codes for this chassis
    (async () => {
      try {
        const [cfg, codes, l3] = await Promise.all([
          productDataService.getPartNumberConfig(chassis.id),
          productDataService.getPartNumberCodesForLevel2(chassis.id),
          productDataService.getLevel3ProductsForLevel2(chassis.id)
        ]);
        setPnConfig(cfg);
        setCodeMap(codes);
        setLevel3Products(l3);
        setAutoPlaced(false);
      } catch (e) {
        console.error('Failed to load PN config/codes for chassis:', e);
      }
    })();

    setTimeout(() => {
      const configSection = document.getElementById('chassis-configuration');
      if (configSection) {
        configSection.scrollIntoView({ behavior: 'smooth' });
      }
    }, 100);
  } else {
    handleAddToBOM(chassis);
  }
};

  const handleAddChassisToBOM = () => {
    if (!selectedChassis) return;
    
    console.log('Adding chassis configuration to BOM:', selectedChassis.name);
    
    // Check if we're editing an existing item
    if (editingOriginalItem) {
      // Update the existing item with new configuration
      const updatedItem: BOMItem = {
        ...editingOriginalItem,
        slotAssignments: { ...slotAssignments }
      };
      
      // Find and update the existing item in BOM
      const updatedItems = bomItems.map(item => 
        item.id === editingOriginalItem.id ? updatedItem : item
      );
      
      setBomItems(updatedItems);
      onBOMUpdate(updatedItems);
      setEditingOriginalItem(null);
      
      toast({
        title: 'Configuration Updated',
        description: `${selectedChassis.name} configuration has been updated.`,
      });
    } else {
      // Create new chassis item
      const chassisItem: BOMItem = {
        id: `${selectedChassis.id}-${Date.now()}`,
        product: selectedChassis,
        quantity: 1,
        enabled: true,
        slotAssignments: { ...slotAssignments }
      };
      
      // Add to BOM
      setBomItems(prev => [...prev, chassisItem]);
      onBOMUpdate([...bomItems, chassisItem]);
      
      toast({
        title: 'Chassis Configuration Added',
        description: `${selectedChassis.name} configuration has been added to your bill of materials.`,
      });
    }
    
    // Reset chassis configuration state
    setConfiguringChassis(null);
    setSelectedChassis(null);
    setSlotAssignments({});
    setSelectedSlot(null);
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


  const handleRemoteDisplayToggle = (enabled: boolean) => {
    setHasRemoteDisplay(enabled);
  };

const handleAddChassisAndCardsToBOM = () => {
  if (!selectedChassis) return;

  const consolidated = consolidateQTMSConfiguration(
    selectedChassis,
    slotAssignments,
    hasRemoteDisplay,
    {},
    {}
  );

  // Include outside-chassis standard items from admin config
  if (codeMap && level3Products.length) {
    Object.entries(codeMap).forEach(([l3Id, def]) => {
      if (def?.outside_chassis && def?.is_standard) {
        const product = level3Products.find(p => p.id === l3Id);
        if (product && !consolidated.components.some(c => c.product.id === product.id)) {
          consolidated.components.push({
            id: `${Date.now()}-outside-${l3Id}`,
            product: product as any,
            quantity: 1,
            enabled: true,
            partNumber: product.partNumber
          });
        }
      }
    });
  }

  // Recalculate total price to include outside-chassis items
  consolidated.price = consolidated.components.reduce((sum, item) => sum + (item.product.price || 0), 0);

  const bomItem = createQTMSBOMItem(consolidated);

  const updatedItems = [...bomItems, bomItem];
  setBomItems(updatedItems);
  onBOMUpdate(updatedItems);

  setSelectedChassis(null);
  setSlotAssignments({});
  setSelectedSlot(null);
  setHasRemoteDisplay(false);
};

  const handleBOMConfigurationEdit = (item: BOMItem) => {
    console.log('Editing BOM item configuration:', item);
    
    // Check if this is a chassis-configured item (has slot assignments)
    if (item.slotAssignments || (item.product as any).chassisType && (item.product as any).chassisType !== 'N/A') {
      console.log('Editing chassis configuration for:', item.product.name);
      
      // Set up the chassis for editing
      setSelectedChassis(item.product as Level2Product);
      setSlotAssignments(item.slotAssignments || {});
      setConfiguringChassis(item.product as Level2Product);
      
      // Store the original item for restoration if edit is cancelled
      setEditingOriginalItem(item);
      
      // Scroll to configuration section
      setTimeout(() => {
        const configSection = document.getElementById('chassis-configuration');
        if (configSection) {
          configSection.scrollIntoView({ behavior: 'smooth' });
        }
      }, 100);
      
    } else if (item.product.name?.includes('QTMS') && item.configuration) {
      // Handle QTMS-specific configuration
      const consolidatedQTMS: ConsolidatedQTMS = {
        id: item.id || `qtms-${Date.now()}`,
        name: item.product.name,
        description: item.product.description || '',
        partNumber: item.partNumber || item.product.partNumber || '',
        price: item.product.price || 0,
        configuration: item.configuration as QTMSConfiguration,
        components: []
      };
      setEditingQTMS(consolidatedQTMS);
    } else {
      // For other configurable items (Level 4, analog cards, etc.)
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
          product_type: 'standard',
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

  const renderProductContent = (productId: string) => {
    console.group(`[BOMBuilder] Rendering product content for: ${productId}`);
    const product = level1Products.find(p => p.id === productId);
    if (!product) {
      console.error(`Product not found for ID: ${productId}`);
      console.groupEnd();
      return null;
    }

    // If we're configuring a chassis, show the chassis configuration UI
    if (configuringChassis) {
      console.log('Rendering chassis configuration for:', configuringChassis.name);
      return (
        <div id="chassis-configuration" className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold text-white">
              Configure {configuringChassis.name}
            </h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setConfiguringChassis(null);
                setSelectedChassis(null);
                setSlotAssignments({});
                setSelectedSlot(null);
              }}
            >
              Back to Products
            </Button>
          </div>
          
<RackVisualizer
  chassis={{
    ...configuringChassis,
    type: configuringChassis.chassisType || configuringChassis.type || 'chassis',
    height: configuringChassis.specifications?.height || '6U',
    slots: configuringChassis.specifications?.slots || 0
  }}
  slotAssignments={slotAssignments}
  selectedSlot={selectedSlot}
  onSlotClick={handleSlotClick}
  onSlotClear={handleSlotClear}
  hasRemoteDisplay={hasRemoteDisplay}
  onRemoteDisplayToggle={handleRemoteDisplayToggle}
  standardSlotHints={standardSlotHints}
  colorByProductId={colorByProductId}
/>
          
{selectedSlot !== null && (
  <SlotCardSelector
    chassis={configuringChassis}
    slot={selectedSlot}
    onCardSelect={handleCardSelect}
    onClose={() => setSelectedSlot(null)}
    canSeePrices={canSeePrices}
    currentSlotAssignments={slotAssignments}
    codeMap={codeMap}
    pnConfig={pnConfig}
  />
)}
          
          <div className="flex justify-end space-x-4">
            <Button 
              variant="outline"
              onClick={() => {
                setConfiguringChassis(null);
                setSelectedChassis(null);
                setSlotAssignments({});
                setSelectedSlot(null);
              }}
              className="text-gray-300 border-gray-600 hover:text-white hover:border-gray-400"
            >
              Cancel
            </Button>
            <Button 
              onClick={handleAddChassisToBOM}
              disabled={Object.keys(slotAssignments).length === 0}
              className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
            >
              Add to BOM
            </Button>
          </div>
        </div>
      );
    }

    // QTMS tab - show chassis selector or configuration
    if (productId.toLowerCase() === 'qtms') {
      console.log('Rendering QTMS tab content, configuringChassis:', configuringChassis);
      
      // If configuring a chassis, show rack visualizer
      if (configuringChassis && selectedChassis) {
        return (
          <div className="space-y-6">
            <div className="bg-gray-800 p-6 rounded-lg border border-gray-700">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-xl font-semibold text-white">Configure {selectedChassis.name}</h3>
                 <Button
                   variant="outline"
                   onClick={() => {
                     setConfiguringChassis(null);
                     setSelectedChassis(null);
                     setSlotAssignments({});
                     setSelectedSlot(null);
                   }}
                   className="text-gray-300 border-gray-600 hover:text-white hover:border-gray-400"
                 >
                   Back to Products
                 </Button>
               </div>

<RackVisualizer
  chassis={{
    ...selectedChassis,
    type: selectedChassis.chassisType || selectedChassis.type || 'chassis',
    height: selectedChassis.specifications?.height || '6U',
    slots: selectedChassis.specifications?.slots || 0
  }}
  slotAssignments={slotAssignments}
  onSlotClick={handleSlotClick}
  onSlotClear={handleSlotClear}
  selectedSlot={selectedSlot}
  hasRemoteDisplay={hasRemoteDisplay}
  onRemoteDisplayToggle={handleRemoteDisplayToggle}
  standardSlotHints={standardSlotHints}
  colorByProductId={colorByProductId}
/>
             </div>

{selectedSlot !== null && (
  <SlotCardSelector
    chassis={selectedChassis}
    slot={selectedSlot}
    onCardSelect={handleCardSelect}
    onClose={() => setSelectedSlot(null)}
    canSeePrices={canSeePrices}
    currentSlotAssignments={slotAssignments}
    codeMap={codeMap}
    pnConfig={pnConfig}
  />
)}

             <div className="flex gap-4 justify-end">
               <Button
                 variant="outline"
                 onClick={() => {
                   setConfiguringChassis(null);
                   setSelectedChassis(null);
                   setSlotAssignments({});
                   setSelectedSlot(null);
                 }}
                 className="text-gray-300 border-gray-600 hover:text-white hover:border-gray-400"
               >
                 Cancel
               </Button>
              <Button 
                onClick={handleAddChassisToBOM}
                disabled={Object.keys(slotAssignments).length === 0}
                className="bg-green-600 hover:bg-green-700 text-white disabled:opacity-50"
              >
                Add to BOM
              </Button>
            </div>
          </div>
        );
      }

      // Otherwise, show chassis selector
      return (
        <div className="space-y-6">
          <ChassisSelector
            onChassisSelect={handleChassisSelect}
            selectedChassis={selectedChassis}
            onAddToBOM={handleAddToBOM}
            canSeePrices={canSeePrices}
          />
        </div>
      );
    }

    // For other Level 1 products, only show Level 2 options selector
    // Level 1 products should not have direct "Add to BOM" buttons
    return (
      <div className="space-y-6">
        <Level2OptionsSelector
          level1Product={product}
          selectedOptions={selectedLevel2Options}
          onOptionToggle={handleLevel2OptionToggle}
          onChassisSelect={handleChassisSelect}
          onAddToBOM={handleAddToBOM}
          canSeePrices={canSeePrices}
        />
      </div>
    );
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

      {/* Main Layout: Product Selection (Left) and BOM Display (Right) */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selection - Left Side (2/3 width) */}
        <div className="lg:col-span-2">
          <Card>
            <CardHeader>
              <CardTitle>Product Selection</CardTitle>
              <CardDescription>
                Select products to add to your Bill of Materials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={(value) => {
                // Add loading state to prevent UI lag
                setIsLoading(true);
                
                setActiveTab(value);
                const selectedProduct = level1Products.find(p => p.id === value);
                setSelectedLevel1Product(selectedProduct || null);
                
                // Clear relevant state when switching tabs
                setSelectedChassis(null);
                setSlotAssignments({});
                setSelectedSlot(null);
                setHasRemoteDisplay(false);
                
                console.log('Tab switching to:', value, 'Product:', selectedProduct);
                
                // Remove loading state after brief delay for smooth transition
                setTimeout(() => setIsLoading(false), 100);
              }}>
                <TabsList className="grid w-full grid-cols-3">
                  {level1Products.map(product => (
                    <TabsTrigger key={product.id} value={product.id}>
                      {product.name}
                    </TabsTrigger>
                  ))}
                </TabsList>

                {level1Products.map(product => (
                  <TabsContent key={product.id} value={product.id}>
                    {renderProductContent(product.id)}
                  </TabsContent>
                ))}
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* BOM Display - Right Side (1/3 width, sticky) */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <BOMDisplay
              bomItems={bomItems}
              onUpdateBOM={handleBOMUpdate}
              onEditConfiguration={handleBOMConfigurationEdit}
              onSubmitQuote={submitQuoteRequest}
              canSeePrices={canSeePrices}
            />
          </div>
        </div>
      </div>

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
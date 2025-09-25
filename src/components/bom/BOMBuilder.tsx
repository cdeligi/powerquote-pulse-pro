import { useState, useEffect, useMemo } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { BOMItem, Level1Product, Level2Product, Level3Product, Level3Customization } from '@/types/product';
import Level2OptionsSelector from './Level2OptionsSelector';
import ChassisSelector from './ChassisSelector';
import RackVisualizer from './RackVisualizer';
import AccessoryList from './AccessoryList';
import SlotCardSelector from './SlotCardSelector';
import BOMDisplay from './BOMDisplay';
import { EnhancedBOMDisplay } from './EnhancedBOMDisplay';
import AnalogCardConfigurator from './AnalogCardConfigurator';
import BushingCardConfigurator from './BushingCardConfigurator';
import NonChassisConfigurator from './NonChassisConfigurator';

import { Level4RuntimePayload } from "@/types/level4";
import { Level4RuntimeModal } from "../level4/Level4RuntimeModal";

import { productDataService } from '@/services/productDataService';
import QuoteFieldsSection from './QuoteFieldsSection';

import { getSupabaseClient, getSupabaseAdminClient, isAdminAvailable } from "@/integrations/supabase/client";

const supabase = getSupabaseClient();
const supabaseAdmin = getSupabaseAdminClient();;
import { toast } from '@/components/ui/use-toast';
import QTMSConfigurationEditor from './QTMSConfigurationEditor';
import { consolidateQTMSConfiguration, createQTMSBOMItem, ConsolidatedQTMS, QTMSConfiguration } from '@/utils/qtmsConsolidation';
import { buildQTMSPartNumber } from '@/utils/qtmsPartNumberBuilder';
import { findOptimalBushingPlacement, findExistingBushingSlots, isBushingCard } from '@/utils/bushingValidation';
import { useAuth } from '@/hooks/useAuth';
import { useQuoteValidation } from './QuoteFieldValidation';
import { usePermissions, FEATURES } from '@/hooks/usePermissions';

interface BOMBuilderProps {
  onBOMUpdate: (items: BOMItem[]) => void;
  canSeePrices: boolean;
  canSeeCosts?: boolean;
}

const SLOT_LEVEL4_FLAG = '__slotLevel4Session';

const BOMBuilder = ({ onBOMUpdate, canSeePrices, canSeeCosts = false }: BOMBuilderProps) => {
  // ALL HOOKS MUST BE AT THE TOP - NO CONDITIONAL RETURNS BEFORE HOOKS
  const { user, loading } = useAuth();
  const { has } = usePermissions();

  // Compute permissions
  const canEditPN = has(FEATURES.BOM_EDIT_PART_NUMBER);
  const canForcePN = has(FEATURES.BOM_FORCE_PART_NUMBER);

  const [selectedLevel1Product, setSelectedLevel1Product] = useState<Level1Product | null>(null);
  const [selectedLevel2Options, setSelectedLevel2Options] = useState<Level2Product[]>([]);
  const [selectedChassis, setSelectedChassis] = useState<Level2Product | null>(null);
  const [slotAssignments, setSlotAssignments] = useState<Record<number, Level3Product>>({});
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');
  const [hasRemoteDisplay, setHasRemoteDisplay] = useState<boolean>(false);
  const [configuringLevel4Item, setConfiguringLevel4Item] = useState<BOMItem | null>(null);
  const [quoteFields, setQuoteFields] = useState<Record<string, any>>({});
  const [discountPercentage, setDiscountPercentage] = useState<number>(0);
  const [discountJustification, setDiscountJustification] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [editingQTMS, setEditingQTMS] = useState<ConsolidatedQTMS | null>(null);
  const [configuringChassis, setConfiguringChassis] = useState<Level2Product | null>(null);
  const [editingOriginalItem, setEditingOriginalItem] = useState<BOMItem | null>(null);
  const [configuringNonChassis, setConfiguringNonChassis] = useState<Level2Product | null>(null);
  
  // Draft quote functionality
  const [currentQuoteId, setCurrentQuoteId] = useState<string | null>(null);
  const [isDraftMode, setIsDraftMode] = useState(false);

  // Admin-driven part number config and codes for the selected chassis
  const [pnConfig, setPnConfig] = useState<any | null>(null);
  const [codeMap, setCodeMap] = useState<Record<string, { template: string; slot_span: number; is_standard?: boolean; standard_position?: number | null; designated_only?: boolean; designated_positions?: number[]; outside_chassis?: boolean; notes?: string | null; exclusive_in_slots?: boolean; color?: string | null }>>({});
  const [level3Products, setLevel3Products] = useState<Level3Product[]>([]);
  const [autoPlaced, setAutoPlaced] = useState(false);
  const [selectedAccessories, setSelectedAccessories] = useState<Set<string>>(new Set());

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
    const colorMap: Record<string, string | null> = {};
    Object.entries(codeMap).forEach(([l3Id, config]) => {
      colorMap[l3Id] = config.color || null;
    });
    return colorMap;
  }, [codeMap]);

  // Helper to handle BOM item updates without mutating state directly 
  const updateBomItemById = (bomItemId: string, updater: (item: BOMItem) => BOMItem) => {
    setBomItems(prev => {
      const next = [...prev];
      const idx = next.findIndex(item => item.id === bomItemId);
      if (idx >= 0) {
        next[idx] = updater(next[idx]);
      }
      return next;
    });
  };

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

  // Initialize or load draft quote on component mount - REMOVED AUTO-CREATION
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const quoteIdFromUrl = urlParams.get('quoteId');
    
    if (quoteIdFromUrl) {
      // Load existing draft quote
      setCurrentQuoteId(quoteIdFromUrl);
      setIsDraftMode(true);
      loadDraftQuote(quoteIdFromUrl);
    }
    // Removed automatic draft creation - user must manually save as draft
  }, []);

  const createDraftQuote = async () => {
    if (!user?.id) {
      console.error('No user ID available for draft quote creation');
      toast({
        title: 'Error',
        description: 'User not authenticated. Please log in again.',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      console.log('Creating draft quote for user:', user.id);
      
      // Generate quote ID using the new RPC function for drafts with email prefix
      const { data: quoteId, error: idError } = await supabase
        .rpc('generate_quote_id', { user_email: user.email, is_draft: true });
          
      if (idError || !quoteId) {
        console.error('Error generating quote ID:', idError);
        toast({
          title: 'Error',
          description: 'Failed to generate quote ID. Please try again.',
          variant: 'destructive'
        });
        return;
      }
      
      console.log('Generated draft quote ID:', quoteId);
      
      // Create the draft quote record
      const { error } = await supabase
        .from('quotes')
        .insert({
          id: quoteId,
          user_id: user.id,
          status: 'draft',
          original_quote_value: 0,
          discounted_value: 0,
          total_cost: 0,
          gross_profit: 0,
          original_margin: 0,
          discounted_margin: 0,
          requested_discount: 0,
          priority: 'Medium',
          customer_name: '',
          oracle_customer_id: '',
          sfdc_opportunity: '',
          shipping_terms: '',
          payment_terms: '',
          currency: 'USD',
          is_rep_involved: false,
          submitted_by_name: user.name || user.email || 'Unknown User',
          submitted_by_email: user.email || ''
        });
        
      if (error) throw error;
      
      setCurrentQuoteId(quoteId);
      setIsDraftMode(true);
      
      // Update URL without page reload
      window.history.replaceState({}, '', `/#configure?quoteId=${quoteId}`);
      
      toast({
        title: 'Draft Created',
        description: `Draft quote ${quoteId} created. Your progress will be automatically saved.`
      });
    } catch (error) {
      console.error('Error creating draft quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to create draft quote',
        variant: 'destructive'
      });
    }
  };

  const loadDraftQuote = async (quoteId: string) => {
    try {
      setIsLoading(true);
      console.log('Loading draft quote:', quoteId);
      
      // Load quote data
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();
        
      if (quoteError) throw quoteError;
      
      if (!quote) {
        console.log('No quote found with ID:', quoteId);
        return;
      }
      
      console.log('Loaded quote:', quote);
      
      // Load BOM items with Level 4 configurations
      const { data: bomData, error: bomError } = await supabase
        .from('bom_items')
        .select(`
          *,
          bom_level4_values (
            id,
            level4_config_id,
            entries
          )
        `)
        .eq('quote_id', quoteId);
        
      if (bomError) throw bomError;
      
      console.log('Loaded BOM items:', bomData);
      
      // Convert BOM items back to local format with proper structure
      const loadedItems: BOMItem[] = (bomData || []).map(item => ({
        id: item.id,
        product: {
          id: item.product_id,
          name: item.name,
          partNumber: item.part_number,
          price: item.unit_price,
          cost: item.unit_cost,
          description: item.description,
          ...item.configuration_data
        },
        quantity: item.quantity,
        enabled: true,
        partNumber: item.part_number,
        level4Values: item.bom_level4_values || []
      }));
      
      setBomItems(loadedItems);
      
      // Restore quote fields
      if (quote.quote_fields) {
        setQuoteFields(quote.quote_fields);
      }
      
      // Restore discount settings
      if (quote.requested_discount) {
        setDiscountPercentage(quote.requested_discount);
      }
      
      if (quote.discount_justification) {
        setDiscountJustification(quote.discount_justification);
      }
      
      toast({
        title: 'Draft Loaded',
        description: `Loaded draft quote ${quoteId} with ${loadedItems.length} items`
      });
    } catch (error) {
      console.error('Error loading draft quote:', error);
      toast({
        title: 'Error',
        description: 'Failed to load draft quote',
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  const saveDraftQuote = async (autoSave = false) => {
    if (!currentQuoteId || !user?.id) return;
    
    try {
      // Calculate totals
      const totalValue = bomItems.reduce((sum, item) => 
        sum + (item.product.price * item.quantity), 0
      );
      
      const totalCost = bomItems.reduce((sum, item) => 
        sum + ((item.product.cost || 0) * item.quantity), 0
      );
      
      const discountedValue = totalValue * (1 - discountPercentage / 100);
      const grossProfit = discountedValue - totalCost;
      const originalMargin = totalValue > 0 ? ((totalValue - totalCost) / totalValue) * 100 : 0;
      const discountedMargin = discountedValue > 0 ? (grossProfit / discountedValue) * 100 : 0;
      
      // Update quote record
      const { error } = await supabase
        .from('quotes')
        .update({
          original_quote_value: totalValue,
          discounted_value: discountedValue,
          total_cost: totalCost,
          gross_profit: grossProfit,
          original_margin: originalMargin,
          discounted_margin: discountedMargin,
          requested_discount: discountPercentage,
          discount_justification: discountJustification,
          quote_fields: quoteFields,
          updated_at: new Date().toISOString()
        })
        .eq('id', currentQuoteId);
        
      if (error) throw error;
      
      // Delete existing BOM items and recreate
      await supabase
        .from('bom_items')
        .delete()
        .eq('quote_id', currentQuoteId);
        
      if (bomItems.length > 0) {
        const bomInserts = bomItems.map(item => ({
          quote_id: currentQuoteId,
          product_id: item.product.id,
          name: item.product.name,
          description: item.product.description || '',
          part_number: item.partNumber || item.product.partNumber || '',
          quantity: item.quantity,
          unit_price: item.product.price,
          unit_cost: item.product.cost || 0,
          total_price: item.product.price * item.quantity,
          total_cost: (item.product.cost || 0) * item.quantity,
          margin: item.product.price > 0 ? (((item.product.price - (item.product.cost || 0)) / item.product.price) * 100) : 0,
          configuration_data: item.product
        }));
        
        const { error: bomError } = await supabase
          .from('bom_items')
          .insert(bomInserts);
          
        if (bomError) throw bomError;
      }
      
      if (!autoSave) {
        toast({
          title: 'Draft Saved',
          description: 'Your quote has been saved as a draft'
        });
      }
    } catch (error) {
      console.error('Error saving draft:', error);
      if (!autoSave) {
        toast({
          title: 'Error',
          description: 'Failed to save draft',
          variant: 'destructive'
        });
      }
    }
  };

  // Auto-save draft every 30 seconds
  useEffect(() => {
    if (!currentQuoteId || !isDraftMode) return;
    
    const autoSaveInterval = setInterval(() => {
      saveDraftQuote(true);
    }, 30000); // 30 seconds
    
    return () => clearInterval(autoSaveInterval);
  }, [currentQuoteId, isDraftMode, bomItems, quoteFields]);

  // Use quote validation hook
  const { validation, validateFields } = useQuoteValidation(quoteFields, availableQuoteFields);

  // Fixed field change handler to match expected signature
  const handleQuoteFieldChange = (fieldId: string, value: any) => {
    setQuoteFields(prev => ({ ...prev, [fieldId]: value }));
  };

  // Load Level 1 products for dynamic tabs - use real Supabase data
  const [level1Products, setLevel1Products] = useState<Level1Product[]>([]);
  const [allLevel2Products, setAllLevel2Products] = useState<Level2Product[]>([]);
  const [allLevel3Products, setAllLevel3Products] = useState<Level3Product[]>([]);
  const [level1Loading, setLevel1Loading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadAllProducts = async () => {
      try {
        const [l1, l2, l3] = await Promise.all([
          productDataService.getLevel1Products(),
          productDataService.getLevel2Products(),
          productDataService.getLevel3Products(),
        ]);
        setLevel1Products(l1.filter(p => p.enabled));
        setAllLevel2Products(l2);
        setAllLevel3Products(l3);
      } catch (error) {
        console.error('Error loading all products:', error);
        setLevel1Products([]);
        setAllLevel2Products([]);
        setAllLevel3Products([]);
      } finally {
        setLevel1Loading(false);
      }
    };

    loadAllProducts();
  }, []);

  useEffect(() => {
    // TODO: Add logic here if this useEffect was intended to perform an action
  }, [level3Products, codeMap, selectedAccessories]);

  const productMap = useMemo(() => {
    const map = new Map<string, string>();
    [...level1Products, ...allLevel2Products, ...allLevel3Products].forEach(p => {
      map.set(p.id, p.displayName || p.name);
    });
    return map;
  }, [level1Products, allLevel2Products, allLevel3Products]);

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
      if (product && product.id !== selectedLevel1Product?.id) {
        console.log('Selecting new Level 1 product:', product);
        setSelectedLevel1Product(product);
        setSelectedLevel2Options([]);
        setSelectedChassis(null);
        setSlotAssignments({});
        setSelectedSlot(null);
      }
    }
  }, [activeTab, level1Products, selectedLevel1Product]);

  const handleAddToBOM = (item: BOMItem) => {
    console.log('Adding item to BOM:', item);
    const updatedItems = [...bomItems, item];
    setBomItems(updatedItems);
    onBOMUpdate(updatedItems);
  };

  const renderConfiguringNonChassisModal = () => {
    if (!configuringNonChassis) return null;

    // Get the product hierarchy for the configuration
    const level1Product = configuringNonChassis;
    const chassisType = configuringNonChassis.chassisType || 'Unknown';

    // Get part number config for this chassis
    const pnConfig = pnConfig;
    const level2Id = configuringNonChassis.id;
    const level2Product = configuringNonChassis;

    // Get available accessories if any
    const availableAccessories = selectedAccessories || new Set<string>();
    const accessoryProducts = level3Products.filter(p => availableAccessories.has(p.id));

    // Handle configuration complete
    const handleConfigurationComplete = (items: BOMItem[]) => {
      const updatedBOM = [...bomItems, ...items];
      setBomItems(updatedBOM);
      onBOMUpdate(updatedBOM);
      
      // Clear states
      setConfiguringNonChassis(null);
      setSelectedAccessories(new Set());
    };

    return (
      <NonChassisConfigurator
        level2Product={level2Product}
        level3Products={accessoryProducts}
        onComplete={handleConfigurationComplete}
        onCancel={() => setConfiguringNonChassis(null)}
        canSeePrices={canSeePrices}
      />
    );
  };

  const handleLevel2OptionAdd = (level2Product: Level2Product) => {
    const updatedOptions = [...selectedLevel2Options, level2Product];
    setSelectedLevel2Options(updatedOptions);
  };

  const handleSelectChassis = async (chassis: Level2Product) => {
    console.log('Chassis selected in BOMBuilder:', chassis);
    
    // Clear previous chassis state
    setConfiguringChassis(null);
    setSelectedChassis(chassis);
    setSlotAssignments({});
    setSelectedSlot(null);
    
    // Load part number configuration and level 3 products for this chassis
    try {
      const [pnConfigData, codes, level3Data] = await Promise.all([
        productDataService.getPartNumberConfig(chassis.id),
        productDataService.getPartNumberCodes(),
        productDataService.getLevel3Products()
      ]);
      
      setPnConfig(pnConfigData);
      setCodeMap(codes);
      setLevel3Products(level3Data);
      setAutoPlaced(false);
      
      // Handle accessory selection automatically
      if (selectedAccessories.size > 0) {
        console.log('Selected accessories:', Array.from(selectedAccessories));
      }
    } catch (error) {
      console.error('Error loading chassis configuration:', error);
    }
    
    // Set configuration mode
    setSelectedChassis(chassis);
    
    if (chassis.chassisType && chassis.chassisType !== 'Non-Rack') {
      setConfiguringChassis(chassis);
      setSlotAssignments({});
      setSelectedSlot(null);
    } else {
      // Handle non-chassis configuration
      try {
        const pnConfig = await productDataService.getPartNumberConfig(chassis.id);
        const codes = await productDataService.getPartNumberCodes();
        const level3Products = await productDataService.getLevel3Products();
        setPnConfig(pnConfig);
        setCodeMap(codes);
        setLevel3Products(level3Products);
        setAutoPlaced(false);
      } catch (error) {
        console.error('Error loading configuration:', error);
      }
      
      setConfiguringNonChassis(chassis);
    }
  };

  const handleNonChassisCancel = () => {
    setConfiguringNonChassis(null);
  };

  const handleSlotClick = (slotNumber: number) => {
    console.log('Slot clicked:', slotNumber);
    setSelectedSlot(slotNumber);
  };

  const handleCardSelect = async (product: Level3Product, slotNumber: number | null) => {
    console.log('Card selected for slot:', product, slotNumber);
    
    if (!product || slotNumber === null) return;
    
    // Update slot assignments
    setSlotAssignments(prev => ({
      ...prev,
      [slotNumber]: product
    }));
    
    // Check if this product requires Level 4 configuration
    if (product.requiresLevel4Config) {
      console.log('Product requires Level 4 configuration');
      
      // Create a temporary BOM item for Level 4 configuration
      const tempBomItem: BOMItem = {
        id: `temp-${Date.now()}`,
        product: {
          id: product.id,
          name: product.name,
          partNumber: product.partNumber,
          price: product.price,
          cost: product.cost,
          description: product.description,
          slot: slotNumber
        },
        quantity: 1,
        enabled: true,
        partNumber: product.partNumber,
        slotNumber
      };
      
      setConfiguringLevel4Item(tempBomItem);
    }
    
    setSelectedSlot(null);
  };

  const handleLevel4Setup = (bomItem: BOMItem) => {
    if (!user?.id) {
      console.error('No user available for Level 4 setup');
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to configure Level 4 items.',
        variant: 'destructive'
      });
      return;
    }

    console.log('Setting up Level 4 configuration for:', bomItem.product.name, 'User:', user.email, 'BOM Item:', bomItem);
    setConfiguringLevel4Item(bomItem);
  };

  const handleLevel4Save = (updatedBomItem: BOMItem, level4Values: any[]) => {
    console.log('Saving Level 4 configuration:', updatedBomItem, level4Values);
    
    // Check if it's a temporary item (from slot selection)
    if (updatedBomItem.id.startsWith('temp-')) {
      // Generate a proper ID and add to BOM
      const newBomItem: BOMItem = {
        ...updatedBomItem,
        id: `bom-${Date.now()}`,
        level4Values
      };
      
      // Find slot assignments and other calculations
      const slot = updatedBomItem.slotNumber || 0;
      const slotAssignment = slotAssignments[slot];
      
      if (slotAssignment) {
        // Add the configured item to BOM
        const updatedBOM = [...bomItems, newBomItem];
        setBomItems(updatedBOM);
        onBOMUpdate(updatedBOM);
      }
    } else {
      // Update existing BOM item
      const updatedBOM = bomItems.map(item => 
        item.id === updatedBomItem.id 
          ? { ...updatedBomItem, level4Values }
          : item
      );
      setBomItems(updatedBOM);
      onBOMUpdate(updatedBOM);
    }
    
    setConfiguringLevel4Item(null);
  };

  const handleLevel4Cancel = () => {
    console.log('Level 4 configuration cancelled');
    setConfiguringLevel4Item(null);
  };

  const handleBOMConfigurationEdit = (bomItem: BOMItem) => {
    console.log('Editing BOM configuration:', bomItem);
    if (bomItem.product && bomItem.product.id) {
      setEditingOriginalItem(bomItem);
      setConfiguringLevel4Item(bomItem);
    }
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
      // Generate or finalize quote ID based on whether we're submitting a draft
      let quoteId: string;
      let isSubmittingExistingDraft = false;
      
      if (currentQuoteId && currentQuoteId.includes('-Draft')) {
        // We're submitting an existing draft - finalize the ID
        const { data: finalizedId, error: finalizeError } = await supabase
          .rpc('finalize_draft_quote_id', { draft_quote_id: currentQuoteId });
        
        if (finalizeError) {
          console.error('Error finalizing draft quote ID:', finalizeError);
          throw finalizeError;
        }
        
        quoteId = finalizedId;
        isSubmittingExistingDraft = true;
      } else {
        // Generate new quote ID for final submission with email prefix
        const { data: newQuoteId, error: generateError } = await supabase
          .rpc('generate_quote_id', { user_email: user.email, is_draft: false });
        
        if (generateError) {
          console.error('Error generating quote ID:', generateError);
          throw generateError;
        }
        
        quoteId = newQuoteId;
      }

      console.log('Using quote ID:', quoteId, 'Is existing draft:', isSubmittingExistingDraft);

      // Calculate values
      const originalQuoteValue = bomItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const discountedValue = originalQuoteValue * (1 - discountPercentage / 100);
      const totalCost = bomItems.reduce((sum, item) => sum + ((item.product.cost || 0) * item.quantity), 0);
      const grossProfit = discountedValue - totalCost;
      const discountedMargin = discountedValue > 0 ? (grossProfit / discountedValue) * 100 : 0;

      console.log('Calculated values:', { originalQuoteValue, discountedValue, totalCost, grossProfit, discountedMargin });

      let quoteError: any = null;

      if (isSubmittingExistingDraft && currentQuoteId) {
        // Update existing quote from draft to submitted
        const { error } = await supabase
          .from('quotes')
          .update({
            id: quoteId,
            status: 'pending_approval',
            customer_name: quoteFields.customerName,
            oracle_customer_id: quoteFields.oracleCustomerId,
            sfdc_opportunity: quoteFields.sfdcOpportunity,
            original_quote_value: originalQuoteValue,
            requested_discount: discountPercentage,
            discount_justification: discountJustification,
            discounted_value: discountedValue,
            total_cost: totalCost,
            gross_profit: grossProfit,
            original_margin: originalQuoteValue > 0 ? ((originalQuoteValue - totalCost) / originalQuoteValue) * 100 : 0,
            discounted_margin: discountedMargin,
            quote_fields: quoteFields,
            priority: 'Medium',
            currency: 'USD',
            payment_terms: 'Net 30',
            shipping_terms: 'FOB Origin',
            updated_at: new Date().toISOString()
          })
          .eq('id', currentQuoteId);
        quoteError = error;
      } else {
        // Insert new quote
        const { error } = await supabase
          .from('quotes').insert({
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
        quoteError = error;
      }

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

      if (isSubmittingExistingDraft) {
        // Update existing BOM items with new quote ID
        const { error: updateBomError } = await supabase
          .from('bom_items')
          .update({ quote_id: quoteId })
          .eq('quote_id', currentQuoteId);
        
        if (updateBomError) {
          console.error('SUPABASE BOM UPDATE ERROR:', updateBomError);
          toast({
            title: 'BOM Update Error',
            description: updateBomError.message || 'Failed to update BOM items',
            variant: 'destructive',
          });
          throw updateBomError;
        }
      } else {
        // Insert new BOM items
        const bomInserts = bomItems.map((item, index) => ({
          quote_id: quoteId,
          product_id: item.product.id,
          name: item.product.name,
          description: item.product.description || '',
          part_number: item.partNumber || item.product.partNumber || '',
          quantity: item.quantity,
          unit_price: item.product.price,
          unit_cost: item.product.cost || 0,
          total_price: item.product.price * item.quantity,
          total_cost: (item.product.cost || 0) * item.quantity,
          margin: item.product.price > 0 ? (((item.product.price - (item.product.cost || 0)) / item.product.price) * 100) : 0,
          configuration_data: item.product,
          original_unit_price: item.product.price,
          approved_unit_price: item.product.price
        }));

        console.log('Inserting BOM items:', bomInserts);

        const { error: bomError } = await supabase
          .from('bom_items')
          .insert(bomInserts);

        if (bomError) {
          console.error('SUPABASE BOM ERROR:', bomError);
          toast({
            title: 'BOM Error',
            description: bomError.message || 'Failed to insert BOM items',
            variant: 'destructive',
          });
          throw bomError;
        }
      }

      // Send notifications to admins
      try {
        console.log('Sending quote notifications...');
        const { data: notificationData, error: notificationError } = await supabase.functions.invoke('send-quote-notifications', {
          body: { quoteId }
        });
        
        if (notificationError) {
          console.warn('Failed to send notifications:', notificationError);
        } else {
          console.log('Notifications sent successfully:', notificationData);
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
    console.log(`Product found:`, product);
    
    if (!product) {
      console.log(`No product found for ID: ${productId}`);
      console.groupEnd();
      return <div>Product not found</div>;
    }

    console.groupEnd();

    // Show Level 2 options for selected Level 1 product
    return (
      <div className="space-y-6">
        <div className="flex flex-col gap-2">
          <Badge variant="secondary">{product.category}</Badge>
          <h3 className="text-lg font-semibold">{product.name}</h3>
          <p className="text-sm text-muted-foreground">{product.description}</p>
        </div>

        <Level2OptionsSelector
          parentProduct={product}
          onSelect={handleSelectChassis}
          onAdd={handleLevel2OptionAdd}
        />

        {/* Show chassis configuration if a chassis is selected */}
        {configuringChassis && (
          <div className="space-y-4">
            <h4 className="font-medium">Configure {configuringChassis.name}</h4>
            
            <ChassisSelector 
              selectedChassis={configuringChassis}
              slotAssignments={slotAssignments}
              onSlotClick={handleSlotClick}
              selectedSlot={selectedSlot}
              standardSlotHints={standardSlotHints}
              colorByProductId={colorByProductId}
            />

            {/* Show rack visualizer for supported chassis */}
            {configuringChassis.chassisType && (
              <RackVisualizer 
                chassisType={configuringChassis.chassisType}
                slotAssignments={slotAssignments}
                onSlotClick={handleSlotClick}
                selectedSlot={selectedSlot}
                colorByProductId={colorByProductId}
                standardSlotHints={standardSlotHints}
              />
            )}

            {/* Show card selector when a slot is selected */}
            {selectedSlot && (
              <SlotCardSelector
                slotNumber={selectedSlot}
                chassisType={configuringChassis.chassisType || ''}
                level3Products={level3Products}
                onCardSelect={handleCardSelect}
                codeMap={codeMap}
                canSeePrices={canSeePrices}
              />
            )}
          </div>
        )}

        {/* Show accessory selection */}
        {selectedLevel1Product && (
          <AccessoryList
            parentProduct={selectedLevel1Product}
            onAdd={handleAddToBOM}
            canSeePrices={canSeePrices}
          />
        )}
      </div>
    );
  };

  const handleQTMSConfigurationSave = (consolidatedQTMS: ConsolidatedQTMS) => {
    console.log('QTMS Configuration saved:', consolidatedQTMS);
    
    if (consolidatedQTMS.configurations.length > 0) {
      const bomItem = createQTMSBOMItem(consolidatedQTMS, canSeePrices);
      const updatedItems = [...bomItems, bomItem];
      setBomItems(updatedItems);
      onBOMUpdate(updatedItems);
      
      toast({
        title: 'Configuration Added',
        description: `${consolidatedQTMS.name} has been added to your bill of materials.`,
      });
    }
    
    setEditingQTMS(null);
  };

  // Early return for loading state - AFTER all hooks
  if (loading || level1Loading) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <div className="animate-spin h-8 w-8 border-b-2 border-primary mx-auto mb-4"></div>
          <p>Loading products...</p>
        </div>
      </div>
    );
  }

  // Early return for no user - AFTER all hooks
  if (!user) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">Authentication Required</p>
          <p className="text-muted-foreground">Please log in to access the BOM Builder.</p>
        </div>
      </div>
    );
  }

  if (level1Products.length === 0) {
    return (
      <div className="flex items-center justify-center p-8">
        <div className="text-center">
          <p className="text-lg font-semibold mb-2">No Products Available</p>
          <p className="text-muted-foreground">No Level 1 products found. Please contact an administrator.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto p-4 space-y-6">
      {/* Quote Fields Section */}
      <QuoteFieldsSection 
        quoteFields={quoteFields}
        onFieldChange={handleQuoteFieldChange}
        validation={validation}
        availableFields={availableQuoteFields}
      />

      {/* Main BOM Builder Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Product Selection - Left Side (2/3 width) */}
        <div className="lg:col-span-2 space-y-6">
          <Card>
            <CardHeader>
              <CardTitle>Product Selection</CardTitle>
              <CardDescription>
                Choose your products to build your Bill of Materials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs value={activeTab} onValueChange={setActiveTab}>
                <TabsList className="grid w-full grid-cols-auto overflow-x-auto">
                  {level1Products.map((product) => (
                    <TabsTrigger 
                      key={product.id} 
                      value={product.id}
                      className="whitespace-nowrap"
                    >
                      {product.displayName || product.name}
                    </TabsTrigger>
                  ))}
                  <TabsTrigger value="additional-config">Additional Config</TabsTrigger>
                </TabsList>

                {level1Products.map((product) => (
                  <TabsContent key={product.id} value={product.id} className="mt-4">
                    {renderProductContent(product.id)}
                  </TabsContent>
                ))}

                <TabsContent value="additional-config" className="mt-4">
                  <div className="space-y-4">
                    <h3 className="text-lg font-semibold">Additional Configuration Options</h3>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <Card className="cursor-pointer hover:shadow-md transition-shadow" onClick={() => {
                        // Handle QTMS configuration
                        const mockQTMS: ConsolidatedQTMS = {
                          name: 'New QTMS Configuration',
                          configurations: [],
                          totalPrice: 0,
                          totalCost: 0
                        };
                        setEditingQTMS(mockQTMS);
                      }}>
                        <CardHeader>
                          <CardTitle className="text-base">QTMS Configuration</CardTitle>
                          <CardDescription>
                            Configure Qualitrol Transformer Monitoring System
                          </CardDescription>
                        </CardHeader>
                      </Card>
                    </div>
                  </div>
                </TabsContent>
              </Tabs>
            </CardContent>
          </Card>
        </div>

        {/* BOM Display - Right Side (1/3 width, sticky) */}
        <div className="lg:col-span-1">
          <div className="sticky top-4">
            <EnhancedBOMDisplay
              bomItems={bomItems}
              onUpdateBOM={handleBOMUpdate}
              onEditConfiguration={handleBOMConfigurationEdit}
              onSubmitQuote={submitQuoteRequest}
              onSaveDraft={() => saveDraftQuote(false)}
              canSeePrices={canSeePrices}
              canSeeCosts={canSeeCosts}
              canEditPartNumber={canEditPN}
              productMap={productMap}
              isSubmitting={isSubmitting}
              isDraftMode={isDraftMode}
              currentQuoteId={currentQuoteId}
              discountPercentage={discountPercentage}
              discountJustification={discountJustification}
              onDiscountChange={(percentage, justification) => {
                setDiscountPercentage(percentage);
                setDiscountJustification(justification);
              }}
            />
          </div>
        </div>
      </div>


      {configuringLevel4Item && (
        <Level4RuntimeModal
          bomItem={configuringLevel4Item}
          level3ProductId={configuringLevel4Item.product.id}
          onSave={handleLevel4Save}
          onCancel={handleLevel4Cancel}
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
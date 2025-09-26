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
  quoteId?: string;
  mode?: 'new' | 'edit' | 'view';
}

const SLOT_LEVEL4_FLAG = '__slotLevel4Session';

const BOMBuilder = ({ onBOMUpdate, canSeePrices, canSeeCosts = false, quoteId, mode = 'new' }: BOMBuilderProps) => {
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
  const [currentQuoteId, setCurrentQuoteId] = useState<string | null>(quoteId || null);
  const [currentQuote, setCurrentQuote] = useState<any>(null);
  const [isDraftMode, setIsDraftMode] = useState(mode === 'edit' || mode === 'new');

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
    const map: Record<string, string> = {};
    Object.entries(codeMap).forEach(([id, def]) => {
      if (def && def.color) map[id] = def.color as string;
    });
    return map;
  }, [codeMap]);

  // Accessories list from admin config (outside_chassis)
  const accessories = useMemo(() => {
    return level3Products
      .filter(p => codeMap[p.id]?.outside_chassis)
      .map(p => {
        const template = codeMap[p.id]?.template as string | undefined;
        const pn = template ? String(template).replace(/\{[^}]+\}/g, '') : (p.partNumber || undefined);
        return {
          product: p,
          selected: selectedAccessories.has(p.id),
          color: (codeMap[p.id]?.color as string | null) || null,
          pn,
        };
      });
  }, [level3Products, codeMap, selectedAccessories]);

  const toggleAccessory = (id: string) => {
    setSelectedAccessories(prev => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
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

  // Initialize or load quote on component mount  
  useEffect(() => {
    if (quoteId && mode === 'edit') {
      console.log('BOMBuilder: Loading existing quote for editing:', quoteId);
      setCurrentQuoteId(quoteId);
      loadQuote(quoteId);
    } else if (mode === 'new') {
      console.log('BOMBuilder: Starting new quote');
      setCurrentQuoteId(null);
      setIsDraftMode(true);
    }
  }, [quoteId, mode]);

  // Existing initialization from URL params (legacy support)
  useEffect(() => {
    const urlParams = new URLSearchParams(window.location.search);
    const quoteIdFromUrl = urlParams.get('quoteId');
    
    // Only use URL params if no props are provided
    if (!quoteId && quoteIdFromUrl) {
      console.log('Quote ID found in URL:', quoteIdFromUrl);
      setCurrentQuoteId(quoteIdFromUrl);
      loadQuote(quoteIdFromUrl);
    } else if (!quoteId && !quoteIdFromUrl) {
      console.log('No quote ID provided, starting fresh');
    }
  }, [quoteId]);

  // Generate unique draft name function
  const generateUniqueDraftName = async (): Promise<string> => {
    if (!user?.email) return 'Draft 1';
    
    try {
      // Count existing drafts for this user to generate unique draft number
      const { count, error } = await supabase
        .from('quotes')
        .select('*', { count: 'exact', head: true })
        .eq('user_id', user.id)
        .eq('status', 'draft');

      if (error) {
        console.error('Error counting drafts:', error);
        return 'Draft 1';
      }

      const draftNumber = (count || 0) + 1;
      return `Draft ${draftNumber}`;
    } catch (error) {
      console.error('Error generating draft name:', error);
      return 'Draft 1';
    }
  };

  const createDraftQuote = async () => {
    if (!user?.id) {
      console.error('No user ID available for draft quote creation');
      toast({
        title: 'Authentication Error',
        description: 'You must be logged in to create a quote',
        variant: 'destructive'
      });
      return;
    }
    
    try {
      console.log('Creating draft quote for user:', user.id);
      
      // Generate unique customer name for draft
      const draftCustomerName = await generateUniqueDraftName();
      
      // Use simple UUID for draft quotes - no complex ID generation
      const draftQuoteId = crypto.randomUUID();
      
      console.log('Generated simple draft quote ID:', draftQuoteId);
      
      // Create draft quote with proper field mapping
      const quoteData = {
        id: draftQuoteId,
        user_id: user.id,
        customer_name: draftCustomerName,
        oracle_customer_id: quoteFields.oracle_customer_id || 'TBD',
        sfdc_opportunity: quoteFields.sfdc_opportunity || 'TBD',
        priority: (quoteFields.priority as any) || 'Medium',
        shipping_terms: quoteFields.shipping_terms || 'TBD',
        payment_terms: quoteFields.payment_terms || 'TBD',
        currency: quoteFields.currency || 'USD',
        is_rep_involved: quoteFields.is_rep_involved || false,
        status: 'draft' as const,
        quote_fields: quoteFields,
        original_quote_value: 0,
        discounted_value: 0,
        total_cost: 0,
        requested_discount: 0,
        original_margin: 0,
        discounted_margin: 0,
        gross_profit: 0,
        submitted_by_email: user.email || '',
        submitted_by_name: user.email || 'Unknown User'
      };

      console.log('Inserting quote with data:', quoteData);
      
      const { error: createError } = await supabase
        .from('quotes')
        .insert(quoteData);
        
      if (createError) {
        console.error('Quote creation error:', createError);
        throw new Error(`Failed to create quote: ${createError.message}`);
      }
      
      setCurrentQuoteId(draftQuoteId);
      setCurrentQuote({ 
        id: draftQuoteId, 
        customer_name: draftCustomerName, 
        status: 'draft' 
      });
      setIsDraftMode(true);
      
      // Update URL without page reload
      window.history.replaceState({}, '', `/#configure?quoteId=${draftQuoteId}`);
      
      toast({
        title: 'Draft Created',
        description: `${draftCustomerName} created successfully. Your progress will be automatically saved.`
      });
      
      console.log('Draft quote created successfully:', draftQuoteId);
    } catch (error) {
      console.error('Error creating draft quote:', error);
      toast({
        title: 'Error Creating Draft',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    }
  };

  const loadQuote = async (quoteId: string) => {
    if (!quoteId) {
      console.log('No quote ID provided');
      setIsLoading(false);
      return;
    }
    
    try {
      setIsLoading(true);
      console.log('Loading quote:', quoteId);
      
      // Show loading toast
      toast({
        title: "Loading Quote",
        description: `Loading quote data for ${quoteId}...`,
      });
      
      // Load quote data
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();
        
      if (quoteError) {
        console.error('Error loading quote:', quoteError);
        toast({
          title: "Error Loading Quote",
          description: `Failed to load quote ${quoteId}: ${quoteError.message}`,
          variant: "destructive"
        });
        throw quoteError;
      }
      
      if (!quote) {
        console.log('No quote found with ID:', quoteId);
        toast({
          title: 'Quote Not Found',
          description: `Quote ${quoteId} could not be found`,
          variant: 'destructive'
        });
        return;
      }
      
      console.log('Successfully loaded quote:', quote);
      setCurrentQuote(quote); // Store the loaded quote data
      
      let loadedItems: BOMItem[] = [];
      
      // Check if this is a draft with data in draft_bom field
      if (quote.status === 'draft' && quote.draft_bom && quote.draft_bom.items && Array.isArray(quote.draft_bom.items)) {
        console.log('Loading BOM data from draft_bom field');
        loadedItems = quote.draft_bom.items.map((item: any) => ({
          id: item.id || crypto.randomUUID(),
          product: item.product || {
            id: item.productId || item.product_id,
            name: item.name || item.product?.name,
            partNumber: item.partNumber || item.product?.partNumber,
            price: item.product?.price || 0,
            cost: item.product?.cost || 0,
            description: item.product?.description || ''
          },
          quantity: item.quantity || 1,
          enabled: item.enabled !== false,
          partNumber: item.partNumber || item.product?.partNumber,
          level4Values: item.level4Values || [],
          original_unit_price: item.original_unit_price || item.product?.price || 0,
          approved_unit_price: item.approved_unit_price || item.product?.price || 0,
          priceHistory: item.priceHistory || []
        }));
        
        console.log(`Loaded ${loadedItems.length} items from draft_bom`);
      } else {
        console.log('Loading BOM data from bom_items table');
        // Load BOM items with Level 4 configurations from database table
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
          
        if (bomError) {
          console.error('Error loading BOM items:', bomError);
          toast({
            title: "Error Loading BOM Items",
            description: `Failed to load BOM items: ${bomError.message}`,
            variant: "destructive"
          });
          throw bomError;
        }
        
        console.log(`Successfully loaded ${bomData?.length || 0} BOM items from database`);
        
        // Convert BOM items back to local format with proper structure
        loadedItems = (bomData || []).map(item => ({
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
          level4Values: item.bom_level4_values || [],
          original_unit_price: item.original_unit_price || item.unit_price,
          approved_unit_price: item.approved_unit_price || item.unit_price,
          priceHistory: item.price_adjustment_history || []
        }));
      }
      
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
      
      // Set draft mode based on quote status
      setIsDraftMode(quote.status === 'draft');
      
      // For draft quotes loaded from draft_bom, recalculate totals from loaded items
      if (quote.status === 'draft' && loadedItems.length > 0) {
        const totalValue = loadedItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
        const totalCost = loadedItems.reduce((sum, item) => sum + ((item.product.cost || 0) * item.quantity), 0);
        
        console.log(`Recalculated totals - Value: ${totalValue}, Cost: ${totalCost}`);
        
        // Trigger BOM update to recalculate all totals
        setTimeout(() => {
          onBOMUpdate(loadedItems);
        }, 100);
      }
      
      // Show success message
      const statusText = quote.status === 'draft' ? 'Draft' : 'Quote';
      toast({
        title: `${statusText} Loaded Successfully`,
        description: `Loaded ${statusText.toLowerCase()} with ${loadedItems.length} items`
      });
      
      console.log('Quote loading completed successfully');
    } catch (error) {
      console.error('Error loading quote:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Error Loading Quote',
        description: `Failed to load quote ${quoteId}: ${errorMessage}`,
        variant: 'destructive'
      });
    } finally {
      setIsLoading(false);
    }
  };

  // Manual save as draft function with better error handling and feedback
  const handleSaveAsDraft = async () => {
    if (!user?.id) {
      toast({
        title: 'Authentication Required',
        description: 'Please log in to save your draft. Your work is temporarily stored locally.',
        variant: 'destructive'
      });
      return;
    }

    if (bomItems.length === 0) {
      toast({
        title: 'Nothing to Save',
        description: 'Add some items to your BOM before saving as draft',
        variant: 'destructive'
      });
      return;
    }

    try {
      console.log('Starting draft save process...');
      let quoteId = currentQuoteId;
      
      // Create new draft if none exists
      if (!quoteId) {
        console.log('No current quote ID, creating new draft quote');
        
        // Use simple UUID for draft quotes - no complex ID generation
        const newQuoteId = crypto.randomUUID();
        
        console.log('Generated new draft quote ID:', newQuoteId);
        
        const draftName = await generateUniqueDraftName();
        const quoteData = {
          id: newQuoteId,
          user_id: user.id,
          customer_name: draftName,
          oracle_customer_id: quoteFields.oracleCustomerId || 'DRAFT',
          sfdc_opportunity: quoteFields.sfdcOpportunity || `DRAFT-${Date.now()}`,
          priority: (quoteFields.priority as any) || 'Medium',
          shipping_terms: quoteFields.shippingTerms || 'Ex-Works',
          payment_terms: quoteFields.paymentTerms || 'Net 30',
          currency: quoteFields.quoteCurrency || 'USD',
          is_rep_involved: quoteFields.isRepInvolved || false,
          status: 'draft' as const,
          quote_fields: quoteFields,
          draft_bom: {
            items: bomItems,
            lastSaved: new Date().toISOString()
          },
          original_quote_value: 0,
          discounted_value: 0,
          total_cost: 0,
          requested_discount: 0,
          original_margin: 0,
          discounted_margin: 0,
          gross_profit: 0,
          submitted_by_email: user.email || '',
          submitted_by_name: user.email || 'Unknown User'
        };
        
        const { error: createError } = await supabase
          .from('quotes')
          .insert(quoteData);
          
        if (createError) {
          console.error('Quote creation error:', createError);
          throw new Error(`Failed to create quote: ${createError.message}`);
        }
        
        setCurrentQuoteId(newQuoteId);
        setCurrentQuote({ 
          id: newQuoteId, 
          customer_name: draftName, 
          status: 'draft' 
        });
        quoteId = newQuoteId;
        
        console.log('Draft quote created successfully:', quoteId);
      } else {
        // Update existing draft
        const { error: updateError } = await supabase
          .from('quotes')
          .update({
            quote_fields: quoteFields,
            draft_bom: {
              items: bomItems,
              lastSaved: new Date().toISOString()
            },
            updated_at: new Date().toISOString()
          })
          .eq('id', quoteId)
          .eq('status', 'draft'); // Safety check
          
        if (updateError) {
          console.error('Quote update error:', updateError);
          throw new Error(`Failed to update draft: ${updateError.message}`);
        }
        
        console.log('Draft quote updated successfully:', quoteId);
      }
      
      toast({
        title: 'Draft Saved',
        description: `Draft ${quoteId} saved successfully with ${bomItems.length} items`,
      });
      
    } catch (error) {
      console.error('Error saving draft:', error);
      const errorMessage = error instanceof Error ? error.message : 'Unknown error occurred';
      toast({
        title: 'Save Failed',
        description: errorMessage,
        variant: 'destructive'
      });
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
      
      // Prepare draft BOM data
      const draftBomData = {
        items: bomItems.map(item => ({
          product_id: item.product.id,
          name: item.product.name,
          description: item.product.description,
          part_number: item.partNumber || item.product.partNumber,
          quantity: item.quantity,
          unit_price: item.product.price,
          unit_cost: item.product.cost || 0,
          total_price: item.product.price * item.quantity,
          total_cost: (item.product.cost || 0) * item.quantity,
          margin: item.product.cost && item.product.cost > 0 
            ? ((item.product.price - item.product.cost) / item.product.price) * 100 
            : 100,
          configuration_data: item.product,
          product_type: 'standard'
        })),
        quoteFields,
        discountPercentage,
        discountJustification,
        totals: {
          totalValue,
          totalCost,
          grossProfit: totalValue - totalCost,
          originalMargin: totalCost > 0 ? ((totalValue - totalCost) / totalValue) * 100 : 100,
          discountedValue: totalValue * (1 - discountPercentage / 100),
          discountedMargin: totalCost > 0 ? (((totalValue * (1 - discountPercentage / 100)) - totalCost) / (totalValue * (1 - discountPercentage / 100))) * 100 : 100
        }
      };

      // Update quote with draft BOM data
      const draftCustomerName = quoteFields.customerName || await generateUniqueDraftName();
      
      const { error: quoteError } = await supabase
        .from('quotes')
        .update({
          customer_name: draftCustomerName,
          oracle_customer_id: quoteFields.oracleCustomerId || 'DRAFT',
          sfdc_opportunity: quoteFields.sfdcOpportunity || `DRAFT-${Date.now()}`,
          original_quote_value: totalValue,
          discounted_value: totalValue * (1 - discountPercentage / 100),
          requested_discount: discountPercentage,
          total_cost: totalCost,
          gross_profit: totalValue - totalCost,
          original_margin: totalCost > 0 ? ((totalValue - totalCost) / totalValue) * 100 : 100,
          discounted_margin: totalCost > 0 ? (((totalValue * (1 - discountPercentage / 100)) - totalCost) / (totalValue * (1 - discountPercentage / 100))) * 100 : 100,
          quote_fields: quoteFields,
          discount_justification: discountJustification,
          draft_bom: draftBomData,
          status: 'draft',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentQuoteId);
        
      if (quoteError) throw quoteError;
      
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

  // Auto-save draft every 30 seconds (only if draft already exists)
  useEffect(() => {
    if (!currentQuoteId || !isDraftMode || bomItems.length === 0) return;
    
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

  const handleAddToBOM = (product: Level1Product | Level2Product | Level3Product, customPartNumber?: string) => {
    console.log('Adding product to BOM:', product.name);
    
    let partNumber = customPartNumber || product.partNumber;
    
    // For Level 2 products with "Not Applicable" chassis type, use the Admin-configured prefix as part number
    if (!partNumber && 'chassisType' in product && product.chassisType === 'N/A' && 'partNumberPrefix' in product && product.partNumberPrefix) {
      partNumber = String(product.partNumberPrefix);
    } else if (!partNumber && 'partNumberPrefix' in product && product.partNumberPrefix) {
      partNumber = String(product.partNumberPrefix);
    }
    
    const newItem: BOMItem = {
      id: `${product.id}-${Date.now()}`,
      product: product,
      quantity: 1,
      enabled: true,
      partNumber: partNumber
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

  // Handle adding a non-chassis product with its accessories to the BOM
  const handleAddNonChassisToBOM = (customPartNumber?: string) => {
    if (!configuringNonChassis) return;
    
    // Create the main product BOM item
    const mainProduct: BOMItem = {
      id: `${configuringNonChassis.id}-${Date.now()}`,
      product: configuringNonChassis,
      quantity: 1,
      enabled: true,
      partNumber: customPartNumber || 
                  pnConfig?.prefix || 
                  configuringNonChassis.partNumber || 
                  `${configuringNonChassis.name}-001`
    };

    // Create BOM items for selected accessories
    const accessoryItems: BOMItem[] = [];
    
    // Process each selected accessory
    Array.from(selectedAccessories).forEach(accessoryId => {
      const accessory = level3Products.find(p => p.id === accessoryId);
      if (!accessory) return;
      
      const accessoryItem: BOMItem = {
        id: `${accessory.id}-${Date.now()}`,
        product: accessory,
        quantity: 1,
        enabled: true,
        partNumber: accessory.partNumber || `${accessory.name}-001`,
        isAccessory: true
      };
      
      accessoryItems.push(accessoryItem);
    });

    // Add main product and accessories to BOM
    const newBomItems = [...bomItems, mainProduct, ...accessoryItems];
    setBomItems(newBomItems);
    onBOMUpdate(newBomItems);
    
    // Reset state
    setConfiguringNonChassis(null);
    setSelectedAccessories(new Set());
    
    // Show success message
    toast({
      title: 'Added to BOM',
      description: `${mainProduct.product.name} and ${accessoryItems.length} accessories have been added to your bill of materials.`,
    });
  };

  const handleLevel2OptionToggle = (option: Level2Product) => {
    console.log('Level2OptionToggle called with option:', option.name, 'chassisType:', option.chassisType);
    
    // Check if this is a single-selection context (clear other selections first)
    setSelectedLevel2Options([]);
    
    // Normalize chassis type for comparison (case and whitespace insensitive)
    const normalizedChassisType = option.chassisType?.trim().toUpperCase();
    const isNonChassis = !normalizedChassisType || 
                        normalizedChassisType === 'N/A' || 
                        normalizedChassisType === 'NA' || 
                        normalizedChassisType === 'NONE';
    
    // If the option has a chassis type and it's not 'N/A', show chassis config
    if (!isNonChassis) {
      console.log('Showing chassis configuration for:', option.name);
      setConfiguringChassis(option);
      setSelectedChassis(option);
      setSlotAssignments({});
      setSelectedSlot(null);
      return;
    }

    // For non-chassis products, show non-chassis configurator
    console.log('Showing non-chassis configuration for:', option.name);
    setConfiguringNonChassis(option);
    
    // Load admin config and codes for this product
    (async () => {
      try {
        const [cfg, codes, l3] = await Promise.all([
          productDataService.getPartNumberConfig(option.id),
          productDataService.getPartNumberCodesForLevel2(option.id),
          productDataService.getLevel3ProductsForLevel2(option.id)
        ]);
        
        setPnConfig(cfg);
        setCodeMap(codes);
        
        // Filter accessories marked as outside_chassis
        const accessories = l3.filter(p => codes[p.id]?.outside_chassis);
        setLevel3Products(accessories);
        
        // Auto-select standard accessories
        const standardAccessories = accessories
          .filter(p => codes[p.id]?.is_standard)
          .map(p => p.id);
        
        if (standardAccessories.length > 0) {
          setSelectedAccessories(new Set(standardAccessories));
        }
        
      } catch (e) {
        console.error('Failed to load PN config/codes for non-chassis product:', e);
        toast({
          title: 'Error',
          description: 'Failed to load product configuration. Please try again.',
          variant: 'destructive',
        });
      }
    })();
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
          
          // Auto-include standard items based on admin configuration
          const autoIncludeAssignments: Record<number, Level3Product> = {};
          
          // Check for standard items to auto-include
          Object.entries(codes).forEach(([l3Id, def]: [string, any]) => {
            if (def?.is_standard && !def?.outside_chassis) {
              const standardProduct = l3.find(p => p.id === l3Id);
              if (standardProduct && def.standard_position !== null && def.standard_position !== undefined) {
                // Use the exact position from admin config - no remapping needed
                const position = def.standard_position;
                autoIncludeAssignments[position] = standardProduct;
                console.log(`Auto-including standard item "${standardProduct.name}" at position ${position}`);
              }
            }
          });
          
          if (Object.keys(autoIncludeAssignments).length > 0) {
            setSlotAssignments(autoIncludeAssignments);
            toast({
              title: 'Standard Items Added',
              description: `${Object.keys(autoIncludeAssignments).length} standard items have been automatically included.`,
            });
          }
          
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

  const handleSlotClick = (slot: number) => {
    setSelectedSlot(slot);
  };

  const cleanupLevel4BomItem = async (bomItemId: string) => {
    if (!bomItemId) return;

    try {
      const { Level4Service } = await import('@/services/level4Service');

      try {
        Level4Service.unregisterActiveSession(bomItemId);
      } catch (error) {
        console.warn('Failed to unregister Level 4 session during cleanup:', error);
      }

      try {
        await Level4Service.deleteTempBOMItem(bomItemId, true);
      } catch (error) {
        console.warn('Failed to delete Level 4 BOM item during cleanup:', error);
      }
    } catch (error) {
      console.error('Error cleaning up Level 4 BOM item:', error);
    }
  };

  const handleSlotClear = (slot: number) => {
    const bomItemsToCleanup = new Set<string>();

    setSlotAssignments(prev => {
      const updated = { ...prev };
      const card = updated[slot];

      if (card && isBushingCard(card)) {
        const bushingSlots = findExistingBushingSlots(updated);
        bushingSlots.forEach(bushingSlot => {
          const bushingCard = updated[bushingSlot];
          const bomItemId = (bushingCard as any)?.level4BomItemId as string | undefined;
          if (bomItemId) {
            bomItemsToCleanup.add(bomItemId);
          }
          delete updated[bushingSlot];
        });
      } else {
        const bomItemId = (card as any)?.level4BomItemId as string | undefined;
        if (bomItemId) {
          bomItemsToCleanup.add(bomItemId);
        }
        delete updated[slot];
      }

      return updated;
    });

    if (bomItemsToCleanup.size > 0) {
      bomItemsToCleanup.forEach(bomItemId => {
        void cleanupLevel4BomItem(bomItemId);
      });
    }
  };

  const handleCardSelect = (card: any, slot: number) => {
    const updatedAssignments = { ...slotAssignments };
    const displayName = (card as any).displayName || card.name;

    const bomItemsToCleanup = new Set<string>();

    const removeExistingAssignment = (targetSlot: number) => {
      const existing = updatedAssignments[targetSlot];
      if (!existing) return;

      const existingBomId = (existing as any)?.level4BomItemId as string | undefined;
      if (existingBomId) {
        bomItemsToCleanup.add(existingBomId);
      }

      delete updatedAssignments[targetSlot];
    };

    const existingAtSlot = updatedAssignments[slot];
    if (existingAtSlot) {
      if (isBushingCard(existingAtSlot)) {
        const pairSlot = (existingAtSlot as any)?.bushingPairSlot as number | undefined;
        if (pairSlot) {
          removeExistingAssignment(pairSlot);
        }
      }
      removeExistingAssignment(slot);
    }

    // Create card with display name
    const requiresLevel4Configuration = Boolean(
      (card as any).has_level4 ||
      (card as any).requires_level4_config
    );

    const cardWithDisplayName = {
      ...card,
      displayName: displayName,
      hasLevel4Configuration: requiresLevel4Configuration
    };
    
    // Handle bushing cards
    if (isBushingCard(card)) {
      // For bushing cards, always assign to the primary slot (6 or 13) and the next slot
      // Ensure we're using the correct primary slot (6 or 13)
      const primarySlot = slot === 7 ? 6 : (slot === 14 ? 13 : slot);
      const secondarySlot = primarySlot + 1;
      
      // Assign to primary slot
      updatedAssignments[primarySlot] = {
        ...cardWithDisplayName,
        isBushingPrimary: true,
        bushingPairSlot: secondarySlot,
        displayName: displayName, // Use the display name from level 3 config
        hasLevel4Configuration: requiresLevel4Configuration
      };

      // Assign to secondary slot
      updatedAssignments[secondarySlot] = {
        ...cardWithDisplayName,
        isBushingSecondary: true,
        bushingPairSlot: primarySlot,
        displayName: displayName, // Use the same display name as primary slot
        hasLevel4Configuration: requiresLevel4Configuration
      };
    } else {
      // Regular card assignment
      updatedAssignments[slot] = cardWithDisplayName;
    }

    // Only set state once after all updates
    setSlotAssignments(updatedAssignments);

    if (bomItemsToCleanup.size > 0) {
      bomItemsToCleanup.forEach(id => {
        void cleanupLevel4BomItem(id);
      });
    }

    // Check if this card requires level 4 configuration
    console.log('Card level 4 check:', {
      card: card.name,
      has_level4: (card as any).has_level4,
      requires_level4_config: (card as any).requires_level4_config
    });
    
    if ((card as any).has_level4 || (card as any).requires_level4_config) {
      console.log('Triggering Level 4 modal for:', card.name);
      
      // Create BOM item that will be saved to database
      const newItem = {
        id: crypto.randomUUID(), // Temporary ID, will be replaced with database ID
        product: cardWithDisplayName,
        quantity: 1,
        enabled: true,
        partNumber: card.partNumber,
        displayName: displayName,
        slot: slot,
        [SLOT_LEVEL4_FLAG]: true,
      } as BOMItem & { [SLOT_LEVEL4_FLAG]: true };
      
      // Save BOM item to database immediately to enable Level 4 configuration
      handleLevel4Setup(newItem);
    } else {
      // Removed the call to updateBOMItems here
    }
    
    setSelectedSlot(null);
  };
  
  // Helper function to update BOM items from slot assignments
  const updateBOMItems = (assignments: Record<number, any>) => {
    const slotItems = Object.entries(assignments).map(([slot, product]) => ({
      id: `slot-${slot}-${product.id}`,
      product: {
        ...product,
        displayName: product.displayName || product.name
      },
      quantity: 1,
      enabled: true,
      partNumber: product.partNumber,
      displayName: product.displayName || product.name,
      slot: Number(slot)
    }));

    const nonSlotItems = bomItems.filter(item => item.slot === undefined);
    const updatedItems = [...nonSlotItems, ...slotItems];
    
    setBomItems(updatedItems);
    onBOMUpdate(updatedItems);
  };


  // Setup Level 4 configuration by creating BOM item in database first
  const handleLevel4Setup = async (newItem: BOMItem) => {
    try {
      setIsLoading(true);

      // Import Level4Service dynamically to avoid circular imports
      const { Level4Service } = await import('@/services/level4Service');
      
      // Verify user authentication
      if (!user?.id) {
        throw new Error('User authentication required for Level 4 configuration');
      }

      console.log('Setting up Level 4 config for user:', user.id);
      
      // Create temporary quote and BOM item in database
      const { bomItemId, tempQuoteId } = await Level4Service.createBOMItemForLevel4Config(newItem, user.id);
      
      // Update the item with database ID
      const itemWithDbId: BOMItem = {
        ...newItem,
        id: bomItemId
      };
      
      // Store temp quote ID separately for cleanup
      (itemWithDbId as any).tempQuoteId = tempQuoteId;
      
      // Register the session immediately to prevent cleanup
      Level4Service.registerActiveSession(bomItemId);
      
      setConfiguringLevel4Item(itemWithDbId);
      
    } catch (error) {
      console.error('Error setting up Level 4 configuration:', error);
      toast({
        title: 'Error',
        description: 'Failed to prepare Level 4 configuration. Please try again.',
        variant: 'destructive',
      });
    } finally {
      setIsLoading(false);
    }
  };

  const handleSlotLevel4Reconfigure = (slot: number) => {
    const card = slotAssignments[slot];
    if (!card) return;

    const displayName = (card as any).displayName || card.name;
    const partNumber = (card as any).partNumber || card.partNumber || '';
    const level4BomItemId = (card as any)?.level4BomItemId as string | undefined;
    const tempQuoteId = (card as any)?.level4TempQuoteId as string | undefined;

    if (!level4BomItemId) {
      setSelectedSlot(slot);

      const newItem: BOMItem = {
        id: crypto.randomUUID(),
        product: {
          ...card,
          displayName,
        },
        quantity: 1,
        enabled: true,
        partNumber,
        displayName,
        slot,
        [SLOT_LEVEL4_FLAG]: true,
      } as BOMItem & { [SLOT_LEVEL4_FLAG]: true };

      handleLevel4Setup(newItem);
      return;
    }

    const reconfigureItem = {
      id: level4BomItemId,
      product: {
        ...card,
        displayName,
      },
      quantity: 1,
      enabled: true,
      partNumber,
      displayName,
      slot,
      level4Config: (card as any)?.level4Config,
      [SLOT_LEVEL4_FLAG]: true,
    } as BOMItem & { isReconfigureSession?: boolean; [SLOT_LEVEL4_FLAG]: true };

    if (tempQuoteId) {
      (reconfigureItem as any).tempQuoteId = tempQuoteId;
    }

    reconfigureItem.isReconfigureSession = true;

    setConfiguringLevel4Item(reconfigureItem);
    setSelectedSlot(slot);
  };

  const handleLevel4Save = (payload: Level4RuntimePayload) => {
    console.log('Saving Level 4 configuration:', payload);

    const isSlotLevelSession = Boolean((configuringLevel4Item as any)?.[SLOT_LEVEL4_FLAG]);

    if (isSlotLevelSession) {
      const slot = configuringLevel4Item.slot;
      const tempQuoteId = (configuringLevel4Item as any)?.tempQuoteId as string | undefined;
      const displayName = (configuringLevel4Item as any).displayName || configuringLevel4Item.product.name;

      setSlotAssignments(prev => {
        const updated = { ...prev };
        const primaryCard = updated[slot];

        // For bushing cards, only apply the Level 4 configuration to the primary slot
        // The secondary slot will share the configuration but not have its own Level 4 BOM item
        if (primaryCard && isBushingCard(primaryCard)) {
          const isPrimarySlot = (primaryCard as any)?.isBushingPrimary;
          
          if (isPrimarySlot) {
            // Apply to primary slot only
            updated[slot] = {
              ...primaryCard,
              displayName: (primaryCard as any).displayName || primaryCard.name,
              level4Config: payload,
              level4BomItemId: payload.bomItemId,
              level4TempQuoteId: tempQuoteId,
              hasLevel4Configuration: true
            } as Level3Product;

            // Update the secondary slot to reference the primary's configuration but don't create a separate BOM item
            const pairedSlot = (primaryCard as any)?.bushingPairSlot as number | undefined;
            if (pairedSlot && updated[pairedSlot]) {
              updated[pairedSlot] = {
                ...updated[pairedSlot],
                displayName: (updated[pairedSlot] as any).displayName || updated[pairedSlot].name,
                level4Config: payload, // Share the same configuration
                level4BomItemId: payload.bomItemId, // Reference the same BOM item
                level4TempQuoteId: tempQuoteId,
                hasLevel4Configuration: true,
                isSharedLevel4Config: true // Flag to indicate this is a shared config
              } as Level3Product;
            }
          } else {
            // If this is a secondary slot being configured, find the primary and update it
            const pairedSlot = (primaryCard as any)?.bushingPairSlot as number | undefined;
            if (pairedSlot && updated[pairedSlot]) {
              // Apply configuration to the primary slot
              updated[pairedSlot] = {
                ...updated[pairedSlot],
                displayName: (updated[pairedSlot] as any).displayName || updated[pairedSlot].name,
                level4Config: payload,
                level4BomItemId: payload.bomItemId,
                level4TempQuoteId: tempQuoteId,
                hasLevel4Configuration: true
              } as Level3Product;

              // Update the secondary slot to reference the primary's configuration
              updated[slot] = {
                ...primaryCard,
                displayName: (primaryCard as any).displayName || primaryCard.name,
                level4Config: payload,
                level4BomItemId: payload.bomItemId,
                level4TempQuoteId: tempQuoteId,
                hasLevel4Configuration: true,
                isSharedLevel4Config: true
              } as Level3Product;
            }
          }
        } else {
          // For non-bushing cards, apply normally
          updated[slot] = {
            ...primaryCard,
            displayName: (primaryCard as any).displayName || primaryCard.name,
            level4Config: payload,
            level4BomItemId: payload.bomItemId,
            level4TempQuoteId: tempQuoteId,
            hasLevel4Configuration: true
          } as Level3Product;
        }

        return updated;
      });

      // Clean up temporary BOM items - avoid duplicates by only removing the specific item
      setBomItems(prev => {
        const filtered = prev.filter(item => item.id !== payload.bomItemId);
        if (filtered.length !== prev.length) {
          onBOMUpdate(filtered);
        }
        return filtered;
      });

      toast({
        title: 'Configuration Saved',
        description: `${displayName} configuration has been saved.`,
      });

      setConfiguringLevel4Item(null);
      setSelectedSlot(null);
      return;
    }

    if (configuringLevel4Item) {
      const updatedItem: BOMItem = {
        ...configuringLevel4Item,
        id: payload.bomItemId,
        level4Config: payload,
        product: {
          ...configuringLevel4Item.product,
          displayName: (configuringLevel4Item as any).displayName || configuringLevel4Item.product.name
        },
        displayName: (configuringLevel4Item as any).displayName || configuringLevel4Item.product.name
      };

      if ((configuringLevel4Item as any).tempQuoteId) {
        (updatedItem as any).tempQuoteId = (configuringLevel4Item as any).tempQuoteId;
      }

      const existingIndex = bomItems.findIndex(item =>
        item.id === configuringLevel4Item.id || item.id === payload.bomItemId
      );
      const updatedItems = existingIndex >= 0
        ? bomItems.map(item =>
            (item.id === configuringLevel4Item.id || item.id === payload.bomItemId) ? updatedItem : item
          )
        : [...bomItems, updatedItem];

      setBomItems(updatedItems);
      onBOMUpdate(updatedItems);

      toast({
        title: 'Configuration Saved',
        description: `Level 4 configuration for ${configuringLevel4Item.product.name} has been saved.`,
      });
    }

    setConfiguringLevel4Item(null);
    setSelectedSlot(null);
  };

  const handleLevel4Cancel = async () => {
    if (configuringLevel4Item) {
      try {
        // Import Level4Service dynamically to avoid circular imports
        const { Level4Service } = await import('@/services/level4Service');

        console.log('Canceling Level 4 configuration for item:', configuringLevel4Item.id);

        // Unregister the active session and force cleanup on cancel
        Level4Service.unregisterActiveSession(configuringLevel4Item.id);

        const isReconfigureSession = Boolean((configuringLevel4Item as any)?.isReconfigureSession);

        // Clean up temporary data immediately on cancel when this is a new configuration session
        if (!isReconfigureSession) {
          try {
            await Level4Service.deleteTempBOMItem(configuringLevel4Item.id, true); // Force cleanup
          } catch (error) {
            console.error('Error cleaning up Level 4 configuration:', error);
          }
        }

      } catch (error) {
        console.error('Error preparing Level 4 cleanup:', error);
        // Don't block the cancel operation
      }
    }
    
    setConfiguringLevel4Item(null);
    setSelectedSlot(null);
  };

  const handleRemoteDisplayToggle = (enabled: boolean) => {
    setHasRemoteDisplay(enabled);
  };

  const handleAddChassisToBOM = () => {
    if (editingOriginalItem) {
      handleUpdateChassisInBOM();
      return;
    }
    if (!selectedChassis) return;

    // Generate the part number for this configuration
    const partNumber = buildQTMSPartNumber({ 
      chassis: selectedChassis, 
      slotAssignments, 
      hasRemoteDisplay, 
      pnConfig, 
      codeMap, 
      includeSuffix: true 
    });

    // Create a new BOM item for the chassis with its configuration
    const newItem: BOMItem = {
      id: `chassis-${Date.now()}`,
      product: {
        ...selectedChassis,
        displayName: selectedChassis.name,
        partNumber: partNumber
      },
      quantity: 1,
      enabled: true,
      partNumber: partNumber,
      displayName: selectedChassis.name,
      slotAssignments: { ...slotAssignments },
      configuration: {
        hasRemoteDisplay,
      }
    };

    // Add chassis to BOM
    const updatedItems = [...bomItems, newItem];
    
    // Add selected accessories to BOM with proper part numbers from codeMap
    const accessoryItems = level3Products
      .filter(p => selectedAccessories.has(p.id))
      .map(accessory => {
        const def = codeMap[accessory.id];
        const template = def?.template;
        const partNumber = template ? String(template).replace(/\{[^}]+\}/g, '') : (accessory.partNumber || undefined);
        
        return {
          id: `accessory-${accessory.id}-${Date.now()}`,
          product: {
            ...accessory,
            displayName: accessory.name,
            partNumber: partNumber
          },
          quantity: 1,
          enabled: true,
          partNumber: partNumber,
          displayName: accessory.name,
          isAccessory: true
        };
      });

    const allItems = [...updatedItems, ...accessoryItems];
    
    setBomItems(allItems);
    onBOMUpdate(allItems);

    // Reset chassis configuration state
    setSelectedChassis(null);
    setConfiguringChassis(null);
    setSlotAssignments({});
    setSelectedSlot(null);
    setHasRemoteDisplay(false);
    setSelectedAccessories(new Set());

    // Show success message
    toast({
      title: 'Configuration Added',
      description: `${selectedChassis.name} and selected accessories have been added to your bill of materials.`,
    });
  };

  const handleUpdateChassisInBOM = () => {
    if (!selectedChassis || !editingOriginalItem) return;

    const partNumber = buildQTMSPartNumber({
      chassis: selectedChassis,
      slotAssignments,
      hasRemoteDisplay,
      pnConfig,
      codeMap,
      includeSuffix: true,
    });

    const updatedItem: BOMItem = {
      ...editingOriginalItem,
      product: {
        ...selectedChassis,
        displayName: selectedChassis.name,
        partNumber: partNumber,
      },
      partNumber: partNumber,
      displayName: selectedChassis.name,
      slotAssignments: { ...slotAssignments },
      configuration: {
        hasRemoteDisplay,
      },
    };

    

    const chassisIndex = bomItems.findIndex(item => item.id === editingOriginalItem.id);

    if (chassisIndex === -1) return;

    

    const newAccessoryItems = Array.from(selectedAccessories).map(accessoryId => {
      const accessory = level3Products.find(p => p.id === accessoryId);
      if (!accessory) return null;
      const def = codeMap[accessory.id];
      const template = def?.template;
      const partNumber = template ? String(template).replace(/\{[^}]+\}/g, '') : (accessory.partNumber || undefined);
      return {
        id: `accessory-${accessory.id}-${Date.now()}`,
        product: {
          ...accessory,
          displayName: accessory.name,
          partNumber: partNumber
        },
        quantity: 1,
        enabled: true,
        partNumber: partNumber,
        displayName: accessory.name,
        isAccessory: true
      };
    }).filter((item) => item !== null) as BOMItem[];

    // Find the end of the original chassis item's accessories
    let endOfOriginalAccessoriesIndex = chassisIndex + 1;
    while (endOfOriginalAccessoriesIndex < bomItems.length && bomItems[endOfOriginalAccessoriesIndex].isAccessory) {
      endOfOriginalAccessoriesIndex++;
    }

    const finalBomItems = [
      ...bomItems.slice(0, chassisIndex), // Items before the edited chassis
      updatedItem,                        // The updated chassis
      ...newAccessoryItems,               // Currently selected accessories (newly created or updated)
      ...bomItems.slice(endOfOriginalAccessoriesIndex) // Items after the original chassis and its accessories
    ];

    setBomItems(finalBomItems);
    onBOMUpdate(finalBomItems);

    // Reset state
    setSelectedChassis(null);
    setConfiguringChassis(null);
    setSlotAssignments({});
    setSelectedSlot(null);
    setHasRemoteDisplay(false);
    setEditingOriginalItem(null);
    setSelectedAccessories(new Set());

    toast({
      title: "Configuration Updated",
      description: `${selectedChassis.name} has been updated in your bill of materials.`,
    });
  };

  const handleBOMConfigurationEdit = (item: BOMItem) => {
    console.log('Editing BOM item configuration:', item);
    
    // FIRST: Check for Level 4 configuration
    if ((item.product as any).has_level4) {
      console.log('Opening Level 4 configuration for:', item.product.name);
      setConfiguringLevel4Item(item);
      return;
    }
    
    // Check if this is a chassis-configured item (has slot assignments)
    if (item.slotAssignments || (item.product as any).chassisType && (item.product as any).chassisType !== 'N/A') {
      console.log('Editing chassis configuration for:', item.product.name);
      
      // Set up the chassis for editing
      setSelectedChassis(item.product as Level2Product);
      setSlotAssignments(item.slotAssignments || {});
      setConfiguringChassis(item.product as Level2Product);
      
      // Store the original item for restoration if edit is cancelled
      setEditingOriginalItem(item);
      
      const chassisIndex = bomItems.findIndex(bomItem => bomItem.id === item.id);

      if (chassisIndex !== -1) {
        const accessoriesToSelect = new Set<string>();
        for (let i = chassisIndex + 1; i < bomItems.length; i++) {
          const currentItem = bomItems[i];
          if (currentItem.isAccessory) {
            accessoriesToSelect.add(currentItem.product.id);
          } else {
            break; 
          }
        }
        setSelectedAccessories(accessoriesToSelect);
      }
      
      setHasRemoteDisplay(item.configuration?.hasRemoteDisplay || false);
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
        cost: item.unit_cost || item.product.cost || 0,
        configuration: item.configuration as QTMSConfiguration,
        components: []
      };
      setEditingQTMS(consolidatedQTMS);
    } else {
      // For other configurable items (analog cards, bushing cards, etc.)
      setConfiguringLevel4Item(item);
    }
  };

  const handleQTMSConfigurationSave = (updatedQTMS: ConsolidatedQTMS) => {
    console.log('Saving QTMS configuration:', updatedQTMS);
    
    if (editingQTMS) {
      // Update existing QTMS item instead of creating a new one
      const updatedBOMItems = bomItems.map(item => {
        if (item.id === editingQTMS.id) {
          return {
            ...item,
            product: {
              ...item.product,
              name: updatedQTMS.name,
              description: updatedQTMS.description,
              partNumber: updatedQTMS.partNumber,
              price: updatedQTMS.price,
              cost: updatedQTMS.cost // Add this line
            },
            configuration: updatedQTMS.configuration,
            partNumber: updatedQTMS.partNumber
          };
        }
        return item;
      });
      
      setBomItems(updatedBOMItems);
      onBOMUpdate(updatedBOMItems);
      
      toast({
        title: 'Configuration Updated',
        description: `${updatedQTMS.name} configuration has been updated successfully.`,
      });
    } else {
      // Create new QTMS item (existing logic)
      const qtmsItem = createQTMSBOMItem(updatedQTMS);
      setBomItems(prev => [...prev, qtmsItem]);
      onBOMUpdate([...bomItems, qtmsItem]);
      
      toast({
        title: 'Configuration Added',
        description: `${updatedQTMS.name} has been added to your bill of materials.`,
      });
    }
    
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
        // Generate new quote ID for final submission
        const { data: newQuoteId, error: generateError } = await supabase
          .rpc('generate_quote_id', { user_email: user.email, is_draft: false });
        
        if (generateError) {
          console.error('Error generating quote ID:', generateError);
          throw generateError;
        }
        
        quoteId = newQuoteId;
      }

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

      let quoteError: any = null;
      
      if (isSubmittingExistingDraft) {
        // Update existing draft quote to final status
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
            original_margin:
              originalQuoteValue > 0
                ? ((originalQuoteValue - totalCost) / originalQuoteValue) * 100
                : 0,
            discounted_margin: discountedMargin,
            quote_fields: quoteFields,
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
            original_unit_price: item.original_unit_price || item.product.price,
            approved_unit_price: item.approved_unit_price || item.product.price,
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
                setEditingOriginalItem(null);
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
            level3Products={level3Products}
            codeMap={codeMap}
            selectedAccessories={selectedAccessories}
            onAccessoryToggle={toggleAccessory}
            partNumber={buildQTMSPartNumber({ chassis: configuringChassis, slotAssignments, hasRemoteDisplay, pnConfig, codeMap, includeSuffix: false })}
            onSlotReconfigure={handleSlotLevel4Reconfigure}

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
              {editingOriginalItem ? 'Update BOM' : 'Add to BOM'}
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
                    setEditingOriginalItem(null);
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
                level3Products={level3Products}
                codeMap={codeMap}
                selectedAccessories={selectedAccessories}
                onAccessoryToggle={toggleAccessory}
                partNumber={buildQTMSPartNumber({ chassis: selectedChassis, slotAssignments, hasRemoteDisplay, pnConfig, codeMap, includeSuffix: false })}
                onSlotReconfigure={handleSlotLevel4Reconfigure}
              />
            
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
                    setEditingOriginalItem(null);
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
                  {editingOriginalItem ? 'Update BOM' : 'Add to BOM'}
                </Button>
              </div>
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

    // If we're configuring a non-chassis product, show the non-chassis configurator
    if (configuringNonChassis) {
      console.log('Rendering non-chassis configuration for:', configuringNonChassis.name);
      return (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <h3 className="text-xl font-semibold">
              Configure {configuringNonChassis.name}
            </h3>
            <Button 
              variant="outline" 
              size="sm"
              onClick={() => {
                setConfiguringNonChassis(null);
                setSelectedAccessories(new Set());
              }}
            >
              Back to Products
            </Button>
          </div>
          
          <NonChassisConfigurator
            level2Product={configuringNonChassis}
            level3Products={level3Products}
            codeMap={codeMap}
            partNumberPrefix={pnConfig?.prefix || configuringNonChassis.partNumber || `${configuringNonChassis.name}-001`}
            selectedAccessories={selectedAccessories}
            onToggleAccessory={toggleAccessory}
            onAddToBOM={handleAddNonChassisToBOM}
            canOverridePartNumber={canForcePN}
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
      {/* Level 4 Configuration Modal handled via configuringLevel4Item */}
      
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
            <EnhancedBOMDisplay
              bomItems={bomItems}
              onUpdateBOM={handleBOMUpdate}
              onEditConfiguration={handleBOMConfigurationEdit}
              onSubmitQuote={submitQuoteRequest}
              onSaveDraft={handleSaveAsDraft}
              canSeePrices={canSeePrices}
              canSeeCosts={canSeeCosts}
              canEditPartNumber={canEditPN}
              productMap={productMap}
              isSubmitting={isSubmitting}
              isDraftMode={isDraftMode}
              currentQuoteId={currentQuoteId}
              draftName={currentQuote?.status === 'draft' ? currentQuote?.customer_name : null}
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
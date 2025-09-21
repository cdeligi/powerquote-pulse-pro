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

  const handleCardSelect = (card: any, slot: number) => {
    const updatedAssignments = { ...slotAssignments };
    const displayName = (card as any).displayName || card.name;
    
    // Create card with display name
    const cardWithDisplayName = {
      ...card,
      displayName: displayName
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
        displayName: displayName // Use the display name from level 3 config
      };
      
      // Assign to secondary slot
      updatedAssignments[secondarySlot] = {
        ...cardWithDisplayName,
        isBushingSecondary: true,
        bushingPairSlot: primarySlot,
        displayName: displayName // Use the same display name as primary slot
      };
    } else {
      // Regular card assignment
      updatedAssignments[slot] = cardWithDisplayName;
    }
    
    // Only set state once after all updates
    setSlotAssignments(updatedAssignments);
    
    // Check if this card requires level 4 configuration
    console.log('Card level 4 check:', {
      card: card.name,
      has_level4: (card as any).has_level4,
      requires_level4_config: (card as any).requires_level4_config
    });
    
    if ((card as any).has_level4 || (card as any).requires_level4_config) {
      console.log('Triggering Level 4 modal for:', card.name);
      
      // Create BOM item that will be saved to database
      const newItem: BOMItem = {
        id: crypto.randomUUID(), // Temporary ID, will be replaced with database ID
        product: cardWithDisplayName,
        quantity: 1,
        enabled: true,
        partNumber: card.partNumber,
        displayName: displayName,
        slot: slot
      };
      
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

  const handleLevel4Save = (payload: Level4RuntimePayload) => {
    console.log('Saving Level 4 configuration:', payload);

    if (configuringLevel4Item && selectedSlot !== null) {
      // Store Level 4 configuration in slot assignments instead of BOM
      const assignedCard = slotAssignments[selectedSlot];
      if (assignedCard) {
        console.log('Before Level 4 save - assigned card data:', {
          slot: selectedSlot,
          card: assignedCard,
          displayName: assignedCard.displayName,
          name: assignedCard.name
        });

        const updatedSlotAssignments = {
          ...slotAssignments,
          [selectedSlot]: {
            ...assignedCard,
            level4Config: payload,
            hasLevel4Config: true,
            // Ensure displayName is preserved
            displayName: assignedCard.displayName || assignedCard.name
          }
        };
        
        console.log('After Level 4 save - updated slot assignment:', {
          slot: selectedSlot,
          card: updatedSlotAssignments[selectedSlot],
          displayName: updatedSlotAssignments[selectedSlot].displayName,
          hasLevel4Config: updatedSlotAssignments[selectedSlot].hasLevel4Config
        });
        
        setSlotAssignments(updatedSlotAssignments);

        // Regenerate part number after Level 4 configuration update
        if (selectedChassis) {
          const newPartNumber = buildQTMSPartNumber({ 
            chassis: selectedChassis, 
            slotAssignments: updatedSlotAssignments, 
            hasRemoteDisplay, 
            pnConfig, 
            codeMap, 
            includeSuffix: true 
          });
          
          console.log('Regenerated part number after Level 4 save:', newPartNumber);
          
          // Update any existing chassis BOM item with new part number
          const updatedBOMItems = bomItems.map(item => {
            if (item.product.type === 'chassis' && item.slotAssignments) {
              return {
                ...item,
                partNumber: newPartNumber,
                product: {
                  ...item.product,
                  partNumber: newPartNumber
                },
                slotAssignments: updatedSlotAssignments,
                configuration: {
                  ...item.configuration,
                  level4Configurations: Object.entries(updatedSlotAssignments)
                    .filter(([_, card]) => (card as any).level4Config)
                    .reduce((acc, [slot, card]) => {
                      acc[slot] = (card as any).level4Config;
                      return acc;
                    }, {} as Record<string, any>)
                }
              };
            }
            return item;
          });
          
          if (updatedBOMItems.some((item, index) => item !== bomItems[index])) {
            setBomItems(updatedBOMItems);
            onBOMUpdate(updatedBOMItems);
            console.log('Updated chassis BOM item with new part number');
          }
        }

        toast({
          title: 'Configuration Saved',
          description: `Level 4 configuration for ${assignedCard.displayName || assignedCard.name} has been saved to slot ${selectedSlot}.`,
        });
      }
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
        
        // Clean up temporary data immediately on cancel
        try {
          await Level4Service.deleteTempBOMItem(configuringLevel4Item.id, true); // Force cleanup
        } catch (error) {
          console.error('Error cleaning up Level 4 configuration:', error);
        }
        
      } catch (error) {
        console.error('Error preparing Level 4 cleanup:', error);
        // Don't block the cancel operation
      }
    }
    
    setConfiguringLevel4Item(null);
    setSelectedSlot(null);
  };

  const handleLevel4Configure = async (slot: number, product: Level3Product) => {
    console.log('Level 4 configure triggered:', { slot, product, slotAssignments });
    
    // Handle Level 4 configuration from rack visualizer
    setSelectedSlot(slot);
    
    // Get existing Level 4 configuration from slot assignments
    const assignedCard = slotAssignments[slot];
    const existingLevel4Config = (assignedCard as any)?.level4Config;
    
    if (existingLevel4Config && existingLevel4Config.bomItemId) {
      console.log('Found existing Level 4 config, creating BOM item for editing:', existingLevel4Config);
      
      // Editing existing configuration - create a BOM item with existing config
      const tempBOMItem: BOMItem = {
        id: existingLevel4Config.bomItemId,
        product: assignedCard,
        quantity: 1,
        enabled: true,
        level4Config: existingLevel4Config
      };
      
      setConfiguringLevel4Item(tempBOMItem);
    } else {
      console.log('No existing Level 4 config found, creating new configuration');
      // Creating new configuration
      await handleLevel4Setup({ product, quantity: 1, enabled: true });
    }
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
        level4Configurations: Object.entries(slotAssignments)
          .filter(([_, card]) => (card as any).level4Config)
          .reduce((acc, [slot, card]) => {
            acc[slot] = (card as any).level4Config;
            return acc;
          }, {} as Record<string, any>)
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

      const { error: quoteError } = await supabase
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
            onLevel4Configure={handleLevel4Configure}
            
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
                onLevel4Configure={handleLevel4Configure}
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
            <BOMDisplay
              bomItems={bomItems}
              onUpdateBOM={handleBOMUpdate}
              onEditConfiguration={handleBOMConfigurationEdit}
              onSubmitQuote={submitQuoteRequest}
              canSeePrices={canSeePrices}
              canSeeCosts={canSeeCosts}
              canEditPartNumber={canEditPN}
              productMap={productMap}
            />
          </div>
        </div>
      </div>

      

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
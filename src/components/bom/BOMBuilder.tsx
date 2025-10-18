import { useState, useEffect, useMemo, useCallback, useRef } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { AssetType, BOMItem, Level1Product, Level2Product, Level3Product, Level3Customization } from '@/types/product';
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

import { toast } from '@/components/ui/use-toast';
import { getSupabaseClient, getSupabaseAdminClient, isAdminAvailable } from "@/integrations/supabase/client";
import { generateUniqueDraftName } from '@/utils/draftName';
import { generateSubmittedQuoteId, normalizeQuoteId, persistNormalizedQuoteId } from '@/utils/quoteIdGenerator';
import QTMSConfigurationEditor from './QTMSConfigurationEditor';
import { consolidateQTMSConfiguration, createQTMSBOMItem, ConsolidatedQTMS, QTMSConfiguration } from '@/utils/qtmsConsolidation';
import { buildQTMSPartNumber } from '@/utils/qtmsPartNumberBuilder';
import { findOptimalBushingPlacement, findExistingBushingSlots, isBushingCard } from '@/utils/bushingValidation';
import { deriveCustomerNameFromFields as deriveCustomerName, findAccountFieldValue } from '@/utils/customerName';
import { useAuth } from '@/hooks/useAuth';
import { useQuoteValidation } from './QuoteFieldValidation';
import { usePermissions, FEATURES } from '@/hooks/usePermissions';
import {
  serializeSlotAssignments,
  deserializeSlotAssignments,
  buildRackLayoutFromAssignments,
  type SerializedSlotAssignment,
} from '@/utils/slotAssignmentUtils';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';

const supabase = getSupabaseClient();
const supabaseAdmin = getSupabaseAdminClient();

const coalesce = <T,>(...values: Array<T | undefined | null>) => {
  for (const value of values) {
    if (value !== undefined && value !== null && value !== '') {
      return value;
    }
  }
  return undefined;
};

const toCamelCase = (value: string) =>
  value.replace(/_([a-z])/g, (_, letter: string) => letter.toUpperCase());

const toPascalCase = (value: string) => {
  const camel = toCamelCase(value);
  return camel.charAt(0).toUpperCase() + camel.slice(1);
};

const CANDIDATE_VALUE_KEYS = ['value', 'label', 'name', 'display', 'displayValue', 'text'] as const;

const coerceFieldEntryToString = (value: unknown): string | null => {
  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : null;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  if (Array.isArray(value)) {
    for (const entry of value) {
      const coerced = coerceFieldEntryToString(entry);
      if (coerced) {
        return coerced;
      }
    }
    return null;
  }

  if (value && typeof value === 'object') {
    const record = value as Record<string, unknown>;
    for (const key of CANDIDATE_VALUE_KEYS) {
      if (key in record) {
        const coerced = coerceFieldEntryToString(record[key]);
        if (coerced) {
          return coerced;
        }
      }
    }
  }

  return null;
};

const findAccountLikeValue = (fields: Record<string, any>): string | null => {
  for (const [key, rawValue] of Object.entries(fields)) {
    const normalizedKey = key.toLowerCase();
    if (!normalizedKey.includes('account')) {
      continue;
    }

    const coerced = coerceFieldEntryToString(rawValue);
    if (coerced) {
      return coerced.trim();
    }
  }

  return null;
};

const deriveCustomerNameFromFields = (
  fields: Record<string, any>,
  fallback?: string | null,
): string | null => {
  const accountValue = findAccountLikeValue(fields);
  if (accountValue) {
    return accountValue;
  }

  const directCustomerName = coerceFieldEntryToString(fields.customer_name);
  if (directCustomerName) {
    return directCustomerName.trim();
  }

  if (typeof fallback === 'string' && fallback.trim().length > 0) {
    return fallback.trim();
  }

  return null;
};

interface BOMBuilderProps {
  onBOMUpdate: (items: BOMItem[]) => void;
  canSeePrices: boolean;
  canSeeCosts?: boolean;
  quoteId?: string;
  mode?: 'new' | 'edit' | 'view';
}

const SLOT_LEVEL4_FLAG = '__slotLevel4Session';

const calculateChassisPricing = (
  chassis: Level2Product,
  assignments: Record<number, Level3Product>,
) => {
  const basePrice = Number(chassis.price) || 0;
  const baseCost = Number(chassis.cost) || 0;

  return Object.values(assignments).reduce(
    (totals, assignment) => {
      if (!assignment) {
        return totals;
      }

      const extended = assignment as Level3Product & Record<string, any>;

      if (extended.isBushingSecondary || extended.isSharedLevel4Config) {
        return totals;
      }

      const price = Number(extended.price ?? (extended as any)?.product?.price) || 0;
      const cost = Number(extended.cost ?? (extended as any)?.product?.cost) || 0;

      return {
        price: totals.price + price,
        cost: totals.cost + cost,
      };
    },
    { price: basePrice, cost: baseCost },
  );
};

const convertRackLayoutToAssignments = (
  layout?: {
    slots?: Array<{
      slot?: number | null;
      slotNumber?: number | null;
      cardName?: string | null;
      partNumber?: string | null;
      product?: { id?: string | null; name?: string | null; displayName?: string | null; partNumber?: string | null; part_number?: string | null } | null;
      level4Config?: any;
      level4Selections?: any;
      productId?: string | null;
      product_id?: string | null;
      cardId?: string | null;
      card_id?: string | null;
    }>;
  }
): Record<number, Level3Product & Record<string, any>> | undefined => {
  if (!layout?.slots || layout.slots.length === 0) {
    return undefined;
  }

  return layout.slots.reduce<Record<number, Level3Product & Record<string, any>>>((acc, slot) => {
    const position = typeof slot.slot === 'number'
      ? slot.slot
      : typeof slot.slotNumber === 'number'
        ? slot.slotNumber
        : undefined;

    if (position === undefined) {
      return acc;
    }

    const rawSlot = slot as Record<string, any>;
    const cardRecord = (rawSlot.card as Record<string, any> | undefined) || undefined;
    const nestedProduct =
      (cardRecord?.product as Record<string, any> | undefined) ||
      (cardRecord?.card as Record<string, any> | undefined) ||
      (cardRecord?.level3Product as Record<string, any> | undefined) ||
      undefined;

    // Prefer explicit product on the slot, then card/nested fallbacks
    const productSource =
      (rawSlot.product as Record<string, any> | null | undefined) ||
      cardRecord ||
      nestedProduct ||
      // keep main-branch fallback (equivalent to cardRecord but safe if rawSlot not used)
      ((slot as Record<string, any>).card as Record<string, any> | undefined) ||
      undefined;

    // Exhaustive product ID resolution across known shapes/keys
    const productId =
      rawSlot.productId ??
      rawSlot.product_id ??
      rawSlot.cardId ??
      rawSlot.card_id ??
      rawSlot.level3ProductId ??
      rawSlot.level3_product_id ??
      cardRecord?.id ??
      (cardRecord as any)?.productId ??
      (cardRecord as any)?.product_id ??
      (cardRecord as any)?.cardId ??
      (cardRecord as any)?.card_id ??
      (cardRecord as any)?.level3ProductId ??
      (cardRecord as any)?.level3_product_id ??
      (nestedProduct as any)?.id ??
      (nestedProduct as any)?.productId ??
      (nestedProduct as any)?.product_id ??
      (slot as any).productId ??
      (slot as any).product_id ??
      (slot as any).cardId ??
      (slot as any).card_id ??
      productSource?.id ??
      undefined;

    // Friendly display name with fallbacks
    const name =
      (slot as any).cardName ||
      productSource?.displayName ||
      productSource?.name ||
      `Slot ${position} Card`;

    // Resolve part number from multiple possible shapes/keys
    const partNumber =
      (slot as any).partNumber ||
      rawSlot.part_number ||
      rawSlot.cardPartNumber ||
      rawSlot.card_part_number ||
      cardRecord?.partNumber ||
      (cardRecord as any)?.part_number ||
      (cardRecord as any)?.cardPartNumber ||
      (cardRecord as any)?.card_part_number ||
      (typeof (cardRecord as any)?.pn === 'string'
        ? (cardRecord as any).pn
        : undefined) ||
      (nestedProduct as any)?.partNumber ||
      (nestedProduct as any)?.part_number ||
      (slot as any).part_number ||
      productSource?.partNumber ||
      (productSource as any)?.part_number ||
      undefined;

    acc[position] = {
      id: productId || `slot-${position}`,
      name,
      displayName: name,
      description: '',
      price: 0,
      enabled: true,
      parent_product_id: '',
      product_level: 3,
      partNumber,
      level4Config: slot.level4Config ?? null,
      level4Selections: slot.level4Selections ?? null,
    } as Level3Product & Record<string, any>;

    return acc;
  }, {});
};

const deepClone = <T,>(value: T): T => {
  if (value === undefined || value === null) {
    return value;
  }

  try {
    return JSON.parse(JSON.stringify(value));
  } catch (error) {
    console.warn('Failed to deep clone value, returning original reference.', error);
    return value;
  }
};

const normalizeDraftBomValue = (value: unknown): Record<string, any> | null => {
  if (!value) {
    return null;
  }

  if (typeof value === 'string') {
    try {
      const parsed = JSON.parse(value);
      if (parsed && typeof parsed === 'object' && !Array.isArray(parsed)) {
        return parsed as Record<string, any>;
      }
    } catch (error) {
      console.warn('Failed to parse draft BOM string. Skipping draft BOM merge.', error);
      return null;
    }
  }

  if (typeof value === 'object' && !Array.isArray(value)) {
    return value as Record<string, any>;
  }

  return null;
};

const getDerivedCustomerName = (
  fields: Record<string, any> | null | undefined,
  fallback?: string | null,
): string | null => {
  const derived = deriveCustomerNameFromFields(fields ?? undefined, fallback ?? null);
  if (typeof derived === 'string') {
    const trimmed = derived.trim();
    if (trimmed.length > 0) {
      return trimmed;
    }
  }

  return null;
};

const resolveCustomerNameFromFields = (
  fields: Record<string, any> | null | undefined,
  fallback?: string | null,
): string => {
  const derived = getDerivedCustomerName(fields, fallback);
  if (derived) {
    return derived;
  }

  if (typeof fallback === 'string' && fallback.trim().length > 0) {
    return fallback.trim();
  }

  return 'Pending Customer';
};

const resolveToastCustomerName = (
  fields: Record<string, any> | null | undefined,
  fallback?: string | null,
): string => {
  const accountValue = findAccountFieldValue(fields ?? undefined);
  if (accountValue && accountValue.trim().length > 0) {
    return accountValue.trim();
  }

  if (typeof fallback === 'string' && fallback.trim().length > 0) {
    return fallback.trim();
  }

  return 'Pending Customer';
};

const mergeQuoteFieldsIntoDraftBom = (
  draftBom: unknown,
  fields: Record<string, any>,
): Record<string, any> | null => {
  const base = normalizeDraftBomValue(draftBom);
  if (!base) {
    return null;
  }

  return {
    ...base,
    quoteFields: fields,
    quote_fields: fields,
  };
};

const normalizePartNumberContext = (context: any) => {
  if (!context || typeof context !== 'object') {
    return undefined;
  }

  const base =
    'pnConfig' in context || 'codeMap' in context
      ? (context as Record<string, any>)
      : { pnConfig: context, codeMap: {} };

  const normalized: Record<string, any> = {
    ...base,
    pnConfig: base.pnConfig ? deepClone(base.pnConfig) : null,
    codeMap:
      base.codeMap && typeof base.codeMap === 'object'
        ? deepClone(base.codeMap)
        : {},
  };

  return normalized;
};

const resolvePartNumberContext = (...candidates: Array<any>) => {
  for (const candidate of candidates) {
    if (!candidate) continue;

    const container =
      typeof candidate === 'object' && candidate !== null && 'partNumberContext' in candidate
        ? (candidate as Record<string, any>).partNumberContext
        : candidate;

    if (container && typeof container === 'object') {
      const context = container as Record<string, any>;
      if ('pnConfig' in context || 'codeMap' in context) {
        return context;
      }
    }
  }

  return undefined;
};

const slotSignature = (card?: Level3Product & Record<string, any>) => {
  if (!card) {
    return '';
  }

  const productId =
    (card as any).productId ||
    (card as any).product_id ||
    (card as any).cardId ||
    (card as any).card_id ||
    card.id ||
    '';

  const partNumber =
    (card as any).partNumber ||
    (card as any).part_number ||
    card.partNumber ||
    '';

  return `${productId}::${partNumber}`;
};

const haveSlotAssignmentsChanged = (
  originalAssignments?: Record<number, Level3Product & Record<string, any>>,
  currentAssignments?: Record<number, Level3Product & Record<string, any>>
) => {
  const original = originalAssignments || {};
  const current = currentAssignments || {};

  const allSlots = new Set([
    ...Object.keys(original).map(slot => Number.parseInt(slot, 10)),
    ...Object.keys(current).map(slot => Number.parseInt(slot, 10)),
  ]);

  if (allSlots.size === 0) {
    return false;
  }

  for (const slot of allSlots) {
    const originalCard = original[slot];
    const currentCard = current[slot];

    if (!originalCard && !currentCard) {
      continue;
    }

    if (!originalCard || !currentCard) {
      return true;
    }

    if (slotSignature(originalCard) !== slotSignature(currentCard)) {
      return true;
    }
  }

  return false;
};

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

  const pendingQuoteFieldSyncRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const lastSyncedQuoteFieldsRef = useRef<string>(JSON.stringify({}));

  // Admin-driven part number config and codes for the selected chassis
  const [pnConfig, setPnConfig] = useState<any | null>(null);
  const [codeMap, setCodeMap] = useState<Record<string, { template: string; slot_span: number; is_standard?: boolean; standard_position?: number | null; designated_only?: boolean; designated_positions?: number[]; outside_chassis?: boolean; notes?: string | null; exclusive_in_slots?: boolean; color?: string | null }>>({});
  const [level3Products, setLevel3Products] = useState<Level3Product[]>([]);
  const [autoPlaced, setAutoPlaced] = useState(false);
  const [selectedAccessories, setSelectedAccessories] = useState<Set<string>>(new Set());
  const [assetTypes, setAssetTypes] = useState<AssetType[]>([]);
  const [selectedAssetType, setSelectedAssetType] = useState<string>('');

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

  const getFieldConfig = useCallback(
    (fieldId: string) => availableQuoteFields.find(field => field.id === fieldId),
    [availableQuoteFields]
  );

  const getQuoteFieldValue = useCallback(
    (fieldId: string, fallback?: any) => {
      const camelCaseId = toCamelCase(fieldId);
      const pascalCaseId = toPascalCase(fieldId);
      const value = coalesce(
        quoteFields[fieldId],
        quoteFields[camelCaseId],
        quoteFields[pascalCaseId]
      );

      if (
        value === undefined ||
        value === null ||
        (typeof value === 'string' && value.trim() === '')
      ) {
        return fallback;
      }

      return value;
    },
    [quoteFields]
  );

  const resolveQuoteFieldValue = useCallback(
    (fieldId: string, defaultValue: any) => {
      const value = getQuoteFieldValue(fieldId);
      if (
        value !== undefined &&
        value !== null &&
        !(typeof value === 'string' && value.trim() === '')
      ) {
        return value;
      }

      const fieldConfig = getFieldConfig(fieldId);
      if (fieldConfig && fieldConfig.required) {
        return defaultValue;
      }

      return defaultValue;
    },
    [getFieldConfig, getQuoteFieldValue]
  );

  const isFieldRequired = useCallback(
    (fieldId: string) => Boolean(getFieldConfig(fieldId)?.required),
    [getFieldConfig]
  );

  const getStringFieldValue = useCallback(
    (fieldId: string, requiredFallback: string, optionalFallback?: string) => {
      const fallbackValue = isFieldRequired(fieldId)
        ? requiredFallback
        : optionalFallback ?? requiredFallback;

      const resolved = resolveQuoteFieldValue(fieldId, fallbackValue);

      if (resolved === undefined || resolved === null) {
        return fallbackValue;
      }

      if (typeof resolved === 'string') {
        return resolved.trim().length > 0 ? resolved : fallbackValue;
      }

      if (typeof resolved === 'number' && Number.isFinite(resolved)) {
        return String(resolved);
      }

      if (typeof resolved === 'boolean') {
        return resolved ? 'true' : 'false';
      }

      return String(resolved);
    },
    [isFieldRequired, resolveQuoteFieldValue]
  );
  
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
      
      // Generate identifiers for the draft quote
      const resolvedCustomerName = resolveCustomerNameFromFields(
        quoteFields,
        getStringFieldValue('customer_name', 'Pending Customer'),
      );
      const toastCustomerName = resolveToastCustomerName(
        quoteFields,
        resolvedCustomerName,
      );

      const draftQuoteId = await generateUniqueDraftName(user.id, user.email);

      console.log('Generated human-readable draft quote ID:', draftQuoteId);

      const resolvedOracleCustomerId = getStringFieldValue('oracle_customer_id', 'TBD', 'TBD');
      const resolvedSfdcOpportunity = getStringFieldValue('sfdc_opportunity', 'TBD', 'TBD');
      const resolvedPriority = getStringFieldValue('priority', 'Medium');
      const resolvedShippingTerms = getStringFieldValue('shipping_terms', 'TBD', 'TBD');
      const resolvedPaymentTerms = getStringFieldValue('payment_terms', 'TBD', 'TBD');
      const resolvedCurrency = getStringFieldValue('currency', 'USD');
      const rawRepInvolved = resolveQuoteFieldValue('is_rep_involved', false);
      const resolvedRepInvolved =
        typeof rawRepInvolved === 'string'
          ? rawRepInvolved === 'true'
          : Boolean(rawRepInvolved);

      // Create draft quote with proper field mapping
      const quoteData = {
        id: draftQuoteId,
        user_id: user.id,
        customer_name: resolvedCustomerName,
        oracle_customer_id: resolvedOracleCustomerId,
        sfdc_opportunity: resolvedSfdcOpportunity,
        priority: (resolvedPriority as any) || 'Medium',
        shipping_terms: resolvedShippingTerms,
        payment_terms: resolvedPaymentTerms,
        currency: resolvedCurrency,
        is_rep_involved: resolvedRepInvolved,
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
        customer_name: resolvedCustomerName,
        status: 'draft'
      });
      setIsDraftMode(true);

      // Update URL without page reload
      window.history.replaceState({}, '', `/#configure?quoteId=${encodeURIComponent(draftQuoteId)}`);

      toast({
        title: 'Quote Created',
        description: `Draft ${draftQuoteId} for ${toastCustomerName} is ready for configuration. Your progress will be automatically saved.`
      });

      console.log('Draft quote created successfully:', draftQuoteId);
      lastSyncedQuoteFieldsRef.current = JSON.stringify(quoteFields ?? {});
    } catch (error) {
      console.error('Error creating draft quote:', error);
      toast({
        title: 'Error Creating Draft',
        description: error instanceof Error ? error.message : 'Unknown error occurred',
        variant: 'destructive'
      });
    }
  };

  // Background sync function to populate bom_items from draft_bom
  const syncDraftBomToDatabase = async (quoteId: string, items: BOMItem[]) => {
    try {
      console.log('Background sync: Populating bom_items from draft_bom');
      
      // Delete any existing items (should be 0, but just in case)
      await supabase
        .from('bom_items')
        .delete()
        .eq('quote_id', quoteId);
      
      // Insert all items
      const bomPayload = items.map(item => ({
        quote_id: quoteId,
        product_id: item.product.id,
        name: item.product.name,
        description: item.product.description,
        part_number: item.partNumber,
        quantity: item.quantity,
        unit_price: item.product.price,
        unit_cost: item.product.cost,
        total_price: item.product.price * item.quantity,
        total_cost: item.product.cost * item.quantity,
        margin: ((item.product.price - item.product.cost) / item.product.price) * 100,
        product_type: (item.product as any).category || 'standard',
        configuration_data: {
          slotAssignments: item.slotAssignments ? serializeSlotAssignments(item.slotAssignments) : undefined,
          rackConfiguration: item.rackConfiguration,
          level4Config: item.level4Config,
          level4Selections: item.level4Selections,
          ...item.product
        },
      }));
      
      const { error: insertError } = await supabase
        .from('bom_items')
        .insert(bomPayload);
        
      if (insertError) {
        throw insertError;
      }
        
      console.log('✓ Background sync completed:', bomPayload.length, 'items');
    } catch (error) {
      console.error('Background sync failed:', error);
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
      
      // Load quote data - use maybeSingle to handle missing quotes gracefully
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .maybeSingle();
        
      if (quoteError) {
        console.error('Error loading quote:', quoteError);
        toast({
          title: "Error Loading Quote",
          description: `Failed to load quote ${quoteId}: ${quoteError.message}`,
          variant: "destructive"
        });
        setIsLoading(false);
        return;
      }
      
      if (!quote) {
        console.log('No quote found with ID:', quoteId);
        toast({
          title: 'Quote Not Found',
          description: `Quote ${quoteId} does not exist. Please check the quote ID and try again.`,
          variant: 'destructive'
        });
        setIsLoading(false);
        // Clear invalid quote ID from URL
        window.history.replaceState({}, '', '/#configure');
        return;
      }
      
      console.log('Successfully loaded quote:', quote);
setCurrentQuote(quote); // Store the loaded quote data

let loadedItems: BOMItem[] = [];

    // Check if this is a cloned quote - force load from bom_items
    const isClonedQuote = !!quote.source_quote_id;
    
    if (isClonedQuote) {
      console.log('Loading cloned quote - querying bom_items table');
      
      // Clear any stale configuration state
      setConfiguringLevel4Item(null);
      setConfiguringChassis(null);
      setSelectedChassis(null);
      
      // Add retry logic for cloned quotes (handles timing/transaction issues)
      let retryCount = 0;
      const maxRetries = 3;
      let bomData = null;
      let bomError = null;
      
      while (retryCount <= maxRetries) {
        const result = await supabase
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
          
        bomError = result.error;
        bomData = result.data;
        
        if (bomError) {
          console.error('Error loading BOM items:', bomError);
          toast({
            title: "Error Loading BOM Items",
            description: `Failed to load BOM items: ${bomError.message}`,
            variant: "destructive"
          });
          throw bomError;
        }
        
        // If we got items, great!
        if (bomData && bomData.length > 0) {
          console.log(`Successfully loaded ${bomData.length} BOM items from database`);
          break;
        }
        
        // If no items but draft_bom has items, wait and retry
        if (quote.draft_bom?.items?.length > 0 && retryCount < maxRetries) {
          console.log(`Retry ${retryCount + 1}/${maxRetries}: Waiting for BOM items to be committed...`);
          await new Promise(resolve => setTimeout(resolve, 500));
          retryCount++;
        } else {
          break;
        }
      }
      
      // Fallback: if still no items but draft_bom exists, use it
      if ((!bomData || bomData.length === 0) && quote.draft_bom?.items?.length > 0) {
        console.log('⚠️ Fallback: Loading from draft_bom since bom_items is empty');
        toast({
          title: "Loading from Backup",
          description: "Initializing BOM data from draft backup...",
          duration: 2000,
        });
        
        // Use draft_bom loading logic
        loadedItems = await Promise.all(
          quote.draft_bom.items.map(async (item: any) => {
            const configData = item.configuration_data || item.product?.configuration_data || {};
            const embeddedPartNumberContext = configData?.partNumberContext;
            if (embeddedPartNumberContext) {
              delete configData.partNumberContext;
            }

            const partNumberContext = resolvePartNumberContext(
              item.partNumberContext,
              embeddedPartNumberContext,
              configData
            );
            const storedSlotAssignments = configData.slotAssignments as SerializedSlotAssignment[] | undefined;
            const slotAssignmentsMap = deserializeSlotAssignments(storedSlotAssignments);
            const rackLayout = configData.rackConfiguration || buildRackLayoutFromAssignments(storedSlotAssignments);

            return {
              id: item.id || crypto.randomUUID(),
              product: {
                id: item.product_id || item.product?.id,
                name: item.name || item.product?.name,
                partNumber: item.part_number || item.product?.partNumber,
                price: item.unit_price || item.product?.price,
                cost: item.unit_cost || item.product?.cost,
                description: item.description || item.product?.description,
                ...configData
              },
              quantity: item.quantity,
              enabled: true,
              partNumber: item.part_number || item.product?.partNumber,
              level4Values: [],
              slotAssignments: slotAssignmentsMap,
              rackConfiguration: rackLayout,
              level4Config: configData.level4Config || undefined,
              level4Selections: configData.level4Selections || undefined,
              partNumberContext: normalizePartNumberContext(partNumberContext),
            };
          })
        );
        
        // Trigger background sync to populate bom_items table
        syncDraftBomToDatabase(quoteId, loadedItems).catch(err => {
          console.error('Background sync failed:', err);
        });
      } else {
        // Convert BOM items back to local format with proper structure
        loadedItems = (bomData || []).map(item => {
          const configData = item.configuration_data || {};
          const embeddedPartNumberContext = (configData as any)?.partNumberContext;
          if (embeddedPartNumberContext) {
            delete (configData as any).partNumberContext;
          }

          const partNumberContext = resolvePartNumberContext(
            item.partNumberContext,
            embeddedPartNumberContext,
            configData
          );
          const storedSlotAssignments = configData.slotAssignments as SerializedSlotAssignment[] | undefined;
          const slotAssignmentsMap = deserializeSlotAssignments(storedSlotAssignments);
          const rackLayout = configData.rackConfiguration || buildRackLayoutFromAssignments(storedSlotAssignments);
          const directLevel4 = configData.level4Config ?? null;
          const slotLevel4 = storedSlotAssignments?.filter(assign => assign.level4Config || assign.level4Selections) || [];
          const mergedLevel4 = directLevel4 || (slotLevel4.length > 0 ? { slots: slotLevel4 } : null);

          return {
            id: item.id,
            product: {
              id: item.product_id,
              name: item.name,
              partNumber: item.part_number,
              price: item.unit_price,
              cost: item.unit_cost,
              description: item.description,
              ...configData
            },
            quantity: item.quantity,
            enabled: true,
            partNumber: item.part_number,
            level4Values: item.bom_level4_values || [],
            original_unit_price: item.original_unit_price || item.unit_price,
            approved_unit_price: item.approved_unit_price || item.unit_price,
            priceHistory: item.price_adjustment_history || [],
            slotAssignments: slotAssignmentsMap,
            rackConfiguration: rackLayout,
            level4Config: mergedLevel4 || undefined,
            level4Selections: configData.level4Selections || undefined,
            partNumberContext: normalizePartNumberContext(partNumberContext),
          };
        });
      }
    } else if (
      quote.status === 'draft' &&
      quote.draft_bom &&
      quote.draft_bom.items &&
      Array.isArray(quote.draft_bom.items)
    ) {
  console.log('Loading BOM data from draft_bom field');
  loadedItems = await Promise.all(
    quote.draft_bom.items.map(async (item: any) => {
      // Use stored values from draft_bom, fallback to unit_price/unit_cost, then fetch if needed
      let price = item.product?.price || item.unit_price || item.total_price || 0;
      let cost = item.product?.cost || item.unit_cost || item.total_cost || 0;

      // Build configuration sources (prefer explicit item fields, then product fields)
      const productSource = (typeof item.product === 'object' && item.product) || {};
      const configurationSources = [
        typeof (productSource as any)?.configuration === 'object'
          ? (productSource as any).configuration
          : null,
        typeof (productSource as any)?.configuration_data === 'object'
          ? (productSource as any).configuration_data
          : null,
        typeof item.configuration === 'object' ? item.configuration : null,
        typeof item.configuration_data === 'object' ? item.configuration_data : null,
        typeof item.configurationData === 'object' ? item.configurationData : null,
      ].filter(Boolean) as Record<string, any>[];

      const rawConfiguration = Object.assign({}, ...configurationSources);
      const nestedConfiguration =
        typeof rawConfiguration.configuration === 'object'
          ? rawConfiguration.configuration
          : undefined;

      const mergedConfigurationData = { ...productSource, ...rawConfiguration };
      const mergedPartNumberContext = (mergedConfigurationData as any)?.partNumberContext;
      if (mergedPartNumberContext) {
        delete (mergedConfigurationData as any).partNumberContext;
      }

      const partNumberContext = resolvePartNumberContext(
        item.partNumberContext,
        rawConfiguration.partNumberContext,
        nestedConfiguration?.partNumberContext,
        mergedPartNumberContext,
        productSource,
        item.configuration_data,
        item.configuration
      );

      // Slot assignments: accept array or object maps; check multiple possible fields
      const rawSlotAssignments =
        item.slotAssignments ||
        item.slot_assignments ||
        rawConfiguration.slotAssignments ||
        rawConfiguration.slot_assignments ||
        nestedConfiguration?.slotAssignments ||
        nestedConfiguration?.slot_assignments ||
        (productSource as any)?.slotAssignments ||
        (productSource as any)?.slot_assignments ||
        (mergedConfigurationData as any)?.slotAssignments ||
        (mergedConfigurationData as any)?.slot_assignments;

      const normalizedSlotAssignments: SerializedSlotAssignment[] | undefined = Array.isArray(
        rawSlotAssignments,
      )
        ? rawSlotAssignments
        : rawSlotAssignments && typeof rawSlotAssignments === 'object'
        ? Object.entries(rawSlotAssignments).map(([slotKey, cardData]) => {
            const slotNumber = Number.parseInt(slotKey, 10);
            const card = (cardData || {}) as Record<string, any>;

            const productSource = (card.product || card.card || {}) as Record<string, any>;
            const productId =
              card.id ||
              card.productId ||
              card.product_id ||
              card.cardId ||
              card.card_id ||
              card.level3ProductId ||
              card.level3_product_id ||
              productSource.id;

            const partNumber =
              card.partNumber ||
              card.part_number ||
              productSource.partNumber ||
              productSource.part_number ||
              (typeof card.pn === 'string' ? card.pn : undefined);

            const displayName =
              card.displayName ||
              card.name ||
              productSource.displayName ||
              productSource.name;

            return {
              slot: Number.isNaN(slotNumber) ? 0 : slotNumber,
              productId: productId,
              name: card.name || productSource.name,
              displayName,
              partNumber,
              hasLevel4Configuration:
                Boolean(card.hasLevel4Configuration) ||
                Boolean(card.has_level4) ||
                Boolean(card.requires_level4_config),
              level4BomItemId: card.level4BomItemId,
              level4TempQuoteId: card.level4TempQuoteId,
              level4Config: card.level4Config ?? null,
              level4Selections: card.level4Selections ?? null,
              isBushingPrimary: card.isBushingPrimary ?? false,
              isBushingSecondary: card.isBushingSecondary ?? false,
              bushingPairSlot: card.bushingPairSlot ?? card.bushing_pair_slot ?? null,
            } as SerializedSlotAssignment;
          })
        : undefined;

      // Rack configuration: gather from several possible fields
      const storedRackConfiguration =
        item.rackConfiguration ||
        item.rack_configuration ||
        rawConfiguration.rackConfiguration ||
        rawConfiguration.rack_configuration ||
        nestedConfiguration?.rackConfiguration ||
        nestedConfiguration?.rack_configuration ||
        (productSource as any)?.rackConfiguration ||
        (productSource as any)?.rack_configuration ||
        (mergedConfigurationData as any)?.rackConfiguration ||
        (mergedConfigurationData as any)?.rack_configuration;

      const slotAssignmentsMap =
        deserializeSlotAssignments(normalizedSlotAssignments) ||
        convertRackLayoutToAssignments(storedRackConfiguration);

      const serializedAssignments =
        normalizedSlotAssignments ||
        (slotAssignmentsMap ? serializeSlotAssignments(slotAssignmentsMap) : undefined);

      // If price or cost is 0, fetch fresh product data
      if ((price === 0 || cost === 0) && (item.productId || item.product_id)) {
        try {
          const { data: productData } = await supabase
            .from('products')
            .select('price, cost')
            .eq('id', item.productId || item.product_id)
            .single();

          if (productData) {
            if (price === 0) price = productData.price || 0;
            if (cost === 0) cost = productData.cost || 0;
          }
        } catch (error) {
          console.warn('Failed to fetch product pricing:', error);
        }
      }

      // Build final rack layout from stored or from assignments
      const rackLayout = storedRackConfiguration || buildRackLayoutFromAssignments(serializedAssignments);

      // Level-4 data: check item, raw, nested, then merged
      const level4Config =
        item.level4Config ??
        rawConfiguration.level4Config ??
        nestedConfiguration?.level4Config ??
        (mergedConfigurationData as any)?.level4Config ??
        null;

      const level4Selections =
        item.level4Selections ??
        rawConfiguration.level4Selections ??
        nestedConfiguration?.level4Selections ??
        (mergedConfigurationData as any)?.level4Selections ??
        null;

      // Configuration object (if any)
      const configuration =
        (typeof item.configuration === 'object' && item.configuration) ||
        nestedConfiguration ||
        (rawConfiguration as any)?.configuration ||
        null;

      return {
        id: item.id || crypto.randomUUID(),
        product: {
          id: item.productId || item.product_id || item.product?.id,
          name: item.name || item.product?.name,
          partNumber: item.partNumber || item.part_number || item.product?.partNumber,
          description:
            item.description ||
            item.product?.description ||
            (mergedConfigurationData as any)?.description ||
            '',
          ...mergedConfigurationData,
          price,
          cost,
        },
        quantity: item.quantity || 1,
        enabled: item.enabled !== false,
        partNumber: item.partNumber || item.part_number || item.product?.partNumber,
        level4Values: item.level4Values || [],
        original_unit_price: item.original_unit_price || price,
        approved_unit_price: item.approved_unit_price || price,
        priceHistory: item.priceHistory || [],
        slotAssignments: slotAssignmentsMap ? { ...slotAssignmentsMap } : {},
        rackConfiguration: rackLayout,
        configuration: configuration || undefined,
        level4Config: level4Config || undefined,
        level4Selections: level4Selections || undefined,
        displayName:
          item.displayName ||
          (mergedConfigurationData as any)?.displayName ||
          (mergedConfigurationData as any)?.name,
        isAccessory: item.isAccessory ?? (mergedConfigurationData as any)?.isAccessory,
        partNumberContext: normalizePartNumberContext(partNumberContext),
      } as BOMItem;
    }),
  );
  console.log(`Loaded ${loadedItems.length} items from draft_bom`);
} else {
        console.log('Loading BOM data from bom_items table (submitted/approved quote)');
        
        const { data: bomData, error: bomError } = await supabase
          .from('bom_items')
          .select(`
            *,
            bom_level4_values (
              id,
              level4_config_id,
              entries
            ),
            products!inner (
              chassis_type,
              rack_configurable,
              product_level,
              has_level4
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
        loadedItems = (bomData || []).map(item => {
          const configData = item.configuration_data || {};
          const embeddedPartNumberContext = (configData as any)?.partNumberContext;
          if (embeddedPartNumberContext) {
            delete (configData as any).partNumberContext;
          }

          const partNumberContext = resolvePartNumberContext(
            item.partNumberContext,
            embeddedPartNumberContext,
            configData
          );
          const storedSlotAssignments = configData.slotAssignments as SerializedSlotAssignment[] | undefined;
          const slotAssignmentsMap = deserializeSlotAssignments(storedSlotAssignments);
          const rackLayout = configData.rackConfiguration || buildRackLayoutFromAssignments(storedSlotAssignments);
          const directLevel4 = configData.level4Config ?? null;
          const slotLevel4 = storedSlotAssignments?.filter(assign => assign.level4Config || assign.level4Selections) || [];
          const mergedLevel4 = directLevel4 || (slotLevel4.length > 0 ? { slots: slotLevel4 } : null);

          // Get product metadata from joined products table
          const productMeta = (item as any).products;
          
          return {
            id: item.id,
            product: {
              id: item.product_id,
              name: item.name,
              partNumber: item.part_number,
              price: item.unit_price,
              cost: item.unit_cost,
              description: item.description,
              chassisType: productMeta?.chassis_type || 'N/A',
              rack_configurable: productMeta?.rack_configurable || false,
              product_level: productMeta?.product_level || 2,
              has_level4: productMeta?.has_level4 || false,
              ...configData
            },
            quantity: item.quantity,
            enabled: true,
            partNumber: item.part_number,
            level4Values: item.bom_level4_values || [],
            original_unit_price: item.original_unit_price || item.unit_price,
            approved_unit_price: item.approved_unit_price || item.unit_price,
            priceHistory: item.price_adjustment_history || [],
            slotAssignments: slotAssignmentsMap,
            rackConfiguration: rackLayout,
            level4Config: mergedLevel4 || undefined,
            level4Selections: configData.level4Selections || undefined,
            partNumberContext: normalizePartNumberContext(partNumberContext),
          };
        });
      }
      
      // Validation: Check if draft_bom and bom_items are in sync
      if (quote.draft_bom?.items && Array.isArray(quote.draft_bom.items)) {
        const draftBomCount = quote.draft_bom.items.length;
        const bomItemsCount = loadedItems.length;
        
        if (draftBomCount !== bomItemsCount) {
          console.warn(
            `⚠️ Draft BOM out of sync: draft_bom has ${draftBomCount} items, bom_items has ${bomItemsCount} items`
          );
        } else {
          console.log(`✓ Draft BOM in sync: ${bomItemsCount} items in both sources`);
        }
      }
      
      setBomItems(loadedItems);
      
      // Restore quote fields
      if (quote.quote_fields) {
        setQuoteFields(quote.quote_fields);
        lastSyncedQuoteFieldsRef.current = JSON.stringify(quote.quote_fields ?? {});
      } else {
        setQuoteFields({});
        lastSyncedQuoteFieldsRef.current = JSON.stringify({});
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

  const buildDraftBomSnapshot = (itemsToUse?: BOMItem[]) => {
    const rackLayoutSummaries: Array<Record<string, any>> = [];
    const level4Summaries: Array<Record<string, any>> = [];

    let totalValue = 0;
    let totalCost = 0;

    // Use passed items or fall back to state
    const items = (itemsToUse || bomItems).map(item => {
      const price = item.product.price || 0;
      const cost = item.product.cost || 0;

      totalValue += price * item.quantity;
      totalCost += cost * item.quantity;

      if (price === 0) {
        console.warn(`Item ${item.product.name} has 0 price - this may cause issues`);
      }

      const serializedSlots = item.slotAssignments
        ? serializeSlotAssignments(item.slotAssignments)
        : undefined;

      const rackLayout = item.rackConfiguration || buildRackLayoutFromAssignments(serializedSlots);

      const partNumberContext =
        item.partNumberContext ||
        resolvePartNumberContext(item.configuration, item.product);

      if (rackLayout?.slots && rackLayout.slots.length > 0) {
        rackLayoutSummaries.push({
          productId: item.product.id,
          productName: item.product.name,
          partNumber: item.partNumber || item.product.partNumber,
          layout: rackLayout,
        });
      }

      const slotLevel4 = serializedSlots?.filter(slot => slot.level4Config || slot.level4Selections) || [];

      if (slotLevel4.length > 0) {
        level4Summaries.push({
          productId: item.product.id,
          productName: item.product.name,
          partNumber: item.partNumber || item.product.partNumber,
          slots: slotLevel4.map(slot => ({
            slot: slot.slot,
            cardName: slot.displayName || slot.name,
            configuration: slot.level4Config || slot.level4Selections,
          })),
        });
      }

      if (item.level4Config) {
        level4Summaries.push({
          productId: item.product.id,
          productName: item.product.name,
          partNumber: item.partNumber || item.product.partNumber,
          configuration: item.level4Config,
        });
      }

      return {
        product_id: item.product.id,
        name: item.product.name,
        description: item.product.description,
        part_number: item.partNumber || item.product.partNumber,
        quantity: item.quantity,
        unit_price: price,
        unit_cost: cost,
        total_price: price * item.quantity,
        total_cost: cost * item.quantity,
        margin: cost > 0 ? ((price - cost) / price) * 100 : 100,
        configuration_data: {
          ...item.product,
          price,
          cost,
          partNumberContext: partNumberContext ? deepClone(partNumberContext) : undefined,
        },
        product_type: 'standard',
        slotAssignments: serializedSlots,
        rackConfiguration: rackLayout,
        level4Config: item.level4Config || null,
        level4Selections: item.level4Selections || null,
        partNumberContext: partNumberContext ? deepClone(partNumberContext) : undefined,
      };
    });

    const grossProfit = totalValue - totalCost;
    const quoteOriginalMargin = totalValue > 0 ? (grossProfit / totalValue) * 100 : 0;
    const draftOriginalMargin =
      totalCost > 0 && totalValue > 0 ? (grossProfit / totalValue) * 100 : 100;
    const discountedValue = totalValue * (1 - discountPercentage / 100);
    const discountedMargin =
      totalCost > 0 && discountedValue > 0
        ? ((discountedValue - totalCost) / discountedValue) * 100
        : 100;

    const draftBomData = {
      items,
      quoteFields,
      discountPercentage,
      discountJustification,
      totals: {
        totalValue,
        totalCost,
        grossProfit,
        originalMargin: draftOriginalMargin,
        discountedValue,
        discountedMargin,
      },
      rackLayouts: rackLayoutSummaries,
      level4Configurations: level4Summaries,
    };

    return {
      draftBomData,
      totals: {
        totalValue,
        totalCost,
        grossProfit,
        originalMargin: quoteOriginalMargin,
        draftOriginalMargin,
        discountedValue,
        discountedMargin,
      },
    };
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

      await flushQuoteFieldSync();

      const resolvedCustomerName = resolveCustomerNameFromFields(
        quoteFields,
        currentQuote?.customer_name ?? 'Pending Customer',
      );

      const defaultOracleCustomerId =
        typeof currentQuote?.oracle_customer_id === 'string' && currentQuote.oracle_customer_id.trim().length > 0
          ? currentQuote.oracle_customer_id.trim()
          : 'DRAFT';
      const resolvedOracleCustomerId = getStringFieldValue('oracle_customer_id', defaultOracleCustomerId, defaultOracleCustomerId);

      const defaultSfdcOpportunity =
        typeof currentQuote?.sfdc_opportunity === 'string' && currentQuote.sfdc_opportunity.trim().length > 0
          ? currentQuote.sfdc_opportunity.trim()
          : `DRAFT-${Date.now()}`;
      const resolvedSfdcOpportunity = getStringFieldValue('sfdc_opportunity', defaultSfdcOpportunity, defaultSfdcOpportunity);

      let quoteId = currentQuoteId;
      
      const { draftBomData, totals } = buildDraftBomSnapshot();
      const { totalValue, totalCost, grossProfit, originalMargin } = totals;

      // Create new draft if none exists
      if (!quoteId) {
        console.log('No current quote ID, creating new draft quote');

        const newQuoteId = await generateUniqueDraftName(user.id, user.email);

        console.log('Generated new draft quote ID:', newQuoteId);

        const resolvedPriority = getStringFieldValue('priority', 'Medium');
        const resolvedShippingTerms = getStringFieldValue('shipping_terms', 'Ex-Works', 'Ex-Works');
        const resolvedPaymentTerms = getStringFieldValue('payment_terms', 'Net 30', 'Net 30');
        const resolvedCurrency = getStringFieldValue('currency', 'USD');
        const rawRepInvolved = resolveQuoteFieldValue('is_rep_involved', false);
        const resolvedRepInvolved =
          typeof rawRepInvolved === 'string'
            ? rawRepInvolved === 'true'
            : Boolean(rawRepInvolved);

        const quoteData = {
          id: newQuoteId,
          user_id: user.id,
          customer_name: resolvedCustomerName,
          oracle_customer_id: resolvedOracleCustomerId,
          sfdc_opportunity: resolvedSfdcOpportunity,
          priority: (resolvedPriority as any) || 'Medium',
          shipping_terms: resolvedShippingTerms,
          payment_terms: resolvedPaymentTerms,
          currency: resolvedCurrency,
          is_rep_involved: resolvedRepInvolved,
          status: 'draft' as const,
          quote_fields: quoteFields,
          draft_bom: draftBomData,
          original_quote_value: totalValue,
          discounted_value: totalValue,
          total_cost: totalCost,
          requested_discount: 0,
          original_margin: originalMargin,
          discounted_margin: originalMargin,
          gross_profit: grossProfit,
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
          customer_name: resolvedCustomerName,
          oracle_customer_id: resolvedOracleCustomerId,
          sfdc_opportunity: resolvedSfdcOpportunity,
          status: 'draft',
          quote_fields: quoteFields,
          draft_bom: draftBomData,
        });
        quoteId = newQuoteId;

        window.history.replaceState({}, '', `/#configure?quoteId=${encodeURIComponent(newQuoteId)}`);

        console.log('Draft quote created successfully:', quoteId);
        lastSyncedQuoteFieldsRef.current = JSON.stringify(quoteFields ?? {});
      } else {
        // Update existing draft - also calculate and update totals
        const { error: updateError } = await supabase
          .from('quotes')
          .update({
            customer_name: resolvedCustomerName,
            oracle_customer_id: resolvedOracleCustomerId,
            sfdc_opportunity: resolvedSfdcOpportunity,
            quote_fields: quoteFields,
            draft_bom: draftBomData,
            original_quote_value: totalValue,
            discounted_value: totalValue,
            total_cost: totalCost,
            original_margin: originalMargin,
            discounted_margin: originalMargin,
            gross_profit: grossProfit,
            updated_at: new Date().toISOString()
          })
          .eq('id', quoteId)
          .eq('status', 'draft'); // Safety check
          
        if (updateError) {
          console.error('Quote update error:', updateError);
          throw new Error(`Failed to update draft: ${updateError.message}`);
        }

        setCurrentQuote(prev => prev ? {
          ...prev,
          customer_name: resolvedCustomerName,
          oracle_customer_id: resolvedOracleCustomerId,
          sfdc_opportunity: resolvedSfdcOpportunity,
          quote_fields: quoteFields,
          draft_bom: draftBomData,
        } : prev);
        console.log('Draft quote updated successfully:', quoteId);
        lastSyncedQuoteFieldsRef.current = JSON.stringify(quoteFields ?? {});
      }

      const toastCustomerName = resolveToastCustomerName(
        quoteFields,
        resolvedCustomerName,
      );

      toast({
        title: 'Draft Saved',
        description: `Draft ${quoteId} saved successfully with ${bomItems.length} items for ${toastCustomerName}`,
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
      await flushQuoteFieldSync();

      const { draftBomData, totals } = buildDraftBomSnapshot();
      const {
        totalValue,
        totalCost,
        discountedValue,
        discountedMargin,
        grossProfit,
        draftOriginalMargin,
      } = totals;

      // Update quote with draft BOM data
      const updatedCustomerName = resolveCustomerNameFromFields(
        quoteFields,
        currentQuote?.customer_name ?? 'Pending Customer',
      );

      const timestampFallback = `DRAFT-${Date.now()}`;
      const resolvedOracleCustomerId = getStringFieldValue('oracle_customer_id', 'DRAFT', 'DRAFT');
      const resolvedSfdcOpportunity = getStringFieldValue('sfdc_opportunity', timestampFallback, timestampFallback);
      
      // Use the same normalization logic as the auto-sync path so any account
      // style field (including select objects) can drive the persisted
      // customer name.
      const { error: quoteError } = await supabase
        .from('quotes')
        .update({
          customer_name: updatedCustomerName,
          oracle_customer_id: resolvedOracleCustomerId,
          sfdc_opportunity: resolvedSfdcOpportunity,
          original_quote_value: totalValue,
          discounted_value: discountedValue,
          requested_discount: discountPercentage,
          total_cost: totalCost,
          gross_profit: grossProfit,
          original_margin: draftOriginalMargin,
          discounted_margin: discountedMargin,
          quote_fields: quoteFields,
          discount_justification: discountJustification,
          draft_bom: draftBomData,
          status: 'draft',
          updated_at: new Date().toISOString()
        })
        .eq('id', currentQuoteId);

      if (quoteError) throw quoteError;

      lastSyncedQuoteFieldsRef.current = JSON.stringify(quoteFields ?? {});

      setCurrentQuote(prev => {
        if (!prev) {
          return prev;
        }

        const nextQuote: Record<string, any> = {
          ...prev,
          quote_fields: quoteFields,
          draft_bom: draftBomData,
        };

        if (updatedCustomerName) {
          nextQuote.customer_name = updatedCustomerName;
        }

        return nextQuote;
      });

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
    setQuoteFields(prev => {
      const nextFields = { ...prev, [fieldId]: value };

      setCurrentQuote(prevQuote => {
        if (!prevQuote) {
          return prevQuote;
        }

        const nextQuote: Record<string, any> = {
          ...prevQuote,
          quote_fields: nextFields,
        };

        const derivedCustomerName = getDerivedCustomerName(nextFields, prevQuote.customer_name ?? null);
        if (derivedCustomerName) {
          nextQuote.customer_name = derivedCustomerName;
        }

        return nextQuote;
      });

      return nextFields;
    });
  };

  const syncQuoteFieldsToSupabase = useCallback(
    async (fields: Record<string, any>, serializedSnapshot: string) => {
      if (!currentQuoteId || !isDraftMode) {
        return;
      }

      try {
        const derivedCustomerName = getDerivedCustomerName(fields, currentQuote?.customer_name ?? null);
        const draftBomUpdate = mergeQuoteFieldsIntoDraftBom(currentQuote?.draft_bom, fields);
        const updatePayload: Record<string, any> = {
          quote_fields: fields,
          updated_at: new Date().toISOString(),
        };

        if (derivedCustomerName) {
          updatePayload.customer_name = derivedCustomerName;
        }

        if (draftBomUpdate) {
          updatePayload.draft_bom = draftBomUpdate;
        }

        const { error } = await supabase
          .from('quotes')
          .update(updatePayload)
          .eq('id', currentQuoteId);

        if (error) {
          console.error('Error syncing quote fields to Supabase:', error);
          return;
        }

        lastSyncedQuoteFieldsRef.current = serializedSnapshot;

        setCurrentQuote(prev => {
          if (!prev) {
            return prev;
          }

          const nextDraftBom = mergeQuoteFieldsIntoDraftBom(prev.draft_bom, fields);
          const nextQuote: Record<string, any> = {
            ...prev,
            quote_fields: fields,
          };

          if (derivedCustomerName) {
            nextQuote.customer_name = derivedCustomerName;
          }

          if (nextDraftBom) {
            nextQuote.draft_bom = nextDraftBom;
          }

          return nextQuote;
        });
      } catch (error) {
        console.error('Failed to sync quote fields to Supabase:', error);
      }
    },
    [currentQuoteId, isDraftMode, currentQuote?.customer_name, currentQuote?.draft_bom]
  );

  const flushQuoteFieldSync = useCallback(async () => {
    if (!currentQuoteId || !isDraftMode) {
      return;
    }

    const serialized = JSON.stringify(quoteFields ?? {});
    if (serialized === lastSyncedQuoteFieldsRef.current) {
      return;
    }

    if (pendingQuoteFieldSyncRef.current) {
      clearTimeout(pendingQuoteFieldSyncRef.current);
      pendingQuoteFieldSyncRef.current = null;
    }

    await syncQuoteFieldsToSupabase(quoteFields ?? {}, serialized);
  }, [currentQuoteId, isDraftMode, quoteFields, syncQuoteFieldsToSupabase]);

  useEffect(() => {
    if (!currentQuoteId || !isDraftMode) {
      return;
    }

    const serialized = JSON.stringify(quoteFields ?? {});
    if (serialized === lastSyncedQuoteFieldsRef.current) {
      return;
    }

    if (pendingQuoteFieldSyncRef.current) {
      clearTimeout(pendingQuoteFieldSyncRef.current);
    }

    pendingQuoteFieldSyncRef.current = setTimeout(() => {
      pendingQuoteFieldSyncRef.current = null;
      syncQuoteFieldsToSupabase(quoteFields ?? {}, serialized);
    }, 750);

    return () => {
      if (pendingQuoteFieldSyncRef.current) {
        clearTimeout(pendingQuoteFieldSyncRef.current);
        pendingQuoteFieldSyncRef.current = null;
      }
    };
  }, [quoteFields, currentQuoteId, isDraftMode, syncQuoteFieldsToSupabase]);

  useEffect(() => {
    return () => {
      flushQuoteFieldSync().catch((error) => {
        console.error('Failed to flush pending quote field sync on unmount:', error);
      });
    };
  }, [flushQuoteFieldSync]);

  // Load Level 1 products for dynamic tabs - use real Supabase data
  const [level1Products, setLevel1Products] = useState<Level1Product[]>([]);
  const [allLevel2Products, setAllLevel2Products] = useState<Level2Product[]>([]);
  const [allLevel3Products, setAllLevel3Products] = useState<Level3Product[]>([]);
  const [level1Loading, setLevel1Loading] = useState(true);
  const [isLoading, setIsLoading] = useState(false);

  useEffect(() => {
    const loadAllProducts = async () => {
      try {
        await productDataService.initialize();

        const [l1, l2, l3, types] = await Promise.all([
          productDataService.getLevel1Products(),
          productDataService.getLevel2Products(),
          productDataService.getLevel3Products(),
          productDataService.getAssetTypes(),
        ]);
        setLevel1Products(
          l1
            .filter(p => p.enabled)
            .map(product => ({
              ...product,
              asset_type_id: product.asset_type_id ? String(product.asset_type_id) : undefined,
            })),
        );
        setAllLevel2Products(l2);
        setAllLevel3Products(l3);
        setAssetTypes(
          (types || [])
            .filter(type => type.enabled)
            .map(type => ({
              ...type,
              id: String(type.id),
            })),
        );
      } catch (error) {
        console.error('Error loading all products:', error);
        setLevel1Products([]);
        setAllLevel2Products([]);
        setAllLevel3Products([]);
        setAssetTypes([]);
      } finally {
        setLevel1Loading(false);
      }
    };

    loadAllProducts();
  }, []);

  useEffect(() => {
    // TODO: Add logic here if this useEffect was intended to perform an action
  }, [level3Products, codeMap, selectedAccessories]);

  const assetTypeNameById = useMemo(() => {
    const lookup = new Map<string, string>();

    assetTypes.forEach(assetType => {
      if (!assetType?.id) {
        return;
      }

      const normalizedId = String(assetType.id);
      const normalizedName = typeof assetType.name === 'string'
        ? assetType.name.trim().toLowerCase()
        : '';

      lookup.set(normalizedId, normalizedName);
    });

    return lookup;
  }, [assetTypes]);

  const filteredLevel1Products = useMemo(() => {
    if (!selectedAssetType) {
      return [];
    }

    const selectedAssetTypeName = assetTypeNameById.get(String(selectedAssetType));

    const addCandidate = (set: Set<string>, value: unknown) => {
      if (value === undefined || value === null) {
        return;
      }

      const normalized = String(value).trim();
      if (normalized.length === 0) {
        return;
      }

      set.add(normalized);
      set.add(normalized.toLowerCase());
    };

    return level1Products.filter(product => {
      const candidates = new Set<string>();

      addCandidate(candidates, (product as any).asset_type_id);
      addCandidate(candidates, (product as any).assetTypeId);
      addCandidate(candidates, (product as any).assetTypeID);

      const nestedAssetType = (product as any).assetType || (product as any).asset_type;
      if (nestedAssetType && typeof nestedAssetType === 'object') {
        addCandidate(candidates, (nestedAssetType as any).id);
        addCandidate(candidates, (nestedAssetType as any).name);
      }

      addCandidate(candidates, product.specifications?.assetType);
      addCandidate(candidates, product.specifications?.asset_type);
      addCandidate(candidates, product.category);

      if (candidates.size === 0) {
        return false;
      }

      if (candidates.has(String(selectedAssetType))) {
        return true;
      }

      if (selectedAssetTypeName && candidates.has(selectedAssetTypeName)) {
        return true;
      }

      return false;
    });
  }, [assetTypeNameById, level1Products, selectedAssetType]);

  const productMap = useMemo(() => {
    const map = new Map<string, string>();
    [...level1Products, ...allLevel2Products, ...allLevel3Products].forEach(p => {
      map.set(p.id, p.displayName || p.name);
    });
    return map;
  }, [level1Products, allLevel2Products, allLevel3Products]);

  // Set default active tab when asset type changes
  useEffect(() => {
    if (!selectedAssetType) {
      if (activeTab) {
        setActiveTab('');
      }
      if (selectedLevel1Product) {
        setSelectedLevel1Product(null);
      }
      return;
    }

    if (filteredLevel1Products.length === 0) {
      if (activeTab) {
        setActiveTab('');
      }
      if (selectedLevel1Product) {
        setSelectedLevel1Product(null);
      }
      return;
    }

    setActiveTab(prev => {
      const stillValid = filteredLevel1Products.some(product => product.id === prev);
      return stillValid ? prev : filteredLevel1Products[0].id;
    });
  }, [activeTab, filteredLevel1Products, selectedAssetType, selectedLevel1Product]);

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
    } else if (!activeTab && selectedLevel1Product) {
      setSelectedLevel1Product(null);
      setSelectedLevel2Options([]);
      setSelectedChassis(null);
      setSlotAssignments({});
      setSelectedSlot(null);
    }
  }, [activeTab, level1Products, selectedLevel1Product]);

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

  const handleAssetTypeChange = useCallback((assetTypeId: string) => {
    setSelectedAssetType(assetTypeId);
    setActiveTab('');
    setSelectedLevel1Product(null);
    setSelectedLevel2Options([]);
    setSelectedChassis(null);
    setSlotAssignments({});
    setSelectedSlot(null);
    setHasRemoteDisplay(false);
    setConfiguringChassis(null);
    setConfiguringNonChassis(null);
    setSelectedAccessories(new Set());
  }, []);

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
      
      // Try to use the active user when available (the service will validate/fetch as needed)
      const activeUserId = user?.id;

      console.log('Setting up Level 4 config for user:', activeUserId);
      
      // Create temporary quote and BOM item in database
      const { bomItemId, tempQuoteId } = await Level4Service.createBOMItemForLevel4Config(newItem, activeUserId);
      
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

      let description = 'Failed to prepare Level 4 configuration. Please try again.';
      if (error instanceof Error && error.message.includes('authenticated')) {
        description = 'You must be signed in to configure Level 4 options. Please log in and try again.';
      }

      toast({
        title: 'Error',
        description,
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

    const partNumberContext =
      pnConfig || (codeMap && Object.keys(codeMap).length > 0)
        ? {
            pnConfig: pnConfig ? deepClone(pnConfig) : null,
            codeMap: codeMap ? deepClone(codeMap) : {},
          }
        : undefined;

    const { price: totalPrice, cost: totalCost } = calculateChassisPricing(
      selectedChassis,
      slotAssignments,
    );

    const quantity = 1;
    const margin = totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 100;

    // Create a new BOM item for the chassis with its configuration
    const newItem: BOMItem = {
      id: `chassis-${Date.now()}`,
      product: {
        ...selectedChassis,
        displayName: selectedChassis.name,
        partNumber: partNumber,
        price: totalPrice,
        cost: totalCost,
      },
      quantity,
      enabled: true,
      partNumber: partNumber,
      displayName: selectedChassis.name,
      slotAssignments: { ...slotAssignments },
      configuration: {
        hasRemoteDisplay,
      },
      partNumberContext,
      unit_price: totalPrice,
      unit_cost: totalCost,
      total_price: totalPrice * quantity,
      total_cost: totalCost * quantity,
      margin,
      original_unit_price: totalPrice,
      approved_unit_price: totalPrice,
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
    setPnConfig(null);
    setCodeMap({});

    // Show success message
    toast({
      title: 'Configuration Added',
      description: `${selectedChassis.name} and selected accessories have been added to your bill of materials.`,
    });
  };

  const handleUpdateChassisInBOM = () => {
    if (!selectedChassis || !editingOriginalItem) return;


    const originalSlotAssignments =
      (editingOriginalItem.slotAssignments && Object.keys(editingOriginalItem.slotAssignments).length > 0
        ? editingOriginalItem.slotAssignments
        : convertRackLayoutToAssignments(editingOriginalItem.rackConfiguration)) ||
      {};

    const normalizedCurrentAssignments = Object.keys(slotAssignments).length > 0 ? slotAssignments : {};

    const generatedPartNumber = buildQTMSPartNumber({
      chassis: selectedChassis,
      slotAssignments,
      hasRemoteDisplay,
      pnConfig,
      codeMap,
      includeSuffix: true,
    });

    // Check if the configuration has actually changed
    // Ensure both slot assignments are using number keys for proper comparison
    const originalHasRemoteDisplay = editingOriginalItem.configuration?.hasRemoteDisplay || false;
    
    // Normalize slot assignments to use number keys for comparison
    const normalizeSlotKeys = (assignments: Record<string | number, any>): Record<number, any> => {
      const normalized: Record<number, any> = {};
      Object.entries(assignments).forEach(([key, value]) => {
        const numKey = typeof key === 'string' ? parseInt(key, 10) : key;
        if (!isNaN(numKey)) {
          normalized[numKey] = value;
        }
      });
      return normalized;
    };
    
    const normalizedOriginal = normalizeSlotKeys(originalSlotAssignments);
    const normalizedCurrent = normalizeSlotKeys(normalizedCurrentAssignments);
    
    // Deep comparison of slot assignments using normalized keys
    const slotAssignmentsChanged = 
      Object.keys(normalizedOriginal).length !== Object.keys(normalizedCurrent).length ||
      Object.entries(normalizedCurrent).some(([slot, card]) => {
        const slotNum = parseInt(slot, 10);
        const originalCard = normalizedOriginal[slotNum];
        return !originalCard || originalCard.id !== card.id;
      });
    
    const remoteDisplayChanged = originalHasRemoteDisplay !== hasRemoteDisplay;

    const shouldRegeneratePartNumber = slotAssignmentsChanged || remoteDisplayChanged;

    console.log('Configuration comparison:', {
      originalSlots: Object.keys(normalizedOriginal),
      currentSlots: Object.keys(normalizedCurrent),
      slotAssignmentsChanged,
      remoteDisplayChanged,
      originalHasRemoteDisplay,
      currentHasRemoteDisplay: hasRemoteDisplay,
    });

    const partNumber = shouldRegeneratePartNumber
      ? generatedPartNumber
      : editingOriginalItem.partNumber || generatedPartNumber;

    const capturedContext =
      pnConfig || (codeMap && Object.keys(codeMap).length > 0)
        ? {
            pnConfig: pnConfig ? deepClone(pnConfig) : null,
            codeMap: codeMap ? deepClone(codeMap) : {},
          }
        : undefined;

    const partNumberContext = shouldRegeneratePartNumber
      ? capturedContext
      : editingOriginalItem.partNumberContext || capturedContext;

    const { price: totalPrice, cost: totalCost } = calculateChassisPricing(
      selectedChassis,
      slotAssignments,
    );
    const quantity = editingOriginalItem.quantity || 1;
    const margin = totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 100;

    const updatedItem: BOMItem = {
      ...editingOriginalItem,
      product: {
        ...selectedChassis,
        displayName: selectedChassis.name,
        partNumber: partNumber,
        price: totalPrice,
        cost: totalCost,
      },
      partNumber: partNumber,
      displayName: selectedChassis.name,
      slotAssignments: { ...slotAssignments },
      configuration: {
        hasRemoteDisplay,
      },
      partNumberContext,
      unit_price: totalPrice,
      unit_cost: totalCost,
      total_price: totalPrice * quantity,
      total_cost: totalCost * quantity,
      margin,
      original_unit_price: totalPrice,
      approved_unit_price: totalPrice,
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
    setPnConfig(null);
    setCodeMap({});

    toast({
      title: "Configuration Updated",
      description: `${selectedChassis.name} has been updated in your bill of materials.`,
    });
  };

  const handleBOMConfigurationEdit = async (item: BOMItem) => {
    console.log('🔧 Edit Configuration clicked for:', item.product.name, 'Item ID:', item.id);
    console.log('📊 Item details:', {
      chassisType: (item.product as any).chassisType,
      rack_configurable: (item.product as any).rack_configurable,
      hasSlotAssignments: !!item.slotAssignments,
      slotCount: Object.keys(item.slotAssignments || {}).length,
      productId: item.product.id,
      has_level4: (item.product as any).has_level4
    });
    
    // Clear all configuration states for clean slate
    setConfiguringLevel4Item(null);
    setConfiguringNonChassis(null);
    
    // FIRST: Check for Level 4 configuration
    if ((item.product as any).has_level4) {
      console.log('✅ Opening Level 4 configuration for:', item.product.name);
      setConfiguringLevel4Item(item);
      return;
    }
    
    // Check if this is a chassis-configured item
    const isChassisConfigurable = 
      item.slotAssignments || 
      item.rackConfiguration ||
      ((item.product as any).chassisType && (item.product as any).chassisType !== 'N/A') ||
      (item.product as any).rack_configurable === true ||
      item.product.id.includes('chassis');
    
    console.log('🔍 Chassis configurable check:', isChassisConfigurable);
    
    if (isChassisConfigurable) {
      console.log('✅ Editing chassis configuration for:', item.product.name);
      console.log('📦 Existing slot assignments:', item.slotAssignments);
      console.log('🔢 Existing part number:', item.partNumber);
      
      // Find parent Level 1 product and switch to its tab
      const parentProductId = (item.product as Level2Product).parentProductId || 
                              (item.product as any).parent_product_id;
      
      if (parentProductId) {
        console.log('🔄 Parent product ID:', parentProductId);
        const parentL1Product = level1Products.find(p => p.id === parentProductId);
        
        if (parentL1Product) {
          // Set asset type if available
          if (parentL1Product.asset_type_id) {
            console.log('🔄 Setting asset type to:', parentL1Product.asset_type_id);
            setSelectedAssetType(parentL1Product.asset_type_id);
          }
          
          // Switch to parent product tab
          console.log('🔄 Switching active tab to:', parentProductId);
          setActiveTab(parentProductId);
          setSelectedLevel1Product(parentL1Product);
        } else {
          console.warn('⚠️ Parent Level 1 product not found for:', parentProductId);
        }
      } else {
        console.warn('⚠️ No parent product ID found for chassis:', item.product.id);
      }
      
      const productId = (item.product as Level2Product)?.id;
      let hydratedChassis = productId && allLevel2Products.find(p => p.id === productId);
      
      // Fallback: Fetch from database if not in memory or missing chassisType
      if (!hydratedChassis || !(hydratedChassis as any).chassisType) {
        console.log('🔄 Product not in memory or incomplete, fetching from database...');
        const { data: freshProduct, error } = await supabase
          .from('products')
          .select('*')
          .eq('id', productId)
          .single();
          
        if (freshProduct && !error) {
          console.log('✅ Fetched fresh product data:', freshProduct.name);
          hydratedChassis = {
            ...item.product,
            ...freshProduct,
            chassisType: freshProduct.chassis_type,
            rack_configurable: freshProduct.rack_configurable
          } as Level2Product;
        } else {
          console.warn('⚠️ Could not fetch product from database, using item.product');
          hydratedChassis = item.product as Level2Product;
        }
      }
      
      console.log('✅ Using chassis:', hydratedChassis?.name, 'Type:', (hydratedChassis as any)?.chassisType);

      // Set up the chassis for editing
      setSelectedChassis(hydratedChassis);
      
      // Properly deserialize slot assignments
      const existingSlotAssignments = 
        (item.slotAssignments && Object.keys(item.slotAssignments).length > 0
          ? item.slotAssignments
          : convertRackLayoutToAssignments(item.rackConfiguration)) || {};
      
      console.log('Setting slot assignments for edit:', existingSlotAssignments);
      setSlotAssignments(existingSlotAssignments);
      setConfiguringChassis(hydratedChassis);

      const context = resolvePartNumberContext(
        item.partNumberContext,
        item.configuration,
        item.product
      );

      if (context?.pnConfig) {
        setPnConfig(deepClone(context.pnConfig));
      } else {
        setPnConfig(null);
      }

      if (context?.codeMap) {
        setCodeMap(deepClone(context.codeMap));
      } else {
        setCodeMap({});
      }

      // Store the original item for restoration if edit is cancelled
      // This preserves the original part number and configuration
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
      setAutoPlaced(false);

      (async () => {
        try {
          const [cfg, codes, l3] = await Promise.all([
            productDataService.getPartNumberConfig(hydratedChassis.id),
            productDataService.getPartNumberCodesForLevel2(hydratedChassis.id),
            productDataService.getLevel3ProductsForLevel2(hydratedChassis.id)
          ]);

          setLevel3Products(l3);

          if (!context?.pnConfig) {
            setPnConfig(cfg);
          }

          if (!context?.codeMap) {
            setCodeMap(codes);
          }
        } catch (error) {
          console.error('Failed to load PN config/codes for chassis reconfiguration:', error);
          toast({
            title: 'Configuration Load Failed',
            description: 'Unable to load chassis configuration templates. Part number editing may be limited.',
            variant: 'destructive',
          });
        }
      })();


      // Improved remote display detection from part number pattern
      // QTMS part numbers with remote display end with suffixes like "-D1", "-RD", or "-D<number>"
      // Part numbers WITHOUT remote display don't have these suffixes (e.g., QTMS-LTX-0RF8A0000000000)
      const partNumberStr = item.partNumber || item.product.partNumber || '';
      
      // Check for remote display suffixes at the end of the part number
      const hasRemoteSuffix = /-(D1|RD|D\d+)$/.test(partNumberStr);
      
      // Also check configuration if available
      const configHasRemote = item.configuration?.hasRemoteDisplay || false;
      
      console.log('Detected remote display from part number:', partNumberStr, '-> hasRemote:', hasRemoteSuffix, 'configHasRemote:', configHasRemote);
      setHasRemoteDisplay(hasRemoteSuffix || configHasRemote);
      
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
    lastSyncedQuoteFieldsRef.current = JSON.stringify({});
    setDiscountPercentage(0);
    setDiscountJustification('');
    onBOMUpdate([]);
  };

  const handleBOMUpdate = async (updatedItems: BOMItem[]) => {
    console.log('Items before update:', bomItems.map(i => ({ id: i.id, name: i.product.name })));
    console.log('Items after update:', updatedItems.map(i => ({ id: i.id, name: i.product.name })));
    
    setBomItems(updatedItems);
    onBOMUpdate(updatedItems);
    
    // Sync draft_bom with current items for draft quotes
    if (currentQuoteId && isDraftMode) {
      try {
        // Pass updatedItems directly to avoid stale state
        const draftBomData = buildDraftBomSnapshot(updatedItems);
        
        // Find removed items more reliably
        const removedItems = bomItems.filter(oldItem => {
          // First try matching by ID
          const matchById = updatedItems.some(newItem => newItem.id === oldItem.id);
          if (matchById) return false;
          
          // Fallback: match by product_id and part_number for items with temp IDs
          const matchByProduct = updatedItems.some(
            newItem => 
              newItem.product?.id === oldItem.product?.id &&
              newItem.partNumber === oldItem.partNumber
          );
          return !matchByProduct;
        });
        
        console.log('Items to remove:', removedItems.map(i => ({ id: i.id, name: i.product.name })));
        
        // Delete removed items from bom_items table
        if (removedItems.length > 0) {
          // Try to delete by ID first for items with database IDs
          const itemsWithDbIds = removedItems.filter(item => 
            item.id && !item.id.startsWith('temp-')
          );
          
          if (itemsWithDbIds.length > 0) {
            const { error: deleteError } = await supabase
              .from('bom_items')
              .delete()
              .in('id', itemsWithDbIds.map(item => item.id));
              
            if (deleteError) {
              console.error('Error deleting by ID:', deleteError);
            } else {
              console.log(`Deleted ${itemsWithDbIds.length} item(s) by ID`);
            }
          }
          
          // Fallback: delete by product_id and quote_id for items without valid DB IDs
          const itemsWithoutDbIds = removedItems.filter(item => 
            !item.id || item.id.startsWith('temp-')
          );
          
          for (const item of itemsWithoutDbIds) {
            const { error: fallbackDeleteError } = await supabase
              .from('bom_items')
              .delete()
              .eq('quote_id', currentQuoteId)
              .eq('product_id', item.product?.id)
              .eq('part_number', item.partNumber);
              
            if (fallbackDeleteError) {
              console.error('Error deleting by product match:', fallbackDeleteError);
            } else {
              console.log(`Deleted item by product match: ${item.product?.name}`);
            }
          }
        }
        
        // Update draft_bom field to stay in sync
        const { error: updateError } = await supabase
          .from('quotes')
          .update({ draft_bom: draftBomData })
          .eq('id', currentQuoteId)
          .eq('status', 'draft');
          
        if (updateError) {
          console.error('Error syncing draft_bom:', updateError);
        } else {
          console.log('draft_bom synced with current BOM items');
        }
      } catch (error) {
        console.error('Error in handleBOMUpdate sync:', error);
      }
    }
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

    if (discountPercentage > 0 && !discountJustification.trim()) {
      toast({
        title: 'Justification Required',
        description: 'Please provide a justification for the requested discount before submitting.',
        variant: 'destructive',
      });
      return;
    }

    setIsSubmitting(true);

    try {
      if (!user?.email || !user?.id) {
        throw new Error('A valid user account is required to submit a quote.');
      }

      await flushQuoteFieldSync();

      let quoteId: string;
      let isSubmittingExistingDraft = false;

      const generatedQuoteId = await generateSubmittedQuoteId(user.email, user.id);
      const normalizedQuoteId = normalizeQuoteId(generatedQuoteId);

      if (!normalizedQuoteId) {
        throw new Error('Failed to generate a valid quote ID.');
      }

      quoteId = normalizedQuoteId;

      const isCurrentQuoteDraft =
        (currentQuote?.status === 'draft') ||
        (typeof currentQuoteId === 'string' && currentQuoteId.trim().length > 0 && isDraftMode);

      if (currentQuoteId && isCurrentQuoteDraft) {
        isSubmittingExistingDraft = true;
        const { error: clearDraftBomError } = await supabase
          .from('bom_items')
          .delete()
          .eq('quote_id', currentQuoteId);

        if (clearDraftBomError) {
          console.error('Failed to clear draft BOM items before submission:', clearDraftBomError);
          toast({
            title: 'Submission Failed',
            description:
              clearDraftBomError.message || 'Failed to prepare the draft for submission. Please try again.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }

        try {
          await persistNormalizedQuoteId(currentQuoteId, quoteId);
        } catch (persistError) {
          console.error('Failed to normalize draft quote ID for submission:', persistError);
          toast({
            title: 'Submission Failed',
            description:
              persistError instanceof Error
                ? persistError.message
                : 'Unable to finalize the draft quote identifier. Please try again.',
            variant: 'destructive',
          });
          setIsSubmitting(false);
          return;
        }

        setCurrentQuoteId(quoteId);
        setCurrentQuote(prev => (
          prev
            ? {
                ...prev,
                id: quoteId,
                status: 'pending_approval'
              }
            : prev
        ));
        setIsDraftMode(false);
      }

      const trimmedDiscountJustification = discountJustification.trim();

      const customerNameValue = resolveCustomerNameFromFields(
        quoteFields,
        getStringFieldValue('customer_name', 'Unnamed Customer'),
      );
      const oracleCustomerIdValue = getStringFieldValue('oracle_customer_id', 'TBD', 'N/A');
      const sfdcOpportunityValue = getStringFieldValue('sfdc_opportunity', 'TBD', 'N/A');
      const priorityValue = getStringFieldValue('priority', 'Medium');
      const shippingTermsValue = getStringFieldValue('shipping_terms', 'TBD', 'N/A');
      const paymentTermsValue = getStringFieldValue('payment_terms', 'TBD', 'N/A');
      const currencyValue = getStringFieldValue('currency', 'USD');
      const rawRepInvolvedFinal = resolveQuoteFieldValue('is_rep_involved', false);
      const isRepInvolvedFinal =
        typeof rawRepInvolvedFinal === 'string'
          ? rawRepInvolvedFinal === 'true'
          : Boolean(rawRepInvolvedFinal);

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
            customer_name: customerNameValue,
            oracle_customer_id: oracleCustomerIdValue,
            sfdc_opportunity: sfdcOpportunityValue,
            priority: priorityValue,
            shipping_terms: shippingTermsValue,
            payment_terms: paymentTermsValue,
            currency: currencyValue,
            is_rep_involved: isRepInvolvedFinal,
            original_quote_value: originalQuoteValue,
            requested_discount: discountPercentage,
            discount_justification: trimmedDiscountJustification,
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
          .eq('id', quoteId);
        quoteError = error;
      } else {
        // Insert new quote
        const { error } = await supabase
          .from('quotes').insert({
            id: quoteId,
            customer_name: customerNameValue,
            oracle_customer_id: oracleCustomerIdValue,
            sfdc_opportunity: sfdcOpportunityValue,
            status: 'pending_approval',
            user_id: user!.id,
            submitted_by_name: user!.name,
            submitted_by_email: user!.email,
            original_quote_value: originalQuoteValue,
            requested_discount: discountPercentage,
            discount_justification: trimmedDiscountJustification,
            discounted_value: discountedValue,
            total_cost: totalCost,
            gross_profit: grossProfit,
            original_margin:
              originalQuoteValue > 0
                ? ((originalQuoteValue - totalCost) / originalQuoteValue) * 100
                : 0,
            discounted_margin: discountedMargin,
            quote_fields: quoteFields,
            priority: priorityValue,
            currency: currencyValue,
            payment_terms: paymentTermsValue,
            shipping_terms: shippingTermsValue,
            is_rep_involved: isRepInvolvedFinal,
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

      const bomInsertPayload = bomItems.map(item => {
        const serializedAssignments = item.slotAssignments
          ? serializeSlotAssignments(item.slotAssignments)
          : undefined;
        const rackLayout = item.rackConfiguration || buildRackLayoutFromAssignments(serializedAssignments);

        const configurationData = {
          ...(item.configuration || {}),
          slotAssignments: serializedAssignments,
          rackConfiguration: rackLayout,
          level4Config: item.level4Config || null,
          level4Selections: item.level4Selections || null,
        } as Record<string, any>;

        if (item.partNumberContext) {
          configurationData.partNumberContext = deepClone(item.partNumberContext);
        }

        return {
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
              ? ((item.product.price - (item.product.cost || 0)) / item.product.price) * 100
              : 0,
          original_unit_price: item.original_unit_price || item.product.price,
          approved_unit_price: item.approved_unit_price || item.product.price,
          configuration_data: configurationData,
          product_type: 'standard',
        };
      });

      if (bomInsertPayload.length > 0) {
        const { error: deleteError } = await supabase
          .from('bom_items')
          .delete()
          .eq('quote_id', quoteId);

        if (deleteError) {
          console.error('Failed to clear existing BOM items:', deleteError);
          toast({
            title: 'BOM Item Error',
            description: deleteError.message || 'Failed to prepare BOM items for submission',
            variant: 'destructive',
          });
          throw deleteError;
        }

        const { error: bomError } = await supabase.from('bom_items').insert(bomInsertPayload);

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
            <CardHeader className="space-y-1">
              <CardTitle className="text-xl font-semibold text-foreground">Product Selection</CardTitle>
              <CardDescription className="text-sm text-muted-foreground">
                Select products to add to your Bill of Materials
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-6">
                <div className="space-y-2">
                  <Label htmlFor="asset-type-select" className="text-sm font-medium text-foreground">Asset Type</Label>
                  <Select
                    value={selectedAssetType || undefined}
                    onValueChange={handleAssetTypeChange}
                    disabled={assetTypes.length === 0}
                  >
                    <SelectTrigger id="asset-type-select" className="w-full">
                      <SelectValue placeholder={assetTypes.length === 0 ? 'No asset types available' : 'Select an asset type'} />
                    </SelectTrigger>
                    <SelectContent>
                      {assetTypes.map((assetType) => (
                        <SelectItem key={assetType.id} value={assetType.id}>
                          {assetType.name}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                {!selectedAssetType && assetTypes.length > 0 && (
                  <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                    Select an asset type to view the available product portfolios.
                  </div>
                )}

                {selectedAssetType && filteredLevel1Products.length === 0 && (
                  <div className="rounded-lg border border-dashed border-muted-foreground/40 bg-muted/30 p-6 text-center text-sm text-muted-foreground">
                    No Level 1 products are currently associated with this asset type.
                  </div>
                )}

                {selectedAssetType && filteredLevel1Products.length > 0 && (
                  <Tabs
                    value={activeTab}
                    onValueChange={(value) => {
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
                    }}
                  >
                    <div className="relative">
                      <TabsList
                        className="flex w-full flex-wrap items-stretch justify-start gap-2 rounded-xl border border-slate-800/60 bg-slate-950/90 p-2 text-slate-200 shadow-inner transition-colors md:flex-nowrap md:overflow-x-auto md:pr-8"
                      >
                        {filteredLevel1Products.map(product => (
                          <TabsTrigger
                            key={product.id}
                            value={product.id}
                            className="flex-none whitespace-nowrap rounded-lg px-4 py-2 text-sm font-semibold tracking-tight text-slate-200 transition-all duration-150 data-[state=active]:bg-red-600 data-[state=active]:text-white data-[state=active]:shadow-lg data-[state=inactive]:bg-transparent data-[state=inactive]:text-slate-300 hover:text-white focus-visible:ring-0 md:min-w-[172px]"
                          >
                            {product.name}
                          </TabsTrigger>
                        ))}
                      </TabsList>
                      <div className="pointer-events-none absolute inset-y-2 right-0 hidden w-8 rounded-r-xl bg-gradient-to-l from-slate-950/95 to-transparent md:block" />
                    </div>

                    {filteredLevel1Products.map(product => (
                      <TabsContent key={product.id} value={product.id}>
                        {renderProductContent(product.id)}
                      </TabsContent>
                    ))}
                  </Tabs>
                )}
              </div>
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
              draftName={currentQuote?.status === 'draft' ? currentQuoteId : null}
              quoteFields={quoteFields}
              quoteMetadata={currentQuote}
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
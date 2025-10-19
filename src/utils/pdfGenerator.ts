
import { BOMItem } from '@/types/product';
import { Quote } from '@/types/quote';
import { supabase } from '@/integrations/supabase/client';
import {
  extractAdditionalQuoteInformation,
  parseQuoteFieldsValue,
} from '@/utils/additionalQuoteInformation';

type NormalizedLevel4Option = {
  id: string;
  value: string;
  label: string;
  infoUrl?: string | null;
  partNumber?: string | null;
};

type NormalizedLevel4Payload = {
  level4_config_id: string;
  entries: Array<{ index: number; value: string }>;
  template_type?: 'OPTION_1' | 'OPTION_2';
};

type Level4DisplayItem = {
  productName: string;
  productPartNumber?: string;
  slotNumber?: number;
  slotCardName?: string;
  partNumber?: string;
  level4BomItemId?: string;
  config: any;
  rawSlot?: any;
};

type Level4AnalyzedEntry = Level4DisplayItem & {
  payload?: NormalizedLevel4Payload | null;
  fieldLabel?: string;
  templateType?: 'OPTION_1' | 'OPTION_2';
  options: NormalizedLevel4Option[];
  rawConfig: any;
};

type Level4ConfigDefinition = {
  id: string;
  fieldLabel?: string;
  templateType?: 'OPTION_1' | 'OPTION_2';
  options: NormalizedLevel4Option[];
};

type SpanAwareSlot = {
  slot?: number;
  slotNumber?: number;
  position?: number;
  cardName?: string;
  name?: string;
  partNumber?: string;
  level4BomItemId?: string;
  level4_bom_item_id?: string;
  bomItemId?: string;
  bom_item_id?: string;
  configuration?: any;
  level4Config?: any;
  level4Selections?: any;
  product?: { id?: string; name?: string; partNumber?: string; part_number?: string };
  rawSlot?: any;
};

type ExpandedSlotDisplay = {
  slot: number;
  cardName: string;
  partNumber?: string;
  cardKey: string;
};

// Terms pagination constants (more conservative estimates for 10px font)
const TERMS_PAGE_HEIGHT = 1200;
const TERMS_COLUMN_WIDTH = 380;
const TERMS_COLUMN_GAP = 22;
const TERMS_HEADING_HEIGHT = 35;
const TERMS_PARAGRAPH_BASE = 50;
const TERMS_LIST_ITEM_HEIGHT = 20;
const TERMS_TABLE_ROW_HEIGHT = 30;
const TERMS_TABLE_BASE = 40;

const coerceNumber = (value: any): number | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'number') {
    return Number.isFinite(value) ? value : undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    if (!trimmed) return undefined;
    const parsed = Number(trimmed);
    return Number.isFinite(parsed) ? parsed : undefined;
  }

  return undefined;
};

const coerceBoolean = (value: any): boolean | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'boolean') {
    return value;
  }

  if (typeof value === 'string') {
    const normalized = value.trim().toLowerCase();
    if (!normalized) return undefined;
    if (['true', '1', 'yes', 'y'].includes(normalized)) return true;
    if (['false', '0', 'no', 'n'].includes(normalized)) return false;
  }

  return Boolean(value);
};

const coerceString = (value: any): string | undefined => {
  if (value === undefined || value === null) {
    return undefined;
  }

  if (typeof value === 'string') {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === 'number' && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
};

const PRODUCT_INFO_KEY_VARIANTS = [
  'productInfoUrl',
  'product_info_url',
  'productInfoURL',
  'product-info-url',
  'product info url',
  'productInfo',
  'product_info',
  'productInformationUrl',
  'product_information_url',
  'productInformation',
  'product_information',
  'infoUrl',
  'info_url',
  'info-url',
  'info url',
  'url',
  'link',
];

const normalizeProductInfoKey = (key: string): string => key.replace(/[\s_-]/g, '').toLowerCase();

const PRODUCT_INFO_KEYS = new Set(PRODUCT_INFO_KEY_VARIANTS.map(normalizeProductInfoKey));

const PRODUCT_ID_KEY_HINTS = [
  'productid',
  'level2productid',
  'selectedproductid',
  'selectedlevel2productid',
  'level2id',
  'selectedlevel2id',
  'chassisid',
  'chassisproductid',
  'configurationproductid',
  'variantid',
  'optionproductid',
  'parentproductid',
];

const PRODUCT_CONTAINER_KEY_HINTS = [
  'product',
  'level2product',
  'selectedproduct',
  'selectedlevel2product',
  'configurationproduct',
  'chassis',
  'variant',
  'option',
];

const coerceProductLevel = (value: any): 1 | 2 | 3 | 4 | undefined => {
  const numeric = coerceNumber(value);
  if (numeric !== undefined) {
    const rounded = Math.round(numeric);
    if (rounded >= 1 && rounded <= 4) {
      return rounded as 1 | 2 | 3 | 4;
    }
  }

  const stringValue = coerceString(value)?.toLowerCase();
  if (!stringValue) return undefined;

  const digitMatch = stringValue.match(/([1-4])/);
  if (digitMatch) {
    const parsed = Number(digitMatch[1]);
    if (parsed >= 1 && parsed <= 4) {
      return parsed as 1 | 2 | 3 | 4;
    }
  }

  const keywordMap: Record<string, 1 | 2 | 3 | 4> = {
    levelone: 1,
    level1: 1,
    l1: 1,
    leveltwo: 2,
    level2: 2,
    l2: 2,
    levelthree: 3,
    level3: 3,
    l3: 3,
    levelfour: 4,
    level4: 4,
    l4: 4,
  };

  const normalizedKey = stringValue.replace(/[^a-z0-9]/g, '');
  return keywordMap[normalizedKey];
};

const determineBomItemLevel = (item: any): 1 | 2 | 3 | 4 | undefined => {
  if (!item) return undefined;

  const candidates = [
    item.level,
    item.product?.level,
    item.product?.product_level,
    item.product?.productLevel,
    item.product_level,
    item.productLevel,
    item.product?.product?.product_level,
    item.product?.product?.level,
    item.configuration?.product?.product_level,
    item.configuration?.selectedProduct?.product_level,
    item.configuration?.selectedLevel2Product?.product_level,
    item.level2Product?.product_level,
    item.level2_product?.product_level,
  ];

  for (const candidate of candidates) {
    const level = coerceProductLevel(candidate);
    if (level) {
      return level;
    }
  }

  return undefined;
};

const sanitizeHttpUrl = (value: any): string | undefined => {
  const stringValue = coerceString(value)?.trim();
  if (!stringValue) return undefined;
  return /^https?:\/\//i.test(stringValue) ? stringValue : undefined;
};

const extractBomProductId = (item: any): string | undefined => {
  if (!item) return undefined;

  const candidates = [
    item.product?.id,
    item.product?.productId,
    item.product?.product_id,
    item.product_id,
    item.productId,
  ];

  for (const candidate of candidates) {
    const id = coerceString(candidate);
    if (id) return id;
  }

  return undefined;
};

const extractParentLevel2IdFromItem = (item: any): string | undefined => {
  if (!item) return undefined;

  const candidates = [
    item.parentLevel2Id,
    item.parent_product_id,
    item.parentProductId,
    item.parent_product?.id,
    item.product?.parentLevel2Id,
    item.product?.parent_product_id,
    item.product?.parentProductId,
    item.product?.parentProduct?.id,
    item.parentProduct?.id,
    item.level2Product?.id,
    item.level2_product?.id,
    item.configuration?.selectedLevel2Product?.id,
    item.configuration?.level2Product?.id,
    item.configuration?.selectedProduct?.parent_product_id,
    item.configuration?.selectedProduct?.parentProductId,
    item.configuration?.product?.parent_product_id,
    item.configuration?.product?.parentProductId,
  ];

  for (const candidate of candidates) {
    const id = coerceString(candidate);
    if (id) {
      return id;
    }
  }

  return undefined;
};

const resolveProductInfoUrl = (...sources: Array<any>): string | null => {
  const visited = new WeakSet<object>();

  const searchObject = (value: unknown, depth: number): string | null => {
    if (depth > 6) return null;

    if (!value || typeof value !== 'object') {
      return null;
    }

    if (visited.has(value as object)) {
      return null;
    }
    visited.add(value as object);

    if (Array.isArray(value)) {
      for (const entry of value) {
        const foundInArray = searchObject(entry, depth + 1);
        if (foundInArray) {
          return foundInArray;
        }
      }
      return null;
    }

    for (const [key, raw] of Object.entries(value as Record<string, unknown>)) {
      const normalizedKey = normalizeProductInfoKey(key);
      if (PRODUCT_INFO_KEYS.has(normalizedKey)) {
        const resolved = coerceString(raw);
        if (resolved) {
          return resolved;
        }
      }
    }

    for (const raw of Object.values(value as Record<string, unknown>)) {
      if (raw && typeof raw === 'object') {
        const nestedResult = searchObject(raw, depth + 1);
        if (nestedResult) {
          return nestedResult;
        }
      }
    }

    return null;
  };

  for (const source of sources) {
    const directString = coerceString(source);
    if (directString) {
      return directString;
    }

    const found = searchObject(source, 0);
    if (found) {
      return found;
    }
  }

  return null;
};

const collectProductIdCandidates = (...sources: Array<any>): string[] => {
  const candidates = new Set<string>();
  const visited = new WeakSet<object>();

  const addCandidate = (value: unknown) => {
    const stringValue = coerceString(value);
    if (stringValue) {
      candidates.add(stringValue);
    }
  };

  const searchObject = (value: unknown, depth: number, parentKey?: string) => {
    if (!value || typeof value !== 'object' || depth > 6) {
      return;
    }

    if (visited.has(value as object)) {
      return;
    }
    visited.add(value as object);

    if (Array.isArray(value)) {
      for (const entry of value) {
        if (entry && typeof entry === 'object') {
          searchObject(entry, depth + 1, parentKey);
        }
      }
      return;
    }

    const record = value as Record<string, unknown>;

    if (parentKey && PRODUCT_CONTAINER_KEY_HINTS.some(hint => parentKey.includes(hint))) {
      addCandidate(record.id);
    }

    const productLevel =
      coerceNumber(record.productLevel) ??
      coerceNumber(record.product_level) ??
      coerceNumber(record.level) ??
      undefined;

    if (productLevel === 2 || record.parentProductId || record.parent_product_id) {
      addCandidate(record.id);
    }

    for (const [key, raw] of Object.entries(record)) {
      const normalizedKey = normalizeProductInfoKey(key);

      if (PRODUCT_ID_KEY_HINTS.some(hint => normalizedKey.includes(hint))) {
        addCandidate(raw);
      }

      if (Array.isArray(raw)) {
        for (const entry of raw) {
          if (entry && typeof entry === 'object') {
            searchObject(entry, depth + 1, normalizedKey);
          }
        }
      } else if (raw && typeof raw === 'object') {
        searchObject(raw, depth + 1, normalizedKey);
      } else if (normalizedKey === 'id') {
        if (PRODUCT_CONTAINER_KEY_HINTS.some(hint => (parentKey ?? '').includes(hint))) {
          addCandidate(raw);
        } else if (productLevel === 2) {
          addCandidate(raw);
        }
      }
    }
  };

  sources.forEach(source => {
    if (source == null) return;
    if (typeof source === 'string' || typeof source === 'number') {
      addCandidate(source);
      return;
    }
    if (typeof source === 'object') {
      searchObject(source, 0);
    }
  });

  return Array.from(candidates);
};

const extractProductInfoUrlFromItem = (item: any): string | undefined => {
  if (!item) return undefined;

  const resolved = resolveProductInfoUrl(
    item?.resolvedInfoUrl,
    item?.productInfoUrl,
    item?.product_info_url,
    item?.product?.productInfoUrl,
    item?.product?.product_info_url,
    item?.product,
    item?.parentProduct,
    item?.configuration?.product,
    item?.configuration?.selectedProduct,
    item?.configuration?.selectedLevel2Product,
    item?.configuration?.level2Product,
    item?.level2Product,
    item?.level2_product
  );

  return sanitizeHttpUrl(resolved);
};

const extractParentLevel2InfoUrl = (item: any): string | undefined => {
  const resolved = resolveProductInfoUrl(
    item?.parentProduct,
    item?.product?.parentProduct,
    item?.configuration?.selectedLevel2Product,
    item?.configuration?.level2Product,
    item?.level2Product,
    item?.level2_product,
    item?.configuration?.selectedProduct?.parentProduct,
    item?.configuration?.selectedProduct?.level2Product
  );

  return sanitizeHttpUrl(resolved);
};

const attachInfoUrlForPdf = async <T extends Record<string, any>>(items: T[]): Promise<T[]> => {
  if (!items || items.length === 0) {
    return items;
  }

  const level2Index = new Map<string, { productInfoUrl?: string }>();
  const level3ToLevel2 = new Map<string, string>();
  const level2IdsToFetch = new Set<string>();
  const level3IdsToFetch = new Set<string>();

  items.forEach(item => {
    const level = determineBomItemLevel(item);

    if (level === 2) {
      const level2Id = extractBomProductId(item);
      if (!level2Id) {
        return;
      }

      const existingUrl = extractProductInfoUrlFromItem(item);
      if (existingUrl) {
        level2Index.set(level2Id, { productInfoUrl: existingUrl });
      } else {
        level2IdsToFetch.add(level2Id);
      }
    } else if (level === 3) {
      const parentLevel2Id = extractParentLevel2IdFromItem(item);
      if (parentLevel2Id) {
        if (!level2Index.has(parentLevel2Id)) {
          const parentUrl = extractParentLevel2InfoUrl(item);
          if (parentUrl) {
            level2Index.set(parentLevel2Id, { productInfoUrl: parentUrl });
          } else {
            level2IdsToFetch.add(parentLevel2Id);
          }
        }
      } else {
        const level3Id = extractBomProductId(item);
        if (level3Id) {
          level3IdsToFetch.add(level3Id);
        }
      }
    }
  });

  if (level3IdsToFetch.size > 0) {
    try {
      const { data: level3Rows, error: level3Error } = await supabase
        .from('products')
        .select('id, parent_product_id')
        .in('id', Array.from(level3IdsToFetch));

      if (level3Error) throw level3Error;

      (level3Rows || []).forEach(row => {
        const level3Id = coerceString((row as any)?.id);
        const parentId = coerceString((row as any)?.parent_product_id);

        if (level3Id && parentId) {
          level3ToLevel2.set(level3Id, parentId);
          if (!level2Index.has(parentId)) {
            level2IdsToFetch.add(parentId);
          }
        }
      });
    } catch (error) {
      console.warn('Could not resolve Level 2 parents for Level 3 BOM items:', error);
    }
  }

  if (level2IdsToFetch.size > 0) {
    try {
      const { data: level2Rows, error: level2Error } = await supabase
        .from('products')
        .select('id, product_info_url')
        .in('id', Array.from(level2IdsToFetch));

      if (level2Error) throw level2Error;

      (level2Rows || []).forEach(row => {
        const id = coerceString((row as any)?.id);
        if (!id) return;

        const url = sanitizeHttpUrl((row as any)?.product_info_url);
        if (url) {
          level2Index.set(id, { productInfoUrl: url });
        } else if (!level2Index.has(id)) {
          level2Index.set(id, { productInfoUrl: undefined });
        }
      });
    } catch (error) {
      console.warn('Could not fetch Level 2 product info URLs for BOM items:', error);
    }
  }

  return items.map(item => {
    const level = determineBomItemLevel(item);
    let parentLevel2Id = extractParentLevel2IdFromItem(item);

    if (level === 3 && !parentLevel2Id) {
      const level3Id = extractBomProductId(item);
      if (level3Id) {
        parentLevel2Id = level3ToLevel2.get(level3Id);
      }
    }

    const sanitizedExistingProductUrl =
      sanitizeHttpUrl((item?.product as any)?.productInfoUrl) ??
      sanitizeHttpUrl((item?.product as any)?.product_info_url);

    let resolvedInfoUrl: string | undefined;

    if (level === 2) {
      const level2Id = extractBomProductId(item);
      if (level2Id) {
        const entry = level2Index.get(level2Id);
        resolvedInfoUrl = entry?.productInfoUrl ?? sanitizedExistingProductUrl ?? extractProductInfoUrlFromItem(item);
      } else {
        resolvedInfoUrl = sanitizedExistingProductUrl ?? extractProductInfoUrlFromItem(item);
      }
    } else if (level === 3) {
      if (parentLevel2Id) {
        const entry = level2Index.get(parentLevel2Id);
        resolvedInfoUrl = entry?.productInfoUrl ?? extractParentLevel2InfoUrl(item);
      } else {
        resolvedInfoUrl = extractParentLevel2InfoUrl(item);
      }
    }

    const sanitizedResolved =
      level === 2
        ? sanitizeHttpUrl(resolvedInfoUrl) ??
          sanitizeHttpUrl(item.resolvedInfoUrl) ??
          sanitizedExistingProductUrl ??
          extractProductInfoUrlFromItem(item)
        : level === 3
          ? sanitizeHttpUrl(resolvedInfoUrl) ??
            sanitizeHttpUrl(item.resolvedInfoUrl) ??
            extractParentLevel2InfoUrl(item)
          : sanitizeHttpUrl(item.resolvedInfoUrl) ?? sanitizedExistingProductUrl;

    const mergedProduct =
      level === 2
        ? {
            ...(item?.product ?? {}),
            productInfoUrl: sanitizedResolved ?? sanitizedExistingProductUrl ?? undefined,
          }
        : item?.product;

    return {
      ...item,
      level: level ?? item.level,
      parentLevel2Id: parentLevel2Id ?? item.parentLevel2Id,
      product: mergedProduct,
      resolvedInfoUrl: sanitizedResolved,
    };
  });
};

const gatherSources = (slot: SpanAwareSlot): any[] => {
  const rawSlot = slot.rawSlot ?? slot;
  const config = slot.configuration ?? slot.level4Config ?? slot.level4Selections ?? rawSlot?.configuration ?? rawSlot?.level4Config ?? rawSlot?.level4Selections;
  return [slot, rawSlot, config, rawSlot?.configuration, rawSlot?.level4Config, rawSlot?.level4Selections].filter(Boolean);
};

const pickFirstNumber = (sources: any[], keys: string[]): number | undefined => {
  for (const source of sources) {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const value = coerceNumber(source[key]);
        if (value !== undefined) {
          return value;
        }
      }
    }
  }
  return undefined;
};

const pickFirstBoolean = (sources: any[], keys: string[]): boolean | undefined => {
  for (const source of sources) {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const value = coerceBoolean(source[key]);
        if (value !== undefined) {
          return value;
        }
      }
    }
  }
  return undefined;
};

const pickFirstString = (sources: any[], keys: string[]): string | undefined => {
  for (const source of sources) {
    for (const key of keys) {
      if (Object.prototype.hasOwnProperty.call(source, key)) {
        const value = coerceString(source[key]);
        if (value) {
          return value;
        }
      }
    }
  }
  return undefined;
};

const resolveSlotNumber = (slot: SpanAwareSlot, index: number): number => {
  const sources = gatherSources(slot);
  const explicit = pickFirstNumber(sources, ['slot', 'slotNumber', 'position', 'slot_index']);
  if (explicit !== undefined) {
    return explicit;
  }
  return index + 1;
};

const resolveSpanDetails = (slot: SpanAwareSlot) => {
  const sources = gatherSources(slot);
  const span = pickFirstNumber(sources, [
    'slotSpan',
    'slot_span',
    'span',
    'spanSize',
    'span_size',
    'slotRequirement',
    'slot_requirement',
    'slotSpanCount',
    'slot_span_count',
    'slotCount',
    'slot_count',
    'spanLength',
    'span_length',
  ]) ?? 1;

  const spanIndex = pickFirstNumber(sources, [
    'spanIndex',
    'span_index',
    'spanPosition',
    'span_position',
    'spanSlotIndex',
    'span_slot_index',
    'spanOffset',
    'span_offset',
    'slotOffset',
    'slot_offset',
  ]);

  const primarySlot = pickFirstNumber(sources, [
    'primarySlot',
    'primary_slot',
    'primarySpanSlot',
    'primary_span_slot',
    'spanRootSlot',
    'span_root_slot',
    'rootSlot',
    'root_slot',
    'originSlot',
    'origin_slot',
  ]);

  const sharedFromSlot = pickFirstNumber(sources, [
    'sharedFromSlot',
    'shared_from_slot',
    'bushingPairSlot',
    'bushing_pair_slot',
    'spanFromSlot',
    'span_from_slot',
    'derivedFromSlot',
    'derived_from_slot',
    'sourceSlot',
    'source_slot',
  ]);

  const secondaryFlag = pickFirstBoolean(sources, [
    'isSpanReplica',
    'is_span_replica',
    'isSecondarySpanSlot',
    'is_secondary_span_slot',
    'isSpanSecondary',
    'is_span_secondary',
    'isSpanContinuation',
    'is_span_continuation',
    'isSecondarySpan',
    'is_secondary_span',
  ]) || false;

  return {
    span: span > 0 ? span : 1,
    spanIndex,
    primarySlot,
    sharedFromSlot,
    secondaryFlag,
  };
};

const resolveCardKey = (slot: SpanAwareSlot, cardName: string, partNumber: string): string => {
  const sources = gatherSources(slot);
  const idCandidate = pickFirstString(sources, [
    'level4BomItemId',
    'level4_bom_item_id',
    'bomItemId',
    'bom_item_id',
    'bom_item',
    'level4BomItem',
    'level4_bom_item',
    'level4ItemId',
    'level4_item_id',
    'cardId',
    'card_id',
    'id',
    'product_id',
  ]);

  if (idCandidate) {
    return idCandidate;
  }

  if (partNumber || cardName) {
    return `${partNumber || ''}|${cardName || ''}`.toLowerCase();
  }

  return 'unknown-card';
};

const resolveLevel4BomItemId = (slot: SpanAwareSlot): string | undefined => {
  const sources = gatherSources(slot);
  const idCandidate = pickFirstString(sources, [
    'level4BomItemId',
    'level4_bom_item_id',
    'bomItemId',
    'bom_item_id',
    'bom_item',
    'payloadBomItemId',
    'payload_bom_item_id',
    'configurationBomItemId',
    'configuration_bom_item_id',
    'bomId',
    'bom_id',
    'level4ItemId',
    'level4_item_id',
  ]);

  if (idCandidate) {
    return idCandidate;
  }

  const raw = sources.find(source => typeof source?.id === 'string' && source.id.trim().length > 0) as
    | { id: string }
    | undefined;
  if (raw?.id) {
    return String(raw.id).trim();
  }

  return undefined;
};

const dedupeSpanAwareSlots = <T extends SpanAwareSlot>(slots: T[]): T[] => {
  const seenKeys = new Set<string>();
  const lastPrimaryByCard = new Map<string, number>();
  const seenLevel4IdsByCard = new Map<string, Set<string>>();

  const markPrimary = (cardKey: string, slotNumber: number, dedupeKey: string, level4Id?: string) => {
    seenKeys.add(dedupeKey);
    lastPrimaryByCard.set(cardKey, slotNumber);

    if (!level4Id) return;

    const existing = seenLevel4IdsByCard.get(cardKey) ?? new Set<string>();
    existing.add(level4Id);
    seenLevel4IdsByCard.set(cardKey, existing);
  };

  return slots.filter((entry, index) => {
    const slotNumber = resolveSlotNumber(entry, index);
    const rawSlot = (entry.rawSlot ?? entry) as any;
    const cardName = coerceString(entry.cardName || rawSlot?.cardName || entry.name || rawSlot?.name || entry.product?.name || rawSlot?.product?.name) || '';
    const partNumber = coerceString(
      entry.partNumber ||
      (entry.product as any)?.partNumber ||
      (entry.product as any)?.part_number ||
      rawSlot?.partNumber ||
      rawSlot?.product?.partNumber ||
      rawSlot?.product?.part_number
    ) || '';

    const { span, spanIndex, primarySlot, sharedFromSlot, secondaryFlag } = resolveSpanDetails(entry);

    const isSpan = span > 1 || spanIndex !== undefined || sharedFromSlot !== undefined || secondaryFlag;

    const cardKey = resolveCardKey(entry, cardName, partNumber);
    const level4Id = resolveLevel4BomItemId(entry);

    const anchorSlot = (() => {
      if (typeof primarySlot === 'number') return primarySlot;
      if (typeof sharedFromSlot === 'number') return sharedFromSlot;
      return slotNumber;
    })();

    const dedupeKey = `${cardKey}|${anchorSlot}`;

    const priorPrimary = lastPrimaryByCard.get(cardKey);

    let isSecondary = secondaryFlag;

    if (typeof spanIndex === 'number' && spanIndex > 0) {
      isSecondary = true;
    }

    if (typeof primarySlot === 'number' && primarySlot !== slotNumber) {
      isSecondary = true;
    }

    if (typeof sharedFromSlot === 'number' && sharedFromSlot !== slotNumber) {
      isSecondary = true;
    }

    if (isSpan && typeof priorPrimary === 'number' && slotNumber > priorPrimary && slotNumber - priorPrimary < span) {
      isSecondary = true;
    }

    if (isSpan && slotNumber !== anchorSlot && slotNumber > anchorSlot) {
      isSecondary = true;
    }

    if (!isSpan) {
      if (level4Id) {
        const seenForCard = seenLevel4IdsByCard.get(cardKey);
        if (seenForCard?.has(level4Id)) {
          return false;
        }
      }

      markPrimary(cardKey, slotNumber, dedupeKey, level4Id);
      return true;
    }

    if (level4Id) {
      const seenForCard = seenLevel4IdsByCard.get(cardKey);
      if (seenForCard?.has(level4Id)) {
        return false;
      }
    }

    if (isSecondary) {
      return false;
    }

    if (seenKeys.has(dedupeKey)) {
      return false;
    }

    markPrimary(cardKey, slotNumber, dedupeKey, level4Id);
    return true;
  });
};

const mapSlotForDisplay = (slot: SpanAwareSlot, index: number): ExpandedSlotDisplay | undefined => {
  const slotNumber = resolveSlotNumber(slot, index);
  if (!Number.isFinite(slotNumber)) {
    return undefined;
  }

  const rawSlot = (slot.rawSlot ?? slot) as any;
  const cardName =
    coerceString(slot.cardName) ||
    coerceString(rawSlot?.cardName) ||
    coerceString(slot.name) ||
    coerceString(rawSlot?.name) ||
    coerceString(slot.product?.name) ||
    coerceString(rawSlot?.product?.name) ||
    'Empty';

  const partNumber =
    coerceString(slot.partNumber) ||
    coerceString(slot.product?.partNumber) ||
    coerceString(slot.product?.part_number) ||
    coerceString(rawSlot?.partNumber) ||
    coerceString(rawSlot?.product?.partNumber) ||
    coerceString(rawSlot?.product?.part_number) ||
    undefined;

  const cardKey = resolveCardKey(slot, cardName, partNumber ?? '');

  return {
    slot: slotNumber,
    cardName,
    partNumber: partNumber ?? undefined,
    cardKey,
  };
};

const expandSpanAwareSlots = (slots: SpanAwareSlot[]): ExpandedSlotDisplay[] => {
  if (!Array.isArray(slots) || slots.length === 0) {
    return [];
  }

  const seenPairs = new Set<string>();
  const expanded: ExpandedSlotDisplay[] = [];

  slots.forEach((entry, index) => {
    const display = mapSlotForDisplay(entry, index);
    if (!display) {
      return;
    }

    const { span, primarySlot, sharedFromSlot } = resolveSpanDetails(entry);
    const anchor =
      typeof primarySlot === 'number'
        ? primarySlot
        : typeof sharedFromSlot === 'number'
          ? sharedFromSlot
          : display.slot;
    const normalizedAnchor = Number.isFinite(anchor) ? anchor : display.slot;
    const normalizedSpan = Number.isFinite(span) ? span : 1;
    const effectiveSpan = Math.max(1, Math.round(normalizedSpan));

    for (let offset = 0; offset < effectiveSpan; offset++) {
      const targetSlot = normalizedAnchor + offset;
      if (!Number.isFinite(targetSlot)) {
        continue;
      }

      const pairKey = `${display.cardKey}|${targetSlot}`;
      if (seenPairs.has(pairKey)) {
        continue;
      }

      seenPairs.add(pairKey);
      expanded.push({
        slot: targetSlot,
        cardName: display.cardName,
        partNumber: display.partNumber,
        cardKey: display.cardKey,
      });
    }

    const directKey = `${display.cardKey}|${display.slot}`;
    if (!seenPairs.has(directKey)) {
      seenPairs.add(directKey);
      expanded.push({
        slot: display.slot,
        cardName: display.cardName,
        partNumber: display.partNumber,
        cardKey: display.cardKey,
      });
    }
  });

  expanded.sort((a, b) => a.slot - b.slot);
  return expanded;
};

export const generateQuotePDF = async (
  bomItems: BOMItem[],
  quoteInfo: Partial<Quote>,
  canSeePrices: boolean = true,
  action: 'view' | 'download' = 'download'
): Promise<void> => {
  // Create a new window for PDF generation - name it based on action
  const windowName = action === 'view' ? 'Quote_View' : 'Quote_Download';
  const printWindow = window.open('', windowName);
  if (!printWindow) return;

  const totalPrice = bomItems
    .filter(item => item.enabled)
    .reduce((total, item) => total + (item.product.price * item.quantity), 0);

  const normalizePercentage = (value?: number | null) => {
    if (value === null || value === undefined) {
      return 0;
    }

    const absolute = Math.abs(value);
    if (absolute > 0 && absolute <= 1) {
      return value * 100;
    }

    return value;
  };

  const originalTotal = typeof quoteInfo?.original_quote_value === 'number' && quoteInfo.original_quote_value > 0
    ? quoteInfo.original_quote_value
    : totalPrice;

  const requestedDiscountPercent = normalizePercentage(quoteInfo?.requested_discount);
  const approvedDiscountPercent = typeof quoteInfo?.approved_discount === 'number'
    ? normalizePercentage(quoteInfo.approved_discount)
    : undefined;

  const effectiveDiscountPercent = typeof approvedDiscountPercent === 'number'
    ? approvedDiscountPercent
    : requestedDiscountPercent;

  const discountedValueFromQuote = typeof quoteInfo?.discounted_value === 'number' && quoteInfo.discounted_value > 0
    ? quoteInfo.discounted_value
    : undefined;

  const hasEffectivePercent = effectiveDiscountPercent > 0;

  const derivedFinalTotal = discountedValueFromQuote !== undefined
    ? discountedValueFromQuote
    : hasEffectivePercent
      ? originalTotal * (1 - (effectiveDiscountPercent / 100))
      : originalTotal;

  const finalTotal = Number.isFinite(derivedFinalTotal)
    ? Math.max(derivedFinalTotal, 0)
    : originalTotal;

  const discountAmount = Math.max(originalTotal - finalTotal, 0);
  const hasDiscount = discountAmount > 0.01 || effectiveDiscountPercent > 0.01;
  const normalizedQuoteFields = parseQuoteFieldsValue(quoteInfo?.quote_fields);
  const additionalQuoteInfo =
    extractAdditionalQuoteInformation(quoteInfo, normalizedQuoteFields) ?? '';

  // Helper to extract currency from quote_fields or fallback to top-level currency
  const extractCurrency = (quoteInfo: any): string => {
    // Try quote_fields first
    if (quoteInfo?.quote_fields?.['quote-currency']) {
      const fromFields = String(quoteInfo.quote_fields['quote-currency']).trim().toUpperCase();
      if (/^[A-Z]{3}$/.test(fromFields)) {
        return fromFields;
      }
    }
    // Fallback to top-level currency
    if (typeof quoteInfo?.currency === 'string') {
      const fromCurrency = quoteInfo.currency.trim().toUpperCase();
      if (/^[A-Z]{3}$/.test(fromCurrency)) {
        return fromCurrency;
      }
    }
    return 'USD';
  };

  const resolvedCurrency = extractCurrency(quoteInfo);

  const currencyFormatter = (() => {
    try {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: resolvedCurrency,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    } catch {
      return new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });
    }
  })();

  const formatCurrency = (value: number) => {
    const numeric = Number.isFinite(value) ? value : 0;
    return currencyFormatter.format(numeric);
  };

  const formatPercent = (value: number) => {
    const absolute = Math.abs(value);
    const hasFraction = Math.abs(absolute - Math.trunc(absolute)) > 0.001;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: hasFraction ? 1 : 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  // Fetch Terms & Conditions and settings from database
  let termsAndConditions = '';

  const sanitizeTermsParagraph = (paragraph: string) =>
    paragraph
      .trim()
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;');

  type TermsBlock =
    | { type: 'heading'; text: string }
    | { type: 'content'; html: string };

  const isLikelyTermsHeading = (value: string) => {
    const trimmed = value.trim();
    if (!trimmed) return false;

    const hasLetters = /[a-zA-Z]/.test(trimmed);
    const hasLowercase = /[a-z]/.test(trimmed);
    const isAllCaps = hasLetters && !hasLowercase;
    const startsWithNumber = /^\d{1,3}(?:[A-Z]?)[).\-\s]+/.test(trimmed);

    if (startsWithNumber) {
      const withoutNumber = trimmed.replace(/^\d{1,3}(?:[A-Z]?)[).\-\s]+/, '');
      if (!withoutNumber) {
        return true;
      }
      const headingPart = withoutNumber.trim();
      const headingHasLetters = /[a-zA-Z]/.test(headingPart);
      const headingHasLowercase = /[a-z]/.test(headingPart);
      if (headingHasLetters && !headingHasLowercase) {
        return true;
      }
    }

    if (isAllCaps) {
      return true;
    }

    return false;
  };

  const buildPlainTextTermsBlocks = (content: string): TermsBlock[] => {
    const normalized = content.replace(/\r\n/g, '\n');
    const lines = normalized.split('\n');
    const paragraphs: string[] = [];
    let buffer: string[] = [];

    const flushBuffer = () => {
      if (buffer.length === 0) return;
      const combined = buffer.join(' ').trim();
      if (combined) {
        paragraphs.push(combined);
      }
      buffer = [];
    };

    lines.forEach(rawLine => {
      const line = rawLine.trim();
      if (!line) {
        flushBuffer();
        return;
      }

      if (buffer.length > 0 && /[.!?]$/.test(buffer[buffer.length - 1])) {
        flushBuffer();
      }

      buffer.push(line);
    });

    flushBuffer();

    if (paragraphs.length === 0) {
      return [
        {
          type: 'content',
          html: `<p>${sanitizeTermsParagraph(content).replace(/\r?\n/g, '<br />')}</p>`,
        },
      ];
    }

    const blocks: TermsBlock[] = [];

    paragraphs.forEach(paragraph => {
      if (isLikelyTermsHeading(paragraph)) {
        blocks.push({ type: 'heading', text: paragraph });
        return;
      }

      const headingMatch = paragraph.match(/^(.{1,120}?)(?:\s*[.:\-]\s+)(.+)$/);
      if (headingMatch) {
        const candidateHeading = headingMatch[1].trim();
        const remainder = headingMatch[2].trim();

        if (candidateHeading && isLikelyTermsHeading(candidateHeading)) {
          blocks.push({ type: 'heading', text: candidateHeading });
          if (remainder) {
            blocks.push({
              type: 'content',
              html: `<p>${sanitizeTermsParagraph(remainder)}</p>`,
            });
          }
          return;
        }
      }

      blocks.push({
        type: 'content',
        html: `<p>${sanitizeTermsParagraph(paragraph)}</p>`,
      });
    });

    return blocks;
  };

  const sanitizeAllowedElement = (element: HTMLElement) => {
    const allowedTags = new Set([
      'P',
      'UL',
      'OL',
      'LI',
      'TABLE',
      'THEAD',
      'TBODY',
      'TFOOT',
      'TR',
      'TH',
      'TD',
      'BR',
      'EM',
      'STRONG',
      'B',
      'I',
      'U',
      'SPAN',
      'A',
    ]);

    const walker = document.createTreeWalker(element, NodeFilter.SHOW_ELEMENT, null);
    const toRemove: Element[] = [];

    while (walker.nextNode()) {
      const current = walker.currentNode as HTMLElement;
      if (!allowedTags.has(current.tagName.toUpperCase())) {
        toRemove.push(current);
        continue;
      }

      Array.from(current.attributes).forEach(attr => {
        const name = attr.name.toLowerCase();
        if (name === 'href') {
          const href = current.getAttribute('href');
          if (!href || !/^https?:/i.test(href)) {
            current.removeAttribute('href');
          }
          return;
        }

        if (name === 'target') {
          const target = current.getAttribute('target');
          if (target && ['_blank', '_self'].includes(target)) {
            return;
          }
          current.removeAttribute('target');
          return;
        }

        if (name === 'rel') {
          return;
        }

        current.removeAttribute(attr.name);
      });
    }

    toRemove.forEach(el => {
      const parent = el.parentElement;
      if (!parent) {
        el.remove();
        return;
      }
      while (el.firstChild) {
        parent.insertBefore(el.firstChild, el);
      }
      el.remove();
    });
  };

  const extractHeadingFromParagraphElement = (element: HTMLElement): string | null => {
    const firstChild = element.firstChild;
    if (!firstChild) return null;

    if (firstChild.nodeType !== Node.ELEMENT_NODE) {
      const text = firstChild.textContent?.trim() || '';
      if (text && isLikelyTermsHeading(text)) {
        firstChild.textContent = '';
        return text;
      }
      return null;
    }

    const firstElement = firstChild as HTMLElement;
    const tagName = firstElement.tagName.toUpperCase();
    if (tagName === 'STRONG' || tagName === 'B' || tagName === 'SPAN') {
      const text = firstElement.textContent?.trim() || '';
      if (text && isLikelyTermsHeading(text)) {
        element.removeChild(firstElement);
        return text;
      }
    }

    return null;
  };

  const buildHtmlTermsBlocks = (content: string): TermsBlock[] | null => {
    if (typeof document === 'undefined') {
      return null;
    }

    try {
      const tempContainer = document.createElement('div');
      tempContainer.innerHTML = content;

      const blocks: TermsBlock[] = [];

      const pushHeading = (text: string) => {
        const normalized = text.trim();
        if (!normalized) return;
        blocks.push({ type: 'heading', text: normalized });
      };

      const pushContent = (html: string) => {
        const trimmed = html.trim();
        if (!trimmed) return;
        blocks.push({ type: 'content', html: trimmed });
      };

      const processNode = (node: Node) => {
        if (node.nodeType === Node.ELEMENT_NODE) {
          const element = node as HTMLElement;
          const tagName = element.tagName.toUpperCase();

          if (/^H[1-6]$/.test(tagName)) {
            pushHeading(element.textContent || '');
            return;
          }

          if (tagName === 'P') {
            const clone = element.cloneNode(true) as HTMLElement;
            sanitizeAllowedElement(clone);
            const headingText = extractHeadingFromParagraphElement(clone);
            if (headingText) {
              pushHeading(headingText);
            }
            const html = clone.innerHTML.trim();
            if (html) {
              pushContent(`<p>${html}</p>`);
            }
            return;
          }

          if (tagName === 'UL' || tagName === 'OL' || tagName === 'TABLE') {
            const clone = element.cloneNode(true) as HTMLElement;
            sanitizeAllowedElement(clone);
            pushContent(clone.outerHTML);
            return;
          }

          if ((tagName === 'STRONG' || tagName === 'B') && isLikelyTermsHeading(element.textContent || '')) {
            pushHeading(element.textContent || '');
            return;
          }

          const childNodes = Array.from(element.childNodes);
          if (childNodes.length === 0) {
            const text = element.textContent?.trim();
            if (text) {
              pushContent(`<p>${escapeHtml(text)}</p>`);
            }
            return;
          }

          childNodes.forEach(processNode);
          return;
        }

        if (node.nodeType === Node.TEXT_NODE) {
          const text = node.textContent?.trim();
          if (text) {
            pushContent(`<p>${escapeHtml(text)}</p>`);
          }
        }
      };

      Array.from(tempContainer.childNodes).forEach(processNode);
      if (blocks.length === 0) {
        return null;
      }

      return blocks;
    } catch (error) {
      console.warn('Could not normalize Terms & Conditions HTML for PDF:', error);
      return null;
    }
  };

  const measureTermsBlockHeight = (block: TermsBlock): number => {
    if (block.type === 'heading') {
      return TERMS_HEADING_HEIGHT;
    }

    const textContent = block.html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim();
    if (!textContent) {
      return TERMS_PARAGRAPH_BASE;
    }

    const wordCount = textContent.split(/\s+/).length;
    const paragraphCount = Math.max(1, (block.html.match(/<p\b/gi) || []).length);
    const breakCount = (block.html.match(/<br\s*\/?\s*>/gi) || []).length;
    const listItemCount = (block.html.match(/<li\b/gi) || []).length;
    const tableRowCount = (block.html.match(/<tr\b/gi) || []).length;
    const hasTable = /<table/i.test(block.html);
    const hasList = /<(ul|ol)/i.test(block.html);

    let height = 0;

    // More accurate: 80 words per 100px for 10px font with line-height 1.6
    height = Math.ceil(wordCount / 80) * 100;
    
    if (paragraphCount > 1) {
      height += (paragraphCount - 1) * 18;
    }

    height += breakCount * 16;

    if (hasList) {
      height += 30 + (listItemCount * TERMS_LIST_ITEM_HEIGHT);
    }

    if (hasTable) {
      height += TERMS_TABLE_BASE + (tableRowCount * TERMS_TABLE_ROW_HEIGHT);
    }

    return Math.max(height, TERMS_PARAGRAPH_BASE);
  };

  interface TermsPage {
    leftColumn: TermsBlock[];
    rightColumn: TermsBlock[];
  }



  const formatTermsAndConditions = (content: string): { html: string; pageCount: number } => {
    if (!content) {
      return { html: '', pageCount: 0 };
    }

    const trimmed = content.trim();
    if (!trimmed) {
      return { html: '', pageCount: 0 };
    }

    const renderBlock = (block: TermsBlock): string => {
      if (block.type === 'heading') {
        return `<h3 class="terms-heading">${escapeHtml(block.text)}</h3>`;
      }
      return block.html;
    };

    const hasHtmlTags = /<[^>]+>/.test(trimmed);
    let blocks: TermsBlock[];
    
    if (hasHtmlTags) {
      const normalizedBlocks = buildHtmlTermsBlocks(trimmed);
      if (normalizedBlocks) {
        blocks = normalizedBlocks;
      } else {
        const textOnly = trimmed.replace(/<[^>]+>/g, ' ');
        blocks = buildPlainTextTermsBlocks(textOnly);
      }
    } else {
      blocks = buildPlainTextTermsBlocks(trimmed);
    }

    if (blocks.length === 0) {
      return { html: '', pageCount: 0 };
    }

    // Simple single-column layout
    const htmlContent = `<div class="terms-content">${blocks.map(renderBlock).join('')}</div>`;

    return { html: htmlContent, pageCount: 1 };
  };
  let companyName = 'QUALITROL';
  let companyLogoUrl = '';
  let expiresDays = 30;
  let quoteFieldsForPDF: any[] = [];
  
  try {
    const { data: termsData, error: termsError } = await supabase
      .from('legal_pages')
      .select('content')
      .eq('slug', 'quote_terms')
      .single();
    
    if (!termsError && termsData) {
      termsAndConditions = termsData.content;
    }

    // Fetch company settings
    const { data: settingsData } = await supabase
      .from('app_settings')
      .select('key, value')
      .in('key', ['company_name', 'company_logo_url', 'quote_expires_days']);

    if (settingsData) {
      const nameSetting = settingsData.find(s => s.key === 'company_name');
      const logoSetting = settingsData.find(s => s.key === 'company_logo_url');
      const expiresSetting = settingsData.find(s => s.key === 'quote_expires_days');
      
      // Values are stored as JSONB directly now
      companyName = nameSetting?.value || 'QUALITROL';
      companyLogoUrl = logoSetting?.value || '';
      expiresDays = typeof expiresSetting?.value === 'number' ? expiresSetting.value : parseInt(expiresSetting?.value || '30');
    }

    // Fetch quote fields that should be included in PDF
    const { data: fieldsData } = await supabase
      .from('quote_fields')
      .select('*')
      .eq('include_in_pdf', true)
      .eq('enabled', true)
      .order('display_order', { ascending: true });

    if (fieldsData) {
      quoteFieldsForPDF = fieldsData;
    }
  } catch (error) {
    console.warn('Could not fetch PDF settings:', error);
  }

  const draftBom = quoteInfo?.draft_bom as any;
  const combinedQuoteFields: Record<string, any> = {
    ...(draftBom?.quoteFields && typeof draftBom.quoteFields === 'object'
      ? draftBom.quoteFields
      : {}),
    ...(quoteInfo?.quote_fields && typeof quoteInfo.quote_fields === 'object'
      ? quoteInfo.quote_fields
      : {}),
  };
  const rackLayoutFallbackMap = new Map<string, any>();
  if (Array.isArray(draftBom?.rackLayouts)) {
    draftBom.rackLayouts.forEach((entry: any) => {
      const key = entry?.productId || entry?.partNumber;
      if (!key) return;
      rackLayoutFallbackMap.set(String(key), entry?.layout || entry);
    });
  }

  const level4FallbackMap = new Map<string, any>();
  if (Array.isArray(draftBom?.level4Configurations)) {
    draftBom.level4Configurations.forEach((entry: any) => {
      const key = entry?.productId || entry?.partNumber;
      if (!key) return;
      level4FallbackMap.set(String(key), entry);
    });
  }

  const escapeHtml = (value: any): string => {
    return String(value ?? '')
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#39;');
  };

  const normalizeLevel4Options = (rawOptions: any): NormalizedLevel4Option[] => {
    if (!rawOptions) return [];

    let optionsArray: any[] = [];

    if (typeof rawOptions === 'string') {
      try {
        const parsed = JSON.parse(rawOptions);
        if (Array.isArray(parsed)) {
          optionsArray = parsed;
        } else if (parsed && typeof parsed === 'object') {
          if (Array.isArray((parsed as any).options)) {
            optionsArray = (parsed as any).options;
          } else {
            const firstArray = Object.values(parsed).find(value => Array.isArray(value));
            if (Array.isArray(firstArray)) {
              optionsArray = firstArray as any[];
            }
          }
        }
      } catch {
        return [];
      }
    } else if (Array.isArray(rawOptions)) {
      optionsArray = rawOptions;
    } else if (rawOptions && typeof rawOptions === 'object') {
      if (Array.isArray((rawOptions as any).options)) {
        optionsArray = (rawOptions as any).options;
      } else if (Array.isArray((rawOptions as any).data)) {
        optionsArray = (rawOptions as any).data;
      } else {
        const firstArray = Object.values(rawOptions).find(value => Array.isArray(value));
        if (Array.isArray(firstArray)) {
          optionsArray = firstArray as any[];
        }
      }
    }

    return optionsArray.map((option, index) => {
      const id = option?.id ?? option?.value ?? option?.option_value ?? option?.optionValue ?? option?.option_key ?? `option-${index}`;
      const value = option?.value ?? option?.option_value ?? option?.optionValue ?? option?.id ?? id;
      const label = option?.label ?? option?.name ?? option?.option_label ?? option?.optionValue ?? option?.option_value ?? option?.option_key ?? String(value);
      const infoUrl = option?.url ?? option?.info_url ?? option?.infoUrl ?? option?.link ?? null;
      const partNumber = option?.part_number ?? option?.partNumber ?? option?.metadata?.part_number ?? option?.metadata?.partNumber ?? null;

      return {
        id: String(id),
        value: String(value),
        label: String(label),
        infoUrl: infoUrl ? String(infoUrl) : null,
        partNumber: partNumber ? String(partNumber) : null,
      };
    });
  };

  const normalizeLevel4Entries = (entries: any): Array<{ index: number; value: string }> => {
    if (!entries) return [];

    if (typeof entries === 'string') {
      try {
        const parsed = JSON.parse(entries);
        const normalized = normalizeLevel4Entries(parsed);
        if (normalized.length > 0) {
          return normalized;
        }
      } catch {
        // Fall back to treating the string as a single value below
      }

      if (entries.trim().length > 0) {
        return [{ index: 0, value: entries.trim() }];
      }

      return [];
    }
    if (Array.isArray(entries)) {
      return entries
        .map((entry, idx) => {
          if (entry == null) return null;
          const index = typeof entry.index === 'number' && !Number.isNaN(entry.index)
            ? entry.index
            : typeof entry.inputIndex === 'number'
              ? entry.inputIndex
              : idx;
          const rawValue = entry.value ?? entry.option ?? entry.selection ?? entry.option_id ?? entry.optionId ?? entry.option_value ?? entry.optionValue ?? entry.id ?? entry.name ?? entry;
          if (rawValue === undefined || rawValue === null || rawValue === '') return null;
          return { index, value: String(rawValue) };
        })
        .filter((entry): entry is { index: number; value: string } => entry !== null);
    }

    if (typeof entries === 'object') {
      return Object.entries(entries)
        .map(([key, value], idx) => {
          if (value == null) return null;
          const candidateIndex = typeof (value as any).index === 'number' && !Number.isNaN((value as any).index)
            ? (value as any).index
            : Number.parseInt(key, 10);
          const index = Number.isFinite(candidateIndex) ? Number(candidateIndex) : idx;
          const rawValue = (value as any).value ?? (value as any).option ?? (value as any).selection ?? (value as any).option_id ?? (value as any).optionId ?? (value as any).option_value ?? (value as any).optionValue ?? (value as any).id ?? (value as any).name ?? value;
          if (rawValue === undefined || rawValue === null || rawValue === '') return null;
          return { index, value: String(rawValue) };
        })
        .filter((entry): entry is { index: number; value: string } => entry !== null);
    }

    return [];
  };

  const extractLevel4Payload = (data: any, depth = 0): NormalizedLevel4Payload | null => {
    if (!data || depth > 6) return null;

    const inspectCandidate = (candidate: any): NormalizedLevel4Payload | null => {
      if (!candidate || typeof candidate !== 'object') return null;

      const configId = candidate.level4_config_id ?? candidate.level4ConfigId ?? candidate.config_id ?? candidate.configId;
      const rawEntries = candidate.entries ?? candidate.selections ?? candidate.values ?? candidate.inputs;

      if (configId && rawEntries) {
        const normalizedEntries = normalizeLevel4Entries(rawEntries);
        if (normalizedEntries.length > 0) {
          const templateTypeRaw = candidate.template_type ?? candidate.templateType ?? candidate.mode;
          let templateType: 'OPTION_1' | 'OPTION_2' | undefined;
          if (typeof templateTypeRaw === 'string') {
            const normalized = templateTypeRaw.toUpperCase();
            if (normalized === 'OPTION_2' || normalized === 'FIXED' || normalized.includes('2')) {
              templateType = 'OPTION_2';
            } else {
              templateType = 'OPTION_1';
            }
          }

          return {
            level4_config_id: String(configId),
            entries: normalizedEntries,
            template_type: templateType,
          };
        }
      }

      return null;
    };

    const direct = inspectCandidate(data);
    if (direct) return direct;

    if (Array.isArray(data)) {
      for (const entry of data) {
        const found = extractLevel4Payload(entry, depth + 1);
        if (found) return found;
      }
      return null;
    }

    if (typeof data === 'object') {
      for (const value of Object.values(data)) {
        if (!value || typeof value !== 'object') continue;
        const found = extractLevel4Payload(value, depth + 1);
        if (found) return found;
      }
    }

    return null;
  };

  const extractFieldLabelFromConfig = (config: any, depth = 0): string | undefined => {
    if (!config || typeof config !== 'object' || depth > 4) return undefined;

    const candidates = [
      (config as any).field_label,
      (config as any).fieldLabel,
      (config as any).label,
      (config as any).field,
      (config as any).configuration?.field_label,
      (config as any).configuration?.fieldLabel,
      (config as any).config?.field_label,
      (config as any).config?.fieldLabel,
    ];

    for (const candidate of candidates) {
      if (typeof candidate === 'string' && candidate.trim().length > 0) {
        return candidate;
      }
    }

    for (const value of Object.values(config)) {
      if (value && typeof value === 'object') {
        const nested = extractFieldLabelFromConfig(value, depth + 1);
        if (nested) return nested;
      }
    }

    return undefined;
  };

  const extractTemplateTypeFromConfig = (config: any, depth = 0): 'OPTION_1' | 'OPTION_2' | undefined => {
    if (!config || typeof config !== 'object' || depth > 4) return undefined;

    const directTemplate = (config as any).template_type ?? (config as any).templateType;
    if (typeof directTemplate === 'string') {
      const normalized = directTemplate.toUpperCase();
      if (normalized === 'OPTION_2' || normalized === 'FIXED' || normalized.includes('2')) {
        return 'OPTION_2';
      }
      return 'OPTION_1';
    }

    const mode = (config as any).mode ?? (config as any).configurationMode;
    if (typeof mode === 'string') {
      return mode.toLowerCase() === 'fixed' ? 'OPTION_2' : 'OPTION_1';
    }

    const fixedInputs = (config as any).fixed_inputs ?? (config as any).fixedInputs ?? (config as any).fixed?.numberOfInputs;
    const variableInputs = (config as any).max_inputs ?? (config as any).maxInputs ?? (config as any).variable?.maxInputs;
    if (fixedInputs != null) return 'OPTION_2';
    if (variableInputs != null) return 'OPTION_1';

    const nestedKeys = ['configuration', 'config', 'level4Config', 'payload', 'data'];
    for (const key of nestedKeys) {
      const value = (config as any)[key];
      if (value && typeof value === 'object') {
        const nested = extractTemplateTypeFromConfig(value, depth + 1);
        if (nested) return nested;
      }
    }

    return undefined;
  };

  const extractOptionsFromConfig = (config: any, visited = new Set<any>()): NormalizedLevel4Option[] => {
    if (!config || typeof config !== 'object' || visited.has(config)) return [];
    visited.add(config);

    const candidateValues = [
      (config as any).options,
      (config as any).optionList,
      (config as any).availableOptions,
      (config as any).selectionOptions,
      (config as any).level4Options,
      (config as any).configuration?.options,
      (config as any).config?.options,
      (config as any).level4Config?.options,
      (config as any).configuration?.config?.options,
    ];

    for (const candidate of candidateValues) {
      const normalized = normalizeLevel4Options(candidate);
      if (normalized.length > 0) {
        return normalized;
      }
    }

    const nestedKeys = ['configuration', 'config', 'level4Config', 'payload', 'data'];
    for (const key of nestedKeys) {
      const value = (config as any)[key];
      if (value && typeof value === 'object') {
        const nested = extractOptionsFromConfig(value, visited);
        if (nested.length > 0) {
          return nested;
        }
      }
    }

    return [];
  };

  const analyzeLevel4Config = (config: any) => {
    return {
      payload: extractLevel4Payload(config),
      fieldLabel: extractFieldLabelFromConfig(config),
      templateType: extractTemplateTypeFromConfig(config),
      options: extractOptionsFromConfig(config),
    };
  };

  const resolveLevel4Option = (options: NormalizedLevel4Option[], value: string): NormalizedLevel4Option | undefined => {
    if (!value) return undefined;
    const exact = options.find(option => option.value === value || option.id === value || option.label === value);
    if (exact) return exact;

    const lowerValue = value.toLowerCase?.();
    if (!lowerValue) return undefined;

    return options.find(option =>
      option.value?.toLowerCase?.() === lowerValue ||
      option.id?.toLowerCase?.() === lowerValue ||
      option.label?.toLowerCase?.() === lowerValue
    );
  };

  const buildLevel4SectionHTML = (
    entries: Level4AnalyzedEntry[],
    definitions: Map<string, Level4ConfigDefinition>
  ): string => {
    if (!entries.length) {
      return '';
    }

    const sections = entries.map(entry => {
      const payload = entry.payload ?? null;
      const configId = payload?.level4_config_id;
      const definition = configId ? definitions.get(configId) : undefined;

      const options = (definition?.options && definition.options.length > 0)
        ? definition.options
        : entry.options;

      const fieldLabel = definition?.fieldLabel || entry.fieldLabel || 'Selection';
      const templateType = definition?.templateType || payload?.template_type || entry.templateType || 'OPTION_1';

      const headingParts: string[] = [];
      if (typeof entry.slotNumber === 'number') {
        headingParts.push(`Slot ${entry.slotNumber}`);
      }
      if (entry.slotCardName) {
        headingParts.push(entry.slotCardName);
      }
      if (entry.partNumber) {
        headingParts.push(entry.partNumber);
      }

      const headingText = headingParts.length > 0
        ? headingParts.map(part => escapeHtml(part)).join(' - ')
        : escapeHtml(`${entry.productName}${entry.partNumber ? ` - ${entry.partNumber}` : ''}`);

      const subheadingParts: string[] = [];
      if (entry.productName) {
        subheadingParts.push(entry.productName);
      }
      if (entry.productPartNumber && entry.productPartNumber !== entry.partNumber) {
        subheadingParts.push(`Part Number: ${entry.productPartNumber}`);
      }

      const subheadingText = subheadingParts.length > 0
        ? subheadingParts.map(part => escapeHtml(part)).join(' • ')
        : '';

      const metaParts: string[] = [];
      if (configId) {
        metaParts.push(`Configuration ID: ${escapeHtml(configId)}`);
      }
      if (!definition && configId) {
        metaParts.push('Metadata unavailable - displaying saved selections');
      }

      const selections = (() => {
        const normalizedPayloadEntries = payload?.entries
          ? [...payload.entries].sort((a, b) => a.index - b.index)
          : [];

        if (normalizedPayloadEntries.length > 0) {
          return normalizedPayloadEntries;
        }

        const fallbackSources: any[] = [];
        if (entry.rawConfig && typeof entry.rawConfig === 'object') {
          fallbackSources.push(
            (entry.rawConfig as any).entries,
            (entry.rawConfig as any).selections,
            (entry.rawConfig as any).values,
            (entry.rawConfig as any).inputs
          );
          fallbackSources.push(entry.rawConfig);

          if (Array.isArray(entry.rawConfig)) {
            fallbackSources.push(entry.rawConfig);
          }
        } else if (Array.isArray(entry.rawConfig)) {
          fallbackSources.push(entry.rawConfig);
        }

        for (const source of fallbackSources) {
          const normalized = normalizeLevel4Entries(source);
          if (normalized.length > 0) {
            return normalized.sort((a, b) => a.index - b.index);
          }
        }

        return [] as Array<{ index: number; value: string }>;
      })();
      let bodyHtml = '';

      if (selections.length > 0) {
        bodyHtml += '<table class="level4-table"><thead><tr><th>Input</th><th>Selected Option</th></tr></thead><tbody>';
        selections.forEach((selection, idx) => {
          const inputLabel = (selections.length > 1 || templateType === 'OPTION_2')
            ? `${fieldLabel} #${idx + 1}`
            : fieldLabel;

          const option = resolveLevel4Option(options, selection.value);
          const optionLabel = option ? escapeHtml(option.label) : escapeHtml(selection.value);

          const detailParts: string[] = [];
          if (option?.partNumber) {
            detailParts.push(`Part Number: ${escapeHtml(option.partNumber)}`);
          }
          const optionInfoUrl =
            sanitizeHttpUrl(option?.infoUrl) ??
            sanitizeHttpUrl((option as any)?.info_url);

          if (optionInfoUrl) {
            detailParts.push(
              `<a href="${escapeHtml(optionInfoUrl)}" target="_blank" rel="noopener noreferrer">Product Info</a>`
            );
          }
          if (!option) {
            detailParts.push(`Option ID: ${escapeHtml(selection.value)}`);
          }

          bodyHtml += `
            <tr>
              <td>${escapeHtml(inputLabel)}</td>
              <td>
                <div class="level4-option-label">${optionLabel}</div>
                ${detailParts.length > 0 ? `<div class="level4-option-meta">${detailParts.join(' • ')}</div>` : ''}
              </td>
            </tr>
          `;
        });
        bodyHtml += '</tbody></table>';
      } else if (payload) {
        bodyHtml += '<p class="level4-empty">No selections recorded for this configuration.</p>';
      } else {
        bodyHtml += '<p class="level4-empty">Unable to parse configuration details. Saved data shown below.</p>';
      }

      if ((!payload || !payload.entries?.length) && selections.length === 0 && entry.rawConfig) {
        bodyHtml += `<pre class="level4-raw">${escapeHtml(JSON.stringify(entry.rawConfig, null, 2))}</pre>`;
      }

      return `
        <div class="level4-section">
          <h3 class="level4-heading">${headingText}</h3>
          ${subheadingText ? `<div class="level4-subheading">${subheadingText}</div>` : ''}
          ${metaParts.length > 0 ? `<div class="level4-meta">${metaParts.join(' • ')}</div>` : ''}
          ${bodyHtml}
        </div>
      `;
    }).join('');

    if (!sections) {
      return '';
    }

    return `
      <div class="level4-collection">
        ${sections}
      </div>
    `;
  };

  const normalizeSlotNumber = (value: any, fallbackIndex: number): number => {
    if (typeof value === 'number' && !Number.isNaN(value)) {
      return value;
    }
    if (typeof value === 'string') {
      const parsed = Number.parseInt(value, 10);
      if (!Number.isNaN(parsed)) {
        return parsed;
      }
    }
    return fallbackIndex + 1;
  };

  const toSlotEntries = (slots: any[], bomItems: any[]): Array<{
    slot: number;
    cardName: string;
    partNumber?: string;
    level4Config?: any;
    level4Selections?: any;
    level4BomItemId?: string;
    isSharedLevel4Config?: boolean;
    isBushingSecondary?: boolean;
    sharedFromSlot?: number;
  }> => {
    if (!Array.isArray(slots)) return [];
    
    // Extract valid product IDs from BOM items
    const validProductIds = new Set(
      bomItems
        .filter(item => item && (item.product_id || item.productId || item.product?.id))
        .map(item => String(item.product_id || item.productId || item.product?.id))
    );
    
    return slots
      .map((slot, index) => {
        // Extract product ID from slot
        const slotProductId = 
          slot?.productId || 
          slot?.product_id || 
          slot?.cardId ||
          slot?.card_id ||
          slot?.product?.id ||
          slot?.level3ProductId ||
          slot?.level3_product_id;
        
        // Filter: Skip slots for products that are no longer in the BOM
        if (slotProductId && !validProductIds.has(String(slotProductId))) {
          console.log(`🗑️ Excluding deleted product from PDF: ${slotProductId} at slot ${index + 1}`);
          return null;
        }
        
        const slotNumber = normalizeSlotNumber(slot?.slot ?? slot?.slotNumber ?? slot?.position ?? slot?.slot_index, index);
        return {
          slot: slotNumber,
          cardName: slot?.cardName || slot?.displayName || slot?.name || slot?.product?.name || `Slot ${slotNumber}`,
          partNumber: slot?.partNumber || slot?.product?.partNumber || slot?.part_number || undefined,
          level4Config: slot?.level4Config || slot?.configuration || null,
          level4Selections: slot?.level4Selections || slot?.selections || null,
          level4BomItemId:
            slot?.level4BomItemId ||
            slot?.level4_bom_item_id ||
            slot?.level4Config?.bomItemId ||
            slot?.level4Config?.bom_item_id ||
            slot?.level4Config?.bom_item ||
            slot?.configuration?.bomItemId ||
            slot?.configuration?.bom_item_id ||
            slot?.configuration?.bom_item ||
            undefined,
          isSharedLevel4Config:
            Boolean(
              slot?.isSharedLevel4Config ||
              slot?.sharedLevel4Config ||
              slot?.is_shared_level4_config ||
              slot?.isBushingSecondary ||
              slot?.level4Config?.isSharedLevel4Config ||
              slot?.level4Config?.sharedLevel4Config ||
              slot?.level4Config?.is_shared_level4_config ||
              slot?.level4Config?.shared_from_slot != null ||
              slot?.level4Config?.sharedFromSlot != null ||
              slot?.configuration?.isSharedLevel4Config ||
              slot?.configuration?.sharedLevel4Config ||
              slot?.configuration?.is_shared_level4_config ||
              slot?.configuration?.shared_from_slot != null ||
              slot?.configuration?.sharedFromSlot != null
            ),
          isBushingSecondary: Boolean(slot?.isBushingSecondary || slot?.is_bushing_secondary),
          sharedFromSlot: (() => {
            const rawShared =
              slot?.sharedFromSlot ??
              slot?.shared_from_slot ??
              slot?.level4Config?.sharedFromSlot ??
              slot?.level4Config?.shared_from_slot ??
              slot?.configuration?.sharedFromSlot ??
              slot?.configuration?.shared_from_slot;
            if (rawShared === undefined || rawShared === null || rawShared === '') {
              return undefined;
            }
            return normalizeSlotNumber(rawShared, index);
          })(),
        };
      })
      .filter(entry => entry.slot !== undefined && entry.slot !== null);
  };

  const deriveRackConfiguration = (item: any, allBomItems: any[]): {
    slots: Array<{
      slot: number;
      cardName: string;
      partNumber?: string;
      level4Config?: any;
      level4Selections?: any;
      level4BomItemId?: string;
      isSharedLevel4Config?: boolean;
      isBushingSecondary?: boolean;
      sharedFromSlot?: number;
    }>;
  } | undefined => {
    if (!item) return undefined;

    if (item.rackConfiguration && typeof item.rackConfiguration === 'object') {
      if (Array.isArray(item.rackConfiguration.slots)) {
        return { slots: toSlotEntries(item.rackConfiguration.slots, allBomItems) };
      }

      if (Array.isArray(item.rackConfiguration)) {
        return { slots: toSlotEntries(item.rackConfiguration, allBomItems) };
      }
    }

    if (Array.isArray(item.slotAssignments)) {
      return { slots: toSlotEntries(item.slotAssignments, allBomItems) };
    }

    if (item.slotAssignments && typeof item.slotAssignments === 'object') {
      const entries = Object.entries(item.slotAssignments).map(([slotKey, slotData], index) => {
        const data = slotData as any;
        return {
          slot: normalizeSlotNumber(slotKey, index),
          cardName: data?.displayName || data?.name || data?.product?.name || `Slot ${slotKey}`,
          partNumber: data?.partNumber || data?.product?.partNumber || data?.part_number || undefined,
          level4Config: data?.level4Config || null,
          level4Selections: data?.level4Selections || null,
          level4BomItemId:
            data?.level4BomItemId ||
            data?.level4_bom_item_id ||
            data?.level4Config?.bomItemId ||
            data?.level4Config?.bom_item_id ||
            data?.configuration?.bomItemId ||
            data?.configuration?.bom_item_id,
          isSharedLevel4Config:
            Boolean(
              data?.isSharedLevel4Config ||
              data?.sharedLevel4Config ||
              data?.is_shared_level4_config ||
              data?.isBushingSecondary ||
              data?.is_bushing_secondary
            ),
          isBushingSecondary: Boolean(data?.isBushingSecondary || data?.is_bushing_secondary),
          sharedFromSlot:
            data?.sharedFromSlot ??
            data?.shared_from_slot ??
            data?.bushingPairSlot ??
            data?.bushing_pair_slot ??
            undefined,
        };
      }).filter(entry => entry.slot !== undefined && entry.slot !== null);

      if (entries.length > 0) {
        return { slots: entries };
      }
    }

    return undefined;
  };

  const hasConfigData = (config: any): boolean => {
    if (!config) return false;
    if (Array.isArray(config)) {
      return config.length > 0;
    }
    if (typeof config === 'object') {
      return Object.values(config).some(value => {
        if (value === null || value === undefined) return false;
        if (Array.isArray(value)) return value.length > 0;
        if (typeof value === 'object') return Object.keys(value).length > 0;
        return String(value).trim().length > 0;
      });
    }
    return String(config).trim().length > 0;
  };

  const isSharedLevel4Slot = (slot: any): boolean => {
    if (!slot) return false;

    const directFlags = [
      slot.isSharedLevel4Config,
      slot.sharedLevel4Config,
      slot.is_shared_level4_config,
      slot.isBushingSecondary,
      slot.is_bushing_secondary,
    ];

    if (directFlags.some(flag => Boolean(flag))) {
      return true;
    }

    const sharedSource =
      slot.sharedFromSlot ??
      slot.shared_from_slot ??
      slot.primarySlot ??
      slot.primary_slot ??
      slot.bushingPairSlot ??
      slot.bushing_pair_slot;

    const slotNumber =
      typeof slot.slot === 'number' ? slot.slot :
      typeof slot.slotNumber === 'number' ? slot.slotNumber :
      undefined;

    if (sharedSource != null && sharedSource !== '' && sharedSource !== undefined) {
      const normalizedShared = Number.parseInt(String(sharedSource), 10);
      if (!Number.isNaN(normalizedShared)) {
        if (slotNumber === undefined || normalizedShared !== slotNumber) {
          return true;
        }
      }
    }

    const nestedCandidates = [slot.level4Config, slot.configuration, slot.level4Selections, slot.selections];
    return nestedCandidates.some(candidate => {
      if (!candidate || typeof candidate !== 'object') return false;
      if (
        candidate.isSharedLevel4Config ||
        candidate.sharedLevel4Config ||
        candidate.is_shared_level4_config ||
        candidate.isBushingSecondary ||
        candidate.is_bushing_secondary
      ) {
        return true;
      }
      const nestedShared = candidate.sharedFromSlot ?? candidate.shared_from_slot;
      if (nestedShared != null && nestedShared !== '') {
        return true;
      }
      return false;
    });
  };

  const buildLevel4SharedKey = (slot: any, configuration: any): string | undefined => {
    const candidateValues = [
      slot?.level4BomItemId,
      slot?.level4_bom_item_id,
      configuration?.level4BomItemId,
      configuration?.level4_bom_item_id,
      configuration?.bomItemId,
      configuration?.bom_item_id,
      configuration?.bom_item,
      configuration?.bomId,
      configuration?.bom_id,
      configuration?.bomItem?.id,
      configuration?.payload?.bomItemId,
      configuration?.payload?.bom_item_id,
    ];

    for (const candidate of candidateValues) {
      if (candidate === undefined || candidate === null) continue;
      const value = typeof candidate === 'string' ? candidate : String(candidate);
      if (value.trim().length > 0) {
        return `bom:${value.trim()}`;
      }
    }

    if (configuration !== undefined && configuration !== null) {
      if (typeof configuration === 'string') {
        const trimmed = configuration.trim();
        if (trimmed.length > 0) {
          return `cfg:${trimmed}`;
        }
      }

      try {
        const serialized = JSON.stringify(configuration);
        if (serialized.length > 0) {
          return `cfg:${serialized}`;
        }
      } catch {
        // Ignore serialization errors
      }
    }

    return undefined;
  };

  let normalizedBomItems = bomItems.map(item => {
    const product = (item.product || {}) as any;
    const parentProduct = (item.parentProduct || product?.parentProduct || {}) as any;
    const grandParentProduct = (parentProduct?.parentProduct || product?.parentProduct?.parentProduct || {}) as any;
    const configurationProduct = (item.configuration?.product || item.configuration?.selectedProduct || {}) as any;
    const configurationLevel2 = (item.configuration?.selectedLevel2Product || item.configuration?.level2Product || {}) as any;
    const directLevel2 = (item.level2Product || item.level2_product || {}) as any;
    const resolvedProductInfoUrl =
      resolveProductInfoUrl(
        product,
        parentProduct,
        grandParentProduct,
        item,
        item.configuration,
        configurationProduct,
        configurationLevel2,
        directLevel2,
        configurationProduct?.product,
        configurationProduct?.parentProduct,
        configurationLevel2?.parentProduct,
        directLevel2?.parentProduct
      );

    const fallbackProductInfoUrl =
      coerceString(product.productInfoUrl) ||
      coerceString((product as any).product_info_url) ||
      coerceString(item.productInfoUrl) ||
      coerceString((item as any).product_info_url) ||
      coerceString(configurationProduct?.productInfoUrl) ||
      coerceString(configurationProduct?.product_info_url) ||
      coerceString(configurationLevel2?.productInfoUrl) ||
      coerceString(configurationLevel2?.product_info_url) ||
      coerceString(directLevel2?.productInfoUrl) ||
      coerceString(directLevel2?.product_info_url) ||
      null;

    const productInfoUrl = resolvedProductInfoUrl || fallbackProductInfoUrl;

    const normalizedProduct = {
      ...product,
      name: product.name || item.name || 'Configured Item',
      description: product.description || item.description || '',
      price: typeof product.price === 'number' ? product.price : (item.product?.price || item.unit_price || 0),
      productInfoUrl: productInfoUrl || undefined,
    };

    const normalizedLevel =
      determineBomItemLevel({ ...item, product: normalizedProduct }) ??
      determineBomItemLevel(item) ??
      coerceProductLevel(item.level);

    const partNumber = item.partNumber || item.part_number || product.partNumber || product.part_number || 'TBD';
    const fallbackKey = product.id || partNumber || product.name;

    const fallbackRackEntry = fallbackKey ? rackLayoutFallbackMap.get(String(fallbackKey)) : undefined;
    const fallbackRack = fallbackRackEntry?.layout || fallbackRackEntry;
    const derivedRack = deriveRackConfiguration(item, bomItems) || fallbackRack;

    const fallbackLevel4 = fallbackKey ? level4FallbackMap.get(String(fallbackKey)) : undefined;
    let directLevel4 = item.level4Config || item.level4Selections || null;
    if (!directLevel4 && fallbackLevel4?.configuration) {
      directLevel4 = fallbackLevel4.configuration;
    }

    const slotLevel4Entries: Array<{ slot: number; cardName: string; partNumber?: string; level4BomItemId?: string; configuration: any; rawSlot?: any; }> = [];
    const seenLevel4Keys = new Set<string>();

    const rackSlots = Array.isArray(derivedRack?.slots)
      ? dedupeSpanAwareSlots(derivedRack?.slots as SpanAwareSlot[])
      : [];

    rackSlots.forEach(slot => {
      const configuration = slot.level4Config || slot.level4Selections;
      if (!hasConfigData(configuration)) return;

      const sharedKey = buildLevel4SharedKey(slot, configuration);
      const isShared = isSharedLevel4Slot(slot);

      if (sharedKey && seenLevel4Keys.has(sharedKey) && isShared) {
        return;
      }

      if (sharedKey) {
        seenLevel4Keys.add(sharedKey);
      }

      slotLevel4Entries.push({
        slot: slot.slot,
        cardName: slot.cardName,
        partNumber: slot.partNumber,
        level4BomItemId: slot.level4BomItemId,
        configuration,
        rawSlot: slot,
      });
    });

    if (Array.isArray(fallbackLevel4?.slots)) {
      fallbackLevel4.slots.forEach((slot: any, index: number) => {
        const configuration = slot?.configuration || slot?.level4Config || slot?.level4Selections;
        if (!hasConfigData(configuration)) return;

        const normalizedSlot = {
          slot: normalizeSlotNumber(slot?.slot, index),
          cardName: slot?.cardName || slot?.name || normalizedProduct.name,
          partNumber: slot?.partNumber || partNumber,
          level4BomItemId:
            slot?.level4BomItemId ||
            slot?.level4_bom_item_id ||
            slot?.configuration?.bomItemId ||
            slot?.configuration?.bom_item_id ||
            slot?.level4Config?.bomItemId ||
            slot?.level4Config?.bom_item_id,
        };

        const sharedKey = buildLevel4SharedKey(normalizedSlot, configuration);
        const isShared = isSharedLevel4Slot({ ...normalizedSlot, level4Config: slot?.level4Config, level4Selections: slot?.level4Selections, configuration });

        if (sharedKey && seenLevel4Keys.has(sharedKey) && isShared) {
          return;
        }

        if (sharedKey) {
          seenLevel4Keys.add(sharedKey);
        }

        slotLevel4Entries.push({
          slot: normalizedSlot.slot,
          cardName: normalizedSlot.cardName,
          partNumber: normalizedSlot.partNumber,
          level4BomItemId: normalizedSlot.level4BomItemId,
          configuration,
          rawSlot: slot,
        });
      });
    }

    const normalizedSlotLevel4Entries = dedupeSpanAwareSlots(slotLevel4Entries);

    return {
      ...item,
      product: normalizedProduct,
      enabled: item.enabled !== false,
      partNumber,
      rackConfiguration: derivedRack,
      level4Config: directLevel4 || undefined,
      slotLevel4: normalizedSlotLevel4Entries,
      level: normalizedLevel ?? item.level,
    };
  });

  normalizedBomItems = await attachInfoUrlForPdf(normalizedBomItems);

  const itemsMissingProductInfo = normalizedBomItems.filter(item => !coerceString((item.product as any)?.productInfoUrl));

  if (itemsMissingProductInfo.length > 0) {
    const productIdsToFetch = new Set<string>();

    itemsMissingProductInfo.forEach(item => {
      const candidates = collectProductIdCandidates(
        item,
        item.product,
        item.configuration,
        item.configuration?.product,
        item.configuration?.selectedProduct,
        item.configuration?.selectedLevel2Product,
        item.configuration?.level2Product,
        item.configuration?.selectedProducts,
        item.level2Product,
        item.level2_product,
        item.parentProduct,
        item.configuration?.rackConfiguration,
        item.rackConfiguration,
        item.slotAssignments
      );

      candidates.forEach(candidate => productIdsToFetch.add(candidate));
    });

    if (productIdsToFetch.size > 0) {
      const { data: productInfoRows } = await supabase
        .from('products')
        .select('id, product_info_url')
        .in('id', Array.from(productIdsToFetch));

      if (Array.isArray(productInfoRows) && productInfoRows.length > 0) {
        const infoUrlMap = new Map<string, string>();
        productInfoRows.forEach(row => {
          const infoUrl = coerceString((row as any)?.product_info_url);
          if (infoUrl) {
            infoUrlMap.set(String((row as any).id), infoUrl);
          }
        });

        itemsMissingProductInfo.forEach(item => {
          const candidates = collectProductIdCandidates(
            item,
            item.product,
            item.configuration,
            item.configuration?.product,
            item.configuration?.selectedProduct,
            item.configuration?.selectedLevel2Product,
            item.configuration?.level2Product,
            item.configuration?.selectedProducts,
            item.level2Product,
            item.level2_product,
            item.parentProduct,
            item.configuration?.rackConfiguration,
            item.rackConfiguration,
            item.slotAssignments
          );

          for (const candidate of candidates) {
            const matchedUrl = candidate ? infoUrlMap.get(candidate) : undefined;
            const sanitizedMatchedUrl = sanitizeHttpUrl(matchedUrl);

            if (sanitizedMatchedUrl) {
              (item.product as any).productInfoUrl = sanitizedMatchedUrl;
              (item.product as any).product_info_url = sanitizedMatchedUrl;
              (item as any).productInfoUrl = sanitizedMatchedUrl;
              (item as any).resolvedInfoUrl = sanitizedMatchedUrl;
              break;
            }
          }
        });
      }
    }
  }

  const level2ItemsById = new Map<string, (typeof normalizedBomItems)[number]>();

  normalizedBomItems.forEach(item => {
    const normalizedLevel =
      coerceProductLevel(item?.level) ??
      coerceProductLevel(item?.product?.product_level) ??
      determineBomItemLevel(item);

    if (normalizedLevel !== 2) {
      return;
    }

    const level2Id =
      coerceString(extractBomProductId(item)) ??
      coerceString(item?.product?.id) ??
      coerceString(item?.product_id) ??
      coerceString(item?.productId);

    if (level2Id) {
      level2ItemsById.set(level2Id, item);
    }
  });

  const level4DisplayItems: Level4DisplayItem[] = normalizedBomItems.flatMap(item => {
    const entries: Level4DisplayItem[] = [];

    if (hasConfigData(item.level4Config)) {
      entries.push({
        productName: item.product?.name || 'Configured Item',
        productPartNumber: item.partNumber,
        partNumber: item.partNumber,
        level4BomItemId:
          (item.level4Config as any)?.bomItemId ||
          (item.level4Config as any)?.bom_item_id ||
          (item.level4Config as any)?.bom_item ||
          undefined,
        config: item.level4Config,
      });
    }

    if (Array.isArray(item.slotLevel4) && item.slotLevel4.length > 0) {
      item.slotLevel4.forEach((slot, index) => {
        if (!hasConfigData(slot.configuration)) return;
        const resolvedSlotNumber = typeof slot.slot === 'number' && !Number.isNaN(slot.slot)
          ? slot.slot
          : normalizeSlotNumber(slot.slot, index);

      entries.push({
        productName: item.product?.name || 'Configured Item',
        productPartNumber: item.partNumber,
        slotNumber: resolvedSlotNumber,
        slotCardName: slot.cardName,
        partNumber: slot.partNumber || item.partNumber,
        level4BomItemId: slot.level4BomItemId,
        config: slot.configuration,
        rawSlot: slot.rawSlot ?? slot,
      });
    });
  }

    return entries;
  });

  const level4EntriesAnalyzed: Level4AnalyzedEntry[] = level4DisplayItems.map(entry => {
    const analysis = analyzeLevel4Config(entry.config);
    return {
      ...entry,
      payload: analysis.payload,
      fieldLabel: analysis.fieldLabel,
      templateType: analysis.templateType,
      options: analysis.options,
      rawConfig: entry.config,
    };
  });

  const uniqueLevel4ConfigIds = Array.from(
    new Set(
      level4EntriesAnalyzed
        .map(entry => entry.payload?.level4_config_id)
        .filter((id): id is string => Boolean(id))
    )
  );

  const level4ConfigDefinitions = new Map<string, Level4ConfigDefinition>();
  if (uniqueLevel4ConfigIds.length > 0) {
    try {
      const { data: configRows, error: configError } = await supabase
        .from('level4_configs')
        .select('id, field_label, mode, options, fixed_number_of_inputs, variable_max_inputs')
        .in('id', uniqueLevel4ConfigIds);

      if (configError) {
        throw configError;
      }

      if (Array.isArray(configRows)) {
        configRows.forEach(row => {
          const templateType = typeof row.mode === 'string'
            ? (row.mode.toLowerCase() === 'fixed' ? 'OPTION_2' : 'OPTION_1')
            : row.fixed_number_of_inputs != null
              ? 'OPTION_2'
              : row.variable_max_inputs != null
                ? 'OPTION_1'
                : undefined;

          level4ConfigDefinitions.set(row.id, {
            id: row.id,
            fieldLabel: typeof row.field_label === 'string' ? row.field_label : undefined,
            templateType,
            options: normalizeLevel4Options((row as any).options),
          });
        });
      }
    } catch (error) {
      console.warn('Could not fetch Level 4 configuration metadata for PDF:', error);
    }
  }

  const level4SectionHTML = buildLevel4SectionHTML(level4EntriesAnalyzed, level4ConfigDefinitions);

  // Calculate dates
  const createdDate = new Date();
  const expiryDate = new Date(createdDate);
  expiryDate.setDate(expiryDate.getDate() + expiresDays);

  // Determine quote ID display
  const isDraft = quoteInfo.status === 'draft';
  const quoteIdDisplay = isDraft ? 'DRAFT' : quoteInfo.id || 'New Quote';

  // Helper function to get card abbreviation
  const getCardAbbreviation = (cardName: string): string => {
    if (!cardName || cardName === 'Empty') return '';
    
    const name = cardName.trim().toUpperCase();
    
    // Special cases
    if (name.includes('CPU')) return 'CPU';
    if (name.includes('DISPLAY')) return 'DISP';
    
    // Multi-word: first letter of each word
    const words = name.split(/\s+/).filter(w => w.length > 0);
    if (words.length > 1) {
      return words.map(w => w[0]).join('').substring(0, 4);
    }
    
    // Single word: first 3-4 characters
    return name.substring(0, 4);
  };

  // Helper function to generate visual chassis grid HTML
  const generateChassisVisualHTML = (
    chassisTypeCode: string,
    totalSlots: number,
    slotAssignments: ExpandedSlotDisplay[],
    partNumber: string | undefined
  ): string => {
    // Determine layout based on chassis type
    let layout: number[][] = [];
    
    const upperType = chassisTypeCode?.toUpperCase() || '';
    
    if (upperType.includes('LTX')) {
      // LTX: 14 slots - Top row: 8-14 (7 slots), Bottom row: CPU + 1-7 (8 slots)
      layout = [
        [8, 9, 10, 11, 12, 13, 14],
        [-1, 1, 2, 3, 4, 5, 6, 7] // -1 represents CPU
      ];
    } else if (upperType.includes('MTX')) {
      // MTX: 7 slots - Single row: CPU + 1-7 (8 slots)
      layout = [[-1, 1, 2, 3, 4, 5, 6, 7]];
    } else if (upperType.includes('STX')) {
      // STX: 4 slots - Single row: CPU + 1-4 (5 slots)
      layout = [[-1, 1, 2, 3, 4]];
    } else {
      // Fallback: dynamic layout (max 8 per row)
      const slotsPerRow = Math.min(8, totalSlots);
      const numRows = Math.ceil(totalSlots / slotsPerRow);
      for (let row = 0; row < numRows; row++) {
        const rowSlots: number[] = [];
        for (let i = 0; i < slotsPerRow; i++) {
          const slotNum = row * slotsPerRow + i + 1;
          if (slotNum <= totalSlots) {
            rowSlots.push(slotNum);
          }
        }
        if (rowSlots.length > 0) {
          layout.push(rowSlots);
        }
      }
    }

    // Create slot assignment map
    const slotMap = new Map<number, { name: string; partNumber?: string }>();
    slotAssignments.forEach(slot => {
      if (slot.slot !== null && slot.slot !== undefined && slot.cardName !== 'Empty') {
        slotMap.set(Number(slot.slot), { name: slot.cardName, partNumber: slot.partNumber });
      }
    });

    // Generate HTML for the grid
    let gridHTML = '<div class="chassis-visual"><div class="chassis-grid">';

    layout.forEach(row => {
      const colCount = row.length;
      gridHTML += `<div class="chassis-grid-row" style="grid-template-columns: repeat(${colCount}, 1fr);">`;
      
      row.forEach(slotNum => {
        if (slotNum === -1) {
          // CPU slot
          gridHTML += '<div class="chassis-slot cpu-slot"><span class="slot-label">CPU</span></div>';
        } else {
          const assignment = slotMap.get(slotNum);
          if (assignment) {
            const abbrev = getCardAbbreviation(assignment.name);
            gridHTML += `<div class="chassis-slot occupied"><span class="slot-label">${escapeHtml(abbrev)}</span></div>`;
          } else {
            gridHTML += `<div class="chassis-slot empty"><span class="slot-number">${slotNum}</span></div>`;
          }
        }
      });
      
      gridHTML += '</div>';
    });

    gridHTML += '</div>';
    
    if (partNumber) {
      gridHTML += `<div class="chassis-part-number">Part Number: ${escapeHtml(partNumber)}</div>`;
    }

    gridHTML += '</div>';

    return gridHTML;
  };

  const rackConfigurationHTML = (() => {
    const chassisItems = normalizedBomItems.filter(item =>
      item.enabled &&
      item.rackConfiguration &&
      typeof item.rackConfiguration === 'object'
    );

    const fallbackRackLayouts = Array.isArray(draftBom?.rackLayouts) ? draftBom.rackLayouts : [];

    if (chassisItems.length === 0 && fallbackRackLayouts.length === 0 && !quoteInfo.draft_bom?.rackConfiguration) {
      return '';
    }

    let rackConfigHTML = '<div class="rack-config">';

    const renderedRackLayoutKeys = new Set<string>();

    const buildRackLayoutKey = (title: string, partNumber: string | undefined, slots: any[]) => {
      const normalizedTitle = typeof title === 'string' ? title.trim().toLowerCase() : '';
      const normalizedPart = typeof partNumber === 'string' ? partNumber.trim().toLowerCase() : '';
      const normalizedSlots = Array.isArray(slots)
        ? slots.map(slot => ({
            slot:
              slot?.slot ??
              slot?.slotNumber ??
              slot?.position ??
              null,
            partNumber:
              typeof slot?.partNumber === 'string'
                ? slot.partNumber.trim().toLowerCase()
                : typeof slot?.product?.partNumber === 'string'
                  ? slot.product.partNumber.trim().toLowerCase()
                  : null,
            cardName:
              typeof slot?.cardName === 'string'
                ? slot.cardName.trim().toLowerCase()
                : typeof slot?.name === 'string'
                  ? slot.name.trim().toLowerCase()
                  : null,
          }))
        : [];

      try {
        return `${normalizedTitle}|${normalizedPart}|${JSON.stringify(normalizedSlots)}`;
      } catch {
        return `${normalizedTitle}|${normalizedPart}`;
      }
    };

    const renderRackLayout = (title: string, partNumber: string | undefined, slots: any[], chassisTypeCode?: string) => {
      const layoutKey = buildRackLayoutKey(title, partNumber, slots);
      if (layoutKey && renderedRackLayoutKeys.has(layoutKey)) {
        return;
      }

      if (layoutKey) {
        renderedRackLayoutKeys.add(layoutKey);
      }

      const safeTitle = escapeHtml(title);
      const safePartNumber = partNumber ? escapeHtml(partNumber) : '';

      rackConfigHTML += `
        <div class="rack-card">
          <h3 class="rack-card-title">${safeTitle}${safePartNumber ? ` · ${safePartNumber}` : ''}</h3>
      `;

      const sourceSlots = Array.isArray(slots) ? (slots as SpanAwareSlot[]) : [];
      const normalizedSlots = dedupeSpanAwareSlots(sourceSlots);
      const tableRows = (() => {
        const expanded = expandSpanAwareSlots(sourceSlots);
        if (expanded.length > 0) {
          return expanded;
        }

        return normalizedSlots
          .map((slot, idx) => mapSlotForDisplay(slot as SpanAwareSlot, idx))
          .filter((entry): entry is ExpandedSlotDisplay => Boolean(entry))
          .sort((a, b) => a.slot - b.slot);
      })();

      // Add visual chassis grid if we have slots
      if (tableRows.length > 0 && chassisTypeCode) {
        const occupiedSlots = tableRows.filter(entry => entry.cardName !== 'Empty').length;

        const visualGridHTML = generateChassisVisualHTML(
          chassisTypeCode,
          occupiedSlots,
          tableRows,
          partNumber
        );

        rackConfigHTML += visualGridHTML;
      }

      if (tableRows.length > 0) {
        rackConfigHTML += '<table class="rack-table"><thead><tr><th>Slot</th><th>Card Type</th><th>Part Number</th></tr></thead><tbody>';

        tableRows.forEach(slot => {
          rackConfigHTML += `
            <tr>
              <td>Slot ${escapeHtml(String(slot.slot))}</td>
              <td>${escapeHtml(slot.cardName)}</td>
              <td>${slot.partNumber ? escapeHtml(String(slot.partNumber)) : '-'}</td>
            </tr>
          `;
        });

        rackConfigHTML += '</tbody></table>';
      } else {
        rackConfigHTML += '<p class="rack-empty">No rack configuration data available</p>';
      }

      rackConfigHTML += '</div>';
    };

    chassisItems.forEach(chassisItem => {
      const config = chassisItem.rackConfiguration;
      const chassisType = chassisItem.product?.id || chassisItem.product?.name || '';
      renderRackLayout(chassisItem.product.name, chassisItem.partNumber, config?.slots || [], chassisType);
    });

    fallbackRackLayouts.forEach(layout => {
      const slots = layout?.layout?.slots || layout?.slots;
      if (Array.isArray(slots) && slots.length > 0) {
        const chassisType = layout.productId || layout.productName || '';
        renderRackLayout(layout.productName || 'Configured Rack', layout.partNumber, slots, chassisType);
      }
    });

    if (quoteInfo.draft_bom?.rackConfiguration) {
      const rawLayout = JSON.stringify(quoteInfo.draft_bom.rackConfiguration, null, 2);
      rackConfigHTML += `
        <div class="rack-card">
          <h3 class="rack-card-title">Draft Rack Configuration</h3>
          <pre class="rack-raw">${escapeHtml(rawLayout)}</pre>
        </div>
      `;
    }

    rackConfigHTML += '</div>';
    return rackConfigHTML;
  })();

  const footerHTML = `
    <div class="footer">
      <p>${isDraft ? 'This is a draft quote and is subject to final approval and terms & conditions.' : 'This quote is subject to the terms & conditions outlined above.'}</p>
      <p>Generated by PowerQuotePro Quote System | ${companyName}</p>
      ${!isDraft ? `<p><strong>Quote ID:</strong> ${quoteInfo.id}</p>` : ''}
    </div>
  `;

  const formattedTerms = formatTermsAndConditions(termsAndConditions);
  const hasTermsContent = formattedTerms.pageCount > 0;
  const hasRackOrLevel4Content = Boolean(rackConfigurationHTML || level4SectionHTML);

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Quote - ${quoteIdDisplay}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        @page {
          size: A4;
          margin: 8mm 6mm;
        }
        body {
          font-family: 'Inter', sans-serif;
          background: #f1f5f9;
          color: #0f172a;
          margin: 0;
          padding: 20px 12px;
          font-size: 11px;
          line-height: 1.55;
        }
        .page {
          background: #ffffff;
          border-radius: 20px;
          box-shadow: 0 30px 60px -28px rgba(15, 23, 42, 0.3);
          margin: 0 auto 24px;
          max-width: 210mm;
          width: 100%;
          page-break-after: always;
        }
        .page:last-of-type { page-break-after: auto; }
        .page-inner { 
          padding: 20px 18px; 
          display: flex;
          flex-direction: column;
          min-height: calc(100vh - 40px);
        }
        .header {
          border-bottom: 1px solid #e2e8f0;
          padding-bottom: 24px;
          margin-bottom: 28px;
          display: flex;
          justify-content: space-between;
          align-items: center;
        }
        .header-left { display: flex; align-items: center; gap: 20px; }
        .logo-img { max-height: 56px; max-width: 200px; object-fit: contain; }
        .logo-text { color: #0f172a; font-size: 20px; font-weight: 700; letter-spacing: -0.02em; }
        .header-right { text-align: right; }
        .quote-id { font-size: 16px; font-weight: 600; color: #0f172a; margin: 0; }
        .header-meta { font-size: 11px; color: #64748b; margin-top: 6px; }
        .draft-warning { background: #fef3c7; border: 1px solid #f59e0b; padding: 16px 20px; border-radius: 12px; margin-bottom: 28px; color: #92400e; font-size: 11px; }
        .draft-warning strong { display: block; font-size: 11px; letter-spacing: 0.08em; text-transform: uppercase; margin-bottom: 6px; }
        .draft-warning p { margin: 4px 0 0; }
        .date-info { display: inline-flex; flex-wrap: wrap; gap: 14px; align-items: center; background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 12px; padding: 14px 18px; margin-bottom: 32px; color: #475569; font-size: 11px; }
        .date-info strong { color: #0f172a; font-weight: 600; }
        .date-info .note { color: #64748b; font-style: italic; }
        .quote-header-fields { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px 28px; margin-bottom: 36px; }
        .quote-header-fields h3 { color: #0f172a; margin: 0 0 18px; font-size: 15px; font-weight: 600; }
        .field-row { display: grid; grid-template-columns: minmax(180px, 220px) 1fr; gap: 14px; padding: 10px 0; border-bottom: 1px solid #e2e8f0; }
        .field-row:last-of-type { border-bottom: none; }
        .field-label { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; font-weight: 600; }
        .field-value { font-size: 12px; color: #0f172a; font-weight: 500; word-break: break-word; }
        .section-title { color: #0f172a; font-size: 16px; font-weight: 600; margin: 0 0 18px; }
        .bom-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .bom-table thead { display: table-header-group; }
        .bom-table th { background: #f1f5f9; color: #0f172a; padding: 12px 14px; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
        .bom-table td { padding: 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 11px; vertical-align: top; }
        .bom-table tbody tr { page-break-inside: avoid; }
        .bom-table tbody tr:nth-child(even) { background: #f8fafc; }
        .bom-item-cell { display: flex; flex-direction: column; align-items: flex-start; }
        .bom-item-name { font-weight: 600; }
        .product-info-link { margin-top: 8px; font-size: 10px; }
        .product-info-link a { color: #2563eb; text-decoration: none; word-break: break-all; }
        .product-info-link a:hover { text-decoration: underline; }
        .total-section { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
        .total-line { display: flex; gap: 16px; font-size: 12px; font-weight: 600; color: #0f172a; }
        .total-line .label { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; font-weight: 500; }
        .total-line.discount { color: #b45309; }
        .total-line.final { font-size: 15px; color: #0f172a; }
        .additional-info { margin-top: 24px; padding: 18px 20px; border-radius: 12px; background: #f8fafc; border: 1px solid #e2e8f0; }
        .additional-info h3 { margin: 0 0 10px; color: #0f172a; font-size: 14px; font-weight: 600; }
        .additional-info p { margin: 0; font-size: 11px; color: #334155; line-height: 1.6; }
        .rack-config { display: flex; flex-direction: column; gap: 24px; }
        .rack-card { background: #f8fafc; border: 1px solid #e2e8f0; border-radius: 16px; padding: 24px; box-shadow: 0 12px 32px -18px rgba(15,23,42,0.25); }
        .rack-card-title { color: #0f172a; margin: 0; font-size: 15px; font-weight: 600; }
        .chassis-visual { background: #1e293b; border-radius: 12px; padding: 20px; margin: 18px 0; }
        .chassis-grid { display: flex; flex-direction: column; gap: 8px; margin-bottom: 12px; }
        .chassis-grid-row { display: grid; gap: 8px; }
        .chassis-slot { height: 48px; border: 2px solid #475569; border-radius: 8px; display: flex; align-items: center; justify-content: center; font-size: 13px; font-weight: 600; color: #ffffff; background: #334155; }
        .chassis-slot.occupied { background: #3b82f6; border-color: #2563eb; }
        .chassis-slot.cpu-slot { background: #8b5cf6; border-color: #7c3aed; }
        .chassis-slot.empty { background: #475569; color: #94a3b8; font-size: 16px; }
        .chassis-slot .slot-label { font-size: 12px; font-weight: 700; }
        .chassis-slot .slot-number { font-size: 14px; font-weight: 500; }
        .chassis-part-number { font-size: 10px; color: #cbd5e1; text-align: left; font-family: 'Courier New', monospace; }
        .rack-table { width: 100%; border-collapse: collapse; margin-top: 18px; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; }
        .rack-table th { background: #0f172a; color: #f8fafc; padding: 12px; text-align: left; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; }
        .rack-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #0f172a; }
        .rack-table tbody tr:nth-child(even) { background: #f8fafc; }
        .rack-empty { color: #64748b; font-style: italic; padding: 18px; background: #ffffff; border-radius: 12px; border: 1px dashed #cbd5f5; margin-top: 18px; }
        .rack-raw { white-space: pre-wrap; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace; font-size: 10px; background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 12px; margin-top: 18px; overflow-x: auto; }
        .level4-collection { display: flex; flex-direction: column; gap: 24px; }
        .level4-section { border: 1px solid #e2e8f0; border-radius: 16px; padding: 26px; background: linear-gradient(135deg, rgba(241,245,249,0.88), rgba(248,250,252,0.96)); }
        .level4-heading { margin: 0; font-size: 15px; font-weight: 600; color: #0f172a; }
        .level4-subheading { margin-top: 6px; color: #64748b; font-size: 11px; }
        .level4-meta { margin-top: 10px; color: #64748b; font-size: 10px; }
        .level4-table { width: 100%; border-collapse: collapse; margin-top: 18px; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0; background: #ffffff; }
        .level4-table th { background: #0f172a; color: #f8fafc; padding: 12px; text-align: left; font-size: 9px; letter-spacing: 0.08em; text-transform: uppercase; }
        .level4-table td { padding: 12px; border-bottom: 1px solid #e2e8f0; font-size: 11px; color: #0f172a; }
        .level4-option-label { font-weight: 600; color: #0f172a; }
        .level4-option-meta { margin-top: 4px; font-size: 10px; color: #64748b; }
        .level4-empty { color: #64748b; font-style: italic; background: #ffffff; border: 1px dashed #cbd5f5; padding: 14px; border-radius: 12px; margin-top: 16px; }
        .level4-raw { white-space: pre-wrap; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace; font-size: 10px; background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 12px; margin-top: 18px; }
        .terms-content {
          max-width: 800px;
          font-size: 10px;
          line-height: 1.6;
          color: #475569;
        }
        .terms-heading {
          font-size: 13px;
          font-weight: 600;
          color: #1e293b;
          margin: 18px 0 10px 0;
          line-height: 1.4;
        }
        .terms-heading:first-child {
          margin-top: 0;
        }
        .terms-content p {
          margin: 0 0 12px 0;
          line-height: 1.6;
          color: #334155;
        }
        .terms-content ul,
        .terms-content ol {
          margin: 0 0 12px 0;
          padding-left: 24px;
        }
        .terms-content li {
          margin: 5px 0;
          line-height: 1.5;
        }
        .terms-content table {
          width: 100%;
          border-collapse: collapse;
          margin: 12px 0;
        }
        .terms-content table th,
        .terms-content table td {
          border: 1px solid #e2e8f0;
          padding: 8px;
          text-align: left;
          font-size: 10px;
        }
        .terms-content table th {
          background-color: #f8fafc;
          font-weight: 600;
        }
        .terms-content strong {
          color: #0f172a;
          font-weight: 600;
        }
        .terms-content a {
          color: #2563eb;
          text-decoration: none;
        }
        .terms-content a:hover {
          text-decoration: underline;
        }
        .page-break {
          page-break-after: always;
          break-after: page;
          height: 0;
          margin: 0;
          padding: 0;
        }
        .footer { margin-top: 48px; border-top: 1px solid #e2e8f0; padding-top: 18px; font-size: 10px; color: #64748b; }
        @media print {
          body { background: #ffffff; padding: 0; }
          .page { box-shadow: none; border-radius: 0; margin: 0 auto; max-width: none; width: auto; }
          .page-inner { padding: 8mm 6mm; }
          .draft-warning, .date-info, .quote-header-fields, .rack-card, .level4-section { page-break-inside: avoid; }
          .terms-page-wrapper {
            page-break-inside: avoid;
            break-inside: avoid;
          }
          .terms-page-columns {
            display: grid;
            grid-template-columns: 1fr 1fr;
            gap: 18px;
          }
          .terms-column-left,
          .terms-column-right {
            page-break-inside: auto;
            break-inside: auto;
          }
          .page-break {
            page-break-after: always;
            break-after: page;
          }
        }
      </style>
    </head>
    <body>
      <div class="page page-intro">
        <div class="page-inner">
          <div class="header">
            <div class="header-left">
              ${companyLogoUrl ? `<img src="${companyLogoUrl}" alt="${companyName} Logo" class="logo-img" />` : `<div class="logo-text">${companyName}</div>`}
            </div>
            <div class="header-right">
              <div class="quote-id">Quote ID: ${quoteIdDisplay}</div>
              <div class="header-meta">Generated on: ${createdDate.toLocaleDateString()}</div>
            </div>
          </div>

          ${isDraft ? `
            <div class="draft-warning">
              <strong>⚠️ Draft</strong>
              <p>Draft values are informational. Please request a formal quotation with a finalized configuration and quote ID before purchasing.</p>
            </div>
          ` : ''}

          <div class="date-info">
            <span><strong>Created:</strong> ${createdDate.toLocaleDateString()}</span>
            <span><strong>Valid Until:</strong> ${expiryDate.toLocaleDateString()}</span>
            <span class="note">Valid for ${expiresDays} days</span>
          </div>

          <div class="quote-header-fields">
            <h3>Quote Information</h3>

            ${quoteFieldsForPDF.map(field => {
              let value: any = 'Not specified';

              const candidateIds = Array.from(new Set([
                field.id,
                field.id?.replace(/-/g, '_'),
                field.id?.replace(/_/g, '-'),
                field.id?.toLowerCase?.(),
                field.label,
              ].filter(Boolean)));

              const candidates = candidateIds.flatMap(candidateId => [
                combinedQuoteFields[candidateId as string],
                (quoteInfo as Record<string, any> | undefined)?.[candidateId as string],
              ]);

              const found = candidates.find(candidate => candidate !== undefined && candidate !== null && candidate !== '');
              if (found !== undefined) {
                value = found;
              }

              if (value && typeof value === 'object') {
                value = JSON.stringify(value);
              } else if (value === null || value === undefined || value === '') {
                value = 'Not specified';
              } else {
                value = String(value).replace(/</g, '&lt;').replace(/>/g, '&gt;');
              }

              return `
                <div class="field-row">
                  <div class="field-label">${field.label}:</div>
                  <div class="field-value">${value}</div>
                </div>
              `;
            }).join('')}

          </div>
        </div>
      </div>

      <div class="page page-bom">
        <div class="page-inner">
          <h2 class="section-title">Bill of Materials</h2>
          <table class="bom-table">
            <thead>
              <tr>
                <th>Item</th>
                <th>Description</th>
                <th>Part Number</th>
                <th>Qty</th>
                ${canSeePrices ? '<th>Unit Price</th><th>Total</th>' : ''}
              </tr>
            </thead>
            <tbody>
              ${normalizedBomItems
                .filter(item => item.enabled)
                .map(item => {
                  const normalizedLevel =
                    coerceProductLevel(item?.level) ??
                    coerceProductLevel(item?.product?.product_level) ??
                    determineBomItemLevel(item);

                  const parentLevel2Id = coerceString(
                    extractParentLevel2IdFromItem(item) ??
                      item?.parentLevel2Id ??
                      item?.product?.parentLevel2Id ??
                      item?.product?.parent_product_id ??
                      item?.product?.parentProductId
                  );

                  const parentLevel2Item = parentLevel2Id ? level2ItemsById.get(parentLevel2Id) : undefined;

                  const infoUrl =
                    sanitizeHttpUrl(item?.resolvedInfoUrl) ??
                    sanitizeHttpUrl((item?.product as any)?.productInfoUrl) ??
                    sanitizeHttpUrl((item?.product as any)?.product_info_url) ??
                    (parentLevel2Item
                      ? sanitizeHttpUrl(parentLevel2Item?.resolvedInfoUrl) ??
                        sanitizeHttpUrl((parentLevel2Item?.product as any)?.productInfoUrl) ??
                        sanitizeHttpUrl((parentLevel2Item?.product as any)?.product_info_url)
                      : undefined);

                  const shouldRenderLink =
                    !!infoUrl && normalizedLevel !== 1 && normalizedLevel !== 4;

                  const infoLinkHtml = shouldRenderLink && infoUrl
                    ? `<div class="product-info-link"><a href="${escapeHtml(infoUrl)}" target="_blank" rel="noopener noreferrer">Product Info</a></div>`
                    : '';

                  return `
                  <tr>
                    <td>
                      <div class="bom-item-cell">
                        <div class="bom-item-name">${escapeHtml(item.product.name)}</div>
                        ${infoLinkHtml}
                      </div>
                    </td>
                    <td>
                      ${item.product.description}
                    </td>
                    <td>${item.partNumber || 'TBD'}</td>
                    <td>${item.quantity}</td>
                    ${canSeePrices ? `
                      <td>${formatCurrency(item.product.price)}</td>
                      <td>${formatCurrency(item.product.price * item.quantity)}</td>
                    ` : ''}
                  </tr>
                `;
                })
                .join('')}
            </tbody>
          </table>

          ${canSeePrices ? `
            <div class="total-section">
              ${hasDiscount ? `
                <p class="total-line">
                  <span class="label">Original Total:</span>
                  <span>${formatCurrency(originalTotal)}</span>
                </p>
                <p class="total-line discount">
                  <span class="label">Discount (${formatPercent(effectiveDiscountPercent)}%):</span>
                  <span>- ${formatCurrency(discountAmount)}</span>
                </p>
                <p class="total-line final">
                  <span class="label">Final Total:</span>
                  <span>${formatCurrency(finalTotal)}</span>
                </p>
              ` : `
                <p class="total-line final">
                  <span class="label">Total:</span>
                  <span>${formatCurrency(finalTotal)}</span>
                </p>
              `}
            </div>
          ` : ''}

          ${additionalQuoteInfo ? `
            <div class="additional-info">
              <h3>Additional Quote Information</h3>
              <p>${escapeHtml(additionalQuoteInfo).replace(/\r?\n/g, '<br />')}</p>
            </div>
          ` : ''}

          ${!hasRackOrLevel4Content && !hasTermsContent ? footerHTML : ''}
        </div>
      </div>

      ${hasRackOrLevel4Content ? `
        <div class="page page-config">
          <div class="page-inner">
            ${rackConfigurationHTML ? `<h2 class="section-title">Rack Configuration</h2>${rackConfigurationHTML}` : ''}
            ${level4SectionHTML ? `<h2 class="section-title" style="margin-top: 48px;">Level 4 Configuration Details</h2>${level4SectionHTML}` : ''}
            ${!hasTermsContent ? footerHTML : ''}
          </div>
        </div>
      ` : ''}

      ${hasTermsContent ? `
        <div class="page page-terms">
          <div class="page-inner">
            <h2 class="section-title">Terms & Conditions</h2>
            ${formattedTerms.html}
            ${footerHTML}
          </div>
        </div>
      ` : ''}
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();

  const waitForDocumentReady = async () => {
    const doc = printWindow.document;

    if (doc.readyState !== 'complete') {
      await new Promise<void>(resolve => {
        const handleReadyState = () => {
          if (doc.readyState === 'complete') {
            doc.removeEventListener('readystatechange', handleReadyState);
            resolve();
          }
        };

        doc.addEventListener('readystatechange', handleReadyState);
        if (doc.readyState === 'complete') {
          doc.removeEventListener('readystatechange', handleReadyState);
          resolve();
        }
      });
    }

    const fontSet = (doc as Document & { fonts?: FontFaceSet }).fonts;
    if (fontSet?.ready) {
      try {
        await fontSet.ready;
      } catch (error) {
        console.warn('PDF fonts did not finish loading before print:', error);
      }
    }
  };

  const delay = (ms: number) => new Promise<void>(resolve => setTimeout(resolve, ms));

  // Only trigger print dialog if action is 'download', otherwise just show in browser
  if (action === 'download') {
    await waitForDocumentReady();
    await delay(150);
    printWindow.focus();
    printWindow.print();
  }
};


import { BOMItem } from '@/types/product';
import { Quote } from '@/types/quote';
import { supabase } from '@/integrations/supabase/client';

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

  const resolvedCurrency = (() => {
    const raw = typeof quoteInfo?.currency === 'string' ? quoteInfo.currency.trim().toUpperCase() : '';
    return /^[A-Z]{3}$/.test(raw) ? raw : 'USD';
  })();

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
  const combinedFieldKeys = Object.keys(combinedQuoteFields);

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
          if (option?.infoUrl) {
            detailParts.push(`Info: ${escapeHtml(option.infoUrl)}`);
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
      <div style="margin-top: 40px; page-break-before: always;">
        <h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">Level 4 Configuration Details</h2>
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

  const toSlotEntries = (slots: any[]): Array<{
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
    return slots
      .map((slot, index) => {
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

  const deriveRackConfiguration = (item: any): {
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
        return { slots: toSlotEntries(item.rackConfiguration.slots) };
      }

      if (Array.isArray(item.rackConfiguration)) {
        return { slots: toSlotEntries(item.rackConfiguration) };
      }
    }

    if (Array.isArray(item.slotAssignments)) {
      return { slots: toSlotEntries(item.slotAssignments) };
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

  const normalizedBomItems = bomItems.map(item => {
    const product = (item.product || {}) as any;
    const normalizedProduct = {
      ...product,
      name: product.name || item.name || 'Configured Item',
      description: product.description || item.description || '',
      price: typeof product.price === 'number' ? product.price : (item.product?.price || item.unit_price || 0),
    };

    const partNumber = item.partNumber || item.part_number || product.partNumber || product.part_number || 'TBD';
    const fallbackKey = product.id || partNumber || product.name;

    const fallbackRackEntry = fallbackKey ? rackLayoutFallbackMap.get(String(fallbackKey)) : undefined;
    const fallbackRack = fallbackRackEntry?.layout || fallbackRackEntry;
    const derivedRack = deriveRackConfiguration(item) || fallbackRack;

    const fallbackLevel4 = fallbackKey ? level4FallbackMap.get(String(fallbackKey)) : undefined;
    let directLevel4 = item.level4Config || item.level4Selections || null;
    if (!directLevel4 && fallbackLevel4?.configuration) {
      directLevel4 = fallbackLevel4.configuration;
    }

    const slotLevel4Entries: Array<{ slot: number; cardName: string; partNumber?: string; level4BomItemId?: string; configuration: any; }> = [];
    const seenLevel4Keys = new Set<string>();

    const rackSlots = derivedRack?.slots || [];
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
        });
      });
    }

    return {
      ...item,
      product: normalizedProduct,
      enabled: item.enabled !== false,
      partNumber,
      rackConfiguration: derivedRack,
      level4Config: directLevel4 || undefined,
      slotLevel4: slotLevel4Entries,
    };
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

  const htmlContent = `
    <!DOCTYPE html>
    <html>
    <head>
      <title>Quote - ${quoteIdDisplay}</title>
      <style>
        @import url('https://fonts.googleapis.com/css2?family=Inter:wght@400;500;600;700&display=swap');
        * { box-sizing: border-box; }
        body {
          font-family: 'Inter', sans-serif;
          background: #f1f5f9;
          color: #0f172a;
          margin: 0;
          padding: 36px;
          font-size: 11px;
          line-height: 1.55;
        }
        .page-container {
          max-width: 1080px;
          margin: 0 auto;
          background: #ffffff;
          border-radius: 20px;
          padding: 40px 44px;
          box-shadow: 0 30px 60px -28px rgba(15, 23, 42, 0.3);
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
        .field-value { font-size: 12px; color: #0f172a; font-weight: 500; }
        h2 { color: #0f172a; font-size: 16px; font-weight: 600; margin: 28px 0 18px; }
        .bom-table { width: 100%; border-collapse: collapse; margin-bottom: 12px; }
        .bom-table th { background: #f1f5f9; color: #0f172a; padding: 12px 14px; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; border-bottom: 1px solid #e2e8f0; }
        .bom-table td { padding: 14px; border-bottom: 1px solid #e2e8f0; color: #0f172a; font-size: 11px; vertical-align: top; }
        .bom-table tbody tr:nth-child(even) { background: #f8fafc; }
        .total-section { margin-top: 20px; border-top: 1px solid #e2e8f0; padding-top: 16px; display: flex; flex-direction: column; gap: 8px; align-items: flex-end; }
        .total-line { display: flex; gap: 16px; font-size: 12px; font-weight: 600; color: #0f172a; }
        .total-line .label { font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase; color: #64748b; font-weight: 500; }
        .total-line.discount { color: #b45309; }
        .total-line.final { font-size: 15px; color: #0f172a; }
        .level4-section { margin-top: 40px; border: 1px solid #e2e8f0; border-radius: 16px; padding: 26px; background: linear-gradient(135deg, rgba(241,245,249,0.88), rgba(248,250,252,0.96)); }
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
        .footer { margin-top: 48px; border-top: 1px solid #e2e8f0; padding-top: 18px; font-size: 10px; color: #64748b; }
        @media print {
          body { background: #ffffff; padding: 0; }
          .page-container { box-shadow: none; border-radius: 0; margin: 0; padding: 32px; }
          .draft-warning, .level4-section { page-break-inside: avoid; }
        }
      </style>
    </head>
    <body>
      <div class="page-container">
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
        
        <!-- Customer Information -->
        <div class="field-row">
          <div class="field-label">Customer Name:</div>
          <div class="field-value">${quoteInfo.customer_name || 'Not specified'}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Oracle Customer ID:</div>
          <div class="field-value">${quoteInfo.oracle_customer_id || 'Not specified'}</div>
        </div>
        
        <!-- Dynamic PDF Fields -->
        ${quoteFieldsForPDF.map(field => {
          let value: any = 'Not specified';

          if (combinedFieldKeys.length > 0) {
            const candidates = [
              combinedQuoteFields[field.id],
              combinedQuoteFields[field.id?.replace(/-/g, '_')],
              combinedQuoteFields[field.id?.replace(/_/g, '-')],
              combinedQuoteFields[field.id?.toLowerCase?.() ?? field.id],
              combinedQuoteFields[field.label],
            ];

            const found = candidates.find(candidate => candidate !== undefined && candidate !== null && candidate !== '');
            if (found !== undefined) {
              value = found;
            }
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
        
        <!-- Quote Details -->
        <div class="field-row">
          <div class="field-label">Priority:</div>
          <div class="field-value">${quoteInfo.priority || 'Medium'}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Rep Involved:</div>
          <div class="field-value">${quoteInfo.is_rep_involved ? 'Yes' : 'No'}</div>
        </div>
        
        <!-- Terms & Conditions -->
        <div class="field-row">
          <div class="field-label">Shipping Terms:</div>
          <div class="field-value">${quoteInfo.shipping_terms || 'Not specified'}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Payment Terms:</div>
          <div class="field-value">${quoteInfo.payment_terms || 'Not specified'}</div>
        </div>
        <div class="field-row">
          <div class="field-label">Currency:</div>
          <div class="field-value">${quoteInfo.currency || 'USD'}</div>
        </div>
      </div>

      <h2>Bill of Materials</h2>
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
            .map((item, index) => `
              <tr>
                <td>${item.product.name}</td>
                <td>${item.product.description}</td>
                <td>${item.partNumber || 'TBD'}</td>
                <td>${item.quantity}</td>
                ${canSeePrices ? `
                  <td>${formatCurrency(item.product.price)}</td>
                  <td>${formatCurrency(item.product.price * item.quantity)}</td>
                ` : ''}
              </tr>
            `).join('')}
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

      ${(() => {
        // Check if any items have chassis configurations
        const chassisItems = normalizedBomItems.filter(item =>
          item.enabled &&
          item.rackConfiguration &&
          typeof item.rackConfiguration === 'object'
        );

        const fallbackRackLayouts = Array.isArray(draftBom?.rackLayouts) ? draftBom.rackLayouts : [];

        if (chassisItems.length === 0 && fallbackRackLayouts.length === 0 && !quoteInfo.draft_bom?.rackConfiguration) {
          return '';
        }

        let rackConfigHTML = '<div style="page-break-before: always; margin-top: 40px;">';
        rackConfigHTML += '<h2 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">Rack Configuration</h2>';

        const renderRackLayout = (title: string, partNumber: string | undefined, slots: any[]) => {
          rackConfigHTML += `
            <div style="margin-top: 30px; margin-bottom: 30px; background: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0; box-shadow: 0 12px 32px -18px rgba(15,23,42,0.25);">
              <h3 style="color: #0f172a; margin-top: 0; font-size: 15px; font-weight: 600;">${title}${partNumber ? ` · ${partNumber}` : ''}</h3>
              <div style="margin-top: 18px;">`;

          if (Array.isArray(slots) && slots.length > 0) {
            rackConfigHTML += '<table style="width: 100%; border-collapse: collapse; margin-top: 12px; background: #ffffff; border-radius: 12px; overflow: hidden; border: 1px solid #e2e8f0;">';
            rackConfigHTML += '<thead><tr style="background: #0f172a; color: #f8fafc;"><th style="padding: 12px; border-bottom: 1px solid #1f2937; text-align: left; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;">Slot</th><th style="padding: 12px; border-bottom: 1px solid #1f2937; text-align: left; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;">Card Type</th><th style="padding: 12px; border-bottom: 1px solid #1f2937; text-align: left; font-size: 10px; letter-spacing: 0.08em; text-transform: uppercase;">Part Number</th></tr></thead>';
            rackConfigHTML += '<tbody>';

            slots.forEach((slot: any, idx: number) => {
              const slotNumber = slot?.slot ?? slot?.slotNumber ?? slot?.position ?? (idx + 1);
              const cardName = slot?.cardName || slot?.name || slot?.product?.name || 'Empty';
              const slotPartNumber = slot?.partNumber || slot?.product?.partNumber || '-';
              const rowStyle = idx % 2 === 0 ? 'background: #f8fafc;' : 'background: #ffffff;';
              rackConfigHTML += `
                <tr style="${rowStyle}">
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-weight: 600; color: #0f172a;">Slot ${slotNumber}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; color: #0f172a;">${cardName}</td>
                  <td style="padding: 12px; border-bottom: 1px solid #e2e8f0; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace; font-size: 10px; color: #0f172a;">${slotPartNumber}</td>
                </tr>`;
            });

            rackConfigHTML += '</tbody></table>';
          } else {
            rackConfigHTML += '<p style="color: #64748b; font-style: italic; padding: 18px; background: #ffffff; border-radius: 12px; border: 1px dashed #cbd5f5;">No rack configuration data available</p>';
          }

          rackConfigHTML += '</div></div>';
        };

        // Process each chassis item
        chassisItems.forEach(chassisItem => {
          const config = chassisItem.rackConfiguration;
          renderRackLayout(chassisItem.product.name, chassisItem.partNumber, config?.slots || []);
        });

        // Render fallback rack layouts stored in draft data
        fallbackRackLayouts.forEach(layout => {
          const slots = layout?.layout?.slots || layout?.slots;
          if (Array.isArray(slots) && slots.length > 0) {
            renderRackLayout(layout.productName || 'Configured Rack', layout.partNumber, slots);
          }
        });

        // Also check draft_bom for any raw rack configuration data
        if (quoteInfo.draft_bom?.rackConfiguration) {
          rackConfigHTML += `
            <div style="margin-top: 30px; margin-bottom: 30px; background: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0;">
              <h3 style="color: #0f172a; margin-top: 0; font-size: 15px; font-weight: 600;">Draft Rack Configuration</h3>
              <pre style="white-space: pre-wrap; font-family: 'SFMono-Regular', Consolas, 'Liberation Mono', monospace; font-size: 10px; background: #0f172a; color: #f8fafc; padding: 16px; border-radius: 12px; overflow-x: auto;">${JSON.stringify(quoteInfo.draft_bom.rackConfiguration, null, 2)}</pre>
            </div>`;
        }
        
        rackConfigHTML += '</div>';
        return rackConfigHTML;
      })()}

      ${level4SectionHTML}



      ${termsAndConditions ? `
        <div style="page-break-before: always; margin-top: 40px;">
          <h2 style="color: #0f172a; border-bottom: 1px solid #e2e8f0; padding-bottom: 12px;">Terms & Conditions</h2>
          <div style="background: #f8fafc; padding: 24px; border-radius: 16px; border: 1px solid #e2e8f0; margin-bottom: 20px; white-space: pre-wrap; font-size: 10px; line-height: 1.55; color: #475569;">
            ${termsAndConditions}
          </div>
        </div>
      ` : ''}

        <div class="footer">
          <p>${isDraft ? 'This is a draft quote and is subject to final approval and terms & conditions.' : 'This quote is subject to the terms & conditions outlined above.'}</p>
          <p>Generated by PowerQuotePro Quote System | ${companyName}</p>
          ${!isDraft ? `<p><strong>Quote ID:</strong> ${quoteInfo.id}</p>` : ''}
        </div>
      </div>
    </body>
    </html>
  `;

  printWindow.document.write(htmlContent);
  printWindow.document.close();
  
  // Only trigger print dialog if action is 'download', otherwise just show in browser
  if (action === 'download') {
    printWindow.print();
  }
};

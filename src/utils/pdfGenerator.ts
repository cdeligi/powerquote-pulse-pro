
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

      const selections = payload?.entries
        ? [...payload.entries].sort((a, b) => a.index - b.index)
        : [];

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

      if ((!payload || selections.length === 0) && entry.rawConfig) {
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

  const toSlotEntries = (slots: any[]): Array<{ slot: number; cardName: string; partNumber?: string; level4Config?: any; level4Selections?: any; }> => {
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
        };
      })
      .filter(entry => entry.slot !== undefined && entry.slot !== null);
  };

  const deriveRackConfiguration = (item: any): { slots: Array<{ slot: number; cardName: string; partNumber?: string; level4Config?: any; level4Selections?: any; }> } | undefined => {
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

    const slotLevel4Entries: Array<{ slot: number; cardName: string; partNumber?: string; configuration: any; }> = [];
    const rackSlots = derivedRack?.slots || [];
    rackSlots.forEach(slot => {
      const configuration = slot.level4Config || slot.level4Selections;
      if (hasConfigData(configuration)) {
        slotLevel4Entries.push({
          slot: slot.slot,
          cardName: slot.cardName,
          partNumber: slot.partNumber,
          configuration,
        });
      }
    });

    if (Array.isArray(fallbackLevel4?.slots)) {
      fallbackLevel4.slots.forEach((slot: any, index: number) => {
        const configuration = slot?.configuration || slot?.level4Config || slot?.level4Selections;
        if (!hasConfigData(configuration)) return;
        slotLevel4Entries.push({
          slot: normalizeSlotNumber(slot?.slot, index),
          cardName: slot?.cardName || slot?.name || normalizedProduct.name,
          partNumber: slot?.partNumber || partNumber,
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
        body { font-family: Arial, sans-serif; margin: 20px; color: #333; }
        .header { border-bottom: 2px solid #dc2626; padding-bottom: 20px; margin-bottom: 30px; display: flex; justify-content: space-between; align-items: center; }
        .header-left { display: flex; align-items: center; gap: 20px; }
        .logo-img { max-height: 60px; max-width: 200px; object-fit: contain; }
        .logo-text { color: #dc2626; font-size: 24px; font-weight: bold; }
        .header-right { text-align: right; }
        .quote-id { font-size: 20px; font-weight: bold; color: #dc2626; }
        .draft-warning { background: #fef3c7; border: 2px solid #f59e0b; padding: 15px; margin: 20px 0; border-radius: 8px; }
        .draft-warning strong { color: #b45309; display: block; margin-bottom: 5px; font-size: 16px; }
        .quote-header-fields { background: #f8f9fa; padding: 15px; margin-bottom: 20px; border-radius: 8px; }
        .quote-header-fields h3 { color: #dc2626; margin-top: 0; margin-bottom: 10px; }
        .field-row { display: grid; grid-template-columns: 200px 1fr; gap: 10px; margin-bottom: 8px; }
        .field-label { font-weight: bold; color: #555; }
        .field-value { color: #333; }
        .quote-info { display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 30px; }
        .info-section { background: #f8f9fa; padding: 15px; border-radius: 8px; }
        .info-title { font-weight: bold; color: #dc2626; margin-bottom: 10px; }
        .date-info { margin-bottom: 20px; padding: 10px; background: #e5e7eb; border-radius: 6px; }
        .date-info strong { color: #dc2626; }
        .bom-table { width: 100%; border-collapse: collapse; margin-bottom: 30px; }
        .bom-table th, .bom-table td { border: 1px solid #ddd; padding: 12px; text-align: left; }
        .bom-table th { background-color: #dc2626; color: white; }
        .bom-table tr:nth-child(even) { background-color: #f2f2f2; }
        .total-section { text-align: right; font-size: 18px; font-weight: bold; }
        .footer { margin-top: 40px; padding-top: 20px; border-top: 1px solid #ddd; font-size: 12px; color: #666; }
        .level4-section { margin-top: 25px; background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626; }
        .level4-heading { margin: 0; color: #111827; font-size: 16px; font-weight: 600; }
        .level4-subheading { margin-top: 4px; color: #6b7280; font-size: 13px; }
        .level4-meta { margin-top: 6px; color: #6b7280; font-size: 12px; }
        .level4-table { width: 100%; border-collapse: collapse; margin-top: 15px; background: white; border: 1px solid #e5e7eb; }
        .level4-table th, .level4-table td { border: 1px solid #e5e7eb; padding: 10px; text-align: left; font-size: 13px; vertical-align: top; }
        .level4-table th { background-color: #dc2626; color: white; font-weight: 600; }
        .level4-option-label { font-weight: 600; color: #1f2937; }
        .level4-option-meta { margin-top: 4px; color: #6b7280; font-size: 12px; }
        .level4-empty { color: #6b7280; font-style: italic; background: white; border: 1px dashed #d1d5db; padding: 12px; border-radius: 6px; margin-top: 15px; }
        .level4-raw { white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 12px; background: white; padding: 12px; border-radius: 6px; border: 1px solid #e5e7eb; margin-top: 15px; }
        @media print { body { margin: 0; } }
      </style>
    </head>
    <body>
      <div class="header">
        <div class="header-left">
          ${companyLogoUrl ? `<img src="${companyLogoUrl}" alt="${companyName} Logo" class="logo-img" />` : `<div class="logo-text">${companyName}</div>`}
        </div>
        <div class="header-right">
          <div class="quote-id">Quote ID: ${quoteIdDisplay}</div>
          <div style="color: #666; font-size: 14px; margin-top: 5px;">
            Generated on: ${createdDate.toLocaleDateString()}
          </div>
        </div>
      </div>

      ${isDraft ? `
        <div class="draft-warning">
          <strong>⚠️ DRAFT</strong>
          <p style="margin: 5px 0 0 0;">Draft is a budgetary informative reference value; to purchase the materials, please request a formal offer with final configuration and a valid quotation ID.</p>
        </div>
      ` : ''}

      <div class="date-info">
        <strong>Created:</strong> ${createdDate.toLocaleDateString()} | 
        <strong>Valid Until:</strong> ${expiryDate.toLocaleDateString()} 
        <span style="color: #666;">(${expiresDays} days validity)</span>
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
                  <td>$${item.product.price.toLocaleString()}</td>
                  <td>$${(item.product.price * item.quantity).toLocaleString()}</td>
                ` : ''}
              </tr>
            `).join('')}
        </tbody>
      </table>

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
        rackConfigHTML += '<h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">Rack Configuration Layout</h2>';

        const renderRackLayout = (title: string, partNumber: string | undefined, slots: any[]) => {
          rackConfigHTML += `
            <div style="margin-top: 30px; margin-bottom: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
              <h3 style="color: #dc2626; margin-top: 0;">${title}${partNumber ? ` - ${partNumber}` : ''}</h3>
              <div style="margin-top: 15px;">`;

          if (Array.isArray(slots) && slots.length > 0) {
            rackConfigHTML += '<table style="width: 100%; border-collapse: collapse; margin-top: 10px; background: white;">';
            rackConfigHTML += '<thead><tr style="background: #dc2626; color: white;"><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Slot</th><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Card Type</th><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Part Number</th></tr></thead>';
            rackConfigHTML += '<tbody>';

            slots.forEach((slot: any, idx: number) => {
              const slotNumber = slot?.slot ?? slot?.slotNumber ?? slot?.position ?? (idx + 1);
              const cardName = slot?.cardName || slot?.name || slot?.product?.name || 'Empty';
              const slotPartNumber = slot?.partNumber || slot?.product?.partNumber || '-';
              const rowStyle = idx % 2 === 0 ? 'background: #f9fafb;' : 'background: white;';
              rackConfigHTML += `
                <tr style="${rowStyle}">
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">Slot ${slotNumber}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${cardName}</td>
                  <td style="padding: 10px; border: 1px solid #ddd; font-family: 'Courier New', monospace; font-size: 13px;">${slotPartNumber}</td>
                </tr>`;
            });

            rackConfigHTML += '</tbody></table>';
          } else {
            rackConfigHTML += '<p style="color: #666; font-style: italic; padding: 15px; background: white; border-radius: 4px;">No rack configuration data available</p>';
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
            <div style="margin-top: 30px; margin-bottom: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
              <h3 style="color: #dc2626; margin-top: 0;">Draft Rack Configuration</h3>
              <pre style="white-space: pre-wrap; font-family: monospace; font-size: 11px; background: white; padding: 10px; border-radius: 4px; overflow-x: auto;">${JSON.stringify(quoteInfo.draft_bom.rackConfiguration, null, 2)}</pre>
            </div>`;
        }
        
        rackConfigHTML += '</div>';
        return rackConfigHTML;
      })()}

      ${level4SectionHTML}

      ${canSeePrices ? `
        <div class="total-section">
          <p>Total: $${totalPrice.toLocaleString()}</p>
        </div>
      ` : ''}

      ${termsAndConditions ? `
        <div style="page-break-before: always; margin-top: 40px;">
          <h2>Terms & Conditions</h2>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; margin-bottom: 20px; white-space: pre-wrap; font-size: 12px; line-height: 1.5;">
            ${termsAndConditions}
          </div>
        </div>
      ` : ''}

      <div class="footer">
        <p>${isDraft ? 'This is a draft quote and is subject to final approval and terms & conditions.' : 'This quote is subject to the terms & conditions outlined above.'}</p>
        <p>Generated by PowerQuotePro Quote System | ${companyName}</p>
        ${!isDraft ? `<p><strong>Quote ID:</strong> ${quoteInfo.id}</p>` : ''}
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

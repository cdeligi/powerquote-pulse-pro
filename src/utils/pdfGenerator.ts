
import { BOMItem } from '@/types/product';
import { Quote } from '@/types/quote';
import { supabase } from '@/integrations/supabase/client';

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

  const combinedQuoteFields: Record<string, any> = {
    ...(quoteInfo?.draft_bom?.quoteFields && typeof quoteInfo.draft_bom.quoteFields === 'object'
      ? quoteInfo.draft_bom.quoteFields
      : {}),
    ...(quoteInfo?.quote_fields && typeof quoteInfo.quote_fields === 'object'
      ? quoteInfo.quote_fields
      : {}),
  };
  const combinedFieldKeys = Object.keys(combinedQuoteFields);

  const rackLayoutFallbackMap = new Map<string, any>();
  if (Array.isArray(quoteInfo?.draft_bom?.rackLayouts)) {
    quoteInfo.draft_bom.rackLayouts.forEach((entry: any) => {
      const key = entry?.productId || entry?.partNumber;
      if (!key) return;
      rackLayoutFallbackMap.set(String(key), entry?.layout || entry);
    });
  }

  const level4FallbackMap = new Map<string, any>();
  if (Array.isArray(quoteInfo?.draft_bom?.level4Configurations)) {
    quoteInfo.draft_bom.level4Configurations.forEach((entry: any) => {
      const key = entry?.productId || entry?.partNumber;
      if (!key) return;
      level4FallbackMap.set(String(key), entry);
    });
  }

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
      const entries = Object.entries(item.slotAssignments).map(([slotKey, slotData], index) => ({
        slot: normalizeSlotNumber(slotKey, index),
        cardName: slotData?.displayName || slotData?.name || slotData?.product?.name || `Slot ${slotKey}`,
        partNumber: slotData?.partNumber || slotData?.product?.partNumber || slotData?.part_number || undefined,
        level4Config: slotData?.level4Config || null,
        level4Selections: slotData?.level4Selections || null,
      })).filter(entry => entry.slot !== undefined && entry.slot !== null);

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
    const product = item.product || {};
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

  const level4DisplayItems = normalizedBomItems.flatMap(item => {
    const entries: Array<{ title: string; subtitle?: string; partNumber?: string; config: any; }> = [];

    if (hasConfigData(item.level4Config)) {
      entries.push({
        title: item.product?.name || 'Configured Item',
        subtitle: item.slot ? `Slot ${item.slot}` : undefined,
        partNumber: item.partNumber,
        config: item.level4Config,
      });
    }

    if (Array.isArray(item.slotLevel4) && item.slotLevel4.length > 0) {
      item.slotLevel4.forEach(slot => {
        if (!hasConfigData(slot.configuration)) return;
        entries.push({
          title: item.product?.name || 'Configured Item',
          subtitle: slot.slot ? `Slot ${slot.slot}` : undefined,
          partNumber: slot.partNumber || item.partNumber,
          config: slot.configuration,
        });
      });
    }

    return entries;
  });

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

        const fallbackRackLayouts = Array.isArray(quoteInfo.draft_bom?.rackLayouts) ? quoteInfo.draft_bom.rackLayouts : [];

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

      ${(() => {
        if (level4DisplayItems.length === 0) {
          return '';
        }

        const renderLevel4Config = (config: any): string => {
          if (!hasConfigData(config)) {
            return '<p style="color: #666; font-style: italic; padding: 15px; background: white; border-radius: 4px;">No configuration details available</p>';
          }

          const configData = config as any;

          if (Array.isArray(configData?.entries) && configData.entries.length > 0) {
            let html = '<table style="width: 100%; border-collapse: collapse; margin-top: 10px; background: white; border: 1px solid #ddd;">';
            html += '<thead><tr style="background: #dc2626; color: white;"><th style="padding: 10px; border: 1px solid #ddd; text-align: left; width: 30%;">Input</th><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Configuration</th></tr></thead>';
            html += '<tbody>';

            configData.entries.forEach((entry: any, entryIdx: number) => {
              const inputLabel = `Input #${entryIdx + 1}`;
              let displayValue = entry.label || entry.name || entry.value || 'Not configured';

              if (!entry.label && entry.value && configData.options) {
                const option = configData.options.find((opt: any) => opt.id === entry.value || opt.value === entry.value);
                if (option) {
                  displayValue = option.label || option.name || entry.value;
                }
              }

              const rowStyle = entryIdx % 2 === 0 ? 'background: #f9fafb;' : 'background: white;';
              html += `
                <tr style="${rowStyle}">
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">${inputLabel}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${displayValue}</td>
                </tr>`;
            });

            html += '</tbody></table>';
            return html;
          }

          if (Array.isArray(configData?.selections) && configData.selections.length > 0) {
            let html = '<table style="width: 100%; border-collapse: collapse; margin-top: 10px; background: white; border: 1px solid #ddd;">';
            html += '<thead><tr style="background: #dc2626; color: white;"><th style="padding: 10px; border: 1px solid #ddd; text-align: left; width: 30%;">Input</th><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Configuration</th></tr></thead>';
            html += '<tbody>';

            configData.selections.forEach((selection: any, idx: number) => {
              const inputLabel = `Input #${idx + 1}`;
              const displayValue = selection.label || selection.name || selection.value || 'Not configured';
              const rowStyle = idx % 2 === 0 ? 'background: #f9fafb;' : 'background: white;';
              html += `
                <tr style="${rowStyle}">
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">${inputLabel}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${displayValue}</td>
                </tr>`;
            });

            html += '</tbody></table>';
            return html;
          }

          if (Array.isArray(configData)) {
            if (configData.every((entry: any) => typeof entry === 'string' || typeof entry === 'number')) {
              return `<ul style="margin: 10px 0 0 20px; color: #333;">${configData.map((entry: any) => `<li>${String(entry).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</li>`).join('')}</ul>`;
            }
            return `<pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px; background: white; padding: 10px; border-radius: 4px;">${JSON.stringify(configData, null, 2)}</pre>`;
          }

          if (configData && typeof configData === 'object') {
            const entries = Object.entries(configData).filter(([key]) => !['id', 'level4_config_id', 'bom_item_id', 'created_at', 'updated_at', 'options'].includes(key));
            if (entries.length > 0) {
              let html = '<table style="width: 100%; border-collapse: collapse; margin-top: 10px; background: white; border: 1px solid #ddd;">';
              html += '<thead><tr style="background: #dc2626; color: white;"><th style="padding: 10px; border: 1px solid #ddd; text-align: left; width: 30%;">Property</th><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Value</th></tr></thead>';
              html += '<tbody>';

              entries.forEach(([key, value], idx) => {
                const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
                const rowStyle = idx % 2 === 0 ? 'background: #f9fafb;' : 'background: white;';
                html += `
                  <tr style="${rowStyle}">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">${displayKey}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 12px;">${displayValue.replace(/</g, '&lt;').replace(/>/g, '&gt;')}</td>
                  </tr>`;
              });

              html += '</tbody></table>';
              return html;
            }
          }

          return `<p style="color: #333; padding: 10px; background: white; border-radius: 4px;">${String(configData).replace(/</g, '&lt;').replace(/>/g, '&gt;')}</p>`;
        };

        let level4HTML = '<div style="margin-top: 40px; page-break-before: always;">';
        level4HTML += '<h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">Level 4 Configuration Details</h2>';

        level4DisplayItems.forEach(entry => {
          level4HTML += `
            <div style="margin-top: 25px; background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626;">
              <h3 style="color: #dc2626; margin-top: 0; font-size: 16px;">${entry.title}${entry.subtitle ? ` - ${entry.subtitle}` : ''}${entry.partNumber ? ` (${entry.partNumber})` : ''}</h3>
              <div style="margin-top: 15px; padding-left: 15px;">
                ${renderLevel4Config(entry.config)}
              </div>
            </div>`;
        });

        level4HTML += '</div>';
        return level4HTML;
      })()}

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


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
          <p style="margin: 5px 0 0 0;">Draft is a budgetary quote, to allow PO generation, please request a formal offer with final configuration.</p>
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
          let value = 'Not specified';
          
          if (quoteInfo.quote_fields && typeof quoteInfo.quote_fields === 'object') {
            // Debug: Log the field we're trying to match
            console.log(`Looking for field '${field.id}' in quote_fields:`, Object.keys(quoteInfo.quote_fields));
            
            // Try exact field ID match first (this is most reliable)
            if (field.id in quoteInfo.quote_fields) {
              value = quoteInfo.quote_fields[field.id];
            }
            // If not found, try common variations
            else {
              const fieldValue = quoteInfo.quote_fields[field.id] ||
                                quoteInfo.quote_fields[field.id.replace(/-/g, '_')] ||
                                quoteInfo.quote_fields[field.id.replace(/_/g, '-')] ||
                                quoteInfo.quote_fields[field.id.toLowerCase()] ||
                                quoteInfo.quote_fields[field.label];
              if (fieldValue !== undefined && fieldValue !== null) {
                value = fieldValue;
              }
            }
          }
          
          // Format value based on type
          if (value && typeof value === 'object') {
            // If it's an array or object, stringify it
            value = JSON.stringify(value);
          } else if (value === null || value === undefined || value === '') {
            value = 'Not specified';
          } else {
            // Convert to string and escape HTML
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
          ${bomItems
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
        const chassisItems = bomItems.filter(item => 
          item.enabled && 
          item.rackConfiguration && 
          typeof item.rackConfiguration === 'object'
        );
        
        if (chassisItems.length === 0 && !quoteInfo.draft_bom?.rackConfiguration) {
          return '';
        }

        let rackConfigHTML = '<div style="page-break-before: always; margin-top: 40px;">';
        rackConfigHTML += '<h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">Rack Configuration Layout</h2>';
        
        // Process each chassis item
        chassisItems.forEach((chassisItem, idx) => {
          const config = chassisItem.rackConfiguration;
          
          rackConfigHTML += `
            <div style="margin-top: 30px; margin-bottom: 30px; background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
              <h3 style="color: #dc2626; margin-top: 0;">${chassisItem.product.name} - ${chassisItem.partNumber || 'TBD'}</h3>
              <div style="margin-top: 15px;">`;
          
          // Display rack configuration as a proper table
          if (config.slots && Array.isArray(config.slots) && config.slots.length > 0) {
            rackConfigHTML += '<table style="width: 100%; border-collapse: collapse; margin-top: 10px; background: white;">';
            rackConfigHTML += '<thead><tr style="background: #dc2626; color: white;"><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Slot</th><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Card Type</th><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Part Number</th></tr></thead>';
            rackConfigHTML += '<tbody>';
            
            config.slots.forEach((slot: any, idx: number) => {
              const slotNumber = slot.slot || slot.slotNumber || slot.position || (idx + 1);
              const cardName = slot.cardName || slot.name || slot.product?.name || 'Empty';
              const partNumber = slot.partNumber || slot.part_number || slot.product?.partNumber || slot.product?.part_number || '-';
              
              const rowStyle = idx % 2 === 0 ? 'background: #f9fafb;' : 'background: white;';
              rackConfigHTML += `
                <tr style="${rowStyle}">
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">Slot ${slotNumber}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${cardName}</td>
                  <td style="padding: 10px; border: 1px solid #ddd; font-family: 'Courier New', monospace; font-size: 13px;">${partNumber}</td>
                </tr>`;
            });
            
            rackConfigHTML += '</tbody></table>';
          } else if (config.slotAssignments && typeof config.slotAssignments === 'object') {
            // Alternative format: slotAssignments object
            rackConfigHTML += '<table style="width: 100%; border-collapse: collapse; margin-top: 10px; background: white;">';
            rackConfigHTML += '<thead><tr style="background: #dc2626; color: white;"><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Slot</th><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Card Type</th><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Part Number</th></tr></thead>';
            rackConfigHTML += '<tbody>';
            
            let idx = 0;
            Object.entries(config.slotAssignments).forEach(([slotNum, cardData]: [string, any]) => {
              if (cardData) {
                const rowStyle = idx % 2 === 0 ? 'background: #f9fafb;' : 'background: white;';
                const cardName = cardData.name || cardData.displayName || 'Unnamed Card';
                const partNumber = cardData.partNumber || cardData.part_number || '-';
                
                rackConfigHTML += `
                  <tr style="${rowStyle}">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">Slot ${slotNum}</td>
                    <td style="padding: 10px; border: 1px solid #ddd;">${cardName}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; font-family: 'Courier New', monospace; font-size: 13px;">${partNumber}</td>
                  </tr>`;
                idx++;
              }
            });
            
            rackConfigHTML += '</tbody></table>';
          } else {
            // Fallback: No rack configuration data found
            rackConfigHTML += '<p style="color: #666; font-style: italic; padding: 15px; background: white; border-radius: 4px;">No rack configuration data available</p>';
          }
          
          rackConfigHTML += '</div></div>';
        });
        
        // Also check draft_bom for rack configurations
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
        // Check if any items have Level 4 configurations
        const level4Items = bomItems.filter(item => 
          item.enabled && 
          item.level4Config && 
          typeof item.level4Config === 'object'
        );
        
        if (level4Items.length === 0) {
          return '';
        }

        let level4HTML = '<div style="margin-top: 40px; page-break-before: always;">';
        level4HTML += '<h2 style="color: #dc2626; border-bottom: 2px solid #dc2626; padding-bottom: 10px;">Level 4 Configuration Details</h2>';
        
        // Group configurations by product and slot
        level4Items.forEach((item, idx) => {
          const config = item.level4Config;
          const slotInfo = item.slot ? ` - Slot ${item.slot}` : '';
          
          level4HTML += `
            <div style="margin-top: 25px; background: #f8f9fa; padding: 20px; border-radius: 8px; border-left: 4px solid #dc2626;">
              <h3 style="color: #dc2626; margin-top: 0; font-size: 16px;">${item.product.name}${slotInfo}</h3>
              <div style="margin-top: 15px; padding-left: 15px;">`;
          
          // Cast to any for dynamic data handling in PDF generation
          const configData = config as any;
          
          if (Array.isArray(configData.entries) && configData.entries.length > 0) {
            // Display entries in a formatted table
            level4HTML += '<table style="width: 100%; border-collapse: collapse; margin-top: 10px; background: white; border: 1px solid #ddd;">';
            level4HTML += '<thead><tr style="background: #dc2626; color: white;"><th style="padding: 10px; border: 1px solid #ddd; text-align: left; width: 30%;">Input</th><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Configuration</th></tr></thead>';
            level4HTML += '<tbody>';
            
            configData.entries.forEach((entry: any, entryIdx: number) => {
              const inputLabel = `Input #${entryIdx + 1}`;
              // Try to get the label from the entry or look it up from options
              let displayValue = entry.label || entry.name || 'Not configured';
              
              // If we only have a value ID, try to find the label from the config options
              if (!entry.label && entry.value && configData.options) {
                const option = configData.options.find((opt: any) => opt.id === entry.value || opt.value === entry.value);
                if (option) {
                  displayValue = option.label || option.name || entry.value;
                }
              } else if (!entry.label && entry.value) {
                displayValue = entry.value;
              }
              
              const rowStyle = entryIdx % 2 === 0 ? 'background: #f9fafb;' : 'background: white;';
              level4HTML += `
                <tr style="${rowStyle}">
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">${inputLabel}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${displayValue}</td>
                </tr>`;
            });
            
            level4HTML += '</tbody></table>';
          } else if (configData.selections && Array.isArray(configData.selections)) {
            // Alternative format: selections array
            level4HTML += '<table style="width: 100%; border-collapse: collapse; margin-top: 10px; background: white; border: 1px solid #ddd;">';
            level4HTML += '<thead><tr style="background: #dc2626; color: white;"><th style="padding: 10px; border: 1px solid #ddd; text-align: left; width: 30%;">Input</th><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Configuration</th></tr></thead>';
            level4HTML += '<tbody>';
            
            configData.selections.forEach((selection: any, idx: number) => {
              const inputLabel = `Input #${idx + 1}`;
              const displayValue = selection.label || selection.name || selection.value || 'Not configured';
              const rowStyle = idx % 2 === 0 ? 'background: #f9fafb;' : 'background: white;';
              
              level4HTML += `
                <tr style="${rowStyle}">
                  <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">${inputLabel}</td>
                  <td style="padding: 10px; border: 1px solid #ddd;">${displayValue}</td>
                </tr>`;
            });
            
            level4HTML += '</tbody></table>';
          } else if (typeof configData === 'object' && Object.keys(configData).length > 0) {
            // Display as key-value pairs
            level4HTML += '<table style="width: 100%; border-collapse: collapse; margin-top: 10px; background: white; border: 1px solid #ddd;">';
            level4HTML += '<thead><tr style="background: #dc2626; color: white;"><th style="padding: 10px; border: 1px solid #ddd; text-align: left; width: 30%;">Property</th><th style="padding: 10px; border: 1px solid #ddd; text-align: left;">Value</th></tr></thead>';
            level4HTML += '<tbody>';
            
            let idx = 0;
            Object.entries(configData).forEach(([key, value]) => {
              if (key !== 'id' && key !== 'level4_config_id' && key !== 'bom_item_id' && key !== 'created_at' && key !== 'updated_at') {
                const displayKey = key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
                const displayValue = typeof value === 'object' ? JSON.stringify(value, null, 2) : String(value);
                const rowStyle = idx % 2 === 0 ? 'background: #f9fafb;' : 'background: white;';
                
                level4HTML += `
                  <tr style="${rowStyle}">
                    <td style="padding: 10px; border: 1px solid #ddd; font-weight: 600;">${displayKey}</td>
                    <td style="padding: 10px; border: 1px solid #ddd; white-space: pre-wrap; font-family: 'Courier New', monospace; font-size: 12px;">${displayValue}</td>
                  </tr>`;
                idx++;
              }
            });
            
            level4HTML += '</tbody></table>';
          } else {
            level4HTML += '<p style="color: #666; font-style: italic; padding: 15px; background: white; border-radius: 4px;">No configuration details available</p>';
          }
          
          level4HTML += '</div></div>';
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

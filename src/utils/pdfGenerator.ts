
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
          <strong>⚠️ DRAFT QUOTE - BUDGETARY PURPOSES ONLY</strong>
          <p style="margin: 5px 0 0 0;">This is a budgetary quote. To place an order, make sure you have a valid and final quote with a Quotation ID.</p>
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
          // Try multiple ways to access the field value
          let value = 'Not specified';
          if (quoteInfo.quote_fields) {
            // Try by field.id, field.label, or from direct property
            value = quoteInfo.quote_fields[field.id] || 
                    quoteInfo.quote_fields[field.label] || 
                    quoteInfo.quote_fields[field.id.toLowerCase()] ||
                    'Not specified';
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
            .map((item, index) => {
              const itemRow = `
                <tr>
                  <td>${item.product.name}</td>
                  <td>${item.product.description}</td>
                  <td>${item.partNumber || 'TBD'}</td>
                  <td>${item.quantity}</td>
                  ${canSeePrices ? `
                    <td>$${item.product.price.toLocaleString()}</td>
                    <td>$${(item.product.price * item.quantity).toLocaleString()}</td>
                  ` : ''}
                </tr>`;
              
              // Add Level 4 configuration details if present
              let configRows = '';
              if (item.level4Config) {
                const slotInfo = item.slot ? ` - Slot ${item.slot}` : '';
                const configData = typeof item.level4Config === 'object' && !Array.isArray(item.level4Config) 
                  ? item.level4Config 
                  : {};
                
                if (Object.keys(configData).length > 0) {
                  configRows = `
                    <tr style="background-color: #f9fafb;">
                      <td colspan="${canSeePrices ? '5' : '3'}" style="padding-left: 30px; font-size: 0.9em; color: #666;">
                        <strong>${item.product.name}${slotInfo} Configuration:</strong><br/>
                        ${Object.entries(configData)
                          .map(([key, value]) => `${key}: ${typeof value === 'object' ? JSON.stringify(value) : value}`)
                          .join('<br/>')}
                      </td>
                    </tr>`;
                }
              }
              
              return itemRow + configRows;
            }).join('')}
        </tbody>
      </table>

      ${quoteInfo.draft_bom?.rackConfiguration ? `
        <div style="margin-top: 30px; margin-bottom: 30px;">
          <h3>Rack Configuration Layout</h3>
          <div style="background: #f8f9fa; padding: 20px; border-radius: 8px; border: 1px solid #ddd;">
            <pre style="white-space: pre-wrap; font-family: monospace; font-size: 12px;">${JSON.stringify(quoteInfo.draft_bom.rackConfiguration, null, 2)}</pre>
          </div>
        </div>
      ` : ''}

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

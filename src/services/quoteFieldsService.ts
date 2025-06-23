
interface QuoteField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'date';
  required: boolean;
  options?: string[];
  enabled: boolean;
}

const DEFAULT_QUOTE_FIELDS: QuoteField[] = [
  { id: 'customerName', label: 'Customer Name', type: 'text', required: true, enabled: true },
  { id: 'oracleCustomerId', label: 'Oracle Customer ID', type: 'text', required: true, enabled: true },
  { id: 'sfdcOpportunity', label: 'SFDC Opportunity', type: 'text', required: true, enabled: true },
  { id: 'contactPerson', label: 'Contact Person', type: 'text', required: false, enabled: true },
  { id: 'contactEmail', label: 'Contact Email', type: 'text', required: false, enabled: true },
  { id: 'projectName', label: 'Project Name', type: 'text', required: false, enabled: true },
  { id: 'expectedCloseDate', label: 'Expected Close Date', type: 'date', required: false, enabled: true },
  { id: 'competitorInfo', label: 'Competitor Information', type: 'textarea', required: false, enabled: true },
  { id: 'paymentTerms', label: 'Payment Terms', type: 'select', required: true, enabled: true, options: ['Prepaid', '15 days', '30 days', '60 days', '90 days', '120 days'] },
  { id: 'shippingTerms', label: 'Shipping Terms', type: 'select', required: true, enabled: true, options: ['Ex-Works', 'CFR', 'CIF', 'CIP', 'CPT', 'DDP', 'DAP', 'FCA', 'Prepaid'] },
  { id: 'currency', label: 'Currency', type: 'select', required: true, enabled: true, options: ['USD', 'EURO', 'GBP', 'CAD'] }
];

class QuoteFieldsService {
  private static instance: QuoteFieldsService;
  private fields: QuoteField[];

  private constructor() {
    this.loadFields();
  }

  static getInstance(): QuoteFieldsService {
    if (!QuoteFieldsService.instance) {
      QuoteFieldsService.instance = new QuoteFieldsService();
    }
    return QuoteFieldsService.instance;
  }

  private loadFields(): void {
    const savedFields = localStorage.getItem('quoteFields');
    if (savedFields) {
      this.fields = JSON.parse(savedFields);
    } else {
      this.fields = [...DEFAULT_QUOTE_FIELDS];
    }
  }

  getEnabledFields(): QuoteField[] {
    return this.fields.filter(field => field.enabled);
  }

  getAllFields(): QuoteField[] {
    return [...this.fields];
  }

  updateFields(fields: QuoteField[]): void {
    this.fields = fields;
    localStorage.setItem('quoteFields', JSON.stringify(fields));
  }

  getRequiredFields(): QuoteField[] {
    return this.fields.filter(field => field.enabled && field.required);
  }
}

export const quoteFieldsService = QuoteFieldsService.getInstance();
export type { QuoteField };

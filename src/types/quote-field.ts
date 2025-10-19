export type QuoteFieldType =
  | 'text'
  | 'textarea'
  | 'number'
  | 'select'
  | 'date'
  | 'email'
  | 'tel'
  | 'checkbox';

export type QuoteFieldDisplayMode = 'inline' | 'modal';

export interface QuoteFieldConditionalField {
  id: string;
  label: string;
  type: QuoteFieldType;
  required: boolean;
  include_in_pdf?: boolean;
  options?: string[];
  enabled?: boolean;
  helperText?: string;
}

export interface QuoteFieldConditionalRule {
  id: string;
  triggerValues: string[];
  displayMode: QuoteFieldDisplayMode;
  title?: string;
  description?: string;
  fields: QuoteFieldConditionalField[];
}

export interface QuoteFieldConfiguration {
  id: string;
  label: string;
  type: QuoteFieldType;
  required: boolean;
  enabled: boolean;
  options?: string[];
  display_order: number;
  include_in_pdf?: boolean;
  conditional_logic?: QuoteFieldConditionalRule[];
}

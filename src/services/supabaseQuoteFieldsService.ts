
import { supabase } from '@/integrations/supabase/client';

interface QuoteField {
  id: string;
  label: string;
  type: 'text' | 'number' | 'select' | 'textarea' | 'date';
  required: boolean;
  options?: string[];
  enabled: boolean;
  display_order?: number;
}

class SupabaseQuoteFieldsService {
  private static instance: SupabaseQuoteFieldsService;
  private listeners: Array<() => void> = [];

  private constructor() {}

  static getInstance(): SupabaseQuoteFieldsService {
    if (!SupabaseQuoteFieldsService.instance) {
      SupabaseQuoteFieldsService.instance = new SupabaseQuoteFieldsService();
    }
    return SupabaseQuoteFieldsService.instance;
  }

  // Add listener for field changes
  addListener(callback: () => void): void {
    this.listeners.push(callback);
  }

  removeListener(callback: () => void): void {
    this.listeners = this.listeners.filter(listener => listener !== callback);
  }

  private notifyListeners(): void {
    this.listeners.forEach(listener => listener());
  }

  async getEnabledFields(): Promise<QuoteField[]> {
    const { data, error } = await supabase
      .from('quote_fields')
      .select('*')
      .eq('enabled', true)
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching enabled quote fields:', error);
      return [];
    }

    return data.map(field => ({
      id: field.id,
      label: field.label,
      type: field.type as QuoteField['type'],
      required: field.required,
      options: field.options as string[] || undefined,
      enabled: field.enabled,
      display_order: field.display_order || 0
    }));
  }

  async getAllFields(): Promise<QuoteField[]> {
    const { data, error } = await supabase
      .from('quote_fields')
      .select('*')
      .order('display_order', { ascending: true });

    if (error) {
      console.error('Error fetching all quote fields:', error);
      return [];
    }

    return data.map(field => ({
      id: field.id,
      label: field.label,
      type: field.type as QuoteField['type'],
      required: field.required,
      options: field.options as string[] || undefined,
      enabled: field.enabled,
      display_order: field.display_order || 0
    }));
  }

  async updateFields(fields: QuoteField[]): Promise<void> {
    try {
      // Delete all existing fields
      await supabase.from('quote_fields').delete().neq('id', '');
      
      // Insert updated fields
      const fieldsToInsert = fields.map(field => ({
        id: field.id,
        label: field.label,
        type: field.type,
        required: field.required,
        enabled: field.enabled,
        options: field.options ? JSON.stringify(field.options) : null,
        display_order: field.display_order || 0
      }));

      const { error } = await supabase
        .from('quote_fields')
        .insert(fieldsToInsert);

      if (error) {
        console.error('Error updating quote fields:', error);
        throw error;
      }

      this.notifyListeners();
    } catch (error) {
      console.error('Error in updateFields:', error);
      throw error;
    }
  }

  async getRequiredFields(): Promise<QuoteField[]> {
    const fields = await this.getEnabledFields();
    return fields.filter(field => field.required);
  }
}

export const supabaseQuoteFieldsService = SupabaseQuoteFieldsService.getInstance();
export type { QuoteField };

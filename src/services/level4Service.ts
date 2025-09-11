import { supabase } from '@/integrations/supabase/client';
import type { Level4Configuration, Level4BOMValue, Level4RuntimePayload } from '@/types/level4';
import type { Level4Config, DropdownOption } from '@/components/level4/Level4ConfigTypes';
import type { Level3Product } from '@/types/product/interfaces';

interface Level4ConfigRow {
  id: string;
  product_id: string;
  field_label: string;
  mode: 'fixed' | 'variable';
  fixed_number_of_inputs?: number | null;
  variable_max_inputs?: number | null;
  options: DropdownOption[];
}

export class Level4Service {
  /**
   * Fetch Level 4 configuration for a product from the admin configs table
   */
  static async getLevel4Configuration(level3ProductId: string): Promise<Level4Config | null> {
    try {
      console.log('Fetching Level 4 config for product:', level3ProductId);

      const { data, error } = await supabase
        .from('level4_configs')
        .select('*')
        .eq('product_id', level3ProductId)
        .single();

      if (error) {
        console.error('Error fetching Level 4 config:', error);
        if (error.code === 'PGRST116') {
          return null; // No configuration found
        }
        throw error;
      }

      if (!data) {
        return null;
      }

      const row = data as Level4ConfigRow;

      const mapped: Level4Config = {
        id: row.id,
        fieldLabel: row.field_label,
        mode: row.mode,
        fixed: row.fixed_number_of_inputs != null ? { numberOfInputs: row.fixed_number_of_inputs } : undefined,
        variable: row.variable_max_inputs != null ? { maxInputs: row.variable_max_inputs } : undefined,
        options: Array.isArray(row.options) ? row.options : [],
      };

      console.log('Found Level 4 config:', mapped);
      return mapped;
    } catch (error) {
      console.error('Level4Service.getLevel4Configuration error:', error);
      throw error;
    }
  }

  /**
   * Convert admin Level4Config to runtime Level4Configuration format
   */
  static convertToRuntimeConfiguration(adminConfig: Level4Config, level3ProductId?: string): Level4Configuration {
    const options: DropdownOption[] = Array.isArray(adminConfig.options) ? adminConfig.options : [];

    return {
      id: adminConfig.id,
      level3_product_id: level3ProductId ?? adminConfig.id,
      template_type: adminConfig.mode === 'fixed' ? 'OPTION_2' : 'OPTION_1',
      field_label: adminConfig.fieldLabel,
      max_inputs: adminConfig.mode === 'variable' ? adminConfig.variable?.maxInputs : null,
      fixed_inputs: adminConfig.mode === 'fixed' ? adminConfig.fixed?.numberOfInputs : null,
      options: options.map((opt, index) => ({
        id: opt.id,
        level4_configuration_id: adminConfig.id,
        label: opt.name,
        value: opt.id,
        display_order: index,
        is_default: index === 0,
        info_url: opt.url || null,
      })),
    };
  }

  /**
   * Get existing BOM Level 4 value if it exists
   */
  static async getBOMLevel4Value(bomItemId: string): Promise<Level4BOMValue | null> {
    try {
      const { data, error } = await supabase
        .from('bom_level4_values')
        .select('*')
        .eq('bom_item_id', bomItemId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          return null; // No existing value
        }
        throw error;
      }

      return data;
    } catch (error) {
      console.error('Level4Service.getBOMLevel4Value error:', error);
      return null;
    }
  }

  /**
   * Save BOM Level 4 configuration value
   */
  static async saveBOMLevel4Value(bomItemId: string, payload: Level4RuntimePayload): Promise<void> {
    try {
      const { error } = await supabase
        .from('bom_level4_values')
        .upsert({
          bom_item_id: bomItemId,
          level4_config_id: payload.configuration_id,
          entries: payload.entries
        });

      if (error) {
        throw error;
      }
    } catch (error) {
      console.error('Level4Service.saveBOMLevel4Value error:', error);
      throw error;
    }
  }

  /**
   * Check if a product has Level 4 configuration
   */
  static async hasLevel4Configuration(level3ProductId: string): Promise<boolean> {
    try {
      const { data, error } = await supabase
        .from('level4_configs')
        .select('id')
        .eq('product_id', level3ProductId)
        .limit(1);

      if (error) {
        console.error('Error checking Level 4 config:', error);
        return false;
      }

      return data && data.length > 0;
    } catch (error) {
      console.error('Level4Service.hasLevel4Configuration error:', error);
      return false;
    }
  }

  /**
   * Save Level 4 configuration (for admin panel)
   */
  static async saveLevel4Configuration(config: Level4Config, productId: string): Promise<Level4Config> {
    try {
      const configToSave = {
        id: config.id,
        product_id: productId,
        field_label: config.fieldLabel,
        mode: config.mode,
        fixed_number_of_inputs: config.fixed?.numberOfInputs,
        variable_max_inputs: config.variable?.maxInputs,
        options: config.options
      };
      
      const { data, error } = await supabase
        .from('level4_configs')
        .upsert(configToSave)
        .select()
        .single();

      if (error) {
        throw error;
      }
      
      return config; // Return the original config
    } catch (error) {
      console.error('Level4Service.saveLevel4Configuration error:', error);
      throw error;
    }
  }

  /**
   * Get Level 3 products with Level 4 configurations (for admin panel)
   */
  static async getLevel3ProductsWithLevel4(): Promise<Level3Product[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('product_level', 3)
        .eq('enabled', true)
        .eq('has_level4', true);

      if (error) {
        throw error;
      }

      return (data as Level3Product[]) || [];
    } catch (error) {
      console.error('Level4Service.getLevel3ProductsWithLevel4 error:', error);
      throw error;
    }
  }
}
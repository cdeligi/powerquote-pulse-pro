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
        if ((error as any)?.code === 'PGRST116') {
          return null; // No configuration found
        }
        throw error;
      }

      if (!data) return null;

      const row = data as Level4ConfigRow;
      console.log('Raw Level 4 config from database:', row);

      const mapped: Level4Config = {
        id: row.id,
        fieldLabel: row.field_label,
        mode: row.mode,
        fixed: row.fixed_number_of_inputs != null ? { numberOfInputs: row.fixed_number_of_inputs } : undefined,
        variable: row.variable_max_inputs != null ? { maxInputs: row.variable_max_inputs } : undefined,
        options: Array.isArray(row.options) ? row.options : [],
      };

      console.log('Mapped Level 4 config:', mapped);
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
        if ((error as any)?.code === 'PGRST116') {
          return null; // No existing value
        }
        throw error;
      }

      return data as Level4BOMValue;
    } catch (error) {
      console.error('Level4Service.getBOMLevel4Value error:', error);
      return null;
    }
  }

  /**
   * Create a BOM item in the database to enable Level 4 configuration
   */
  static async createBOMItemForLevel4Config(bomItem: any, quoteId?: string): Promise<string> {
    try {
      console.log('Creating BOM item for Level 4 config:', bomItem);
      
      // Use a temporary quote ID if none provided
      const tempQuoteId = quoteId || `temp-${crypto.randomUUID()}`;
      
      // Ensure required fields are present
      if (!bomItem.product?.id) {
        throw new Error('Product ID is required for BOM item creation');
      }

      const insertData = {
        quote_id: tempQuoteId,
        product_id: bomItem.product.id,
        name: bomItem.product.name || bomItem.product.displayName || 'Unnamed Product',
        description: bomItem.product.description || '',
        part_number: bomItem.partNumber || bomItem.product.partNumber || '',
        quantity: bomItem.quantity || 1,
        unit_price: bomItem.product.price || 0,
        unit_cost: bomItem.product.cost || 0,
        total_price: (bomItem.product.price || 0) * (bomItem.quantity || 1),
        total_cost: (bomItem.product.cost || 0) * (bomItem.quantity || 1),
        margin: 0,
        original_unit_price: bomItem.product.price || 0,
        approved_unit_price: bomItem.product.price || 0,
        product_type: 'standard',
        configuration_data: bomItem.slot ? { slot: bomItem.slot } : null
      };

      console.log('Inserting BOM item data:', insertData);

      const { data, error } = await supabase
        .from('bom_items')
        .insert(insertData)
        .select('id')
        .single();

      if (error) {
        console.error('Error creating BOM item:', error);
        throw new Error(`Failed to create BOM item: ${error.message}`);
      }

      console.log('BOM item created successfully with ID:', data.id);
      return data.id;
    } catch (error) {
      console.error('Level4Service.createBOMItemForLevel4Config error:', error);
      throw error;
    }
  }

  /**
   * Delete a temporary BOM item (cleanup after cancelled Level 4 configuration)
   */
  static async deleteTempBOMItem(bomItemId: string): Promise<void> {
    try {
      console.log('Deleting temporary BOM item:', bomItemId);
      
      // First delete any Level 4 values
      await supabase
        .from('bom_level4_values')
        .delete()
        .eq('bom_item_id', bomItemId);
      
      // Then delete the BOM item
      const { error } = await supabase
        .from('bom_items')
        .delete()
        .eq('id', bomItemId);

      if (error) {
        console.error('Error deleting temp BOM item:', error);
        throw error;
      }
      
      console.log('Temporary BOM item deleted successfully');
    } catch (error) {
      console.error('Level4Service.deleteTempBOMItem error:', error);
      // Don't throw - cleanup failures shouldn't block the UI
    }
  }

  /**
   * Save BOM Level 4 configuration value
   */
  static async saveBOMLevel4Value(bomItemId: string, payload: Level4RuntimePayload): Promise<void> {
    try {
      console.log('Saving Level 4 BOM value:', { bomItemId, payload });
      
      // First verify the BOM item exists
      const { data: bomItem, error: bomError } = await supabase
        .from('bom_items')
        .select('id')
        .eq('id', bomItemId)
        .single();

      if (bomError) {
        console.error('BOM item not found:', bomError);
        throw new Error(`BOM item with ID ${bomItemId} not found: ${bomError.message}`);
      }

      // Verify the Level 4 config exists
      const { data: configData, error: configError } = await supabase
        .from('level4_configs')
        .select('id')
        .eq('id', payload.level4_config_id)
        .single();

      if (configError) {
        console.error('Level 4 config not found:', configError);
        throw new Error(`Level 4 config with ID ${payload.level4_config_id} not found: ${configError.message}`);
      }

      // Now save the Level 4 value
      const { error } = await supabase
        .from('bom_level4_values')
        .upsert({
          bom_item_id: bomItemId,
          level4_config_id: payload.level4_config_id,
          entries: payload.entries
        });

      if (error) {
        console.error('Error saving Level 4 BOM value:', error);
        throw new Error(`Failed to save Level 4 configuration: ${error.message}`);
      }
      
      console.log('Level 4 BOM value saved successfully');
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

      return !!(data && data.length > 0);
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

      if (error) throw error;
      return config; // return original shape used by admin UI
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

      if (error) throw error;
      return (data as Level3Product[]) || [];
    } catch (error) {
      console.error('Level4Service.getLevel3ProductsWithLevel4 error:', error);
      throw error;
    }
  }
}
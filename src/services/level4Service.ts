import { supabase } from '@/integrations/supabase/client';
import { 
  Level4Configuration, 
  Level4Option, 
  Level4BOMValue, 
  Level4TemplateType,
  Level4RuntimePayload 
} from '@/types/level4';

export class Level4Service {
  // Get Level 4 configuration for a Level 3 product
  static async getLevel4Configuration(level3ProductId: string): Promise<Level4Configuration | null> {
    try {
      const { data: config, error: configError } = await supabase
        .from('level4_configurations')
        .select('*')
        .eq('level3_product_id', level3ProductId)
        .single();

      if (configError || !config) {
        console.log('No Level 4 configuration found:', configError?.message);
        return null;
      }

      // Get the options
      const { data: options, error: optionsError } = await supabase
        .from('level4_dropdown_options')
        .select('*')
        .eq('level4_configuration_id', config.id)
        .order('display_order');

      if (optionsError) {
        console.error('Error loading options:', optionsError);
        return null;
      }

      return {
        ...config,
        options: options || []
      };
    } catch (error) {
      console.error('Error in getLevel4Configuration:', error);
      return null;
    }
  }

  // Get all Level 3 products that have Level 4 enabled
  static async getLevel3ProductsWithLevel4(): Promise<any[]> {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('id, name, parent_product_id, has_level4')
        .eq('product_level', 3)
        .eq('has_level4', true)
        .eq('enabled', true);

      if (error) {
        console.error('Error loading Level 3 products with Level 4:', error);
        return [];
      }

      return data || [];
    } catch (error) {
      console.error('Error in getLevel3ProductsWithLevel4:', error);
      return [];
    }
  }

  // Create or update Level 4 configuration
  static async saveLevel4Configuration(config: Omit<Level4Configuration, 'id' | 'options'> & { id?: string }): Promise<Level4Configuration | null> {
    try {
      if (config.id) {
        // Update existing configuration
        const { data, error } = await supabase
          .from('level4_configurations')
          .update({
            template_type: config.template_type,
            field_label: config.field_label,
            info_url: config.info_url,
            max_inputs: config.max_inputs,
            fixed_inputs: config.fixed_inputs
          })
          .eq('id', config.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating Level 4 configuration:', error);
          return null;
        }

        return { ...data, options: [] };
      } else {
        // Create new configuration
        const { data, error } = await supabase
          .from('level4_configurations')
          .insert({
            level3_product_id: config.level3_product_id,
            template_type: config.template_type,
            field_label: config.field_label,
            info_url: config.info_url,
            max_inputs: config.max_inputs,
            fixed_inputs: config.fixed_inputs
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating Level 4 configuration:', error);
          return null;
        }

        return { ...data, options: [] };
      }
    } catch (error) {
      console.error('Error in saveLevel4Configuration:', error);
      return null;
    }
  }

  // Add or update dropdown option
  static async saveLevel4Option(option: Omit<Level4Option, 'id' | 'created_at' | 'updated_at'> & { id?: string }): Promise<Level4Option | null> {
    try {
      if (option.id) {
        // Update existing option
        const { data, error } = await supabase
          .from('level4_dropdown_options')
          .update({
            label: option.label,
            value: option.value,
            display_order: option.display_order,
            is_default: option.is_default
          })
          .eq('id', option.id)
          .select()
          .single();

        if (error) {
          console.error('Error updating Level 4 option:', error);
          return null;
        }

        return data;
      } else {
        // Create new option
        const { data, error } = await supabase
          .from('level4_dropdown_options')
          .insert({
            level4_configuration_id: option.level4_configuration_id,
            label: option.label,
            value: option.value,
            display_order: option.display_order,
            is_default: option.is_default
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating Level 4 option:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
      console.error('Error in saveLevel4Option:', error);
      return null;
    }
  }

  // Delete dropdown option
  static async deleteLevel4Option(optionId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('level4_dropdown_options')
        .delete()
        .eq('id', optionId);

      if (error) {
        console.error('Error deleting Level 4 option:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteLevel4Option:', error);
      return false;
    }
  }

  // Save BOM Level 4 value (user selections)
  static async saveBOMLevel4Value(bomItemId: string, payload: Level4RuntimePayload): Promise<Level4BOMValue | null> {
    try {
      // First check if a value already exists for this BOM item
      const { data: existing, error: checkError } = await supabase
        .from('bom_level4_values')
        .select('id')
        .eq('bom_item_id', bomItemId)
        .single();

      if (existing) {
        // Update existing value
        const { data, error } = await supabase
          .from('bom_level4_values')
          .update({
            level4_configuration_id: payload.configuration_id,
            template_type: payload.template_type,
            entries: payload.entries
          })
          .eq('bom_item_id', bomItemId)
          .select()
          .single();

        if (error) {
          console.error('Error updating BOM Level 4 value:', error);
          return null;
        }

        return data;
      } else {
        // Create new value
        const { data, error } = await supabase
          .from('bom_level4_values')
          .insert({
            bom_item_id: bomItemId,
            level4_configuration_id: payload.configuration_id,
            template_type: payload.template_type,
            entries: payload.entries
          })
          .select()
          .single();

        if (error) {
          console.error('Error creating BOM Level 4 value:', error);
          return null;
        }

        return data;
      }
    } catch (error) {
      console.error('Error in saveBOMLevel4Value:', error);
      return null;
    }
  }

  // Get BOM Level 4 value
  static async getBOMLevel4Value(bomItemId: string): Promise<Level4BOMValue | null> {
    try {
      const { data, error } = await supabase
        .from('bom_level4_values')
        .select('*')
        .eq('bom_item_id', bomItemId)
        .single();

      if (error) {
        if (error.code === 'PGRST116') {
          // No rows found - this is normal
          return null;
        }
        console.error('Error getting BOM Level 4 value:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in getBOMLevel4Value:', error);
      return null;
    }
  }

  // Delete BOM Level 4 value
  static async deleteBOMLevel4Value(bomItemId: string): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('bom_level4_values')
        .delete()
        .eq('bom_item_id', bomItemId);

      if (error) {
        console.error('Error deleting BOM Level 4 value:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in deleteBOMLevel4Value:', error);
      return false;
    }
  }

  // Helper function to format Level 4 display
  static formatLevel4Display(value: Level4BOMValue, config: Level4Configuration): string[] {
    try {
      return value.entries.map((entry, index) => {
        const option = config.options.find(opt => opt.value === entry.value);
        const rowNumber = config.template_type === 'OPTION_1' ? ` #${index + 1}` : ` ${index + 1}`;
        return `${config.field_label}${rowNumber}: ${option?.label || entry.value}`;
      });
    } catch (error) {
      console.error('Error formatting Level 4 display:', error);
      return ['Level 4 configuration error'];
    }
  }
}
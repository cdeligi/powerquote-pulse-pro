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
      console.log('Level4Service: Fetching Level 3 products with Level 4...');
      
      // Get products with Level 4 flags set
      const { data: flaggedProducts, error: flagError } = await supabase
        .from('products')
        .select('id, name, parent_product_id, has_level4, requires_level4_config, enabled')
        .eq('product_level', 3)
        .or('has_level4.eq.true,requires_level4_config.eq.true');

      if (flagError) {
        console.error('Error loading flagged Level 3 products:', flagError);
        return [];
      }

      console.log('Level4Service: Found flagged products:', flaggedProducts?.length || 0, flaggedProducts);

      // Get product IDs that have level4_configurations
      const { data: configIds, error: configIdsError } = await supabase
        .from('level4_configurations')
        .select('level3_product_id');

      if (configIdsError) {
        console.error('Error loading configuration IDs:', configIdsError);
      }

      const configuredProductIds = configIds?.map(c => c.level3_product_id) || [];
      console.log('Level4Service: Found configured product IDs:', configuredProductIds);

      // Get products that have configurations, even if flags are not set
      let configuredProducts: any[] = [];
      if (configuredProductIds.length > 0) {
        const { data: products, error: configError } = await supabase
          .from('products')
          .select('id, name, parent_product_id, has_level4, requires_level4_config, enabled')
          .eq('product_level', 3)
          .in('id', configuredProductIds);

        if (configError) {
          console.error('Error loading configured Level 3 products:', configError);
        } else {
          configuredProducts = products || [];
        }
      }

      console.log('Level4Service: Found configured products:', configuredProducts.length, configuredProducts);

      // Merge and deduplicate products
      const allProducts = [...(flaggedProducts || [])];
      configuredProducts.forEach(product => {
        if (!allProducts.find(p => p.id === product.id)) {
          allProducts.push(product);
        }
      });

      console.log('Level4Service: Total unique products:', allProducts.length, allProducts);
      return allProducts;
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
      if (!value || !value.entries || !config) {
        return ['Level 4 configuration error'];
      }

      return value.entries.map((entry, index) => {
        const option = config.options.find(opt => opt.value === entry.value);
        const label = option?.label || entry.value;
        
        // Format based on template type
        if (config.template_type === 'OPTION_1') {
          // Variable inputs: show entry number
          return `${config.field_label} #${index + 1}: ${label}`;
        } else {
          // Fixed inputs: just show position number
          return `${config.field_label} ${index + 1}: ${label}`;
        }
      });
    } catch (error) {
      console.error('Error formatting Level 4 display:', error);
      return ['Level 4 configuration error'];
    }
  }

  // Get formatted summary for BOM display
  static getLevel4Summary(value: Level4BOMValue, config?: Level4Configuration): string {
    try {
      if (!value || !value.entries || value.entries.length === 0) {
        return 'No Level 4 configuration';
      }

      const count = value.entries.length;
      const hasMultiple = count > 1;
      
      if (config) {
        const templateType = config.template_type === 'OPTION_1' ? 'Variable' : 'Fixed';
        return `L4: ${count} ${config.field_label.toLowerCase()}${hasMultiple ? 's' : ''} (${templateType})`;
      }
      
      return `L4: ${count} selection${hasMultiple ? 's' : ''}`;
    } catch (error) {
      console.error('Error generating Level 4 summary:', error);
      return 'L4: Error';
    }
  }

  // Validate Level 4 configuration completeness
  static validateLevel4Configuration(value: Level4BOMValue, config: Level4Configuration): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!value || !value.entries) {
      errors.push('No Level 4 selections found');
      return { isValid: false, errors };
    }

    if (config.template_type === 'OPTION_1') {
      const maxInputs = config.max_inputs || 1;
      if (value.entries.length > maxInputs) {
        errors.push(`Too many selections: ${value.entries.length}/${maxInputs}`);
      }
      if (value.entries.length === 0) {
        errors.push('At least one selection is required');
      }
    } else if (config.template_type === 'OPTION_2') {
      const requiredInputs = config.fixed_inputs || 1;
      if (value.entries.length !== requiredInputs) {
        errors.push(`Incorrect number of selections: ${value.entries.length}/${requiredInputs}`);
      }
    }

    // Check all entries have valid values
    value.entries.forEach((entry, index) => {
      if (!entry.value) {
        errors.push(`Selection ${index + 1} is empty`);
      } else {
        const isValidOption = config.options.some(opt => opt.value === entry.value);
        if (!isValidOption) {
          errors.push(`Selection ${index + 1} has invalid option: ${entry.value}`);
        }
      }
    });

    return { isValid: errors.length === 0, errors };
  }
}
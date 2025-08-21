
import { supabase } from '@/integrations/supabase/client';
import { Level4Configuration, Level4SharedOption, Level4ConfigurationField } from '@/types/level4';

export class Level4Service {
  static async getLevel4Configuration(level3ProductId: string): Promise<Level4Configuration | null> {
    console.log('Loading Level 4 configuration for product:', level3ProductId);
    
    try {
      // Get the configuration
      const { data: config, error: configError } = await supabase
        .from('level4_configurations')
        .select('*')
        .eq('level3_product_id', level3ProductId)
        .single();

      if (configError || !config) {
        console.log('No Level 4 configuration found:', configError?.message);
        return null;
      }

      // Get the fields
      const { data: fields, error: fieldsError } = await supabase
        .from('level4_configuration_fields')
        .select('*')
        .eq('level4_configuration_id', config.id)
        .order('display_order');

      if (fieldsError) {
        console.error('Error loading fields:', fieldsError);
        return null;
      }

      // Get shared options
      const { data: sharedOptions, error: optionsError } = await supabase
        .from('level4_shared_options')
        .select('*')
        .eq('level4_configuration_id', config.id)
        .order('display_order');

      if (optionsError) {
        console.error('Error loading shared options:', optionsError);
        return null;
      }

      return {
        id: config.id,
        level3_product_id: config.level3_product_id,
        name: config.name,
        fields: fields || [],
        shared_options: sharedOptions || [],
        default_option_id: config.default_option_id
      };
    } catch (error) {
      console.error('Error in getLevel4Configuration:', error);
      return null;
    }
  }

  static async addSharedOption(configurationId: string, label: string, value: string): Promise<Level4SharedOption | null> {
    try {
      const { data, error } = await supabase
        .from('level4_shared_options')
        .insert({
          level4_configuration_id: configurationId,
          label,
          value,
          display_order: 0
        })
        .select()
        .single();

      if (error) {
        console.error('Error adding shared option:', error);
        return null;
      }

      return data;
    } catch (error) {
      console.error('Error in addSharedOption:', error);
      return null;
    }
  }

  static async updateDefaultOption(configurationId: string, optionId: string | null): Promise<boolean> {
    try {
      const { error } = await supabase
        .from('level4_configurations')
        .update({ default_option_id: optionId })
        .eq('id', configurationId);

      if (error) {
        console.error('Error updating default option:', error);
        return false;
      }

      return true;
    } catch (error) {
      console.error('Error in updateDefaultOption:', error);
      return false;
    }
  }
}

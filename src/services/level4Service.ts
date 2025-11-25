import { getSupabaseClient } from '@/integrations/supabase/client';
import type { Level4Configuration, Level4BOMValue, Level4RuntimePayload } from '@/types/level4';
import type { Level4Config, DropdownOption } from '@/components/level4/Level4ConfigTypes';
import type { Level3Product } from '@/types/product/interfaces';
import type { BOMItem } from '@/types/product';

interface Level4ConfigRow {
  id: string;
  product_id: string;
  field_label: string;
  mode: 'fixed' | 'variable';
  fixed_number_of_inputs?: number | null;
  variable_max_inputs?: number | null;
  options: DropdownOption[];
}

interface Level4SaveOptions {
  bomItemData?: (BOMItem & { tempQuoteId?: string });
}

const TEMPORARY_QUOTE_STATUS: 'draft' | 'pending_approval' = 'draft';

export class Level4Service {
  // Track active Level 4 sessions to prevent premature cleanup
  private static activeSessions = new Map<string, { timestamp: number; bomItemId: string }>();
  
  /**
   * Register an active Level 4 session to prevent cleanup
   */
  static registerActiveSession(bomItemId: string): void {
    console.log('Registering active Level 4 session for BOM item:', bomItemId);
    this.activeSessions.set(bomItemId, { 
      timestamp: Date.now(), 
      bomItemId 
    });
  }
  
  /**
   * Unregister an active Level 4 session
   */
  static unregisterActiveSession(bomItemId: string): void {
    console.log('Unregistering active Level 4 session for BOM item:', bomItemId);
    this.activeSessions.delete(bomItemId);
  }
  
  /**
   * Check if a BOM item has an active Level 4 session
   */
  static hasActiveSession(bomItemId: string): boolean {
    const session = this.activeSessions.get(bomItemId);
    if (!session) return false;
    
    // Consider sessions older than 30 minutes as stale
    const thirtyMinutesAgo = Date.now() - (30 * 60 * 1000);
    if (session.timestamp < thirtyMinutesAgo) {
      this.activeSessions.delete(bomItemId);
      return false;
    }
    
    return true;
  }

  /**
   * Fetch Level 4 configuration for a product from the admin configs table
   */
  static async getLevel4Configuration(level3ProductId: string): Promise<Level4Config | null> {
    try {
      const supabase = getSupabaseClient();
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
      const supabase = getSupabaseClient();
      console.log('Fetching existing Level 4 value for BOM item:', bomItemId);
      
      const { data, error } = await supabase
        .from('bom_level4_values')
        .select('*')
        .eq('bom_item_id', bomItemId)
        .single();

      if (error) {
        if ((error as any)?.code === 'PGRST116') {
          console.log('No existing Level 4 value found for BOM item:', bomItemId);
          return null; // No existing value
        }
        console.error('Error fetching Level 4 value:', error);
        throw error;
      }

      console.log('Found existing Level 4 value:', data);
      return data as Level4BOMValue;
    } catch (error) {
      console.error('Level4Service.getBOMLevel4Value error:', error);
      return null;
    }
  }

  /**
   * Find existing Level 4 configuration by Level 3 product and slot (for slot-based configurations)
   */
  static async findExistingLevel4ConfigByProduct(level3ProductId: string, slot?: number): Promise<Level4BOMValue | null> {
    try {
      const supabase = getSupabaseClient();
      console.log('Searching for existing Level 4 config by product:', { level3ProductId, slot });
      
      // Query BOM items with Level 4 values for this product
      const query = supabase
        .from('bom_items')
        .select(`
          id,
          configuration_data,
          bom_level4_values (*)
        `)
        .eq('product_id', level3ProductId)
        .not('bom_level4_values', 'is', null);

      const { data, error } = await query;

      if (error) {
        console.error('Error searching for existing Level 4 config:', error);
        return null;
      }

      if (!data || data.length === 0) {
        console.log('No existing Level 4 configurations found for product:', level3ProductId);
        return null;
      }

      // If slot is specified, try to find a configuration for that specific slot
      if (slot !== undefined) {
        const slotMatch = data.find(item => {
          const configData = item.configuration_data as any;
          return configData?.slot === slot && item.bom_level4_values?.length > 0;
        });
        
        if (slotMatch && slotMatch.bom_level4_values?.[0]) {
          console.log('Found existing Level 4 config for slot:', slot, slotMatch.bom_level4_values[0]);
          return slotMatch.bom_level4_values[0] as Level4BOMValue;
        }
      }

      // Return the first available configuration if no slot-specific match
      const firstConfig = data.find(item => item.bom_level4_values?.length > 0);
      if (firstConfig && firstConfig.bom_level4_values?.[0]) {
        console.log('Found existing Level 4 config (fallback):', firstConfig.bom_level4_values[0]);
        return firstConfig.bom_level4_values[0] as Level4BOMValue;
      }

      return null;
    } catch (error) {
      console.error('Level4Service.findExistingLevel4ConfigByProduct error:', error);
      return null;
    }
  }

  /**
   * Create a temporary quote to enable Level 4 configuration
   */
  static async createTemporaryQuote(userId?: string): Promise<string> {
    try {
      const supabase = getSupabaseClient();

      let authenticatedUserId = userId;

      if (!authenticatedUserId) {
        // Check if user is authenticated
        const { data: { user }, error: authError } = await supabase.auth.getUser();

        if (authError) {
          console.error('Authentication error:', authError);
        }

        authenticatedUserId = user?.id;
      }

      if (!authenticatedUserId) {
        throw new Error('User must be authenticated to create temporary quote');
      }

      console.log('Creating temporary quote for user:', authenticatedUserId);

      const tempQuoteId = `TEMP-L4-${crypto.randomUUID()}`;

      const tempQuoteData = {
        id: tempQuoteId,
        user_id: authenticatedUserId, // Critical: Set the user_id field
        customer_name: 'Temporary Level 4 Configuration',
        oracle_customer_id: 'TEMP',
        sfdc_opportunity: 'TEMP',
        status: TEMPORARY_QUOTE_STATUS,
        original_quote_value: 0,
        requested_discount: 0,
        discounted_value: 0,
        total_cost: 0,
        original_margin: 0,
        discounted_margin: 0,
        gross_profit: 0,
        priority: 'Medium',
        payment_terms: 'TBD',
        shipping_terms: 'TBD',
        currency: 'USD',
        is_rep_involved: false
      };

      console.log('Creating temporary quote data:', tempQuoteData);

      const { error } = await supabase
        .from('quotes')
        .insert(tempQuoteData);

      if (error) {
        console.error('Error creating temporary quote:', error);
        throw new Error(`Failed to create temporary quote: ${error.message}`);
      }

      console.log('Temporary quote created successfully with ID:', tempQuoteId);
      return tempQuoteId;
    } catch (error) {
      console.error('Level4Service.createTemporaryQuote error:', error);
      throw error;
    }
  }

  /**
   * Delete a temporary quote and all associated BOM items
   */
  static async deleteTemporaryQuote(quoteId: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      console.log('Deleting temporary quote and associated data:', quoteId);
      
      // First delete any Level 4 values for BOM items in this quote
      const { data: bomItemIds } = await supabase
        .from('bom_items')
        .select('id')
        .eq('quote_id', quoteId);

      if (bomItemIds && bomItemIds.length > 0) {
        const ids = bomItemIds.map(item => item.id);
        await supabase
          .from('bom_level4_values')
          .delete()
          .in('bom_item_id', ids);
      }
      
      // Then delete BOM items
      await supabase
        .from('bom_items')
        .delete()
        .eq('quote_id', quoteId);
      
      // Finally delete the quote
      const { error } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId);

      if (error) {
        console.error('Error deleting temporary quote:', error);
        // Don't throw - cleanup failures shouldn't block the UI
      } else {
        console.log('Temporary quote deleted successfully');
      }
    } catch (error) {
      console.error('Level4Service.deleteTemporaryQuote error:', error);
      // Don't throw - cleanup failures shouldn't block the UI
    }
  }

  /**
   * Create a BOM item in the database to enable Level 4 configuration
   */
  static async createBOMItemForLevel4Config(bomItem: any, userId?: string): Promise<{ bomItemId: string; tempQuoteId: string }> {
    try {
      console.log('Creating BOM item for Level 4 config:', bomItem);

      // Ensure required fields are present
      if (!bomItem.product?.id) {
        throw new Error('Product ID is required for BOM item creation');
      }

      // Create temporary quote first (authentication is handled internally)
      const tempQuoteId = await this.createTemporaryQuote(userId);

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

      const { data, error } = await getSupabaseClient()
        .from('bom_items')
        .insert(insertData)
        .select('id')
        .single();

      if (error) {
        console.error('Error creating BOM item:', error);
        // Clean up the temporary quote on failure
        await this.deleteTemporaryQuote(tempQuoteId);
        throw new Error(`Failed to create BOM item: ${error.message}`);
      }

      console.log('BOM item created successfully with ID:', data.id);
      return { bomItemId: data.id, tempQuoteId };
    } catch (error) {
      console.error('Level4Service.createBOMItemForLevel4Config error:', error);
      throw error;
    }
  }

  /**
   * Delete a temporary BOM item and its quote if it's temporary (with session protection)
   */
  static async deleteTempBOMItem(bomItemId: string, force: boolean = false): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      // Check if there's an active Level 4 session for this BOM item
      if (!force && this.hasActiveSession(bomItemId)) {
        console.log('Skipping cleanup for BOM item with active Level 4 session:', bomItemId);
        return;
      }
      
      console.log('Deleting temporary BOM item:', bomItemId);
      
      // Get the BOM item to check if it's part of a temporary quote
      const { data: bomItem, error: bomError } = await supabase
        .from('bom_items')
        .select('quote_id')
        .eq('id', bomItemId)
        .single();

      if (bomError) {
        console.error('Error fetching BOM item for cleanup:', bomError);
        return;
      }

      // If this is a temporary quote, delete the entire quote (which will cascade)
      if (bomItem.quote_id.startsWith('TEMP-L4-')) {
        await this.deleteTemporaryQuote(bomItem.quote_id);
      } else {
        // Otherwise, just delete the BOM item and its Level 4 values
        await getSupabaseClient()
          .from('bom_level4_values')
          .delete()
          .eq('bom_item_id', bomItemId);
        
        const { error } = await getSupabaseClient()
          .from('bom_items')
          .delete()
          .eq('id', bomItemId);

        if (error) {
          console.error('Error deleting temp BOM item:', error);
        } else {
          console.log('Temporary BOM item deleted successfully');
        }
      }
      
      // Unregister the session after successful cleanup
      this.unregisterActiveSession(bomItemId);
    } catch (error) {
      console.error('Level4Service.deleteTempBOMItem error:', error);
      // Don't throw - cleanup failures shouldn't block the UI
    }
  }

  /**
   * Validate BOM item exists and user has access
   */
  static async validateBOMItemAccess(bomItemId: string): Promise<{ exists: boolean; accessible: boolean; quote_id?: string }> {
    try {
      const supabase = getSupabaseClient();
      
      // Check if BOM item exists and get quote info
      const { data: bomItem, error: bomError } = await supabase
        .from('bom_items')
        .select('id, quote_id, product_id, name')
        .eq('id', bomItemId)
        .maybeSingle();

      if (bomError) {
        console.error('Error checking BOM item:', bomError);
        return { exists: false, accessible: false };
      }

      if (!bomItem) {
        console.warn('BOM item not found:', bomItemId);
        return { exists: false, accessible: false };
      }

      // Check if quote exists and user has access
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('id, user_id, status')
        .eq('id', bomItem.quote_id)
        .maybeSingle();

      if (quoteError) {
        console.error('Error checking quote access:', quoteError);
        return { exists: true, accessible: false, quote_id: bomItem.quote_id };
      }

      if (!quote) {
        console.warn('Associated quote not found:', bomItem.quote_id);
        return { exists: true, accessible: false, quote_id: bomItem.quote_id };
      }

      if (bomItem.quote_id.startsWith('TEMP-L4-') && quote.status !== TEMPORARY_QUOTE_STATUS) {
        console.warn('Temporary Level 4 quote has unexpected status:', {
          quoteId: bomItem.quote_id,
          expectedStatus: TEMPORARY_QUOTE_STATUS,
          actualStatus: quote.status
        });
      }

      console.log('BOM item validation successful:', { bomItemId, quote_id: bomItem.quote_id, status: quote.status });
      return { exists: true, accessible: true, quote_id: bomItem.quote_id };
    } catch (error) {
      console.error('Error validating BOM item access:', error);
      return { exists: false, accessible: false };
    }
  }

  /**
   * Delete a Level 4 configuration
   */
  static async deleteLevel4Config(configId: string): Promise<void> {
    try {
      const supabase = getSupabaseClient();
      
      const { error } = await supabase
        .from('level4_configs')
        .delete()
        .eq('id', configId);

      if (error) {
        throw error;
      }
      
      console.log('Level 4 config deleted successfully:', configId);
    } catch (error) {
      console.error('Error deleting Level 4 config:', error);
      throw error;
    }
  }


  /**
   * Save BOM Level 4 configuration value with robust validation and session management
   */
  static async saveBOMLevel4Value(
    bomItemId: string,
    payload: Level4RuntimePayload,
    options?: Level4SaveOptions
  ): Promise<{ bomItemId: string; tempQuoteId?: string }> {
    console.log('Saving Level 4 BOM value:', { bomItemId, payload, options });

    let activeBomItemId = bomItemId;
    let activeTempQuoteId = options?.bomItemData?.tempQuoteId;
    let bomItemSnapshot = options?.bomItemData ? { ...options.bomItemData } : undefined;

    // Ensure the session is registered to prevent cleanup during save
    this.registerActiveSession(activeBomItemId);

    const recreateBomItem = async (errorMessage: string) => {
      if (!bomItemSnapshot) {
        throw new Error(errorMessage);
      }

      try {
        console.warn(`Attempting to recreate BOM item ${activeBomItemId} for Level 4 save...`);
        this.unregisterActiveSession(activeBomItemId);

        const { bomItemId: newBomItemId, tempQuoteId } = await this.createBOMItemForLevel4Config(bomItemSnapshot);
        activeBomItemId = newBomItemId;
        activeTempQuoteId = tempQuoteId;
        bomItemSnapshot = { ...bomItemSnapshot, id: newBomItemId, tempQuoteId };

        this.registerActiveSession(activeBomItemId);
        return true;
      } catch (creationError) {
        console.error('Failed to recreate BOM item for Level 4 save:', creationError);
        throw new Error('Your configuration session has expired and could not be restored. Please close and restart the Level 4 configuration.');
      }
    };

    try {
      // Enhanced validation with multiple checks
      let validation = await this.validateBOMItemAccess(activeBomItemId);
      if (!validation.exists) {
        await recreateBomItem(`BOM item ${activeBomItemId} not found. Your session has expired. Please close and reopen the Level 4 configuration.`);
        validation = await this.validateBOMItemAccess(activeBomItemId);
      }

      if (!validation.exists) {
        throw new Error(`BOM item ${activeBomItemId} is unavailable. Please close and restart the Level 4 configuration.`);
      }

      if (!validation.accessible) {
        throw new Error(`Access denied to BOM item ${activeBomItemId}. Please check your permissions.`);
      }

      console.log('BOM item validation passed, proceeding with save...');

      const maxRetries = 3;
      let lastError: any = null;

      for (let attempt = 1; attempt <= maxRetries; attempt++) {
        try {
          console.log(`Save attempt ${attempt}/${maxRetries} for BOM item ${activeBomItemId}`);

          // Double-check item still exists right before save
          const preFlightCheck = await getSupabaseClient()
            .from('bom_items')
            .select('id, quote_id')
            .eq('id', activeBomItemId)
            .maybeSingle();

          if (preFlightCheck.error || !preFlightCheck.data) {
            await recreateBomItem(`BOM item ${activeBomItemId} became unavailable during configuration. Your session may have expired.`);
            attempt = 0; // Restart attempts after recreation
            continue;
          }

          // Perform the save within a transaction-like approach
          const { error } = await getSupabaseClient()
            .from('bom_level4_values')
            .upsert({
              bom_item_id: activeBomItemId,
              level4_config_id: payload.level4_config_id,
              entries: payload.entries
            });

          if (error) {
            console.error(`Error saving Level 4 BOM value (attempt ${attempt}):`, error);
            lastError = error;

            // Enhanced error handling for different scenarios
            if (error.code === '23503') {
              if (error.message.includes('bom_items')) {
                await recreateBomItem('Your configuration session has expired. Please close this dialog and start over.');
                attempt = 0; // Restart attempts after recreation
                continue;
              } else if (error.message.includes('level4_configs')) {
                throw new Error('Level 4 configuration is invalid. Please contact support.');
              }
            }

            // For other errors, retry with exponential backoff
            if (attempt < maxRetries) {
              console.log(`Retrying in ${1000 * attempt}ms...`);
              await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
              continue;
            }

            throw error;
          }

          console.log(`Successfully saved Level 4 BOM value on attempt ${attempt}`);
          return { bomItemId: activeBomItemId, tempQuoteId: activeTempQuoteId };

        } catch (error) {
          console.error(`Level4Service.saveBOMLevel4Value error (attempt ${attempt}):`, error);
          lastError = error;

          if (attempt === maxRetries) {
            throw error;
          }

          // Exponential backoff for retries
          await new Promise(resolve => setTimeout(resolve, 1000 * attempt));
        }
      }

      throw lastError;

    } finally {
      const itemIdForCleanup = activeBomItemId;
      // Keep the session active for a short time after save to prevent immediate cleanup
      setTimeout(() => {
        this.unregisterActiveSession(itemIdForCleanup);
      }, 5000); // 5 second grace period
    }
  }

  /**
   * Validate Level 4 entries
   */
  static validateEntries(entries: any[], configuration: Level4Configuration): { isValid: boolean; errors: string[] } {
    const errors: string[] = [];
    
    if (!entries || entries.length === 0) {
      errors.push('No entries provided');
      return { isValid: false, errors };
    }
    
    // Check if all entries have valid values
    for (const entry of entries) {
      if (!entry.value || entry.value.trim() === '') {
        errors.push(`Entry at index ${entry.index} is missing a value`);
      }
      
      // Check if the value exists in the configuration options
      const validOption = configuration.options.find(opt => opt.value === entry.value);
      if (!validOption) {
        errors.push(`Invalid option selected at index ${entry.index}: ${entry.value}`);
      }
    }
    
    return { isValid: errors.length === 0, errors };
  }

  /**
   * Check if a product has Level 4 configuration
   */
  static async hasLevel4Configuration(level3ProductId: string): Promise<boolean> {
    try {
      const supabase = getSupabaseClient();
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
      
      const { data, error } = await getSupabaseClient()
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
      const supabase = getSupabaseClient();
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
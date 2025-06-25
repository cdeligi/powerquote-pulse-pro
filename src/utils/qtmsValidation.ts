
import { BOMItem } from '@/types/product';
import { supabase } from '@/integrations/supabase/client';
import { QTMSConfiguration } from './qtmsConsolidation';

export interface ComponentValidationResult {
  isValid: boolean;
  missingComponents: string[];
  validatedComponents: string[];
}

export const extractQTMSComponents = (bomItem: BOMItem): string[] => {
  if (bomItem.product.type !== 'QTMS' || !bomItem.configuration) {
    return [];
  }

  const config = bomItem.configuration as QTMSConfiguration;
  const components: string[] = [];

  // Add chassis
  if (config.chassis) {
    components.push(config.chassis.id);
  }

  // Add all cards from slot assignments
  if (config.slotAssignments) {
    Object.values(config.slotAssignments).forEach(card => {
      if (card && card.id) {
        components.push(card.id);
      }
    });
  }

  return [...new Set(components)]; // Remove duplicates
};

export const validateQTMSComponents = async (componentIds: string[]): Promise<ComponentValidationResult> => {
  console.log('Validating QTMS components:', componentIds);
  
  if (componentIds.length === 0) {
    return {
      isValid: true,
      missingComponents: [],
      validatedComponents: []
    };
  }

  // Check if components exist in database
  const { data: products, error } = await supabase
    .from('products')
    .select('id')
    .in('id', componentIds);

  if (error) {
    console.error('Error validating QTMS components:', error);
    throw new Error(`Failed to validate QTMS components: ${error.message}`);
  }

  const existingComponentIds = new Set(products?.map(p => p.id) || []);
  const missingComponents = componentIds.filter(id => !existingComponentIds.has(id));
  const validatedComponents = componentIds.filter(id => existingComponentIds.has(id));

  console.log('QTMS component validation result:', {
    existingComponents: validatedComponents,
    missingComponents
  });

  return {
    isValid: missingComponents.length === 0,
    missingComponents,
    validatedComponents
  };
};

export const isQTMSConfiguration = (bomItem: BOMItem): boolean => {
  return bomItem.product.type === 'QTMS' && bomItem.product.id.startsWith('qtms-');
};

export const isDynamicProduct = (bomItem: BOMItem): boolean => {
  return isQTMSConfiguration(bomItem) || 
         (bomItem.product.id.includes('-') && Boolean(bomItem.product.id.match(/\d{13}/)));
};

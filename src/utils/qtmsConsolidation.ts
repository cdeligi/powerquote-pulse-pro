
import { BOMItem, Level1Product, Level2Product, Level3Product, Level3Customization } from '@/types/product';
import { generateQTMSPartNumber } from '@/types/product/part-number-utils';

export interface QTMSConfiguration {
  chassis: Level2Product;
  slotAssignments: Record<number, Level3Product>;
  hasRemoteDisplay: boolean;
  analogConfigurations?: Record<string, any>;
  bushingConfigurations?: Record<string, any>;
}

export interface ConsolidatedQTMS {
  id: string;
  name: string;
  description: string;
  partNumber: string;
  price: number;
  configuration: QTMSConfiguration;
  components: BOMItem[];
}

export const consolidateQTMSConfiguration = (
  consolidatedConfig: ConsolidatedQTMS
): ConsolidatedQTMS => {
  // Return the same configuration - this function is for consistency
  return consolidatedConfig;
};

export const createQTMSBOMItem = (
  consolidatedConfig: ConsolidatedQTMS
): BOMItem => {
  return {
    id: consolidatedConfig.id,
    product: {
      id: consolidatedConfig.id,
      name: consolidatedConfig.name,
      type: 'QTMS',
      description: consolidatedConfig.description,
      price: consolidatedConfig.price,
      enabled: true,
      partNumber: consolidatedConfig.partNumber
    } as any,
    quantity: 1,
    enabled: true,
    configuration: consolidatedConfig.configuration,
    partNumber: consolidatedConfig.partNumber
  };
};

// Update existing QTMS configuration with new data
export const updateQTMSConfiguration = (
  existingQTMS: ConsolidatedQTMS,
  newSlotAssignments: Record<number, Level3Product>,
  newHasRemoteDisplay: boolean,
  analogConfigurations?: Record<string, any>,
  bushingConfigurations?: Record<string, any>
): ConsolidatedQTMS => {
  return {
    ...existingQTMS,
    configuration: {
      ...existingQTMS.configuration,
      slotAssignments: newSlotAssignments,
      hasRemoteDisplay: newHasRemoteDisplay,
      analogConfigurations,
      bushingConfigurations
    }
  };
};

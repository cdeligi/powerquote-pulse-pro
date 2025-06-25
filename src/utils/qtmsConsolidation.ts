
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
  level1ProductId: string,
  level2ProductId: string,
  level3ProductId: string,
  customizations: Level3Customization[]
): ConsolidatedQTMS => {
  // Create a mock consolidated QTMS configuration
  // This would normally fetch actual products from the service
  const chassis = {
    id: level2ProductId,
    name: 'QTMS Chassis',
    parentProductId: level1ProductId,
    type: 'LTX',
    description: 'QTMS Chassis Configuration',
    price: 5000,
    enabled: true
  } as Level2Product;

  const components: BOMItem[] = [{
    id: `${Date.now()}-chassis`,
    product: chassis,
    quantity: 1,
    enabled: true,
    partNumber: chassis.partNumber
  }];

  const totalPrice = components.reduce((sum, item) => sum + (item.product.price || 0), 0);

  const configuration: QTMSConfiguration = {
    chassis,
    slotAssignments: {},
    hasRemoteDisplay: false
  };

  return {
    id: `qtms-${Date.now()}`,
    name: `QTMS Configuration`,
    description: 'QTMS Configuration',
    partNumber: `QTMS-${Date.now()}`,
    price: totalPrice,
    configuration,
    components
  };
};

export const createQTMSBOMItem = (
  level1Product: Level1Product,
  level2Product: Level2Product,
  level3Product: Level3Product,
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
  return consolidateQTMSConfiguration(
    'level1',
    existingQTMS.configuration.chassis.id,
    'level3',
    []
  );
};

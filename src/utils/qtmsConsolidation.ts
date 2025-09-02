import { BOMItem, Level2Product, Level3Product } from '@/types/product';
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
  cost: number; // Add cost here
  configuration: QTMSConfiguration;
  components: BOMItem[];
}

export const consolidateQTMSConfiguration = (
  chassis: Level2Product,
  slotAssignments: Record<number, Level3Product>,
  hasRemoteDisplay: boolean,
  remoteDisplayProduct: Level3Product | null, // Add this parameter
  analogConfigurations?: Record<string, any>,
  bushingConfigurations?: Record<string, any>
): ConsolidatedQTMS => {
  // Create component BOM items
  const chassisItem: BOMItem = {
    id: `${Date.now()}-chassis`,
    product: chassis,
    quantity: 1,
    enabled: true,
    partNumber: chassis.partNumber,
    displayName: chassis.displayName || chassis.name
  };

  const cardItems: BOMItem[] = Object.entries(slotAssignments).map(([slot, card]) => ({
    id: `${Date.now()}-card-${slot}`,
    product: {
      ...card,
      displayName: card.displayName || card.name // Ensure displayName is included
    },
    quantity: 1,
    enabled: true,
    slot: parseInt(slot),
    partNumber: card.partNumber,
    displayName: card.displayName || card.name // Include displayName in the BOM item
  }));

  const components = [chassisItem, ...cardItems];

  // Add remote display if selected
  if (hasRemoteDisplay && remoteDisplayProduct) { // Add remoteDisplayProduct check
    const remoteDisplayItem: BOMItem = {
      id: `${Date.now()}-remote-display`,
      product: {
        id: remoteDisplayProduct.id, // Use product ID
        name: remoteDisplayProduct.name, // Use product name
        type: remoteDisplayProduct.type || 'accessory', // Use product type
        description: remoteDisplayProduct.description || `Remote display for QTMS chassis`, // Use product description
        price: remoteDisplayProduct.price || 0, // Use product price
        cost: remoteDisplayProduct.cost || 0, // Use product cost
        enabled: remoteDisplayProduct.enabled,
        partNumber: remoteDisplayProduct.partNumber || 'QTMS-RD-001' // Use product part number
      } as any,
      quantity: 1,
      enabled: true,
      partNumber: remoteDisplayProduct.partNumber || 'QTMS-RD-001'
    };
    components.push(remoteDisplayItem);
  }

  // Calculate total price and cost
  const totalPrice = components.reduce((sum, item) => sum + (item.product.price || 0), 0);
  const totalCost = components.reduce((sum, item) => sum + (item.product.cost || 0), 0); // Add this line

  // Generate consolidated part number
  const partNumber = generateQTMSPartNumber(
    chassis as any,
    Object.values(slotAssignments) as any[],
    hasRemoteDisplay,
    slotAssignments as any,
    analogConfigurations,
    bushingConfigurations
  );

  // Create description
  const cardCount = Object.keys(slotAssignments).length;
  const description = `${chassis.name} with ${cardCount} card${cardCount !== 1 ? 's' : ''}${hasRemoteDisplay ? ' and Remote Display' : ''}`;

  const configuration: QTMSConfiguration = {
    chassis,
    slotAssignments,
    hasRemoteDisplay,
    analogConfigurations,
    bushingConfigurations
  };

  return {
    id: `qtms-${Date.now()}`,
    name: `QTMS ${chassis.type} Configuration`,
    description,
    partNumber,
    price: totalPrice,
    cost: totalCost, // Add this line
    configuration,
    components
  };
};

export const createQTMSBOMItem = (consolidatedQTMS: ConsolidatedQTMS): BOMItem => {
  return {
    id: consolidatedQTMS.id,
    product: {
      id: consolidatedQTMS.id,
      name: consolidatedQTMS.name,
      type: 'QTMS',
      description: consolidatedQTMS.description,
      price: consolidatedQTMS.price,
      cost: consolidatedQTMS.cost, // Add this line
      enabled: true,
      partNumber: consolidatedQTMS.partNumber
    } as any,
    quantity: 1,
    enabled: true,
    configuration: consolidatedQTMS.configuration,
    partNumber: consolidatedQTMS.partNumber
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
    existingQTMS.configuration.chassis,
    newSlotAssignments,
    newHasRemoteDisplay,
    analogConfigurations as any,
    bushingConfigurations
  );
};

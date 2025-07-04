
import { Chassis, Card, Level1Product } from './interfaces';

export const generateQTMSPartNumber = (
  chassis: Chassis, 
  cards: Card[], 
  hasRemoteDisplay: boolean,
  slotAssignments: Record<number, Card>,
  analogConfigurations?: Record<string, any>,
  bushingConfigurations?: Record<string, any>
): string => {
  let partNumber = '';
  
  // Base chassis part number
  switch (chassis.type) {
    case 'LTX':
      partNumber = 'QTMS-LTX-';
      break;
    case 'MTX':
      partNumber = 'QTMS-MTX-';
      break;
    case 'STX':
      partNumber = 'QTMS-STX-';
      break;
  }
  
  // Generate slot configuration string
  const maxSlots = chassis.type === 'LTX' ? 14 : chassis.type === 'MTX' ? 7 : 4;
  let slotConfig = '';
  
  // Keep track of slots that are occupied by multi-slot cards
  const occupiedSlots = new Set<number>();
  
  for (let i = 1; i <= maxSlots; i++) {
    // Skip if this slot is already marked as occupied by a multi-slot card
    if (occupiedSlots.has(i)) {
      continue;
    }
    
    const card = slotAssignments[i];
    if (card) {
      let slotCode = '';
      switch (card.type) {
        case 'relay': 
          slotCode = 'R';
          break;
        case 'analog': 
          // Check for analog configuration
          const analogConfig = analogConfigurations?.[card.id];
          if (analogConfig && analogConfig.sensorTypes) {
            const uniqueSensors = [...new Set(Object.values(analogConfig.sensorTypes))];
            slotCode = `A${uniqueSensors.length}`;
          } else {
            slotCode = 'A';
          }
          break;
        case 'fiber': 
          // Add input count for fiber cards
          if (card.specifications?.inputs) {
            slotCode = `F${card.specifications.inputs}`;
          } else {
            slotCode = 'F';
          }
          break;
        case 'display': 
          slotCode = 'D';
          break;
        case 'bushing': 
          // Check for bushing configuration
          const bushingConfig = bushingConfigurations?.[card.id];
          if (bushingConfig && bushingConfig.numberOfBushings) {
            slotCode = `B${bushingConfig.numberOfBushings}`;
          } else {
            slotCode = 'B';
          }
          // Mark the next slot as occupied since bushing cards use 2 slots
          occupiedSlots.add(i + 1);
          break;
        default: 
          slotCode = 'X';
      }
      slotConfig += slotCode;
    } else {
      slotConfig += 'E'; // Empty slot
    }
  }
  
  partNumber += slotConfig;
  
  // Add remote display suffix
  if (hasRemoteDisplay) {
    partNumber += '-RD';
  }
  
  return partNumber;
};

export const generateProductPartNumber = (product: Level1Product, configuration?: Record<string, any>): string => {
  let partNumber = product.partNumber || product.id.toUpperCase();
  
  // Add configuration suffix for DGA products
  if (product.type && ['TM8', 'TM3', 'TM1'].includes(product.type) && configuration) {
    const options = [];
    if (configuration['CalGas']) options.push('CG');
    if (configuration['Helium Bottle']) options.push('HB');
    if (configuration['Moisture Sensor']) options.push('MS');
    if (configuration['4-20mA bridge']) options.push('MA');
    
    if (options.length > 0) {
      partNumber += '-' + options.join('');
    }
  }
  
  // Add quantity suffix for PD products
  if (product.type === 'QPDM' && configuration?.quantity) {
    partNumber += '-Q' + configuration.quantity;
  }
  
  // Add channel configuration for QPDM
  if (product.type === 'QPDM' && configuration?.channels === '6-channel') {
    partNumber += '-6CH';
  }
  
  return partNumber;
};

// Generate part number for individual cards
export const generateCardPartNumber = (card: Card, configuration?: Record<string, any>): string => {
  let partNumber = card.partNumber || card.id.toUpperCase();
  
  // Add configuration details if available
  if (configuration) {
    // For analog cards with sensor configuration
    if (card.type === 'analog' && configuration.sensorTypes) {
      const uniqueSensors = [...new Set(Object.values(configuration.sensorTypes))];
      partNumber += `-${uniqueSensors.length}S`;
    }
    
    // For bushing cards with bushing count
    if (card.type === 'bushing' && configuration.numberOfBushings) {
      partNumber += `-${configuration.numberOfBushings}B`;
    }
  }
  
  return partNumber;
};

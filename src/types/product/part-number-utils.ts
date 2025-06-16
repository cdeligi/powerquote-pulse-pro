
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
  
  for (let i = 1; i <= maxSlots; i++) {
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
          slotCode = 'F';
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
          // Check if this is the second slot of a bushing card
          if (i > 1 && slotAssignments[i-1]?.type === 'bushing' && slotAssignments[i-1]?.id === card.id) {
            continue; // Skip second slot of bushing card
          }
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
  if (['TM8', 'TM3', 'TM1'].includes(product.type) && configuration) {
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

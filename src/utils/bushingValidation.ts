
import { Level2Product, Level3Product } from '@/types/product';

export interface BushingSlotValidation {
  isValid: boolean;
  errorMessage?: string;
  occupiedSlots: number[];
}

export interface BushingPlacement {
  primarySlot: number;
  secondarySlot: number;
  shouldClearExisting: boolean;
  existingSlotsToClear: number[];
}

export const getBushingSlotConfiguration = (chassisType: string): { allowedPlacements: number[][] } => {
  switch (chassisType) {
    case 'LTX':
      return { allowedPlacements: [[6, 7], [13, 14]] }; // Priority: 6-7, fallback: 13-14
    case 'MTX':
      return { allowedPlacements: [[6, 7]] }; // Fixed slots 6-7 only
    case 'STX':
      return { allowedPlacements: [[3, 4]] }; // Fixed slots 3-4 only
    default:
      return { allowedPlacements: [] };
  }
};

export const findOptimalBushingPlacement = (
  chassis: Level2Product,
  currentSlotAssignments: Record<number, Level3Product>
): BushingPlacement | null => {
  const config = getBushingSlotConfiguration(chassis.type);
  
  if (config.allowedPlacements.length === 0) {
    return null;
  }

  // Remove any existing bushing cards first
  const existingBushingSlots = findExistingBushingSlots(currentSlotAssignments);
  
  for (const [primarySlot, secondarySlot] of config.allowedPlacements) {
    const isPrimaryOccupied = currentSlotAssignments[primarySlot] && !isBushingCard(currentSlotAssignments[primarySlot]);
    const isSecondaryOccupied = currentSlotAssignments[secondarySlot] && !isBushingCard(currentSlotAssignments[secondarySlot]);
    
    // If both slots are free (ignoring existing bushing cards), use this placement
    if (!isPrimaryOccupied && !isSecondaryOccupied) {
      return {
        primarySlot,
        secondarySlot,
        shouldClearExisting: existingBushingSlots.length > 0,
        existingSlotsToClear: existingBushingSlots
      };
    }
  }

  // For LTX, if primary placement (6-7) is occupied by non-bushing cards, 
  // but fallback (13-14) is available, use fallback
  if (chassis.type === 'LTX' && config.allowedPlacements.length === 2) {
    const [fallbackPrimary, fallbackSecondary] = config.allowedPlacements[1];
    const isFallbackPrimaryOccupied = currentSlotAssignments[fallbackPrimary] && !isBushingCard(currentSlotAssignments[fallbackPrimary]);
    const isFallbackSecondaryOccupied = currentSlotAssignments[fallbackSecondary] && !isBushingCard(currentSlotAssignments[fallbackSecondary]);
    
    if (!isFallbackPrimaryOccupied && !isFallbackSecondaryOccupied) {
      return {
        primarySlot: fallbackPrimary,
        secondarySlot: fallbackSecondary,
        shouldClearExisting: existingBushingSlots.length > 0,
        existingSlotsToClear: existingBushingSlots
      };
    }
    
    // If both placements are occupied, clear primary placement (6-7) and use it
    const [primaryPrimary, primarySecondary] = config.allowedPlacements[0];
    return {
      primarySlot: primaryPrimary,
      secondarySlot: primarySecondary,
      shouldClearExisting: true,
      existingSlotsToClear: [...existingBushingSlots, primaryPrimary, primarySecondary]
    };
  }

  return null;
};

export const validateBushingCardPlacement = (
  chassis: Level2Product,
  currentSlotAssignments: Record<number, Level3Product>
): BushingSlotValidation => {
  const placement = findOptimalBushingPlacement(chassis, currentSlotAssignments);
  
  if (!placement) {
    return {
      isValid: false,
      errorMessage: `Bushing cards are not supported for ${chassis.type} chassis`,
      occupiedSlots: []
    };
  }

  return {
    isValid: true,
    occupiedSlots: [placement.primarySlot, placement.secondarySlot]
  };
};

export const findExistingBushingSlots = (
  slotAssignments: Record<number, Level3Product>
): number[] => {
  const bushingSlots: number[] = [];
  
  Object.entries(slotAssignments).forEach(([slotStr, card]) => {
    const slot = parseInt(slotStr);
    if (isBushingCard(card)) {
      bushingSlots.push(slot);
    }
  });
  
  return bushingSlots;
};

export const isBushingCard = (card: Level3Product): boolean => {
  return card.name.toLowerCase().includes('bushing') || card.type === 'bushing';
};

export const getMaxSlotsForChassis = (chassisType: string): number => {
  switch (chassisType) {
    case 'LTX': return 14;
    case 'MTX': return 7;
    case 'STX': return 4;
    default: return 0;
  }
};

export const getBushingOccupiedSlots = (
  slotAssignments: Record<number, Level3Product>
): Record<number, number[]> => {
  const bushingSlots: Record<number, number[]> = {};
  const processedSlots = new Set<number>();
  
  Object.entries(slotAssignments).forEach(([slotStr, card]) => {
    const slot = parseInt(slotStr);
    if (isBushingCard(card) && !processedSlots.has(slot)) {
      // Check if this is the primary slot of a bushing card
      const nextSlot = slot + 1;
      if (slotAssignments[nextSlot] && isBushingCard(slotAssignments[nextSlot])) {
        bushingSlots[slot] = [slot, nextSlot];
        processedSlots.add(slot);
        processedSlots.add(nextSlot);
      } else {
        // Check if this is the secondary slot
        const prevSlot = slot - 1;
        if (slotAssignments[prevSlot] && isBushingCard(slotAssignments[prevSlot]) && !processedSlots.has(prevSlot)) {
          bushingSlots[prevSlot] = [prevSlot, slot];
          processedSlots.add(prevSlot);
          processedSlots.add(slot);
        }
      }
    }
  });
  
  return bushingSlots;
};

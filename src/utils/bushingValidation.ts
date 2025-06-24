
import { Level2Product, Level3Product } from '@/types/product';

export interface BushingSlotValidation {
  isValid: boolean;
  errorMessage?: string;
  occupiedSlots: number[];
}

export const validateBushingCardPlacement = (
  slot: number,
  chassis: Level2Product,
  currentSlotAssignments: Record<number, Level3Product>
): BushingSlotValidation => {
  const maxSlots = getMaxSlotsForChassis(chassis.type);
  const nextSlot = slot + 1;

  // Check if slot is within valid range
  if (slot < 1 || slot > maxSlots) {
    return {
      isValid: false,
      errorMessage: `Slot ${slot} is not valid for ${chassis.type} chassis`,
      occupiedSlots: []
    };
  }

  // Check if it's the last slot (can't place 2-slot card)
  if (slot === maxSlots) {
    return {
      isValid: false,
      errorMessage: `Cannot place 2-slot bushing card at slot ${slot} (last slot)`,
      occupiedSlots: []
    };
  }

  // Check chassis-specific positioning rules
  if (!isBushingSlotAllowedForChassis(slot, chassis.type)) {
    return {
      isValid: false,
      errorMessage: `Slot ${slot} is not allowed for bushing cards in ${chassis.type} chassis`,
      occupiedSlots: []
    };
  }

  // Check if current slot is occupied
  if (currentSlotAssignments[slot]) {
    return {
      isValid: false,
      errorMessage: `Slot ${slot} is already occupied`,
      occupiedSlots: []
    };
  }

  // Check if next slot is occupied
  if (currentSlotAssignments[nextSlot]) {
    return {
      isValid: false,
      errorMessage: `Slot ${nextSlot} is already occupied (required for 2-slot bushing card)`,
      occupiedSlots: []
    };
  }

  return {
    isValid: true,
    occupiedSlots: [slot, nextSlot]
  };
};

export const getMaxSlotsForChassis = (chassisType: string): number => {
  switch (chassisType) {
    case 'LTX': return 14;
    case 'MTX': return 7;
    case 'STX': return 4;
    default: return 0;
  }
};

export const isBushingSlotAllowedForChassis = (slot: number, chassisType: string): boolean => {
  switch (chassisType) {
    case 'LTX':
      // Slots 1-6, 8-13 (avoiding slot 7 which conflicts with 8, and slot 14 which has no next slot)
      return (slot >= 1 && slot <= 6) || (slot >= 8 && slot <= 13);
    case 'MTX':
      // Slots 1-6 (avoiding slot 7 which has no next slot)
      return slot >= 1 && slot <= 6;
    case 'STX':
      // Slots 1-3 (avoiding slot 4 which has no next slot)
      return slot >= 1 && slot <= 3;
    default:
      return false;
  }
};

export const getBushingOccupiedSlots = (
  slotAssignments: Record<number, Level3Product>
): Record<number, number[]> => {
  const bushingSlots: Record<number, number[]> = {};
  
  Object.entries(slotAssignments).forEach(([slotStr, card]) => {
    const slot = parseInt(slotStr);
    if (card.name.toLowerCase().includes('bushing')) {
      // Check if this is the first slot of a bushing card
      const prevSlot = slot - 1;
      if (!slotAssignments[prevSlot] || !slotAssignments[prevSlot].name.toLowerCase().includes('bushing')) {
        bushingSlots[slot] = [slot, slot + 1];
      }
    }
  });
  
  return bushingSlots;
};

export const isBushingCard = (card: Level3Product): boolean => {
  return card.name.toLowerCase().includes('bushing') || card.type === 'bushing';
};

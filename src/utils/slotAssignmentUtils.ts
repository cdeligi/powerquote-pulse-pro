import type { Level3Product } from '@/types/product';

export interface SerializedSlotAssignment {
  slot: number;
  productId?: string;
  name?: string;
  displayName?: string;
  partNumber?: string;
  hasLevel4Configuration?: boolean;
  level4BomItemId?: string;
  level4TempQuoteId?: string;
  level4Config?: any;
  level4Selections?: any;
  isBushingPrimary?: boolean;
  isBushingSecondary?: boolean;
  bushingPairSlot?: number | null;
  slotRequirement?: number | null;
  slotSpan?: number | null;
}

const safeNumber = (value: unknown): number | undefined => {
  if (typeof value === 'number' && !Number.isNaN(value)) {
    return value;
  }
  if (typeof value === 'string') {
    const parsed = Number.parseInt(value, 10);
    if (!Number.isNaN(parsed)) {
      return parsed;
    }
  }
  return undefined;
};

export const serializeSlotAssignments = (
  assignments: Record<number, Level3Product>
): SerializedSlotAssignment[] => {
  return Object.entries(assignments).map(([slotKey, card]) => {
    const slotNumber = Number.parseInt(slotKey, 10);
    const extended = card as Level3Product & Record<string, any>;

    const resolvedSlotRequirement =
      safeNumber((extended as any).slotRequirement) ??
      safeNumber((extended.specifications as any)?.slotRequirement) ??
      null;

    const resolvedSlotSpan =
      safeNumber((extended as any).slotSpan) ??
      safeNumber((extended as any).span) ??
      resolvedSlotRequirement ??
      null;

    return {
      slot: Number.isNaN(slotNumber) ? 0 : slotNumber,
      productId: card.id,
      name: card.name,
      displayName: extended.displayName || card.name,
      partNumber: extended.partNumber || card.partNumber,
      hasLevel4Configuration:
        Boolean(extended.hasLevel4Configuration) ||
        Boolean(extended.has_level4) ||
        Boolean(extended.requires_level4_config),
      level4BomItemId: extended.level4BomItemId,
      level4TempQuoteId: extended.level4TempQuoteId,
      level4Config: extended.level4Config ?? null,
      level4Selections: extended.level4Selections ?? null,
      isBushingPrimary: Boolean(extended.isBushingPrimary),
      isBushingSecondary: Boolean(extended.isBushingSecondary),
      bushingPairSlot:
        safeNumber(extended.bushingPairSlot) ?? safeNumber(extended.bushing_pair_slot) ?? null,
      slotRequirement: resolvedSlotRequirement,
      slotSpan: resolvedSlotSpan,
    };
  });
};

export const deserializeSlotAssignments = (
  stored?: SerializedSlotAssignment[] | null
): Record<number, Level3Product & Record<string, any>> | undefined => {
  if (!Array.isArray(stored) || stored.length === 0) {
    return undefined;
  }

  return stored.reduce<Record<number, Level3Product & Record<string, any>>>((acc, entry) => {
    const slotNumber = safeNumber(entry.slot);
    if (slotNumber === undefined) {
      return acc;
    }

    acc[slotNumber] = {
      id: entry.productId || `slot-${slotNumber}`,
      name: entry.name || entry.displayName || `Slot ${slotNumber} Card`,
      displayName: entry.displayName || entry.name || `Slot ${slotNumber} Card`,
      description: '',
      price: 0,
      enabled: true,
      parent_product_id: '',
      product_level: 3,
      partNumber: entry.partNumber,
      has_level4: entry.hasLevel4Configuration ?? false,
      requires_level4_config: entry.hasLevel4Configuration ?? false,
      level4Config: entry.level4Config ?? null,
      level4Selections: entry.level4Selections ?? null,
      level4BomItemId: entry.level4BomItemId,
      level4TempQuoteId: entry.level4TempQuoteId,
      isBushingPrimary: entry.isBushingPrimary ?? false,
      isBushingSecondary: entry.isBushingSecondary ?? false,
      bushingPairSlot: entry.bushingPairSlot ?? undefined,
      slotRequirement: entry.slotRequirement ?? undefined,
      slotSpan: entry.slotSpan ?? undefined,
    } as Level3Product & Record<string, any>;

    return acc;
  }, {});
};

export const buildRackLayoutFromAssignments = (
  assignments?: SerializedSlotAssignment[] | null
) => {
  if (!Array.isArray(assignments) || assignments.length === 0) {
    return undefined;
  }

  return {
    slots: assignments
      .slice()
      .sort((a, b) => (safeNumber(a.slot) ?? 0) - (safeNumber(b.slot) ?? 0))
      .map(slot => {
        const slotNumber = safeNumber(slot.slot) ?? undefined;
        const pairSlot = safeNumber(slot.bushingPairSlot) ?? undefined;
        const resolvedSpan =
          safeNumber(slot.slotSpan) ??
          safeNumber(slot.slotRequirement) ??
          (slotNumber !== undefined && pairSlot !== undefined
            ? Math.abs(pairSlot - slotNumber) + 1
            : undefined);

        const explicitPrimary = safeNumber((slot as any).primarySlot);
        const explicitShared =
          safeNumber((slot as any).sharedFromSlot) ??
          safeNumber((slot as any).shared_from_slot);

        const isSecondary = Boolean(slot.isBushingSecondary);

        return {
          slot: slotNumber,
          cardName: slot.displayName || slot.name,
          partNumber: slot.partNumber,
          level4Config: slot.level4Config ?? null,
          level4Selections: slot.level4Selections ?? null,
          level4BomItemId: slot.level4BomItemId,
          slotRequirement: resolvedSpan,
          slotSpan: resolvedSpan,
          span: resolvedSpan,
          isBushingPrimary: Boolean(slot.isBushingPrimary),
          isBushingSecondary: isSecondary,
          bushingPairSlot: pairSlot,
          primarySlot:
            explicitPrimary ??
            (isSecondary
              ? pairSlot
              : slotNumber),
          sharedFromSlot:
            explicitShared ??
            (isSecondary ? pairSlot : undefined),
        };
      }),
  };
};

import { Level2Product, Level3Product } from '@/types/product';

export interface PartNumberBuildParams {
  chassis: Level2Product;
  slotAssignments: Record<number, Level3Product>;
  hasRemoteDisplay?: boolean;
  pnConfig?: any | null;
  codeMap?: Record<string, {
    template: string;
    slot_span: number;
    is_standard?: boolean;
    standard_position?: number | null;
    designated_only?: boolean;
    designated_positions?: number[];
    outside_chassis?: boolean;
    notes?: string | null;
    exclusive_in_slots?: boolean;
    color?: string | null;
  }> | null;
  cardConfigurations?: Record<string, any>;
  includeSuffix?: boolean;
}

export function buildQTMSPartNumber(params: PartNumberBuildParams): string {
  const { chassis, slotAssignments, hasRemoteDisplay = false, pnConfig, codeMap, cardConfigurations = {}, includeSuffix = true } = params;

  try {
    const defaults = {
      prefix: `QTMS-${((chassis.chassisType || chassis.type) || '').toUpperCase()}-`,
      slot_count: chassis.specifications?.slots || 0,
      slot_placeholder: '0',
      suffix_separator: '-',
      remote_off_code: '0',
      remote_on_code: 'D1',
    } as const;

    const cfg = pnConfig ?? defaults;
    const totalSlots: number = cfg.slot_count || defaults.slot_count || 0;
    const placeholder: string = cfg.slot_placeholder || defaults.slot_placeholder;

    const slotsArr: string[] = Array(totalSlots).fill(placeholder);
    const occupied = new Set<number>();

    for (let i = 1; i <= totalSlots; i++) {
      if (occupied.has(i)) continue;
      const card = slotAssignments[i];
      if (!card) continue;

      const def = codeMap ? (codeMap as any)[card.id] : undefined;
      let template: string = (def?.template || 'X') as string;

      // Replace supported placeholders
      const inputs = card.specifications?.inputs ?? '';
      template = template.replace('{inputs}', String(inputs));

      const cardKey = `slot-${i}`;
      const numberOfBushings = (cardConfigurations as any)[cardKey]?.length;
      if (typeof numberOfBushings === 'number') {
        template = template.replace('{numberOfBushings}', String(numberOfBushings));
      }

      // Strip unresolved placeholders, then set code
      const code = template.replace(/\{[^}]+\}/g, '');
      slotsArr[i - 1] = code;

      const span = (def?.slot_span || card.specifications?.slotRequirement || 1) as number;
      if (span > 1) {
        for (let s = 1; s < span; s++) {
          if (i + s <= totalSlots) {
            slotsArr[i - 1 + s] = code;
            occupied.add(i + s);
          }
        }
      }
    }

    const slotsStr = slotsArr.join('');
    const remoteCode = hasRemoteDisplay ? (cfg.remote_on_code ?? 'D1') : (cfg.remote_off_code ?? '0');
    const suffix = includeSuffix ? `${cfg.suffix_separator || '-'}${remoteCode}` : '';

    return `${cfg.prefix}${slotsStr}${suffix}`;
  } catch (e) {
    console.error('[buildQTMSPartNumber] Failed to build part number:', e);
    // Fallback to minimal prefix when something goes wrong
    return `QTMS-${((chassis.chassisType || chassis.type) || '').toUpperCase()}-`;
  }
}

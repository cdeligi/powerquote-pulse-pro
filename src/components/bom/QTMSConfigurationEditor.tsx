import { useState, useEffect, useMemo } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Monitor } from 'lucide-react';
import { ConsolidatedQTMS } from '@/utils/qtmsConsolidation';
import { Level3Product, Level3Customization, BOMItem } from '@/types/product';
import RackVisualizer from './RackVisualizer';
import SlotCardSelector from './SlotCardSelector';
import AnalogCardConfigurator from './AnalogCardConfigurator';
import BushingCardConfigurator from './BushingCardConfigurator';
import { findOptimalBushingPlacement, findExistingBushingSlots, isBushingCard } from '@/utils/bushingValidation';
import { productDataService } from '@/services/productDataService';
import { useToast } from '@/hooks/use-toast';

interface QTMSConfigurationEditorProps {
  consolidatedQTMS: ConsolidatedQTMS;
  onSave: (updatedQTMS: ConsolidatedQTMS) => void;
  onClose: () => void;
  canSeePrices: boolean;
  readOnly?: boolean;
}

const QTMSConfigurationEditor = ({
  consolidatedQTMS,
  onSave,
  onClose,
  canSeePrices,
  readOnly = false
}: QTMSConfigurationEditorProps) => {
  const { toast } = useToast();

  const [editedSlotAssignments, setEditedSlotAssignments] = useState<Record<number, Level3Product>>(
    consolidatedQTMS.configuration.slotAssignments
  );
  const [editedHasRemoteDisplay, setEditedHasRemoteDisplay] = useState(
    consolidatedQTMS.configuration.hasRemoteDisplay
  );
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [configuringCard, setConfiguringCard] = useState<BOMItem | null>(null);
  const [cardConfigurations, setCardConfigurations] = useState<Record<string, Level3Customization[]>>({});

  // Initialize card configurations from existing components
  useState(() => {
    const initialConfigs: Record<string, Level3Customization[]> = {};
    consolidatedQTMS.components.forEach(component => {
      if (component.level3Customizations) {
        initialConfigs[component.id] = component.level3Customizations;
      }
    });
    setCardConfigurations(initialConfigs);
  });

  // Part number configuration state
  const [pnConfig, setPnConfig] = useState<any | null>(null);
  const [codeMap, setCodeMap] = useState<Record<string, {
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
  }>>({});
  const [level3Products, setLevel3Products] = useState<Level3Product[]>([]);
  const [autoPlaced, setAutoPlaced] = useState(false);
  const [livePartNumber, setLivePartNumber] = useState<string>(consolidatedQTMS.partNumber);

  // Load part number config and codes for the selected chassis
  useEffect(() => {
    let isMounted = true;
    const loadPN = async () => {
      try {
        const level2Id = consolidatedQTMS.configuration.chassis.id;
        const [cfg, codes, l3] = await Promise.all([
          productDataService.getPartNumberConfig(level2Id),
          productDataService.getPartNumberCodesForLevel2(level2Id),
          productDataService.getLevel3ProductsForLevel2(level2Id)
        ]);
        if (!isMounted) return;
        setPnConfig(cfg);
        setCodeMap(codes);
        setLevel3Products(l3);
        setAutoPlaced(false);
      } catch (e) {
        console.error('Failed to load part number config:', e);
      }
    };
    loadPN();
    return () => { isMounted = false; };
  }, [consolidatedQTMS.configuration.chassis.id]);

  // Compute live part number from data-driven config
  const computedPartNumber = useMemo(() => {
    try {
      // Provide sensible defaults when admin PN config is missing
      const chassis = consolidatedQTMS.configuration.chassis;
      const defaults = {
        prefix: `QTMS-${(chassis.type || '').toUpperCase()}-`,
        slot_count: chassis.specifications?.slots || 0,
        slot_placeholder: '0',
        suffix_separator: '-'
      } as const;

      const cfg = pnConfig ?? defaults;
      const totalSlots = cfg.slot_count || 0;
      const placeholder = cfg.slot_placeholder || '0';
      const slotsArr: string[] = Array(totalSlots).fill(placeholder);
      const occupied = new Set<number>();

      for (let i = 1; i <= totalSlots; i++) {
        if (occupied.has(i)) continue;
        const card = editedSlotAssignments[i];
        if (!card) continue;

        const codeDef = codeMap[card.id];
        let template = codeDef?.template || 'X';

        // Replace supported placeholders
        const inputs = card.specifications?.inputs ?? '';
        template = template.replace('{inputs}', String(inputs));

        const cardKey = `slot-${i}`;
        const numberOfBushings = cardConfigurations[cardKey]?.length;
        if (typeof numberOfBushings === 'number') {
          template = template.replace('{numberOfBushings}', String(numberOfBushings));
        }

        // Remove any unresolved placeholders
        const code = template.replace(/\{[^}]+\}/g, '');
        slotsArr[i - 1] = code;

        const span = (codeDef?.slot_span || card.specifications?.slotRequirement || 1) as number;
        if (span > 1) {
          for (let s = 1; s < span; s++) occupied.add(i + s);
        }
      }

      const slotsStr = slotsArr.join('');
      // Accessory count suffix: currently counts selected accessories (Remote Display only for now)
      const accessoriesCount = editedHasRemoteDisplay ? 1 : 0;
      const suffix = `${cfg.suffix_separator || '-'}${accessoriesCount}`;
      return `${cfg.prefix}${slotsStr}${suffix}`;
    } catch (e) {
      console.error('Error computing part number:', e);
      return consolidatedQTMS.partNumber;
    }
  }, [pnConfig, codeMap, editedSlotAssignments, editedHasRemoteDisplay, cardConfigurations, consolidatedQTMS.partNumber, consolidatedQTMS.configuration.chassis]);

  useEffect(() => {
    setLivePartNumber(computedPartNumber);
  }, [computedPartNumber]);

  const getCardTypeColor = (cardType: string) => {
    switch (cardType) {
      case 'relay': return 'text-red-400 border-red-400';
      case 'analog': return 'text-blue-400 border-blue-400';
      case 'bushing': return 'text-orange-400 border-orange-400';
      case 'fiber': return 'text-green-400 border-green-400';
      case 'display': return 'text-purple-400 border-purple-400';
      case 'communication': return 'text-cyan-400 border-cyan-400';
      case 'digital': return 'text-yellow-400 border-yellow-400';
      default: return 'text-white border-gray-500';
    }
  };

  const handleSlotClick = (slot: number) => {
    if (readOnly) return;
    setSelectedSlot(slot);
  };

  const handleSlotClear = (slot: number) => {
    if (readOnly) return;
    setEditedSlotAssignments(prev => {
      const updated = { ...prev };
      const card = updated[slot];
      
      // If it's a bushing card, clear ALL bushing cards from the chassis
      if (card && isBushingCard(card)) {
        // Find all bushing slots and clear them
        const bushingSlots = findExistingBushingSlots(updated);
        bushingSlots.forEach(bushingSlot => {
          delete updated[bushingSlot];
          // Also remove any configurations for these cards
          const cardKey = `slot-${bushingSlot}`;
          setCardConfigurations(prevConfigs => {
            const newConfigs = { ...prevConfigs };
            delete newConfigs[cardKey];
            return newConfigs;
          });
        });
      } else {
        delete updated[slot];
        // Remove configuration for this card
        const cardKey = `slot-${slot}`;
        setCardConfigurations(prevConfigs => {
          const newConfigs = { ...prevConfigs };
          delete newConfigs[cardKey];
          return newConfigs;
        });
      }
      
      return updated;
    });
  };

  // Utility: get allowed slots for card by chassis type from specs
  const getAllowedSlotsForCard = (card: Level3Product, chassisType: string): number[] | null => {
    const spec = card.specifications || {};
    // Support both snake_case (from DB) and camelCase
    const byChassis = (spec.allowed_slots_by_chassis || spec.allowedSlotsByChassis) as Record<string, number[]> | undefined;
    if (!byChassis) return null;
    const allowed = byChassis[chassisType];
    return Array.isArray(allowed) ? allowed : null;
  };

  // Auto-place standard cards according to admin configuration
  useEffect(() => {
    if (autoPlaced) return;
    if (!pnConfig || !codeMap || !level3Products.length) return;
    const totalSlots = pnConfig.slot_count || consolidatedQTMS.configuration.chassis.specifications?.slots || 0;

    const canPlace = (start: number, span: number, assignments: Record<number, Level3Product>) => {
      if (start < 1 || start + span - 1 > totalSlots) return false;
      for (let s = 0; s < span; s++) {
        if (assignments[start + s]) return false;
      }
      return true;
    };

    let updated = { ...editedSlotAssignments } as Record<number, Level3Product>;
    let changed = false;

    Object.entries(codeMap).forEach(([l3Id, def]) => {
      if (!def?.is_standard || def?.outside_chassis) return;
      const card = level3Products.find(p => p.id === l3Id);
      if (!card) return;
      // Skip if already placed anywhere
      if (Object.values(updated).some(c => c.id === l3Id)) return;

      const span = def.slot_span || card.specifications?.slotRequirement || 1;
      let start: number | null = null;

      const pos = def.standard_position;
      if (pos === 0) {
        // CPU std position (logical slot 0) — do not place into rack slots 1..N
      } else if (pos !== null && pos !== undefined && canPlace(pos, span, updated)) {
        start = pos;
      } else if (def.designated_only && def.designated_positions?.length) {
        for (const p of def.designated_positions) {
          if (canPlace(p, span, updated)) { start = p; break; }
        }
      } else {
        for (let p = 1; p <= totalSlots; p++) {
          if (canPlace(p, span, updated)) { start = p; break; }
        }
      }

      if (start) {
        for (let s = 0; s < span; s++) {
          updated[start + s] = card;
        }
        changed = true;
      }
    });

    if (changed) {
      setEditedSlotAssignments(updated);
    }
    setAutoPlaced(true);
  }, [pnConfig, codeMap, level3Products, autoPlaced, editedSlotAssignments, consolidatedQTMS.configuration.chassis.specifications]);

  // Hints for standard slot positions not yet filled
  const standardSlotHints = useMemo(() => {
    const hints: Record<number, string[]> = {};
    const nameById = Object.fromEntries(level3Products.map(p => [p.id, p.name] as const));
    Object.entries(codeMap).forEach(([l3Id, def]) => {
      if (!def?.is_standard || def?.outside_chassis) return;
    const pos = def.standard_position;
    // Skip CPU std position (0) for hints and only show hints for 1..N
    if (pos === 0 || pos === null || pos === undefined) return;
    if (!editedSlotAssignments[pos]) {
      const name = nameById[l3Id] || 'Standard Item';
      hints[pos] = hints[pos] ? [...hints[pos], name] : [name];
    }
    });
    return hints;
  }, [codeMap, level3Products, editedSlotAssignments]);


  const handleCardSelect = (card: Level3Product, slot?: number) => {
    if (readOnly) return;

    const chassisType = consolidatedQTMS.configuration.chassis.type;
    const targetSlot = slot !== undefined ? slot : selectedSlot!;

    // Special handling for bushing cards first
    if (isBushingCard(card)) {
      const placement = findOptimalBushingPlacement(
        consolidatedQTMS.configuration.chassis,
        editedSlotAssignments
      );

      if (!placement) {
        console.error('Cannot place bushing card - no valid placement found');
        toast({
          title: 'Cannot place bushing card',
          description: 'No valid adjacent slots available for this bushing card.',
          variant: 'destructive',
        });
        return;
      }

      // Clear existing cards if needed and place bushing across two slots
      setEditedSlotAssignments(prev => {
        const updated = { ...prev };
        if (placement.shouldClearExisting) {
          placement.existingSlotsToClear.forEach(slotToClear => {
            delete updated[slotToClear];
          });
        }
        updated[placement.primarySlot] = card;
        updated[placement.secondarySlot] = card;
        return updated;
      });

      // Open configuration if needed based on Level 4 flag
      if (card.requires_level4_config && card.name.toLowerCase().includes('bushing')) {
        const newItem: BOMItem = {
          id: `${Date.now()}-${Math.random()}`,
          product: card,
          quantity: 1,
          slot: placement.primarySlot,
          enabled: true
        };
        setConfiguringCard(newItem);
        return;
      }

      setSelectedSlot(null);
      return;
    }

    // Helper to check contiguous placement
    const totalSlots = pnConfig?.slot_count || consolidatedQTMS.configuration.chassis.specifications?.slots || 0;
    const canPlaceHere = (start: number, span: number) => {
      if (start < 1 || start + span - 1 > totalSlots) return false;
      for (let s = 0; s < span; s++) {
        if (editedSlotAssignments[start + s]) return false;
      }
      return true;
    };

    // Generic allowed-slots enforcement from metadata
    const allowedSlots = getAllowedSlotsForCard(card, chassisType);
    if (allowedSlots && !allowedSlots.includes(targetSlot)) {
      toast({
        title: 'Invalid slot for this card',
        description: `This ${card.name} can only be placed in slot(s): ${allowedSlots.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    const codeDef = codeMap[card.id];
    const span = codeDef?.slot_span || card.specifications?.slotRequirement || 1;

    // Enforce designated-only positions from admin config
    if (codeDef?.designated_only && codeDef.designated_positions && !codeDef.designated_positions.includes(targetSlot)) {
      toast({
        title: 'Designated slot required',
        description: `This ${card.name} can only be placed in slots: ${codeDef.designated_positions.join(', ')}`,
        variant: 'destructive',
      });
      return;
    }

    // Check contiguous availability
    if (!canPlaceHere(targetSlot, span)) {
      toast({
        title: 'Not enough space',
        description: `Requires ${span} contiguous slot${span > 1 ? 's' : ''} starting at ${targetSlot}.`,
        variant: 'destructive',
      });
      return;
    }

    // Fallback to legacy LTX rules ONLY if no admin config exists
    if (!codeDef) {
      if (chassisType === 'LTX' && targetSlot === 8 && card.type !== 'display') {
        toast({
          title: 'Slot 8 reserved',
          description: 'On LTX chassis, only Display cards may be placed in slot 8.',
          variant: 'destructive',
        });
        return;
      }
      if (chassisType === 'LTX' && card.type === 'display' && targetSlot !== 8) {
        toast({
          title: 'Display slot restriction',
          description: 'On LTX chassis, the Display card must be placed in slot 8.',
          variant: 'destructive',
        });
        return;
      }
    } else if (codeDef.standard_position !== null && codeDef.standard_position !== undefined && codeDef.standard_position !== 0 && targetSlot !== codeDef.standard_position) {
      // Auto-route to standard position if available (ignore CPU position 0)
      if (canPlaceHere(codeDef.standard_position, span)) {
        slot = codeDef.standard_position;
      }
    }

    // Check if card needs configuration based on Level 4 flag
    if (card.requires_level4_config && card.name.toLowerCase().includes('analog')) {
      const newItem: BOMItem = {
        id: `${Date.now()}-${Math.random()}`,
        product: card,
        quantity: 1,
        slot: slot ?? targetSlot,
        enabled: true
      };
      setConfiguringCard(newItem);
      return;
    }

    // Place the card across the required span
    setEditedSlotAssignments(prev => {
      const updated = { ...prev };
      const start = (slot ?? targetSlot)!;
      for (let s = 0; s < span; s++) {
        updated[start + s] = card;
      }
      return updated;
    });
    setSelectedSlot(null);
  };

  const handleCardConfiguration = (customizations: Level3Customization[]) => {
    if (readOnly || !configuringCard) return;

    // Store the configuration
    const cardKey = `slot-${configuringCard.slot}`;
    setCardConfigurations(prev => ({
      ...prev,
      [cardKey]: customizations
    }));

    // Add card to slot assignments if it has a slot
    if (configuringCard.slot !== undefined) {
      setEditedSlotAssignments(prev => ({
        ...prev,
        [configuringCard.slot!]: configuringCard.product as Level3Product
      }));
    }

    setConfiguringCard(null);
    setSelectedSlot(null);
  };

  const handleRemoteDisplayToggle = (enabled: boolean) => {
    if (readOnly) return;
    setEditedHasRemoteDisplay(enabled);
  };

  const handleSave = () => {
    if (readOnly) return;
    // Recalculate price and components based on new configuration
    const chassisItem = consolidatedQTMS.components.find(c => c.product.id === consolidatedQTMS.configuration.chassis.id);
    const cardItems = Object.entries(editedSlotAssignments).map(([slot, card]) => {
      const cardKey = `slot-${slot}`;
      const configurations = cardConfigurations[cardKey];
      
      return {
        id: `${Date.now()}-card-${slot}`,
        product: card,
        quantity: 1,
        slot: parseInt(slot),
        enabled: true,
        level3Customizations: configurations
      };
    });

let components = chassisItem ? [chassisItem, ...cardItems] : cardItems;

// Auto-include CPU module as Level 3 (logical slot 0)
const chassisType = consolidatedQTMS.configuration.chassis.type?.toLowerCase?.() || 'ltx';
const cpuProductId = `cpu-card-${chassisType}`;
const cpuItem: BOMItem = {
  id: `${Date.now()}-cpu-${chassisType}`,
  product: {
    id: cpuProductId,
    name: 'CPU Module',
    type: 'module',
    description: `CPU module for QTMS ${chassisType.toUpperCase()} chassis (standard in slot 0)`,
    price: 0,
    enabled: true,
    specifications: { allowed_slots_by_chassis: { [chassisType.toUpperCase()]: [0] } }
  } as any,
  quantity: 1,
  enabled: true
};
// Avoid duplicate CPU if already present
const hasCPU = components.some(c => c.product?.id === cpuProductId);
if (!hasCPU) {
  components.unshift(cpuItem);
}

// Add remote display if selected, using the L3 product id per chassis
if (editedHasRemoteDisplay) {
  const remoteId = `remote-display-${chassisType}`;
  const remoteDisplayItem = {
    id: `${Date.now()}-remote-display`,
    product: {
      id: remoteId,
      name: 'Remote Display',
      type: 'accessory',
      description: `Remote display for QTMS ${chassisType.toUpperCase()} chassis`,
      price: 850,
      enabled: true
    } as any,
    quantity: 1,
    enabled: true
  };
  // Avoid duplicate Remote Display if already present
  const hasRemote = components.some(c => c.product?.id === remoteId);
  if (!hasRemote) {
    components.push(remoteDisplayItem);
  }
}

// Include standard outside-chassis items from admin config
if (codeMap && level3Products.length) {
  Object.entries(codeMap).forEach(([l3Id, def]) => {
    if (def?.outside_chassis && def?.is_standard) {
      const product = level3Products.find(p => p.id === l3Id);
      if (product && !components.some(c => c.product?.id === product.id)) {
        components.push({
          id: `${Date.now()}-outside-${l3Id}`,
          product: product as any,
          quantity: 1,
          enabled: true,
          partNumber: product.partNumber
        });
      }
    }
  });
}

// Calculate new total price including configuration costs
const baseTotalPrice = components.reduce((sum, item) => sum + (item.product.price || 0), 0);
const configurationCosts = Object.values(cardConfigurations).flat().reduce((sum, config) => sum + (config.price || 0), 0);
const totalPrice = baseTotalPrice + configurationCosts;

    // Create updated QTMS configuration
    const updatedQTMS: ConsolidatedQTMS = {
      ...consolidatedQTMS,
      partNumber: livePartNumber || consolidatedQTMS.partNumber,
      price: totalPrice,
      configuration: {
        ...consolidatedQTMS.configuration,
        slotAssignments: editedSlotAssignments,
        hasRemoteDisplay: editedHasRemoteDisplay,
        analogConfigurations: Object.fromEntries(
          Object.entries(cardConfigurations)
            .filter(([key, configs]) => configs.some(c => c.type === 'sensor_type'))
            .map(([key, configs]) => [key, { sensorTypes: configs.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {}) }])
        ),
        bushingConfigurations: Object.fromEntries(
          Object.entries(cardConfigurations)
            .filter(([key, configs]) => configs.some(c => c.name?.includes('Bushing')))
            .map(([key, configs]) => [key, { numberOfBushings: configs.length, configurations: configs }])
        )
      },
      components
    };

    onSave(updatedQTMS);
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center justify-between">
              <span className="flex items-center">
                <Settings className="mr-2 h-5 w-5" />
                Edit QTMS Configuration - {consolidatedQTMS.name}
              </span>
              <Badge variant="outline" className="text-white font-mono border-gray-500 break-all">
                {livePartNumber || consolidatedQTMS.partNumber}
              </Badge>
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Configuration Summary */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center justify-between">
                  Configuration Summary
                    <Badge variant="outline" className="text-white font-mono border-gray-500 break-all">
                      {livePartNumber || consolidatedQTMS.partNumber}
                    </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-white font-medium mb-2">Chassis</h4>
                    <div className="text-gray-300">{consolidatedQTMS.configuration.chassis.name}</div>
                    <div className="text-gray-400 text-sm">{consolidatedQTMS.configuration.chassis.description}</div>
                  </div>
                  
                  <div>
                    <h4 className="text-white font-medium mb-2">Total Price</h4>
                    <div className="text-green-400 font-bold text-lg">
                      {canSeePrices ? `$${consolidatedQTMS.price.toLocaleString()}` : '—'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rack Configuration - Removed Tabs */}
<RackVisualizer
  chassis={consolidatedQTMS.configuration.chassis as any}
  slotAssignments={editedSlotAssignments as any}
  onSlotClick={handleSlotClick}
  onSlotClear={handleSlotClear}
  selectedSlot={selectedSlot}
  hasRemoteDisplay={editedHasRemoteDisplay}
  onRemoteDisplayToggle={handleRemoteDisplayToggle}
  standardSlotHints={standardSlotHints}
/>

            {/* Configuration Changes Summary with Color Coding */}
            {Object.keys(editedSlotAssignments).length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Current Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(editedSlotAssignments).map(([slot, card]) => {
                      const cardKey = `slot-${slot}`;
                      const hasConfiguration = cardConfigurations[cardKey]?.length > 0;
                      const colorClass = getCardTypeColor(card.type);
                      
                      return (
                        <div key={slot} className="flex justify-between items-center p-3 bg-gray-700 rounded">
                          <div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-blue-400 border-blue-400">
                                Slot {slot}
                              </Badge>
                              <span className="text-white font-medium">{card.name}</span>
                              <Badge variant="outline" className={colorClass}>
                                {card.type}
                              </Badge>
                              {hasConfiguration && (
                                <Badge variant="outline" className="text-purple-400 border-purple-400">
                                  Configured
                                </Badge>
                              )}
                              {consolidatedQTMS.configuration.chassis.type === 'LTX' && parseInt(slot) === 8 && (
                                <Badge variant="outline" className="text-purple-400 border-purple-400">
                                  Display Slot
                                </Badge>
                              )}
                            </div>
                            <div className="text-gray-400 text-sm">{card.description}</div>
                            {hasConfiguration && (
                              <div className="text-xs text-purple-300 mt-1">
                                {cardConfigurations[cardKey].length} customization(s) applied
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {canSeePrices && (
                              <div className="text-white">${card.price?.toLocaleString() || '—'}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Remote Display Status */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Monitor className="h-5 w-5 text-blue-400" />
                    <div>
                      <span className="text-white font-medium">Remote Display</span>
                      <p className="text-gray-400 text-sm">
                        {editedHasRemoteDisplay ? 'Included' : 'Not included'}
                      </p>
                    </div>
                  </div>
                  {canSeePrices && editedHasRemoteDisplay && (
                    <div className="text-white">$850</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="flex items-center justify-between">
            <div className="text-left">
              <div className="text-xs uppercase text-muted-foreground tracking-wider">Part Number</div>
              <div className="text-foreground font-mono font-semibold text-lg break-all">{livePartNumber || consolidatedQTMS.partNumber || `QTMS-${(consolidatedQTMS.configuration.chassis.type||'').toUpperCase()}-`}</div>
            </div>
            <div className="flex space-x-2">
              <Button
                variant="outline"
                onClick={onClose}
                className="border-gray-600 text-white hover:bg-gray-800"
              >
                {readOnly ? 'Close' : 'Cancel'}
              </Button>
              {!readOnly && (
                <Button
                  onClick={handleSave}
                  className="bg-red-600 hover:bg-red-700 text-white"
                >
                  Save Configuration
                </Button>
              )}
            </div>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Slot Card Selector Dialog */}
{selectedSlot !== null && (
  <SlotCardSelector
    chassis={consolidatedQTMS.configuration.chassis as any}
    slot={selectedSlot}
    onCardSelect={handleCardSelect}
    onClose={() => setSelectedSlot(null)}
    canSeePrices={canSeePrices}
    currentSlotAssignments={editedSlotAssignments}
    codeMap={codeMap}
    pnConfig={pnConfig}
  />
)}

      {/* Card Configuration Dialogs */}
      {configuringCard && configuringCard.product.name.toLowerCase().includes('analog') && (
        <AnalogCardConfigurator
          bomItem={configuringCard}
          onSave={handleCardConfiguration}
          onClose={() => setConfiguringCard(null)}
        />
      )}

      {configuringCard && configuringCard.product.name.toLowerCase().includes('bushing') && (
        <BushingCardConfigurator
          bomItem={configuringCard}
          onSave={handleCardConfiguration}
          onClose={() => setConfiguringCard(null)}
        />
      )}
    </>
  );
};

export default QTMSConfigurationEditor;

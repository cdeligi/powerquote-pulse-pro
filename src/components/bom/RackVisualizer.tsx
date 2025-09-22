import { Chassis, Level3Product } from "@/types/product";
import { ChassisType } from "@/types/product/chassis-types";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Settings, X } from "lucide-react";
import { getBushingOccupiedSlots, isBushingCard } from "@/utils/bushingValidation";
import AccessoryList from "./AccessoryList";

interface RackVisualizerProps {
  chassis: Chassis;
  slotAssignments: Record<number, Level3Product>;
  onSlotClick: (slot: number) => void;
  onSlotClear: (slot: number) => void;
  selectedSlot?: number | null;
  hasRemoteDisplay?: boolean;
  onRemoteDisplayToggle?: (enabled: boolean) => void;
  standardSlotHints?: Record<number, string[]>;
  colorByProductId?: Record<string, string>;
  level3Products?: Level3Product[];
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
  }>;
  selectedAccessories?: Set<string>;
  onAccessoryToggle?: (id: string) => void;
  partNumber?: string;
  chassisType?: ChassisType; // Optional chassis type for custom layouts
  onSlotReconfigure?: (slot: number) => void;

}

const RackVisualizer = ({
  chassis,
  slotAssignments,
  onSlotClick,
  onSlotClear,
  selectedSlot,
  hasRemoteDisplay = false,
  onRemoteDisplayToggle,
  standardSlotHints,
  colorByProductId,
  level3Products = [],
  codeMap = {},
  selectedAccessories = new Set(),
  onAccessoryToggle,
  partNumber,
  chassisType,
  onSlotReconfigure,

}: RackVisualizerProps) => {

  const bushingSlots = getBushingOccupiedSlots(slotAssignments);

  const getCardDisplayName = (card?: Level3Product) => {
    if (!card) return '';

    const productRecord = (card as any).product;
    if (productRecord) {
      return (
        productRecord.displayName ||
        productRecord.name ||
        productRecord.type ||
        'Card'
      );
    }

    return (
      (card as any).displayName ||
      card.displayName ||
      card.name ||
      card.type ||
      'Card'
    );
  };

  const getCardTypeColor = (cardType: string) => {
    switch (cardType) {
      case 'relay': return 'bg-red-600';
      case 'analog': return 'bg-blue-600';
      case 'bushing': return 'bg-orange-600';
      case 'fiber': return 'bg-green-600';
      case 'display': return 'bg-purple-600';
      case 'communication': return 'bg-cyan-600';
      case 'digital': return 'bg-yellow-600';
      default: return 'bg-green-600';
    }
  };

const getSlotColor = (slot: number) => {
  // For selected empty slots, show highlight; for assigned slots we will use admin color via inline style
  if (!slotAssignments[slot] && selectedSlot === slot) return 'bg-yellow-600';
  if (slotAssignments[slot]) return 'bg-gray-700'; // base for assigned; real color via inline style
  return 'bg-gray-700'; // Empty slot
};

  const getSlotLabel = (slot: number) => {
    if (slotAssignments[slot]) {
      const card = slotAssignments[slot];
      if (isBushingCard(card)) {
        // Always show just the display name without slot number
        return getCardDisplayName(card) || 'Bushing';
      }
      // For non-bushing cards, use the existing logic
      const displayText = getCardDisplayName(card);
      return displayText.charAt(0).toUpperCase() + displayText.slice(1);
    }
    // For empty slots, just show the slot number
    return `${slot}`;
  };

const getSlotTitle = (slot: number) => {
  if (slotAssignments[slot]) {
    const card = slotAssignments[slot];
    if (isBushingCard(card)) {
      // For bushing cards, show only the display name
      return getCardDisplayName(card) || 'Bushing';
    }

    // For non-bushing cards, use the existing logic
    return getCardDisplayName(card) || 'Card';
  }

  // Empty slots - show standard hints when available
  const hints = standardSlotHints?.[slot];
  if (hints && hints.length) {
    return `Slot ${slot} - Standard: ${hints.join(', ')}`;
  }
  return `Slot ${slot} - Click to add card`;
};

  const isSlotClickable = (slot: number) => {
    // Check if this is the secondary slot of a bushing card
    const isSecondaryBushingSlot = Object.values(bushingSlots).some(slots => 
      slots.includes(slot) && slots[0] !== slot
    );
    
    return !isSecondaryBushingSlot;
  };

  const shouldShowLevel4Button = (slot: number, card: Level3Product) => {
    if (!card) return false;
    
    // For bushing cards, only show Level 4 button on the primary (first) slot
    if (isBushingCard(card)) {
      const bushingEntry = Object.entries(bushingSlots).find(([_, slots]) => 
        slots.includes(slot)
      );
      if (bushingEntry) {
        const [primarySlot, occupiedSlots] = bushingEntry;
        return parseInt(primarySlot) === slot; // Only show on primary slot
      }
    }
    
    // For non-bushing cards, show if they have Level 4 configuration
    const hasLevel4Config = Boolean(
      (card as any)?.hasLevel4Configuration ||
      (card as any)?.level4BomItemId ||
      (card as any)?.level4Config ||
      (card as any)?.has_level4 ||
      (card as any)?.requires_level4_config
    );
    
    return hasLevel4Config;
  };

  const handleSlotClear = (slot: number) => {
    const card = slotAssignments[slot];
    if (card && isBushingCard(card)) {
      // Clear all bushing cards when any bushing slot is cleared
      onSlotClear(slot);
    } else {
      onSlotClear(slot);
    }
  };

  const renderSlot = (slot: number) => {
    const clickable = isSlotClickable(slot);
    const isSecondaryBushingSlot = Object.values(bushingSlots).some(slots => 
      slots.includes(slot) && slots[0] !== slot
    );
    const isPrimaryBushingSlot = Object.values(bushingSlots).some(slots => 
      slots.includes(slot) && slots[0] === slot
    );
    const isLTXDisplaySlot = chassis.type === 'LTX' && slot === 8;
    const assignedCard = slotAssignments[slot];
    
    // Get display name from the card, with proper fallbacks
    const displayName = assignedCard ?
      (getCardDisplayName(assignedCard) || 'Card') :
      undefined;
    
    // Get the full title for the tooltip
    const slotTitle = assignedCard ? 
      displayName : 
      getSlotTitle(slot);
    
    return (
      <div
        key={slot}
        className={`
          relative h-12 border border-gray-600 rounded flex items-center justify-center text-white text-sm font-medium
          transition-all
          ${getSlotColor(slot)}
          ${clickable ? 'cursor-pointer hover:border-red-600 hover:bg-opacity-80' : 'cursor-not-allowed'}
          ${selectedSlot === slot ? 'ring-2 ring-yellow-400' : ''}
          ${isSecondaryBushingSlot ? 'border-l-0 rounded-l-none border-orange-500' : ''}
          ${isPrimaryBushingSlot ? 'border-r-0 rounded-r-none border-orange-500' : ''}
          ${isLTXDisplaySlot && !assignedCard ? 'border-gray-500' : ''}
        `}
        onClick={() => clickable && onSlotClick(slot)}
        title={slotTitle}
        style={(() => {
          const adminColor = assignedCard ? (colorByProductId?.[assignedCard.id] || null) : null;
          return adminColor ? { backgroundColor: adminColor } : undefined;
        })()}
      >
        {getSlotLabel(slot)}
        
        {/* Standard hint badge */}
        {!assignedCard && standardSlotHints && standardSlotHints[slot] && (
          <span
            className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-900/70 border border-gray-600"
            title={`Standard: ${standardSlotHints[slot].join(', ')}`}
          >
            Std
          </span>
        )}

        {/* Clear button for occupied slots */}
        {assignedCard && !isSecondaryBushingSlot && (
          <Button
            size="sm"
            variant="ghost"
            className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-red-600 hover:bg-red-700 text-white rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              handleSlotClear(slot);
            }}
            title={`Clear ${displayName || 'card'}`}
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  const renderChassisLayout = () => {
    const chassisTypeCode = chassis.type?.toUpperCase() || chassis.chassisType?.toUpperCase() || '';
    const totalSlots = chassis.specifications?.slots || chassis.slots || 0;
    
    console.log(`RackVisualizer: chassis type = ${chassisTypeCode}, total slots = ${totalSlots}`);
    
    // Use custom layout from chassisType if available
    if (chassisType?.layoutRows && chassisType.layoutRows.length > 0) {
      console.log('Using custom layout from chassis type:', chassisType.layoutRows);
      return (
        <div className="space-y-2">
          {chassisType.layoutRows.map((row, rowIndex) => (
            <div 
              key={rowIndex} 
              className="grid gap-2" 
              style={{ gridTemplateColumns: `repeat(${row.length}, minmax(0, 1fr))` }}
            >
              {row.map(renderSlot)}
            </div>
          ))}
        </div>
      );
    }
    
    // Fallback to hardcoded layouts for backwards compatibility
    if (chassisTypeCode === 'LTX' && totalSlots === 14) {
      // LTX with 14 slots: Top row slots 8-14 (7 slots), Bottom row CPU (0) + slots 1-7 (8 slots)
      const topRowSlots = [8, 9, 10, 11, 12, 13, 14];
      const bottomRowSlots = [0, 1, 2, 3, 4, 5, 6, 7];
      
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-2">
            {topRowSlots.map(renderSlot)}
          </div>
          <div className="grid grid-cols-8 gap-2">
            {bottomRowSlots.map(renderSlot)}
          </div>
        </div>
      );
    } else if (chassisTypeCode === 'MTX' && totalSlots === 7) {
      // MTX with 7 slots: Single row CPU (0) + slots 1-7
      const slots = [0, 1, 2, 3, 4, 5, 6, 7];
      return (
        <div className="grid grid-cols-8 gap-2">
          {slots.map(renderSlot)}
        </div>
      );
    } else if (chassisTypeCode === 'STX' && totalSlots === 4) {
      // STX with 4 slots: Single row CPU (0) + slots 1-4
      const slots = [0, 1, 2, 3, 4];
      return (
        <div className="grid grid-cols-5 gap-2">
          {slots.map(renderSlot)}
        </div>
      );
    } else {
      // Fallback: render based on actual slot count from database
      const slots = Array.from({ length: totalSlots }, (_, i) => i); // Start from 0
      const slotsPerRow = Math.min(8, totalSlots);
      const rows = Math.ceil(totalSlots / slotsPerRow);
      
      return (
        <div className="space-y-2">
          {Array.from({ length: rows }, (_, rowIndex) => {
            const startSlot = rowIndex * slotsPerRow;
            const endSlot = Math.min(startSlot + slotsPerRow, totalSlots);
            const rowSlots = slots.slice(startSlot, endSlot);
            
            return (
              <div key={rowIndex} className={`grid gap-2`} style={{ gridTemplateColumns: `repeat(${rowSlots.length}, minmax(0, 1fr))` }}>
                {rowSlots.map(renderSlot)}
              </div>
            );
          })}
        </div>
      );
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">
          Rack Configuration - {chassis.name}
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            Click on any slot to add a card. Click the X to clear a slot.
          </p>
          
          {renderChassisLayout()}

          {/* Part Number - bottom left below rack */}
          <div className="mt-2 text-xs text-gray-300">
            <span className="mr-1">Part Number:</span>
            <span className="font-mono text-white break-all">{partNumber || '—'}</span>
          </div>
          
          {/* Bushing Card Information */}
          {Object.keys(bushingSlots).length > 0 && (
            <div className="bg-orange-900/20 border border-orange-600 rounded p-3">
              <h4 className="text-orange-400 font-medium mb-2">Bushing Card Placement:</h4>
              <div className="space-y-1 text-sm">
                {Object.entries(bushingSlots).map(([slot, occupiedSlots]) => (
                  <div key={slot} className="text-orange-300">
                    Slots {occupiedSlots.join(', ')}: {(() => {
                      const card = slotAssignments[parseInt(slot)];
                      return getCardDisplayName(card) || 'Card';
                    })()}
                    <br />
                    <span className="text-xs text-orange-200">
                      (Only one bushing card allowed per chassis)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          
          {/* Accessories Section using AccessoryList component */}
          {level3Products.length > 0 && Object.keys(codeMap).length > 0 && onAccessoryToggle && (
            <div className="pt-4 border-t border-gray-700">
              <AccessoryList
                level3Products={level3Products}
                codeMap={codeMap}
                selectedAccessories={selectedAccessories}
                onToggleAccessory={onAccessoryToggle}
              />
            </div>
          )}
          
          
          {/* Slot assignments summary */}
          {(chassis.slots || chassis.specifications?.slots || Object.keys(slotAssignments).length > 0) && (
            <div className="pt-4 border-t border-gray-700">
              <h4 className="text-white font-medium mb-2">Assigned Cards:</h4>
              <div className="space-y-1">
                {Object.entries(bushingSlots).map(([slot, slots]) => {
                  const primarySlot = parseInt(slot, 10);
                  const card = slotAssignments[primarySlot];
                  const label = getCardDisplayName(card) || 'Card';
                  const shouldShowButton = shouldShowLevel4Button(primarySlot, card);
                  const hasExistingConfig = Boolean((card as any)?.level4BomItemId);
                  const srLabel = `${hasExistingConfig ? 'Reconfigure' : 'Configure'} ${label}`;

                  return (
                    <div key={`bushing-${slot}`} className="flex items-center justify-between gap-2 text-sm">
                      <div className="flex items-center gap-2">
                        <span className="text-gray-400">Slots {slots.join('-')}:</span>
                        <span className="text-white">{label}</span>
                      </div>
                      {shouldShowButton && !!onSlotReconfigure && (
                        <Button
                          size="icon"
                          variant="ghost"
                          className="h-7 w-7 border border-gray-700 text-gray-200 hover:text-white"
                          onClick={() => onSlotReconfigure(primarySlot)}
                          title={srLabel}
                        >
                          <Settings className="h-3.5 w-3.5" />
                          <span className="sr-only">{srLabel}</span>
                        </Button>
                      )}
                    </div>
                  );
                })}
                {(() => {
                  const totalSlots = chassis.slots || chassis.specifications?.slots || 0;
                  const slotOrder = totalSlots > 0
                    ? Array.from({ length: totalSlots }, (_, index) => index + 1)
                    : Object.keys(slotAssignments)
                        .map(Number)
                        .sort((a, b) => a - b);

                  return slotOrder.map(slot => {
                    const card = slotAssignments[slot];
                    const isEmpty = !card;
                    const isSecondaryBushing = Boolean((card as any)?.isBushingSecondary);
                    const label = isEmpty ? 'Empty' : getCardDisplayName(card);
                    const shouldShowButton = !isEmpty && !isSecondaryBushing && shouldShowLevel4Button(slot, card);
                    const hasExistingConfig = Boolean((card as any)?.level4BomItemId);
                    const isSharedConfig = Boolean((card as any)?.isSharedLevel4Config);
                    const showReconfigureButton = shouldShowButton && !isSharedConfig && !!onSlotReconfigure;
                    const srLabel = `${hasExistingConfig ? 'Reconfigure' : 'Configure'} ${label || 'card'}`;

                    return (
                      <div key={slot} className="flex items-center justify-between gap-2 text-sm">
                        <div className="flex items-center gap-2">
                          <span className="text-gray-400">Slot {slot}:</span>
                          <span className={isEmpty ? 'text-gray-500 italic' : 'text-white'}>
                            {label || 'Card'}
                          </span>
                        </div>
                         {showReconfigureButton && (
                          <Button
                            size="icon"
                            variant="ghost"
                            className="h-7 w-7 border border-gray-700 text-gray-200 hover:text-white"
                            onClick={() => onSlotReconfigure?.(slot)}
                            title={srLabel}
                          >
                            <Settings className="h-3.5 w-3.5" />
                            <span className="sr-only">{srLabel}</span>
                          </Button>
                        )}
                      </div>
                    );
                  });
                })()}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RackVisualizer;

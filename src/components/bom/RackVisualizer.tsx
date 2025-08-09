import { Chassis, Card as ProductCard, Level3Product } from "@/types/product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { X } from "lucide-react";
import { getBushingOccupiedSlots, isBushingCard } from "@/utils/bushingValidation";

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
  cpuColor?: string;
  cpuLabel?: string;
  accessories?: { product: Level3Product; selected: boolean; color?: string | null; pn?: string | null }[];
  onAccessoryToggle?: (id: string) => void;
  partNumber?: string;
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
  cpuColor,
  cpuLabel,
  accessories,
  onAccessoryToggle,
  partNumber,
}: RackVisualizerProps) => {
  
  const bushingSlots = getBushingOccupiedSlots(slotAssignments);

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
  // CPU slot uses configured color via inline style; keep neutral base here
  if (slot === 0) return 'bg-gray-700';
  // For selected empty slots, show highlight; for assigned slots we will use admin color via inline style
  if (!slotAssignments[slot] && selectedSlot === slot) return 'bg-yellow-600';
  if (slotAssignments[slot]) return 'bg-gray-700'; // base for assigned; real color via inline style
  return 'bg-gray-700'; // Empty slot
};

  const getSlotLabel = (slot: number) => {
    if (slot === 0) return cpuLabel || 'CPU';
    if (slotAssignments[slot]) {
      const card = slotAssignments[slot];
      if (isBushingCard(card)) {
        // Check if this is the primary slot of the bushing card
        const isSecondarySlot = Object.values(bushingSlots).some(slots => 
          slots.includes(slot) && slots[0] !== slot
        );
        return isSecondarySlot ? 'B+' : 'B';
      }
      return card.type.charAt(0).toUpperCase() + card.type.slice(1);
    }
    // For empty slots, just show the slot number
    return `${slot}`;
  };

const getSlotTitle = (slot: number) => {
  if (slot === 0) return `${cpuLabel || 'CPU'} (Fixed)`;
  if (slotAssignments[slot]) {
    const card = slotAssignments[slot];
    if (isBushingCard(card)) {
      const isSecondarySlot = Object.values(bushingSlots).some(slots => 
        slots.includes(slot) && slots[0] !== slot
      );
      return isSecondarySlot ? `${card.name} (Extension Slot)` : card.name;
    }
    return card.name;
  }
  // Empty slots - show standard hints when available
  const hints = standardSlotHints?.[slot];
  if (hints && hints.length) {
    return `Slot ${slot} - Standard: ${hints.join(', ')}`;
  }
  return `Slot ${slot} - Click to add card`;
};

  const isSlotClickable = (slot: number) => {
    if (slot === 0) return false; // CPU slot not clickable
    
    // Check if this is the secondary slot of a bushing card
    const isSecondaryBushingSlot = Object.values(bushingSlots).some(slots => 
      slots.includes(slot) && slots[0] !== slot
    );
    
    return !isSecondaryBushingSlot;
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
          ${isLTXDisplaySlot && !slotAssignments[slot] ? 'border-gray-500' : ''}
        `}
        onClick={() => clickable && onSlotClick(slot)}
        title={getSlotTitle(slot)}
        style={(() => {
          const assigned = slotAssignments[slot];
          const adminColor = assigned ? (colorByProductId?.[assigned.id] || null) : (slot === 0 ? (cpuColor || null) : null);
          return adminColor ? { backgroundColor: adminColor } : undefined;
        })()}
      >
        
        {getSlotLabel(slot)}
{/* Standard hint badge */}
{!slotAssignments[slot] && standardSlotHints && standardSlotHints[slot] && (
  <span
    className="absolute top-1 left-1 text-[10px] px-1.5 py-0.5 rounded bg-gray-900/70 border border-gray-600"
    title={`Standard: ${standardSlotHints[slot].join(', ')}`}
  >
    Std
  </span>
)}

{/* Clear button for occupied slots */}
{slot !== 0 && slotAssignments[slot] && !isSecondaryBushingSlot && (
  <Button
    size="sm"
    variant="ghost"
    className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-red-600 hover:bg-red-700 text-white rounded-full"
    onClick={(e) => {
      e.stopPropagation();
      handleSlotClear(slot);
    }}
    title={isPrimaryBushingSlot ? "Clear all bushing cards" : "Clear slot"}
  >
    <X className="h-3 w-3" />
  </Button>
)}
      </div>
    );
  };

  const renderChassisLayout = () => {
    const chassisType = chassis.type?.toUpperCase() || chassis.chassisType?.toUpperCase() || '';
    const totalSlots = chassis.specifications?.slots || chassis.slots || 0;
    
    console.log(`RackVisualizer: chassis type = ${chassisType}, total slots = ${totalSlots}`);
    
    if (chassisType === 'LTX' && totalSlots === 14) {
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
    } else if (chassisType === 'MTX' && totalSlots === 7) {
      // MTX with 7 slots: Single row CPU (0) + slots 1-7
      const slots = [0, 1, 2, 3, 4, 5, 6, 7];
      return (
        <div className="grid grid-cols-8 gap-2">
          {slots.map(renderSlot)}
        </div>
      );
    } else if (chassisType === 'STX' && totalSlots === 4) {
      // STX with 4 slots: Single row CPU (0) + slots 1-4
      const slots = [0, 1, 2, 3, 4];
      return (
        <div className="grid grid-cols-5 gap-2">
          {slots.map(renderSlot)}
        </div>
      );
    } else {
      // Fallback: render based on actual slot count from database
      const slots = Array.from({ length: totalSlots + 1 }, (_, i) => i); // Include CPU slot 0
      const slotsPerRow = Math.min(8, totalSlots + 1);
      const rows = Math.ceil((totalSlots + 1) / slotsPerRow);
      
      return (
        <div className="space-y-2">
          {Array.from({ length: rows }, (_, rowIndex) => {
            const startSlot = rowIndex * slotsPerRow;
            const endSlot = Math.min(startSlot + slotsPerRow, totalSlots + 1);
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
        <CardTitle className="text-white flex items-center justify-between">
          <span>Rack Configuration - {chassis.name}</span>
          <div className="flex items-center gap-2">
            <Badge variant="outline" className="text-sm text-white border-gray-500">
              {chassis.specifications?.height || (chassis as any).height || '6U'} • {chassis.specifications?.slots || (chassis as any).slots || 14} slots
            </Badge>
          </div>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">
            Click on any slot (except {cpuLabel || 'CPU'}) to add a card. Click the X to clear a slot.
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
                    Slots {occupiedSlots.join(', ')}: {slotAssignments[parseInt(slot)]?.name}
                    <br />
                    <span className="text-xs text-orange-200">
                      (Only one bushing card allowed per chassis)
                    </span>
                  </div>
                ))}
              </div>
            </div>
          )}
          
          
          {/* Accessories Section */}
          {accessories && accessories.length > 0 && (
            <div className="pt-4 border-t border-gray-700">
              <h4 className="text-white font-medium mb-2">Accessories</h4>
              <div className="space-y-2">
                {accessories.map((acc) => (
                  <div key={acc.product.id} className="flex items-center justify-between p-3 bg-gray-800 rounded border border-gray-700">
                    <div className="flex items-center space-x-2">
                      <span className="inline-block h-3 w-3 rounded-full" style={acc.color ? { backgroundColor: acc.color } : undefined} />
                      <span className="text-white">{acc.product.name}</span>
                      {acc.pn && (
                        <span className="text-red-500 font-mono text-sm ml-2 break-all">{acc.pn}</span>
                      )}
                    </div>
                    {onAccessoryToggle && (
                      <Button
                        variant={acc.selected ? 'default' : 'outline'}
                        size="sm"
                        onClick={() => {
                          onAccessoryToggle(acc.product.id);
                          if (onRemoteDisplayToggle && acc.product.name?.toLowerCase().includes('remote') && acc.product.name?.toLowerCase().includes('display')) {
                            onRemoteDisplayToggle(!acc.selected);
                          }
                        }}
                        className={acc.selected ? 'bg-green-600 hover:bg-green-700' : ''}
                      >
                        {acc.selected ? 'Added' : 'Add'}
                      </Button>
                    )}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          
          {/* Slot assignments summary */}
          {Object.keys(slotAssignments).length > 0 && (
            <div className="pt-4 border-t border-gray-700">
              <h4 className="text-white font-medium mb-2">Assigned Cards:</h4>
              <div className="space-y-1">
                {Object.entries(bushingSlots).map(([slot, slots]) => (
                  <div key={`bushing-${slot}`} className="flex justify-between text-sm">
                    <span className="text-gray-400">Slots {slots.join('-')}:</span>
                    <span className="text-white">{slotAssignments[parseInt(slot)]?.name}</span>
                  </div>
                ))}
                {Object.entries(slotAssignments)
                  .filter(([slot, card]) => parseInt(slot) !== 0 && !isBushingCard(card))
                  .map(([slot, card]) => (
                    <div key={slot} className="flex justify-between text-sm">
                      <span className="text-gray-400">Slot {slot}:</span>
                      <span className="text-white">{card.name}</span>
                    </div>
                  ))}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RackVisualizer;

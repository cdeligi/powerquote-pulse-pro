
import { Chassis, Card as ProductCard } from "@/types/product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cpu, X, Monitor } from "lucide-react";
import { getBushingOccupiedSlots, isBushingCard } from "@/utils/bushingValidation";

interface RackVisualizerProps {
  chassis: Chassis;
  slotAssignments: Record<number, ProductCard>;
  onSlotClick: (slot: number) => void;
  onSlotClear: (slot: number) => void;
  selectedSlot?: number | null;
  hasRemoteDisplay?: boolean;
  onRemoteDisplayToggle?: (enabled: boolean) => void;
}

const RackVisualizer = ({ 
  chassis, 
  slotAssignments, 
  onSlotClick, 
  onSlotClear, 
  selectedSlot,
  hasRemoteDisplay = false,
  onRemoteDisplayToggle
}: RackVisualizerProps) => {
  
  const bushingSlots = getBushingOccupiedSlots(slotAssignments);

  const getSlotColor = (slot: number) => {
    if (slot === 0) return 'bg-blue-600'; // CPU slot (slot 0)
    if (selectedSlot === slot) return 'bg-yellow-600'; // Selected slot
    if (slotAssignments[slot]) return 'bg-green-600'; // Occupied
    
    // Check if this slot is the second slot of a bushing card
    const prevSlot = slot - 1;
    if (slotAssignments[prevSlot] && isBushingCard(slotAssignments[prevSlot])) {
      return 'bg-green-600'; // Second slot of bushing card
    }
    
    return 'bg-gray-700'; // Empty
  };

  const getSlotLabel = (slot: number) => {
    if (slot === 0) return 'CPU';
    if (slotAssignments[slot]) {
      const card = slotAssignments[slot];
      return card.type.charAt(0).toUpperCase() + card.type.slice(1);
    }
    
    // Check if this is the second slot of a bushing card
    const prevSlot = slot - 1;
    if (slotAssignments[prevSlot] && isBushingCard(slotAssignments[prevSlot])) {
      return 'B+'; // Indicates extension of bushing card
    }
    
    return `${slot}`;
  };

  const getSlotTitle = (slot: number) => {
    if (slot === 0) return 'CPU (Fixed)';
    if (slotAssignments[slot]) return slotAssignments[slot].name;
    
    // Check if this is the second slot of a bushing card
    const prevSlot = slot - 1;
    if (slotAssignments[prevSlot] && isBushingCard(slotAssignments[prevSlot])) {
      return `${slotAssignments[prevSlot].name} (Extension Slot)`;
    }
    
    return `Slot ${slot} - Click to add card`;
  };

  const isSlotClickable = (slot: number) => {
    if (slot === 0) return false; // CPU slot not clickable
    
    // Check if this is the second slot of a bushing card
    const prevSlot = slot - 1;
    if (slotAssignments[prevSlot] && isBushingCard(slotAssignments[prevSlot])) {
      return false; // Second slot of bushing card not clickable
    }
    
    return true;
  };

  const handleSlotClear = (slot: number) => {
    const card = slotAssignments[slot];
    if (card && isBushingCard(card)) {
      // Clear both slots for bushing cards
      onSlotClear(slot);
      const nextSlot = slot + 1;
      if (slotAssignments[nextSlot]) {
        // The onSlotClear in parent should handle clearing both slots
      }
    } else {
      onSlotClear(slot);
    }
  };

  const renderSlot = (slot: number) => {
    const clickable = isSlotClickable(slot);
    const isSecondBushingSlot = slot > 0 && slotAssignments[slot - 1] && isBushingCard(slotAssignments[slot - 1]);
    
    return (
      <div
        key={slot}
        className={`
          relative h-12 border border-gray-600 rounded flex items-center justify-center text-white text-sm font-medium
          transition-all
          ${getSlotColor(slot)}
          ${clickable ? 'cursor-pointer hover:border-red-600 hover:bg-opacity-80' : 'cursor-not-allowed'}
          ${selectedSlot === slot ? 'ring-2 ring-yellow-400' : ''}
          ${isSecondBushingSlot ? 'border-l-0 rounded-l-none' : ''}
        `}
        onClick={() => clickable && onSlotClick(slot)}
        title={getSlotTitle(slot)}
      >
        {slot === 0 && <Cpu className="h-4 w-4 mr-1" />}
        {getSlotLabel(slot)}
        
        {/* Clear button for occupied slots (only show on primary slot for bushing cards) */}
        {slot !== 0 && slotAssignments[slot] && !isSecondBushingSlot && (
          <Button
            size="sm"
            variant="ghost"
            className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-red-600 hover:bg-red-700 text-white rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              handleSlotClear(slot);
            }}
            title="Clear slot"
          >
            <X className="h-3 w-3" />
          </Button>
        )}
      </div>
    );
  };

  const renderChassisLayout = () => {
    if (chassis.type === 'LTX') {
      // Top row: slots 8-14
      // Bottom row: CPU (0) + slots 1-7
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
    } else if (chassis.type === 'MTX') {
      // Single row: CPU (0) + slots 1-7
      const slots = [0, 1, 2, 3, 4, 5, 6, 7];
      return (
        <div className="grid grid-cols-8 gap-2">
          {slots.map(renderSlot)}
        </div>
      );
    } else {
      // STX: Single row: CPU (0) + slots 1-4
      const slots = [0, 1, 2, 3, 4];
      return (
        <div className="grid grid-cols-5 gap-2">
          {slots.map(renderSlot)}
        </div>
      );
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          <span>Rack Configuration - {chassis.name}</span>
          <Badge variant="outline" className="text-sm text-white border-gray-500">
            {chassis.height} • {chassis.slots} slots
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          <p className="text-gray-400 text-sm">Click on any slot (except CPU) to add a card. Click the X to clear a slot.</p>
          
          {renderChassisLayout()}
          
          {/* Bushing Card Information */}
          {Object.keys(bushingSlots).length > 0 && (
            <div className="bg-orange-900/20 border border-orange-600 rounded p-3">
              <h4 className="text-orange-400 font-medium mb-2">Bushing Card Placements:</h4>
              <div className="space-y-1 text-sm">
                {Object.entries(bushingSlots).map(([slot, occupiedSlots]) => (
                  <div key={slot} className="text-orange-300">
                    Slots {occupiedSlots.join(', ')}: {slotAssignments[parseInt(slot)]?.name}
                  </div>
                ))}
              </div>
            </div>
          )}
          
          {/* Remote Display Option */}
          {onRemoteDisplayToggle && (
            <div className="pt-4 border-t border-gray-700">
              <div className="flex items-center justify-between p-3 bg-gray-800 rounded">
                <div className="flex items-center space-x-3">
                  <Monitor className="h-5 w-5 text-blue-400" />
                  <div>
                    <span className="text-white font-medium">Remote Display</span>
                    <p className="text-gray-400 text-sm">Add remote display capability</p>
                  </div>
                </div>
                <Button
                  variant={hasRemoteDisplay ? "default" : "outline"}
                  size="sm"
                  onClick={() => onRemoteDisplayToggle(!hasRemoteDisplay)}
                  className={hasRemoteDisplay ? "bg-green-600 hover:bg-green-700" : ""}
                >
                  {hasRemoteDisplay ? "Added" : "Add"}
                </Button>
              </div>
            </div>
          )}
          
          {/* Legend */}
          <div className="flex flex-wrap gap-4 pt-4 border-t border-gray-700">
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span className="text-sm text-gray-400">CPU (Fixed)</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-600 rounded"></div>
              <span className="text-sm text-gray-400">Selected</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span className="text-sm text-gray-400">Occupied</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-gray-700 rounded"></div>
              <span className="text-sm text-gray-400">Available</span>
            </div>
          </div>
          
          {/* Slot assignments summary */}
          {Object.keys(slotAssignments).length > 0 && (
            <div className="pt-4 border-t border-gray-700">
              <h4 className="text-white font-medium mb-2">Assigned Cards:</h4>
              <div className="space-y-1">
                {Object.entries(slotAssignments)
                  .filter(([slot]) => parseInt(slot) !== 0) // Exclude CPU slot
                  .map(([slot, card]) => {
                    const slotNum = parseInt(slot);
                    const isBushing = isBushingCard(card);
                    const displaySlots = isBushing ? `${slotNum}-${slotNum + 1}` : slot;
                    
                    return (
                      <div key={slot} className="flex justify-between text-sm">
                        <span className="text-gray-400">Slot{isBushing ? 's' : ''} {displaySlots}:</span>
                        <span className="text-white">{card.name}</span>
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </div>
      </CardContent>
    </Card>
  );
};

export default RackVisualizer;

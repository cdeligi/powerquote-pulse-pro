
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
    if (slot === 0) return 'bg-blue-600'; // CPU slot (slot 0)
    if (selectedSlot === slot) return 'bg-yellow-600'; // Selected slot
    
    // Only apply card-type colors if slot has a card assigned
    if (slotAssignments[slot]) {
      return getCardTypeColor(slotAssignments[slot].type);
    }
    
    // Empty slots - use neutral colors
    return 'bg-gray-700'; // Empty slot
  };

  const getSlotLabel = (slot: number) => {
    if (slot === 0) return 'CPU';
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
    if (slot === 0) return 'CPU (Fixed)';
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
    // For empty slots, show appropriate title
    if (chassis.type === 'LTX' && slot === 8) {
      return 'Slot 8 - Click to add Display Card';
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
      >
        {slot === 0 && <Cpu className="h-4 w-4 mr-1" />}
        {getSlotLabel(slot)}
        
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
          <p className="text-gray-400 text-sm">
            Click on any slot (except CPU) to add a card. Click the X to clear a slot.
            {chassis.type === 'LTX' && (
              <span className="block text-purple-300 mt-1">
                Slot 8 is reserved for Display Cards only.
              </span>
            )}
          </p>
          
          {renderChassisLayout()}
          
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
          
          {/* Updated Legend with Color Coding */}
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
              <div className="w-4 h-4 bg-red-600 rounded"></div>
              <span className="text-sm text-gray-400">Relay</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-blue-600 rounded"></div>
              <span className="text-sm text-gray-400">Analog</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-orange-600 rounded"></div>
              <span className="text-sm text-gray-400">Bushing</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-green-600 rounded"></div>
              <span className="text-sm text-gray-400">Fiber</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-purple-600 rounded"></div>
              <span className="text-sm text-gray-400">Display</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-cyan-600 rounded"></div>
              <span className="text-sm text-gray-400">Communication</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-4 h-4 bg-yellow-600 rounded"></div>
              <span className="text-sm text-gray-400">Digital</span>
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


import { Chassis, Card as ProductCard } from "@/types/product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Cpu, X } from "lucide-react";

interface RackVisualizerProps {
  chassis: Chassis;
  slotAssignments: Record<number, ProductCard>;
  onSlotClick: (slot: number) => void;
  onSlotClear: (slot: number) => void;
  selectedSlot?: number | null;
}

const RackVisualizer = ({ chassis, slotAssignments, onSlotClick, onSlotClear, selectedSlot }: RackVisualizerProps) => {
  const getSlotColor = (slot: number) => {
    if (slot === 0) return 'bg-blue-600'; // CPU slot (slot 0)
    if (selectedSlot === slot) return 'bg-yellow-600'; // Selected slot
    if (slotAssignments[slot]) return 'bg-green-600'; // Occupied
    return 'bg-gray-700'; // Empty
  };

  const getSlotLabel = (slot: number) => {
    if (slot === 0) return 'CPU';
    if (slotAssignments[slot]) {
      const card = slotAssignments[slot];
      return card.type.charAt(0).toUpperCase() + card.type.slice(1);
    }
    return `${slot}`;
  };

  const renderSlot = (slot: number) => {
    const actualSlot = slot === 0 ? 0 : slot; // Keep CPU as 0, others as their actual numbers
    const displaySlot = slot === 0 ? 'CPU' : slot; // Display CPU or slot number
    
    return (
      <div
        key={slot}
        className={`
          relative h-12 border border-gray-600 rounded cursor-pointer
          flex items-center justify-center text-white text-sm font-medium
          transition-all hover:border-red-600 hover:bg-opacity-80
          ${getSlotColor(actualSlot)}
          ${slot === 0 ? 'cursor-not-allowed' : ''}
          ${selectedSlot === actualSlot ? 'ring-2 ring-yellow-400' : ''}
        `}
        onClick={() => slot !== 0 && onSlotClick(actualSlot)}
        title={slotAssignments[actualSlot]?.name || (slot === 0 ? 'CPU (Fixed)' : `Slot ${slot} - Click to add card`)}
      >
        {slot === 0 && <Cpu className="h-4 w-4 mr-1" />}
        {getSlotLabel(actualSlot)}
        
        {/* Clear button for occupied slots */}
        {slot !== 0 && slotAssignments[actualSlot] && (
          <Button
            size="sm"
            variant="ghost"
            className="absolute -top-2 -right-2 h-5 w-5 p-0 bg-red-600 hover:bg-red-700 text-white rounded-full"
            onClick={(e) => {
              e.stopPropagation();
              onSlotClear(actualSlot);
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
    // Create slots array: CPU (0) + numbered slots (1 to chassis.slots-1)
    const slots = [0, ...Array.from({ length: chassis.slots - 1 }, (_, i) => i + 1)];
    
    // Different layouts based on chassis type
    if (chassis.type === 'LTX') {
      // 14 slots total: CPU + 13 numbered slots in 2 rows
      return (
        <div className="space-y-2">
          <div className="grid grid-cols-7 gap-2">
            {slots.slice(0, 7).map(renderSlot)}
          </div>
          <div className="grid grid-cols-7 gap-2">
            {slots.slice(7, 14).map(renderSlot)}
          </div>
        </div>
      );
    } else if (chassis.type === 'MTX') {
      // 7 slots total: CPU + 6 numbered slots in single row
      return (
        <div className="grid grid-cols-7 gap-2">
          {slots.map(renderSlot)}
        </div>
      );
    } else {
      // STX: 4 slots total: CPU + 3 numbered slots in single row
      return (
        <div className="grid grid-cols-4 gap-2">
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


import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Level2Product, Level3Product, BOMItem } from '@/types/product';
import { Plus, X } from 'lucide-react';
import { productDataService } from '@/services/productDataService';

interface RackVisualizerProps {
  chassis: Level2Product;
  bomItems: BOMItem[];
  onAddCard: (slot: number) => void;
  onRemoveCard: (itemId: string) => void;
}

const RackVisualizer = ({ chassis, bomItems, onAddCard, onRemoveCard }: RackVisualizerProps) => {
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const getSlotConfiguration = () => {
    const config = productDataService.getChassisSlotConfiguration(chassis.id);
    return config || { totalSlots: 0, usableSlots: 0, layout: 'Unknown', slotNumbers: [] };
  };

  const slotConfig = getSlotConfiguration();

  const getSlotOccupant = (slotNumber: number) => {
    return bomItems.find(item => item.slot === slotNumber);
  };

  const isSlotUsable = (slotNumber: number) => {
    // Slot 0 is typically reserved for controller in QTMS systems
    if (slotNumber === 0) return false;
    
    // Check if slot is within usable range
    return slotNumber <= slotConfig.usableSlots;
  };

  const getSlotTypeInfo = (slot: number) => {
    if (slot === 0) {
      return {
        type: 'Controller',
        color: 'bg-purple-600',
        textColor: 'text-white',
        description: 'System Controller (Reserved)'
      };
    }
    
    const occupant = getSlotOccupant(slot);
    if (occupant) {
      const typeColors = {
        'Relay': { color: 'bg-red-500', textColor: 'text-white' },
        'Analog': { color: 'bg-blue-500', textColor: 'text-white' },
        'Fiber': { color: 'bg-green-500', textColor: 'text-white' },
        'Display': { color: 'bg-yellow-500', textColor: 'text-black' },
        'Digital': { color: 'bg-indigo-500', textColor: 'text-white' },
        'Communication': { color: 'bg-pink-500', textColor: 'text-white' },
        'Bushing': { color: 'bg-orange-500', textColor: 'text-white' }
      };
      
      const typeInfo = typeColors[occupant.product.type as keyof typeof typeColors] || 
                      { color: 'bg-gray-500', textColor: 'text-white' };
      
      return {
        type: occupant.product.type,
        color: typeInfo.color,
        textColor: typeInfo.textColor,
        description: occupant.product.name
      };
    }
    
    return {
      type: 'Empty',
      color: 'bg-gray-800',
      textColor: 'text-gray-400',
      description: 'Empty Slot'
    };
  };

  const renderSlotGrid = () => {
    if (chassis.type === 'LTX') {
      // LTX: 2-row layout (8-14 top row, 0-7 bottom row)
      return (
        <div className="space-y-2">
          {/* Top Row (8-14) */}
          <div className="flex gap-1 justify-center">
            {[8, 9, 10, 11, 12, 13, 14].map(slot => renderSlot(slot))}
          </div>
          {/* Bottom Row (0-7) */}
          <div className="flex gap-1 justify-center">
            {[0, 1, 2, 3, 4, 5, 6, 7].map(slot => renderSlot(slot))}
          </div>
        </div>
      );
    } else {
      // MTX and STX: Single row
      const maxSlot = chassis.type === 'MTX' ? 7 : 4;
      return (
        <div className="flex gap-1 justify-center flex-wrap">
          {Array.from({ length: maxSlot + 1 }, (_, i) => i).map(slot => renderSlot(slot))}
        </div>
      );
    }
  };

  const renderSlot = (slotNumber: number) => {
    const slotInfo = getSlotTypeInfo(slotNumber);
    const isUsable = isSlotUsable(slotNumber);
    const occupant = getSlotOccupant(slotNumber);
    const isSelected = selectedSlot === slotNumber;

    return (
      <div
        key={slotNumber}
        className={`
          relative w-16 h-20 rounded-lg border-2 transition-all cursor-pointer
          ${isSelected ? 'border-red-500 shadow-lg shadow-red-500/20' : 'border-gray-600'}
          ${slotInfo.color} ${slotInfo.textColor}
          ${!isUsable ? 'opacity-60' : 'hover:shadow-md'}
        `}
        onClick={() => {
          if (isUsable && !occupant) {
            setSelectedSlot(slotNumber);
            onAddCard(slotNumber);
          }
        }}
      >
        {/* Slot Number */}
        <div className="absolute top-1 left-1 text-xs font-bold bg-black/20 px-1 rounded">
          {slotNumber}
        </div>

        {/* Remove Button */}
        {occupant && (
          <button
            className="absolute top-1 right-1 w-4 h-4 bg-red-500 hover:bg-red-600 rounded-full flex items-center justify-center text-white text-xs"
            onClick={(e) => {
              e.stopPropagation();
              onRemoveCard(occupant.id);
            }}
          >
            <X className="w-2 h-2" />
          </button>
        )}

        {/* Slot Content */}
        <div className="flex flex-col items-center justify-center h-full p-1 text-center">
          {occupant ? (
            <>
              <div className="text-xs font-medium truncate w-full">
                {occupant.product.type}
              </div>
              <div className="text-xs opacity-80 truncate w-full">
                {occupant.quantity}x
              </div>
            </>
          ) : isUsable ? (
            <Plus className="w-6 h-6 opacity-60" />
          ) : (
            <div className="text-xs">
              {slotNumber === 0 ? 'CTRL' : 'N/A'}
            </div>
          )}
        </div>

        {/* Slot requirement indicator for double-wide cards */}
        {occupant && occupant.product.specifications?.slotRequirement === 2 && (
          <div className="absolute -right-4 top-0 w-4 h-full bg-gray-700 rounded-r-lg border-l-2 border-gray-600">
            <div className="flex items-center justify-center h-full text-xs text-gray-400 transform rotate-90">
              2W
            </div>
          </div>
        )}
      </div>
    );
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div>
            <CardTitle className="text-white flex items-center space-x-2">
              <span>{chassis.name} - Slot Configuration</span>
              <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                {chassis.type}
              </Badge>
            </CardTitle>
            <p className="text-gray-400 text-sm mt-1">
              {slotConfig.layout} • {slotConfig.usableSlots} usable slots
            </p>
          </div>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-6">
        {/* Slot Grid */}
        <div className="bg-gray-800/50 p-6 rounded-lg">
          {renderSlotGrid()}
        </div>

        {/* Legend */}
        <div className="space-y-3">
          <h4 className="text-white font-medium">Card Types</h4>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-xs">
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-red-500 rounded"></div>
              <span className="text-gray-300">Relay</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-blue-500 rounded"></div>
              <span className="text-gray-300">Analog</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-green-500 rounded"></div>
              <span className="text-gray-300">Fiber</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-yellow-500 rounded"></div>
              <span className="text-gray-300">Display</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-indigo-500 rounded"></div>
              <span className="text-gray-300">Digital</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-pink-500 rounded"></div>
              <span className="text-gray-300">Comm</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-orange-500 rounded"></div>
              <span className="text-gray-300">Bushing</span>
            </div>
            <div className="flex items-center space-x-2">
              <div className="w-3 h-3 bg-purple-600 rounded"></div>
              <span className="text-gray-300">Controller</span>
            </div>
          </div>
        </div>

        {/* Configuration Summary */}
        <div className="bg-gray-800/30 p-4 rounded-lg">
          <div className="grid grid-cols-2 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Occupied Slots:</span>
              <span className="text-white font-medium ml-2">
                {bomItems.filter(item => item.slot).length} / {slotConfig.usableSlots}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Available Slots:</span>
              <span className="text-white font-medium ml-2">
                {slotConfig.usableSlots - bomItems.filter(item => item.slot).length}
              </span>
            </div>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default RackVisualizer;


import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { X } from "lucide-react";

interface SlotCardSelectorProps {
  chassis: any;
  slot: number;
  onCardSelect: (card: any, slot: number) => void;
  onClose: () => void;
  canSeePrices: boolean;
}

const SlotCardSelector = ({ chassis, slot, onCardSelect, onClose, canSeePrices }: SlotCardSelectorProps) => {
  const availableCards = [
    {
      id: 'relay-card-1',
      name: 'Basic Relay Card',
      parentProductId: chassis.id,
      type: 'relay' as const,
      description: '8-channel relay output card',
      price: 850,
      enabled: true,
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX'],
      specifications: {
        channels: 8,
        voltage: '24VDC',
        current: '2A per channel'
      },
      partNumber: 'RLY-8CH-001'
    },
    {
      id: 'analog-card-1',
      name: 'Multi-Input Analog Card',
      parentProductId: chassis.id,
      type: 'analog' as const,
      description: 'High-precision analog input card',
      price: 1250,
      enabled: true,
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX'],
      specifications: {
        channels: 16,
        resolution: '16-bit',
        inputRange: '±10V, 4-20mA'
      },
      partNumber: 'ANA-16CH-001'
    },
    {
      id: 'fiber-card-1',
      name: 'Fiber Optic Communication Card',
      parentProductId: chassis.id,
      type: 'fiber' as const,
      description: 'High-speed fiber optic interface',
      price: 1850,
      enabled: true,
      slotRequirement: 1,
      compatibleChassis: ['LTX', 'MTX', 'STX'],
      specifications: {
        ports: 2,
        speed: '1Gbps',
        connector: 'LC'
      },
      partNumber: 'FIB-2P-001'
    },
    {
      id: 'display-card-1',
      name: 'Local Display Interface',
      parentProductId: chassis.id,
      type: 'display' as const,
      description: 'Local HMI display interface card',
      price: 950,
      enabled: true,
      slotRequirement: 1,
      compatibleChassis: ['LTX'],
      specifications: {
        display: 'LCD',
        resolution: '320x240',
        backlight: 'LED'
      },
      partNumber: 'DIS-LCD-001'
    },
    {
      id: 'bushing-card-1',
      name: 'Bushing Monitoring Card',
      parentProductId: chassis.id,
      type: 'bushing' as const,
      description: 'Transformer bushing monitoring interface',
      price: 2250,
      enabled: true,
      slotRequirement: 2,
      compatibleChassis: ['LTX', 'MTX', 'STX'],
      specifications: {
        channels: 12,
        measurement: 'Capacitance & Tan Delta'
      },
      partNumber: 'BSH-12CH-001'
    }
  ];

  // Filter cards based on chassis compatibility and slot restrictions
  const compatibleCards = availableCards.filter(card => {
    if (!card.compatibleChassis.includes(chassis.type)) return false;
    
    // Special handling for display cards in LTX chassis
    if (chassis.type === 'LTX' && slot === 8) {
      return card.type === 'display';
    }
    
    // Prevent display cards from being placed in non-slot-8 positions in LTX
    if (chassis.type === 'LTX' && card.type === 'display' && slot !== 8) {
      return false;
    }
    
    return true;
  });

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-4xl bg-gray-900 border-gray-800 text-white">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            Select Card for Slot {slot}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {compatibleCards.map((card) => (
            <Card key={card.id} className="bg-gray-800 border-gray-700 hover:border-red-600 transition-all cursor-pointer">
              <CardHeader>
                <CardTitle className="text-white text-lg">{card.name}</CardTitle>
                <CardDescription className="text-gray-400">
                  {card.description}
                </CardDescription>
                <div className="flex gap-2">
                  <Badge variant="outline" className="text-white border-gray-500">
                    {card.slotRequirement} slot{card.slotRequirement > 1 ? 's' : ''}
                  </Badge>
                  <Badge variant="outline" className="text-white border-gray-500">
                    {card.type}
                  </Badge>
                </div>
              </CardHeader>
              <CardContent>
                <div className="space-y-2 mb-4">
                  {Object.entries(card.specifications).map(([key, value]) => (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-400 capitalize">{key}:</span>
                      <span className="text-white">{value}</span>
                    </div>
                  ))}
                </div>
                
                <div className="flex justify-between items-center mb-4">
                  <span className="text-white font-bold">
                    {canSeePrices ? `$${card.price.toLocaleString()}` : '—'}
                  </span>
                  <span className="text-gray-400 text-xs">{card.partNumber}</span>
                </div>
                
                <Button 
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => onCardSelect(card, slot)}
                >
                  Select Card
                </Button>
              </CardContent>
            </Card>
          ))}
        </div>
        
        {compatibleCards.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No compatible cards available for this slot
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SlotCardSelector;

import { useState } from "react";
import { Chassis, Card as ProductCard } from "@/types/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X } from "lucide-react";

interface SlotCardSelectorProps {
  chassis: Chassis;
  slot: number;
  onCardSelect: (card: ProductCard, slot: number) => void;
  onClose: () => void;
  canSeePrices: boolean;
}

const SlotCardSelector = ({ chassis, slot, onCardSelect, onClose, canSeePrices }: SlotCardSelectorProps) => {
  const [selectedCard, setSelectedCard] = useState<ProductCard | null>(null);

  const getAvailableCards = (): ProductCard[] => {
    const allCards: ProductCard[] = [
      {
        id: 'relay-card-1',
        name: 'Relay Output Card',
        type: 'relay',
        description: '8-channel relay output card for control applications',
        price: 850,
        slotRequirement: 1,
        compatibleChassis: ['LTX', 'MTX', 'STX'],
        specifications: { channels: 8, voltage: '250VAC', current: '5A' },
        partNumber: 'ROC-8CH-001',
        enabled: true,
        hasQuantitySelection: false
      },
      {
        id: 'analog-card-1',
        name: 'Analog Input Card',
        type: 'analog',
        description: '8-channel analog input card for sensor monitoring',
        price: 1200,
        slotRequirement: 1,
        compatibleChassis: ['LTX', 'MTX', 'STX'],
        specifications: { channels: 8, resolution: '16-bit', inputRange: '0-10V' },
        partNumber: 'AIC-8CH-001',
        enabled: true,
        hasQuantitySelection: false
      },
      {
        id: 'fiber-card-1',
        name: 'Fiber Optic Card',
        type: 'fiber',
        description: 'High-speed fiber optic communication card',
        price: 1500,
        slotRequirement: 1,
        compatibleChassis: ['LTX', 'MTX', 'STX'],
        specifications: { ports: 2, speed: '1Gbps', connector: 'LC' },
        partNumber: 'FOC-2P-001',
        enabled: true,
        hasQuantitySelection: false
      },
      {
        id: 'display-card-1',
        name: 'Display Interface Card',
        type: 'display',
        description: 'Local display and user interface card',
        price: 650,
        slotRequirement: 1,
        compatibleChassis: ['LTX', 'MTX', 'STX'],
        specifications: { display: 'LCD', resolution: '320x240', backlight: 'LED' },
        partNumber: 'DIC-LCD-001',
        enabled: true,
        hasQuantitySelection: false
      },
      {
        id: 'bushing-card-1',
        name: 'Bushing Monitor Card',
        type: 'bushing',
        description: 'Transformer bushing monitoring card (requires 2 slots)',
        price: 2200,
        slotRequirement: 2,
        compatibleChassis: ['LTX', 'MTX', 'STX'],
        specifications: { channels: 6, measurement: 'Capacitance & Power Factor' },
        partNumber: 'BMC-6CH-001',
        enabled: true,
        hasQuantitySelection: false
      }
    ];

    // Filter cards based on chassis compatibility
    let compatibleCards = allCards.filter(card => 
      card.compatibleChassis.includes(chassis.type)
    );

    // For LTX chassis slot 8, only allow display cards
    if (chassis.type === 'LTX' && slot === 8) {
      compatibleCards = compatibleCards.filter(card => card.type === 'display');
    }

    return compatibleCards;
  };

  const availableCards = getAvailableCards();

  const handleCardSelect = (card: ProductCard) => {
    onCardSelect(card, slot);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">
              Select Card for Slot {slot} - {chassis.name}
              {chassis.type === 'LTX' && slot === 8 && (
                <span className="text-yellow-400 text-sm ml-2">(Display Cards Only)</span>
              )}
            </DialogTitle>
            <Button
              variant="ghost"
              size="sm"
              onClick={onClose}
              className="text-gray-400 hover:text-white"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </DialogHeader>
        
        <div className="space-y-4">
          {availableCards.length === 0 ? (
            <div className="text-center py-8">
              <p className="text-gray-400">No compatible cards available for this slot.</p>
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {availableCards.map((card) => (
                <Card 
                  key={card.id}
                  className={`bg-gray-800 border-gray-700 cursor-pointer transition-all hover:border-red-600 ${
                    selectedCard?.id === card.id ? 'border-red-600 bg-red-900/20' : ''
                  }`}
                  onClick={() => setSelectedCard(card)}
                >
                  <CardHeader>
                    <div className="flex justify-between items-start">
                      <div>
                        <CardTitle className="text-white text-lg">{card.name}</CardTitle>
                        <CardDescription className="text-gray-400">
                          {card.type.charAt(0).toUpperCase() + card.type.slice(1)} Card
                        </CardDescription>
                      </div>
                      <Badge 
                        variant="outline" 
                        className={`text-xs text-white border-gray-500 ${
                          card.slotRequirement > 1 ? 'bg-orange-900/20 border-orange-500' : ''
                        }`}
                      >
                        {card.slotRequirement} slot{card.slotRequirement > 1 ? 's' : ''}
                      </Badge>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <p className="text-gray-400 text-sm mb-4">{card.description}</p>
                    
                    <div className="space-y-2 mb-4">
                      <h4 className="text-white font-medium text-sm">Specifications:</h4>
                      <div className="text-xs text-gray-400 space-y-1">
                        {Object.entries(card.specifications).map(([key, value]) => (
                          <div key={key} className="flex justify-between">
                            <span>{key}:</span>
                            <span className="text-white">{value}</span>
                          </div>
                        ))}
                      </div>
                    </div>
                    
                    {/* Part Number */}
                    {card.partNumber && (
                      <div className="mb-4 p-2 bg-gray-700 rounded">
                        <p className="text-xs text-gray-400">Part Number:</p>
                        <p className="text-xs font-mono text-white">{card.partNumber}</p>
                      </div>
                    )}
                    
                    <div className="flex justify-between items-center mb-4">
                      <span className="text-white font-bold">
                        {canSeePrices ? `$${card.price.toLocaleString()}` : '—'}
                      </span>
                    </div>
                    
                    <Button 
                      className="w-full bg-red-600 hover:bg-red-700 text-white"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleCardSelect(card);
                      }}
                    >
                      Add to Slot {slot}
                    </Button>
                  </CardContent>
                </Card>
              ))}
            </div>
          )}
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SlotCardSelector;

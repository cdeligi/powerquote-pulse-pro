
import { useState } from "react";
import { Chassis, Card as ProductCard } from "@/types/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { X, Plus } from "lucide-react";

interface SlotCardSelectorProps {
  chassis: Chassis;
  slot: number;
  onCardSelect: (card: ProductCard, slot: number) => void;
  onClose: () => void;
  canSeePrices: boolean;
}

const SlotCardSelector = ({ chassis, slot, onCardSelect, onClose, canSeePrices }: SlotCardSelectorProps) => {
  const [selectedCard, setSelectedCard] = useState<ProductCard | null>(null);

  const cardLibrary: ProductCard[] = [
    {
      id: 'relay-8in-2out',
      name: 'Relay Protection Card',
      type: 'relay',
      description: '8 digital inputs + 2 analog outputs for comprehensive protection',
      price: 2500,
      slotRequirement: 1,
      compatibleChassis: ['ltx-6u', 'mtx-3u', 'stx-1.5u'],
      specifications: {
        inputs: 8,
        outputs: 2,
        protocols: ['DNP3', 'IEC 61850']
      }
    },
    {
      id: 'analog-8ch',
      name: 'Analog Input Card',
      type: 'analog',
      description: '8-channel analog input with configurable input types',
      price: 1800,
      slotRequirement: 1,
      compatibleChassis: ['ltx-6u', 'mtx-3u', 'stx-1.5u'],
      specifications: {
        channels: 8,
        inputTypes: ['4-20mA', 'CT', 'RTD', 'Thermocouple']
      }
    },
    {
      id: 'fiber-4port',
      name: 'Fiber Optic Card (4-port)',
      type: 'fiber',
      description: '4-port fiber optic communication card',
      price: 3200,
      slotRequirement: 1,
      compatibleChassis: ['ltx-6u', 'mtx-3u', 'stx-1.5u'],
      specifications: {
        ports: 4,
        protocols: ['IEC 61850', 'GOOSE']
      }
    },
    {
      id: 'fiber-6port',
      name: 'Fiber Optic Card (6-port)',
      type: 'fiber',
      description: '6-port fiber optic communication card',
      price: 4200,
      slotRequirement: 1,
      compatibleChassis: ['ltx-6u', 'mtx-3u'],
      specifications: {
        ports: 6,
        protocols: ['IEC 61850', 'GOOSE']
      }
    },
    {
      id: 'display-oncard',
      name: 'On-Card Display Module',
      type: 'display',
      description: 'Integrated display module for local monitoring',
      price: 1200,
      slotRequirement: 1,
      compatibleChassis: ['ltx-6u', 'mtx-3u', 'stx-1.5u'],
      specifications: {
        type: 'LCD',
        size: '3.5"',
        resolution: '320x240'
      }
    },
    {
      id: 'bushing-monitor',
      name: 'Bushing Monitoring Module',
      type: 'bushing',
      description: 'Dual-slot bushing monitoring for transformer health',
      price: 5800,
      slotRequirement: 2,
      compatibleChassis: ['ltx-6u'],
      specifications: {
        channels: 6,
        measurements: ['Capacitance', 'Tan Delta', 'Temperature']
      }
    }
  ];

  const getCompatibleCards = () => {
    return cardLibrary.filter(card => 
      card.compatibleChassis.includes(chassis.id)
    );
  };

  const handleCardSelect = (card: ProductCard) => {
    onCardSelect(card, slot);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <div className="flex items-center justify-between">
            <DialogTitle className="text-white">Select Card for Slot {slot}</DialogTitle>
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
          <p className="text-gray-400">Choose a card to install in slot {slot} of your {chassis.name}</p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {getCompatibleCards().map((card) => (
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
                        {card.slotRequirement} slot{card.slotRequirement > 1 ? 's' : ''} required
                      </CardDescription>
                    </div>
                    <Badge variant="outline" className="text-xs capitalize">
                      {card.type}
                    </Badge>
                  </div>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm mb-4">{card.description}</p>
                  
                  <div className="space-y-2 mb-4">
                    {Object.entries(card.specifications).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-400 capitalize">{key}:</span>
                        <span className="text-white">
                          {Array.isArray(value) ? value.join(', ') : value}
                        </span>
                      </div>
                    ))}
                  </div>
                  
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-white font-bold">
                      {canSeePrices ? `$${card.price.toLocaleString()}` : '—'}
                    </span>
                  </div>
                  
                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => handleCardSelect(card)}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Install in Slot {slot}
                  </Button>
                </CardContent>
              </Card>
            ))}
          </div>
          
          <div className="flex justify-end space-x-2 pt-4 border-t border-gray-700">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default SlotCardSelector;

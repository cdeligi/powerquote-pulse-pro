
import { useState } from "react";
import { Chassis, Card as ProductCard } from "@/types/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";

interface CardLibraryProps {
  chassis: Chassis;
  onCardSelect: (card: ProductCard, slot?: number) => void;
  canSeePrices: boolean;
}

const CardLibrary = ({ chassis, onCardSelect, canSeePrices }: CardLibraryProps) => {
  const [selectedSlot, setSelectedSlot] = useState<number>(2); // Default to slot 2 (CPU is always slot 1)

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
      compatibleChassis: ['ltx-6u'], // Only compatible with LTX
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

  const groupCardsByType = () => {
    const compatible = getCompatibleCards();
    return {
      relay: compatible.filter(card => card.type === 'relay'),
      analog: compatible.filter(card => card.type === 'analog'),
      fiber: compatible.filter(card => card.type === 'fiber'),
      display: compatible.filter(card => card.type === 'display'),
      bushing: compatible.filter(card => card.type === 'bushing')
    };
  };

  const cardGroups = groupCardsByType();

  const renderCardGrid = (cards: ProductCard[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map((card) => (
        <Card key={card.id} className="bg-gray-900 border-gray-800">
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
              onClick={() => onCardSelect(card, selectedSlot)}
            >
              <Plus className="mr-2 h-4 w-4" />
              Add to BOM
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Card Library</CardTitle>
          <CardDescription className="text-gray-400">
            Compatible cards for {chassis.name}
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs defaultValue="relay" className="w-full">
        <TabsList className="grid w-full grid-cols-5 bg-gray-800">
          <TabsTrigger value="relay" className="text-white data-[state=active]:bg-red-600">
            Relay ({cardGroups.relay.length})
          </TabsTrigger>
          <TabsTrigger value="analog" className="text-white data-[state=active]:bg-red-600">
            Analog ({cardGroups.analog.length})
          </TabsTrigger>
          <TabsTrigger value="fiber" className="text-white data-[state=active]:bg-red-600">
            Fiber ({cardGroups.fiber.length})
          </TabsTrigger>
          <TabsTrigger value="display" className="text-white data-[state=active]:bg-red-600">
            Display ({cardGroups.display.length})
          </TabsTrigger>
          <TabsTrigger value="bushing" className="text-white data-[state=active]:bg-red-600">
            Bushing ({cardGroups.bushing.length})
          </TabsTrigger>
        </TabsList>
        
        <TabsContent value="relay">
          {renderCardGrid(cardGroups.relay)}
        </TabsContent>
        
        <TabsContent value="analog">
          {renderCardGrid(cardGroups.analog)}
        </TabsContent>
        
        <TabsContent value="fiber">
          {renderCardGrid(cardGroups.fiber)}
        </TabsContent>
        
        <TabsContent value="display">
          {renderCardGrid(cardGroups.display)}
        </TabsContent>
        
        <TabsContent value="bushing">
          {renderCardGrid(cardGroups.bushing)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CardLibrary;

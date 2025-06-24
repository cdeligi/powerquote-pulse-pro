
import { useState } from "react";
import { Level2Product, Level3Product } from "@/types/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Plus } from "lucide-react";
import { productDataService } from "@/services/productDataService";

interface CardLibraryProps {
  chassis: Level2Product;
  onCardSelect: (card: Level3Product, slot?: number) => void;
  canSeePrices: boolean;
}

const CardLibrary = ({ chassis, onCardSelect, canSeePrices }: CardLibraryProps) => {
  const [selectedSlot, setSelectedSlot] = useState<number>(2);

  const getCompatibleCards = () => {
    const allLevel3Products = productDataService.getLevel3Products();
    return allLevel3Products.filter(card => 
      card.enabled && productDataService.isLevel3AvailableForLevel2(card, chassis)
    );
  };

  const groupCardsByType = () => {
    const compatible = getCompatibleCards();
    return {
      relay: compatible.filter(card => card.name.toLowerCase().includes('relay')),
      analog: compatible.filter(card => card.name.toLowerCase().includes('analog')),
      fiber: compatible.filter(card => card.name.toLowerCase().includes('fiber')),
      display: compatible.filter(card => card.name.toLowerCase().includes('display')),
      digital: compatible.filter(card => card.name.toLowerCase().includes('digital')),
      other: compatible.filter(card => 
        !card.name.toLowerCase().includes('relay') &&
        !card.name.toLowerCase().includes('analog') &&
        !card.name.toLowerCase().includes('fiber') &&
        !card.name.toLowerCase().includes('display') &&
        !card.name.toLowerCase().includes('digital')
      )
    };
  };

  const cardGroups = groupCardsByType();

  const renderCardGrid = (cards: Level3Product[]) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map((card) => (
        <Card key={card.id} className="bg-gray-900 border-gray-800">
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-white text-lg">{card.name}</CardTitle>
                <CardDescription className="text-gray-400">
                  {card.specifications?.slotRequirement || 1} slot{(card.specifications?.slotRequirement || 1) > 1 ? 's' : ''} required
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
              {card.specifications && Object.entries(card.specifications).map(([key, value]) => (
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

  const hasCards = Object.values(cardGroups).some(group => group.length > 0);

  if (!hasCards) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">
          No cards available for {chassis.name}. 
          Please create Level 3 products for this category in the Admin Panel.
        </p>
      </div>
    );
  }

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
        <TabsList className="grid w-full grid-cols-6 bg-gray-800">
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
          <TabsTrigger value="digital" className="text-white data-[state=active]:bg-red-600">
            Digital ({cardGroups.digital.length})
          </TabsTrigger>
          <TabsTrigger value="other" className="text-white data-[state=active]:bg-red-600">
            Other ({cardGroups.other.length})
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
        
        <TabsContent value="digital">
          {renderCardGrid(cardGroups.digital)}
        </TabsContent>
        
        <TabsContent value="other">
          {renderCardGrid(cardGroups.other)}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default CardLibrary;

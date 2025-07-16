
import { useState, useEffect } from "react";
import { Level2Product, Level3Product } from "@/types/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Settings } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { productDataService } from "@/services/productDataService";
import { isBushingCard } from "@/utils/bushingValidation";

interface CardLibraryProps {
  chassis: Level2Product;
  onCardSelect: (card: Level3Product) => void;
  canSeePrices: boolean;
}

const CardLibrary = ({ chassis, onCardSelect, canSeePrices }: CardLibraryProps) => {
  const [allCards, setAllCards] = useState<Level3Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadCards = async () => {
      try {
        setLoading(true);
        
        // Initialize the service first
        await productDataService.initialize();
        
        // Get all cards for this chassis from productDataService using proper relationships
        const cardsForChassis = productDataService.getLevel3ProductsForLevel2(chassis.id);
        
        console.log('CardLibrary: Loaded cards for chassis', chassis.id, ':', cardsForChassis);
        setAllCards(cardsForChassis.filter(card => card.enabled !== false));
      } catch (error) {
        console.error('Error loading cards:', error);
        // Fallback to sync method
        try {
          const syncCards = productDataService.getLevel3ProductsForLevel2(chassis.id);
          setAllCards(syncCards.filter(card => card.enabled !== false));
        } catch (syncError) {
          console.error('Sync fallback failed:', syncError);
          setAllCards([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadCards();
  }, [chassis.id]);

  // Group cards by type
  const cardsByType = {
    relay: allCards.filter(card => card.type === 'relay'),
    analog: allCards.filter(card => card.type === 'analog' || card.name.toLowerCase().includes('analog')),
    bushing: allCards.filter(card => card.type === 'bushing' || card.name.toLowerCase().includes('bushing')),
    fiber: allCards.filter(card => card.type === 'fiber'),
    display: allCards.filter(card => card.type === 'display'),
    communication: allCards.filter(card => card.type === 'communication' || card.name.toLowerCase().includes('communication')),
    digital: allCards.filter(card => card.type === 'digital' || card.name.toLowerCase().includes('digital'))
  };

  const needsConfiguration = (card: Level3Product) => {
    return card.name.toLowerCase().includes('analog') || card.name.toLowerCase().includes('bushing');
  };

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Card Library</CardTitle>
          <CardDescription className="text-gray-400">
            Loading cards for your {chassis.name}...
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading available cards...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const renderCardGrid = (cards: Level3Product[]) => {
    if (cards.length === 0) {
      return (
        <div className="text-center py-8 text-gray-400">
          No cards available for this chassis type. Please create Level 3 products in the Admin Panel.
        </div>
      );
    }

    return (
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {cards.map((card) => (
          <Card key={card.id} className="bg-gray-800 border-gray-700 hover:border-red-600 transition-all">
            <CardHeader>
              <CardTitle className="text-white text-lg flex items-center justify-between">
                {card.name}
                {needsConfiguration(card) && (
                  <Settings className="h-4 w-4 text-blue-400" />
                )}
              </CardTitle>
              <CardDescription className="text-gray-400">
                {card.description}
              </CardDescription>
              <div className="flex gap-2 flex-wrap">
                <Badge variant="outline" className="text-white border-gray-500">
                  {card.specifications?.slotRequirement || 1} slot{(card.specifications?.slotRequirement || 1) > 1 ? 's' : ''}
                </Badge>
                <Badge variant="outline" className="text-white border-gray-500">
                  {card.type}
                </Badge>
                {card.specifications?.inputs && (
                  <Badge variant="outline" className="text-white border-gray-500">
                    {card.specifications.inputs} inputs
                  </Badge>
                )}
                {card.specifications?.channels && (
                  <Badge variant="outline" className="text-white border-gray-500">
                    {card.specifications.channels} channels
                  </Badge>
                )}
                {needsConfiguration(card) && (
                  <Badge variant="outline" className="text-blue-400 border-blue-400">
                    Config Required
                  </Badge>
                )}
                {isBushingCard(card as any) && (
                  <Badge variant="outline" className="text-orange-400 border-orange-400">
                    2-Slot Card
                  </Badge>
                )}
                {card.type === 'display' && chassis.type === 'LTX' && (
                  <Badge variant="outline" className="text-purple-400 border-purple-400">
                    Slot 8 Only
                  </Badge>
                )}
              </div>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 mb-4">
                {card.specifications && Object.entries(card.specifications).map(([key, value]) => {
                  if (key === 'slotRequirement' || key === 'compatibleChassis') return null;
                  return (
                    <div key={key} className="flex justify-between text-sm">
                      <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1')}:</span>
                      <span className="text-white">{Array.isArray(value) ? value.join(', ') : String(value)}</span>
                    </div>
                  );
                })}
              </div>
              
              <div className="flex justify-between items-center mb-4">
                <span className="text-white font-bold">
                  {canSeePrices ? `$${card.price?.toLocaleString() || '0'}` : '—'}
                </span>
                <span className="text-gray-400 text-xs">{card.partNumber}</span>
              </div>
              
              <Button 
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                onClick={() => onCardSelect(card)}
              >
                {needsConfiguration(card) ? 'Configure & Add' : 'Add to Rack'}
              </Button>
            </CardContent>
          </Card>
        ))}
      </div>
    );
  };

  const getTabCount = (cards: Level3Product[]) => {
    return cards.length > 0 ? ` (${cards.length})` : '';
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Card Library</CardTitle>
        <CardDescription className="text-gray-400">
          Browse and select cards for your {chassis.name}
          {allCards.length > 0 ? ` (${allCards.length} available)` : ' (No cards available)'}
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="relay" className="w-full">
          <TabsList className="grid w-full grid-cols-4 md:grid-cols-7 bg-gray-800">
            <TabsTrigger value="relay" className="text-white data-[state=active]:bg-red-600">
              Relay{getTabCount(cardsByType.relay)}
            </TabsTrigger>
            <TabsTrigger value="analog" className="text-white data-[state=active]:bg-red-600">
              Analog{getTabCount(cardsByType.analog)}
            </TabsTrigger>
            <TabsTrigger value="bushing" className="text-white data-[state=active]:bg-red-600">
              Bushing{getTabCount(cardsByType.bushing)}
            </TabsTrigger>
            <TabsTrigger value="fiber" className="text-white data-[state=active]:bg-red-600">
              Fiber{getTabCount(cardsByType.fiber)}
            </TabsTrigger>
            {chassis.type === 'LTX' && (
              <TabsTrigger value="display" className="text-white data-[state=active]:bg-red-600">
                Display{getTabCount(cardsByType.display)}
              </TabsTrigger>
            )}
            <TabsTrigger value="communication" className="text-white data-[state=active]:bg-red-600">
              Comm{getTabCount(cardsByType.communication)}
            </TabsTrigger>
            <TabsTrigger value="digital" className="text-white data-[state=active]:bg-red-600">
              Digital{getTabCount(cardsByType.digital)}
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="relay" className="mt-6">
            {renderCardGrid(cardsByType.relay)}
          </TabsContent>
          
          <TabsContent value="analog" className="mt-6">
            {renderCardGrid(cardsByType.analog)}
          </TabsContent>
          
          <TabsContent value="bushing" className="mt-6">
            {renderCardGrid(cardsByType.bushing)}
          </TabsContent>
          
          <TabsContent value="fiber" className="mt-6">
            {renderCardGrid(cardsByType.fiber)}
          </TabsContent>
          
          {chassis.type === 'LTX' && (
            <TabsContent value="display" className="mt-6">
              {renderCardGrid(cardsByType.display)}
            </TabsContent>
          )}
          
          <TabsContent value="communication" className="mt-6">
            {renderCardGrid(cardsByType.communication)}
          </TabsContent>
          
          <TabsContent value="digital" className="mt-6">
            {renderCardGrid(cardsByType.digital)}
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
};

export default CardLibrary;

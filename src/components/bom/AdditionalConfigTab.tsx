
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Level3Product } from '@/types/product';
import { productDataService } from '@/services/productDataService';
import { Settings, Zap } from 'lucide-react';

interface AdditionalConfigTabProps {
  onCardSelect: (card: Level3Product) => void;
  canSeePrices: boolean;
}

const AdditionalConfigTab = ({ onCardSelect, canSeePrices }: AdditionalConfigTabProps) => {
  const [selectedCardType, setSelectedCardType] = useState<'analog' | 'bushing' | null>(null);

  // Get analog and bushing cards from the product service
  const allCards = productDataService.getLevel3Products();
  const analogCards = allCards.filter(card => 
    card.name.toLowerCase().includes('analog') && card.enabled
  );
  const bushingCards = allCards.filter(card => 
    card.name.toLowerCase().includes('bushing') && card.enabled
  );

  const handleCardSelect = (card: Level3Product) => {
    onCardSelect(card);
    setSelectedCardType(null);
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <Settings className="mr-2 h-5 w-5" />
            Additional Configuration Cards
          </CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 mb-4">
            Configure special cards that require additional setup and customization.
          </p>
          
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <Button
              onClick={() => setSelectedCardType('analog')}
              variant={selectedCardType === 'analog' ? 'default' : 'outline'}
              className="h-auto p-4 flex flex-col items-center space-y-2"
            >
              <Zap className="h-8 w-8" />
              <div className="text-center">
                <div className="font-medium">Analog Cards</div>
                <div className="text-sm text-gray-400">
                  Sensor input configuration
                </div>
              </div>
              <Badge variant="secondary">{analogCards.length} available</Badge>
            </Button>
            
            <Button
              onClick={() => setSelectedCardType('bushing')}
              variant={selectedCardType === 'bushing' ? 'default' : 'outline'}
              className="h-auto p-4 flex flex-col items-center space-y-2"
            >
              <Settings className="h-8 w-8" />
              <div className="text-center">
                <div className="font-medium">Bushing Cards</div>
                <div className="text-sm text-gray-400">
                  Tap configuration
                </div>
              </div>
              <Badge variant="secondary">{bushingCards.length} available</Badge>
            </Button>
          </div>
        </CardContent>
      </Card>

      {/* Analog Cards Section */}
      {selectedCardType === 'analog' && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Zap className="mr-2 h-5 w-5" />
              Analog Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {analogCards.map((card) => (
                <Card key={card.id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-white text-sm font-medium truncate">
                          {card.name}
                        </CardTitle>
                        {card.description && (
                          <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                            {card.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col space-y-1">
                        {card.partNumber && (
                          <Badge variant="outline" className="text-xs text-green-400 border-green-400">
                            {card.partNumber}
                          </Badge>
                        )}
                        {canSeePrices && (
                          <div className="text-white font-bold">
                            ${card.price.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => handleCardSelect(card)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Configure
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Bushing Cards Section */}
      {selectedCardType === 'bushing' && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Bushing Cards
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              {bushingCards.map((card) => (
                <Card key={card.id} className="bg-gray-800 border-gray-700 hover:border-gray-600 transition-colors">
                  <CardHeader className="pb-3">
                    <div className="flex justify-between items-start">
                      <div className="flex-1 min-w-0">
                        <CardTitle className="text-white text-sm font-medium truncate">
                          {card.name}
                        </CardTitle>
                        {card.description && (
                          <p className="text-gray-400 text-xs mt-1 line-clamp-2">
                            {card.description}
                          </p>
                        )}
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent className="pt-0">
                    <div className="flex justify-between items-center">
                      <div className="flex flex-col space-y-1">
                        {card.partNumber && (
                          <Badge variant="outline" className="text-xs text-green-400 border-green-400">
                            {card.partNumber}
                          </Badge>
                        )}
                        {canSeePrices && (
                          <div className="text-white font-bold">
                            ${card.price.toLocaleString()}
                          </div>
                        )}
                      </div>
                      <Button
                        onClick={() => handleCardSelect(card)}
                        size="sm"
                        className="bg-blue-600 hover:bg-blue-700 text-white"
                      >
                        Configure
                      </Button>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default AdditionalConfigTab;

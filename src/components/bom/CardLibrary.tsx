
import { useState } from "react";
import { Level2Product, Level3Product } from "@/types/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Plus, Zap, Cpu, Wifi, Monitor, Hash, MessageSquare, Settings, AlertTriangle } from "lucide-react";
import { productDataService } from "@/services/productDataService";

interface CardLibraryProps {
  chassis: Level2Product;
  onCardSelect: (card: Level3Product, slot?: number) => void;
  canSeePrices: boolean;
  occupiedSlots?: number[];
}

const CardLibrary = ({ chassis, onCardSelect, canSeePrices, occupiedSlots = [] }: CardLibraryProps) => {
  const [selectedSlot, setSelectedSlot] = useState<number>(1);
  const [selectedConfigurations, setSelectedConfigurations] = useState<Record<string, any>>({});

  const getCompatibleCards = () => {
    const allLevel3Products = productDataService.getLevel3Products();
    return allLevel3Products.filter(card => 
      card.enabled && productDataService.isLevel3AvailableForLevel2(card, chassis)
    );
  };

  const groupCardsByType = () => {
    const compatible = getCompatibleCards();
    return {
      relay: compatible.filter(card => card.type.toLowerCase() === 'relay'),
      analog: compatible.filter(card => card.type.toLowerCase() === 'analog'),
      fiber: compatible.filter(card => card.type.toLowerCase() === 'fiber'),
      display: compatible.filter(card => card.type.toLowerCase() === 'display'),
      digital: compatible.filter(card => card.type.toLowerCase() === 'digital'),
      communication: compatible.filter(card => card.type.toLowerCase() === 'communication'),
      bushing: compatible.filter(card => card.type.toLowerCase() === 'bushing'),
      other: compatible.filter(card => 
        !['relay', 'analog', 'fiber', 'display', 'digital', 'communication', 'bushing']
          .includes(card.type.toLowerCase())
      )
    };
  };

  const cardGroups = groupCardsByType();

  const getCardTypeIcon = (type: string) => {
    const icons = {
      relay: Zap,
      analog: Cpu,
      fiber: Wifi,
      display: Monitor,
      digital: Hash,
      communication: MessageSquare,
      bushing: Settings,
      other: Settings
    };
    return icons[type.toLowerCase() as keyof typeof icons] || Settings;
  };

  const getChassisInfo = () => {
    const config = productDataService.getChassisSlotConfiguration(chassis.id);
    return config || { totalSlots: 0, usableSlots: 0, layout: 'Unknown', bushingSlots: [] };
  };

  const chassisInfo = getChassisInfo();

  const getAvailableSlotsForCard = (card: Level3Product) => {
    const allSlots = Array.from({ length: chassisInfo.usableSlots }, (_, i) => i + 1);
    
    return allSlots.filter(slot => {
      // Check if slot is occupied
      if (occupiedSlots.includes(slot)) return false;
      
      // Check bushing card restrictions
      if (card.type === 'Bushing') {
        return chassisInfo.bushingSlots?.includes(slot) || false;
      }
      
      // Check if card can fit (double-wide cards need adjacent slot)
      if (card.specifications?.slotRequirement === 2) {
        return !occupiedSlots.includes(slot + 1) && slot < chassisInfo.usableSlots;
      }
      
      return true;
    });
  };

  const handleCardConfiguration = (cardId: string, configKey: string, value: string) => {
    setSelectedConfigurations(prev => ({
      ...prev,
      [`${cardId}_${configKey}`]: value
    }));
  };

  const renderCardConfiguration = (card: Level3Product) => {
    const configs = [];
    
    // Analog card input configuration
    if (card.type === 'Analog' && card.specifications?.inputConfigurations) {
      const configKey = `${card.id}_inputConfig`;
      configs.push(
        <div key="inputConfig" className="space-y-2">
          <label className="text-xs text-gray-400">Input Configuration:</label>
          <Select 
            value={selectedConfigurations[configKey] || card.specifications.inputConfigurations[0]}
            onValueChange={(value)=> handleCardConfiguration(card.id, 'inputConfig', value)}
          >
            <SelectTrigger className="h-7 text-xs bg-gray-800 border-gray-600">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {card.specifications.inputConfigurations.map((config: string) => (
                <SelectItem key={config} value={config} className="text-xs">
                  {config}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      );
    }

    // Hot spot fiber channel selection
    if (card.type === 'Fiber' && card.name.includes('Hot Spot')) {
      const channels = card.specifications?.channels || 4;
      configs.push(
        <div key="channels" className="text-xs">
          <span className="text-gray-400">Channels: </span>
          <span className="text-white font-medium">{channels}</span>
        </div>
      );
    }

    return configs.length > 0 ? (
      <div className="space-y-2 mb-3 p-2 bg-gray-800/50 rounded">
        <div className="text-xs font-medium text-gray-300">Configuration:</div>
        {configs}
      </div>
    ) : null;
  };

  const renderCardGrid = (cards: Level3Product[], categoryType: string) => (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
      {cards.map((card) => {
        const IconComponent = getCardTypeIcon(categoryType);
        const slotRequirement = card.specifications?.slotRequirement || 1;
        const isDoubleWide = slotRequirement === 2;
        const availableSlots = getAvailableSlotsForCard(card);
        const isBushingCard = card.type === 'Bushing';
        const canPlace = availableSlots.length > 0;
        
        return (
          <Card key={card.id} className={`
            bg-gray-900 border-gray-800 transition-colors
            ${canPlace ? 'hover:border-gray-600' : 'opacity-60'}
          `}>
            <CardHeader>
              <div className="flex justify-between items-start">
                <div className="flex items-center space-x-3 flex-1 min-w-0">
                  <div className="p-2 bg-gray-800 rounded-lg">
                    <IconComponent className="h-5 w-5 text-blue-400" />
                  </div>
                  <div className="min-w-0 flex-1">
                    <CardTitle className="text-white text-lg truncate">{card.name}</CardTitle>
                    <CardDescription className="text-gray-400 text-sm">
                      {slotRequirement} slot{slotRequirement > 1 ? 's' : ''} required
                      {isDoubleWide && (
                        <Badge variant="outline" className="ml-2 text-xs text-orange-400 border-orange-400">
                          Double-Wide
                        </Badge>
                      )}
                      {isBushingCard && (
                        <Badge variant="outline" className="ml-2 text-xs text-yellow-400 border-yellow-400">
                          Restricted Slots
                        </Badge>
                      )}
                    </CardDescription>
                  </div>
                </div>
                <Badge variant="outline" className="text-xs capitalize text-blue-400 border-blue-400">
                  {card.type}
                </Badge>
              </div>
            </CardHeader>
            
            <CardContent>
              <p className="text-gray-400 text-sm mb-4 line-clamp-2">{card.description}</p>
              
              {/* Card Configuration Options */}
              {renderCardConfiguration(card)}
              
              {/* Specifications */}
              {card.specifications && (
                <div className="space-y-2 mb-4">
                  {Object.entries(card.specifications)
                    .filter(([key]) => !['slotRequirement', 'compatibleChassis', 'restrictedSlots', 'inputConfigurations'].includes(key))
                    .slice(0, 3)
                    .map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-400 capitalize">
                          {key.replace(/([A-Z])/g, ' $1').toLowerCase()}:
                        </span>
                        <span className="text-white truncate ml-2">
                          {Array.isArray(value) ? value.join(', ') : String(value)}
                        </span>
                      </div>
                    ))}
                </div>
              )}

              {/* Slot Restrictions for Bushing Cards */}
              {isBushingCard && card.specifications?.restrictedSlots && (
                <div className="mb-4 p-2 bg-yellow-900/20 border border-yellow-600/20 rounded">
                  <div className="flex items-center space-x-2 mb-1">
                    <AlertTriangle className="h-3 w-3 text-yellow-400" />
                    <span className="text-yellow-400 text-xs font-medium">Slot Restrictions</span>
                  </div>
                  <div className="text-xs text-gray-300">
                    Can only be installed in slots: {card.specifications.restrictedSlots.join(', ')}
                  </div>
                </div>
              )}

              {/* Part Number */}
              {card.partNumber && (
                <div className="text-xs text-green-400 font-mono mb-4">
                  P/N: {card.partNumber}
                </div>
              )}
              
              {/* Pricing */}
              <div className="flex justify-between items-center mb-4">
                <span className="text-white font-bold">
                  {canSeePrices ? `$${card.price.toLocaleString()}` : 'Price on Request'}
                </span>
                {card.specifications?.compatibleChassis && (
                  <Badge variant="outline" className="text-xs text-green-400 border-green-400">
                    Compatible
                  </Badge>
                )}
              </div>

              {/* Slot Selection and Add Button */}
              {canPlace ? (
                <div className="space-y-2">
                  <div className="flex items-center space-x-2">
                    <span className="text-gray-400 text-sm">Target Slot:</span>
                    <Select 
                      value={selectedSlot.toString()} 
                      onValueChange={(value) => setSelectedSlot(Number(value))}
                    >
                      <SelectTrigger className="flex-1 h-8 text-sm bg-gray-800 border-gray-600">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        {availableSlots.map(slot => (
                          <SelectItem key={slot} value={slot.toString()}>
                            Slot {slot}
                            {isBushingCard && chassisInfo.bushingSlots?.includes(slot) ? ' (Bushing)' : ''}
                          </SelectItem>
                        ))}
                      </SelectContent>
                    </Select>
                  </div>
                  
                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => onCardSelect(card, availableSlots.includes(selectedSlot) ? selectedSlot : availableSlots[0])}
                    disabled={availableSlots.length === 0}
                  >
                    <Plus className="mr-2 h-4 w-4" />
                    Add to Slot {availableSlots.includes(selectedSlot) ? selectedSlot : availableSlots[0]}
                  </Button>
                </div>
              ) : (
                <div className="text-center py-2">
                  <Badge variant="outline" className="text-red-400 border-red-400">
                    No Available Slots
                  </Badge>
                  {isBushingCard && (
                    <div className="text-xs text-gray-400 mt-1">
                      Requires bushing-compatible slots
                    </div>
                  )}
                </div>
              )}
            </CardContent>
          </Card>
        );
      })}
    </div>
  );

  const hasCards = Object.values(cardGroups).some(group => group.length > 0);

  if (!hasCards) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="text-center py-12">
          <div className="text-gray-400 space-y-2">
            <Settings className="h-12 w-12 mx-auto mb-4 opacity-50" />
            <p className="text-lg">No compatible cards found</p>
            <p className="text-sm">
              No Level 3 products are available for {chassis.name}. 
              Please create compatible cards in the Admin Panel.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const availableSlots = Array.from({ length: chassisInfo.usableSlots }, (_, i) => i + 1)
    .filter(slot => !occupiedSlots.includes(slot));

  return (
    <div className="space-y-6">
      {/* Header Card with Chassis Info */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <span>Card Library for {chassis.name}</span>
            <Badge variant="outline" className="text-yellow-400 border-yellow-400">
              {chassis.type} Chassis
            </Badge>
          </CardTitle>
          <CardDescription className="text-gray-400">
            Compatible cards for your {chassis.type} chassis • {chassisInfo.usableSlots} usable card slots
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
            <div>
              <span className="text-gray-400">Available Slots:</span>
              <span className="text-white font-medium ml-2">{availableSlots.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Occupied:</span>
              <span className="text-white font-medium ml-2">{occupiedSlots.length}</span>
            </div>
            <div>
              <span className="text-gray-400">Bushing Slots:</span>
              <span className="text-white font-medium ml-2">
                {chassisInfo.bushingSlots?.join(', ') || 'None'}
              </span>
            </div>
            <div>
              <span className="text-gray-400">Total Capacity:</span>
              <span className="text-white font-medium ml-2">{chassisInfo.usableSlots}</span>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Card Categories */}
      <Tabs defaultValue="relay" className="w-full">
        <TabsList className="grid w-full grid-cols-4 lg:grid-cols-7 bg-gray-800">
          {Object.entries(cardGroups).map(([type, cards]) => {
            if (cards.length === 0) return null;
            return (
              <TabsTrigger 
                key={type}
                value={type} 
                className="text-white data-[state=active]:bg-red-600 text-xs"
              >
                {type.charAt(0).toUpperCase() + type.slice(1)} ({cards.length})
              </TabsTrigger>
            );
          })}
        </TabsList>
        
        {Object.entries(cardGroups).map(([type, cards]) => {
          if (cards.length === 0) return null;
          return (
            <TabsContent key={type} value={type} className="mt-6">
              {renderCardGrid(cards, type)}
            </TabsContent>
          );
        })}
      </Tabs>
    </div>
  );
};

export default CardLibrary;

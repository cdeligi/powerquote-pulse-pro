import { useState } from "react";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { X, Settings, AlertTriangle } from "lucide-react";
import { Alert, AlertDescription } from "@/components/ui/alert";
import { validateBushingCardPlacement, isBushingCard } from "@/utils/bushingValidation";
import { productDataService } from "@/services/productDataService";

interface SlotCardSelectorProps {
  chassis: any;
  slot: number;
  onCardSelect: (card: any, slot: number) => void;
  onClose: () => void;
  canSeePrices: boolean;
  currentSlotAssignments?: Record<number, any>;
}

const SlotCardSelector = ({ 
  chassis, 
  slot, 
  onCardSelect, 
  onClose, 
  canSeePrices,
  currentSlotAssignments = {}
}: SlotCardSelectorProps) => {
  const [selectedFiberInputs, setSelectedFiberInputs] = useState<number>(4);

  const getCardTypeColor = (cardType: string) => {
    switch (cardType) {
      case 'relay': return 'text-red-400 border-red-400';
      case 'analog': return 'text-blue-400 border-blue-400';
      case 'bushing': return 'text-orange-400 border-orange-400';
      case 'fiber': return 'text-green-400 border-green-400';
      case 'display': return 'text-purple-400 border-purple-400';
      case 'communication': return 'text-cyan-400 border-cyan-400';
      case 'digital': return 'text-yellow-400 border-yellow-400';
      default: return 'text-white border-gray-500';
    }
  };

  // Get available cards from productDataService
  const getAvailableCards = () => {
    const level3Products = productDataService.getLevel3ProductsForLevel2(chassis.id);
    
    // Convert to the expected format
    return level3Products.map(product => ({
      id: product.id,
      name: product.name,
      parentProductId: product.parentProductId,
      type: product.type,
      description: product.description,
      price: product.price,
      enabled: product.enabled,
      slotRequirement: product.specifications?.slotRequirement || 1,
      compatibleChassis: product.specifications?.compatibleChassis || [chassis.type],
      specifications: product.specifications,
      partNumber: product.partNumber
    }));
  };

  const availableCards = getAvailableCards();

  // Filter cards based on chassis compatibility, bushing validation, and LTX slot 8 restriction
  const getCompatibleCards = () => {
    return availableCards.filter(card => {
      if (!card.compatibleChassis.includes(chassis.type)) {
        return false;
      }

      // LTX Slot 8 restriction - only display cards allowed
      if (chassis.type === 'LTX' && slot === 8 && card.type !== 'display') {
        return false;
      }

      // Special validation for bushing cards
      if (isBushingCard(card as any)) {
        const validation = validateBushingCardPlacement(chassis, currentSlotAssignments);
        return validation.isValid;
      }

      return true;
    });
  };

  const compatibleCards = getCompatibleCards();

  // Get validation result for bushing cards to show error messages
  const getBushingValidation = (card: any) => {
    if (isBushingCard(card)) {
      return validateBushingCardPlacement(chassis, currentSlotAssignments);
    }
    return null;
  };

  const handleCardSelect = (card: any) => {
    // For display cards, automatically route to slot 8 in LTX chassis
    if (card.type === 'display' && chassis.type === 'LTX') {
      onCardSelect(card, 8);
    } else {
      onCardSelect(card, slot);
    }
  };

  const needsConfiguration = (card: any) => {
    return card.name.toLowerCase().includes('analog') || card.name.toLowerCase().includes('bushing');
  };

  // Show error message for bushing cards that can't be placed
  const bushingErrorCards = availableCards.filter(card => {
    if (!isBushingCard(card as any)) return false;
    const validation = validateBushingCardPlacement(chassis, currentSlotAssignments);
    return !validation.isValid;
  });

  // Show error for LTX slot 8 non-display cards
  const ltxSlot8ErrorCards = chassis.type === 'LTX' && slot === 8 
    ? availableCards.filter(card => card.type !== 'display')
    : [];

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-5xl bg-gray-900 border-gray-800 text-white max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center justify-between">
            Select Card for Slot {slot}
            {slot !== 8 && chassis.type === 'LTX' && compatibleCards.some(card => card.type === 'display') && (
              <span className="text-sm text-gray-400">
                (Display cards will auto-route to slot 8)
              </span>
            )}
            {chassis.type === 'LTX' && slot === 8 && (
              <span className="text-sm text-purple-400">
                (Display Cards Only)
              </span>
            )}
            <Button variant="ghost" size="sm" onClick={onClose}>
              <X className="h-4 w-4" />
            </Button>
          </DialogTitle>
        </DialogHeader>

        {/* Show LTX slot 8 restriction */}
        {chassis.type === 'LTX' && slot === 8 && ltxSlot8ErrorCards.length > 0 && (
          <Alert className="bg-purple-900/20 border-purple-600">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-purple-400">
              <strong>Slot 8 Restriction:</strong> Only Display Cards can be placed in slot 8 of LTX chassis.
            </AlertDescription>
          </Alert>
        )}

        {/* Show bushing placement errors */}
        {bushingErrorCards.length > 0 && (
          <Alert className="bg-red-900/20 border-red-600">
            <AlertTriangle className="h-4 w-4" />
            <AlertDescription className="text-red-400">
              <strong>Bushing Card Placement Restrictions:</strong>
              <ul className="mt-2 space-y-1">
                {bushingErrorCards.map(card => {
                  const validation = getBushingValidation(card);
                  return (
                    <li key={card.id}>• {validation?.errorMessage}</li>
                  );
                })}
              </ul>
            </AlertDescription>
          </Alert>
        )}
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 mt-4">
          {compatibleCards.map((card) => {
            const colorClass = getCardTypeColor(card.type);
            
            return (
              <Card key={card.id} className="bg-gray-800 border-gray-700 hover:border-red-600 transition-all cursor-pointer">
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
                      {card.slotRequirement} slot{card.slotRequirement > 1 ? 's' : ''}
                    </Badge>
                    <Badge variant="outline" className={colorClass}>
                      {card.type}
                    </Badge>
                    {card.specifications?.inputs && (
                      <Badge variant="outline" className="text-white border-gray-500">
                        {card.specifications.inputs} inputs
                      </Badge>
                    )}
                    {card.type === 'display' && chassis.type === 'LTX' && slot !== 8 && (
                      <Badge variant="outline" className="text-yellow-400 border-yellow-400">
                        → Slot 8
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
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2 mb-4">
                    {Object.entries(card.specifications || {}).map(([key, value]) => (
                      <div key={key} className="flex justify-between text-sm">
                        <span className="text-gray-400 capitalize">{key}:</span>
                        <span className="text-white">{String(value)}</span>
                      </div>
                    ))}
                    {isBushingCard(card as any) && (
                      <div className="flex justify-between text-sm">
                        <span className="text-gray-400">Occupies Slots:</span>
                        <span className="text-orange-400">{slot}, {slot + 1}</span>
                      </div>
                    )}
                  </div>
                  
                  <div className="flex justify-between items-center mb-4">
                    <span className="text-white font-bold">
                      {canSeePrices ? `$${card.price.toLocaleString()}` : '—'}
                    </span>
                    <span className="text-gray-400 text-xs">{card.partNumber}</span>
                  </div>
                  
                  <Button 
                    className="w-full bg-red-600 hover:bg-red-700 text-white"
                    onClick={() => handleCardSelect(card)}
                  >
                    {needsConfiguration(card) ? 'Configure Card' : 'Select Card'}
                  </Button>
                </CardContent>
              </Card>
            );
          })}
        </div>
        
        {compatibleCards.length === 0 && (
          <div className="text-center py-8 text-gray-400">
            No compatible cards available for this slot
            {bushingErrorCards.length > 0 && (
              <p className="mt-2 text-sm">
                Some cards are restricted due to positioning requirements
              </p>
            )}
            {chassis.type === 'LTX' && slot === 8 && ltxSlot8ErrorCards.length > 0 && (
              <p className="mt-2 text-sm text-purple-400">
                Slot 8 is reserved for Display Cards only
              </p>
            )}
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default SlotCardSelector;

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Monitor } from 'lucide-react';
import { ConsolidatedQTMS } from '@/utils/qtmsConsolidation';
import { Level3Product, Level3Customization, BOMItem } from '@/types/product';
import RackVisualizer from './RackVisualizer';
import SlotCardSelector from './SlotCardSelector';
import AnalogCardConfigurator from './AnalogCardConfigurator';
import BushingCardConfigurator from './BushingCardConfigurator';
import { findOptimalBushingPlacement, findExistingBushingSlots, isBushingCard } from '@/utils/bushingValidation';

interface QTMSConfigurationEditorProps {
  consolidatedQTMS: ConsolidatedQTMS;
  onSave: (updatedQTMS: ConsolidatedQTMS) => void;
  onClose: () => void;
  canSeePrices: boolean;
  readOnly?: boolean;
}

const QTMSConfigurationEditor = ({
  consolidatedQTMS,
  onSave,
  onClose,
  canSeePrices,
  readOnly = false
}: QTMSConfigurationEditorProps) => {
  const [editedSlotAssignments, setEditedSlotAssignments] = useState<Record<number, Level3Product>>(
    consolidatedQTMS.configuration.slotAssignments
  );
  const [editedHasRemoteDisplay, setEditedHasRemoteDisplay] = useState(
    consolidatedQTMS.configuration.hasRemoteDisplay
  );
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [configuringCard, setConfiguringCard] = useState<BOMItem | null>(null);
  const [cardConfigurations, setCardConfigurations] = useState<Record<string, Level3Customization[]>>({});

  // Initialize card configurations from existing components
  useState(() => {
    const initialConfigs: Record<string, Level3Customization[]> = {};
    consolidatedQTMS.components.forEach(component => {
      if (component.level3Customizations) {
        initialConfigs[component.id] = component.level3Customizations;
      }
    });
    setCardConfigurations(initialConfigs);
  });

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

  const handleSlotClick = (slot: number) => {
    if (readOnly) return;
    setSelectedSlot(slot);
  };

  const handleSlotClear = (slot: number) => {
    if (readOnly) return;
    setEditedSlotAssignments(prev => {
      const updated = { ...prev };
      const card = updated[slot];
      
      // If it's a bushing card, clear ALL bushing cards from the chassis
      if (card && isBushingCard(card)) {
        // Find all bushing slots and clear them
        const bushingSlots = findExistingBushingSlots(updated);
        bushingSlots.forEach(bushingSlot => {
          delete updated[bushingSlot];
          // Also remove any configurations for these cards
          const cardKey = `slot-${bushingSlot}`;
          setCardConfigurations(prevConfigs => {
            const newConfigs = { ...prevConfigs };
            delete newConfigs[cardKey];
            return newConfigs;
          });
        });
      } else {
        delete updated[slot];
        // Remove configuration for this card
        const cardKey = `slot-${slot}`;
        setCardConfigurations(prevConfigs => {
          const newConfigs = { ...prevConfigs };
          delete newConfigs[cardKey];
          return newConfigs;
        });
      }
      
      return updated;
    });
  };

  const handleCardSelect = (card: Level3Product, slot?: number) => {
    if (readOnly) return;
    // Special handling for bushing cards
    if (isBushingCard(card)) {
      const placement = findOptimalBushingPlacement(
        consolidatedQTMS.configuration.chassis, 
        editedSlotAssignments
      );
      
      if (!placement) {
        console.error('Cannot place bushing card - no valid placement found');
        return;
      }

      // Clear existing cards if needed
      setEditedSlotAssignments(prev => {
        const updated = { ...prev };
        
        // Clear existing bushing cards
        if (placement.shouldClearExisting) {
          placement.existingSlotsToClear.forEach(slotToClear => {
            delete updated[slotToClear];
          });
        }
        
        // Place the bushing card in both slots
        updated[placement.primarySlot] = card;
        updated[placement.secondarySlot] = card;
        
        return updated;
      });

      // Check if card needs configuration
      if (card.name.toLowerCase().includes('bushing')) {
        const newItem: BOMItem = {
          id: `${Date.now()}-${Math.random()}`,
          product: card,
          quantity: 1,
          slot: placement.primarySlot,
          enabled: true
        };
        setConfiguringCard(newItem);
        return;
      }

      setSelectedSlot(null);
      return;
    }

    // LTX Slot 8 restriction - only display cards allowed
    const targetSlot = slot !== undefined ? slot : selectedSlot!;
    if (consolidatedQTMS.configuration.chassis.type === 'LTX' && targetSlot === 8 && card.type !== 'display') {
      console.error('Only display cards can be placed in slot 8 of LTX chassis');
      return;
    }

    // Check if card needs configuration
    if (card.name.toLowerCase().includes('analog')) {
      const newItem: BOMItem = {
        id: `${Date.now()}-${Math.random()}`,
        product: card,
        quantity: 1,
        slot: targetSlot,
        enabled: true
      };
      setConfiguringCard(newItem);
      return;
    }

    setEditedSlotAssignments(prev => ({
      ...prev,
      [targetSlot]: card
    }));
    setSelectedSlot(null);
  };

  const handleCardConfiguration = (customizations: Level3Customization[]) => {
    if (readOnly || !configuringCard) return;

    // Store the configuration
    const cardKey = `slot-${configuringCard.slot}`;
    setCardConfigurations(prev => ({
      ...prev,
      [cardKey]: customizations
    }));

    // Add card to slot assignments if it has a slot
    if (configuringCard.slot !== undefined) {
      setEditedSlotAssignments(prev => ({
        ...prev,
        [configuringCard.slot!]: configuringCard.product as Level3Product
      }));
    }

    setConfiguringCard(null);
    setSelectedSlot(null);
  };

  const handleRemoteDisplayToggle = (enabled: boolean) => {
    if (readOnly) return;
    setEditedHasRemoteDisplay(enabled);
  };

  const handleSave = () => {
    if (readOnly) return;
    // Recalculate price and components based on new configuration
    const chassisItem = consolidatedQTMS.components.find(c => c.product.id === consolidatedQTMS.configuration.chassis.id);
    const cardItems = Object.entries(editedSlotAssignments).map(([slot, card]) => {
      const cardKey = `slot-${slot}`;
      const configurations = cardConfigurations[cardKey];
      
      return {
        id: `${Date.now()}-card-${slot}`,
        product: card,
        quantity: 1,
        slot: parseInt(slot),
        enabled: true,
        level3Customizations: configurations
      };
    });

    let components = chassisItem ? [chassisItem, ...cardItems] : cardItems;

    // Add remote display if selected
    if (editedHasRemoteDisplay) {
      const remoteDisplayItem = {
        id: `${Date.now()}-remote-display`,
        product: {
          id: 'remote-display',
          name: 'Remote Display',
          type: 'accessory',
          description: 'Remote display for QTMS chassis',
          price: 850,
          enabled: true
        } as any,
        quantity: 1,
        enabled: true
      };
      components.push(remoteDisplayItem);
    }

    // Calculate new total price including configuration costs
    const baseTotalPrice = components.reduce((sum, item) => sum + (item.product.price || 0), 0);
    const configurationCosts = Object.values(cardConfigurations).flat().reduce((sum, config) => sum + (config.price || 0), 0);
    const totalPrice = baseTotalPrice + configurationCosts;

    // Create updated QTMS configuration
    const updatedQTMS: ConsolidatedQTMS = {
      ...consolidatedQTMS,
      price: totalPrice,
      configuration: {
        ...consolidatedQTMS.configuration,
        slotAssignments: editedSlotAssignments,
        hasRemoteDisplay: editedHasRemoteDisplay,
        analogConfigurations: Object.fromEntries(
          Object.entries(cardConfigurations)
            .filter(([key, configs]) => configs.some(c => c.type === 'sensor_type'))
            .map(([key, configs]) => [key, { sensorTypes: configs.reduce((acc, c) => ({ ...acc, [c.id]: c.name }), {}) }])
        ),
        bushingConfigurations: Object.fromEntries(
          Object.entries(cardConfigurations)
            .filter(([key, configs]) => configs.some(c => c.name?.includes('Bushing')))
            .map(([key, configs]) => [key, { numberOfBushings: configs.length, configurations: configs }])
        )
      },
      components
    };

    onSave(updatedQTMS);
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-7xl max-h-[90vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white flex items-center">
              <Settings className="mr-2 h-5 w-5" />
              Edit QTMS Configuration - {consolidatedQTMS.name}
            </DialogTitle>
          </DialogHeader>
          
          <div className="space-y-6">
            {/* Configuration Summary */}
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white text-lg flex items-center justify-between">
                  Configuration Summary
                  <Badge variant="outline" className="text-white border-gray-500">
                    {consolidatedQTMS.partNumber}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <div>
                    <h4 className="text-white font-medium mb-2">Chassis</h4>
                    <div className="text-gray-300">{consolidatedQTMS.configuration.chassis.name}</div>
                    <div className="text-gray-400 text-sm">{consolidatedQTMS.configuration.chassis.description}</div>
                    {consolidatedQTMS.configuration.chassis.type === 'LTX' && (
                      <div className="text-purple-300 text-xs mt-1">
                        Slot 8 reserved for Display Cards only
                      </div>
                    )}
                  </div>
                  
                  <div>
                    <h4 className="text-white font-medium mb-2">Total Price</h4>
                    <div className="text-green-400 font-bold text-lg">
                      {canSeePrices ? `$${consolidatedQTMS.price.toLocaleString()}` : '—'}
                    </div>
                  </div>
                </div>
              </CardContent>
            </Card>

            {/* Rack Configuration - Removed Tabs */}
            <RackVisualizer
              chassis={consolidatedQTMS.configuration.chassis as any}
              slotAssignments={editedSlotAssignments as any}
              onSlotClick={handleSlotClick}
              onSlotClear={handleSlotClear}
              selectedSlot={selectedSlot}
              hasRemoteDisplay={editedHasRemoteDisplay}
              onRemoteDisplayToggle={handleRemoteDisplayToggle}
            />

            {/* Configuration Changes Summary with Color Coding */}
            {Object.keys(editedSlotAssignments).length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Current Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(editedSlotAssignments).map(([slot, card]) => {
                      const cardKey = `slot-${slot}`;
                      const hasConfiguration = cardConfigurations[cardKey]?.length > 0;
                      const colorClass = getCardTypeColor(card.type);
                      
                      return (
                        <div key={slot} className="flex justify-between items-center p-3 bg-gray-700 rounded">
                          <div>
                            <div className="flex items-center space-x-2">
                              <Badge variant="outline" className="text-blue-400 border-blue-400">
                                Slot {slot}
                              </Badge>
                              <span className="text-white font-medium">{card.name}</span>
                              <Badge variant="outline" className={colorClass}>
                                {card.type}
                              </Badge>
                              {hasConfiguration && (
                                <Badge variant="outline" className="text-purple-400 border-purple-400">
                                  Configured
                                </Badge>
                              )}
                              {consolidatedQTMS.configuration.chassis.type === 'LTX' && parseInt(slot) === 8 && (
                                <Badge variant="outline" className="text-purple-400 border-purple-400">
                                  Display Slot
                                </Badge>
                              )}
                            </div>
                            <div className="text-gray-400 text-sm">{card.description}</div>
                            {hasConfiguration && (
                              <div className="text-xs text-purple-300 mt-1">
                                {cardConfigurations[cardKey].length} customization(s) applied
                              </div>
                            )}
                          </div>
                          <div className="text-right">
                            {canSeePrices && (
                              <div className="text-white">${card.price?.toLocaleString() || '—'}</div>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </CardContent>
              </Card>
            )}

            {/* Remote Display Status */}
            <Card className="bg-gray-800 border-gray-700">
              <CardContent className="pt-6">
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-3">
                    <Monitor className="h-5 w-5 text-blue-400" />
                    <div>
                      <span className="text-white font-medium">Remote Display</span>
                      <p className="text-gray-400 text-sm">
                        {editedHasRemoteDisplay ? 'Included' : 'Not included'}
                      </p>
                    </div>
                  </div>
                  {canSeePrices && editedHasRemoteDisplay && (
                    <div className="text-white">$850</div>
                  )}
                </div>
              </CardContent>
            </Card>
          </div>

          <DialogFooter className="flex space-x-2">
            <Button
              variant="outline"
              onClick={onClose}
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              {readOnly ? 'Close' : 'Cancel'}
            </Button>
            {!readOnly && (
              <Button
                onClick={handleSave}
                className="bg-red-600 hover:bg-red-700 text-white"
              >
                Save Configuration
              </Button>
            )}
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Slot Card Selector Dialog */}
      {selectedSlot !== null && (
        <SlotCardSelector
          chassis={consolidatedQTMS.configuration.chassis as any}
          slot={selectedSlot}
          onCardSelect={handleCardSelect}
          onClose={() => setSelectedSlot(null)}
          canSeePrices={canSeePrices}
          currentSlotAssignments={editedSlotAssignments}
        />
      )}

      {/* Card Configuration Dialogs */}
      {configuringCard && configuringCard.product.name.toLowerCase().includes('analog') && (
        <AnalogCardConfigurator
          bomItem={configuringCard}
          onSave={handleCardConfiguration}
          onClose={() => setConfiguringCard(null)}
        />
      )}

      {configuringCard && configuringCard.product.name.toLowerCase().includes('bushing') && (
        <BushingCardConfigurator
          bomItem={configuringCard}
          onSave={handleCardConfiguration}
          onClose={() => setConfiguringCard(null)}
        />
      )}
    </>
  );
};

export default QTMSConfigurationEditor;

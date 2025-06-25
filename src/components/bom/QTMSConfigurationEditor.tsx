
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Settings, Monitor } from 'lucide-react';
import { ConsolidatedQTMS } from '@/utils/qtmsConsolidation';
import RackVisualizer from './RackVisualizer';
import SlotCardSelector from './SlotCardSelector';
import { Level3Product } from '@/types/product';

interface QTMSConfigurationEditorProps {
  consolidatedQTMS: ConsolidatedQTMS;
  onSave: (updatedQTMS: ConsolidatedQTMS) => void;
  onClose: () => void;
  canSeePrices: boolean;
}

const QTMSConfigurationEditor = ({ 
  consolidatedQTMS, 
  onSave, 
  onClose, 
  canSeePrices 
}: QTMSConfigurationEditorProps) => {
  const [editedSlotAssignments, setEditedSlotAssignments] = useState<Record<number, Level3Product>>(
    consolidatedQTMS.configuration.slotAssignments
  );
  const [editedHasRemoteDisplay, setEditedHasRemoteDisplay] = useState(
    consolidatedQTMS.configuration.hasRemoteDisplay
  );
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);

  const handleSlotClick = (slot: number) => {
    setSelectedSlot(slot);
  };

  const handleSlotClear = (slot: number) => {
    setEditedSlotAssignments(prev => {
      const updated = { ...prev };
      delete updated[slot];
      return updated;
    });
  };

  const handleCardSelect = (card: Level3Product, slot?: number) => {
    const targetSlot = slot !== undefined ? slot : selectedSlot!;
    setEditedSlotAssignments(prev => ({
      ...prev,
      [targetSlot]: card
    }));
    setSelectedSlot(null);
  };

  const handleRemoteDisplayToggle = (enabled: boolean) => {
    setEditedHasRemoteDisplay(enabled);
  };

  const handleSave = () => {
    // Recalculate price and components based on new configuration
    const chassisItem = consolidatedQTMS.components.find(c => c.product.id === consolidatedQTMS.configuration.chassis.id);
    const cardItems = Object.entries(editedSlotAssignments).map(([slot, card]) => ({
      id: `${Date.now()}-card-${slot}`,
      product: card,
      quantity: 1,
      slot: parseInt(slot),
      enabled: true
    }));

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

    // Calculate new total price
    const totalPrice = components.reduce((sum, item) => sum + (item.product.price || 0), 0);

    // Create updated QTMS configuration
    const updatedQTMS: ConsolidatedQTMS = {
      ...consolidatedQTMS,
      price: totalPrice,
      configuration: {
        ...consolidatedQTMS.configuration,
        slotAssignments: editedSlotAssignments,
        hasRemoteDisplay: editedHasRemoteDisplay
      },
      components
    };

    onSave(updatedQTMS);
  };

  return (
    <>
      <Dialog open={true} onOpenChange={onClose}>
        <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-6xl max-h-[90vh] overflow-y-auto">
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

            {/* Rack Visualizer for Editing */}
            <RackVisualizer
              chassis={consolidatedQTMS.configuration.chassis as any}
              slotAssignments={editedSlotAssignments as any}
              onSlotClick={handleSlotClick}
              onSlotClear={handleSlotClear}
              selectedSlot={selectedSlot}
              hasRemoteDisplay={editedHasRemoteDisplay}
              onRemoteDisplayToggle={handleRemoteDisplayToggle}
            />

            {/* Configuration Changes Summary */}
            {Object.keys(editedSlotAssignments).length > 0 && (
              <Card className="bg-gray-800 border-gray-700">
                <CardHeader>
                  <CardTitle className="text-white">Current Configuration</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    {Object.entries(editedSlotAssignments).map(([slot, card]) => (
                      <div key={slot} className="flex justify-between items-center p-3 bg-gray-700 rounded">
                        <div>
                          <div className="flex items-center space-x-2">
                            <Badge variant="outline" className="text-blue-400 border-blue-400">
                              Slot {slot}
                            </Badge>
                            <span className="text-white font-medium">{card.name}</span>
                          </div>
                          <div className="text-gray-400 text-sm">{card.description}</div>
                        </div>
                        <div className="text-right">
                          {canSeePrices && (
                            <div className="text-white">${card.price?.toLocaleString() || '—'}</div>
                          )}
                        </div>
                      </div>
                    ))}
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
              Cancel
            </Button>
            <Button
              onClick={handleSave}
              className="bg-red-600 hover:bg-red-700 text-white"
            >
              Save Configuration
            </Button>
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
    </>
  );
};

export default QTMSConfigurationEditor;

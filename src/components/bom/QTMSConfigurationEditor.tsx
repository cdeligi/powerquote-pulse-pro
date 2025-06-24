
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Edit3, Settings } from 'lucide-react';
import { ConsolidatedQTMS } from '@/utils/qtmsConsolidation';

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
  const [editedQTMS, setEditedQTMS] = useState<ConsolidatedQTMS>(consolidatedQTMS);

  const handleSave = () => {
    onSave(editedQTMS);
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
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

          {/* Slot Assignments */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Installed Cards</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-3">
                {Object.entries(consolidatedQTMS.configuration.slotAssignments).map(([slot, card]) => (
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
                        <div className="text-white">${card.price.toLocaleString()}</div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Remote Display */}
          {consolidatedQTMS.configuration.hasRemoteDisplay && (
            <Card className="bg-gray-800 border-gray-700">
              <CardHeader>
                <CardTitle className="text-white">Accessories</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center p-3 bg-gray-700 rounded">
                  <div>
                    <span className="text-white font-medium">Remote Display</span>
                    <div className="text-gray-400 text-sm">Remote display capability</div>
                  </div>
                  {canSeePrices && (
                    <div className="text-white">$850</div>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Component Breakdown */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Component Breakdown</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2">
                {consolidatedQTMS.components.map((component, index) => (
                  <div key={index} className="flex justify-between text-sm">
                    <span className="text-gray-300">
                      {component.product.name} {component.slot ? `(Slot ${component.slot})` : ''}
                    </span>
                    {canSeePrices && (
                      <span className="text-gray-300">${component.product.price?.toLocaleString() || '—'}</span>
                    )}
                  </div>
                ))}
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
  );
};

export default QTMSConfigurationEditor;

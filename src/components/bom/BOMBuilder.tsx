
import { useState } from 'react';
import BOMDisplay from './BOMDisplay';
import { BOMItem, Level1Product, Level2Product } from '@/types/product';
import { v4 as uuidv4 } from 'uuid';
import ChassisSelector from './ChassisSelector';
import BOMQuoteBuilder from './BOMQuoteBuilder';
import QuoteFieldsForm from '@/components/quotes/QuoteFieldsForm';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Package, FileText, Settings } from 'lucide-react';

interface BOMBuilderProps {
  onBOMUpdate: (items: BOMItem[]) => void;
  canSeePrices: boolean;
}

const BOMBuilder = ({ onBOMUpdate, canSeePrices }: BOMBuilderProps) => {
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [selectedChassis, setSelectedChassis] = useState<Level2Product | null>(null);
  const [quoteFields, setQuoteFields] = useState<Record<string, string>>({});

  const handleChassisSelect = (product: Level2Product) => {
    setSelectedChassis(product);
    // Automatically add chassis to BOM
    const newBOMItem: BOMItem = {
      id: uuidv4(),
      product: product,
      quantity: 1,
      partNumber: product.partNumber || '',
      enabled: true
    };
    setBomItems([...bomItems, newBOMItem]);
  };

  const handleBOMUpdate = (items: BOMItem[]) => {
    setBomItems(items);
    onBOMUpdate(items);
  };

  const getChassisTypeInfo = () => {
    if (!selectedChassis) return null;
    
    const chassisType = selectedChassis.name.includes('LTX') ? 'LTX' : 
                      selectedChassis.name.includes('MTX') ? 'MTX' : 'STX';
    
    const slotConfig = {
      'LTX': { slots: 15, layout: '2-row (8-14 top, 0-7 bottom)', maxCards: 14 },
      'MTX': { slots: 8, layout: '1-row (0-7)', maxCards: 7 },
      'STX': { slots: 5, layout: '1-row (0-4)', maxCards: 4 }
    };

    return { type: chassisType, ...slotConfig[chassisType] };
  };

  const chassisInfo = getChassisTypeInfo();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-6 py-8 space-y-8">
        {/* Header Section */}
        <div className="text-center space-y-4">
          <div className="flex items-center justify-center space-x-3">
            <Package className="h-10 w-10 text-red-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              BOM Builder
            </h1>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Configure your Bill of Materials with precision. Select chassis, add components, and generate quotes seamlessly.
          </p>
          {chassisInfo && (
            <div className="flex items-center justify-center space-x-4">
              <Badge variant="outline" className="text-red-400 border-red-400">
                {chassisInfo.type} Chassis
              </Badge>
              <Badge variant="outline" className="text-blue-400 border-blue-400">
                {chassisInfo.slots} Slots
              </Badge>
              <Badge variant="outline" className="text-green-400 border-green-400">
                {chassisInfo.maxCards} Max Cards
              </Badge>
            </div>
          )}
        </div>

        {/* Quote Fields Section */}
        <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
          <CardHeader>
            <CardTitle className="text-white flex items-center space-x-2">
              <FileText className="h-5 w-5 text-blue-400" />
              <span>Quote Information</span>
            </CardTitle>
          </CardHeader>
          <CardContent>
            <QuoteFieldsForm
              values={quoteFields}
              onChange={setQuoteFields}
            />
          </CardContent>
        </Card>

        <Separator className="bg-gray-700" />

        {/* Main Configuration Section */}
        <div className="grid grid-cols-1 xl:grid-cols-4 gap-8">
          {/* Left Column - Chassis & Product Selection */}
          <div className="xl:col-span-3 space-y-8">
            {/* Chassis Selection */}
            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white flex items-center space-x-2">
                  <Settings className="h-5 w-5 text-red-400" />
                  <span>Chassis Configuration</span>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <ChassisSelector 
                  onChassisSelect={handleChassisSelect}
                  selectedChassis={selectedChassis}
                  canSeePrices={canSeePrices}
                />
                
                {selectedChassis && chassisInfo && (
                  <div className="mt-6 p-4 bg-gray-800/50 rounded-lg border border-gray-700">
                    <h4 className="text-white font-medium mb-3">Configuration Details</h4>
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Chassis Type:</span>
                        <p className="text-white font-medium">{chassisInfo.type}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Slot Layout:</span>
                        <p className="text-white font-medium">{chassisInfo.layout}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Max Components:</span>
                        <p className="text-white font-medium">{chassisInfo.maxCards} cards</p>
                      </div>
                    </div>
                  </div>
                )}
              </CardContent>
            </Card>
          </div>

          {/* Right Column - BOM Display and Quote Builder */}
          <div className="space-y-6">
            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-lg">Bill of Materials</CardTitle>
              </CardHeader>
              <CardContent className="p-0">
                <BOMDisplay 
                  bomItems={bomItems} 
                  onUpdateBOM={handleBOMUpdate}
                  canSeePrices={canSeePrices}
                />
              </CardContent>
            </Card>
            
            {bomItems.length > 0 && (
              <BOMQuoteBuilder 
                bomItems={bomItems}
                canSeePrices={canSeePrices}
              />
            )}
          </div>
        </div>

        {/* Status Bar */}
        {bomItems.length > 0 && (
          <Card className="bg-gray-900/30 border-gray-800 backdrop-blur-sm">
            <CardContent className="py-4">
              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center space-x-6">
                  <span className="text-gray-400">
                    Items: <span className="text-white font-medium">{bomItems.length}</span>
                  </span>
                  <span className="text-gray-400">
                    Chassis: <span className="text-white font-medium">
                      {selectedChassis?.name || 'None selected'}
                    </span>
                  </span>
                </div>
                {canSeePrices && (
                  <div className="text-gray-400">
                    Status: <span className="text-green-400 font-medium">Ready for Quote</span>
                  </div>
                )}
              </div>
            </CardContent>
          </Card>
        )}
      </div>
    </div>
  );
};

export default BOMBuilder;

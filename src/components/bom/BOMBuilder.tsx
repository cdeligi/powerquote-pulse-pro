import { useState } from 'react';
import BOMDisplay from './BOMDisplay';
import { BOMItem, Level1Product, Level2Product, Level3Product } from '@/types/product';
import { v4 as uuidv4 } from 'uuid';
import Level1ProductSelector from './Level1ProductSelector';
import Level2OptionsSelector from './Level2OptionsSelector';
import ChassisSelector from './ChassisSelector';
import CardLibrary from './CardLibrary';
import RackVisualizer from './RackVisualizer';
import BOMQuoteBuilder from './BOMQuoteBuilder';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Separator } from '@/components/ui/separator';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Package, ArrowLeft } from 'lucide-react';

interface BOMBuilderProps {
  onBOMUpdate: (items: BOMItem[]) => void;
  canSeePrices: boolean;
}

const BOMBuilder = ({ onBOMUpdate, canSeePrices }: BOMBuilderProps) => {
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [selectedLevel1Product, setSelectedLevel1Product] = useState<Level1Product | null>(null);
  const [selectedLevel2Options, setSelectedLevel2Options] = useState<Level2Product[]>([]);
  const [selectedChassis, setSelectedChassis] = useState<Level2Product | null>(null);
  const [currentStep, setCurrentStep] = useState<'level1' | 'level2' | 'chassis' | 'cards'>('level1');

  const handleLevel1Select = (product: Level1Product) => {
    setSelectedLevel1Product(product);
    setSelectedLevel2Options([]);
    setSelectedChassis(null);
    
    // Reset BOM when changing Level 1 product
    setBomItems([]);
    
    // For QTMS, go to chassis selection; for others, go to Level 2 options
    if (product.id === 'qtms') {
      setCurrentStep('chassis');
    } else {
      setCurrentStep('level2');
    }
  };

  const handleLevel2OptionToggle = (option: Level2Product) => {
    const isSelected = selectedLevel2Options.some(selected => selected.id === option.id);
    
    if (isSelected) {
      setSelectedLevel2Options(prev => prev.filter(selected => selected.id !== option.id));
      // Remove from BOM
      setBomItems(prev => prev.filter(item => item.product.id !== option.id));
    } else {
      setSelectedLevel2Options(prev => [...prev, option]);
      // Add to BOM
      const newBOMItem: BOMItem = {
        id: uuidv4(),
        product: option,
        quantity: 1,
        partNumber: option.partNumber || '',
        enabled: true
      };
      setBomItems(prev => [...prev, newBOMItem]);
    }
  };

  const handleChassisSelect = (chassis: Level2Product) => {
    setSelectedChassis(chassis);
    
    // Remove any existing chassis from BOM and add new one
    setBomItems(prev => {
      const nonChassisItems = prev.filter(item => 
        !('parentProductId' in item.product) || 
        item.product.parentProductId !== 'qtms'
      );
      
      const newBOMItem: BOMItem = {
        id: uuidv4(),
        product: chassis,
        quantity: 1,
        partNumber: chassis.partNumber || '',
        enabled: true
      };
      
      return [...nonChassisItems, newBOMItem];
    });
    
    setCurrentStep('cards');
  };

  const handleCardSelect = (card: Level3Product, slot?: number) => {
    const newBOMItem: BOMItem = {
      id: uuidv4(),
      product: card,
      quantity: 1,
      slot: slot,
      partNumber: card.partNumber || '',
      enabled: true
    };
    setBomItems(prev => [...prev, newBOMItem]);
  };

  const handleAddCardToSlot = (slot: number) => {
    // This will be handled by the card selection flow
    console.log('Add card to slot:', slot);
  };

  const handleRemoveCardFromSlot = (itemId: string) => {
    setBomItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleBOMUpdate = (items: BOMItem[]) => {
    setBomItems(items);
    onBOMUpdate(items);
  };

  const getOccupiedSlots = () => {
    return bomItems.filter(item => item.slot).map(item => item.slot!);
  };

  const resetToLevel1 = () => {
    setSelectedLevel1Product(null);
    setSelectedLevel2Options([]);
    setSelectedChassis(null);
    setBomItems([]);
    setCurrentStep('level1');
  };

  const getStepTitle = () => {
    if (currentStep === 'level1') return 'Select Product Category';
    if (currentStep === 'level2') return `Configure ${selectedLevel1Product?.name}`;
    if (currentStep === 'chassis') return 'Select QTMS Chassis';
    if (currentStep === 'cards') return 'Configure Cards';
    return '';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      <div className="container mx-auto px-6 py-8">
        {/* Header Section */}
        <div className="text-center space-y-4 mb-8">
          <div className="flex items-center justify-center space-x-3">
            <Package className="h-10 w-10 text-red-500" />
            <h1 className="text-4xl font-bold bg-gradient-to-r from-white to-gray-300 bg-clip-text text-transparent">
              BOM Builder
            </h1>
          </div>
          <p className="text-gray-400 text-lg max-w-2xl mx-auto">
            Configure your Bill of Materials with precision. Select products, configure options, and generate quotes seamlessly.
          </p>
          
          {/* Progress Indicator */}
          <div className="flex items-center justify-center space-x-4">
            {currentStep !== 'level1' && (
              <Button
                variant="outline"
                onClick={resetToLevel1}
                className="text-gray-400 border-gray-600 hover:bg-gray-800"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Start Over
              </Button>
            )}
            <Badge variant="outline" className="text-blue-400 border-blue-400">
              {getStepTitle()}
            </Badge>
            {selectedLevel1Product && (
              <Badge variant="outline" className="text-green-400 border-green-400">
                {selectedLevel1Product.name}
              </Badge>
            )}
          </div>
        </div>

        <Separator className="bg-gray-700 mb-8" />

        {/* Main Layout - Fixed layout with proper right sidebar */}
        <div className="grid grid-cols-12 gap-8">
          {/* Left Column - Product Configuration (8 columns) */}
          <div className="col-span-12 lg:col-span-8 space-y-8">
            {/* Step 1: Level 1 Product Selection */}
            {currentStep === 'level1' && (
              <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Package className="h-5 w-5 text-red-400" />
                    <span>Select Product Category</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Level1ProductSelector 
                    onProductSelect={handleLevel1Select}
                    selectedProduct={selectedLevel1Product}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 2: Level 2 Options (for non-QTMS products) */}
            {currentStep === 'level2' && selectedLevel1Product && (
              <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white">Configure {selectedLevel1Product.name} Options</CardTitle>
                </CardHeader>
                <CardContent>
                  <Level2OptionsSelector
                    level1Product={selectedLevel1Product}
                    selectedOptions={selectedLevel2Options}
                    onOptionToggle={handleLevel2OptionToggle}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 3: Chassis Selection (for QTMS) */}
            {currentStep === 'chassis' && selectedLevel1Product?.id === 'qtms' && (
              <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
                <CardHeader>
                  <CardTitle className="text-white flex items-center space-x-2">
                    <Package className="h-5 w-5 text-red-400" />
                    <span>Select QTMS Chassis</span>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <ChassisSelector 
                    onChassisSelect={handleChassisSelect}
                    selectedChassis={selectedChassis}
                    canSeePrices={canSeePrices}
                  />
                </CardContent>
              </Card>
            )}

            {/* Step 4: Card Configuration (for QTMS with chassis selected) */}
            {currentStep === 'cards' && selectedChassis && (
              <div className="space-y-8">
                {/* Rack Visualizer */}
                <RackVisualizer
                  chassis={selectedChassis}
                  bomItems={bomItems.filter(item => item.slot)}
                  onAddCard={handleAddCardToSlot}
                  onRemoveCard={handleRemoveCardFromSlot}
                />

                {/* Card Library */}
                <CardLibrary
                  chassis={selectedChassis}
                  onCardSelect={handleCardSelect}
                  canSeePrices={canSeePrices}
                  occupiedSlots={getOccupiedSlots()}
                />
              </div>
            )}
          </div>

          {/* Right Sidebar - BOM Display and Quote Builder (4 columns) */}
          <div className="col-span-12 lg:col-span-4 space-y-6">
            {/* Configuration Summary */}
            <Card className="bg-gray-900/50 border-gray-800 backdrop-blur-sm">
              <CardHeader>
                <CardTitle className="text-white text-lg">Configuration Summary</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {selectedLevel1Product && (
                  <div>
                    <span className="text-gray-400">Product:</span>
                    <span className="text-white font-medium ml-2">{selectedLevel1Product.name}</span>
                  </div>
                )}
                {selectedChassis && (
                  <div>
                    <span className="text-gray-400">Chassis:</span>
                    <span className="text-white font-medium ml-2">{selectedChassis.name}</span>
                  </div>
                )}
                <div>
                  <span className="text-gray-400">Total Items:</span>
                  <span className="text-white font-medium ml-2">{bomItems.length}</span>
                </div>
              </CardContent>
            </Card>

            {/* BOM Display - Fixed to right sidebar */}
            <BOMDisplay 
              bomItems={bomItems} 
              onUpdateBOM={handleBOMUpdate}
              canSeePrices={canSeePrices}
            />
            
            {/* Quote Builder - Only one instance, moved to right sidebar */}
            {bomItems.length > 0 && (
              <BOMQuoteBuilder 
                bomItems={bomItems}
                canSeePrices={canSeePrices}
              />
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default BOMBuilder;

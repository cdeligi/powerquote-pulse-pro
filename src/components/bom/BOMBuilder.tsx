
import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { BOMItem, Level1Product, Level2Product, Level3Product } from '@/types/product';
import Level1ProductSelector from './Level1ProductSelector';
import Level2OptionsSelector from './Level2OptionsSelector';
import ChassisSelector from './ChassisSelector';
import CardLibrary from './CardLibrary';
import DGAProductSelector from './DGAProductSelector';
import PDProductSelector from './PDProductSelector';
import { productDataService } from '@/services/productDataService';

interface BOMBuilderProps {
  onBOMUpdate: (items: BOMItem[]) => void;
  canSeePrices: boolean;
}

const BOMBuilder = ({ onBOMUpdate, canSeePrices }: BOMBuilderProps) => {
  const [selectedLevel1Product, setSelectedLevel1Product] = useState<Level1Product | null>(null);
  const [selectedLevel2Options, setSelectedLevel2Options] = useState<Level2Product[]>([]);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [activeTab, setActiveTab] = useState<string>('');

  // Get all Level 1 products for dynamic tabs
  const level1Products = productDataService.getLevel1Products().filter(p => p.enabled);

  // Set default active tab when products are loaded
  useEffect(() => {
    if (level1Products.length > 0 && !activeTab) {
      setActiveTab(level1Products[0].id);
    }
  }, [level1Products.length, activeTab]);

  const handleLevel1ProductSelect = (product: Level1Product) => {
    setSelectedLevel1Product(product);
    setSelectedLevel2Options([]);
  };

  const handleLevel2OptionToggle = (option: Level2Product) => {
    setSelectedLevel2Options(prev => {
      const exists = prev.find(item => item.id === option.id);
      if (exists) {
        return prev.filter(item => item.id !== option.id);
      } else {
        return [...prev, option];
      }
    });
  };

  const handleCardSelect = (card: Level3Product, slot?: number) => {
    const newItem: BOMItem = {
      id: `${Date.now()}-${Math.random()}`,
      product: card,
      quantity: 1,
      slot,
      enabled: true
    };
    
    const updatedItems = [...bomItems, newItem];
    setBomItems(updatedItems);
    onBOMUpdate(updatedItems);
  };

  const handleDGAProductSelect = (product: Level1Product, configuration?: Record<string, any>, level2Options?: Level2Product[]) => {
    // Handle DGA product selection
    const newItem: BOMItem = {
      id: `${Date.now()}-${Math.random()}`,
      product: product,
      quantity: 1,
      enabled: true,
      configuration
    };
    
    const updatedItems = [...bomItems, newItem];
    
    // Add level 2 options as separate items
    if (level2Options) {
      level2Options.forEach(option => {
        const optionItem: BOMItem = {
          id: `${Date.now()}-${Math.random()}-${option.id}`,
          product: option as any,
          quantity: 1,
          enabled: true
        };
        updatedItems.push(optionItem);
      });
    }
    
    setBomItems(updatedItems);
    onBOMUpdate(updatedItems);
  };

  const renderProductContent = (productId: string) => {
    const product = level1Products.find(p => p.id === productId);
    if (!product) return null;

    // Set the selected product when switching tabs
    if (selectedLevel1Product?.id !== productId) {
      setSelectedLevel1Product(product);
      setSelectedLevel2Options([]);
    }

    switch (productId) {
      case 'qtms':
        return (
          <div className="space-y-6">
            <Level1ProductSelector 
              onProductSelect={handleLevel1ProductSelect}
              selectedProduct={selectedLevel1Product}
            />
            
            {selectedLevel1Product && (
              <Level2OptionsSelector
                level1Product={selectedLevel1Product}
                selectedOptions={selectedLevel2Options}
                onOptionToggle={handleLevel2OptionToggle}
              />
            )}
            
            {selectedLevel2Options.length > 0 && (
              <div className="space-y-6">
                {selectedLevel2Options.map((chassis) => (
                  <div key={chassis.id}>
                    <h3 className="text-lg font-medium text-white mb-4">
                      Cards for {chassis.name}
                    </h3>
                    <CardLibrary
                      chassis={chassis}
                      onCardSelect={handleCardSelect}
                      canSeePrices={canSeePrices}
                    />
                  </div>
                ))}
              </div>
            )}
          </div>
        );
      
      case 'dga':
        return (
          <DGAProductSelector
            onProductSelect={handleDGAProductSelect}
            canSeePrices={canSeePrices}
          />
        );
      
      case 'partial-discharge':
        return (
          <PDProductSelector
            onProductSelect={handleDGAProductSelect}
            canSeePrices={canSeePrices}
          />
        );
      
      default:
        return (
          <div className="space-y-6">
            <Level1ProductSelector 
              onProductSelect={handleLevel1ProductSelect}
              selectedProduct={selectedLevel1Product}
            />
            
            {selectedLevel1Product && (
              <Level2OptionsSelector
                level1Product={selectedLevel1Product}
                selectedOptions={selectedLevel2Options}
                onOptionToggle={handleLevel2OptionToggle}
              />
            )}
          </div>
        );
    }
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">BOM Builder</CardTitle>
          <CardDescription className="text-gray-400">
            Build your Bill of Materials by selecting products and configurations
          </CardDescription>
        </CardHeader>
      </Card>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full bg-gray-800" style={{ gridTemplateColumns: `repeat(${level1Products.length}, 1fr)` }}>
          {level1Products.map((product) => (
            <TabsTrigger 
              key={product.id}
              value={product.id} 
              className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
            >
              {product.name}
              {product.category && (
                <Badge variant="outline" className="ml-2 text-xs">
                  {product.category}
                </Badge>
              )}
            </TabsTrigger>
          ))}
        </TabsList>
        
        {level1Products.map((product) => (
          <TabsContent key={product.id} value={product.id} className="mt-6">
            {renderProductContent(product.id)}
          </TabsContent>
        ))}
      </Tabs>

      {bomItems.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Selected Items</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              {bomItems.map((item) => (
                <div key={item.id} className="flex justify-between items-center p-2 bg-gray-800 rounded">
                  <span className="text-white">{item.product.name}</span>
                  <span className="text-gray-400">Qty: {item.quantity}</span>
                </div>
              ))}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default BOMBuilder;

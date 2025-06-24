import { useState } from 'react';
import ProductSelector from './ProductSelector';
import BOMDisplay from './BOMDisplay';
import { Product, BOMItem } from '@/types/product';
import { v4 as uuidv4 } from 'uuid';
import { initialProducts } from '@/data/products';
import ChassisSelector from './ChassisSelector';
import BOMQuoteBuilder from './BOMQuoteBuilder';

interface BOMBuilderProps {
  onBOMUpdate: (items: BOMItem[]) => void;
  canSeePrices: boolean;
}

const BOMBuilder = ({ onBOMUpdate, canSeePrices }: BOMBuilderProps) => {
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [selectedChassis, setSelectedChassis] = useState<Product | null>(null);

  const handleProductSelect = (product: Product, slot?: string) => {
    const newBOMItem: BOMItem = {
      id: uuidv4(),
      product: product,
      quantity: 1,
      slot: slot,
      partNumber: '',
      enabled: true
    };
    setBomItems([...bomItems, newBOMItem]);
  };

  const handleChassisSelect = (product: Product) => {
    setSelectedChassis(product);
    // Automatically add chassis to BOM
    const newBOMItem: BOMItem = {
      id: uuidv4(),
      product: product,
      quantity: 1,
      partNumber: '',
      enabled: true
    };
    setBomItems([...bomItems, newBOMItem]);
  };

  const handleBOMUpdate = (items: BOMItem[]) => {
    setBomItems(items);
    onBOMUpdate(items);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">BOM Builder</h1>
          <p className="text-gray-400">Build your Bill of Materials configuration</p>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Left Column - Product Selectors */}
        <div className="lg:col-span-2 space-y-6">
          {/* Chassis Selector */}
          <ChassisSelector onSelect={handleChassisSelect} />

          {/* Product Selectors */}
          {initialProducts.map((category) => (
            <ProductSelector
              key={category.name}
              category={category}
              onSelect={handleProductSelect}
              selectedChassis={selectedChassis}
            />
          ))}
        </div>

        {/* Right Column - BOM Display and Quote Builder */}
        <div className="space-y-6">
          <BOMDisplay 
            bomItems={bomItems} 
            onUpdateBOM={handleBOMUpdate}
            canSeePrices={canSeePrices}
          />
          
          {/* Add Quote Builder */}
          <BOMQuoteBuilder 
            bomItems={bomItems}
            canSeePrices={canSeePrices}
          />
        </div>
      </div>
    </div>
  );
};

export default BOMBuilder;

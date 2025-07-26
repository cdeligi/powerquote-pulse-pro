
import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Level1Product, Level2Product } from '@/types/product';
import { productDataService } from '@/services/productDataService';

interface Level2OptionsSelectorProps {
  level1Product: Level1Product;
  selectedOptions: Level2Product[];
  onOptionToggle: (option: Level2Product) => void;
  canSeePrices?: boolean;
}

const Level2OptionsSelector = ({ level1Product, selectedOptions, onOptionToggle, canSeePrices = true }: Level2OptionsSelectorProps) => {
  const [availableOptions, setAvailableOptions] = useState<Level2Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        setLoading(true);
        // Use the relationship method to get Level 2 products for the selected Level 1
        const options = await productDataService.getLevel2ProductsForLevel1(level1Product.id);
        setAvailableOptions(options.filter(p => p.enabled));
      } catch (error) {
        console.error('Error loading Level 2 options:', error);
        setAvailableOptions([]);
      } finally {
        setLoading(false);
      }
    };

    loadOptions();
  }, [level1Product.id]);

  const isSelected = (option: Level2Product) => {
    return selectedOptions.some(selected => selected.id === option.id);
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-medium text-white">Select {level1Product.name} Options</h3>
        <div className="text-center py-8">
          <p className="text-gray-400">Loading options...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-medium text-white">Select {level1Product.name} Options</h3>
      
      {availableOptions.length > 0 ? (
        <div className="grid gap-4 md:grid-cols-2">
          {availableOptions.map((option) => (
            <Card
              key={option.id}
              className={`cursor-pointer transition-all hover:shadow-lg ${
                isSelected(option)
                  ? 'bg-red-600 border-red-500'
                  : 'bg-gray-900 border-gray-800 hover:border-red-500'
              }`}
              onClick={() => onOptionToggle(option)}
            >
              <CardHeader>
                <CardTitle className="text-white flex items-center justify-between">
                  {option.name}
                  <Badge variant="outline" className="text-xs">
                    {option.type}
                  </Badge>
                </CardTitle>
              </CardHeader>
              <CardContent>
                <p className="text-gray-400 text-sm mb-3">{option.description}</p>
                <div className="flex justify-between items-center">
                  {canSeePrices && option.price && (
                    <span className="text-white font-medium">
                      ${option.price.toLocaleString()}
                    </span>
                  )}
                  {option.partNumber && (
                    <Badge variant="outline" className="text-xs">
                      {option.partNumber}
                    </Badge>
                  )}
                </div>
                {option.specifications && (
                  <div className="mt-2 flex flex-wrap gap-1">
                    {Object.entries(option.specifications).map(([key, value]) => (
                      <Badge key={key} variant="outline" className="text-xs">
                        {key}: {value}
                      </Badge>
                    ))}
                  </div>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      ) : (
        <div className="text-center py-8">
          <p className="text-gray-400">
            No options available for {level1Product.name}. 
            Please create Level 2 products for this category in the Admin Panel.
          </p>
        </div>
      )}
    </div>
  );
};

export default Level2OptionsSelector;

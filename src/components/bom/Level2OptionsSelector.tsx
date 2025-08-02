import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Level1Product, Level2Product, Level3Product } from '@/types/product';
import { productDataService } from '@/services/productDataService';

interface Level2OptionsSelectorProps {
  level1Product: Level1Product;
  selectedOptions: Level2Product[];
  onOptionToggle: (option: Level2Product) => void;
  onChassisSelect?: (chassis: Level2Product) => void;
  onAddToBOM?: (product: Level1Product | Level2Product | Level3Product) => void;
  canSeePrices?: boolean;
}

const Level2OptionsSelector = ({ 
  level1Product, 
  selectedOptions, 
  onOptionToggle, 
  onChassisSelect, 
  onAddToBOM,
  canSeePrices = true 
}: Level2OptionsSelectorProps) => {
  const [availableOptions, setAvailableOptions] = useState<Level2Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadOptions = async () => {
      try {
        console.group(`[Level2OptionsSelector] Loading options for level 1 product:`, level1Product);
        setLoading(true);
        
        // Use the relationship method to get Level 2 products for the selected Level 1
        console.log('Calling getLevel2ProductsForLevel1 with ID:', level1Product.id);
        const options = await productDataService.getLevel2ProductsForLevel1(level1Product.id);
        
        console.log('Raw options from service:', options);
        
        // Filter enabled products
        const enabledOptions = options.filter(p => p.enabled);
        console.log(`Filtered ${options.length - enabledOptions.length} disabled products`);
        
        console.log('Setting available options:', enabledOptions);
        setAvailableOptions(enabledOptions);
        
        console.groupEnd();
      } catch (error) {
        console.error('Error loading Level 2 options:', error);
        setAvailableOptions([]);
      } finally {
        setLoading(false);
      }
    };

    if (level1Product?.id) {
      loadOptions();
    }
  }, [level1Product?.id]);

  const isSelected = (option: Level2Product) => {
    return selectedOptions.some(selected => selected.id === option.id);
  };

  const handleOptionClick = (option: Level2Product) => {
    console.log('Level2Option clicked:', option.name, 'chassisType:', option.chassisType);
    
    // For single-selection behavior, only handle chassis selection if it's a chassis
    if (option.chassisType && option.chassisType !== 'N/A' && onChassisSelect) {
      console.log('Handling as chassis selection - requires configuration');
      onChassisSelect(option);
    } else {
      // For N/A chassis type or no chassis type, this should add directly to BOM
      console.log('Handling as direct BOM addition');
      onOptionToggle(option);
    }
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
          {availableOptions.map((option) => {
            const isCurrentlySelected = isSelected(option);
            const requiresChassisConfig = option.chassisType && option.chassisType !== 'N/A';
            
            return (
              <Card
                key={option.id}
                className={`cursor-pointer transition-all hover:shadow-lg ${
                  isCurrentlySelected
                    ? 'bg-red-600 border-red-500'
                    : 'bg-gray-900 border-gray-800 hover:border-red-500'
                }`}
                onClick={() => handleOptionClick(option)}
              >
                <CardHeader>
                  <CardTitle className="text-white flex items-center justify-between">
                    {option.name}
                    <div className="flex items-center gap-2">
                      {requiresChassisConfig && (
                        <Badge variant="outline" className="text-xs bg-blue-500 text-white">
                          Configure
                        </Badge>
                      )}
                      <Badge variant="outline" className="text-xs">
                        {option.type}
                      </Badge>
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <p className="text-gray-400 text-sm mb-3">{option.description}</p>
                  {requiresChassisConfig && (
                    <p className="text-xs text-blue-300 mb-2">
                      Requires chassis configuration
                    </p>
                  )}
                  <div className="flex justify-between items-center mb-3">
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
                  
                  {/* Add to BOM Button */}
                  {onAddToBOM && !requiresChassisConfig && (
                    <div className="mb-3">
                      <Button
                        onClick={(e) => {
                          e.stopPropagation();
                          onAddToBOM(option);
                        }}
                        size="sm"
                        className="w-full bg-green-600 hover:bg-green-700 text-white"
                      >
                        Add to BOM
                      </Button>
                    </div>
                  )}
                  
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
            );
          })}
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

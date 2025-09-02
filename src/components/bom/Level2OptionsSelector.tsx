import { useState, useEffect } from 'react';
import { Card, CardHeader, CardTitle, CardContent } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Level1Product, Level2Product, Level3Product } from '@/types/product';
import { productDataService } from '@/services/productDataService';
import { cn } from '@/lib/utils';

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
        
        // Debug: Log the structure of the first option
        if (options.length > 0) {
          console.log('First option details:', {
            id: options[0].id,
            name: options[0].name,
            parentProductId: options[0].parentProductId,
            parentProduct: options[0].parentProduct,
            hasParentProduct: !!options[0].parentProduct,
            level1Product: level1Product
          });
        }
        
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
    
    // Centralized logic: Check if this requires chassis configuration
    const requiresChassisConfig = option.chassisType && option.chassisType !== 'N/A';
    
    if (requiresChassisConfig && onChassisSelect) {
      console.log('Handling as chassis selection - requires configuration');
      onChassisSelect(option);
    } else {
      // For N/A chassis type or no chassis type, use the option toggle handler
      console.log('Handling as option toggle (direct BOM or other behavior)');
      onOptionToggle(option);
    }
  };

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-medium text-foreground">Select {level1Product.name} Options</h3>
        <div className="text-center py-8">
          <p className="text-gray-400">Loading options...</p>
        </div>
      </div>
    );
  }

  console.log('[Level2OptionsSelector] Rendering with level1Product:', {
    id: level1Product.id,
    name: level1Product.name,
    displayName: level1Product.displayName
  });

  // Get the parent display name using the parent product ID
  const getParentTagContent = (option: Level2Product) => {
    // If we have a direct parent reference, use its display name or name
    if (option.parentProduct) {
      return option.parentProduct.displayName || option.parentProduct.name;
    }
    
    // If we have a parentProductId, use it directly
    if (option.parentProductId) {
      return `Parent: ${option.parentProductId}`;
    }
    
    // Fallback to the level1Product prop if available
    if (level1Product) {
      return level1Product.displayName || level1Product.name;
    }
    
    return 'Parent';
  };

  console.log('[Level2OptionsSelector] Rendering with level1Product:', {
    id: level1Product.id,
    name: level1Product.name,
    displayName: level1Product.displayName,
    availableOptions: availableOptions.map(opt => ({
      id: opt.id,
      name: opt.name,
      parentProductId: opt.parentProductId,
      parentProduct: opt.parentProduct
    }))
  });

  return (
    <div className="space-y-4">
      {loading ? (
        <div className="flex items-center justify-center p-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
        </div>
      ) : availableOptions.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {availableOptions.map((option) => {
            const isCurrentlySelected = isSelected(option);
            const requiresChassisConfig = option.chassisType && option.chassisType !== 'N/A';
            
            console.log(`[Level2OptionsSelector] Rendering option ${option.name} with parent:`, {
              optionId: option.id,
              parentProductId: option.parentProductId,
              parentProduct: option.parentProduct,
              resolvedParentName: getParentTagContent(option)
            });
            
            return (
              <div 
                key={option.id}
                title={`Parent ID: ${option.parentProductId || 'N/A'} - ${option.name}`}
                onClick={() => handleOptionClick(option)}
              >
                <Card
                  className={cn(
                    "cursor-pointer transition-all hover:shadow-md h-full overflow-hidden group",
                    isCurrentlySelected ? "ring-2 ring-primary" : "hover:border-primary"
                  )}
                >
                <CardHeader className="pb-2">
                  <CardTitle className="flex items-center justify-between text-sm leading-tight">
                    <span className="truncate">{option.name}</span>
                    <div className="flex items-center gap-1 flex-shrink-0 ml-2">
                      {requiresChassisConfig && (
                        <Badge variant="secondary" className="text-xs">
                          Configure
                        </Badge>
                      )}
                    </div>
                  </CardTitle>
                </CardHeader>
                <CardContent className="pt-0 space-y-2">
                  {option.description && (
                    <p className="text-muted-foreground text-xs line-clamp-2 leading-tight">
                      {option.description}
                    </p>
                  )}
                  {canSeePrices && option.price && (
                    <div className="text-foreground font-medium text-xs space-y-1">
                      <div>Price: ${option.price.toLocaleString()}</div>
                      {option.cost > 0 && (
                        <div className="text-muted-foreground">
                          Cost: ${option.cost.toLocaleString()}
                        </div>
                      )}
                    </div>
                  )}
                  {/* Product link if available */}
                  {option.productInfoUrl && (
                    <a 
                      href={option.productInfoUrl} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-primary text-xs hover:underline"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Product Info
                    </a>
                  )}
                </CardContent>
                </Card>
              </div>
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

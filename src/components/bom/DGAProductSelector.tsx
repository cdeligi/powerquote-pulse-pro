import { useState, useMemo } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Checkbox } from "@/components/ui/checkbox";
import { Label } from "@/components/ui/label";
import { Separator } from "@/components/ui/separator";
import { Level1Product, Level2Product } from "@/types/product";
import { useDGAProducts, useLevel2Products } from "@/hooks/useProductQueries";
import { ExternalLink, Plus, CheckCircle2, Loader2 } from "lucide-react";

interface DGAProductSelectorProps {
  onProductSelect: (product: Level1Product, configuration?: Record<string, any>, level2Options?: Level2Product[]) => void;
  canSeePrices: boolean;
}

const DGAProductSelector = ({ onProductSelect, canSeePrices }: DGAProductSelectorProps) => {
  const [selectedProducts, setSelectedProducts] = useState<Set<string>>(new Set());
  const [selectedLevel2Options, setSelectedLevel2Options] = useState<Record<string, Level2Product[]>>({});

  // Use optimized queries with caching
  const { data: dgaProducts = [], isLoading: dgaLoading, error: dgaError } = useDGAProducts();
  const { data: allLevel2Products = [], isLoading: l2Loading } = useLevel2Products();

  // Filter level 2 products for DGA accessories
  const level2Options = useMemo(() => 
    (allLevel2Products as Level2Product[]).filter(p => 
      p.enabled && 
      (p.type?.includes('CalGas') || 
       p.type?.includes('Standard') || 
       p.type?.includes('Moisture') ||
       p.parentProductId?.toLowerCase().includes('dga'))
    ), 
    [allLevel2Products]
  );

  const loading = dgaLoading || l2Loading;

  const handleProductToggle = (productId: string) => {
    const newSelected = new Set(selectedProducts);
    if (newSelected.has(productId)) {
      newSelected.delete(productId);
      // Remove associated level 2 options
      const updatedLevel2 = { ...selectedLevel2Options };
      delete updatedLevel2[productId];
      setSelectedLevel2Options(updatedLevel2);
    } else {
      newSelected.add(productId);
    }
    setSelectedProducts(newSelected);
  };

  const handleLevel2OptionToggle = (productId: string, option: Level2Product) => {
    const currentOptions = selectedLevel2Options[productId] || [];
    const existingIndex = currentOptions.findIndex(opt => opt.id === option.id);
    
    let updatedOptions;
    if (existingIndex >= 0) {
      updatedOptions = [...currentOptions];
      updatedOptions[existingIndex] = { ...option, enabled: !option.enabled };
    } else {
      updatedOptions = [...currentOptions, { ...option, enabled: true }];
    }
    
    setSelectedLevel2Options({
      ...selectedLevel2Options,
      [productId]: updatedOptions
    });
  };

  const calculateProductPrice = (product: Level1Product, productId: string) => {
    let totalPrice = product.price;
    
    // Add level 2 options pricing
    const level2Total = (selectedLevel2Options[productId] || [])
      .filter(opt => opt.enabled)
      .reduce((sum, opt) => sum + opt.price, 0);
    
    return totalPrice + level2Total;
  };

  const handleAddSelectedProducts = () => {
    // Add selected Level 1 products with their Level 2 options
    selectedProducts.forEach(productId => {
      const product = (dgaProducts as Level1Product[]).find(p => p.id === productId);
      if (product) {
        const level2Opts = selectedLevel2Options[productId] || [];
        onProductSelect(product, {}, level2Opts);
      }
    });

    // Reset selections
    setSelectedProducts(new Set());
    setSelectedLevel2Options({});
  };

  const getTotalPrice = () => {
    let total = 0;
    
    // Level 1 products with their Level 2 options
    selectedProducts.forEach(productId => {
    const product = (dgaProducts as Level1Product[]).find(p => p.id === productId);
      if (product) {
        total += calculateProductPrice(product, productId);
      }
    });
    
    return total;
  };

  const hasSelections = selectedProducts.size > 0;

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <span className="ml-2 text-white">Loading DGA products...</span>
      </div>
    );
  }

  if (dgaError) {
    return (
      <div className="text-center py-8">
        <p className="text-red-400">Error loading DGA products. Please try again.</p>
      </div>
    );
  }

  if ((dgaProducts as Level1Product[]).length === 0) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-400">No DGA products available. Please check the Admin panel to add products.</p>
      </div>
    );
  }

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      <div className="text-center">
        <h2 className="text-3xl font-bold text-white mb-3">DGA Products</h2>
        <p className="text-gray-400 text-lg">Select dissolved gas analysis monitoring equipment</p>
      </div>

      {/* Level 1 Products Grid */}
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <h3 className="text-xl font-semibold text-white">Main Products</h3>
          <Badge variant="outline" className="text-white border-gray-500">
            {selectedProducts.size} selected
          </Badge>
        </div>
        
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {(dgaProducts as Level1Product[]).map((product) => {
            const isSelected = selectedProducts.has(product.id);
            const productPrice = calculateProductPrice(product, product.id);
            
            return (
              <Card 
                key={product.id} 
                className={`bg-gray-800 border-gray-700 transition-all duration-200 hover:shadow-lg ${
                  isSelected ? 'border-red-500 bg-gray-750' : 'hover:border-gray-600'
                }`}
              >
                <CardHeader className="pb-4">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <CardTitle className="text-white text-lg mb-2">{product.name}</CardTitle>
                      <CardDescription className="text-gray-400 mb-3">
                        {product.description}
                      </CardDescription>
                    </div>
                    <Checkbox
                      checked={isSelected}
                      onCheckedChange={() => handleProductToggle(product.id)}
                      className="border-gray-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                    />
                  </div>
                  
                  <div className="flex flex-wrap gap-2">
                    <Badge variant="outline" className="text-white border-gray-500">
                      {product.type}
                    </Badge>
                    {isSelected && (
                      <Badge className="bg-red-600 text-white">
                        <CheckCircle2 className="w-3 h-3 mr-1" />
                        Selected
                      </Badge>
                    )}
                  </div>
                </CardHeader>
                
                <CardContent className="space-y-4">
                  <div className="flex justify-between items-center py-2 border-t border-gray-700">
                    <span className="text-white font-bold text-lg">
                      {canSeePrices ? `$${productPrice.toLocaleString()}` : '—'}
                    </span>
                    <span className="text-gray-400 text-sm">{product.partNumber}</span>
                  </div>

                  {product.productInfoUrl && (
                    <a
                      href={product.productInfoUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-red-400 hover:text-red-300 underline text-sm flex items-center"
                    >
                      <ExternalLink className="h-3 w-3 mr-1" />
                      Product Information
                    </a>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      </div>

      <Separator className="bg-gray-700" />

      {/* Add-ons for Selected Products */}
      {selectedProducts.size > 0 && (
        <Card className="bg-gray-700 border-gray-600">
          <CardHeader>
            <CardTitle className="text-white">Add-ons for Selected Products</CardTitle>
            <CardDescription className="text-gray-400">
              Choose accessories to combine with your main DGA products
            </CardDescription>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              {Array.from(selectedProducts).map((productId) => {
                const product = (dgaProducts as Level1Product[]).find(p => p.id === productId);
                const selectedOptions = selectedLevel2Options[productId] || [];
                
                return (
                  <div key={productId} className="border border-gray-600 rounded p-3">
                    <h4 className="text-white font-medium text-sm mb-2">{product?.name}</h4>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      {level2Options.map((option) => {
                        const isSelected = selectedOptions.some(opt => opt.id === option.id && opt.enabled);
                        
                        return (
                          <div key={option.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                            <div className="flex items-center space-x-2 flex-1">
                              <Checkbox
                                checked={isSelected}
                                onCheckedChange={() => handleLevel2OptionToggle(productId, option)}
                                className="border-gray-600 data-[state=checked]:bg-red-600 data-[state=checked]:border-red-600"
                              />
                              <div className="flex-1">
                                <Label className="text-white font-medium text-xs">
                                  {option.name}
                                </Label>
                              </div>
                            </div>
                            <span className="text-white font-bold text-xs ml-2">
                              {canSeePrices ? `$${option.price.toLocaleString()}` : '—'}
                            </span>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                );
              })}
            </div>
          </CardContent>
        </Card>
      )}

      {/* Selection Summary and Add Button */}
      {hasSelections && (
        <Card className="bg-gray-800 border-red-600 border-2">
          <CardContent className="pt-6">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-semibold text-lg">Selection Summary</h4>
                <p className="text-gray-400">
                  {selectedProducts.size} main product{selectedProducts.size !== 1 ? 's' : ''} + {
                    Object.values(selectedLevel2Options).flat().filter(opt => opt.enabled).length
                  } add-on{Object.values(selectedLevel2Options).flat().filter(opt => opt.enabled).length !== 1 ? 's' : ''}
                </p>
              </div>
              <div className="text-right">
                <span className="text-white font-bold text-2xl">
                  {canSeePrices ? `$${getTotalPrice().toLocaleString()}` : '—'}
                </span>
                <Button
                  onClick={handleAddSelectedProducts}
                  className="bg-red-600 hover:bg-red-700 text-white ml-4"
                  size="lg"
                >
                  <Plus className="mr-2 h-4 w-4" />
                  Add to BOM
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default DGAProductSelector;

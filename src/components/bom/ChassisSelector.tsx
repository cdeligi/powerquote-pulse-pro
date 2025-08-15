import { useState, useEffect } from "react";
import { Level1Product, Level2Product, Level3Product } from "@/types/product";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { productDataService } from "@/services/productDataService";
import { cn } from "@/lib/utils";

interface ChassisSelectorProps {
  onChassisSelect: (chassis: Level2Product) => void;
  selectedChassis: Level2Product | null;
  onAddToBOM?: (product: Level1Product | Level2Product | Level3Product) => void;
  canSeePrices?: boolean;
  level1ProductId?: string; // For fetching chassis based on parent product
}

const ChassisSelector = ({ onChassisSelect, selectedChassis, onAddToBOM, canSeePrices = true, level1ProductId }: ChassisSelectorProps) => {
  const [chassisOptions, setChassisOptions] = useState<Level2Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChassis = async () => {
      try {
        console.group('[ChassisSelector] Loading chassis options');
        setLoading(true);
        
        // Initialize the service first
        console.log('Initializing product data service...');
        await productDataService.initialize();
        
        let chassisProducts: Level2Product[] = [];
        
        // If we have a specific level1ProductId, use it to fetch chassis
        if (level1ProductId) {
          console.log(`Fetching chassis for Level 1 product: ${level1ProductId}`);
          chassisProducts = await productDataService.getLevel2ProductsForLevel1(level1ProductId);
          console.log('Chassis products from parent ID:', chassisProducts);
        } else {
          // Fallback to category-based method for QTMS
          console.log("Fetching QTMS chassis products by category");
          chassisProducts = await productDataService.getLevel2ProductsByCategory('qtms');
          console.log('Chassis products from category:', chassisProducts);
          
          if (!chassisProducts || chassisProducts.length === 0) {
            console.warn('No chassis products found using category-based method, trying different approaches...');
            
            // Try different fallback approaches for QTMS
            const fallbackMethods = [
              () => productDataService.getLevel2ProductsForLevel1('qtms'),
              () => productDataService.getLevel2Products(),
              () => productDataService.getLevel2Products() // Remove invalid category call
            ];
            
            for (const method of fallbackMethods) {
              try {
                const result = await method();
                if (result && result.length > 0) {
                  // Filter for QTMS-related chassis
                  chassisProducts = result.filter(product => 
                    product.name?.toLowerCase().includes('qtms') ||
                    product.description?.toLowerCase().includes('qtms') ||
                    product.chassisType?.toLowerCase().includes('qtms') ||
                    ['LTX', 'MTX', 'STX'].some(type => 
                      product.name?.includes(type) || product.chassisType?.includes(type)
                    )
                  );
                  
                  if (chassisProducts.length > 0) {
                    console.log('Found QTMS chassis products via fallback:', chassisProducts);
                    break;
                  }
                }
              } catch (error) {
                console.warn('Fallback method failed:', error);
              }
            }
          }
        }
        
        if (!chassisProducts || chassisProducts.length === 0) {
          console.error('No chassis products found');
          setChassisOptions([]);
          console.groupEnd();
          return;
        }
        
        // Filter out any disabled chassis
        const enabledChassis = chassisProducts.filter(chassis => {
          const isEnabled = chassis.enabled !== false; // Default to true if undefined
          if (!isEnabled) {
            console.log(`Skipping disabled chassis: ${chassis.id} (${chassis.name})`);
          }
          return isEnabled;
        });
        
        console.log(`Setting ${enabledChassis.length} valid chassis options`);
        setChassisOptions(enabledChassis);
        
      } catch (error) {
        console.error('Error loading chassis options:', error);
        setChassisOptions([]);
      } finally {
        setLoading(false);
        console.groupEnd();
      }
    };

    loadChassis();
  }, [level1ProductId]);

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-foreground mb-4">Select QTMS Chassis</h3>
        <div className="text-center py-8">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-red-600 mx-auto mb-4"></div>
          <p className="text-gray-400">Loading chassis options...</p>
        </div>
      </div>
    );
  }

  if (chassisOptions.length === 0) {
    return (
      <div className="space-y-4">
         <h3 className="text-xl font-bold text-foreground mb-4">Select QTMS Chassis</h3>
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">No QTMS chassis available.</p>
          <p className="text-gray-500 text-sm">Please create Level 2 products (LTX, MTX, STX) for QTMS in the Admin Panel.</p>
          <Button 
            variant="outline" 
            className="mt-4"
            onClick={() => window.location.reload()}
          >
            Refresh
          </Button>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-foreground mb-4">Select QTMS Chassis</h3>
      <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
        {chassisOptions.map((chassis) => (
          <Card
            key={chassis.id}
            className={cn(
              "transition-all hover:shadow-md h-full overflow-hidden",
              selectedChassis?.id === chassis.id ? "ring-2 ring-primary" : "hover:border-primary"
            )}
          >
            <CardHeader>
              <CardTitle className="flex items-center justify-between">
                {chassis.name}
                <Badge variant="outline" className="text-xs">
                  QTMS
                </Badge>
              </CardTitle>
            </CardHeader>
            <CardContent>
              <p className="text-muted-foreground text-sm mb-3">{chassis.description}</p>
              <div className="flex justify-between items-center mb-3">
                {canSeePrices && chassis.price && (
                  <span className="text-foreground font-medium">
                    ${chassis.price.toLocaleString()}
                  </span>
                )}
              </div>
              
              {/* Configure or Add to BOM buttons */}
              <div className="flex flex-col sm:flex-row flex-wrap gap-2 mb-3">
                <Button
                  onClick={(e) => {
                    e.stopPropagation();
                    console.log('Configure Chassis clicked for:', chassis.name, 'chassisType:', chassis.chassisType);
                    onChassisSelect(chassis);
                  }}
                  size="sm"
                  className="w-full sm:flex-1"
                >
                  Configure Chassis
                </Button>
                {onAddToBOM && (
                  <Button
                    onClick={(e) => {
                      e.stopPropagation();
                      onAddToBOM(chassis);
                    }}
                    size="sm"
                    variant="secondary"
                    className="w-full sm:flex-1"
                  >
                    Add to BOM
                  </Button>
                )}
              </div>
              
              {chassis.specifications && (
                <div className="mt-2 flex flex-wrap gap-1">
                  {Object.entries(chassis.specifications).map(([key, value]) => (
                    <Badge key={key} variant="secondary" className="text-xs">
                      {key}: {value}
                    </Badge>
                  ))}
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ChassisSelector;

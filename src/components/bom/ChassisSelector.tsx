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
}

const ChassisSelector = ({ onChassisSelect, selectedChassis, onAddToBOM, canSeePrices = true }: ChassisSelectorProps) => {
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
        
        // Get chassis options using the category-based method
        console.log("Fetching QTMS chassis products by category");
        const qtmsChassisProducts = await productDataService.getLevel2ProductsByCategory('qtms');
        
        console.log('Raw chassis products from service:', qtmsChassisProducts);
        
        if (!qtmsChassisProducts || qtmsChassisProducts.length === 0) {
          console.warn('No QTMS chassis products found using category-based method');
          
          // Fallback to parent-based method
          console.log('Falling back to parent-based method...');
          const fallbackChassis = await productDataService.getLevel2ProductsForLevel1('qtms');
          console.log('Fallback chassis products:', fallbackChassis);
          
          if (!fallbackChassis || fallbackChassis.length === 0) {
            console.error('No QTMS chassis products found using either method');
            setChassisOptions([]);
            console.groupEnd();
            return;
          }
          
          // Filter out any disabled chassis
          const enabledChassis = fallbackChassis.filter(chassis => {
            const isEnabled = chassis.enabled !== false; // Default to true if undefined
            if (!isEnabled) {
              console.log(`Skipping disabled chassis: ${chassis.id} (${chassis.name})`);
            }
            return isEnabled;
          });
          
          console.log(`Setting ${enabledChassis.length} valid chassis options`);
          setChassisOptions(enabledChassis);
          console.groupEnd();
          return;
        }
        
        // If we got here, the category-based method returned products
        const enabledChassis = qtmsChassisProducts.filter(chassis => {
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
  }, []);

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

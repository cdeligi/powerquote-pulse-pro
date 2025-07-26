
import { useState, useEffect } from "react";
import { Level2Product } from "@/types/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";
import { productDataService } from "@/services/productDataService";

interface ChassisSelectorProps {
  onChassisSelect: (chassis: Level2Product) => void;
  selectedChassis: Level2Product | null;
  canSeePrices: boolean;
}

const ChassisSelector = ({ onChassisSelect, selectedChassis, canSeePrices }: ChassisSelectorProps) => {
  const [chassisOptions, setChassisOptions] = useState<Level2Product[]>([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const loadChassis = async () => {
      try {
        setLoading(true);
        
        // Initialize the service first
        await productDataService.initialize();
        
        // Get chassis options from productDataService using the proper relationship
        const qtmsLevel2Products = await productDataService.getLevel2ProductsForLevel1('QTMS');
        const validChassis = qtmsLevel2Products.filter(chassis => 
          chassis.chassisType && chassis.chassisType !== 'N/A' && chassis.enabled
        );
        
        console.log('ChassisSelector: Loaded chassis:', validChassis);
        setChassisOptions(validChassis);
      } catch (error) {
        console.error('Error loading chassis:', error);
        // Fallback to sync method
        try {
          const syncChassis = await productDataService.getLevel2ProductsForLevel1('QTMS');
          const filteredChassis = syncChassis.filter(chassis => chassis.chassisType && chassis.chassisType !== 'N/A' && chassis.enabled);
          setChassisOptions(filteredChassis);
        } catch (syncError) {
          console.error('Sync fallback failed:', syncError);
          setChassisOptions([]);
        }
      } finally {
        setLoading(false);
      }
    };

    loadChassis();
  }, []);

  if (loading) {
    return (
      <div className="space-y-4">
        <h3 className="text-xl font-bold text-white mb-4">Select QTMS Chassis</h3>
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
        <h3 className="text-xl font-bold text-white mb-4">Select QTMS Chassis</h3>
        <div className="text-center py-8">
          <p className="text-gray-400 mb-4">No QTMS chassis available.</p>
          <p className="text-gray-500 text-sm">Please create Level 2 products (LTX, MTX, STX) for QTMS in the Admin Panel.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4">Select QTMS Chassis</h3>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {chassisOptions.map((chassis) => (
          <Card 
            key={chassis.id} 
            className={`bg-gray-900 border-gray-800 hover:border-red-600 transition-all cursor-pointer flex flex-col ${
              selectedChassis?.id === chassis.id ? 'border-red-600 bg-red-900/20' : ''
            }`}
          >
            <CardHeader>
              <CardTitle className="text-white text-lg">{chassis.name}</CardTitle>
              <CardDescription className="text-gray-400">
                {chassis.description}
              </CardDescription>
              <Badge variant="outline" className="w-fit text-white border-gray-500">
                {chassis.chassisType} • {chassis.specifications?.height || '3U'} • {chassis.specifications?.slots || 6} slots
              </Badge>
            </CardHeader>
            <CardContent className="flex-1 flex flex-col">
              <div className="flex-1" />
              
              <div className="space-y-3">
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">
                    {canSeePrices ? `$${chassis.price.toLocaleString()}` : '—'}
                  </span>
                </div>

                {chassis.productInfoUrl && (
                  <div>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300 p-1"
                      onClick={(e) => {
                        e.stopPropagation();
                        window.open(chassis.productInfoUrl, '_blank');
                      }}
                    >
                      <ExternalLink className="h-4 w-4 mr-1" />
                      Product Info
                    </Button>
                  </div>
                )}
                
                <Button 
                  className="w-full bg-red-600 hover:bg-red-700 text-white"
                  onClick={() => onChassisSelect(chassis)}
                >
                  {selectedChassis?.id === chassis.id ? 'Selected' : 'Select Chassis'}
                </Button>
              </div>
            </CardContent>
          </Card>
        ))}
      </div>
    </div>
  );
};

export default ChassisSelector;

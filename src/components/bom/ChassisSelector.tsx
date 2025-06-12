
import { Chassis } from "@/types/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check } from "lucide-react";

interface ChassisSelectorProps {
  onChassisSelect: (chassis: Chassis) => void;
  selectedChassis: Chassis | null;
  canSeePrices: boolean;
}

const ChassisSelector = ({ onChassisSelect, selectedChassis, canSeePrices }: ChassisSelectorProps) => {
  const chassisOptions: Chassis[] = [
    {
      id: 'ltx-6u',
      name: 'LTX Chassis',
      type: 'LTX',
      height: '6U',
      slots: 14,
      price: 12500,
      description: 'High-capacity chassis with 14 slots for maximum flexibility'
    },
    {
      id: 'mtx-3u',
      name: 'MTX Chassis',
      type: 'MTX',
      height: '3U',
      slots: 7,
      price: 8500,
      description: 'Mid-range chassis with 7 slots for balanced solutions'
    },
    {
      id: 'stx-1.5u',
      name: 'STX Chassis',
      type: 'STX',
      height: '1.5U',
      slots: 4,
      price: 5500,
      description: 'Compact chassis with 4 slots for space-constrained applications'
    }
  ];

  return (
    <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
      {chassisOptions.map((chassis) => (
        <Card 
          key={chassis.id} 
          className={`bg-gray-900 border-gray-800 cursor-pointer transition-all hover:border-red-600 ${
            selectedChassis?.id === chassis.id ? 'border-red-600 bg-red-900/20' : ''
          }`}
          onClick={() => onChassisSelect(chassis)}
        >
          <CardHeader>
            <div className="flex justify-between items-start">
              <div>
                <CardTitle className="text-white text-lg">{chassis.name}</CardTitle>
                <CardDescription className="text-gray-400">
                  {chassis.height} • {chassis.slots} slots
                </CardDescription>
              </div>
              {selectedChassis?.id === chassis.id && (
                <Check className="h-5 w-5 text-green-500" />
              )}
            </div>
          </CardHeader>
          <CardContent>
            <p className="text-gray-400 text-sm mb-4">{chassis.description}</p>
            
            <div className="flex justify-between items-center">
              <Badge variant="outline" className="text-xs">
                {chassis.type}
              </Badge>
              <span className="text-white font-bold">
                {canSeePrices ? `$${chassis.price.toLocaleString()}` : '—'}
              </span>
            </div>
            
            <Button 
              className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white"
              onClick={(e) => {
                e.stopPropagation();
                onChassisSelect(chassis);
              }}
            >
              Select Chassis
            </Button>
          </CardContent>
        </Card>
      ))}
    </div>
  );
};

export default ChassisSelector;

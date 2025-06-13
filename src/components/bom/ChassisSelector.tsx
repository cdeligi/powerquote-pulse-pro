
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
      slots: 15, // CPU + 14 slots
      price: 8500,
      description: 'Large form factor with maximum expansion capability',
      image: '/placeholder.svg'
    },
    {
      id: 'mtx-3u',
      name: 'MTX Chassis',
      type: 'MTX',
      height: '3U',
      slots: 8, // CPU + 7 slots
      price: 6200,
      description: 'Medium form factor balancing features and space',
      image: '/placeholder.svg'
    },
    {
      id: 'stx-1.5u',
      name: 'STX Chassis',
      type: 'STX',
      height: '1.5U',
      slots: 5, // CPU + 4 slots
      price: 4100,
      description: 'Compact form factor for space-constrained applications',
      image: '/placeholder.svg'
    }
  ];

  return (
    <div className="space-y-4">
      <h3 className="text-xl font-bold text-white mb-4">Select QTMS Chassis Model</h3>
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
            <CardContent className="space-y-4">
              <p className="text-gray-400 text-sm">{chassis.description}</p>
              
              <div className="flex justify-between items-center">
                <Badge variant="outline" className="text-xs text-white border-gray-500">
                  {chassis.type}
                </Badge>
                <span className="text-white font-bold">
                  {canSeePrices ? `$${chassis.price.toLocaleString()}` : '—'}
                </span>
              </div>
              
              <Button 
                className="w-full bg-red-600 hover:bg-red-700 text-white"
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
    </div>
  );
};

export default ChassisSelector;

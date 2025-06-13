
import { useState } from "react";
import { Chassis } from "@/types/product";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ExternalLink } from "lucide-react";

interface ChassisSelectorProps {
  onChassisSelect: (chassis: Chassis) => void;
  selectedChassis: Chassis | null;
  canSeePrices: boolean;
}

const ChassisSelector = ({ onChassisSelect, selectedChassis, canSeePrices }: ChassisSelectorProps) => {
  const chassisOptions: Chassis[] = [
    {
      id: 'ltx-chassis',
      name: 'LTX Chassis',
      type: 'LTX',
      height: '6U • 14 slots',
      slots: 14,
      price: 4200,
      description: 'Large capacity transformer monitoring system',
      productInfoUrl: 'https://www.qualitrolcorp.com/products/ltx-chassis'
    },
    {
      id: 'mtx-chassis',
      name: 'MTX Chassis',
      type: 'MTX',
      height: '3U • 7 slots',
      slots: 7,
      price: 2800,
      description: 'Medium capacity transformer monitoring system',
      productInfoUrl: 'https://www.qualitrolcorp.com/products/mtx-chassis'
    },
    {
      id: 'stx-chassis',
      name: 'STX Chassis',
      type: 'STX',
      height: '1.5U • 4 slots',
      slots: 4,
      price: 1900,
      description: 'Compact transformer monitoring system',
      productInfoUrl: 'https://www.qualitrolcorp.com/products/stx-chassis'
    }
  ];

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
                {chassis.height}
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

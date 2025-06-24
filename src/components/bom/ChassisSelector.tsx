
import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Level2Product, Chassis } from '@/types/product';
import { productDataService } from '@/services/productDataService';
import { Search, Cpu, Zap, Shield, Check } from 'lucide-react';

interface ChassisSelectorProps {
  onChassisSelect: (chassis: Level2Product) => void;
  selectedChassis: Level2Product | null;
  canSeePrices: boolean;
}

const ChassisSelector = ({ onChassisSelect, selectedChassis, canSeePrices }: ChassisSelectorProps) => {
  const [chassisOptions, setChassisOptions] = useState<Level2Product[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [selectedType, setSelectedType] = useState<'all' | 'LTX' | 'MTX' | 'STX'>('all');

  useEffect(() => {
    const level1Products = productDataService.getLevel1Products();
    const chassisProduct = level1Products.find(p => p.name.toLowerCase().includes('chassis'));
    
    if (chassisProduct?.level2Options) {
      setChassisOptions(chassisProduct.level2Options);
    }
  }, []);

  const filteredChassis = chassisOptions.filter(chassis => {
    const matchesSearch = chassis.name.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         chassis.partNumber?.toLowerCase().includes(searchTerm.toLowerCase());
    
    const matchesType = selectedType === 'all' || chassis.name.includes(selectedType);
    
    return matchesSearch && matchesType;
  });

  const getChassisTypeInfo = (chassisName: string) => {
    if (chassisName.includes('LTX')) {
      return {
        type: 'LTX',
        icon: Zap,
        color: 'text-yellow-400',
        bgColor: 'bg-yellow-400/10',
        borderColor: 'border-yellow-400/20',
        description: 'High-density 15-slot chassis',
        slots: 15,
        layout: '2-row configuration'
      };
    } else if (chassisName.includes('MTX')) {
      return {
        type: 'MTX',
        icon: Cpu,
        color: 'text-blue-400',
        bgColor: 'bg-blue-400/10',
        borderColor: 'border-blue-400/20',
        description: 'Mid-range 8-slot chassis',
        slots: 8,
        layout: 'Single-row configuration'
      };
    } else {
      return {
        type: 'STX',
        icon: Shield,
        color: 'text-green-400',
        bgColor: 'bg-green-400/10',
        borderColor: 'border-green-400/20',
        description: 'Compact 5-slot chassis',
        slots: 5,
        layout: 'Single-row configuration'
      };
    }
  };

  const formatPrice = (price: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD',
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(price);
  };

  return (
    <div className="space-y-6">
      {/* Search and Filter Controls */}
      <div className="flex flex-col sm:flex-row gap-4">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 h-4 w-4" />
          <Input
            placeholder="Search chassis by name or part number..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="pl-10 bg-gray-800 border-gray-700 text-white"
          />
        </div>
        <div className="flex space-x-2">
          {['all', 'LTX', 'MTX', 'STX'].map((type) => (
            <Button
              key={type}
              variant={selectedType === type ? "default" : "outline"}
              size="sm"
              onClick={() => setSelectedType(type as typeof selectedType)}
              className={selectedType === type ? "bg-red-600 hover:bg-red-700" : ""}
            >
              {type.toUpperCase()}
            </Button>
          ))}
        </div>
      </div>

      {/* Chassis Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredChassis.map((chassis) => {
          const typeInfo = getChassisTypeInfo(chassis.name);
          const IconComponent = typeInfo.icon;
          const isSelected = selectedChassis?.id === chassis.id;

          return (
            <Card 
              key={chassis.id}
              className={`
                relative cursor-pointer transition-all duration-300 hover:scale-105
                ${isSelected 
                  ? `bg-gray-800 border-red-500 shadow-lg shadow-red-500/20` 
                  : `bg-gray-900/50 border-gray-800 hover:border-gray-600`
                }
                ${typeInfo.bgColor} ${typeInfo.borderColor}
              `}
              onClick={() => onChassisSelect(chassis)}
            >
              {isSelected && (
                <div className="absolute -top-2 -right-2 bg-red-500 rounded-full p-1">
                  <Check className="h-4 w-4 text-white" />
                </div>
              )}
              
              <CardHeader className="pb-3">
                <div className="flex items-start justify-between">
                  <div className="flex items-center space-x-3">
                    <div className={`p-2 rounded-lg ${typeInfo.bgColor}`}>
                      <IconComponent className={`h-5 w-5 ${typeInfo.color}`} />
                    </div>
                    <div>
                      <Badge variant="outline" className={`${typeInfo.color} border-current`}>
                        {typeInfo.type}
                      </Badge>
                    </div>
                  </div>
                </div>
                <CardTitle className="text-white text-lg leading-tight">
                  {chassis.name}
                </CardTitle>
              </CardHeader>
              
              <CardContent className="space-y-4">
                <p className="text-gray-400 text-sm">{typeInfo.description}</p>
                
                <div className="grid grid-cols-2 gap-4 text-sm">
                  <div>
                    <span className="text-gray-400">Slots:</span>
                    <p className="text-white font-medium">{typeInfo.slots}</p>
                  </div>
                  <div>
                    <span className="text-gray-400">Layout:</span>
                    <p className="text-white font-medium">{typeInfo.layout}</p>
                  </div>
                </div>

                {chassis.partNumber && (
                  <div className="text-sm">
                    <span className="text-gray-400">Part Number:</span>
                    <p className="text-white font-mono">{chassis.partNumber}</p>
                  </div>
                )}

                {canSeePrices && chassis.price && (
                  <div className="pt-2 border-t border-gray-700">
                    <div className="flex justify-between items-center">
                      <span className="text-gray-400">Price:</span>
                      <span className="text-green-400 font-bold text-lg">
                        {formatPrice(chassis.price)}
                      </span>
                    </div>
                  </div>
                )}

                <Button
                  variant={isSelected ? "secondary" : "outline"}
                  size="sm"
                  className={`w-full mt-4 ${
                    isSelected 
                      ? "bg-red-600 hover:bg-red-700 text-white" 
                      : "hover:bg-gray-800"
                  }`}
                  onClick={(e) => {
                    e.stopPropagation();
                    onChassisSelect(chassis);
                  }}
                >
                  {isSelected ? 'Selected' : 'Select Chassis'}
                </Button>
              </CardContent>
            </Card>
          );
        })}
      </div>

      {filteredChassis.length === 0 && (
        <Card className="bg-gray-900/50 border-gray-800">
          <CardContent className="text-center py-12">
            <div className="text-gray-400 space-y-2">
              <Search className="h-12 w-12 mx-auto mb-4 opacity-50" />
              <p className="text-lg">No chassis found</p>
              <p className="text-sm">Try adjusting your search terms or filters</p>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default ChassisSelector;

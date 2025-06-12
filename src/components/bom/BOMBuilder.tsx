
import { useState } from "react";
import { User } from "@/types/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import ChassisSelector from "./ChassisSelector";
import CardLibrary from "./CardLibrary";
import RackVisualizer from "./RackVisualizer";
import { BOMItem, Chassis, Card as ProductCard } from "@/types/product";
import { ShoppingCart, Save, Send } from "lucide-react";

interface BOMBuilderProps {
  user: User;
}

const BOMBuilder = ({ user }: BOMBuilderProps) => {
  const [selectedChassis, setSelectedChassis] = useState<Chassis | null>(null);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [slotAssignments, setSlotAssignments] = useState<Record<number, ProductCard>>({});

  const addToBOM = (product: Chassis | ProductCard, slot?: number) => {
    const newItem: BOMItem = {
      id: `bom-${Date.now()}`,
      product,
      quantity: 1,
      slot
    };
    
    setBomItems(prev => [...prev, newItem]);
    
    if (slot && 'type' in product) {
      setSlotAssignments(prev => ({ ...prev, [slot]: product }));
    }
    
    console.log("Added to BOM:", newItem);
  };

  const removeFromBOM = (itemId: string) => {
    const item = bomItems.find(i => i.id === itemId);
    if (item?.slot) {
      setSlotAssignments(prev => {
        const updated = { ...prev };
        delete updated[item.slot!];
        return updated;
      });
    }
    setBomItems(prev => prev.filter(item => item.id !== itemId));
  };

  const calculateTotal = () => {
    return bomItems.reduce((total, item) => {
      return total + (item.product.price * item.quantity);
    }, 0);
  };

  const canSeePrices = user.role !== 'level1';

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">BOM Builder</h1>
          <p className="text-gray-400">Configure your power transformer solution</p>
        </div>
        <div className="flex space-x-2">
          <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <Send className="mr-2 h-4 w-4" />
            Request Quote
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="chassis" className="w-full">
            <TabsList className="grid w-full grid-cols-2 bg-gray-800">
              <TabsTrigger value="chassis" className="text-white data-[state=active]:bg-red-600">
                1. Select Chassis
              </TabsTrigger>
              <TabsTrigger value="cards" className="text-white data-[state=active]:bg-red-600">
                2. Add Cards
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="chassis">
              <ChassisSelector 
                onChassisSelect={(chassis) => {
                  setSelectedChassis(chassis);
                  addToBOM(chassis);
                }}
                selectedChassis={selectedChassis}
                canSeePrices={canSeePrices}
              />
            </TabsContent>
            
            <TabsContent value="cards">
              {selectedChassis ? (
                <CardLibrary 
                  chassis={selectedChassis}
                  onCardSelect={addToBOM}
                  canSeePrices={canSeePrices}
                />
              ) : (
                <Card className="bg-gray-900 border-gray-800">
                  <CardContent className="p-8 text-center">
                    <p className="text-gray-400">Please select a chassis first</p>
                  </CardContent>
                </Card>
              )}
            </TabsContent>
          </Tabs>

          {/* Rack Visualizer */}
          {selectedChassis && (
            <RackVisualizer 
              chassis={selectedChassis}
              slotAssignments={slotAssignments}
              onSlotClick={(slot) => console.log("Slot clicked:", slot)}
            />
          )}
        </div>

        {/* BOM Summary */}
        <div className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Bill of Materials
              </CardTitle>
              <CardDescription className="text-gray-400">
                {bomItems.length} items configured
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {bomItems.length === 0 ? (
                <p className="text-gray-400 text-sm">No items added yet</p>
              ) : (
                bomItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-start p-3 bg-gray-800 rounded">
                    <div className="flex-1">
                      <p className="text-white font-medium text-sm">{item.product.name}</p>
                      {item.slot && (
                        <Badge variant="outline" className="mt-1 text-xs">
                          Slot {item.slot}
                        </Badge>
                      )}
                    </div>
                    <div className="text-right ml-2">
                      <p className="text-white font-bold text-sm">
                        {canSeePrices ? `$${item.product.price.toLocaleString()}` : '—'}
                      </p>
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => removeFromBOM(item.id)}
                        className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 h-auto"
                      >
                        Remove
                      </Button>
                    </div>
                  </div>
                ))
              )}
              
              {bomItems.length > 0 && (
                <div className="border-t border-gray-700 pt-3 mt-3">
                  <div className="flex justify-between items-center">
                    <span className="text-white font-bold">Total:</span>
                    <span className="text-white font-bold text-lg">
                      {canSeePrices ? `$${calculateTotal().toLocaleString()}` : '—'}
                    </span>
                  </div>
                </div>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
};

export default BOMBuilder;

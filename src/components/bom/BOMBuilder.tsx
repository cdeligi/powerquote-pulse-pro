
import { useState } from "react";
import { User } from "@/types/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Level1ProductSelector from "./Level1ProductSelector";
import ChassisSelector from "./ChassisSelector";
import CardLibrary from "./CardLibrary";
import RackVisualizer from "./RackVisualizer";
import ToggleSwitch from "@/components/ui/toggle-switch";
import { BOMItem, Chassis, Card as ProductCard, Level1Product } from "@/types/product";
import { ShoppingCart, Save, Send, ExternalLink } from "lucide-react";

interface BOMBuilderProps {
  user: User;
}

const BOMBuilder = ({ user }: BOMBuilderProps) => {
  const [selectedLevel1Product, setSelectedLevel1Product] = useState<Level1Product | null>(null);
  const [selectedChassis, setSelectedChassis] = useState<Chassis | null>(null);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [slotAssignments, setSlotAssignments] = useState<Record<number, ProductCard>>({});
  
  // New quote fields
  const [oracleCustomerId, setOracleCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [quotePriority, setQuotePriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  const addToBOM = (product: Chassis | ProductCard | Level1Product, slot?: number) => {
    const newItem: BOMItem = {
      id: `bom-${Date.now()}`,
      product,
      quantity: 1,
      slot,
      enabled: true // Default to enabled
    };
    
    setBomItems(prev => [...prev, newItem]);
    
    // Only add to slot assignments if it's a card (not chassis) and has a slot
    if (slot && 'type' in product && product.type !== 'LTX' && product.type !== 'MTX' && product.type !== 'STX') {
      setSlotAssignments(prev => ({ ...prev, [slot]: product as ProductCard }));
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

  const toggleBOMItem = (itemId: string, enabled: boolean) => {
    setBomItems(prev => prev.map(item => 
      item.id === itemId ? { ...item, enabled } : item
    ));
  };

  const calculateTotal = () => {
    return bomItems
      .filter(item => item.enabled)
      .reduce((total, item) => {
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
          <Button variant="outline" className="border-gray-600 text-black hover:bg-gray-800 hover:text-white bg-white">
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button className="bg-red-600 hover:bg-red-700 text-white">
            <Send className="mr-2 h-4 w-4" />
            Request Quote
          </Button>
        </div>
      </div>

      {/* Quote Information Form */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Quote Information</CardTitle>
          <CardDescription className="text-gray-400">
            Required information for quote generation
          </CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div>
            <Label htmlFor="oracle-id" className="text-white">Oracle Customer ID</Label>
            <Input
              id="oracle-id"
              value={oracleCustomerId}
              onChange={(e) => setOracleCustomerId(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Enter Oracle ID"
            />
          </div>
          <div>
            <Label htmlFor="customer-name" className="text-white">Customer Name</Label>
            <Input
              id="customer-name"
              value={customerName}
              onChange={(e) => setCustomerName(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Enter customer name"
            />
          </div>
          <div>
            <Label htmlFor="priority" className="text-white">Quote Priority</Label>
            <select
              id="priority"
              value={quotePriority}
              onChange={(e) => setQuotePriority(e.target.value as 'High' | 'Medium' | 'Low')}
              className="w-full bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2 mt-1"
            >
              <option value="High">High</option>
              <option value="Medium">Medium</option>
              <option value="Low">Low</option>
            </select>
          </div>
        </CardContent>
      </Card>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Configuration Panel */}
        <div className="lg:col-span-2 space-y-6">
          <Tabs defaultValue="level1" className="w-full">
            <TabsList className="grid w-full grid-cols-3 bg-gray-800">
              <TabsTrigger value="level1" className="text-white data-[state=active]:bg-red-600">
                1. Main System
              </TabsTrigger>
              <TabsTrigger value="chassis" className="text-white data-[state=active]:bg-red-600">
                2. Select Chassis
              </TabsTrigger>
              <TabsTrigger value="cards" className="text-white data-[state=active]:bg-red-600">
                3. Add Cards
              </TabsTrigger>
            </TabsList>
            
            <TabsContent value="level1">
              <Level1ProductSelector 
                onProductSelect={(product) => {
                  setSelectedLevel1Product(product);
                  addToBOM(product);
                }}
                selectedProduct={selectedLevel1Product}
                canSeePrices={canSeePrices}
              />              
            </TabsContent>
            
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

        {/* BOM Summary with Toggle Switches */}
        <div className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Bill of Materials
              </CardTitle>
              <CardDescription className="text-gray-400">
                {bomItems.filter(item => item.enabled).length} of {bomItems.length} items enabled
              </CardDescription>
            </CardHeader>
            <CardContent className="space-y-3">
              {bomItems.length === 0 ? (
                <p className="text-gray-400 text-sm">No items added yet</p>
              ) : (
                bomItems.map((item) => (
                  <div key={item.id} className="flex justify-between items-start p-3 bg-gray-800 rounded">
                    <div className="flex items-start space-x-3 flex-1">
                      <ToggleSwitch
                        checked={item.enabled}
                        onCheckedChange={(enabled) => toggleBOMItem(item.id, enabled)}
                        size="sm"
                      />
                      <div className="flex-1">
                        <p className={`font-medium text-sm ${item.enabled ? 'text-white' : 'text-gray-500'}`}>
                          {item.product.name}
                        </p>
                        {item.slot && (
                          <Badge variant="outline" className="mt-1 text-xs">
                            Slot {item.slot}
                          </Badge>
                        )}
                        {'productInfoUrl' in item.product && item.product.productInfoUrl && (
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-blue-400 hover:text-blue-300 p-0 h-auto mt-1"
                            onClick={() => window.open(item.product.productInfoUrl, '_blank')}
                          >
                            <ExternalLink className="h-3 w-3 mr-1" />
                            Product Info
                          </Button>
                        )}
                      </div>
                    </div>
                    <div className="text-right ml-2">
                      <p className={`font-bold text-sm ${item.enabled ? 'text-white' : 'text-gray-500'}`}>
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
                    <span className="text-white font-bold">Total (Enabled Items):</span>
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

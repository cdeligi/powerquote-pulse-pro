
import { useState } from "react";
import { User } from "@/types/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import ChassisSelector from "./ChassisSelector";
import Level2OptionsSelector from "./Level2OptionsSelector";
import RackVisualizer from "./RackVisualizer";
import SlotCardSelector from "./SlotCardSelector";
import ToggleSwitch from "@/components/ui/toggle-switch";
import { BOMItem, Chassis, Card as ProductCard, Level1Product, Level2Option, isLevel1Product } from "@/types/product";
import { ShoppingCart, Save, Send, ExternalLink, Settings, Plus } from "lucide-react";

interface BOMBuilderProps {
  user: User;
}

const BOMBuilder = ({ user }: BOMBuilderProps) => {
  const [selectedChassis, setSelectedChassis] = useState<Chassis | null>(null);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [slotAssignments, setSlotAssignments] = useState<Record<number, ProductCard>>({});
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [showSlotSelector, setShowSlotSelector] = useState(false);
  
  // Quote fields
  const [oracleCustomerId, setOracleCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [quotePriority, setQuotePriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  const addToBOM = (product: Chassis | ProductCard | Level1Product, slot?: number, level2Options?: Level2Option[]) => {
    const newItem: BOMItem = {
      id: `bom-${Date.now()}`,
      product,
      quantity: 1,
      slot,
      enabled: true,
      level2Options: level2Options || []
    };
    
    setBomItems(prev => [...prev, newItem]);
    console.log("Added to BOM:", newItem);
  };

  const handleChassisSelect = (chassis: Chassis) => {
    setSelectedChassis(chassis);
    addToBOM(chassis);
    // Reset slot assignments when changing chassis
    setSlotAssignments({});
    setSelectedSlot(2); // Start at slot 2 (slot 1 is CPU)
  };

  const addCardToSlot = (card: ProductCard, slot: number) => {
    // Add to BOM with slot assignment
    addToBOM(card, slot);
    
    // Update slot assignments
    setSlotAssignments(prev => ({ ...prev, [slot]: card }));
    
    // Close the slot selector
    setShowSlotSelector(false);
    
    // Auto-advance to next available slot
    if (selectedChassis) {
      const nextSlot = findNextAvailableSlot(slot);
      if (nextSlot) {
        setSelectedSlot(nextSlot);
      }
    }
  };

  const findNextAvailableSlot = (currentSlot: number): number | null => {
    if (!selectedChassis) return null;
    
    for (let i = currentSlot + 1; i <= selectedChassis.slots; i++) {
      if (i !== 1 && !slotAssignments[i]) { // Skip slot 1 (CPU) and occupied slots
        return i;
      }
    }
    return null;
  };

  const handleSlotClick = (slot: number) => {
    if (slot === 1) return; // CPU slot is fixed
    setSelectedSlot(slot);
    setShowSlotSelector(true);
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

  const toggleLevel2Option = (bomItemId: string, optionId: string) => {
    setBomItems(prev => prev.map(item => {
      if (item.id === bomItemId && item.level2Options) {
        return {
          ...item,
          level2Options: item.level2Options.map(opt =>
            opt.id === optionId ? { ...opt, enabled: !opt.enabled } : opt
          )
        };
      }
      return item;
    }));
  };

  const calculateTotal = () => {
    return bomItems
      .filter(item => item.enabled)
      .reduce((total, item) => {
        let itemTotal = item.product.price * item.quantity;
        
        // Add Level 2 options cost
        if (item.level2Options) {
          const level2Total = item.level2Options
            .filter(opt => opt.enabled)
            .reduce((sum, opt) => sum + opt.price, 0);
          itemTotal += level2Total;
        }
        
        return total + itemTotal;
      }, 0);
  };

  const canSeePrices = user.role !== 'level1';

  return (
    <div className="min-h-screen bg-black text-white">
      {/* Header */}
      <div className="flex justify-between items-center p-6 border-b border-gray-800">
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

      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 p-6 space-y-6">
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

          {/* Step 1: Select Chassis */}
          <div className="space-y-4">
            <div className="flex items-center space-x-4">
              <div className="bg-red-600 text-white px-4 py-2 rounded font-medium">
                1. Select Chassis
              </div>
              <div className={`px-4 py-2 rounded font-medium ${selectedChassis ? 'bg-gray-600 text-white' : 'bg-gray-800 text-gray-400'}`}>
                2. Add Cards
              </div>
            </div>

            <ChassisSelector 
              onChassisSelect={handleChassisSelect}
              selectedChassis={selectedChassis}
              canSeePrices={canSeePrices}
            />
          </div>

          {/* Rack Configuration - Shows after chassis selection */}
          {selectedChassis && (
            <RackVisualizer 
              chassis={selectedChassis}
              slotAssignments={slotAssignments}
              onSlotClick={handleSlotClick}
              selectedSlot={selectedSlot}
            />
          )}

          {/* Slot Card Selector Modal */}
          {showSlotSelector && selectedSlot && selectedChassis && (
            <SlotCardSelector
              chassis={selectedChassis}
              slot={selectedSlot}
              onCardSelect={addCardToSlot}
              onClose={() => setShowSlotSelector(false)}
              canSeePrices={canSeePrices}
            />
          )}
        </div>

        {/* BOM Sidebar */}
        <div className="w-96 bg-gray-900 border-l border-gray-800 p-4">
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <ShoppingCart className="mr-2 h-5 w-5" />
                Bill of Materials
              </CardTitle>
              <CardDescription className="text-gray-400">
                {bomItems.filter(item => item.enabled).length} items configured
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Tabs defaultValue="items" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-700">
                  <TabsTrigger value="items" className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white">Items</TabsTrigger>
                  <TabsTrigger value="customization" className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white">Options</TabsTrigger>
                </TabsList>
                
                <TabsContent value="items" className="space-y-3 mt-4">
                  {bomItems.length === 0 ? (
                    <p className="text-gray-400 text-sm">No items added yet</p>
                  ) : (
                    bomItems.map((item) => (
                      <div key={item.id} className="p-3 bg-gray-700 rounded">
                        <div className="flex justify-between items-start">
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

                              {isLevel1Product(item.product) && item.product.productInfoUrl && (
                                <a
                                  href={item.product.productInfoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-red-400 underline text-xs block mt-1"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1 inline" />
                                  Product Info
                                </a>
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
                              className="text-red-400 hover:text-red-300 hover:bg-red-900/20 p-1 h-auto text-xs"
                            >
                              Remove
                            </Button>
                          </div>
                        </div>
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="customization" className="space-y-4 mt-4">
                  {bomItems.length === 0 ? (
                    <p className="text-gray-400 text-sm">No items to customize</p>
                  ) : (
                    bomItems.map((item) => (
                      <div key={item.id} className="p-3 bg-gray-700 rounded">
                        <div className="flex items-center justify-between mb-2">
                          <h4 className="text-white font-medium text-sm">{item.product.name}</h4>
                          <Badge variant={item.enabled ? "default" : "secondary"} className="text-xs">
                            {item.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        
                        {item.level2Options && item.level2Options.length > 0 ? (
                          <div className="space-y-2">
                            {item.level2Options.map((option) => (
                              <div key={option.id} className="flex items-center justify-between p-2 bg-gray-600 rounded">
                                <div className="flex items-center space-x-2">
                                  <ToggleSwitch
                                    checked={option.enabled}
                                    onCheckedChange={() => toggleLevel2Option(item.id, option.id)}
                                    size="sm"
                                  />
                                  <div>
                                    <p className={`text-xs font-medium ${option.enabled ? 'text-white' : 'text-gray-400'}`}>
                                      {option.name}
                                    </p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-xs font-bold ${option.enabled ? 'text-white' : 'text-gray-500'}`}>
                                    {canSeePrices ? `$${option.price.toLocaleString()}` : '—'}
                                  </p>
                                </div>
                              </div>
                            ))}
                          </div>
                        ) : (
                          <p className="text-gray-400 text-xs">No options available</p>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
              
              {bomItems.length > 0 && (
                <div className="border-t border-gray-600 pt-3 mt-4">
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


import { useState } from "react";
import { User } from "@/types/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import Level1ProductSelector from "./Level1ProductSelector";
import Level2OptionsSelector from "./Level2OptionsSelector";
import CardLibrary from "./CardLibrary";
import RackVisualizer from "./RackVisualizer";
import SlotCardSelector from "./SlotCardSelector";
import ToggleSwitch from "@/components/ui/toggle-switch";
import { BOMItem, Chassis, Card as ProductCard, Level1Product, Level2Option, isLevel1Product } from "@/types/product";
import { ShoppingCart, Save, Send, ExternalLink, Settings, Plus } from "lucide-react";

interface BOMBuilderProps {
  user: User;
}

const BOMBuilder = ({ user }: BOMBuilderProps) => {
  const [selectedLevel1Product, setSelectedLevel1Product] = useState<Level1Product | null>(null);
  const [selectedChassis, setSelectedChassis] = useState<Chassis | null>(null);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [slotAssignments, setSlotAssignments] = useState<Record<number, ProductCard>>({});
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [showSlotSelector, setShowSlotSelector] = useState(false);
  const [showLevel2Selector, setShowLevel2Selector] = useState(false);
  const [level1ProductForOptions, setLevel1ProductForOptions] = useState<Level1Product | null>(null);
  
  // New quote fields
  const [oracleCustomerId, setOracleCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [quotePriority, setQuotePriority] = useState<'High' | 'Medium' | 'Low'>('Medium');

  // Function to convert Level 1 QTMS products to chassis
  const getChassisFromLevel1Product = (product: Level1Product): Chassis | null => {
    if (product.type !== 'QTMS') return null;
    
    if (product.id === 'qtms-ltx') {
      return {
        id: 'ltx-6u',
        name: 'LTX Chassis',
        type: 'LTX',
        height: '6U',
        slots: 14,
        price: product.price,
        description: 'High-capacity chassis with 14 slots for maximum flexibility'
      };
    } else if (product.id === 'qtms-mtx') {
      return {
        id: 'mtx-3u',
        name: 'MTX Chassis',
        type: 'MTX',
        height: '3U',
        slots: 7,
        price: product.price,
        description: 'Mid-range chassis with 7 slots for balanced solutions'
      };
    } else if (product.id === 'qtms-stx') {
      return {
        id: 'stx-1.5u',
        name: 'STX Chassis',
        type: 'STX',
        height: '1.5U',
        slots: 4,
        price: product.price,
        description: 'Compact chassis with 4 slots for space-constrained applications'
      };
    }
    return null;
  };

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
    
    // If it's a chassis selection, set it as selected
    if ('slots' in product && product.type && ['LTX', 'MTX', 'STX'].includes(product.type)) {
      setSelectedChassis(product as Chassis);
    }
    
    console.log("Added to BOM:", newItem);
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

  const handleLevel1ProductSelect = (product: Level1Product) => {
    setSelectedLevel1Product(product);
    
    // If it's a QTMS product, automatically set up the chassis
    if (product.type === 'QTMS') {
      const chassis = getChassisFromLevel1Product(product);
      if (chassis) {
        setSelectedChassis(chassis);
        // Reset slot assignments when changing chassis
        setSlotAssignments({});
        setSelectedSlot(2); // Start at slot 2 (slot 1 is CPU)
      }
    } else {
      // For non-QTMS products, clear chassis
      setSelectedChassis(null);
      setSlotAssignments({});
      setSelectedSlot(null);
    }
    
    setLevel1ProductForOptions(product);
    setShowLevel2Selector(true);
  };

  const handleLevel2OptionsSelect = (options: Level2Option[]) => {
    if (level1ProductForOptions) {
      addToBOM(level1ProductForOptions, undefined, options);
      setLevel1ProductForOptions(null);
    }
  };

  const openLevel2Options = (item: BOMItem) => {
    if (isLevel1Product(item.product)) {
      setLevel1ProductForOptions(item.product);
      setShowLevel2Selector(true);
    }
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
          <Level1ProductSelector 
            onProductSelect={handleLevel1ProductSelect}
            selectedProduct={selectedLevel1Product}
            canSeePrices={canSeePrices}
          />

          {/* Rack Visualizer - Shows after Level 1 QTMS selection */}
          {selectedChassis && (
            <RackVisualizer 
              chassis={selectedChassis}
              slotAssignments={slotAssignments}
              onSlotClick={handleSlotClick}
              selectedSlot={selectedSlot}
            />
          )}

          {/* Level 2 Options Selector */}
          {level1ProductForOptions && (
            <Level2OptionsSelector
              level1Product={level1ProductForOptions}
              onOptionsSelect={handleLevel2OptionsSelect}
              selectedOptions={[]}
              canSeePrices={canSeePrices}
              isOpen={showLevel2Selector}
              onClose={() => {
                setShowLevel2Selector(false);
                setLevel1ProductForOptions(null);
              }}
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
            <CardContent>
              <Tabs defaultValue="items" className="w-full">
                <TabsList className="grid w-full grid-cols-2 bg-gray-800">
                  <TabsTrigger value="items" className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white">Items</TabsTrigger>
                  <TabsTrigger value="customization" className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white">Level 2 Options</TabsTrigger>
                </TabsList>
                
                <TabsContent value="items" className="space-y-3 mt-4">
                  {bomItems.length === 0 ? (
                    <p className="text-gray-400 text-sm">No items added yet</p>
                  ) : (
                    bomItems.map((item) => (
                      <div key={item.id} className="p-3 bg-gray-800 rounded">
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
                              
                              {/* Level 2 Options Summary */}
                              {item.level2Options && item.level2Options.length > 0 && (
                                <div className="mt-2 space-y-1">
                                  <p className="text-xs text-gray-400">Level 2 Options:</p>
                                  {item.level2Options.map((option) => (
                                    <div key={option.id} className="text-xs text-gray-300 ml-2">
                                      • {option.name} {option.enabled && canSeePrices && `($${option.price.toLocaleString()})`}
                                    </div>
                                  ))}
                                </div>
                              )}
                              
                              {/* Configuration button for Level 1 products */}
                              {isLevel1Product(item.product) && (
                                <Button
                                  variant="ghost"
                                  size="sm"
                                  className="text-blue-400 hover:text-blue-300 p-0 h-auto mt-1"
                                  onClick={() => openLevel2Options(item)}
                                >
                                  <Settings className="h-3 w-3 mr-1" />
                                  Configure Options
                                </Button>
                              )}

                              {isLevel1Product(item.product) && item.product.productInfoUrl && (
                                <a
                                  href={item.product.productInfoUrl}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="text-red-600 underline text-xs block mt-1"
                                >
                                  <ExternalLink className="h-3 w-3 mr-1 inline" />
                                  Click here for product information
                                </a>
                              )}
                            </div>
                          </div>
                          <div className="text-right ml-2">
                            <p className={`font-bold text-sm ${item.enabled ? 'text-white' : 'text-gray-500'}`}>
                              {canSeePrices ? `$${item.product.price.toLocaleString()}` : '—'}
                            </p>
                            {/* Show Level 2 options total */}
                            {item.level2Options && item.level2Options.length > 0 && canSeePrices && (
                              <p className={`text-xs ${item.enabled ? 'text-gray-400' : 'text-gray-600'}`}>
                                +${item.level2Options.filter(opt => opt.enabled).reduce((sum, opt) => sum + opt.price, 0).toLocaleString()} options
                              </p>
                            )}
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
                      </div>
                    ))
                  )}
                </TabsContent>

                <TabsContent value="customization" className="space-y-4 mt-4">
                  {bomItems.length === 0 ? (
                    <p className="text-gray-400 text-sm">No items to customize</p>
                  ) : (
                    bomItems.map((item) => (
                      <div key={item.id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
                        <div className="flex items-center justify-between mb-3">
                          <h4 className="text-white font-medium">{item.product.name}</h4>
                          <Badge variant={item.enabled ? "default" : "secondary"} className="text-xs">
                            {item.enabled ? "Enabled" : "Disabled"}
                          </Badge>
                        </div>
                        
                        {item.level2Options && item.level2Options.length > 0 ? (
                          <div className="space-y-3">
                            <h5 className="text-sm font-medium text-gray-300">Level 2 Options:</h5>
                            {item.level2Options.map((option) => (
                              <div key={option.id} className="flex items-center justify-between p-3 bg-gray-700 rounded">
                                <div className="flex items-center space-x-3">
                                  <ToggleSwitch
                                    checked={option.enabled}
                                    onCheckedChange={() => toggleLevel2Option(item.id, option.id)}
                                    size="sm"
                                  />
                                  <div>
                                    <p className={`text-sm font-medium ${option.enabled ? 'text-white' : 'text-gray-400'}`}>
                                      {option.name}
                                    </p>
                                    <p className="text-xs text-gray-500">{option.description}</p>
                                  </div>
                                </div>
                                <div className="text-right">
                                  <p className={`text-sm font-bold ${option.enabled ? 'text-white' : 'text-gray-500'}`}>
                                    {canSeePrices ? `$${option.price.toLocaleString()}` : '—'}
                                  </p>
                                </div>
                              </div>
                            ))}
                            
                            {/* Level 2 Options Total */}
                            <div className="pt-2 border-t border-gray-600">
                              <div className="flex justify-between items-center">
                                <span className="text-sm text-gray-300">Level 2 Options Total:</span>
                                <span className="text-sm font-bold text-white">
                                  {canSeePrices 
                                    ? `$${item.level2Options.filter(opt => opt.enabled).reduce((sum, opt) => sum + opt.price, 0).toLocaleString()}`
                                    : '—'
                                  }
                                </span>
                              </div>
                            </div>
                          </div>
                        ) : (
                          <p className="text-gray-400 text-sm">No Level 2 options available for this item.</p>
                        )}
                      </div>
                    ))
                  )}
                </TabsContent>
              </Tabs>
              
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

import { useState } from "react";
import { User } from "@/types/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import ChassisSelector from "./ChassisSelector";
import Level1ProductSelector from "./Level1ProductSelector";
import Level2OptionsSelector from "./Level2OptionsSelector";
import RackVisualizer from "./RackVisualizer";
import SlotCardSelector from "./SlotCardSelector";
import StandaloneProductSelector from "./StandaloneProductSelector";
import AnalogCardConfigurator from "./AnalogCardConfigurator";
import BushingCardConfigurator from "./BushingCardConfigurator";
import ToggleSwitch from "@/components/ui/toggle-switch";
import { BOMItem, Chassis, Card as ProductCard, Level1Product, Level2Product, Level3Product, Level3Customization, isLevel1Product, isChassis, isCard, generateQTMSPartNumber, generateProductPartNumber, ShippingTerms, PaymentTerms } from "@/types/product";
import { Quote } from "@/types/quote";
import { ShoppingCart, Save, Send, ExternalLink, Settings, Plus, Trash2, Monitor } from "lucide-react";
import { generateQuotePDF } from '@/utils/pdfGenerator';

interface BOMBuilderProps {
  user: User;
}

const BOMBuilder = ({ user }: BOMBuilderProps) => {
  const [selectedChassis, setSelectedChassis] = useState<Chassis | null>(null);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [slotAssignments, setSlotAssignments] = useState<Record<number, ProductCard>>({});
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [showSlotSelector, setShowSlotSelector] = useState(false);
  const [showAnalogConfigurator, setShowAnalogConfigurator] = useState(false);
  const [showBushingConfigurator, setShowBushingConfigurator] = useState(false);
  const [configuringAnalogCard, setConfiguringAnalogCard] = useState<BOMItem | null>(null);
  const [configuringBushingCard, setConfiguringBushingCard] = useState<BOMItem | null>(null);
  const [hasRemoteDisplay, setHasRemoteDisplay] = useState(false);
  const [activeTab, setActiveTab] = useState("qtms");
  
  // Quote fields - Updated types to match Quote interface
  const [oracleCustomerId, setOracleCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [sfdcOpportunity, setSfdcOpportunity] = useState(''); // New SFDC Opportunity field
  const [quotePriority, setQuotePriority] = useState<'High' | 'Medium' | 'Low' | 'Urgent'>('Medium');
  const [isRepInvolved, setIsRepInvolved] = useState<boolean | null>(null);
  const [shippingTerms, setShippingTerms] = useState<ShippingTerms>('Ex-Works');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('30');
  const [quoteCurrency, setQuoteCurrency] = useState<'USD' | 'EURO' | 'GBP' | 'CAD'>('USD');

  const addToBOM = (product: Level1Product | Level2Product | Level3Product, slot?: number, level2Options?: Level2Product[], configuration?: Record<string, any>) => {
    let partNumber = '';
    
    // Generate part number based on product type
    if (isLevel1Product(product)) {
      partNumber = generateProductPartNumber(product, configuration);
    } else {
      partNumber = product.partNumber || product.id.toUpperCase();
    }
    
    const newItem: BOMItem = {
      id: `bom-${Date.now()}`,
      product,
      quantity: 1,
      slot,
      enabled: true,
      level2Options: level2Options || [],
      level3Customizations: [],
      configuration: configuration || {},
      partNumber
    };
    
    setBomItems(prev => [...prev, newItem]);
    console.log("Added to BOM:", newItem);
    return newItem;
  };

  const handleChassisSelect = (chassis: Chassis) => {
    setSelectedChassis(chassis);
    addToBOM(chassis);
    // Reset slot assignments when changing chassis
    setSlotAssignments({});
    setSelectedSlot(1); // Start at slot 1 after CPU
  };

  const handleRemoteDisplayToggle = () => {
    const newHasRemoteDisplay = !hasRemoteDisplay;
    setHasRemoteDisplay(newHasRemoteDisplay);
    
    if (newHasRemoteDisplay) {
      // Add remote display to BOM
      const remoteDisplay: Level3Product = {
        id: 'remote-display',
        name: 'Remote Display Panel',
        parentProductId: 'qtms-main',
        type: 'display',
        description: 'Front panel remote display',
        price: 850,
        enabled: true,
        specifications: {},
        partNumber: 'RDP-001'
      };
      addToBOM(remoteDisplay);
    } else {
      // Remove remote display from BOM
      setBomItems(prev => prev.filter(item => item.product.id !== 'remote-display'));
    }
  };

  // Handler for standalone product selection
  const handleStandaloneProductSelect = (product: Level2Product | Level3Product) => {
    addToBOM(product);
  };

  const getBushingSlots = (chassis: Chassis, slotAssignments: Record<number, ProductCard>): number[] => {
    const bushingCard = Object.values(slotAssignments).find(card => card.type === 'bushing');
    if (!bushingCard) return [];

    return Object.keys(slotAssignments)
      .filter(slot => slotAssignments[parseInt(slot)] === bushingCard)
      .map(slot => parseInt(slot));
  };

  const clearBushingSlots = (chassis: Chassis, slotAssignments: Record<number, ProductCard>, setSlotAssignments: (value: React.SetStateAction<Record<number, ProductCard>>) => void) => {
    const bushingSlots = getBushingSlots(chassis, slotAssignments);
    if (bushingSlots.length === 0) return;

    const newSlotAssignments = { ...slotAssignments };
    bushingSlots.forEach(slot => delete newSlotAssignments[slot]);
    setSlotAssignments(newSlotAssignments);
  };

  const addCardToSlot = (card: ProductCard, slot: number) => {
    setSlotAssignments(prev => ({ ...prev, [slot]: card }));
  };

  const findNextAvailableSlot = (chassis: Chassis, slotAssignments: Record<number, ProductCard>): number | null => {
    for (let i = 1; i <= chassis.slots; i++) {
      if (!slotAssignments[i]) {
        return i;
      }
    }
    return null;
  };

  const handleSlotClick = (slot: number) => {
    setSelectedSlot(slot);
    setShowSlotSelector(true);
  };

  const clearSlot = (slot: number) => {
    const newSlotAssignments = { ...slotAssignments };
    delete newSlotAssignments[slot];
    setSlotAssignments(newSlotAssignments);
    
    // Remove the card from the BOM as well
    setBomItems(prev => prev.filter(item => item.slot !== slot));
  };

  const removeFromBOM = (itemId: string) => {
    setBomItems(prev => prev.filter(item => item.id !== itemId));
  };

  const toggleBOMItem = (itemId: string) => {
    setBomItems(prev =>
      prev.map(item =>
        item.id === itemId ? { ...item, enabled: !item.enabled } : item
      )
    );
  };

  const toggleLevel2Option = (bomItemId: string, optionId: string) => {
    setBomItems(prev =>
      prev.map(item => {
        if (item.id === bomItemId) {
          const option = item.level2Options?.find(opt => opt.id === optionId);
          if (option) {
            // Toggle the enabled state of the option
            return {
              ...item,
              level2Options: item.level2Options?.map(opt =>
                opt.id === optionId ? { ...opt, enabled: !opt.enabled } : opt
              )
            };
          }
        }
        return item;
      })
    );
  };

  const calculateItemPrice = (item: BOMItem): number => {
    let basePrice = item.product.price * item.quantity;
    
    if (item.level2Options) {
      basePrice += item.level2Options
        .filter(option => option.enabled)
        .reduce((sum, option) => sum + option.price, 0);
    }
    
    if (item.level3Customizations) {
      basePrice += item.level3Customizations.reduce((sum, customization) => sum + customization.price, 0);
    }
    
    return basePrice;
  };

  const calculateTotal = (): number => {
    return bomItems
      .filter(item => item.enabled)
      .reduce((total, item) => total + calculateItemPrice(item), 0);
  };

  const getQTMSPartNumber = (): string => {
    const qtmsProduct = bomItems.find(item => isLevel1Product(item.product) && item.product.type === 'QTMS');
    const chassis = bomItems.find(item => isChassis(item.product))?.product as Chassis;
    const cards = Object.values(slotAssignments);
    
    if (!qtmsProduct || !chassis) return 'N/A';
    
    return generateQTMSPartNumber(qtmsProduct.product as Level1Product, chassis, cards);
  };

  const getQTMSTotal = (): number => {
    const qtmsProduct = bomItems.find(item => isLevel1Product(item.product) && item.product.type === 'QTMS');
    const chassis = bomItems.find(item => isChassis(item.product))?.product as Chassis;
    const cards = Object.values(slotAssignments);
    
    if (!qtmsProduct || !chassis) return 0;
    
    let total = qtmsProduct.product.price;
    total += chassis.price;
    
    cards.forEach(card => {
      total += card.price;
    });
    
    return total;
  };

  const handleSaveDraft = () => {
    // Save BOM items, quote details, and other relevant state to localStorage
    const bomData = {
      bomItems,
      selectedChassis,
      slotAssignments,
      hasRemoteDisplay,
      oracleCustomerId,
      customerName,
      sfdcOpportunity,
      quotePriority,
      isRepInvolved,
      shippingTerms,
      paymentTerms,
      quoteCurrency
    };
  
    localStorage.setItem('bomDraft', JSON.stringify(bomData));
    alert('BOM draft saved successfully!');
  };

  const handleRequestQuote = () => {
    // Basic quote information
    const quoteInfo: Partial<Quote> = {
      id: `QUOTE-${Date.now()}`,
      customerName,
      oracleCustomerId,
      sfdcOpportunity,
      priority: quotePriority,
      isRepInvolved: isRepInvolved === true,
      shippingTerms,
      paymentTerms,
      quoteCurrency
    };
  
    generateQuotePDF(bomItems, quoteInfo, canSeePrices);
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
          <Button 
            variant="outline" 
            className="border-gray-600 text-white hover:bg-gray-800 hover:text-white bg-gray-900"
            onClick={handleSaveDraft}
          >
            <Save className="mr-2 h-4 w-4" />
            Save Draft
          </Button>
          <Button 
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleRequestQuote}
            disabled={bomItems.length === 0 || !customerName || !oracleCustomerId || !sfdcOpportunity}
          >
            <Send className="mr-2 h-4 w-4" />
            Request Quote
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 p-6">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-4 bg-gray-900 border border-gray-700">
              <TabsTrigger value="qtms" className="text-white data-[state=active]:bg-red-600">
                QTMS Systems
              </TabsTrigger>
              <TabsTrigger value="dga" className="text-white data-[state=active]:bg-red-600">
                DGA Products
              </TabsTrigger>
              <TabsTrigger value="pd" className="text-white data-[state=active]:bg-red-600">
                PD Products
              </TabsTrigger>
              <TabsTrigger value="standalone" className="text-white data-[state=active]:bg-red-600">
                Standalone
              </TabsTrigger>
            </TabsList>

            <TabsContent value="qtms" className="space-y-6">
              {!selectedChassis ? (
                <ChassisSelector onChassisSelect={handleChassisSelect} canSeePrices={canSeePrices} />
              ) : (
                <div className="space-y-6">
                  {/* Remote Display Toggle */}
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white flex items-center">
                        <Monitor className="mr-2 h-5 w-5" />
                        Display Options
                      </CardTitle>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between">
                        <div>
                          <Label className="text-white font-medium">Remote Display Panel</Label>
                          <p className="text-gray-400 text-sm">Add front panel remote display ($850)</p>
                        </div>
                        <ToggleSwitch
                          checked={hasRemoteDisplay}
                          onCheckedChange={handleRemoteDisplayToggle}
                        />
                      </div>
                    </CardContent>
                  </Card>

                  {/* Rack Visualizer */}
                  <RackVisualizer
                    chassis={selectedChassis}
                    slotAssignments={slotAssignments}
                    onSlotClick={handleSlotClick}
                    onSlotClear={clearSlot}
                    selectedSlot={selectedSlot}
                  />
                </div>
              )}
            </TabsContent>

            <TabsContent value="dga" className="space-y-6">
              <Level1ProductSelector
                productTypes={['TM8', 'TM3', 'TM1']}
                onProductSelect={(product, config) => addToBOM(product, undefined, undefined, config)}
                canSeePrices={canSeePrices}
              />
            </TabsContent>

            <TabsContent value="pd" className="space-y-6">
              <Level1ProductSelector
                productTypes={['QPDM']}
                onProductSelect={(product, config) => addToBOM(product, undefined, undefined, config)}
                canSeePrices={canSeePrices}
              />
            </TabsContent>

            <TabsContent value="standalone" className="space-y-6">
              <StandaloneProductSelector
                onProductSelect={handleStandaloneProductSelect}
                canSeePrices={canSeePrices}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* BOM Summary */}
        <div className="w-96 p-6 border-l border-gray-800 space-y-4">
          <h2 className="text-2xl font-bold text-white mb-2">BOM Summary</h2>
          <p className="text-gray-400">Review and finalize your configuration</p>

          {/* Customer and Quote Details */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Quote Details</CardTitle>
              <CardDescription className="text-gray-400">Enter customer and quote information</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div>
                <Label htmlFor="customer-name" className="text-white">Customer Name</Label>
                <Input
                  id="customer-name"
                  className="bg-gray-800 border-gray-600 text-white"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="oracle-id" className="text-white">Oracle Customer ID</Label>
                <Input
                  id="oracle-id"
                  className="bg-gray-800 border-gray-600 text-white"
                  value={oracleCustomerId}
                  onChange={(e) => setOracleCustomerId(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="sfdc-opportunity" className="text-white">SFDC Opportunity ID</Label>
                <Input
                  id="sfdc-opportunity"
                  className="bg-gray-800 border-gray-600 text-white"
                  value={sfdcOpportunity}
                  onChange={(e) => setSfdcOpportunity(e.target.value)}
                />
              </div>
              <div>
                <Label htmlFor="quote-priority" className="text-white">Quote Priority</Label>
                <Select value={quotePriority} onValueChange={value => setQuotePriority(value as 'High' | 'Medium' | 'Low' | 'Urgent')}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select priority" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600 text-white">
                    <SelectItem value="High" className="text-white">High</SelectItem>
                    <SelectItem value="Medium" className="text-white">Medium</SelectItem>
                    <SelectItem value="Low" className="text-white">Low</SelectItem>
                    <SelectItem value="Urgent" className="text-white">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label className="text-white">Is Rep Involved?</Label>
                <div className="flex items-center space-x-4">
                  <label className="flex items-center space-x-2">
                    <Input
                      type="radio"
                      name="rep-involved"
                      value="true"
                      checked={isRepInvolved === true}
                      onChange={() => setIsRepInvolved(true)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                    <span className="text-white">Yes</span>
                  </label>
                  <label className="flex items-center space-x-2">
                    <Input
                      type="radio"
                      name="rep-involved"
                      value="false"
                      checked={isRepInvolved === false}
                      onChange={() => setIsRepInvolved(false)}
                      className="bg-gray-800 border-gray-600 text-white"
                    />
                    <span className="text-white">No</span>
                  </label>
                </div>
              </div>
              <div>
                <Label htmlFor="shipping-terms" className="text-white">Shipping Terms</Label>
                <Select value={shippingTerms} onValueChange={value => setShippingTerms(value as ShippingTerms)}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select terms" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600 text-white">
                    <SelectItem value="Ex-Works" className="text-white">Ex-Works</SelectItem>
                    <SelectItem value="CFR" className="text-white">CFR</SelectItem>
                    <SelectItem value="CIF" className="text-white">CIF</SelectItem>
                    <SelectItem value="CIP" className="text-white">CIP</SelectItem>
                    <SelectItem value="CPT" className="text-white">CPT</SelectItem>
                    <SelectItem value="DDP" className="text-white">DDP</SelectItem>
                    <SelectItem value="DAP" className="text-white">DAP</SelectItem>
                    <SelectItem value="FCA" className="text-white">FCA</SelectItem>
                    <SelectItem value="Prepaid" className="text-white">Prepaid</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="payment-terms" className="text-white">Payment Terms</Label>
                <Select value={paymentTerms} onValueChange={value => setPaymentTerms(value as PaymentTerms)}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select terms" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600 text-white">
                    <SelectItem value="Prepaid" className="text-white">Prepaid</SelectItem>
                    <SelectItem value="15" className="text-white">15 days</SelectItem>
                    <SelectItem value="30" className="text-white">30 days</SelectItem>
                    <SelectItem value="60" className="text-white">60 days</SelectItem>
                    <SelectItem value="90" className="text-white">90 days</SelectItem>
                    <SelectItem value="120" className="text-white">120 days</SelectItem>
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="quote-currency" className="text-white">Quote Currency</Label>
                <Select value={quoteCurrency} onValueChange={value => setQuoteCurrency(value as 'USD' | 'EURO' | 'GBP' | 'CAD')}>
                  <SelectTrigger className="bg-gray-800 border-gray-600 text-white">
                    <SelectValue placeholder="Select currency" />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-600 text-white">
                    <SelectItem value="USD" className="text-white">USD</SelectItem>
                    <SelectItem value="EURO" className="text-white">EURO</SelectItem>
                    <SelectItem value="GBP" className="text-white">GBP</SelectItem>
                    <SelectItem value="CAD" className="text-white">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>
            </CardContent>
          </Card>

          {/* BOM Items List */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">BOM Items</CardTitle>
              <CardDescription className="text-gray-400">List of configured products</CardDescription>
            </CardHeader>
            <CardContent className="space-y-2">
              {bomItems.map((item) => (
                <div key={item.id} className="flex items-center justify-between p-2 bg-gray-800 rounded">
                  <div className="flex items-center space-x-2">
                    <ToggleSwitch
                      checked={item.enabled}
                      onCheckedChange={() => toggleBOMItem(item.id)}
                    />
                    <span className="text-white">{item.product.name}</span>
                    {item.slot !== undefined && (
                      <Badge variant="secondary">Slot {item.slot}</Badge>
                    )}
                  </div>
                  <div className="flex items-center space-x-2">
                    {canSeePrices && (
                      <span className="text-green-500">${calculateItemPrice(item).toLocaleString()}</span>
                    )}
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-500 hover:bg-red-900/20"
                      onClick={() => removeFromBOM(item.id)}
                    >
                      <Trash2 className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              ))}
            </CardContent>
          </Card>

          {/* QTMS Part Number */}
          {selectedChassis && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white">QTMS Part Number</CardTitle>
                <CardDescription className="text-gray-400">
                  Generated part number based on configuration
                </CardDescription>
              </CardHeader>
              <CardContent>
                <div className="flex justify-between items-center">
                  <span className="text-white font-bold">{getQTMSPartNumber()}</span>
                  {canSeePrices && (
                    <span className="text-green-500">${getQTMSTotal().toLocaleString()}</span>
                  )}
                </div>
              </CardContent>
            </Card>
          )}

          {/* Total Price */}
          {canSeePrices && (
            <div className="text-2xl font-bold text-green-500 text-right">
              Total: ${calculateTotal().toLocaleString()}
            </div>
          )}
        </div>
      </div>

      {showSlotSelector && selectedChassis && selectedSlot !== null && (
        <SlotCardSelector
          chassis={selectedChassis}
          slot={selectedSlot}
          onCardSelect={(card, slot) => {
            addCardToSlot(card, slot);
            addToBOM(card, slot);
            setShowSlotSelector(false);
            setSelectedSlot(null);
          }}
          onClose={() => {
            setShowSlotSelector(false);
            setSelectedSlot(null);
          }}
          canSeePrices={canSeePrices}
        />
      )}

      {configuringAnalogCard && (
        <AnalogCardConfigurator
          bomItem={configuringAnalogCard}
          onSave={(config) => {
            // Update the BOM item with the new configuration
            setBomItems(prev => prev.map(item =>
              item.id === configuringAnalogCard.id ? { ...item, configuration: config } : item
            ));
            setShowAnalogConfigurator(false);
            setConfiguringAnalogCard(null);
          }}
          onClose={() => {
            setShowAnalogConfigurator(false);
            setConfiguringAnalogCard(null);
          }}
        />
      )}

      {configuringBushingCard && (
        <BushingCardConfigurator
          bomItem={configuringBushingCard}
          onSave={(customizations) => {
            updateLevel3Customizations(configuringBushingCard.id, customizations);
            setShowBushingConfigurator(false);
            setConfiguringBushingCard(null);
          }}
          onClose={() => {
            setShowBushingConfigurator(false);
            setConfiguringBushingCard(null);
          }}
        />
      )}
    </div>
  );
};

export default BOMBuilder;

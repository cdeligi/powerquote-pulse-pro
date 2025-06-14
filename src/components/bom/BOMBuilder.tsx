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
import AnalogCardConfigurator from "./AnalogCardConfigurator";
import ToggleSwitch from "@/components/ui/toggle-switch";
import { BOMItem, Chassis, Card as ProductCard, Level1Product, Level2Option, Level3Customization, isLevel1Product, isChassis, isCard, generateQTMSPartNumber, generateProductPartNumber } from "@/types/product";
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
  const [configuringAnalogCard, setConfiguringAnalogCard] = useState<BOMItem | null>(null);
  const [hasRemoteDisplay, setHasRemoteDisplay] = useState(false);
  const [activeTab, setActiveTab] = useState("qtms");
  
  // Quote fields
  const [oracleCustomerId, setOracleCustomerId] = useState('');
  const [customerName, setCustomerName] = useState('');
  const [quotePriority, setQuotePriority] = useState<'High' | 'Medium' | 'Low'>('Medium');
  const [isRepInvolved, setIsRepInvolved] = useState<boolean | null>(null);
  const [shippingTerms, setShippingTerms] = useState<string>('');
  const [paymentTerms, setPaymentTerms] = useState<string>('');
  const [quoteCurrency, setQuoteCurrency] = useState<string>('USD');

  const addToBOM = (product: Chassis | ProductCard | Level1Product, slot?: number, level2Options?: Level2Option[], configuration?: Record<string, any>) => {
    let partNumber = '';
    
    // Generate part number based on product type
    if (isLevel1Product(product)) {
      partNumber = generateProductPartNumber(product, configuration);
    } else if (isChassis(product) || isCard(product)) {
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
      const remoteDisplay = {
        id: 'remote-display',
        name: 'Remote Display Panel',
        type: 'display' as const,
        description: 'Front panel remote display',
        price: 850,
        slotRequirement: 0, // No slot required
        compatibleChassis: ['LTX', 'MTX', 'STX'],
        specifications: {},
        productInfoUrl: 'https://www.qualitrolcorp.com/products/remote-display',
        partNumber: 'RDP-001'
      };
      addToBOM(remoteDisplay);
    } else {
      // Remove remote display from BOM
      setBomItems(prev => prev.filter(item => item.product.id !== 'remote-display'));
    }
  };

  const getBushingSlots = (chassisType: string): [number, number] => {
    switch (chassisType) {
      case 'LTX':
        // Try slots 6,7 first, then 13,14 if occupied, force clear 6,7 if both occupied
        if (!slotAssignments[6] && !slotAssignments[7]) {
          return [6, 7];
        } else if (!slotAssignments[13] && !slotAssignments[14]) {
          return [13, 14];
        } else {
          return [6, 7]; // Force clear and use 6,7
        }
      case 'MTX':
        return [6, 7]; // Always use 6,7 for MTX
      case 'STX':
        return [3, 4]; // Always use 3,4 for STX
      default:
        return [6, 7];
    }
  };

  const clearBushingSlots = (slots: [number, number]) => {
    slots.forEach(slot => {
      if (slotAssignments[slot]) {
        // Remove from slot assignments
        setSlotAssignments(prev => {
          const updated = { ...prev };
          delete updated[slot];
          return updated;
        });
        
        // Remove from BOM
        setBomItems(prev => prev.filter(item => item.slot !== slot));
      }
    });
  };

  const addCardToSlot = (card: ProductCard, slot: number) => {
    // Special handling for display cards in LTX chassis - always go to slot 8
    if (card.type === 'display' && selectedChassis?.type === 'LTX') {
      slot = 8;
      
      // Clear slot 8 if occupied
      if (slotAssignments[8]) {
        clearSlot(8);
      }
      
      // Add display card to slot 8
      const newBomItem = addToBOM(card, 8);
      
      // Update slot assignments
      setSlotAssignments(prev => ({ ...prev, [8]: card }));
      
      // Close the slot selector
      setShowSlotSelector(false);
      
      // Find next available slot
      const nextSlot = findNextAvailableSlot(8);
      if (nextSlot) {
        setSelectedSlot(nextSlot);
      }
      
      return;
    }
    
    // Special handling for bushing cards
    if (card.type === 'bushing' && selectedChassis) {
      const bushingSlots = getBushingSlots(selectedChassis.type);
      const [slot1, slot2] = bushingSlots;
      
      // Clear any existing cards in the bushing slots
      clearBushingSlots(bushingSlots);
      
      // Add bushing card to both slots
      const newBomItem = addToBOM(card, slot1);
      
      // Update slot assignments for both slots
      setSlotAssignments(prev => ({ 
        ...prev, 
        [slot1]: card,
        [slot2]: card
      }));
      
      // Close the slot selector
      setShowSlotSelector(false);
      
      // Find next available slot
      const nextSlot = findNextAvailableSlot(slot2);
      if (nextSlot) {
        setSelectedSlot(nextSlot);
      }
      
      return;
    }
    
    // Prevent non-display cards from being placed in slot 8 on LTX chassis
    if (selectedChassis?.type === 'LTX' && slot === 8 && card.type !== 'display') {
      console.log("Slot 8 is reserved for display cards only in LTX chassis");
      return;
    }
    
    // Normal card handling
    const newBomItem = addToBOM(card, slot);
    
    // Update slot assignments
    setSlotAssignments(prev => ({ ...prev, [slot]: card }));
    
    // Close the slot selector
    setShowSlotSelector(false);
    
    // If it's an analog card, open the configurator
    if (card.type === 'analog') {
      setConfiguringAnalogCard(newBomItem);
      setShowAnalogConfigurator(true);
    }
    
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
    
    const maxSlot = selectedChassis.type === 'LTX' ? 14 : 
                   selectedChassis.type === 'MTX' ? 7 : 4;
    
    for (let i = currentSlot + 1; i <= maxSlot; i++) {
      if (!slotAssignments[i]) {
        return i;
      }
    }
    return null;
  };

  const handleSlotClick = (slot: number) => {
    // Prevent non-display cards from being selected for slot 8 in LTX chassis
    if (selectedChassis?.type === 'LTX' && slot === 8) {
      // Only allow if it's for clearing or if we're going to add a display card
      if (slotAssignments[slot]) {
        // Allow clearing
        setSelectedSlot(slot);
        setShowSlotSelector(true);
      } else {
        // Only show display cards for slot 8
        setSelectedSlot(slot);
        setShowSlotSelector(true);
      }
      return;
    }
    
    setSelectedSlot(slot);
    setShowSlotSelector(true);
  };

  const clearSlot = (slot: number) => {
    const cardInSlot = slotAssignments[slot];
    
    // Special handling for bushing cards (they occupy 2 slots)
    if (cardInSlot?.type === 'bushing') {
      // Find both slots occupied by this bushing card
      const occupiedSlots = Object.entries(slotAssignments)
        .filter(([, card]) => card.type === 'bushing' && card.id === cardInSlot.id)
        .map(([slotNum]) => parseInt(slotNum));
      
      // Clear both slots
      occupiedSlots.forEach(slotNum => {
        setSlotAssignments(prev => {
          const updated = { ...prev };
          delete updated[slotNum];
          return updated;
        });
      });
      
      // Remove from BOM (only once since it's one item)
      setBomItems(prev => prev.filter(item => 
        !(item.slot === occupiedSlots[0] && item.product.id === cardInSlot.id)
      ));
    } else {
      // Normal single-slot card
      setSlotAssignments(prev => {
        const updated = { ...prev };
        delete updated[slot];
        return updated;
      });
      
      setBomItems(prev => prev.filter(item => item.slot !== slot));
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

  const updateLevel3Customizations = (bomItemId: string, customizations: Level3Customization[]) => {
    setBomItems(prev => prev.map(item =>
      item.id === bomItemId ? { ...item, level3Customizations: customizations } : item
    ));
  };

  const calculateItemPrice = (item: BOMItem) => {
    let itemTotal = item.product.price * item.quantity;
    
    // Handle configuration-based pricing
    if (item.configuration) {
      // For DGA products with options
      if (isLevel1Product(item.product) && ['TM8', 'TM3', 'TM1'].includes(item.product.type)) {
        const incrementalPrices = {
          'CalGas': 450,
          'Helium Bottle': 280,
          'Moisture Sensor': 320,
          '4-20mA bridge': 180
        };
        
        Object.entries(item.configuration).forEach(([key, value]) => {
          if (value && incrementalPrices[key as keyof typeof incrementalPrices]) {
            itemTotal += incrementalPrices[key as keyof typeof incrementalPrices];
          }
        });
      }
      
      // For PD products with quantity
      if (item.configuration.quantity) {
        itemTotal = item.product.price * parseInt(item.configuration.quantity);
      }
      
      // For QPDM with channel pricing
      if (isLevel1Product(item.product) && item.product.type === 'QPDM' && item.configuration.channels === '6-channel') {
        itemTotal += 2500; // Additional cost for 6-channel
      }
    }
    
    // Add Level 2 options cost
    if (item.level2Options) {
      const level2Total = item.level2Options
        .filter(opt => opt.enabled)
        .reduce((sum, opt) => sum + opt.price, 0);
      itemTotal += level2Total;
    }
    
    // Add Level 3 customizations cost
    if (item.level3Customizations) {
      const level3Total = item.level3Customizations
        .filter(cust => cust.enabled)
        .reduce((sum, cust) => sum + cust.price, 0);
      itemTotal += level3Total;
    }
    
    return itemTotal;
  };

  const calculateTotal = () => {
    return bomItems
      .filter(item => item.enabled)
      .reduce((total, item) => total + calculateItemPrice(item), 0);
  };

  // Enhanced QTMS part number generation
  const getQTMSPartNumber = () => {
    const chassis = bomItems.find(item => isChassis(item.product))?.product as Chassis;
    const cards = bomItems
      .filter(item => isCard(item.product) && item.product.id !== 'remote-display')
      .map(item => item.product as ProductCard);
    
    // Get analog configurations for part number generation
    const analogConfigurations: Record<string, any> = {};
    bomItems
      .filter(item => isCard(item.product) && item.product.type === 'analog')
      .forEach(item => {
        if (item.level3Customizations && item.level3Customizations.length > 0) {
          const sensorTypes: Record<number, string> = {};
          item.level3Customizations.forEach((customization, index) => {
            if (customization.enabled) {
              sensorTypes[index + 1] = customization.name;
            }
          });
          analogConfigurations[item.product.id] = { sensorTypes };
        }
      });
    
    if (chassis) {
      return generateQTMSPartNumber(chassis, cards, hasRemoteDisplay, slotAssignments, analogConfigurations);
    }
    return '';
  };

  // Group QTMS items for combined pricing and generate combined part number
  const getQTMSTotal = () => {
    const qtmsItems = bomItems.filter(item => 
      item.enabled && (
        'slots' in item.product || // Chassis
        item.product.type === 'relay' || 
        item.product.type === 'analog' || 
        item.product.type === 'fiber' || 
        item.product.type === 'display' ||
        item.product.type === 'bushing' ||
        item.product.id === 'remote-display'
      )
    );
    
    return qtmsItems.reduce((total, item) => total + calculateItemPrice(item), 0);
  };

  const handleSaveDraft = () => {
    const quoteData: Partial<Quote> = {
      id: `DRAFT-${Date.now()}`,
      customerName,
      oracleCustomerId,
      priority: quotePriority,
      isRepInvolved,
      shippingTerms,
      paymentTerms,
      quoteCurrency,
      createdAt: new Date().toISOString()
    };

    generateQuotePDF(bomItems, quoteData, canSeePrices);
  };

  const handleRequestQuote = () => {
    // Prepare comprehensive quote request data
    const quoteRequest = {
      id: `QR-${Date.now()}`,
      customerName,
      oracleCustomerId,
      priority: quotePriority,
      isRepInvolved,
      shippingTerms,
      paymentTerms,
      quoteCurrency,
      bomItems: bomItems.filter(item => item.enabled),
      total: calculateTotal(),
      createdAt: new Date().toISOString(),
      status: 'pending_approval' as const
    };

    console.log('Quote request submitted for approval:', quoteRequest);
    // Here you would typically send this to your backend/admin system
    
    // Show success message
    alert('Quote request submitted successfully! You will be notified once it has been reviewed.');
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
            disabled={bomItems.length === 0 || !customerName || !oracleCustomerId}
          >
            <Send className="mr-2 h-4 w-4" />
            Request Quote
          </Button>
        </div>
      </div>

      <div className="flex">
        {/* Main Content */}
        <div className="flex-1 p-6 space-y-6">
          {/* Quote Information Form - Professional Layout */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-4">
              <CardTitle className="text-white text-xl">Quote Information</CardTitle>
              <CardDescription className="text-gray-400">
                Please provide the required information for accurate quote generation
              </CardDescription>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                {/* Customer Information Section */}
                <div className="space-y-6">
                  <div className="border-b border-gray-700 pb-2">
                    <h3 className="text-white font-semibold text-lg">Customer Information</h3>
                  </div>
                  <div className="grid grid-cols-1 gap-4">
                    <div>
                      <Label htmlFor="oracle-id" className="text-white font-medium mb-2 block">Oracle Customer ID *</Label>
                      <Input
                        id="oracle-id"
                        value={oracleCustomerId}
                        onChange={(e) => setOracleCustomerId(e.target.value)}
                        className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                        placeholder="Enter Oracle Customer ID"
                      />
                    </div>
                    <div>
                      <Label htmlFor="customer-name" className="text-white font-medium mb-2 block">Customer Name *</Label>
                      <Input
                        id="customer-name"
                        value={customerName}
                        onChange={(e) => setCustomerName(e.target.value)}
                        className="bg-gray-800 border-gray-600 text-white placeholder:text-gray-400 focus:border-red-500 focus:ring-red-500"
                        placeholder="Enter customer name"
                      />
                    </div>
                  </div>
                </div>

                {/* Quote Configuration Section */}
                <div className="space-y-6">
                  <div className="border-b border-gray-700 pb-2">
                    <h3 className="text-white font-semibold text-lg">Quote Configuration</h3>
                  </div>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                    <div>
                      <Label htmlFor="priority" className="text-white font-medium mb-2 block">Priority Level</Label>
                      <Select value={quotePriority} onValueChange={(value: 'High' | 'Medium' | 'Low') => setQuotePriority(value)}>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white focus:border-red-500 focus:ring-red-500">
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600 z-50">
                          <SelectItem value="High" className="text-white hover:bg-gray-700 focus:bg-gray-700">High Priority</SelectItem>
                          <SelectItem value="Medium" className="text-white hover:bg-gray-700 focus:bg-gray-700">Medium Priority</SelectItem>
                          <SelectItem value="Low" className="text-white hover:bg-gray-700 focus:bg-gray-700">Low Priority</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <div>
                      <Label htmlFor="rep-involved" className="text-white font-medium mb-2 block">Rep Involvement</Label>
                      <Select value={isRepInvolved?.toString() || ''} onValueChange={(value) => setIsRepInvolved(value === 'true')}>
                        <SelectTrigger className="bg-gray-800 border-gray-600 text-white focus:border-red-500 focus:ring-red-500">
                          <SelectValue placeholder="Is Rep involved?" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 border-gray-600 z-50">
                          <SelectItem value="true" className="text-white hover:bg-gray-700 focus:bg-gray-700">Yes</SelectItem>
                          <SelectItem value="false" className="text-white hover:bg-gray-700 focus:bg-gray-700">No</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                  </div>
                </div>
              </div>

              {/* Terms and Currency Section */}
              <div className="mt-8 pt-6 border-t border-gray-700">
                <div className="border-b border-gray-700 pb-2 mb-6">
                  <h3 className="text-white font-semibold text-lg">Terms & Currency</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  <div>
                    <Label htmlFor="shipping-terms" className="text-white font-medium mb-2 block">Shipping Terms</Label>
                    <Select value={shippingTerms} onValueChange={setShippingTerms}>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white focus:border-red-500 focus:ring-red-500">
                        <SelectValue placeholder="Select shipping terms" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600 z-50">
                        <SelectItem value="Ex-Works" className="text-white hover:bg-gray-700 focus:bg-gray-700">Ex-Works</SelectItem>
                        <SelectItem value="CFR" className="text-white hover:bg-gray-700 focus:bg-gray-700">CFR</SelectItem>
                        <SelectItem value="CIF" className="text-white hover:bg-gray-700 focus:bg-gray-700">CIF</SelectItem>
                        <SelectItem value="CIP" className="text-white hover:bg-gray-700 focus:bg-gray-700">CIP</SelectItem>
                        <SelectItem value="CPT" className="text-white hover:bg-gray-700 focus:bg-gray-700">CPT</SelectItem>
                        <SelectItem value="DDP" className="text-white hover:bg-gray-700 focus:bg-gray-700">DDP</SelectItem>
                        <SelectItem value="DAP" className="text-white hover:bg-gray-700 focus:bg-gray-700">DAP</SelectItem>
                        <SelectItem value="FCA" className="text-white hover:bg-gray-700 focus:bg-gray-700">FCA</SelectItem>
                        <SelectItem value="Prepaid" className="text-white hover:bg-gray-700 focus:bg-gray-700">Prepaid</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="payment-terms" className="text-white font-medium mb-2 block">Payment Terms</Label>
                    <Select value={paymentTerms} onValueChange={setPaymentTerms}>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white focus:border-red-500 focus:ring-red-500">
                        <SelectValue placeholder="Select payment days" />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600 z-50">
                        <SelectItem value="Prepaid" className="text-white hover:bg-gray-700 focus:bg-gray-700">Prepaid</SelectItem>
                        <SelectItem value="15" className="text-white hover:bg-gray-700 focus:bg-gray-700">15 days</SelectItem>
                        <SelectItem value="30" className="text-white hover:bg-gray-700 focus:bg-gray-700">30 days</SelectItem>
                        <SelectItem value="60" className="text-white hover:bg-gray-700 focus:bg-gray-700">60 days</SelectItem>
                        <SelectItem value="90" className="text-white hover:bg-gray-700 focus:bg-gray-700">90 days</SelectItem>
                        <SelectItem value="120" className="text-white hover:bg-gray-700 focus:bg-gray-700">120 days</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                  <div>
                    <Label htmlFor="quote-currency" className="text-white font-medium mb-2 block">Currency</Label>
                    <Select value={quoteCurrency} onValueChange={setQuoteCurrency}>
                      <SelectTrigger className="bg-gray-800 border-gray-600 text-white focus:border-red-500 focus:ring-red-500">
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent className="bg-gray-800 border-gray-600 z-50">
                        <SelectItem value="USD" className="text-white hover:bg-gray-700 focus:bg-gray-700">USD ($)</SelectItem>
                        <SelectItem value="EURO" className="text-white hover:bg-gray-700 focus:bg-gray-700">EURO (€)</SelectItem>
                        <SelectItem value="GBP" className="text-white hover:bg-gray-700 focus:bg-gray-700">GBP (£)</SelectItem>
                        <SelectItem value="CAD" className="text-white hover:bg-gray-700 focus:bg-gray-700">CAD (C$)</SelectItem>
                      </SelectContent>
                    </Select>
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* Product Selection Tabs */}
          <div className="space-y-4">
            <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
              <TabsList className="grid w-full grid-cols-3 bg-gray-800">
                <TabsTrigger value="qtms" className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white">
                  1. Select QTMS Model
                </TabsTrigger>
                <TabsTrigger value="dga" className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white">
                  2. DGA
                </TabsTrigger>
                <TabsTrigger value="pd" className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white">
                  3. Partial Discharge
                </TabsTrigger>
              </TabsList>

              <TabsContent value="qtms" className="mt-4">
                <ChassisSelector 
                  onChassisSelect={handleChassisSelect}
                  selectedChassis={selectedChassis}
                  canSeePrices={canSeePrices}
                />
                
                {/* Rack Configuration - Only show in QTMS tab */}
                {selectedChassis && (
                  <div className="mt-6 space-y-4">
                    <RackVisualizer 
                      chassis={selectedChassis}
                      slotAssignments={slotAssignments}
                      onSlotClick={handleSlotClick}
                      onSlotClear={clearSlot}
                      selectedSlot={selectedSlot}
                    />
                    
                    {/* Remote Display Section */}
                    <Card className="bg-gray-900 border-gray-800">
                      <CardHeader>
                        <CardTitle className="text-white">Remote Display Option</CardTitle>
                        <CardDescription className="text-gray-400">
                          Add optional remote display panel (mounted on front panel)
                        </CardDescription>
                      </CardHeader>
                      <CardContent>
                        <div className="flex items-center justify-between">
                          <div className="flex items-center space-x-4">
                            <div 
                              className={`w-16 h-12 border-2 rounded cursor-pointer transition-all flex items-center justify-center ${
                                hasRemoteDisplay 
                                  ? 'border-green-500 bg-green-600' 
                                  : 'border-gray-600 bg-gray-700 hover:border-red-600'
                              }`}
                              onClick={handleRemoteDisplayToggle}
                            >
                              <Monitor className={`h-6 w-6 ${hasRemoteDisplay ? 'text-white' : 'text-gray-400'}`} />
                            </div>
                            <div>
                              <p className="text-white font-medium">Remote Display Panel</p>
                              <p className="text-gray-400 text-sm">Front-mounted LCD display with navigation controls</p>
                              {canSeePrices && (
                                <p className="text-white font-bold mt-1">$850</p>
                              )}
                            </div>
                          </div>
                          <Button
                            variant={hasRemoteDisplay ? "default" : "outline"}
                            onClick={handleRemoteDisplayToggle}
                            className={hasRemoteDisplay 
                              ? "bg-green-600 hover:bg-green-700 text-white" 
                              : "border-gray-600 text-black bg-white hover:bg-gray-100 hover:text-black"
                            }
                          >
                            {hasRemoteDisplay ? 'Remove' : 'Add Display'}
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  </div>
                )}
              </TabsContent>

              <TabsContent value="dga" className="mt-4">
                <Level1ProductSelector 
                  onProductSelect={(product, configuration) => addToBOM(product, undefined, undefined, configuration)}
                  selectedProduct={null}
                  canSeePrices={canSeePrices}
                  productType="DGA"
                />
              </TabsContent>

              <TabsContent value="pd" className="mt-4">
                <Level1ProductSelector 
                  onProductSelect={(product, configuration) => addToBOM(product, undefined, undefined, configuration)}
                  selectedProduct={null}
                  canSeePrices={canSeePrices}
                  productType="PD"
                />
              </TabsContent>
            </Tabs>
          </div>

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

          {/* Analog Card Configurator Modal */}
          {showAnalogConfigurator && configuringAnalogCard && (
            <AnalogCardConfigurator
              bomItem={configuringAnalogCard}
              onSave={(customizations) => {
                updateLevel3Customizations(configuringAnalogCard.id, customizations);
                setShowAnalogConfigurator(false);
                setConfiguringAnalogCard(null);
              }}
              onClose={() => {
                setShowAnalogConfigurator(false);
                setConfiguringAnalogCard(null);
              }}
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
                    <>
                      {/* QTMS Combined Section */}
                      {bomItems.some(item => 
                        item.enabled && (
                          'slots' in item.product || // Chassis
                          item.product.type === 'relay' || 
                          item.product.type === 'analog' || 
                          item.product.type === 'fiber' || 
                          item.product.type === 'display' ||
                          item.product.type === 'bushing' ||
                          item.product.id === 'remote-display'
                        )
                      ) && (
                        <div className="p-3 bg-gray-700 rounded border-l-4 border-red-600">
                          <div className="flex justify-between items-center mb-2">
                            <p className="font-medium text-white">QTMS System</p>
                            <p className="font-bold text-white">
                              {canSeePrices ? `$${getQTMSTotal().toLocaleString()}` : '—'}
                            </p>
                          </div>
                          <div className="space-y-1 text-xs text-gray-300 mb-2">
                            {bomItems
                              .filter(item => 
                                item.enabled && (
                                  'slots' in item.product || // Chassis
                                  item.product.type === 'relay' || 
                                  item.product.type === 'analog' || 
                                  item.product.type === 'fiber' || 
                                  item.product.type === 'display' ||
                                  item.product.type === 'bushing' ||
                                  item.product.id === 'remote-display'
                                )
                              )
                              .map((item) => (
                                <div key={item.id} className="flex justify-between">
                                  <span>• {item.product.name} {item.slot ? `(Slot ${item.slot})` : ''}</span>
                                  <span>{canSeePrices ? `$${calculateItemPrice(item).toLocaleString()}` : '—'}</span>
                                </div>
                              ))}
                          </div>
                          {/* QTMS Part Number */}
                          {getQTMSPartNumber() && (
                            <div className="mt-2 pt-2 border-t border-gray-600">
                              <p className="text-xs text-gray-400">Part Number:</p>
                              <p className="text-xs font-mono text-white">{getQTMSPartNumber()}</p>
                            </div>
                          )}
                        </div>
                      )}

                      {/* Individual DGA/PD Products */}
                      {bomItems
                        .filter(item => 
                          item.enabled && 
                          !('slots' in item.product) && 
                          item.product.type !== 'relay' && 
                          item.product.type !== 'analog' && 
                          item.product.type !== 'fiber' && 
                          item.product.type !== 'display' && 
                          item.product.type !== 'bushing' &&
                          item.product.id !== 'remote-display'
                        )
                        .map((item) => (
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

                                  {/* Configuration details */}
                                  {item.configuration && Object.keys(item.configuration).length > 0 && (
                                    <div className="mt-1 text-xs text-gray-400">
                                      {Object.entries(item.configuration).map(([key, value]) => {
                                        if (value && key !== 'quantity') {
                                          return <div key={key}>{key}: {value.toString()}</div>;
                                        }
                                        return null;
                                      })}
                                      {item.configuration.quantity && (
                                        <div>Qty: {item.configuration.quantity}</div>
                                      )}
                                    </div>
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

                                  {item.product.type === 'analog' && item.level3Customizations && item.level3Customizations.length > 0 && (
                                    <div className="mt-2">
                                      <p className="text-xs text-gray-400 mb-1">Configured Channels:</p>
                                      {item.level3Customizations.filter(c => c.enabled).map((config, idx) => (
                                        <div key={idx} className="text-xs text-white">
                                          Ch{idx + 1}: {config.name}
                                        </div>
                                      ))}
                                    </div>
                                  )}

                                  {/* Part Number */}
                                  {item.partNumber && (
                                    <div className="mt-2 pt-2 border-t border-gray-600">
                                      <p className="text-xs text-gray-400">Part Number:</p>
                                      <p className="text-xs font-mono text-white">{item.partNumber}</p>
                                    </div>
                                  )}
                                </div>
                              </div>
                              <div className="text-right ml-2">
                                <p className={`font-bold text-sm ${item.enabled ? 'text-white' : 'text-gray-500'}`}>
                                  {canSeePrices ? `$${calculateItemPrice(item).toLocaleString()}` : '—'}
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
                        ))}
                    </>
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

                        {item.product.type === 'analog' && (
                          <div className="mt-2">
                            <Button
                              size="sm"
                              variant="outline"
                              className="text-white border-gray-500 hover:bg-gray-600"
                              onClick={() => {
                                setConfiguringAnalogCard(item);
                                setShowAnalogConfigurator(true);
                              }}
                            >
                              <Settings className="h-3 w-3 mr-1" />
                              Configure Channels
                            </Button>
                          </div>
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

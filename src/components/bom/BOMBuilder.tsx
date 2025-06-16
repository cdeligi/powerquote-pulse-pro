
import { useState, useEffect } from 'react';
import { Chassis, Card, Level1Product, BOMItem, QuotePriority, Currency } from "@/types/product";
import { User } from "@/types/auth";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { Plus, ArrowDown, CheckCircle, XCircle, FileText } from "lucide-react";
import { Card as UICard, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import RackVisualizer from "./RackVisualizer";
import { generateQuotePDF } from "@/utils/pdfGenerator";
import { toast } from "@/components/ui/use-toast";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@/components/ui/accordion"
import { ANALOG_SENSOR_TYPES, TM1_CUSTOMIZATION_OPTIONS } from '@/types/product/sensor-config';
import RackPrintView from './RackPrintView';

interface BOMBuilderProps {
  user: User;
}

const BOMBuilder = ({ user }: BOMBuilderProps) => {
  const [level1Products, setLevel1Products] = useState<Level1Product[]>([]);
  const [chassisOptions, setChassisOptions] = useState<Chassis[]>([]);
  const [cardOptions, setCardOptions] = useState<Card[]>([]);
  const [selectedLevel1, setSelectedLevel1] = useState<Level1Product | null>(null);
  const [selectedChassis, setSelectedChassis] = useState<Chassis | null>(null);
  const [slotAssignments, setSlotAssignments] = useState<Record<number, Card>>({});
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [selectedCard, setSelectedCard] = useState<Card | null>(null);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [quoteName, setQuoteName] = useState<string>('');
  const [isQuoteEnabled, setIsQuoteEnabled] = useState<boolean>(false);
  const [isRequestingQuote, setIsRequestingQuote] = useState<boolean>(false);
  const [analogSensorType, setAnalogSensorType] = useState<string>('');
  const [tm1Customization, setTm1Customization] = useState<string>('');

  useEffect(() => {
    // Mock data fetching (replace with actual API calls)
    const fetchProducts = async () => {
      const level1Data: Level1Product[] = [
        { id: '1', name: 'QTMS', type: 'QTMS', description: 'Qualitrol Transformer Monitoring System', price: 12000, enabled: true, productInfoUrl: 'https://www.qualitrolcorp.com/products/qualitrol-qtms-transformer-monitoring-system/', image: '/qtms.webp', hasQuantitySelection: true },
        { id: '2', name: 'TM8', type: 'TM8', description: 'Transformer Monitor TM8', price: 8000, enabled: true, productInfoUrl: 'https://www.qualitrolcorp.com/products/qualitrol-tm8-transformer-monitor/', image: '/tm8.webp' },
        { id: '3', name: 'TM3', type: 'TM3', description: 'Transformer Monitor TM3', price: 5000, enabled: true, productInfoUrl: 'https://www.qualitrolcorp.com/products/qualitrol-tm3-transformer-monitor/', image: '/tm3.webp' },
        { id: '4', name: 'TM1', type: 'TM1', description: 'Transformer Monitor TM1', price: 3000, enabled: true, productInfoUrl: 'https://www.qualitrolcorp.com/products/qualitrol-tm1-transformer-monitor/', image: '/tm1.webp', customizations: ['Moisture Sensor', '4-20mA bridge'] },
        { id: '5', name: 'QPDM', type: 'QPDM', description: 'Qualitrol Partial Discharge Monitor', price: 15000, enabled: true, productInfoUrl: 'https://www.qualitrolcorp.com/products/qualitrol-qpdm-partial-discharge-monitor/', image: '/qpdm.webp' },
      ];
      const chassisData: Chassis[] = [
        { id: '101', name: 'LTX-14', type: 'LTX', height: '3U', slots: 14, price: 2500, description: '19" Rack Mount, 3U high, 14 slots (7 front / 7 rear)', image: '/ltx-14.webp', partNumber: 'LTX-14-001' },
        { id: '102', name: 'MTX-8', type: 'MTX', height: '2U', slots: 8, price: 1800, description: '19" Rack Mount, 2U high, 8 slots', image: '/mtx-8.webp', partNumber: 'MTX-8-002' },
        { id: '103', name: 'STX-4', type: 'STX', height: '1U', slots: 4, price: 1200, description: '19" Rack Mount, 1U high, 4 slots', image: '/stx-4.webp', partNumber: 'STX-4-003' },
      ];
      const cardData: Card[] = [
        { id: '201', name: 'Relay Card', type: 'relay', description: '8-Channel Relay Card', price: 450, slotRequirement: 1, compatibleChassis: ['101', '102', '103'], specifications: { channels: 8, voltage: '24VDC', current: '2A' }, image: '/relay-card.webp', partNumber: 'RELAY-8-001', enabled: true, hasQuantitySelection: false },
        { id: '202', name: 'Analog Input Card', type: 'analog', description: '4-Channel Analog Input Card', price: 600, slotRequirement: 1, compatibleChassis: ['101', '102', '103'], specifications: { channels: 4, inputRange: '0-10V', resolution: '16-bit' }, image: '/analog-input-card.webp', partNumber: 'ANALOG-4-002', enabled: true, hasQuantitySelection: false },
        { id: '203', name: 'Fiber Optic Card', type: 'fiber', description: '2-Channel Fiber Optic Communication Card', price: 800, slotRequirement: 1, compatibleChassis: ['101', '102'], specifications: { channels: 2, protocol: 'Modbus TCP', wavelength: '1310nm' }, image: '/fiber-optic-card.webp', partNumber: 'FIBER-2-003', enabled: true, hasQuantitySelection: false },
        { id: '204', name: 'Display Card', type: 'display', description: 'LCD Display Card', price: 500, slotRequirement: 1, compatibleChassis: ['101', '102', '103'], specifications: { displayType: 'LCD', resolution: '128x64', interface: 'Serial' }, image: '/display-card.webp', partNumber: 'DISPLAY-LCD-004', enabled: true, hasQuantitySelection: false },
        { id: '205', name: 'Bushing Sensor Card', type: 'bushing', description: 'Bushing Sensor Interface Card', price: 700, slotRequirement: 1, compatibleChassis: ['101', '102'], specifications: { sensorType: 'DGA', channels: 6, accuracy: '±1%' }, image: '/bushing-sensor-card.webp', partNumber: 'BUSHING-DGA-005', enabled: true, hasQuantitySelection: false },
      ];

      setLevel1Products(level1Data);
      setChassisOptions(chassisData);
      setCardOptions(cardData);
    };

    fetchProducts();
  }, []);

  const handleLevel1Select = (level1: Level1Product) => {
    setSelectedLevel1(level1);
    setBomItems([{
      id: `bom-${level1.id}`,
      product: level1,
      quantity: 1,
      enabled: true,
      partNumber: level1.partNumber
    }]);
  };

  const handleChassisSelect = (chassis: Chassis) => {
    setSelectedChassis(chassis);
    setSlotAssignments({}); // Clear existing assignments
  };

  const handleSlotClick = (slot: number) => {
    setSelectedSlot(slot);
  };

  const handleSlotClear = (slot: number) => {
    const newAssignments = { ...slotAssignments };
    delete newAssignments[slot];
    setSlotAssignments(newAssignments);
  };

  const handleCardSelect = (card: Card) => {
    if (!selectedSlot) {
      alert('Please select a slot first.');
      return;
    }

    // Check if the selected chassis is compatible with the card
    if (selectedChassis && !card.compatibleChassis.includes(selectedChassis.id)) {
      alert('This card is not compatible with the selected chassis.');
      return;
    }

    // Check if the slot is already occupied
    if (slotAssignments[selectedSlot]) {
      alert('This slot is already occupied. Please clear the slot first.');
      return;
    }

    setSelectedCard(card);
    const newAssignments = { ...slotAssignments, [selectedSlot]: card };
    setSlotAssignments(newAssignments);
    setSelectedSlot(null); // Clear selected slot after assignment
  };

  const handleQuantityChange = (productId: string, quantity: number) => {
    setBomItems(prevItems =>
      prevItems.map(item =>
        item.product.id === productId ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };

  const handleItemEnableToggle = (itemId: string, enabled: boolean) => {
    setBomItems(prevItems =>
      prevItems.map(item =>
        item.id === itemId ? { ...item, enabled: enabled } : item
      )
    );
  };

  const handleRemoveItem = (itemId: string) => {
    setBomItems(prevItems => prevItems.filter(item => item.id !== itemId));
  };

  const calculateTotalPrice = () => {
    return bomItems.filter(item => item.enabled).reduce((total, item) => total + (item.product.price * item.quantity), 0);
  };

  const handleRequestQuote = () => {
    if (!quoteName) {
      alert('Please enter a quote name.');
      return;
    }

    setIsRequestingQuote(true);

    // Prepare BOM items for the quote
    const quoteItems = bomItems.filter(item => item.enabled).map(item => ({
      id: item.id,
      product: item.product,
      quantity: item.quantity,
      slot: item.slot,
      configuration: item.configuration,
      enabled: item.enabled,
      level2Options: item.level2Options,
      level3Customizations: item.level3Customizations,
      partNumber: item.partNumber
    }));

    // Mock quote data (replace with actual data)
    const quoteInfo = {
      id: `QT-${new Date().getTime()}`, // Generate a unique quote ID
      customerName: quoteName,
      oracleCustomerId: 'ORC-12345', // Replace with actual Oracle ID
      priority: 'Medium' as QuotePriority, // Properly typed priority
      isRepInvolved: false, // Default value
      shippingTerms: 'FCA', // Default shipping terms
      paymentTerms: 'Net 30', // Default payment terms
      quoteCurrency: 'USD' as Currency, // Properly typed currency
    };

    // Generate the PDF
    generateQuotePDF(quoteItems, quoteInfo, user.role !== 'level1');

    // Simulate an API call to request the quote
    setTimeout(() => {
      setIsRequestingQuote(false);
      setIsQuoteEnabled(true);
      toast({
        title: "Quote Requested!",
        description: "Your quote has been successfully requested and is being processed.",
      })
    }, 2000);
  };

  const canSeePrices = user.role !== 'level1';

  const assignedCards = Object.values(slotAssignments);
  const totalSlotsRequired = assignedCards.reduce((sum, card) => sum + card.slotRequirement, 0);
  const isChassisFull = selectedChassis ? totalSlotsRequired > selectedChassis.slots : false;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">BOM Builder</h1>
          <p className="text-gray-400">Create your Bill of Materials</p>
        </div>
        <Button className="bg-red-600 hover:bg-red-700 text-white">
          <FileText className="mr-2 h-4 w-4" />
          Save BOM
        </Button>
      </div>

      {/* Level 1 Product Selection */}
      <UICard className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Select Level 1 Product</CardTitle>
          <CardDescription className="text-gray-400">Choose the base product for your configuration</CardDescription>
        </CardHeader>
        <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {level1Products.map(product => (
            <div
              key={product.id}
              className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedLevel1?.id === product.id ? 'border-red-500 bg-gray-800' : 'border-gray-700 hover:border-gray-500 bg-gray-900'}`}
              onClick={() => handleLevel1Select(product)}
            >
              <h3 className="text-lg font-medium text-white">{product.name}</h3>
              <p className="text-gray-400 text-sm">{product.description}</p>
              {product.image && (
                <img src={product.image} alt={product.name} className="mt-2 rounded-md" />
              )}
              {selectedLevel1?.id === product.id && (
                <CheckCircle className="absolute top-2 right-2 text-green-500" />
              )}
            </div>
          ))}
        </CardContent>
      </UICard>

      {/* Chassis Selection */}
      {selectedLevel1 && (
        <UICard className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Select Chassis</CardTitle>
            <CardDescription className="text-gray-400">Choose the appropriate chassis for your configuration</CardDescription>
          </CardHeader>
          <CardContent>
            <Select onValueChange={(value) => {
              const selected = chassisOptions.find(chassis => chassis.id === value);
              if (selected) {
                handleChassisSelect(selected);
              }
            }}>
              <SelectTrigger className="w-full bg-gray-800 text-white border-gray-700 hover:border-gray-500">
                <SelectValue placeholder="Select Chassis" />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 text-white border-gray-700">
                {chassisOptions.map(chassis => (
                  <SelectItem key={chassis.id} value={chassis.id}>{chassis.name} ({chassis.type})</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </CardContent>
        </UICard>
      )}

      {/* Rack Configuration Section */}
      {selectedChassis && (
        <div className="space-y-4">
          <RackVisualizer
            chassis={selectedChassis}
            slotAssignments={slotAssignments}
            onSlotClick={handleSlotClick}
            onSlotClear={handleSlotClear}
            selectedSlot={selectedSlot}
          />
          
          <RackPrintView
            chassis={selectedChassis}
            slotAssignments={slotAssignments}
            onPrint={() => console.log('Print triggered')}
          />
        </div>
      )}

      {/* Slot Card Selector */}
      {selectedChassis && selectedSlot !== null && (
        <UICard className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Select Card for Slot {selectedSlot}</CardTitle>
            <CardDescription className="text-gray-400">Choose a card to install in the selected slot</CardDescription>
          </CardHeader>
          <CardContent className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {cardOptions.map(card => (
              <div
                key={card.id}
                className={`p-4 rounded-lg border cursor-pointer transition-colors ${selectedCard?.id === card.id ? 'border-red-500 bg-gray-800' : 'border-gray-700 hover:border-gray-500 bg-gray-900'}`}
                onClick={() => handleCardSelect(card)}
              >
                <h3 className="text-lg font-medium text-white">{card.name}</h3>
                <p className="text-gray-400 text-sm">{card.description}</p>
                {card.image && (
                  <img src={card.image} alt={card.name} className="mt-2 rounded-md" />
                )}
                {selectedCard?.id === card.id && (
                  <CheckCircle className="absolute top-2 right-2 text-green-500" />
                )}
              </div>
            ))}
          </CardContent>
        </UICard>
      )}

      {/* Card Library */}
      {selectedChassis && (
        <UICard className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Card Library</CardTitle>
            <CardDescription className="text-gray-400">Browse available cards and their details</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {cardOptions.map(card => (
                <UICard key={card.id} className="bg-gray-800 border-gray-700 text-white">
                  <CardHeader>
                    <CardTitle>{card.name}</CardTitle>
                    <CardDescription className="text-gray-400">{card.description}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm">Type: {card.type}</p>
                    <p className="text-sm">Slot Requirement: {card.slotRequirement}</p>
                    {canSeePrices && <p className="text-sm">Price: ${card.price}</p>}
                    <Button variant="secondary" size="sm" onClick={() => {
                      setSelectedCard(card);
                      if (selectedSlot) {
                        handleCardSelect(card);
                      } else {
                        alert('Please select a slot first.');
                      }
                    }}>
                      Add to Slot
                    </Button>
                  </CardContent>
                </UICard>
              ))}
            </div>
          </CardContent>
        </UICard>
      )}

      {/* BOM Summary */}
      <UICard className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">BOM Summary</CardTitle>
          <CardDescription className="text-gray-400">Review and manage your Bill of Materials</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full table-auto">
              <thead>
                <tr className="text-left">
                  <th className="pb-2 text-gray-400">Item</th>
                  <th className="pb-2 text-gray-400">Description</th>
                  <th className="pb-2 text-gray-400">Quantity</th>
                  <th className="pb-2 text-gray-400">Price</th>
                  <th className="pb-2 text-gray-400">Enabled</th>
                  <th className="pb-2 text-gray-400">Actions</th>
                </tr>
              </thead>
              <tbody>
                {bomItems.map(item => (
                  <tr key={item.id} className="border-b border-gray-700">
                    <td className="py-3 text-white">{item.product.name}</td>
                    <td className="py-3 text-gray-400">{item.product.description}</td>
                    <td className="py-3">
                      {item.product.hasQuantitySelection ? (
                        <div className="flex items-center space-x-2">
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuantityChange(item.product.id, item.quantity - 1)}
                          >
                            <ArrowDown className="h-4 w-4" />
                          </Button>
                          <Input
                            type="number"
                            value={item.quantity}
                            onChange={(e) => handleQuantityChange(item.product.id, parseInt(e.target.value))}
                            className="w-20 bg-gray-800 border-gray-700 text-white text-center"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            onClick={() => handleQuantityChange(item.product.id, item.quantity + 1)}
                          >
                            <Plus className="h-4 w-4" />
                          </Button>
                        </div>
                      ) : (
                        <span className="text-white">{item.quantity}</span>
                      )}
                    </td>
                    <td className="py-3 text-white">
                      {canSeePrices ? `$${(item.product.price * item.quantity).toLocaleString()}` : '—'}
                    </td>
                    <td className="py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => handleItemEnableToggle(item.id, !item.enabled)}
                      >
                        {item.enabled ? (
                          <CheckCircle className="h-4 w-4 text-green-500" />
                        ) : (
                          <XCircle className="h-4 w-4 text-red-500" />
                        )}
                      </Button>
                    </td>
                    <td className="py-3">
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-500 hover:text-red-400"
                        onClick={() => handleRemoveItem(item.id)}
                      >
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
          <div className="text-xl font-bold text-white mt-4 text-right">
            Total: {canSeePrices ? `$${calculateTotalPrice().toLocaleString()}` : '—'}
          </div>
        </CardContent>
      </UICard>

      {/* Quote Request Section */}
      <UICard className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Request a Quote</CardTitle>
          <CardDescription className="text-gray-400">Provide details and request a formal quote</CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="quoteName">
              Quote Name
            </label>
            <Input
              type="text"
              id="quoteName"
              placeholder="Enter quote name"
              value={quoteName}
              onChange={(e) => setQuoteName(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          {selectedLevel1?.type === 'TM1' && (
            <Accordion type="single" collapsible className="w-full">
              <AccordionItem value="item-1">
                <AccordionTrigger>TM1 Customizations</AccordionTrigger>
                <AccordionContent>
                  {selectedLevel1.customizations?.includes('Moisture Sensor') && (
                    <div>
                      <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="analogSensorType">
                        Analog Sensor Type
                      </label>
                      <Select onValueChange={setAnalogSensorType}>
                        <SelectTrigger className="w-full bg-gray-800 text-white border-gray-700 hover:border-gray-500">
                          <SelectValue placeholder="Select Sensor Type" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 text-white border-gray-700">
                          {ANALOG_SENSOR_TYPES.map(type => (
                            <SelectItem key={type} value={type}>{type}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                      {analogSensorType && (
                        <p className="text-gray-500 text-xs mt-2">
                          Description: {ANALOG_SENSOR_TYPES.find(key => key === analogSensorType)}
                        </p>
                      )}
                    </div>
                  )}
                  {selectedLevel1.customizations?.includes('4-20mA bridge') && (
                    <div>
                      <label className="block text-gray-400 text-sm font-bold mb-2" htmlFor="tm1Customization">
                        TM1 Customization Option
                      </label>
                      <Select onValueChange={setTm1Customization}>
                        <SelectTrigger className="w-full bg-gray-800 text-white border-gray-700 hover:border-gray-500">
                          <SelectValue placeholder="Select Customization" />
                        </SelectTrigger>
                        <SelectContent className="bg-gray-800 text-white border-gray-700">
                          {TM1_CUSTOMIZATION_OPTIONS.map(option => (
                            <SelectItem key={option} value={option}>{option}</SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </div>
                  )}
                </AccordionContent>
              </AccordionItem>
            </Accordion>
          )}
          <Button
            className="bg-red-600 hover:bg-red-700 text-white"
            onClick={handleRequestQuote}
            disabled={isRequestingQuote || isChassisFull}
          >
            {isRequestingQuote ? (
              <>Requesting Quote...</>
            ) : isChassisFull ? (
              <>Chassis is Full</>
            ) : (
              <>Request Quote</>
            )}
          </Button>
          {isQuoteEnabled && (
            <Badge className="bg-green-600 text-white">Quote Requested</Badge>
          )}
        </CardContent>
      </UICard>
    </div>
  );
};

export default BOMBuilder;

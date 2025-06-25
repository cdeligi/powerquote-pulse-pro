import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { AlertCircle, ShoppingCart, FileText, Settings, DollarSign, Eye, EyeOff } from 'lucide-react';
import { BOMItem, Level1Product, Card as CardType, Chassis, ConsolidatedQTMS } from '@/types/product';
import { User } from '@/types/auth';
import { validateBushingConfiguration } from '@/utils/bushingValidation';
import { consolidateQTMSProducts } from '@/utils/qtmsConsolidation';
import Level1ProductSelector from './Level1ProductSelector';
import Level2OptionsSelector from './Level2OptionsSelector';
import BOMDisplay from './BOMDisplay';
import ChassisSelector from './ChassisSelector';
import CardLibrary from './CardLibrary';
import SlotCardSelector from './SlotCardSelector';
import RackVisualizer from './RackVisualizer';
import QTMSConfigurationEditor from './QTMSConfigurationEditor';
import DiscountSection from './DiscountSection';
import QuoteFieldsSection from './QuoteFieldsSection';
import QuoteSubmissionDialog from './QuoteSubmissionDialog';

interface BOMBuilderProps {
  user: User;
}

interface EditingQTMSConfig {
  qtmsId: string;
  editingConfig: ConsolidatedQTMS;
}

const BOMBuilder = ({ user }: BOMBuilderProps) => {
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [selectedLevel1, setSelectedLevel1] = useState<Level1Product | null>(null);
  const [selectedChassis, setSelectedChassis] = useState<Chassis | null>(null);
  const [selectedCards, setSelectedCards] = useState<CardType[]>([]);
  const [slotAssignments, setSlotAssignments] = useState<Record<number, string>>({});
  const [activeTab, setActiveTab] = useState('products');
  const [showPrices, setShowPrices] = useState(user.role !== 'level1');
  const [consolidatedQTMS, setConsolidatedQTMS] = useState<ConsolidatedQTMS[]>([]);
  const [editingQTMSConfig, setEditingQTMSConfig] = useState<EditingQTMSConfig | null>(null);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [discountJustification, setDiscountJustification] = useState('');
  const [quoteFields, setQuoteFields] = useState<Record<string, any>>({});
  const [showQuoteSubmission, setShowQuoteSubmission] = useState(false);

  const canSeePrices = user.role !== 'level1';

  useEffect(() => {
    const consolidated = consolidateQTMSProducts(bomItems);
    setConsolidatedQTMS(consolidated);
  }, [bomItems]);

  const handleAddToBOM = (item: BOMItem) => {
    setBomItems(prev => {
      const existingIndex = prev.findIndex(
        existing => existing.product.id === item.product.id && existing.slot === item.slot
      );
      
      if (existingIndex >= 0) {
        const updated = [...prev];
        updated[existingIndex] = { ...updated[existingIndex], quantity: updated[existingIndex].quantity + item.quantity };
        return updated;
      }
      
      return [...prev, { ...item, id: `${item.product.id}-${Date.now()}` }];
    });
  };

  const handleRemoveFromBOM = (itemId: string) => {
    setBomItems(prev => prev.filter(item => item.id !== itemId));
  };

  const handleUpdateQuantity = (itemId: string, quantity: number) => {
    setBomItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, quantity } : item
    ));
  };

  const handleToggleItem = (itemId: string) => {
    setBomItems(prev => prev.map(item =>
      item.id === itemId ? { ...item, enabled: !item.enabled } : item
    ));
  };

  const handleLevel1Select = (product: Level1Product) => {
    setSelectedLevel1(product);
    setActiveTab('level2-options');
  };

  const handleLevel2Add = (item: BOMItem) => {
    handleAddToBOM(item);
  };

  const handleChassisSelect = (chassis: Chassis) => {
    setSelectedChassis(chassis);
    handleAddToBOM({
      id: `chassis-${chassis.id}`,
      product: chassis,
      quantity: 1,
      enabled: true
    });
  };

  const handleCardAdd = (card: CardType, slot?: number) => {
    if (slot !== undefined) {
      setSlotAssignments(prev => ({ ...prev, [slot]: card.id }));
    }
    
    const bomItem: BOMItem = {
      id: `card-${card.id}-${slot || Date.now()}`,
      product: card,
      quantity: 1,
      enabled: true,
      slot
    };
    
    handleAddToBOM(bomItem);
  };

  const handleEditQTMSConfig = (qtmsId: string) => {
    const qtmsConfig = consolidatedQTMS.find(q => q.id === qtmsId);
    if (qtmsConfig) {
      setEditingQTMSConfig({
        qtmsId,
        editingConfig: qtmsConfig
      });
    }
  };

  const handleSaveQTMSConfig = (consolidatedQTMS: ConsolidatedQTMS) => {
    const updatedItems = bomItems.map(item => {
      if (item.product.id.startsWith('QTMS') && consolidatedQTMS.items.some(qtmsItem => qtmsItem.id === item.id)) {
        const qtmsItem = consolidatedQTMS.items.find(qi => qi.id === item.id);
        return qtmsItem ? { ...item, ...qtmsItem } : item;
      }
      return item;
    });
    
    setBomItems(updatedItems);
    setEditingQTMSConfig(null);
  };

  const handleQuoteSubmit = (quoteId: string) => {
    console.log('Quote submitted with ID:', quoteId);
    setShowQuoteSubmission(false);
    // Reset form or show success message
    setBomItems([]);
    setDiscountPercentage(0);
    setDiscountJustification('');
    setQuoteFields({});
  };

  const validateBOM = () => {
    const errors: string[] = [];
    
    // Check for enabled items
    const enabledItems = bomItems.filter(item => item.enabled);
    if (enabledItems.length === 0) {
      errors.push('At least one item must be enabled in the BOM');
    }
    
    // Validate bushing configurations
    const bushingErrors = validateBushingConfiguration(bomItems);
    errors.push(...bushingErrors);
    
    return errors;
  };

  const calculateTotals = () => {
    const enabledItems = bomItems.filter(item => item.enabled);
    const subtotal = enabledItems.reduce((total, item) => {
      return total + ((item.product.price || 0) * item.quantity);
    }, 0);
    
    const discountAmount = subtotal * (discountPercentage / 100);
    const total = subtotal - discountAmount;
    
    return { subtotal, discountAmount, total };
  };

  const errors = validateBOM();
  const { subtotal, discountAmount, total } = calculateTotals();
  const hasValidBOM = errors.length === 0 && bomItems.filter(item => item.enabled).length > 0;

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white">BOM Builder</h1>
          <p className="text-gray-400">Build your Bill of Materials step by step</p>
        </div>
        <div className="flex items-center space-x-4">
          {canSeePrices && (
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowPrices(!showPrices)}
              className="text-gray-400 hover:text-white"
            >
              {showPrices ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
              {showPrices ? 'Hide Prices' : 'Show Prices'}
            </Button>
          )}
          <Badge variant="outline" className="text-blue-400 border-blue-400">
            {bomItems.filter(item => item.enabled).length} items
          </Badge>
        </div>
      </div>

      {/* Error Display */}
      {errors.length > 0 && (
        <Alert className="bg-red-900/20 border-red-600">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription className="text-red-400">
            <ul className="list-disc list-inside space-y-1">
              {errors.map((error, index) => (
                <li key={index}>{error}</li>
              ))}
            </ul>
          </AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main Content */}
        <div className="lg:col-span-2">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="grid w-full grid-cols-6 bg-gray-800">
              <TabsTrigger value="products" className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white">
                Products
              </TabsTrigger>
              <TabsTrigger value="level2-options" className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white" disabled={!selectedLevel1}>
                Options
              </TabsTrigger>
              <TabsTrigger value="chassis" className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white">
                Chassis
              </TabsTrigger>
              <TabsTrigger value="cards" className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white">
                Cards
              </TabsTrigger>
              <TabsTrigger value="slots" className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white" disabled={!selectedChassis}>
                Slots
              </TabsTrigger>
              <TabsTrigger value="visualizer" className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white">
                Visualizer
              </TabsTrigger>
            </TabsList>

            <TabsContent value="products" className="mt-6">
              <Level1ProductSelector 
                onSelect={handleLevel1Select}
                canSeePrices={canSeePrices && showPrices}
              />
            </TabsContent>

            <TabsContent value="level2-options" className="mt-6">
              {selectedLevel1 && (
                <Level2OptionsSelector 
                  level1Product={selectedLevel1}
                  onAdd={handleLevel2Add}
                  canSeePrices={canSeePrices && showPrices}
                />
              )}
            </TabsContent>

            <TabsContent value="chassis" className="mt-6">
              <ChassisSelector 
                onSelect={handleChassisSelect}
                canSeePrices={canSeePrices && showPrices}
              />
            </TabsContent>

            <TabsContent value="cards" className="mt-6">
              <CardLibrary 
                onAdd={handleCardAdd}
                canSeePrices={canSeePrices && showPrices}
              />
            </TabsContent>

            <TabsContent value="slots" className="mt-6">
              {selectedChassis && (
                <SlotCardSelector 
                  chassis={selectedChassis}
                  slotAssignments={slotAssignments}
                  onCardAdd={handleCardAdd}
                  canSeePrices={canSeePrices && showPrices}
                />
              )}
            </TabsContent>

            <TabsContent value="visualizer" className="mt-6">
              <RackVisualizer 
                bomItems={bomItems.filter(item => item.enabled)}
              />
            </TabsContent>
          </Tabs>
        </div>

        {/* BOM Sidebar */}
        <div className="space-y-6">
          <BOMDisplay
            items={bomItems}
            onRemoveItem={handleRemoveFromBOM}
            onUpdateQuantity={handleUpdateQuantity}
            onToggleItem={handleToggleItem}
            canSeePrices={canSeePrices && showPrices}
          />

          {/* QTMS Configuration */}
          {consolidatedQTMS.length > 0 && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <Settings className="mr-2 h-4 w-4" />
                  QTMS Configuration
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                {consolidatedQTMS.map((qtms) => (
                  <div key={qtms.id} className="flex justify-between items-center p-3 bg-gray-800 rounded">
                    <div>
                      <p className="text-white font-medium">{qtms.baseProduct.name}</p>
                      <p className="text-gray-400 text-sm">{qtms.items.length} items configured</p>
                    </div>
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => handleEditQTMSConfig(qtms.id)}
                      className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
                    >
                      Configure
                    </Button>
                  </div>
                ))}
              </CardContent>
            </Card>
          )}

          {/* Discount Section */}
          <DiscountSection
            discountPercentage={discountPercentage}
            discountJustification={discountJustification}
            onDiscountChange={setDiscountPercentage}
            onJustificationChange={setDiscountJustification}
            canSeePrices={canSeePrices}
          />

          {/* Quote Fields */}
          <QuoteFieldsSection
            quoteFields={quoteFields}
            onFieldsChange={setQuoteFields}
            user={user}
          />

          {/* Pricing Summary */}
          {canSeePrices && showPrices && (
            <Card className="bg-gray-900 border-gray-800">
              <CardHeader>
                <CardTitle className="text-white flex items-center">
                  <DollarSign className="mr-2 h-4 w-4" />
                  Pricing Summary
                </CardTitle>
              </CardHeader>
              <CardContent className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-400">Subtotal:</span>
                  <span className="text-white font-bold">${subtotal.toLocaleString()}</span>
                </div>
                {discountPercentage > 0 && (
                  <div className="flex justify-between">
                    <span className="text-gray-400">Discount ({discountPercentage}%):</span>
                    <span className="text-red-400 font-bold">-${discountAmount.toLocaleString()}</span>
                  </div>
                )}
                <Separator className="bg-gray-700" />
                <div className="flex justify-between">
                  <span className="text-white font-bold">Total:</span>
                  <span className="text-green-400 font-bold text-lg">${total.toLocaleString()}</span>
                </div>
              </CardContent>
            </Card>
          )}

          {/* Submit Quote Button */}
          <Button
            onClick={() => setShowQuoteSubmission(true)}
            disabled={!hasValidBOM}
            className="w-full bg-green-600 hover:bg-green-700 text-white"
            size="lg"
          >
            <FileText className="mr-2 h-4 w-4" />
            Submit Quote Request
          </Button>
        </div>
      </div>

      {/* QTMS Configuration Editor Modal */}
      {editingQTMSConfig && (
        <QTMSConfigurationEditor
          consolidatedQTMS={editingQTMSConfig.editingConfig}
          onSave={handleSaveQTMSConfig}
          onCancel={() => setEditingQTMSConfig(null)}
          canSeePrices={canSeePrices && showPrices}
        />
      )}

      {/* Quote Submission Dialog */}
      {showQuoteSubmission && (
        <QuoteSubmissionDialog
          bomItems={bomItems.filter(item => item.enabled)}
          quoteFields={quoteFields}
          discountPercentage={discountPercentage}
          discountJustification={discountJustification}
          onSubmit={handleQuoteSubmit}
          onClose={() => setShowQuoteSubmission(false)}
          canSeePrices={canSeePrices && showPrices}
          user={user}
        />
      )}
    </div>
  );
};

export default BOMBuilder;

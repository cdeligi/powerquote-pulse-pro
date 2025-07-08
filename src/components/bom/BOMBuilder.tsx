
import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import Level1ProductSelector from './Level1ProductSelector';
import Level2OptionsSelector from './Level2OptionsSelector';
import ChassisSelector from './ChassisSelector';
import SlotCardSelector from './SlotCardSelector';
import BOMDisplay from './BOMDisplay';
import DiscountSection from './DiscountSection';
import QuoteFieldsSection from './QuoteFieldsSection';
import RackVisualizer from './RackVisualizer';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { Calculator, Package, Server, FileText, Percent } from 'lucide-react';

interface BOMBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  existingQuoteId?: string;
  mode?: 'create' | 'edit' | 'admin-edit';
}

const BOMBuilder: React.FC<BOMBuilderProps> = ({ 
  isOpen, 
  onClose, 
  existingQuoteId, 
  mode = 'create' 
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  const [activeTab, setActiveTab] = useState('products');
  const [bomItems, setBomItems] = useState<any[]>([]);
  const [selectedChassis, setSelectedChassis] = useState<any>(null);
  const [selectedLevel1Product, setSelectedLevel1Product] = useState<any>(null);
  const [selectedLevel2Options, setSelectedLevel2Options] = useState<any[]>([]);
  const [slotAssignments, setSlotAssignments] = useState<Record<number, any>>({});
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [quoteFields, setQuoteFields] = useState<any>({});
  const [loading, setLoading] = useState(false);

  // Enhanced tab configuration with responsive design
  const tabs = [
    { id: 'products', label: 'Products', icon: Package },
    { id: 'chassis', label: 'Chassis', icon: Server },
    { id: 'config', label: 'Config', icon: Calculator },
    { id: 'quote', label: 'Quote Info', icon: FileText },
    { id: 'discount', label: 'Discount', icon: Percent },
  ];

  useEffect(() => {
    if (existingQuoteId && isOpen) {
      loadExistingQuote();
    }
  }, [existingQuoteId, isOpen]);

  const loadExistingQuote = async () => {
    if (!existingQuoteId) return;
    
    setLoading(true);
    try {
      const { data: quote, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', existingQuoteId)
        .single();

      if (quoteError) throw quoteError;

      const { data: items, error: itemsError } = await supabase
        .from('bom_items')
        .select('*')
        .eq('quote_id', existingQuoteId);

      if (itemsError) throw itemsError;

      setBomItems(items || []);
      setQuoteFields(quote?.quote_fields || {});
    } catch (error) {
      console.error('Error loading existing quote:', error);
      toast({
        title: "Error",
        description: "Failed to load existing quote data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const handleLevel2OptionToggle = (option: any) => {
    setSelectedLevel2Options(prev => {
      const isSelected = prev.some(item => item.id === option.id);
      if (isSelected) {
        return prev.filter(item => item.id !== option.id);
      } else {
        return [...prev, option];
      }
    });

    // Add to BOM items
    setBomItems(prev => [...prev, {
      ...option,
      id: null,
      quantity: 1,
      unit_cost: option.cost || 0,
      unit_price: option.price || 0
    }]);
  };

  const handleSlotClick = (slot: number) => {
    setSelectedSlot(slot);
  };

  const handleSlotClear = (slot: number) => {
    setSlotAssignments(prev => {
      const newAssignments = { ...prev };
      delete newAssignments[slot];
      return newAssignments;
    });
  };

  const handleQuoteFieldChange = (fieldId: string, value: any) => {
    setQuoteFields(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleSaveQuote = async () => {
    if (!user) {
      toast({
        title: "Error",
        description: "You must be logged in to save a quote",
        variant: "destructive"
      });
      return;
    }

    if (bomItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one item to your BOM",
        variant: "destructive"
      });
      return;
    }

    // Validate required quote fields
    const requiredFields = ['customer_name', 'oracle_customer_id', 'sfdc_opportunity'];
    const missingFields = requiredFields.filter(field => !quoteFields[field]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Error",
        description: `Please fill in all required fields: ${missingFields.join(', ')}`,
        variant: "destructive"
      });
      setActiveTab('quote');
      return;
    }

    setLoading(true);
    try {
      const totalCost = bomItems.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);
      const totalPrice = bomItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
      const originalMargin = totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0;

      const quoteData = {
        id: existingQuoteId || `QTE-${Date.now()}`,
        user_id: user.id,
        customer_name: quoteFields.customer_name,
        oracle_customer_id: quoteFields.oracle_customer_id,
        sfdc_opportunity: quoteFields.sfdc_opportunity,
        status: 'pending',
        requested_discount: quoteFields.requested_discount || 0,
        original_quote_value: totalPrice,
        discounted_value: totalPrice * (1 - (quoteFields.requested_discount || 0) / 100),
        total_cost: totalCost,
        original_margin: originalMargin,
        discounted_margin: totalPrice > 0 ? ((totalPrice * (1 - (quoteFields.requested_discount || 0) / 100) - totalCost) / (totalPrice * (1 - (quoteFields.requested_discount || 0) / 100))) * 100 : 0,
        gross_profit: (totalPrice * (1 - (quoteFields.requested_discount || 0) / 100)) - totalCost,
        payment_terms: quoteFields.payment_terms || 'Net 30',
        shipping_terms: quoteFields.shipping_terms || 'FOB Origin',
        currency: 'USD',
        quote_fields: quoteFields,
        discount_justification: quoteFields.discount_justification,
        submitted_by_name: user.name,
        submitted_by_email: user.email
      };

      if (existingQuoteId) {
        const { error } = await supabase
          .from('quotes')
          .update(quoteData)
          .eq('id', existingQuoteId);
        if (error) throw error;
      } else {
        const { error } = await supabase
          .from('quotes')
          .insert(quoteData);
        if (error) throw error;
      }

      // Save BOM items
      for (const item of bomItems) {
        const bomData = {
          ...item,
          quote_id: quoteData.id,
          margin: item.unit_price > 0 ? ((item.unit_price - item.unit_cost) / item.unit_price) * 100 : 0,
          total_cost: item.unit_cost * item.quantity,
          total_price: item.unit_price * item.quantity
        };

        if (item.id) {
          const { error } = await supabase
            .from('bom_items')
            .update(bomData)
            .eq('id', item.id);
          if (error) throw error;
        } else {
          const { error } = await supabase
            .from('bom_items')
            .insert(bomData);
          if (error) throw error;
        }
      }

      toast({
        title: "Success",
        description: existingQuoteId ? "Quote updated successfully!" : "Quote created successfully!",
      });

      onClose();
    } catch (error) {
      console.error('Error saving quote:', error);
      toast({
        title: "Error",
        description: "Failed to save quote. Please try again.",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-7xl h-[90vh] bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <CardHeader className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex justify-between items-center">
            <CardTitle className="text-gray-900 dark:text-white">
              {mode === 'admin-edit' ? 'Admin Edit Quote' : existingQuoteId ? 'Edit Quote' : 'Build New Quote'}
            </CardTitle>
            <Button 
              onClick={onClose} 
              variant="outline"
              className="border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-800"
            >
              Close
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 h-full">
          <Tabs value={activeTab} onValueChange={setActiveTab} className="h-full flex flex-col">
            {/* Responsive Tab List */}
            <div className="border-b border-gray-200 dark:border-gray-700 px-6 pt-4">
              <TabsList className="grid w-full grid-cols-2 md:grid-cols-5 gap-1 bg-gray-100 dark:bg-gray-800 p-1 rounded-lg">
                {tabs.map((tab) => {
                  const Icon = tab.icon;
                  return (
                    <TabsTrigger
                      key={tab.id}
                      value={tab.id}
                      className="flex items-center gap-2 px-3 py-2 text-sm font-medium text-gray-700 dark:text-gray-300 
                                data-[state=active]:bg-white dark:data-[state=active]:bg-gray-700 
                                data-[state=active]:text-gray-900 dark:data-[state=active]:text-white
                                data-[state=active]:shadow-sm rounded-md transition-all duration-200"
                    >
                      <Icon className="w-4 h-4" />
                      <span className="hidden sm:inline">{tab.label}</span>
                    </TabsTrigger>
                  );
                })}
              </TabsList>
            </div>

            {/* Tab Content with proper scrolling */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-6">
                  <TabsContent value="products" className="mt-0">
                    <div className="space-y-6">
                      <Level1ProductSelector
                        onProductSelect={(product) => {
                          setSelectedLevel1Product(product);
                          setBomItems(prev => [...prev, {
                            ...product,
                            id: null,
                            quantity: 1,
                            unit_cost: product.cost || 0,
                            unit_price: product.price || 0
                          }]);
                        }}
                      />
                      {selectedLevel1Product && (
                        <Level2OptionsSelector
                          level1Product={selectedLevel1Product}
                          selectedOptions={selectedLevel2Options}
                          onOptionToggle={handleLevel2OptionToggle}
                        />
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="chassis" className="mt-0">
                    <ChassisSelector
                      selectedChassis={selectedChassis}
                      onChassisSelect={setSelectedChassis}
                      onSlotConfigured={(slotConfig) => {
                        setBomItems(prev => [...prev, {
                          ...slotConfig,
                          id: null,
                          quantity: 1,
                          unit_cost: slotConfig.cost || 0,
                          unit_price: slotConfig.price || 0
                        }]);
                      }}
                    />
                  </TabsContent>

                  <TabsContent value="config" className="mt-0">
                    <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                      <BOMDisplay 
                        items={bomItems}
                        onItemsChange={setBomItems}
                        mode={mode}
                        userRole={user?.role}
                      />
                      {selectedChassis && (
                        <RackVisualizer 
                          chassis={selectedChassis}
                          slotAssignments={slotAssignments}
                          onSlotClick={handleSlotClick}
                          onSlotClear={handleSlotClear}
                          selectedSlot={selectedSlot}
                        />
                      )}
                    </div>
                  </TabsContent>

                  <TabsContent value="quote" className="mt-0">
                    <QuoteFieldsSection
                      quoteFields={quoteFields}
                      onFieldChange={handleQuoteFieldChange}
                    />
                  </TabsContent>

                  <TabsContent value="discount" className="mt-0">
                    <DiscountSection
                      quoteFields={quoteFields}
                      onFieldsChange={handleQuoteFieldChange}
                      bomItems={bomItems}
                      userRole={user?.role}
                    />
                  </TabsContent>
                </div>
              </ScrollArea>
            </div>

            {/* Footer with Save Button */}
            <div className="border-t border-gray-200 dark:border-gray-700 p-6">
              <div className="flex justify-between items-center">
                <div className="flex items-center gap-4">
                  <Badge variant="outline" className="text-gray-600 dark:text-gray-400">
                    Items: {bomItems.length}
                  </Badge>
                  <Badge variant="outline" className="text-gray-600 dark:text-gray-400">
                    Total: ${bomItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0).toFixed(2)}
                  </Badge>
                </div>
                <Button 
                  onClick={handleSaveQuote}
                  disabled={loading || bomItems.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? 'Saving...' : existingQuoteId ? 'Update Quote' : 'Save Quote'}
                </Button>
              </div>
            </div>
          </Tabs>
        </CardContent>
      </Card>
    </div>
  );
};

export default BOMBuilder;

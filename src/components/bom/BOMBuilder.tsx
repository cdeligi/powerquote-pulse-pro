import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from '@/components/ui/card';
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
import { motion, AnimatePresence } from 'framer-motion';
import { useMediaQuery } from 'react-responsive';

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
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
  const prefersReducedMotion = useMediaQuery({ query: '(prefers-reduced-motion: reduce)' });
  const [bomItems, setBomItems] = useState<any[]>([]);
  const [selectedChassis, setSelectedChassis] = useState<any>(null);
  const [selectedLevel1Product, setSelectedLevel1Product] = useState<any>(null);
  const [selectedLevel2Options, setSelectedLevel2Options] = useState<any[]>([]);
  const [slotAssignments, setSlotAssignments] = useState<Record<number, any>>({});
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [quoteFields, setQuoteFields] = useState<any>({});
  const [loading, setLoading] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [discountJustification, setDiscountJustification] = useState('');
  const [level1Products, setLevel1Products] = useState<any[]>([]);
  const [level2Products, setLevel2Products] = useState<any[]>([]);
  const [level3Products, setLevel3Products] = useState<any[]>([]);

  useEffect(() => {
    if (isOpen) {
      fetchProducts();
    }
  }, [isOpen]);

  const fetchProducts = async () => {
    try {
      const [l1, l2, l3] = await Promise.all([
        supabase.from('products_lvl1').select('*').eq('is_active', true),
        supabase.from('products_lvl2').select('*').eq('is_active', true),
        supabase.from('products_lvl3').select('*').eq('is_active', true)
      ]);

      setLevel1Products(l1.data || []);
      setLevel2Products(l2.data || []);
      setLevel3Products(l3.data || []);
    } catch (error) {
      console.error('Error fetching products:', error);
      toast({
        title: "Error",
        description: "Failed to load product data",
        variant: "destructive"
      });
    }
  };

  const handleLevel1Select = async (product: any) => {
    setSelectedLevel1Product(product);
    setSelectedLevel2Options([]);
    setSelectedSlot(null);
    setSelectedChassis(null);
    
    // Auto-fetch and show Level 2 options
    const l2Options = level2Products.filter(p => p.parent_product_id === product.id);
    if (l2Options.length > 0) {
      setSelectedLevel2Options(l2Options);
    }
  };

  const handleLevel2Select = (option: any) => {
    setSelectedChassis(option);
    // Auto-scroll to slot selection
    const slotsSection = document.getElementById('slots-section');
    if (slotsSection) {
      slotsSection.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleSlotSelect = (slot: number) => {
    setSelectedSlot(slot);
    // Auto-scroll to Level 3 selection
    const level3Section = document.getElementById('level3-section');
    if (level3Section) {
      level3Section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleLevel3Select = (product: any) => {
    if (selectedSlot !== null) {
      setSlotAssignments(prev => ({
        ...prev,
        [selectedSlot]: product
      }));
      setSelectedSlot(null);
    }
  };

  const handlePriceChange = (item: any, newPrice: number) => {
    if (newPrice < item.original_price) {
      toast({
        title: "Price Reduction Not Allowed",
        description: "To reduce a price, please use the Discount section below.",
        variant: "destructive"
      });
      return;
    }
    
    setBomItems(prev => 
      prev.map(i => 
        i.id === item.id ? { ...i, unit_price: newPrice } : i
      )
    );
  };

  const PriceInput = ({ item, className }: { item: any; className?: string }) => {
    const isPriceReduced = item.unit_price < item.original_price;
    return (
      <div className="flex flex-col gap-1">
        <div className="flex items-center gap-2">
          <input
            type="number"
            value={item.unit_price}
            onChange={(e) => handlePriceChange(item, Number(e.target.value))}
            className={`
              w-full p-2 border rounded-md
              ${isPriceReduced ? 'bg-red-50 border-red-300' : 'bg-white border-gray-300'}
              ${className}
            `}
          />
          {isPriceReduced && (
            <Button
              variant="outline"
              size="sm"
              onClick={() => {
                toast({
                  title: "Request Discount",
                  description: "Please provide a justification for the requested discount.",
                });
                // Open discount justification modal
              }}
            >
              Request Discount
            </Button>
          )}
        </div>
        {user?.role === 'admin' && (
          <div className="flex items-center gap-2 text-sm text-gray-600">
            <span>Cost: ${item.unit_cost.toFixed(2)}</span>
            <span>Margin: {(item.margin || 0).toFixed(1)}%</span>
          </div>
        )}
      </div>
    );
  };

  return (
    <div className={`fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 ${isMobile ? 'sm:p-2' : ''}`}>
      <Card className={`w-full max-w-4xl ${isMobile ? 'sm:max-w-full' : ''}`}>
        <CardHeader>
          <CardTitle>BOM Builder</CardTitle>
          <CardDescription className="text-sm">
            {mode === 'create' ? 'Create a new quote' : 'Edit existing quote'}
          </CardDescription>
        </CardHeader>
        
        <CardContent className="p-0 h-full">
          <div className={`space-y-6 h-full overflow-y-auto ${prefersReducedMotion ? '' : 'smooth-scroll'}`}>
            <Card>
              <CardHeader>
                <CardTitle>Level 1 Products</CardTitle>
              </CardHeader>
              <CardContent>
                <Level1ProductSelector
                  products={level1Products}
                  onSelect={handleLevel1Select}
                  selected={selectedLevel1Product}
                />
              </CardContent>
            </Card>

            {selectedLevel1Product && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Level 2 Options</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <Level2OptionsSelector
                      options={selectedLevel2Options}
                      onSelect={handleLevel2Select}
                      selected={selectedChassis}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {selectedChassis && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                id="slots-section"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Slot Configuration</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <RackVisualizer
                      chassis={selectedChassis}
                      slotAssignments={slotAssignments}
                      onSelectSlot={handleSlotSelect}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            {selectedSlot !== null && (
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
                id="level3-section"
              >
                <Card>
                  <CardHeader>
                    <CardTitle>Card Selection</CardTitle>
                  </CardHeader>
                  <CardContent>
                    <SlotCardSelector
                      slot={selectedSlot}
                      products={level3Products.filter(p => p.parent_product_id === selectedChassis?.id)}
                      onSelect={handleLevel3Select}
                    />
                  </CardContent>
                </Card>
              </motion.div>
            )}

            <Card>
              <CardHeader>
                <CardTitle>BOM Summary</CardTitle>
              </CardHeader>
              <CardContent>
                <BOMDisplay
                  bomItems={bomItems}
                  slotAssignments={slotAssignments}
                  onAddItem={(item) => setBomItems([...bomItems, item])}
                  onRemoveItem={(id) => setBomItems(bomItems.filter(i => i.id !== id))}
                  PriceInput={PriceInput}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Quote Information</CardTitle>
              </CardHeader>
              <CardContent>
                <QuoteFieldsSection
                  fields={quoteFields}
                  onChange={setQuoteFields}
                />
              </CardContent>
            </Card>

            <Card>
              <CardHeader>
                <CardTitle>Discount</CardTitle>
              </CardHeader>
              <CardContent>
                <DiscountSection
                  percentage={discountPercentage}
                  justification={discountJustification}
                  onChangePercentage={setDiscountPercentage}
                  onChangeJustification={setDiscountJustification}
                />
              </CardContent>
            </Card>

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
                  onClick={() => {
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
                        requested_discount: discountPercentage,
                        original_quote_value: totalPrice,
                        discounted_value: totalPrice * (1 - discountPercentage / 100),
                        total_cost: totalCost,
                        original_margin: originalMargin,
                        discounted_margin: totalPrice > 0 ? ((totalPrice * (1 - discountPercentage / 100) - totalCost) / (totalPrice * (1 - discountPercentage / 100))) * 100 : 0,
                        gross_profit: (totalPrice * (1 - discountPercentage / 100)) - totalCost,
                        payment_terms: quoteFields.payment_terms || 'Net 30',
                        shipping_terms: quoteFields.shipping_terms || 'FOB Origin',
                        currency: 'USD',
                        quote_fields: quoteFields,
                        discount_justification: discountJustification,
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
                  }}
                  disabled={loading || bomItems.length === 0}
                  className="bg-blue-600 hover:bg-blue-700 text-white"
                >
                  {loading ? 'Saving...' : existingQuoteId ? 'Update Quote' : 'Save Quote'}
                </Button>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BOMBuilder;

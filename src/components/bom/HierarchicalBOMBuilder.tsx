import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  Package, 
  ChevronRight, 
  Settings, 
  Plus, 
  Trash2, 
  Save,
  ArrowLeft,
  ShoppingCart
} from 'lucide-react';
import QuoteFieldsSection from './QuoteFieldsSection';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  price: number;
  cost: number;
}

interface Level4Product {
  id: string;
  name: string;
  description?: string;
  parent_product_id: string;
  configuration_type: string;
  enabled: boolean;
  price: number;
  cost: number;
}

interface BOMItem {
  id: string;
  productId: string;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  unitCost: number;
  partNumber?: string;
  configuration?: any;
}

interface HierarchicalBOMBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  existingQuoteId?: string;
  mode?: 'create' | 'edit' | 'admin-edit';
}

const HierarchicalBOMBuilder: React.FC<HierarchicalBOMBuilderProps> = ({
  isOpen,
  onClose,
  existingQuoteId,
  mode = 'create'
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // State management
  const [step, setStep] = useState(1);
  const [quoteFields, setQuoteFields] = useState<any>({});
  const [level1Products, setLevel1Products] = useState<Product[]>([]);
  const [level2Products, setLevel2Products] = useState<Product[]>([]);
  const [level3Products, setLevel3Products] = useState<Product[]>([]);
  const [level4Products, setLevel4Products] = useState<Level4Product[]>([]);
  
  const [selectedLevel1, setSelectedLevel1] = useState<Product | null>(null);
  const [selectedLevel2Options, setSelectedLevel2Options] = useState<Product[]>([]);
  const [selectedLevel3Options, setSelectedLevel3Options] = useState<Product[]>([]);
  const [level4Configurations, setLevel4Configurations] = useState<Record<string, any>>({});
  
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [chassisConfiguration, setChassisConfiguration] = useState<any>(null);
  const [selectedSlots, setSelectedSlots] = useState<Record<number, Product>>({});
  
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (isOpen) {
      loadLevel1Products();
      if (existingQuoteId) {
        loadExistingQuote();
      }
    }
  }, [isOpen, existingQuoteId]);

  const loadLevel1Products = async () => {
    try {
      const { data, error } = await supabase
        .from('products')
        .select('*')
        .eq('category', 'Level1')
        .eq('is_active', true)
        .order('name');

      if (error) throw error;
      setLevel1Products(data || []);
    } catch (error) {
      console.error('Error loading Level 1 products:', error);
      toast({
        title: "Error",
        description: "Failed to load products",
        variant: "destructive"
      });
    }
  };

  const loadLevel2Products = async (level1Id: string) => {
    try {
      const { data: relationships, error: relError } = await supabase
        .from('level1_level2_relationships')
        .select('level2_product_id')
        .eq('level1_product_id', level1Id);

      if (relError) throw relError;

      if (relationships && relationships.length > 0) {
        const level2Ids = relationships.map(r => r.level2_product_id);
        const { data: products, error: prodError } = await supabase
          .from('products')
          .select('*')
          .in('id', level2Ids)
          .eq('is_active', true)
          .order('name');

        if (prodError) throw prodError;
        setLevel2Products(products || []);
      }
    } catch (error) {
      console.error('Error loading Level 2 products:', error);
    }
  };

  const loadLevel3Products = async (level2Id: string) => {
    try {
      const { data: relationships, error: relError } = await supabase
        .from('level2_level3_relationships')
        .select('level3_product_id')
        .eq('level2_product_id', level2Id);

      if (relError) throw relError;

      if (relationships && relationships.length > 0) {
        const level3Ids = relationships.map(r => r.level3_product_id);
        const { data: products, error: prodError } = await supabase
          .from('products')
          .select('*')
          .in('id', level3Ids)
          .eq('is_active', true)
          .order('name');

        if (prodError) throw prodError;
        setLevel3Products(products || []);
      }
    } catch (error) {
      console.error('Error loading Level 3 products:', error);
    }
  };

  const loadLevel4Products = async (level3Id: string) => {
    try {
      const { data: relationships, error: relError } = await supabase
        .from('level3_level4_relationships')
        .select('level4_product_id')
        .eq('level3_product_id', level3Id);

      if (relError) throw relError;

      if (relationships && relationships.length > 0) {
        const level4Ids = relationships.map(r => r.level4_product_id);
        const { data: products, error: prodError } = await supabase
          .from('level4_products')
          .select('*')
          .in('id', level4Ids)
          .eq('enabled', true)
          .order('name');

        if (prodError) throw prodError;
        setLevel4Products(products || []);
      }
    } catch (error) {
      console.error('Error loading Level 4 products:', error);
    }
  };

  const loadExistingQuote = async () => {
    if (!existingQuoteId) return;
    
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

      setQuoteFields(quote?.quote_fields || {});
      setBomItems(items?.map(item => ({
        id: item.id,
        productId: item.product_id,
        name: item.name,
        description: item.description || '',
        quantity: item.quantity,
        unitPrice: item.unit_price,
        unitCost: item.unit_cost,
        partNumber: item.part_number,
        configuration: item.configuration_data
      })) || []);
    } catch (error) {
      console.error('Error loading existing quote:', error);
    }
  };

  const handleLevel1Select = async (product: Product) => {
    setSelectedLevel1(product);
    setSelectedLevel2Options([]);
    setSelectedLevel3Options([]);
    setLevel4Configurations({});
    
    // Load chassis configuration if this is LTX
    if (product.name.includes('LTX') || product.subcategory === 'chassis') {
      await loadChassisConfiguration(product.id);
    }
    
    await loadLevel2Products(product.id);
    setStep(2);
  };

  const loadChassisConfiguration = async (productId: string) => {
    try {
      const { data: configs, error } = await supabase
        .from('app_settings')
        .select('*')
        .eq('key', 'chassis_configurations');

      if (error || !configs?.length) return;

      const allConfigs = configs[0].value as any[];
      const config = allConfigs?.find(c => c.level2ProductId === productId);
      
      if (config) {
        setChassisConfiguration(config);
      }
    } catch (error) {
      console.error('Error loading chassis configuration:', error);
    }
  };

  const handleLevel2Select = async (product: Product) => {
    const updatedOptions = [...selectedLevel2Options];
    const existingIndex = updatedOptions.findIndex(p => p.id === product.id);
    
    if (existingIndex >= 0) {
      updatedOptions.splice(existingIndex, 1);
    } else {
      updatedOptions.push(product);
      await loadLevel3Products(product.id);
    }
    
    setSelectedLevel2Options(updatedOptions);
    
    if (updatedOptions.length > 0) {
      setStep(3);
    }
  };

  const handleLevel3Select = async (product: Product) => {
    const updatedOptions = [...selectedLevel3Options];
    const existingIndex = updatedOptions.findIndex(p => p.id === product.id);
    
    if (existingIndex >= 0) {
      updatedOptions.splice(existingIndex, 1);
    } else {
      updatedOptions.push(product);
      await loadLevel4Products(product.id);
    }
    
    setSelectedLevel3Options(updatedOptions);
  };

  const handleSlotSelect = (slotNumber: number, product: Product) => {
    setSelectedSlots(prev => ({
      ...prev,
      [slotNumber]: product
    }));
  };

  const generatePartNumber = () => {
    if (!selectedLevel1) return '';
    
    let partNumber = selectedLevel1.id;
    
    if (selectedLevel2Options.length > 0) {
      partNumber += '-' + selectedLevel2Options.map(p => p.id).join('-');
    }
    
    if (selectedLevel3Options.length > 0) {
      partNumber += '-' + selectedLevel3Options.map(p => p.id).join('-');
    }
    
    return partNumber;
  };

  const addToBOM = () => {
    const newItems: BOMItem[] = [];
    
    // Add Level 1 product
    if (selectedLevel1) {
      newItems.push({
        id: `bom-${Date.now()}-1`,
        productId: selectedLevel1.id,
        name: selectedLevel1.name,
        description: selectedLevel1.description,
        quantity: 1,
        unitPrice: selectedLevel1.price,
        unitCost: selectedLevel1.cost,
        partNumber: generatePartNumber()
      });
    }
    
    // Add Level 2 products
    selectedLevel2Options.forEach((product, index) => {
      newItems.push({
        id: `bom-${Date.now()}-2-${index}`,
        productId: product.id,
        name: product.name,
        description: product.description,
        quantity: 1,
        unitPrice: product.price,
        unitCost: product.cost,
        partNumber: product.id
      });
    });
    
    // Add Level 3 products
    selectedLevel3Options.forEach((product, index) => {
      newItems.push({
        id: `bom-${Date.now()}-3-${index}`,
        productId: product.id,
        name: product.name,
        description: product.description,
        quantity: 1,
        unitPrice: product.price,
        unitCost: product.cost,
        partNumber: product.id,
        configuration: level4Configurations[product.id]
      });
    });
    
    setBomItems(prev => [...prev, ...newItems]);
    
    // Reset selection
    setSelectedLevel1(null);
    setSelectedLevel2Options([]);
    setSelectedLevel3Options([]);
    setLevel4Configurations({});
    setStep(1);
    
    toast({
      title: "Success",
      description: "Configuration added to BOM",
    });
  };

  const handleSaveQuote = async () => {
    if (!user || bomItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add items to your BOM and fill required fields",
        variant: "destructive"
      });
      return;
    }

    const requiredFields = ['customer_name', 'oracle_customer_id', 'sfdc_opportunity'];
    const missingFields = requiredFields.filter(field => !quoteFields[field]);
    
    if (missingFields.length > 0) {
      toast({
        title: "Error",
        description: `Please fill in: ${missingFields.join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    setLoading(true);
    try {
      const totalCost = bomItems.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);
      const totalPrice = bomItems.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
      
      const quoteData = {
        id: existingQuoteId || `QTE-${Date.now()}`,
        user_id: user.id,
        customer_name: quoteFields.customer_name,
        oracle_customer_id: quoteFields.oracle_customer_id,
        sfdc_opportunity: quoteFields.sfdc_opportunity,
        status: 'pending',
        requested_discount: 0,
        original_quote_value: totalPrice,
        discounted_value: totalPrice,
        total_cost: totalCost,
        original_margin: totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0,
        discounted_margin: totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0,
        gross_profit: totalPrice - totalCost,
        payment_terms: quoteFields.payment_terms || 'Net 30',
        shipping_terms: quoteFields.shipping_terms || 'FOB Origin',
        currency: 'USD',
        quote_fields: quoteFields,
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
          quote_id: quoteData.id,
          product_id: item.productId,
          name: item.name,
          description: item.description,
          quantity: item.quantity,
          unit_price: item.unitPrice,
          unit_cost: item.unitCost,
          total_price: item.unitPrice * item.quantity,
          total_cost: item.unitCost * item.quantity,
          margin: item.unitPrice > 0 ? ((item.unitPrice - item.unitCost) / item.unitPrice) * 100 : 0,
          part_number: item.partNumber,
          configuration_data: item.configuration
        };

        const { error } = await supabase
          .from('bom_items')
          .insert(bomData);
        if (error) throw error;
      }

      toast({
        title: "Success",
        description: "Quote saved successfully!",
      });

      onClose();
    } catch (error) {
      console.error('Error saving quote:', error);
      toast({
        title: "Error",
        description: "Failed to save quote",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  if (!isOpen) return null;

  const canShowCosts = user?.role === 'admin' || user?.role === 'finance';

  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-7xl h-[90vh] bg-background">
        <CardHeader className="border-b">
          <div className="flex justify-between items-center">
            <CardTitle>
              {existingQuoteId ? 'Edit Quote' : 'Create New Quote'}
            </CardTitle>
            <Button onClick={onClose} variant="outline">
              Close
            </Button>
          </div>
        </CardHeader>

        <CardContent className="p-0 h-full">
          <div className="grid grid-cols-1 lg:grid-cols-3 h-full">
            {/* Left Panel - Quote Fields */}
            <div className="border-r bg-muted/20 p-6">
              <h3 className="text-lg font-semibold mb-4">Quote Information</h3>
              <QuoteFieldsSection
                quoteFields={quoteFields}
                onFieldChange={(fieldId, value) => 
                  setQuoteFields(prev => ({ ...prev, [fieldId]: value }))
                }
              />
            </div>

            {/* Middle Panel - Product Selection */}
            <div className="p-6">
              <div className="flex items-center gap-2 mb-4">
                <Package className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Product Configuration</h3>
              </div>

              <ScrollArea className="h-[calc(100vh-300px)]">
                {/* Step 1: Level 1 Products */}
                <div className="space-y-4">
                  <div className="flex items-center gap-2">
                    <Badge variant={step >= 1 ? "default" : "secondary"}>1</Badge>
                    <span className="font-medium">Select Base Product</span>
                  </div>
                  
                  <div className="grid gap-2">
                    {level1Products.map((product) => (
                      <Card 
                        key={product.id}
                        className={`cursor-pointer transition-all ${
                          selectedLevel1?.id === product.id 
                            ? 'ring-2 ring-primary' 
                            : 'hover:shadow-md'
                        }`}
                        onClick={() => handleLevel1Select(product)}
                      >
                        <CardContent className="p-3">
                          <div className="flex items-center justify-between">
                            <div>
                              <h4 className="font-semibold">{product.name}</h4>
                              <p className="text-sm text-muted-foreground">
                                {product.description}
                              </p>
                            </div>
                            <ChevronRight className="h-4 w-4" />
                          </div>
                        </CardContent>
                      </Card>
                    ))}
                  </div>
                </div>

                {/* Step 2: Level 2 Products */}
                {step >= 2 && level2Products.length > 0 && (
                  <div className="space-y-4 mt-6">
                    <div className="flex items-center gap-2">
                      <Badge variant={step >= 2 ? "default" : "secondary"}>2</Badge>
                      <span className="font-medium">Configure Options</span>
                    </div>
                    
                    <div className="grid gap-2">
                      {level2Products.map((product) => (
                        <Card 
                          key={product.id}
                          className={`cursor-pointer transition-all ${
                            selectedLevel2Options.some(p => p.id === product.id)
                              ? 'ring-2 ring-primary' 
                              : 'hover:shadow-md'
                          }`}
                          onClick={() => handleLevel2Select(product)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold">{product.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {product.description}
                                </p>
                                {canShowCosts && (
                                  <p className="text-sm font-medium">
                                    ${product.price.toFixed(2)}
                                  </p>
                                )}
                              </div>
                              {selectedLevel2Options.some(p => p.id === product.id) && (
                                <Badge variant="secondary">Selected</Badge>
                              )}
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Step 3: Level 3 Products */}
                {step >= 3 && level3Products.length > 0 && (
                  <div className="space-y-4 mt-6">
                    <div className="flex items-center gap-2">
                      <Badge variant={step >= 3 ? "default" : "secondary"}>3</Badge>
                      <span className="font-medium">Select Cards/Components</span>
                    </div>
                    
                    <div className="grid gap-2">
                      {level3Products.map((product) => (
                        <Card 
                          key={product.id}
                          className={`cursor-pointer transition-all ${
                            selectedLevel3Options.some(p => p.id === product.id)
                              ? 'ring-2 ring-primary' 
                              : 'hover:shadow-md'
                          }`}
                          onClick={() => handleLevel3Select(product)}
                        >
                          <CardContent className="p-3">
                            <div className="flex items-center justify-between">
                              <div>
                                <h4 className="font-semibold">{product.name}</h4>
                                <p className="text-sm text-muted-foreground">
                                  {product.description}
                                </p>
                                {canShowCosts && (
                                  <p className="text-sm font-medium">
                                    ${product.price.toFixed(2)}
                                  </p>
                                )}
                              </div>
                              <div className="flex items-center gap-2">
                                {level4Products.some(p => p.parent_product_id === product.id) && (
                                  <Button
                                    size="sm"
                                    variant="outline"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      // Open Level 4 configuration
                                    }}
                                  >
                                    <Settings className="h-3 w-3" />
                                  </Button>
                                )}
                                {selectedLevel3Options.some(p => p.id === product.id) && (
                                  <Badge variant="secondary">Selected</Badge>
                                )}
                              </div>
                            </div>
                          </CardContent>
                        </Card>
                      ))}
                    </div>
                  </div>
                )}

                {/* Action Buttons */}
                {selectedLevel1 && (
                  <div className="mt-6 flex gap-2">
                    <Button onClick={addToBOM} className="flex-1">
                      <Plus className="h-4 w-4 mr-2" />
                      Add to BOM
                    </Button>
                    {step > 1 && (
                      <Button 
                        variant="outline" 
                        onClick={() => setStep(step - 1)}
                      >
                        <ArrowLeft className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                )}
              </ScrollArea>
            </div>

            {/* Right Panel - BOM Summary */}
            <div className="border-l bg-muted/20 p-6">
              <div className="flex items-center gap-2 mb-4">
                <ShoppingCart className="h-5 w-5" />
                <h3 className="text-lg font-semibold">Bill of Materials</h3>
              </div>

              <ScrollArea className="h-[calc(100vh-400px)]">
                <div className="space-y-2">
                  {bomItems.map((item, index) => (
                    <Card key={item.id}>
                      <CardContent className="p-3">
                        <div className="flex justify-between items-start">
                          <div className="flex-1">
                            <h4 className="font-semibold text-sm">{item.name}</h4>
                            <p className="text-xs text-muted-foreground">
                              {item.description}
                            </p>
                            <div className="flex items-center gap-2 mt-1">
                              <span className="text-xs">Qty: {item.quantity}</span>
                              {canShowCosts && (
                                <span className="text-xs font-medium">
                                  ${item.unitPrice.toFixed(2)}
                                </span>
                              )}
                            </div>
                          </div>
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setBomItems(prev => 
                              prev.filter((_, i) => i !== index)
                            )}
                          >
                            <Trash2 className="h-3 w-3" />
                          </Button>
                        </div>
                      </CardContent>
                    </Card>
                  ))}
                </div>
              </ScrollArea>

              {/* BOM Summary */}
              {bomItems.length > 0 && (
                <div className="mt-4 p-4 bg-background rounded-lg border">
                  <div className="flex justify-between text-sm">
                    <span>Total Items:</span>
                    <span>{bomItems.length}</span>
                  </div>
                  {canShowCosts && (
                    <div className="flex justify-between text-sm font-semibold mt-1">
                      <span>Total Value:</span>
                      <span>
                        ${bomItems.reduce((sum, item) => 
                          sum + (item.unitPrice * item.quantity), 0
                        ).toFixed(2)}
                      </span>
                    </div>
                  )}
                </div>
              )}

              {/* Save Quote Button */}
              <Button 
                onClick={handleSaveQuote}
                disabled={loading || bomItems.length === 0}
                className="w-full mt-4"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : (existingQuoteId ? 'Update Quote' : 'Save Quote')}
              </Button>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default HierarchicalBOMBuilder;
import React, { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  FileText,
  Package, 
  ChevronRight, 
  Settings, 
  Plus, 
  Trash2, 
  Save,
  ArrowLeft,
  ShoppingCart,
  Calculator,
  Eye,
  EyeOff,
  PanelLeftClose,
  PanelLeft,
  CheckCircle2
} from 'lucide-react';
import QuoteFieldsSection from './QuoteFieldsSection';
import Level1ProductSelector from './Level1ProductSelector';

interface Product {
  id: string;
  name: string;
  description: string;
  category: string;
  subcategory?: string;
  price: number;
  cost: number;
  level?: number;
  hasAdvancedConfig?: boolean;
  parentId?: string;
  quantity?: number;
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
  onSidebarToggle?: (collapsed: boolean) => void;
}

const HierarchicalBOMBuilder: React.FC<HierarchicalBOMBuilderProps> = ({
  isOpen,
  onClose,
  existingQuoteId,
  mode = 'create',
  onSidebarToggle
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // Core state management
  const [currentStep, setCurrentStep] = useState(0);
  const [quoteFields, setQuoteFields] = useState<any>({});
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCosts, setShowCosts] = useState(false);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  
  // Product levels state
  const [level1Products, setLevel1Products] = useState<Product[]>([]);
  const [level1Product, setLevel1Product] = useState<Product | null>(null);
  const [level2Products, setLevel2Products] = useState<Product[]>([]);
  const [selectedLevel2Options, setSelectedLevel2Options] = useState<Product[]>([]);
  const [level3Products, setLevel3Products] = useState<Product[]>([]);
  const [selectedLevel3Options, setSelectedLevel3Options] = useState<Product[]>([]);
  const [level4Configurations, setLevel4Configurations] = useState<Record<string, any>>({});
  
  // Chassis and slot management
  const [chassisSlots, setChassisSlots] = useState<any[]>([]);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const [slotConfigurations, setSlotConfigurations] = useState<Record<number, Product>>({});
  const [partNumber, setPartNumber] = useState<string>('');
  
  // Step management
  const [step, setStep] = useState(1);

  const canSeePrices = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    if (canSeePrices) {
      setShowCosts(true);
    }
  }, [canSeePrices]);

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
        
        // Check for Level 4 configurations
        const { data: level4Relations, error: l4Error } = await supabase
          .from('level3_level4_relationships')
          .select('level3_product_id, level4_product_id')
          .in('level3_product_id', level3Ids);

        if (l4Error) console.warn('Level 4 relationship check failed:', l4Error);

        const level4Map = new Map();
        if (level4Relations) {
          level4Relations.forEach(rel => {
            if (!level4Map.has(rel.level3_product_id)) {
              level4Map.set(rel.level3_product_id, []);
            }
            level4Map.get(rel.level3_product_id).push(rel.level4_product_id);
          });
        }

        const enhancedProducts = (products || []).map(product => ({
          ...product,
          hasAdvancedConfig: level4Map.has(product.id)
        }));

        setLevel3Products(enhancedProducts);
        
        // Load chassis slots if this is a chassis selection
        if (level2Id.includes('chassis') || level2Id.includes('ltx')) {
          loadChassisSlots(level2Id);
        }
      }
    } catch (error) {
      console.error('Error loading Level 3 products:', error);
    }
  };

  const loadChassisSlots = (chassisId: string) => {
    // Create chassis slot visualization based on chassis type
    const slots = [];
    
    if (chassisId.includes('ltx') || chassisId.includes('6u')) {
      // 6U chassis with multiple slots
      for (let i = 1; i <= 12; i++) {
        slots.push({
          id: i,
          position: i,
          type: i <= 6 ? 'card' : 'power',
          available: true,
          width: 1,
          height: 1
        });
      }
    } else {
      // Standard chassis
      for (let i = 1; i <= 8; i++) {
        slots.push({
          id: i,
          position: i,
          type: 'card',
          available: true,
          width: 1,
          height: 1
        });
      }
    }
    
    setChassisSlots(slots);
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
    setLevel1Product(product);
    setSelectedLevel2Options([]);
    setSelectedLevel3Options([]);
    setLevel4Configurations({});
    
    await loadLevel2Products(product.id);
    setStep(2);
    generatePartNumber();
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
    generatePartNumber();
  };

  const handleLevel3Select = async (product: Product, slotId?: number) => {
    if (slotId !== undefined) {
      setSlotConfigurations(prev => ({
        ...prev,
        [slotId]: product
      }));
    }
    
    const updatedOptions = [...selectedLevel3Options];
    const existingIndex = updatedOptions.findIndex(p => p.id === product.id);
    
    if (existingIndex >= 0) {
      updatedOptions.splice(existingIndex, 1);
    } else {
      updatedOptions.push(product);
    }
    
    setSelectedLevel3Options(updatedOptions);
    generatePartNumber();
  };

  const handleSlotClick = (slotId: number) => {
    setSelectedSlot(slotId);
  };

  const generatePartNumber = () => {
    if (!level1Product) return '';
    
    let partNum = level1Product.id;
    
    if (selectedLevel2Options.length > 0) {
      partNum += '-' + selectedLevel2Options.map(p => p.id).join('-');
    }
    
    if (selectedLevel3Options.length > 0) {
      partNum += '-' + selectedLevel3Options.map(p => p.id).join('-');
    }
    
    setPartNumber(partNum);
    return partNum;
  };

  const addToBOM = () => {
    const newItems: BOMItem[] = [];
    
    // Add Level 1 product
    if (level1Product) {
      newItems.push({
        id: `bom-${Date.now()}-1`,
        productId: level1Product.id,
        name: level1Product.name,
        description: level1Product.description,
        quantity: 1,
        unitPrice: level1Product.price,
        unitCost: level1Product.cost,
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
    setLevel1Product(null);
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
      setCurrentStep(0);
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

  const toggleSidebar = () => {
    const newCollapsed = !sidebarCollapsed;
    setSidebarCollapsed(newCollapsed);
    if (onSidebarToggle) {
      onSidebarToggle(newCollapsed);
    }
  };

  const renderChassisVisualization = () => {
    if (chassisSlots.length === 0) return null;

    return (
      <div className="space-y-4 mt-6">
        <h4 className="text-lg font-semibold text-foreground">Chassis Configuration</h4>
        <div className="bg-muted/30 p-4 rounded-lg border border-border">
          <div className="grid grid-cols-6 gap-2 max-w-md mx-auto">
            {chassisSlots.map((slot) => (
              <div
                key={slot.id}
                className={`
                  aspect-square border-2 rounded-md cursor-pointer transition-all
                  ${selectedSlot === slot.id ? 'border-primary bg-primary/20' : 'border-border'}
                  ${slotConfigurations[slot.id] ? 'bg-success/20 border-success' : 'bg-background'}
                  hover:border-primary/50 hover:bg-primary/10
                `}
                onClick={() => handleSlotClick(slot.id)}
              >
                <div className="h-full flex flex-col items-center justify-center p-1">
                  <span className="text-xs font-medium">{slot.id}</span>
                  {slotConfigurations[slot.id] && (
                    <>
                      <div className="text-xs text-center leading-tight">
                        {slotConfigurations[slot.id].name.split(' ')[0]}
                      </div>
                      {slotConfigurations[slot.id].hasAdvancedConfig && (
                        <Settings className="h-3 w-3 text-primary mt-1" />
                      )}
                    </>
                  )}
                </div>
              </div>
            ))}
          </div>
          
          {selectedSlot && (
            <div className="mt-4 p-3 bg-background rounded-md border border-border">
              <h5 className="font-medium mb-2">Slot {selectedSlot} - Select Card</h5>
              <div className="grid gap-2 max-h-40 overflow-y-auto">
                {level3Products.map((product) => (
                  <Button
                    key={product.id}
                    variant="outline"
                    size="sm"
                    className="justify-start"
                    onClick={() => handleLevel3Select(product, selectedSlot)}
                  >
                    <span>{product.name}</span>
                    {product.hasAdvancedConfig && (
                      <Settings className="h-3 w-3 ml-auto text-primary" />
                    )}
                  </Button>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>
    );
  };

  const renderStepContent = () => {
    return (
      <ScrollArea className="h-[calc(100vh-300px)]">
        {/* Quote Information Step */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
              1
            </div>
            <h3 className="text-xl font-semibold text-foreground">Quote Information</h3>
            <CheckCircle2 className="h-5 w-5 text-success" />
          </div>
          
          <QuoteFieldsSection
            quoteFields={quoteFields}
            onFieldChange={(fieldId, value) => 
              setQuoteFields(prev => ({ ...prev, [fieldId]: value }))
            }
          />
        </div>

        {/* Level 1 Product Selection */}
        <div className="space-y-4 mb-6">
          <div className="flex items-center gap-2">
            <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
              2
            </div>
            <h3 className="text-xl font-semibold text-foreground">Select Product Category</h3>
            {level1Product && <CheckCircle2 className="h-5 w-5 text-success" />}
          </div>
          
          <div className="grid gap-2">
            {level1Products.map((product) => (
              <Card 
                key={product.id}
                className={`cursor-pointer transition-all ${
                  level1Product?.id === product.id 
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

        {/* Level 2 Product Selection */}
        {step >= 2 && level2Products.length > 0 && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                3
              </div>
              <h3 className="text-xl font-semibold text-foreground">Select Chassis Configuration</h3>
              {selectedLevel2Options.length > 0 && <CheckCircle2 className="h-5 w-5 text-success" />}
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
                        {showCosts && (
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

        {/* Chassis Visualization & Level 3 Selection */}
        {step >= 3 && (
          <div className="space-y-4 mb-6">
            <div className="flex items-center gap-2">
              <div className="flex items-center justify-center w-8 h-8 rounded-full bg-primary text-primary-foreground text-sm font-medium">
                4
              </div>
              <h3 className="text-xl font-semibold text-foreground">Configure Components & Cards</h3>
            </div>
            
            {renderChassisVisualization()}
            
            {level3Products.length > 0 && !selectedSlot && (
              <div>
                <h4 className="text-lg font-medium mb-3">Available Cards</h4>
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
                            {showCosts && (
                              <p className="text-sm font-medium">
                                ${product.price.toFixed(2)}
                              </p>
                            )}
                          </div>
                          <div className="flex items-center gap-2">
                            {product.hasAdvancedConfig && (
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
          </div>
        )}

        {/* Part Number Display */}
        {partNumber && (
          <div className="p-4 bg-muted/30 rounded-lg border border-border mb-6">
            <div className="flex items-center gap-3">
              <Badge variant="outline" className="font-mono text-sm">
                {partNumber}
              </Badge>
              <span className="text-sm text-muted-foreground">Generated Part Number</span>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {level1Product && (
          <div className="flex gap-2 mb-6">
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
    );
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-background/80 backdrop-blur-sm flex items-center justify-center z-50 p-4">
      <Card className="w-full max-w-7xl h-[90vh] card-modern">
        <CardHeader className="border-b border-border">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
            <div>
              <CardTitle className="text-responsive-xl">
                {mode === 'admin-edit' ? 'Admin Edit Quote' : existingQuoteId ? 'Edit Quote' : 'Build New Quote'}
              </CardTitle>
              <p className="text-muted-foreground text-sm">
                Step-by-step Product Configuration
              </p>
            </div>
            
            <div className="flex items-center gap-3">
              <Button
                variant="outline"
                size="sm"
                onClick={toggleSidebar}
              >
                {sidebarCollapsed ? <PanelLeft className="h-4 w-4" /> : <PanelLeftClose className="h-4 w-4" />}
                {sidebarCollapsed ? 'Expand' : 'Collapse'}
              </Button>
              
              {canSeePrices && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setShowCosts(!showCosts)}
                >
                  {showCosts ? <EyeOff className="h-4 w-4 mr-2" /> : <Eye className="h-4 w-4 mr-2" />}
                  {showCosts ? 'Hide' : 'Show'} Costs
                </Button>
              )}
              <Button variant="outline" onClick={onClose}>
                Close
              </Button>
            </div>
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="h-full flex">
            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
              <div className="p-6">
                {renderStepContent()}
              </div>
            </div>

            {/* Sidebar - BOM Summary */}
            {bomItems.length > 0 && (
              <>
                <Separator orientation="vertical" />
                <div className={`border-l border-border transition-all ${sidebarCollapsed ? 'w-16' : 'w-80'}`}>
                  <div className="p-4 border-b border-border">
                    <h4 className={`font-semibold flex items-center gap-2 ${sidebarCollapsed ? 'justify-center' : ''}`}>
                      <ShoppingCart className="h-4 w-4" />
                      {!sidebarCollapsed && 'Bill of Materials'}
                    </h4>
                  </div>
                  <ScrollArea className="h-[calc(100%-4rem)]">
                    <div className="p-4 space-y-3">
                      {bomItems.map((item, index) => (
                        <div key={item.id} className="text-sm">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className={`font-medium ${sidebarCollapsed ? 'text-xs' : ''}`}>
                                {sidebarCollapsed ? item.name.slice(0, 3) : item.name}
                              </p>
                              {!sidebarCollapsed && (
                                <>
                                  <p className="text-xs text-muted-foreground">Qty: {item.quantity}</p>
                                  {showCosts && (
                                    <p className="text-xs font-medium">
                                      ${item.unitPrice.toFixed(2)}
                                    </p>
                                  )}
                                </>
                              )}
                            </div>
                            {!sidebarCollapsed && (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => setBomItems(prev => 
                                  prev.filter((_, i) => i !== index)
                                )}
                              >
                                <Trash2 className="h-3 w-3" />
                              </Button>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* BOM Summary */}
                      {showCosts && !sidebarCollapsed && bomItems.length > 0 && (
                        <div className="border-t border-border pt-3 mt-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Total Items:</span>
                            <span>{bomItems.length}</span>
                          </div>
                          <div className="flex justify-between text-sm font-semibold">
                            <span>Total Value:</span>
                            <span>
                              ${bomItems.reduce((sum, item) => 
                                sum + (item.unitPrice * item.quantity), 0
                              ).toFixed(2)}
                            </span>
                          </div>
                        </div>
                      )}
                    </div>
                  </ScrollArea>
                </div>
              </>
            )}
          </div>
        </CardContent>

        {/* Footer */}
        <div className="border-t border-border p-4">
          <div className="flex justify-between items-center">
            <div className="flex items-center gap-4">
              <Badge variant="outline">
                {bomItems.length} Items Selected
              </Badge>
              {showCosts && (
                <Badge variant="outline">
                  Total: ${bomItems.reduce((sum, item) => 
                    sum + (item.unitPrice * item.quantity), 0
                  ).toFixed(2)}
                </Badge>
              )}
              {partNumber && (
                <Badge variant="outline" className="font-mono">
                  {partNumber}
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button 
                onClick={handleSaveQuote}
                disabled={loading || bomItems.length === 0}
                className="btn-gradient-primary"
              >
                <Save className="h-4 w-4 mr-2" />
                {loading ? 'Saving...' : (existingQuoteId ? 'Update Quote' : 'Save Quote')}
              </Button>
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default HierarchicalBOMBuilder;
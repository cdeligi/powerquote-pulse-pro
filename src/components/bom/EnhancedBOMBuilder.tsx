import React, { useState, useEffect } from 'react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { ScrollArea } from '@/components/ui/scroll-area';
import { Separator } from '@/components/ui/separator';
import QuoteFieldsSection from './QuoteFieldsSection';
import Level1ProductSelector from './Level1ProductSelector';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import { useAuth } from '@/hooks/useAuth';
import { 
  FileText, 
  Package, 
  Settings, 
  ChevronRight, 
  CheckCircle2,
  AlertCircle,
  Calculator,
  Eye,
  EyeOff
} from 'lucide-react';

interface BOMBuilderProps {
  isOpen: boolean;
  onClose: () => void;
  existingQuoteId?: string;
  mode?: 'create' | 'edit' | 'admin-edit';
}

interface Product {
  id: string;
  name: string;
  description?: string;
  price?: number;
  cost?: number;
  category?: string;
  subcategory?: string;
  level?: number;
  hasAdvancedConfig?: boolean;
  parentId?: string;
  quantity: number;
}

interface Step {
  id: string;
  title: string;
  description: string;
  icon: React.ElementType;
  completed: boolean;
  current: boolean;
}

const EnhancedBOMBuilder: React.FC<BOMBuilderProps> = ({ 
  isOpen, 
  onClose, 
  existingQuoteId, 
  mode = 'create' 
}) => {
  const { toast } = useToast();
  const { user } = useAuth();
  
  // State management
  const [currentStep, setCurrentStep] = useState(0);
  const [quoteFields, setQuoteFields] = useState<any>({});
  const [selectedProducts, setSelectedProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(false);
  const [showCosts, setShowCosts] = useState(false);
  const [level1Product, setLevel1Product] = useState<Product | null>(null);
  const [level2Products, setLevel2Products] = useState<Product[]>([]);
  const [level3Products, setLevel3Products] = useState<Product[]>([]);

  // Steps configuration
  const steps: Step[] = [
    {
      id: 'quote-info',
      title: 'Quote Information',
      description: 'Enter customer details and quote specifics',
      icon: FileText,
      completed: false,
      current: currentStep === 0
    },
    {
      id: 'level1-selection',
      title: 'Product Category',
      description: 'Select main product line (QTMS, TM8, etc.)',
      icon: Package,
      completed: false,
      current: currentStep === 1
    },
    {
      id: 'level2-configuration',
      title: 'Chassis Selection',
      description: 'Choose chassis and variants',
      icon: Settings,
      completed: false,
      current: currentStep === 2
    },
    {
      id: 'level3-components',
      title: 'Component Selection',
      description: 'Select cards and components for slots',
      icon: Settings,
      completed: false,
      current: currentStep === 3
    }
  ];

  const canSeePrices = user?.role === 'admin' || user?.role === 'finance';

  useEffect(() => {
    if (canSeePrices) {
      setShowCosts(true);
    }
  }, [canSeePrices]);

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

      setQuoteFields(quote?.quote_fields || {});
      // Process BOM items and set selected products
      processExistingItems(items || []);
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

  const processExistingItems = (items: any[]) => {
    // Process and categorize existing BOM items
    const products: Product[] = items.map(item => ({
      id: item.product_id,
      name: item.name,
      description: item.description,
      price: item.unit_price,
      cost: item.unit_cost,
      category: item.product_type,
      level: item.product_type?.includes('Level1') ? 1 : 
             item.product_type?.includes('Level2') ? 2 : 3,
      quantity: item.quantity
    }));
    
    setSelectedProducts(products);
    
    // Set current product selections
    const l1Product = products.find(p => p.level === 1);
    if (l1Product) {
      setLevel1Product(l1Product);
    }
  };

  const loadLevel2Products = async (level1ProductId: string) => {
    try {
      // Load Level 2 products related to the selected Level 1 product
      const { data: relationships, error: relError } = await supabase
        .from('level1_level2_relationships')
        .select('level2_product_id')
        .eq('level1_product_id', level1ProductId);

      if (relError) throw relError;

      if (relationships && relationships.length > 0) {
        const level2Ids = relationships.map(rel => rel.level2_product_id);
        
        const { data: level2Products, error: l2Error } = await supabase
          .from('products')
          .select('*')
          .in('id', level2Ids)
          .eq('is_active', true);

        if (l2Error) throw l2Error;

        const products: Product[] = (level2Products || []).map(product => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          cost: product.cost,
          category: product.category,
          subcategory: product.subcategory,
          level: 2,
          parentId: level1ProductId,
          quantity: 1
        }));

        setLevel2Products(products);
      }
    } catch (error) {
      console.error('Error loading Level 2 products:', error);
      toast({
        title: "Error",
        description: "Failed to load chassis options",
        variant: "destructive"
      });
    }
  };

  const loadLevel3Products = async (level2ProductId: string) => {
    try {
      // Load Level 3 products (components/cards) for the selected chassis
      const { data: relationships, error: relError } = await supabase
        .from('level2_level3_relationships')
        .select('level3_product_id')
        .eq('level2_product_id', level2ProductId);

      if (relError) throw relError;

      if (relationships && relationships.length > 0) {
        const level3Ids = relationships.map(rel => rel.level3_product_id);
        
        const { data: level3Products, error: l3Error } = await supabase
          .from('products')
          .select('*')
          .in('id', level3Ids)
          .eq('is_active', true);

        if (l3Error) throw l3Error;

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

        const products: Product[] = (level3Products || []).map(product => ({
          id: product.id,
          name: product.name,
          description: product.description,
          price: product.price,
          cost: product.cost,
          category: product.category,
          subcategory: product.subcategory,
          level: 3,
          parentId: level2ProductId,
          hasAdvancedConfig: level4Map.has(product.id),
          quantity: 1
        }));

        setLevel3Products(products);
      }
    } catch (error) {
      console.error('Error loading Level 3 products:', error);
      toast({
        title: "Error",
        description: "Failed to load component options",
        variant: "destructive"
      });
    }
  };

  const handleLevel1Selection = (product: any) => {
    const level1Prod: Product = {
      id: product.id,
      name: product.name,
      description: product.description,
      price: product.price,
      cost: product.cost,
      category: 'Level1',
      level: 1,
      quantity: 1
    };
    
    setLevel1Product(level1Prod);
    setSelectedProducts(prev => {
      const filtered = prev.filter(p => p.level !== 1);
      return [...filtered, level1Prod];
    });
    
    // Load Level 2 products for this selection
    loadLevel2Products(product.id);
    
    // Auto-advance to next step
    setCurrentStep(2);
  };

  const handleLevel2Selection = (product: Product) => {
    setSelectedProducts(prev => {
      const filtered = prev.filter(p => p.level !== 2);
      return [...filtered, product];
    });
    
    // Load Level 3 products for this chassis
    loadLevel3Products(product.id);
    
    // Auto-advance to next step
    setCurrentStep(3);
  };

  const handleLevel3Selection = (product: Product) => {
    setSelectedProducts(prev => {
      const existing = prev.find(p => p.id === product.id);
      if (existing) {
        return prev.map(p => 
          p.id === product.id 
            ? { ...p, quantity: p.quantity + 1 }
            : p
        );
      } else {
        return [...prev, product];
      }
    });
  };

  const handleQuoteFieldChange = (fieldId: string, value: any) => {
    setQuoteFields(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const validateCurrentStep = (): boolean => {
    switch (currentStep) {
      case 0: // Quote info
        const requiredFields = ['customer_name', 'oracle_customer_id', 'sfdc_opportunity'];
        return requiredFields.every(field => quoteFields[field]);
      case 1: // Level 1 selection
        return level1Product !== null;
      case 2: // Level 2 selection
        return selectedProducts.some(p => p.level === 2);
      case 3: // Level 3 selection
        return selectedProducts.some(p => p.level === 3);
      default:
        return true;
    }
  };

  const handleNext = () => {
    if (validateCurrentStep()) {
      setCurrentStep(prev => Math.min(prev + 1, steps.length - 1));
    } else {
      toast({
        title: "Incomplete Step",
        description: "Please complete the current step before proceeding",
        variant: "destructive"
      });
    }
  };

  const handlePrevious = () => {
    setCurrentStep(prev => Math.max(prev - 1, 0));
  };

  const calculateTotals = () => {
    const totalCost = selectedProducts.reduce((sum, product) => 
      sum + (product.cost || 0) * product.quantity, 0
    );
    const totalPrice = selectedProducts.reduce((sum, product) => 
      sum + (product.price || 0) * product.quantity, 0
    );
    const margin = totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0;
    
    return { totalCost, totalPrice, margin };
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

    if (selectedProducts.length === 0) {
      toast({
        title: "Error",
        description: "Please add at least one product to your quote",
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
      setCurrentStep(0);
      return;
    }

    setLoading(true);
    try {
      const { totalCost, totalPrice, margin } = calculateTotals();

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
        original_margin: margin,
        discounted_margin: margin,
        gross_profit: totalPrice - totalCost,
        payment_terms: quoteFields.payment_terms || 'Net 30',
        shipping_terms: quoteFields.shipping_terms || 'FOB Origin',
        currency: 'USD',
        quote_fields: quoteFields,
        discount_justification: '',
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
      for (const product of selectedProducts) {
        const bomData = {
          quote_id: quoteData.id,
          product_id: product.id,
          name: product.name,
          description: product.description,
          product_type: `Level${product.level}`,
          quantity: product.quantity,
          unit_cost: product.cost || 0,
          unit_price: product.price || 0,
          total_cost: (product.cost || 0) * product.quantity,
          total_price: (product.price || 0) * product.quantity,
          margin: product.price && product.price > 0 ? 
            ((product.price - (product.cost || 0)) / product.price) * 100 : 0
        };

        const { error } = await supabase
          .from('bom_items')
          .insert(bomData);
        if (error) throw error;
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

  const renderStepContent = () => {
    switch (currentStep) {
      case 0:
        return (
          <QuoteFieldsSection
            quoteFields={quoteFields}
            onFieldChange={handleQuoteFieldChange}
          />
        );
      case 1:
        return (
          <Level1ProductSelector
            onProductSelect={handleLevel1Selection}
            selectedProduct={level1Product}
          />
        );
      case 2:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Select Chassis Configuration</h3>
              <p className="text-muted-foreground">Choose the chassis that best fits your application needs.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {level2Products.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 interactive-hover"
                  onClick={() => handleLevel2Selection(product)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      {product.name}
                      {product.subcategory && (
                        <Badge variant="outline" className="text-xs">
                          {product.subcategory}
                        </Badge>
                      )}
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{product.description}</p>
                    {showCosts && product.price && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Price:</span>
                          <span className="font-medium">${product.price.toLocaleString()}</span>
                        </div>
                        {product.cost && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Cost:</span>
                            <span className="font-medium">${product.cost.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      case 3:
        return (
          <div className="space-y-6">
            <div>
              <h3 className="text-xl font-semibold text-foreground mb-2">Select Components & Cards</h3>
              <p className="text-muted-foreground">Add cards and components to complete your configuration.</p>
            </div>
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {level3Products.map((product) => (
                <Card
                  key={product.id}
                  className="cursor-pointer transition-all hover:shadow-lg hover:border-primary/50 interactive-hover"
                  onClick={() => handleLevel3Selection(product)}
                >
                  <CardHeader>
                    <CardTitle className="flex items-center justify-between text-base">
                      {product.name}
                      <div className="flex items-center gap-2">
                        {product.hasAdvancedConfig && (
                          <Settings className="h-4 w-4 text-primary" />
                        )}
                        <Badge variant="outline" className="text-xs">
                          {selectedProducts.find(p => p.id === product.id)?.quantity || 0}
                        </Badge>
                      </div>
                    </CardTitle>
                  </CardHeader>
                  <CardContent>
                    <p className="text-sm text-muted-foreground mb-3">{product.description}</p>
                    {product.hasAdvancedConfig && (
                      <div className="flex items-center gap-2 text-xs text-primary mb-2">
                        <Settings className="h-3 w-3" />
                        Advanced Configuration Available
                      </div>
                    )}
                    {showCosts && product.price && (
                      <div className="space-y-1">
                        <div className="flex justify-between text-sm">
                          <span className="text-muted-foreground">Price:</span>
                          <span className="font-medium">${product.price.toLocaleString()}</span>
                        </div>
                        {product.cost && (
                          <div className="flex justify-between text-sm">
                            <span className="text-muted-foreground">Cost:</span>
                            <span className="font-medium">${product.cost.toLocaleString()}</span>
                          </div>
                        )}
                      </div>
                    )}
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        );
      default:
        return null;
    }
  };

  if (!isOpen) return null;

  const { totalCost, totalPrice, margin } = calculateTotals();

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
                Step {currentStep + 1} of {steps.length}: {steps[currentStep]?.title}
              </p>
            </div>
            
            <div className="flex items-center gap-3">
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
          
          {/* Progress Steps */}
          <div className="flex items-center space-x-2 overflow-x-auto py-2">
            {steps.map((step, index) => (
              <div key={step.id} className="flex items-center">
                <div 
                  className={`flex items-center space-x-2 px-3 py-2 rounded-md transition-colors cursor-pointer ${
                    step.current 
                      ? 'bg-primary text-primary-foreground' 
                      : step.completed 
                        ? 'bg-success text-white' 
                        : 'bg-muted text-muted-foreground hover:bg-muted/80'
                  }`}
                  onClick={() => setCurrentStep(index)}
                >
                  <step.icon className="h-4 w-4" />
                  <span className="text-sm font-medium whitespace-nowrap">{step.title}</span>
                  {step.completed && <CheckCircle2 className="h-4 w-4" />}
                  {!validateCurrentStep() && step.current && <AlertCircle className="h-4 w-4" />}
                </div>
                {index < steps.length - 1 && (
                  <ChevronRight className="h-4 w-4 text-muted-foreground mx-1" />
                )}
              </div>
            ))}
          </div>
        </CardHeader>

        <CardContent className="flex-1 overflow-hidden p-0">
          <div className="h-full flex">
            {/* Main Content */}
            <div className="flex-1 overflow-hidden">
              <ScrollArea className="h-full">
                <div className="p-6">
                  {renderStepContent()}
                </div>
              </ScrollArea>
            </div>

            {/* Sidebar - Selected Products */}
            {selectedProducts.length > 0 && (
              <>
                <Separator orientation="vertical" />
                <div className="w-80 border-l border-border">
                  <div className="p-4 border-b border-border">
                    <h4 className="font-semibold flex items-center gap-2">
                      <Calculator className="h-4 w-4" />
                      Selected Products
                    </h4>
                  </div>
                  <ScrollArea className="h-[calc(100%-4rem)]">
                    <div className="p-4 space-y-3">
                      {selectedProducts.map((product, index) => (
                        <div key={`${product.id}-${index}`} className="text-sm">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <p className="font-medium">{product.name}</p>
                              <p className="text-xs text-muted-foreground">Qty: {product.quantity}</p>
                              {product.hasAdvancedConfig && (
                                <div className="flex items-center gap-1 text-xs text-primary">
                                  <Settings className="h-3 w-3" />
                                  Config Available
                                </div>
                              )}
                            </div>
                            {showCosts && product.price && (
                              <div className="text-right">
                                <p className="font-medium">${(product.price * product.quantity).toLocaleString()}</p>
                                {product.cost && (
                                  <p className="text-xs text-muted-foreground">
                                    Cost: ${(product.cost * product.quantity).toLocaleString()}
                                  </p>
                                )}
                              </div>
                            )}
                          </div>
                        </div>
                      ))}
                      
                      {/* Totals */}
                      {showCosts && (
                        <div className="border-t border-border pt-3 mt-3 space-y-2">
                          <div className="flex justify-between text-sm">
                            <span>Total Price:</span>
                            <span className="font-medium">${totalPrice.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Total Cost:</span>
                            <span className="font-medium">${totalCost.toLocaleString()}</span>
                          </div>
                          <div className="flex justify-between text-sm">
                            <span>Margin:</span>
                            <span className={`font-medium ${margin >= 30 ? 'text-success' : margin >= 15 ? 'text-warning' : 'text-error'}`}>
                              {margin.toFixed(1)}%
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
                {selectedProducts.length} Items Selected
              </Badge>
              {showCosts && (
                <Badge variant="outline">
                  Total: ${totalPrice.toLocaleString()}
                </Badge>
              )}
            </div>
            
            <div className="flex gap-2">
              <Button
                variant="outline"
                onClick={handlePrevious}
                disabled={currentStep === 0}
              >
                Previous
              </Button>
              
              {currentStep < steps.length - 1 ? (
                <Button
                  onClick={handleNext}
                  disabled={!validateCurrentStep()}
                  className="btn-gradient-primary"
                >
                  Next
                </Button>
              ) : (
                <Button
                  onClick={handleSaveQuote}
                  disabled={loading || selectedProducts.length === 0 || !validateCurrentStep()}
                  className="btn-gradient-primary"
                >
                  {loading ? 'Saving...' : existingQuoteId ? 'Update Quote' : 'Save Quote'}
                </Button>
              )}
            </div>
          </div>
        </div>
      </Card>
    </div>
  );
};

export default EnhancedBOMBuilder;
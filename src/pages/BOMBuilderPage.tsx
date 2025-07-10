/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary.
 */

import { useState, useEffect, Suspense } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '@/hooks/useAuth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { ArrowLeft, Save, Plus, Settings } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { supabase } from '@/integrations/supabase/client';
import QuoteFieldsSection from '@/components/bom/QuoteFieldsSection';
import Level1ProductSelector from '@/components/bom/Level1ProductSelector';
import Level2OptionsSelector from '@/components/bom/Level2OptionsSelector';
import { ScrollArea } from '@/components/ui/scroll-area';

interface Level4Config {
  analogChannels?: number;
  bushingType?: string;
  customSettings?: Record<string, any>;
}

interface BOMItem {
  id: string;
  name: string;
  part_number: string;
  quantity: number;
  unit_cost: number;
  unit_price: number;
  level: number;
  configuration?: Level4Config;
  parent_id?: string;
}

const BOMBuilderPage = () => {
  const navigate = useNavigate();
  const { user } = useAuth();
  const { toast } = useToast();
  
  // Quote Information State
  const [quoteFields, setQuoteFields] = useState<Record<string, any>>({});
  
  // Product Selection State
  const [selectedLevel1, setSelectedLevel1] = useState<any>(null);
  const [selectedLevel2Options, setSelectedLevel2Options] = useState<any[]>([]);
  const [selectedLevel3Cards, setSelectedLevel3Cards] = useState<any[]>([]);
  const [chassisConfiguration, setChassisConfiguration] = useState<any>(null);
  
  // BOM State
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [qtmsPartNumber, setQtmsPartNumber] = useState<string>('');
  
  // UI State
  const [currentStep, setCurrentStep] = useState<'quote' | 'level1' | 'level2' | 'level3' | 'level4'>('quote');
  const [expandedLevel4, setExpandedLevel4] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-advance steps
  useEffect(() => {
    if (currentStep === 'quote' && quoteFields.customer_name && quoteFields.oracle_customer_id) {
      setCurrentStep('level1');
    } else if (currentStep === 'level1' && selectedLevel1) {
      setCurrentStep('level2');
    } else if (currentStep === 'level2' && selectedLevel2Options.length > 0) {
      setCurrentStep('level3');
    }
  }, [quoteFields, selectedLevel1, selectedLevel2Options, currentStep]);

  // QTMS Part Number Builder
  useEffect(() => {
    if (selectedLevel1?.name === 'QTMS') {
      let partNumber = 'QTMS';
      
      if (selectedLevel2Options.length > 0) {
        partNumber += `-${selectedLevel2Options[0].code || selectedLevel2Options[0].name.replace(/\s+/g, '')}`;
      }
      
      selectedLevel3Cards.forEach((card, index) => {
        partNumber += `-${card.code || card.name.substring(0, 3).toUpperCase()}`;
        if (card.level4_config) {
          partNumber += `(${Object.values(card.level4_config).join('-')})`;
        }
      });
      
      setQtmsPartNumber(partNumber);
    }
  }, [selectedLevel1, selectedLevel2Options, selectedLevel3Cards]);

  // Load chassis configuration when Level 2 is selected
  useEffect(() => {
    const loadChassisConfig = async () => {
      if (selectedLevel2Options.length > 0) {
        const chassisId = selectedLevel2Options[0].id;
        try {
          const { data, error } = await supabase
            .from('chassis_configurations')
            .select('*')
            .eq('level2_product_id', chassisId)
            .single();
          
          if (!error && data) {
            setChassisConfiguration(data);
          }
        } catch (err) {
          console.log('No chassis configuration found');
        }
      }
    };
    
    loadChassisConfig();
  }, [selectedLevel2Options]);

  const handleQuoteFieldChange = (fieldId: string, value: any) => {
    setQuoteFields(prev => ({
      ...prev,
      [fieldId]: value
    }));
  };

  const handleLevel1Select = (product: any) => {
    setSelectedLevel1(product);
    // Reset downstream selections
    setSelectedLevel2Options([]);
    setSelectedLevel3Cards([]);
    setExpandedLevel4(null);
  };

  const handleLevel2Toggle = (option: any) => {
    setSelectedLevel2Options([option]);
    // Reset downstream selections
    setSelectedLevel3Cards([]);
    setExpandedLevel4(null);
  };

  const handleLevel3CardSelect = (card: any, slotIndex?: number) => {
    const cardWithSlot = { ...card, slotIndex };
    setSelectedLevel3Cards(prev => {
      const existing = prev.find(c => c.slotIndex === slotIndex);
      if (existing) {
        return prev.map(c => c.slotIndex === slotIndex ? cardWithSlot : c);
      } else {
        return [...prev, cardWithSlot];
      }
    });
  };

  const handleLevel4Configure = (cardId: string, config: Level4Config) => {
    setSelectedLevel3Cards(prev => 
      prev.map(card => 
        card.id === cardId 
          ? { ...card, level4_config: config }
          : card
      )
    );
  };

  const addToBOM = () => {
    const newItems: BOMItem[] = [];
    
    // Add Level 1 product
    if (selectedLevel1) {
      newItems.push({
        id: `item-${Date.now()}-l1`,
        name: selectedLevel1.name,
        part_number: qtmsPartNumber || selectedLevel1.id,
        quantity: 1,
        unit_cost: selectedLevel1.cost || 0,
        unit_price: selectedLevel1.price || 0,
        level: 1
      });
    }

    // Add Level 2 options (chassis)
    selectedLevel2Options.forEach(option => {
      newItems.push({
        id: `item-${Date.now()}-l2-${option.id}`,
        name: option.name,
        part_number: option.id,
        quantity: 1,
        unit_cost: option.cost || 0,
        unit_price: option.price || 0,
        level: 2,
        parent_id: newItems[0]?.id
      });
    });

    // Add Level 3 cards
    selectedLevel3Cards.forEach((card, index) => {
      newItems.push({
        id: `item-${Date.now()}-l3-${index}`,
        name: `${card.name} (Slot ${card.slotIndex || index + 1})`,
        part_number: card.id,
        quantity: 1,
        unit_cost: card.cost || 0,
        unit_price: card.price || 0,
        level: 3,
        configuration: card.level4_config,
        parent_id: newItems.find(item => item.level === 2)?.id
      });
    });

    setBomItems(prev => [...prev, ...newItems]);
    
    // Reset selections for next configuration
    setSelectedLevel1(null);
    setSelectedLevel2Options([]);
    setSelectedLevel3Cards([]);
    setExpandedLevel4(null);
    setCurrentStep('level1');
    
    toast({
      title: "Added to BOM",
      description: `${newItems.length} items added to bill of materials.`,
    });
  };

  const saveBOM = async () => {
    if (!user || bomItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add items to your BOM before saving.",
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
        id: `QTE-${Date.now()}`,
        user_id: user.id,
        customer_name: quoteFields.customer_name,
        oracle_customer_id: quoteFields.oracle_customer_id,
        sfdc_opportunity: quoteFields.sfdc_opportunity,
        status: 'pending',
        requested_discount: 0,
        original_quote_value: totalPrice,
        discounted_value: totalPrice,
        total_cost: totalCost,
        original_margin: originalMargin,
        discounted_margin: originalMargin,
        gross_profit: totalPrice - totalCost,
        payment_terms: quoteFields.payment_terms || 'Net 30',
        shipping_terms: quoteFields.shipping_terms || 'FOB Origin',
        currency: 'USD',
        quote_fields: quoteFields,
        submitted_by_name: user.name,
        submitted_by_email: user.email
      };

      const { error: quoteError } = await supabase
        .from('quotes')
        .insert(quoteData);
      
      if (quoteError) throw quoteError;

      // Save BOM items with hidden costs
      for (const item of bomItems) {
        const bomData = {
          quote_id: quoteData.id,
          product_id: item.part_number,
          name: item.name,
          part_number: item.part_number,
          quantity: item.quantity,
          unit_cost: item.unit_cost, // Hidden from UI but stored in DB
          unit_price: item.unit_price,
          total_cost: item.unit_cost * item.quantity,
          total_price: item.unit_price * item.quantity,
          margin: item.unit_price > 0 ? ((item.unit_price - item.unit_cost) / item.unit_price) * 100 : 0,
          configuration_data: item.configuration
        };

        const { error: bomError } = await supabase
          .from('bom_items')
          .insert(bomData);
        
        if (bomError) throw bomError;
      }

      toast({
        title: "Success",
        description: "Quote created successfully!",
      });

      navigate('/');
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

  const canAddToBOM = selectedLevel1 && selectedLevel2Options.length > 0 && 
    (selectedLevel3Cards.length === 0 || selectedLevel3Cards.every(card => 
      !card.hasLevel4 || card.level4_config
    ));

  return (
    <div className="min-h-screen bg-gradient-to-br from-background via-muted/30 to-background">
      <div className="container mx-auto p-6 max-w-7xl">
        {/* Header */}
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-4">
            <Button 
              variant="outline" 
              onClick={() => navigate('/')}
              className="gap-2"
            >
              <ArrowLeft className="w-4 h-4" />
              Back to Dashboard
            </Button>
            <div>
              <h1 className="text-3xl font-bold text-foreground">BOM Builder</h1>
              <p className="text-muted-foreground">Configure your quote step by step</p>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <Badge variant="outline" className="text-sm">
              Items: {bomItems.length}
            </Badge>
            <Badge variant="outline" className="text-sm">
              Value: ${bomItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0).toFixed(2)}
            </Badge>
            <Button 
              onClick={saveBOM}
              disabled={loading || bomItems.length === 0}
              className="gap-2"
            >
              <Save className="w-4 h-4" />
              Save Quote
            </Button>
          </div>
        </div>

        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Configuration Panel */}
          <div className="lg:col-span-2 space-y-6">
            {/* Quote Information */}
            <Card>
              <CardHeader>
                <CardTitle className="flex items-center gap-2">
                  <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                    currentStep === 'quote' ? 'bg-primary text-primary-foreground' : 
                    quoteFields.customer_name ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                  }`}>
                    1
                  </div>
                  Quote Information
                </CardTitle>
              </CardHeader>
              <CardContent>
                <QuoteFieldsSection
                  quoteFields={quoteFields}
                  onFieldChange={handleQuoteFieldChange}
                />
              </CardContent>
            </Card>

            {/* Level 1 Products */}
            {currentStep !== 'quote' && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep === 'level1' ? 'bg-primary text-primary-foreground' : 
                      selectedLevel1 ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      2
                    </div>
                    Select Product
                    {selectedLevel1 && <Badge variant="secondary">{selectedLevel1.name}</Badge>}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Level1ProductSelector onProductSelect={handleLevel1Select} />
                </CardContent>
              </Card>
            )}

            {/* Level 2 Options */}
            {selectedLevel1 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep === 'level2' ? 'bg-primary text-primary-foreground' : 
                      selectedLevel2Options.length > 0 ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      3
                    </div>
                    Configure Chassis
                    {selectedLevel2Options.length > 0 && (
                      <Badge variant="secondary">{selectedLevel2Options[0].name}</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  <Level2OptionsSelector
                    level1Product={selectedLevel1}
                    selectedOptions={selectedLevel2Options}
                    onOptionToggle={handleLevel2Toggle}
                  />
                </CardContent>
              </Card>
            )}

            {/* Level 3 Cards with Chassis Visualization */}
            {selectedLevel2Options.length > 0 && (
              <Card>
                <CardHeader>
                  <CardTitle className="flex items-center gap-2">
                    <div className={`w-8 h-8 rounded-full flex items-center justify-center text-sm font-medium ${
                      currentStep === 'level3' ? 'bg-primary text-primary-foreground' : 
                      selectedLevel3Cards.length > 0 ? 'bg-green-500 text-white' : 'bg-muted text-muted-foreground'
                    }`}>
                      4
                    </div>
                    Configure Cards
                    {selectedLevel3Cards.length > 0 && (
                      <Badge variant="secondary">{selectedLevel3Cards.length} cards</Badge>
                    )}
                  </CardTitle>
                </CardHeader>
                <CardContent>
                  {chassisConfiguration ? (
                    <div className="space-y-4">
                      <div className="border rounded-lg p-4 bg-muted/50">
                        <h4 className="font-medium mb-3">Chassis Layout: {selectedLevel2Options[0].name}</h4>
                        <div className="grid grid-cols-6 gap-2">
                          {Array.from({ length: 12 }, (_, i) => (
                            <div
                              key={i}
                              className="aspect-square border-2 border-dashed border-muted-foreground/30 rounded cursor-pointer hover:border-primary transition-colors flex items-center justify-center text-xs"
                              onClick={() => {
                                // Show card selector for this slot
                                console.log(`Slot ${i + 1} clicked`);
                              }}
                            >
                              {selectedLevel3Cards.find(card => card.slotIndex === i) ? (
                                <div className="w-full h-full bg-primary/20 rounded flex items-center justify-center relative">
                                  <span className="text-xs font-medium">{selectedLevel3Cards.find(card => card.slotIndex === i)?.name.substring(0, 3)}</span>
                                  {selectedLevel3Cards.find(card => card.slotIndex === i)?.hasLevel4 && (
                                    <Settings 
                                      className="w-3 h-3 absolute top-0 right-0 text-primary cursor-pointer"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        setExpandedLevel4(selectedLevel3Cards.find(card => card.slotIndex === i)?.id || null);
                                      }}
                                    />
                                  )}
                                </div>
                              ) : (
                                <span className="text-muted-foreground">{i + 1}</span>
                              )}
                            </div>
                          ))}
                        </div>
                      </div>

                      {/* Level 4 Configuration */}
                      {expandedLevel4 && (
                        <Card className="border-primary/50">
                          <CardHeader>
                            <CardTitle className="text-sm">Advanced Configuration</CardTitle>
                          </CardHeader>
                          <CardContent>
                            <div className="space-y-3">
                              <div>
                                <label className="text-sm font-medium">Configuration Type</label>
                                <select 
                                  className="w-full mt-1 px-3 py-2 border rounded-md"
                                  onChange={(e) => {
                                    const cardId = expandedLevel4;
                                    handleLevel4Configure(cardId, { 
                                      bushingType: e.target.value 
                                    });
                                  }}
                                >
                                  <option value="">Select configuration...</option>
                                  <option value="analog-4ch">Analog 4-Channel</option>
                                  <option value="analog-8ch">Analog 8-Channel</option>
                                  <option value="bushing-std">Standard Bushing</option>
                                  <option value="bushing-hv">High Voltage Bushing</option>
                                </select>
                              </div>
                              <Button 
                                size="sm" 
                                onClick={() => setExpandedLevel4(null)}
                              >
                                Apply Configuration
                              </Button>
                            </div>
                          </CardContent>
                        </Card>
                      )}
                    </div>
                  ) : (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>Loading chassis configuration...</p>
                    </div>
                  )}
                </CardContent>
              </Card>
            )}

            {/* Add to BOM Button */}
            {canAddToBOM && (
              <div className="flex justify-center">
                <Button 
                  onClick={addToBOM}
                  size="lg"
                  className="gap-2"
                >
                  <Plus className="w-4 h-4" />
                  Add to BOM
                  {qtmsPartNumber && (
                    <Badge variant="secondary" className="ml-2">
                      {qtmsPartNumber}
                    </Badge>
                  )}
                </Button>
              </div>
            )}
          </div>

          {/* BOM Summary */}
          <div className="space-y-6">
            <Card>
              <CardHeader>
                <CardTitle>Bill of Materials</CardTitle>
              </CardHeader>
              <CardContent>
                <ScrollArea className="h-[600px]">
                  {bomItems.length === 0 ? (
                    <div className="text-center py-8 text-muted-foreground">
                      <p>No items configured yet</p>
                      <p className="text-sm">Complete the configuration steps to add items</p>
                    </div>
                  ) : (
                    <div className="space-y-3">
                      {bomItems.map((item, index) => (
                        <div 
                          key={item.id} 
                          className="border rounded-lg p-3 space-y-2"
                        >
                          <div className="flex items-center justify-between">
                            <span className="font-medium text-sm">{item.name}</span>
                            <Badge variant="outline" className="text-xs">
                              L{item.level}
                            </Badge>
                          </div>
                          <div className="text-xs text-muted-foreground">
                            {item.part_number}
                          </div>
                          <div className="flex items-center justify-between text-sm">
                            <span>Qty: {item.quantity}</span>
                            <span className="font-medium">
                              ${(item.unit_price * item.quantity).toFixed(2)}
                            </span>
                          </div>
                          {item.configuration && (
                            <div className="text-xs text-primary">
                              <Settings className="w-3 h-3 inline mr-1" />
                              Configured
                            </div>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </ScrollArea>
              </CardContent>
            </Card>
          </div>
        </div>
      </div>
    </div>
  );
};

export default BOMBuilderPage;
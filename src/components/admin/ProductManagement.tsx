import React, { useState, useEffect, useRef } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { RefreshCw, AlertCircle, Plus } from "lucide-react";
import { Collapsible, CollapsibleContent, CollapsibleTrigger } from "@/components/ui/collapsible";
import Level1ProductForm from "./product-forms/Level1ProductForm";
import ChassisForm from "./product-forms/ChassisForm";
import CardForm from "./product-forms/CardForm";
import Level2OptionForm from "./product-forms/Level2OptionForm";
import { Level4ConfigurationManager } from "./Level4ConfigurationManager";
import { Level1ProductList } from "./product-lists/Level1ProductList";
import Level2ProductList from "./product-lists/Level2ProductList";
import { Level3ProductList } from "./product-lists/Level3ProductList";
import { Level1Product, Level2Product, Level3Product, Level4Product } from "@/types/product";
import { productDataService } from "@/services/productDataService";
import { useToast } from "@/hooks/use-toast";
import { motion } from "framer-motion";

export const ProductManagement = () => {
  const { toast } = useToast();
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [level1Products, setLevel1Products] = useState<Level1Product[]>([]);
  const [level2Products, setLevel2Products] = useState<Level2Product[]>([]);
  const [level3Products, setLevel3Products] = useState<Level3Product[]>([]);
  const [refreshTrigger, setRefreshTrigger] = useState(0);
  const [selectedLevel1, setSelectedLevel1] = useState<Level1Product | null>(null);
  const [selectedLevel2, setSelectedLevel2] = useState<Level2Product | null>(null);
  const [selectedSlot, setSelectedSlot] = useState<number | null>(null);
  const chassisCanvasRef = useRef<HTMLCanvasElement>(null);

  // Form visibility state
  const [showLevel1Form, setShowLevel1Form] = useState(false);
  const [showLevel2Form, setShowLevel2Form] = useState(false);
  const [showLevel3CardForm, setShowLevel3CardForm] = useState(false);
  const [showLevel3OptionForm, setShowLevel3OptionForm] = useState(false);

  useEffect(() => {
    initializeData();
  }, [refreshTrigger]);

  const initializeData = async () => {
    try {
      setIsLoading(true);
      setError(null);
      
      console.log('ProductManagement: Starting data initialization...');
      
      // Initialize the service and load data
      await productDataService.initialize();
      
      // Load all product data
      const [l1Products, l2Products, l3Products] = await Promise.all([
        productDataService.getLevel1Products(),
        productDataService.getLevel2Products(),
        productDataService.getLevel3Products()
      ]);
      
      console.log('ProductManagement: Data loaded successfully:', { 
        l1Count: l1Products.length, 
        l2Count: l2Products.length,
        l3Count: l3Products.length
      });
      
      setLevel1Products(l1Products);
      setLevel2Products(l2Products);
      setLevel3Products(l3Products);
      
    } catch (err) {
      console.error('ProductManagement: Error initializing data:', err);
      setError('Failed to load product data. Please try refreshing.');
      
      // Try to load sync data as fallback
      try {
        const l1Sync = productDataService.getLevel1ProductsSync();
        const l2Sync = productDataService.getLevel2ProductsSync();
        const l3Sync = productDataService.getLevel3ProductsSync();
        setLevel1Products(l1Sync);
        setLevel2Products(l2Sync);
        setLevel3Products(l3Sync);
        console.log('ProductManagement: Fallback to sync data successful');
      } catch (syncError) {
        console.error('ProductManagement: Fallback also failed:', syncError);
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleResetData = async () => {
    try {
      setIsLoading(true);
      await productDataService.resetAndReload();
      setRefreshTrigger(prev => prev + 1);
      toast({
        title: "Success",
        description: "Product data has been reset and reloaded"
      });
    } catch (error) {
      console.error('Error resetting data:', error);
      toast({
        title: "Error",
        description: "Failed to reset product data",
        variant: "destructive"
      });
    }
  };

  const refreshProductData = async () => {
    console.log('ProductManagement: Manual refresh triggered');
    setRefreshTrigger(prev => prev + 1);
  };

  const handleLevel1Save = async (productData: Omit<Level1Product, 'id'> | Level1Product) => {
    try {
      console.log('ProductManagement: Saving Level 1 product:', productData);
      
      if ('id' in productData) {
        await productDataService.updateLevel1Product(productData.id, productData);
        toast({ title: "Success", description: "Level 1 product updated successfully" });
      } else {
        await productDataService.createLevel1Product(productData);
        toast({ title: "Success", description: "Level 1 product created successfully" });
      }
      refreshProductData();
      setShowLevel1Form(false);
    } catch (error) {
      console.error('ProductManagement: Error saving Level 1 product:', error);
      toast({ 
        title: "Error", 
        description: "Failed to save Level 1 product", 
        variant: "destructive" 
      });
    }
  };

  const handleLevel2Save = async (productData: Omit<Level2Product, 'id'> | Level2Product) => {
    try {
      console.log('ProductManagement: Saving Level 2 product:', productData);
      
      if ('id' in productData) {
        toast({ title: "Success", description: "Level 2 product updated successfully" });
      } else {
        await productDataService.createLevel2Product(productData);
        toast({ title: "Success", description: "Level 2 product created successfully" });
      }
      refreshProductData();
      setShowLevel2Form(false);
    } catch (error) {
      console.error('ProductManagement: Error saving Level 2 product:', error);
      toast({ 
        title: "Error", 
        description: "Failed to save Level 2 product", 
        variant: "destructive" 
      });
    }
  };

  const handleLevel3Save = async (productData: Omit<Level3Product, 'id'> | Level3Product) => {
    try {
      console.log('ProductManagement: Saving Level 3 product:', productData);
      
      if ('id' in productData) {
        toast({ title: "Success", description: "Level 3 product updated successfully" });
      } else {
        await productDataService.createLevel3Product(productData);
        toast({ title: "Success", description: "Level 3 product created successfully" });
      }
      refreshProductData();
      setShowLevel3CardForm(false);
      setShowLevel3OptionForm(false);
    } catch (error) {
      console.error('ProductManagement: Error saving Level 3 product:', error);
      toast({ 
        title: "Error", 
        description: "Failed to save Level 3 product", 
        variant: "destructive" 
      });
    }
  };

  const handleLevel1Select = (product: Level1Product) => {
    setSelectedLevel1(product);
    setSelectedLevel2(null);
    const level2 = level2Products.filter(p => p.parent_product_id === product.id);
    if (level2.length > 0) {
      setSelectedLevel2(level2[0]);
    }
  };

  const handleLevel2Select = (product: Level2Product) => {
    setSelectedLevel2(product);
    // Auto-scroll to level 3 section
    const level3Section = document.getElementById('level3-section');
    if (level3Section) {
      level3Section.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const handleChassisSlotClick = (slotId: number) => {
    setSelectedSlot(slotId);
    const slot = document.getElementById(`slot-${slotId}`);
    if (slot) {
      slot.scrollIntoView({ behavior: 'smooth' });
    }
  };

  const renderChassisCanvas = (chassis: Level2Product) => {
    if (!chassisCanvasRef.current) return null;

    const canvas = chassisCanvasRef.current;
    const ctx = canvas.getContext('2d');
    if (!ctx) return null;

    const width = canvas.width;
    const height = canvas.height;
    const slotHeight = height / (chassis.slot_count || 4);

    // Clear canvas
    ctx.clearRect(0, 0, width, height);

    // Draw chassis outline
    ctx.strokeStyle = '#333';
    ctx.lineWidth = 2;
    ctx.strokeRect(0, 0, width, height);

    // Draw slots
    for (let i = 0; i < (chassis.slot_count || 4); i++) {
      const y = i * slotHeight;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(width, y);
      ctx.stroke();

      // Draw slot number
      ctx.font = '12px Arial';
      ctx.fillStyle = '#666';
      ctx.fillText(`Slot ${i + 1}`, 10, y + 15);
    }

    // Highlight selected slot
    if (selectedSlot !== null) {
      const y = selectedSlot * slotHeight;
      ctx.fillStyle = '#4f46e520';
      ctx.fillRect(0, y, width, slotHeight);
    }

    return null;
  };

  if (isLoading) {
    return (
      <div className="space-y-6 bg-gray-950 text-white min-h-screen p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Product Management</h2>
            <p className="text-gray-400">Loading product data...</p>
          </div>
          <Button onClick={handleResetData} variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
            <RefreshCw className="h-4 w-4 mr-2" />
            Reset Data
          </Button>
        </div>
        <div className="flex items-center justify-center py-12">
          <div className="text-center">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-red-600 mx-auto mb-4"></div>
            <p className="text-gray-400">Initializing product management...</p>
          </div>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="space-y-6 bg-gray-950 text-white min-h-screen p-6">
        <div className="flex justify-between items-center">
          <div>
            <h2 className="text-3xl font-bold tracking-tight text-white">Product Management</h2>
            <p className="text-red-400 flex items-center">
              <AlertCircle className="h-4 w-4 mr-2" />
              {error}
            </p>
          </div>
          <div className="flex gap-2">
            <Button onClick={handleResetData} variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
              <RefreshCw className="h-4 w-4 mr-2" />
              Reset Data
            </Button>
            <Button onClick={refreshProductData} className="bg-red-600 hover:bg-red-700">
              <RefreshCw className="h-4 w-4 mr-2" />
              Retry
            </Button>
          </div>
        </div>
        <Card className="bg-gray-900 border-gray-800">
          <CardContent className="pt-6">
            <div className="text-center py-8">
              <AlertCircle className="h-12 w-12 mx-auto text-red-500 mb-4" />
              <h3 className="text-lg font-medium text-white mb-2">Failed to Load Product Data</h3>
              <p className="text-gray-400 mb-4">
                There was an error loading the product data. You can try to reset the data or retry loading.
              </p>
              <div className="flex justify-center gap-2">
                <Button onClick={refreshProductData} className="bg-red-600 hover:bg-red-700">
                  <RefreshCw className="h-4 w-4 mr-2" />
                  Retry Loading
                </Button>
                <Button onClick={handleResetData} variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                  Reset to Defaults
                </Button>
              </div>
            </div>
          </CardContent>
        </Card>
      </div>
    );
  }

  return (
    <div className="space-y-6 bg-gray-950 text-white min-h-screen p-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold tracking-tight text-white">Product Management</h2>
          <p className="text-gray-400">
            Manage your product hierarchy and configurations across all levels.
          </p>
          <div className="mt-2 text-sm text-gray-400 flex items-center gap-4">
            <span>Level 1: {level1Products.length} products</span>
            <span>Level 2: {level2Products.length} products</span>
            <span>Level 3: {level3Products.length} products</span>
            <Button 
              onClick={refreshProductData} 
              variant="ghost" 
              size="sm"
              className="h-6 px-2 text-xs text-gray-400 hover:text-white hover:bg-gray-800"
            >
              <RefreshCw className="h-3 w-3 mr-1" />
              Refresh
            </Button>
          </div>
        </div>
        <Button onClick={handleResetData} variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
          <RefreshCw className="h-4 w-4 mr-2" />
          Reset Data
        </Button>
      </div>

      <Tabs defaultValue="level1" className="space-y-4">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800 border-gray-700">
          <TabsTrigger value="level1" className="text-white data-[state=active]:bg-red-600">Level 1 Products</TabsTrigger>
          <TabsTrigger value="level2" className="text-white data-[state=active]:bg-red-600">Level 2 Products</TabsTrigger>
          <TabsTrigger value="level3" className="text-white data-[state=active]:bg-red-600">Level 3 Products</TabsTrigger>
          <TabsTrigger value="level4" className="text-white data-[state=active]:bg-red-600">Level 4 Configuration</TabsTrigger>
        </TabsList>

        <TabsContent value="level1" className="space-y-4">
          <div className="space-y-4">
            {/* Show existing products first */}
            <Level1ProductList 
              products={level1Products} 
              onProductUpdate={refreshProductData}
            />
            
            {/* Collapsible form for creating new products */}
            <Collapsible open={showLevel1Form} onOpenChange={setShowLevel1Form}>
              <CollapsibleTrigger asChild>
                <Button variant="outline" className="w-full border-gray-600 text-white hover:bg-gray-800">
                  <Plus className="h-4 w-4 mr-2" />
                  {showLevel1Form ? 'Hide' : 'Add'} New Level 1 Product
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Create New Level 1 Product</CardTitle>
                    <CardDescription className="text-gray-400">
                      Main product categories (QTMS, TM8, TM3, etc.). These are the top-level products in your hierarchy.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    <Level1ProductForm onSubmit={handleLevel1Save} />
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </TabsContent>

        <TabsContent value="level2" className="space-y-4">
          <div className="space-y-4">
            {/* Level2ProductList manages its own data internally, no props needed */}
            <Level2ProductList />
            
            {/* Collapsible form for creating new products */}
            <Collapsible open={showLevel2Form} onOpenChange={setShowLevel2Form}>
              <CollapsibleTrigger asChild>
                <Button 
                  variant="outline" 
                  className="w-full border-gray-600 text-white hover:bg-gray-800"
                  disabled={level1Products.length === 0}
                >
                  <Plus className="h-4 w-4 mr-2" />
                  {showLevel2Form ? 'Hide' : 'Add'} New Level 2 Product
                </Button>
              </CollapsibleTrigger>
              <CollapsibleContent className="mt-4">
                <Card className="bg-gray-900 border-gray-800">
                  <CardHeader>
                    <CardTitle className="text-white">Create New Level 2 Product</CardTitle>
                    <CardDescription className="text-gray-400">
                      Product variants and chassis (LTX, MTX, STX for QTMS). These are linked to Level 1 products.
                    </CardDescription>
                  </CardHeader>
                  <CardContent>
                    {level1Products.length > 0 ? (
                      <ChassisForm 
                        onSubmit={handleLevel2Save} 
                        level1Products={level1Products}
                      />
                    ) : (
                      <div className="text-center py-8 text-gray-400">
                        <p>No Level 1 products available.</p>
                        <p>Create Level 1 products first to enable Level 2 product creation.</p>
                      </div>
                    )}
                  </CardContent>
                </Card>
              </CollapsibleContent>
            </Collapsible>
          </div>
        </TabsContent>

        <TabsContent value="level3" className="space-y-4">
          <div className="space-y-4">
            {/* Show existing products first */}
            <Level3ProductList 
              products={level3Products}
              level2Products={level2Products}
              onProductUpdate={refreshProductData}
            />
            
            {/* Collapsible forms for creating new products */}
            <div className="grid gap-4">
              <Collapsible open={showLevel3CardForm} onOpenChange={setShowLevel3CardForm}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full border-gray-600 text-white hover:bg-gray-800"
                    disabled={level2Products.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {showLevel3CardForm ? 'Hide' : 'Add'} New Card/Component
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white">Create New Card/Component</CardTitle>
                      <CardDescription className="text-gray-400">
                        Cards and components that go into Level 2 products (chassis).
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {level2Products.length > 0 ? (
                        <CardForm 
                          onSubmit={handleLevel3Save}
                          level2Products={level2Products}
                        />
                      ) : (
                        <div className="text-center py-4 text-gray-400">
                          <p>No Level 2 products available for card assignment.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>

              <Collapsible open={showLevel3OptionForm} onOpenChange={setShowLevel3OptionForm}>
                <CollapsibleTrigger asChild>
                  <Button 
                    variant="outline" 
                    className="w-full border-gray-600 text-white hover:bg-gray-800"
                    disabled={level1Products.length === 0}
                  >
                    <Plus className="h-4 w-4 mr-2" />
                    {showLevel3OptionForm ? 'Hide' : 'Add'} New Product Option
                  </Button>
                </CollapsibleTrigger>
                <CollapsibleContent className="mt-4">
                  <Card className="bg-gray-900 border-gray-800">
                    <CardHeader>
                      <CardTitle className="text-white">Create New Product Option</CardTitle>
                      <CardDescription className="text-gray-400">
                        Options and accessories for Level 1 products.
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      {level1Products.length > 0 ? (
                        <Level2OptionForm 
                          onSubmit={handleLevel3Save}
                          level1Products={level1Products}
                        />
                      ) : (
                        <div className="text-center py-4 text-gray-400">
                          <p>No Level 1 products available for option assignment.</p>
                        </div>
                      )}
                    </CardContent>
                  </Card>
                </CollapsibleContent>
              </Collapsible>
            </div>
          </div>
        </TabsContent>

        <TabsContent value="level4" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Level 4 Configuration</CardTitle>
              <CardDescription className="text-gray-400">
                Product-specific configurations tied to Level 3 products. Create dropdown selections or multi-line configurations for your products.
              </CardDescription>
            </CardHeader>
            <CardContent>
              <Level4ConfigurationManager key={refreshTrigger} />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {selectedLevel1 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          id="level2-section"
        >
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Level 2 Products</CardTitle>
              <CardDescription>Chassis Configuration</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="relative w-full h-64 bg-gray-100 rounded-lg overflow-hidden">
                  <canvas 
                    ref={chassisCanvasRef}
                    className="w-full h-full cursor-pointer"
                    onClick={(e) => {
                      if (!chassisCanvasRef.current) return;
                      const rect = chassisCanvasRef.current.getBoundingClientRect();
                      const y = e.clientY - rect.top;
                      const slotHeight = rect.height / (selectedLevel2?.slot_count || 4);
                      const slotId = Math.floor(y / slotHeight);
                      handleChassisSlotClick(slotId);
                    }}
                  />
                  {selectedLevel2?.slot_mapping && (
                    <div className="absolute top-0 left-0 w-full h-full pointer-events-none">
                      {JSON.parse(selectedLevel2.slot_mapping).map((slot: any, index: number) => (
                        <div
                          key={index}
                          className="absolute inset-0 flex items-center justify-center"
                          style={{
                            top: `${(index * 100) / (selectedLevel2.slot_count || 4)}%`,
                            height: `${100 / (selectedLevel2.slot_count || 4)}%`
                          }}
                        >
                          <div className="text-sm text-gray-600">
                            {slot.product_type}
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
                {level2Products
                  .filter(p => p.parent_product_id === selectedLevel1.id)
                  .map((product) => (
                    <Button
                      key={product.id}
                      variant="outline"
                      onClick={() => setSelectedLevel2(product)}
                      className={selectedLevel2?.id === product.id ? 'bg-primary text-primary-foreground' : ''}
                    >
                      {product.name}
                    </Button>
                  ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}

      {selectedLevel2 && (
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
          id="level3-section"
        >
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle>Level 3 Products</CardTitle>
              <CardDescription>Card Selection</CardDescription>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                {level3Products
                  .filter(p => p.parent_product_id === selectedLevel2.id)
                  .map((product) => (
                    <Card key={product.id}>
                      <CardHeader>
                        <CardTitle>{product.name}</CardTitle>
                        {selectedSlot !== null && (
                          <Button
                            variant="outline"
                            size="sm"
                            onClick={() => {
                              // Assign product to selected slot
                              const updatedSlotMapping = JSON.parse(selectedLevel2.slot_mapping || '{}');
                              updatedSlotMapping[selectedSlot] = {
                                product_type: product.name,
                                product_id: product.id
                              };
                              
                              // Update chassis slot mapping
                              productDataService.updateChassisSlotMapping(selectedLevel2.id, JSON.stringify(updatedSlotMapping));
                              setSelectedSlot(null);
                            }}
                          >
                            Assign to Slot {selectedSlot + 1}
                          </Button>
                        )}
                      </CardHeader>
                    </Card>
                  ))}
              </div>
            </CardContent>
          </Card>
        </motion.div>
      )}
    </div>
  );
};

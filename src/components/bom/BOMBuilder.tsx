
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { useState, useEffect } from 'react';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Plus, Save, Send } from 'lucide-react';
import { BOMItem } from '@/types/product';
import BOMDisplay from './BOMDisplay';
import ProductSelector from './ProductSelector';
import QuoteRequestForm from '../quotes/QuoteRequestForm';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';

interface BOMBuilderProps {
  onBOMUpdate: (items: BOMItem[]) => void;
  canSeePrices: boolean;
}

const BOMBuilder = ({ onBOMUpdate, canSeePrices }: BOMBuilderProps) => {
  const [activeTab, setActiveTab] = useState('level1');
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [showQuoteForm, setShowQuoteForm] = useState(false);
  const { toast } = useToast();

  const handleAddItem = (item: BOMItem) => {
    const newItems = [...bomItems, { ...item, id: Math.random().toString() }];
    setBomItems(newItems);
    onBOMUpdate(newItems);
    
    toast({
      title: "Item Added",
      description: `${item.name} has been added to your BOM`,
    });
  };

  const handleUpdateItem = (itemId: string, updates: Partial<BOMItem>) => {
    const updatedItems = bomItems.map(item =>
      item.id === itemId ? { ...item, ...updates } : item
    );
    setBomItems(updatedItems);
    onBOMUpdate(updatedItems);
  };

  const handleRemoveItem = (itemId: string) => {
    const updatedItems = bomItems.filter(item => item.id !== itemId);
    setBomItems(updatedItems);
    onBOMUpdate(updatedItems);
    
    toast({
      title: "Item Removed",
      description: "Item has been removed from your BOM",
    });
  };

  const handleSaveBOM = async () => {
    try {
      // Save BOM logic here
      toast({
        title: "BOM Saved",
        description: "Your Bill of Materials has been saved successfully",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to save BOM",
        variant: "destructive"
      });
    }
  };

  const handleSubmitQuote = () => {
    if (bomItems.length === 0) {
      toast({
        title: "No Items",
        description: "Please add items to your BOM before submitting a quote",
        variant: "destructive"
      });
      return;
    }
    setShowQuoteForm(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">BOM Builder</h1>
          <p className="text-gray-300">Build your Bill of Materials and request quotes</p>
        </div>
        <div className="flex space-x-2">
          <Button onClick={handleSaveBOM} variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
            <Save className="mr-2 h-4 w-4" />
            Save BOM
          </Button>
          <Button onClick={handleSubmitQuote} className="bg-blue-600 hover:bg-blue-700">
            <Send className="mr-2 h-4 w-4" />
            Submit Quote Request
          </Button>
        </div>
      </div>

      {/* Product Selection Tabs - Consolidated to 3 levels */}
      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-3 bg-gray-800">
          <TabsTrigger value="level1" className="text-white data-[state=active]:bg-blue-600">
            Level 1 - Products
          </TabsTrigger>
          <TabsTrigger value="level2" className="text-white data-[state=active]:bg-blue-600">
            Level 2 - Options
          </TabsTrigger>
          <TabsTrigger value="level3" className="text-white data-[state=active]:bg-blue-600">
            Level 3 - Customizations
          </TabsTrigger>
        </TabsList>

        <TabsContent value="level1" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Plus className="mr-2 h-5 w-5" />
                Select Base Products
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProductSelector
                level="level1"
                onProductSelect={handleAddItem}
                canSeePrices={canSeePrices}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="level2" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Plus className="mr-2 h-5 w-5" />
                Select Product Options
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProductSelector
                level="level2"
                onProductSelect={handleAddItem}
                canSeePrices={canSeePrices}
              />
            </CardContent>
          </Card>
        </TabsContent>

        <TabsContent value="level3" className="space-y-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <Plus className="mr-2 h-5 w-5" />
                Configure Customizations
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ProductSelector
                level="level3"
                onProductSelect={handleAddItem}
                canSeePrices={canSeePrices}
              />
            </CardContent>
          </Card>
        </TabsContent>
      </Tabs>

      {/* BOM Display */}
      <BOMDisplay
        items={bomItems}
        onUpdateItem={handleUpdateItem}
        onRemoveItem={handleRemoveItem}
      />

      {/* Quote Request Form Modal */}
      {showQuoteForm && (
        <QuoteRequestForm
          bomItems={bomItems}
          onClose={() => setShowQuoteForm(false)}
          onSubmit={async (quoteData) => {
            try {
              // Submit quote logic
              toast({
                title: "Quote Submitted",
                description: "Your quote request has been submitted for approval",
              });
              setShowQuoteForm(false);
            } catch (error) {
              toast({
                title: "Error",
                description: "Failed to submit quote request",
                variant: "destructive"
              });
            }
          }}
        />
      )}
    </div>
  );
};

export default BOMBuilder;

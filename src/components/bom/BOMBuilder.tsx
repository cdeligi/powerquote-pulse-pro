import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'react-hot-toast';
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Slider } from "@/components/ui/slider"
import { Product, BOMItem, Quote } from '@/types/product';
import ProductTable from './ProductTable';
import { generateQuotePDF } from '@/utils/pdfGenerator';
import { useUser } from '@/context/UserContext';

interface BOMBuilderProps {
  onQuoteUpdate: (quote: Partial<Quote>) => void;
}

const BOMBuilder = ({ onQuoteUpdate }: BOMBuilderProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [newProduct, setNewProduct] = useState<Partial<Product>>({});
  const [isAddingProduct, setIsAddingProduct] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [quoteInfo, setQuoteInfo] = useState<Partial<Quote>>({});
  const { user } = useUser();

  useEffect(() => {
    // Mock data fetching
    const mockProducts: Product[] = [
      { id: '1', name: 'Transformer Oil Level Indicator', description: 'Standard model', price: 1200, currency: 'USD' },
      { id: '2', name: 'Winding Temperature Monitor', description: 'Advanced monitoring system', price: 3500, currency: 'USD' },
      { id: '3', name: 'Bushing Monitor', description: 'Monitors bushing health', price: 2800, currency: 'USD' },
    ];
    setProducts(mockProducts);
  }, []);

  const addProductToBOM = (product: Product) => {
    setBomItems(prevItems => {
      const existingItemIndex = prevItems.findIndex(item => item.product.id === product.id);

      if (existingItemIndex > -1) {
        const updatedItems = [...prevItems];
        updatedItems[existingItemIndex].quantity += 1;
        return updatedItems;
      } else {
        return [...prevItems, { product: product, quantity: 1, enabled: true, slot: '', partNumber: '' }];
      }
    });
  };

  const updateBOMItem = (index: number, key: string, value: any) => {
    setBomItems(prevItems => {
      const updatedItems = [...prevItems];
      if (key === 'quantity') {
        updatedItems[index].quantity = parseInt(value, 10) || 1;
      } else if (key === 'enabled') {
        updatedItems[index].enabled = value;
      }
       else if (key === 'slot') {
        updatedItems[index].slot = value;
      } else if (key === 'partNumber') {
        updatedItems[index].partNumber = value;
      }
      return updatedItems;
    });
  };

  const removeBOMItem = (index: number) => {
    setBomItems(prevItems => {
      const updatedItems = [...prevItems];
      updatedItems.splice(index, 1);
      return updatedItems;
    });
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setQuoteInfo(prev => ({ ...prev, [name]: value }));
  };

  const handleCheckboxChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, checked } = e.target;
    setQuoteInfo(prev => ({ ...prev, [name]: checked }));
  };

  const subtotal = bomItems.filter(item => item.enabled).reduce((total, item) => total + (item.product.price * item.quantity), 0);
  const discountAmount = subtotal * (discountPercentage / 100);
  const total = subtotal - discountAmount;

  useEffect(() => {
    onQuoteUpdate({
      items: bomItems.filter(item => item.enabled),
      subtotal: subtotal,
      discount: discountPercentage,
      total: total,
      ...quoteInfo
    });
  }, [bomItems, discountPercentage, subtotal, total, quoteInfo, onQuoteUpdate]);

  const handleRequestQuote = () => {
    const quote: Partial<Quote> = {
      id: `Q-${Date.now()}`,
      items: bomItems.filter(item => item.enabled),
      subtotal: subtotal,
      discount: discountPercentage,
      total: total,
      status: 'pending_approval',
      customerName: quoteInfo.customerName,
      oracleCustomerId: quoteInfo.oracleCustomerId,
      priority: quoteInfo.priority,
      isRepInvolved: quoteInfo.isRepInvolved,
      shippingTerms: quoteInfo.shippingTerms,
      paymentTerms: quoteInfo.paymentTerms,
      quoteCurrency: quoteInfo.quoteCurrency,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    console.log('Quote request submitted:', quote);
    toast.success('Quote request submitted for approval');
  };

  const handleSaveDraft = () => {
    const quote: Partial<Quote> = {
      id: `DRAFT-${Date.now()}`,
      items: bomItems.filter(item => item.enabled),
      subtotal: subtotal,
      discount: discountPercentage,
      total: total,
      status: 'draft',
      customerName: quoteInfo.customerName,
      oracleCustomerId: quoteInfo.oracleCustomerId,
      priority: quoteInfo.priority,
      isRepInvolved: quoteInfo.isRepInvolved,
      shippingTerms: quoteInfo.shippingTerms,
      paymentTerms: quoteInfo.paymentTerms,
      quoteCurrency: quoteInfo.quoteCurrency,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString()
    };

    generateQuotePDF(bomItems.filter(item => item.enabled), quote, user.role !== 'level1');
    toast.success('Draft quote PDF generated');
  };

  return (
    <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
      {/* Product Selection and BOM Items */}
      <div className="space-y-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Select Products</CardTitle>
          </CardHeader>
          <CardContent>
            <ProductTable products={products} onProductSelect={addProductToBOM} />
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">BOM Items</CardTitle>
          </CardHeader>
          <CardContent>
            {bomItems.length === 0 ? (
              <p className="text-gray-400">No items added to BOM.</p>
            ) : (
              <div className="space-y-2">
                {bomItems.map((item, index) => (
                  <div key={index} className="flex items-center space-x-2">
                    <Input
                      type="number"
                      value={item.quantity}
                      onChange={(e) => updateBOMItem(index, 'quantity', e.target.value)}
                      className="w-16 bg-gray-800 border-gray-700 text-white"
                    />
                     <Input
                      type="text"
                      placeholder="Slot"
                      value={item.slot || ''}
                      onChange={(e) => updateBOMItem(index, 'slot', e.target.value)}
                      className="w-24 bg-gray-800 border-gray-700 text-white"
                    />
                     <Input
                      type="text"
                      placeholder="Part Number"
                      value={item.partNumber || ''}
                      onChange={(e) => updateBOMItem(index, 'partNumber', e.target.value)}
                      className="w-32 bg-gray-800 border-gray-700 text-white"
                    />
                    <Label className="text-white">{item.product.name} (${item.product.price})</Label>
                    <Input
                      type="checkbox"
                      checked={item.enabled}
                      onChange={(e) => updateBOMItem(index, 'enabled', e.target.checked)}
                      className="bg-gray-800 border-gray-700 text-white"
                    />
                    <Button variant="ghost" size="sm" onClick={() => removeBOMItem(index)}>
                      Remove
                    </Button>
                  </div>
                ))}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Quote Information and Actions */}
      <div className="space-y-4">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Quote Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label htmlFor="customerName" className="text-white">Customer Name</Label>
              <Input
                type="text"
                id="customerName"
                name="customerName"
                onChange={handleInputChange}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="oracleCustomerId" className="text-white">Oracle Customer ID</Label>
              <Input
                type="text"
                id="oracleCustomerId"
                name="oracleCustomerId"
                onChange={handleInputChange}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="priority" className="text-white">Priority</Label>
              <Select onValueChange={(value) => setQuoteInfo(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-full">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="High" className="text-white">High</SelectItem>
                  <SelectItem value="Medium" className="text-white">Medium</SelectItem>
                  <SelectItem value="Low" className="text-white">Low</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-center space-x-2">
              <Input
                type="checkbox"
                id="isRepInvolved"
                name="isRepInvolved"
                onChange={handleCheckboxChange}
                className="bg-gray-800 border-gray-700 text-white"
              />
              <Label htmlFor="isRepInvolved" className="text-white">Is Rep Involved?</Label>
            </div>
            <div>
              <Label htmlFor="shippingTerms" className="text-white">Shipping Terms</Label>
              <Input
                type="text"
                id="shippingTerms"
                name="shippingTerms"
                onChange={handleInputChange}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="paymentTerms" className="text-white">Payment Terms (days)</Label>
              <Input
                type="number"
                id="paymentTerms"
                name="paymentTerms"
                onChange={handleInputChange}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <div>
              <Label htmlFor="quoteCurrency" className="text-white">Quote Currency</Label>
              <Select onValueChange={(value) => setQuoteInfo(prev => ({ ...prev, quoteCurrency: value }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white w-full">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="USD" className="text-white">USD</SelectItem>
                  <SelectItem value="EUR" className="text-white">EUR</SelectItem>
                  <SelectItem value="GBP" className="text-white">GBP</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Discount</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex flex-col space-y-2">
              <Label className="text-white">Discount Percentage: {discountPercentage}%</Label>
              <Slider
                value={[discountPercentage]}
                onValueChange={(value) => setDiscountPercentage(value[0])}
                max={50}
                step={1}
              />
              <div className="text-white">
                Subtotal: ${subtotal.toLocaleString()}
              </div>
              <div className="text-green-500">
                Discount: ${discountAmount.toLocaleString()}
              </div>
              <div className="text-white font-bold">
                Total: ${total.toLocaleString()}
              </div>
            </div>
          </CardContent>
        </Card>

        <div className="flex justify-between">
          <Button onClick={handleSaveDraft} className="bg-blue-600 hover:bg-blue-700 text-white">
            Save Draft & Generate PDF
          </Button>
          <Button onClick={handleRequestQuote} className="bg-green-600 hover:bg-green-700 text-white">
            Request Quote
          </Button>
        </div>
      </div>
    </div>
  );
};

export default BOMBuilder;

import React, { useState, useEffect } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "@/components/ui/use-toast";
import { generateQuotePDF } from "@/lib/pdf-generator";
import { useUser } from "@/hooks/use-user";
import { Quote } from '@/types/quote';

interface BOMItem {
  id: number;
  name: string;
  description: string;
  quantity: number;
  unitPrice: number;
  enabled: boolean;
}

const BOMBuilder = ({ onQuoteUpdate }: { onQuoteUpdate: (quote: any) => void }) => {
  const { user } = useUser();
  const [bomItems, setBomItems] = useState<BOMItem[]>([
    { id: 1, name: 'Transformer Monitoring Unit', description: 'Advanced monitoring system', quantity: 1, unitPrice: 12000, enabled: true },
    { id: 2, name: 'Fiber Optic Temperature Sensor', description: 'Measures winding temperature', quantity: 12, unitPrice: 850, enabled: true },
    { id: 3, name: 'Partial Discharge Monitor', description: 'Detects insulation faults', quantity: 3, unitPrice: 4500, enabled: false },
  ]);
  const [subtotal, setSubtotal] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [total, setTotal] = useState(0);
  const [quoteInfo, setQuoteInfo] = useState({
    customerName: '',
    oracleCustomerId: '',
    priority: 'normal',
    isRepInvolved: false,
    shippingTerms: 'FOB Destination',
    paymentTerms: 'Net 30',
    quoteCurrency: 'USD' as 'USD' | 'EURO' | 'GBP' | 'CAD'
  });

  useEffect(() => {
    recalculateTotals();
  }, [bomItems, discountPercentage]);

  const recalculateTotals = () => {
    const newSubtotal = bomItems.reduce((acc, item) => item.enabled ? acc + (item.quantity * item.unitPrice) : acc, 0);
    setSubtotal(newSubtotal);
    const discountAmount = newSubtotal * (discountPercentage / 100);
    const newTotal = newSubtotal - discountAmount;
    setTotal(newTotal);
  };

  const updateItemQuantity = (id: number, quantity: number) => {
    setBomItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, quantity: Math.max(1, quantity) } : item
      )
    );
  };

  const toggleItemEnabled = (id: number, enabled: boolean) => {
    setBomItems(prevItems =>
      prevItems.map(item =>
        item.id === id ? { ...item, enabled } : item
      )
    );
  };

  const handleRequestQuote = () => {
    const quote: Quote = {
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
    const quote: Quote = {
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
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Quote Information</CardTitle>
          <CardDescription className="text-gray-400">
            Enter customer details and quote settings
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customer-name" className="text-white">Customer Name</Label>
              <Input
                id="customer-name"
                className="bg-gray-800 border-gray-700 text-white"
                value={quoteInfo.customerName}
                onChange={(e) => setQuoteInfo(prev => ({ ...prev, customerName: e.target.value }))}
              />
            </div>
            <div>
              <Label htmlFor="oracle-customer-id" className="text-white">Oracle Customer ID</Label>
              <Input
                id="oracle-customer-id"
                className="bg-gray-800 border-gray-700 text-white"
                value={quoteInfo.oracleCustomerId}
                onChange={(e) => setQuoteInfo(prev => ({ ...prev, oracleCustomerId: e.target.value }))}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="priority" className="text-white">Priority</Label>
              <Select value={quoteInfo.priority} onValueChange={(value) => setQuoteInfo(prev => ({ ...prev, priority: value }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select priority" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="low">Low</SelectItem>
                  <SelectItem value="normal">Normal</SelectItem>
                  <SelectItem value="high">High</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div>
              <Label htmlFor="quote-currency" className="text-white">Quote Currency</Label>
              <Select value={quoteInfo.quoteCurrency} onValueChange={(value: 'USD' | 'EURO' | 'GBP' | 'CAD') => setQuoteInfo(prev => ({ ...prev, quoteCurrency: value }))}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white">
                  <SelectValue placeholder="Select currency" />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="USD">USD</SelectItem>
                  <SelectItem value="EURO">EURO</SelectItem>
                  <SelectItem value="GBP">GBP</SelectItem>
                  <SelectItem value="CAD">CAD</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          <div>
            <Label htmlFor="shipping-terms" className="text-white">Shipping Terms</Label>
            <Input
              id="shipping-terms"
              className="bg-gray-800 border-gray-700 text-white"
              value={quoteInfo.shippingTerms}
              onChange={(e) => setQuoteInfo(prev => ({ ...prev, shippingTerms: e.target.value }))}
            />
          </div>
          <div>
            <Label htmlFor="payment-terms" className="text-white">Payment Terms</Label>
            <Input
              id="payment-terms"
              className="bg-gray-800 border-gray-700 text-white"
              value={quoteInfo.paymentTerms}
              onChange={(e) => setQuoteInfo(prev => ({ ...prev, paymentTerms: e.target.value }))}
            />
          </div>
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex justify-between items-center">
            <div>
              <CardTitle className="text-white">Bill of Materials</CardTitle>
              <CardDescription className="text-gray-400">
                Configure the products and services for this quote
              </CardDescription>
            </div>
            <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-800">
              Add Item
            </Button>
          </div>
        </CardHeader>
        <CardContent className="space-y-4">
          {bomItems.map(item => (
            <div key={item.id} className="flex items-center justify-between p-4 bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-4">
                <input
                  type="checkbox"
                  className="h-5 w-5 text-red-600 focus:ring-red-500 bg-gray-700 border-gray-600 rounded"
                  checked={item.enabled}
                  onChange={(e) => toggleItemEnabled(item.id, e.target.checked)}
                />
                <div>
                  <p className="text-white font-medium">{item.name}</p>
                  <p className="text-gray-400 text-sm">{item.description}</p>
                </div>
              </div>
              <div className="flex items-center space-x-4">
                <div className="flex items-center">
                  <Label htmlFor={`quantity-${item.id}`} className="text-white mr-2">Qty:</Label>
                  <Input
                    type="number"
                    id={`quantity-${item.id}`}
                    className="w-20 bg-gray-700 border-gray-600 text-white text-center"
                    value={item.quantity}
                    onChange={(e) => {
                      const newQuantity = parseInt(e.target.value);
                      updateItemQuantity(item.id, isNaN(newQuantity) ? 1 : newQuantity);
                    }}
                  />
                </div>
                <p className="text-white">${item.unitPrice.toLocaleString()}</p>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Quote Summary</CardTitle>
          <CardDescription className="text-gray-400">
            Review and finalize the quote details
          </CardDescription>
        </CardHeader>
        <CardContent className="space-y-4">
          <div className="flex justify-between text-white">
            <span>Subtotal:</span>
            <span>${subtotal.toLocaleString()}</span>
          </div>
          <div className="flex items-center space-x-2">
            <Label htmlFor="discount" className="text-white">Discount:</Label>
            <Input
              type="number"
              id="discount"
              className="w-24 bg-gray-800 border-gray-700 text-white"
              value={discountPercentage}
              onChange={(e) => {
                const newDiscount = parseInt(e.target.value);
                setDiscountPercentage(isNaN(newDiscount) ? 0 : Math.max(0, Math.min(100, newDiscount)));
              }}
            />
            <span className="text-white">%</span>
          </div>
          <div className="flex justify-between text-white text-lg font-bold">
            <span>Total:</span>
            <span>${total.toLocaleString()}</span>
          </div>
          <div className="flex justify-between">
            <Button variant="outline" className="border-gray-600 text-white hover:bg-gray-800" onClick={handleSaveDraft}>
              Save Draft
            </Button>
            <Button className="bg-red-600 hover:bg-red-700 text-white" onClick={handleRequestQuote}>
              Request Approval
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BOMBuilder;

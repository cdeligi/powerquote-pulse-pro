import React, { useState, useEffect, useCallback } from 'react';
import { toast } from 'sonner';
import { Product, BOMItem, Quote, Currency } from '@/types/product';
import { User } from '@/types/auth';
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Button } from "@/components/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card"
import { generateQuotePDF } from '@/utils/pdfGenerator';

interface BOMBuilderProps {
  user: User;
}

interface QuoteInfo {
  customerName: string;
  oracleCustomerId: string;
  priority: string;
  isRepInvolved: boolean;
  shippingTerms: string;
  paymentTerms: string;
  quoteCurrency: Currency;
}

const BOMBuilder = ({ user }: BOMBuilderProps) => {
  const [products, setProducts] = useState<Product[]>([]);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [newProductName, setNewProductName] = useState('');
  const [newProductDescription, setNewProductDescription] = useState('');
  const [newProductPrice, setNewProductPrice] = useState(0);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [quoteInfo, setQuoteInfo] = useState<QuoteInfo>({
    customerName: '',
    oracleCustomerId: '',
    priority: 'Medium',
    isRepInvolved: false,
    shippingTerms: '',
    paymentTerms: '',
    quoteCurrency: 'USD'
  });

  useEffect(() => {
    // Mock product data
    const mockProducts: Product[] = [
      { id: '1', name: 'Transformer Oil Level Monitor', description: 'Standard model', price: 1000 },
      { id: '2', name: 'Desiccant Breather', description: 'Large capacity', price: 300 },
      { id: '3', name: 'Rapid Pressure Relief Valve', description: 'High-speed valve', price: 1200 },
    ];
    setProducts(mockProducts);
  }, []);

  const calculateSubtotal = useCallback(() => {
    return bomItems
      .filter(item => item.enabled)
      .reduce((total, item) => total + (item.product.price * item.quantity), 0);
  }, [bomItems]);

  const subtotal = calculateSubtotal();
  const discountAmount = subtotal * (discountPercentage / 100);
  const total = subtotal - discountAmount;

  const addProduct = () => {
    const newProduct: Product = {
      id: Date.now().toString(),
      name: newProductName,
      description: newProductDescription,
      price: newProductPrice,
    };
    setProducts([...products, newProduct]);
    setNewProductName('');
    setNewProductDescription('');
    setNewProductPrice(0);
  };

  const addBOMItem = (product: Product) => {
    const existingItem = bomItems.find(item => item.product.id === product.id);
    if (existingItem) {
      const updatedItems = bomItems.map(item =>
        item.product.id === product.id ? { ...item, quantity: item.quantity + 1 } : item
      );
      setBomItems(updatedItems);
    } else {
      const newBOMItem: BOMItem = {
        id: Date.now().toString(),
        product: product,
        quantity: 1,
        enabled: true,
        slot: '',
        partNumber: ''
      };
      setBomItems([...bomItems, newBOMItem]);
    }
  };

  const updateBOMItem = (id: string, field: string, value: any) => {
    const updatedItems = bomItems.map(item =>
      item.id === id ? { ...item, [field]: value } : item
    );
    setBomItems(updatedItems);
  };

  const toggleBOMItem = (id: string) => {
    const updatedItems = bomItems.map(item =>
      item.id === id ? { ...item, enabled: !item.enabled } : item
    );
    setBomItems(updatedItems);
  };

  const removeBOMItem = (id: string) => {
    const updatedItems = bomItems.filter(item => item.id !== id);
    setBomItems(updatedItems);
  };

  const handleRequestQuote = () => {
    const quoteData: Partial<Quote> = {
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
    
    console.log('Quote request submitted:', quoteData);
    toast.success('Quote request submitted for approval');
  };

  const handleSaveDraft = () => {
    const quoteData: Partial<Quote> = {
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
    
    generateQuotePDF(bomItems.filter(item => item.enabled), quoteData, user.role !== 'level1');
    toast.success('Draft quote PDF generated');
  };

  return (
    <div className="flex flex-col space-y-4">
      <Card>
        <CardHeader>
          <CardTitle>BOM Builder</CardTitle>
          <CardDescription>Create and manage your Bill of Materials.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerName">Customer Name</Label>
              <Input
                id="customerName"
                value={quoteInfo.customerName}
                onChange={(e) => setQuoteInfo({ ...quoteInfo, customerName: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="oracleCustomerId">Oracle Customer ID</Label>
              <Input
                id="oracleCustomerId"
                value={quoteInfo.oracleCustomerId}
                onChange={(e) => setQuoteInfo({ ...quoteInfo, oracleCustomerId: e.target.value })}
              />
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="priority">Priority</Label>
              <select
                id="priority"
                className="w-full rounded-md border border-gray-200 px-3 py-2 shadow-sm focus:border-red-600 focus:outline-none focus:ring-red-600 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                value={quoteInfo.priority}
                onChange={(e) => setQuoteInfo({ ...quoteInfo, priority: e.target.value })}
              >
                <option value="Low">Low</option>
                <option value="Medium">Medium</option>
                <option value="High">High</option>
              </select>
            </div>
            <div>
              <Label htmlFor="isRepInvolved">Rep Involved?</Label>
              <select
                id="isRepInvolved"
                className="w-full rounded-md border border-gray-200 px-3 py-2 shadow-sm focus:border-red-600 focus:outline-none focus:ring-red-600 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                value={quoteInfo.isRepInvolved}
                onChange={(e) => setQuoteInfo({ ...quoteInfo, isRepInvolved: e.target.value === 'true' })}
              >
                <option value={true}>Yes</option>
                <option value={false}>No</option>
              </select>
            </div>
            <div>
              <Label htmlFor="quoteCurrency">Currency</Label>
              <select
                id="quoteCurrency"
                className="w-full rounded-md border border-gray-200 px-3 py-2 shadow-sm focus:border-red-600 focus:outline-none focus:ring-red-600 dark:border-gray-700 dark:bg-gray-800 dark:text-white"
                value={quoteInfo.quoteCurrency}
                onChange={(e) => setQuoteInfo({ ...quoteInfo, quoteCurrency: e.target.value as Currency })}
              >
                <option value="USD">USD</option>
                <option value="EURO">EURO</option>
                <option value="GBP">GBP</option>
              </select>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="shippingTerms">Shipping Terms</Label>
              <Input
                id="shippingTerms"
                value={quoteInfo.shippingTerms}
                onChange={(e) => setQuoteInfo({ ...quoteInfo, shippingTerms: e.target.value })}
              />
            </div>
            <div>
              <Label htmlFor="paymentTerms">Payment Terms</Label>
              <Input
                id="paymentTerms"
                value={quoteInfo.paymentTerms}
                onChange={(e) => setQuoteInfo({ ...quoteInfo, paymentTerms: e.target.value })}
              />
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Add Product</CardTitle>
          <CardDescription>Add a new product to the catalog.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div>
              <Label htmlFor="newProductName">Product Name</Label>
              <Input
                id="newProductName"
                value={newProductName}
                onChange={(e) => setNewProductName(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="newProductDescription">Description</Label>
              <Input
                id="newProductDescription"
                value={newProductDescription}
                onChange={(e) => setNewProductDescription(e.target.value)}
              />
            </div>
            <div>
              <Label htmlFor="newProductPrice">Price</Label>
              <Input
                id="newProductPrice"
                type="number"
                value={newProductPrice}
                onChange={(e) => setNewProductPrice(parseFloat(e.target.value))}
              />
            </div>
          </div>
          <Button onClick={addProduct}>Add New Product</Button>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Products</CardTitle>
          <CardDescription>Select products to add to the BOM.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {products.map(product => (
              <Button key={product.id} variant="outline" onClick={() => addBOMItem(product)}>
                {product.name} - ${product.price}
              </Button>
            ))}
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Bill of Materials</CardTitle>
          <CardDescription>Manage the items in your BOM.</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
              <thead>
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Product
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Quantity
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Slot
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Part Number
                  </th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Enabled
                  </th>
                  <th className="px-6 py-3 text-right text-xs font-medium text-gray-500 uppercase tracking-wider">
                    Actions
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200 dark:bg-gray-800 dark:divide-gray-700">
                {bomItems.map(item => (
                  <tr key={item.id}>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium text-gray-900 dark:text-white">
                      {item.product.name}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      <Input
                        type="number"
                        value={item.quantity}
                        onChange={(e) => updateBOMItem(item.id, 'quantity', parseInt(e.target.value))}
                        className="w-20"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      <Input
                        type="text"
                        value={item.slot}
                        onChange={(e) => updateBOMItem(item.id, 'slot', e.target.value)}
                        className="w-20"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      <Input
                        type="text"
                        value={item.partNumber}
                        onChange={(e) => updateBOMItem(item.id, 'partNumber', e.target.value)}
                        className="w-24"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-300">
                      <input
                        type="checkbox"
                        checked={item.enabled}
                        onChange={() => toggleBOMItem(item.id)}
                        className="h-4 w-4 text-red-600 focus:ring-red-600 dark:bg-gray-700 dark:border-gray-600 rounded"
                      />
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-right text-sm font-medium">
                      <Button variant="ghost" onClick={() => removeBOMItem(item.id)}>
                        Remove
                      </Button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Quote Details</CardTitle>
          <CardDescription>Enter discount and submit quote request.</CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          <div>
            <Label htmlFor="discount">Discount (%)</Label>
            <Input
              id="discount"
              type="number"
              value={discountPercentage}
              onChange={(e) => setDiscountPercentage(parseFloat(e.target.value))}
            />
          </div>
          <div className="text-right">
            <p className="text-lg font-semibold">Subtotal: ${subtotal.toLocaleString()}</p>
            <p className="text-lg font-semibold">Discount: ${discountAmount.toLocaleString()}</p>
            <p className="text-xl font-bold">Total: ${total.toLocaleString()}</p>
          </div>
          <div className="flex justify-between">
            <Button onClick={handleSaveDraft} variant="secondary">Save Draft</Button>
            <Button onClick={handleRequestQuote}>Request Quote</Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BOMBuilder;

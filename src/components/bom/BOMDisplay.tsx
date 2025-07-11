import React, { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Trash2, Edit3, Settings, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { useMediaQuery } from 'react-responsive';
import { motion } from 'framer-motion';

interface BOMDisplayProps {
  items: any[];
  onItemsChange: (items: any[]) => void;
  mode?: 'create' | 'edit' | 'admin-edit';
  userRole?: string;
}

const BOMDisplay: React.FC<BOMDisplayProps> = ({ items, onItemsChange, mode = 'create', userRole }) => {
  const { toast } = useToast();
  const [editingItem, setEditingItem] = useState<any>(null);
  const [discountRequest, setDiscountRequest] = useState({
    itemId: '',
    requestedPrice: 0,
    originalPrice: 0,
    discountPercent: 0,
    justification: ''
  });
  const isMobile = useMediaQuery({ query: '(max-width: 768px)' });
  const prefersReducedMotion = useMediaQuery({ query: '(prefers-reduced-motion: reduce)' });

  const handleQuantityChange = (index: number, quantity: number) => {
    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      quantity: Math.max(1, quantity)
    };
    onItemsChange(updatedItems);
  };

  const handlePriceChange = (index: number, newPrice: number) => {
    const item = items[index];
    const originalPrice = item.original_unit_price || item.unit_price;
    
    // For non-admin users, only allow price increases
    if (userRole !== 'admin' && userRole !== 'finance' && newPrice < originalPrice) {
      toast({
        title: "Price Restriction",
        description: "You can only increase prices. Use 'Request Discount' for price reductions.",
        variant: "destructive"
      });
      return;
    }

    const updatedItems = [...items];
    updatedItems[index] = {
      ...updatedItems[index],
      unit_price: newPrice,
      original_unit_price: originalPrice
    };
    onItemsChange(updatedItems);
  };

  const handleDiscountRequest = (item: any, index: number) => {
    const originalPrice = item.original_unit_price || item.unit_price;
    setDiscountRequest({
      itemId: item.id || index.toString(),
      requestedPrice: 0,
      originalPrice: originalPrice,
      discountPercent: 0,
      justification: ''
    });
  };

  const submitDiscountRequest = () => {
    const { requestedPrice, originalPrice, justification } = discountRequest;
    
    if (!justification.trim()) {
      toast({
        title: "Error",
        description: "Please provide justification for the discount request",
        variant: "destructive"
      });
      return;
    }

    if (requestedPrice >= originalPrice) {
      toast({
        title: "Error", 
        description: "Requested price must be lower than original price",
        variant: "destructive"
      });
      return;
    }

    // In a real app, this would create a discount request record
    toast({
      title: "Discount Request Submitted",
      description: "Your discount request has been sent to admin for approval",
    });

    setDiscountRequest({
      itemId: '',
      requestedPrice: 0,
      originalPrice: 0,
      discountPercent: 0,
      justification: ''
    });
  };

  const removeItem = (index: number) => {
    const updatedItems = items.filter((_, i) => i !== index);
    onItemsChange(updatedItems);
  };

  const calculateTotals = () => {
    const totalCost = items.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);
    const totalPrice = items.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const totalMargin = totalPrice > 0 ? ((totalPrice - totalCost) / totalPrice) * 100 : 0;
    const grossProfit = totalPrice - totalCost;
    return { totalCost, totalPrice, totalMargin, grossProfit };
  };

  const { totalCost, totalPrice, totalMargin, grossProfit } = calculateTotals();

  const calculateMargin = (item: any) => {
    if (item.unit_price <= 0) return 0;
    return ((item.unit_price - (item.unit_cost || 0)) / item.unit_price) * 100;
  };

  if (items.length === 0) {
    return (
      <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
        <CardContent className="p-8 text-center text-gray-500 dark:text-gray-400">
          No items in BOM. Add products from the Products tab.
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
      <CardHeader>
        <CardTitle className="text-gray-900 dark:text-white flex items-center gap-2">
          <Settings className="w-5 h-5" />
          Bill of Materials
        </CardTitle>
        {userRole === 'admin' && (
          <div className="mt-2 flex items-center gap-2 text-sm text-gray-600">
            <Badge variant="outline">Total Cost: ${totalCost.toFixed(2)}</Badge>
            <Badge variant="outline">Margin: {totalMargin.toFixed(1)}%</Badge>
            <Badge variant="outline">Gross Profit: ${grossProfit.toFixed(2)}</Badge>
          </div>
        )}
      </CardHeader>
      <CardContent className="space-y-4">
        {items.map((item, index) => {
          const margin = calculateMargin(item);
          const isLowMargin = margin < 25;
          
          return (
            <div key={index} className="border border-gray-200 dark:border-gray-700 rounded-lg p-4 bg-gray-50 dark:bg-gray-800">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h4 className="font-medium text-gray-900 dark:text-white">{item.name}</h4>
                  {item.description && (
                    <p className="text-sm text-gray-600 dark:text-gray-400 mt-1">{item.description}</p>
                  )}
                  {item.part_number && (
                    <p className="text-xs text-gray-500 dark:text-gray-500 mt-1">PN: {item.part_number}</p>
                  )}
                </div>
                
                <div className="flex items-center gap-2 ml-4">
                  {mode === 'admin-edit' && (
                    <Button
                      size="sm"
                      variant="outline"
                      onClick={() => setEditingItem(item)}
                      className="border-blue-300 text-blue-600 hover:bg-blue-50 dark:border-blue-600 dark:text-blue-400 dark:hover:bg-blue-900"
                    >
                      <Edit3 className="w-4 h-4" />
                    </Button>
                  )}
                  
                  <Button
                    size="sm"
                    variant="outline"
                    onClick={() => removeItem(index)}
                    className="border-red-300 text-red-600 hover:bg-red-50 dark:border-red-600 dark:text-red-400 dark:hover:bg-red-900"
                  >
                    <Trash2 className="w-4 h-4" />
                  </Button>
                </div>
              </div>

              <div className={`grid grid-cols-1 md:grid-cols-4 gap-4 ${isMobile ? 'sm:grid-cols-1' : ''}`}>
                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Quantity</Label>
                  <Input
                    type="number"
                    min="1"
                    value={item.quantity}
                    onChange={(e) => handleQuantityChange(index, parseInt(e.target.value) || 1)}
                    className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                  />
                </div>

                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Unit Price</Label>
                  <div className="flex gap-2">
                    <Input
                      type="number"
                      step="0.01"
                      min="0"
                      value={item.unit_price}
                      onChange={(e) => handlePriceChange(index, parseFloat(e.target.value) || 0)}
                      className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                    />
                    {userRole !== 'admin' && userRole !== 'finance' && (
                      <Dialog>
                        <DialogTrigger asChild>
                          <Button
                            size="sm"
                            variant="outline"
                            onClick={() => handleDiscountRequest(item, index)}
                            className="border-orange-300 text-orange-600 hover:bg-orange-50 dark:border-orange-600 dark:text-orange-400 dark:hover:bg-orange-900"
                          >
                            Request Discount
                          </Button>
                        </DialogTrigger>
                        <DialogContent className="bg-white dark:bg-gray-900 border-gray-200 dark:border-gray-700">
                          <DialogHeader>
                            <DialogTitle className="text-gray-900 dark:text-white">Request Price Discount</DialogTitle>
                          </DialogHeader>
                          <div className="space-y-4">
                            <div>
                              <Label className="text-gray-700 dark:text-gray-300">Original Price</Label>
                              <Input
                                value={`$${discountRequest.originalPrice.toFixed(2)}`}
                                disabled
                                className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                              />
                            </div>
                            <div>
                              <Label className="text-gray-700 dark:text-gray-300">Requested Price</Label>
                              <Input
                                type="number"
                                step="0.01"
                                value={discountRequest.requestedPrice}
                                onChange={(e) => {
                                  const requested = parseFloat(e.target.value) || 0;
                                  const discount = discountRequest.originalPrice > 0 
                                    ? ((discountRequest.originalPrice - requested) / discountRequest.originalPrice) * 100 
                                    : 0;
                                  setDiscountRequest(prev => ({
                                    ...prev,
                                    requestedPrice: requested,
                                    discountPercent: discount
                                  }));
                                }}
                                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                              />
                            </div>
                            <div>
                              <Label className="text-gray-700 dark:text-gray-300">Discount %</Label>
                              <Input
                                value={`${discountRequest.discountPercent.toFixed(1)}%`}
                                disabled
                                className="bg-gray-100 dark:bg-gray-800 text-gray-600 dark:text-gray-400"
                              />
                            </div>
                            <div>
                              <Label className="text-gray-700 dark:text-gray-300">Justification *</Label>
                              <Textarea
                                value={discountRequest.justification}
                                onChange={(e) => setDiscountRequest(prev => ({ ...prev, justification: e.target.value }))}
                                placeholder="Explain why this discount is needed..."
                                className="bg-white dark:bg-gray-700 border-gray-300 dark:border-gray-600 text-gray-900 dark:text-white"
                              />
                            </div>
                            <Button 
                              onClick={submitDiscountRequest}
                              className="w-full bg-blue-600 hover:bg-blue-700 text-white"
                            >
                              Submit Discount Request
                            </Button>
                          </div>
                        </DialogContent>
                      </Dialog>
                    )}
                  </div>
                </div>

                <div>
                  <Label className="text-gray-700 dark:text-gray-300">Total</Label>
                  <div className="text-lg font-semibold text-gray-900 dark:text-white">
                    ${(item.unit_price * item.quantity).toFixed(2)}
                  </div>
                </div>

                <div className="flex flex-col gap-2">
                  {(userRole === 'admin' || userRole === 'finance') && (
                    <Badge variant="outline" className="text-gray-600 dark:text-gray-400">
                      Cost: ${((item.unit_cost || 0) * item.quantity).toFixed(2)}
                    </Badge>
                  )}
                  <Badge 
                    variant={isLowMargin ? "destructive" : "default"}
                    className={isLowMargin ? "text-red-600 border-red-300" : "text-green-600 border-green-300"}
                  >
                    {isLowMargin && <AlertTriangle className="w-3 h-3 mr-1" />}
                    Margin: {margin.toFixed(1)}%
                  </Badge>
                </div>
              </div>

              {item.configuration_data && (
                <div className="mt-3 p-3 bg-gray-100 dark:bg-gray-700 rounded-md">
                  <p className="text-sm text-gray-600 dark:text-gray-400">
                    Configuration: {JSON.stringify(item.configuration_data)}
                  </p>
                </div>
              )}
            </div>
          );
        })}

        <div className="border-t border-gray-200 dark:border-gray-700 pt-4">
          <div className="flex justify-between items-center">
            <span className="text-lg font-semibold text-gray-900 dark:text-white">
              Total BOM Value:
            </span>
            <span className="text-xl font-bold text-blue-600 dark:text-blue-400">
              ${totalPrice.toFixed(2)}
            </span>
          </div>
        </div>
      </CardContent>
    </Card>
  );
};

export default BOMDisplay;

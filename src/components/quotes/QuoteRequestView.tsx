
import { BOMItem, Quote } from '@/types/product';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { CheckCircle, XCircle, Percent } from 'lucide-react';

interface QuoteRequestViewProps {
  quote: Quote;
  bomItems: BOMItem[];
  onApprove: (quoteId: string) => void;
  onReject: (quoteId: string, reason: string) => void;
  onCounterOffer: (quoteId: string, discountPercentage: number) => void;
}

const QuoteRequestView = ({ 
  quote, 
  bomItems, 
  onApprove, 
  onReject, 
  onCounterOffer 
}: QuoteRequestViewProps) => {
  const [rejectionReason, setRejectionReason] = useState('');
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [discountPercentage, setDiscountPercentage] = useState(0);
  const [showCounterOffer, setShowCounterOffer] = useState(false);

  const calculateItemCost = (item: BOMItem) => {
    // Assuming 40% margin for cost calculation
    const costMultiplier = 0.6;
    return item.product.price * item.quantity * costMultiplier;
  };

  const calculateItemMargin = (item: BOMItem) => {
    const revenue = item.product.price * item.quantity;
    const cost = calculateItemCost(item);
    return ((revenue - cost) / revenue) * 100;
  };

  const totalRevenue = bomItems
    .filter(item => item.enabled)
    .reduce((total, item) => total + (item.product.price * item.quantity), 0);

  const totalCost = bomItems
    .filter(item => item.enabled)
    .reduce((total, item) => total + calculateItemCost(item), 0);

  const overallMargin = ((totalRevenue - totalCost) / totalRevenue) * 100;

  const discountedTotal = totalRevenue * (1 - discountPercentage / 100);
  const discountedMargin = ((discountedTotal - totalCost) / discountedTotal) * 100;

  const handleReject = () => {
    if (rejectionReason.trim()) {
      onReject(quote.id, rejectionReason);
      setShowRejectForm(false);
      setRejectionReason('');
    }
  };

  const handleCounterOffer = () => {
    if (discountPercentage > 0) {
      onCounterOffer(quote.id, discountPercentage);
      setShowCounterOffer(false);
      setDiscountPercentage(0);
    }
  };

  return (
    <div className="space-y-6">
      {/* Quote Header */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-white text-xl">Quote Request #{quote.id}</CardTitle>
              <p className="text-gray-400">Submitted: {new Date(quote.createdAt).toLocaleDateString()}</p>
            </div>
            <Badge 
              variant={quote.priority === 'High' ? 'destructive' : 'secondary'}
              className={quote.priority === 'High' ? 'bg-red-600' : ''}
            >
              {quote.priority} Priority
            </Badge>
          </div>
        </CardHeader>
      </Card>

      {/* Customer & Quote Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Customer Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-gray-400">Customer Name</Label>
              <p className="text-white font-medium">{quote.customerName}</p>
            </div>
            <div>
              <Label className="text-gray-400">Oracle Customer ID</Label>
              <p className="text-white font-medium">{quote.oracleCustomerId}</p>
            </div>
            <div>
              <Label className="text-gray-400">Rep Involved</Label>
              <p className="text-white font-medium">{quote.isRepInvolved ? 'Yes' : 'No'}</p>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Terms & Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-gray-400">Currency</Label>
              <p className="text-white font-medium">{quote.quoteCurrency}</p>
            </div>
            <div>
              <Label className="text-gray-400">Shipping Terms</Label>
              <p className="text-white font-medium">{quote.shippingTerms}</p>
            </div>
            <div>
              <Label className="text-gray-400">Payment Terms</Label>
              <p className="text-white font-medium">{quote.paymentTerms} days</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Financial Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Total Revenue</p>
              <p className="text-white text-xl font-bold">${totalRevenue.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Total Cost</p>
              <p className="text-white text-xl font-bold">${totalCost.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Gross Margin</p>
              <p className="text-green-400 text-xl font-bold">{overallMargin.toFixed(1)}%</p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Gross Profit</p>
              <p className="text-green-400 text-xl font-bold">${(totalRevenue - totalCost).toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BOM Details */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Bill of Materials</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 pb-2">Item</th>
                  <th className="text-left text-gray-400 pb-2">Part Number</th>
                  <th className="text-left text-gray-400 pb-2">Qty</th>
                  <th className="text-left text-gray-400 pb-2">Unit Price</th>
                  <th className="text-left text-gray-400 pb-2">Unit Cost</th>
                  <th className="text-left text-gray-400 pb-2">Margin</th>
                  <th className="text-left text-gray-400 pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {bomItems.filter(item => item.enabled).map((item, index) => (
                  <tr key={index} className="border-b border-gray-800">
                    <td className="py-3 text-white">
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-gray-400">{item.product.description}</p>
                        {item.slot && <p className="text-xs text-gray-500">Slot {item.slot}</p>}
                      </div>
                    </td>
                    <td className="py-3 text-white font-mono text-sm">{item.partNumber}</td>
                    <td className="py-3 text-white">{item.quantity}</td>
                    <td className="py-3 text-white">${item.product.price.toLocaleString()}</td>
                    <td className="py-3 text-orange-400">${calculateItemCost(item).toLocaleString()}</td>
                    <td className="py-3 text-green-400">{calculateItemMargin(item).toFixed(1)}%</td>
                    <td className="py-3 text-white font-bold">${(item.product.price * item.quantity).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Counter Offer Section */}
      {showCounterOffer && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Percent className="mr-2 h-5 w-5" />
              Counter Offer
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label className="text-white">Discount Percentage</Label>
              <Input
                type="number"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                className="bg-gray-800 border-gray-600 text-white"
                placeholder="Enter discount %"
                min="0"
                max="50"
              />
            </div>
            {discountPercentage > 0 && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800 rounded">
                <div className="text-center">
                  <p className="text-gray-400 text-sm">New Total</p>
                  <p className="text-white text-lg font-bold">${discountedTotal.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm">New Margin</p>
                  <p className={`text-lg font-bold ${discountedMargin > 20 ? 'text-green-400' : 'text-yellow-400'}`}>
                    {discountedMargin.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm">Discount Amount</p>
                  <p className="text-red-400 text-lg font-bold">-${(totalRevenue - discountedTotal).toLocaleString()}</p>
                </div>
              </div>
            )}
            <div className="flex space-x-2">
              <Button onClick={handleCounterOffer} className="bg-orange-600 hover:bg-orange-700">
                Apply Counter Offer
              </Button>
              <Button variant="outline" onClick={() => setShowCounterOffer(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Rejection Form */}
      {showRejectForm && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Rejection Reason</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="bg-gray-800 border-gray-600 text-white"
              placeholder="Please provide a reason for rejecting this quote..."
              rows={4}
            />
            <div className="flex space-x-2">
              <Button 
                onClick={handleReject} 
                className="bg-red-600 hover:bg-red-700"
                disabled={!rejectionReason.trim()}
              >
                Confirm Rejection
              </Button>
              <Button variant="outline" onClick={() => setShowRejectForm(false)}>
                Cancel
              </Button>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Action Buttons */}
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-6">
          <div className="flex flex-wrap gap-3">
            <Button 
              onClick={() => onApprove(quote.id)}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              <CheckCircle className="mr-2 h-4 w-4" />
              Approve Quote
            </Button>
            <Button 
              onClick={() => setShowRejectForm(true)}
              variant="outline"
              className="border-red-600 text-red-400 hover:bg-red-900/20"
            >
              <XCircle className="mr-2 h-4 w-4" />
              Reject Quote
            </Button>
            <Button 
              onClick={() => setShowCounterOffer(true)}
              variant="outline"
              className="border-orange-600 text-orange-400 hover:bg-orange-900/20"
            >
              <Percent className="mr-2 h-4 w-4" />
              Counter Offer
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuoteRequestView;

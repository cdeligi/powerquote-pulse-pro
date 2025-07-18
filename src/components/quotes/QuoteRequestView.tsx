
import { BOMItem } from '@/types/product';
import { Quote } from '@/types/quote';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { CheckCircle, XCircle, Percent } from 'lucide-react';
import { 
  calculateTotalMargin, 
  calculateDiscountedMargin, 
  calculateItemCost, 
  calculateItemMargin, 
  calculateItemRevenue 
} from '@/utils/marginCalculations';
import POSubmissionForm, { POSubmissionData } from './POSubmissionForm';

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

  const { totalRevenue, totalCost, marginPercentage, grossProfit } = calculateTotalMargin(bomItems);
  const { discountedRevenue, discountedMargin, discountAmount } = calculateDiscountedMargin(bomItems, discountPercentage);

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

  const handlePOSubmission = async (poData: POSubmissionData) => {
    console.log('PO Submission Data:', poData);
    
    // In a real application, this would send to your backend API
    // Example API call:
    // await fetch('/api/submit-po', {
    //   method: 'POST',
    //   body: formData, // FormData with file
    //   headers: { 'Authorization': `Bearer ${token}` }
    // });
    
    // Mock implementation - send email to orders team
    const emailData = {
      to: 'orders@company.com', // This would come from admin configuration
      cc: 'sales@company.com', // User copy
      subject: `New PO Submission - Quote ${quote.id} - SFDC: ${poData.sfdcOpportunity}`,
      body: `
        New Purchase Order submitted for processing:
        
        Quote ID: ${quote.id}
        SFDC Opportunity: ${poData.sfdcOpportunity}
        PO Number: ${poData.poNumber}
        PO Value: $${poData.poValue.toLocaleString()}
        Customer: ${quote.customer_name}
        
        BOM attached for booking.
        
        ${poData.notes ? `Additional Notes: ${poData.notes}` : ''}
      `,
      attachments: [poData.poFile, /* BOM file would be generated */]
    };
    
    console.log('Email would be sent:', emailData);
    
    // Simulate API success
    return Promise.resolve();
  };

  return (
    <div className="space-y-6">
      {/* Quote Header */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-white text-xl">Quote Request #{quote.id}</CardTitle>
              <p className="text-gray-400">Submitted: {new Date(quote.created_at).toLocaleDateString()}</p>
            </div>
            <div className="flex space-x-2">
              <Badge 
                variant={quote.priority === 'High' ? 'destructive' : 'secondary'}
                className={quote.priority === 'High' ? 'bg-red-600' : ''}
              >
                {quote.priority} Priority
              </Badge>
              {quote.status === 'approved' && (
                <POSubmissionForm
                  quoteId={quote.id}
                  quoteBOM={bomItems}
                  quoteTotal={quote.discounted_value}
                  customerName={quote.customer_name || 'Unknown Customer'}
                  onSubmit={handlePOSubmission}
                />
              )}
            </div>
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
              <p className="text-white font-medium">{quote.customer_name}</p>
            </div>
            <div>
              <Label className="text-gray-400">Oracle Customer ID</Label>
              <p className="text-white font-medium">{quote.oracle_customer_id}</p>
            </div>
            <div>
              <Label className="text-gray-400">SFDC Opportunity</Label>
              <p className="text-white font-medium">{quote.sfdc_opportunity}</p>
            </div>
            <div>
              <Label className="text-gray-400">Rep Involved</Label>
              <p className="text-white font-medium">{quote.is_rep_involved ? 'Yes' : 'No'}</p>
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
              <p className="text-white font-medium">{quote.currency}</p>
            </div>
            <div>
              <Label className="text-gray-400">Shipping Terms</Label>
              <p className="text-white font-medium">{quote.shipping_terms}</p>
            </div>
            <div>
              <Label className="text-gray-400">Payment Terms</Label>
              <p className="text-white font-medium">{quote.payment_terms}</p>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Financial Summary with Real-time Margin Analysis */}
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
              <p className="text-orange-400 text-xl font-bold">${totalCost.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Gross Margin</p>
              <p className="text-green-400 text-xl font-bold">{marginPercentage.toFixed(1)}%</p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Gross Profit</p>
              <p className="text-green-400 text-xl font-bold">${grossProfit.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BOM Details with Cost and Margin */}
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
                    <td className="py-3 text-white font-bold">${calculateItemRevenue(item).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Counter Offer Section with Real-time Margin Impact */}
      {showCounterOffer && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white flex items-center">
              <Percent className="mr-2 h-5 w-5" />
              Counter Offer - Real-time Margin Impact
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
                  <p className="text-white text-lg font-bold">${discountedRevenue.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm">New Margin</p>
                  <p className={`text-lg font-bold ${discountedMargin > 20 ? 'text-green-400' : discountedMargin > 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {discountedMargin.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm">Discount Amount</p>
                  <p className="text-red-400 text-lg font-bold">-${discountAmount.toLocaleString()}</p>
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


import { BOMItem, Quote } from '@/types/product';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { useState } from 'react';
import { CheckCircle, XCircle, Percent, AlertTriangle, DollarSign, TrendingUp } from 'lucide-react';
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
    
    const emailData = {
      to: 'orders@company.com',
      cc: 'sales@company.com',
      subject: `New PO Submission - Quote ${quote.id} - SFDC: ${poData.sfdcOpportunity}`,
      body: `
        New Purchase Order submitted for processing:
        
        Quote ID: ${quote.id}
        SFDC Opportunity: ${poData.sfdcOpportunity}
        PO Number: ${poData.poNumber}
        PO Value: $${poData.poValue.toLocaleString()}
        Customer: ${quote.customerName}
        
        BOM attached for booking.
        
        ${poData.notes ? `Additional Notes: ${poData.notes}` : ''}
      `,
      attachments: [poData.poFile]
    };
    
    console.log('Email would be sent:', emailData);
    return Promise.resolve();
  };

  // Get margin warning color
  const getMarginColor = (margin: number) => {
    if (margin >= 40) return 'text-green-400';
    if (margin >= 25) return 'text-yellow-400';
    return 'text-red-400';
  };

  return (
    <div className="space-y-6">
      {/* Quote Header with Complete Information */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-white text-xl">Quote Request #{quote.id}</CardTitle>
              <p className="text-gray-400">Submitted: {new Date(quote.createdAt).toLocaleDateString()}</p>
              {quote.submittedBy && (
                <p className="text-gray-400">By: {quote.submittedBy}</p>
              )}
            </div>
            <div className="flex space-x-2">
              <Badge 
                variant={quote.priority === 'High' || quote.priority === 'Urgent' ? 'destructive' : 'secondary'}
                className={quote.priority === 'High' || quote.priority === 'Urgent' ? 'bg-red-600' : ''}
              >
                {quote.priority} Priority
              </Badge>
              <Badge 
                variant={quote.status === 'approved' ? 'default' : 'secondary'}
                className={quote.status === 'approved' ? 'bg-green-600' : ''}
              >
                {quote.status.replace('_', ' ').toUpperCase()}
              </Badge>
              {quote.status === 'approved' && (
                <POSubmissionForm
                  quoteId={quote.id}
                  quoteBOM={bomItems}
                  quoteTotal={quote.total}
                  customerName={quote.customerName || 'Unknown Customer'}
                  onSubmit={handlePOSubmission}
                />
              )}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Complete Customer & Quote Information */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Customer & Account Information</CardTitle>
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
              <Label className="text-gray-400">SFDC Opportunity</Label>
              <p className="text-white font-medium">{quote.sfdcOpportunity}</p>
            </div>
            <div>
              <Label className="text-gray-400">Rep Involved</Label>
              <p className="text-white font-medium">{quote.isRepInvolved ? 'Yes' : 'No'}</p>
            </div>
            {quote.submittedBy && (
              <div>
                <Label className="text-gray-400">Submitted By</Label>
                <p className="text-white font-medium">{quote.submittedBy}</p>
              </div>
            )}
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Terms & Pricing</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            <div>
              <Label className="text-gray-400">Quote Currency</Label>
              <p className="text-white font-medium">{quote.quoteCurrency}</p>
            </div>
            <div>
              <Label className="text-gray-400">Shipping Terms</Label>
              <p className="text-white font-medium">{quote.shippingTerms}</p>
            </div>
            <div>
              <Label className="text-gray-400">Payment Terms</Label>
              <p className="text-white font-medium">{quote.paymentTerms} {quote.paymentTerms !== 'Prepaid' ? 'days' : ''}</p>
            </div>
            <div>
              <Label className="text-gray-400">Quote Total</Label>
              <p className="text-white font-bold text-xl">{quote.quoteCurrency} {quote.total.toLocaleString()}</p>
            </div>
            {quote.discount > 0 && (
              <div>
                <Label className="text-gray-400">Requested Discount</Label>
                <p className="text-orange-400 font-medium">{quote.discount}%</p>
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Comprehensive Financial Analysis */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <TrendingUp className="mr-2 h-5 w-5" />
            Complete Financial Analysis
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Total Revenue</p>
              <p className="text-white text-xl font-bold">{quote.quoteCurrency} {totalRevenue.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Total Cost</p>
              <p className="text-orange-400 text-xl font-bold">{quote.quoteCurrency} {totalCost.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Original Margin</p>
              <p className={`text-xl font-bold ${getMarginColor(marginPercentage)}`}>{marginPercentage.toFixed(1)}%</p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Gross Profit</p>
              <p className="text-green-400 text-xl font-bold">{quote.quoteCurrency} {grossProfit.toLocaleString()}</p>
            </div>
          </div>

          {/* Margin Warning */}
          {marginPercentage < 25 && (
            <div className="mb-4 p-3 bg-red-900/20 border border-red-600/20 rounded flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <p className="text-red-400 text-sm">
                Warning: Current margin is {marginPercentage.toFixed(1)}% (below 25% threshold)
              </p>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Detailed BOM with Individual Margins */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Detailed Bill of Materials & Item Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="text-left text-gray-400 pb-2">Item</th>
                  <th className="text-left text-gray-400 pb-2">Part Number</th>
                  <th className="text-center text-gray-400 pb-2">Qty</th>
                  <th className="text-right text-gray-400 pb-2">Unit Price</th>
                  <th className="text-right text-gray-400 pb-2">Unit Cost</th>
                  <th className="text-right text-gray-400 pb-2">Total Price</th>
                  <th className="text-right text-gray-400 pb-2">Total Cost</th>
                  <th className="text-right text-gray-400 pb-2">Item Margin</th>
                </tr>
              </thead>
              <tbody>
                {bomItems.filter(item => item.enabled).map((item, index) => {
                  const itemRevenue = calculateItemRevenue(item);
                  const itemCost = calculateItemCost(item);
                  const itemMargin = calculateItemMargin(item);
                  
                  return (
                    <tr key={index} className="border-b border-gray-800">
                      <td className="py-3 text-white">
                        <div>
                          <p className="font-medium">{item.product.name}</p>
                          <p className="text-sm text-gray-400">{item.product.description}</p>
                          {item.slot && <p className="text-xs text-gray-500">Slot {item.slot}</p>}
                        </div>
                      </td>
                      <td className="py-3 text-white font-mono text-sm">
                        {item.partNumber || item.product.partNumber || 'N/A'}
                      </td>
                      <td className="py-3 text-white text-center">{item.quantity}</td>
                      <td className="py-3 text-white text-right">{quote.quoteCurrency} {item.product.price.toLocaleString()}</td>
                      <td className="py-3 text-orange-400 text-right">{quote.quoteCurrency} {(item.product.cost || 0).toLocaleString()}</td>
                      <td className="py-3 text-white text-right font-medium">{quote.quoteCurrency} {itemRevenue.toLocaleString()}</td>
                      <td className="py-3 text-orange-400 text-right">{quote.quoteCurrency} {itemCost.toLocaleString()}</td>
                      <td className={`py-3 text-right font-bold ${getMarginColor(itemMargin)}`}>{itemMargin.toFixed(1)}%</td>
                    </tr>
                  );
                })}
                <tr className="border-t-2 border-gray-600 font-bold">
                  <td colSpan={5} className="py-3 text-white text-right">TOTALS:</td>
                  <td className="py-3 text-white text-right">{quote.quoteCurrency} {totalRevenue.toLocaleString()}</td>
                  <td className="py-3 text-orange-400 text-right">{quote.quoteCurrency} {totalCost.toLocaleString()}</td>
                  <td className={`py-3 text-right ${getMarginColor(marginPercentage)}`}>{marginPercentage.toFixed(1)}%</td>
                </tr>
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Quote Notes */}
      {quote.notes && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Quote Notes</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-gray-300">{quote.notes}</p>
          </CardContent>
        </Card>
      )}

      {/* Rejection Reason Display */}
      {quote.status === 'rejected' && quote.rejectionReason && (
        <Card className="bg-red-900/20 border-red-600/20">
          <CardHeader>
            <CardTitle className="text-red-400">Rejection Reason</CardTitle>
          </CardHeader>
          <CardContent>
            <p className="text-red-300">{quote.rejectionReason}</p>
          </CardContent>
        </Card>
      )}

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
                  <p className="text-white text-lg font-bold">{quote.quoteCurrency} {discountedRevenue.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm">New Margin</p>
                  <p className={`text-lg font-bold ${getMarginColor(discountedMargin)}`}>
                    {discountedMargin.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-gray-400 text-sm">Discount Amount</p>
                  <p className="text-red-400 text-lg font-bold">-{quote.quoteCurrency} {discountAmount.toLocaleString()}</p>
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
              placeholder="Please provide a detailed reason for rejecting this quote..."
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
      {quote.status === 'pending_approval' && (
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
      )}
    </div>
  );
};

export default QuoteRequestView;

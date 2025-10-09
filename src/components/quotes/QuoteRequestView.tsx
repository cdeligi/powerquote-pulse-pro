
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
import { useConfiguredQuoteFields } from '@/hooks/useConfiguredQuoteFields';
import { Separator } from '@/components/ui/separator';

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
  const { formattedFields: quoteInformationFields } = useConfiguredQuoteFields(
    quote.quote_fields,
    { includeInQuoteOnly: true }
  );
  const timelineEntries = (
    [
      quote.created_at
        ? { label: 'Created', value: new Date(quote.created_at).toLocaleString() }
        : null,
      quote.submitted_at
        ? { label: 'Submitted', value: new Date(quote.submitted_at).toLocaleString() }
        : null,
      quote.reviewed_at
        ? { label: 'Reviewed', value: new Date(quote.reviewed_at).toLocaleString() }
        : null,
    ].filter((entry): entry is { label: string; value: string } => Boolean(entry))
  );

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
      <Card>
        <CardHeader>
          <div className="flex justify-between items-start">
            <div>
              <CardTitle className="text-xl">Quote Request #{quote.id}</CardTitle>
              <p className="text-muted-foreground">Submitted: {new Date(quote.created_at).toLocaleDateString()}</p>
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
      <Card>
        <CardHeader>
          <CardTitle>Quote Information</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {quoteInformationFields.length > 0 ? (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {quoteInformationFields.map((field) => (
                <div key={field.id}>
                  <Label className="text-muted-foreground">{field.label}</Label>
                  <p className="text-foreground font-medium break-words">{field.formattedValue}</p>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">
              No quote information fields are configured to display.
            </p>
          )}

          {quoteInformationFields.length > 0 && timelineEntries.length > 0 && (
            <Separator className="my-2" />
          )}

          {timelineEntries.length > 0 && (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-3">
              {timelineEntries.map((entry) => (
                <div key={entry.label}>
                  <Label className="text-muted-foreground">{entry.label}</Label>
                  <p className="text-foreground font-medium">{entry.value}</p>
                </div>
              ))}
            </div>
          )}
        </CardContent>
      </Card>

      {/* Financial Summary with Real-time Margin Analysis */}
      <Card>
        <CardHeader>
          <CardTitle>Financial Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-muted/50 rounded">
              <p className="text-muted-foreground text-sm">Total Revenue</p>
              <p className="text-foreground text-xl font-bold">${totalRevenue.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded">
              <p className="text-muted-foreground text-sm">Total Cost</p>
              <p className="text-orange-400 text-xl font-bold">${totalCost.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded">
              <p className="text-muted-foreground text-sm">Gross Margin</p>
              <p className="text-green-400 text-xl font-bold">{marginPercentage.toFixed(1)}%</p>
            </div>
            <div className="text-center p-4 bg-muted/50 rounded">
              <p className="text-muted-foreground text-sm">Gross Profit</p>
              <p className="text-green-400 text-xl font-bold">${grossProfit.toLocaleString()}</p>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* BOM Details with Cost and Margin */}
      <Card>
        <CardHeader>
          <CardTitle>Bill of Materials</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead>
                <tr className="border-b border-border">
                  <th className="text-left text-muted-foreground pb-2">Item</th>
                  <th className="text-left text-muted-foreground pb-2">Part Number</th>
                  <th className="text-left text-muted-foreground pb-2">Qty</th>
                  <th className="text-left text-muted-foreground pb-2">Unit Price</th>
                  <th className="text-left text-muted-foreground pb-2">Unit Cost</th>
                  <th className="text-left text-muted-foreground pb-2">Margin</th>
                  <th className="text-left text-muted-foreground pb-2">Total</th>
                </tr>
              </thead>
              <tbody>
                {bomItems.filter(item => item.enabled).map((item, index) => (
                  <tr key={index} className="border-b border-border/50">
                    <td className="py-3 text-foreground">
                      <div>
                        <p className="font-medium">{item.product.name}</p>
                        <p className="text-sm text-muted-foreground">{item.product.description}</p>
                        {item.slot && <p className="text-xs text-muted-foreground/80">Slot {item.slot}</p>}
                      </div>
                    </td>
                    <td className="py-3 text-foreground font-mono text-sm break-all">{item.partNumber}</td>
                    <td className="py-3 text-foreground">{item.quantity}</td>
                    <td className="py-3 text-foreground">${item.product.price.toLocaleString()}</td>
                    <td className="py-3 text-orange-400">${calculateItemCost(item).toLocaleString()}</td>
                    <td className="py-3 text-green-400">{calculateItemMargin(item).toFixed(1)}%</td>
                    <td className="py-3 text-foreground font-bold">${calculateItemRevenue(item).toLocaleString()}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </CardContent>
      </Card>

      {/* Counter Offer Section with Real-time Margin Impact */}
      {showCounterOffer && (
        <Card>
          <CardHeader>
            <CardTitle className="flex items-center">
              <Percent className="mr-2 h-5 w-5" />
              Counter Offer - Real-time Margin Impact
            </CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div>
              <Label>Discount Percentage</Label>
              <Input
                type="number"
                value={discountPercentage}
                onChange={(e) => setDiscountPercentage(Number(e.target.value))}
                className="bg-background"
                placeholder="Enter discount %"
                min="0"
                max="50"
              />
            </div>
            {discountPercentage > 0 && (
              <div className="grid grid-cols-3 gap-4 p-4 bg-muted/50 rounded">
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">New Total</p>
                  <p className="text-foreground text-lg font-bold">${discountedRevenue.toLocaleString()}</p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">New Margin</p>
                  <p className={`text-lg font-bold ${discountedMargin > 20 ? 'text-green-400' : discountedMargin > 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                    {discountedMargin.toFixed(1)}%
                  </p>
                </div>
                <div className="text-center">
                  <p className="text-muted-foreground text-sm">Discount Amount</p>
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
        <Card>
          <CardHeader>
            <CardTitle>Rejection Reason</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <Textarea
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              className="bg-background"
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
      <Card>
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

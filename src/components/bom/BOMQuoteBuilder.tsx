
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { BOMItem } from '@/types/product';
import { supabaseQuoteSubmissionService } from '@/services/supabaseQuoteSubmissionService';
import QuoteFieldsForm from '@/components/quotes/QuoteFieldsForm';
import { calculateTotalMargin, calculateDiscountedMargin } from '@/utils/marginCalculations';
import { FileText, Send, AlertTriangle } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';

interface BOMQuoteBuilderProps {
  bomItems: BOMItem[];
  canSeePrices: boolean;
}

const BOMQuoteBuilder = ({ bomItems, canSeePrices }: BOMQuoteBuilderProps) => {
  const [quoteFields, setQuoteFields] = useState<Record<string, string>>({});
  const [requestedDiscount, setRequestedDiscount] = useState<number>(0);
  const [justification, setJustification] = useState<string>('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const { totalRevenue, totalCost, marginPercentage, grossProfit } = calculateTotalMargin(bomItems);
  const { discountedRevenue, discountedMargin, discountAmount } = calculateDiscountedMargin(bomItems, requestedDiscount);

  const handleSubmitQuote = async () => {
    if (bomItems.length === 0) {
      toast({
        title: "Error",
        description: "Please add items to your BOM before submitting a quote.",
        variant: "destructive"
      });
      return;
    }

    // Basic validation for required fields
    const requiredFields = ['customerName', 'oracleCustomerId', 'sfdcOpportunity'];
    const missingFields = requiredFields.filter(field => !quoteFields[field]?.trim());
    
    if (missingFields.length > 0) {
      toast({
        title: "Missing Required Fields",
        description: `Please fill in: ${missingFields.map(f => f.replace(/([A-Z])/g, ' $1')).join(', ')}`,
        variant: "destructive"
      });
      return;
    }

    if (requestedDiscount > 0 && !justification.trim()) {
      toast({
        title: "Justification Required",
        description: "Please provide justification for the requested discount.",
        variant: "destructive"
      });
      return;
    }

    try {
      setIsSubmitting(true);
      
      const quoteId = `Q-${Date.now()}-${Math.random().toString(36).substr(2, 9)}`;
      
      await supabaseQuoteSubmissionService.submitQuote({
        id: quoteId,
        bomItems,
        requestedDiscount,
        justification,
        originalMargin: marginPercentage,
        discountedMargin,
        totalValue: totalRevenue,
        totalCost,
        grossProfit: requestedDiscount > 0 ? (discountedRevenue - totalCost) : grossProfit,
        quoteFields
      });

      toast({
        title: "Quote Submitted Successfully",
        description: `Quote ${quoteId} has been submitted for approval.`,
      });

      // Reset form
      setQuoteFields({});
      setRequestedDiscount(0);
      setJustification('');

    } catch (error) {
      console.error('Error submitting quote:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit quote. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 40) return 'text-green-400';
    if (margin >= 25) return 'text-yellow-400';
    return 'text-red-400';
  };

  if (!canSeePrices) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Quote Builder</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-400 text-center py-8">
            Quote building requires Level 2 or Admin access to view pricing.
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bomItems.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Quote Builder
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="text-gray-400 text-center py-8">
            Add items to your BOM to start building a quote.
          </div>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* Quote Fields Form */}
      <QuoteFieldsForm
        values={quoteFields}
        onChange={setQuoteFields}
      />

      {/* Financial Summary */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Total Revenue</p>
              <p className="text-white text-xl font-bold">${totalRevenue.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Total Cost</p>
              <p className="text-orange-400 text-xl font-bold">${totalCost.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Margin</p>
              <p className={`text-xl font-bold ${getMarginColor(marginPercentage)}`}>
                {marginPercentage.toFixed(1)}%
              </p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Gross Profit</p>
              <p className="text-green-400 text-xl font-bold">${grossProfit.toLocaleString()}</p>
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

      {/* Discount Request */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Discount & Approval Request</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          <div>
            <Label className="text-white">Requested Discount (%)</Label>
            <Input
              type="number"
              value={requestedDiscount}
              onChange={(e) => setRequestedDiscount(Number(e.target.value))}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Enter discount percentage"
              min="0"
              max="50"
            />
          </div>

          {requestedDiscount > 0 && (
            <div className="grid grid-cols-3 gap-4 p-4 bg-gray-800 rounded">
              <div className="text-center">
                <p className="text-gray-400 text-sm">New Total</p>
                <p className="text-white text-lg font-bold">${discountedRevenue.toLocaleString()}</p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">New Margin</p>
                <p className={`text-lg font-bold ${getMarginColor(discountedMargin)}`}>
                  {discountedMargin.toFixed(1)}%
                </p>
              </div>
              <div className="text-center">
                <p className="text-gray-400 text-sm">Discount Amount</p>
                <p className="text-red-400 text-lg font-bold">-${discountAmount.toLocaleString()}</p>
              </div>
            </div>
          )}

          <div>
            <Label className="text-white">Justification {requestedDiscount > 0 && '*'}</Label>
            <Textarea
              value={justification}
              onChange={(e) => setJustification(e.target.value)}
              placeholder="Provide business justification for this quote/discount request..."
              className="bg-gray-800 border-gray-700 text-white"
              rows={4}
            />
          </div>

          <Button
            onClick={handleSubmitQuote}
            disabled={isSubmitting}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
          >
            <Send className="mr-2 h-4 w-4" />
            {isSubmitting ? 'Submitting Quote...' : 'Submit Quote for Approval'}
          </Button>
        </CardContent>
      </Card>
    </div>
  );
};

export default BOMQuoteBuilder;

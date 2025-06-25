
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { CheckCircle, AlertCircle, FileText } from 'lucide-react';
import { BOMItem } from '@/types/product';
import { supabase } from '@/integrations/supabase/client';
import { User } from '@/types/auth';

interface QuoteSubmissionDialogProps {
  bomItems: BOMItem[];
  quoteFields: Record<string, any>;
  discountPercentage: number;
  discountJustification: string;
  onSubmit: (quoteId: string) => void;
  onClose: () => void;
  canSeePrices: boolean;
  user: User;
}

const QuoteSubmissionDialog = ({
  bomItems,
  quoteFields,
  discountPercentage,
  discountJustification,
  onSubmit,
  onClose,
  canSeePrices,
  user
}: QuoteSubmissionDialogProps) => {
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const calculateTotals = () => {
    const originalValue = bomItems.reduce((total, item) => {
      return total + ((item.product.price || 0) * item.quantity);
    }, 0);
    
    const discountAmount = originalValue * (discountPercentage / 100);
    const discountedValue = originalValue - discountAmount;
    
    return {
      originalValue,
      discountAmount,
      discountedValue
    };
  };

  const validateRequiredFields = () => {
    const requiredFields = Object.keys(quoteFields).filter(key => 
      quoteFields[key] === '' || quoteFields[key] === null || quoteFields[key] === undefined
    );
    
    return requiredFields.length === 0;
  };

  const handleSubmit = async () => {
    if (!validateRequiredFields()) {
      setError('Please fill in all required fields');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      const { originalValue, discountedValue } = calculateTotals();
      const quoteId = `QUOTE-${Date.now()}`;

      // Calculate costs and margins
      const totalCost = bomItems.reduce((total, item) => {
        return total + ((item.product.cost || item.product.price * 0.6) * item.quantity);
      }, 0);

      const originalMargin = ((originalValue - totalCost) / originalValue) * 100;
      const discountedMargin = ((discountedValue - totalCost) / discountedValue) * 100;

      // Submit quote to database with user information
      const { error: quoteError } = await supabase
        .from('quotes')
        .insert({
          id: quoteId,
          user_id: user.id,
          customer_name: quoteFields.customerName || 'Unknown Customer',
          oracle_customer_id: quoteFields.oracleCustomerId || '',
          sfdc_opportunity: quoteFields.sfdcOpportunity || `OPP-${Date.now()}`,
          priority: quoteFields.priority || 'Medium',
          shipping_terms: quoteFields.shippingTerms || 'Ex-Works',
          payment_terms: quoteFields.paymentTerms || '30',
          currency: quoteFields.currency || 'USD',
          original_quote_value: originalValue,
          discounted_value: discountedValue,
          requested_discount: discountPercentage,
          discount_justification: discountJustification,
          original_margin: originalMargin,
          discounted_margin: discountedMargin,
          total_cost: totalCost,
          gross_profit: discountedValue - totalCost,
          is_rep_involved: quoteFields.isRepInvolved || false,
          quote_fields: quoteFields,
          status: 'pending',
          submitted_by_name: `${user.firstName} ${user.lastName}`,
          submitted_by_email: user.email
        });

      if (quoteError) throw quoteError;

      // Submit BOM items
      const bomItemsData = bomItems.map(item => ({
        quote_id: quoteId,
        product_id: item.product.id,
        name: item.product.name,
        description: item.product.description || '',
        part_number: item.product.partNumber || item.product.id,
        quantity: item.quantity,
        unit_price: item.product.price || 0,
        unit_cost: item.product.cost || (item.product.price || 0) * 0.6,
        total_price: (item.product.price || 0) * item.quantity,
        total_cost: (item.product.cost || (item.product.price || 0) * 0.6) * item.quantity,
        margin: item.product.price ? ((item.product.price - (item.product.cost || item.product.price * 0.6)) / item.product.price) * 100 : 0
      }));

      const { error: bomError } = await supabase
        .from('bom_items')
        .insert(bomItemsData);

      if (bomError) throw bomError;

      onSubmit(quoteId);
    } catch (error) {
      console.error('Error submitting quote:', error);
      setError('Failed to submit quote. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  const { originalValue, discountAmount, discountedValue } = calculateTotals();
  const isValid = validateRequiredFields();

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="bg-gray-900 border-gray-800 text-white max-w-4xl max-h-[80vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <FileText className="mr-2 h-5 w-5" />
            Submit Quote Request
          </DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Validation Status */}
          {!isValid && (
            <Alert className="bg-red-900/20 border-red-600">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                Please fill in all required fields before submitting the quote.
              </AlertDescription>
            </Alert>
          )}

          {/* Quote Summary */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Quote Summary</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex justify-between">
                  <span className="text-gray-300">Total Items:</span>
                  <span className="text-white">{bomItems.length}</span>
                </div>
                
                {canSeePrices && (
                  <>
                    <div className="flex justify-between">
                      <span className="text-gray-300">Original Value:</span>
                      <span className="text-white">${originalValue.toLocaleString()}</span>
                    </div>
                    
                    {discountPercentage > 0 && (
                      <>
                        <div className="flex justify-between">
                          <span className="text-gray-300">Discount ({discountPercentage}%):</span>
                          <span className="text-red-400">-${discountAmount.toLocaleString()}</span>
                        </div>
                        <div className="flex justify-between font-bold border-t border-gray-600 pt-2">
                          <span className="text-white">Final Value:</span>
                          <span className="text-green-400">${discountedValue.toLocaleString()}</span>
                        </div>
                      </>
                    )}
                  </>
                )}
              </div>
            </CardContent>
          </Card>

          {/* BOM Items Preview */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Bill of Materials</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-2 max-h-40 overflow-y-auto">
                {bomItems.map((item, index) => (
                  <div key={index} className="flex justify-between items-center text-sm">
                    <div>
                      <span className="text-white">{item.product.name}</span>
                      <span className="text-gray-400 ml-2">x{item.quantity}</span>
                    </div>
                    {canSeePrices && (
                      <span className="text-gray-300">
                        ${((item.product.price || 0) * item.quantity).toLocaleString()}
                      </span>
                    )}
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {/* Quote Fields Preview */}
          <Card className="bg-gray-800 border-gray-700">
            <CardHeader>
              <CardTitle className="text-white">Quote Information</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
                {Object.entries(quoteFields).map(([key, value]) => (
                  <div key={key} className="flex justify-between">
                    <span className="text-gray-400 capitalize">{key.replace(/([A-Z])/g, ' $1').trim()}:</span>
                    <span className="text-white">{value || '—'}</span>
                  </div>
                ))}
              </div>
            </CardContent>
          </Card>

          {error && (
            <Alert className="bg-red-900/20 border-red-600">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription className="text-red-400">
                {error}
              </AlertDescription>
            </Alert>
          )}
        </div>

        <DialogFooter className="flex space-x-2">
          <Button
            variant="outline"
            onClick={onClose}
            className="border-gray-600 text-white hover:bg-gray-800"
            disabled={submitting}
          >
            Cancel
          </Button>
          <Button
            onClick={handleSubmit}
            className="bg-green-600 hover:bg-green-700 text-white"
            disabled={submitting || !isValid}
          >
            {submitting ? 'Submitting...' : 'Submit Quote'}
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
};

export default QuoteSubmissionDialog;

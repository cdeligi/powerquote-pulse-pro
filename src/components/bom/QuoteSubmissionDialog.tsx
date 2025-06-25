
import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { Checkbox } from '@/components/ui/checkbox';
import { Badge } from '@/components/ui/badge';
import { FileText, Send } from 'lucide-react';
import { BOMItem } from '@/types/product';
import { ShippingTerms, PaymentTerms } from '@/types/product/quote-types';
import { supabase } from '@/integrations/supabase/client';
import { useToast } from '@/hooks/use-toast';
import { calculateTotalMargin } from '@/utils/marginCalculations';

interface QuoteSubmissionDialogProps {
  bomItems: BOMItem[];
  canSeePrices: boolean;
  userId?: string;
}

const QuoteSubmissionDialog = ({ bomItems, canSeePrices, userId }: QuoteSubmissionDialogProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  // Form state
  const [customerName, setCustomerName] = useState('');
  const [oracleCustomerId, setOracleCustomerId] = useState('');
  const [sfdcOpportunity, setSfdcOpportunity] = useState('');
  const [priority, setPriority] = useState<'High' | 'Medium' | 'Low' | 'Urgent'>('Medium');
  const [isRepInvolved, setIsRepInvolved] = useState(false);
  const [shippingTerms, setShippingTerms] = useState<ShippingTerms>('Ex-Works');
  const [paymentTerms, setPaymentTerms] = useState<PaymentTerms>('30');
  const [quoteCurrency, setQuoteCurrency] = useState<'USD' | 'EURO' | 'GBP' | 'CAD'>('USD');
  const [requestedDiscount, setRequestedDiscount] = useState(0);
  const [discountJustification, setDiscountJustification] = useState('');

  const { totalRevenue, totalCost, marginPercentage, grossProfit } = calculateTotalMargin(bomItems);
  const discountedValue = totalRevenue * (1 - requestedDiscount / 100);
  const discountedGrossProfit = discountedValue - totalCost;
  const discountedMargin = totalCost > 0 ? ((discountedValue - totalCost) / discountedValue) * 100 : 0;

  const resetForm = () => {
    setCustomerName('');
    setOracleCustomerId('');
    setSfdcOpportunity('');
    setPriority('Medium');
    setIsRepInvolved(false);
    setShippingTerms('Ex-Works');
    setPaymentTerms('30');
    setQuoteCurrency('USD');
    setRequestedDiscount(0);
    setDiscountJustification('');
  };

  const handleSubmit = async () => {
    if (!customerName.trim() || !oracleCustomerId.trim() || !sfdcOpportunity.trim()) {
      toast({
        title: "Missing Information",
        description: "Please fill in all required fields.",
        variant: "destructive"
      });
      return;
    }

    if (bomItems.length === 0) {
      toast({
        title: "No Items",
        description: "Please add items to your BOM before submitting.",
        variant: "destructive"
      });
      return;
    }

    if (requestedDiscount > 0 && !discountJustification.trim()) {
      toast({
        title: "Discount Justification Required",
        description: "Please provide justification for the requested discount.",
        variant: "destructive"
      });
      return;
    }

    setIsSubmitting(true);

    try {
      // Generate quote ID
      const quoteId = `Q-${new Date().getFullYear()}-${Date.now().toString().slice(-6)}`;
      
      // Get current user info
      const { data: { user } } = await supabase.auth.getUser();
      const { data: profile } = await supabase
        .from('profiles')
        .select('first_name, last_name, email')
        .eq('id', user?.id)
        .single();

      // Insert quote
      const { error: quoteError } = await supabase
        .from('quotes')
        .insert({
          id: quoteId,
          user_id: userId || user?.id,
          customer_name: customerName,
          oracle_customer_id: oracleCustomerId,
          sfdc_opportunity: sfdcOpportunity,
          priority,
          is_rep_involved: isRepInvolved,
          shipping_terms: shippingTerms,
          payment_terms: paymentTerms,
          currency: quoteCurrency,
          original_quote_value: totalRevenue,
          requested_discount: requestedDiscount,
          discounted_value: discountedValue,
          original_margin: marginPercentage,
          discounted_margin: discountedMargin,
          gross_profit: discountedGrossProfit,
          total_cost: totalCost,
          status: 'pending',
          discount_justification: discountJustification || null,
          submitted_by_name: profile ? `${profile.first_name} ${profile.last_name}` : null,
          submitted_by_email: profile?.email || null
        });

      if (quoteError) throw quoteError;

      // Insert BOM items
      const bomItemsData = bomItems.map(item => ({
        quote_id: quoteId,
        product_id: item.product.id,
        name: item.product.name,
        description: item.product.description,
        part_number: item.partNumber,
        quantity: item.quantity,
        unit_price: item.product.price,
        unit_cost: item.product.cost || 0,
        total_price: item.product.price * item.quantity,
        total_cost: (item.product.cost || 0) * item.quantity,
        margin: item.product.cost > 0 ? ((item.product.price - (item.product.cost || 0)) / item.product.price) * 100 : 0
      }));

      const { error: bomError } = await supabase
        .from('bom_items')
        .insert(bomItemsData);

      if (bomError) throw bomError;

      toast({
        title: "Quote Submitted Successfully",
        description: `Quote ${quoteId} has been submitted for approval.`
      });

      setIsOpen(false);
      resetForm();
    } catch (error) {
      console.error('Error submitting quote:', error);
      toast({
        title: "Submission Failed",
        description: "There was an error submitting your quote. Please try again.",
        variant: "destructive"
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button 
          className="bg-red-600 hover:bg-red-700 text-white px-8 py-3 text-lg"
          disabled={bomItems.length === 0}
        >
          <Send className="mr-2 h-5 w-5" />
          Submit Quote Request
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-4xl max-h-[90vh] overflow-y-auto">
        <DialogHeader>
          <DialogTitle className="text-white text-xl">Submit Quote Request</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-6">
          {/* Quote Summary */}
          <div className="bg-gray-800 p-4 rounded">
            <h3 className="text-white font-medium mb-3">Quote Summary</h3>
            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              <div>
                <p className="text-gray-400 text-sm">Items</p>
                <p className="text-white font-bold">{bomItems.length}</p>
              </div>
              {canSeePrices && (
                <>
                  <div>
                    <p className="text-gray-400 text-sm">Total Value</p>
                    <p className="text-white font-bold">${totalRevenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Total Cost</p>
                    <p className="text-orange-400 font-bold">${totalCost.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400 text-sm">Margin</p>
                    <p className="text-green-400 font-bold">{marginPercentage.toFixed(1)}%</p>
                  </div>
                </>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            {/* Customer Information */}
            <div className="space-y-4">
              <h3 className="text-white font-medium">Customer Information</h3>
              
              <div>
                <Label htmlFor="customerName" className="text-white">Customer Name *</Label>
                <Input
                  id="customerName"
                  value={customerName}
                  onChange={(e) => setCustomerName(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  placeholder="Enter customer name"
                />
              </div>

              <div>
                <Label htmlFor="oracleCustomerId" className="text-white">Oracle Customer ID *</Label>
                <Input
                  id="oracleCustomerId"
                  value={oracleCustomerId}
                  onChange={(e) => setOracleCustomerId(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  placeholder="Enter Oracle customer ID"
                />
              </div>

              <div>
                <Label htmlFor="sfdcOpportunity" className="text-white">SFDC Opportunity *</Label>
                <Input
                  id="sfdcOpportunity"
                  value={sfdcOpportunity}
                  onChange={(e) => setSfdcOpportunity(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  placeholder="Enter SFDC opportunity ID"
                />
              </div>
            </div>

            {/* Quote Details */}
            <div className="space-y-4">
              <h3 className="text-white font-medium">Quote Details</h3>
              
              <div>
                <Label className="text-white">Priority</Label>
                <Select value={priority} onValueChange={(value: any) => setPriority(value)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="Low">Low</SelectItem>
                    <SelectItem value="Medium">Medium</SelectItem>
                    <SelectItem value="High">High</SelectItem>
                    <SelectItem value="Urgent">Urgent</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div>
                <Label className="text-white">Currency</Label>
                <Select value={quoteCurrency} onValueChange={(value: any) => setQuoteCurrency(value)}>
                  <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-800 border-gray-700">
                    <SelectItem value="USD">USD</SelectItem>
                    <SelectItem value="EURO">EURO</SelectItem>
                    <SelectItem value="GBP">GBP</SelectItem>
                    <SelectItem value="CAD">CAD</SelectItem>
                  </SelectContent>
                </Select>
              </div>

              <div className="flex items-center space-x-2">
                <Checkbox
                  id="isRepInvolved"
                  checked={isRepInvolved}
                  onCheckedChange={(checked) => setIsRepInvolved(checked as boolean)}
                />
                <Label htmlFor="isRepInvolved" className="text-white">Rep Involved</Label>
              </div>
            </div>
          </div>

          {/* Terms */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div>
              <Label className="text-white">Shipping Terms</Label>
              <Select value={shippingTerms} onValueChange={(value: any) => setShippingTerms(value)}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="Ex-Works">Ex-Works</SelectItem>
                  <SelectItem value="CFR">CFR</SelectItem>
                  <SelectItem value="CIF">CIF</SelectItem>
                  <SelectItem value="CIP">CIP</SelectItem>
                  <SelectItem value="CPT">CPT</SelectItem>
                  <SelectItem value="DDP">DDP</SelectItem>
                  <SelectItem value="DAP">DAP</SelectItem>
                  <SelectItem value="FCA">FCA</SelectItem>
                  <SelectItem value="Prepaid">Prepaid</SelectItem>
                </SelectContent>
              </Select>
            </div>

            <div>
              <Label className="text-white">Payment Terms</Label>
              <Select value={paymentTerms} onValueChange={(value: any) => setPaymentTerms(value)}>
                <SelectTrigger className="bg-gray-800 border-gray-700 text-white mt-1">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent className="bg-gray-800 border-gray-700">
                  <SelectItem value="Prepaid">Prepaid</SelectItem>
                  <SelectItem value="15">15 days</SelectItem>
                  <SelectItem value="30">30 days</SelectItem>
                  <SelectItem value="60">60 days</SelectItem>
                  <SelectItem value="90">90 days</SelectItem>
                  <SelectItem value="120">120 days</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>

          {/* Discount Section */}
          {canSeePrices && (
            <div className="space-y-4">
              <h3 className="text-white font-medium">Discount Request</h3>
              
              <div>
                <Label htmlFor="requestedDiscount" className="text-white">Requested Discount (%)</Label>
                <Input
                  id="requestedDiscount"
                  type="number"
                  value={requestedDiscount}
                  onChange={(e) => setRequestedDiscount(Number(e.target.value))}
                  className="bg-gray-800 border-gray-700 text-white mt-1"
                  placeholder="0"
                  min="0"
                  max="50"
                />
              </div>

              {requestedDiscount > 0 && (
                <>
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="grid grid-cols-3 gap-4 text-sm">
                      <div>
                        <p className="text-gray-400">Discounted Value</p>
                        <p className="text-white font-bold">${discountedValue.toLocaleString()}</p>
                      </div>
                      <div>
                        <p className="text-gray-400">New Margin</p>
                        <p className={`font-bold ${discountedMargin > 20 ? 'text-green-400' : discountedMargin > 10 ? 'text-yellow-400' : 'text-red-400'}`}>
                          {discountedMargin.toFixed(1)}%
                        </p>
                      </div>
                      <div>
                        <p className="text-gray-400">New Profit</p>
                        <p className="text-green-400 font-bold">${discountedGrossProfit.toLocaleString()}</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <Label htmlFor="discountJustification" className="text-white">Discount Justification *</Label>
                    <Textarea
                      id="discountJustification"
                      value={discountJustification}
                      onChange={(e) => setDiscountJustification(e.target.value)}
                      className="bg-gray-800 border-gray-700 text-white mt-1"
                      placeholder="Please provide justification for the requested discount..."
                      rows={3}
                    />
                  </div>
                </>
              )}
            </div>
          )}

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              variant="outline"
              onClick={() => setIsOpen(false)}
              className="border-gray-600 text-gray-300"
            >
              Cancel
            </Button>
            <Button
              onClick={handleSubmit}
              disabled={isSubmitting}
              className="bg-red-600 hover:bg-red-700"
            >
              {isSubmitting ? (
                <>Submitting...</>
              ) : (
                <>
                  <Send className="mr-2 h-4 w-4" />
                  Submit Quote
                </>
              )}
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuoteSubmissionDialog;

/**
 * © 2025 Qualitrol Corp. All rights reserved.
 */

import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState, useEffect } from "react";
import { BOMItem } from "@/types/product";
import { User } from "@/types/auth";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "@/components/ui/use-toast";

interface QuoteSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (quoteId: string) => void;
  bomItems: BOMItem[];
  quoteFields: Record<string, any>;
  discountPercentage: number;
  discountJustification: string;
  onClose: () => void;
  canSeePrices: boolean;
  user: User;
}

const QuoteSubmissionDialog = ({ 
  open, 
  onOpenChange, 
  onSubmit, 
  bomItems,
  quoteFields,
  discountPercentage,
  discountJustification,
  onClose,
  canSeePrices,
  user
}: QuoteSubmissionDialogProps) => {
  const [formData, setFormData] = useState({
    customerName: '',
    oracleCustomerId: '',
    sfdcOpportunity: '',
    notes: ''
  });

  const [isSubmitting, setIsSubmitting] = useState(false);

  // Initialize form data from quoteFields when dialog opens
  useEffect(() => {
    if (open && quoteFields) {
      setFormData({
        customerName: quoteFields.customerName || '',
        oracleCustomerId: quoteFields.oracleCustomerId || '',
        sfdcOpportunity: quoteFields.sfdcOpportunity || '',
        notes: quoteFields.notes || ''
      });
    }
  }, [open, quoteFields]);

  const handleSubmit = async () => {
    if (isSubmitting) return;
    
    setIsSubmitting(true);
    
    try {
      // Generate a quote ID
      const quoteId = `Q-${Date.now()}`;
      
      // Calculate totals
      const originalQuoteValue = bomItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
      const discountedValue = originalQuoteValue * (1 - discountPercentage / 100);
      const totalCost = bomItems.reduce((sum, item) => sum + ((item.product.cost || 0) * item.quantity), 0);
      const grossProfit = discountedValue - totalCost;
      const discountedMargin = discountedValue > 0 ? (grossProfit / discountedValue) * 100 : 0;

      // Create quote in database with pending_approval status
      const { error: quoteError } = await supabase
        .from('quotes')
        .insert({
          id: quoteId,
          customer_name: formData.customerName,
          oracle_customer_id: formData.oracleCustomerId,
          sfdc_opportunity: formData.sfdcOpportunity,
          status: 'pending_approval',
          user_id: user.id,
          submitted_by_name: user.name,
          submitted_by_email: user.email,
          original_quote_value: originalQuoteValue,
          requested_discount: discountPercentage,
          discount_justification: discountJustification,
          discounted_value: discountedValue,
          total_cost: totalCost,
          gross_profit: grossProfit,
          original_margin: originalQuoteValue > 0 ? ((originalQuoteValue - totalCost) / originalQuoteValue) * 100 : 0,
          discounted_margin: discountedMargin,
          quote_fields: {
            ...quoteFields,
            customerName: formData.customerName,
            oracleCustomerId: formData.oracleCustomerId,
            sfdcOpportunity: formData.sfdcOpportunity,
            notes: formData.notes
          },
          priority: 'Medium',
          currency: 'USD',
          payment_terms: 'Net 30',
          shipping_terms: 'FOB Origin'
        });

      if (quoteError) throw quoteError;

      // Create BOM items
      for (const item of bomItems) {
        const { error: bomError } = await supabase
          .from('bom_items')
          .insert({
            quote_id: quoteId,
            product_id: item.product.id,
            name: item.product.name,
            description: item.product.description || '',
            part_number: item.product.partNumber || item.partNumber || '',
            quantity: item.quantity,
            unit_price: item.product.price,
            unit_cost: item.product.cost || 0,
            total_price: item.product.price * item.quantity,
            total_cost: (item.product.cost || 0) * item.quantity,
            margin: item.product.price > 0 ? (((item.product.price - (item.product.cost || 0)) / item.product.price) * 100) : 0,
            original_unit_price: item.product.price,
            approved_unit_price: item.product.price,
            configuration_data: item.configuration || {},
            product_type: item.product.type || 'standard'
          });

        if (bomError) throw bomError;
      }

      // Send notification to admins
      try {
        const { data: adminIds } = await supabase.rpc('get_admin_user_ids');
        
        if (adminIds && adminIds.length > 0) {
          await supabase
            .from('admin_notifications')
            .insert({
              quote_id: quoteId,
              notification_type: 'quote_pending_approval',
              sent_to: adminIds,
              message_content: {
                customer_name: formData.customerName,
                submitted_by: user.name,
                quote_value: discountedValue,
                discount_percentage: discountPercentage
              }
            });
        }
      } catch (notificationError) {
        console.error('Failed to send admin notifications:', notificationError);
        // Don't fail the quote submission if notifications fail
      }

      toast({
        title: "Quote Submitted Successfully",
        description: `Quote ${quoteId} has been submitted for approval.`,
      });

      onSubmit(quoteId);
      onOpenChange(false);

    } catch (error) {
      console.error('Error submitting quote:', error);
      toast({
        title: "Submission Failed",
        description: "Failed to submit quote. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  const isFormValid = formData.customerName && formData.oracleCustomerId && formData.sfdcOpportunity;

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Submit Quote</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="customerName" className="text-white">Customer Name *</Label>
            <Input
              id="customerName"
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="oracleId" className="text-white">Oracle Customer ID *</Label>
            <Input
              id="oracleId"
              value={formData.oracleCustomerId}
              onChange={(e) => setFormData(prev => ({ ...prev, oracleCustomerId: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="sfdcOpp" className="text-white">SFDC Opportunity *</Label>
            <Input
              id="sfdcOpp"
              value={formData.sfdcOpportunity}
              onChange={(e) => setFormData(prev => ({ ...prev, sfdcOpportunity: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
              required
            />
          </div>
          
          <div>
            <Label htmlFor="notes" className="text-white">Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>

          {canSeePrices && (
            <div className="pt-4 border-t border-gray-700">
              <div className="text-sm text-gray-400 mb-2">
                Quote Summary: {bomItems.length} items
              </div>
              {discountPercentage > 0 && (
                <div className="text-sm text-yellow-400">
                  Discount: {discountPercentage}% - {discountJustification}
                </div>
              )}
            </div>
          )}
          
          <div className="flex space-x-2">
            <Button 
              onClick={handleSubmit} 
              className="flex-1"
              disabled={!isFormValid || isSubmitting}
            >
              {isSubmitting ? 'Submitting...' : 'Submit Quote'}
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1 border-gray-600 text-gray-300"
              disabled={isSubmitting}
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default QuoteSubmissionDialog;

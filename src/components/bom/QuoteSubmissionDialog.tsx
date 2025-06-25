
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { BOMItem } from "@/types/product";
import { User } from "@/types/auth";

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
    customerName: quoteFields.customerName || '',
    oracleCustomerId: quoteFields.oracleCustomerId || '',
    sfdcOpportunity: quoteFields.sfdcOpportunity || '',
    notes: quoteFields.notes || ''
  });

  const handleSubmit = () => {
    // Generate a quote ID and submit
    const quoteId = `Q-${Date.now()}`;
    onSubmit(quoteId);
    onOpenChange(false);
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
              disabled={!isFormValid}
            >
              Submit Quote
            </Button>
            <Button 
              variant="outline" 
              onClick={onClose}
              className="flex-1 border-gray-600 text-gray-300"
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

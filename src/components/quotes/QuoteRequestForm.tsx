
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { useState } from 'react';
import { Dialog, DialogContent, DialogHeader, DialogTitle } from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BOMItem } from '@/types/product';

interface QuoteRequestFormProps {
  bomItems: BOMItem[];
  onClose: () => void;
  onSubmit: (quoteData: any) => Promise<void>;
}

const QuoteRequestForm = ({ bomItems, onClose, onSubmit }: QuoteRequestFormProps) => {
  const [formData, setFormData] = useState({
    customerName: '',
    oracleCustomerId: '',
    sfdcOpportunity: '',
    paymentTerms: '',
    shippingTerms: '',
    specialRequirements: ''
  });
  
  const [isSubmitting, setIsSubmitting] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    
    try {
      await onSubmit({
        ...formData,
        bomItems,
        totalValue: bomItems.reduce((sum, item) => sum + item.total_price, 0)
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={true} onOpenChange={onClose}>
      <DialogContent className="max-w-2xl bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">Submit Quote Request</DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="customerName" className="text-white">Customer Name *</Label>
              <Input
                id="customerName"
                value={formData.customerName}
                onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="oracleCustomerId" className="text-white">Oracle Customer ID *</Label>
              <Input
                id="oracleCustomerId"
                value={formData.oracleCustomerId}
                onChange={(e) => setFormData(prev => ({ ...prev, oracleCustomerId: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="sfdcOpportunity" className="text-white">SFDC Opportunity *</Label>
              <Input
                id="sfdcOpportunity"
                value={formData.sfdcOpportunity}
                onChange={(e) => setFormData(prev => ({ ...prev, sfdcOpportunity: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
                required
              />
            </div>
            
            <div>
              <Label htmlFor="paymentTerms" className="text-white">Payment Terms</Label>
              <Input
                id="paymentTerms"
                value={formData.paymentTerms}
                onChange={(e) => setFormData(prev => ({ ...prev, paymentTerms: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white"
              />
            </div>
          </div>
          
          <div>
            <Label htmlFor="shippingTerms" className="text-white">Shipping Terms</Label>
            <Input
              id="shippingTerms"
              value={formData.shippingTerms}
              onChange={(e) => setFormData(prev => ({ ...prev, shippingTerms: e.target.value }))}
              className="bg-gray-800 border-gray-700 text-white"
            />
          </div>
          
          <div>
            <Label htmlFor="specialRequirements" className="text-white">Special Requirements</Label>
            <Textarea
              id="specialRequirements"
              value={formData.specialRequirements}
              onChange={(e) => setFormData(prev => ({ ...prev, specialRequirements: e.target.value }))}
              className="bg-gray-800 border-gray-700 text-white"
              rows={3}
            />
          </div>
          
          <div className="flex justify-end space-x-2 pt-4">
            <Button type="button" variant="outline" onClick={onClose}>
              Cancel
            </Button>
            <Button type="submit" disabled={isSubmitting} className="bg-blue-600 hover:bg-blue-700">
              {isSubmitting ? 'Submitting...' : 'Submit Quote Request'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default QuoteRequestForm;

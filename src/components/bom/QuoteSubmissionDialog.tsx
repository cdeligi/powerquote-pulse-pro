
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { useState } from "react";
import { useQuoteValidation, validateQuoteField } from './QuoteFieldValidation';

interface QuoteSubmissionDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  onSubmit: (data: any) => void;
  quoteData: any;
}

const QuoteSubmissionDialog = ({ 
  open, 
  onOpenChange, 
  onSubmit, 
  quoteData 
}: QuoteSubmissionDialogProps) => {
  const [formData, setFormData] = useState({
    customerName: '',
    oracleCustomerId: '',
    sfdcOpportunity: '',
    notes: ''
  });

  const { validation } = useQuoteValidation(formData, []);

  const handleSubmit = () => {
    if (validation.isValid) {
      onSubmit({ ...quoteData, ...formData });
      onOpenChange(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-md">
        <DialogHeader>
          <DialogTitle className="text-white">Submit Quote</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          <div>
            <Label htmlFor="customerName" className="text-white">Customer Name</Label>
            <Input
              id="customerName"
              value={formData.customerName}
              onChange={(e) => setFormData(prev => ({ ...prev, customerName: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          
          <div>
            <Label htmlFor="oracleId" className="text-white">Oracle Customer ID</Label>
            <Input
              id="oracleId"
              value={formData.oracleCustomerId}
              onChange={(e) => setFormData(prev => ({ ...prev, oracleCustomerId: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
            />
          </div>
          
          <div>
            <Label htmlFor="sfdcOpp" className="text-white">SFDC Opportunity</Label>
            <Input
              id="sfdcOpp"
              value={formData.sfdcOpportunity}
              onChange={(e) => setFormData(prev => ({ ...prev, sfdcOpportunity: e.target.value }))}
              className="bg-gray-700 border-gray-600 text-white"
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
          
          <div className="flex space-x-2">
            <Button onClick={handleSubmit} className="flex-1">
              Submit Quote
            </Button>
            <Button 
              variant="outline" 
              onClick={() => onOpenChange(false)}
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

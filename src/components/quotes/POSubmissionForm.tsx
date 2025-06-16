
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from "@/components/ui/dialog";
import { Upload, FileText, Send, AlertCircle } from "lucide-react";
import { useToast } from "@/hooks/use-toast";

interface POSubmissionFormProps {
  quoteId: string;
  quoteBOM: any[];
  quoteTotal: number;
  customerName: string;
  onSubmit: (poData: POSubmissionData) => void;
}

export interface POSubmissionData {
  quoteId: string;
  sfdcOpportunity: string;
  poNumber: string;
  poValue: number;
  poFile: File | null;
  notes: string;
  submittedAt: string;
}

const POSubmissionForm = ({ 
  quoteId, 
  quoteBOM, 
  quoteTotal, 
  customerName, 
  onSubmit 
}: POSubmissionFormProps) => {
  const [isOpen, setIsOpen] = useState(false);
  const [formData, setFormData] = useState({
    sfdcOpportunity: '',
    poNumber: '',
    poValue: quoteTotal,
    poFile: null as File | null,
    notes: ''
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const { toast } = useToast();

  const handleFileUpload = (event: React.ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (file) {
      // Check file type
      const allowedTypes = ['application/pdf', 'image/jpeg', 'image/png', 'image/jpg'];
      if (!allowedTypes.includes(file.type)) {
        toast({
          title: "Invalid file type",
          description: "Please upload a PDF or image file",
          variant: "destructive",
        });
        return;
      }
      
      // Check file size (5MB limit)
      if (file.size > 5 * 1024 * 1024) {
        toast({
          title: "File too large",
          description: "Please upload a file smaller than 5MB",
          variant: "destructive",
        });
        return;
      }
      
      setFormData(prev => ({ ...prev, poFile: file }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    if (!formData.sfdcOpportunity || !formData.poNumber || !formData.poFile) {
      toast({
        title: "Missing required fields",
        description: "Please fill in all required fields and upload the PO",
        variant: "destructive",
      });
      return;
    }

    setIsSubmitting(true);
    
    try {
      const poData: POSubmissionData = {
        quoteId,
        sfdcOpportunity: formData.sfdcOpportunity,
        poNumber: formData.poNumber,
        poValue: formData.poValue,
        poFile: formData.poFile,
        notes: formData.notes,
        submittedAt: new Date().toISOString()
      };
      
      await onSubmit(poData);
      
      toast({
        title: "PO Submitted Successfully",
        description: "The purchase order has been sent to the orders team and you'll receive a confirmation email.",
      });
      
      setIsOpen(false);
      setFormData({
        sfdcOpportunity: '',
        poNumber: '',
        poValue: quoteTotal,
        poFile: null,
        notes: ''
      });
    } catch (error) {
      toast({
        title: "Submission failed",
        description: "There was an error submitting the PO. Please try again.",
        variant: "destructive",
      });
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button className="bg-green-600 hover:bg-green-700 text-white">
          <FileText className="mr-2 h-4 w-4" />
          Submit Purchase Order
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
        <DialogHeader>
          <DialogTitle className="text-white flex items-center">
            <Send className="mr-2 h-5 w-5" />
            Submit Purchase Order - Quote {quoteId}
          </DialogTitle>
        </DialogHeader>
        
        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Alert about process */}
          <div className="flex items-start space-x-3 p-4 bg-blue-900/20 border border-blue-700 rounded-lg">
            <AlertCircle className="h-5 w-5 text-blue-400 mt-0.5" />
            <div className="text-sm">
              <p className="text-blue-300 font-medium">PO Submission Process</p>
              <p className="text-blue-200 mt-1">
                The orders team will receive the PO and BOM for booking. You'll receive a confirmation email copy.
              </p>
            </div>
          </div>

          {/* Customer & Quote Info */}
          <div className="grid grid-cols-2 gap-4 p-4 bg-gray-800 rounded-lg">
            <div>
              <Label className="text-gray-400">Customer</Label>
              <p className="text-white font-medium">{customerName}</p>
            </div>
            <div>
              <Label className="text-gray-400">Quote Total</Label>
              <p className="text-white font-medium">${quoteTotal.toLocaleString()}</p>
            </div>
          </div>

          {/* SFDC Opportunity - Mandatory */}
          <div>
            <Label htmlFor="sfdc-opportunity" className="text-white">
              SFDC Opportunity ID <span className="text-red-400">*</span>
            </Label>
            <Input
              id="sfdc-opportunity"
              value={formData.sfdcOpportunity}
              onChange={(e) => setFormData(prev => ({ ...prev, sfdcOpportunity: e.target.value }))}
              className="bg-gray-800 border-gray-700 text-white mt-1"
              placeholder="Enter Salesforce Opportunity ID"
              required
            />
            <p className="text-gray-400 text-xs mt-1">
              This helps the orders team understand where this opportunity is tied to in Salesforce
            </p>
          </div>

          {/* PO Details */}
          <div className="grid grid-cols-2 gap-4">
            <div>
              <Label htmlFor="po-number" className="text-white">
                PO Number <span className="text-red-400">*</span>
              </Label>
              <Input
                id="po-number"
                value={formData.poNumber}
                onChange={(e) => setFormData(prev => ({ ...prev, poNumber: e.target.value }))}
                className="bg-gray-800 border-gray-700 text-white mt-1"
                placeholder="Enter PO number"
                required
              />
            </div>
            <div>
              <Label htmlFor="po-value" className="text-white">PO Value ($)</Label>
              <Input
                id="po-value"
                type="number"
                value={formData.poValue}
                onChange={(e) => setFormData(prev => ({ ...prev, poValue: Number(e.target.value) }))}
                className="bg-gray-800 border-gray-700 text-white mt-1"
                min="0"
                step="0.01"
              />
            </div>
          </div>

          {/* File Upload */}
          <div>
            <Label htmlFor="po-file" className="text-white">
              Purchase Order Document <span className="text-red-400">*</span>
            </Label>
            <div className="mt-1">
              <input
                id="po-file"
                type="file"
                accept=".pdf,.jpg,.jpeg,.png"
                onChange={handleFileUpload}
                className="hidden"
                required
              />
              <Button
                type="button"
                variant="outline"
                onClick={() => document.getElementById('po-file')?.click()}
                className="w-full border-gray-600 text-white hover:bg-gray-800"
              >
                <Upload className="mr-2 h-4 w-4" />
                {formData.poFile ? formData.poFile.name : 'Upload PO Document (PDF, JPG, PNG)'}
              </Button>
            </div>
            {formData.poFile && (
              <p className="text-green-400 text-sm mt-2">
                ✓ {formData.poFile.name} ({(formData.poFile.size / 1024 / 1024).toFixed(2)} MB)
              </p>
            )}
          </div>

          {/* Additional Notes */}
          <div>
            <Label htmlFor="notes" className="text-white">Additional Notes</Label>
            <Textarea
              id="notes"
              value={formData.notes}
              onChange={(e) => setFormData(prev => ({ ...prev, notes: e.target.value }))}
              className="bg-gray-800 border-gray-700 text-white mt-1"
              placeholder="Any additional information for the orders team..."
              rows={3}
            />
          </div>

          {/* Submit Button */}
          <div className="flex justify-end space-x-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => setIsOpen(false)}
              disabled={isSubmitting}
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isSubmitting}
              className="bg-green-600 hover:bg-green-700 text-white"
            >
              {isSubmitting ? 'Submitting...' : 'Submit PO to Orders'}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};

export default POSubmissionForm;

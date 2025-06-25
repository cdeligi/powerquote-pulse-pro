
import { useState, useEffect } from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { 
  Clock,
  FileText,
  CheckCircle,
  XCircle,
  Loader2
} from "lucide-react";
import { User as UserType } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";
import { useQuotes, Quote, BOMItemWithDetails } from "@/hooks/useQuotes";
import { QuoteCard } from "./quote-approval/QuoteCard";
import { QuoteDetailsDialog } from "./quote-approval/QuoteDetailsDialog";

interface EnhancedQuoteApprovalDashboardProps {
  user: UserType;
}

const EnhancedQuoteApprovalDashboard = ({ user }: EnhancedQuoteApprovalDashboardProps) => {
  const { quotes, loading, fetchBOMItems, updateQuoteStatus, updateBOMItemPrice } = useQuotes();
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [bomItems, setBomItems] = useState<BOMItemWithDetails[]>([]);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [activeTab, setActiveTab] = useState('pending');
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [approvedDiscount, setApprovedDiscount] = useState('');
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [priceEditReason, setPriceEditReason] = useState('');
  const [loadingBom, setLoadingBom] = useState(false);
  const { toast } = useToast();

  const getFilteredQuotes = () => {
    switch (activeTab) {
      case 'pending': return quotes.filter(q => q.status === 'pending');
      case 'under-review': return quotes.filter(q => q.status === 'under-review');
      case 'approved': return quotes.filter(q => q.status === 'approved');
      case 'rejected': return quotes.filter(q => q.status === 'rejected');
      default: return quotes;
    }
  };

  const handleApprove = async () => {
    if (!selectedQuote) return;
    
    try {
      await updateQuoteStatus(
        selectedQuote.id,
        'approved',
        parseFloat(approvedDiscount) || selectedQuote.requested_discount,
        approvalNotes
      );
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to approve quote:', error);
    }
  };

  const handleReject = async () => {
    if (!selectedQuote || !rejectionReason.trim()) return;
    
    try {
      await updateQuoteStatus(
        selectedQuote.id,
        'rejected',
        undefined,
        undefined,
        rejectionReason
      );
      setDialogOpen(false);
      resetForm();
    } catch (error) {
      console.error('Failed to reject quote:', error);
    }
  };

  const handlePriceUpdate = async (bomItemId: string) => {
    const newPrice = editingPrices[bomItemId];
    if (!newPrice || !priceEditReason.trim()) {
      toast({
        title: "Missing Information",
        description: "Please enter both new price and reason for change",
        variant: "destructive"
      });
      return;
    }

    try {
      await updateBOMItemPrice(bomItemId, parseFloat(newPrice), priceEditReason);
      
      // Update local state
      setBomItems(prev => prev.map(item => 
        item.id === bomItemId 
          ? { 
              ...item, 
              unit_price: parseFloat(newPrice),
              total_price: parseFloat(newPrice) * item.quantity,
              approved_unit_price: parseFloat(newPrice)
            }
          : item
      ));
      
      // Clear editing state
      setEditingPrices(prev => {
        const newState = { ...prev };
        delete newState[bomItemId];
        return newState;
      });
      setPriceEditReason('');
    } catch (error) {
      console.error('Failed to update price:', error);
    }
  };

  const openQuoteDialog = async (quote: Quote) => {
    setSelectedQuote(quote);
    setApprovedDiscount(quote.requested_discount.toString());
    setLoadingBom(true);
    setDialogOpen(true);
    
    try {
      const items = await fetchBOMItems(quote.id);
      setBomItems(items);
    } catch (error) {
      console.error('Failed to load BOM items:', error);
    } finally {
      setLoadingBom(false);
    }
  };

  const handleQuickApprove = async (quoteId: string) => {
    const quote = quotes.find(q => q.id === quoteId);
    if (!quote) return;
    
    try {
      await updateQuoteStatus(quoteId, 'approved', quote.requested_discount);
    } catch (error) {
      console.error('Failed to approve quote:', error);
    }
  };

  const resetForm = () => {
    setApprovalNotes('');
    setRejectionReason('');
    setApprovedDiscount('');
    setEditingPrices({});
    setPriceEditReason('');
    setBomItems([]);
  };

  const handlePriceEdit = (itemId: string, price: string) => {
    setEditingPrices(prev => ({ ...prev, [itemId]: price }));
  };

  const handlePriceEditCancel = (itemId: string) => {
    setEditingPrices(prev => {
      const newState = { ...prev };
      delete newState[itemId];
      return newState;
    });
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-white" />
        <span className="ml-2 text-white">Loading quotes...</span>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Enhanced Quote Approval Dashboard</h2>
          <p className="text-gray-400">Review submitted quotes with detailed BOM analysis and price control</p>
        </div>
        <div className="flex space-x-4">
          <Card className="bg-gray-900 border-gray-800">
            <CardContent className="p-4">
              <div className="flex items-center space-x-2">
                <Clock className="h-4 w-4 text-yellow-400" />
                <span className="text-sm text-gray-400">Pending Approval</span>
                <Badge variant="outline" className="border-yellow-500 text-yellow-400">
                  {quotes.filter(q => q.status === 'pending').length}
                </Badge>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="grid w-full grid-cols-4 bg-gray-800">
          <TabsTrigger 
            value="pending" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <Clock className="h-4 w-4 mr-2" />
            Pending ({quotes.filter(q => q.status === 'pending').length})
          </TabsTrigger>
          <TabsTrigger 
            value="under-review" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <FileText className="h-4 w-4 mr-2" />
            Under Review ({quotes.filter(q => q.status === 'under-review').length})
          </TabsTrigger>
          <TabsTrigger 
            value="approved" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <CheckCircle className="h-4 w-4 mr-2" />
            Approved ({quotes.filter(q => q.status === 'approved').length})
          </TabsTrigger>
          <TabsTrigger 
            value="rejected" 
            className="text-white data-[state=active]:bg-red-600 data-[state=active]:text-white"
          >
            <XCircle className="h-4 w-4 mr-2" />
            Rejected ({quotes.filter(q => q.status === 'rejected').length})
          </TabsTrigger>
        </TabsList>

        <TabsContent value={activeTab} className="mt-6">
          <div className="grid gap-4">
            {getFilteredQuotes().map((quote) => (
              <QuoteCard
                key={quote.id}
                quote={quote}
                onReviewClick={openQuoteDialog}
                onQuickApprove={handleQuickApprove}
              />
            ))}
          </div>

          {getFilteredQuotes().length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No quotes found in this category.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      <QuoteDetailsDialog
        open={dialogOpen}
        onOpenChange={setDialogOpen}
        quote={selectedQuote}
        bomItems={bomItems}
        loadingBom={loadingBom}
        editingPrices={editingPrices}
        priceEditReason={priceEditReason}
        approvedDiscount={approvedDiscount}
        approvalNotes={approvalNotes}
        rejectionReason={rejectionReason}
        onPriceEdit={handlePriceEdit}
        onPriceEditCancel={handlePriceEditCancel}
        onPriceUpdate={handlePriceUpdate}
        onPriceEditReasonChange={setPriceEditReason}
        onApprovedDiscountChange={setApprovedDiscount}
        onApprovalNotesChange={setApprovalNotes}
        onRejectionReasonChange={setRejectionReason}
        onApprove={handleApprove}
        onReject={handleReject}
      />
    </div>
  );
};

export default EnhancedQuoteApprovalDashboard;

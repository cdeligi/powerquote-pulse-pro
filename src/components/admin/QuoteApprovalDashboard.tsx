import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  User, 
  Calendar,
  FileText,
  AlertTriangle,
  ChevronDown,
  Eye,
  Edit
} from "lucide-react";
import { User as UserType } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";
import { quoteFieldsService, QuoteField } from '@/services/quoteFieldsService';

// Update the DetailedQuote interface to include BOM items and dynamic fields
interface DetailedQuote {
  id: string;
  customerName: string;
  oracleCustomerId: string;
  sfdcOpportunity: string;
  submittedBy: string;
  submittedDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'under-review';
  originalQuoteValue: number;
  requestedDiscount: number;
  discountedValue: number;
  totalCost: number;
  originalMargin: number;
  discountedMargin: number;
  grossProfit: number;
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  paymentTerms: string;
  shippingTerms: string;
  currency: string;
  isRepInvolved: boolean;
  discountJustification?: string;
  previousCounterOffers?: Array<{
    discount: number;
    status: 'rejected' | 'pending';
  }>;
  bomItems: Array<{
    id: string;
    name: string;
    partNumber: string;
    quantity: number;
    unitPrice: number;
    unitCost: number;
    totalPrice: number;
    totalCost: number;
    margin: number;
    description?: string;
  }>;
  quoteFields?: Record<string, string>; // Dynamic quote fields
}

interface QuoteApprovalDashboardProps {
  user: UserType;
}

const QuoteApprovalDashboard = ({ user }: QuoteApprovalDashboardProps) => {
  const [quotes] = useState<DetailedQuote[]>([
    {
      id: 'QR-2024-001',
      customerName: 'Pacific Gas & Electric',
      oracleCustomerId: 'ORG-789012',
      sfdcOpportunity: 'SFDC-789456',
      submittedBy: 'John Smith',
      submittedDate: '2024-01-15T10:30:00Z',
      status: 'pending',
      originalQuoteValue: 125000,
      requestedDiscount: 12,
      discountedValue: 110000,
      totalCost: 85000,
      originalMargin: 32.0,
      discountedMargin: 22.7,
      grossProfit: 25000,
      priority: 'High',
      paymentTerms: '30 days',
      shippingTerms: 'FOB Origin',
      currency: 'USD',
      isRepInvolved: true,
      discountJustification: 'High-volume customer with strategic relationship potential',
      previousCounterOffers: [
        { discount: 8, status: 'rejected' }
      ],
      bomItems: [
        {
          id: '1',
          name: 'QTMS LTX Assembly',
          partNumber: 'QTMS-LTX-001',
          quantity: 2,
          unitPrice: 45000,
          unitCost: 32000,
          totalPrice: 90000,
          totalCost: 64000,
          margin: 28.9,
          description: 'Complete QTMS LTX chassis with configured cards and remote display'
        },
        {
          id: '2',
          name: 'Remote Display Unit',
          partNumber: 'RDU-001',
          quantity: 2,
          unitPrice: 17500,
          unitCost: 10500,
          totalPrice: 35000,
          totalCost: 21000,
          margin: 40.0,
          description: 'Remote display unit for QTMS monitoring'
        }
      ],
      quoteFields: {
        customerName: 'Pacific Gas & Electric',
        oracleCustomerId: 'ORG-789012',
        sfdcOpportunity: 'SFDC-789456',
        contactPerson: 'Jane Doe',
        contactEmail: 'jane.doe@pge.com',
        projectName: 'Substation Monitoring Upgrade',
        expectedCloseDate: '2024-03-15',
        paymentTerms: '30 days',
        shippingTerms: 'FOB Origin',
        currency: 'USD'
      }
    }
  ]);

  const [selectedQuote, setSelectedQuote] = useState<DetailedQuote | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [counterDiscountPercent, setCounterDiscountPercent] = useState<number>(0);
  const [showDetails, setShowDetails] = useState<Record<string, boolean>>({});
  const [activeTab, setActiveTab] = useState('pending');
  const { toast } = useToast();

  // Get enabled quote fields for display
  const enabledQuoteFields = quoteFieldsService.getEnabledFields();

  const getStatusColor = (status: DetailedQuote['status']) => {
    switch (status) {
      case 'pending': return 'bg-yellow-600 text-white';
      case 'under-review': return 'bg-blue-600 text-white';
      case 'approved': return 'bg-green-600 text-white';
      case 'rejected': return 'bg-red-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getPriorityColor = (priority: DetailedQuote['priority']) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-600 text-white';
      case 'High': return 'bg-orange-600 text-white';
      case 'Medium': return 'bg-yellow-600 text-white';
      case 'Low': return 'bg-green-600 text-white';
      default: return 'bg-gray-600 text-white';
    }
  };

  const getFilteredQuotes = () => {
    switch (activeTab) {
      case 'pending': return quotes.filter(q => q.status === 'pending');
      case 'under-review': return quotes.filter(q => q.status === 'under-review');
      case 'approved': return quotes.filter(q => q.status === 'approved');
      case 'rejected': return quotes.filter(q => q.status === 'rejected');
      default: return quotes;
    }
  };

  const calculateCounterOffer = (quote: DetailedQuote, discountPercent: number) => {
    const newValue = quote.originalQuoteValue * (1 - discountPercent / 100);
    const newMargin = ((newValue - quote.totalCost) / newValue) * 100;
    const newGrossProfit = newValue - quote.totalCost;
    return { newValue, newMargin, newGrossProfit };
  };

  const handleApprove = (quote: DetailedQuote, discountPercent?: number) => {
    const finalDiscount = discountPercent ?? quote.requestedDiscount;
    toast({
      title: "Quote Approved",
      description: `Quote ${quote.id} approved with ${finalDiscount}% discount.`
    });
    setDialogOpen(false);
    setCounterDiscountPercent(0);
  };

  const handleReject = (quote: DetailedQuote) => {
    if (!rejectionReason.trim()) {
      toast({
        title: "Rejection reason required",
        description: "Please provide a reason for rejecting this quote.",
        variant: "destructive"
      });
      return;
    }
    
    toast({
      title: "Quote Rejected",
      description: `Quote ${quote.id} has been rejected.`,
      variant: "destructive"
    });
    setDialogOpen(false);
    setRejectionReason('');
  };

  const handleCounterOffer = (quote: DetailedQuote) => {
    if (counterDiscountPercent <= 0) {
      toast({
        title: "Invalid discount",
        description: "Please enter a valid discount percentage.",
        variant: "destructive"
      });
      return;
    }

    toast({
      title: "Counter Offer Sent",
      description: `Counter offer sent with ${counterDiscountPercent}% discount.`
    });
    setDialogOpen(false);
    setCounterDiscountPercent(0);
  };

  const toggleDetails = (quoteId: string) => {
    setShowDetails(prev => ({
      ...prev,
      [quoteId]: !prev[quoteId]
    }));
  };

  const openQuoteDialog = (quote: DetailedQuote) => {
    setSelectedQuote(quote);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-3xl font-bold text-white">Quote Approval Queue</h2>
          <p className="text-gray-400">Review and approve submitted quotes from sales team</p>
        </div>
        <div className="flex items-center space-x-4">
          <Badge className="bg-red-600 text-white px-4 py-2 text-lg">
            {quotes.filter(q => q.status === 'pending').length} Pending
          </Badge>
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
          <div className="space-y-4">
            {getFilteredQuotes().map((quote) => (
              <Card key={quote.id} className="bg-gray-900 border-gray-800">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div className="flex items-center space-x-4">
                      <div>
                        <CardTitle className="text-white text-xl flex items-center space-x-3">
                          {quote.id}
                          <Badge className={`${getStatusColor(quote.status)} border-none`}>
                            {quote.status === 'pending' ? 'Pending Review' : quote.status.charAt(0).toUpperCase() + quote.status.slice(1).replace('-', ' ')}
                          </Badge>
                          <Badge className={`${getPriorityColor(quote.priority)} border-none`}>
                            {quote.priority}
                          </Badge>
                          <Badge className="bg-orange-600 text-white border-none">
                            {quote.requestedDiscount}% discount requested
                          </Badge>
                          {quote.isRepInvolved && (
                            <Badge className="bg-blue-600 text-white border-none">
                              Rep Involved
                            </Badge>
                          )}
                        </CardTitle>
                        <div className="mt-2 text-gray-400 space-y-1">
                          <div><strong>Customer:</strong> {quote.customerName}</div>
                          <div><strong>Oracle ID:</strong> {quote.oracleCustomerId}</div>
                          <div><strong>Salesperson:</strong> {quote.submittedBy}</div>
                          <div><strong>Requested:</strong> {new Date(quote.submittedDate).toLocaleString()}</div>
                        </div>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-gray-400 text-sm">Original Quote Value</div>
                      <div className="text-3xl font-bold text-white">{quote.currency} {quote.originalQuoteValue.toLocaleString()}</div>
                      <div className="text-orange-400 text-lg">
                        → With Requested Discount ({quote.requestedDiscount}%)
                      </div>
                      <div className="text-2xl font-bold text-orange-400">{quote.currency} {quote.discountedValue.toLocaleString()}</div>
                      <div className="text-red-400">-{quote.currency} {(quote.originalQuoteValue - quote.discountedValue).toLocaleString()}</div>
                      
                      {quote.previousCounterOffers && quote.previousCounterOffers.length > 0 && (
                        <div className="mt-2">
                          <div className="text-blue-400 text-sm">📋 Previous Counter Offers</div>
                          {quote.previousCounterOffers.map((offer, idx) => (
                            <div key={idx} className="text-sm">
                              {offer.discount}% - <span className="text-red-400">{offer.status}</span>
                            </div>
                          ))}
                        </div>
                      )}

                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => toggleDetails(quote.id)}
                        className="text-gray-400 hover:text-white mt-2"
                      >
                        <Eye className="h-4 w-4 mr-1" />
                        View Details
                        <ChevronDown className={`h-4 w-4 ml-1 transition-transform ${showDetails[quote.id] ? 'rotate-180' : ''}`} />
                      </Button>
                    </div>
                  </div>
                </CardHeader>

                {showDetails[quote.id] && (
                  <CardContent className="border-t border-gray-800 pt-6">
                    {/* Quote Fields Information */}
                    {quote.quoteFields && (
                      <div className="mb-6">
                        <h4 className="text-white font-medium mb-3">Quote Information</h4>
                        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-4">
                          {enabledQuoteFields.map((field) => {
                            const value = quote.quoteFields?.[field.id];
                            if (!value) return null;
                            
                            return (
                              <div key={field.id} className="bg-gray-800 p-3 rounded">
                                <div className="text-gray-400 text-sm">{field.label}</div>
                                <div className="text-white font-medium">{value}</div>
                              </div>
                            );
                          })}
                        </div>
                      </div>
                    )}

                    {/* BOM Items */}
                    <div className="mb-6">
                      <h4 className="text-white font-medium mb-3">Bill of Materials</h4>
                      <div className="bg-gray-800 rounded-lg overflow-hidden">
                        <div className="overflow-x-auto">
                          <table className="w-full">
                            <thead className="bg-gray-700">
                              <tr>
                                <th className="text-left p-3 text-gray-300 text-sm font-medium">Part Number</th>
                                <th className="text-left p-3 text-gray-300 text-sm font-medium">Description</th>
                                <th className="text-right p-3 text-gray-300 text-sm font-medium">Qty</th>
                                <th className="text-right p-3 text-gray-300 text-sm font-medium">Unit Price</th>
                                <th className="text-right p-3 text-gray-300 text-sm font-medium">Total Price</th>
                                <th className="text-right p-3 text-gray-300 text-sm font-medium">Unit Cost</th>
                                <th className="text-right p-3 text-gray-300 text-sm font-medium">Total Cost</th>
                                <th className="text-right p-3 text-gray-300 text-sm font-medium">Margin %</th>
                              </tr>
                            </thead>
                            <tbody>
                              {quote.bomItems.map((item, index) => (
                                <tr key={item.id} className={index % 2 === 0 ? 'bg-gray-800' : 'bg-gray-750'}>
                                  <td className="p-3 text-white font-mono text-sm">{item.partNumber}</td>
                                  <td className="p-3 text-white">
                                    <div className="font-medium">{item.name}</div>
                                    {item.description && (
                                      <div className="text-gray-400 text-sm mt-1">{item.description}</div>
                                    )}
                                  </td>
                                  <td className="p-3 text-white text-right">{item.quantity}</td>
                                  <td className="p-3 text-white text-right">{quote.currency} {item.unitPrice.toLocaleString()}</td>
                                  <td className="p-3 text-white text-right font-medium">{quote.currency} {item.totalPrice.toLocaleString()}</td>
                                  <td className="p-3 text-orange-400 text-right">{quote.currency} {item.unitCost.toLocaleString()}</td>
                                  <td className="p-3 text-orange-400 text-right">{quote.currency} {item.totalCost.toLocaleString()}</td>
                                  <td className={`p-3 text-right font-medium ${item.margin >= settingsService.getMarginWarningThreshold() ? 'text-green-400' : 'text-red-400'}`}>
                                    {item.margin.toFixed(1)}%
                                  </td>
                                </tr>
                              ))}
                            </tbody>
                            <tfoot className="bg-gray-700 border-t border-gray-600">
                              <tr>
                                <td colSpan={4} className="p-3 text-white font-medium">Totals:</td>
                                <td className="p-3 text-white text-right font-bold">{quote.currency} {quote.originalQuoteValue.toLocaleString()}</td>
                                <td className="p-3 text-orange-400 text-right font-bold">{quote.currency} {quote.totalCost.toLocaleString()}</td>
                                <td className="p-3 text-green-400 text-right font-bold">{quote.currency} {quote.grossProfit.toLocaleString()}</td>
                                <td className={`p-3 text-right font-bold ${quote.originalMargin >= settingsService.getMarginWarningThreshold() ? 'text-green-400' : 'text-red-400'}`}>
                                  {quote.originalMargin.toFixed(1)}%
                                </td>
                              </tr>
                            </tfoot>
                          </table>
                        </div>
                      </div>
                    </div>

                    {/* Financial Metrics */}
                    <div className="grid grid-cols-4 gap-4 mb-6">
                      <div className="bg-gray-800 p-4 rounded text-center">
                        <div className="text-gray-400 text-sm">Original Margin</div>
                        <div className={`text-2xl font-bold ${quote.originalMargin >= 25 ? 'text-green-400' : 'text-red-400'}`}>
                          {quote.originalMargin.toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded text-center">
                        <div className="text-gray-400 text-sm">After Discount</div>
                        <div className={`text-2xl font-bold ${quote.discountedMargin >= 25 ? 'text-green-400' : 'text-red-400'}`}>
                          {quote.discountedMargin.toFixed(1)}%
                        </div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded text-center">
                        <div className="text-gray-400 text-sm">Total Cost</div>
                        <div className="text-2xl font-bold text-orange-400">{quote.currency} {quote.totalCost.toLocaleString()}</div>
                      </div>
                      <div className="bg-gray-800 p-4 rounded text-center">
                        <div className="text-gray-400 text-sm">Gross Profit</div>
                        <div className="text-2xl font-bold text-green-400">{quote.currency} {quote.grossProfit.toLocaleString()}</div>
                      </div>
                    </div>

                    {/* Terms */}
                    <div className="grid grid-cols-3 gap-6 mb-6">
                      <div>
                        <div className="text-gray-400 text-sm">Payment Terms</div>
                        <div className="text-white font-medium">{quote.paymentTerms}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">Shipping Terms</div>
                        <div className="text-white font-medium">{quote.shippingTerms}</div>
                      </div>
                      <div>
                        <div className="text-gray-400 text-sm">Currency</div>
                        <div className="text-white font-medium flex items-center">
                          {quote.currency}
                          <Edit className="h-4 w-4 ml-2 text-blue-400" />
                        </div>
                      </div>
                    </div>

                    {/* Discount Justification */}
                    {quote.discountJustification && (
                      <div className="mb-6">
                        <div className="text-gray-400 text-sm">Discount Justification:</div>
                        <div className="bg-gray-800 p-3 rounded mt-1 text-white">
                          {quote.discountJustification}
                        </div>
                      </div>
                    )}

                    {/* Margin Warning */}
                    {quote.discountedMargin < settingsService.getMarginWarningThreshold() && (
                      <div className="mb-6 p-3 bg-red-900/20 border border-red-600/20 rounded flex items-center space-x-2">
                        <AlertTriangle className="h-4 w-4 text-red-400" />
                        <p className="text-red-400 text-sm">
                          Warning: Requested discount will reduce margin to {quote.discountedMargin.toFixed(1)}% (below {settingsService.getMarginWarningThreshold()}% threshold)
                        </p>
                      </div>
                    )}

                    {/* Counter Offer Controls */}
                    {quote.status === 'pending' && (
                      <div className="mb-6">
                        <div className="flex items-center space-x-4 mb-4">
                          <Label className="text-white">Approve Discount (%):</Label>
                          <Input
                            type="number"
                            value={counterDiscountPercent || ''}
                            onChange={(e) => setCounterDiscountPercent(Number(e.target.value))}
                            className="w-24 bg-gray-800 border-gray-600 text-white"
                            min="0"
                            max="50"
                            placeholder="12"
                          />
                          <Button
                            variant="ghost"
                            size="sm"
                            className="text-gray-400"
                          >
                            💹
                          </Button>
                        </div>
                        
                        {counterDiscountPercent > 0 && (
                          <div className="grid grid-cols-3 gap-4 mb-4 p-3 bg-gray-800 rounded">
                            {(() => {
                              const { newValue, newMargin, newGrossProfit } = calculateCounterOffer(quote, counterDiscountPercent);
                              return (
                                <>
                                  <div className="text-center">
                                    <div className="text-gray-400 text-sm">New Value</div>
                                    <div className="text-white font-bold">{quote.currency} {newValue.toLocaleString()}</div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-gray-400 text-sm">New Margin</div>
                                    <div className={`font-bold ${newMargin >= 25 ? 'text-green-400' : 'text-red-400'}`}>
                                      {newMargin.toFixed(1)}%
                                    </div>
                                  </div>
                                  <div className="text-center">
                                    <div className="text-gray-400 text-sm">New Gross Profit</div>
                                    <div className="text-green-400 font-bold">{quote.currency} {newGrossProfit.toLocaleString()}</div>
                                  </div>
                                </>
                              );
                            })()}
                          </div>
                        )}
                      </div>
                    )}

                    {/* Action Buttons */}
                    {quote.status === 'pending' && (
                      <div className="flex space-x-3">
                        <Button
                          onClick={() => handleApprove(quote, quote.requestedDiscount)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve {quote.requestedDiscount}% Discount
                        </Button>
                        <Button
                          onClick={() => handleCounterOffer(quote)}
                          className="bg-orange-600 hover:bg-orange-700"
                          disabled={counterDiscountPercent <= 0}
                        >
                          📊 Counter Offer
                        </Button>
                        <Button
                          onClick={() => openQuoteDialog(quote)}
                          variant="outline"
                          className="border-red-600 text-red-400 hover:bg-red-900/20"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject Quote
                        </Button>
                      </div>
                    )}
                  </CardContent>
                )}
              </Card>
            ))}
          </div>

          {getFilteredQuotes().length === 0 && (
            <div className="text-center py-12">
              <p className="text-gray-400">No quotes found in this category.</p>
            </div>
          )}
        </TabsContent>
      </Tabs>

      {/* Rejection Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              Reject Quote - {selectedQuote?.id}
            </DialogTitle>
          </DialogHeader>
          
          {selectedQuote && (
            <div className="space-y-4">
              <div>
                <Label htmlFor="rejection-reason" className="text-white">Rejection Reason</Label>
                <Textarea
                  id="rejection-reason"
                  value={rejectionReason}
                  onChange={(e) => setRejectionReason(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                  placeholder="Please provide a detailed reason for rejecting this quote..."
                  rows={4}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="border-gray-600 text-gray-300"
                >
                  Cancel
                </Button>
                <Button
                  onClick={() => handleReject(selectedQuote)}
                  className="bg-red-600 hover:bg-red-700"
                >
                  <XCircle className="h-4 w-4 mr-1" />
                  Reject Quote
                </Button>
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuoteApprovalDashboard;

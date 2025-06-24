
import { useState } from "react";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { 
  CheckCircle, 
  XCircle, 
  Clock, 
  DollarSign, 
  User, 
  Calendar,
  FileText,
  AlertTriangle
} from "lucide-react";
import { User as UserType } from "@/types/auth";
import { useToast } from "@/hooks/use-toast";

interface Quote {
  id: string;
  customerName: string;
  oracleCustomerId: string;
  sfdcOpportunity: string;
  submittedBy: string;
  submittedDate: string;
  status: 'pending' | 'approved' | 'rejected' | 'under-review';
  totalValue: number;
  requestedDiscount: number;
  marginAfterDiscount: number;
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  bomItems: number;
  notes?: string;
}

interface QuoteApprovalDashboardProps {
  user: UserType;
}

const QuoteApprovalDashboard = ({ user }: QuoteApprovalDashboardProps) => {
  const [quotes] = useState<Quote[]>([
    {
      id: 'Q-2024-001',
      customerName: 'Pacific Electric Utility',
      oracleCustomerId: 'ORD-12345',
      sfdcOpportunity: 'SFDC-789456',
      submittedBy: 'John Smith',
      submittedDate: '2024-06-15',
      status: 'pending',
      totalValue: 125000,
      requestedDiscount: 15,
      marginAfterDiscount: 22,
      priority: 'High',
      bomItems: 8,
      notes: 'Customer requesting expedited delivery for Q3 installation.'
    },
    {
      id: 'Q-2024-002',
      customerName: 'Northern Grid Solutions',
      oracleCustomerId: 'ORD-67890',
      sfdcOpportunity: 'SFDC-456123',
      submittedBy: 'Sarah Johnson',
      submittedDate: '2024-06-14',
      status: 'under-review',
      totalValue: 89000,
      requestedDiscount: 8,
      marginAfterDiscount: 28,
      priority: 'Medium',
      bomItems: 5,
      notes: 'Standard pricing request, good margin retention.'
    },
    {
      id: 'Q-2024-003',
      customerName: 'Metro Power Authority',
      oracleCustomerId: 'ORD-11111',
      sfdcOpportunity: 'SFDC-999888',
      submittedBy: 'Mike Davis',
      submittedDate: '2024-06-13',
      status: 'approved',
      totalValue: 200000,
      requestedDiscount: 5,
      marginAfterDiscount: 32,
      priority: 'Medium',
      bomItems: 12
    }
  ]);

  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [dialogOpen, setDialogOpen] = useState(false);
  const [approvalNotes, setApprovalNotes] = useState('');
  const [activeTab, setActiveTab] = useState('pending');
  const { toast } = useToast();

  const getStatusColor = (status: Quote['status']) => {
    switch (status) {
      case 'pending': return 'border-yellow-500 text-yellow-400';
      case 'under-review': return 'border-blue-500 text-blue-400';
      case 'approved': return 'border-green-500 text-green-400';
      case 'rejected': return 'border-red-500 text-red-400';
      default: return 'border-gray-500 text-gray-400';
    }
  };

  const getPriorityColor = (priority: Quote['priority']) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-600';
      case 'High': return 'bg-orange-600';
      case 'Medium': return 'bg-yellow-600';
      case 'Low': return 'bg-green-600';
      default: return 'bg-gray-600';
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

  const handleApprove = (quote: Quote) => {
    toast({
      title: "Quote Approved",
      description: `Quote ${quote.id} has been approved successfully.`
    });
    setDialogOpen(false);
    setApprovalNotes('');
  };

  const handleReject = (quote: Quote) => {
    toast({
      title: "Quote Rejected",
      description: `Quote ${quote.id} has been rejected.`,
      variant: "destructive"
    });
    setDialogOpen(false);
    setApprovalNotes('');
  };

  const openQuoteDialog = (quote: Quote) => {
    setSelectedQuote(quote);
    setDialogOpen(true);
  };

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h2 className="text-2xl font-bold text-white">Quote Approval Dashboard</h2>
          <p className="text-gray-400">Review and approve submitted quotes from sales team</p>
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
              <Card key={quote.id} className="bg-gray-900 border-gray-800 hover:border-red-500 transition-colors">
                <CardHeader>
                  <div className="flex justify-between items-start">
                    <div>
                      <CardTitle className="text-white flex items-center">
                        {quote.id} - {quote.customerName}
                        <Badge 
                          variant="outline" 
                          className={`ml-3 text-xs ${getPriorityColor(quote.priority)} border-none text-white`}
                        >
                          {quote.priority}
                        </Badge>
                        <Badge 
                          variant="outline" 
                          className={`ml-2 text-xs ${getStatusColor(quote.status)}`}
                        >
                          {quote.status.charAt(0).toUpperCase() + quote.status.slice(1).replace('-', ' ')}
                        </Badge>
                      </CardTitle>
                      <CardDescription className="text-gray-400 mt-2">
                        <div className="flex items-center space-x-4">
                          <span>Oracle: {quote.oracleCustomerId}</span>
                          <span>SFDC: {quote.sfdcOpportunity}</span>
                          <span>Items: {quote.bomItems}</span>
                        </div>
                      </CardDescription>
                    </div>
                    <div className="text-right">
                      <div className="text-2xl font-bold text-white">
                        ${quote.totalValue.toLocaleString()}
                      </div>
                      <div className="text-sm text-gray-400">
                        {quote.requestedDiscount}% discount • {quote.marginAfterDiscount}% margin
                      </div>
                      {quote.marginAfterDiscount < 25 && (
                        <div className="flex items-center text-yellow-400 text-xs mt-1">
                          <AlertTriangle className="h-3 w-3 mr-1" />
                          Low margin warning
                        </div>
                      )}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm mb-4">
                    <div>
                      <p className="text-gray-400">Submitted By</p>
                      <p className="text-white font-medium">{quote.submittedBy}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Submitted Date</p>
                      <p className="text-white font-medium">{quote.submittedDate}</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Requested Discount</p>
                      <p className="text-white font-medium">{quote.requestedDiscount}%</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Final Margin</p>
                      <p className={`font-medium ${quote.marginAfterDiscount < 25 ? 'text-yellow-400' : 'text-green-400'}`}>
                        {quote.marginAfterDiscount}%
                      </p>
                    </div>
                  </div>
                  
                  {quote.notes && (
                    <div className="mb-4">
                      <p className="text-gray-400 text-xs mb-1">Notes:</p>
                      <p className="text-gray-300 text-sm bg-gray-800 p-2 rounded">{quote.notes}</p>
                    </div>
                  )}

                  <div className="flex space-x-3">
                    <Button
                      variant="outline"
                      size="sm"
                      onClick={() => openQuoteDialog(quote)}
                      className="border-blue-600 text-blue-400 hover:bg-blue-900/20"
                    >
                      <FileText className="h-4 w-4 mr-1" />
                      Review Details
                    </Button>
                    {quote.status === 'pending' && (
                      <>
                        <Button
                          size="sm"
                          onClick={() => handleApprove(quote)}
                          className="bg-green-600 hover:bg-green-700"
                        >
                          <CheckCircle className="h-4 w-4 mr-1" />
                          Approve
                        </Button>
                        <Button
                          variant="outline"
                          size="sm"
                          onClick={() => handleReject(quote)}
                          className="border-red-600 text-red-400 hover:bg-red-900/20"
                        >
                          <XCircle className="h-4 w-4 mr-1" />
                          Reject
                        </Button>
                      </>
                    )}
                  </div>
                </CardContent>
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

      {/* Quote Details Dialog */}
      <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
        <DialogContent className="bg-gray-900 border-gray-800 max-w-2xl">
          <DialogHeader>
            <DialogTitle className="text-white">
              Quote Details - {selectedQuote?.id}
            </DialogTitle>
          </DialogHeader>
          
          {selectedQuote && (
            <div className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">Customer</Label>
                  <p className="text-white font-medium">{selectedQuote.customerName}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Total Value</Label>
                  <p className="text-white font-medium">${selectedQuote.totalValue.toLocaleString()}</p>
                </div>
              </div>
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <Label className="text-gray-400">Oracle Customer ID</Label>
                  <p className="text-white font-medium">{selectedQuote.oracleCustomerId}</p>
                </div>
                <div>
                  <Label className="text-gray-400">SFDC Opportunity</Label>
                  <p className="text-white font-medium">{selectedQuote.sfdcOpportunity}</p>
                </div>
              </div>

              <div>
                <Label htmlFor="approval-notes" className="text-white">Approval Notes</Label>
                <Textarea
                  id="approval-notes"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  className="bg-gray-800 border-gray-700 text-white mt-2"
                  placeholder="Add notes for approval/rejection..."
                  rows={3}
                />
              </div>

              <div className="flex justify-end space-x-3">
                <Button
                  variant="outline"
                  onClick={() => setDialogOpen(false)}
                  className="border-gray-600 text-gray-300"
                >
                  Close
                </Button>
                {selectedQuote.status === 'pending' && (
                  <>
                    <Button
                      onClick={() => handleReject(selectedQuote)}
                      variant="outline"
                      className="border-red-600 text-red-400 hover:bg-red-900/20"
                    >
                      <XCircle className="h-4 w-4 mr-1" />
                      Reject
                    </Button>
                    <Button
                      onClick={() => handleApprove(selectedQuote)}
                      className="bg-green-600 hover:bg-green-700"
                    >
                      <CheckCircle className="h-4 w-4 mr-1" />
                      Approve
                    </Button>
                  </>
                )}
              </div>
            </div>
          )}
        </DialogContent>
      </Dialog>
    </div>
  );
};

export default QuoteApprovalDashboard;

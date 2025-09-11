
import { useState, useEffect } from 'react';
import { getSupabaseClient, getSupabaseAdminClient, isAdminAvailable } from "@/integrations/supabase/client";

const supabase = getSupabaseClient();
const supabaseAdmin = getSupabaseAdminClient();;
import { Quote } from '@/types/quote';
import { User } from '@/types/auth';
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { Badge } from "@/components/ui/badge"
import QuoteDetails from './quote-approval/QuoteDetails';
import { RefreshCw, ChevronDown, ChevronRight, Clock, User as UserIcon, Calendar, AlertCircle } from 'lucide-react';

interface EnhancedQuoteApprovalDashboardProps {
  user: User | null;
}

interface ExpandedQuoteState {
  [quoteId: string]: boolean;
}

const EnhancedQuoteApprovalDashboard = ({ user }: EnhancedQuoteApprovalDashboardProps) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ [quoteId: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState("pending_approval");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Quote['status']>("all");
  const [expandedQuotes, setExpandedQuotes] = useState<ExpandedQuoteState>({});

  const fetchData = async () => {
    console.log('Fetching quotes for approval dashboard...');
    setLoading(true);
    try {
      const { data: quotesData, error: quotesError } = await supabase
        .from('quotes')
        .select('*')
        .order('created_at', { ascending: false });

      if (quotesError) {
        console.error('Error fetching quotes:', quotesError);
        toast({
          title: "Error",
          description: "Failed to fetch quotes. Please try again.",
          variant: "destructive",
        });
        return;
      }

      console.log(`Fetched ${quotesData?.length || 0} quotes from database`);

      // Fetch BOM items for each quote
        const quotesWithBOM = await Promise.all(
          (quotesData || []).map(async (quote) => {
            const { data: bomItems, error: bomError } = await supabase
              .from('bom_items')
              .select('*')
              .eq('quote_id', quote.id);

            if (bomError) {
              console.error(`Error fetching BOM items for quote ${quote.id}:`, bomError);
            }

            const enrichedItems = (bomItems || []).map((item) => ({
              ...item,
              product: {
                id: item.product_id,
                type: item.product_type,
                name: item.name,
                description: item.description,
                partNumber: item.part_number,
                price: item.unit_price,
                cost: item.unit_cost,
              },
            }));

            return {
              ...quote,
              bom_items: enrichedItems,
            } as Quote;
          })
        );

      console.log('Quotes with BOM items:', quotesWithBOM);
      setQuotes(quotesWithBOM);
    } catch (error) {
      console.error('Unexpected error fetching quotes:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
    } finally {
      setLoading(false);
    }
  };

  const refetch = async () => {
    await fetchData();
  };

  useEffect(() => {
    fetchData();
  }, []);

  const filteredQuotes = quotes.filter(quote => {
    const inTab =
      activeTab === "pending_approval"
        ? quote.status === "pending_approval"
        : quote.status !== "pending_approval";

    const matchesStatus =
      statusFilter === "all" ? true : quote.status === statusFilter;

    const monthString = new Date(quote.created_at)
      .toLocaleString("default", { month: "long", year: "numeric" })
      .toLowerCase();
    const q = searchQuery.toLowerCase();
    const matchesSearch =
      quote.id.toLowerCase().includes(q) ||
      quote.customer_name.toLowerCase().includes(q) ||
      monthString.includes(q);

    return inTab && matchesStatus && matchesSearch;
  });

  const handleQuoteToggle = (quoteId: string) => {
    setExpandedQuotes(prev => ({
      ...prev,
      [quoteId]: !prev[quoteId]
    }));
    
    const quote = quotes.find(q => q.id === quoteId);
    if (quote && !expandedQuotes[quoteId]) {
      setSelectedQuote(quote);
    } else if (expandedQuotes[quoteId]) {
      setSelectedQuote(null);
    }
  };

  const handleQuoteAction = async (
    quoteId: string,
    action: 'approve' | 'reject',
    notes?: string,
    updatedBOMItems?: any[]
  ) => {
    console.log(`Processing ${action} for quote ${quoteId} with notes:`, notes);
    setActionLoading(prev => ({ ...prev, [quoteId]: true }));
    
    try {
      const updates: any = {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (action === 'approve') {
        updates.approval_notes = notes || '';
      } else if (action === 'reject') {
        updates.rejection_reason = notes || '';
      }

      if (updatedBOMItems && updatedBOMItems.length > 0) {
        const { error: quoteError } = await supabase
          .from('quotes')
          .update(updates)
          .eq('id', quoteId);

        if (quoteError) throw quoteError;

        for (const item of updatedBOMItems) {
          const { error: bomError } = await supabase
            .from('bom_items')
            .update({
              approved_unit_price: item.unit_price,
              total_price: item.unit_price * item.quantity,
              margin: item.margin
            })
            .eq('id', item.id);

          if (bomError) throw bomError;
        }
      } else {
        const { error } = await supabase
          .from('quotes')
          .update(updates)
          .eq('id', quoteId);

        if (error) throw error;
      }

      toast({
        title: "Success",
        description: `Quote ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      });

      await refetch();
      
    } catch (error) {
      console.error(`Error ${action}ing quote:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} quote. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setActionLoading(prev => ({ ...prev, [quoteId]: false }));
    }
  };

  const getAgingDays = (createdAt: string) => {
    const created = new Date(createdAt);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - created.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  };

  const getStatusBadge = (status: string) => {
    switch (status) {
      case 'approved':
        return <Badge className="bg-green-600 text-white">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600 text-white">Rejected</Badge>;
      case 'pending_approval':
        return <Badge className="bg-yellow-600 text-white">Pending Approval</Badge>;
      default:
        return <Badge className="bg-gray-600 text-white">Unknown</Badge>;
    }
  };

  const getPriorityColor = (priority: string) => {
    switch (priority.toLowerCase()) {
      case 'urgent':
        return 'text-red-400';
      case 'high':
        return 'text-orange-400';
      case 'medium':
        return 'text-yellow-400';
      default:
        return 'text-green-400';
    }
  };

  console.log('Current quotes state:', quotes);
  console.log('Filtered quotes for tab:', activeTab, filteredQuotes);

  return (
    <div className="w-full max-w-none p-6 space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-semibold text-white mb-2">Quote Approval Dashboard</h1>
          <p className="text-gray-400">Manage and review quote requests with enhanced workflow</p>
        </div>
        <Button variant="outline" disabled={loading} onClick={refetch}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
        <TabsList className="w-full justify-start bg-gray-800">
          <TabsTrigger value="pending_approval" className="text-white data-[state=active]:bg-red-600">
            Pending Queue ({quotes.filter(q => q.status === 'pending_approval').length})
          </TabsTrigger>
          <TabsTrigger value="reviewed" className="text-white data-[state=active]:bg-red-600">
            History ({quotes.filter(q => q.status !== 'pending_approval').length})
          </TabsTrigger>
        </TabsList>

        <div className="flex space-x-4 my-4">
          <Input
            placeholder="Search by ID, customer, or month..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="flex-1 bg-gray-800 border-gray-700 text-white"
          />
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value as any)}
            className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2"
          >
            <option value="all">All Statuses</option>
            <option value="pending_approval">Pending Approval</option>
            <option value="approved">Approved</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>

        <TabsContent value="pending_approval" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-white">Loading quotes...</div>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-8 text-center">
                <div className="text-gray-400">No pending quotes found</div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredQuotes.map((quote) => (
                <div key={quote.id} className="space-y-0">
                  {/* Quote Header Row */}
                  <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                    <CardContent className="p-4">
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => handleQuoteToggle(quote.id)}
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="flex items-center space-x-2">
                            {expandedQuotes[quote.id] ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                            <div className="font-mono text-white font-medium">
                              {quote.id}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium truncate">
                              {quote.customer_name}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {quote.sfdc_opportunity}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-sm text-gray-400">
                            <UserIcon className="h-4 w-4" />
                            <span>{quote.submitted_by_name}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-sm text-gray-400">
                            <Clock className="h-4 w-4" />
                            <span>{getAgingDays(quote.created_at)} days</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(quote.status)}
                            <Badge className={`${getPriorityColor(quote.priority)} border-current`} variant="outline">
                              {quote.priority}
                            </Badge>
                          </div>
                          
                          <div className="text-white font-bold">
                            ${quote.discounted_value.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {/* Expanded Quote Details */}
                  {expandedQuotes[quote.id] && selectedQuote?.id === quote.id && (
                    <Card className="bg-gray-800 border-gray-700 ml-6">
                      <CardContent className="p-6">
                        <QuoteDetails
                          quote={selectedQuote}
                          onApprove={(notes, updatedBOMItems) => handleQuoteAction(quote.id, 'approve', notes, updatedBOMItems)}
                          onReject={notes => handleQuoteAction(quote.id, 'reject', notes)}
                          isLoading={actionLoading[quote.id] || false}
                          user={user}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="reviewed" className="space-y-4">
          {loading ? (
            <div className="flex items-center justify-center h-64">
              <div className="text-white">Loading quotes...</div>
            </div>
          ) : filteredQuotes.length === 0 ? (
            <Card className="bg-gray-900 border-gray-800">
              <CardContent className="p-8 text-center">
                <div className="text-gray-400">No reviewed quotes found</div>
              </CardContent>
            </Card>
          ) : (
            <div className="space-y-3">
              {filteredQuotes.map((quote) => (
                <div key={quote.id} className="space-y-0">
                  <Card className="bg-gray-900 border-gray-800 hover:border-gray-700 transition-colors">
                    <CardContent className="p-4">
                      <div 
                        className="flex items-center justify-between cursor-pointer"
                        onClick={() => handleQuoteToggle(quote.id)}
                      >
                        <div className="flex items-center space-x-4 flex-1">
                          <div className="flex items-center space-x-2">
                            {expandedQuotes[quote.id] ? (
                              <ChevronDown className="h-4 w-4 text-gray-400" />
                            ) : (
                              <ChevronRight className="h-4 w-4 text-gray-400" />
                            )}
                            <div className="font-mono text-white font-medium">
                              {quote.id}
                            </div>
                          </div>
                          
                          <div className="flex-1 min-w-0">
                            <div className="text-white font-medium truncate">
                              {quote.customer_name}
                            </div>
                            <div className="text-gray-400 text-sm">
                              {quote.sfdc_opportunity}
                            </div>
                          </div>
                          
                          <div className="flex items-center space-x-2 text-sm text-gray-400">
                            <Calendar className="h-4 w-4" />
                            <span>{new Date(quote.reviewed_at || quote.updated_at).toLocaleDateString()}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            {getStatusBadge(quote.status)}
                          </div>
                          
                          <div className="text-white font-bold">
                            ${quote.discounted_value.toLocaleString()}
                          </div>
                        </div>
                      </div>
                    </CardContent>
                  </Card>
                  
                  {expandedQuotes[quote.id] && selectedQuote?.id === quote.id && (
                    <Card className="bg-gray-800 border-gray-700 ml-6">
                      <CardContent className="p-6">
                        <QuoteDetails
                          quote={selectedQuote}
                          onApprove={(notes, updatedBOMItems) => handleQuoteAction(quote.id, 'approve', notes, updatedBOMItems)}
                          onReject={notes => handleQuoteAction(quote.id, 'reject', notes)}
                          isLoading={actionLoading[quote.id] || false}
                          user={user}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
              ))}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedQuoteApprovalDashboard;

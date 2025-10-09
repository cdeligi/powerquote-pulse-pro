
import { useState, useEffect } from 'react';
import type { PostgrestError } from '@supabase/supabase-js';
import { getSupabaseClient, getSupabaseAdminClient } from "@/integrations/supabase/client";
import { normalizeQuoteId, persistNormalizedQuoteId } from '@/utils/quoteIdGenerator';
import { deriveCustomerNameFromFields } from "@/utils/customerName";
import {
  extractAdditionalQuoteInformation,
  parseQuoteFieldsValue,
  updateQuoteWithAdditionalInfo,
} from '@/utils/additionalQuoteInformation';

const supabase = getSupabaseClient();
const supabaseAdmin = getSupabaseAdminClient();
import { Quote, BOMItemWithDetails } from '@/types/quote';
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

const resolveCustomerName = (
  fields: Record<string, any> | undefined,
  fallback: string | null | undefined,
): string => {
  const derived = deriveCustomerNameFromFields(fields ?? undefined, fallback ?? null);
  if (derived && derived.trim().length > 0) {
    return derived.trim();
  }

  if (fallback && fallback.trim().length > 0) {
    return fallback.trim();
  }

  return 'Pending Customer';
};

const EnhancedQuoteApprovalDashboard = ({ user }: EnhancedQuoteApprovalDashboardProps) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ [quoteId: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState("pending_approval");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | Quote['status']>("all");
  const [expandedQuotes, setExpandedQuotes] = useState<ExpandedQuoteState>({});

  const fetchData = async (): Promise<Quote[]> => {
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
        return [];
      }

      console.log(`Fetched ${quotesData?.length || 0} quotes from database`);

      // Fetch BOM items for each quote
      const quotesWithBOM = await Promise.all(
        (quotesData || []).map(async (quote) => {
          const normalizedFields = parseQuoteFieldsValue(quote.quote_fields) ?? undefined;
          const additionalInfo = extractAdditionalQuoteInformation(quote, normalizedFields);
          const resolvedCustomer = resolveCustomerName(normalizedFields, quote.customer_name);

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
            customer_name: resolvedCustomer,
            quote_fields: normalizedFields ?? undefined,
            additional_quote_information: additionalInfo ?? null,
            bom_items: enrichedItems,
          } as Quote;
        })
      );

      console.log('Quotes with BOM items:', quotesWithBOM);
      setQuotes(quotesWithBOM);
      return quotesWithBOM;
    } catch (error) {
      console.error('Unexpected error fetching quotes:', error);
      toast({
        title: "Error",
        description: "An unexpected error occurred. Please try again.",
        variant: "destructive",
      });
      return [];
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
    payload: {
      notes?: string;
      updatedBOMItems?: BOMItemWithDetails[];
      approvedDiscount?: number;
      additionalQuoteInformation?: string;
    } = {}
  ) => {
    const { notes, updatedBOMItems, approvedDiscount, additionalQuoteInformation } = payload;
    console.log(`Processing ${action} for quote ${quoteId} with notes:`, notes);
    setActionLoading(prev => ({ ...prev, [quoteId]: true }));

    let targetQuoteId = quoteId;

    try {
      const client = supabaseAdmin ?? supabase;
      const quote = quotes.find(q => q.id === quoteId);

      if (action === 'approve' && quote) {
        const normalizedQuoteId = normalizeQuoteId(quote.id);

        if (normalizedQuoteId && normalizedQuoteId !== quote.id) {
          try {
            await persistNormalizedQuoteId(quote.id, normalizedQuoteId, client);
            targetQuoteId = normalizedQuoteId;

            setQuotes(prevQuotes => prevQuotes.map(current => (
              current.id === quoteId
                ? { ...current, id: normalizedQuoteId }
                : current
            )));

            setActionLoading(prev => {
              const updated = { ...prev };
              delete updated[quoteId];
              updated[normalizedQuoteId] = true;
              return updated;
            });
          } catch (normalizationError) {
            console.warn('Failed to normalize quote id during approval:', normalizationError);
            toast({
              title: 'Quote ID normalization skipped',
              description: 'The quote kept its original identifier because it is still referenced elsewhere.',
            });
          }
        }
      }

      const appliedDiscount =
        typeof approvedDiscount === 'number'
          ? approvedDiscount
          : quote?.approved_discount ?? quote?.requested_discount ?? 0;

      const isoNow = new Date().toISOString();

      const updates: Record<string, any> = {
        status: action === 'approve' ? 'approved' : 'rejected',
        reviewed_at: isoNow,
        updated_at: isoNow
      };

      if (user?.id) {
        updates.reviewed_by = user.id;
      }

      if (action === 'approve') {
        updates.approval_notes = notes?.trim() ? notes.trim() : null;
        updates.rejection_reason = null;
      } else if (action === 'reject') {
        updates.rejection_reason = notes?.trim() ? notes.trim() : null;
        updates.approval_notes = null;
      }

      if (action === 'approve') {
        updates.approved_discount = appliedDiscount;
      }

      const preparedUpdates: Record<string, any> = { ...updates };

      const bomItemsForTotals = (updatedBOMItems && updatedBOMItems.length > 0)
        ? updatedBOMItems
        : ((quote?.bom_items as BOMItemWithDetails[] | undefined) ?? []);

      if (bomItemsForTotals.length > 0) {
        const totalRevenue = bomItemsForTotals.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
        const totalCost = bomItemsForTotals.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);
        const grossProfit = totalRevenue - totalCost;
        const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        const normalizedDiscount = Math.abs(appliedDiscount) <= 1 ? appliedDiscount * 100 : appliedDiscount;
        const discountFraction = normalizedDiscount / 100;
        const discountedValue = totalRevenue - (totalRevenue * discountFraction);
        const discountedGrossProfit = discountedValue - totalCost;
        const discountedMargin = discountedValue > 0 ? (discountedGrossProfit / discountedValue) * 100 : 0;

        preparedUpdates.total_cost = totalCost;
        preparedUpdates.gross_profit = grossProfit;
        preparedUpdates.original_quote_value = totalRevenue;
        preparedUpdates.original_margin = margin;
        preparedUpdates.discounted_value = discountedValue;
        preparedUpdates.discounted_margin = discountedMargin;
      }

      const { error: quoteError } = await updateQuoteWithAdditionalInfo({
        client,
        quote: quote ?? {},
        quoteId: targetQuoteId,
        updates: preparedUpdates,
        additionalInfo: action === 'approve' ? additionalQuoteInformation : null,
      });

      if (quoteError) throw quoteError;

      let bomUpdateError: PostgrestError | null = null;

      if (updatedBOMItems && updatedBOMItems.length > 0) {
        const persistedItems = updatedBOMItems.filter((item) => item.persisted_id);
        const safeQuoteId = typeof targetQuoteId === 'string' ? targetQuoteId.trim() : '';

        if (persistedItems.length > 0 && safeQuoteId) {
          const bomPayload = persistedItems.map((item) => {
            const updatedUnitPrice = Number(item.unit_price) || 0;
            const unitCost = item.unit_cost || 0;
            const totalPrice = updatedUnitPrice * item.quantity;
            const totalCost = unitCost * item.quantity;
            return {
              id: item.persisted_id!,
              quote_id: safeQuoteId,
              unit_price: updatedUnitPrice,
              approved_unit_price: updatedUnitPrice,
              total_price: totalPrice,
              total_cost: totalCost,
              margin: updatedUnitPrice > 0
                ? ((updatedUnitPrice - unitCost) / updatedUnitPrice) * 100
                : 0,
              updated_at: isoNow,
            };
          });

          const updateResults = await Promise.all(
            bomPayload.map(async ({ id, ...rest }) => {
              const { error } = await client
                .from('bom_items')
                .update(rest)
                .eq('id', id)
                .eq('quote_id', safeQuoteId);

              if (error) {
                console.error(
                  'Error updating BOM item price data',
                  { quoteId: targetQuoteId, bomItemId: id },
                  error,
                );
              }

              return error;
            })
          );

          bomUpdateError = updateResults.find((result): result is PostgrestError => Boolean(result)) ?? null;
        } else if (!safeQuoteId) {
          console.warn(
            'Skipping BOM price update because the resolved quote id is empty.',
            { originalQuoteId: quoteId, resolvedQuoteId: targetQuoteId }
          );
        }
      }

      toast({
        title: bomUpdateError ? "Quote approved with warnings" : "Success",
        description: bomUpdateError
          ? "Quote approved, but some BOM price updates may not have been saved. Please verify the bill of materials."
          : `Quote ${action === 'approve' ? 'approved' : 'rejected'} successfully`,
      });

      const refreshedQuotes = await fetchData();
      const refreshedQuote = refreshedQuotes.find(q => q.id === targetQuoteId);
      if (refreshedQuote) {
        setSelectedQuote(refreshedQuote);
      }

    } catch (error) {
      console.error(`Error ${action}ing quote:`, error);
      toast({
        title: "Error",
        description: `Failed to ${action} quote. Please try again.`,
        variant: "destructive",
      });
    } finally {
      setActionLoading(prev => {
        const updated = { ...prev, [targetQuoteId]: false };
        if (targetQuoteId !== quoteId) {
          delete updated[quoteId];
        }
        return updated;
      });
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
                          onApprove={(payload) => handleQuoteAction(quote.id, 'approve', payload)}
                          onReject={notes => handleQuoteAction(quote.id, 'reject', { notes })}
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
                          onApprove={(payload) => handleQuoteAction(quote.id, 'approve', payload)}
                          onReject={notes => handleQuoteAction(quote.id, 'reject', { notes })}
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

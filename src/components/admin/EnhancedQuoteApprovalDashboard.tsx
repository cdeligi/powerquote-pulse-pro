
import { useState, useEffect } from 'react';
import { supabase } from '@/integrations/supabase/client';
import { Quote } from '@/types/quote';
import { User } from '@/types/auth';
import { toast } from "@/hooks/use-toast"
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs"
import { Button } from "@/components/ui/button"
import QuoteTable from './quote-approval/QuoteTable';
import QuoteDetails from './quote-approval/QuoteDetails';
import { RefreshCw } from 'lucide-react';

interface EnhancedQuoteApprovalDashboardProps {
  user: User | null;
}

const EnhancedQuoteApprovalDashboard = ({ user }: EnhancedQuoteApprovalDashboardProps) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ [quoteId: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState("pending_approval");

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

          return {
            ...quote,
            bom_items: bomItems || []
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
    if (activeTab === "pending_approval") {
      return quote.status === 'pending_approval';
    } else {
      return quote.status !== 'pending_approval';
    }
  });

  const handleQuoteSelect = (quote: Quote) => {
    console.log('Selected quote:', quote);
    setSelectedQuote(quote);
  };

  const handleQuoteAction = async (
    quoteId: string,
    action: 'approve' | 'reject' | 'counter_offer',
    notes?: string,
    updatedBOMItems?: any[]
  ) => {
    console.log(`Processing ${action} for quote ${quoteId} with notes:`, notes);
    setActionLoading(prev => ({ ...prev, [quoteId]: true }));
    
    try {
      const updates: any = {
        status: action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'counter_offered',
        reviewed_by: user?.id,
        reviewed_at: new Date().toISOString(),
        updated_at: new Date().toISOString()
      };

      if (action === 'approve') {
        updates.approval_notes = notes || '';
      } else if (action === 'reject') {
        updates.rejection_reason = notes || '';
      } else if (action === 'counter_offer') {
        updates.approval_notes = notes || '';
        // Add counter offer to the counter_offers array
        const existingCounterOffers = quotes.find(q => q.id === quoteId)?.counter_offers || [];
        updates.counter_offers = [
          ...existingCounterOffers,
          {
            id: Date.now().toString(),
            notes: notes || '',
            created_at: new Date().toISOString(),
            created_by: user?.id
          }
        ];
      }

      // Update BOM items if provided
      if (updatedBOMItems && updatedBOMItems.length > 0) {
        // First update the quote
        const { error: quoteError } = await supabase
          .from('quotes')
          .update(updates)
          .eq('id', quoteId);

        if (quoteError) throw quoteError;

        // Then update BOM items
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
        // Just update the quote
        const { error } = await supabase
          .from('quotes')
          .update(updates)
          .eq('id', quoteId);

        if (error) throw error;
      }

      // Show success message
      toast({
        title: "Success",
        description: `Quote ${action === 'approve' ? 'approved' : action === 'reject' ? 'rejected' : 'counter offered'} successfully`,
      });

      // Refresh quotes to show updated status
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

  console.log('Current quotes state:', quotes);
  console.log('Filtered quotes for tab:', activeTab, filteredQuotes);

  return (
    <div className="container mx-auto p-6">
      <h1 className="text-3xl font-semibold text-white mb-6">Quote Approval Dashboard</h1>

      <Tabs value={activeTab} onValueChange={setActiveTab} className="mb-4">
        <TabsList>
          <TabsTrigger value="pending_approval">
            Pending Quotes ({quotes.filter(q => q.status === 'pending_approval').length})
          </TabsTrigger>
          <TabsTrigger value="reviewed">
            Reviewed Quotes ({quotes.filter(q => q.status !== 'pending_approval').length})
          </TabsTrigger>
        </TabsList>
      </Tabs>

      <div className="mb-4 flex items-center justify-between">
        <h2 className="text-2xl text-gray-300">
          {activeTab === "pending_approval" ? "Pending Quotes" : "Reviewed Quotes"}
        </h2>
        <Button variant="outline" disabled={loading} onClick={refetch}>
          <RefreshCw className={`mr-2 h-4 w-4 ${loading ? 'animate-spin' : ''}`} />
          {loading ? "Loading..." : "Refresh"}
        </Button>
      </div>

      <div className={`grid grid-cols-1 gap-6 ${selectedQuote ? 'lg:grid-cols-1' : 'lg:grid-cols-2'}`}>
        {selectedQuote ? (
          <>
            {/* Quote Details and Actions */}
            <div className="lg:col-span-1">
              <QuoteDetails
                quote={selectedQuote}
                onApprove={(notes, updatedBOMItems) => handleQuoteAction(selectedQuote.id, 'approve', notes, updatedBOMItems)}
                onReject={notes => handleQuoteAction(selectedQuote.id, 'reject', notes)}
                onCounterOffer={notes => handleQuoteAction(selectedQuote.id, 'counter_offer', notes)}
                isLoading={actionLoading[selectedQuote.id] || false}
                user={user}
              />
            </div>

            {/* Quote List placed below when a quote is selected */}
            <div className="lg:col-span-1">
              <QuoteTable
                quotes={filteredQuotes}
                loading={loading}
                onQuoteSelect={handleQuoteSelect}
              />
            </div>
          </>
        ) : (
          <>
            {/* Quote List */}
            <div className="lg:col-span-1">
              <QuoteTable
                quotes={filteredQuotes}
                loading={loading}
                onQuoteSelect={handleQuoteSelect}
              />
            </div>

            {/* Prompt to select a quote */}
            <div className="lg:col-span-1">
              <div className="bg-gray-900 border-gray-800 rounded-md p-4 text-gray-400 text-center">
                Select a quote to view details and take action.
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default EnhancedQuoteApprovalDashboard;

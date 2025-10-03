
import { User } from "@/types/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, FileText, Eye, Download, ExternalLink, Edit, Share, Plus, Trash, Copy } from "lucide-react";
import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import { useQuotes } from "@/hooks/useQuotes";
import { toast } from "@/hooks/use-toast";
import { QuoteShareDialog } from './QuoteShareDialog';
import { supabase } from "@/integrations/supabase/client";
import {
  deserializeSlotAssignments,
  buildRackLayoutFromAssignments,
  type SerializedSlotAssignment,
} from '@/utils/slotAssignmentUtils';

interface QuoteManagerProps {
  user: User;
}

const QuoteManager = ({ user }: QuoteManagerProps) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'High' | 'Medium' | 'Low' | 'Draft'>('All');
  const { quotes, loading, error, fetchQuotes } = useQuotes();
  
  // Loading states for individual operations
  const [loadingOperations, setLoadingOperations] = useState<Record<string, boolean>>({});
  
  // Fetch BOM item count for each quote
  const [bomCounts, setBomCounts] = useState<Record<string, number>>({});

  useEffect(() => {
    fetchQuotes();
  }, []);

  const normalizePercentage = (value?: number | null) => {
    if (value === null || value === undefined) {
      return 0;
    }

    const absolute = Math.abs(value);
    if (absolute > 0 && absolute <= 1) {
      return value * 100;
    }

    return value;
  };

  // Filter and process quotes with real BOM item counts
  const processedQuotes = quotes.map(quote => {
    const currency = quote.currency || 'USD';
    const isDraftQuote = quote.status === 'draft';

    const originalValue = isDraftQuote && quote.draft_bom?.items
      ? quote.draft_bom.items.reduce((sum: number, item: any) =>
          sum + ((item.unit_price || item.total_price || item.product?.price || 0) * (item.quantity || 1)), 0)
      : (quote.original_quote_value || 0);

    const normalizedRequestedDiscount = normalizePercentage(quote.requested_discount);
    const normalizedApprovedDiscount = typeof quote.approved_discount === 'number'
      ? normalizePercentage(quote.approved_discount)
      : undefined;

    const effectiveDiscountPercent = typeof normalizedApprovedDiscount === 'number'
      ? normalizedApprovedDiscount
      : normalizedRequestedDiscount;

    const hasEffectivePercent = effectiveDiscountPercent > 0;

    const discountedValueFromQuote = typeof quote.discounted_value === 'number' && quote.discounted_value > 0
      ? quote.discounted_value
      : undefined;

    const derivedFinalValue = discountedValueFromQuote !== undefined
      ? discountedValueFromQuote
      : hasEffectivePercent
        ? originalValue * (1 - (effectiveDiscountPercent / 100))
        : originalValue;

    const finalValue = Number.isFinite(derivedFinalValue)
      ? Math.max(derivedFinalValue, 0)
      : originalValue;

    const discountAmount = Math.max(originalValue - finalValue, 0);
    const hasDiscount = discountAmount > 0.01 || effectiveDiscountPercent > 0.01;
    const displayDiscountPercent = hasDiscount ? effectiveDiscountPercent : 0;

    return {
      id: quote.id, // Use unique ID for React key
      displayId: quote.id, // Keep original ID for operations
      displayLabel: isDraftQuote ? 'Draft' : quote.id, // Label to show in UI
      customer: quote.customer_name || 'Unnamed Customer',
      oracleCustomerId: quote.oracle_customer_id || 'N/A',
      currency,
      value: originalValue,
      finalValue,
      discountAmount,
      requestedDiscountPercent: normalizedRequestedDiscount,
      approvedDiscountPercent: normalizedApprovedDiscount,
      displayDiscountPercent,
      status: quote.status,
      priority: quote.priority,
      createdAt: new Date(quote.created_at).toLocaleDateString(),
      updatedAt: new Date(quote.updated_at).toLocaleDateString(),
      items: bomCounts[quote.id] || 0,
      hasDiscount,
      pdfUrl: quote.status === 'draft' ? null : `/quotes/${quote.id}.pdf`
    };
  });

  useEffect(() => {
    const fetchBOMCounts = async () => {
      if (quotes.length > 0) {
        const counts: Record<string, number> = {};
        
        // Batch process quotes for better performance
        quotes.forEach(quote => {
          try {
            // For draft quotes, check draft_bom data first
            if (quote.status === 'draft' && quote.draft_bom && quote.draft_bom.items && Array.isArray(quote.draft_bom.items)) {
              counts[quote.id] = quote.draft_bom.items.length;
            } else {
              // For non-draft quotes, we'll fetch from database
              counts[quote.id] = 0; // Default to 0, will be updated below
            }
          } catch (err) {
            console.error(`Error processing quote ${quote.id}:`, err);
            counts[quote.id] = 0;
          }
        });

        // Batch fetch BOM counts for non-draft quotes
        const nonDraftQuotes = quotes.filter(q => q.status !== 'draft');
        if (nonDraftQuotes.length > 0) {
          try {
            const quoteIds = nonDraftQuotes.map(q => q.id);
            const { data: bomData, error } = await supabase
              .from('bom_items')
              .select('quote_id, id')
              .in('quote_id', quoteIds);

            if (!error && bomData) {
              // Count items per quote
              bomData.forEach(item => {
                counts[item.quote_id] = (counts[item.quote_id] || 0) + 1;
              });
            }
          } catch (err) {
            console.error('Error batch fetching BOM counts:', err);
          }
        }
        
        setBomCounts(counts);
      }
    };

    fetchBOMCounts();
  }, [quotes]);

  const getStatusBadge = (status: string) => {
    const statusConfig = {
      draft: { color: 'bg-gray-600', text: 'Draft' },
      pending_approval: { color: 'bg-yellow-600', text: 'Pending Approval' },
      approved: { color: 'bg-green-600', text: 'Approved' },
      rejected: { color: 'bg-red-600', text: 'Rejected' },
      finalized: { color: 'bg-blue-600', text: 'Finalized' }
    };
    return statusConfig[status as keyof typeof statusConfig] || statusConfig.draft;
  };

  const getPriorityBadge = (priority: string) => {
    const priorityConfig = {
      High: { color: 'bg-red-600 border-red-600', text: 'High' },
      Medium: { color: 'bg-yellow-600 border-yellow-600', text: 'Medium' },
      Low: { color: 'bg-green-600 border-green-600', text: 'Low' }
    };
    return priorityConfig[priority as keyof typeof priorityConfig] || priorityConfig.Medium;
  };

  const filteredQuotes = processedQuotes.filter(quote => {
    const matchesSearch = quote.customer.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.id.toLowerCase().includes(searchTerm.toLowerCase()) ||
                         quote.oracleCustomerId.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesPriority = priorityFilter === 'All' || 
                           (priorityFilter === 'Draft' && quote.status === 'draft') ||
                           (priorityFilter !== 'Draft' && quote.priority === priorityFilter);
    return matchesSearch && matchesPriority;
  });

  const handleDeleteQuote = async (quoteId: string) => {
    const confirmDelete = window.confirm('Are you sure you want to delete this draft quote? This action cannot be undone.');
    
    if (!confirmDelete) return;
    
    try {
      console.log('Deleting draft quote:', quoteId);
      
      // First, verify the quote exists and is a draft
      const { data: quoteCheck, error: checkError } = await supabase
        .from('quotes')
        .select('id, status, user_id')
        .eq('id', quoteId)
        .maybeSingle();
        
      if (checkError) {
        console.error('Error checking quote:', checkError);
        throw checkError;
      }
      
      if (!quoteCheck) {
        throw new Error(`Quote ${quoteId} not found`);
      }
      
      if (quoteCheck.status !== 'draft') {
        throw new Error('Only draft quotes can be deleted');
      }
      
      console.log('Quote verified, proceeding with deletion:', quoteCheck);
      
      // Delete BOM items first
      const { error: bomError } = await supabase
        .from('bom_items')
        .delete()
        .eq('quote_id', quoteId);
        
      if (bomError) {
        console.error('Error deleting BOM items:', bomError);
        throw bomError;
      }
      
      console.log('BOM items deleted successfully');
      
      // Delete the quote
      const { error: quoteError } = await supabase
        .from('quotes')
        .delete()
        .eq('id', quoteId)
        .eq('status', 'draft'); // Extra safety check
        
      if (quoteError) {
        console.error('Error deleting quote:', quoteError);
        throw quoteError;
      }
      
      console.log('Quote deleted successfully');
      
      toast({
        title: "Quote Deleted",
        description: "Draft quote has been deleted successfully.",
      });
      
      // Refresh the quote list
      fetchQuotes();
    } catch (error: any) {
      console.error('Error deleting quote:', error);
      toast({
        title: "Error",
        description: error.message || "Failed to delete quote. Please try again.",
        variant: "destructive"
      });
    }
  };

  const canSeePrices = user.role !== 'LEVEL_1';

  const handleViewPDF = async (quote: any) => {
    try {
      // Use displayId which contains the actual database ID
      const actualQuoteId = quote.displayId || quote.id;
      
      // Get the actual quote data for PDF generation
      const { data: fullQuote, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', actualQuoteId)
        .single();

      if (error) throw error;

      let bomItems: any[] = [];
      
      // Get BOM items
      if (fullQuote.status === 'draft' && fullQuote.draft_bom?.items) {
        bomItems = fullQuote.draft_bom.items.map((item: any) => {
          const productPrice = item.unit_price || item.product?.price || 0;
          const storedSlotAssignments = item.slotAssignments as SerializedSlotAssignment[] | undefined;
          const slotAssignments = deserializeSlotAssignments(storedSlotAssignments);
          const rackLayout = item.rackConfiguration || buildRackLayoutFromAssignments(storedSlotAssignments);

          return {
            id: item.id || crypto.randomUUID(),
            product: {
              name: item.name || item.product?.name || 'Unknown Product',
              description: item.description || item.product?.description || '',
              price: productPrice
            },
            quantity: item.quantity || 1,
            enabled: item.enabled !== false,
            partNumber: item.partNumber || item.part_number || 'TBD',
            slotAssignments,
            rackConfiguration: rackLayout,
            level4Config: item.level4Config || null,
            level4Selections: item.level4Selections || null,
          };
        });
      } else {
        const { data: bomData, error: bomError } = await supabase
          .from('bom_items')
          .select(`
            *,
            bom_level4_values (
              id,
              level4_config_id,
              entries
            )
          `)
          .eq('quote_id', quote.id);

        if (bomError) throw bomError;

        bomItems = (bomData || []).map(item => {
          const configData = item.configuration_data || {};
          const storedSlotAssignments = configData.slotAssignments as SerializedSlotAssignment[] | undefined;
          const slotAssignments = deserializeSlotAssignments(storedSlotAssignments);
          const rackLayout = configData.rackConfiguration || buildRackLayoutFromAssignments(storedSlotAssignments);

          const relationLevel4 = Array.isArray(item.bom_level4_values) && item.bom_level4_values.length > 0
            ? {
                level4_config_id: item.bom_level4_values[0].level4_config_id,
                entries: item.bom_level4_values[0].entries,
              }
            : null;

          const normalizedLevel4Config = (() => {
            const direct = configData.level4Config as any;

            const mergeWithRelation = (candidate: any) => {
              if (!relationLevel4) return candidate;

              const templateType = candidate?.template_type ?? candidate?.templateType ?? candidate?.mode
                ?? configData.level4Config?.template_type
                ?? configData.level4Config?.templateType
                ?? configData.level4Config?.mode;

              const relationEntries = relationLevel4.entries;
              const candidateEntries = candidate?.entries;
              const relationHasEntries = Array.isArray(relationEntries)
                ? relationEntries.length > 0
                : relationEntries !== undefined && relationEntries !== null && relationEntries !== '';
              const candidateHasEntries = Array.isArray(candidateEntries)
                ? candidateEntries.length > 0
                : candidateEntries !== undefined && candidateEntries !== null && candidateEntries !== '';

              const merged: any = {
                ...relationLevel4,
                ...candidate,
              };

              if (candidateHasEntries && (!relationHasEntries || Array.isArray(candidateEntries))) {
                merged.entries = candidateEntries;
              }

              if (templateType) {
                merged.template_type = templateType;
              }

              return merged;
            };

            if (direct && typeof direct === 'object' && !Array.isArray(direct)) {
              if (!('level4_config_id' in direct) && relationLevel4) {
                return mergeWithRelation(direct);
              }
              return direct;
            }

            if (Array.isArray(direct) || typeof direct === 'string') {
              const candidate = direct ? { entries: direct } : null;
              return candidate ? mergeWithRelation(candidate) : relationLevel4;
            }

            if (relationLevel4) {
              return relationLevel4;
            }

            return null;
          })();

          return {
            id: item.id,
            product: {
              name: item.name,
              description: item.description || '',
              price: item.unit_price
            },
            quantity: item.quantity,
            enabled: true,
            partNumber: item.part_number || 'TBD',
            slotAssignments,
            rackConfiguration: rackLayout,
            level4Config: normalizedLevel4Config,
            level4Selections: configData.level4Selections || null,
          };
        });
      }

      // Import and use the PDF generator
      const { generateQuotePDF } = await import('@/utils/pdfGenerator');
      await generateQuotePDF(bomItems, fullQuote, canSeePrices);
      
      toast({
        title: "PDF Generated",
        description: `Quote PDF for ${quote.customer} opened successfully`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Generation Failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive"
      });
    }
  };

  const handleDownloadQuote = async (quote: any) => {
    // Same as view PDF - the generateQuotePDF function opens a print dialog
    // which allows users to save as PDF or print
    await handleViewPDF(quote);
  };

  const handleViewQuote = async (quote: any) => {
    // Use displayId which contains the actual database ID
    const actualQuoteId = quote.displayId || quote.id;
    console.log('Opening quote:', actualQuoteId, 'with status:', quote.status);
    
    // Set loading state for this quote
    setLoadingOperations(prev => ({ ...prev, [actualQuoteId]: true }));
    
    toast({
      title: "Opening Quote",
      description: `Loading quote ${quote.id}...`,
    });
    
    try {
      // Add a small delay to show loading state
      await new Promise(resolve => setTimeout(resolve, 500));
      
      // All quotes open in BOM Builder mode for viewing/editing
      if (quote.status === 'draft') {
        // Draft quotes open in edit mode
        navigate(`/bom-edit/${actualQuoteId}`);
      } else {
        // Non-draft quotes also open in BOM Builder for viewing
        navigate(`/bom-edit/${actualQuoteId}`);
      }
    } finally {
      // Clear loading state
      setLoadingOperations(prev => ({ ...prev, [actualQuoteId]: false }));
    }
  };

  const handleCloneQuote = async (quote: any) => {
    if (!user?.id) {
      toast({
        title: 'Error',
        description: 'Unable to clone quote. Please try again.',
        variant: 'destructive'
      });
      return;
    }

    try {
      // Use displayId which contains the actual database ID
      const actualQuoteId = quote.displayId || quote.id;
      
      const { data: newQuoteId, error } = await supabase
        .rpc('clone_quote', {
          source_quote_id: actualQuoteId,
          new_user_id: user.id
        });

      if (error) {
        throw new Error(error.message);
      }

      toast({
        title: 'Quote Cloned',
        description: `Successfully created new draft quote ${newQuoteId}`,
      });

      // Navigate to the new cloned quote in edit mode
      navigate(`/bom-edit/${newQuoteId}`);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to clone quote';
      toast({
        title: 'Clone Failed',
        description: errorMessage,
        variant: 'destructive'
      });
    }
  };

  const handleNewQuote = () => {
    // Navigate to the new BOM builder route
    navigate('/bom-new');
  };

  const formatCurrency = (value: number, currency: string) => {
    const normalizedCurrency = typeof currency === 'string' ? currency.trim().toUpperCase() : '';
    const fallbackCurrency = 'USD';
    const amount = Number.isFinite(value) ? value : 0;

    const createFormatter = (code: string) =>
      new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: code,
        minimumFractionDigits: 2,
        maximumFractionDigits: 2,
      });

    if (/^[A-Z]{3}$/.test(normalizedCurrency)) {
      try {
        return createFormatter(normalizedCurrency).format(amount);
      } catch (err) {
        console.warn('Unsupported currency code provided. Falling back to USD.', err);
      }
    }

    return createFormatter(fallbackCurrency).format(amount);
  };

  const formatPercent = (value: number) => {
    const absolute = Math.abs(value);
    const hasFraction = Math.abs(absolute - Math.trunc(absolute)) > 0.001;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: hasFraction ? 1 : 0,
      maximumFractionDigits: 2,
    }).format(value);
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-white">Loading quotes...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="flex items-center justify-center py-8">
        <div className="text-red-400">Error loading quotes: {error}</div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Quote Manager</h1>
          <p className="text-gray-400">Manage and track your quotes</p>
        </div>
        <Button 
          onClick={handleNewQuote}
          className="bg-red-600 hover:bg-red-700 text-white"
        >
          <Plus className="mr-2 h-4 w-4" />
          New Quote
        </Button>
      </div>

      {/* Pipeline Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-5 gap-4">
        {['High', 'Medium', 'Low'].map(priority => {
          const count = processedQuotes.filter(q => q.priority === priority && q.status !== 'approved' && q.status !== 'rejected').length;
          const badge = getPriorityBadge(priority);
          return (
            <Card key={priority} className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <CardTitle className="text-white text-sm">{priority} Priority</CardTitle>
              </CardHeader>
              <CardContent>
                <div className="text-2xl font-bold text-white">{count}</div>
                <Badge className={`${badge.color} text-white mt-2`}>
                  In Progress
                </Badge>
              </CardContent>
            </Card>
           );
        })}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Draft Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {processedQuotes.filter(q => q.status === 'draft').length}
            </div>
            <Badge className="bg-gray-600 text-white mt-2">
              In Progress
            </Badge>
          </CardContent>
        </Card>
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-white text-sm">Total Pipeline</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              {canSeePrices ? `$${processedQuotes.filter(q => q.status !== 'rejected').reduce((sum, q) => sum + q.value, 0).toLocaleString()}` : '—'}
            </div>
            <Badge className="bg-blue-600 text-white mt-2">
              Active Value
            </Badge>
          </CardContent>
        </Card>
      </div>

      {/* Search and Filters */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Search & Filter</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex space-x-4">
            <div className="flex-1 relative">
              <Search className="absolute left-3 top-3 h-4 w-4 text-gray-400" />
              <Input
                placeholder="Search by customer, quote ID, or Oracle ID..."
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                className="pl-10 bg-gray-800 border-gray-700 text-white"
              />
            </div>
            <select
              value={priorityFilter}
              onChange={(e) => setPriorityFilter(e.target.value as any)}
              className="bg-gray-800 border border-gray-700 text-white rounded-md px-3 py-2"
            >
              <option value="All">All Quotes</option>
              <option value="Draft">Draft Quotes</option>
              <option value="High">High Priority</option>
              <option value="Medium">Medium Priority</option>
              <option value="Low">Low Priority</option>
            </select>
          </div>
        </CardContent>
      </Card>

      {/* Quotes Table */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Quotes in Progress ({filteredQuotes.length})</CardTitle>
          <CardDescription className="text-gray-400">
            Your quote history and current requests
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {filteredQuotes.map((quote) => {
              const statusBadge = getStatusBadge(quote.status);
              const priorityBadge = getPriorityBadge(quote.priority);
              return (
                <div
                  key={quote.id}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="text-white font-medium">
                          {quote.displayLabel}
                        </span>
                        <Badge className={`${statusBadge.color} text-white`}>
                          {statusBadge.text}
                        </Badge>
                      </div>
                      {quote.status !== 'draft' && (
                        <p className="text-gray-400 text-sm mt-1">{quote.customer}</p>
                      )}
                      <p className="text-gray-500 text-xs">Oracle: {quote.oracleCustomerId}</p>
                    </div>
                    
                    <div className="text-right">
                      {canSeePrices ? (
                        <div className="flex flex-col items-end">
                          {quote.hasDiscount && (
                            <span className="text-sm text-gray-400 line-through">
                              {formatCurrency(quote.value, quote.currency)}
                            </span>
                          )}
                          <span className="text-white font-semibold">
                            {formatCurrency(quote.finalValue, quote.currency)}
                          </span>
                          {quote.hasDiscount && (
                            <span className="text-xs text-yellow-400 mt-1">
                              -{formatCurrency(quote.discountAmount, quote.currency)} ({formatPercent(quote.displayDiscountPercent)}%)
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="text-white font-medium">—</span>
                      )}
                      <p className="text-gray-400 text-sm mt-1">{quote.items} items</p>
                    </div>
                    
                    <div>
                      <Badge className={`${priorityBadge.color} text-white mb-1`}>
                        {priorityBadge.text}
                      </Badge>
                      {quote.hasDiscount && (
                        <Badge variant="outline" className="text-yellow-400 border-yellow-400 block w-fit">
                          {formatPercent(quote.displayDiscountPercent)}% discount
                        </Badge>
                      )}
                    </div>
                    
                    <div>
                      <p className="text-white">Created: {quote.createdAt}</p>
                      <p className="text-gray-400 text-sm">Updated: {quote.updatedAt}</p>
                    </div>
                  </div>
                  
                   <div className="flex space-x-2 ml-4">
                     <Button
                       variant="ghost"
                       size="sm"
                       className="text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                       onClick={() => handleViewQuote(quote)}
                       title="View Quote"
                       disabled={loadingOperations[quote.id]}
                     >
                       {loadingOperations[quote.id] ? (
                         <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                       ) : (
                         <Eye className="h-4 w-4" />
                       )}
                       <span className="text-xs ml-1">
                         {loadingOperations[quote.id] ? 'Loading...' : 'View'}
                       </span>
                     </Button>
                      {quote.status === 'draft' && (
                        <Button
                          variant="ghost"
                          size="sm"
                          className="text-red-400 hover:text-red-300 hover:bg-gray-700"
                          onClick={() => handleDeleteQuote(quote.displayId)}
                          title="Delete Draft"
                        >
                          <Trash className="h-4 w-4" />
                          <span className="text-xs ml-1">Delete</span>
                        </Button>
                      )}
                     {quote.status !== 'draft' && (
                       <Button
                         variant="ghost"
                         size="sm"
                         className="text-green-400 hover:text-green-300 hover:bg-gray-700"
                         onClick={() => handleCloneQuote(quote)}
                         title="Clone Quote"
                       >
                         <Copy className="h-4 w-4" />
                         <span className="text-xs ml-1">Clone</span>
                       </Button>
                     )}
                    <QuoteShareDialog
                      quoteId={quote.id}
                      quoteName={`${quote.id} - ${quote.customer}`}
                    >
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-cyan-400 hover:text-cyan-300 hover:bg-gray-700 flex items-center gap-1"
                        title="Share Quote with Team"
                      >
                        <Share className="h-4 w-4" />
                        <span className="text-xs">Share</span>
                      </Button>
                    </QuoteShareDialog>
                     <Button
                       variant="ghost"
                       size="sm"
                       className="text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                       onClick={() => handleViewPDF(quote)}
                       title="View Quote PDF"
                       disabled={!quote.pdfUrl}
                     >
                       <Eye className="h-4 w-4" />
                     </Button>
                    {(quote.status === 'approved') && quote.pdfUrl && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-green-400 hover:text-green-300 hover:bg-gray-700"
                        onClick={() => handleDownloadQuote(quote)}
                        title="Download Quote PDF"
                      >
                        <Download className="h-4 w-4" />
                      </Button>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default QuoteManager;

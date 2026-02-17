
import { useState, useEffect } from 'react';
import type { SupabaseClient, PostgrestError } from '@supabase/supabase-js';
import { getSupabaseClient, getSupabaseAdminClient } from "@/integrations/supabase/client";
import { normalizeQuoteId, persistNormalizedQuoteId } from '@/utils/quoteIdGenerator';
import { deriveCustomerNameFromFields } from "@/utils/customerName";
import {
  extractAdditionalQuoteInformation,
  noteAdditionalQuoteInfoColumnFromRow,
  parseQuoteFieldsValue,
  updateQuoteWithAdditionalInfo,
} from '@/utils/additionalQuoteInformation';
import type { Database } from '@/integrations/supabase/types';
import { Quote, BOMItemWithDetails, QuoteWorkflowState } from '@/types/quote';
import { User } from '@/types/auth';
import { toast } from "@/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import QuoteDetails from './quote-approval/QuoteDetails';
import { RefreshCw, ChevronDown, ChevronRight, Clock, User as UserIcon, Calendar } from 'lucide-react';
import { quoteWorkflowService, type FinanceMarginLimit } from '@/services/quoteWorkflowService';
import { deriveWorkflowState, getWorkflowLaneForState, WORKFLOW_QUEUE_STATES } from '@/lib/workflow/utils';

const supabase = getSupabaseClient();
const supabaseAdmin = getSupabaseAdminClient();

const BOM_ITEMS_UPDATED_AT_STORAGE_KEY =
  'powerquote_bom_items_updated_at_supported';

const readStoredBomUpdatedAtSupport = (): boolean | null => {
  if (typeof window === 'undefined' || !window?.localStorage) {
    return null;
  }

  const stored = window.localStorage.getItem(
    BOM_ITEMS_UPDATED_AT_STORAGE_KEY
  );

  if (stored === 'true') {
    return true;
  }

  if (stored === 'false') {
    return false;
  }

  return null;
};

const persistBomUpdatedAtSupport = (value: boolean | null) => {
  if (typeof window === 'undefined' || !window?.localStorage) {
    return;
  }

  if (value === null) {
    window.localStorage.removeItem(BOM_ITEMS_UPDATED_AT_STORAGE_KEY);
    return;
  }

  window.localStorage.setItem(
    BOM_ITEMS_UPDATED_AT_STORAGE_KEY,
    value ? 'true' : 'false'
  );
};

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

const getQuoteCurrency = (quote: Quote): string => {
  // Try exchange_rate_metadata first
  if (quote.exchange_rate_metadata && typeof quote.exchange_rate_metadata === 'object') {
    const metadata = quote.exchange_rate_metadata as any;
    if (metadata.currency && typeof metadata.currency === 'string') {
      return metadata.currency;
    }
  }
  
  // Fallback to quote_fields
  if (quote.quote_fields && typeof quote.quote_fields === 'object') {
    const fields = quote.quote_fields as Record<string, any>;
    if (fields['quote-currency']) {
      return String(fields['quote-currency']);
    }
  }
  
  // Last fallback to currency field
  return quote.currency || 'USD';
};

const formatQuoteCurrency = (amount: number, quote: Quote): string => {
  const currency = getQuoteCurrency(quote);
  
  try {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: currency,
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    }).format(amount);
  } catch {
    // Fallback if currency code is invalid
    return `${currency} ${amount.toLocaleString()}`;
  }
};

const workflowStateBadges: Record<QuoteWorkflowState, { text: string; color: string }> = {
  draft: { text: 'Draft', color: 'bg-slate-600' },
  submitted: { text: 'Submitted', color: 'bg-blue-600' },
  admin_review: { text: 'Admin Review', color: 'bg-purple-600' },
  finance_review: { text: 'Finance Review', color: 'bg-amber-600' },
  approved: { text: 'Approved', color: 'bg-green-600' },
  rejected: { text: 'Rejected', color: 'bg-red-600' },
  needs_revision: { text: 'Needs Revision', color: 'bg-yellow-600' },
  closed: { text: 'Closed', color: 'bg-gray-500' },
};

const getWorkflowBadge = (state?: QuoteWorkflowState) => {
  if (!state) {
    return workflowStateBadges.draft;
  }
  return workflowStateBadges[state] ?? workflowStateBadges.draft;
};

const getDerivedWorkflowState = (quote: Quote): QuoteWorkflowState => {
  return deriveWorkflowState(quote);
};

const isQuoteInQueue = (quote: Quote): boolean => {
  const state = getDerivedWorkflowState(quote);
  return WORKFLOW_QUEUE_STATES.has(state);
};

const getStatusBadge = (quote: Quote) => {
  const state = getDerivedWorkflowState(quote);
  switch (state) {
    case 'approved':
      return <Badge className="bg-green-600 text-white">Approved</Badge>;
    case 'rejected':
      return <Badge className="bg-red-600 text-white">Rejected</Badge>;
    case 'finance_review':
      return <Badge className="bg-amber-600 text-white">Finance Review</Badge>;
    case 'admin_review':
      return <Badge className="bg-purple-600 text-white">Admin Review</Badge>;
    case 'submitted':
      return <Badge className="bg-blue-600 text-white">Submitted</Badge>;
    case 'needs_revision':
      return <Badge className="bg-yellow-600 text-white">Needs Revision</Badge>;
    default:
      return <Badge className="bg-gray-600 text-white">{state}</Badge>;
  }
};

const isMissingBomUpdatedAtColumnError = (error: PostgrestError | null | undefined) => {
  if (!error) {
    return false;
  }

  if (error.code === '42703' || error.code === 'PGRST204') {
    return true;
  }

  const message = typeof error.message === 'string' ? error.message.toLowerCase() : '';

  return message.includes('updated_at') && message.includes('column');
};

let bomItemsUpdatedAtSupported: boolean | null = readStoredBomUpdatedAtSupport();

const noteBomItemsUpdatedAtSupportFromRows = (
  rows: Array<Record<string, any>> | null | undefined
) => {
  if (!rows || rows.length === 0) {
    return;
  }

  const hasColumn = rows.some((row) =>
    Object.prototype.hasOwnProperty.call(row, 'updated_at')
  );

  if (hasColumn) {
    if (bomItemsUpdatedAtSupported !== true) {
      bomItemsUpdatedAtSupported = true;
      persistBomUpdatedAtSupport(true);
    }
    return;
  }

  if (bomItemsUpdatedAtSupported !== false) {
    bomItemsUpdatedAtSupported = false;
    persistBomUpdatedAtSupport(false);
  }
};

const updateBomItemPricing = async (
  client: SupabaseClient<Database>,
  quoteId: string,
  bomItemId: string,
  payload: Record<string, any>
): Promise<PostgrestError | null> => {
  if (bomItemsUpdatedAtSupported === false) {
    return null;
  }

  const { error } = await client
    .from('bom_items')
    .update(payload)
    .eq('id', bomItemId)
    .eq('quote_id', quoteId);

  if (!error) {
    bomItemsUpdatedAtSupported = true;
    persistBomUpdatedAtSupport(true);
    return null;
  }

  if (isMissingBomUpdatedAtColumnError(error)) {
    bomItemsUpdatedAtSupported = false;
    persistBomUpdatedAtSupport(false);
    return null;
  }

  return error;
};

const EnhancedQuoteApprovalDashboard = ({ user }: EnhancedQuoteApprovalDashboardProps) => {
  const [quotes, setQuotes] = useState<Quote[]>([]);
  const [selectedQuote, setSelectedQuote] = useState<Quote | null>(null);
  const [loading, setLoading] = useState(true);
  const [actionLoading, setActionLoading] = useState<{ [quoteId: string]: boolean }>({});
  const [activeTab, setActiveTab] = useState("pending_approval");
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<"all" | "finance_required" | Quote['status'] | QuoteWorkflowState>("all");
  const [expandedQuotes, setExpandedQuotes] = useState<ExpandedQuoteState>({});
  const [financeGuardrail, setFinanceGuardrail] = useState<FinanceMarginLimit | null>(null);
  const [claimLoading, setClaimLoading] = useState<Record<string, boolean>>({});

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
        const workflowBadge = getWorkflowBadge(quote.workflow_state as QuoteWorkflowState | undefined);
          noteAdditionalQuoteInfoColumnFromRow(quote as Record<string, any>);
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

          if (bomItemsUpdatedAtSupported === null) {
            noteBomItemsUpdatedAtSupportFromRows(bomItems ?? undefined);
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

  useEffect(() => {
    let isMounted = true;
    quoteWorkflowService
      .getFinanceMarginLimit()
      .then((limit) => {
        if (isMounted) {
          setFinanceGuardrail(limit);
        }
      })
      .catch((error) => {
        console.warn('Unable to load finance guardrail', error);
      });

    return () => {
      isMounted = false;
    };
  }, []);

  const filteredQuotes = quotes.filter(quote => {
    const workflowState = getDerivedWorkflowState(quote);
    const inQueue = isQuoteInQueue(quote);
    const inTab =
      activeTab === "pending_approval"
        ? inQueue
        : !inQueue;

    const matchesStatus = (() => {
      if (statusFilter === "all") {
        return true;
      }
      if (statusFilter === "pending_approval") {
        return workflowState === "submitted" || quote.status === "pending_approval";
      }
      if (statusFilter === "finance_required") {
        return Boolean(quote.requires_finance_approval) || workflowState === "finance_review";
      }
      return workflowState === statusFilter || quote.status === statusFilter;
    })();

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

  const handleClaimAction = async (quoteId: string, lane: 'admin' | 'finance') => {
    const claimKey = `${quoteId}-${lane}`;
    setClaimLoading(prev => ({ ...prev, [claimKey]: true }));
    try {
      await quoteWorkflowService.claimQuote(quoteId, lane);
      toast({
        title: lane === 'admin' ? 'Quote claimed for admin review' : 'Quote claimed for finance review',
        description: lane === 'admin'
          ? 'You are now the assigned admin reviewer for this quote.'
          : 'You are now the assigned finance reviewer for this quote.',
      });
      await fetchData();
    } catch (error) {
      console.error('Error claiming quote:', error);
      toast({
        title: 'Unable to claim quote',
        description: error instanceof Error ? error.message : 'Please try again.',
        variant: 'destructive',
      });
    } finally {
      setClaimLoading(prev => {
        const updated = { ...prev };
        delete updated[claimKey];
        return updated;
      });
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

      if (!quote) {
        throw new Error('Quote not found. Please refresh and try again.');
      }

      const workflowState = getDerivedWorkflowState(quote);
      const lane = getWorkflowLaneForState(workflowState);

      if (!lane) {
        throw new Error('Quote is no longer in an actionable workflow state.');
      }

      const userRole = user?.role ?? 'SALES';
      const isAdminLane = lane === 'admin';
      const isFinanceLane = lane === 'finance';
      const hasPermission = isAdminLane
        ? userRole === 'ADMIN' || userRole === 'MASTER'
        : userRole === 'FINANCE' || userRole === 'MASTER';

      if (!hasPermission) {
        throw new Error('You do not have permission to perform this action.');
      }

      if (action === 'approve') {
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

      const ensureClaimed = async () => {
        if (isAdminLane) {
          if (quote.admin_reviewer_id && quote.admin_reviewer_id !== user?.id) {
            throw new Error('Quote is already claimed by another admin reviewer.');
          }
          if (!quote.admin_reviewer_id) {
            await quoteWorkflowService.claimQuote(targetQuoteId, 'admin');
          }
        } else if (isFinanceLane) {
          if (quote.finance_reviewer_id && quote.finance_reviewer_id !== user?.id) {
            throw new Error('Quote is already claimed by another finance reviewer.');
          }
          if (!quote.finance_reviewer_id) {
            await quoteWorkflowService.claimQuote(targetQuoteId, 'finance');
          }
        }
      };

      await ensureClaimed();

      const appliedDiscount =
        typeof approvedDiscount === 'number'
          ? approvedDiscount
          : quote.approved_discount ?? quote.requested_discount ?? 0;

      const isoNow = new Date().toISOString();

      const updates: Record<string, any> = {
        reviewed_at: isoNow,
        updated_at: isoNow,
      };

      if (user?.id) {
        updates.reviewed_by = user.id;
      }

      if (action === 'approve') {
        updates.approval_notes = notes?.trim() ? notes.trim() : null;
        updates.rejection_reason = null;
        updates.additional_quote_information = additionalQuoteInformation?.trim()
          ? additionalQuoteInformation.trim()
          : null;
      } else {
        updates.rejection_reason = notes?.trim() ? notes.trim() : null;
        updates.approval_notes = null;
        updates.additional_quote_information = null;
      }

      if (action === 'approve') {
        updates.approved_discount = appliedDiscount;
      }

      const preparedUpdates: Record<string, any> = { ...updates };

      const bomItemsForTotals = (updatedBOMItems && updatedBOMItems.length > 0)
        ? updatedBOMItems
        : ((quote.bom_items as BOMItemWithDetails[] | undefined) ?? []);

      let discountedMargin: number | null = null;

      if (bomItemsForTotals.length > 0) {
        const totalRevenue = bomItemsForTotals.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
        const totalCost = bomItemsForTotals.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);
        const grossProfit = totalRevenue - totalCost;
        const margin = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

        const normalizedDiscount = Math.abs(appliedDiscount) <= 1 ? appliedDiscount * 100 : appliedDiscount;
        const discountFraction = normalizedDiscount / 100;
        const discountedValue = totalRevenue - (totalRevenue * discountFraction);
        const discountedGrossProfit = discountedValue - totalCost;
        discountedMargin = discountedValue > 0 ? (discountedGrossProfit / discountedValue) * 100 : 0;

        preparedUpdates.total_cost = totalCost;
        preparedUpdates.gross_profit = grossProfit;
        preparedUpdates.original_quote_value = totalRevenue;
        preparedUpdates.original_margin = margin;
        preparedUpdates.discounted_value = discountedValue;
        preparedUpdates.discounted_margin = discountedMargin;
      }

      const { error: quoteError } = await updateQuoteWithAdditionalInfo({
        client,
        quote,
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
              const error = await updateBomItemPricing(client, safeQuoteId, id, rest);

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

      let workflowDecision: 'approved' | 'rejected' | 'requires_finance' = action === 'approve' ? 'approved' : 'rejected';
      const financeLimitPercent = financeGuardrail?.percent;
      const marginPercent = typeof discountedMargin === 'number' ? discountedMargin : undefined;

      if (isFinanceLane) {
        workflowDecision = action === 'approve' ? 'approved' : 'rejected';
        await quoteWorkflowService.recordFinanceDecision({
          quoteId: targetQuoteId,
          decision: workflowDecision as 'approved' | 'rejected',
          notes,
          marginPercent,
          financeLimitPercent,
        });
      } else {
        if (action === 'approve' && typeof marginPercent === 'number' && typeof financeLimitPercent === 'number' && marginPercent < financeLimitPercent) {
          workflowDecision = 'requires_finance';
        } else {
          workflowDecision = action === 'approve' ? 'approved' : 'rejected';
        }

        await quoteWorkflowService.recordAdminDecision({
          quoteId: targetQuoteId,
          decision: workflowDecision,
          notes,
          marginPercent,
          financeLimitPercent,
        });
      }

      const toastTitle = (() => {
        if (workflowDecision === 'requires_finance') {
          return 'Quote routed to Finance';
        }
        if (bomUpdateError) {
          return 'Quote processed with warnings';
        }
        return 'Success';
      })();

      const toastDescription = (() => {
        if (workflowDecision === 'requires_finance') {
          const guardrailText = financeLimitPercent ? `${financeLimitPercent}%` : 'the finance guardrail';
          const marginText = typeof marginPercent === 'number' ? `${marginPercent.toFixed(1)}%` : 'The current margin';
          const warningSuffix = bomUpdateError
            ? ' Some BOM price updates may not have been saved. Please verify the bill of materials.'
            : '';
          return `${marginText} is below ${guardrailText}. The quote has been sent to Finance.${warningSuffix}`;
        }

        if (bomUpdateError) {
          return 'Quote updated, but some BOM price updates may not have been saved. Please verify the bill of materials.';
        }

        return `Quote ${workflowDecision} successfully`;
      })();

      toast({
        title: toastTitle,
        description: toastDescription,
      });

      const shouldSendEmail = workflowDecision === 'approved' || workflowDecision === 'rejected';

      if (shouldSendEmail) {
        try {
          console.log(`Triggering email notification for ${workflowDecision} of quote ${targetQuoteId}`);

          const { error: emailError } = await supabase.functions.invoke('send-quote-status-email', {
            body: {
              quoteId: targetQuoteId,
              action: workflowDecision,
            },
          });

          if (emailError) {
            console.error('Failed to send email notification:', emailError);
            toast({
              title: 'Email Warning',
              description: 'Quote status updated, but email notification failed to send.',
              variant: 'default',
            });
          } else {
            console.log('Email notification sent successfully');
          }
        } catch (emailError) {
          console.error('Exception sending email notification:', emailError);
        }
      }

      const refreshedQuotes = await fetchData();
      const refreshedQuote = refreshedQuotes.find(q => q.id === targetQuoteId);
      if (refreshedQuote) {
        setSelectedQuote(refreshedQuote);
      }

    } catch (error) {
      console.error(`Error ${action}ing quote:`, error);
      toast({
        title: 'Error',
        description: error instanceof Error ? error.message : `Failed to ${action} quote. Please try again.`,
        variant: 'destructive',
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

  const getClaimOwnerLabel = (quote: Quote): string => {
    if (quote.reviewed_by) {
      if (user?.id && quote.reviewed_by === user.id) return 'You';
      return String(quote.reviewed_by).slice(0, 8);
    }
    return 'Unclaimed';
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
            Pending Queue ({quotes.filter(isQuoteInQueue).length})
          </TabsTrigger>
          <TabsTrigger value="reviewed" className="text-white data-[state=active]:bg-red-600">
            History ({quotes.filter(q => !isQuoteInQueue(q)).length})
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
            {[
              { value: 'all', label: 'All Statuses' },
              { value: 'submitted', label: 'Submitted' },
              { value: 'admin_review', label: 'Admin Review' },
              { value: 'finance_review', label: 'Finance Review' },
              { value: 'finance_required', label: 'Finance Approval Required' },
              { value: 'approved', label: 'Approved' },
              { value: 'rejected', label: 'Rejected' },
              { value: 'needs_revision', label: 'Needs Revision' },
              { value: 'pending_approval', label: 'Legacy Pending Approval' },
            ].map(option => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
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
              {filteredQuotes.map((quote) => {
                const workflowState = getDerivedWorkflowState(quote);
                const workflowBadge = getWorkflowBadge(workflowState);
                const workflowLane = getWorkflowLaneForState(workflowState);
                const claimKey = workflowLane ? `${quote.id}-${workflowLane}` : '';
                const claimBusy = workflowLane ? Boolean(claimLoading[claimKey]) : false;
                return (
                  <div key={quote.id} className="space-y-0">
                  {/* Quote Header Row */}
                  <Card className={`bg-gray-900 border ${quote.requires_finance_approval ? 'border-red-600' : 'border-gray-800'} hover:border-gray-700 transition-colors`}>
                    <CardContent className="p-4">
                      {quote.requires_finance_approval && (
                        <div className="mb-3 rounded-md border border-red-500 bg-red-900/30 px-3 py-2 text-red-200 text-sm">
                          Low Margin Alert: quote is below finance threshold and requires immediate finance attention.
                        </div>
                      )}
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

                          <div className="flex items-center space-x-2 text-sm">
                            <span className="text-gray-500">Claimed by:</span>
                            <span className="text-cyan-300">{getClaimOwnerLabel(quote)}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Badge className={`${workflowBadge.color} text-white`} variant="secondary">
                              {workflowBadge.text}
                            </Badge>
                            {(quote.requires_finance_approval || workflowState === 'finance_review') && (
                              <Badge className="bg-orange-600 text-white" variant="secondary">
                                Finance Approval Required
                              </Badge>
                            )}
                            <Badge className={`${getPriorityColor(quote.priority)} border-current`} variant="outline">
                              {quote.priority}
                            </Badge>
                            <Badge variant="secondary" className="font-mono">
                              {getQuoteCurrency(quote)}
                            </Badge>
                          </div>
                          
                          <div className="text-white font-bold">
                            {formatQuoteCurrency(quote.discounted_value, quote)}
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
                          onClaim={workflowLane ? (lane) => handleClaimAction(quote.id, lane) : undefined}
                          isClaiming={claimBusy}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
                );
              })}
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
              {filteredQuotes.map((quote) => {
                const workflowState = getDerivedWorkflowState(quote);
                const workflowBadge = getWorkflowBadge(workflowState);
                const workflowLane = getWorkflowLaneForState(workflowState);
                const claimKey = workflowLane ? `${quote.id}-${workflowLane}` : '';
                const claimBusy = workflowLane ? Boolean(claimLoading[claimKey]) : false;
                return (
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

                          <div className="flex items-center space-x-2 text-sm">
                            <span className="text-gray-500">Claimed by:</span>
                            <span className="text-cyan-300">{getClaimOwnerLabel(quote)}</span>
                          </div>
                          
                          <div className="flex items-center space-x-2">
                            <Badge className={`${workflowBadge.color} text-white`} variant="secondary">
                              {workflowBadge.text}
                            </Badge>
                            {(quote.requires_finance_approval || workflowState === 'finance_review') && (
                              <Badge className="bg-orange-600 text-white" variant="secondary">
                                Finance Approval Required
                              </Badge>
                            )}
                            <Badge variant="secondary" className="font-mono">
                              {getQuoteCurrency(quote)}
                            </Badge>
                          </div>
                          
                          <div className="text-white font-bold">
                            {formatQuoteCurrency(quote.discounted_value, quote)}
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
                          onClaim={workflowLane ? (lane) => handleClaimAction(quote.id, lane) : undefined}
                          isClaiming={claimBusy}
                        />
                      </CardContent>
                    </Card>
                  )}
                </div>
                );
              })}
            </div>
          )}
        </TabsContent>
      </Tabs>
    </div>
  );
};

export default EnhancedQuoteApprovalDashboard;

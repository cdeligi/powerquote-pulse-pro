
import { User } from "@/types/auth";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Search, Eye, Download, Edit, Share, Plus, Trash, Copy, FileText, CheckCircle, XCircle, Clock, ChevronDown } from "lucide-react";
import { useState, useEffect, useMemo } from "react";
import { useNavigate } from "react-router-dom";
import { useQuotes } from "@/hooks/useQuotes";
import { toast } from "@/hooks/use-toast";
import { QuoteShareDialog } from './QuoteShareDialog';
import { supabase } from "@/integrations/supabase/client";
import { cloneQuoteWithFallback } from "@/utils/cloneQuote";
import { normalizeQuoteId } from "@/utils/quoteIdGenerator";
import {
  coerceFieldValueToString,
  extractAccountSegments,
  findAccountFieldValue,
} from '@/utils/customerName';
import {
  deserializeSlotAssignments,
  buildRackLayoutFromAssignments,
  type SerializedSlotAssignment,
} from '@/utils/slotAssignmentUtils';
import {
  getFiscalYear,
  getAvailableFiscalYears,
  calculateFiscalYearAnalytics,
} from '@/utils/quoteAnalytics';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

interface QuoteManagerProps {
  user: User;
}

const isNonEmptyString = (value: unknown): value is string =>
  typeof value === "string" && value.trim().length > 0;

const formatAccountDisplay = (rawValue?: string | null): string | null => {
  const segments = extractAccountSegments(rawValue);
  if (segments.length === 0) {
    return null;
  }

  return segments[segments.length - 1];
};

const parseJsonValue = (value: unknown): unknown => {
  if (typeof value === "string") {
    try {
      return JSON.parse(value);
    } catch (error) {
      console.warn("Failed to parse JSON string while normalizing quote data.", error);
      return value;
    }
  }

  return value;
};

const ensureRecord = (value: unknown): Record<string, unknown> | null => {
  const parsed = parseJsonValue(value);
  if (parsed && typeof parsed === "object" && !Array.isArray(parsed)) {
    return parsed as Record<string, unknown>;
  }

  return null;
};

const coerceString = (value: unknown): string | undefined => {
  if (typeof value === "string") {
    const trimmed = value.trim();
    return trimmed.length > 0 ? trimmed : undefined;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return String(value);
  }

  return undefined;
};

const coerceProductLevel = (value: unknown): 1 | 2 | 3 | 4 | undefined => {
  if (value === null || value === undefined) {
    return undefined;
  }

  const numeric = typeof value === "number" ? value : Number(coerceString(value));
  if (!Number.isFinite(numeric)) {
    return undefined;
  }

  const rounded = Math.round(numeric);
  if (rounded >= 1 && rounded <= 4) {
    return rounded as 1 | 2 | 3 | 4;
  }

  return undefined;
};

const ensureArray = (value: unknown): unknown[] | null => {
  const parsed = parseJsonValue(value);
  return Array.isArray(parsed) ? parsed : null;
};

const QuoteManager = ({ user }: QuoteManagerProps) => {
  const navigate = useNavigate();
  const [searchTerm, setSearchTerm] = useState("");
  const [priorityFilter, setPriorityFilter] = useState<'All' | 'High' | 'Medium' | 'Low' | 'Draft' | 'InProgress'>('All');
  const [selectedFiscalYear, setSelectedFiscalYear] = useState<string>(getFiscalYear(new Date()));
  const { quotes, loading, error, fetchQuotes } = useQuotes();

  const [pdfLoadingStates, setPdfLoadingStates] = useState<Record<string, boolean>>({});
  
  // Fetch BOM item count for each quote
  const [bomCounts, setBomCounts] = useState<Record<string, number>>({});
  const [reviewerNameById, setReviewerNameById] = useState<Record<string, string>>({});

  useEffect(() => {
    fetchQuotes();
  }, []);

  useEffect(() => {
    const loadReviewerNames = async () => {
      const ids = Array.from(new Set(
        quotes
          .flatMap((q: any) => [q.admin_reviewer_id, q.finance_reviewer_id])
          .filter((v): v is string => typeof v === 'string' && v.length > 0)
      ));

      if (ids.length === 0) {
        setReviewerNameById({});
        return;
      }

      const mapped: Record<string, string> = {};

      const { data: profileData } = await supabase
        .from('profiles')
        .select('id, first_name, last_name, email')
        .in('id', ids);

      (profileData || []).forEach((r: any) => {
        const fullName = [r.first_name, r.last_name]
          .filter((v: unknown) => typeof v === 'string' && v.trim().length > 0)
          .join(' ')
          .trim();
        const candidate = fullName || (typeof r.email === 'string' && r.email.trim().length > 0 ? r.email.trim() : null);
        if (candidate) mapped[r.id] = candidate;
      });

      const missingIds = ids.filter((id) => !mapped[id]);
      if (missingIds.length > 0) {
        const { data: userData } = await supabase
          .from('users')
          .select('id, first_name, last_name, email')
          .in('id', missingIds);

        (userData || []).forEach((u: any) => {
          const fullName = [u.first_name, u.last_name].filter((v: unknown) => typeof v === 'string' && v.trim().length > 0).join(' ').trim();
          const candidate = fullName || (typeof u.email === 'string' ? u.email : '');
          if (candidate) mapped[u.id] = candidate;
        });
      }

      setReviewerNameById(mapped);
    };

    loadReviewerNames();
  }, [quotes]);

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

  const toDate = (value?: string | null): Date | null => {
    if (!value) return null;
    const d = new Date(value);
    return Number.isNaN(d.getTime()) ? null : d;
  };

  const ageDaysBetween = (start?: string | null, end?: string | null): string => {
    const s = toDate(start);
    const e = toDate(end);
    if (!s || !e) return '-';
    const days = Math.max(0, Math.ceil((e.getTime() - s.getTime()) / (1000 * 60 * 60 * 24)));
    return `${days}d`;
  };

  // Filter and process quotes with real BOM item counts
  const processedQuotes = quotes.map(quote => {
    const currency = quote.currency || 'USD';
    const isDraftQuote = quote.status === 'draft';

    const quoteFields = ensureRecord(quote.quote_fields) ?? {};
    const normalizedDraftBom = ensureRecord(quote.draft_bom);

    const draftQuoteFields = (() => {
      const source = normalizedDraftBom;
      if (!source) {
        return {} as Record<string, unknown>;
      }

      const rawFields = source['quoteFields'] ?? source['quote_fields'];

      return ensureRecord(rawFields) ?? {};
    })();

    const draftItems = ensureArray(normalizedDraftBom ? normalizedDraftBom['items'] : undefined) ?? undefined;

    // When a user resumes editing a draft quote, the latest field values live in
    // the draft payload. Ensure those values take precedence over the persisted
    // quote fields by spreading the stored fields first and the draft fields
    // last.
    const combinedFields = { ...quoteFields, ...draftQuoteFields };

    const getFieldAsString = (...keys: string[]): string | undefined => {
      for (const key of keys) {
        if (key in combinedFields) {
          const value = combinedFields[key];
          const stringValue = coerceFieldValueToString(value);
          if (stringValue) {
            return stringValue;
          }
        }
      }
      return undefined;
    };

    const normalizedDraftName = typeof quote.customer_name === 'string' && quote.customer_name.trim().length > 0
      ? quote.customer_name.trim()
      : undefined;

    const configuredQuoteName = getFieldAsString('quote_name', 'quoteName', 'name');
    const configuredCustomerName = getFieldAsString('customer_name', 'customerName', 'customer');
    const configuredAccount = getFieldAsString(
      'account_name',
      'accountName',
      'customer_account_name',
      'customerAccountName',
      'customer_account',
      'customerAccount',
      'account',
      'Account',
      'customer_name',
      'customerName',
      'account_number',
      'accountNumber',
      'customer_account_number',
      'customerAccountNumber',
      'account_id',
      'accountId',
      'accountID'
    );

    const draftAccountFieldValue = findAccountFieldValue(draftQuoteFields);
    const persistedAccountFieldValue = findAccountFieldValue(quoteFields);
    const combinedAccountFieldValue = findAccountFieldValue(combinedFields);
    const draftBomAccountFieldValue = findAccountFieldValue(normalizedDraftBom ?? undefined);

    const rawQuoteRecord = quote as unknown as Record<string, unknown>;
    const rawQuoteAccountFieldValue = findAccountFieldValue(rawQuoteRecord);
    const topLevelAccountCandidates = [
      coerceFieldValueToString(rawQuoteRecord?.["account_name"]),
      coerceFieldValueToString(rawQuoteRecord?.["accountName"]),
      coerceFieldValueToString(rawQuoteRecord?.["customer_account_name"]),
      coerceFieldValueToString(rawQuoteRecord?.["customerAccountName"]),
      coerceFieldValueToString(rawQuoteRecord?.["customer_account"]),
      coerceFieldValueToString(rawQuoteRecord?.["customerAccount"]),
      coerceFieldValueToString(rawQuoteRecord?.["account"]),
      coerceFieldValueToString(rawQuoteRecord?.["Account"]),
      coerceFieldValueToString(rawQuoteRecord?.["account_number"]),
      coerceFieldValueToString(rawQuoteRecord?.["accountNumber"]),
      coerceFieldValueToString(rawQuoteRecord?.["customer_account_number"]),
      coerceFieldValueToString(rawQuoteRecord?.["customerAccountNumber"]),
      coerceFieldValueToString(rawQuoteRecord?.["account_id"]),
      coerceFieldValueToString(rawQuoteRecord?.["accountId"]),
      coerceFieldValueToString(rawQuoteRecord?.["accountID"]),
    ].filter(isNonEmptyString);

    const accountCandidates = [
      draftAccountFieldValue,
      draftBomAccountFieldValue,
      combinedAccountFieldValue,
      configuredAccount,
      persistedAccountFieldValue,
      ...topLevelAccountCandidates,
      configuredCustomerName,
      normalizedDraftName,
      rawQuoteAccountFieldValue,
    ].filter(isNonEmptyString);

    const accountValue = (() => {
      const seen = new Set<string>();

      for (const candidate of accountCandidates) {
        const segments = extractAccountSegments(candidate);

        for (let index = segments.length - 1; index >= 0; index -= 1) {
          const segment = segments[index];
          const normalizedKey = segment.toLowerCase();
          if (seen.has(normalizedKey)) {
            continue;
          }

          seen.add(normalizedKey);
          return segment;
        }
      }

      return null;
    })();

    const normalizedQuoteId = normalizeQuoteId(quote.id) || quote.id;
    const formalQuoteId = normalizedQuoteId;

    const draftOrConfiguredLabel = configuredQuoteName || normalizedDraftName || configuredCustomerName;
    const customerDisplayName = configuredCustomerName || normalizedDraftName || configuredQuoteName || quote.id;

    const accountDisplayValue = accountValue || null;

    const primaryDisplayLabel = formalQuoteId;

    const originalValue = isDraftQuote && Array.isArray(draftItems)
      ? (draftItems as any[]).reduce((sum: number, item: any) =>
          sum + ((item?.unit_price || item?.total_price || item?.product?.price || 0) * (item?.quantity || 1)), 0)
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
      displayLabel: primaryDisplayLabel,
      formalQuoteId,
      quoteId: normalizedQuoteId,
      customer: customerDisplayName,
      oracleCustomerId: quote.oracle_customer_id || 'N/A',
      account: accountDisplayValue,
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
      pdfUrl: quote.status === 'draft' ? null : `/quotes/${quote.id}.pdf`,
      adminReviewerId: (quote as any).admin_reviewer_id || null,
      financeReviewerId: (quote as any).finance_reviewer_id || null,
      adminClaimedAt: (quote as any).admin_claimed_at || null,
      financeClaimedAt: (quote as any).finance_claimed_at || null,
      adminDecisionAt: (quote as any).admin_decision_at || (quote as any).reviewed_at || null,
      financeDecisionAt: (quote as any).finance_decision_at || null,
      submittedAt: (quote as any).submitted_at || quote.created_at,
      financeNotes: (quote as any).finance_notes || null,
      admin_reviewer_name: (quote as any).admin_reviewer_name || null,
      finance_reviewer_name: (quote as any).finance_reviewer_name || null,
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
            const normalizedDraftBom = ensureRecord(quote.draft_bom);
            const draftBomItems = ensureArray(normalizedDraftBom ? normalizedDraftBom['items'] : undefined);

            if (quote.status === 'draft' && Array.isArray(draftBomItems)) {
              counts[quote.id] = draftBomItems.length;
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

  // Calculate fiscal year analytics
  const availableFiscalYears = useMemo(() => 
    getAvailableFiscalYears(quotes.map(q => ({ created_at: q.created_at }))), 
    [quotes]
  );

  const fiscalYearAnalytics = useMemo(() => 
    calculateFiscalYearAnalytics(
      quotes.map(q => ({
        id: q.id,
        status: q.status,
        created_at: q.created_at,
        original_quote_value: q.original_quote_value,
        discounted_value: q.discounted_value,
      })),
      selectedFiscalYear
    ),
    [quotes, selectedFiscalYear]
  );

  const filteredQuotes = processedQuotes.filter(quote => {
    const lowerSearch = searchTerm.toLowerCase();
    const matchesSearch = quote.customer.toLowerCase().includes(lowerSearch) ||
                         quote.id.toLowerCase().includes(lowerSearch) ||
                         quote.oracleCustomerId.toLowerCase().includes(lowerSearch) ||
                         (quote.displayLabel?.toLowerCase().includes(lowerSearch)) ||
                         (quote.account ? quote.account.toLowerCase().includes(lowerSearch) : false);
    
    const inProgressStatuses = ['draft', 'pending_approval'];
    const matchesPriority = priorityFilter === 'All' || 
                           (priorityFilter === 'Draft' && quote.status === 'draft') ||
                           (priorityFilter === 'InProgress' && inProgressStatuses.includes(quote.status)) ||
                           (priorityFilter !== 'Draft' && priorityFilter !== 'InProgress' && quote.priority === priorityFilter);
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

  // Prices/discounts must remain visible in generated quote pages for requester workflows.
  const canSeePrices = true;

  const updatePdfLoading = (quoteId: string, isLoading: boolean) => {
    setPdfLoadingStates(prev => {
      if (isLoading) {
        return { ...prev, [quoteId]: true };
      }

      const { [quoteId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handleViewPDF = async (quote: any, action: 'view' | 'download' = 'view') => {
    const actualQuoteId = quote.displayId || quote.id;
    updatePdfLoading(actualQuoteId, true);

    try {
      // Get the actual quote data for PDF generation
      const { data: fullQuote, error } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', actualQuoteId)
        .single();

      if (error) throw error;

      let bomItems: any[] = [];
      
      // ALWAYS query bom_items table first for accurate data
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
        .eq('quote_id', actualQuoteId);

      const mapDraftItemsToBom = (items: any[]): any[] =>
        items.map((item: any) => {
          const storedSlotAssignments = item.slotAssignments as SerializedSlotAssignment[] | undefined;
          const slotAssignments = deserializeSlotAssignments(storedSlotAssignments);
          const rackLayout = item.rackConfiguration || buildRackLayoutFromAssignments(storedSlotAssignments);
          const productPrice = item.unit_price || item.product?.price || 0;

          return {
            id: item.id || crypto.randomUUID(),
            product_id: item.productId || item.product_id || item.product?.id,
            product: {
              id: item.productId || item.product_id || item.product?.id,
              name: item.name || item.product?.name || 'Unknown Product',
              description: item.description || item.product?.description || '',
              price: productPrice,
              productInfoUrl: item.product?.productInfoUrl || item.product?.product_info_url,
              product_info_url: item.product?.product_info_url || item.product?.productInfoUrl,
            },
            quantity: item.quantity || 1,
            enabled: item.enabled !== false,
            partNumber: item.partNumber || item.part_number || item.product?.partNumber || 'TBD',
            slotAssignments,
            rackConfiguration: rackLayout,
            level4Config: item.level4Config || null,
            level4Selections: item.level4Selections || null,
          };
        });

      const normalizedDraftBom = ensureRecord(fullQuote?.draft_bom);
      const draftBomItems = ensureArray(normalizedDraftBom ? normalizedDraftBom['items'] : undefined);
      const hasDraftItems = Array.isArray(draftBomItems) && draftBomItems.length > 0;

      if (hasDraftItems && fullQuote.status === 'draft') {
        bomItems = mapDraftItemsToBom(draftBomItems as any[]);
      } else if (!bomError && bomData && bomData.length > 0) {
        const productIdSet = new Set<string>();
        bomData.forEach(item => {
          const productId = coerceString((item as any)?.product_id);
          if (productId) {
            productIdSet.add(productId);
          }
        });

        const productIds = Array.from(productIdSet);
        const { data: productsData } = productIds.length > 0
          ? await supabase.from('products').select('*').in('id', productIds)
          : { data: [] };

        const productsMap = new Map((productsData || []).map(p => [p.id, p]));

        bomItems = (bomData || []).map((item: any) => {
          const productId = coerceString(item.product_id);
          const product = productId ? productsMap.get(productId) : null;
          const storedSlotAssignments = item.configuration_data?.slotAssignments as SerializedSlotAssignment[] | undefined;
          const slotAssignments = deserializeSlotAssignments(storedSlotAssignments);
          const rackLayout = item.configuration_data?.rackConfiguration || buildRackLayoutFromAssignments(storedSlotAssignments);

          return {
            id: item.id || crypto.randomUUID(),
            product_id: item.product_id,
            product: {
              id: item.product_id,
              name: item.name || product?.name || 'Unknown Product',
              description: item.description || product?.description || '',
              price: item.unit_price || product?.price || 0,
              productInfoUrl: product?.product_info_url || null,
              product_info_url: product?.product_info_url || null,
            },
            quantity: item.quantity || 1,
            enabled: true,
            partNumber: item.part_number || 'TBD',
            slotAssignments,
            rackConfiguration: rackLayout,
            level4Config: item.configuration_data?.level4Config || null,
            level4Selections: item.configuration_data?.level4Selections || null,
          };
        });
      } else if (hasDraftItems) {
        console.warn('No up-to-date bom_items found, falling back to draft_bom data');
        bomItems = mapDraftItemsToBom(draftBomItems as any[]);
      }

      // Import and use the PDF generator
      const { generateQuotePDF } = await import('@/utils/pdfGenerator');
      await generateQuotePDF(bomItems, fullQuote, canSeePrices, action);

      toast({
        title: action === 'download' ? "Download Ready" : "Preview Ready",
        description: action === 'download'
          ? `Quote PDF for ${quote.customer} opened in a new tab. Use the print dialog to save the file.`
          : `Quote PDF for ${quote.customer} opened in a new browser tab for viewing.`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: "PDF Generation Failed",
        description: "Unable to generate PDF. Please try again.",
        variant: "destructive"
      });
    } finally {
      updatePdfLoading(actualQuoteId, false);
    }
  };

  const handleDownloadQuote = async (quote: any) => {
    await handleViewPDF(quote, 'download');
  };

  const handleViewQuote = (quote: any) => {
    const actualQuoteId = quote.displayId || quote.id;
    const encodedQuoteId = encodeURIComponent(actualQuoteId);
    navigate(`/quote/${encodedQuoteId}?mode=view`);
  };

  const handleEditDraft = (quote: any) => {
    const actualQuoteId = quote.displayId || quote.id;
    const encodedQuoteId = encodeURIComponent(actualQuoteId);
    navigate(`/bom-edit/${encodedQuoteId}`);
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
      const actualQuoteId = quote.displayId || quote.id;

      const newQuoteId = await cloneQuoteWithFallback(actualQuoteId, user.id, {
        newUserEmail: user.email,
        newUserName: user.name,
      });

      const { data: clonedQuote, error: clonedQuoteError } = await supabase
        .from('quotes')
        .select('id, draft_bom, quote_fields')
        .eq('id', newQuoteId)
        .maybeSingle();

      if (clonedQuoteError) {
        throw new Error(clonedQuoteError.message);
      }

      if (!clonedQuote) {
        throw new Error('Unable to load newly cloned quote.');
      }

      const normalizedClonedDraftBom = ensureRecord(clonedQuote.draft_bom);
      const clonedDraftItems = ensureArray(normalizedClonedDraftBom ? normalizedClonedDraftBom['items'] : undefined);
      const hasDraftItems = Array.isArray(clonedDraftItems) && clonedDraftItems.length > 0;

      if (!hasDraftItems) {
        const { data: bomRows, error: bomError } = await supabase
          .from('bom_items')
          .select(`
            *,
            bom_level4_values (
              level4_config_id,
              entries
            )
          `)
          .eq('quote_id', newQuoteId);

        if (bomError) {
          throw new Error(bomError.message);
        }

        const normalizedDraftItems = (bomRows || []).map(item => {
          const rawConfig = (() => {
            const source = item.configuration_data;
            if (!source) return {} as Record<string, any>;
            if (typeof source === 'object') return source as Record<string, any>;
            if (typeof source === 'string') {
              try {
                return JSON.parse(source) as Record<string, any>;
              } catch {
                return {} as Record<string, any>;
              }
            }
            return {} as Record<string, any>;
          })();

          const rawSlotAssignments =
            rawConfig.slotAssignments ||
            rawConfig.slot_assignments ||
            undefined;

          const normalizedSlotAssignments = Array.isArray(rawSlotAssignments)
            ? rawSlotAssignments
            : rawSlotAssignments && typeof rawSlotAssignments === 'object'
              ? Object.entries(rawSlotAssignments).map(([slotKey, slotData]) => {
                  const slotNumber = Number.parseInt(slotKey, 10);
                  const card = (slotData || {}) as Record<string, any>;
                  const productSource = (card.product || card.card || {}) as Record<string, any>;
                  return {
                    slot: Number.isNaN(slotNumber) ? undefined : slotNumber,
                    productId:
                      card.productId ||
                      card.product_id ||
                      productSource.id ||
                      undefined,
                    name:
                      card.displayName ||
                      card.name ||
                      productSource.displayName ||
                      productSource.name ||
                      `Slot ${slotKey}`,
                    partNumber:
                      card.partNumber ||
                      card.part_number ||
                      productSource.partNumber ||
                      productSource.part_number ||
                      undefined,
                    level4Config: card.level4Config || null,
                    level4Selections: card.level4Selections || null,
                  } as SerializedSlotAssignment;
                }).filter(entry => entry.slot !== undefined)
              : undefined;

          const rackConfiguration =
            rawConfig.rackConfiguration ||
            rawConfig.rack_configuration ||
            (normalizedSlotAssignments ? buildRackLayoutFromAssignments(normalizedSlotAssignments) : undefined);

          const level4Config = rawConfig.level4Config || rawConfig.level4_config || null;
          const level4Selections = rawConfig.level4Selections || rawConfig.level4_selections || null;

          return {
            id: item.id,
            name: item.name,
            description: item.description || '',
            quantity: item.quantity || 1,
            unit_price: item.unit_price || 0,
            unit_cost: item.unit_cost || 0,
            total_price: item.total_price || (item.unit_price || 0) * (item.quantity || 1),
            total_cost: item.total_cost || (item.unit_cost || 0) * (item.quantity || 1),
            partNumber: item.part_number || undefined,
            part_number: item.part_number || undefined,
            productId: item.product_id || undefined,
            product_id: item.product_id || undefined,
            enabled: item.enabled !== false,
            product: {
              id: item.product_id || undefined,
              name: item.name,
              description: item.description || '',
              price: item.unit_price || 0,
              cost: item.unit_cost || 0,
              partNumber: item.part_number || undefined,
            },
            configuration: rawConfig.configuration || null,
            configuration_data: rawConfig,
            slotAssignments: normalizedSlotAssignments,
            rackConfiguration,
            level4Config,
            level4Selections,
            level4Values: item.bom_level4_values || [],
            approved_unit_price: item.approved_unit_price || item.unit_price || 0,
            original_unit_price: item.original_unit_price || item.unit_price || 0,
          };
        });

        const rackLayouts = normalizedDraftItems
          .map(item => ({
            productId: item.product_id || item.productId,
            productName: item.name,
            partNumber: item.partNumber,
            layout: item.rackConfiguration,
          }))
          .filter(entry => entry.layout && typeof entry.layout === 'object' && Array.isArray(entry.layout.slots));

        const level4Configurations = normalizedDraftItems
          .map(item => ({
            productId: item.product_id || item.productId,
            partNumber: item.partNumber,
            configuration: item.level4Config,
            selections: item.level4Selections,
          }))
          .filter(entry => entry.configuration || entry.selections);

        const existingDraftQuoteFields = ensureRecord(
          normalizedClonedDraftBom
            ? normalizedClonedDraftBom['quoteFields'] ?? normalizedClonedDraftBom['quote_fields']
            : undefined,
        ) ?? ensureRecord(clonedQuote.quote_fields) ?? {};

        const draftPayload = {
          ...(normalizedClonedDraftBom ?? {}),
          items: normalizedDraftItems,
          rackLayouts,
          level4Configurations,
          quoteFields: existingDraftQuoteFields,
        };

        await supabase
          .from('quotes')
          .update({ draft_bom: draftPayload })
          .eq('id', newQuoteId);
      }

      toast({
        title: 'Quote Cloned',
        description: `Successfully created new draft quote ${newQuoteId}`,
      });

      navigate(`/bom-edit/${encodeURIComponent(newQuoteId)}`);
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

      {/* Fiscal Year Selector and Pipeline Summary Cards */}
      <div className="space-y-4">
        {/* Fiscal Year Selector */}
        <div className="flex items-center gap-3">
          <span className="text-sm text-gray-400">Fiscal Year:</span>
          <Select value={selectedFiscalYear} onValueChange={setSelectedFiscalYear}>
            <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Select FY" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              {availableFiscalYears.map(fy => (
                <SelectItem key={fy} value={fy} className="text-white hover:bg-gray-700">
                  {fy}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {/* Pipeline Summary Cards */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Total Quotes */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <FileText className="h-4 w-4 text-blue-500" />
                <CardTitle className="text-white text-sm">Total Quotes</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{fiscalYearAnalytics.totalQuotes}</div>
              <p className="text-xs text-gray-400 mt-1">{selectedFiscalYear}</p>
            </CardContent>
          </Card>

          {/* Quotes In Progress - Consolidated */}
          <Card 
            className="bg-gray-900 border-gray-800 cursor-pointer hover:border-gray-600 transition-colors"
            onClick={() => setPriorityFilter('InProgress')}
          >
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <Clock className="h-4 w-4 text-yellow-500" />
                <CardTitle className="text-white text-sm">In Progress</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-white">{fiscalYearAnalytics.quotesInProgress}</div>
              <p className="text-xs text-gray-400 mt-1">Drafts & Pending</p>
            </CardContent>
          </Card>

          {/* Quotes Approved */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <CheckCircle className="h-4 w-4 text-green-500" />
                <CardTitle className="text-white text-sm">Approved</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-green-400">{fiscalYearAnalytics.quotesApproved}</div>
              <p className="text-xs text-gray-400 mt-1">{selectedFiscalYear}</p>
            </CardContent>
          </Card>

          {/* Quotes Rejected */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <div className="flex items-center gap-2">
                <XCircle className="h-4 w-4 text-red-500" />
                <CardTitle className="text-white text-sm">Rejected</CardTitle>
              </div>
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-red-400">{fiscalYearAnalytics.quotesRejected}</div>
              <p className="text-xs text-gray-400 mt-1">{selectedFiscalYear}</p>
            </CardContent>
          </Card>

          {/* Total Pipeline Value */}
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-2">
              <CardTitle className="text-white text-sm">Pipeline Value</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="text-2xl font-bold text-white">
                {canSeePrices ? `$${fiscalYearAnalytics.totalPipelineValue.toLocaleString()}` : '—'}
              </div>
              <p className="text-xs text-gray-400 mt-1">{selectedFiscalYear}</p>
            </CardContent>
          </Card>
        </div>
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
              <option value="InProgress">In Progress</option>
              <option value="Draft">Draft Only</option>
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
              const actualQuoteId = quote.displayId || quote.id;
              const isPdfLoading = Boolean(pdfLoadingStates[actualQuoteId]);
              const formattedAccount = formatAccountDisplay(quote.account);
              return (
                <div
                  key={quote.id}
                  className="flex items-center justify-between p-4 bg-gray-800 rounded-lg hover:bg-gray-750 transition-colors"
                >
                  <div className="flex-1 grid grid-cols-1 md:grid-cols-5 gap-4">
                    <div>
                      <div className="flex items-center space-x-3">
                        <span className="text-white font-bold">
                          {quote.quoteId ?? quote.displayLabel}
                        </span>
                        <Badge className={`${statusBadge.color} text-white`}>
                          {statusBadge.text}
                        </Badge>
                      </div>
                      {quote.formalQuoteId && quote.displayLabel !== quote.formalQuoteId && (
                        <p className="text-gray-400 text-sm mt-1">
                          Quote ID: {quote.formalQuoteId}
                        </p>
                      )}
                      <p className="text-gray-400 text-sm mt-1">
                        Account: {formattedAccount ?? quote.account ?? '—'}
                      </p>
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
                      <p className="text-gray-400 text-xs mt-1">Quote Review Claimed by: <span className="text-cyan-300">{(quote as any).admin_reviewer_name || (quote.adminReviewerId ? (reviewerNameById[quote.adminReviewerId] || 'Assigned reviewer') : 'Unclaimed')}</span></p>
                      {(quote.financeReviewerId || quote.financeDecisionAt || quote.financeNotes) && (
                        <p className="text-gray-400 text-xs">Finance Claimed by: <span className="text-amber-300">{(quote as any).finance_reviewer_name || (quote.financeReviewerId ? (reviewerNameById[quote.financeReviewerId] || 'Assigned reviewer') : 'Unclaimed')}</span></p>
                      )}
                      <p className="text-gray-500 text-xs mt-1">Age — Admin: {ageDaysBetween(quote.adminClaimedAt || quote.submittedAt, quote.adminDecisionAt)} · Finance: {ageDaysBetween(quote.financeClaimedAt, quote.financeDecisionAt)} · Total: {ageDaysBetween(quote.submittedAt, quote.financeDecisionAt || quote.adminDecisionAt || quote.updatedAt)}</p>
                    </div>
                  </div>
                  
                  <div className="flex flex-wrap items-center gap-2 ml-4">
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-blue-400 hover:text-blue-300 hover:bg-gray-700"
                      onClick={() => handleViewQuote(quote)}
                      title="View quote details"
                    >
                      <Eye className="h-4 w-4" />
                      <span className="text-xs ml-1">View</span>
                    </Button>

                    {quote.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-purple-400 hover:text-purple-300 hover:bg-gray-700"
                        onClick={() => handleEditDraft(quote)}
                        title="Continue editing draft"
                      >
                        <Edit className="h-4 w-4" />
                        <span className="text-xs ml-1">Edit</span>
                      </Button>
                    )}

                    {quote.status === 'draft' && (
                      <Button
                        variant="ghost"
                        size="sm"
                        className="text-red-400 hover:text-red-300 hover:bg-gray-700"
                        onClick={() => handleDeleteQuote(quote.displayId)}
                        title="Delete draft quote"
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
                        title="Clone quote into a new draft"
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
                        title="Share quote with teammates"
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
                      title="Open quote PDF in a new tab"
                      disabled={isPdfLoading}
                    >
                      {isPdfLoading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-blue-400 border-t-transparent" />
                      ) : (
                        <Eye className="h-4 w-4" />
                      )}
                    </Button>
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-green-400 hover:text-green-300 hover:bg-gray-700"
                      onClick={() => handleDownloadQuote(quote)}
                      title="Download quote as PDF"
                      disabled={isPdfLoading}
                    >
                      {isPdfLoading ? (
                        <div className="h-4 w-4 animate-spin rounded-full border-2 border-green-400 border-t-transparent" />
                      ) : (
                        <Download className="h-4 w-4" />
                      )}
                    </Button>
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

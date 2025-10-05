import React, { useState, useEffect } from 'react';
import { useParams, useSearchParams, useNavigate } from 'react-router-dom';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Alert, AlertDescription } from '@/components/ui/alert';
import { ArrowLeft, Edit, Copy, Download, FileText } from 'lucide-react';
import { supabase } from '@/integrations/supabase/client';
import { toast } from '@/hooks/use-toast';
import { useAuth } from '@/hooks/useAuth';
import { BOMItem } from '@/types/product';
import { EnhancedBOMDisplay } from './EnhancedBOMDisplay';
import {
  deserializeSlotAssignments,
  buildRackLayoutFromAssignments,
  type SerializedSlotAssignment,
} from '@/utils/slotAssignmentUtils';
import { cloneQuoteWithFallback } from '@/utils/cloneQuote';

interface Quote {
  id: string;
  status: string;
  customer_name: string;
  oracle_customer_id: string;
  sfdc_opportunity: string;
  priority: string;
  shipping_terms: string;
  payment_terms: string;
  currency: string;
  is_rep_involved: boolean;
  quote_fields: Record<string, any>;
  draft_bom: any;
  original_quote_value: number;
  discounted_value: number;
  total_cost: number;
  requested_discount: number;
  approved_discount?: number;
  original_margin?: number;
  discounted_margin?: number;
  gross_profit?: number;
  approval_notes?: string | null;
  rejection_reason?: string | null;
  reviewed_at?: string | null;
  submitted_at?: string;
  created_at: string;
  updated_at: string;
}

const QuoteViewer: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  
  const mode = searchParams.get('mode') || 'view';
  const [quote, setQuote] = useState<Quote | null>(null);
  const [bomItems, setBomItems] = useState<BOMItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const isDraft = quote?.status === 'draft';
  const isExplicitView = mode === 'view';
  const isEditable = isDraft && !isExplicitView;

  const formatCurrency = (value: number) => {
    const currency = quote?.currency || 'USD';
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency,
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    }).format(value || 0);
  };

  const formatPercent = (value: number) => {
    const absolute = Math.abs(value);
    const hasFraction = Math.abs(absolute - Math.trunc(absolute)) > 0.001;
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: hasFraction ? 1 : 0,
      maximumFractionDigits: 2
    }).format(value);
  };

  const normalizePercentage = (value?: number | null) => {
    if (value === null || value === undefined) {
      return 0;
    }

    const abs = Math.abs(value);
    if (abs > 0 && abs <= 1) {
      return value * 100;
    }

    return value;
  };

  useEffect(() => {
    if (!id) {
      setError('No quote ID provided');
      setLoading(false);
      return;
    }
    
    loadQuote(id);
  }, [id]);

  // Route guard - redirect non-draft quotes from edit mode to view mode
  useEffect(() => {
    if (!quote || loading) return;
    
    if (!isDraft && mode === 'edit') {
      toast({
        title: 'Quote Not Editable',
        description: 'This quote is not editable. Switched to view mode. Use Clone to create an editable copy.',
        variant: 'default'
      });
      navigate(`/quote/${quote.id}?mode=view`, { replace: true });
    }
  }, [quote, mode, isDraft, loading, navigate]);

  const loadQuote = async (quoteId: string) => {
    try {
      setLoading(true);
      setError(null);
      
      // Load quote data
      const { data: quoteData, error: quoteError } = await supabase
        .from('quotes')
        .select('*')
        .eq('id', quoteId)
        .single();
        
      if (quoteError) {
        throw new Error(`Failed to load quote: ${quoteError.message}`);
      }
      
      if (!quoteData) {
        throw new Error('Quote not found');
      }
      
      setQuote(quoteData);

      if (quoteData.status === 'draft' && quoteData.draft_bom?.items && Array.isArray(quoteData.draft_bom.items)) {
        const loadedItems: BOMItem[] = quoteData.draft_bom.items.map((item: any) => {
          const storedSlotAssignments = item.slotAssignments as SerializedSlotAssignment[] | undefined;
          const slotAssignments = deserializeSlotAssignments(storedSlotAssignments);
          const rackLayout = item.rackConfiguration || buildRackLayoutFromAssignments(storedSlotAssignments);

          return {
            id: item.id || crypto.randomUUID(),
            product: {
              id: item.productId || item.product_id || item.product?.id,
              name: item.name || item.product?.name,
              partNumber: item.partNumber || item.part_number || item.product?.partNumber,
              price: item.unit_price || item.product?.price || 0,
              cost: item.unit_cost || item.product?.cost || 0,
              description: item.description || item.product?.description || ''
            },
            quantity: item.quantity || 1,
            enabled: item.enabled !== false,
            partNumber: item.partNumber || item.part_number || item.product?.partNumber,
            level4Values: item.level4Values || [],
            slotAssignments,
            rackConfiguration: rackLayout,
            level4Config: item.level4Config || null,
            level4Selections: item.level4Selections || null,
          };
        });

        setBomItems(loadedItems);
      } else {
        // Load BOM items from persistent storage
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
          .eq('quote_id', quoteId);

        if (bomError) {
          console.error('Error loading BOM items:', bomError);
          setBomItems([]);
        } else {
          const loadedItems: BOMItem[] = (bomData || []).map(item => {
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
                id: item.product_id,
                name: item.name,
                partNumber: item.part_number,
                price: item.unit_price,
                cost: item.unit_cost,
                description: item.description,
                ...configData
              },
              quantity: item.quantity,
              enabled: true,
              partNumber: item.part_number,
              level4Values: item.bom_level4_values || [],
              slotAssignments,
              rackConfiguration: rackLayout,
              level4Config: normalizedLevel4Config,
              level4Selections: configData.level4Selections || null,
            };
          });

          setBomItems(loadedItems);
        }
      }
      
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Unknown error occurred';
      setError(errorMessage);
      toast({
        title: 'Error Loading Quote',
        description: errorMessage,
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  const handleCloneQuote = async () => {
    if (!quote || !user?.id) {
      toast({
        title: 'Error',
        description: 'Unable to clone quote. Please try again.',
        variant: 'destructive'
      });
      return;
    }

    try {
      const newQuoteId = await cloneQuoteWithFallback(quote.id, user.id);

      toast({
        title: 'Quote Cloned',
        description: `Successfully created new draft quote ${newQuoteId}`,
      });

      // Navigate to the BOM builder for the newly cloned quote
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

  const handleEditQuote = () => {
    if (isDraft) {
      navigate(`/quote/${quote!.id}?mode=edit`);
    } else {
      toast({
        title: 'Quote Not Editable',
        description: 'This quote cannot be edited. Use Clone to create an editable copy.',
        variant: 'default'
      });
    }
  };

  const getStatusBadge = (status: string) => {
    const statusConfig: Record<string, { color: string; text: string }> = {
      draft: { color: 'bg-gray-600', text: 'Draft' },
      submitted: { color: 'bg-blue-600', text: 'Submitted' },
      pending_approval: { color: 'bg-yellow-600', text: 'Pending Approval' },
      approved: { color: 'bg-green-600', text: 'Approved' },
      rejected: { color: 'bg-red-600', text: 'Rejected' },
      in_process: { color: 'bg-purple-600', text: 'In Process' }
    };
    return statusConfig[status] || statusConfig.draft;
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center">
          <div className="text-xl mb-2">Loading Quote...</div>
          <div className="text-muted-foreground">Please wait while we load the quote data</div>
        </div>
      </div>
    );
  }

  if (error || !quote) {
    return (
      <div className="min-h-screen bg-background text-foreground flex items-center justify-center">
        <div className="text-center max-w-md">
          <div className="text-xl mb-4 text-red-400">Quote Not Found</div>
          <div className="text-muted-foreground mb-6">{error || 'The requested quote could not be found'}</div>
          <Button onClick={() => navigate('/quotes')} variant="outline">
            <ArrowLeft className="mr-2 h-4 w-4" />
            Back to Quotes
          </Button>
        </div>
      </div>
    );
  }

  const statusBadge = getStatusBadge(quote.status);
  const finalDiscountedValue = quote.discounted_value ?? quote.original_quote_value;
  const discountAmount = Math.max(quote.original_quote_value - finalDiscountedValue, 0);
  const normalizedRequestedDiscount = normalizePercentage(quote.requested_discount);
  const normalizedApprovedDiscount =
    typeof quote.approved_discount === 'number'
      ? normalizePercentage(quote.approved_discount)
      : undefined;
  const discountDelta =
    normalizedApprovedDiscount !== undefined
      ? normalizedApprovedDiscount - normalizedRequestedDiscount
      : undefined;
  const effectiveDiscountPercent =
    normalizedApprovedDiscount !== undefined
      ? normalizedApprovedDiscount
      : normalizedRequestedDiscount;
  const hasDiscount = discountAmount > 0.01 || effectiveDiscountPercent > 0.01;
  const hasApprovalNotes = Boolean(quote.approval_notes?.trim());
  const hasRejectionReason = Boolean(quote.rejection_reason?.trim());

  return (
    <div className="min-h-screen bg-background text-foreground">
      {/* Header */}
      <div className="border-b border-border bg-card">
        <div className="container mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <Button 
                variant="ghost" 
                onClick={() => navigate('/quotes')}
                className="text-muted-foreground hover:text-foreground"
              >
                <ArrowLeft className="mr-2 h-4 w-4" />
                Back to Quotes
              </Button>
              <div>
                <h1 className="text-2xl font-bold text-foreground">
                  {quote.status === 'draft' ? 'Draft Quote' : `Quote ${quote.id}`}
                </h1>
                <p className="text-muted-foreground">{quote.customer_name}</p>
              </div>
              <Badge className={`${statusBadge.color} text-white`}>
                {statusBadge.text}
              </Badge>
            </div>
            
            <div className="flex items-center space-x-2">
              {!isEditable && (
                <Button onClick={handleCloneQuote} variant="outline">
                  <Copy className="mr-2 h-4 w-4" />
                  Clone
                </Button>
              )}
              {isDraft && (
                <Button onClick={handleEditQuote} className="bg-primary hover:bg-primary/90">
                  <Edit className="mr-2 h-4 w-4" />
                  Edit
                </Button>
              )}
              <Button variant="outline">
                <Download className="mr-2 h-4 w-4" />
                Export
              </Button>
            </div>
          </div>
        </div>
      </div>

      {/* View-only banner for non-draft quotes */}
      {!isEditable && quote.status !== 'draft' && (
        <Alert className="m-6 border-amber-600 bg-amber-50 dark:bg-amber-950/20">
          <FileText className="h-4 w-4" />
          <AlertDescription className="text-amber-800 dark:text-amber-200">
            You are viewing a {statusBadge.text.toLowerCase()} quote in read-only mode. 
            To make changes, use the Clone button to create a new editable draft.
          </AlertDescription>
        </Alert>
      )}

      {/* Content */}
      <div className="container mx-auto px-6 py-6 space-y-6">
        {/* Quote Information */}
        <Card>
          <CardHeader>
            <CardTitle>Quote Information</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <label className="text-sm font-medium text-muted-foreground">Customer</label>
                <p className="text-foreground">{quote.customer_name}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Oracle Customer ID</label>
                <p className="text-foreground">{quote.oracle_customer_id}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">SFDC Opportunity</label>
                <p className="text-foreground">{quote.sfdc_opportunity}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Priority</label>
                <p className="text-foreground">{quote.priority}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Currency</label>
                <p className="text-foreground">{quote.currency}</p>
              </div>
              <div>
                <label className="text-sm font-medium text-muted-foreground">Rep Involved</label>
                <p className="text-foreground">{quote.is_rep_involved ? 'Yes' : 'No'}</p>
              </div>
            </div>
          </CardContent>
        </Card>

        {/* Financial Summary */}
        <Card>
          <CardHeader>
            <CardTitle>Financial Summary</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Original Value</label>
                  <p
                    className={`text-xl font-bold ${hasDiscount ? 'text-muted-foreground line-through decoration-2' : 'text-foreground'}`}
                  >
                    {formatCurrency(quote.original_quote_value)}
                  </p>
                  {hasDiscount && (
                    <p className="text-xs text-muted-foreground">Before discount</p>
                  )}
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">
                    Final Total {hasDiscount ? 'After Discount' : ''}
                  </label>
                  <p className="text-2xl font-bold text-emerald-500">
                    {formatCurrency(finalDiscountedValue)}
                  </p>
                  {hasDiscount && (
                    <div className="mt-3 grid grid-cols-1 sm:grid-cols-3 gap-3 text-sm">
                      <div className="rounded-md border border-emerald-600/40 bg-emerald-900/20 p-3">
                        <p className="text-xs uppercase tracking-wide text-emerald-200">Discount %</p>
                        <p className="text-lg font-semibold text-emerald-50">
                          {formatPercent(effectiveDiscountPercent)}%
                        </p>
                      </div>
                      <div className="rounded-md border border-emerald-600/40 bg-emerald-900/20 p-3">
                        <p className="text-xs uppercase tracking-wide text-emerald-200">Discount Value</p>
                        <p className="text-lg font-semibold text-emerald-50">
                          -{formatCurrency(discountAmount)}
                        </p>
                      </div>
                      <div className="rounded-md border border-emerald-600/40 bg-emerald-900/20 p-3">
                        <p className="text-xs uppercase tracking-wide text-emerald-200">Final Total</p>
                        <p className="text-lg font-semibold text-emerald-50">
                          {formatCurrency(finalDiscountedValue)}
                        </p>
                      </div>
                    </div>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Total Cost</label>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(quote.total_cost)}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Gross Profit (Before Discount)</label>
                  <p className="text-xl font-bold text-foreground">
                    {formatCurrency(
                      typeof quote.gross_profit === 'number'
                        ? quote.gross_profit
                        : quote.original_quote_value - quote.total_cost
                    )}
                  </p>
                </div>
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Gross Profit After Discount</label>
                  <p className="text-xl font-bold text-emerald-500">
                    {formatCurrency(finalDiscountedValue - quote.total_cost)}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Requested Discount</label>
                  <p className="text-xl font-bold text-foreground">
                    {formatPercent(normalizedRequestedDiscount)}%
                  </p>
                </div>
                {normalizedApprovedDiscount !== undefined && (
                  <div>
                    <label className="text-sm font-medium text-muted-foreground">Approved Discount</label>
                    <p className="text-xl font-bold text-foreground">
                      {formatPercent(normalizedApprovedDiscount)}%
                    </p>
                  </div>
                )}
                <div>
                  <label className="text-sm font-medium text-muted-foreground">Final Margin</label>
                  <p className="text-xl font-bold text-foreground">
                    {normalizePercentage(
                      typeof quote.discounted_margin === 'number'
                        ? quote.discounted_margin
                        : finalDiscountedValue > 0
                          ? ((finalDiscountedValue - quote.total_cost) / finalDiscountedValue) * 100
                          : 0
                    ).toFixed(1)}%
                  </p>
                </div>
              </div>
            </div>
          </CardContent>
        </Card>

        {quote.status !== 'draft' && quote.status !== 'pending_approval' && (
          <Card>
            <CardHeader>
              <CardTitle>Review Outcome</CardTitle>
            </CardHeader>
            <CardContent>
              <div className="space-y-4">
                <div className="flex flex-wrap items-center gap-3 text-sm text-muted-foreground">
                  <Badge variant="secondary" className="uppercase tracking-wide">
                    {quote.status.replace('_', ' ')}
                  </Badge>
                  {quote.reviewed_at && (
                    <span>Reviewed on {new Date(quote.reviewed_at).toLocaleString()}</span>
                  )}
                  {normalizedApprovedDiscount !== undefined && (
                    <span>Approved discount: {formatPercent(normalizedApprovedDiscount)}%</span>
                  )}
                </div>

                {discountDelta !== undefined && Math.abs(discountDelta) >= 0.01 && (
                  <p className="text-sm text-muted-foreground">
                    The approved discount differs from the requested amount by {discountDelta > 0 ? '+' : '-'}
                    {Math.abs(discountDelta).toFixed(2)}%.
                  </p>
                )}

                <div className="space-y-3">
                  {hasApprovalNotes && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">Approval Notes</label>
                      <p className="rounded-md bg-muted/40 p-3 text-sm text-foreground whitespace-pre-line">
                        {quote.approval_notes.trim()}
                      </p>
                    </div>
                  )}
                  {hasRejectionReason && (
                    <div className="space-y-1">
                      <label className="text-sm font-medium text-muted-foreground">Rejection Reason</label>
                      <p className="rounded-md bg-muted/40 p-3 text-sm text-foreground whitespace-pre-line">
                        {quote.rejection_reason.trim()}
                      </p>
                    </div>
                  )}
                  {!hasApprovalNotes && !hasRejectionReason && (
                    <p className="text-sm italic text-muted-foreground">No comments were provided.</p>
                  )}
                </div>
              </div>
            </CardContent>
          </Card>
        )}

        {/* BOM Items */}
        <Card>
          <CardHeader>
            <CardTitle>Bill of Materials ({bomItems.length} items)</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {bomItems.length === 0 ? (
                <div className="text-center py-8 text-muted-foreground">
                  No BOM items in this quote
                </div>
              ) : (
                bomItems.map((item, index) => (
                  <div key={item.id || index} className="border border-border rounded-lg p-4 bg-card">
                    <div className="flex justify-between items-start">
                      <div className="flex-1">
                        <h4 className="font-medium text-foreground">{item.product.name}</h4>
                        <p className="text-sm text-muted-foreground">{item.product.description}</p>
                        <p className="text-sm text-muted-foreground">Part Number: {item.partNumber}</p>
                      </div>
                      <div className="text-right">
                        <p className="font-medium">Qty: {item.quantity}</p>
                        <p className="text-sm text-muted-foreground">
                          ${item.product.price?.toLocaleString() || '0'}
                        </p>
                        <p className="text-sm font-medium">
                          Total: ${((item.product.price || 0) * item.quantity).toLocaleString()}
                        </p>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default QuoteViewer;
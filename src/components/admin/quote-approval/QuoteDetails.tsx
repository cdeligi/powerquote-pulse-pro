
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Edit3, Save, X, Settings, Users, AlertCircle } from "lucide-react";
import QTMSConfigurationEditor from "@/components/bom/QTMSConfigurationEditor";
import { consolidateQTMSConfiguration, QTMSConfiguration, ConsolidatedQTMS } from "@/utils/qtmsConsolidation";
import { useState, useEffect, useMemo } from "react";
import { Quote, BOMItemWithDetails, QuoteWorkflowState } from "@/types/quote";
import { User } from "@/types/auth";
import { useConfiguredQuoteFields } from "@/hooks/useConfiguredQuoteFields";
import { FEATURES, usePermissions } from "@/hooks/usePermissions";
import { extractCommissionFromQuoteFields, calculatePartnerCommission } from "@/utils/marginCalculations";
import { deriveWorkflowState, getWorkflowLaneForState, isPendingWorkflowState } from "@/lib/workflow/utils";
interface QuoteDetailsProps {
  quote: Quote;
  onApprove: (payload: {
    notes?: string;
    updatedBOMItems?: BOMItemWithDetails[];
    approvedDiscount?: number;
    additionalQuoteInformation?: string;
  }) => void;
  onReject: (notes?: string) => void;
  isLoading: boolean;
  user: User | null;
  onClaim?: (lane: 'admin' | 'finance') => Promise<void>;
  isClaiming?: boolean;
}

const QuoteDetails = ({
  quote,
  onApprove,
  onReject,
  isLoading,
  user,
  onClaim,
  isClaiming,
}: QuoteDetailsProps) => {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | null>(null);
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [quoteAdditionalInfo, setQuoteAdditionalInfo] = useState('');
  const initialBOMItems = useMemo(() => {
    return (quote.bom_items || []).map((item, index) => {
      const persistedId = item.id ? String(item.id) : undefined;
      const fallbackId = `local-${index}-${Math.random().toString(36).slice(2, 8)}`;

      return {
        ...item,
        id: persistedId || fallbackId,
        persisted_id: persistedId,
        name: item.name || item.product?.name || 'Unknown Item',
        description: item.description || item.product?.description || '',
        part_number: item.part_number || item.partNumber || '',
        unit_price: item.unit_price || item.product?.price || 0,
        unit_cost: item.unit_cost || item.product?.cost || 0,
        total_price: item.total_price || (item.product?.price || 0) * (item.quantity || 1),
        margin: item.margin || 0,
        quantity: item.quantity || 1,
        product: item.product
      } as BOMItemWithDetails;
    });
  }, [quote]);
  const [bomItems, setBomItems] = useState<BOMItemWithDetails[]>(initialBOMItems);
  const [qtmsConfig, setQtmsConfig] = useState<ConsolidatedQTMS | null>(null);
  const [editingQTMS, setEditingQTMS] = useState(false);
  const [approvedDiscountInput, setApprovedDiscountInput] = useState('0');
  const [financeNotes, setFinanceNotes] = useState('');
  const { formattedFields: formattedConfiguredFields } =
    useConfiguredQuoteFields(quote.quote_fields);
  const { has } = usePermissions();
  const canShowPartnerCommission = has(FEATURES.BOM_SHOW_PARTNER_COMMISSION);

  const workflowState: QuoteWorkflowState = deriveWorkflowState(quote);
  const currentLane = getWorkflowLaneForState(workflowState);
  const isWorkflowPending = isPendingWorkflowState(workflowState);
  const userRole = user?.role ?? 'SALES';
  const canAdminAct = currentLane === 'admin' && (userRole === 'ADMIN' || userRole === 'MASTER');
  const canFinanceAct = currentLane === 'finance' && (userRole === 'FINANCE' || userRole === 'MASTER');
  const canCurrentUserAct = canAdminAct || canFinanceAct;
  const reviewedBy = (quote as any).reviewed_by as string | undefined;
  const claimedByCurrentUser = currentLane === 'admin'
    ? (quote.admin_reviewer_id ? quote.admin_reviewer_id === user?.id : reviewedBy === user?.id)
    : currentLane === 'finance'
      ? Boolean(quote.finance_reviewer_id && quote.finance_reviewer_id === user?.id)
      : false;
  const claimedByAnother = currentLane === 'admin'
    ? Boolean((quote.admin_reviewer_id && quote.admin_reviewer_id !== user?.id) || (!quote.admin_reviewer_id && reviewedBy && reviewedBy !== user?.id))
    : currentLane === 'finance'
      ? false
      : false;
  const requiresClaim = currentLane === 'finance'
    ? !claimedByCurrentUser
    : currentLane !== null && !claimedByAnother && !claimedByCurrentUser;
  const showWorkflowActions = Boolean(isWorkflowPending && canCurrentUserAct && claimedByCurrentUser);

  useEffect(() => {
    setBomItems(initialBOMItems);
    setEditingPrices({});
    setEditingQTMS(false);
  }, [initialBOMItems]);

  const normalizeDiscountPercentage = (value: number | null | undefined) => {
    if (value === null || value === undefined) {
      return 0;
    }

    return Math.abs(value) <= 1 ? value * 100 : value;
  };

  useEffect(() => {
    const normalizedApproved = typeof quote.approved_discount === 'number'
      ? normalizeDiscountPercentage(quote.approved_discount)
      : null;
    const normalizedRequested = normalizeDiscountPercentage(quote.requested_discount);
    const initialDiscount =
      normalizedApproved !== null ? normalizedApproved : normalizedRequested;
    setApprovedDiscountInput(initialDiscount.toFixed(2));
    setApprovalNotes(quote.approval_notes || '');
    setRejectionReason(quote.rejection_reason || '');
    setQuoteAdditionalInfo(quote.additional_quote_information || '');
    setFinanceNotes((quote as any).finance_notes || '');
  }, [
    quote.id,
    quote.approved_discount,
    quote.requested_discount,
    quote.approval_notes,
    quote.rejection_reason,
    quote.additional_quote_information
  ]);

  useEffect(() => {
    const item = bomItems.find(i => i.product.type === 'QTMS' && i.configuration);
    if (item && item.configuration) {
      const config = item.configuration as QTMSConfiguration;
      const consolidated = consolidateQTMSConfiguration(
        config.chassis,
        config.slotAssignments || {},
        config.hasRemoteDisplay,
        null, // remoteDisplayProduct
        config.analogConfigurations,
        config.bushingConfigurations
      );
      setQtmsConfig({ ...consolidated, id: item.id, price: item.unit_price, name: item.name, description: item.description || '' });
    } else {
      setQtmsConfig(null);
    }
  }, [bomItems]);

  const handleApprove = () => {
    const parsedDiscount = parseFloat(approvedDiscountInput);
    const sanitizedDiscount = Number.isFinite(parsedDiscount)
      ? Math.min(Math.max(parsedDiscount, 0), 100)
      : 0;
    const trimmedAdditionalInfo = quoteAdditionalInfo.trim();
    const decisionNotes = currentLane === 'finance' ? financeNotes : approvalNotes;

    onApprove({
      notes: (decisionNotes || '').trim(),
      updatedBOMItems: bomItems,
      approvedDiscount: sanitizedDiscount / 100,
      additionalQuoteInformation: trimmedAdditionalInfo || undefined
    });
    setSelectedAction(null);
  };

  const handleReject = () => {
    const trimmedReason = rejectionReason.trim();
    onReject(trimmedReason);
    setRejectionReason('');
    setSelectedAction(null);
  };

  const handlePriceEdit = (itemId: string, newPrice: string) => {
    setEditingPrices(prev => ({ ...prev, [itemId]: newPrice }));
  };

  const handlePriceUpdate = (itemId: string) => {
    const newPrice = parseFloat(editingPrices[itemId] || '0');
    setBomItems(prev => prev.map(item => {
      if (item.id === itemId) {
        const updatedItem = {
          ...item,
          unit_price: newPrice,
          total_price: newPrice * item.quantity,
          margin: newPrice > 0 ? ((newPrice - item.unit_cost) / newPrice) * 100 : 0
        };
        return updatedItem;
      }
      return item;
    }));
    
    setEditingPrices(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  const handlePriceEditCancel = (itemId: string) => {
    setEditingPrices(prev => {
      const updated = { ...prev };
      delete updated[itemId];
      return updated;
    });
  };

  const handleQTMSConfigurationSave = (updated: ConsolidatedQTMS) => {
    setBomItems(prev => prev.map(item => {
      if (item.id === updated.id) {
        const newItem = {
          ...item,
          name: updated.name,
          description: updated.description,
          part_number: updated.partNumber,
          unit_price: updated.price,
          total_price: updated.price * item.quantity,
          margin: updated.price > 0 ? ((updated.price - item.unit_cost) / updated.price) * 100 : 0,
          configuration: updated.configuration,
          product: { ...item.product, name: updated.name, description: updated.description, price: updated.price, partNumber: updated.partNumber }
        } as BOMItemWithDetails;
        return newItem;
      }
      return item;
    }));
    setQtmsConfig(updated);
    setEditingQTMS(false);
  };

  const totals = useMemo(() => {
    const totalRevenue = bomItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const totalCost = bomItems.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);
    
    // Extract commission info from quote fields (includes contract rate + spec bonus)
    const commissionInfo = extractCommissionFromQuoteFields(quote.quote_fields as Record<string, any>);
    
    // Calculate using TOTAL commission rate (contract + spec bonus)
    const partnerCommissionCost = calculatePartnerCommission(
      totalRevenue,
      commissionInfo.totalCommissionRate,
      commissionInfo.commissionType
    );
    
    // Individual breakdown amounts
    const contractCommissionAmount = calculatePartnerCommission(totalRevenue, commissionInfo.contractCommissionRate, commissionInfo.commissionType);
    const specBonusAmount = calculatePartnerCommission(totalRevenue, commissionInfo.specBonusRate, commissionInfo.commissionType);
    
    const effectiveTotalCost = totalCost + partnerCommissionCost;
    const grossProfit = totalRevenue - effectiveTotalCost;
    const marginPercentage = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return { 
      totalRevenue, 
      totalCost, 
      partnerCommissionCost,
      contractCommissionAmount,
      specBonusAmount,
      effectiveTotalCost,
      grossProfit, 
      marginPercentage,
      commissionInfo
    };
  }, [bomItems, quote.quote_fields]);

  const requestedDiscountPercentage = normalizeDiscountPercentage(quote.requested_discount);
  const approvedDiscountFromQuote = typeof quote.approved_discount === 'number'
    ? normalizeDiscountPercentage(quote.approved_discount)
    : null;
  const parsedDiscount = parseFloat(approvedDiscountInput);
  const effectiveDiscountPercentage = Number.isFinite(parsedDiscount)
    ? Math.min(Math.max(parsedDiscount, 0), 100)
    : 0;
  const discountFraction = effectiveDiscountPercentage / 100;
  const discountAmount = totals.totalRevenue * discountFraction;
  const discountedTotal = totals.totalRevenue - discountAmount;
  const discountedGrossProfit = discountedTotal - totals.effectiveTotalCost;
  const discountedMargin = discountedTotal > 0 ? (discountedGrossProfit / discountedTotal) * 100 : 0;
  const showDiscountBreakdown =
    isWorkflowPending ||
    effectiveDiscountPercentage > 0 ||
    requestedDiscountPercentage > 0 ||
    (approvedDiscountFromQuote !== null && approvedDiscountFromQuote > 0);
  const discountDelta = effectiveDiscountPercentage - requestedDiscountPercentage;
  const storedAdditionalQuoteInfo = quote.additional_quote_information?.trim() ?? '';
  const hasStoredAdditionalQuoteInfo = storedAdditionalQuoteInfo.length > 0;


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
    return `${days} day${days === 1 ? '' : 's'}`;
  };

  const submittedAt = quote.submitted_at || quote.created_at;
  const adminClaimedAt = (quote as any).admin_claimed_at || quote.submitted_at || quote.created_at;
  const adminDecidedAt = (quote as any).admin_decision_at || quote.reviewed_at;
  const financeClaimedAt = (quote as any).finance_claimed_at;
  const financeDecidedAt = (quote as any).finance_decision_at;
  const finalDecisionAt = financeDecidedAt || adminDecidedAt || quote.reviewed_at || quote.updated_at;

  const formatCurrency = (value: number) => {
    return `${quote.currency} ${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const getStatusBadge = () => {
    switch (workflowState) {
      case 'approved':
        return <Badge className="bg-green-600 text-white">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600 text-white">Rejected</Badge>;
      case 'submitted':
        return <Badge className="bg-blue-600 text-white">Submitted</Badge>;
      case 'admin_review':
        return <Badge className="bg-purple-600 text-white">Admin Review</Badge>;
      case 'finance_review':
        return <Badge className="bg-amber-600 text-white">Pending Finance Review</Badge>;
      case 'needs_revision':
        return <Badge className="bg-yellow-600 text-white">Needs Revision</Badge>;
      case 'draft':
        return <Badge className="bg-gray-600 text-white">Draft</Badge>;
      default:
        return <Badge className="bg-gray-600 text-white">{workflowState}</Badge>;
    }
  };

  return (
    <div className="space-y-6">
      {/* Quote Header */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <div className="flex flex-col gap-4 md:flex-row md:items-start md:justify-between">
            <div className="space-y-2">
              <CardTitle className="text-white">Quote Details</CardTitle>
              <div className="grid grid-cols-1 gap-2 text-sm text-gray-300 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <Label className="text-gray-400">Quote ID</Label>
                  <p className="text-white font-medium font-mono">{quote.id}</p>
                </div>
                <div>
                  <Label className="text-gray-400">Requested By</Label>
                  <p className="text-white font-medium">
                    {quote.submitted_by_name || quote.submitted_by_email || `User ${quote.user_id}`}
                  </p>
                </div>
                <div>
                  <Label className="text-gray-400">Priority</Label>
                  <div>
                    <Badge className={`${
                      quote.priority === 'Urgent' ? 'bg-red-500' :
                      quote.priority === 'High' ? 'bg-orange-500' :
                      quote.priority === 'Medium' ? 'bg-yellow-500' : 'bg-green-500'
                    } text-white`}>
                      {quote.priority}
                    </Badge>
                  </div>
                </div>
              </div>
            </div>
            <div className="flex items-start space-x-2">
              {getStatusBadge()}
            </div>
          </div>
        </CardHeader>
      </Card>

      {/* Configured Quote Fields */}
      {formattedConfiguredFields.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Quote Information</CardTitle>
          </CardHeader>
          <CardContent className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3 text-sm">
            {formattedConfiguredFields.map((field) => (
              <div key={field.id} className="space-y-1">
                <Label className="text-gray-400">{field.label}</Label>
                <p className="text-white font-medium break-words">{field.formattedValue}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      {/* Bill of Materials */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Bill of Materials ({bomItems.length})</CardTitle>
        </CardHeader>
        <CardContent className="space-y-6">
          {bomItems.length > 0 ? (
            <div className="space-y-4">
              {bomItems.map((item) => {
                const marginColor = item.margin >= 25 ? 'text-green-400' : item.margin >= 15 ? 'text-yellow-400' : 'text-red-400';

                return (
                  <div key={item.id} className="p-4 bg-gray-800/80 rounded-lg border border-gray-700">
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-3">
                      <div className="space-y-1">
                        <h4 className="text-white font-semibold">{item.name}</h4>
                        {item.description && (
                          <p className="text-gray-400 text-sm">{item.description}</p>
                        )}
                        {item.part_number && (
                          <Badge variant="outline" className="text-xs font-mono text-white border-gray-600">
                            P/N: {item.part_number}
                          </Badge>
                        )}
                      </div>

                      <div className="flex items-center gap-1 self-start">
                        {item.product?.type === 'QTMS' && item.configuration && (
                          <Button
                            size="sm"
                            variant="ghost"
                            onClick={() => setEditingQTMS(true)}
                            className="h-7 w-7 p-0 text-purple-400 hover:text-purple-300 hover:bg-purple-900/20"
                            title="Edit configuration"
                          >
                            <Settings className="h-3 w-3" />
                          </Button>
                        )}
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePriceEdit(item.id, item.unit_price.toString())}
                          className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
                          title="Edit unit price"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      </div>
                    </div>

                    <div className="mt-4 grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4 text-sm">
                      <div>
                        <span className="text-gray-400">Quantity</span>
                        <p className="text-white font-medium">{item.quantity}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Unit Price</span>
                        {editingPrices[item.id] ? (
                          <div className="flex items-center gap-2 mt-1">
                            <Input
                              type="number"
                              step="0.01"
                              value={editingPrices[item.id]}
                              onChange={(e) => handlePriceEdit(item.id, e.target.value)}
                              className="w-28 h-7 text-xs bg-gray-700 border-gray-600 text-white"
                            />
                            <Button
                              size="sm"
                              onClick={() => handlePriceUpdate(item.id)}
                              className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
                            >
                              <Save className="h-3 w-3" />
                            </Button>
                            <Button
                              size="sm"
                              variant="ghost"
                              onClick={() => handlePriceEditCancel(item.id)}
                              className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                            >
                              <X className="h-3 w-3" />
                            </Button>
                          </div>
                        ) : (
                          <p className="text-white font-medium">{formatCurrency(item.unit_price)}</p>
                        )}
                      </div>
                      <div>
                        <span className="text-gray-400">Unit Cost</span>
                        <p className="text-orange-400 font-medium">{formatCurrency(item.unit_cost)}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Extended Price</span>
                        <p className="text-white font-semibold">{formatCurrency(item.unit_price * item.quantity)}</p>
                      </div>
                      <div>
                        <span className="text-gray-400">Margin</span>
                        <p className={`font-semibold ${marginColor}`}>{item.margin.toFixed(1)}%</p>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="text-gray-400 text-center py-6">No BOM items found for this quote.</div>
          )}

          {bomItems.length > 0 && (
            <div className="space-y-4 bg-gray-800/60 border border-gray-700 rounded-lg p-4">
              <div className="flex flex-col gap-3">
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Subtotal</span>
                  <span className="text-white font-medium">{formatCurrency(totals.totalRevenue)}</span>
                </div>
                
                {/* Partner Commission Display with Breakdown */}
                {canShowPartnerCommission && totals.partnerCommissionCost > 0 && (
                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-gray-400 flex items-center gap-1">
                        <Users className="h-3 w-3" />
                        Partner Commission ({(totals.commissionInfo.totalCommissionRate * 100).toFixed(0)}%)
                      </span>
                      <span className="text-purple-400 font-medium">{formatCurrency(totals.partnerCommissionCost)}</span>
                    </div>
                    {/* Show breakdown if both rates are present */}
                    {totals.commissionInfo.contractCommissionRate > 0 && totals.commissionInfo.specBonusRate > 0 && (
                      <div className="pl-5 space-y-0.5 text-xs">
                        <div className="flex items-center justify-between text-gray-500">
                          <span>Contract Rate ({(totals.commissionInfo.contractCommissionRate * 100).toFixed(0)}%)</span>
                          <span>{formatCurrency(totals.contractCommissionAmount)}</span>
                        </div>
                        <div className="flex items-center justify-between text-gray-500">
                          <span>Spec Bonus ({(totals.commissionInfo.specBonusRate * 100).toFixed(0)}%)</span>
                          <span>{formatCurrency(totals.specBonusAmount)}</span>
                        </div>
                      </div>
                    )}
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Product Cost</span>
                  <span className="text-orange-400 font-medium">{formatCurrency(totals.totalCost)}</span>
                </div>
                
                {/* Total Cost including Commission */}
                {canShowPartnerCommission && totals.partnerCommissionCost > 0 && (
                  <div className="flex items-center justify-between text-sm font-medium">
                    <span className="text-gray-400">Total Cost (incl. Commission)</span>
                    <span className="text-orange-400">{formatCurrency(totals.effectiveTotalCost)}</span>
                  </div>
                )}
                
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Gross Profit</span>
                  <span className="text-green-400 font-medium">{formatCurrency(totals.grossProfit)}</span>
                </div>
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Margin</span>
                  <span className={`${
                    totals.marginPercentage >= 25 ? 'text-green-400' :
                    totals.marginPercentage >= 15 ? 'text-yellow-400' : 'text-red-400'
                  } font-semibold`}>
                    {totals.marginPercentage.toFixed(1)}%
                  </span>
                </div>
              </div>

              {showDiscountBreakdown && (
                <div className="space-y-3 pt-3 border-t border-gray-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Discount ({effectiveDiscountPercentage.toFixed(2)}%)</span>
                    <span className="text-red-400 font-medium">-{formatCurrency(Math.abs(discountAmount))}</span>
                  </div>
                  <div className="space-y-2">
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Requested Discount</span>
                      <span>{requestedDiscountPercentage.toFixed(2)}%</span>
                    </div>
                    {approvedDiscountFromQuote !== null && !isWorkflowPending && (
                      <div className="flex items-center justify-between text-xs text-gray-400">
                        <span>Approved Discount</span>
                        <span>{approvedDiscountFromQuote.toFixed(2)}%</span>
                      </div>
                    )}
                    {isWorkflowPending && canCurrentUserAct && (
                      <div className="space-y-1">
                        <Label className="text-gray-400 text-xs uppercase">Approved Discount to Apply</Label>
                        <div className="flex flex-col sm:flex-row sm:items-center gap-2">
                          <div className="flex items-center gap-1">
                            <Input
                              type="number"
                              step="0.1"
                              min="0"
                              max="100"
                              value={approvedDiscountInput}
                              onChange={(e) => setApprovedDiscountInput(e.target.value)}
                              className="w-28 h-8 bg-gray-800 border-gray-700 text-white text-right"
                            />
                            <span className="text-gray-400 text-sm">%</span>
                          </div>
                          <Button
                            variant="ghost"
                            size="sm"
                            className="h-7 px-2 text-xs text-gray-300 border border-gray-700 hover:bg-gray-800"
                            onClick={() => setApprovedDiscountInput(requestedDiscountPercentage.toFixed(2))}
                            disabled={Math.abs(effectiveDiscountPercentage - requestedDiscountPercentage) < 0.01}
                          >
                            Use Requested
                          </Button>
                        </div>
                        {approvedDiscountFromQuote !== null && Math.abs(effectiveDiscountPercentage - approvedDiscountFromQuote) > 0.01 && (
                          <p className="text-xs text-gray-500">
                            Previous approved value: {approvedDiscountFromQuote.toFixed(2)}%
                          </p>
                        )}
                      </div>
                    )}
                    {isWorkflowPending && canCurrentUserAct && Math.abs(discountDelta) > 0.01 && (
                      <div className="text-xs text-gray-400">
                        {discountDelta > 0 ? 'Increasing' : 'Decreasing'} discount by {Math.abs(discountDelta).toFixed(2)}% from request.
                      </div>
                    )}
                  </div>
                  <div className="flex items-center justify-between text-base font-semibold">
                    <span className="text-gray-200">Final Total</span>
                    <span className="text-green-400">{formatCurrency(discountedTotal)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Gross Profit After Discount</span>
                    <span className="text-emerald-400 font-medium">{formatCurrency(discountedGrossProfit)}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Final Margin</span>
                    <span className={`${
                      discountedMargin >= 25 ? 'text-green-400' :
                      discountedMargin >= 15 ? 'text-yellow-400' : 'text-red-400'
                    } font-semibold`}>
                      {discountedMargin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              )}

              {quote.discount_justification && (
                <div className="pt-3 border-t border-gray-700">
                  <Label className="text-gray-400 text-xs uppercase">Discount Justification</Label>
                  <p className="text-gray-200 mt-1 text-sm whitespace-pre-line">{quote.discount_justification}</p>
                </div>
              )}
            </div>
          )}
        </CardContent>
      </Card>

      {qtmsConfig && (
        <QTMSConfigurationEditor
          consolidatedQTMS={qtmsConfig}
          onSave={handleQTMSConfigurationSave}
          onClose={() => setEditingQTMS(false)}
          canSeePrices={true}
          readOnly={!editingQTMS}
        />
      )}

      {/* Approval Actions */}
      {isWorkflowPending && currentLane && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">
              {currentLane === 'finance' ? 'Finance Decision' : 'Approval Actions'}
            </CardTitle>
            {!canCurrentUserAct && (
              <p className="text-sm text-gray-400">Only {currentLane === 'finance' ? 'finance' : 'admin'} reviewers can act on this quote.</p>
            )}
          </CardHeader>
          <CardContent className="space-y-4">
            {canCurrentUserAct && claimedByAnother && (
              <div className="flex items-center gap-2 rounded-md border border-gray-700 bg-gray-800 px-4 py-3 text-sm text-gray-300">
                <AlertCircle className="h-4 w-4 text-yellow-400" />
                <span>This quote is currently assigned to another {currentLane === 'finance' ? 'finance' : 'admin'} reviewer.</span>
              </div>
            )}

            {canCurrentUserAct && requiresClaim && !claimedByAnother && onClaim && (
              <div className="flex flex-col gap-3 rounded-md border border-gray-700 bg-gray-800 px-4 py-3">
                <p className="text-sm text-gray-300">Claim this quote to take ownership of the {currentLane === 'finance' ? 'finance' : 'admin'} review lane.</p>
                <div>
                  <Button
                    onClick={() => onClaim(currentLane)}
                    disabled={isClaiming}
                    className="bg-blue-600 hover:bg-blue-700 text-white"
                  >
                    {isClaiming ? 'Claiming...' : `Claim ${currentLane === 'finance' ? 'Finance' : 'Admin'} Lane`}
                  </Button>
                </div>
              </div>
            )}

            {showWorkflowActions && (
              <>
                <div className="grid grid-cols-2 gap-3">
                  <Button
                    onClick={() => setSelectedAction('approve')}
                    variant={selectedAction === 'approve' ? 'default' : 'outline'}
                    className={`
                      ${
                        selectedAction === 'approve'
                          ? 'bg-green-600 hover:bg-green-700 text-white'
                          : 'border-green-600 text-green-400 hover:bg-green-600 hover:text-white'
                      }
                    `}
                    disabled={isLoading}
                  >
                    <CheckCircle className="h-4 w-4 mr-2" />
                    {currentLane === 'finance' ? 'Approve (Finance)' : 'Approve Quote'}
                  </Button>

                  <Button
                    onClick={() => setSelectedAction('reject')}
                    variant={selectedAction === 'reject' ? 'default' : 'outline'}
                    className={`
                      ${
                        selectedAction === 'reject'
                          ? 'bg-red-600 hover:bg-red-700 text-white'
                          : 'border-red-600 text-red-400 hover:bg-red-600 hover:text-white'
                      }
                    `}
                    disabled={isLoading}
                  >
                    <XCircle className="h-4 w-4 mr-2" />
                    {currentLane === 'finance' ? 'Reject (Finance)' : 'Reject Quote'}
                  </Button>
                </div>

                {selectedAction === 'approve' && (
                  <div className="space-y-3 p-4 bg-green-900/20 border border-green-600 rounded-lg">
                    <Label htmlFor="approval-notes" className="text-white">
                      {currentLane === 'finance' ? 'Finance Notes' : 'Approval Notes (Optional)'}
                    </Label>
                    <Textarea
                      id="approval-notes"
                      value={currentLane === 'finance' ? financeNotes : approvalNotes}
                      onChange={(e) => currentLane === 'finance' ? setFinanceNotes(e.target.value) : setApprovalNotes(e.target.value)}
                      placeholder={currentLane === 'finance' ? 'Required: explain finance decision and justification...' : 'Add any notes about the approval...'}
                      className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                    />

                    <div className="space-y-2">
                      <Label htmlFor="additional-quote-info" className="text-white">
                        Additional Quote Information (Visible on PDF)
                      </Label>
                      <Textarea
                        id="additional-quote-info"
                        value={quoteAdditionalInfo}
                        onChange={(e) => setQuoteAdditionalInfo(e.target.value)}
                        placeholder="Add optional context or special instructions to include on the quote PDF..."
                        className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                      />
                      <p className="text-xs text-gray-400">
                        This text will be added to the quote PDF when provided.
                      </p>
                    </div>
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleApprove}
                        className="bg-green-600 hover:bg-green-700 text-white"
                        disabled={isLoading || (currentLane === 'finance' && !financeNotes.trim())}
                      >
                        {isLoading ? 'Processing...' : 'Confirm Approval'}
                      </Button>
                      <Button
                        onClick={() => {
                          setSelectedAction(null);
                          setApprovalNotes(quote.approval_notes || '');
                          setQuoteAdditionalInfo(quote.additional_quote_information || '');
    setFinanceNotes((quote as any).finance_notes || '');
                        }}
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}

                {selectedAction === 'reject' && (
                  <div className="space-y-3 p-4 bg-red-900/20 border border-red-600 rounded-lg">
                    <Label htmlFor="rejection-reason" className="text-white">
                      Rejection Reason *
                    </Label>
                    <Textarea
                      id="rejection-reason"
                      value={rejectionReason}
                      onChange={(e) => setRejectionReason(e.target.value)}
                      placeholder="Explain why this quote is being rejected..."
                      className="bg-gray-800 border-gray-700 text-white min-h-[100px]"
                      required
                    />
                    <div className="flex space-x-2">
                      <Button
                        onClick={handleReject}
                        className="bg-red-600 hover:bg-red-700 text-white"
                        disabled={isLoading || !rejectionReason.trim()}
                      >
                        {isLoading ? 'Processing...' : 'Confirm Rejection'}
                      </Button>
                      <Button
                        onClick={() => setSelectedAction(null)}
                        variant="outline"
                        className="border-gray-600 text-gray-300 hover:bg-gray-800"
                        disabled={isLoading}
                      >
                        Cancel
                      </Button>
                    </div>
                  </div>
                )}
              </>
            )}
          </CardContent>
        </Card>
      )}
      {/* Status Information for Non-Pending Quotes */}
      {!isWorkflowPending && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Quote Status & Approval History</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-3">
              <p className="text-gray-400">
                This quote has been <span className="text-white font-medium">{workflowState.replace('_', ' ')}</span>
                {quote.reviewed_at && <span> on {new Date(quote.reviewed_at).toLocaleDateString()}</span>}
              </p>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
                <div className="bg-gray-800 p-3 rounded">
                  <p className="text-xs text-gray-400">Admin Step Age</p>
                  <p className="text-white font-semibold">{ageDaysBetween(adminClaimedAt, adminDecidedAt)}</p>
                </div>
                <div className="bg-gray-800 p-3 rounded">
                  <p className="text-xs text-gray-400">Finance Step Age</p>
                  <p className="text-white font-semibold">{ageDaysBetween(financeClaimedAt, financeDecidedAt)}</p>
                </div>
                <div className="bg-gray-800 p-3 rounded">
                  <p className="text-xs text-gray-400">Total Case Age</p>
                  <p className="text-white font-semibold">{ageDaysBetween(submittedAt, finalDecisionAt)}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <div className="bg-gray-800 p-3 rounded">
                  <p className="text-xs text-gray-400">Quote Review Claimed by</p>
                  <p className="text-cyan-300 font-semibold mt-1">{(quote as any).admin_reviewer_name || quote.admin_reviewer_id || 'Unclaimed'}</p>
                  <p className="text-xs text-gray-500 mt-1">{(quote as any).admin_claimed_at ? new Date((quote as any).admin_claimed_at).toLocaleString() : ''}</p>
                </div>
                <div className="bg-gray-800 p-3 rounded">
                  <p className="text-xs text-gray-400">Finance Claimed by</p>
                  <p className="text-amber-300 font-semibold mt-1">{(quote as any).finance_reviewer_name || quote.finance_reviewer_id || 'Unclaimed'}</p>
                  <p className="text-xs text-gray-500 mt-1">{(quote as any).finance_claimed_at ? new Date((quote as any).finance_claimed_at).toLocaleString() : ''}</p>
                </div>
              </div>

              {quote.approval_notes && (
                <div>
                  <Label className="text-gray-400">Admin Notes</Label>
                  <p className="text-gray-300 bg-gray-800 p-2 rounded mt-1 whitespace-pre-wrap">{quote.approval_notes}</p>
                </div>
              )}
              {((quote as any).finance_notes || quote.finance_decision_notes) && (
                <div>
                  <Label className="text-gray-400">Finance Notes</Label>
                  <p className="text-gray-300 bg-gray-800 p-2 rounded mt-1 whitespace-pre-wrap">{(quote as any).finance_notes || quote.finance_decision_notes}</p>
                </div>
              )}
              {hasStoredAdditionalQuoteInfo && (
                <div>
                  <Label className="text-gray-400">Additional Quote Information</Label>
                  <p className="text-gray-300 bg-gray-800 p-2 rounded mt-1 whitespace-pre-wrap">{storedAdditionalQuoteInfo}</p>
                </div>
              )}
              {quote.rejection_reason && (
                <div>
                  <Label className="text-gray-400">Rejection Reason</Label>
                  <p className="text-gray-300 bg-gray-800 p-2 rounded mt-1">{quote.rejection_reason}</p>
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default QuoteDetails;

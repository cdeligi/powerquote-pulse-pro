
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { CheckCircle, XCircle, Edit3, Save, X, Settings } from "lucide-react";
import QTMSConfigurationEditor from "@/components/bom/QTMSConfigurationEditor";
import { consolidateQTMSConfiguration, QTMSConfiguration, ConsolidatedQTMS } from "@/utils/qtmsConsolidation";
import { useState, useEffect, useMemo } from "react";
import { Quote, BOMItemWithDetails } from "@/types/quote";
import { User } from "@/types/auth";
import { useConfiguredQuoteFields } from "@/hooks/useConfiguredQuoteFields";

interface QuoteDetailsProps {
  quote: Quote;
  onApprove: (notes?: string, updatedBOMItems?: BOMItemWithDetails[]) => void;
  onReject: (notes?: string) => void;
  isLoading: boolean;
  user: User | null;
}

const QuoteDetails = ({
  quote,
  onApprove,
  onReject,
  isLoading,
  user
}: QuoteDetailsProps) => {
  const [approvalNotes, setApprovalNotes] = useState('');
  const [rejectionReason, setRejectionReason] = useState('');
  const [selectedAction, setSelectedAction] = useState<'approve' | 'reject' | null>(null);
  const [editingPrices, setEditingPrices] = useState<Record<string, string>>({});
  const [bomItems, setBomItems] = useState<BOMItemWithDetails[]>(
    (quote.bom_items || []).map((item, index) => {
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
        total_price: item.total_price || (item.product?.price || 0) * item.quantity,
        margin: item.margin || 0,
        quantity: item.quantity || 1,
        product: item.product
      } as BOMItemWithDetails;
    })
  );
  const [qtmsConfig, setQtmsConfig] = useState<ConsolidatedQTMS | null>(null);
  const [editingQTMS, setEditingQTMS] = useState(false);
  const { formattedFields: formattedConfiguredFields, unmappedFields: unmappedQuoteFields } =
    useConfiguredQuoteFields(quote.quote_fields);

  useEffect(() => {
    const item = bomItems.find(i => i.product.type === 'QTMS' && i.configuration);
    if (item && item.configuration) {
      const config = item.configuration as QTMSConfiguration;
      const consolidated = consolidateQTMSConfiguration(
        config.chassis,
        config.slotAssignments,
        config.hasRemoteDisplay,
        config.analogConfigurations as any,
        config.bushingConfigurations
      );
      setQtmsConfig({ ...consolidated, id: item.id, price: item.unit_price, name: item.name, description: item.description || '' });
    } else {
      setQtmsConfig(null);
    }
  }, [bomItems]);

  const handleApprove = () => {
    onApprove(approvalNotes, bomItems);
    setApprovalNotes('');
    setSelectedAction(null);
  };

  const handleReject = () => {
    onReject(rejectionReason);
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

  const calculateTotals = () => {
    const totalRevenue = bomItems.reduce((sum, item) => sum + (item.unit_price * item.quantity), 0);
    const totalCost = bomItems.reduce((sum, item) => sum + (item.unit_cost * item.quantity), 0);
    const grossProfit = totalRevenue - totalCost;
    const marginPercentage = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;

    return { totalRevenue, totalCost, grossProfit, marginPercentage };
  };

  const totals = calculateTotals();

  const normalizeDiscountPercentage = (value: number | null | undefined) => {
    if (!value) {
      return 0;
    }

    return Math.abs(value) <= 1 ? value * 100 : value;
  };

  const requestedDiscountPercentage = normalizeDiscountPercentage(quote.requested_discount);
  const approvedDiscountPercentage = normalizeDiscountPercentage(quote.approved_discount);
  const effectiveDiscountPercentage = approvedDiscountPercentage > 0 ? approvedDiscountPercentage : requestedDiscountPercentage;
  const discountFraction = effectiveDiscountPercentage / 100;
  const discountAmount = totals.totalRevenue * discountFraction;
  const discountedTotal = totals.totalRevenue - discountAmount;
  const discountedGrossProfit = discountedTotal - totals.totalCost;
  const discountedMargin = discountedTotal > 0 ? (discountedGrossProfit / discountedTotal) * 100 : 0;
  const hasDiscount = effectiveDiscountPercentage > 0;

  const formatCurrency = (value: number) => {
    return `${quote.currency} ${value.toLocaleString(undefined, {
      minimumFractionDigits: 2,
      maximumFractionDigits: 2
    })}`;
  };

  const getStatusBadge = () => {
    switch (quote.status) {
      case 'approved':
        return <Badge className="bg-green-600 text-white">Approved</Badge>;
      case 'rejected':
        return <Badge className="bg-red-600 text-white">Rejected</Badge>;
      case 'pending_approval':
        return <Badge className="bg-yellow-600 text-white">Pending Approval</Badge>;
      case 'draft':
        return <Badge className="bg-gray-600 text-white">Draft</Badge>;
      default:
        return <Badge className="bg-gray-600 text-white">Unknown</Badge>;
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

      {/* Unmapped fields fallback */}
      {unmappedQuoteFields.length > 0 && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Additional Quote Information</CardTitle>
          </CardHeader>
          <CardContent className="space-y-3">
            {unmappedQuoteFields.map(({ key, value }) => (
              <div key={key} className="grid grid-cols-2 gap-4">
                <Label className="text-gray-400 capitalize">{key.replace(/_/g, ' ')}</Label>
                <p className="text-white">{String(value ?? '—')}</p>
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
                <div className="flex items-center justify-between text-sm">
                  <span className="text-gray-400">Total Cost</span>
                  <span className="text-orange-400 font-medium">{formatCurrency(totals.totalCost)}</span>
                </div>
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

              {hasDiscount && (
                <div className="space-y-3 pt-3 border-t border-gray-700">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-400">Discount ({effectiveDiscountPercentage.toFixed(1)}%)</span>
                    <span className="text-red-400 font-medium">-{formatCurrency(Math.abs(discountAmount))}</span>
                  </div>
                  {requestedDiscountPercentage > 0 && (
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Requested Discount</span>
                      <span>{requestedDiscountPercentage.toFixed(1)}%</span>
                    </div>
                  )}
                  {typeof quote.approved_discount === 'number' && approvedDiscountPercentage > 0 && (
                    <div className="flex items-center justify-between text-xs text-gray-400">
                      <span>Approved Discount</span>
                      <span>{approvedDiscountPercentage.toFixed(1)}%</span>
                    </div>
                  )}
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
      {quote.status === 'pending_approval' && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Approval Actions</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="grid grid-cols-2 gap-3">
              <Button
                onClick={() => setSelectedAction('approve')}
                variant={selectedAction === 'approve' ? 'default' : 'outline'}
                className={`${
                  selectedAction === 'approve' 
                    ? 'bg-green-600 hover:bg-green-700 text-white' 
                    : 'border-green-600 text-green-400 hover:bg-green-600 hover:text-white'
                }`}
                disabled={isLoading}
              >
                <CheckCircle className="h-4 w-4 mr-2" />
                Approve Quote
              </Button>
              
              <Button
                onClick={() => setSelectedAction('reject')}
                variant={selectedAction === 'reject' ? 'default' : 'outline'}
                className={`${
                  selectedAction === 'reject' 
                    ? 'bg-red-600 hover:bg-red-700 text-white' 
                    : 'border-red-600 text-red-400 hover:bg-red-600 hover:text-white'
                }`}
                disabled={isLoading}
              >
                <XCircle className="h-4 w-4 mr-2" />
                Reject Quote
              </Button>
            </div>

            {selectedAction === 'approve' && (
              <div className="space-y-3 p-4 bg-green-900/20 border border-green-600 rounded-lg">
                <Label htmlFor="approval-notes" className="text-white">
                  Approval Notes (Optional)
                </Label>
                <Textarea
                  id="approval-notes"
                  value={approvalNotes}
                  onChange={(e) => setApprovalNotes(e.target.value)}
                  placeholder="Add any notes about the approval..."
                  className="bg-gray-800 border-gray-700 text-white min-h-[80px]"
                />
                <div className="flex space-x-2">
                  <Button
                    onClick={handleApprove}
                    className="bg-green-600 hover:bg-green-700 text-white"
                    disabled={isLoading}
                  >
                    {isLoading ? 'Processing...' : 'Confirm Approval'}
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
          </CardContent>
        </Card>
      )}

      {/* Status Information for Non-Pending Quotes */}
      {quote.status !== 'pending_approval' && (
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Quote Status</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-2">
              <p className="text-gray-400">
                This quote has been <span className="text-white font-medium">{quote.status.replace('_', ' ')}</span>
                {quote.reviewed_at && (
                  <span> on {new Date(quote.reviewed_at).toLocaleDateString()}</span>
                )}
              </p>
              {quote.approval_notes && (
                <div>
                  <Label className="text-gray-400">Approval Notes:</Label>
                  <p className="text-gray-300 bg-gray-800 p-2 rounded mt-1">{quote.approval_notes}</p>
                </div>
              )}
              {quote.rejection_reason && (
                <div>
                  <Label className="text-gray-400">Rejection Reason:</Label>
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

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { BOMItem } from '@/types/product';
import { Quote, QuotePriority, Currency, QuoteStatus } from '@/types/quote';
import { 
  ShoppingCart, 
  FileText, 
  Save, 
  Send, 
  Edit, 
  Trash2, 
  Plus,
  Calculator,
  DollarSign,
  Package,
  TrendingUp,
  AlertTriangle,
  Percent,
  Download,
  Eye
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';
import { generateQuotePDF } from '@/utils/pdfGenerator';

interface EnhancedBOMDisplayProps {
  bomItems: BOMItem[];
  onUpdateBOM: (items: BOMItem[]) => void;
  onEditConfiguration?: (item: BOMItem) => void;
  onSubmitQuote: () => void;
  onSaveDraft?: () => void;
  canSeePrices: boolean;
  canSeeCosts?: boolean;
  canEditPartNumber?: boolean;
  productMap?: Map<string, string>;
  isSubmitting?: boolean;
  isDraftMode?: boolean;
  currentQuoteId?: string | null;
  draftName?: string | null;
  quoteFields?: Record<string, any>;
  quoteMetadata?: Partial<Quote> | null;
  discountPercentage?: number;
  discountJustification?: string;
  onDiscountChange?: (percentage: number, justification: string) => void;
}

export const EnhancedBOMDisplay = ({
  bomItems,
  onUpdateBOM,
  onEditConfiguration,
  onSubmitQuote,
  onSaveDraft,
  canSeePrices,
  canSeeCosts = false,
  canEditPartNumber = false,
  productMap,
  isSubmitting = false,
  isDraftMode = false,
  currentQuoteId,
  draftName,
  quoteFields,
  quoteMetadata,
  discountPercentage = 0,
  discountJustification = '',
  onDiscountChange
}: EnhancedBOMDisplayProps) => {
  const [editingQuantities, setEditingQuantities] = useState<Record<string, number>>({});
  const [editingPrices, setEditingPrices] = useState<Record<string, number>>({});
  const [localDiscountPercentage, setLocalDiscountPercentage] = useState(discountPercentage);
  const [localDiscountJustification, setLocalDiscountJustification] = useState(discountJustification);

  // Calculate totals with price adjustments
  const subtotal = bomItems.reduce((sum, item) => {
    const adjustedPrice = editingPrices[item.id] || item.product.price;
    return sum + (adjustedPrice * item.quantity);
  }, 0);
  const totalCost = bomItems.reduce((sum, item) => sum + ((item.product.cost || 0) * item.quantity), 0);
  const grossProfit = subtotal - totalCost;
  const margin = subtotal > 0 ? (grossProfit / subtotal) * 100 : 0;
  
  // Discount calculations
  const discountAmount = subtotal * (localDiscountPercentage / 100);
  const discountedSubtotal = subtotal - discountAmount;
  const discountedGrossProfit = discountedSubtotal - totalCost;
  const discountedMargin = discountedSubtotal > 0 ? (discountedGrossProfit / discountedSubtotal) * 100 : 0;

  const handleQuantityChange = (itemId: string, newQuantity: number) => {
    if (newQuantity < 1) return;
    
    const updatedItems = bomItems.map(item =>
      item.id === itemId ? { ...item, quantity: newQuantity } : item
    );
    onUpdateBOM(updatedItems);
    
    // Clear the editing state for this item
    setEditingQuantities(prev => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
  };

  const handlePriceIncrease = (itemId: string, newPrice: number) => {
    const item = bomItems.find(item => item.id === itemId);
    if (!item) return;
    
    // Use original_unit_price if available, otherwise use current product.price as original
    const originalPrice = item.original_unit_price || item.product.price || 0;
    
    if (newPrice < originalPrice) {
      toast({
        title: "Invalid Price",
        description: `Price cannot be lower than the original price of $${originalPrice.toFixed(2)}`,
        variant: "destructive"
      });
      return;
    }

    const updatedItems = bomItems.map(existingItem => {
      if (existingItem.id === itemId) {
        const priceChange = {
          timestamp: new Date().toISOString(),
          oldPrice: existingItem.product.price,
          newPrice: newPrice,
          reason: "Manual price adjustment"
        };
        
        return {
          ...existingItem,
          // Store original price on first edit if not already stored
          original_unit_price: existingItem.original_unit_price || existingItem.product.price,
          approved_unit_price: newPrice, // Track the approved price
          product: {
            ...existingItem.product,
            price: newPrice
          },
          priceHistory: [...(existingItem.priceHistory || []), priceChange]
        };
      }
      return existingItem;
    });
    
    onUpdateBOM(updatedItems);
    
    // Clear the editing state for this item
    setEditingPrices(prev => {
      const { [itemId]: _, ...rest } = prev;
      return rest;
    });
    
    toast({
      title: 'Price Updated',
      description: `Price increased to ${formatCurrency(newPrice)}`,
    });
  };

  // Handle resetting price to original
  const handleResetPrice = (itemId: string) => {
    const item = bomItems.find(item => item.id === itemId);
    if (!item) return;
    
    const originalPrice = item.original_unit_price || item.product.price;
    
    const updatedItems = bomItems.map(existingItem => {
      if (existingItem.id === itemId) {
        const priceChange = {
          timestamp: new Date().toISOString(),
          oldPrice: existingItem.product.price,
          newPrice: originalPrice,
          reason: "Reset to original price"
        };
        
        return {
          ...existingItem,
          product: {
            ...existingItem.product,
            price: originalPrice
          },
          priceHistory: [...(existingItem.priceHistory || []), priceChange]
        };
      }
      return existingItem;
    });
    
    onUpdateBOM(updatedItems);
    
    toast({
      title: 'Price Reset',
      description: `Price reset to original value: ${formatCurrency(originalPrice)}`,
    });
  };

  const handleDiscountChange = (percentage: number, justification: string) => {
    setLocalDiscountPercentage(percentage);
    setLocalDiscountJustification(justification);
    
    if (onDiscountChange) {
      onDiscountChange(percentage, justification);
    }
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 20) return 'text-green-400';
    if (margin >= 10) return 'text-yellow-400';
    return 'text-red-400';
  };

  const handleRemoveItem = (itemId: string) => {
    const updatedItems = bomItems.filter(item => item.id !== itemId);
    onUpdateBOM(updatedItems);
    
    toast({
      title: 'Item Removed',
      description: 'The item has been removed from your bill of materials.'
    });
  };

  const getItemDisplayName = (item: BOMItem) => {
    return productMap?.get(item.product.id) || item.product.displayName || item.product.name;
  };

  const formatCurrency = (amount: number) => {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: 'USD'
    }).format(amount);
  };

  const coalesce = <T,>(...values: Array<T | undefined | null>) => {
    for (const value of values) {
      if (value !== undefined && value !== null && value !== '') {
        return value;
      }
    }
    return undefined;
  };

  const handleGeneratePDF = async (action: 'view' | 'download') => {
    if (bomItems.length === 0) {
      toast({
        title: 'No Items',
        description: 'Please add items to your BOM before generating PDF',
        variant: 'destructive'
      });
      return;
    }

    try {
      const existingDraftFields = (quoteMetadata?.draft_bom as Record<string, any> | undefined)?.quoteFields;
      const mergedQuoteFields = {
        ...(existingDraftFields && typeof existingDraftFields === 'object' ? existingDraftFields : {}),
        ...(quoteMetadata?.quote_fields && typeof quoteMetadata.quote_fields === 'object' ? quoteMetadata.quote_fields : {}),
        ...(quoteFields && typeof quoteFields === 'object' ? quoteFields : {})
      };

      const status: QuoteStatus = isDraftMode
        ? 'draft'
        : (quoteMetadata?.status as QuoteStatus | undefined) || 'pending_approval';

      const quoteId = coalesce(currentQuoteId, quoteMetadata?.id, 'New Quote') as string;
      const customerName = coalesce(
        quoteMetadata?.customer_name,
        draftName,
        mergedQuoteFields.customer_name,
        mergedQuoteFields.customerName,
        'Draft Quote'
      ) as string;

      const oracleCustomerId = coalesce(
        quoteMetadata?.oracle_customer_id,
        mergedQuoteFields.oracle_customer_id,
        mergedQuoteFields.oracleCustomerId,
        'TBD'
      ) as string;

      const sfdcOpportunity = coalesce(
        quoteMetadata?.sfdc_opportunity,
        mergedQuoteFields.sfdc_opportunity,
        mergedQuoteFields.sfdcOpportunity,
        'TBD'
      ) as string;

      const priority = (coalesce(
        quoteMetadata?.priority,
        mergedQuoteFields.priority,
        mergedQuoteFields.quotePriority,
        'Medium'
      ) || 'Medium') as QuotePriority;

      const currency = (coalesce(
        quoteMetadata?.currency,
        mergedQuoteFields.currency,
        mergedQuoteFields.quoteCurrency,
        'USD'
      ) || 'USD') as Currency;

      const shippingTerms = coalesce(
        quoteMetadata?.shipping_terms,
        mergedQuoteFields.shipping_terms,
        mergedQuoteFields.shippingTerms,
        'TBD'
      ) as string;

      const paymentTerms = coalesce(
        quoteMetadata?.payment_terms,
        mergedQuoteFields.payment_terms,
        mergedQuoteFields.paymentTerms,
        'TBD'
      ) as string;

      const isRepInvolved = Boolean(coalesce(
        quoteMetadata?.is_rep_involved,
        mergedQuoteFields.is_rep_involved,
        mergedQuoteFields.isRepInvolved,
        false
      ));

      const draftBomData = {
        ...(quoteMetadata?.draft_bom || {}),
        quoteFields: mergedQuoteFields
      };

      const quoteInfo: Partial<Quote> = {
        ...quoteMetadata,
        id: quoteId,
        status,
        customer_name: customerName,
        oracle_customer_id: oracleCustomerId,
        sfdc_opportunity: sfdcOpportunity,
        priority,
        is_rep_involved: isRepInvolved,
        currency,
        shipping_terms: shippingTerms,
        payment_terms: paymentTerms,
        quote_fields: mergedQuoteFields,
        draft_bom: draftBomData
      };

      await generateQuotePDF(bomItems, quoteInfo, canSeePrices, action);

      toast({
        title: 'PDF Generated',
        description: `Quote PDF ${action === 'view' ? 'opened' : 'ready to download'} successfully`,
      });
    } catch (error) {
      console.error('Error generating PDF:', error);
      toast({
        title: 'PDF Generation Failed',
        description: 'Unable to generate PDF. Please try again.',
        variant: 'destructive'
      });
    }
  };

  return (
    <Card className="bg-gray-900 border-gray-800 h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <ShoppingCart className="h-5 w-5" />
            Bill of Materials
            {(currentQuoteId || isDraftMode) && (
              <Badge
                variant="outline"
                className="text-blue-400 border-blue-400 ml-2"
                title={currentQuoteId || undefined}
              >
                {isDraftMode
                  ? (draftName || 'Draft Quote')
                  : (quoteMetadata?.customer_name || currentQuoteId)}
              </Badge>
            )}
          </CardTitle>
          <Badge className="bg-gray-700 text-white">
            {bomItems.length} {bomItems.length === 1 ? 'item' : 'items'}
          </Badge>
        </div>
      </CardHeader>
      
      <CardContent className="space-y-4">
        {/* BOM Items */}
        <div className="space-y-3 max-h-96 overflow-y-auto">
          {bomItems.length === 0 ? (
            <div className="text-center py-8 text-gray-400">
              <Package className="h-8 w-8 mx-auto mb-3 text-gray-600" />
              <p>No items in your BOM yet.</p>
              <p className="text-sm">Configure products above to get started.</p>
            </div>
          ) : (
            bomItems.map((item, index) => (
              <div
                key={item.id}
                className="bg-gray-800 rounded-lg p-4 border border-gray-700 hover:border-gray-600 transition-colors"
              >
                <div className="flex items-start justify-between">
                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-2 mb-1">
                      <span className="text-white font-medium text-sm">
                        {getItemDisplayName(item)}
                      </span>
                      {item.isAccessory && (
                        <Badge variant="secondary" className="text-xs">
                          Accessory
                        </Badge>
                      )}
                    </div>
                    
                    {item.partNumber && (
                      <p className="text-gray-400 text-xs font-mono mb-1">
                        {item.partNumber}
                      </p>
                    )}
                    
                    {item.product.description && (
                      <p className="text-gray-500 text-xs mb-2 line-clamp-2">
                        {item.product.description}
                      </p>
                    )}
                    
                    <div className="space-y-2">
                      {/* Quantity and Basic Price Row */}
                      <div className="flex items-center gap-4 text-sm">
                        <div className="flex items-center gap-1">
                          <label className="text-gray-400">Qty:</label>
                          <input
                            type="number"
                            value={editingQuantities[item.id] ?? item.quantity}
                            onChange={(e) => setEditingQuantities(prev => ({
                              ...prev,
                              [item.id]: parseInt(e.target.value) || 1
                            }))}
                            onBlur={() => {
                              const newQty = editingQuantities[item.id];
                              if (newQty && newQty !== item.quantity) {
                                handleQuantityChange(item.id, newQty);
                              }
                            }}
                            onKeyDown={(e) => {
                              if (e.key === 'Enter') {
                                const newQty = editingQuantities[item.id];
                                if (newQty && newQty !== item.quantity) {
                                  handleQuantityChange(item.id, newQty);
                                }
                              }
                            }}
                            className="w-16 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center"
                            min="1"
                          />
                        </div>
                        
                        {canSeePrices && (
                          <div className="flex items-center gap-2">
                            <div className="flex items-center gap-1">
                              <span className="text-gray-400">Unit:</span>
                              <div className="flex gap-1 items-center">
                                <input
                                  type="number"
                                  step="0.01"
                                  value={editingPrices[item.id] ?? item.product.price}
                                   onChange={(e) => {
                                     const newValue = parseFloat(e.target.value) || 0;
                                     // Allow typing any value, validation happens on blur/enter
                                     setEditingPrices(prev => ({ ...prev, [item.id]: newValue }));
                                   }}
                                  onKeyDown={(e) => {
                                    if (e.key === 'Enter') {
                                      const newPrice = editingPrices[item.id];
                                      if (newPrice !== undefined) {
                                        handlePriceIncrease(item.id, newPrice);
                                        setEditingPrices(prev => {
                                          const next = { ...prev };
                                          delete next[item.id];
                                          return next;
                                        });
                                      }
                                    }
                                  }}
                                  onBlur={() => {
                                    const newPrice = editingPrices[item.id];
                                    if (newPrice !== undefined && newPrice !== item.product.price) {
                                      handlePriceIncrease(item.id, newPrice);
                                    }
                                    setEditingPrices(prev => {
                                      const next = { ...prev };
                                      delete next[item.id];
                                      return next;
                                    });
                                  }}
                                  className={`w-20 bg-gray-700 border border-gray-600 rounded px-2 py-1 text-white text-center ${
                                    (editingPrices[item.id] || item.product.price) < (item.original_unit_price || item.product.price) 
                                      ? 'border-red-500' 
                                      : ''
                                  }`}
                                  min={item.original_unit_price || item.product.price}
                                />
                                {item.original_unit_price && item.product.price !== item.original_unit_price && (
                                  <Button
                                    size="sm"
                                    variant="ghost"
                                    onClick={() => handleResetPrice(item.id)}
                                    className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                                    title={`Reset to original price ($${(item.original_unit_price || 0).toFixed(2)})`}
                                  >
                                    ↺
                                  </Button>
                                )}
                              </div>
                            </div>
                            <span className="text-green-400 font-medium">
                              = {formatCurrency((editingPrices[item.id] || item.product.price) * item.quantity)}
                            </span>
                          </div>
                        )}
                      </div>
                      
                      {/* Cost and Margin Row */}
                      {canSeeCosts && canSeePrices && (
                        <div className="flex items-center gap-4 text-xs">
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Cost:</span>
                            <span className="text-orange-400">
                              {formatCurrency((item.product.cost || 0) * item.quantity)}
                            </span>
                          </div>
                          <div className="flex items-center gap-1">
                            <span className="text-gray-500">Margin:</span>
                            <span className={getMarginColor(
                              item.product.cost && item.product.price > 0 
                                ? ((item.product.price - item.product.cost) / item.product.price) * 100 
                                : 100
                            )}>
                              {item.product.cost && item.product.price > 0 
                                ? (((item.product.price - item.product.cost) / item.product.price) * 100).toFixed(1)
                                : '100.0'
                              }%
                            </span>
                          </div>
                          
                          {/* Price adjustment indicator */}
                          {(item.original_unit_price && item.product.price > item.original_unit_price) && (
                            <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400">
                              <TrendingUp className="h-3 w-3 mr-1" />
                              Adjusted
                            </Badge>
                          )}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-2">
                    {onEditConfiguration && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-gray-700 pointer-events-auto"
                        onClick={(e) => {
                          e.stopPropagation();
                          console.log('🖱️ Edit Configuration button clicked');
                          onEditConfiguration(item);
                        }}
                        title="Edit Configuration"
                        aria-label={`Edit configuration for ${item.product.name}`}
                      >
                        <Edit className="h-3 w-3" />
                      </Button>
                    )}
                    
                    <Button
                      size="sm"
                      variant="ghost"
                      className="h-7 w-7 p-0 text-red-400 hover:text-red-300 hover:bg-red-900/20"
                      onClick={() => handleRemoveItem(item.id)}
                      title="Remove Item"
                    >
                      <Trash2 className="h-3 w-3" />
                    </Button>
                  </div>
                </div>
              </div>
            ))
          )}
        </div>
        
        {/* Pricing Summary */}
        {bomItems.length > 0 && canSeePrices && (
          <>
            <Separator className="bg-gray-700" />
            <div className="space-y-3">
              <div className="flex justify-between text-sm">
                <span className="text-gray-400">Subtotal:</span>
                <span className="text-white">{formatCurrency(subtotal)}</span>
              </div>
              
              {canSeeCosts && (
                <>
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Total Cost:</span>
                    <span className="text-orange-400">{formatCurrency(totalCost)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Gross Profit:</span>
                    <span className="text-green-400">{formatCurrency(grossProfit)}</span>
                  </div>
                  
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Margin:</span>
                    <span className={getMarginColor(margin)}>
                      {margin.toFixed(1)}%
                    </span>
                  </div>
                </>
              )}
              
              {/* Discount Section */}
              <Separator className="bg-gray-600" />
              <div className="space-y-3 bg-gray-800 p-3 rounded-lg">
                <div className="flex items-center gap-2">
                  <Percent className="h-4 w-4 text-yellow-400" />
                  <span className="text-white font-medium text-sm">Request Discount</span>
                </div>
                
                <div className="space-y-2">
                  <Label htmlFor="discount-percentage" className="text-gray-400 text-xs">
                    Discount Percentage
                  </Label>
                  <Input
                    id="discount-percentage"
                    type="number"
                    step="0.1"
                    min="0"
                    max="50"
                    value={localDiscountPercentage}
                    onChange={(e) => {
                      const value = parseFloat(e.target.value) || 0;
                      setLocalDiscountPercentage(value);
                    }}
                    onBlur={() => handleDiscountChange(localDiscountPercentage, localDiscountJustification)}
                    className="bg-gray-700 border-gray-600 text-white text-sm h-8"
                    placeholder="0.0"
                  />
                </div>
                
                {localDiscountPercentage > 0 && (
                  <div className="space-y-2">
                    <Label htmlFor="discount-justification" className="text-gray-400 text-xs">
                      Justification Required <span className="text-red-400">*</span>
                    </Label>
                    <Textarea
                      id="discount-justification"
                      value={localDiscountJustification}
                      onChange={(e) => {
                        setLocalDiscountJustification(e.target.value);
                      }}
                      onBlur={() => handleDiscountChange(localDiscountPercentage, localDiscountJustification)}
                      className="bg-gray-700 border-gray-600 text-white text-sm min-h-[60px] resize-none"
                      placeholder="Please provide justification for the discount request..."
                      required={localDiscountPercentage > 0}
                    />
                    {localDiscountPercentage > 0 && !localDiscountJustification.trim() && (
                      <div className="flex items-center gap-1 text-red-400 text-xs">
                        <AlertTriangle className="h-3 w-3" />
                        <span>Justification required for discount requests</span>
                      </div>
                    )}
                  </div>
                )}
                
                {/* Discount Summary */}
                {localDiscountPercentage > 0 && (
                  <div className="space-y-1 pt-2 border-t border-gray-600">
                    <div className="flex justify-between text-xs">
                      <span className="text-gray-400">Discount ({localDiscountPercentage}%):</span>
                      <span className="text-red-400">-{formatCurrency(discountAmount)}</span>
                    </div>
                    <div className="flex justify-between text-sm font-medium">
                      <span className="text-gray-300">Final Total:</span>
                      <span className="text-green-400">{formatCurrency(discountedSubtotal)}</span>
                    </div>
                    {canSeeCosts && (
                      <div className="flex justify-between text-xs">
                        <span className="text-gray-400">Final Margin:</span>
                        <span className={getMarginColor(discountedMargin)}>
                          {discountedMargin.toFixed(1)}%
                        </span>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </>
        )}
        
        {/* PDF Generation Buttons */}
        {bomItems.length > 0 && (
          <>
            <Separator className="bg-gray-700" />
            <div className="flex gap-2 mb-2">
              <Button
                onClick={() => handleGeneratePDF('view')}
                variant="outline"
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white border-gray-600"
              >
                <Eye className="mr-2 h-4 w-4" />
                View PDF
              </Button>
              <Button
                onClick={() => handleGeneratePDF('download')}
                variant="outline"
                className="flex-1 bg-gray-800 hover:bg-gray-700 text-white border-gray-600"
              >
                <Download className="mr-2 h-4 w-4" />
                Download PDF
              </Button>
            </div>
          </>
        )}

        {/* Action Buttons */}
        {bomItems.length > 0 && (
          <>
            <div className="flex flex-col gap-2">
              {/* Save as Draft */}
              {onSaveDraft && (
                <Button
                  onClick={onSaveDraft}
                  className="w-full bg-gray-800 hover:bg-gray-700 text-white border border-gray-600 hover:border-gray-500 shadow-lg"
                  disabled={isSubmitting}
                >
                  <Save className="mr-2 h-4 w-4" />
                  Save as Draft
                </Button>
              )}
              
              {/* Submit Quote */}
              <Button
                onClick={onSubmitQuote}
                className="w-full bg-red-600 hover:bg-red-700 text-white"
                disabled={isSubmitting}
              >
                <Send className="mr-2 h-4 w-4" />
                {isSubmitting ? 'Submitting...' : 'Submit'}
              </Button>
            </div>
          </>
        )}
        
        {/* Draft Mode Indicator */}
        {isDraftMode && currentQuoteId && (
          <div className="bg-blue-900/20 border border-blue-600 rounded p-3">
            <div className="flex items-center gap-2 text-blue-400 text-sm">
              <FileText className="h-4 w-4" />
              <span>Draft Mode - Changes are auto-saved</span>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};
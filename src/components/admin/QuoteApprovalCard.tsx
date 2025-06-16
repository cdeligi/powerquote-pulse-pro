import { useState, useEffect } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from '@/components/ui/table';
import { 
  CheckCircle, 
  XCircle, 
  DollarSign, 
  TrendingUp, 
  AlertTriangle,
  Eye,
  ChevronDown,
  ChevronUp,
  Calculator,
  TrendingDown,
  Edit3,
  RefreshCw,
  Clock,
  MessageSquare
} from 'lucide-react';
import { BOMItem } from '@/types/product';
import { 
  calculateTotalMargin, 
  calculateItemMargin, 
  calculateItemCost, 
  calculateItemRevenue,
  calculateDiscountedMargin
} from '@/utils/marginCalculations';
import { convertCurrency, getSupportedCurrencies } from '@/utils/currencyConverter';
import { QuoteStatus, getStatusDisplayName, getStatusColor } from '@/utils/quotePipeline';

interface QuoteApprovalData {
  id: string;
  customer: string;
  oracleCustomerId: string;
  salesperson: string;
  value: number;
  discountRequested: number;
  requestedAt: string;
  justification: string;
  priority: 'High' | 'Medium' | 'Low' | 'Urgent';
  isRepInvolved: boolean;
  shippingTerms: string;
  paymentTerms: string;
  quoteCurrency: 'USD' | 'EURO' | 'GBP' | 'CAD';
  bomItems: BOMItem[];
  status: QuoteStatus;
  counterOfferHistory?: Array<{
    discountOffered: number;
    offeredAt: string;
    status: 'pending' | 'accepted' | 'rejected';
  }>;
}

interface QuoteApprovalCardProps {
  quote: QuoteApprovalData;
  onApprove: (id: string, approvedDiscount: number, updatedTerms: any) => void;
  onReject: (id: string, reason: string) => void;
  onCounterOffer: (id: string, counterDiscount: number, updatedTerms: any) => void;
  onUpdateTerms: (id: string, updatedTerms: any) => void;
}

const QuoteApprovalCard = ({ quote, onApprove, onReject, onCounterOffer, onUpdateTerms }: QuoteApprovalCardProps) => {
  const [isExpanded, setIsExpanded] = useState(false);
  const [showRejectForm, setShowRejectForm] = useState(false);
  const [showCounterForm, setShowCounterForm] = useState(false);
  const [showEditTerms, setShowEditTerms] = useState(false);
  const [rejectionReason, setRejectionReason] = useState('');
  const [counterDiscount, setCounterDiscount] = useState('');
  const [approvedDiscount, setApprovedDiscount] = useState(quote.discountRequested.toString());
  
  // Editable terms state
  const [editableTerms, setEditableTerms] = useState({
    paymentTerms: quote.paymentTerms,
    shippingTerms: quote.shippingTerms,
    quoteCurrency: quote.quoteCurrency
  });
  const [originalCurrency] = useState(quote.quoteCurrency);
  const [exchangeRate, setExchangeRate] = useState(1);

  const { totalRevenue, totalCost, marginPercentage, grossProfit } = calculateTotalMargin(quote.bomItems);
  
  // Convert amounts if currency changed
  const displayRevenue = editableTerms.quoteCurrency !== originalCurrency 
    ? convertCurrency(totalRevenue, originalCurrency, editableTerms.quoteCurrency).convertedAmount
    : totalRevenue;
  const displayCost = editableTerms.quoteCurrency !== originalCurrency
    ? convertCurrency(totalCost, originalCurrency, editableTerms.quoteCurrency).convertedAmount
    : totalCost;

  const discountedPrice = displayRevenue * (1 - quote.discountRequested / 100);
  const discountedMargin = displayCost > 0 ? ((discountedPrice - displayCost) / discountedPrice) * 100 : 0;

  // Calculate counter offer metrics in real-time
  const counterDiscountNum = Number(counterDiscount) || 0;
  const counterOfferMetrics = calculateDiscountedMargin(quote.bomItems, counterDiscountNum);

  useEffect(() => {
    if (editableTerms.quoteCurrency !== originalCurrency) {
      const conversion = convertCurrency(1, originalCurrency, editableTerms.quoteCurrency);
      setExchangeRate(conversion.exchangeRate);
    } else {
      setExchangeRate(1);
    }
  }, [editableTerms.quoteCurrency, originalCurrency]);

  // ... keep existing code (utility functions getMarginColor, getPriorityColor)
  const getMarginColor = (margin: number) => {
    if (margin >= 40) return 'text-green-400';
    if (margin >= 25) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getPriorityColor = (priority: string) => {
    switch (priority) {
      case 'Urgent': return 'bg-red-600';
      case 'High': return 'bg-orange-600';
      case 'Medium': return 'bg-yellow-600';
      default: return 'bg-gray-600';
    }
  };

  const handleApprove = () => {
    onApprove(quote.id, Number(approvedDiscount), editableTerms);
    setShowCounterForm(false);
    setShowRejectForm(false);
    setShowEditTerms(false);
  };

  const handleReject = () => {
    if (rejectionReason.trim()) {
      onReject(quote.id, rejectionReason);
      setShowRejectForm(false);
    }
  };

  const handleCounter = () => {
    if (counterDiscount) {
      onCounterOffer(quote.id, Number(counterDiscount), editableTerms);
      setShowCounterForm(false);
    }
  };

  const handleUpdateTerms = () => {
    onUpdateTerms(quote.id, editableTerms);
    setShowEditTerms(false);
  };

  const paymentTermsOptions = ['Prepaid', '15', '30', '60', '90', '120'];
  const shippingTermsOptions = ['Ex-Works', 'CFR', 'CIF', 'CIP', 'CPT', 'DDP', 'DAP', 'FCA', 'Prepaid'];

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <div className="flex justify-between items-start">
          <div className="space-y-2">
            <div className="flex items-center space-x-3">
              <CardTitle className="text-white text-lg">{quote.id}</CardTitle>
              <Badge className={`${getStatusColor(quote.status)} text-white`}>
                {getStatusDisplayName(quote.status)}
              </Badge>
              <Badge className={`${getPriorityColor(quote.priority)} text-white`}>
                {quote.priority}
              </Badge>
              {quote.discountRequested > 0 && (
                <Badge className="bg-yellow-600 text-white">
                  {quote.discountRequested}% discount requested
                </Badge>
              )}
              {quote.isRepInvolved && (
                <Badge className="bg-blue-600 text-white">
                  Rep Involved
                </Badge>
              )}
            </div>
            <div className="text-gray-300 space-y-1">
              <p><strong>Customer:</strong> {quote.customer}</p>
              <p><strong>Oracle ID:</strong> {quote.oracleCustomerId}</p>
              <p><strong>Salesperson:</strong> {quote.salesperson}</p>
              <p><strong>Requested:</strong> {quote.requestedAt}</p>
            </div>
          </div>
          
          <div className="text-right space-y-2">
            {/* Original Quote Value */}
            <div>
              <p className="text-gray-400 text-sm">Original Quote Value</p>
              <p className="text-white text-2xl font-bold">
                {editableTerms.quoteCurrency} {displayRevenue.toLocaleString()}
                {editableTerms.quoteCurrency !== originalCurrency && (
                  <span className="text-xs text-gray-400 block">
                    (Rate: {exchangeRate.toFixed(4)})
                  </span>
                )}
              </p>
            </div>
            
            {/* Requested Discounted Value */}
            {quote.discountRequested > 0 && (
              <div className="border-t border-gray-600 pt-2">
                <p className="text-orange-400 text-sm flex items-center">
                  <TrendingDown className="mr-1 h-3 w-3" />
                  With Requested Discount ({quote.discountRequested}%)
                </p>
                <p className="text-orange-300 text-xl font-bold">
                  {editableTerms.quoteCurrency} {discountedPrice.toLocaleString()}
                </p>
                <p className="text-red-400 text-sm">
                  -{editableTerms.quoteCurrency} {(displayRevenue - discountedPrice).toLocaleString()}
                </p>
              </div>
            )}
            
            {/* Counter Offer History */}
            {quote.counterOfferHistory && quote.counterOfferHistory.length > 0 && (
              <div className="border-t border-gray-600 pt-2">
                <p className="text-blue-400 text-sm flex items-center">
                  <MessageSquare className="mr-1 h-3 w-3" />
                  Previous Counter Offers
                </p>
                <div className="space-y-1">
                  {quote.counterOfferHistory.map((offer, index) => (
                    <div key={index} className="text-xs">
                      <span className="text-gray-300">{offer.discountOffered}% - </span>
                      <Badge 
                        variant="outline" 
                        className={`text-xs ${
                          offer.status === 'accepted' ? 'border-green-500 text-green-400' :
                          offer.status === 'rejected' ? 'border-red-500 text-red-400' :
                          'border-orange-500 text-orange-400'
                        }`}
                      >
                        {offer.status}
                      </Badge>
                    </div>
                  ))}
                </div>
              </div>
            )}
            
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setIsExpanded(!isExpanded)}
              className="text-gray-400 hover:text-white"
            >
              <Eye className="mr-2 h-4 w-4" />
              {isExpanded ? 'Hide Details' : 'View Details'}
              {isExpanded ? <ChevronUp className="ml-2 h-4 w-4" /> : <ChevronDown className="ml-2 h-4 w-4" />}
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent>
        {/* Financial Summary */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="bg-gray-700 p-3 rounded">
            <p className="text-gray-400 text-sm">Original Margin</p>
            <p className={`text-lg font-bold ${getMarginColor(marginPercentage)}`}>
              {marginPercentage.toFixed(1)}%
            </p>
          </div>
          <div className="bg-gray-700 p-3 rounded">
            <p className="text-gray-400 text-sm">After Discount</p>
            <p className={`text-lg font-bold ${getMarginColor(discountedMargin)}`}>
              {discountedMargin.toFixed(1)}%
            </p>
          </div>
          <div className="bg-gray-700 p-3 rounded">
            <p className="text-gray-400 text-sm">Total Cost</p>
            <p className="text-orange-400 text-lg font-bold">
              {editableTerms.quoteCurrency} {displayCost.toLocaleString()}
            </p>
          </div>
          <div className="bg-gray-700 p-3 rounded">
            <p className="text-gray-400 text-sm">Gross Profit</p>
            <p className="text-green-400 text-lg font-bold">
              {editableTerms.quoteCurrency} {(discountedPrice - displayCost).toLocaleString()}
            </p>
          </div>
        </div>

        {/* Editable Quote Details */}
        <div className="grid grid-cols-2 md:grid-cols-3 gap-4 mb-6 text-sm">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400">Payment Terms</p>
              <p className="text-white">{editableTerms.paymentTerms}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400">Shipping Terms</p>
              <p className="text-white">{editableTerms.shippingTerms}</p>
            </div>
          </div>
          <div className="flex items-center justify-between">
            <div>
              <p className="text-gray-400">Currency</p>
              <p className="text-white">{editableTerms.quoteCurrency}</p>
            </div>
            <Button
              variant="ghost"
              size="sm"
              onClick={() => setShowEditTerms(!showEditTerms)}
              className="text-blue-400 hover:text-blue-300"
            >
              <Edit3 className="h-3 w-3" />
            </Button>
          </div>
        </div>

        {/* Edit Terms Form */}
        {showEditTerms && (
          <div className="mb-6 p-4 bg-blue-900/20 border border-blue-600/20 rounded">
            <h4 className="text-blue-400 font-medium mb-3 flex items-center">
              <Edit3 className="mr-2 h-4 w-4" />
              Edit Quote Terms
            </h4>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              <div>
                <Label htmlFor="edit-payment-terms" className="text-white">Payment Terms</Label>
                <Select 
                  value={editableTerms.paymentTerms} 
                  onValueChange={(value) => setEditableTerms(prev => ({ ...prev, paymentTerms: value }))}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    {paymentTermsOptions.map(term => (
                      <SelectItem key={term} value={term}>{term}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-shipping-terms" className="text-white">Shipping Terms</Label>
                <Select 
                  value={editableTerms.shippingTerms} 
                  onValueChange={(value) => setEditableTerms(prev => ({ ...prev, shippingTerms: value }))}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    {shippingTermsOptions.map(term => (
                      <SelectItem key={term} value={term}>{term}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
              <div>
                <Label htmlFor="edit-currency" className="text-white">Currency</Label>
                <Select 
                  value={editableTerms.quoteCurrency} 
                  onValueChange={(value) => setEditableTerms(prev => ({ ...prev, quoteCurrency: value as any }))}
                >
                  <SelectTrigger className="bg-gray-700 border-gray-600 text-white mt-2">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent className="bg-gray-700 border-gray-600">
                    {getSupportedCurrencies().map(currency => (
                      <SelectItem key={currency} value={currency}>{currency}</SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            </div>
            <div className="flex space-x-2 mt-4">
              <Button
                onClick={handleUpdateTerms}
                className="bg-blue-600 hover:bg-blue-700 text-white"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Update Terms
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowEditTerms(false)}
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Justification */}
        <div className="mb-6">
          <p className="text-gray-400 text-sm mb-2">Discount Justification:</p>
          <div className="bg-gray-700 p-3 rounded">
            <p className="text-white">{quote.justification}</p>
          </div>
        </div>

        {/* BOM Details - Expandable */}
        {isExpanded && (
          <div className="mb-6">
            <h4 className="text-white font-medium mb-3 flex items-center">
              <TrendingUp className="mr-2 h-4 w-4" />
              Bill of Materials & Cost Analysis
            </h4>
            <div className="bg-gray-700 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600">
                    <TableHead className="text-gray-300">Product</TableHead>
                    <TableHead className="text-gray-300 text-center">Qty</TableHead>
                    <TableHead className="text-gray-300 text-right">Unit Price</TableHead>
                    <TableHead className="text-gray-300 text-right">Unit Cost</TableHead>
                    <TableHead className="text-gray-300 text-right">Revenue</TableHead>
                    <TableHead className="text-gray-300 text-right">Cost</TableHead>
                    <TableHead className="text-gray-300 text-right">Margin %</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {quote.bomItems.filter(item => item.enabled).map((item, index) => {
                    const itemRevenue = calculateItemRevenue(item);
                    const itemCost = calculateItemCost(item);
                    const itemMargin = calculateItemMargin(item);
                    
                    return (
                      <TableRow key={index} className="border-gray-600">
                        <TableCell className="text-white">
                          <div>
                            <p className="font-medium">{item.product.name}</p>
                            {item.product.partNumber && (
                              <p className="text-gray-400 text-xs">PN: {item.product.partNumber}</p>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-white text-center">{item.quantity}</TableCell>
                        <TableCell className="text-white text-right">
                          {editableTerms.quoteCurrency} {item.product.price.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-orange-400 text-right">
                          {editableTerms.quoteCurrency} {(item.product.cost || 0).toLocaleString()}
                        </TableCell>
                        <TableCell className="text-white text-right">
                          {editableTerms.quoteCurrency} {itemRevenue.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-orange-400 text-right">
                          {editableTerms.quoteCurrency} {itemCost.toLocaleString()}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${getMarginColor(itemMargin)}`}>
                          {itemMargin.toFixed(1)}%
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>
          </div>
        )}

        {/* Margin Alert */}
        {discountedMargin < 25 && (
          <div className="mb-6 p-3 bg-red-900/20 border border-red-600/20 rounded flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <p className="text-red-400 text-sm">
              Warning: Requested discount will reduce margin to {discountedMargin.toFixed(1)}% (below 25% threshold)
            </p>
          </div>
        )}

        {/* Action Forms */}
        {showRejectForm && (
          <div className="mb-4 p-4 bg-red-900/20 border border-red-600/20 rounded">
            <Label htmlFor="rejection-reason" className="text-white">Rejection Reason</Label>
            <Textarea
              id="rejection-reason"
              value={rejectionReason}
              onChange={(e) => setRejectionReason(e.target.value)}
              placeholder="Provide detailed reason for rejection..."
              className="bg-gray-700 border-gray-600 text-white mt-2"
              rows={3}
            />
            <div className="flex space-x-2 mt-3">
              <Button
                variant="destructive"
                onClick={handleReject}
                disabled={!rejectionReason.trim()}
              >
                Confirm Rejection
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowRejectForm(false)}
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {showCounterForm && (
          <div className="mb-4 p-4 bg-orange-900/20 border border-orange-600/20 rounded">
            <div className="space-y-4">
              <div>
                <Label htmlFor="counter-discount" className="text-white">Counter Offer Discount (%)</Label>
                <Input
                  id="counter-discount"
                  type="number"
                  value={counterDiscount}
                  onChange={(e) => setCounterDiscount(e.target.value)}
                  placeholder="e.g., 5"
                  className="bg-gray-700 border-gray-600 text-white mt-2"
                  min="0"
                  max="50"
                />
              </div>

              {/* Real-time Counter Offer Impact */}
              {counterDiscount && !isNaN(counterDiscountNum) && counterDiscountNum > 0 && (
                <div className="bg-gray-700 p-4 rounded border border-orange-500/30">
                  <h5 className="text-orange-400 font-medium mb-3 flex items-center">
                    <Calculator className="mr-2 h-4 w-4" />
                    Counter Offer Impact ({counterDiscountNum}% Discount)
                  </h5>
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-3 text-sm">
                    <div>
                      <p className="text-gray-400">New Revenue</p>
                      <p className="text-white font-semibold">
                        {editableTerms.quoteCurrency} {counterOfferMetrics.discountedRevenue.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">New Margin</p>
                      <p className={`font-semibold ${getMarginColor(counterOfferMetrics.discountedMargin)}`}>
                        {counterOfferMetrics.discountedMargin.toFixed(1)}%
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">Discount Amount</p>
                      <p className="text-red-400 font-semibold">
                        -{editableTerms.quoteCurrency} {counterOfferMetrics.discountAmount.toLocaleString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-400">New Profit</p>
                      <p className="text-green-400 font-semibold">
                        {editableTerms.quoteCurrency} {(counterOfferMetrics.discountedRevenue - displayCost).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  
                  {/* Counter Offer Margin Warning */}
                  {counterOfferMetrics.discountedMargin < 25 && (
                    <div className="mt-3 p-2 bg-red-900/30 border border-red-600/30 rounded flex items-center space-x-2">
                      <AlertTriangle className="h-3 w-3 text-red-400 flex-shrink-0" />
                      <p className="text-red-400 text-xs">
                        Counter offer will reduce margin below 25% threshold
                      </p>
                    </div>
                  )}
                </div>
              )}
            </div>
            
            <div className="flex space-x-2 mt-4">
              <Button
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={handleCounter}
                disabled={!counterDiscount}
              >
                Send Counter Offer
              </Button>
              <Button
                variant="ghost"
                onClick={() => setShowCounterForm(false)}
                className="text-gray-400 hover:text-white"
              >
                Cancel
              </Button>
            </div>
          </div>
        )}

        {/* Action Buttons */}
        {!showRejectForm && !showCounterForm && (
          <div className="space-y-3">
            <div className="flex items-center space-x-2">
              <Label htmlFor="approved-discount" className="text-white">Approve Discount (%):</Label>
              <Input
                id="approved-discount"
                type="number"
                value={approvedDiscount}
                onChange={(e) => setApprovedDiscount(e.target.value)}
                className="bg-gray-700 border-gray-600 text-white w-24"
                min="0"
                max="50"
              />
            </div>
            
            <div className="flex space-x-2">
              <Button
                className="bg-green-600 hover:bg-green-700 text-white"
                onClick={handleApprove}
              >
                <CheckCircle className="mr-2 h-4 w-4" />
                Approve {approvedDiscount}% Discount
              </Button>
              <Button
                className="bg-orange-600 hover:bg-orange-700 text-white"
                onClick={() => setShowCounterForm(true)}
              >
                <DollarSign className="mr-2 h-4 w-4" />
                Counter Offer
              </Button>
              <Button
                variant="destructive"
                onClick={() => setShowRejectForm(true)}
              >
                <XCircle className="mr-2 h-4 w-4" />
                Reject Quote
              </Button>
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default QuoteApprovalCard;

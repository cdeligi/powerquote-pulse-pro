
import { useState } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { 
  Calculator,
  Edit3,
  History,
  TrendingUp,
  Loader2
} from "lucide-react";
import { 
  Table, 
  TableBody, 
  TableCell, 
  TableHead, 
  TableHeader, 
  TableRow 
} from "@/components/ui/table";
import { BOMItemWithDetails, Quote } from "@/hooks/useQuotes";

interface BOMAnalysisProps {
  quote: Quote;
  bomItems: BOMItemWithDetails[];
  loadingBom: boolean;
  editingPrices: Record<string, string>;
  priceEditReason: string;
  onPriceEdit: (itemId: string, price: string) => void;
  onPriceEditCancel: (itemId: string) => void;
  onPriceUpdate: (itemId: string) => void;
  onPriceEditReasonChange: (reason: string) => void;
}

export const BOMAnalysis = ({ 
  quote, 
  bomItems, 
  loadingBom, 
  editingPrices, 
  priceEditReason, 
  onPriceEdit, 
  onPriceEditCancel, 
  onPriceUpdate, 
  onPriceEditReasonChange 
}: BOMAnalysisProps) => {
  const calculateUpdatedTotals = () => {
    if (!bomItems.length) return null;

    const originalTotal = bomItems.reduce((sum, item) => sum + item.total_price, 0);
    const updatedTotal = bomItems.reduce((sum, item) => {
      const editPrice = editingPrices[item.id];
      const price = editPrice ? parseFloat(editPrice) : item.unit_price;
      return sum + (price * item.quantity);
    }, 0);
    const totalCost = bomItems.reduce((sum, item) => sum + item.total_cost, 0);
    const updatedMargin = updatedTotal > 0 ? ((updatedTotal - totalCost) / updatedTotal) * 100 : 0;
    const profit = updatedTotal - totalCost;

    return {
      originalTotal,
      updatedTotal,
      totalCost,
      updatedMargin,
      profit,
      hasChanges: Math.abs(originalTotal - updatedTotal) > 0.01
    };
  };

  const totals = calculateUpdatedTotals();

  return (
    <Card className="bg-gray-800 border-gray-700">
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <Calculator className="mr-2 h-5 w-5" />
          Bill of Materials & Cost Analysis
          {totals?.hasChanges && (
            <Badge className="ml-2 bg-orange-600">
              Prices Modified
            </Badge>
          )}
        </CardTitle>
      </CardHeader>
      <CardContent>
        {loadingBom ? (
          <div className="flex items-center justify-center py-8">
            <Loader2 className="h-6 w-6 animate-spin text-white mr-2" />
            <span className="text-white">Loading BOM items...</span>
          </div>
        ) : (
          <>
            <div className="bg-gray-700 rounded-lg overflow-hidden">
              <Table>
                <TableHeader>
                  <TableRow className="border-gray-600">
                    <TableHead className="text-gray-300">Product</TableHead>
                    <TableHead className="text-gray-300 text-center">Qty</TableHead>
                    <TableHead className="text-gray-300 text-right">List Price</TableHead>
                    <TableHead className="text-gray-300 text-right">Current Price</TableHead>
                    <TableHead className="text-gray-300 text-right">Unit Cost</TableHead>
                    <TableHead className="text-gray-300 text-right">Total Revenue</TableHead>
                    <TableHead className="text-gray-300 text-right">Total Cost</TableHead>
                    <TableHead className="text-gray-300 text-right">Margin %</TableHead>
                    <TableHead className="text-gray-300 text-center">Actions</TableHead>
                  </TableRow>
                </TableHeader>
                <TableBody>
                  {bomItems.map((item) => {
                    const isEditing = editingPrices[item.id] !== undefined;
                    const currentPrice = isEditing ? parseFloat(editingPrices[item.id]) : item.unit_price;
                    const totalRevenue = currentPrice * item.quantity;
                    const margin = currentPrice > 0 && item.unit_cost > 0 ? ((currentPrice - item.unit_cost) / currentPrice) * 100 : 0;
                    const hasHistory = item.price_adjustment_history && item.price_adjustment_history.length > 0;
                    
                    return (
                      <TableRow key={item.id} className="border-gray-600">
                        <TableCell className="text-white">
                          <div>
                            <p className="font-medium">{item.name}</p>
                            {item.part_number && (
                              <p className="text-gray-400 text-xs">PN: {item.part_number}</p>
                            )}
                            {item.product_type !== 'standard' && (
                              <Badge variant="outline" className="text-xs text-blue-400 border-blue-400 mt-1">
                                {item.product_type.replace('_', ' ').toUpperCase()}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                        <TableCell className="text-white text-center">{item.quantity}</TableCell>
                        <TableCell className="text-gray-400 text-right">
                          {quote.currency} {item.original_unit_price.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-right">
                          {isEditing ? (
                            <Input
                              type="number"
                              value={editingPrices[item.id]}
                              onChange={(e) => onPriceEdit(item.id, e.target.value)}
                              className="bg-gray-700 border-gray-600 text-white w-24 text-right"
                              step="0.01"
                            />
                          ) : (
                            <span className={`text-white ${item.unit_price !== item.original_unit_price ? 'font-bold text-green-400' : ''}`}>
                              {quote.currency} {item.unit_price.toLocaleString()}
                            </span>
                          )}
                        </TableCell>
                        <TableCell className="text-orange-400 text-right">
                          {quote.currency} {item.unit_cost.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-white text-right">
                          {quote.currency} {totalRevenue.toLocaleString()}
                        </TableCell>
                        <TableCell className="text-orange-400 text-right">
                          {quote.currency} {item.total_cost.toLocaleString()}
                        </TableCell>
                        <TableCell className={`text-right font-medium ${
                          margin >= 40 ? 'text-green-400' :
                          margin >= 25 ? 'text-yellow-400' : 'text-red-400'
                        }`}>
                          {margin.toFixed(1)}%
                        </TableCell>
                        <TableCell className="text-center">
                          <div className="flex items-center justify-center space-x-1">
                            {isEditing ? (
                              <>
                                <Button
                                  size="sm"
                                  onClick={() => onPriceUpdate(item.id)}
                                  className="bg-green-600 hover:bg-green-700 h-6 px-2 text-xs"
                                  disabled={!priceEditReason.trim()}
                                >
                                  Save
                                </Button>
                                <Button
                                  size="sm"
                                  variant="ghost"
                                  onClick={() => onPriceEditCancel(item.id)}
                                  className="h-6 px-2 text-xs text-gray-400"
                                >
                                  Cancel
                                </Button>
                              </>
                            ) : (
                              <Button
                                size="sm"
                                variant="ghost"
                                onClick={() => onPriceEdit(item.id, item.unit_price.toString())}
                                className="h-6 px-2 text-xs text-blue-400 hover:text-blue-300"
                              >
                                <Edit3 className="h-3 w-3" />
                              </Button>
                            )}
                            {hasHistory && (
                              <Badge variant="outline" className="text-xs text-purple-400 border-purple-400">
                                <History className="h-2 w-2 mr-1" />
                                {item.price_adjustment_history.length}
                              </Badge>
                            )}
                          </div>
                        </TableCell>
                      </TableRow>
                    );
                  })}
                </TableBody>
              </Table>
            </div>

            {/* Price Edit Reason */}
            {Object.keys(editingPrices).length > 0 && (
              <div className="mt-4 p-4 bg-blue-900/20 border border-blue-600/20 rounded">
                <Label htmlFor="price-reason" className="text-white">Reason for Price Adjustment</Label>
                <Textarea
                  id="price-reason"
                  value={priceEditReason}
                  onChange={(e) => onPriceEditReasonChange(e.target.value)}
                  placeholder="Enter reason for price changes..."
                  className="bg-gray-700 border-gray-600 text-white mt-2"
                  rows={2}
                />
              </div>
            )}

            {/* Updated Totals */}
            {totals && (
              <div className="mt-4 p-4 bg-gray-700 rounded">
                <h4 className="text-white font-medium mb-3 flex items-center">
                  <TrendingUp className="mr-2 h-4 w-4" />
                  Project Financial Summary
                </h4>
                <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm">
                  <div>
                    <p className="text-gray-400">Original Revenue</p>
                    <p className="text-white font-semibold">
                      {quote.currency} {totals.originalTotal.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Current Revenue</p>
                    <p className={`font-semibold ${totals.hasChanges ? 'text-green-400' : 'text-white'}`}>
                      {quote.currency} {totals.updatedTotal.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Total Cost</p>
                    <p className="text-orange-400 font-semibold">
                      {quote.currency} {totals.totalCost.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Project Margin</p>
                    <p className={`font-semibold ${
                      totals.updatedMargin >= 40 ? 'text-green-400' :
                      totals.updatedMargin >= 25 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {totals.updatedMargin.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Gross Profit</p>
                    <p className="text-green-400 font-semibold">
                      {quote.currency} {totals.profit.toLocaleString()}
                    </p>
                  </div>
                </div>
                
                {/* Standard vs Requested Margin Comparison */}
                <div className="mt-4 pt-4 border-t border-gray-600">
                  <div className="grid grid-cols-3 gap-4 text-sm">
                    <div>
                      <p className="text-gray-400">Standard Margin</p>
                      <p className="text-blue-400 font-semibold">{quote.original_margin.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Requested Margin</p>
                      <p className="text-yellow-400 font-semibold">{quote.discounted_margin.toFixed(1)}%</p>
                    </div>
                    <div>
                      <p className="text-gray-400">Current Margin</p>
                      <p className={`font-semibold ${
                        totals.updatedMargin >= 40 ? 'text-green-400' :
                        totals.updatedMargin >= 25 ? 'text-yellow-400' : 'text-red-400'
                      }`}>
                        {totals.updatedMargin.toFixed(1)}%
                      </p>
                    </div>
                  </div>
                </div>
              </div>
            )}
          </>
        )}
      </CardContent>
    </Card>
  );
};

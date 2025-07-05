
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Edit3, Save, X, Settings, Package } from 'lucide-react';
import { useState } from 'react';
import { Quote, BOMItemWithDetails } from '@/hooks/useQuotes';

interface BOMAnalysisProps {
  quote: Partial<Quote>;
  bomItems: BOMItemWithDetails[];
  loadingBom: boolean;
  editingPrices: Record<string, string>;
  priceEditReason: string;
  onPriceEdit: (itemId: string, price: string) => void;
  onPriceEditCancel: (itemId: string) => void;
  onPriceUpdate: (itemId: string) => void;
  onPriceEditReasonChange: (reason: string) => void;
}

const BOMAnalysis = ({ 
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
  const [expandedItems, setExpandedItems] = useState<Record<string, boolean>>({});

  const handleEditStart = (item: BOMItemWithDetails) => {
    onPriceEdit(item.id, item.unit_price?.toString() || '0');
  };

  const handleEditSave = (itemId: string) => {
    onPriceUpdate(itemId);
  };

  const handleEditCancel = (itemId: string) => {
    onPriceEditCancel(itemId);
  };

  const toggleExpanded = (itemId: string) => {
    setExpandedItems(prev => ({
      ...prev,
      [itemId]: !prev[itemId]
    }));
  };

  const calculateUpdatedTotals = () => {
    const totalRevenue = bomItems.reduce((sum, item) => {
      return sum + ((item.unit_price || 0) * item.quantity);
    }, 0);
    
    const totalCost = bomItems.reduce((sum, item) => {
      return sum + ((item.unit_cost || 0) * item.quantity);
    }, 0);
    
    const grossProfit = totalRevenue - totalCost;
    const marginPercentage = totalRevenue > 0 ? (grossProfit / totalRevenue) * 100 : 0;
    
    return {
      totalRevenue,
      totalCost,
      grossProfit,
      marginPercentage
    };
  };

  const getMarginColor = (margin: number) => {
    if (margin >= 30) return 'text-green-400';
    if (margin >= 25) return 'text-yellow-400';
    return 'text-red-400';
  };

  const totals = calculateUpdatedTotals();

  if (loadingBom) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">BOM Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="animate-pulse">
            <div className="h-4 bg-gray-700 rounded mb-4"></div>
            <div className="h-4 bg-gray-700 rounded mb-4"></div>
            <div className="h-4 bg-gray-700 rounded"></div>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (bomItems.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">BOM Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center py-8">
            No BOM items found for this quote.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center">
              <Package className="mr-2 h-5 w-5" />
              BOM Analysis & Cost Breakdown
            </div>
            <Badge variant="outline" className="text-white border-gray-500">
              {bomItems.length} items
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {bomItems.map((item) => (
            <div key={item.id} className="p-4 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1 min-w-0">
                  <div className="flex items-center space-x-2">
                    <h4 className="text-white font-medium truncate">{item.name}</h4>
                    {item.product_type && item.product_type !== 'standard' && (
                      <Badge variant="outline" className="text-blue-400 border-blue-400 text-xs">
                        {item.product_type.toUpperCase()}
                      </Badge>
                    )}
                  </div>
                  {item.description && (
                    <p className="text-gray-400 text-sm mt-1">{item.description}</p>
                  )}
                  <div className="flex flex-wrap gap-2 mt-2">
                    {item.part_number && (
                      <Badge variant="outline" className="text-green-400 border-green-400 text-xs">
                        P/N: {item.part_number}
                      </Badge>
                    )}
                    <Badge variant="outline" className="text-gray-400 border-gray-400 text-xs">
                      Qty: {item.quantity}
                    </Badge>
                  </div>
                </div>
                
                <div className="flex space-x-1">
                  {item.configuration_data && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => toggleExpanded(item.id)}
                      className="h-6 w-6 p-0 text-purple-400 hover:text-purple-300"
                      title="View configuration"
                    >
                      <Settings className="h-3 w-3" />
                    </Button>
                  )}
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditStart(item)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                    title="Edit unit price"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              {/* Cost and Pricing Grid */}
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4 text-sm bg-gray-900 rounded p-3">
                <div>
                  <span className="text-gray-400 block">Unit Cost:</span>
                  <div className="text-orange-400 font-medium">
                    ${(item.unit_cost || 0).toLocaleString()}
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-400 block">Unit Price:</span>
                  {editingPrices[item.id] ? (
                    <div className="flex items-center space-x-1 mt-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={editingPrices[item.id]}
                        onChange={(e) => onPriceEdit(item.id, e.target.value)}
                        className="w-20 h-6 text-xs bg-gray-700 border-gray-600 text-white"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleEditSave(item.id)}
                        className="h-5 w-5 p-0 bg-green-600 hover:bg-green-700"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={() => handleEditCancel(item.id)}
                        className="h-5 w-5 p-0 text-gray-400 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-white font-medium">
                      ${(item.unit_price || 0).toLocaleString()}
                    </div>
                  )}
                </div>
                
                <div>
                  <span className="text-gray-400 block">Total Cost:</span>
                  <div className="text-orange-400 font-medium">
                    ${((item.unit_cost || 0) * item.quantity).toLocaleString()}
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-400 block">Total Price:</span>
                  <div className="text-white font-medium">
                    ${((item.unit_price || 0) * item.quantity).toLocaleString()}
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-400 block">Line Margin:</span>
                  <div className={`font-medium ${getMarginColor(item.margin || 0)}`}>
                    {(item.margin || 0).toFixed(1)}%
                  </div>
                </div>
              </div>

              {/* Configuration Details */}
              {expandedItems[item.id] && item.configuration_data && (
                <div className="mt-3 p-3 bg-gray-950 rounded border border-gray-600">
                  <h5 className="text-white font-medium mb-2">Configuration Details:</h5>
                  <pre className="text-gray-300 text-xs overflow-auto max-h-32">
                    {JSON.stringify(item.configuration_data, null, 2)}
                  </pre>
                </div>
              )}
              
              {/* Price History */}
              {item.price_adjustment_history && item.price_adjustment_history.length > 0 && (
                <div className="mt-3 pt-3 border-t border-gray-700">
                  <h5 className="text-gray-400 text-sm font-medium mb-2">Price History:</h5>
                  <div className="space-y-1">
                    {item.price_adjustment_history.map((adjustment: any, index: number) => (
                      <div key={index} className="text-xs text-gray-400 flex justify-between">
                        <span>${adjustment.original_price} → ${adjustment.new_price}</span>
                        <span>{new Date(adjustment.adjusted_at).toLocaleDateString()}</span>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Financial Summary */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Project Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Total Revenue</p>
              <p className="text-white text-xl font-bold">
                ${totals.totalRevenue.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Total Cost</p>
              <p className="text-orange-400 text-xl font-bold">
                ${totals.totalCost.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Gross Profit</p>
              <p className="text-green-400 text-xl font-bold">
                ${totals.grossProfit.toLocaleString()}
              </p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Overall Margin</p>
              <p className={`text-xl font-bold ${getMarginColor(totals.marginPercentage)}`}>
                {totals.marginPercentage.toFixed(1)}%
              </p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BOMAnalysis;

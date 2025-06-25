
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Edit3, Save, X } from 'lucide-react';
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
  const handleEditStart = (item: BOMItemWithDetails) => {
    onPriceEdit(item.id, item.unit_price?.toString() || '0');
  };

  const handleEditSave = (itemId: string) => {
    onPriceUpdate(itemId);
  };

  const handleEditCancel = (itemId: string) => {
    onPriceEditCancel(itemId);
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

  const totals = calculateUpdatedTotals();

  if (loadingBom) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">BOM Analysis</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center py-8">
            Loading BOM items...
          </p>
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
            BOM Analysis
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
                  <h4 className="text-white font-medium truncate">{item.name}</h4>
                  {item.description && (
                    <p className="text-gray-400 text-sm mt-1">{item.description}</p>
                  )}
                  {item.part_number && (
                    <Badge variant="outline" className="text-xs text-green-400 border-green-400 mt-2">
                      P/N: {item.part_number}
                    </Badge>
                  )}
                </div>
                
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
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Quantity:</span>
                  <div className="text-white font-medium">{item.quantity}</div>
                </div>
                
                <div>
                  <span className="text-gray-400">Unit Price:</span>
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
                  <span className="text-gray-400">Total Price:</span>
                  <div className="text-white font-medium">
                    ${((item.unit_price || 0) * item.quantity).toLocaleString()}
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-400">Total Cost:</span>
                  <div className="text-white font-medium">
                    ${((item.unit_cost || 0) * item.quantity).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Item Margin:</span>
                  <div className="text-right">
                    <span className={`font-medium ${
                      (item.margin || 0) >= 30 ? 'text-green-400' : 
                      (item.margin || 0) >= 20 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {(item.margin || 0).toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Project Financial Summary</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-6">
            <div className="space-y-3">
              <div className="flex justify-between">
                <span className="text-gray-400">Total Revenue:</span>
                <span className="text-white font-semibold">
                  ${totals.totalRevenue.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-400">Total Cost:</span>
                <span className="text-white font-semibold">
                  ${totals.totalCost.toLocaleString()}
                </span>
              </div>
              <div className="flex justify-between border-t border-gray-700 pt-3">
                <span className="text-gray-400">Gross Profit:</span>
                <span className="text-white font-bold">
                  ${totals.grossProfit.toLocaleString()}
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-center">
              <div className="text-center">
                <div className="text-gray-400 text-sm mb-2">Overall Margin</div>
                <div className={`text-3xl font-bold ${
                  totals.marginPercentage >= 30 ? 'text-green-400' : 
                  totals.marginPercentage >= 20 ? 'text-yellow-400' : 'text-red-400'
                }`}>
                  {totals.marginPercentage.toFixed(1)}%
                </div>
              </div>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BOMAnalysis;

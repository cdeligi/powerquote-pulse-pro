
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { Edit3, Save, X } from 'lucide-react';
import { useState } from 'react';

interface BOMItem {
  id: string;
  product_id: string;
  name: string;
  description?: string;
  part_number?: string;
  quantity: number;
  unit_price: number;
  unit_cost: number;
  total_price: number;
  total_cost: number;
  margin: number;
  configuration_data?: any;
  product_type?: string;
}

interface BOMAnalysisProps {
  bomItems: BOMItem[];
  onPriceUpdate: (itemId: string, newPrice: number) => void;
  canEditPrices: boolean;
}

const BOMAnalysis = ({ bomItems, onPriceUpdate, canEditPrices }: BOMAnalysisProps) => {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);

  const handleEditStart = (item: BOMItem) => {
    setEditingItem(item.id);
    setEditPrice(item.unit_price);
  };

  const handleEditSave = (itemId: string) => {
    onPriceUpdate(itemId, editPrice);
    setEditingItem(null);
  };

  const handleEditCancel = () => {
    setEditingItem(null);
    setEditPrice(0);
  };

  const calculateUpdatedTotals = () => {
    const totalRevenue = bomItems.reduce((sum, item) => {
      return sum + (item.unit_price * item.quantity);
    }, 0);
    
    // Fix: Calculate total cost properly as unit_cost × quantity
    const totalCost = bomItems.reduce((sum, item) => {
      return sum + (item.unit_cost * item.quantity);
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
                
                {canEditPrices && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditStart(item)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                    title="Edit unit price"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                )}
              </div>
              
              <div className="grid grid-cols-2 md:grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="text-gray-400">Quantity:</span>
                  <div className="text-white font-medium">{item.quantity}</div>
                </div>
                
                <div>
                  <span className="text-gray-400">Unit Price:</span>
                  {editingItem === item.id ? (
                    <div className="flex items-center space-x-1 mt-1">
                      <Input
                        type="number"
                        step="0.01"
                        value={editPrice}
                        onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
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
                        onClick={handleEditCancel}
                        className="h-5 w-5 p-0 text-gray-400 hover:text-white"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <div className="text-white font-medium">
                      ${item.unit_price.toLocaleString()}
                    </div>
                  )}
                </div>
                
                <div>
                  <span className="text-gray-400">Total Price:</span>
                  <div className="text-white font-medium">
                    ${(item.unit_price * item.quantity).toLocaleString()}
                  </div>
                </div>
                
                <div>
                  <span className="text-gray-400">Total Cost:</span>
                  <div className="text-white font-medium">
                    ${(item.unit_cost * item.quantity).toLocaleString()}
                  </div>
                </div>
              </div>
              
              <div className="mt-3 pt-3 border-t border-gray-700">
                <div className="flex justify-between items-center text-sm">
                  <span className="text-gray-400">Item Margin:</span>
                  <div className="text-right">
                    <span className={`font-medium ${
                      item.margin >= 30 ? 'text-green-400' : 
                      item.margin >= 20 ? 'text-yellow-400' : 'text-red-400'
                    }`}>
                      {item.margin.toFixed(1)}%
                    </span>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </CardContent>
      </Card>

      {/* Project Financial Summary */}
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

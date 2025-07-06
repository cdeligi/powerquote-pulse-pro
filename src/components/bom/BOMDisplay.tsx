
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Edit, DollarSign, Package, Settings, TrendingUp, ArrowUp } from 'lucide-react';
import { BOMItem } from '@/types/product';
import PriceOverrideManager from './PriceOverrideManager';
import { useAuth } from '@/hooks/useAuth';

interface BOMDisplayProps {
  items: BOMItem[];
  onUpdateItem: (itemId: string, updates: Partial<BOMItem>) => void;
  onRemoveItem: (itemId: string) => void;
  readOnly?: boolean;
}

const BOMDisplay = ({ items, onUpdateItem, onRemoveItem, readOnly = false }: BOMDisplayProps) => {
  const { user } = useAuth();
  const [editingItemId, setEditingItemId] = useState<string | null>(null);
  const [priceIncreases, setPriceIncreases] = useState<Record<string, string>>({});

  const getTotalPrice = () => {
    return items.reduce((sum, item) => sum + (item.unitPrice * item.quantity), 0);
  };

  const getTotalCost = () => {
    return items.reduce((sum, item) => sum + (item.unitCost * item.quantity), 0);
  };

  const getMargin = () => {
    const totalPrice = getTotalPrice();
    const totalCost = getTotalCost();
    if (totalPrice === 0) return 0;
    return ((totalPrice - totalCost) / totalPrice) * 100;
  };

  const getItemMargin = (item: BOMItem) => {
    if (item.unitPrice === 0) return 0;
    return ((item.unitPrice - item.unitCost) / item.unitPrice) * 100;
  };

  const canEditPrices = user && ['admin', 'finance', 'level2'].includes(user.role);
  const canIncreasePrice = user && ['level1', 'level2', 'admin', 'finance'].includes(user.role);
  const isAdmin = user && ['admin', 'finance'].includes(user.role);

  const handlePriceIncrease = (itemId: string) => {
    const newPrice = parseFloat(priceIncreases[itemId] || '0');
    const item = items.find(i => i.id === itemId);
    
    if (!item || newPrice <= item.unitPrice) {
      return; // Only allow increases
    }

    const updatedItem = {
      ...item,
      unitPrice: newPrice,
      totalPrice: newPrice * item.quantity,
      margin: newPrice > 0 ? ((newPrice - item.unitCost) / newPrice) * 100 : 0
    };

    onUpdateItem(itemId, updatedItem);
    setPriceIncreases(prev => ({ ...prev, [itemId]: '' }));
  };

  const handlePriceUpdate = (itemId: string, newPrice: number, reason: string) => {
    const item = items.find(i => i.id === itemId);
    if (!item) return;

    const updatedItem = {
      ...item,
      unitPrice: newPrice,
      totalPrice: newPrice * item.quantity,
      margin: newPrice > 0 ? ((newPrice - item.unitCost) / newPrice) * 100 : 0
    };

    onUpdateItem(itemId, updatedItem);
    setEditingItemId(null);
  };

  if (items.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="p-8 text-center">
          <Package className="h-16 w-16 text-gray-400 mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-white mb-2">No Items in BOM</h3>
          <p className="text-gray-400">Add products to your Bill of Materials to get started.</p>
        </CardContent>
      </Card>
    );
  }

  return (
    <div className="space-y-6">
      {/* BOM Items */}
      <div className="space-y-4">
        {items.map((item) => (
          <Card key={item.id} className="bg-gray-900 border-gray-800">
            <CardHeader className="pb-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  <div className="bg-blue-600 p-2 rounded-lg">
                    <Package className="h-5 w-5 text-white" />
                  </div>
                  <div>
                    <CardTitle className="text-white text-lg">{item.name}</CardTitle>
                    <p className="text-gray-300 text-sm">{item.description}</p>
                    {item.partNumber && (
                      <p className="text-gray-400 text-xs">Part: {item.partNumber}</p>
                    )}
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <Badge variant="outline" className="text-blue-400 border-blue-600">
                    Qty: {item.quantity}
                  </Badge>
                  {canEditPrices && !readOnly && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => setEditingItemId(item.id)}
                      className="text-green-400 hover:text-green-300 hover:bg-green-900/20"
                    >
                      <Edit className="h-4 w-4" />
                    </Button>
                  )}
                </div>
              </div>
            </CardHeader>
            <CardContent>
              <div className="grid grid-cols-2 md:grid-cols-5 gap-4">
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="flex items-center space-x-2 mb-1">
                    <DollarSign className="h-4 w-4 text-green-400" />
                    <span className="text-gray-300 text-sm">Unit Price</span>
                  </div>
                  <p className="text-white font-semibold">${item.unitPrice.toFixed(2)}</p>
                </div>
                
                {isAdmin && (
                  <div className="bg-gray-800 p-3 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <Settings className="h-4 w-4 text-orange-400" />
                      <span className="text-gray-300 text-sm">Unit Cost</span>
                    </div>
                    <p className="text-white font-semibold">${item.unitCost.toFixed(2)}</p>
                  </div>
                )}
                
                <div className="bg-gray-800 p-3 rounded-lg">
                  <div className="text-gray-300 text-sm mb-1">Total Price</div>
                  <p className="text-green-400 font-semibold">${item.totalPrice.toFixed(2)}</p>
                </div>
                
                {isAdmin && (
                  <div className="bg-gray-800 p-3 rounded-lg">
                    <div className="flex items-center space-x-2 mb-1">
                      <TrendingUp className="h-4 w-4 text-blue-400" />
                      <span className="text-gray-300 text-sm">Margin</span>
                    </div>
                    <p className={`font-semibold ${getItemMargin(item) >= 25 ? 'text-green-400' : getItemMargin(item) >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
                      {getItemMargin(item).toFixed(1)}%
                    </p>
                  </div>
                )}

                {/* Price Increase Section for Sales Users */}
                {canIncreasePrice && !readOnly && !isAdmin && (
                  <div className="bg-gray-800 p-3 rounded-lg">
                    <Label className="text-gray-300 text-sm">Increase Price</Label>
                    <div className="flex items-center space-x-2 mt-1">
                      <Input
                        type="number"
                        step="0.01"
                        min={item.unitPrice}
                        value={priceIncreases[item.id] || ''}
                        onChange={(e) => setPriceIncreases(prev => ({
                          ...prev,
                          [item.id]: e.target.value
                        }))}
                        className="bg-gray-700 border-gray-600 text-white text-sm h-8"
                        placeholder="New price"
                      />
                      <Button
                        size="sm"
                        onClick={() => handlePriceIncrease(item.id)}
                        disabled={!priceIncreases[item.id] || parseFloat(priceIncreases[item.id]) <= item.unitPrice}
                        className="bg-green-600 hover:bg-green-700 h-8 px-2"
                      >
                        <ArrowUp className="h-3 w-3" />
                      </Button>
                    </div>
                  </div>
                )}
              </div>

              {editingItemId === item.id && (
                <div className="mt-4 border-t border-gray-700 pt-4">
                  <PriceOverrideManager
                    item={item}
                    onPriceUpdate={(newPrice, reason) => handlePriceUpdate(item.id, newPrice, reason)}
                    onCancel={() => setEditingItemId(null)}
                  />
                </div>
              )}

              {!readOnly && (
                <div className="mt-4 flex justify-end">
                  <Button
                    size="sm"
                    variant="destructive"
                    onClick={() => onRemoveItem(item.id)}
                    className="bg-red-600 hover:bg-red-700"
                  >
                    Remove Item
                  </Button>
                </div>
              )}
            </CardContent>
          </Card>
        ))}
      </div>

      {/* BOM Summary */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <DollarSign className="mr-2 h-5 w-5 text-green-500" />
            BOM Summary
          </CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
            <div className="bg-gray-800 p-4 rounded-lg text-center">
              <div className="text-2xl font-bold text-green-400">${getTotalPrice().toLocaleString()}</div>
              <div className="text-gray-300 text-sm">Total Price</div>
            </div>
            {isAdmin && (
              <div className="bg-gray-800 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-orange-400">${getTotalCost().toLocaleString()}</div>
                <div className="text-gray-300 text-sm">Total Cost</div>
              </div>
            )}
            {isAdmin && (
              <div className="bg-gray-800 p-4 rounded-lg text-center">
                <div className="text-2xl font-bold text-blue-400">${(getTotalPrice() - getTotalCost()).toLocaleString()}</div>
                <div className="text-gray-300 text-sm">Gross Profit</div>
              </div>
            )}
            {isAdmin && (
              <div className="bg-gray-800 p-4 rounded-lg text-center">
                <div className={`text-2xl font-bold ${getMargin() >= 25 ? 'text-green-400' : getMargin() >= 15 ? 'text-yellow-400' : 'text-red-400'}`}>
                  {getMargin().toFixed(1)}%
                </div>
                <div className="text-gray-300 text-sm">Overall Margin</div>
              </div>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default BOMDisplay;

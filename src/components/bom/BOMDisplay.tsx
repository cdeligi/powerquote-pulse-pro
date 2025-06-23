
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trash2, Edit3, Save, X } from 'lucide-react';
import { BOMItem } from '@/types/product';
import { settingsService } from '@/services/settingsService';

interface BOMDisplayProps {
  bomItems: BOMItem[];
  onUpdateBOM: (items: BOMItem[]) => void;
  canSeePrices: boolean;
}

const BOMDisplay = ({ bomItems, onUpdateBOM, canSeePrices }: BOMDisplayProps) => {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);

  const handleEditStart = (item: BOMItem) => {
    setEditingItem(item.id);
    setEditQuantity(item.quantity);
  };

  const handleEditSave = (itemId: string) => {
    const updatedItems = bomItems.map(item =>
      item.id === itemId ? { ...item, quantity: editQuantity } : item
    );
    onUpdateBOM(updatedItems);
    setEditingItem(null);
  };

  const handleEditCancel = () => {
    setEditingItem(null);
    setEditQuantity(1);
  };

  const handleRemoveItem = (itemId: string) => {
    const updatedItems = bomItems.filter(item => item.id !== itemId);
    onUpdateBOM(updatedItems);
  };

  const getItemPrice = (item: BOMItem): number => {
    // If item has a configured price, use it
    if (item.product.price && item.product.price > 0) {
      return item.product.price;
    }
    
    // If item has cost, apply standard margin pricing
    if (item.product.cost && item.product.cost > 0) {
      return settingsService.applyStandardMarginPricing(item.product.cost);
    }
    
    // Fallback to 0 if no pricing information
    return 0;
  };

  const calculateTotal = () => {
    return bomItems.reduce((total, item) => {
      const price = getItemPrice(item);
      return total + (price * item.quantity);
    }, 0);
  };

  if (bomItems.length === 0) {
    return (
      <Card className="bg-gray-900 border-gray-800 h-fit">
        <CardHeader>
          <CardTitle className="text-white">Bill of Materials</CardTitle>
        </CardHeader>
        <CardContent>
          <p className="text-gray-400 text-center py-8">
            No items selected yet. Start building your configuration.
          </p>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card className="bg-gray-900 border-gray-800 h-fit">
      <CardHeader>
        <CardTitle className="text-white flex items-center justify-between">
          Bill of Materials
          <Badge variant="outline" className="text-white border-gray-500">
            {bomItems.length} items
          </Badge>
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {bomItems.map((item) => {
          const itemPrice = getItemPrice(item);
          const itemTotal = itemPrice * item.quantity;
          
          return (
            <div key={item.id} className="p-3 bg-gray-800 rounded-lg border border-gray-700">
              <div className="flex justify-between items-start mb-2">
                <div className="flex-1 min-w-0">
                  <h4 className="text-white font-medium truncate">{item.product.name}</h4>
                  {item.product.description && (
                    <p className="text-gray-400 text-xs mt-1">{item.product.description}</p>
                  )}
                  
                  {/* Part Number Display */}
                  {item.partNumber && (
                    <div className="text-green-400 text-xs mt-1 font-mono">
                      P/N: {item.partNumber}
                    </div>
                  )}
                  
                  <div className="flex gap-1 mt-2 flex-wrap">
                    {item.slot && (
                      <Badge variant="outline" className="text-xs text-blue-400 border-blue-400">
                        Slot {item.slot}
                      </Badge>
                    )}
                    {item.product.type && (
                      <Badge variant="outline" className="text-xs text-gray-400 border-gray-500">
                        {item.product.type}
                      </Badge>
                    )}
                    {/* Show pricing method badge for transparency */}
                    {canSeePrices && (
                      <Badge variant="outline" className="text-xs text-green-400 border-green-500">
                        {item.product.price && item.product.price > 0 ? 'List Price' : 'Standard Margin'}
                      </Badge>
                    )}
                  </div>
                </div>
                
                <div className="flex items-center space-x-2 ml-2">
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleEditStart(item)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                    title="Edit quantity"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleRemoveItem(item.id)}
                    className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                    title="Remove item"
                  >
                    <Trash2 className="h-3 w-3" />
                  </Button>
                </div>
              </div>
              
              <div className="flex justify-between items-center">
                <div className="flex items-center space-x-2">
                  <span className="text-gray-400 text-sm">Qty:</span>
                  {editingItem === item.id ? (
                    <div className="flex items-center space-x-1">
                      <Input
                        type="number"
                        min="1"
                        value={editQuantity}
                        onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                        className="w-16 h-6 text-xs bg-gray-700 border-gray-600 text-white"
                      />
                      <Button
                        size="sm"
                        onClick={() => handleEditSave(item.id)}
                        className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
                        title="Save"
                      >
                        <Save className="h-3 w-3" />
                      </Button>
                      <Button
                        size="sm"
                        variant="ghost"
                        onClick={handleEditCancel}
                        className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                        title="Cancel"
                      >
                        <X className="h-3 w-3" />
                      </Button>
                    </div>
                  ) : (
                    <span className="text-white font-medium">{item.quantity}</span>
                  )}
                </div>
                
                {canSeePrices && (
                  <div className="text-right">
                    <div className="text-white font-medium">
                      ${itemTotal.toLocaleString()}
                    </div>
                    {item.quantity > 1 && (
                      <div className="text-gray-400 text-xs">
                        ${itemPrice.toLocaleString()} each
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          );
        })}
        
        {canSeePrices && bomItems.length > 0 && (
          <div className="pt-3 border-t border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold">Total:</span>
              <span className="text-white font-bold text-lg">
                ${calculateTotal().toLocaleString()}
              </span>
            </div>
            <div className="text-xs text-gray-400 mt-1 text-right">
              Pricing based on {settingsService.getStandardMargin()}% standard margin
            </div>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BOMDisplay;

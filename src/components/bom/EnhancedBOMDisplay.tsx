import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Separator } from '@/components/ui/separator';
import { BOMItem } from '@/types/product';
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
  Package
} from 'lucide-react';
import { toast } from '@/hooks/use-toast';

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
  currentQuoteId
}: EnhancedBOMDisplayProps) => {
  const [editingQuantities, setEditingQuantities] = useState<Record<string, number>>({});

  // Calculate totals
  const subtotal = bomItems.reduce((sum, item) => sum + (item.product.price * item.quantity), 0);
  const totalCost = bomItems.reduce((sum, item) => sum + ((item.product.cost || 0) * item.quantity), 0);
  const grossProfit = subtotal - totalCost;
  const margin = subtotal > 0 ? (grossProfit / subtotal) * 100 : 0;

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

  return (
    <Card className="bg-gray-900 border-gray-800 h-fit">
      <CardHeader className="pb-4">
        <div className="flex items-center justify-between">
          <CardTitle className="flex items-center gap-2 text-white">
            <ShoppingCart className="h-5 w-5" />
            Bill of Materials
            {currentQuoteId && (
              <Badge variant="outline" className="text-blue-400 border-blue-400 ml-2">
                {currentQuoteId}
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
                        <div className="text-green-400">
                          {formatCurrency(item.product.price * item.quantity)}
                        </div>
                      )}
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-1 ml-2">
                    {onEditConfiguration && (
                      <Button
                        size="sm"
                        variant="ghost"
                        className="h-7 w-7 p-0 text-gray-400 hover:text-white hover:bg-gray-700"
                        onClick={() => onEditConfiguration(item)}
                        title="Edit Configuration"
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
            <div className="space-y-2">
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
                    <span className={margin >= 20 ? 'text-green-400' : margin >= 10 ? 'text-yellow-400' : 'text-red-400'}>
                      {margin.toFixed(1)}%
                    </span>
                  </div>
                </>
              )}
            </div>
          </>
        )}
        
        {/* Action Buttons */}
        {bomItems.length > 0 && (
          <>
            <Separator className="bg-gray-700" />
            <div className="flex flex-col gap-2">
              {/* Save as Draft */}
              {onSaveDraft && (
                <Button
                  onClick={onSaveDraft}
                  variant="secondary"
                  className="w-full bg-gray-700 hover:bg-gray-600 text-white border-gray-600"
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
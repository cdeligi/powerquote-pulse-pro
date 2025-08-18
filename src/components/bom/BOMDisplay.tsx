import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trash2, Edit3, Save, X, Settings } from 'lucide-react';
import { BOMItem } from '@/types/product';
import { FEATURES, usePermissions } from '@/hooks/usePermissions';
import { calculateMarginPercentage, formatMargin } from '@/utils/priceUtils';

interface BOMDisplayProps {
  bomItems: BOMItem[];
  onUpdateBOM: (items: BOMItem[]) => void;
  onEditConfiguration?: (item: BOMItem) => void;
  onSubmitQuote?: () => void;
  canSeePrices: boolean;
  canSeeCosts?: boolean;
  canEditPartNumber?: boolean;
}

const BOMDisplay = ({ bomItems, onUpdateBOM, onEditConfiguration, onSubmitQuote, canSeePrices, canSeeCosts = false, canEditPartNumber = false }: BOMDisplayProps) => {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editingPartNumber, setEditingPartNumber] = useState<string | null>(null);
  const [editPartNumber, setEditPartNumber] = useState<string>('');

  const { has } = usePermissions();
  const canShowMargin = has(FEATURES.BOM_SHOW_MARGIN);
  const canEditPrice = has(FEATURES.BOM_EDIT_PRICE);

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

  const handlePriceEditStart = (item: BOMItem) => {
    setEditingPrice(item.id);
    setEditPrice(item.product.price || 0);
  };

  const handlePriceChange = (value: string) => {
    const newPrice = parseFloat(value) || 0;
    setEditPrice(newPrice);
  };

  const handlePriceEditSave = (itemId: string) => {
    const item = bomItems.find(i => i.id === itemId);
    if (!item) return;
    
    // Only allow price increases
    const newPrice = Math.max(editPrice, item.product.price || 0);
    
    const updatedItems = bomItems.map(item =>
      item.id === itemId 
        ? { 
            ...item, 
            product: { ...item.product, price: newPrice },
            original_unit_price: item.original_unit_price || item.product.price,
            approved_unit_price: newPrice,
            price_modified: newPrice > (item.original_unit_price || item.product.price)
          } 
        : item
    );
    onUpdateBOM(updatedItems);
    setEditingPrice(null);
  };

  const handlePriceEditCancel = () => {
    setEditingPrice(null);
    setEditPrice(0);
  };

  const handlePartNumberEditStart = (item: BOMItem) => {
    setEditingPartNumber(item.id);
    setEditPartNumber(item.partNumber || item.product.partNumber || '');
  };

  const handlePartNumberEditSave = (itemId: string) => {
    const updatedItems = bomItems.map(item =>
      item.id === itemId 
        ? { ...item, partNumber: editPartNumber.trim() }
        : item
    );
    onUpdateBOM(updatedItems);
    setEditingPartNumber(null);
  };

  const handlePartNumberEditCancel = () => {
    setEditingPartNumber(null);
    setEditPartNumber('');
  };

  const handleRemoveItem = (itemId: string) => {
    const updatedItems = bomItems.filter(item => item.id !== itemId);
    onUpdateBOM(updatedItems);
  };

  const handleConfigurationEdit = (item: BOMItem) => {
    if (onEditConfiguration) {
      onEditConfiguration(item);
    }
  };

  const calculateTotal = () => {
    return bomItems.reduce((total, item) => {
      const price = item.product.price || 0;
      return total + (price * item.quantity);
    }, 0);
  };

  const isConfigurableItem = (item: BOMItem) => {
    // Check if item is configurable - includes QTMS, Level 4 products, analog sensors, bushing configurations, and chassis-configured items
    return item.product.type === 'QTMS' || 
           item.configuration || 
           item.slotAssignments ||  // Items with chassis/slot configuration
           (item.product as any).configurationType ||
           ((item.product as any).chassisType && (item.product as any).chassisType !== 'N/A') ||  // Chassis items that can be configured
           item.product.name?.toLowerCase().includes('analog') ||
           item.product.name?.toLowerCase().includes('bushing') ||
           item.product.name?.toLowerCase().includes('digital');
  };

  const needsConfiguration = (item: BOMItem) => {
    // Items that require configuration but don't have it yet
    const hasLevel4Config = (item.product as any).configurationType;
    const hasAnalogConfig = item.product.name?.toLowerCase().includes('analog');
    const hasBushingConfig = item.product.name?.toLowerCase().includes('bushing');
    const hasDigitalConfig = item.product.name?.toLowerCase().includes('digital');
    
    return (hasLevel4Config || hasAnalogConfig || hasBushingConfig || hasDigitalConfig) && !item.configuration;
  };

  const getPartNumber = (item: BOMItem) => {
    return item.partNumber || item.product.partNumber || 'N/A';
  };

  const calculateItemMargin = (item: BOMItem) => {
    if (!item.product?.price || !item.product?.cost) return null;
    return calculateMarginPercentage(item.product.price, item.product.cost);
  };

  const totalCost = bomItems.reduce((sum, item) => {
    return sum + ((item.product.cost || 0) * item.quantity);
  }, 0);

  const totalPrice = bomItems.reduce((sum, item) => {
    return sum + ((item.product.price || 0) * item.quantity);
  }, 0);

  const totalMargin = calculateMarginPercentage(totalPrice, totalCost);

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
        {bomItems.map((item) => (
          <div key={item.id} className="p-3 bg-gray-800 rounded border border-gray-700 space-y-2">
            {/* Header Row */}
            <div className="flex justify-between items-start gap-2">
              <h4 className="text-white font-medium text-sm leading-tight flex-1 min-w-0 break-words">
                {item.product.name}
              </h4>
              <div className="flex items-center gap-1 flex-shrink-0">
                {isConfigurableItem(item) && onEditConfiguration && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleConfigurationEdit(item)}
                    className="h-6 w-6 p-0 text-purple-400 hover:text-purple-300"
                    title="Configure"
                  >
                    <Settings className="h-3.5 w-3.5" />
                  </Button>
                )}
                <Button
                  size="sm"
                  variant="ghost"
                  onClick={() => handleRemoveItem(item.id)}
                  className="h-6 w-6 p-0 text-red-400 hover:text-red-300"
                  title="Remove"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                </Button>
              </div>
            </div>

            {/* Description */}
            {item.product.description && (
              <p className="text-gray-400 text-xs line-clamp-2 leading-tight">
                {item.product.description}
              </p>
            )}

            {/* Part Number */}
            <div className="flex items-center gap-2 text-xs">
              <span className="text-gray-400 whitespace-nowrap">PN:</span>
              {editingPartNumber === item.id ? (
                <div className="flex items-center gap-1 flex-1">
                  <Input
                    value={editPartNumber}
                    onChange={(e) => setEditPartNumber(e.target.value)}
                    className="h-7 text-xs bg-gray-700 border-gray-600 text-white font-mono flex-1 min-w-0"
                    placeholder="Part number"
                  />
                  <Button
                    size="sm"
                    onClick={() => handlePartNumberEditSave(item.id)}
                    className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
                    title="Save"
                  >
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={handlePartNumberEditCancel}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                    title="Cancel"
                  >
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1 flex-1 min-w-0">
                  <code 
                    className="text-xs bg-gray-700 px-2 py-0.5 rounded font-mono truncate flex-1 min-w-0"
                    title={getPartNumber(item)}
                  >
                    {getPartNumber(item)}
                  </code>
                  {canEditPartNumber && (
                    <Button
                      size="sm"
                      variant="ghost"
                      onClick={() => handlePartNumberEditStart(item)}
                      className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                      title="Edit part number"
                    >
                      <Edit3 className="h-3 w-3" />
                    </Button>
                  )}
                </div>
              )}
            </div>

            {/* Price and Quantity */}
            <div className="flex flex-wrap items-center justify-between gap-2 pt-1">
              <div className="flex items-center gap-2">
                <span className="text-gray-400 text-xs">Qty:</span>
                {editingItem === item.id ? (
                  <div className="flex items-center gap-1">
                    <Input
                      type="number"
                      min="1"
                      value={editQuantity}
                      onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                      className="w-14 h-7 text-xs bg-gray-700 border-gray-600 text-white"
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
                  <div className="flex items-center gap-1">
                    <span 
                      className="text-white font-medium cursor-pointer hover:bg-gray-700 rounded px-1.5 py-0.5 text-sm"
                      onClick={() => handleEditStart(item)}
                      title="Click to edit quantity"
                    >
                      {item.quantity}
                    </span>
                  </div>
                )}
              </div>

              {canSeePrices && (
                <div className="flex flex-col items-end gap-0.5">
                  <div className="flex items-center gap-1">
                    <span className="text-gray-400 text-xs">Price:</span>
                    <span className="text-white font-medium text-sm">
                      ${((item.product.price || 0) * item.quantity).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </span>
                  </div>
                  
                  {canSeeCosts && item.product.cost > 0 && (
                    <div className="text-orange-400 text-xs">
                      Cost: ${(item.product.cost * item.quantity).toLocaleString(undefined, {
                        minimumFractionDigits: 2,
                        maximumFractionDigits: 2
                      })}
                    </div>
                  )}
                  
                  {canShowMargin && item.product.price > 0 && item.product.cost > 0 && (
                    <div className="text-blue-400 text-xs">
                      Margin: {formatMargin(calculateMarginPercentage(item.product.price, item.product.cost))}
                    </div>
                  )}
                </div>
              )}
            </div>

            {/* Badges */}
            <div className="flex flex-wrap items-center gap-1 mt-1">
              {item.slot && (
                <Badge variant="outline" className="text-[10px] text-blue-400 border-blue-400 px-1.5 py-0">
                  Slot {item.slot}
                </Badge>
              )}
              {isConfigurableItem(item) && (
                <Badge variant="outline" className="text-[10px] text-purple-400 border-purple-400 px-1.5 py-0">
                  Configurable
                </Badge>
              )}
              {needsConfiguration(item) && (
                <Badge variant="outline" className="text-[10px] text-orange-400 border-orange-400 px-1.5 py-0">
                  Config Required
                </Badge>
              )}
              {item.partNumber && item.partNumber !== item.product.partNumber && (
                <Badge variant="outline" className="text-[10px] text-yellow-400 border-yellow-400 px-1.5 py-0">
                  Custom PN
                </Badge>
              )}
            </div>
          </div>
        ))}
        
        {canSeePrices && bomItems.length > 0 && (
          <div className="border-t border-gray-700 pt-3 mt-3">
            <div className="flex justify-between items-center">
              <span className="text-gray-300 font-medium">Total:</span>
              <div className="text-right">
                <div className="text-white font-medium">
                  ${totalPrice.toLocaleString(undefined, {
                    minimumFractionDigits: 2,
                    maximumFractionDigits: 2
                  })}
                </div>
                {canSeeCosts && totalCost > 0 && (
                  <div className="text-orange-400 text-sm">
                    Cost: ${totalCost.toLocaleString(undefined, {
                      minimumFractionDigits: 2,
                      maximumFractionDigits: 2
                    })}
                  </div>
                )}
                {canShowMargin && totalMargin !== null && (
                  <div className="text-blue-400 text-sm">
                    Margin: {formatMargin(totalMargin)}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
        
        {/* Submit to Quote Button */}
        {bomItems.length > 0 && onSubmitQuote && (
          <div className="pt-3 border-t border-gray-700">
            <Button
              onClick={onSubmitQuote}
              className="w-full bg-red-600 hover:bg-red-700 text-white"
              size="lg"
            >
              Submit to Quote
            </Button>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default BOMDisplay;

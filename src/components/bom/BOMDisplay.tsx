
import { useState } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trash2, Edit3, Save, X, Settings } from 'lucide-react';
import { BOMItem } from '@/types/product';

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

  const handlePriceEditSave = (itemId: string) => {
    const updatedItems = bomItems.map(item =>
      item.id === itemId 
        ? { 
            ...item, 
            product: { ...item.product, price: editPrice },
            // Track price changes for admin review
            original_unit_price: item.original_unit_price || item.product.price,
            approved_unit_price: editPrice
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
          <div key={item.id} className="p-3 bg-gray-800 rounded-lg border border-gray-700">
            <div className="flex justify-between items-start mb-2">
              <div className="flex-1 min-w-0">
                <h4 className="text-white font-medium truncate">{item.product.name}</h4>
                {/* Enhanced description display from product data */}
                {item.product.description && (
                  <p className="text-gray-400 text-xs mt-1">{item.product.description}</p>
                )}
                
                {/* Part Number Display */}
                <div className="flex flex-wrap items-center gap-2 mt-1">
                  {editingPartNumber === item.id ? (
                    <div className="flex items-center space-x-1">
                      <span className="text-xs text-gray-400">P/N:</span>
                      <Input
                        value={editPartNumber}
                        onChange={(e) => setEditPartNumber(e.target.value)}
                        className="w-32 h-6 text-xs bg-gray-700 border-gray-600 text-white font-mono"
                        placeholder="Part number"
                      />
                      <Button
                        size="sm"
                        onClick={() => handlePartNumberEditSave(item.id)}
                        className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
                        title="Save part number"
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
                    <div className="flex items-center space-x-1">
                      <Badge variant="outline" className="text-xs font-mono text-white border-gray-500 break-all">
                        P/N: {getPartNumber(item)}
                      </Badge>
                      {/* Show "Forced" badge if part number differs from product default */}
                      {item.partNumber && item.partNumber !== item.product.partNumber && (
                        <Badge variant="outline" className="text-xs text-yellow-400 border-yellow-400">
                          Forced
                        </Badge>
                      )}
                      {canEditPartNumber && (
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePartNumberEditStart(item)}
                          className="h-4 w-4 p-0 text-gray-400 hover:text-white"
                          title="Edit part number"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      )}
                    </div>
                  )}
                  {item.slot && (
                    <Badge variant="outline" className="text-xs text-blue-400 border-blue-400">
                      Slot {item.slot}
                    </Badge>
                  )}
                  {isConfigurableItem(item) && (
                    <Badge variant="outline" className="text-xs text-purple-400 border-purple-400">
                      Configurable
                    </Badge>
                  )}
                  {needsConfiguration(item) && (
                    <Badge variant="outline" className="text-xs text-orange-400 border-orange-400">
                      Config Required
                    </Badge>
                  )}
                </div>
              </div>
              
              <div className="flex items-center space-x-2 ml-2">
                {isConfigurableItem(item) && onEditConfiguration && (
                  <Button
                    size="sm"
                    variant="ghost"
                    onClick={() => handleConfigurationEdit(item)}
                    className="h-6 w-6 p-0 text-purple-400 hover:text-purple-300"
                    title="Edit configuration"
                  >
                    <Settings className="h-3 w-3" />
                  </Button>
                )}
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
                  <div className="flex items-center space-x-2 justify-end">
                    {editingPrice === item.id ? (
                      <div className="flex items-center space-x-1">
                        <span className="text-gray-400 text-xs">$</span>
                        <Input
                          type="number"
                          min="0"
                          step="0.01"
                          value={editPrice}
                          onChange={(e) => setEditPrice(parseFloat(e.target.value) || 0)}
                          className="w-20 h-6 text-xs bg-gray-700 border-gray-600 text-white"
                        />
                        <Button
                          size="sm"
                          onClick={() => handlePriceEditSave(item.id)}
                          className="h-6 w-6 p-0 bg-green-600 hover:bg-green-700"
                          title="Save price"
                        >
                          <Save className="h-3 w-3" />
                        </Button>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={handlePriceEditCancel}
                          className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                          title="Cancel"
                        >
                          <X className="h-3 w-3" />
                        </Button>
                      </div>
                    ) : (
                      <div className="flex items-center space-x-1">
                        <div className="text-white font-medium">
                          ${((item.product.price || 0) * item.quantity).toLocaleString()}
                        </div>
                        <Button
                          size="sm"
                          variant="ghost"
                          onClick={() => handlePriceEditStart(item)}
                          className="h-4 w-4 p-0 text-gray-400 hover:text-white"
                          title="Edit price"
                        >
                          <Edit3 className="h-3 w-3" />
                        </Button>
                      </div>
                    )}
                  </div>
                  {item.quantity > 1 && !editingPrice && (
                    <div className="text-gray-400 text-xs">
                      ${item.product.price?.toLocaleString() || '—'} each
                    </div>
                  )}
                  {/* Show price adjustment indicator */}
                  {item.original_unit_price && item.original_unit_price !== item.product.price && (
                    <div className="text-yellow-400 text-xs">
                      Orig: ${item.original_unit_price.toLocaleString()}
                    </div>
                  )}
                  {/* Display cost information if available and user can see costs */}
                  {canSeeCosts && item.product.cost && (
                    <div className="text-orange-400 text-xs">
                      Cost: ${((item.product.cost || 0) * item.quantity).toLocaleString()}
                    </div>
                  )}
                </div>
              )}
            </div>
          </div>
        ))}
        
        {canSeePrices && bomItems.length > 0 && (
          <div className="pt-3 border-t border-gray-700">
            <div className="flex justify-between items-center">
              <span className="text-white font-semibold">Total:</span>
              <span className="text-white font-bold text-lg">
                ${calculateTotal().toLocaleString()}
              </span>
            </div>
            {/* Display total cost if available and user can see costs */}
            {canSeeCosts && bomItems.some(item => item.product.cost) && (
              <div className="flex justify-between items-center mt-1">
                <span className="text-orange-400 text-sm">Total Cost:</span>
                <span className="text-orange-400 text-sm font-medium">
                  ${bomItems.reduce((total, item) => {
                    const cost = item.product.cost || 0;
                    return total + (cost * item.quantity);
                  }, 0).toLocaleString()}
                </span>
              </div>
            )}
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

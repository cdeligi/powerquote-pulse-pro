import { useState, useMemo } from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Input } from '@/components/ui/input';
import { Trash2, Edit3, Save, X, Settings } from 'lucide-react';
import { BOMItem } from '@/types/product';
import { FEATURES, usePermissions } from '@/hooks/usePermissions';
import { calculateMarginPercentage, formatMargin } from '@/utils/priceUtils';
import { useBOMContext } from '@/context/BOMContext';
import { Table, TableHeader, TableBody, TableRow, TableCell, TableHead } from '@/components/ui/table';
import { Fragment } from 'react';

interface BOMDisplayProps {
  bomItems: BOMItem[];
  onUpdateBOM: (items: BOMItem[]) => void;
  onEditConfiguration?: (item: BOMItem) => void;
  onSubmitQuote?: () => void;
  canSeePrices: boolean;
  canSeeCosts?: boolean;
  canEditPartNumber?: boolean;
  productMap: Map<string, string>;
  readOnly?: boolean;
}

const BOMDisplay = ({ bomItems, onUpdateBOM, onEditConfiguration, onSubmitQuote, canSeePrices, canSeeCosts = false, canEditPartNumber = false, readOnly = false }: BOMDisplayProps) => {
  const [editingItem, setEditingItem] = useState<string | null>(null);
  const [editQuantity, setEditQuantity] = useState<number>(1);
  const [editingPrice, setEditingPrice] = useState<string | null>(null);
  const [editPrice, setEditPrice] = useState<number>(0);
  const [editingPartNumber, setEditingPartNumber] = useState<string | null>(null);
  const [editPartNumber, setEditPartNumber] = useState<string>('');

  const { has } = usePermissions();
  const canShowMargin = has(FEATURES.BOM_SHOW_MARGIN);
  const canEditPrice = has(FEATURES.BOM_EDIT_PRICE);
  const { getLevel4Summary } = useBOMContext();

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

  // Group items by chassis configuration
  const groupedItems = useMemo(() => {
    const groups: { chassis: BOMItem | null; accessories: BOMItem[] }[] = [];
    let currentGroup: { chassis: BOMItem | null; accessories: BOMItem[] } | null = null;

    bomItems.forEach(item => {
      if (item.isAccessory) {
        // Add to current group if exists, otherwise create a new group
        if (currentGroup) {
          currentGroup.accessories.push(item);
        } else {
          groups.push({ chassis: null, accessories: [item] });
        }
      } else if (item.slotAssignments) {
        // This is a chassis configuration, create a new group
        currentGroup = { chassis: item, accessories: [] };
        groups.push(currentGroup);
      } else {
        // Regular item, add as its own group
        groups.push({ chassis: item, accessories: [] });
        currentGroup = null;
      }
    });

    return groups;
  }, [bomItems]);

  // Render a chassis configuration with its accessories
  const renderChassisGroup = (group: { chassis: BOMItem | null; accessories: BOMItem[] }, index: number) => {
    if (!group.chassis) {
      return group.accessories.map((item) => (
        <TableRow key={`accessory-${item.id}`} className="bg-gradient-to-r from-slate-800/60 to-slate-700/60 hover:from-slate-700/80 hover:to-slate-600/80 transition-all duration-200">
          <TableCell className="pl-4">
            <div className="flex flex-col">
              <span className="text-slate-200 font-medium">{item.displayName || item.product.name}</span>
              {item.product.description && (
                <span className="text-xs text-slate-400 mt-1">{item.product.description}</span>
              )}
            </div>
          </TableCell>
          <TableCell>
            {editingPartNumber === item.id ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editPartNumber}
                  onChange={(e) => setEditPartNumber(e.target.value)}
                  className="h-7 text-xs bg-gray-700 border-gray-600 text-white font-mono"
                />
                <Button size="sm" onClick={() => handlePartNumberEditSave(item.id!)} className="h-6 w-6 p-0">
                  <Save className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handlePartNumberEditCancel} className="h-6 w-6 p-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <code className="text-xs bg-gray-700 px-2 py-0.5 rounded font-mono">
                  {getPartNumber(item)}
                </code>
                {canEditPartNumber && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePartNumberEditStart(item)}
                    className="h-6 w-6 p-0 text-gray-400 hover:text-white"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </TableCell>
          <TableCell>
            {editingItem === item.id ? (
              <div className="flex items-center gap-1 w-32">
                <Input
                  type="number"
                  min="1"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                  className="h-7 text-xs bg-gray-700 border-gray-600 text-white"
                />
                <Button size="sm" onClick={() => handleEditSave(item.id!)} className="h-6 w-6 p-0">
                  <Save className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleEditCancel} className="h-6 w-6 p-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span 
                  className="text-white font-medium cursor-pointer hover:bg-gray-700 rounded px-1.5 py-0.5"
                  onClick={() => handleEditStart(item)}
                >
                  {item.quantity}
                </span>
              </div>
            )}
          </TableCell>
          <TableCell>
            {canSeePrices && item.product.price !== undefined && (
              <div className="flex flex-col">
                <div className="text-white">
                  ${(item.product.price * item.quantity).toFixed(2)}
                </div>
                {canSeeCosts && item.product.cost > 0 && (
                  <div className="text-xs text-orange-400">
                    ${(item.product.cost * item.quantity).toFixed(2)}
                  </div>
                )}
                {canShowMargin && item.product.price > 0 && item.product.cost > 0 && (
                  <div className="text-xs text-blue-400">
                    {formatMargin(calculateItemMargin(item) || 0)}
                  </div>
                )}
              </div>
            )}
          </TableCell>
          <TableCell className="text-right">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveItem(item.id!)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TableCell>
        </TableRow>
      ));
    }

    return (
      <Fragment key={`group-${index}`}>
        {/* Chassis row */}
        <TableRow className="bg-gradient-to-r from-slate-700/70 to-slate-600/70 hover:from-slate-600/90 hover:to-slate-500/90 transition-all duration-200">
          <TableCell className="font-medium">
            <div className="flex flex-col">
              <span className="text-slate-100 font-semibold">{group.chassis.displayName || group.chassis.product.name}</span>
              {group.chassis.product.description && (
                <span className="text-xs text-slate-300 mt-1">{group.chassis.product.description}</span>
              )}
              <div className="flex flex-wrap gap-1 mt-2">
                {isConfigurableItem(group.chassis) && (
                  <Badge variant="outline" className="text-[10px] text-purple-300 border-purple-400/60 bg-purple-500/10 px-1.5 py-0">
                    Configurable
                  </Badge>
                )}
                {needsConfiguration(group.chassis) && (
                  <Badge variant="outline" className="text-[10px] text-orange-300 border-orange-400/60 bg-orange-500/10 px-1.5 py-0">
                    Config Required
                  </Badge>
                )}
                {getLevel4Summary(group.chassis.id!) && (
                  <Badge variant="outline" className="text-[10px] text-emerald-300 border-emerald-400/60 bg-emerald-500/10 px-1.5 py-0">
                    {getLevel4Summary(group.chassis.id!)}
                  </Badge>
                )}
              </div>
            </div>
          </TableCell>
          <TableCell>
            {editingPartNumber === group.chassis.id ? (
              <div className="flex items-center gap-1">
                <Input
                  value={editPartNumber}
                  onChange={(e) => setEditPartNumber(e.target.value)}
                  className="h-7 text-xs bg-gray-600 border-gray-500 text-white font-mono"
                />
                <Button size="sm" onClick={() => handlePartNumberEditSave(group.chassis!.id!)} className="h-6 w-6 p-0">
                  <Save className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handlePartNumberEditCancel} className="h-6 w-6 p-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <code className="text-xs bg-gray-600 px-2 py-0.5 rounded font-mono">
                  {getPartNumber(group.chassis)}
                </code>
                {canEditPartNumber && (
                  <Button
                    variant="ghost"
                    size="sm"
                    onClick={() => handlePartNumberEditStart(group.chassis!)}
                    className="h-6 w-6 p-0 text-gray-300 hover:text-white"
                  >
                    <Edit3 className="h-3 w-3" />
                  </Button>
                )}
              </div>
            )}
          </TableCell>
          <TableCell>
            {editingItem === group.chassis.id ? (
              <div className="flex items-center gap-1 w-32">
                <Input
                  type="number"
                  min="1"
                  value={editQuantity}
                  onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                  className="h-7 text-xs bg-gray-600 border-gray-500 text-white"
                />
                <Button size="sm" onClick={() => handleEditSave(group.chassis!.id!)} className="h-6 w-6 p-0">
                  <Save className="h-3 w-3" />
                </Button>
                <Button size="sm" variant="ghost" onClick={handleEditCancel} className="h-6 w-6 p-0">
                  <X className="h-3 w-3" />
                </Button>
              </div>
            ) : (
              <div className="flex items-center gap-1">
                <span 
                  className="text-white font-medium cursor-pointer hover:bg-gray-600 rounded px-1.5 py-0.5"
                  onClick={() => handleEditStart(group.chassis!)}
                >
                  {group.chassis.quantity}
                </span>
              </div>
            )}
          </TableCell>
          <TableCell>
            {canSeePrices && group.chassis.product.price !== undefined && (
              <div className="flex flex-col">
                <div className="text-white">
                  ${(group.chassis.product.price * group.chassis.quantity).toFixed(2)}
                </div>
                {canSeeCosts && group.chassis.product.cost > 0 && (
                  <div className="text-xs text-orange-400">
                    ${(group.chassis.product.cost * group.chassis.quantity).toFixed(2)}
                  </div>
                )}
                {canShowMargin && group.chassis.product.price > 0 && group.chassis.product.cost > 0 && (
                  <div className="text-xs text-blue-400">
                    {formatMargin(calculateItemMargin(group.chassis) || 0)}
                  </div>
                )}
              </div>
            )}
          </TableCell>
          <TableCell className="text-right">
            {isConfigurableItem(group.chassis) && onEditConfiguration && (
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleConfigurationEdit(group.chassis!)}
                className="mr-2 text-gray-300 hover:text-white"
                title="Configure"
              >
                <Settings className="h-4 w-4" />
              </Button>
            )}
            <Button
              variant="ghost"
              size="sm"
              onClick={() => handleRemoveItem(group.chassis!.id!)}
              className="text-red-500 hover:text-red-700"
            >
              <Trash2 className="h-4 w-4" />
            </Button>
          </TableCell>
        </TableRow>

        {/* Accessories */}
        {group.accessories.map((accessory) => (
          <TableRow key={`accessory-${accessory.id}`} className="bg-gray-800">
            <TableCell className="pl-4">
              <div className="flex flex-col">
                <span className="text-gray-200">{accessory.displayName || accessory.product.name}</span>
                {accessory.product.description && (
                  <span className="text-xs text-gray-400">{accessory.product.description}</span>
                )}
              </div>
            </TableCell>
            <TableCell>
              <code className="text-xs bg-gray-700 px-2 py-0.5 rounded font-mono">
                {getPartNumber(accessory)}
              </code>
            </TableCell>
            <TableCell>
              {editingItem === accessory.id ? (
                <div className="flex items-center gap-1 w-32">
                  <Input
                    type="number"
                    min="1"
                    value={editQuantity}
                    onChange={(e) => setEditQuantity(parseInt(e.target.value) || 1)}
                    className="h-7 text-xs bg-gray-700 border-gray-600 text-white"
                  />
                  <Button size="sm" onClick={() => handleEditSave(accessory.id!)} className="h-6 w-6 p-0">
                    <Save className="h-3 w-3" />
                  </Button>
                  <Button size="sm" variant="ghost" onClick={handleEditCancel} className="h-6 w-6 p-0">
                    <X className="h-3 w-3" />
                  </Button>
                </div>
              ) : (
                <div className="flex items-center gap-1">
                  <span 
                    className="text-gray-200 font-medium cursor-pointer hover:bg-gray-700 rounded px-1.5 py-0.5"
                    onClick={() => handleEditStart(accessory)}
                  >
                    {accessory.quantity}
                  </span>
                </div>
              )}
            </TableCell>
            <TableCell>
              {canSeePrices && accessory.product.price !== undefined && (
                <div className="flex flex-col">
                  <div className="text-gray-200">
                    ${(accessory.product.price * accessory.quantity).toFixed(2)}
                  </div>
                  {canSeeCosts && accessory.product.cost > 0 && (
                    <div className="text-xs text-orange-400">
                      ${(accessory.product.cost * accessory.quantity).toFixed(2)}
                    </div>
                  )}
                  {canShowMargin && accessory.product.price > 0 && accessory.product.cost > 0 && (
                    <div className="text-xs text-blue-400">
                      {formatMargin(calculateItemMargin(accessory) || 0)}
                    </div>
                  )}
                </div>
              )}
            </TableCell>
            <TableCell className="text-right">
              <Button
                variant="ghost"
                size="sm"
                onClick={() => handleRemoveItem(accessory.id!)}
                className="text-red-500 hover:text-red-700"
              >
                <Trash2 className="h-4 w-4" />
              </Button>
            </TableCell>
          </TableRow>
        ))}
      </Fragment>
    );
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
    <div className="space-y-4">
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Item</TableHead>
            <TableHead>Part Number</TableHead>
            <TableHead>Qty</TableHead>
            <TableHead>Price</TableHead>
            <TableHead className="text-right">Actions</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {groupedItems.length > 0 ? (
            groupedItems.map(renderChassisGroup)
          ) : (
            <TableRow>
              <TableCell colSpan={5} className="text-center py-4 text-muted-foreground">
                No items in the bill of materials.
              </TableCell>
            </TableRow>
          )}
        </TableBody>
      </Table>

      {/* Totals */}
      {bomItems.length > 0 && (
        <div className="border-t border-gray-700 pt-4 mt-4">
          <div className="flex justify-between items-center">
            <span className="text-gray-300 font-medium">Total:</span>
            <div className="text-right">
              <div className="text-white font-medium">
                ${totalPrice.toFixed(2)}
              </div>
              {canSeeCosts && totalCost > 0 && (
                <div className="text-orange-400 text-sm">
                  Cost: ${totalCost.toFixed(2)}
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
        <div className="pt-4">
          <Button
            onClick={onSubmitQuote}
            className="w-full bg-red-600 hover:bg-red-700 text-white"
            size="lg"
          >
            Submit to Quote
          </Button>
        </div>
      )}
    </div>
  );
};

export default BOMDisplay;


/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { useState } from 'react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger } from '@/components/ui/dialog';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Badge } from '@/components/ui/badge';
import { useToast } from '@/hooks/use-toast';
import { TrendingUp, TrendingDown, AlertTriangle, DollarSign, CheckCircle } from 'lucide-react';

interface PriceOverrideManagerProps {
  itemId: string;
  currentPrice: number;
  originalPrice: number;
  canIncrease: boolean;
  canDecrease: boolean;
  onPriceChange: (newPrice: number, reason: string, isIncrease: boolean) => void;
  disabled?: boolean;
}

const PriceOverrideManager = ({
  itemId,
  currentPrice,
  originalPrice,
  canIncrease,
  canDecrease,
  onPriceChange,
  disabled = false
}: PriceOverrideManagerProps) => {
  const [newPrice, setNewPrice] = useState(currentPrice.toString());
  const [reason, setReason] = useState('');
  const [isOpen, setIsOpen] = useState(false);
  const { toast } = useToast();

  const handlePriceSubmit = () => {
    const price = parseFloat(newPrice);
    
    if (isNaN(price) || price <= 0) {
      toast({
        title: "Invalid Price",
        description: "Please enter a valid positive price",
        variant: "destructive"
      });
      return;
    }

    if (!reason.trim()) {
      toast({
        title: "Reason Required",
        description: "Please provide a reason for the price change",
        variant: "destructive"
      });
      return;
    }

    const isIncrease = price > currentPrice;
    const isDecrease = price < currentPrice;

    // Check permissions
    if (isIncrease && !canIncrease) {
      toast({
        title: "Permission Denied",
        description: "You don't have permission to increase prices",
        variant: "destructive"
      });
      return;
    }

    if (isDecrease && !canDecrease) {
      toast({
        title: "Discount Required",
        description: "Price decreases must go through the discount approval process",
        variant: "destructive"
      });
      return;
    }

    if (price === currentPrice) {
      toast({
        title: "No Change",
        description: "The new price is the same as the current price",
        variant: "destructive"
      });
      return;
    }

    onPriceChange(price, reason, isIncrease);
    setReason('');
    setNewPrice(price.toString());
    setIsOpen(false);
    
    toast({
      title: "Price Updated",
      description: `Price ${isIncrease ? 'increased' : 'decreased'} successfully`,
    });
  };

  const priceChange = parseFloat(newPrice) - currentPrice;
  const priceChangePercent = currentPrice > 0 ? (priceChange / currentPrice) * 100 : 0;

  const getPriceChangeIcon = () => {
    if (priceChange > 0) return <TrendingUp className="h-4 w-4 text-green-400" />;
    if (priceChange < 0) return <TrendingDown className="h-4 w-4 text-red-400" />;
    return <DollarSign className="h-4 w-4 text-gray-400" />;
  };

  const getPriceChangeBadge = () => {
    if (Math.abs(priceChange) < 0.01) return null;
    
    const isIncrease = priceChange > 0;
    return (
      <Badge className={`${
        isIncrease ? 'bg-green-600' : 'bg-red-600'
      } text-white text-xs`}>
        {isIncrease ? '+' : ''}{priceChange.toFixed(2)} ({priceChangePercent.toFixed(1)}%)
      </Badge>
    );
  };

  const canMakeChange = () => {
    const price = parseFloat(newPrice);
    if (isNaN(price) || price === currentPrice) return false;
    
    const isIncrease = price > currentPrice;
    const isDecrease = price < currentPrice;
    
    return (isIncrease && canIncrease) || (isDecrease && canDecrease);
  };

  return (
    <Dialog open={isOpen} onOpenChange={setIsOpen}>
      <DialogTrigger asChild>
        <Button
          variant="outline"
          size="sm"
          disabled={disabled || (!canIncrease && !canDecrease)}
          className="border-blue-600 text-blue-400 hover:bg-blue-600 hover:text-white"
        >
          <DollarSign className="h-4 w-4 mr-1" />
          Edit Price
        </Button>
      </DialogTrigger>
      <DialogContent className="bg-gray-900 border-gray-800">
        <DialogHeader>
          <DialogTitle className="text-white">Edit Item Price</DialogTitle>
        </DialogHeader>
        
        <div className="space-y-4">
          {/* Current Price Display */}
          <div className="bg-gray-800 rounded-lg p-3">
            <div className="flex justify-between items-center text-sm">
              <span className="text-gray-400">Current Price:</span>
              <span className="text-white font-medium">${currentPrice.toLocaleString()}</span>
            </div>
            <div className="flex justify-between items-center text-sm mt-1">
              <span className="text-gray-400">Original Price:</span>
              <span className="text-white font-medium">${originalPrice.toLocaleString()}</span>
            </div>
          </div>

          {/* New Price Input */}
          <div>
            <Label htmlFor="new-price" className="text-white">New Price</Label>
            <div className="flex space-x-2 mt-1">
              <span className="text-white self-center">$</span>
              <Input
                id="new-price"
                type="number"
                step="0.01"
                min="0"
                value={newPrice}
                onChange={(e) => setNewPrice(e.target.value)}
                className="bg-gray-800 border-gray-700 text-white"
                placeholder="Enter new price"
              />
            </div>
            
            <div className="flex items-center space-x-2 mt-2">
              {getPriceChangeIcon()}
              {getPriceChangeBadge()}
            </div>
          </div>

          {/* Permission Warnings */}
          {parseFloat(newPrice) < currentPrice && !canDecrease && (
            <div className="bg-red-900/20 border border-red-600/50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <AlertTriangle className="h-4 w-4 text-red-400" />
                <span className="text-red-400 text-sm font-medium">
                  Price decreases require discount approval
                </span>
              </div>
              <p className="text-red-300 text-xs mt-1">
                Use the "Request Discount" feature instead of directly editing the price.
              </p>
            </div>
          )}

          {parseFloat(newPrice) > currentPrice && canIncrease && (
            <div className="bg-green-900/20 border border-green-600/50 rounded-lg p-3">
              <div className="flex items-center space-x-2">
                <CheckCircle className="h-4 w-4 text-green-400" />
                <span className="text-green-400 text-sm font-medium">
                  Price increase allowed
                </span>
              </div>
            </div>
          )}

          {/* Reason Input */}
          <div>
            <Label htmlFor="reason" className="text-white">Reason for Change *</Label>
            <Textarea
              id="reason"
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="Explain why this price change is necessary..."
              className="bg-gray-800 border-gray-700 text-white mt-1"
              required
            />
          </div>

          {/* Permission Summary */}
          <div className="text-xs text-gray-400 space-y-1 bg-gray-800 rounded p-2">
            <p className="font-medium text-gray-300">Your Permissions:</p>
            <p>• {canIncrease ? '✓' : '✗'} Price increases allowed</p>
            <p>• {canDecrease ? '✓' : '✗'} Price decreases allowed</p>
          </div>

          {/* Action Buttons */}
          <div className="flex space-x-2">
            <Button
              onClick={handlePriceSubmit}
              disabled={!canMakeChange() || !reason.trim()}
              className="bg-blue-600 hover:bg-blue-700 text-white"
            >
              Apply Change
            </Button>
            <Button
              onClick={() => setIsOpen(false)}
              variant="outline"
              className="border-gray-600 text-gray-300 hover:bg-gray-800"
            >
              Cancel
            </Button>
          </div>
        </div>
      </DialogContent>
    </Dialog>
  );
};

export default PriceOverrideManager;

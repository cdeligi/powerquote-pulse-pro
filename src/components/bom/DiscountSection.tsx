
import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { Textarea } from '@/components/ui/textarea';
import { Badge } from '@/components/ui/badge';
import { Percent } from 'lucide-react';
import { BOMItem } from '@/types/product';

interface DiscountSectionProps {
  bomItems: BOMItem[];
  onDiscountChange: (discount: number, justification: string) => void;
  canSeePrices: boolean;
  initialDiscount?: number;
  initialJustification?: string;
}

const DiscountSection = ({ 
  bomItems, 
  onDiscountChange, 
  canSeePrices,
  initialDiscount = 0,
  initialJustification = ''
}: DiscountSectionProps) => {
  const [discountPercentage, setDiscountPercentage] = useState<number>(initialDiscount);
  const [justification, setJustification] = useState<string>(initialJustification);

  const calculateSubtotal = () => {
    return bomItems.reduce((total, item) => {
      const price = item.product.price || 0;
      return total + (price * item.quantity);
    }, 0);
  };

  const calculateDiscountAmount = () => {
    const subtotal = calculateSubtotal();
    return (subtotal * discountPercentage) / 100;
  };

  const calculateDiscountedTotal = () => {
    return calculateSubtotal() - calculateDiscountAmount();
  };

  const handleDiscountChange = (newDiscount: number) => {
    setDiscountPercentage(newDiscount);
    onDiscountChange(newDiscount, justification);
  };

  const handleJustificationChange = (newJustification: string) => {
    setJustification(newJustification);
    onDiscountChange(discountPercentage, newJustification);
  };

  if (bomItems.length === 0) return null;

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white flex items-center gap-2">
          <Percent className="h-5 w-5" />
          Discount Configuration
          <Badge variant="outline" className="text-white border-gray-500">
            {bomItems.length} items
          </Badge>
        </CardTitle>
        <CardDescription className="text-gray-400">
          Apply discount percentage and provide justification for special pricing
        </CardDescription>
      </CardHeader>
      <CardContent className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label htmlFor="discount" className="text-white">
              Discount Percentage
            </Label>
            <div className="relative">
              <Input
                id="discount"
                type="number"
                min="0"
                max="100"
                step="0.1"
                value={discountPercentage}
                onChange={(e) => handleDiscountChange(parseFloat(e.target.value) || 0)}
                className="bg-gray-800 border-gray-700 text-white pr-8"
                placeholder="0.0"
              />
              <Percent className="absolute right-2 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            </div>
          </div>

          {canSeePrices && (
            <div className="space-y-2">
              <Label className="text-white">Price Summary</Label>
              <div className="bg-gray-800 p-3 rounded-md space-y-2">
                <div className="flex justify-between text-sm">
                  <span className="text-gray-400">Subtotal:</span>
                  <span className="text-white">${calculateSubtotal().toLocaleString()}</span>
                </div>
                {discountPercentage > 0 && (
                  <div className="flex justify-between text-sm">
                    <span className="text-gray-400">Discount ({discountPercentage}%):</span>
                    <span className="text-red-400">-${calculateDiscountAmount().toLocaleString()}</span>
                  </div>
                )}
                <div className="flex justify-between font-semibold border-t border-gray-700 pt-2">
                  <span className="text-white">Total:</span>
                  <span className="text-green-400">${calculateDiscountedTotal().toLocaleString()}</span>
                </div>
              </div>
            </div>
          )}
        </div>

        {discountPercentage > 0 && (
          <div className="space-y-2">
            <Label htmlFor="justification" className="text-white">
              Discount Justification
              <Badge variant="outline" className="ml-2 text-xs border-red-500 text-red-400">
                Required for discounts
              </Badge>
            </Label>
            <Textarea
              id="justification"
              value={justification}
              onChange={(e) => handleJustificationChange(e.target.value)}
              className="bg-gray-800 border-gray-700 text-white"
              placeholder="Please provide justification for the discount (competitive pricing, volume deal, strategic customer, etc.)"
              rows={3}
              required={discountPercentage > 0}
            />
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default DiscountSection;

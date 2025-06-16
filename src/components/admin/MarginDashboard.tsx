
import { BOMItem } from '@/types/product';
import { User } from '@/types/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { 
  calculateTotalMargin, 
  calculateItemMargin, 
  calculateItemCost, 
  calculateItemRevenue 
} from '@/utils/marginCalculations';
import { DollarSign, TrendingUp, AlertTriangle } from 'lucide-react';

interface MarginDashboardProps {
  bomItems: BOMItem[];
  user: User;
  className?: string;
}

const MarginDashboard = ({ bomItems, user, className }: MarginDashboardProps) => {
  // Only show for admin users
  if (user.role !== 'admin') return null;

  const { totalRevenue, totalCost, marginPercentage, grossProfit } = calculateTotalMargin(bomItems);
  
  const getMarginColor = (margin: number) => {
    if (margin >= 40) return 'text-green-400';
    if (margin >= 25) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMarginBadge = (margin: number) => {
    if (margin >= 40) return { color: 'bg-green-600', text: 'Healthy' };
    if (margin >= 25) return { color: 'bg-yellow-600', text: 'Acceptable' };
    return { color: 'bg-red-600', text: 'Low' };
  };

  return (
    <Card className={`bg-gray-900 border-gray-800 ${className}`}>
      <CardHeader>
        <CardTitle className="text-white flex items-center">
          <TrendingUp className="mr-2 h-5 w-5" />
          Cost & Margin Analysis (Admin Only)
        </CardTitle>
      </CardHeader>
      <CardContent>
        {/* Summary Cards */}
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
          <div className="text-center p-4 bg-gray-800 rounded">
            <p className="text-gray-400 text-sm">Total Revenue</p>
            <p className="text-white text-xl font-bold">${totalRevenue.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-gray-800 rounded">
            <p className="text-gray-400 text-sm">Total Cost</p>
            <p className="text-orange-400 text-xl font-bold">${totalCost.toLocaleString()}</p>
          </div>
          <div className="text-center p-4 bg-gray-800 rounded">
            <p className="text-gray-400 text-sm">Gross Margin</p>
            <div className="flex items-center justify-center space-x-2">
              <p className={`text-xl font-bold ${getMarginColor(marginPercentage)}`}>
                {marginPercentage.toFixed(1)}%
              </p>
              <Badge className={`${getMarginBadge(marginPercentage).color} text-white`}>
                {getMarginBadge(marginPercentage).text}
              </Badge>
            </div>
          </div>
          <div className="text-center p-4 bg-gray-800 rounded">
            <p className="text-gray-400 text-sm">Gross Profit</p>
            <p className="text-green-400 text-xl font-bold">${grossProfit.toLocaleString()}</p>
          </div>
        </div>

        {/* Line Item Breakdown */}
        <div className="space-y-3">
          <h4 className="text-white font-medium">Line Item Margins</h4>
          {bomItems.filter(item => item.enabled).map((item, index) => {
            const itemRevenue = calculateItemRevenue(item);
            const itemCost = calculateItemCost(item);
            const itemMargin = calculateItemMargin(item);
            
            return (
              <div key={index} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                <div className="flex-1">
                  <p className="text-white font-medium">{item.product.name}</p>
                  <p className="text-gray-400 text-sm">Qty: {item.quantity}</p>
                </div>
                <div className="grid grid-cols-4 gap-4 text-right text-sm">
                  <div>
                    <p className="text-gray-400">Revenue</p>
                    <p className="text-white font-medium">${itemRevenue.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Cost</p>
                    <p className="text-orange-400 font-medium">${itemCost.toLocaleString()}</p>
                  </div>
                  <div>
                    <p className="text-gray-400">Margin</p>
                    <p className={`font-medium ${getMarginColor(itemMargin)}`}>
                      {itemMargin.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Profit</p>
                    <p className="text-green-400 font-medium">
                      ${(itemRevenue - itemCost).toLocaleString()}
                    </p>
                  </div>
                </div>
              </div>
            );
          })}
        </div>

        {/* Margin Alerts */}
        {marginPercentage < 25 && (
          <div className="mt-4 p-3 bg-red-900/20 border border-red-600/20 rounded flex items-center space-x-2">
            <AlertTriangle className="h-4 w-4 text-red-400" />
            <p className="text-red-400 text-sm">
              Warning: Overall margin is below 25%. Consider reviewing pricing or costs.
            </p>
          </div>
        )}
      </CardContent>
    </Card>
  );
};

export default MarginDashboard;

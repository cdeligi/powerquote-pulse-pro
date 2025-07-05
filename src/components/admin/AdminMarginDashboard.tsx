
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { User } from '@/types/auth';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { useQuotes } from '@/hooks/useQuotes';
import { useFinanceApproval } from '@/hooks/useFinanceApproval';
import { TrendingUp, DollarSign, AlertTriangle, BarChart3 } from 'lucide-react';

interface AdminMarginDashboardProps {
  user: User;
}

const AdminMarginDashboard = ({ user }: AdminMarginDashboardProps) => {
  const { quotes, loading } = useQuotes();
  const { marginSettings } = useFinanceApproval();

  // Only show for admin and finance users
  if (!['admin', 'finance'].includes(user.role)) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <AlertTriangle className="h-12 w-12 mx-auto text-yellow-500 mb-4" />
            <h3 className="text-lg font-medium text-white mb-2">Access Restricted</h3>
            <p className="text-gray-400">
              Margin dashboard is only available to admin and finance users.
            </p>
          </div>
        </CardContent>
      </Card>
    );
  }

  if (loading) {
    return (
      <Card className="bg-gray-900 border-gray-800">
        <CardContent className="pt-6">
          <div className="text-center py-8">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto mb-4"></div>
            <p className="text-gray-400">Loading margin data...</p>
          </div>
        </CardContent>
      </Card>
    );
  }

  const pendingQuotes = quotes.filter(q => q.status === 'pending_approval');
  const lowMarginQuotes = quotes.filter(q => q.discounted_margin < marginSettings.marginLimit);
  const averageMargin = quotes.length > 0 
    ? quotes.reduce((sum, q) => sum + q.discounted_margin, 0) / quotes.length 
    : 0;
  const totalValue = quotes.reduce((sum, q) => sum + q.discounted_value, 0);

  const getMarginColor = (margin: number) => {
    if (margin >= 40) return 'text-green-400';
    if (margin >= marginSettings.marginLimit) return 'text-yellow-400';
    return 'text-red-400';
  };

  const getMarginBadge = (margin: number) => {
    if (margin >= 40) return { color: 'bg-green-600', text: 'Healthy' };
    if (margin >= marginSettings.marginLimit) return { color: 'bg-yellow-600', text: 'Acceptable' };
    return { color: 'bg-red-600', text: 'Low' };
  };

  return (
    <div className="space-y-6">
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <BarChart3 className="mr-2 h-5 w-5" />
            Margin Analysis Dashboard
          </CardTitle>
        </CardHeader>
        <CardContent>
          {/* Summary Cards */}
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mb-6">
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Total Pipeline Value</p>
              <p className="text-white text-xl font-bold">${totalValue.toLocaleString()}</p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Average Margin</p>
              <div className="flex items-center justify-center space-x-2">
                <p className={`text-xl font-bold ${getMarginColor(averageMargin)}`}>
                  {averageMargin.toFixed(1)}%
                </p>
                <Badge className={`${getMarginBadge(averageMargin).color} text-white`}>
                  {getMarginBadge(averageMargin).text}
                </Badge>
              </div>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Pending Approvals</p>
              <p className="text-orange-400 text-xl font-bold">{pendingQuotes.length}</p>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded">
              <p className="text-gray-400 text-sm">Low Margin Quotes</p>
              <p className="text-red-400 text-xl font-bold">{lowMarginQuotes.length}</p>
            </div>
          </div>

          {/* Margin Threshold Setting */}
          <div className="mb-6 p-4 bg-gray-800 rounded">
            <div className="flex items-center justify-between">
              <div>
                <h4 className="text-white font-medium">Current Margin Threshold</h4>
                <p className="text-gray-400 text-sm">
                  Quotes below this margin require finance approval
                </p>
              </div>
              <div className="text-right">
                <p className="text-2xl font-bold text-blue-400">
                  {marginSettings.marginLimit}%
                </p>
              </div>
            </div>
          </div>

          {/* Quote List */}
          <div className="space-y-3">
            <h4 className="text-white font-medium">Recent Quotes by Margin</h4>
            {quotes.slice(0, 10).map((quote) => (
              <div key={quote.id} className="flex items-center justify-between p-3 bg-gray-800 rounded">
                <div className="flex-1">
                  <p className="text-white font-medium">{quote.customer_name}</p>
                  <p className="text-gray-400 text-sm">
                    {quote.id} • {quote.status}
                  </p>
                </div>
                <div className="grid grid-cols-3 gap-4 text-right text-sm">
                  <div>
                    <p className="text-gray-400">Value</p>
                    <p className="text-white font-medium">
                      ${quote.discounted_value.toLocaleString()}
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Margin</p>
                    <p className={`font-medium ${getMarginColor(quote.discounted_margin)}`}>
                      {quote.discounted_margin.toFixed(1)}%
                    </p>
                  </div>
                  <div>
                    <p className="text-gray-400">Status</p>
                    <Badge 
                      className={
                        quote.status === 'approved' ? 'bg-green-600' :
                        quote.status === 'rejected' ? 'bg-red-600' :
                        'bg-yellow-600'
                      }
                    >
                      {quote.status}
                    </Badge>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Margin Alerts */}
          {lowMarginQuotes.length > 0 && (
            <div className="mt-4 p-3 bg-red-900/20 border border-red-600/20 rounded flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4 text-red-400" />
              <p className="text-red-400 text-sm">
                Warning: {lowMarginQuotes.length} quotes have margins below {marginSettings.marginLimit}% and require finance approval.
              </p>
            </div>
          )}
        </CardContent>
      </Card>
    </div>
  );
};

export default AdminMarginDashboard;


import { useState, useEffect } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { User } from "@/types/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  PieChart,
  Pie,
  Cell,
  Legend
} from "recharts";
import {
  FileText,
  Clock,
  CheckCircle,
  XCircle,
  DollarSign,
  TrendingUp,
  Users,
  Package
} from "lucide-react";

interface DashboardOverviewProps {
  user: User;
}

interface QuoteStats {
  total: number;
  pending: number;
  approved: number;
  rejected: number;
  underReview: number;
  totalValue: number;
  averageValue: number;
}

interface RecentQuote {
  id: string;
  customer_name: string;
  status: string;
  original_quote_value: number;
  created_at: string;
}

const DashboardOverview = ({ user }: DashboardOverviewProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [quoteStats, setQuoteStats] = useState<QuoteStats>({
    total: 0,
    pending: 0,
    approved: 0,
    rejected: 0,
    underReview: 0,
    totalValue: 0,
    averageValue: 0
  });
  const [recentQuotes, setRecentQuotes] = useState<RecentQuote[]>([]);
  const [monthlyData, setMonthlyData] = useState<any[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [user]);

  const loadDashboardData = async () => {
    try {
      setLoading(true);

      // Load quote statistics
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('id, status, original_quote_value, customer_name, created_at')
        .order('created_at', { ascending: false });

      if (quotesError) throw quotesError;

      // Calculate statistics
      const stats = quotes?.reduce((acc, quote) => {
        acc.total += 1;
        acc.totalValue += quote.original_quote_value || 0;
        
        switch (quote.status) {
          case 'pending':
          case 'pending_approval':
            acc.pending += 1;
            break;
          case 'approved':
            acc.approved += 1;
            break;
          case 'rejected':
            acc.rejected += 1;
            break;
          case 'under-review':
            acc.underReview += 1;
            break;
        }
        
        return acc;
      }, {
        total: 0,
        pending: 0,
        approved: 0,
        rejected: 0,
        underReview: 0,
        totalValue: 0,
        averageValue: 0
      }) || quoteStats;

      stats.averageValue = stats.total > 0 ? stats.totalValue / stats.total : 0;
      setQuoteStats(stats);

      // Set recent quotes (last 5)
      setRecentQuotes(quotes?.slice(0, 5) || []);

      // Load monthly analytics data
      const { data: analytics, error: analyticsError } = await supabase
        .from('quote_analytics')
        .select('*')
        .order('month', { ascending: true })
        .limit(12);

      if (analyticsError) {
        console.error('Analytics error:', analyticsError);
        // Don't throw - analytics is optional
      }

      // Process monthly data for charts
      const monthlyChartData = analytics?.map(item => ({
        month: item.month,
        quotes: item.quote_count,
        value: item.total_value,
        cost: item.total_cost
      })) || [];

      setMonthlyData(monthlyChartData);

    } catch (error) {
      console.error('Error loading dashboard data:', error);
      toast({
        title: "Error",
        description: "Failed to load dashboard data",
        variant: "destructive"
      });
    } finally {
      setLoading(false);
    }
  };

  const getStatusColor = (status: string) => {
    switch (status) {
      case 'approved':
        return 'bg-green-600';
      case 'rejected':
        return 'bg-red-600';
      case 'under-review':
        return 'bg-yellow-600';
      default:
        return 'bg-blue-600';
    }
  };

  const getStatusText = (status: string) => {
    switch (status) {
      case 'pending_approval':
        return 'Pending Approval';
      case 'under-review':
        return 'Under Review';
      default:
        return status.charAt(0).toUpperCase() + status.slice(1);
    }
  };

  const pieData = [
    { name: 'Pending', value: quoteStats.pending, color: '#3B82F6' },
    { name: 'Approved', value: quoteStats.approved, color: '#10B981' },
    { name: 'Rejected', value: quoteStats.rejected, color: '#EF4444' },
    { name: 'Under Review', value: quoteStats.underReview, color: '#F59E0B' }
  ];

  if (loading) {
    return (
      <div className="flex items-center justify-center py-12">
        <div className="text-white">Loading dashboard...</div>
      </div>
    );
  }

  return (
    <div className="space-y-8">
      {/* Header */}
      <div>
        <h1 className="text-3xl font-bold text-white mb-2">
          Welcome back, {user.first_name || user.email}
        </h1>
        <p className="text-gray-400">
          Here's an overview of your quoting system performance
        </p>
      </div>

      {/* Stats Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Quotes
            </CardTitle>
            <FileText className="h-4 w-4 text-gray-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">{quoteStats.total}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Quotes Under Analysis
            </CardTitle>
            <Clock className="h-4 w-4 text-yellow-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-yellow-400">{quoteStats.pending + quoteStats.underReview}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Quotes Approved
            </CardTitle>
            <CheckCircle className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-green-400">{quoteStats.approved}</div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Quotes Rejected
            </CardTitle>
            <XCircle className="h-4 w-4 text-red-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-red-400">{quoteStats.rejected}</div>
          </CardContent>
        </Card>
      </div>

      {/* Value Stats */}
      <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Total Quote Value
            </CardTitle>
            <DollarSign className="h-4 w-4 text-green-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${quoteStats.totalValue.toLocaleString()}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
            <CardTitle className="text-sm font-medium text-gray-400">
              Average Quote Value
            </CardTitle>
            <TrendingUp className="h-4 w-4 text-blue-400" />
          </CardHeader>
          <CardContent>
            <div className="text-2xl font-bold text-white">
              ${Math.round(quoteStats.averageValue).toLocaleString()}
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Charts */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        {/* Monthly Quote Trend */}
        {monthlyData.length > 0 && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white">Monthly Quote Trend</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={300}>
                <BarChart data={monthlyData}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                  <XAxis dataKey="month" stroke="#9CA3AF" />
                  <YAxis stroke="#9CA3AF" />
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: '#1F2937', 
                      border: '1px solid #374151',
                      borderRadius: '6px'
                    }}
                  />
                  <Bar dataKey="quotes" fill="#3B82F6" />
                </BarChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        )}

        {/* Quote Status Distribution */}
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Quote Status Distribution</CardTitle>
          </CardHeader>
          <CardContent>
            <ResponsiveContainer width="100%" height={300}>
              <PieChart>
                <Pie
                  data={pieData}
                  cx="50%"
                  cy="50%"
                  labelLine={false}
                  outerRadius={80}
                  fill="#8884d8"
                  dataKey="value"
                >
                  {pieData.map((entry, index) => (
                    <Cell key={`cell-${index}`} fill={entry.color} />
                  ))}
                </Pie>
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#1F2937', 
                    border: '1px solid #374151',
                    borderRadius: '6px'
                  }}
                />
                <Legend />
              </PieChart>
            </ResponsiveContainer>
          </CardContent>
        </Card>
      </div>

      {/* Recent Quotes */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Recent Quotes</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="space-y-4">
            {recentQuotes.length > 0 ? (
              recentQuotes.map((quote) => (
                <div
                  key={quote.id}
                  className="flex items-center justify-between p-4 border border-gray-700 rounded-lg hover:border-gray-600 transition-colors"
                >
                  <div className="flex-1">
                    <div className="flex items-center space-x-3">
                      <div>
                        <p className="text-white font-medium">{quote.customer_name}</p>
                        <p className="text-gray-400 text-sm">Quote ID: {quote.id}</p>
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center space-x-4">
                    <div className="text-right">
                      <p className="text-white font-medium">
                        ${quote.original_quote_value?.toLocaleString() || '0'}
                      </p>
                      <p className="text-gray-400 text-sm">
                        {new Date(quote.created_at).toLocaleDateString()}
                      </p>
                    </div>
                    <Badge className={`${getStatusColor(quote.status)} text-white`}>
                      {getStatusText(quote.status)}
                    </Badge>
                  </div>
                </div>
              ))
            ) : (
              <div className="text-center py-8 text-gray-400">
                No quotes found. Create your first quote to get started.
              </div>
            )}
          </div>
        </CardContent>
      </Card>

      {/* Quick Actions */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <Button 
              className="bg-blue-600 hover:bg-blue-700 text-white h-12"
              onClick={() => window.location.href = '/bom-builder'}
            >
              <Package className="mr-2 h-5 w-5" />
              Create New Quote
            </Button>
            
            {(user.role === 'admin' || user.role === 'finance') && (
              <Button 
                variant="outline" 
                className="border-gray-600 text-gray-300 hover:bg-gray-800 h-12"
                onClick={() => loadDashboardData()}
              >
                <TrendingUp className="mr-2 h-5 w-5" />
                Refresh Analytics
              </Button>
            )}
            
            {user.role === 'admin' && (
              <Button 
                variant="outline" 
                className="border-gray-600 text-gray-300 hover:bg-gray-800 h-12"
              >
                <Users className="mr-2 h-5 w-5" />
                Manage Users
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOverview;

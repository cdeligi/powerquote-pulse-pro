import { useState, useEffect, useMemo } from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { User } from "@/types/auth";
import { supabase } from "@/integrations/supabase/client";
import { useToast } from "@/hooks/use-toast";
import {
  AreaChart,
  Area,
  BarChart,
  Bar,
  LineChart,
  Line,
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
  BarChart3,
  Calendar,
  Filter
} from "lucide-react";
import { format, subDays, subWeeks, subMonths, subYears, startOfDay, endOfDay } from "date-fns";

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

interface ChartData {
  period: string;
  quotes: number;
  value: number;
  cost: number;
  margin: number;
}

type TimePeriod = 'day' | 'week' | 'month' | 'quarter' | 'year';

const EnhancedDashboardOverview = ({ user }: DashboardOverviewProps) => {
  const { toast } = useToast();
  const [loading, setLoading] = useState(true);
  const [timePeriod, setTimePeriod] = useState<TimePeriod>('month');
  const [chartType, setChartType] = useState<'area' | 'bar' | 'line'>('area');
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
  const [chartData, setChartData] = useState<ChartData[]>([]);

  useEffect(() => {
    loadDashboardData();
  }, [user, timePeriod]);

  const getDateRange = () => {
    const end = endOfDay(new Date());
    let start: Date;
    
    switch (timePeriod) {
      case 'day':
        start = startOfDay(subDays(new Date(), 30));
        break;
      case 'week':
        start = startOfDay(subWeeks(new Date(), 12));
        break;
      case 'month':
        start = startOfDay(subMonths(new Date(), 12));
        break;
      case 'quarter':
        start = startOfDay(subMonths(new Date(), 24));
        break;
      case 'year':
        start = startOfDay(subYears(new Date(), 5));
        break;
      default:
        start = startOfDay(subMonths(new Date(), 12));
    }
    
    return { start, end };
  };

  const loadDashboardData = async () => {
    try {
      setLoading(true);
      const { start, end } = getDateRange();

      // Load quote statistics
      const { data: quotes, error: quotesError } = await supabase
        .from('quotes')
        .select('id, status, original_quote_value, customer_name, created_at, total_cost')
        .gte('created_at', start.toISOString())
        .lte('created_at', end.toISOString())
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
      setRecentQuotes(quotes?.slice(0, 5) || []);

      // Process chart data based on time period
      const processedChartData = processChartData(quotes || [], timePeriod);
      setChartData(processedChartData);

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

  const processChartData = (quotes: any[], period: TimePeriod): ChartData[] => {
    const dataMap = new Map<string, ChartData>();
    
    quotes.forEach(quote => {
      let periodKey: string;
      const date = new Date(quote.created_at);
      
      switch (period) {
        case 'day':
          periodKey = format(date, 'MMM dd');
          break;
        case 'week':
          periodKey = `Week ${format(date, 'w, yyyy')}`;
          break;
        case 'month':
          periodKey = format(date, 'MMM yyyy');
          break;
        case 'quarter':
          periodKey = `Q${Math.ceil((date.getMonth() + 1) / 3)} ${date.getFullYear()}`;
          break;
        case 'year':
          periodKey = format(date, 'yyyy');
          break;
        default:
          periodKey = format(date, 'MMM yyyy');
      }

      if (!dataMap.has(periodKey)) {
        dataMap.set(periodKey, {
          period: periodKey,
          quotes: 0,
          value: 0,
          cost: 0,
          margin: 0
        });
      }

      const data = dataMap.get(periodKey)!;
      data.quotes += 1;
      data.value += quote.original_quote_value || 0;
      data.cost += quote.total_cost || 0;
    });

    // Calculate margins
    dataMap.forEach(data => {
      data.margin = data.value > 0 ? ((data.value - data.cost) / data.value) * 100 : 0;
    });

    return Array.from(dataMap.values()).sort((a, b) => a.period.localeCompare(b.period));
  };

  const pieData = [
    { name: 'Pending', value: quoteStats.pending, color: 'hsl(var(--primary))' },
    { name: 'Approved', value: quoteStats.approved, color: 'hsl(var(--success))' },
    { name: 'Rejected', value: quoteStats.rejected, color: 'hsl(var(--error))' },
    { name: 'Under Review', value: quoteStats.underReview, color: 'hsl(var(--warning))' }
  ];

  const renderChart = () => {
    const commonProps = {
      data: chartData,
      margin: { top: 20, right: 30, left: 20, bottom: 5 }
    };

    switch (chartType) {
      case 'area':
        return (
          <AreaChart {...commonProps}>
            <defs>
              <linearGradient id="colorValue" x1="0" y1="0" x2="0" y2="1">
                <stop offset="5%" stopColor="hsl(var(--primary))" stopOpacity={0.8}/>
                <stop offset="95%" stopColor="hsl(var(--primary))" stopOpacity={0.1}/>
              </linearGradient>
            </defs>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
            />
            <Area 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              fillOpacity={1} 
              fill="url(#colorValue)" 
            />
          </AreaChart>
        );
      case 'bar':
        return (
          <BarChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
            />
            <Bar dataKey="value" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} />
          </BarChart>
        );
      case 'line':
        return (
          <LineChart {...commonProps}>
            <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
            <XAxis dataKey="period" stroke="hsl(var(--muted-foreground))" />
            <YAxis stroke="hsl(var(--muted-foreground))" />
            <Tooltip 
              contentStyle={{ 
                backgroundColor: 'hsl(var(--card))', 
                border: '1px solid hsl(var(--border))',
                borderRadius: '8px',
                color: 'hsl(var(--foreground))'
              }}
            />
            <Line 
              type="monotone" 
              dataKey="value" 
              stroke="hsl(var(--primary))" 
              strokeWidth={3}
              dot={{ fill: 'hsl(var(--primary))', strokeWidth: 2, r: 6 }}
            />
          </LineChart>
        );
      default:
        return null;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4 lg:p-8">
        <div className="max-w-7xl mx-auto">
          <div className="flex items-center justify-center py-12">
            <div className="text-center">
              <div className="loading-pulse h-12 w-12 rounded-full mx-auto mb-4"></div>
              <p className="text-muted-foreground">Loading dashboard...</p>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-background to-muted/20 p-4 lg:p-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between gap-4">
          <div>
            <h1 className="text-responsive-3xl font-bold bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
              Welcome back, {user.name || user.email}
            </h1>
            <p className="text-muted-foreground text-responsive-base">
              Here's your quoting system performance overview
            </p>
          </div>
          
          <div className="flex flex-wrap gap-3">
            <Select value={timePeriod} onValueChange={(value: TimePeriod) => setTimePeriod(value)}>
              <SelectTrigger className="w-40 focus-ring">
                <Calendar className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="day">Daily</SelectItem>
                <SelectItem value="week">Weekly</SelectItem>
                <SelectItem value="month">Monthly</SelectItem>
                <SelectItem value="quarter">Quarterly</SelectItem>
                <SelectItem value="year">Yearly</SelectItem>
              </SelectContent>
            </Select>
            
            <Select value={chartType} onValueChange={(value: 'area' | 'bar' | 'line') => setChartType(value)}>
              <SelectTrigger className="w-32 focus-ring">
                <BarChart3 className="w-4 h-4 mr-2" />
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="area">Area</SelectItem>
                <SelectItem value="bar">Bar</SelectItem>
                <SelectItem value="line">Line</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>

        {/* Stats Cards */}
        <div className="grid-responsive-stats">
          <Card className="card-modern interactive-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Quotes
              </CardTitle>
              <FileText className="h-4 w-4 text-muted-foreground" />
            </CardHeader>
            <CardContent>
              <div className="text-responsive-2xl font-bold">{quoteStats.total}</div>
              <p className="text-xs text-muted-foreground">
                Active quotes in system
              </p>
            </CardContent>
          </Card>

          <Card className="card-modern interactive-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Under Analysis
              </CardTitle>
              <Clock className="h-4 w-4 text-warning" />
            </CardHeader>
            <CardContent>
              <div className="text-responsive-2xl font-bold text-warning">
                {quoteStats.pending + quoteStats.underReview}
              </div>
              <p className="text-xs text-muted-foreground">
                Awaiting review
              </p>
            </CardContent>
          </Card>

          <Card className="card-modern interactive-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Approved Quotes
              </CardTitle>
              <CheckCircle className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-responsive-2xl font-bold text-success">{quoteStats.approved}</div>
              <p className="text-xs text-muted-foreground">
                Successfully approved
              </p>
            </CardContent>
          </Card>

          <Card className="card-modern interactive-hover">
            <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
              <CardTitle className="text-sm font-medium text-muted-foreground">
                Total Value
              </CardTitle>
              <DollarSign className="h-4 w-4 text-success" />
            </CardHeader>
            <CardContent>
              <div className="text-responsive-2xl font-bold">
                ${quoteStats.totalValue.toLocaleString()}
              </div>
              <p className="text-xs text-muted-foreground">
                Combined quote value
              </p>
            </CardContent>
          </Card>
        </div>

        {/* Charts */}
        <div className="grid grid-cols-1 xl:grid-cols-3 gap-6">
          {/* Trend Chart */}
          <Card className="card-modern xl:col-span-2">
            <CardHeader>
              <CardTitle className="flex items-center gap-2">
                <TrendingUp className="h-5 w-5" />
                Quote Trend Analysis
              </CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                {renderChart()}
              </ResponsiveContainer>
            </CardContent>
          </Card>

          {/* Status Distribution */}
          <Card className="card-modern">
            <CardHeader>
              <CardTitle>Status Distribution</CardTitle>
            </CardHeader>
            <CardContent>
              <ResponsiveContainer width="100%" height={350}>
                <PieChart>
                  <Pie
                    data={pieData}
                    cx="50%"
                    cy="50%"
                    innerRadius={60}
                    outerRadius={120}
                    paddingAngle={5}
                    dataKey="value"
                  >
                    {pieData.map((entry, index) => (
                      <Cell key={`cell-${index}`} fill={entry.color} />
                    ))}
                  </Pie>
                  <Tooltip 
                    contentStyle={{ 
                      backgroundColor: 'hsl(var(--card))', 
                      border: '1px solid hsl(var(--border))',
                      borderRadius: '8px',
                      color: 'hsl(var(--foreground))'
                    }}
                  />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
            </CardContent>
          </Card>
        </div>

        {/* Recent Quotes */}
        <Card className="card-modern">
          <CardHeader>
            <CardTitle>Recent Quotes</CardTitle>
          </CardHeader>
          <CardContent>
            <div className="space-y-4">
              {recentQuotes.length > 0 ? (
                recentQuotes.map((quote) => (
                  <div
                    key={quote.id}
                    className="flex items-center justify-between p-4 rounded-lg border border-border hover:border-primary/50 transition-colors interactive-hover"
                  >
                    <div className="flex-1">
                      <div className="flex items-center space-x-3">
                        <div>
                          <p className="font-medium">{quote.customer_name}</p>
                          <p className="text-sm text-muted-foreground">Quote ID: {quote.id}</p>
                        </div>
                      </div>
                    </div>
                    <div className="flex items-center space-x-4">
                      <div className="text-right">
                        <p className="font-medium">
                          ${quote.original_quote_value?.toLocaleString() || '0'}
                        </p>
                        <p className="text-sm text-muted-foreground">
                          {new Date(quote.created_at).toLocaleDateString()}
                        </p>
                      </div>
                      <Badge 
                        variant={quote.status === 'approved' ? 'default' : 'secondary'}
                        className="capitalize"
                      >
                        {quote.status.replace('_', ' ')}
                      </Badge>
                    </div>
                  </div>
                ))
              ) : (
                <div className="text-center py-8 text-muted-foreground">
                  No quotes found for the selected period.
                </div>
              )}
            </div>
          </CardContent>
        </Card>
      </div>
    </div>
  );
};

export default EnhancedDashboardOverview;
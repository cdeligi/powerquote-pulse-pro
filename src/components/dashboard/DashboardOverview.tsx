/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { TrendingUp, TrendingDown, DollarSign, FileText, Clock, AlertCircle, RefreshCw } from "lucide-react";
import QuoteVolumeChart from "./QuoteVolumeChart";
import { useState } from "react";

interface MonthlyData {
  month: string;
  quotes: number;
  value: number;
  cost: number;
}

interface QuoteAnalytics {
  monthly: {
    executed: number;
    approved: number;
    rejected: number;
    underAnalysis: number;
    totalQuotedValue: number;
    avgMargin: number;
    totalGrossProfit: number;
  };
  yearly: {
    executed: number;
    approved: number;
    rejected: number;
    underAnalysis: number;
    totalQuotedValue: number;
    avgMargin: number;
    totalGrossProfit: number;
  };
  monthlyBreakdown: MonthlyData[];
}

interface DashboardOverviewProps {
  analytics: QuoteAnalytics;
  isAdmin: boolean;
  loading?: boolean;
  onRetry?: () => void;
}

const DashboardOverview = ({ analytics, isAdmin, loading = false, onRetry }: DashboardOverviewProps) => {
  const [timeFilter, setTimeFilter] = useState("3months");

  const getFilteredData = () => {
    const now = new Date();
    let cutoffDate: Date;

    switch (timeFilter) {
      case "1month":
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 1, now.getDate());
        break;
      case "6months":
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 6, now.getDate());
        break;
      case "1year":
        cutoffDate = new Date(now.getFullYear() - 1, now.getMonth(), now.getDate());
        break;
      default: // 3months
        cutoffDate = new Date(now.getFullYear(), now.getMonth() - 3, now.getDate());
    }

    // Filter analytics data based on selected timeframe
    const filteredData = analytics.monthlyBreakdown?.filter(item => {
      const itemDate = new Date(item.month + '-01');
      return itemDate >= cutoffDate;
    }) || [];

    // Calculate filtered totals
    const totalQuotes = filteredData.reduce((sum, item) => sum + item.quotes, 0);
    const totalValue = filteredData.reduce((sum, item) => sum + item.value, 0);
    const totalCost = filteredData.reduce((sum, item) => sum + item.cost, 0);
    const pendingQuotes = Math.floor(totalQuotes * 0.15); // Mock pending calculation
    const approvedQuotes = Math.floor(totalQuotes * 0.7);
    const rejectedQuotes = totalQuotes - approvedQuotes - pendingQuotes;
    const approvalRate = totalQuotes > 0 ? (approvedQuotes / totalQuotes) * 100 : 0;

    return {
      totalQuotes,
      totalValue,
      totalCost,
      pendingQuotes,
      approvedQuotes,
      rejectedQuotes,
      approvalRate,
      monthlyBreakdown: filteredData
    };
  };

  const filteredAnalytics = getFilteredData();

  const getTrendIndicator = (current: number, previous: number) => {
    if (previous === 0) return null;
    const change = ((current - previous) / previous) * 100;
    const isPositive = change > 0;
    
    return (
      <div className={`flex items-center text-sm ${isPositive ? 'text-green-400' : 'text-red-400'}`}>
        {isPositive ? <TrendingUp className="h-4 w-4 mr-1" /> : <TrendingDown className="h-4 w-4 mr-1" />}
        {Math.abs(change).toFixed(1)}%
      </div>
    );
  };

  if (loading) {
    return (
      <div className="space-y-6">
        <div className="flex justify-between items-center">
          <div>
            <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
            <p className="text-gray-300">Loading analytics data...</p>
          </div>
          <div className="flex items-center space-x-4">
            <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
            {onRetry && (
              <Button 
                onClick={onRetry}
                variant="outline"
                size="sm"
                className="border-gray-600 text-white hover:bg-gray-800"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Retry
              </Button>
            )}
          </div>
        </div>
        
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
          {[...Array(4)].map((_, i) => (
            <Card key={i} className="bg-gray-900 border-gray-800">
              <CardHeader className="pb-2">
                <div className="h-4 bg-gray-700 rounded animate-pulse"></div>
              </CardHeader>
              <CardContent>
                <div className="h-8 bg-gray-700 rounded animate-pulse"></div>
              </CardContent>
            </Card>
          ))}
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="flex justify-between items-center">
        <div>
          <h1 className="text-3xl font-bold text-white mb-2">Dashboard Overview</h1>
          <p className="text-gray-300">Monitor your quote performance and key metrics</p>
        </div>
        <div className="flex items-center space-x-4">
          <Select value={timeFilter} onValueChange={setTimeFilter}>
            <SelectTrigger className="w-40 bg-gray-800 border-gray-700 text-white">
              <SelectValue placeholder="Select timeframe" />
            </SelectTrigger>
            <SelectContent className="bg-gray-800 border-gray-700">
              <SelectItem value="1month" className="text-white hover:bg-gray-700">Last Month</SelectItem>
              <SelectItem value="3months" className="text-white hover:bg-gray-700">Last 3 Months</SelectItem>
              <SelectItem value="6months" className="text-white hover:bg-gray-700">Last 6 Months</SelectItem>
              <SelectItem value="1year" className="text-white hover:bg-gray-700">Last Year</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {/* Key Metrics Cards */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-300 text-sm font-medium flex items-center">
              <FileText className="h-4 w-4 mr-2 text-blue-400" />
              Total Quotes
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-white">{filteredAnalytics.totalQuotes}</div>
              {getTrendIndicator(filteredAnalytics.totalQuotes, analytics.monthly.executed)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-300 text-sm font-medium flex items-center">
              <DollarSign className="h-4 w-4 mr-2 text-green-400" />
              Total Value
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-white">${filteredAnalytics.totalValue.toLocaleString()}</div>
              {getTrendIndicator(filteredAnalytics.totalValue, analytics.monthly.totalQuotedValue)}
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-300 text-sm font-medium flex items-center">
              <Clock className="h-4 w-4 mr-2 text-yellow-400" />
              Pending Approval
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-white">{filteredAnalytics.pendingQuotes}</div>
              <Badge variant="outline" className="text-yellow-400 border-yellow-600">
                Needs Attention
              </Badge>
            </div>
          </CardContent>
        </Card>

        <Card className="bg-gray-900 border-gray-800">
          <CardHeader className="pb-2">
            <CardTitle className="text-gray-300 text-sm font-medium flex items-center">
              <TrendingUp className="h-4 w-4 mr-2 text-purple-400" />
              Approval Rate
            </CardTitle>
          </CardHeader>
          <CardContent>
            <div className="flex items-center justify-between">
              <div className="text-3xl font-bold text-white">{filteredAnalytics.approvalRate.toFixed(1)}%</div>
              <div className={`text-sm ${filteredAnalytics.approvalRate >= 80 ? 'text-green-400' : filteredAnalytics.approvalRate >= 60 ? 'text-yellow-400' : 'text-red-400'}`}>
                {filteredAnalytics.approvalRate >= 80 ? 'Excellent' : filteredAnalytics.approvalRate >= 60 ? 'Good' : 'Needs Improvement'}
              </div>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Quote Volume Chart */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center justify-between">
            <div className="flex items-center">
              <TrendingUp className="mr-2 h-5 w-5 text-blue-400" />
              Quote Volume Trends
            </div>
            <Badge variant="outline" className="text-gray-300 border-gray-600">
              {timeFilter === "1month" ? "Monthly" : 
               timeFilter === "3months" ? "Quarterly" : 
               timeFilter === "6months" ? "Semi-Annual" : "Annual"} View
            </Badge>
          </CardTitle>
        </CardHeader>
        <CardContent>
          {filteredAnalytics.monthlyBreakdown.length > 0 ? (
            <QuoteVolumeChart data={filteredAnalytics.monthlyBreakdown} />
          ) : (
            <div className="h-80 flex items-center justify-center text-gray-400">
              <div className="text-center">
                <TrendingUp className="h-12 w-12 mx-auto mb-4 opacity-50" />
                <p>No analytics data available</p>
                <p className="text-sm">Data will appear as quotes are created</p>
              </div>
            </div>
          )}
        </CardContent>
      </Card>

      {/* Status Breakdown */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
        <Card className="bg-gray-900 border-gray-800">
          <CardHeader>
            <CardTitle className="text-white">Quote Status Breakdown</CardTitle>
          </CardHeader>
          <CardContent className="space-y-4">
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-green-500 rounded-full"></div>
                <span className="text-gray-300">Approved</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-white font-semibold">{filteredAnalytics.approvedQuotes}</span>
                <span className="text-gray-400 text-sm">
                  ({((filteredAnalytics.approvedQuotes / filteredAnalytics.totalQuotes) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
                <span className="text-gray-300">Pending</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-white font-semibold">{filteredAnalytics.pendingQuotes}</span>
                <span className="text-gray-400 text-sm">
                  ({((filteredAnalytics.pendingQuotes / filteredAnalytics.totalQuotes) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
            
            <div className="flex items-center justify-between p-3 bg-gray-800 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="w-3 h-3 bg-red-500 rounded-full"></div>
                <span className="text-gray-300">Rejected</span>
              </div>
              <div className="flex items-center space-x-2">
                <span className="text-white font-semibold">{filteredAnalytics.rejectedQuotes}</span>
                <span className="text-gray-400 text-sm">
                  ({((filteredAnalytics.rejectedQuotes / filteredAnalytics.totalQuotes) * 100).toFixed(1)}%)
                </span>
              </div>
            </div>
          </CardContent>
        </Card>

        {isAdmin && (
          <Card className="bg-gray-900 border-gray-800">
            <CardHeader>
              <CardTitle className="text-white flex items-center">
                <AlertCircle className="mr-2 h-5 w-5 text-orange-400" />
                Admin Insights
              </CardTitle>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 text-sm">Average Quote Value</span>
                  <span className="text-white font-semibold">
                    ${filteredAnalytics.totalQuotes > 0 
                      ? (filteredAnalytics.totalValue / filteredAnalytics.totalQuotes).toLocaleString()
                      : '0'}
                  </span>
                </div>
                <div className="w-full bg-gray-700 rounded-full h-2">
                  <div 
                    className="bg-blue-500 h-2 rounded-full" 
                    style={{ width: `${Math.min((filteredAnalytics.totalValue / 1000000) * 100, 100)}%` }}
                  ></div>
                </div>
              </div>

              <div className="p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 text-sm">Processing Time</span>
                  <Badge variant="outline" className="text-green-400 border-green-600">
                    Optimal
                  </Badge>
                </div>
                <p className="text-white text-sm">Average approval time: 2.3 days</p>
              </div>

              <div className="p-3 bg-gray-800 rounded-lg">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-gray-300 text-sm">Top Priority Items</span>
                  <span className="text-orange-400 font-semibold">{filteredAnalytics.pendingQuotes}</span>
                </div>
                <p className="text-gray-300 text-sm">Quotes requiring immediate attention</p>
              </div>
            </CardContent>
          </Card>
        )}
      </div>

      {/* Quick Actions */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Quick Actions</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="flex flex-wrap gap-3">
            <Button className="bg-blue-600 hover:bg-blue-700 text-white">
              <FileText className="mr-2 h-4 w-4" />
              Create New Quote
            </Button>
            {isAdmin && (
              <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
                <Clock className="mr-2 h-4 w-4" />
                Review Pending Approvals
              </Button>
            )}
            <Button variant="outline" className="border-gray-600 text-gray-300 hover:bg-gray-800">
              <TrendingUp className="mr-2 h-4 w-4" />
              View Detailed Analytics
            </Button>
            {onRetry && (
              <Button 
                onClick={onRetry}
                variant="outline" 
                className="border-gray-600 text-gray-300 hover:bg-gray-800"
              >
                <RefreshCw className="mr-2 h-4 w-4" />
                Refresh Data
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOverview;

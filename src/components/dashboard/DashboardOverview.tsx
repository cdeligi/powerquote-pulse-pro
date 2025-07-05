
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrendingUp, TrendingDown, BarChart3, DollarSign, FileText, CheckCircle, XCircle, Clock } from "lucide-react";
import { QuoteAnalytics, formatCurrency } from "@/utils/quoteAnalytics";
import QuoteVolumeChart from "./QuoteVolumeChart";

interface DashboardOverviewProps {
  analytics: QuoteAnalytics;
  isAdmin?: boolean;
}

const DashboardOverview = ({ analytics, isAdmin = false }: DashboardOverviewProps) => {
  const { monthly, yearly } = analytics;

  const StatCard = ({ 
    title, 
    monthlyValue, 
    yearlyValue, 
    icon: Icon, 
    color,
    isCurrency = false 
  }: {
    title: string;
    monthlyValue: number;
    yearlyValue: number;
    icon: any;
    color: string;
    isCurrency?: boolean;
  }) => (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium text-gray-300">{title}</CardTitle>
        <Icon className={`h-4 w-4 ${color}`} />
      </CardHeader>
      <CardContent>
        <div className="space-y-2">
          <div>
            <div className="text-lg font-bold text-white">
              {isCurrency ? formatCurrency(monthlyValue) : monthlyValue.toLocaleString()}
            </div>
            <p className="text-xs text-gray-400">This Month</p>
          </div>
          <div className="pt-1 border-t border-gray-700">
            <div className="text-sm font-medium text-gray-200">
              {isCurrency ? formatCurrency(yearlyValue) : yearlyValue.toLocaleString()}
            </div>
            <p className="text-xs text-gray-500">This Year</p>
          </div>
        </div>
      </CardContent>
    </Card>
  );

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-white mb-2">
          {isAdmin ? 'Platform Analytics' : 'Your Quote Analytics'}
        </h2>
        <p className="text-gray-300">
          Performance metrics for quote processing and quoted values
        </p>
      </div>

      {/* Main Stats Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
        <StatCard
          title="Executed Quotes"
          monthlyValue={monthly.executed}
          yearlyValue={yearly.executed}
          icon={CheckCircle}
          color="text-green-500"
        />
        
        <StatCard
          title="Approved Quotes"
          monthlyValue={monthly.approved}
          yearlyValue={yearly.approved}
          icon={FileText}
          color="text-blue-500"
        />
        
        <StatCard
          title="Under Analysis"
          monthlyValue={monthly.underAnalysis}
          yearlyValue={yearly.underAnalysis}
          icon={Clock}
          color="text-yellow-500"
        />
        
        <StatCard
          title="Rejected Quotes"
          monthlyValue={monthly.rejected}
          yearlyValue={yearly.rejected}
          icon={XCircle}
          color="text-red-500"
        />
      </div>

      {/* Quote Volume Trend Chart */}
      <QuoteVolumeChart />

      {/* Quoted Value */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white flex items-center">
            <DollarSign className="mr-2 h-5 w-5 text-green-500" />
            Total Quoted Value
          </CardTitle>
          <CardDescription className="text-gray-300">
            Cumulative value of all quotes processed
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
            <div className="text-center p-4 bg-gray-800 rounded-lg">
              <div className="text-3xl font-bold text-white mb-2">
                {formatCurrency(monthly.totalQuotedValue)}
              </div>
              <p className="text-gray-300">This Month</p>
              <Badge variant="outline" className="mt-2 border-green-600 text-green-400">
                <TrendingUp className="mr-1 h-3 w-3" />
                Monthly
              </Badge>
            </div>
            <div className="text-center p-4 bg-gray-800 rounded-lg">
              <div className="text-3xl font-bold text-white mb-2">
                {formatCurrency(yearly.totalQuotedValue)}
              </div>
              <p className="text-gray-300">This Year</p>
              <Badge variant="outline" className="mt-2 border-blue-600 text-blue-400">
                <BarChart3 className="mr-1 h-3 w-3" />
                Yearly
              </Badge>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Performance Summary */}
      <Card className="bg-gray-900 border-gray-800">
        <CardHeader>
          <CardTitle className="text-white">Performance Summary</CardTitle>
          <CardDescription className="text-gray-300">
            Key performance indicators for quote processing
          </CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <div className="text-center p-3 bg-gray-800 rounded">
              <div className="text-xl font-bold text-green-400">
                {yearly.executed > 0 ? ((yearly.executed / (yearly.executed + yearly.approved + yearly.rejected + yearly.underAnalysis)) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-gray-300 text-sm">Execution Rate</p>
            </div>
            <div className="text-center p-3 bg-gray-800 rounded">
              <div className="text-xl font-bold text-blue-400">
                {yearly.approved > 0 ? ((yearly.approved / (yearly.approved + yearly.rejected)) * 100).toFixed(1) : 0}%
              </div>
              <p className="text-gray-300 text-sm">Approval Rate</p>
            </div>
            <div className="text-center p-3 bg-gray-800 rounded">
              <div className="text-xl font-bold text-yellow-400">
                {yearly.totalQuotedValue > 0 ? formatCurrency(yearly.totalQuotedValue / (yearly.executed + yearly.approved + yearly.rejected + yearly.underAnalysis || 1)) : '$0'}
              </div>
              <p className="text-gray-300 text-sm">Avg Quote Value</p>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
};

export default DashboardOverview;

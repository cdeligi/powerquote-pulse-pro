
/**
 * © 2025 Qualitrol Corp. All rights reserved.
 * Confidential and proprietary. Unauthorized copying or distribution is prohibited.
 */

import { useEffect, useState } from "react";
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
} from "@/components/ui/chart";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { supabase } from "@/integrations/supabase/client";
import { Calendar, Filter } from "lucide-react";
import * as Recharts from "recharts";

interface AnalyticsRow {
  month: string;
  status: string;
  quote_count: number;
}

interface ChartData {
  month: string;
  approved: number;
  rejected: number;
  underReview: number;
}

const QuoteVolumeChart = () => {
  const [data, setData] = useState<ChartData[]>([]);
  const [loading, setLoading] = useState(true);
  const [timeRange, setTimeRange] = useState("12"); // months

  useEffect(() => {
    fetchData();
  }, [timeRange]);

  const fetchData = async () => {
    try {
      // First update analytics
      await supabase.rpc('update_quote_analytics');
      
      const { data: rows, error } = await supabase
        .from("quote_analytics")
        .select("month, status, quote_count")
        .in("status", ["approved", "rejected", "under-review"])
        .order("month", { ascending: true });

      if (error) {
        console.error("Error fetching quote analytics", error);
        setLoading(false);
        return;
      }

      const grouped: Record<string, ChartData> = {};
      (rows as AnalyticsRow[]).forEach((row) => {
        const key = row.month;
        if (!grouped[key]) {
          grouped[key] = { month: key, approved: 0, rejected: 0, underReview: 0 };
        }
        if (row.status === "approved") grouped[key].approved = row.quote_count;
        else if (row.status === "rejected") grouped[key].rejected = row.quote_count;
        else if (row.status === "under-review") grouped[key].underReview = row.quote_count;
      });

      const sorted = Object.values(grouped)
        .sort((a, b) => new Date(a.month).getTime() - new Date(b.month).getTime())
        .slice(-parseInt(timeRange));
        
      setData(sorted);
    } catch (err) {
      console.error("Failed to load analytics", err);
    } finally {
      setLoading(false);
    }
  };

  const monthFormatter = (value: string) => {
    const date = new Date(value);
    return `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <div className="flex items-center justify-between">
          <div>
            <CardTitle className="text-white flex items-center">
              <Calendar className="mr-2 h-5 w-5" />
              Quote Volume Trends
            </CardTitle>
            <CardDescription className="text-gray-400">
              Monthly count of quotes by status with custom filters
            </CardDescription>
          </div>
          <div className="flex items-center space-x-2">
            <Filter className="h-4 w-4 text-gray-400" />
            <Select value={timeRange} onValueChange={setTimeRange}>
              <SelectTrigger className="w-32 bg-gray-800 border-gray-700 text-white">
                <SelectValue />
              </SelectTrigger>
              <SelectContent className="bg-gray-800 border-gray-700">
                <SelectItem value="3" className="text-white">3 Months</SelectItem>
                <SelectItem value="6" className="text-white">6 Months</SelectItem>
                <SelectItem value="12" className="text-white">12 Months</SelectItem>
                <SelectItem value="24" className="text-white">24 Months</SelectItem>
              </SelectContent>
            </Select>
            <Button 
              size="sm" 
              variant="outline" 
              onClick={fetchData}
              className="border-gray-600 text-white hover:bg-gray-800"
            >
              Refresh
            </Button>
          </div>
        </div>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-gray-300 py-8">Loading chart data...</div>
        ) : (
          <ChartContainer
            config={{
              approved: { label: "Approved", color: "#10b981" },
              rejected: { label: "Rejected", color: "#ef4444" },
              underReview: { label: "Under Review", color: "#facc15" },
            }}
          >
            <Recharts.LineChart data={data} height={300}>
              <Recharts.CartesianGrid strokeDasharray="3 3" stroke="#374151" />
              <Recharts.XAxis 
                dataKey="month" 
                tickFormatter={monthFormatter}
                stroke="#9CA3AF"
                fontSize={12}
              />
              <Recharts.YAxis 
                allowDecimals={false} 
                stroke="#9CA3AF"
                fontSize={12}
              />
              <Recharts.Line
                type="monotone"
                dataKey="approved"
                stroke="var(--color-approved)"
                strokeWidth={2}
                dot={{ fill: "var(--color-approved)", r: 4 }}
              />
              <Recharts.Line
                type="monotone"
                dataKey="rejected"
                stroke="var(--color-rejected)"
                strokeWidth={2}
                dot={{ fill: "var(--color-rejected)", r: 4 }}
              />
              <Recharts.Line
                type="monotone"
                dataKey="underReview"
                stroke="var(--color-underReview)"
                strokeWidth={2}
                dot={{ fill: "var(--color-underReview)", r: 4 }}
              />
              <ChartTooltip 
                content={<ChartTooltipContent 
                  labelFormatter={monthFormatter}
                  className="bg-gray-800 border-gray-700 text-white"
                />} 
              />
              <ChartLegend 
                verticalAlign="bottom" 
                content={<ChartLegendContent className="text-gray-300" />} 
              />
            </Recharts.LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default QuoteVolumeChart;

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
import { supabase } from "@/integrations/supabase/client";
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

  useEffect(() => {
    const fetchData = async () => {
      try {
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

        const sorted = Object.values(grouped).sort(
          (a, b) => new Date(a.month).getTime() - new Date(b.month).getTime()
        );
        setData(sorted);
      } catch (err) {
        console.error("Failed to load analytics", err);
      } finally {
        setLoading(false);
      }
    };

    fetchData();
  }, []);

  const monthFormatter = (value: string) => {
    const date = new Date(value);
    return `${date.toLocaleString("default", { month: "short" })} ${date.getFullYear()}`;
  };

  return (
    <Card className="bg-gray-900 border-gray-800">
      <CardHeader>
        <CardTitle className="text-white">Quote Volume Trends</CardTitle>
        <CardDescription className="text-gray-400">
          Monthly count of quotes by status
        </CardDescription>
      </CardHeader>
      <CardContent>
        {loading ? (
          <div className="text-center text-gray-400">Loading chart...</div>
        ) : (
          <ChartContainer
            config={{
              approved: { label: "Approved", color: "#10b981" },
              rejected: { label: "Rejected", color: "#ef4444" },
              underReview: { label: "Under Review", color: "#facc15" },
            }}
          >
            <Recharts.LineChart data={data}>
              <Recharts.CartesianGrid strokeDasharray="3 3" />
              <Recharts.XAxis dataKey="month" tickFormatter={monthFormatter} />
              <Recharts.YAxis allowDecimals={false} />
              <Recharts.Line
                type="monotone"
                dataKey="approved"
                stroke="var(--color-approved)"
              />
              <Recharts.Line
                type="monotone"
                dataKey="rejected"
                stroke="var(--color-rejected)"
              />
              <Recharts.Line
                type="monotone"
                dataKey="underReview"
                stroke="var(--color-underReview)"
              />
              <ChartTooltip content={<ChartTooltipContent />} />
              <ChartLegend verticalAlign="bottom" content={<ChartLegendContent />} />
            </Recharts.LineChart>
          </ChartContainer>
        )}
      </CardContent>
    </Card>
  );
};

export default QuoteVolumeChart;

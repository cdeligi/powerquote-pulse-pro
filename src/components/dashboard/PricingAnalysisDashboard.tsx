import { useState, useMemo, useCallback } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  ScatterChart,
  Scatter,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ReferenceLine,
  ResponsiveContainer,
  Cell,
} from "recharts";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert, AlertDescription } from "@/components/ui/alert";
import {
  TrendingDown,
  TrendingUp,
  Minus,
  BarChart3,
  AlertCircle,
  Search,
  RefreshCw,
} from "lucide-react";
import {
  fyRangeIso,
  fyMonthRangeIso,
  getCurrentFiscalYear,
  getAvailableFiscalYearsFromQuotes,
  fetchPricingAnalysisRows,
  fetchActiveProductsForHierarchy,
  fetchProductsByIds,
  fetchQuoteDatesForFY,
  buildProductIndex,
  resolveProductIdsForFilter,
  optionsForLevel,
  normalizeSelection,
  transformToDataPoints,
  calculatePricingKPIs,
  prepareScatterData,
  filterByMonthRange,
  PricingDataPoint,
  LevelSelection,
} from "@/utils/pricingAnalysis";

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
const MAX_POINTS = 5000;

export default function PricingAnalysisDashboard() {
  // State
  const [fiscalYear, setFiscalYear] = useState(getCurrentFiscalYear());
  const [startMonth, setStartMonth] = useState(0);
  const [endMonth, setEndMonth] = useState(11);
  const [levelSelection, setLevelSelection] = useState<LevelSelection>({
    level1Id: null,
    level2Id: null,
    level3Id: null,
    level4Id: null,
  });
  const [searchTerm, setSearchTerm] = useState("");
  const [viewMode, setViewMode] = useState<"percent" | "dollar">("percent");

  // Fetch available fiscal years
  const { data: availableFYs = [getCurrentFiscalYear()] } = useQuery({
    queryKey: ["pricing-analysis-fys"],
    queryFn: async () => {
      const dates = await fetchQuoteDatesForFY();
      return getAvailableFiscalYearsFromQuotes(dates);
    },
    staleTime: 5 * 60 * 1000,
  });

  // Fetch product hierarchy for filters
  const { data: productIndex, isLoading: productsLoading } = useQuery({
    queryKey: ["pricing-analysis-products"],
    queryFn: async () => {
      const products = await fetchActiveProductsForHierarchy();
      return buildProductIndex(products);
    },
    staleTime: 10 * 60 * 1000,
  });

  // Compute product filter IDs
  const productIds = useMemo(() => {
    if (!productIndex) return undefined;
    return resolveProductIdsForFilter(productIndex, levelSelection);
  }, [productIndex, levelSelection]);

  // Fetch pricing data
  const {
    data: pricingResult,
    isLoading: dataLoading,
    error: dataError,
    refetch,
  } = useQuery({
    queryKey: ["pricing-analysis-data", fiscalYear, startMonth, endMonth, productIds, searchTerm],
    queryFn: async () => {
      const { startIso, endIso } = fyMonthRangeIso(fiscalYear, startMonth, endMonth);
      
      const rows = await fetchPricingAnalysisRows({
        startIso,
        endIso,
        productIds,
        search: searchTerm || undefined,
        limit: MAX_POINTS,
      });

      // Fetch product details for the rows
      const uniqueProductIds = [...new Set(rows.map((r) => r.product_id))];
      const products = await fetchProductsByIds(uniqueProductIds);
      const productMap = new Map(products.map((p) => [p.id, p]));

      const { dataPoints, missingListPriceCount } = transformToDataPoints(rows, productMap);
      const filteredDataPoints = filterByMonthRange(dataPoints, startMonth, endMonth);
      const kpis = calculatePricingKPIs(filteredDataPoints, missingListPriceCount);

      return {
        dataPoints: filteredDataPoints,
        kpis,
        totalFetched: rows.length,
        isCapped: rows.length >= MAX_POINTS,
      };
    },
    staleTime: 2 * 60 * 1000,
    enabled: true,
  });

  // Prepare scatter data
  const scatterData = useMemo(() => {
    if (!pricingResult?.dataPoints) return [];
    return prepareScatterData(pricingResult.dataPoints, viewMode);
  }, [pricingResult?.dataPoints, viewMode]);

  // Level dropdown options
  const level1Options = useMemo(
    () => (productIndex ? optionsForLevel(productIndex, 1, null) : []),
    [productIndex]
  );
  const level2Options = useMemo(
    () =>
      productIndex && levelSelection.level1Id
        ? optionsForLevel(productIndex, 2, levelSelection.level1Id)
        : [],
    [productIndex, levelSelection.level1Id]
  );
  const level3Options = useMemo(
    () =>
      productIndex && levelSelection.level2Id
        ? optionsForLevel(productIndex, 3, levelSelection.level2Id)
        : [],
    [productIndex, levelSelection.level2Id]
  );
  const level4Options = useMemo(
    () =>
      productIndex && levelSelection.level3Id
        ? optionsForLevel(productIndex, 4, levelSelection.level3Id)
        : [],
    [productIndex, levelSelection.level3Id]
  );

  // Handle level selection changes
  const handleLevelChange = useCallback(
    (level: keyof LevelSelection, value: string | null) => {
      const newSelection = { ...levelSelection, [level]: value };
      setLevelSelection(normalizeSelection(newSelection));
    },
    [levelSelection]
  );

  // Custom tooltip
  const CustomTooltip = ({ active, payload }: any) => {
    if (!active || !payload?.length) return null;
    const data = payload[0].payload as { dataPoint: PricingDataPoint };
    const dp = data.dataPoint;

    return (
      <div className="bg-card border border-border rounded-lg shadow-lg p-3 max-w-xs">
        <div className="font-semibold text-foreground mb-2 truncate">
          {dp.displayName}
        </div>
        {dp.partNumber && (
          <div className="text-xs text-muted-foreground mb-1">
            Part: {dp.partNumber}
          </div>
        )}
        <div className="grid grid-cols-2 gap-x-3 gap-y-1 text-sm">
          <span className="text-muted-foreground">Quote ID:</span>
          <span className="text-foreground truncate">{dp.quoteId}</span>
          
          <span className="text-muted-foreground">Customer:</span>
          <span className="text-foreground truncate">{dp.customerName}</span>
          
          <span className="text-muted-foreground">Date:</span>
          <span className="text-foreground">
            {dp.eventDate.toLocaleDateString()}
          </span>
          
          <span className="text-muted-foreground">List Price:</span>
          <span className="text-foreground">
            {dp.currency} {dp.listPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          
          <span className="text-muted-foreground">Approved Price:</span>
          <span className="text-foreground">
            {dp.currency} {dp.approvedPrice.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          
          <span className="text-muted-foreground">Delta %:</span>
          <span className={dp.deltaPercent < 0 ? "text-red-500" : dp.deltaPercent > 0 ? "text-green-500" : "text-foreground"}>
            {dp.deltaPercent > 0 ? "+" : ""}{dp.deltaPercent.toFixed(2)}%
          </span>
          
          <span className="text-muted-foreground">Delta $:</span>
          <span className={dp.deltaDollar < 0 ? "text-red-500" : dp.deltaDollar > 0 ? "text-green-500" : "text-foreground"}>
            {dp.deltaDollar > 0 ? "+" : ""}{dp.currency} {dp.deltaDollar.toLocaleString(undefined, { minimumFractionDigits: 2 })}
          </span>
          
          <span className="text-muted-foreground">Quantity:</span>
          <span className="text-foreground">{dp.quantity}</span>
        </div>
      </div>
    );
  };

  // Point color based on delta
  const getPointColor = (delta: number) => {
    if (delta < -0.5) return "hsl(var(--destructive))";
    if (delta > 0.5) return "hsl(142, 71%, 45%)"; // green
    return "hsl(var(--muted-foreground))"; // at list
  };

  const isLoading = productsLoading || dataLoading;
  const kpis = pricingResult?.kpis;

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-foreground">Pricing Analysis</h1>
          <p className="text-muted-foreground">
            Analyze quoted/approved item prices vs list price over time
          </p>
        </div>
        <Button
          variant="outline"
          size="sm"
          onClick={() => refetch()}
          disabled={isLoading}
        >
          <RefreshCw className={`h-4 w-4 mr-2 ${isLoading ? "animate-spin" : ""}`} />
          Refresh
        </Button>
      </div>

      {/* Filters */}
      <Card>
        <CardHeader className="pb-3">
          <CardTitle className="text-base">Filters</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 xl:grid-cols-6 gap-4">
            {/* Fiscal Year */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Fiscal Year</Label>
              <Select
                value={fiscalYear.toString()}
                onValueChange={(v) => setFiscalYear(parseInt(v, 10))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {availableFYs.map((fy) => (
                    <SelectItem key={fy} value={fy.toString()}>
                      FY{fy}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Start Month */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Start Month</Label>
              <Select
                value={startMonth.toString()}
                onValueChange={(v) => setStartMonth(parseInt(v, 10))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, i) => (
                    <SelectItem key={i} value={i.toString()}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* End Month */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">End Month</Label>
              <Select
                value={endMonth.toString()}
                onValueChange={(v) => setEndMonth(parseInt(v, 10))}
              >
                <SelectTrigger>
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  {MONTH_NAMES.map((m, i) => (
                    <SelectItem key={i} value={i.toString()} disabled={i < startMonth}>
                      {m}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Level 1 */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Level 1</Label>
              <Select
                value={levelSelection.level1Id || "_all"}
                onValueChange={(v) => handleLevelChange("level1Id", v === "_all" ? null : v)}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All Products</SelectItem>
                  {level1Options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Level 2 */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Level 2</Label>
              <Select
                value={levelSelection.level2Id || "_all"}
                onValueChange={(v) => handleLevelChange("level2Id", v === "_all" ? null : v)}
                disabled={!levelSelection.level1Id || level2Options.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All</SelectItem>
                  {level2Options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Level 3 */}
            <div className="space-y-1.5">
              <Label className="text-xs text-muted-foreground">Level 3</Label>
              <Select
                value={levelSelection.level3Id || "_all"}
                onValueChange={(v) => handleLevelChange("level3Id", v === "_all" ? null : v)}
                disabled={!levelSelection.level2Id || level3Options.length === 0}
              >
                <SelectTrigger>
                  <SelectValue placeholder="All" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="_all">All</SelectItem>
                  {level3Options.map((opt) => (
                    <SelectItem key={opt.value} value={opt.value}>
                      {opt.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>

            {/* Level 4 */}
            {level4Options.length > 0 && (
              <div className="space-y-1.5">
                <Label className="text-xs text-muted-foreground">Level 4</Label>
                <Select
                  value={levelSelection.level4Id || "_all"}
                  onValueChange={(v) => handleLevelChange("level4Id", v === "_all" ? null : v)}
                  disabled={!levelSelection.level3Id}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="All" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="_all">All</SelectItem>
                    {level4Options.map((opt) => (
                      <SelectItem key={opt.value} value={opt.value}>
                        {opt.label}
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            )}

            {/* Search */}
            <div className="space-y-1.5 lg:col-span-2">
              <Label className="text-xs text-muted-foreground">Search Product/Part</Label>
              <div className="relative">
                <Search className="absolute left-2.5 top-2.5 h-4 w-4 text-muted-foreground" />
                <Input
                  placeholder="Search by name or part number..."
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  className="pl-8"
                />
              </div>
            </div>
          </div>
        </CardContent>
      </Card>

      {/* Error state */}
      {dataError && (
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertDescription>
            Failed to load pricing data. Please try again.
          </AlertDescription>
        </Alert>
      )}

      {/* KPI Cards */}
      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-7 gap-4">
        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground mb-1">Avg Delta %</div>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className={`text-xl font-bold ${(kpis?.avgDeltaPercent ?? 0) < 0 ? "text-red-500" : (kpis?.avgDeltaPercent ?? 0) > 0 ? "text-green-500" : "text-foreground"}`}>
                {(kpis?.avgDeltaPercent ?? 0) > 0 ? "+" : ""}{kpis?.avgDeltaPercent?.toFixed(2) ?? "0"}%
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground mb-1">Median Delta %</div>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className={`text-xl font-bold ${(kpis?.medianDeltaPercent ?? 0) < 0 ? "text-red-500" : (kpis?.medianDeltaPercent ?? 0) > 0 ? "text-green-500" : "text-foreground"}`}>
                {(kpis?.medianDeltaPercent ?? 0) > 0 ? "+" : ""}{kpis?.medianDeltaPercent?.toFixed(2) ?? "0"}%
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <TrendingDown className="h-3 w-3 text-red-500" />
              Below List
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-xl font-bold text-red-500">
                {kpis?.percentBelowList?.toFixed(1) ?? "0"}%
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <Minus className="h-3 w-3" />
              At List (±0.5%)
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-xl font-bold text-foreground">
                {kpis?.percentAtList?.toFixed(1) ?? "0"}%
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <TrendingUp className="h-3 w-3 text-green-500" />
              Above List
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-xl font-bold text-green-500">
                {kpis?.percentAboveList?.toFixed(1) ?? "0"}%
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="text-xs text-muted-foreground mb-1"># Data Points</div>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-xl font-bold text-foreground">
                {kpis?.dataPointCount?.toLocaleString() ?? "0"}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardContent className="pt-4 pb-3">
            <div className="flex items-center gap-1 text-xs text-muted-foreground mb-1">
              <AlertCircle className="h-3 w-3 text-yellow-500" />
              Missing List Price
            </div>
            {isLoading ? (
              <Skeleton className="h-7 w-16" />
            ) : (
              <div className="text-xl font-bold text-yellow-500">
                {kpis?.missingListPriceCount?.toLocaleString() ?? "0"}
              </div>
            )}
          </CardContent>
        </Card>
      </div>

      {/* Chart Area */}
      <Card>
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-2">
              <BarChart3 className="h-5 w-5 text-primary" />
              <CardTitle>Price Delta vs List Price</CardTitle>
            </div>
            <div className="flex items-center gap-2">
              <span className="text-xs text-muted-foreground">View:</span>
              <div className="flex gap-1">
                <Button
                  variant={viewMode === "percent" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("percent")}
                >
                  Delta %
                </Button>
                <Button
                  variant={viewMode === "dollar" ? "default" : "outline"}
                  size="sm"
                  onClick={() => setViewMode("dollar")}
                >
                  Delta $
                </Button>
              </div>
            </div>
          </div>
          {pricingResult?.isCapped && (
            <Alert className="mt-2">
              <AlertCircle className="h-4 w-4" />
              <AlertDescription>
                Showing first {MAX_POINTS.toLocaleString()} points. Narrow your filters to see all data.
              </AlertDescription>
            </Alert>
          )}
        </CardHeader>
        <CardContent>
          {isLoading ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-center space-y-3">
                <RefreshCw className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                <p className="text-sm text-muted-foreground">Loading pricing data...</p>
              </div>
            </div>
          ) : scatterData.length === 0 ? (
            <div className="h-[400px] flex items-center justify-center">
              <div className="text-center space-y-2">
                <BarChart3 className="h-12 w-12 mx-auto text-muted-foreground/50" />
                <p className="text-muted-foreground">No pricing data available for the selected filters.</p>
                <p className="text-xs text-muted-foreground">
                  Try adjusting your filters or selecting a different fiscal year.
                </p>
              </div>
            </div>
          ) : (
            <div className="h-[400px]">
              <ResponsiveContainer width="100%" height="100%">
                <ScatterChart margin={{ top: 20, right: 20, bottom: 30, left: 20 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                  <XAxis
                    type="number"
                    dataKey="x"
                    domain={[startMonth - 0.5, endMonth + 0.5]}
                    ticks={Array.from(
                      { length: endMonth - startMonth + 1 },
                      (_, i) => startMonth + i
                    )}
                    tickFormatter={(val) => MONTH_NAMES[val] || ""}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                  />
                  <YAxis
                    type="number"
                    dataKey="y"
                    domain={['auto', 'auto']}
                    stroke="hsl(var(--muted-foreground))"
                    fontSize={12}
                    tickFormatter={(val) =>
                      viewMode === "percent" ? `${val}%` : `$${val.toLocaleString()}`
                    }
                  />
                  <Tooltip content={<CustomTooltip />} />
                  <ReferenceLine
                    y={0}
                    stroke="hsl(var(--primary))"
                    strokeWidth={2}
                    strokeDasharray="5 5"
                    label={{
                      value: "List Price",
                      position: "insideTopRight",
                      fill: "hsl(var(--primary))",
                      fontSize: 12,
                    }}
                  />
                  <Scatter data={scatterData} fill="hsl(var(--primary))">
                    {scatterData.map((entry, index) => (
                      <Cell
                        key={`cell-${index}`}
                        fill={getPointColor(entry.dataPoint.deltaPercent)}
                        opacity={0.7}
                      />
                    ))}
                  </Scatter>
                </ScatterChart>
              </ResponsiveContainer>
            </div>
          )}

          {/* Legend */}
          <div className="flex items-center justify-center gap-6 mt-4 text-sm">
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-red-500" />
              <span className="text-muted-foreground">Below List (&lt;-0.5%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full bg-muted-foreground" />
              <span className="text-muted-foreground">At List (±0.5%)</span>
            </div>
            <div className="flex items-center gap-2">
              <div className="w-3 h-3 rounded-full" style={{ backgroundColor: "hsl(142, 71%, 45%)" }} />
              <span className="text-muted-foreground">Above List (&gt;0.5%)</span>
            </div>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}

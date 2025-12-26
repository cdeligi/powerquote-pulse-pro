import { supabase } from "@/integrations/supabase/client";

// ============================================================================
// TYPES
// ============================================================================

export interface PricingRow {
  id: string;
  quote_id: string;
  product_id: string;
  name: string;
  part_number: string | null;
  quantity: number;
  unit_price: number;
  approved_unit_price: number | null;
  original_unit_price: number | null;
  created_at: string;
  quotes: Array<{
    id: string;
    status: string;
    created_at: string;
    reviewed_at: string | null;
    customer_name: string;
    currency: string;
    exchange_rate_metadata: unknown;
  }>;
}

export interface ProductNode {
  id: string;
  name: string | null;
  display_name: string | null;
  part_number: string | null;
  product_level: number | null;
  parent_product_id: string | null;
  category?: string | null;
  subcategory?: string | null;
  price?: number | null;
  is_active?: boolean | null;
}

export interface ProductIndex {
  byId: Map<string, ProductNode>;
  childrenByParent: Map<string | null, string[]>;
  levelById: Map<string, number>;
}

export interface LevelSelection {
  level1Id?: string | null;
  level2Id?: string | null;
  level3Id?: string | null;
  level4Id?: string | null;
}

export interface PricingDataPoint {
  id: string;
  quoteId: string;
  productId: string;
  productName: string;
  partNumber: string | null;
  displayName: string | null;
  customerName: string;
  eventDate: Date;
  month: string; // "Jan", "Feb", etc.
  monthIndex: number; // 0-11
  listPrice: number;
  approvedPrice: number;
  deltaPercent: number;
  deltaDollar: number;
  quantity: number;
  currency: string;
  hasValidListPrice: boolean;
}

export interface PricingKPIs {
  avgDeltaPercent: number;
  medianDeltaPercent: number;
  percentBelowList: number;
  percentAtList: number;
  percentAboveList: number;
  dataPointCount: number;
  missingListPriceCount: number;
}

export interface FetchPricingRowsArgs {
  startIso: string;
  endIso: string;
  productIds?: string[];
  search?: string;
  limit?: number;
  offset?: number;
}

// ============================================================================
// FISCAL YEAR HELPERS
// ============================================================================

export function fyRangeIso(fiscalYear: number): { startIso: string; endIso: string } {
  const start = new Date(Date.UTC(fiscalYear, 0, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(fiscalYear, 11, 31, 23, 59, 59, 999));
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function fyMonthRangeIso(
  fiscalYear: number,
  startMonthIndex0: number,
  endMonthIndex0: number
): { startIso: string; endIso: string } {
  const start = new Date(Date.UTC(fiscalYear, startMonthIndex0, 1, 0, 0, 0, 0));
  const end = new Date(Date.UTC(fiscalYear, endMonthIndex0 + 1, 1, 0, 0, 0, 0));
  end.setUTCMilliseconds(end.getUTCMilliseconds() - 1);
  return { startIso: start.toISOString(), endIso: end.toISOString() };
}

export function getCurrentFiscalYear(): number {
  return new Date().getFullYear();
}

export function getAvailableFiscalYearsFromQuotes(dates: string[]): number[] {
  const years = new Set<number>();
  const currentYear = getCurrentFiscalYear();
  years.add(currentYear);

  for (const dateStr of dates) {
    if (dateStr) {
      const year = new Date(dateStr).getFullYear();
      if (!isNaN(year)) years.add(year);
    }
  }

  return Array.from(years).sort((a, b) => b - a);
}

// ============================================================================
// DATA FETCHING
// ============================================================================

const STATUSES = ["approved", "finalized"];

const SELECT_PRICING_ROWS = `
  id,
  quote_id,
  product_id,
  name,
  part_number,
  quantity,
  unit_price,
  approved_unit_price,
  original_unit_price,
  created_at,
  quotes!inner(
    id,
    status,
    created_at,
    reviewed_at,
    customer_name,
    currency,
    exchange_rate_metadata
  )
`;

export async function fetchPricingAnalysisRows({
  startIso,
  endIso,
  productIds,
  search,
  limit = 5000,
  offset = 0,
}: FetchPricingRowsArgs): Promise<PricingRow[]> {
  // Query A: use reviewed_at (best "approved date" signal)
  let qReviewed = supabase
    .from("bom_items")
    .select(SELECT_PRICING_ROWS)
    .in("quotes.status", STATUSES)
    .not("quotes.reviewed_at", "is", null)
    .gte("quotes.reviewed_at", startIso)
    .lte("quotes.reviewed_at", endIso);

  // Query B: fallback when reviewed_at is null → use created_at
  let qCreatedFallback = supabase
    .from("bom_items")
    .select(SELECT_PRICING_ROWS)
    .in("quotes.status", STATUSES)
    .is("quotes.reviewed_at", null)
    .gte("quotes.created_at", startIso)
    .lte("quotes.created_at", endIso);

  if (productIds?.length) {
    qReviewed = qReviewed.in("product_id", productIds);
    qCreatedFallback = qCreatedFallback.in("product_id", productIds);
  }

  const term = search?.trim();
  if (term) {
    const searchFilter = `name.ilike.%${term}%,part_number.ilike.%${term}%`;
    qReviewed = qReviewed.or(searchFilter);
    qCreatedFallback = qCreatedFallback.or(searchFilter);
  }

  qReviewed = qReviewed.range(offset, offset + limit - 1);
  qCreatedFallback = qCreatedFallback.range(offset, offset + limit - 1);

  const [{ data: a, error: errA }, { data: b, error: errB }] = await Promise.all([
    qReviewed,
    qCreatedFallback,
  ]);

  if (errA) throw errA;
  if (errB) throw errB;

  const merged = [...(a ?? []), ...(b ?? [])] as PricingRow[];
  const deduped = Array.from(new Map(merged.map((r) => [r.id, r])).values());

  return deduped;
}

export async function fetchProductsByIds(productIds: string[]): Promise<ProductNode[]> {
  if (!productIds.length) return [];

  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      display_name,
      part_number,
      product_level,
      parent_product_id,
      category,
      subcategory,
      price,
      is_active
    `)
    .in("id", productIds);

  if (error) throw error;
  return data ?? [];
}

export async function fetchActiveProductsForHierarchy(): Promise<ProductNode[]> {
  const { data, error } = await supabase
    .from("products")
    .select(`
      id,
      name,
      display_name,
      part_number,
      product_level,
      parent_product_id,
      category,
      subcategory,
      price,
      is_active
    `)
    .eq("is_active", true);

  if (error) throw error;
  return data ?? [];
}

export async function fetchQuoteDatesForFY(): Promise<string[]> {
  const { data, error } = await supabase
    .from("quotes")
    .select("created_at, reviewed_at")
    .in("status", STATUSES);

  if (error) throw error;

  const dates: string[] = [];
  for (const q of data ?? []) {
    if (q.reviewed_at) dates.push(q.reviewed_at);
    if (q.created_at) dates.push(q.created_at);
  }
  return dates;
}

// ============================================================================
// PRODUCT HIERARCHY HELPERS
// ============================================================================

export function buildProductIndex(products: ProductNode[]): ProductIndex {
  const byId = new Map<string, ProductNode>();
  const childrenByParent = new Map<string | null, string[]>();
  const levelById = new Map<string, number>();

  for (const p of products) {
    byId.set(p.id, p);

    const lvl = typeof p.product_level === "number" ? p.product_level : 0;
    levelById.set(p.id, lvl);

    const parent = p.parent_product_id ?? null;
    if (!childrenByParent.has(parent)) childrenByParent.set(parent, []);
    childrenByParent.get(parent)!.push(p.id);
  }

  // Sort children for stable dropdown order
  for (const [, kids] of childrenByParent.entries()) {
    kids.sort((a, b) => {
      const pa = byId.get(a);
      const pb = byId.get(b);
      const na = (pa?.display_name || pa?.name || pa?.part_number || "").toLowerCase();
      const nb = (pb?.display_name || pb?.name || pb?.part_number || "").toLowerCase();
      return na.localeCompare(nb);
    });
  }

  return { byId, childrenByParent, levelById };
}

export function getDescendantProductIds(index: ProductIndex, rootId: string): string[] {
  const out: string[] = [];
  const stack: string[] = [rootId];

  while (stack.length) {
    const id = stack.pop()!;
    out.push(id);

    const kids = index.childrenByParent.get(id) ?? [];
    for (const childId of kids) stack.push(childId);
  }

  return out;
}

export function resolveSelectedRootId(sel: LevelSelection): string | null {
  return sel.level4Id || sel.level3Id || sel.level2Id || sel.level1Id || null;
}

export function resolveProductIdsForFilter(
  index: ProductIndex,
  sel: LevelSelection
): string[] | undefined {
  const rootId = resolveSelectedRootId(sel);
  if (!rootId) return undefined;
  return getDescendantProductIds(index, rootId);
}

export interface Option {
  value: string;
  label: string;
}

function labelOf(p: ProductNode): string {
  const name = p.display_name || p.name || "Unnamed";
  const pn = p.part_number ? ` • ${p.part_number}` : "";
  return `${name}${pn}`;
}

export function optionsForLevel(
  index: ProductIndex,
  level: number,
  parentId: string | null
): Option[] {
  const childIds = index.childrenByParent.get(parentId) ?? [];
  const opts: Option[] = [];

  for (const id of childIds) {
    const p = index.byId.get(id);
    if (!p) continue;
    if ((p.product_level ?? 0) !== level) continue;
    opts.push({ value: id, label: labelOf(p) });
  }

  return opts;
}

export function normalizeSelection(sel: LevelSelection): LevelSelection {
  if (!sel.level1Id) return { level1Id: null, level2Id: null, level3Id: null, level4Id: null };
  if (!sel.level2Id) return { ...sel, level3Id: null, level4Id: null };
  if (!sel.level3Id) return { ...sel, level4Id: null };
  return sel;
}

// ============================================================================
// DATA TRANSFORMATION
// ============================================================================

const MONTH_NAMES = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];

export function transformToDataPoints(
  rows: PricingRow[],
  productMap: Map<string, ProductNode>
): { dataPoints: PricingDataPoint[]; missingListPriceCount: number } {
  const dataPoints: PricingDataPoint[] = [];
  let missingListPriceCount = 0;

  for (const row of rows) {
    // Handle quotes as array from Supabase join - use first element
    const quotesArray = row.quotes;
    const quote = Array.isArray(quotesArray) ? quotesArray[0] : quotesArray;
    
    if (!quote) continue; // Skip if no quote data
    
    const product = productMap.get(row.product_id);

    // Determine event date
    const eventDateStr = quote.reviewed_at || quote.created_at;
    const eventDate = new Date(eventDateStr);

    // Determine list price: original_unit_price > products.price > missing
    let listPrice = row.original_unit_price;
    if (listPrice == null && product?.price != null) {
      listPrice = product.price;
    }

    // Determine approved/quoted unit price
    const approvedPrice = row.approved_unit_price ?? row.unit_price;

    // Check validity
    if (listPrice == null || listPrice <= 0) {
      missingListPriceCount++;
      continue; // Exclude from chart by default
    }

    if (approvedPrice == null || approvedPrice <= 0) {
      continue; // Invalid data
    }

    const deltaDollar = approvedPrice - listPrice;
    const deltaPercent = (deltaDollar / listPrice) * 100;

    dataPoints.push({
      id: row.id,
      quoteId: row.quote_id,
      productId: row.product_id,
      productName: row.name,
      partNumber: row.part_number,
      displayName: product?.display_name || product?.name || row.name,
      customerName: quote.customer_name,
      eventDate,
      month: MONTH_NAMES[eventDate.getMonth()],
      monthIndex: eventDate.getMonth(),
      listPrice,
      approvedPrice,
      deltaPercent: Math.round(deltaPercent * 100) / 100,
      deltaDollar: Math.round(deltaDollar * 100) / 100,
      quantity: row.quantity,
      currency: quote.currency || "USD",
      hasValidListPrice: true,
    });
  }

  return { dataPoints, missingListPriceCount };
}

// ============================================================================
// KPI CALCULATIONS
// ============================================================================

export function calculatePricingKPIs(dataPoints: PricingDataPoint[], missingCount: number): PricingKPIs {
  if (dataPoints.length === 0) {
    return {
      avgDeltaPercent: 0,
      medianDeltaPercent: 0,
      percentBelowList: 0,
      percentAtList: 0,
      percentAboveList: 0,
      dataPointCount: 0,
      missingListPriceCount: missingCount,
    };
  }

  const deltas = dataPoints.map((d) => d.deltaPercent);
  const total = dataPoints.length;

  // Average
  const sum = deltas.reduce((a, b) => a + b, 0);
  const avgDeltaPercent = Math.round((sum / total) * 100) / 100;

  // Median
  const sorted = [...deltas].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  const medianDeltaPercent =
    sorted.length % 2 !== 0
      ? sorted[mid]
      : Math.round(((sorted[mid - 1] + sorted[mid]) / 2) * 100) / 100;

  // Percentages
  const belowList = dataPoints.filter((d) => d.deltaPercent < -0.5).length;
  const atList = dataPoints.filter((d) => d.deltaPercent >= -0.5 && d.deltaPercent <= 0.5).length;
  const aboveList = dataPoints.filter((d) => d.deltaPercent > 0.5).length;

  return {
    avgDeltaPercent,
    medianDeltaPercent,
    percentBelowList: Math.round((belowList / total) * 1000) / 10,
    percentAtList: Math.round((atList / total) * 1000) / 10,
    percentAboveList: Math.round((aboveList / total) * 1000) / 10,
    dataPointCount: total,
    missingListPriceCount: missingCount,
  };
}

// ============================================================================
// CHART DATA HELPERS
// ============================================================================

export interface ScatterPoint {
  x: number; // month index 0-11
  y: number; // delta % or delta $
  month: string;
  dataPoint: PricingDataPoint;
}

export function prepareScatterData(
  dataPoints: PricingDataPoint[],
  mode: "percent" | "dollar"
): ScatterPoint[] {
  return dataPoints.map((dp) => ({
    x: dp.monthIndex,
    y: mode === "percent" ? dp.deltaPercent : dp.deltaDollar,
    month: dp.month,
    dataPoint: dp,
  }));
}

export function filterByMonthRange(
  dataPoints: PricingDataPoint[],
  startMonth: number,
  endMonth: number
): PricingDataPoint[] {
  return dataPoints.filter((dp) => dp.monthIndex >= startMonth && dp.monthIndex <= endMonth);
}

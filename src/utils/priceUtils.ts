/**
 * Calculate margin percentage based on cost and price
 * @param price - Selling price
 * @param cost - Product cost
 * @returns Margin percentage (0-100) or null if calculation is not possible
 */
export const calculateMarginPercentage = (price: number, cost: number): number | null => {
  if (price <= 0) return null;
  if (cost <= 0) return null;
  
  const margin = ((price - cost) / price) * 100;
  return Math.round(margin * 100) / 100; // Round to 2 decimal places
};

/**
 * Format margin for display
 * @param margin - Margin percentage (0-100)
 * @returns Formatted margin string with % sign
 */
export const formatMargin = (margin: number | null): string => {
  if (margin === null) return 'N/A';
  return `${margin}%`;
};

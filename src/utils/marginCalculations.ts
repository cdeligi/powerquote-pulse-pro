
import { BOMItem, Level2Option, Level3Customization } from '@/types/product';

export const calculateItemCost = (item: BOMItem): number => {
  let totalCost = (item.product.cost || 0) * item.quantity;
  
  // Add level 2 options costs
  if (item.level2Options) {
    totalCost += item.level2Options.reduce((sum, option) => 
      sum + (option.cost || 0), 0
    );
  }
  
  // Add level 3 customizations costs
  if (item.level3Customizations) {
    totalCost += item.level3Customizations.reduce((sum, custom) => 
      sum + (custom.cost || 0), 0
    );
  }
  
  return totalCost;
};

export const calculateItemRevenue = (item: BOMItem): number => {
  let totalRevenue = item.product.price * item.quantity;
  
  // Add level 2 options revenue
  if (item.level2Options) {
    totalRevenue += item.level2Options.reduce((sum, option) => 
      sum + option.price, 0
    );
  }
  
  // Add level 3 customizations revenue
  if (item.level3Customizations) {
    totalRevenue += item.level3Customizations.reduce((sum, custom) => 
      sum + custom.price, 0
    );
  }
  
  return totalRevenue;
};

export const calculateItemMargin = (item: BOMItem): number => {
  const revenue = calculateItemRevenue(item);
  const cost = calculateItemCost(item);
  
  if (revenue === 0) return 0;
  return ((revenue - cost) / revenue) * 100;
};

export const calculateTotalMargin = (items: BOMItem[]): { 
  totalRevenue: number; 
  totalCost: number; 
  marginPercentage: number; 
  grossProfit: number;
} => {
  const enabledItems = items.filter(item => item.enabled);
  
  const totalRevenue = enabledItems.reduce((sum, item) => 
    sum + calculateItemRevenue(item), 0
  );
  
  const totalCost = enabledItems.reduce((sum, item) => 
    sum + calculateItemCost(item), 0
  );
  
  const marginPercentage = totalRevenue === 0 ? 0 : ((totalRevenue - totalCost) / totalRevenue) * 100;
  const grossProfit = totalRevenue - totalCost;
  
  return {
    totalRevenue,
    totalCost,
    marginPercentage,
    grossProfit
  };
};

export const calculateDiscountedMargin = (
  items: BOMItem[], 
  discountPercentage: number
): { 
  discountedRevenue: number; 
  discountedMargin: number; 
  discountAmount: number;
} => {
  const { totalRevenue, totalCost } = calculateTotalMargin(items);
  const discountedRevenue = totalRevenue * (1 - discountPercentage / 100);
  const discountedMargin = discountedRevenue === 0 ? 0 : ((discountedRevenue - totalCost) / discountedRevenue) * 100;
  const discountAmount = totalRevenue - discountedRevenue;
  
  return {
    discountedRevenue,
    discountedMargin,
    discountAmount
  };
};

/**
 * Calculate partner commission based on quoted value and commission rate
 * @param quotedValue - The total quoted value (revenue)
 * @param commissionRate - The commission rate as a decimal (e.g., 0.10 for 10%)
 * @param commissionType - 'commission' adds to cost, 'discount' reduces price
 * @returns The calculated commission amount
 */
export const calculatePartnerCommission = (
  quotedValue: number,
  commissionRate: number,
  commissionType: 'discount' | 'commission' | null | undefined
): number => {
  if (commissionType !== 'commission' || !commissionRate || commissionRate <= 0) {
    return 0;
  }
  return quotedValue * commissionRate;
};

/**
 * Parse commission rate from quote fields (handles percentage strings like "10%")
 */
export const parseCommissionRate = (value: string | number | undefined | null): number => {
  if (value === null || value === undefined) return 0;
  if (typeof value === 'number') return value;
  const numericValue = parseFloat(value.replace('%', ''));
  return isNaN(numericValue) ? 0 : numericValue / 100;
};

/**
 * Extract commission information from quote fields
 * Sums Contract Commission Rate + Spec Bonus Granted for total commission
 */
export const extractCommissionFromQuoteFields = (quoteFields: Record<string, any> | null | undefined): {
  isRepInvolved: boolean;
  contractCommissionRate: number;
  specBonusRate: number;
  totalCommissionRate: number;
  commissionType: 'discount' | 'commission' | null;
} => {
  if (!quoteFields) {
    return { isRepInvolved: false, contractCommissionRate: 0, specBonusRate: 0, totalCommissionRate: 0, commissionType: null };
  }
  
  // Check for rep involvement - actual field ID is 'is-rep-involved'
  const repInvolvedValue = quoteFields['is-rep-involved'] || 
                           quoteFields['rep-involved'] || 
                           quoteFields['is_rep_involved'] || 
                           quoteFields['isRepInvolved'];
  
  const isRepInvolved = repInvolvedValue === 'Yes' || 
                        repInvolvedValue === true || 
                        repInvolvedValue === 'true';
  
  if (!isRepInvolved) {
    return { isRepInvolved: false, contractCommissionRate: 0, specBonusRate: 0, totalCommissionRate: 0, commissionType: null };
  }
  
  // Get Contract Commission Rate (e.g., "10%", "15%")
  const contractRateValue = quoteFields['partner-spec-change-bonus'] ||
                            quoteFields['commission_rate'] ||
                            quoteFields['contract_commission_rate'];
  const contractCommissionRate = parseCommissionRate(contractRateValue);
  
  // Get Spec Bonus Granted (e.g., "5%", "NO")
  const specBonusValue = quoteFields['conditional-1223ea02-0d3b-43bd-a483-143d4a4f2ee0'] ||
                         quoteFields['spec_bonus_granted'];
  const specBonusRate = specBonusValue === 'NO' || !specBonusValue ? 0 : parseCommissionRate(specBonusValue);
  
  // Total commission is sum of both rates
  const totalCommissionRate = contractCommissionRate + specBonusRate;
  
  // Get benefit type - Discount vs Commission
  // Default to 'commission' when rep is involved and there are rates set
  const benefitType = quoteFields['conditional-6a274080-0a55-4ba0-b6c4-fe70892baf4c'] ||
                      quoteFields['benefit_type'] ||
                      quoteFields['benefitType'];
  
  let commissionType: 'discount' | 'commission' | null = null;
  
  if (benefitType === 'Commission' || benefitType === 'commission') {
    commissionType = 'commission';
  } else if (benefitType === 'Discount' || benefitType === 'discount') {
    commissionType = 'discount';
  } else if (totalCommissionRate > 0) {
    // Default to 'commission' when rates are set but benefit type not specified
    commissionType = 'commission';
  }
  
  return { isRepInvolved, contractCommissionRate, specBonusRate, totalCommissionRate, commissionType };
};

/**
 * Calculate total margin including partner commission costs
 */
export const calculateTotalMarginWithCommission = (
  items: BOMItem[],
  partnerCommission: number = 0
): { 
  totalRevenue: number; 
  totalCost: number; 
  partnerCommissionCost: number;
  effectiveTotalCost: number;
  marginPercentage: number; 
  grossProfit: number;
} => {
  const { totalRevenue, totalCost } = calculateTotalMargin(items);
  const effectiveTotalCost = totalCost + partnerCommission;
  const adjustedGrossProfit = totalRevenue - effectiveTotalCost;
  const adjustedMargin = totalRevenue === 0 ? 0 : (adjustedGrossProfit / totalRevenue) * 100;
  
  return {
    totalRevenue,
    totalCost,
    partnerCommissionCost: partnerCommission,
    effectiveTotalCost,
    marginPercentage: adjustedMargin,
    grossProfit: adjustedGrossProfit
  };
};

/**
 * Calculate discounted margin including partner commission costs
 */
export const calculateDiscountedMarginWithCommission = (
  items: BOMItem[], 
  discountPercentage: number,
  partnerCommission: number = 0
): { 
  discountedRevenue: number; 
  discountedMargin: number; 
  discountAmount: number;
  effectiveTotalCost: number;
  grossProfit: number;
} => {
  const { totalRevenue, totalCost } = calculateTotalMargin(items);
  const discountedRevenue = totalRevenue * (1 - discountPercentage / 100);
  const discountAmount = totalRevenue - discountedRevenue;
  const effectiveTotalCost = totalCost + partnerCommission;
  const grossProfit = discountedRevenue - effectiveTotalCost;
  const discountedMargin = discountedRevenue === 0 ? 0 : (grossProfit / discountedRevenue) * 100;
  
  return {
    discountedRevenue,
    discountedMargin,
    discountAmount,
    effectiveTotalCost,
    grossProfit
  };
};

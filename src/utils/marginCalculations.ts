
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

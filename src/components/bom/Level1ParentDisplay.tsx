import React from 'react';
import { Badge } from '@/components/ui/badge';
import { BOMItem } from '@/types/product';

interface Level1ParentDisplayProps {
  item: BOMItem;
  className?: string;
}

export const Level1ParentDisplay: React.FC<Level1ParentDisplayProps> = ({ item, className }) => {
  // Skip for QTMS products
  const isQTMS = item.product.id?.toLowerCase() === 'qtms' || 
                 item.product.name?.toLowerCase() === 'qtms' ||
                 item.product.type?.toLowerCase() === 'qtms';
  
  if (isQTMS) return null;
  
  // Get Level 1 parent name from nested parent relationships
  const getLevel1ParentName = (): string | null => {
    // Check if this is a Level 2 product with a parent (Level 1)
    if ((item.product as any).parentProduct && (item.product as any).parent_product_id) {
      return (item.product as any).parentProduct.displayName || (item.product as any).parentProduct.name;
    }
    
    // Check if this is a Level 3 product with nested parents
    if ((item.product as any).parentProduct && (item.product as any).parentProduct.parentProduct) {
      return (item.product as any).parentProduct.parentProduct.displayName || 
             (item.product as any).parentProduct.parentProduct.name;
    }
    
    return null;
  };
  
  const level1ParentName = getLevel1ParentName();
  
  if (!level1ParentName) return null;
  
  return (
    <Badge 
      variant="outline" 
      className={`text-xs bg-primary/10 text-primary border-primary/20 ${className || ''}`}
    >
      {level1ParentName}
    </Badge>
  );
};
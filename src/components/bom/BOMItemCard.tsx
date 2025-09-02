
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { Trash2, Settings, Cog } from 'lucide-react';
import { BOMItem, isLevel2Product, isLevel3Product } from '@/types/product';
import { getProductTheme, getThemedCardClasses } from '@/utils/productThemes';
import { useBOMContext } from '@/context/BOMContext';
import { Level1ParentDisplay } from './Level1ParentDisplay';
import { cn } from '@/lib/utils';

interface BOMItemCardProps {
  item: BOMItem;
  onEdit?: (item: BOMItem) => void;
  onDelete?: (id: string) => void;
  canSeePrices?: boolean;
  isSelected?: boolean;
  onSelectionChange?: (id: string, selected: boolean) => void;
}

export const BOMItemCard: React.FC<BOMItemCardProps> = ({ 
  item, 
  onEdit, 
  onDelete, 
  canSeePrices = true,
  isSelected = false,
  onSelectionChange
}) => {
  const { getLevel4Summary } = useBOMContext();
  
  // Check for Level 4 configuration using multiple indicators
  const hasLevel4Config = Boolean(
    (item as any).level4Config || 
    item.level4Selections || 
    (item.product as any).requires_level4_config ||
    (item.product as any).has_level4
  );
  
  const level4Summary = getLevel4Summary(item.id!);
  
  // Skip parent product tag for QTMS products
  const isQTMS = item.product.id?.toLowerCase() === 'qtms' || 
                item.product.name?.toLowerCase() === 'qtms' ||
                item.product.type?.toLowerCase() === 'qtms';
  
  // Get parent product display name if available
  const getParentProductName = () => {
    if (isLevel2Product(item.product) && item.product.parentProduct) {
      return item.product.parentProduct.displayName || item.product.parentProduct.name;
    }
    if (isLevel3Product(item.product) && item.product.parentProduct) {
      return item.product.parentProduct.displayName || item.product.parentProduct.name;
    }
    return null;
  };
  
  const parentProductName = getParentProductName();
  
  // Get product theme based on product name/code
  const productTheme = getProductTheme(item.product.id, item.product.name);
  const cardClasses = getThemedCardClasses(productTheme, isSelected);
  
  const handleCardClick = () => {
    if (onSelectionChange && item.id) {
      onSelectionChange(item.id, !isSelected);
    }
  };

  return (
    <TooltipProvider>
      <Card 
        className={cn(
          "w-full cursor-pointer",
          cardClasses
        )}
        onClick={handleCardClick}
        role="button"
        tabIndex={0}
        aria-pressed={isSelected}
        onKeyDown={(e) => {
          if (e.key === 'Enter' || e.key === ' ') {
            e.preventDefault();
            handleCardClick();
          }
        }}
      >
        <CardHeader className="pb-2">
          <div className="flex items-center justify-between">
            <CardTitle className="text-sm font-medium">{item.product.name}</CardTitle>
            <div className="flex items-center gap-2">
              {(hasLevel4Config || level4Summary) && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="secondary" className={cn("text-xs", productTheme.badge)}>
                      <Cog className="h-3 w-3 mr-1" />
                      {level4Summary || 'Configured'}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Level 4 configuration applied</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Level1ParentDisplay item={item} />
              {!isQTMS && parentProductName && (
                <Tooltip>
                  <TooltipTrigger asChild>
                    <Badge variant="outline" className="text-xs bg-muted text-muted-foreground border-border">
                      Parent: {parentProductName}
                    </Badge>
                  </TooltipTrigger>
                  <TooltipContent>
                    <p>Immediate Parent Product</p>
                  </TooltipContent>
                </Tooltip>
              )}
              <Badge variant="outline" className="text-xs">
                Qty: {item.quantity}
              </Badge>
            </div>
          </div>
        </CardHeader>
        <CardContent className="space-y-2">
          {item.product.description && (
            <p className="text-sm text-muted-foreground line-clamp-2">
              {item.product.description}
            </p>
          )}
          
          {canSeePrices && item.product.price && (
            <div className="text-sm font-medium">
              ${(item.product.price * item.quantity).toLocaleString()}
            </div>
          )}
          
          {item.part_number && (
            <div className="text-xs text-muted-foreground font-mono">
              PN: {item.part_number}
            </div>
          )}

          <div className="flex gap-2 pt-2">
            {onEdit && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onEdit(item);
                }}
                size="sm"
                variant="outline"
                className="flex-1"
              >
                <Settings className="h-3 w-3 mr-1" />
                Edit
              </Button>
            )}
            {onDelete && (
              <Button
                onClick={(e) => {
                  e.stopPropagation();
                  onDelete(item.id!);
                }}
                size="sm"
                variant="destructive"
                className="px-3"
              >
                <Trash2 className="h-3 w-3" />
              </Button>
            )}
          </div>
        </CardContent>
      </Card>
    </TooltipProvider>
  );
};

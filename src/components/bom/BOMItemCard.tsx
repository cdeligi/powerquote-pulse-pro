
import React from 'react';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Badge } from '@/components/ui/badge';
import { Trash2, Settings } from 'lucide-react';
import { BOMItem } from '@/types/product';

interface BOMItemCardProps {
  item: BOMItem;
  onEdit?: (item: BOMItem) => void;
  onDelete?: (id: string) => void;
  canSeePrices?: boolean;
}

export const BOMItemCard: React.FC<BOMItemCardProps> = ({ 
  item, 
  onEdit, 
  onDelete, 
  canSeePrices = true 
}) => {
  const hasLevel4Config = item.level4Selections && Object.keys(item.level4Selections).length > 0;

  return (
    <Card className="w-full">
      <CardHeader className="pb-2">
        <div className="flex items-center justify-between">
          <CardTitle className="text-sm font-medium">{item.product.name}</CardTitle>
          <div className="flex items-center gap-2">
            {hasLevel4Config && (
              <Badge variant="secondary" className="text-xs">
                Configured
              </Badge>
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
        
        {hasLevel4Config && (
          <div className="text-xs text-muted-foreground">
            Level 4 configured with {Object.keys(item.level4Selections!).length} option(s)
          </div>
        )}

        <div className="flex gap-2 pt-2">
          {onEdit && (
            <Button
              onClick={() => onEdit(item)}
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
              onClick={() => onDelete(item.id!)}
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
  );
};
